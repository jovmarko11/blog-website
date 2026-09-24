/**
 * trajectory-scene.ts — geometry of the About header: my path through
 * (code, math & physics, time) space, seen by a camera that slowly turns,
 * with a "time plane" sweeping forward and lighting up each step as it passes.
 * Pure function of (camera angle, sweep position) → 2D coordinates.
 */
import { project, toWorld, FLOOR, type Camera } from "./projection";
import { trajectory } from "../data/about";

export const VIEW = { w: 440, h: 320 };
export const BASE_YAW = 1.08;

export const camera = (yaw = BASE_YAW): Camera => ({ yaw, pitch: 0.38, scale: 116, cx: 200, cy: 160, distance: 6 });

const steps = trajectory.filter((p) => !p.next);
const next = trajectory.find((p) => p.next)!;
const TIME_TICKS = [
  { t: 0, label: "high school" },
  { t: 0.52, label: "2024" },
  { t: 0.9, label: "now" },
];

type Seg = [number, number, number, number];
const seg = (a: { x: number; y: number }, b: { x: number; y: number }): Seg => [a.x, a.y, b.x, b.y];

export function scene(yaw: number, sweep: number) {
  const cam = camera(yaw);
  const P = (code: number, theory: number, time: number) => project(toWorld(code, theory, time), cam);

  // floor grid (theory = 0): lines of constant code and of constant time
  const grid: Seg[] = [];
  for (let c = 0; c <= 1.0001; c += 0.25) grid.push(seg(P(c, 0, 0), P(c, 0, 1)));
  for (let t = 0; t <= 1.0001; t += 0.25) grid.push(seg(P(0, 0, t), P(1, 0, t)));

  const o = P(0, 0, 0);
  const axes = {
    code: seg(o, P(1.12, 0, 0)),
    theory: seg(o, P(0, 1.08, 0)),
    time: seg(o, P(0, 0, 1.14)),
  };
  const axisLabels = {
    code: (() => { const q = P(1.16, 0, 0); return { x: q.x, y: q.y + 14 }; })(),
    theory: P(0, 1.14, 0),
    time: P(0, 0, 1.2),
  };
  const ticks = TIME_TICKS.map((k) => { const q = P(-0.06, 0, k.t); return { x: q.x, y: q.y + 16, label: k.label, on: k.t <= sweep }; });

  const pts = steps.map((p) => {
    const s = P(p.code, p.theory, p.time);
    const f = P(p.code, 0, p.time);
    return { x: s.x, y: s.y, fx: f.x, fy: f.y, on: p.time <= sweep, now: !!p.now, label: p.label };
  });

  // path up to the sweep, with a partial last segment
  const path: string[] = [];
  for (let i = 0; i < steps.length; i++) {
    const p = steps[i];
    if (p.time <= sweep) { path.push(`${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`); continue; }
    const prev = steps[i - 1];
    if (prev && prev.time <= sweep) {
      const k = (sweep - prev.time) / (p.time - prev.time);
      const q = P(prev.code + (p.code - prev.code) * k, prev.theory + (p.theory - prev.theory) * k, sweep);
      path.push(`${q.x.toFixed(1)},${q.y.toFixed(1)}`);
    }
    break;
  }

  const last = steps[steps.length - 1];
  const nextShown = sweep >= next.time - 0.02;
  const nextSeg = seg(P(last.code, last.theory, last.time), P(next.code, next.theory, next.time));
  const nextPt = P(next.code, next.theory, next.time);

  // the sweeping "time plane"
  const s = Math.min(sweep, 1);
  const plane = [P(0, 0, s), P(1, 0, s), P(1, 1, s), P(0, 1, s)].map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");

  return { grid, axes, axisLabels, ticks, pts, path: path.join(" "), nextShown, nextSeg, nextPt, nextLabel: next.label, plane, planeOn: sweep < 1.001 };
}
