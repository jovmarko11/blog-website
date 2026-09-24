/**
 * tree234.ts — a 2-3-4 tree that also knows its red-black face.
 *
 * Powers <TreeLab>: it runs insert / delete / search on a real 2-3-4 tree and records a
 * snapshot ("frame") after every meaningful step. Each frame carries positions for BOTH views:
 *   t  — the 2-3-4 view (boxes holding 1–3 keys)
 *   rb — the red-black view (one circle per key, black or red)
 * so the client can play the operation in either view, or morph one into the other.
 *
 * The algorithms mirror the C++ project (jovmarko11/2-3-4-and-RB-Tree-Process-Scheduler-ASP-II):
 *   - insert: walk down to a leaf, and if a node is full split it FIRST (middle key goes up,
 *     the other two become separate nodes), then insert into the correct half. Splits cascade upward.
 *   - a node with two keys is a 3-node and can be drawn two ways (`lean`): black key = the larger
 *     one with the red key on its left ("L"), or black = the smaller one with the red on its right ("R").
 *     The project encodes this in three slots: slot 1 is always black, slots 0 and 2 are red.
 *   - delete (not in the project yet): swap with the in-order successor, then borrow from a sibling
 *     or merge with it, moving upward while the parent underflows.
 *
 * Pure functions, no DOM: runs at build time inside Astro and under Node for tests.
 */

export type Lean = "L" | "R";

export interface N {
  id: number;
  keys: number[];
  kids: N[];
  /** Only meaningful for 2-key nodes (see file comment). */
  lean: Lean;
}

/* ---------- geometry constants (shared with the client renderer) ---------- */
export const GEO = {
  KW: 34, // width of one key slot inside a 2-3-4 box
  PAD: 3, // box padding
  BOXH: 36, // box height
  GAP: 18, // gap between sibling boxes
  DY: 74, // vertical distance between 2-3-4 levels
  RBU: 34, // horizontal distance between in-order neighbours in the RB view
  RBDY: 54, // vertical distance between RB levels
  PILL_W: 30,
  PILL_H: 26,
  MARGIN: 14,
} as const;

/* ---------- frame data (serialised into the page as JSON) ---------- */
export type Kind =
  | "info" | "descend" | "found" | "missing" | "insert" | "warn" | "split"
  | "swap" | "remove" | "underflow" | "borrow" | "merge" | "shrink";

export interface FKey {
  id: string; // "k25" or ghost "g7"
  label: string; // "25" or "" for ghost
  c: "B" | "R";
  ghost?: boolean;
  /** RB-view centre */ rb: [number, number];
  /** 2-3-4-view centre */ t: [number, number];
}
export interface FBox { id: number; x: number; y: number; w: number; empty?: boolean }
export interface Frame {
  caption: string;
  kind: Kind;
  keys: FKey[];
  boxes: FBox[];
  rbEdges: [string, string][];
  /** [parent box id, slot index (0..k), child box id] */
  tEdges: [number, number, number][];
  hk: string[]; // highlighted key ids
  hn: number[]; // highlighted box ids
}
export type Rect = [number, number, number, number];
export interface Scene { frames: Frame[]; view: { t: Rect; rb: Rect; m: Rect } }

export type Op = ["insert", number] | ["delete", number] | ["search", number];

/** An explicit tree: keys of one node, its children, and (2-key nodes only) which key is black. */
export interface Spec { k: number[]; c?: Spec[]; lean?: Lean }

/* ---------- basic tree helpers ---------- */
export class Tree {
  root: N | null = null;
  private seq = 1;
  mk(keys: number[], kids: N[] = [], lean: Lean = "L"): N {
    return { id: this.seq++, keys, kids, lean };
  }
}

const rank = (n: N, k: number) => { let r = 0; while (r < n.keys.length && n.keys[r] < k) r++; return r; };
const isLeaf = (n: N) => n.kids.length === 0;
const kid = (id: number | string) => (typeof id === "number" ? `k${id}` : id);

