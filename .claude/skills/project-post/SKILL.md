---
name: project-post
description: Turns one of Marko's GitHub projects into an illustrated write-up on his Astro site (src/content/projects/<slug>.mdx), with real code excerpts, real program output and custom animations that explain how the project works. Use this whenever the user asks to write, draft, fill in, finish or improve a project post, write-up, blog post or article about a repository, mentions a repo URL together with the blog/site, asks to "add a project to the site", or wants an animation or figure for a project page — even if they don't say "skill" or "post".
---

# project-post

Write a project write-up for the site in this repository. The bar is the existing post
`src/content/projects/cli-interpreter-cpp.mdx` and `process-scheduler-234-tree.mdx`: technical,
first person, simple to follow, and with at least one animation that *explains a mechanism*
(not decoration). Read one of them in full before writing anything; they are the style reference.

A post has three audiences at once: a recruiter skimming for 30 seconds, a student who wants to
understand the idea, and an engineer who wants to see the real code. Every section should work for
all three: plain sentence first, then the mechanism, then the code.

## Non-negotiable rules

1. **Never present code as working without running it.** Build the project and exercise the parts
   the post shows. For data structures and algorithms, write a quick randomized stress test that
   checks invariants after every operation (see `references/verification.md`). If something is
   broken, stop and ask the user how to handle it (see "When the code is broken").
2. **Only real output.** Terminal blocks, numbers and tables come from actually running the code.
   Say how numbers were measured (runs, sizes, median) in the caption.
3. **Code excerpts are exact.** Copy from the repository with the real file path and real
   `start` line; never edit the code inside a CodeBlock. Trim by choosing a contiguous range.
4. **Design tokens only.** Colours, spacing and radii come from CSS variables
   (`references/site-conventions.md`); project content uses `--project` / `--project-soft`.
5. **Animations must be correct.** If an animation runs a model of the project's logic (like
   TreeLab runs a TypeScript copy of the C++ insert), cross-check the model against the original
   code on hundreds of random inputs before using it.
6. **`npm run build` must pass, and look at the page** in a real browser (desktop, mobile width,
   dark and light theme) before calling it done.
7. **Don't commit or push without asking.** Show the user what changed and let them decide.

## Workflow

### 1. Find the project and the target file
- Get the repo (`owner/name` or URL). Check `src/content/projects/` for an existing file whose
  `repo:` matches: fill that one in rather than creating a duplicate. Otherwise copy
  `templates/project.mdx` to `src/content/projects/<slug>.mdx` (slug = URL, kebab-case, human
  words, not the repo name).
- Clone the project **outside** this repo (e.g. `/tmp/<name>` or a sibling folder), never inside it.

### 2. Understand it
- Run `python3 .claude/skills/project-post/scripts/repo_summary.py <path-to-clone>`: languages,
  size, build system, entry points, README head, commit period and top files by size. The commit
  period is only a starting point for `period:` (projects are often pushed in one commit at the
  end); confirm it with the user.
- Read the code that matters. Find the one idea that makes this project interesting; the post is
  built around it. Ask the user what the assignment was vs. what they added (coursework) if the
  README doesn't say.

### 3. Build, run, test
- Build it with its own build system. Run it on small realistic input and save the output for a
  Terminal block. Collect any numbers worth a DataTable (sizes, timings, accuracy).
- Stress-test the core pieces the post will show (`references/verification.md`).
- Note small issues (compiler warnings, missing includes, swapped arguments) for the user; don't
  fix the project's code unless asked.

### 4. Plan and confirm
Before writing, give the user a short outline (in the language they are writing to you in):
the angle, the five section titles, which mechanism each figure will animate, which code excerpts
(file:lines) and which real outputs you plan to use, and anything found broken. Wait for a yes.

### 5. Write the post
- Front-matter: every field is validated by `src/content/schema.ts`; see
  `references/site-conventions.md` for what each field means and how to choose `plot` and `hue`.
- Structure: Idea → Architecture → Implementation → Results → Lessons, each `##` with a `###`
  subtitle that says something (not "Overview").
- Voice and components: `references/voice-and-style.md`. The post is in English.

### 6. Animations
Read `references/animation-patterns.md`. Reuse an existing component when it fits (TreeLab for
search trees, ParseLayers-style CSS keyframes for pipelines). Otherwise build a new component in
`src/components/content/` (in-article figure) or `src/components/project-art/` (header art,
registered in `project-art/index.ts` and `ARTS` in `schema.ts`), register it in
`src/pages/projects/[slug].astro`, and add a demo to `src/pages/[styleguide].astro`.

### 7. Verify
- `npm run build` (must pass; the `use astro:head-inject` warnings are pre-existing and harmless).
- `npm run dev`, open `/projects/<slug>/`, and check with screenshots:
  `node .claude/skills/project-post/scripts/screenshot.mjs http://localhost:4321/projects/<slug>/`
  (desktop dark/light and 390 px mobile, one image per figure; `--step` also saves the last frame of
  every animation). First time on a machine: `npm i --no-save puppeteer`. Look at every image.
- Re-read the post once for claims the code or output doesn't support.

### 8. Hand over
Summarise for the user: files added/changed, what was verified and how, known issues in the project
itself, and anything they should decide (e.g. whether to mention a bug publicly). Offer to commit.

## When the code is broken

If something the post would describe doesn't work, don't hide it and don't silently fix it. Ask:
- **A — describe the algorithm, not the code:** explain it with original figures, show no repo code
  for that part, and mention the limitation honestly in Lessons (`<Note kind="wrong">`).
- **B — fix first:** patch the project (in its own repo, as a separate change the user reviews),
  verify with the same stress test, then show the fixed code.
Coursework that was already submitted usually gets A.

## Reference files
- `references/site-conventions.md` — schema fields, component catalogue with props, tokens, file layout.
- `references/voice-and-style.md` — tone, section-by-section guidance, captions, what to avoid.
- `references/animation-patterns.md` — how animations on this site are built, TreeLab API, checklist.
- `references/verification.md` — stress-test recipes, cross-checking a model against the original, screenshots.
