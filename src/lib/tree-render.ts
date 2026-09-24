/**
 * tree-render.ts — turns tree234 frames into SVG.
 *
 *   mix(A, B, p)      the state "p of the way" from frame A to frame B (positions, fades, recolouring)
 *   svgInner(m, v)    the SVG contents for that state. v = 0 → red-black view, v = 1 → 2-3-4 view,
 *                     anything between is the morph (red keys slide into their black key's box).
 *
 * Same code draws the static first frame at build time (no-JS / reduced-motion) and every
 * animation step in the browser (scripts/tree-lab.ts). No DOM access here.
 * Colours come from CSS variables set by <TreeLab> (--tl-*), never raw values.
 */
import { GEO, type Frame, type Rect } from "./tree234";

export interface MKey { id: string; label: string; ghost: boolean; red: number; rb: [number, number]; t: [number, number]; a: number; hl: number }
export interface MBox { id: number; x: number; y: number; w: number; empty: boolean; a: number; hl: number }
export interface Mix {
  keys: MKey[];
  boxes: MBox[];
  rbEdges: { a: string; b: string; o: number }[];
  tEdges: { p: number; c: number; i: number; o: number }[];
}

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const lerp2 = (a: [number, number], b: [number, number], p: number): [number, number] => [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];
const f1 = (n: number) => Math.round(n * 10) / 10;
const f2 = (n: number) => Math.round(n * 100) / 100;

export function mix(A: Frame, B: Frame, p: number): Mix {
  const ak = new Map(A.keys.map((k) => [k.id, k]));
  const bk = new Map(B.keys.map((k) => [k.id, k]));
  const ahk = new Set(A.hk), bhk = new Set(B.hk);
  const keys: MKey[] = [];
  for (const id of new Set([...ak.keys(), ...bk.keys()])) {
    const a = ak.get(id), b = bk.get(id);
    const s = (a ?? b)!;
    const red = (k: typeof s | undefined) => (k && k.c === "R" ? 1 : 0);
    const ha = ahk.has(id) ? 1 : 0, hb = bhk.has(id) ? 1 : 0;
    keys.push({
      id, label: s.label, ghost: !!s.ghost,
      red: a && b ? lerp(red(a), red(b), p) : red(s),
      rb: a && b ? lerp2(a.rb, b.rb, p) : s.rb,
      t: a && b ? lerp2(a.t, b.t, p) : s.t,
      a: a && b ? 1 : a ? 1 - p : p,
      hl: a && b ? lerp(ha, hb, p) : a ? ha : hb,
    });
  }
  const ab = new Map(A.boxes.map((b) => [b.id, b]));
  const bb = new Map(B.boxes.map((b) => [b.id, b]));
  const ahn = new Set(A.hn), bhn = new Set(B.hn);
  const boxes: MBox[] = [];
  for (const id of new Set([...ab.keys(), ...bb.keys()])) {
    const a = ab.get(id), b = bb.get(id);
    const s = (a ?? b)!;
    const ha = ahn.has(id) ? 1 : 0, hb = bhn.has(id) ? 1 : 0;
    boxes.push({
      id,
      x: a && b ? lerp(a.x, b.x, p) : s.x,
      y: a && b ? lerp(a.y, b.y, p) : s.y,
      w: a && b ? lerp(a.w, b.w, p) : s.w,
      empty: !!s.empty,
      a: a && b ? 1 : a ? 1 - p : p,
      hl: a && b ? lerp(ha, hb, p) : a ? ha : hb,
    });
  }
  const edgeMix = <T extends unknown[]>(ea: T[], eb: T[], key: (e: T) => string) => {
    const ma = new Map(ea.map((e) => [key(e), e])), mb = new Map(eb.map((e) => [key(e), e]));
    return [...new Set([...ma.keys(), ...mb.keys()])].map((k) => {
      const a = ma.get(k), b = mb.get(k);
      return { a, b, o: a && b ? 1 : a ? 1 - p : p };
    });
  };
  const rbEdges = edgeMix(A.rbEdges, B.rbEdges, (e) => `${e[0]}>${e[1]}`).map(({ a, b, o }) => {
    const e = (b ?? a)!;
    return { a: e[0], b: e[1], o };
  });
  const tEdges = edgeMix(A.tEdges, B.tEdges, (e) => `${e[0]}>${e[2]}`).map(({ a, b, o }) => {
    const e = (b ?? a)!;
    const i = a && b ? lerp(a[1], b[1], p) : e[1];
    return { p: e[0], c: e[2], i, o };
  });
  return { keys, boxes, rbEdges, tEdges };
}

