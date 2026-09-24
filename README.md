# ~/jovmarko05

Personal blog and portfolio: one page per GitHub project, explaining the idea, the math, the code and the mistakes.
Built with [Astro](https://astro.build) + MDX. Design comes from the *Marko Jovanović* design system.

## Commands

| Command            | What it does                                                   |
| ------------------ | -------------------------------------------------------------- |
| `npm run dev`      | Dev server at `localhost:4321` (regenerates tokens first)      |
| `npm run build`    | Production build into `dist/`                                  |
| `npm run preview`  | Serve the built `dist/` locally                                |
| `npm run tokens`   | Regenerate CSS from `design/tokens.json`                       |

## Structure

```
design/tokens.json          design-system tokens (colors per theme, type, spacing…) — the source of truth
scripts/build-tokens.mjs    tokens.json → src/styles/generated/*.css
src/
  config/site.ts            name, handle, links, navigation — change site-wide facts here
  styles/
    generated/              tokens.css + typography.css (GENERATED, don't edit)
    base.css                reset, element defaults, utilities (.screen, .wrap, .paper)
    global.css              imports all of the above; loaded once by BaseLayout
  content.config.ts         registers the "projects" collection
  content/
    schema.ts               front-matter schema + allowed values (CATEGORIES, STATUSES, HUES, ARTS)
    projects/*.mdx          one write-up per repository (file name = URL)
  lib/                      pure helpers: projects.ts (read collection), format.ts, shiki.ts
  layouts/
    BaseLayout.astro        <head>, theme, NavBar, <main>, StatusBar
    ProjectLayout.astro     ProjectHeader + Toc + article + pager; sets --project from `hue`
  components/
    brand/                  Logo, Cursor
    layout/                 NavBar, StatusBar, ThemeToggle, Paper
    ui/                     Label, Tag, Button, Kbd, TerminalHeading
    project/                ProjectHeader, Axes, SpecTable, Toc, SectionHeading/Title, ProjectPager, sections.ts
    content/                used inside .mdx: CodeBlock, Note, Figure, Terminal
    project-art/            per-project header illustrations (ParseLayers) + registry
  pages/                    one file = one route (index, styleguide, projects/[slug], …)
public/                     static files served as-is (favicon.svg, cv.pdf)
```

## Writing a project

1. Create `src/content/projects/<repo-name>.mdx` with the front-matter from `src/content/schema.ts`.
2. Write five sections as `## Idea`, `## Architecture`, `## Implementation`, `## Results`, `## Lessons`,
   each followed by a human title as `### …`. Numbers and terminal commands are added automatically.
3. Use `<CodeBlock>`, `<Note>`, `<Figure>`, `<Terminal>` directly — no imports needed.
4. Pick a `hue` (project color). It is used only for the project's own content, never for UI.

## Conventions

- **Tokens, never raw values.** Colors, spacing, radii and fonts always come from CSS variables (`var(--accent)`, `var(--space-5)`).
  To change a color, edit `design/tokens.json` and run `npm run tokens`.
- **Styles live with their component** (scoped `<style>` in the `.astro` file). Global CSS is only reset, element defaults and utilities.
- **Type styles** are classes: `t-display-xl`, `t-heading-1`, `t-body-l`, `t-label`, `t-meta`, `t-prompt`, `t-code`…
- **Responsive with container queries** on `.screen`: `@container screen (max-width: 640px)` (phone) and `900px` (tablet).
- **Themes:** `data-theme="dark" | "light"` on `<html>`. Dark is the default; the choice is saved in `localStorage`.
- **Every new component** gets a doc comment at the top (what it is + usage example) and a demo on `/styleguide`.
