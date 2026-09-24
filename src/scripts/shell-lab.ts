/**
 * shell-lab.ts — the player behind <ShellLab>.
 *
 * Every frame is a complete state: for each element with data-k it sets data-s (and, when the frame
 * says so, its text and its --v variable). CSS transitions do the motion. Controls, autoplay and
 * reduced-motion behaviour match tree-lab.ts.
 */
import type { LabFrame } from "../lib/shell-model";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initShellLab(root: HTMLElement) {
  if (root.dataset.ready) return;
  root.dataset.ready = "1";

  const frames: LabFrame[] = JSON.parse(root.querySelector("script[data-frames]")!.textContent!);
  const last = frames.length - 1;
  const els = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>("[data-k]").forEach((el) => els.set(el.dataset.k!, el));
  const captionEl = root.querySelector<HTMLElement>("[data-caption]");
  const counterEl = root.querySelector<HTMLElement>("[data-counter]");
  const playBtn = root.querySelector<HTMLButtonElement>('[data-act="play"]');
  const prevBtn = root.querySelector<HTMLButtonElement>('[data-act="prev"]');
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-act="next"]');

  let cur = 0, timer = 0, visible = false, touched = false;
  let wantPlay = root.dataset.autoplay === "true" && last > 0 && !reduced();

  function show(i: number) {
    cur = Math.max(0, Math.min(last, i));
    const f = frames[cur];
    for (const [k, el] of els) {
      el.dataset.s = f.s[k] ?? "";
      if (f.t && k in f.t) el.textContent = f.t[k];
      if (f.v && k in f.v) el.style.setProperty("--v", f.v[k]);
    }
    root.dataset.kind = f.kind;
    if (captionEl) captionEl.innerHTML = f.caption;
    if (counterEl) counterEl.textContent = `${cur + 1} / ${frames.length}`;
    if (prevBtn) prevBtn.disabled = cur === 0;
    if (nextBtn) nextBtn.disabled = cur === last;
  }

  const dwell = (i: number) => Math.min(8000, 1600 + frames[i].caption.replace(/<[^>]+>/g, "").length * 24);

  function schedule() {
    clearTimeout(timer);
    if (!wantPlay || !visible) return;
    timer = window.setTimeout(() => { show(cur >= last ? 0 : cur + 1); schedule(); }, cur >= last ? 3600 : dwell(cur));
  }

  function setPlaying(on: boolean) {
    wantPlay = on;
    if (playBtn) {
      playBtn.setAttribute("aria-label", on ? "Pause" : "Play");
      playBtn.dataset.state = on ? "playing" : "paused";
    }
    if (on) schedule(); else clearTimeout(timer);
  }

  const takeOver = () => { touched = true; setPlaying(false); };
  prevBtn?.addEventListener("click", () => { takeOver(); show(cur - 1); });
  nextBtn?.addEventListener("click", () => { takeOver(); show(cur + 1); });
  root.querySelector('[data-act="restart"]')?.addEventListener("click", () => { takeOver(); show(0); });
  playBtn?.addEventListener("click", () => {
    touched = true;
    if (!wantPlay && cur >= last) show(0);
    setPlaying(!wantPlay);
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); takeOver(); show(cur + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); takeOver(); show(cur - 1); }
  });

  new IntersectionObserver((entries) => {
    for (const e of entries) {
      visible = e.isIntersecting;
      if (visible && !touched) schedule();
      else if (!visible) clearTimeout(timer);
    }
  }, { threshold: 0.4 }).observe(root);

  show(0);
  setPlaying(wantPlay);
}
