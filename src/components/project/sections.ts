/**
 * sections.ts — the five standard sections of a project article and how they are shown.
 * An MDX file writes `## Idea`, `## Architecture`… and the site adds the number, the
 * terminal command and the file extension from this table.
 */
export const SECTIONS: Record<string, { cmd: string; arg: string; ext: string }> = {
  idea: { cmd: "cat", arg: "idea.md", ext: ".md" },
  architecture: { cmd: "tree", arg: "src/ -L 1", ext: ".md" },
  implementation: { cmd: "less", arg: "src/", ext: ".cpp" },
  results: { cmd: "./run", arg: "--demo", ext: ".log" },
  lessons: { cmd: "git log", arg: "--oneline", ext: ".md" },
};
export const SECTION_ORDER = Object.keys(SECTIONS);

export const sectionExt = (slug: string) => SECTIONS[slug]?.ext ?? ".md";
