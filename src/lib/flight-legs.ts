/**
 * flight-legs.ts — scene and SVG for <FlightLegs>: one plane of the flight simulator, tick by tick,
 * with the fields of the Java Airplane (startX/startY, startSimTime, target, speed, traveled, total)
 * as they are on every tick. The scene comes from lib/flight-sim.ts running the assignment's test
 * data, so the plane moves exactly as it does in the real program (including a mid-flight redirect).
 *
 *   buildScene(opts)   frames, one per simulation tick, plus captions (build time)
 *   svgInner(scene, i) the map for frame i (build time for frame 0, browser for the rest)
 * No DOM access. Colours come from CSS variables set on the component (--fl-*).
 */
import { Sim, TEST_AIRPORTS, TEST_FLIGHTS, formatSimTime, type Airport } from "./flight-sim";

export interface LegFrame {
  t: number; clock: string;
  state: "WAITING" | "FLYING" | "LANDED";
  x: number; y: number; heading: number;
  startX: number; startY: number; startSimTime: number;
  target: string; speed: number; traveled: number; total: number;
  leg: number; // 1 before the redirect, 2 after
  caption: string;
  changed: string[]; // readout rows that changed on this frame
}
export interface LegScene {
  frames: LegFrame[];
  airports: Airport[];
  from: string; plannedTo: string; redirectTo?: string;
  box: { x0: number; x1: number; y0: number; y1: number };
  redirectFrame: number;
}

export interface LegOpts { from: string; to: string; redirectAt?: string; redirectTo?: string; startAt: string; endAt: string; show: string[] }

const secs = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 3600 + m * 60; };
const r2 = (n: number) => Math.round(n * 100) / 100;
const dur = (s: number) => `${Math.floor(s / 3600)} h ${String(Math.round((s % 3600) / 60)).padStart(2, "0")} min`;

