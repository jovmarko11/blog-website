# Animation patterns

An animation on this site earns its place by **explaining a mechanism** the reader couldn't see from
a static diagram: data moving through layers, a structure rebalancing, an algorithm's state changing.
If a static figure would say the same thing, use a static figure.

## Pick a pattern

| Mechanism | Pattern | Existing example |
|---|---|---|
| Data passing through stages (parser, pipeline, network layers) | **Pure-CSS keyframe loop**: rows fade in one after another, the active stage label lights up in `--project` | `project-art/ParseLayers.astro` |
| An algorithm on a data structure, step by step (trees, graphs, heaps, hashing) | **Frame player**: build-time model records one frame per step; the client tweens between frames; prev/play/next controls and captions | `content/TreeLab.astro` + `lib/tree234.ts` + `lib/tree-render.ts` + `scripts/tree-lab.ts` |
| Two views of the same thing | **Morph slider**: one parameter 0→1 interpolates positions/colours between two layouts | TreeLab `mode="morph"` |
| A small fixed catalogue (cases, node types, instruction formats) | **Static grid** of compact instances | `content/NodeMap.astro` |
| Continuous motion (simulations, physics, 3D) | **Render loop over shared geometry**: pure TS computes the scene, SSR draws frame 0, the client redraws on rAF | `about/Trajectory3D.astro` + `lib/trajectory-scene.ts` |
| Real program output over time | a short muted `.mp4` via `<Media video>` recorded from the real program | — |

## TreeLab (2-3-4 / red-black trees)
```mdx
<Figure n="04" caption="What to notice.">
  <TreeLab start={[40, 20, 60]} ops={[["insert", 10], ["search", 20], ["delete", 40]]} />
</Figure>
<TreeLab start={{ k: [40], c: [{ k: [20] }, { k: [60] }] }} ops={[["insert", 25]]} startCaption="…" />
<TreeLab start={[...]} mode="morph" view={1} />
```
- `start`: keys inserted with the project's insert, or an explicit tree (validated at build time).
- Keep trees ≤ ~11 keys; one figure = one idea (2–3 ops).
- To find a starting tree that triggers a particular case (borrow, merge, cascade), write a small
  search script with `tsx` over random insert orders and check the recorded frame kinds
  (`buildScene(...).frames.map(f => f.kind)`), then read every caption before using it.

## Building a new frame-player animation
Split it the way TreeLab is split; it keeps logic testable and the page fast:
1. **`src/lib/<thing>.ts` — model, no DOM.** Implements the algorithm and a `buildScene()` that
   records `{ caption, kind, ...positions }` per step. Captions are short HTML
   (`<b>`, `<code>` only) and say *why* the step happens, not just what.
2. **`src/lib/<thing>-render.ts` — pure SVG string renderer** with a `mix(frameA, frameB, p)`
   for tweening. Colours via CSS variables set on the component root (e.g. `--tl-red: var(--danger)`),
   `color-mix()` for blends.
3. **`src/components/content/<Thing>.astro`** — runs the model at build time, embeds the scene as
   `<script type="application/json">`, renders frame 0 as static SVG (no-JS and reduced-motion
   readers see a correct figure), plus controls with `aria-label`s, a caption with
   `aria-live="polite"`, and a legend. Throw a clear build error for invalid props.
4. **`src/scripts/<thing>.ts`** — the player: rAF tweening (~700 ms, ease-in-out), autoplay only
   when ≥ 40 % visible (IntersectionObserver) and never again once the reader clicks, arrow keys,
   dwell time proportional to caption length, `prefers-reduced-motion` → no autoplay, no tweening.
5. Register in `src/pages/projects/[slug].astro`, add a demo to `src/pages/[styleguide].astro`.

## Keyframe-loop animations (ParseLayers style)
- Generate `@keyframes` per row in the component frontmatter; inject with
  `<Fragment set:html={`<style>${keyframes}</style>`} />`.
- Content of each row mirrors what the real code produces for one concrete input; say so in the
  component comment.
- Provide `variant="compact"` if it doubles as header art; register header art in
  `project-art/index.ts` and add its key to `ARTS` in `schema.ts`.

## Checklist before using any animation
- [ ] The model is checked against the original code (see verification.md) or is the original algorithm.
- [ ] Every caption read once, start to end; the sequence tells a story with one idea.
- [ ] Looks right in dark and light theme, and at 390 px width (panels stack, labels readable).
- [ ] Reduced motion: complete, understandable static state.
- [ ] No console errors; last frame reachable; restart works.