/** Colour of every key in a node, in key order. */
export function colors(n: N): ("B" | "R")[] {
  switch (n.keys.length) {
    case 0: return [];
    case 1: return ["B"];
    case 2: return n.lean === "L" ? ["R", "B"] : ["B", "R"];
    default: return ["R", "B", "R"];
  }
}

/** Removes key j from n and keeps the black key where it was ("shrinking a node never recolours the middle"). */
function dropKey(n: N, j: number) {
  const before = n.keys.length;
  n.keys.splice(j, 1);
  if (before === 3) n.lean = j === 0 ? "R" : j === 2 ? "L" : "R";
}

/** Adds key k to a node (keys only; children are the caller's job). Returns the new index. */
function addKey(n: N, k: number): number {
  const r = rank(n, k);
  const before = n.keys.length;
  n.keys.splice(r, 0, k);
  if (before === 1) n.lean = r === 0 ? "L" : "R"; // same rule as insertProcessIntoNode1 in the C++ code
  return r;
}

/* ---------- red-black view ---------- */
interface RB { id: string; c: "B" | "R"; ghost?: boolean; l: RB | null; r: RB | null }

function rbOf(n: N | undefined): RB | null {
  if (!n) return null;
  const ch = (i: number) => (n.kids.length ? rbOf(n.kids[i]) : null);
  const [k0, k1, k2] = n.keys;
  switch (n.keys.length) {
    case 0: return { id: `g${n.id}`, c: "B", ghost: true, l: ch(0), r: null };
    case 1: return { id: kid(k0), c: "B", l: ch(0), r: ch(1) };
    case 2:
      return n.lean === "L"
        ? { id: kid(k1), c: "B", l: { id: kid(k0), c: "R", l: ch(0), r: ch(1) }, r: ch(2) }
        : { id: kid(k0), c: "B", l: ch(0), r: { id: kid(k1), c: "R", l: ch(1), r: ch(2) } };
    default:
      return {
        id: kid(k1), c: "B",
        l: { id: kid(k0), c: "R", l: ch(0), r: ch(1) },
        r: { id: kid(k2), c: "R", l: ch(2), r: ch(3) },
      };
  }
}

/* ---------- layout ---------- */
const r1 = (v: number) => Math.round(v * 10) / 10;

export function frameOf(
  root: N | null, caption: string, kind: Kind, hk: (number | string)[] = [], hn: number[] = [],
): Frame {
  const { KW, PAD, BOXH, GAP, DY, RBU, RBDY } = GEO;
  const keys = new Map<string, FKey>();
  const boxes: FBox[] = [];
  const tEdges: Frame["tEdges"] = [];
  const rbEdges: Frame["rbEdges"] = [];
  if (!root) return { caption, kind, keys: [], boxes, rbEdges, tEdges, hk: [], hn: [] };

  /* 2-3-4 view: leaves left to right, parents centred over their children */
  let cursor = 0;
  const place = (n: N, depth: number): { x: number; w: number } => {
    const w = Math.max(1, n.keys.length) * KW + 2 * PAD;
    let x: number;
    if (isLeaf(n)) { x = cursor; cursor += w + GAP; }
    else {
      const cs = n.kids.map((c, i) => {
        const p = place(c, depth + 1);
        tEdges.push([n.id, i, c.id]);
        return p;
      });
      const a = cs[0], b = cs[cs.length - 1];
      x = (a.x + a.w / 2 + b.x + b.w / 2) / 2 - w / 2;
    }
    const y = depth * DY;
    boxes.push({ id: n.id, x: r1(x), y, w, ...(n.keys.length === 0 ? { empty: true } : {}) });
    const cols = colors(n);
    if (n.keys.length === 0) {
      keys.set(`g${n.id}`, { id: `g${n.id}`, label: "", c: "B", ghost: true, rb: [0, 0], t: [r1(x + w / 2), y + BOXH / 2] });
    } else {
      n.keys.forEach((k, j) => {
        keys.set(kid(k), { id: kid(k), label: String(k), c: cols[j], rb: [0, 0], t: [r1(x + PAD + j * KW + KW / 2), y + BOXH / 2] });
      });
    }
    return { x, w };
  };
  place(root, 0);

  /* red-black view: x = in-order position, y = RB depth */
  let idx = 0;
  const walk = (t: RB | null, depth: number): void => {
    if (!t) return;
    walk(t.l, depth + 1);
    const key = keys.get(t.id)!;
    key.rb = [idx++ * RBU, depth * RBDY];
    walk(t.r, depth + 1);
  };
  const tree = rbOf(root)!;
  walk(tree, 0);
  const edges = (t: RB | null) => {
    if (!t) return;
    if (t.l) { rbEdges.push([t.id, t.l.id]); edges(t.l); }
    if (t.r) { rbEdges.push([t.id, t.r.id]); edges(t.r); }
  };
  edges(tree);

  const list = [...keys.values()];
  for (const k of list) { k.rb = [r1(k.rb[0]), r1(k.rb[1])]; }
  return { caption, kind, keys: list, boxes, rbEdges, tEdges, hk: hk.map(kid), hn };
}