export function buildScene(o: LegOpts): LegScene {
  const probe = new Sim(TEST_AIRPORTS, TEST_FLIGHTS);
  const idx = probe.planes.findIndex((p) => p.flight.from === o.from && p.flight.to === o.to);
  if (idx < 0) throw new Error(`FlightLegs: no flight ${o.from} -> ${o.to} in the test data`);
  const redirects = o.redirectAt && o.redirectTo ? [{ at: secs(o.redirectAt), plane: idx, to: o.redirectTo }] : [];
  if (redirects.length && redirects[0].at % 120) throw new Error("FlightLegs: redirectAt must fall on a tick (multiple of 2 min)");
  const sim = new Sim(TEST_AIRPORTS, TEST_FLIGHTS, redirects);
  const plane = sim.planes[idx];
  const start = secs(o.startAt), end = secs(o.endAt);
  const takeoff = () => sim.events.find((e) => e.plane === idx && e.kind === "TAKEOFF")?.t;

  const frames: LegFrame[] = [];
  let leg = 1, redirectFrame = -1, prev: LegFrame | undefined;
  while (sim.now < end) {
    sim.tick();
    if (sim.now < start) continue;
    const ev = sim.events.filter((e) => e.plane === idx && e.t === sim.now).map((e) => e.kind);
    if (ev.includes("REDIRECTED")) { leg = 2; redirectFrame = frames.length; }
    const flying = plane.state !== "WAITING";
    const total = Math.hypot(plane.startX - plane.target.x, plane.startY - plane.target.y);
    const traveled = flying ? Math.min(plane.speed * (sim.now - plane.startSimTime), total) : 0;
    const clock = formatSimTime(sim.now);
    let caption: string;
    if (plane.state === "WAITING")
      caption = `<b>${clock} · WAITING</b> at ${o.from}. Departure is ${plane.flight.dep}; until then the plane is not drawn and <code>update()</code> returns straight away.`;
    else if (ev.includes("TAKEOFF"))
      caption = `<b>${clock} · takeOff()</b>. The leg starts here: <code>startSimTime</code> = now, and <code>speed</code> = distance / (${plane.flight.duration} min × 60), so the plane covers ${o.from}→${o.to} in exactly the planned ${plane.flight.duration} minutes.`;
    else if (ev.includes("REDIRECTED"))
      caption = `<b>${clock} · redirect(${o.redirectTo})</b>. The current position becomes the new leg start, <code>startSimTime</code> becomes now and <code>target</code> changes. <code>speed</code> stays: the plane keeps its cruise speed on the new route.`;
    else if (ev.includes("LANDED")) {
      const tk = takeoff()!;
      caption = `<b>${clock} · LANDED</b> at ${plane.target.code}: <code>traveled ≥ total</code> on the current leg. ${dur(sim.now - tk)} after takeoff${leg === 2 ? `, not the ${plane.flight.duration / 60} h the flight plan said, because the landing is decided by distance, not by a precomputed time` : ""}.`;
    } else if (plane.state === "LANDED")
      caption = `<b>${clock} · LANDED</b> at ${plane.target.code}. The plane is hidden again and every later <code>update()</code> returns straight away.`;
    else
      caption = leg === 1
        ? `<b>${clock} · leg 1</b>. Nothing is accumulated between ticks: every tick recomputes <code>traveled = speed · (now − startSimTime)</code> and places the plane at <code>traveled / total</code> of the way along the leg.`
        : `<b>${clock} · leg 2</b>. Same formula, new starting point. Pausing, a slow frame or a skipped tick cannot push the plane off its line, because its position depends only on the clock.`;

    const f: LegFrame = {
      t: sim.now, clock, state: plane.state, x: plane.x, y: plane.y, heading: plane.heading,
      startX: plane.startX, startY: plane.startY, startSimTime: plane.startSimTime,
      target: plane.target.code, speed: plane.speed, traveled, total, leg, caption, changed: [],
    };
    if (prev) {
      if (prev.state !== f.state) f.changed.push("state");
      if (prev.startX !== f.startX || prev.startY !== f.startY) f.changed.push("start");
      if (prev.startSimTime !== f.startSimTime) f.changed.push("startSimTime");
      if (prev.target !== f.target) f.changed.push("target");
      if (prev.speed !== f.speed) f.changed.push("speed");
    }
    frames.push(f);
    prev = f;
  }
  if (o.redirectAt && redirectFrame < 0) throw new Error("FlightLegs: the redirect falls outside [startAt, endAt]");

  const airports = TEST_AIRPORTS.filter((a) => o.show.includes(a.code));
  const xs = airports.map((a) => a.x), ys = airports.map((a) => a.y);
  const box = { x0: Math.min(...xs) - 6, x1: Math.max(...xs) + 10, y0: Math.min(...ys) - 5, y1: Math.max(...ys) + 5 };
  return { frames, airports, from: o.from, plannedTo: o.to, redirectTo: o.redirectTo, box, redirectFrame };
}

/* ---------- rendering ---------- */

export const SCALE = 8; // px per simulation unit
export function viewBox(s: LegScene) {
  return `0 0 ${Math.round((s.box.x1 - s.box.x0) * SCALE)} ${Math.round((s.box.y1 - s.box.y0) * SCALE)}`;
}
const f1 = (n: number) => Math.round(n * 10) / 10;

/** The plane outline from AirplaneComponent.createPlaneShape(): upper half, mirrored. */
const HALF = [[2.0, 0], [0.7, 0.35], [0.3, 1.3], [-0.1, 1.3], [0.1, 0.35], [-1.2, 0.35], [-1.3, 0.9], [-1.7, 0.9], [-1.7, 0]];
const PLANE = (() => {
  const pts = [...HALF, ...HALF.slice(0, -1).reverse().map(([x, y]) => [x, -y])];
  return "M" + pts.map(([x, y]) => `${x} ${y}`).join("L") + "Z";
})();

