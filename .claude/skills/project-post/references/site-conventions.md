# Site conventions

Astro 7 + MDX, static site deployed by GitHub Pages. Node ≥ 22.12. `npm run build` regenerates
`src/styles/generated/tokens.css` from `design/tokens.json` first (never edit the generated file).

## Where things live
- `src/content/projects/<slug>.mdx` — one post per repository; file name = URL `/projects/<slug>/`.
- `src/content/schema.ts` — front-matter schema (source of truth; read it if anything here disagrees).
- `templates/project.mdx` — copy-this starting point with an example of every component.
- `src/components/content/` — components usable inside posts. `src/components/project-art/` —
  header illustrations. `src/lib/` — pure TS used at build time (and by client scripts).
  `src/scripts/` — client-side scripts.
- `src/pages/projects/[slug].astro` — the `components` map: anything used in MDX must be listed
  there (components are not imported inside .mdx; images are).
- `src/pages/[styleguide].astro` — living reference, dev only; add a demo of every new component.
- Images for a post: `src/content/projects/<slug>/…`, imported in the .mdx. Videos: `public/media/<slug>/`.

## Front-matter
| field | notes |
|---|---|
| `title` | ≤ 60 chars, sentence case, human words, not the repo name |
| `summary` | ≤ 160 chars, what + why; shown on cards and as meta description |
| `repo` | `owner/name`; required unless `status: lost` |
| `category` | `systems` \| `ai` \| `math` \| `web` |
| `stack` | 1–6 items, first 4 on the card |
| `status` | `shipped` \| `in-progress` \| `lost` |
| `period` | `{ start: "YYYY-MM", end?: "YYYY-MM" }` — take from git history |
| `course` | `{ code, name (English), institution default "ETF Belgrade", year }` — coursework only |
| `context` | ≤ 40 chars, non-coursework ("Personal project"); never together with `course` |
| `spec` | `{ label ≤ 12, value ≤ 24 }` — the one number or fact worth showing |
| `plot` | `{ x, y }` in 0–1: x = metal (0) → models (1), y = practice (0) → theory (1). Compare with the other posts so dots don't overlap |
| `hue` | `cyan` `violet` `lime` `sky` `rose` `amber`; prefer one no other featured post uses |
| `art` | optional key from `ARTS` (header illustration) |
| `featured` | at most 6 in total |
| `draft` | `true` hides the post; remove when publishing |

## Components available in MDX
- `<CodeBlock file lang="cpp" meta start highlight code={`…`} />` — `start` = real first line;
  `highlight` uses real line numbers. Paste code unchanged; escape backticks and `${` inside.
- `<Note>` / `<Note kind="wrong">` / `<Note title="// WHY">` — at most one per ~3 screens.
- `<Figure n="01" caption="What to notice">…</Figure>` — number every visual; caption allows HTML.
- `<Terminal lines={[{ cmd, out, error? }]} prompt="$" />` — real output only.
- `<M tex="…" />` inline math, `<Equation n="1" tex="…" />` display math (KaTeX).
- `<Media src|video poster alt n caption dark />` — imported images are optimised; prefer muted
  .mp4 over GIF. `<Compare labels={[a, b]} n caption>` with children using `slot="left|right"`.
- `<DataTable n caption head rows highlight align />` — numeric columns right-align automatically.
- `<TreeLab>`, `<NodeMap>` — see animation-patterns.md. `<ParseLayers />` — CLI post only.
- `##` renders as SectionHeading, `###` as SectionTitle (automatically).

## Tokens and CSS rules
- Only CSS variables, never raw colours: `--bg --surface --surface-raised --surface-sunken --ink
  --ink-muted --ink-faint --line --line-strong --accent --accent-soft --success --warning --danger
  --code-* --syn-* --focus --space-1…9 --radius-0/s/m --font-sans/mono/serif --touch-target`.
- Project colour inside a post: `--project`, `--project-soft` (set from `hue` by ProjectLayout).
  Hues are for project content only, never UI chrome.
- `--surface-sunken` stays dark in the light theme (code panels). Test both themes by setting
  `document.documentElement.dataset.theme` to `"light"` / `"dark"`.
- Scoped `<style>` per component; responsive via `@container screen (max-width: 640px | 900px)`.
- Status colours (success/warning/danger) always come with a word or glyph, never colour alone.
- Every animation honours `prefers-reduced-motion`: show the complete state, no autoplay.