/* ---------- recorder ---------- */
type Snap = (caption: string, kind: Kind, hk?: (number | string)[], hn?: number[]) => void;

class Rec {
  frames: Frame[] = [];
  constructor(private t: Tree) {}
  snap: Snap = (caption, kind, hk = [], hn = []) => {
    this.frames.push(frameOf(this.t.root, caption, kind, hk, hn));
  };
}

const code = (a: number[]) => `<code>[${a.join(" ")}]</code>`;
const nodeHk = (n: N) => (n.keys.length ? n.keys : [`g${n.id}`]);

function between(n: N, r: number): string {
  if (r === 0) return `left of ${n.keys[0]}`;
  if (r === n.keys.length) return `right of ${n.keys[n.keys.length - 1]}`;
  return `between ${n.keys[r - 1]} and ${n.keys[r]}`;
}

/* ---------- search ---------- */
export function search(t: Tree, k: number, rec?: Rec): boolean {
  let n = t.root;
  let visited = 0;
  if (!n) { rec?.snap(`The tree is empty, so ${k} is not in it.`, "missing"); return false; }
  while (n) {
    visited++;
    if (n.keys.includes(k)) {
      rec?.snap(`Found <b>${k}</b> in ${code(n.keys)} after visiting ${visited} node${visited > 1 ? "s" : ""}. In the red-black view this is an ordinary binary-search-tree lookup; the colours play no part.`, "found", [k], [n.id]);
      return true;
    }
    const r = rank(n, k);
    if (isLeaf(n)) {
      rec?.snap(`${code(n.keys)} is a leaf and ${k} is not in it: <b>${k} is not in the tree</b> (${visited} node${visited > 1 ? "s" : ""} visited).`, "missing", nodeHk(n), [n.id]);
      return false;
    }
    rec?.snap(`Visit ${code(n.keys)}: ${k} lies ${between(n, r)}, so go down to that child.`, "descend", nodeHk(n), [n.id]);
    n = n.kids[r];
  }
  return false;
}

