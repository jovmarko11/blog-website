/**
 * math.ts — TeX → HTML with KaTeX, at build time (no JavaScript sent to the browser).
 * A typo in a formula fails the build with KaTeX's error message, so it can't reach the site.
 */
import katex from "katex";

export const renderTex = (tex: string, display = false) =>
  katex.renderToString(tex, { displayMode: display, throwOnError: true, output: "html", strict: "ignore" });
