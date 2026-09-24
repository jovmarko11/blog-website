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
    { rootMargin: "0px 0px -12% 0px", threshold: 0.1 },
  );
  els.forEach((el) => io.observe(el));
}

/**
 * Scroll-linked progress for a vertical timeline.
 * Sets --progress (0 → 1) on `container` as the reader moves through it, and adds
 * `.is-lit` to each `itemSelector` once it passes the reading line (60% of the viewport).
 */
export function initScrollProgress(container: HTMLElement, itemSelector: string) {
  const items = [...container.querySelectorAll<HTMLElement>(itemSelector)];
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
    for (const item of items) item.classList.toggle("is-lit", item.getBoundingClientRect().top < line);
  };
  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
}