/* ---------- insert (mirrors Insert.cpp: split a full node first, then insert into the correct half) ---------- */
export function insert(t: Tree, k: number, rec?: Rec): void {
  if (!t.root) {
    t.root = t.mk([k]);
    rec?.snap(`The tree is empty: <b>${k}</b> becomes the root, a black node.`, "insert", [k], [t.root.id]);
    return;
  }
  const path: N[] = [];
  let p = t.root;
  while (!isLeaf(p)) {
    if (p.keys.includes(k)) { rec?.snap(`${k} is already in the tree.`, "info", [k], [p.id]); return; }
    path.push(p);
    const r = rank(p, k);
    rec?.snap(`Visit ${code(p.keys)}: ${k} lies ${between(p, r)}, so go down to that child.`, "descend", nodeHk(p), [p.id]);
    p = p.kids[r];
  }
  if (p.keys.includes(k)) { rec?.snap(`${k} is already in the tree.`, "info", [k], [p.id]); return; }
  const leaf = p;

  /* leaf has room */
  if (leaf.keys.length < 3) {
    const before = leaf.keys.length;
    const was = code(leaf.keys);
    const blackBefore = before === 2 ? leaf.keys[leaf.lean === "L" ? 1 : 0] : null;
    addKey(leaf, k);
    let why: string;
    if (before === 1) why = `The 2-node became a 3-node. Red-black: <b>${k}</b> is a new red child of the black key. Nothing to fix.`;
    else if (leaf.keys[1] === blackBefore) why = `The 3-node became a 4-node. Red-black: <b>${k}</b> is a red child on the other side of the black key, so it now has two red children. Nothing to fix.`;
    else why = `The 3-node became a 4-node. Red-black: <b>${k}</b> would be a red child under a red node, so a rotation makes <b>${leaf.keys[1]}</b> the black key with two red children.`;
    rec?.snap(`The leaf ${was} has room for ${k}. ${why}`, "insert", [k], [leaf.id]);
    return;
  }

  /* leaf is full: how many levels will split? */
  const chain: N[] = [leaf];
  for (let i = path.length - 1; i >= 0 && path[i].keys.length === 3; i--) chain.push(path[i]);
  rec?.snap(
    `Reached the leaf ${code(leaf.keys)}, a full 4-node with no room for ${k}. Split it first: <b>${leaf.keys[1]}</b> moves up, ${leaf.keys[0]} and ${leaf.keys[2]} become two nodes. Red-black: a colour flip, the black middle turns red and its two red children turn black.`,
    "warn", nodeHk(leaf), [leaf.id],
  );
  for (let i = 1; i < chain.length; i++) {
    const c = chain[i];
    rec?.snap(`The parent ${code(c.keys)} is full too, so it must split as well, pushing <b>${c.keys[1]}</b> up.`, "warn", nodeHk(c), [c.id]);
  }

  /* do the cascade: split the full node, then insert k into the correct half */
  let carry = k;
  let carryKid: N | null = null;
  const moved: number[] = [];
  let newRoot = false;
  let node: N = leaf;
  let depth = path.length;
  for (;;) {
    if (node.keys.length < 3) {
      const r = addKey(node, carry);
      if (carryKid) node.kids.splice(r + 1, 0, carryKid);
      break;
    }
    const [x0, mean, x2] = node.keys;
    const c = node.kids;
    const right = t.mk([x2], c.length ? [c[2], c[3]] : [], "L");
    node.keys = [x0];
    node.kids = c.length ? [c[0], c[1]] : [];
    node.lean = "L";
    const target = carry < mean ? node : right;
    const r = addKey(target, carry);
    if (carryKid) target.kids.splice(r + 1, 0, carryKid);
    carry = mean;
    carryKid = right;
    moved.push(mean);
    if (depth === 0) {
      t.root = t.mk([mean], [node, right]);
      newRoot = true;
      break;
    }
    depth--;
    node = path[depth];
  }
  const s = moved.length;
  const msg = newRoot
    ? `The root itself was full, so it split and a <b>new root</b> was created. This is the only way a 2-3-4 tree gets taller, and every leaf moves down one level together.`
    : `${s} split${s > 1 ? "s" : ""}, then <b>${k}</b> joined a leaf. The middle key${s > 1 ? "s" : ""} that moved up joined the parent, so all leaves are still on the same level.`;
  rec?.snap(msg, "split", [k, ...moved], []);
}

