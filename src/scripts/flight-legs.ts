/**
 * flight-legs.ts — the player behind <FlightLegs>.
 *
 * One frame per simulation tick (2 simulated minutes). Plays at ~12 ticks per second and holds
 * on the moments that matter (takeoff, redirect, landing) so the readout can be read.
 *   - play/pause, restart, a time slider, ←/→ step one tick while the figure has focus
 *   - autoplay when ≥ 40 % visible; stops for good once the reader takes over
 * With prefers-reduced-motion: no autoplay, the reader scrubs with the slider or arrow keys.
 */
import { readout, svgInner, type LegScene } from "../lib/flight-legs";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const STEP_MS = 85;
const HOLD_MS = 3200;

export function initFlightLegs(root: HTMLElement) {
  if (root.dataset.ready) return;
  root.dataset.ready = "1";

  const scene: LegScene = JSON.parse(root.querySelector("script[data-scene]")!.textContent!);
  const frames = scene.frames;
  const last = frames.length - 1;
  const svg = root.querySelector<SVGSVGElement>(".fl__svg")!;
  const caption = root.querySelector<HTMLElement>("[data-caption]")!;
  const clock = root.querySelector<HTMLElement>("[data-clock]")!;
  const range = root.querySelector<HTMLInputElement>("[data-range]")!;
  const playBtn = root.querySelector<HTMLButtonElement>('[data-act="play"]')!;
  const vals = new Map([...root.querySelectorAll<HTMLElement>("[data-val]")].map((e) => [e.dataset.val!, e]));
  const rows = new Map([...root.querySelectorAll<HTMLElement>("[data-row]")].map((e) => [e.dataset.row!, e]));

  let cur = 0, timer = 0, playing = false, visible = false, touched = false;
  let lastCaption = "";

  /** Frames where something happens get the long hold, and their caption stays up until the next event. */
  const isEvent = (i: number) => i === 0 || frames[i].changed.length > 0;

  function show(i: number) {
    cur = Math.max(0, Math.min(last, i));
    const f = frames[cur];
    svg.innerHTML = svgInner(scene, cur);
    for (const r of readout(f)) vals.get(r.key)!.textContent = r.value;
    for (const [k, el] of rows) el.classList.toggle("is-changed", f.changed.includes(k));
    // keep an event caption on screen for a moment instead of replacing it on the very next tick
    let capIdx = cur;
    for (let j = cur; j >= Math.max(0, cur - 14); j--) if (isEvent(j)) { capIdx = j; break; }
    const text = frames[capIdx].caption;
    if (text !== lastCaption) { caption.innerHTML = text; lastCaption = text; }
    clock.textContent = f.clock;
    range.value = String(cur);
  }

  function schedule() {
    clearTimeout(timer);
    if (!playing || !visible) return;
    const wait = cur >= last ? HOLD_MS : isEvent(cur) ? HOLD_MS : STEP_MS;
    timer = window.setTimeout(() => { show(cur >= last ? 0 : cur + 1); schedule(); }, wait);
  }

  function setPlaying(on: boolean) {
    playing = on;
    playBtn.dataset.state = on ? "playing" : "paused";
    playBtn.setAttribute("aria-label", on ? "Pause" : "Play");
    if (on) schedule(); else clearTimeout(timer);
  }
  const takeOver = () => { touched = true; setPlaying(false); };

  playBtn.addEventListener("click", () => {
    touched = true;
    if (!playing && cur >= last) show(0);
    setPlaying(!playing);
  });
  root.querySelector('[data-act="restart"]')!.addEventListener("click", () => { takeOver(); show(0); });
  range.addEventListener("input", () => { takeOver(); show(Number(range.value)); });
  root.addEventListener("keydown", (e) => {
    if (e.target === range) return; // the slider handles its own arrows
    if (e.key === "ArrowRight") { e.preventDefault(); takeOver(); show(cur + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); takeOver(); show(cur - 1); }
  });

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      visible = e.isIntersecting;
      if (visible && !touched && !playing && root.dataset.autoplay === "true" && !reduced()) setPlaying(true);
      else if (visible) schedule();
      else clearTimeout(timer);
    }
  }, { threshold: 0.4 });
  io.observe(root);

  show(0);
}
