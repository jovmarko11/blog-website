/**
 * site.ts — single source of truth for site-wide facts.
 * Change a link or label here and every page updates.
 */

export const site = {
  /** Public address of the site (used for canonical URLs, sitemap and social previews). */
  url: "https://jovmarko11.github.io",
  name: "Marko Jovanović",
  handle: "jovmarko05",
  title: "Marko Jovanović · ~/jovmarko05",
  description:
    "Software engineering, AI and scientific computing, built from scratch and explained in full.",
  lang: "en",
  location: { label: "Belgrade", coords: "44.8°N 20.5°E" },
  /**
   * GoatCounter site code: stats live at https://<code>.goatcounter.com.
   * Empty string = no analytics. Only loaded in the production build, never in `npm run dev`.
   */
  analytics: { goatcounter: "jovmarko05" },
  links: {
    github: "https://github.com/jovmarko11",
    email: "mailto:jovmarko05@gmail.com",
    linkedin: "https://www.linkedin.com/in/marko-jovanovic-96749021b",
    /** Put the PDF in public/cv.pdf and set this to "/cv.pdf". Empty = every CV link on the site is hidden. */
    cv: "",
  },
} as const;

export type NavItem = {
  label: string;
  /** file-style suffix shown dimmed after the label: ".md", "/", ".pdf" */
  ext: string;
  href: string;
};

/** Main navigation, rendered as IDE tabs in <NavBar>. Order = display order. Items with an empty href are left out. */
export const nav: NavItem[] = [
  { label: "index", ext: ".md", href: "/" },
  { label: "projects", ext: "/", href: "/projects/" },
  { label: "about", ext: ".md", href: "/about/" },
  { label: "cv", ext: ".pdf", href: site.links.cv },
].filter((item) => item.href);