/* ---------- delete (not in the C++ project yet: swap with successor, then borrow or merge) ---------- */
export function remove(t: Tree, k: number, rec?: Rec): boolean {
  if (!t.root) { rec?.snap(`The tree is empty, nothing to delete.`, "missing"); return false; }
  const path: { n: N; i: number }[] = []; // ancestors with the child index taken
  let n: N = t.root;
  for (;;) {
    const at = n.keys.indexOf(k);
    if (at >= 0) break;
    const r = rank(n, k);
    if (isLeaf(n)) { rec?.snap(`${code(n.keys)} is a leaf and ${k} is not in it: nothing to delete.`, "missing", nodeHk(n), [n.id]); return false; }
    rec?.snap(`Visit ${code(n.keys)}: ${k} lies ${between(n, r)}, so go down to that child.`, "descend", nodeHk(n), [n.id]);
    path.push({ n, i: r });
    n = n.kids[r];
  }
  const at = n.keys.indexOf(k);
  rec?.snap(`Found <b>${k}</b> in ${code(n.keys)}.`, "found", [k], [n.id]);

  /* inner node: replace by the in-order successor, which always lives in a leaf */
  let leaf = n;
  let li = at;
  if (!isLeaf(n)) {
    path.push({ n, i: at + 1 });
    leaf = n.kids[at + 1];
    while (!isLeaf(leaf)) { path.push({ n: leaf, i: 0 }); leaf = leaf.kids[0]; }
    const s = leaf.keys[0];
    rec?.snap(`${k} sits in an inner node, and only leaves can lose keys safely. Its in-order successor is <b>${s}</b> (the smallest key in the right subtree): it will take ${k}'s place, and ${s} is removed from its leaf.`, "swap", [k, s], [n.id, leaf.id]);
    n.keys[at] = s;
    li = 0;
  }

  /* remove from the leaf */
  const spare = leaf.keys.length >= 2;
  const removed = leaf.keys[li];
  dropKey(leaf, li);
  if (spare) {
    rec?.snap(
      `The leaf had a spare key, so removing <b>${removed}</b> costs nothing. Red-black: the easy case, a red node disappears (or a black node whose red child takes over its colour).`,
      "remove", isLeaf(n) ? [] : [n.keys[at]], [leaf.id],
    );
    return true;
  }
  if (path.length === 0) {
    t.root = null;
    rec?.snap(`The root was the only node and its last key is gone: the tree is empty.`, "remove");
    return true;
  }
  rec?.snap(
    `The leaf had only one key, so it is now <b>empty</b>. Every leaf must stay on the same level, so it has to be repaired. Red-black: this empty node is the <b>double black</b>.`,
    "underflow", [`g${leaf.id}`], [leaf.id],
  );

  /* repair, bottom-up */
  let x = leaf;
  while (x.keys.length === 0) {
    const { n: p, i } = path.pop()!;
    const left = i > 0 ? p.kids[i - 1] : null;
    const right = i < p.kids.length - 1 ? p.kids[i + 1] : null;
    if (left && left.keys.length >= 2) {
      const s = left.keys[left.keys.length - 1];
      const moved = left.kids.length ? left.kids[left.kids.length - 1] : null;
      const sep = p.keys[i - 1];
      dropKey(left, left.keys.length - 1);
      if (moved) left.kids.pop();
      x.keys = [sep];
      if (moved) x.kids.unshift(moved);
      p.keys[i - 1] = s;
      rec?.snap(`The left sibling has a spare key, so <b>borrow</b>: the separator <b>${sep}</b> comes down into the empty node and <b>${s}</b> goes up to replace it. Red-black: a rotation plus recolouring. Done, nothing else changes.`, "borrow", [sep, s], [x.id, left.id, p.id]);
      return true;
    }
    if (right && right.keys.length >= 2) {
      const s = right.keys[0];
      const moved = right.kids.length ? right.kids[0] : null;
      const sep = p.keys[i];
      dropKey(right, 0);
      if (moved) right.kids.shift();
      x.keys = [sep];
      if (moved) x.kids.push(moved);
      p.keys[i] = s;
      rec?.snap(`The right sibling has a spare key, so <b>borrow</b>: the separator <b>${sep}</b> comes down into the empty node and <b>${s}</b> goes up to replace it. Red-black: a rotation plus recolouring. Done, nothing else changes.`, "borrow", [sep, s], [x.id, right.id, p.id]);
      return true;
    }
    /* no spare keys anywhere: merge with a sibling and pull the separator down */
    let merged: N;
    let sep: number;
    if (left) {
      sep = p.keys[i - 1];
      left.keys.push(sep);
      left.lean = "L";
      left.kids.push(...x.kids);
      dropKey(p, i - 1);
      p.kids.splice(i, 1);
      merged = left;
    } else {
      sep = p.keys[i];
      x.keys = [sep, ...right!.keys];
      x.lean = "R";
      x.kids.push(...right!.kids);
      dropKey(p, i);
      p.kids.splice(i + 1, 1);
      merged = x;
    }
    const upBy = p.keys.length === 0 ? (path.length === 0 ? "shrink" : "again") : "done";
    if (upBy === "shrink") {
      t.root = merged;
      rec?.snap(`Neither sibling has a spare key, so <b>merge</b>: the separator <b>${sep}</b> comes down and the node fuses with its sibling. That was the root's last key, so the merged node becomes the <b>new root</b> and the tree gets one level shorter. Red-black: the double black reaches the root and simply vanishes.`, "shrink", [sep], [merged.id]);
      return true;
    }
    if (upBy === "again") {
      rec?.snap(`Neither sibling has a spare key, so <b>merge</b>: the separator <b>${sep}</b> comes down and fuses the node with its sibling. The parent has now lost a key and is empty: the same repair repeats one level up. Red-black: recolour the sibling red; the double black moves up.`, "merge", [sep], [merged.id, p.id]);
      x = p;
      continue;
    }
    rec?.snap(`Neither sibling has a spare key, so <b>merge</b>: the separator <b>${sep}</b> comes down and fuses the node with its sibling. The parent still has keys, so the tree is valid again. Red-black: recolour the sibling red; the extra black is absorbed by the parent.`, "merge", [sep], [merged.id, p.id]);
    return true;
  }
  return true;
}

