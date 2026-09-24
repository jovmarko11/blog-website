/**
 * motion.ts — small, dependency-free scroll motion helpers.
 * Every effect runs once and is skipped when the user prefers reduced motion.
 */
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Adds `.is-in` to every [data-reveal] element the first time it enters the viewport. */
export function initReveal(root: ParentNode = document) {
  const els = root.querySelectorAll<HTMLElement>("[data-reveal]");
  if (reduced() || !("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0 },
  );
  els.forEach((el) => io.observe(el));
}

/**
 * Scroll-linked progress for a vertical timeline.
 * Sets --progress (0 → 1) on `container` as the reader moves through it, and adds
 * `.is-lit` to each `itemSelector` once it passes the reading line (60% of the viewport).
 */
export function initScrollProgress(container: HTMLElement, itemSelector: string, onFirstLit?: (item: HTMLElement) => void) {
  const items = [...container.querySelectorAll<HTMLElement>(itemSelector)];
  const seen = new Set<HTMLElement>();
  if (reduced()) {
    container.style.setProperty("--progress", "1");
    items.forEach((i) => i.classList.add("is-lit"));
    return;
  }
  let ticking = false;
  const update = () => {
    ticking = false;
    const line = window.innerHeight * 0.6;
    const box = container.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (line - box.top) / box.height));
    container.style.setProperty("--progress", p.toFixed(4));
    for (const item of items) {
      const lit = item.getBoundingClientRect().top < line;
      item.classList.toggle("is-lit", lit);
      if (lit && !seen.has(item)) { seen.add(item); onFirstLit?.(item); }
    }
  };
  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
}

/**
 * Count-up numbers: <span data-count="34">34</span> animates 0 → 34 when first seen.
 * The final number is already in the HTML, so nothing breaks without JS.
 */
export function initCountUp(root: ParentNode = document) {
  const els = root.querySelectorAll<HTMLElement>("[data-count]");
  if (reduced() || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const el = e.target as HTMLElement;
      const target = Number(el.dataset.count);
      const t0 = performance.now(), dur = 1100;
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / dur);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(tick);
      };
      el.textContent = "0";
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
}

/** Briefly scrambles an element's text through random hex characters before settling. */
export function scramble(el: HTMLElement, duration = 600) {
  if (reduced()) return;
  const final = el.textContent ?? "";
  const chars = "0123456789abcdef";
  const t0 = performance.now();
  const tick = (now: number) => {
    const k = Math.min(1, (now - t0) / duration);
    const fixed = Math.floor(final.length * k);
    el.textContent = final.slice(0, fixed) + [...final.slice(fixed)].map(() => chars[(Math.random() * 16) | 0]).join("");
    if (k < 1) requestAnimationFrame(tick); else el.textContent = final;
  };
  requestAnimationFrame(tick);
}
