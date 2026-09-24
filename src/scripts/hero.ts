/**
 * hero.ts — behaviour of the landing hero (components/home/Hero.astro).
 *   1. intro: type the command, then print the man page and draw the map;
 *   2. select(project): argument, point, crosshair, card, flag and readouts follow one project;
 *   3. tour: every few seconds the next featured project, until the visitor takes over;
 *   4. keys: j / k move through OPTIONS, Enter opens, q scrolls on to the next section.
 * All state lives in the DOM (data-* attributes written at build time).
 */
import { MAP, AXIS_Y, placeCard, labelSide, type Mark } from "../lib/project-map";

type Point = {
  el: SVGAElement; id: string; x: number; y: number; px: number; py: number;
  title: string; meta: string; hue: string; cat: string; href: string;
};

export function initHero(root: HTMLElement) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;

  /* ---------- data from the markup ---------- */
  const els = [...root.querySelectorAll<SVGAElement>(".hp")];
  const points = new Map<string, Point>(
    els.map((el) => {
      const d = el.dataset;
      return [d.id!, { el, id: d.id!, x: +d.x!, y: +d.y!, px: +d.px!, py: +d.py!, title: d.title!, meta: d.meta!, hue: d.hue!, cat: d.cat!, href: el.getAttribute("href")! }];
    }),
  );
  const ids = [...points.keys()];
  const nextEl = root.querySelector<SVGGElement>("[data-next]");
  const marks: (Mark & { id: string })[] = [...points.values()].map((p) => ({ id: p.id, x: p.x, y: p.y, label: p.id, side: labelSide(p.px) }));
  if (nextEl) marks.push({ id: "next", x: +nextEl.dataset.x!, y: +nextEl.dataset.y!, label: nextEl.dataset.label!, side: "left" });
  const tour = (root.dataset.tour ?? "").split(",").filter((id) => points.has(id));
  let current = root.dataset.selected ?? ids[0];

  const cv = q<SVGLineElement>("[data-cv]"), ch = q<SVGLineElement>("[data-ch]");
  const tx = q<SVGTextElement>("[data-tx]"), ty = q<SVGTextElement>("[data-ty]");
  const card = q<HTMLAnchorElement>("[data-card]");
  const arg = q<HTMLElement>("[data-arg]");
  const flags = [...root.querySelectorAll<HTMLElement>("[data-flag]")];

  /* ---------- crosshair: eased between points ---------- */
  const start = points.get(current)!;
  let at = { x: start.x, y: start.y };
  let frame = 0;
  const draw = ({ x, y }: { x: number; y: number }) => {
    const X = x.toFixed(1), Y = y.toFixed(1);
    cv.setAttribute("x1", X); cv.setAttribute("x2", X); cv.setAttribute("y1", Y); cv.setAttribute("y2", String(AXIS_Y));
    ch.setAttribute("x1", String(MAP.x0)); ch.setAttribute("x2", X); ch.setAttribute("y1", Y); ch.setAttribute("y2", Y);
    tx.setAttribute("x", X); ty.setAttribute("y", (y + 4).toFixed(1));
  };
  const glideTo = (to: { x: number; y: number }) => {
    cancelAnimationFrame(frame);
    if (reduced) { at = { ...to }; draw(at); return; }
    const from = { ...at }, t0 = performance.now(), dur = 520;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      at = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e };
      draw(at);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };

  /* ---------- the argument retypes itself ---------- */
  let typing = 0;
  const typeArg = (word: string) => {
    const me = ++typing;
    let s = arg.textContent ?? "";
    const del = () => {
      if (me !== typing) return;
      if (s.length) { s = s.slice(0, -1); arg.textContent = s; setTimeout(del, 14); return; }
      const add = (n: number) => {
        if (me !== typing) return;
        arg.textContent = word.slice(0, n);
        if (n < word.length) setTimeout(() => add(n + 1), 32);
      };
      add(1);
    };
    del();
  };

  /* ---------- select one project everywhere ---------- */
  const set = (sel: string, text: string) => { q<HTMLElement>(sel).textContent = text; };
  function select(id: string, animateArg = true) {
    const p = points.get(id);
    if (!p) return;
    current = id;
    els.forEach((el) => el.classList.toggle("is-hot", el === p.el));
    glideTo(p);

    card.style.left = `${((p.x / MAP.w) * 100).toFixed(2)}%`;
    card.style.top = `${((p.y / MAP.h) * 100).toFixed(2)}%`;
    const place = placeCard(p, marks.filter((m) => m.id !== p.id));
    card.dataset.h = place.h;
    card.dataset.v = place.v;
    card.href = p.href;
    card.style.setProperty("--c", `var(--hue-${p.hue})`);
    set("[data-card-slug]", p.id);
    set("[data-card-title]", p.title);
    set("[data-card-meta]", p.meta);
    if (!reduced) card.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 380, easing: "ease-out" });

    tx.textContent = p.px.toFixed(2);
    ty.textContent = p.py.toFixed(2);
    set("[data-readout]", `abstraction ${p.px.toFixed(2)} · theory ${p.py.toFixed(2)}`);
    set("[data-pos]", `${ids.indexOf(id) + 1}/${ids.length}`);
    flags.forEach((f) => f.classList.toggle("is-on", f.dataset.flag === p.cat));

    if (animateArg && !reduced) typeArg(id); else arg.textContent = id;
  }

  /* ---------- tour ---------- */
  let timer = 0, manual = false, visible = true;
  const seconds = Number(root.dataset.tourSeconds ?? 3.6);
  const startTour = () => {
    if (reduced || manual || timer || tour.length < 2) return;
    timer = window.setInterval(() => {
      if (!visible || document.hidden) return;
      const i = tour.indexOf(current);
      select(tour[(i + 1) % tour.length]);
    }, seconds * 1000);
  };
  const takeOver = () => { manual = true; clearInterval(timer); timer = 0; };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(root);

  /* ---------- points: hover/focus selects; a tap selects first, the second tap opens ---------- */
  for (const p of points.values()) {
    p.el.addEventListener("pointerenter", (e) => { if ((e as PointerEvent).pointerType === "mouse") { takeOver(); if (current !== p.id) select(p.id); } });
    p.el.addEventListener("focus", () => { takeOver(); if (current !== p.id) select(p.id); });
    p.el.addEventListener("click", (e) => { if (current !== p.id) { e.preventDefault(); takeOver(); select(p.id); } });
  }
  card.addEventListener("pointerenter", takeOver);

  /* ---------- OPTIONS: j / k / Enter, q to read on ---------- */
  const opts = [...root.querySelectorAll<HTMLAnchorElement>("[data-opt]")];
  let sel = 0;
  const setOpt = (n: number) => {
    opts[sel].classList.remove("is-sel");
    sel = (n + opts.length) % opts.length;
    opts[sel].classList.add("is-sel");
  };
  opts.forEach((o, n) => { o.addEventListener("pointerenter", () => setOpt(n)); o.addEventListener("focus", () => setOpt(n)); });
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || !visible) return;
    if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
    if (e.key === "j") setOpt(sel + 1);
    else if (e.key === "k") setOpt(sel - 1);
    else if (e.key === "Enter" && document.activeElement === document.body) opts[sel].click();
    else if (e.key === "q") root.nextElementSibling?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  });

  /* ---------- intro ---------- */
  draw(at);
  if (reduced) { root.classList.add("is-on"); return; }
  const cmd = q<HTMLElement>("[data-cmd]");
  const text = cmd.textContent ?? "";
  cmd.textContent = "";
  root.classList.add("is-typing");
  let n = 0;
  const type = () => {
    cmd.textContent = text.slice(0, ++n);
    if (n < text.length) { setTimeout(type, 40 + Math.random() * 45); return; }
    setTimeout(() => {
      root.classList.remove("is-typing");
      root.classList.add("is-on");
      setTimeout(startTour, 2600);
    }, 260);
  };
  setTimeout(type, 250);
}