/* ---------- validation (used by the tests) ---------- */
export function inorder(n: N | null, out: number[] = []): number[] {
  if (!n) return out;
  for (let i = 0; i < n.keys.length; i++) { if (n.kids.length) inorder(n.kids[i], out); out.push(n.keys[i]); }
  if (n.kids.length) inorder(n.kids[n.keys.length], out);
  return out;
}

export function validate(t: Tree): string | null {
  if (!t.root) return null;
  const depths = new Set<number>();
  const go = (n: N, d: number): string | null => {
    if (n.keys.length < 1 || n.keys.length > 3) return `node ${n.id} has ${n.keys.length} keys`;
    if (n.kids.length !== 0 && n.kids.length !== n.keys.length + 1) return `node ${n.id}: ${n.kids.length} kids for ${n.keys.length} keys`;
    for (let i = 1; i < n.keys.length; i++) if (n.keys[i - 1] >= n.keys[i]) return `node ${n.id} keys not sorted`;
    if (!n.kids.length) depths.add(d);
    for (const c of n.kids) { const e = go(c, d + 1); if (e) return e; }
    return null;
  };
  const e = go(t.root, 0);
  if (e) return e;
  if (depths.size > 1) return "leaves on different levels";
  const seq = inorder(t.root);
  for (let i = 1; i < seq.length; i++) if (seq[i - 1] >= seq[i]) return "in-order not sorted";
  /* red-black properties of the derived tree */
  const rb = rbOf(t.root)!;
  if (rb.c !== "B") return "root is not black";
  const bh = (x: RB | null): number | string => {
    if (!x) return 1;
    if (x.c === "R" && ((x.l && x.l.c === "R") || (x.r && x.r.c === "R"))) return "red node with red child";
    const a = bh(x.l), b = bh(x.r);
    if (typeof a === "string") return a;
    if (typeof b === "string") return b;
    if (a !== b) return "black heights differ";
    return a + (x.c === "B" ? 1 : 0);
  };
  const h = bh(rb);
  return typeof h === "string" ? h : null;
}

/** Compact structural dump used to compare with the C++ project: "(5r 10b)[(..)(..)(..)]". */
export function dump(n: N | null): string {
  if (!n) return "";
  const cols = colors(n);
  const head = "(" + n.keys.map((k, i) => `${k}${cols[i] === "B" ? "b" : "r"}`).join(" ") + ")";
  return n.kids.length ? `${head}[${n.kids.map(dump).join("")}]` : head;
}

