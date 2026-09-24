/**
 * home.ts — the words on the landing page. Edit text here, not in the components.
 */
import { site } from "../config/site";

/** The man page on the left of the hero. */
export const hero = {
  command: `man ${site.handle}`,
  tagline: "— software engineering, AI and scientific computing, built from scratch",
  /** Flags in SYNOPSIS = project categories; each one links to the filtered list. */
  flags: ["systems", "ai", "math"] as const,
  options: [
    { flag: "--projects", text: "one page per repository", href: "/projects/" },
    { flag: "--about", text: "how I got here, where I'm going", href: "/about/" },
    { flag: "--cv", text: "education and research (pdf)", href: site.links.cv },
    { flag: "--contact", text: site.links.email.replace("mailto:", ""), href: site.links.email },
  ],
  /** The hollow point on the map: where the next projects will land. */
  next: { label: "next: ai-research", x: 0.93, y: 0.9 },
  /** Seconds each project stays selected during the automatic tour. */
  tourSeconds: 3.6,
};

/** "How to read a project": one line per standard section (commands come from project/sections.ts). */
export const anatomy = {
  title: "Every write-up follows the same five steps",
  intro: "So you always know where to look: the idea first, the mistakes last, and real code and output in between.",
  steps: {
    idea: { name: "Idea", text: "The problem and why it was worth my time. For coursework: what was assigned and what I decided on top of it." },
    architecture: { name: "Architecture", text: "The parts of the system and how they talk to each other, usually as one diagram." },
    implementation: { name: "Implementation", text: "The interesting code, with the lines that matter highlighted and the trade-offs explained." },
    results: { name: "Results", text: "Real output and real numbers, with the conditions they were measured under." },
    lessons: { name: "Lessons", text: "What I'd do differently, including at least one thing I got wrong." },
  } as Record<string, { name: string; text: string }>,
  /** The write-up to show as the example. */
  exampleSlug: "cli-interpreter-cpp",
};
