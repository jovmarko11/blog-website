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
  links: {
    github: "https://github.com/jovmarko11",
    email: "mailto:jovmarko05@gmail.com",
    linkedin: "https://www.linkedin.com/in/marko-jovanovic-96749021b",
    cv: "/cv.pdf",
  },
} as const;

export type NavItem = {
  label: string;
  /** file-style suffix shown dimmed after the label: ".md", "/", ".pdf" */
  ext: string;
  href: string;
};

/** Main navigation, rendered as IDE tabs in <NavBar>. Order = display order. */
export const nav: NavItem[] = [
  { label: "index", ext: ".md", href: "/" },
  { label: "projects", ext: "/", href: "/projects/" },
  { label: "about", ext: ".md", href: "/about/" },
  { label: "cv", ext: ".pdf", href: "/cv.pdf" },
];