/* ---------- scene builder used by <TreeLab> ---------- */
function fromSpec(t: Tree, sp: Spec): N {
  return t.mk(sp.k.slice(), (sp.c ?? []).map((c) => fromSpec(t, c)), sp.lean ?? "L");
}

/**
 * start: keys inserted one by one (the project's insert), or an explicit Spec.
 * A Spec that is not a valid 2-3-4 tree fails the build with the reason, like a bad front-matter field does.
 */
export function buildScene(start: number[] | Spec, ops: Op[], startCaption = "The starting tree."): Scene {
  const t = new Tree();
  if (Array.isArray(start)) for (const k of start) insert(t, k);
  else t.root = fromSpec(t, start);
  const bad = validate(t);
  if (bad) throw new Error(`<TreeLab>: the starting tree is not a valid 2-3-4 tree (${bad}).`);
  const rec = new Rec(t);
  rec.snap(startCaption, "info");
  for (const [op, k] of ops) {
    const from = rec.frames.length;
    if (op === "insert") insert(t, k, rec);
    else if (op === "delete") remove(t, k, rec);
    else search(t, k, rec);
    const f = rec.frames[from];
    if (f) f.caption = `<b>${op} ${k}.</b> ${f.caption}`;
  }
  centre(rec.frames);
  return { frames: rec.frames, view: viewBoxes(rec.frames) };
}

/** Centres each frame's tree on x = 0 (per view) so a small tree sits in the middle of a view sized for the largest. */
function centre(frames: Frame[]) {
  const { PILL_W } = GEO;
  for (const f of frames) {
    if (!f.boxes.length) continue;
    const tMin = Math.min(...f.boxes.map((b) => b.x)), tMax = Math.max(...f.boxes.map((b) => b.x + b.w));
    const rMin = Math.min(...f.keys.map((k) => k.rb[0] - PILL_W / 2)), rMax = Math.max(...f.keys.map((k) => k.rb[0] + PILL_W / 2));
    const dt = r1((tMin + tMax) / 2), dr = r1((rMin + rMax) / 2);
    for (const b of f.boxes) b.x = r1(b.x - dt);
    for (const k of f.keys) { k.t[0] = r1(k.t[0] - dt); k.rb[0] = r1(k.rb[0] - dr); }
  }
}

function viewBoxes(frames: Frame[]): Scene["view"] {
  const { PILL_W, PILL_H, BOXH, MARGIN } = GEO;
  const acc = (): Rect => [Infinity, Infinity, -Infinity, -Infinity];
  const t = acc(), rb = acc();
  const grow = (r: Rect, x0: number, y0: number, x1: number, y1: number) => {
    r[0] = Math.min(r[0], x0); r[1] = Math.min(r[1], y0); r[2] = Math.max(r[2], x1); r[3] = Math.max(r[3], y1);
  };
  for (const f of frames) {
    for (const b of f.boxes) grow(t, b.x, b.y, b.x + b.w, b.y + BOXH);
    for (const k of f.keys) grow(rb, k.rb[0] - PILL_W / 2, k.rb[1] - PILL_H / 2, k.rb[0] + PILL_W / 2, k.rb[1] + PILL_H / 2);
  }
  const fin = (r: Rect): Rect => (isFinite(r[0]) ? [r[0] - MARGIN, r[1] - MARGIN, r[2] - r[0] + 2 * MARGIN, r[3] - r[1] + 2 * MARGIN] : [0, 0, 100, 60]);
  const T = fin(t), R = fin(rb);
  const x0 = Math.min(T[0], R[0]), y0 = Math.min(T[1], R[1]);
  const x1 = Math.max(T[0] + T[2], R[0] + R[2]), y1 = Math.max(T[1] + T[3], R[1] + R[3]);
  return { t: T, rb: R, m: [x0, y0, x1 - x0, y1 - y0] };
}
