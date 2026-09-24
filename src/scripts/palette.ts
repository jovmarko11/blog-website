/**
 * palette.ts — behaviour of the command palette (components/layout/CommandPalette.astro).
 * Open: ⌘K / Ctrl+K or any [data-palette-open]. Filter: every word of the query must
 * appear in the item's search text; items whose label starts with the query rank first.
 */
export function initPalette(dialog: HTMLDialogElement) {
  const input = dialog.querySelector<HTMLInputElement>("[data-palette-input]")!;
  const items = [...dialog.querySelectorAll<HTMLLIElement>("[data-item]")];
  const groups = [...dialog.querySelectorAll<HTMLLIElement>("li[data-group]:not([data-item])")];
  const empty = dialog.querySelector<HTMLLIElement>("[data-palette-empty]")!;
  const count = dialog.querySelector<HTMLElement>("[data-palette-count]")!;
  let visible: HTMLLIElement[] = items;
  let sel = 0;

  const select = (n: number) => {
    if (!visible.length) return;
    sel = (n + visible.length) % visible.length;
    items.forEach((i) => i.setAttribute("aria-selected", "false"));
    visible[sel].setAttribute("aria-selected", "true");
    visible[sel].scrollIntoView({ block: "nearest" });
  };

  const filter = () => {
    const q = input.value.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    visible = items.filter((i) => {
      const hit = words.every((w) => i.dataset.search!.includes(w));
      i.hidden = !hit;
      return hit;
    });
    groups.forEach((g) => { g.hidden = !visible.some((i) => i.dataset.group === g.dataset.group); });
    empty.hidden = visible.length > 0;
    dialog.querySelector("[data-palette-query]")!.textContent = q;
    count.textContent = `${visible.length} result${visible.length === 1 ? "" : "s"}`;
    // best match first: an item whose label starts with the query
    const first = visible.findIndex((i) => i.querySelector(".cp__label")!.textContent!.toLowerCase().startsWith(q));
    select(first > 0 ? first : 0);
  };

  const open = () => {
    if (dialog.open) return;
    input.value = "";
    filter();
    dialog.showModal();
    input.focus();
  };
  const close = () => dialog.close();

  const run = (item: HTMLLIElement) => {
    const { href, action } = item.dataset;
    if (action === "theme") { document.querySelector<HTMLButtonElement>("[data-theme-toggle]")?.click(); close(); return; }
    if (action === "copy-email") {
      const email = item.querySelector(".cp__meta")!.textContent!;
      navigator.clipboard?.writeText(email).then(
        () => { item.querySelector(".cp__label")!.textContent = "Copied ✓"; setTimeout(close, 600); },
        () => { location.href = `mailto:${email}`; },
      );
      return;
    }
    if (href) {
      close();
      if (/^https?:/.test(href)) window.open(href, "_blank", "noopener"); else location.href = href;
    }
  };

  input.addEventListener("input", filter);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); select(sel + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); select(sel - 1); }
    else if (e.key === "Enter" && visible[sel]) { e.preventDefault(); run(visible[sel]); }
  });
  items.forEach((item) => {
    item.addEventListener("pointermove", () => { const n = visible.indexOf(item); if (n !== sel) select(n); });
    item.addEventListener("click", () => run(item));
  });
  // click on the backdrop closes
  dialog.addEventListener("click", (e) => { if (e.target === dialog) close(); });

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (dialog.open) close(); else open();
    }
  });
  document.querySelectorAll<HTMLElement>("[data-palette-open]").forEach((b) => b.addEventListener("click", open));

  // show the right shortcut on the hint: ⌘K on Apple devices, Ctrl K elsewhere
  const apple = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  if (!apple) document.querySelectorAll<HTMLElement>("[data-palette-key]").forEach((k) => (k.textContent = "Ctrl K"));
}