export function svgInner(s: LegScene, i: number): string {
  const { box } = s;
  const X = (x: number) => f1((x - box.x0) * SCALE);
  const Y = (y: number) => f1((box.y1 - y) * SCALE); // screen y grows downwards
  const fr = s.frames[i];
  const W = (box.x1 - box.x0) * SCALE, H = (box.y1 - box.y0) * SCALE;
  const ap = new Map(s.airports.map((a) => [a.code, a]));
  const from = ap.get(s.from)!, planned = ap.get(s.plannedTo)!;
  let out = "";

  // grid every 10 units, like the program's map grid
  for (let gx = Math.ceil(box.x0 / 10) * 10; gx <= box.x1; gx += 10) out += `<line class="fl-grid" x1="${X(gx)}" y1="0" x2="${X(gx)}" y2="${f1(H)}"/>`;
  for (let gy = Math.ceil(box.y0 / 10) * 10; gy <= box.y1; gy += 10) out += `<line class="fl-grid" x1="0" y1="${Y(gy)}" x2="${f1(W)}" y2="${Y(gy)}"/>`;

  // leg 1: the original plan; abandoned (dashed) once the plane is redirected
  const r = s.redirectFrame >= 0 ? s.frames[s.redirectFrame] : undefined;
  if (fr.leg === 1) {
    out += `<line class="fl-plan" x1="${X(from.x)}" y1="${Y(from.y)}" x2="${X(planned.x)}" y2="${Y(planned.y)}"/>`;
    if (fr.state !== "WAITING") out += `<line class="fl-flown" x1="${X(from.x)}" y1="${Y(from.y)}" x2="${X(fr.x)}" y2="${Y(fr.y)}"/>`;
  } else if (r) {
    const dest = ap.get(fr.target)!;
    out += `<line class="fl-plan fl-plan--old" x1="${X(r.startX)}" y1="${Y(r.startY)}" x2="${X(planned.x)}" y2="${Y(planned.y)}"/>`;
    out += `<line class="fl-flown fl-flown--old" x1="${X(from.x)}" y1="${Y(from.y)}" x2="${X(r.startX)}" y2="${Y(r.startY)}"/>`;
    out += `<line class="fl-plan" x1="${X(r.startX)}" y1="${Y(r.startY)}" x2="${X(dest.x)}" y2="${Y(dest.y)}"/>`;
    out += `<line class="fl-flown" x1="${X(r.startX)}" y1="${Y(r.startY)}" x2="${X(fr.x)}" y2="${Y(fr.y)}"/>`;
  }

  // leg start marker: (startX, startY)
  if (fr.state !== "WAITING") {
    out += `<circle class="fl-start" cx="${X(fr.startX)}" cy="${Y(fr.startY)}" r="7"/>`;
    out += `<text class="fl-lab fl-lab--start" x="${X(fr.startX) + 10}" y="${Y(fr.startY) + 20}">leg ${fr.leg} start</text>`;
  }

  for (const a of s.airports) {
    const tgt = a.code === fr.target;
    out += `<rect class="fl-ap${tgt ? " is-target" : ""}" x="${X(a.x) - 6}" y="${Y(a.y) - 6}" width="12" height="12"/>`;
    out += `<text class="fl-lab${tgt ? " is-target" : ""}" x="${X(a.x) + 10}" y="${Y(a.y) + 4}">${a.code}</text>`;
  }

  // the plane, rotated like AirplaneComponent.draw(): rotate(-heading), scaled by AIRPLANE_RADIUS
  if (fr.state === "FLYING") {
    const deg = f1((-fr.heading * 180) / Math.PI);
    out += `<path class="fl-plane" d="${PLANE}" transform="translate(${X(fr.x)} ${Y(fr.y)}) rotate(${deg}) scale(7)"/>`;
  }
  return out;
}

/** The readout rows: the Airplane fields on this frame. */
export function readout(fr: LegFrame): { key: string; name: string; value: string }[] {
  const flying = fr.state !== "WAITING";
  return [
    { key: "now", name: "now", value: `${fr.t} s  (${fr.clock})` },
    { key: "state", name: "state", value: fr.state },
    { key: "start", name: "startX, startY", value: `${r2(fr.startX)}, ${r2(fr.startY)}` },
    { key: "startSimTime", name: "startSimTime", value: flying ? `${fr.startSimTime} s` : "–" },
    { key: "target", name: "target", value: fr.target },
    { key: "speed", name: "speed", value: flying ? `${fr.speed.toFixed(6)} u/s` : "–" },
    { key: "traveled", name: "traveled", value: flying ? r2(fr.traveled).toFixed(2) : "–" },
    { key: "total", name: "total", value: flying ? r2(fr.total).toFixed(2) : "–" },
  ];
}