/** SVG contents for a mix at view v (0 = red-black, 1 = 2-3-4). */
export function svgInner(m: Mix, v: number): string {
  const { KW, PAD, BOXH, PILL_W, PILL_H } = GEO;
  const out: string[] = [];
  const box = new Map(m.boxes.map((b) => [b.id, b]));
  const key = new Map(m.keys.map((k) => [k.id, k]));
  const pos = (k: MKey) => lerp2(k.rb, k.t, v);

  /* 2-3-4 edges: from the gap above the child down to the child's top */
  if (v > 0.01) {
    for (const e of m.tEdges) {
      const P = box.get(e.p), C = box.get(e.c);
      if (!P || !C) continue;
      const ax = P.x + PAD + e.i * KW, ay = P.y + BOXH;
      const cx = C.x + C.w / 2, cy = C.y;
      const dy = (cy - ay) * 0.45;
      const o = f2(e.o * Math.min(P.a, C.a) * v);
      out.push(`<path class="tl-edge" d="M${f1(ax)} ${f1(ay)}C${f1(ax)} ${f1(ay + dy)} ${f1(cx)} ${f1(cy - dy)} ${f1(cx)} ${f1(cy)}" opacity="${o}"/>`);
    }
  }
  /* red-black edges */
  if (v < 0.99) {
    for (const e of m.rbEdges) {
      const A = key.get(e.a), B = key.get(e.b);
      if (!A || !B) continue;
      const [x1, y1] = pos(A), [x2, y2] = pos(B);
      const o = f2(e.o * Math.min(A.a, B.a) * (1 - v));
      out.push(`<line class="tl-edge" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" opacity="${o}"/>`);
    }
  }
  /* boxes (2-3-4 view) */
  if (v > 0.01) {
    for (const b of m.boxes) {
      const o = f2(b.a * v);
      out.push(`<rect class="tl-box${b.empty ? " is-empty" : ""}" x="${f1(b.x)}" y="${f1(b.y)}" width="${f1(b.w)}" height="${BOXH}" rx="8" opacity="${o}"/>`);
      if (b.hl > 0.01) out.push(`<rect class="tl-hl" x="${f1(b.x - 3)}" y="${f1(b.y - 3)}" width="${f1(b.w + 6)}" height="${BOXH + 6}" rx="10" opacity="${f2(b.hl * b.a * v)}"/>`);
    }
  }
  /* keys */
  const rx = f1(lerp(PILL_H / 2, 6, v));
  for (const k of m.keys) {
    const [x, y] = pos(k);
    const red = f2(k.red * 100);
    const a = f2(k.a);
    if (k.hl > 0.01) {
      out.push(`<rect class="tl-hl" x="${f1(x - PILL_W / 2 - 4)}" y="${f1(y - PILL_H / 2 - 4)}" width="${PILL_W + 8}" height="${PILL_H + 8}" rx="${f1(rx + 4)}" opacity="${f2(k.hl * k.a)}"/>`);
    }
    if (k.ghost) {
      out.push(`<g opacity="${a}"><rect class="tl-ghost" x="${f1(x - PILL_W / 2)}" y="${f1(y - PILL_H / 2)}" width="${PILL_W}" height="${PILL_H}" rx="${rx}"/><text class="tl-t tl-t--ghost" x="${f1(x)}" y="${f1(y)}">∅</text></g>`);
      continue;
    }
    const fillRb = `color-mix(in srgb, var(--tl-red) ${red}%, var(--tl-black))`;
    const textRb = `color-mix(in srgb, var(--tl-on-red) ${red}%, var(--tl-on-black))`;
    const fill = `color-mix(in srgb, ${fillRb} ${f2((1 - v) * 100)}%, var(--tl-plain))`;
    const text = `color-mix(in srgb, ${textRb} ${f2((1 - v) * 100)}%, var(--ink))`;
    const ringO = k.red * (1 - v);
    const ring = ringO > 0.05
      ? `<rect class="tl-redring" x="${f1(x - PILL_W / 2 + 3)}" y="${f1(y - PILL_H / 2 + 3)}" width="${PILL_W - 6}" height="${PILL_H - 6}" rx="${f1(Math.max(rx - 3, 2))}" opacity="${f2(ringO * 0.75)}"/>`
      : "";
    out.push(
      `<g opacity="${a}"><rect class="tl-pill" x="${f1(x - PILL_W / 2)}" y="${f1(y - PILL_H / 2)}" width="${PILL_W}" height="${PILL_H}" rx="${rx}" style="fill:${fill}"/>` + ring +
      `<text class="tl-t" x="${f1(x)}" y="${f1(y)}" style="fill:${text}">${k.label}</text>` +
      (v > 0.05 ? `<rect class="tl-tick" x="${f1(x - 7)}" y="${f1(y + PILL_H / 2 - 4)}" width="14" height="3" rx="1.5" opacity="${f2(v)}" style="fill:color-mix(in srgb, var(--tl-red) ${red}%, var(--ink-faint))"/>` : "") +
      `</g>`,
    );
  }
  return out.join("");
}

export const viewBoxAttr = (r: Rect) => `${f1(r[0])} ${f1(r[1])} ${f1(r[2])} ${f1(r[3])}`;
