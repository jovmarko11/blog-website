# ~/jovmarko05

Personal blog and portfolio: one page per GitHub project, explaining the idea, the math, the code and the mistakes.
Built with [Astro](https://astro.build) + MDX. Design comes from the *Marko Jovanović* design system.
Live at **https://jovmarko11.github.io**.

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
  config/site.ts            name, handle, url, links, navigation — change site-wide facts here
  data/                     page text kept out of components: home.ts (landing), about.ts (about page)
  styles/
    generated/              tokens.css + typography.css (GENERATED, don't edit)
    base.css                reset, element defaults, utilities (.screen, .wrap, .paper)
    global.css              imports all of the above; loaded once by BaseLayout
  content.config.ts         registers the "projects" collection
  content/
    schema.ts               front-matter schema + allowed values (CATEGORIES, STATUSES, HUES, ARTS)
    projects/*.mdx          one write-up per repository (file name = URL)
  lib/                      pure helpers: projects.ts (read collection), format.ts, shiki.ts,
                            project-map.ts (hero map geometry), projection.ts + trajectory-scene.ts (about 3D)
  scripts/                  client-side behaviour: motion.ts (reveal, count-up), hero.ts, palette.ts
  layouts/
    BaseLayout.astro        <head>, theme, NavBar, <main>, StatusBar
    ProjectLayout.astro     ProjectHeader + Toc + article + pager; sets --project from `hue`
  components/
    brand/                  Logo, Cursor
    layout/                 NavBar, StatusBar, ThemeToggle, Paper, CommandPalette (⌘K)
    ui/                     Label, Tag, Button, Kbd, TerminalHeading
    project/                ProjectHeader, Axes, SpecTable, Toc, SectionHeading/Title, ProjectPager, sections.ts
    content/                used inside .mdx: CodeBlock, Note, Figure, Terminal
    project-art/            per-project header illustrations (ParseLayers) + registry
    home/                   Hero (man page + project map), FeaturedProjects/Card, WriteupAnatomy
    about/                  Trajectory3D, NowGrid, GitLog, Venn, ContactCTA
    projects/               ProjectCard, CategoryTabs (/projects)
  pages/                    one file = one route: index, about, projects/, projects/[slug], 404,
                            sitemap.xml, [styleguide] (dev only: exists in `npm run dev`, not in the build)
public/                     static files served as-is: cv.pdf, og.png (social preview), favicons, robots.txt
```

## Writing a project

1. Create `src/content/projects/<repo-name>.mdx` with the front-matter from `src/content/schema.ts`.
2. Write five sections as `## Idea`, `## Architecture`, `## Implementation`, `## Results`, `## Lessons`,
   each followed by a human title as `### …`. Numbers and terminal commands are added automatically.
3. Use `<CodeBlock>`, `<Note>`, `<Figure>`, `<Terminal>` directly — no imports needed.
4. Pick a `hue` (project color). It is used only for the project's own content, never for UI.
5. `plot: { x, y }` places it on the landing map; `featured: true` adds it to the hero tour and the Featured grid.

## Conventions

- **Tokens, never raw values.** Colors, spacing, radii and fonts always come from CSS variables (`var(--accent)`, `var(--space-5)`).
  To change a color, edit `design/tokens.json` and run `npm run tokens`.
- **Styles live with their component** (scoped `<style>` in the `.astro` file). Global CSS is only reset, element defaults and utilities.
- **Type styles** are classes: `t-display-xl`, `t-heading-1`, `t-body-l`, `t-label`, `t-meta`, `t-prompt`, `t-code`…
- **Responsive with container queries** on `.screen`: `@container screen (max-width: 640px)` (phone) and `900px` (tablet).
- **Themes:** `data-theme="dark" | "light"` on `<html>`. Dark is the default; the choice is saved in `localStorage`.
- **Every new component** gets a doc comment at the top (what it is + usage example) and a demo on `/styleguide`.

## Deploy

Every push to `main` builds the site and publishes it to GitHub Pages (`.github/workflows/deploy.yml`).
One-time setup: the repository is named `jovmarko11.github.io`, and *Settings → Pages → Source* is set to **GitHub Actions**.
If the address ever changes, update `site` in `astro.config.mjs` and `url` in `src/config/site.ts`.

## Analytics & speed

- **Visits:** [GoatCounter](https://www.goatcounter.com), no cookies. Stats at https://jovmarko05.goatcounter.com.
  The script is added only in the production build; set `site.analytics.goatcounter` to `""` to turn it off.
- **Speed & accessibility:** run Lighthouse in Chrome DevTools (incognito) or at https://pagespeed.web.dev.
