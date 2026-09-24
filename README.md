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
  layouts/BaseLayout.astro  <head>, theme, NavBar, <main>, StatusBar
  components/
    brand/                  Logo, Cursor
    layout/                 NavBar, StatusBar, ThemeToggle, Paper
    ui/                     Label, Tag, Button, Kbd, TerminalHeading
  pages/                    one file = one route (index, styleguide, …)
public/                     static files served as-is (favicon.svg, cv.pdf)
```

## Conventions

- **Tokens, never raw values.** Colors, spacing, radii and fonts always come from CSS variables (`var(--accent)`, `var(--space-5)`).
  To change a color, edit `design/tokens.json` and run `npm run tokens`.
- **Styles live with their component** (scoped `<style>` in the `.astro` file). Global CSS is only reset, element defaults and utilities.
- **Type styles** are classes: `t-display-xl`, `t-heading-1`, `t-body-l`, `t-label`, `t-meta`, `t-prompt`, `t-code`…
- **Responsive with container queries** on `.screen`: `@container screen (max-width: 640px)` (phone) and `900px` (tablet).
- **Themes:** `data-theme="dark" | "light"` on `<html>`. Dark is the default; the choice is saved in `localStorage`.
- **Every new component** gets a doc comment at the top (what it is + usage example) and a demo on `/styleguide`.
