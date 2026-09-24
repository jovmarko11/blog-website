/**
 * project-map.ts — geometry of the hero's project map.
 * A project's front-matter `plot: { x, y }` (0–1) becomes a point in a 600×440 SVG:
 *   x = abstraction (metal → models), y = theory depth (practice → theory).
 */
export const MAP = { w: 600, h: 440, x0: 56, y0: 24, pw: 512, ph: 364 } as const;

/** Bottom of the plot area (the x axis). */
export const AXIS_Y = MAP.y0 + MAP.ph;

/** plot coordinates (0–1) → SVG coordinates */
export const toMap = (p: { x: number; y: number }) => ({
  x: MAP.x0 + p.x * MAP.pw,
  y: MAP.y0 + (1 - p.y) * MAP.ph,
});

/** Labels of points on the right third go to the left of the dot, so they stay inside the plot. */
export const labelSide = (x: number): "left" | "right" => (x > 0.62 ? "left" : "right");

/** Dotted guide lines, in plot units. */
export const GUIDES = [0.25, 0.5, 0.75];

/* ---------- where the hero card goes ---------- */

/** Size of the hero card in SVG units (its title may wrap to two lines) (≈ its CSS size at desktop width), and its gap from the dot. */
export const CARD = { w: 250, h: 150, gap: 16 } as const;
const CHAR = 6.7; // width of one 11px mono character, in SVG units

export type Mark = { x: number; y: number; label: string; side: "left" | "right" };
export type Placement = { h: "l" | "r"; v: "u" | "d" };

type Box = { x0: number; y0: number; x1: number; y1: number };
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

/** The box a point occupies: its dot plus its label. */
const markBox = (m: Mark): Box => {
  const w = m.label.length * CHAR + 12;
  return m.side === "right" ? { x0: m.x - 6, y0: m.y - 9, x1: m.x + w, y1: m.y + 7 } : { x0: m.x - w, y0: m.y - 9, x1: m.x + 6, y1: m.y + 7 };
};

/**
 * Pick the corner (right/left × up/down) for the card of point `p` that covers the fewest
 * other points and labels and stays inside the map. Ties go to the first candidate:
 * towards the centre of the map.
 */
export function placeCard(p: { x: number; y: number }, others: Mark[]): Placement {
  const cx = MAP.x0 + MAP.pw / 2, cy = MAP.y0 + MAP.ph / 2;
  const h0: Placement["h"] = p.x < cx ? "r" : "l", v0: Placement["v"] = p.y < cy ? "d" : "u";
  const flipH = (h: Placement["h"]) => (h === "r" ? "l" : "r"), flipV = (v: Placement["v"]) => (v === "d" ? "u" : "d");
  const candidates: Placement[] = [{ h: h0, v: v0 }, { h: h0, v: flipV(v0) }, { h: flipH(h0), v: v0 }, { h: flipH(h0), v: flipV(v0) }];
  const boxes = others.map(markBox);
  let best = candidates[0], bestScore = Infinity;
  for (const c of candidates) {
    const x0 = c.h === "r" ? p.x + CARD.gap : p.x - CARD.gap - CARD.w;
    const y0 = c.v === "d" ? p.y + CARD.gap : p.y - CARD.gap - CARD.h;
    const box = { x0, y0, x1: x0 + CARD.w, y1: y0 + CARD.h };
    // keep clear of the axes and their labels: the card must stay inside the plot area
    const outside = (Math.max(0, MAP.x0 - box.x0) + Math.max(0, box.x1 - MAP.w) + Math.max(0, -box.y0) + Math.max(0, box.y1 - AXIS_Y)) * 100;
    const score = outside + boxes.reduce((s, b) => s + overlap(box, b), 0);
    if (score < bestScore) { best = c; bestScore = score; }
  }
  return best;
}
