/**
 * tree-lab.ts — the player behind <TreeLab>.
 *
 * Reads the pre-computed frames from the page, tweens between them (nodes slide, fade, recolour)
 * and redraws the SVG panels with lib/tree-render. Features:
 *   - prev / play-pause / next / restart, arrow keys while the figure has focus
 *   - autoplay when the figure scrolls into view (stops for good once the reader takes over)
 *   - morph slider: red-black ↔ 2-3-4 view of the same tree
 * With prefers-reduced-motion: no autoplay and no tweening, the reader steps through frames.
 */
import { mix, svgInner } from "../lib/tree-render";
import type { Scene } from "../lib/tree234";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const TWEEN_MS = 720;

export function initTreeLab(root: HTMLElement) {
  if (root.dataset.ready) return;
  root.dataset.ready = "1";

  const scene: Scene = JSON.parse(root.querySelector("script[data-scene]")!.textContent!);
  const frames = scene.frames;
  const last = frames.length - 1;
  const panels = [...root.querySelectorAll<SVGSVGElement>("svg[data-panel]")];
  const captionEl = root.querySelector<HTMLElement>("[data-caption]");
  const counterEl = root.querySelector<HTMLElement>("[data-counter]");
  const playBtn = root.querySelector<HTMLButtonElement>('[data-act="play"]');
  const slider = root.querySelector<HTMLInputElement>("[data-view]");
  const morph = root.dataset.mode === "morph";

  let cur = 0; // committed frame
  let from = 0, to = 0, p = 1; // current tween
  let v = Number(root.dataset.startView ?? (morph ? 0 : 1)); // morph position for the single panel
  let raf = 0, timer = 0;
  let wantPlay = root.dataset.autoplay === "true" && last > 0 && !reduced();
  let visible = false;
  let touched = false;

  const panelView = (s: SVGSVGElement) => (s.dataset.panel === "t" ? 1 : s.dataset.panel === "rb" ? 0 : v);

  function draw() {
    const m = mix(frames[from], frames[to], p);
    for (const s of panels) s.innerHTML = svgInner(m, panelView(s));
  }

  function label(i: number) {
    root.dataset.kind = frames[i].kind;
    if (captionEl) captionEl.innerHTML = frames[i].caption;
    if (counterEl) counterEl.textContent = `${i + 1} / ${frames.length}`;
    const prev = root.querySelector<HTMLButtonElement>('[data-act="prev"]');
    const next = root.querySelector<HTMLButtonElement>('[data-act="next"]');
    if (prev) prev.disabled = i === 0;
    if (next) next.disabled = i === last;
  }

  function goTo(i: number) {
    i = Math.max(0, Math.min(last, i));
    cancelAnimationFrame(raf);
    if (p < 1) cur = to; // interrupted mid-tween: continue from where it was heading
    from = cur;
    to = i;
    label(i);
    if (reduced() || from === to) { cur = i; from = to = i; p = 1; draw(); return; }
    p = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const x = Math.min(1, (t - t0) / TWEEN_MS);
      p = ease(x);
      draw();
      if (x < 1) raf = requestAnimationFrame(tick);
      else { cur = i; from = to = i; p = 1; draw(); }
    };
    raf = requestAnimationFrame(tick);
  }

  function dwell(i: number) {
    const text = frames[i].caption.replace(/<[^>]+>/g, "");
    return Math.min(7000, 1500 + text.length * 22);
  }

  function schedule() {
    clearTimeout(timer);
    if (!wantPlay || !visible) return;
    timer = window.setTimeout(() => {
      if (cur >= last) { goTo(0); } else { goTo(cur + 1); }
      schedule();
    }, cur >= last ? 3200 : dwell(cur));
  }

  function setPlaying(on: boolean) {
    wantPlay = on;
    if (playBtn) {
      playBtn.setAttribute("aria-label", on ? "Pause" : "Play");
      playBtn.dataset.state = on ? "playing" : "paused";
    }
    if (on) schedule(); else clearTimeout(timer);
  }

  function takeOver() { touched = true; setPlaying(false); }

  root.querySelector('[data-act="prev"]')?.addEventListener("click", () => { takeOver(); goTo(cur - 1); });
  root.querySelector('[data-act="next"]')?.addEventListener("click", () => { takeOver(); goTo(cur + 1); });
  root.querySelector('[data-act="restart"]')?.addEventListener("click", () => { takeOver(); goTo(0); });
  playBtn?.addEventListener("click", () => {
    touched = true;
    if (!wantPlay && cur >= last) goTo(0);
    setPlaying(!wantPlay);
  });
  root.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === "ArrowRight") { e.preventDefault(); takeOver(); goTo(cur + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); takeOver(); goTo(cur - 1); }
  });

  /* morph slider */
  function setView(x: number) { v = Math.max(0, Math.min(1, x)); if (slider) slider.value = String(Math.round(v * 100)); draw(); }
  let vRaf = 0;
  function tweenView(target: number, ms = 1600) {
    cancelAnimationFrame(vRaf);
    if (reduced()) { setView(target); return; }
    const v0 = v, t0 = performance.now();
    const tick = (t: number) => {
      const x = Math.min(1, (t - t0) / ms);
      setView(v0 + (target - v0) * ease(x));
      if (x < 1) vRaf = requestAnimationFrame(tick);
    };
    vRaf = requestAnimationFrame(tick);
  }
  slider?.addEventListener("input", () => { cancelAnimationFrame(vRaf); touched = true; v = Number(slider.value) / 100; draw(); });
  root.querySelectorAll<HTMLButtonElement>("[data-goto-view]").forEach((b) =>
    b.addEventListener("click", () => { touched = true; tweenView(Number(b.dataset.gotoView)); }),
  );

  /* start playing when the figure is on screen */
  let demoDone = false;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      visible = e.isIntersecting;
      if (visible) {
        if (morph && !demoDone && !touched && !reduced() && root.dataset.autoplay === "true") {
          demoDone = true;
          // one gentle demo: current view → other view → back
          const start = v, other = start < 0.5 ? 1 : 0;
          tweenView(other, 2200);
          window.setTimeout(() => { if (!touched) tweenView(start, 2200); }, 4200);
        }
        if (!touched) schedule();
      } else clearTimeout(timer);
    }
  }, { threshold: 0.4 });
  io.observe(root);

  label(0);
  setPlaying(wantPlay);
  draw();
}
