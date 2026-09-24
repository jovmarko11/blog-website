/**
 * shell-model.ts — a TypeScript copy of the parser of jovmarko11/cli-interpreter-cpp, plus the
 * scene builders behind <ShellLab> and <TraitGrid>.
 *
 *   tokenize / parse   mirror Tokenizer.cpp, PipelineParser.cpp, RedirectionParser.cpp,
 *                      CommandParser.cpp and DerivedParsers.cpp line by line (same order of
 *                      checks, same error messages), so a figure shows what the C++ code does.
 *   REGISTRY           the CommandTraits of all 19 descriptors in Factory/CommandDescriptors.cpp.
 *   *Scene()           record one frame per step for the three ShellLab stages.
 *
 * Cross-checked against the C++ parser on random command lines (see the post's Results section).
 * Pure functions, no DOM: runs at build time and under Node.
 */

/* ---------------- Syntax.h ---------------- */
export const SYN = { pipe: "|", quote: '"', dash: "-", redirIn: "<", redirOut: ">", redirAppend: ">>" } as const;
const isSpace = (c: string) => c === " " || c === "\t" || c === "\n" || c === "\v" || c === "\f" || c === "\r";
const isAlnum = (c: string) => /^[A-Za-z0-9]$/.test(c);
const isPipe = (c: string) => c === SYN.pipe;
const isRedir = (c: string) => c === SYN.redirIn || c === SYN.redirOut;
const isRedirToken = (s: string) => s === "<" || s === ">" || s === ">>";

/* ---------------- ParserStructs.h / Exception.h ---------------- */
export interface Token { text: string; quoted: boolean }
export interface RedirSpec { present: boolean; filename: string; mode: "Truncate" | "Append" }
export interface ParsedCommand {
  name: string; option: string; args: Token[];
  in: RedirSpec; out: RedirSpec; hasSource: boolean;
}
export type ErrorType = "Lexical" | "UnknownCommand" | "Syntax" | "StreamSemantic" | "CommandSemantic" | "System";
export class ShellError extends Error {
  type: ErrorType;
  constructor(type: ErrorType, msg: string) { super(msg); this.type = type; }
}
const noRedir = (): RedirSpec => ({ present: false, filename: "", mode: "Truncate" });

/* ---------------- CommandDescriptors.cpp ---------------- */
export type ParserKind = "SimpleCommandParser" | "OptionCommandParser" | "TrCommandParser";
export interface Traits {
  argument: "None" | "Source" | "Parameter";
  argumentRequired: boolean;
  option: "None" | "Optional" | "Required";
  hasInputStream: boolean;
  hasOutputStream: boolean;
}
export interface CommandInfo { name: string; usage: string; parser: ParserKind; traits: Traits; extension: boolean }

const T = (argument: Traits["argument"], argumentRequired: boolean, option: Traits["option"], i: boolean, o: boolean): Traits =>
  ({ argument, argumentRequired, option, hasInputStream: i, hasOutputStream: o });
const S: ParserKind = "SimpleCommandParser", O: ParserKind = "OptionCommandParser";

/** In the order of registerBuiltInCommands(): the assignment's commands first, then the extensions. */
export const REGISTRY: CommandInfo[] = [
  { name: "echo", usage: "echo [argument]", parser: S, traits: T("Source", false, "None", true, true), extension: false },
  { name: "prompt", usage: 'prompt "text"', parser: S, traits: T("Parameter", true, "None", false, false), extension: false },
  { name: "time", usage: "time", parser: S, traits: T("None", false, "None", false, true), extension: false },
  { name: "date", usage: "date", parser: S, traits: T("None", false, "None", false, true), extension: false },
  { name: "touch", usage: "touch filename", parser: S, traits: T("Parameter", true, "None", false, false), extension: false },
  { name: "truncate", usage: "truncate filename", parser: S, traits: T("Parameter", true, "None", false, false), extension: false },
  { name: "rm", usage: "rm filename", parser: S, traits: T("Parameter", true, "None", false, false), extension: false },
  { name: "wc", usage: "wc -opt [argument]", parser: O, traits: T("Source", false, "Required", true, true), extension: false },
  { name: "tr", usage: 'tr [argument] -"what" ["with"]', parser: "TrCommandParser", traits: T("Source", false, "None", true, true), extension: false },
  { name: "head", usage: "head -ncount [argument]", parser: O, traits: T("Source", false, "Required", true, true), extension: false },
  { name: "batch", usage: "batch filename", parser: S, traits: T("Source", true, "None", true, true), extension: false },
  { name: "history", usage: "history", parser: S, traits: T("None", false, "None", false, true), extension: true },
  { name: "last", usage: "last", parser: S, traits: T("None", false, "None", false, true), extension: true },
  { name: "dump", usage: "dump -k filename", parser: O, traits: T("Parameter", true, "Required", false, false), extension: true },
  { name: "copy", usage: "copy source destination", parser: S, traits: T("Parameter", true, "None", false, false), extension: true },
  { name: "tail", usage: "tail -ncount [argument]", parser: O, traits: T("Source", false, "Required", true, true), extension: true },
  { name: "unique", usage: "unique [-u] [argument]", parser: O, traits: T("Source", false, "Optional", true, true), extension: true },
  { name: "exec", usage: "exec [argument]", parser: S, traits: T("Source", false, "None", true, true), extension: true },
  { name: "help", usage: "help [command]", parser: S, traits: T("Parameter", false, "None", false, true), extension: true },
];
const byName = new Map(REGISTRY.map((c) => [c.name, c]));
export const lookup = (name: string) => byName.get(name);

/* ---------------- Tokenizer.cpp ---------------- */
export type Recognizer = "skipWhitespace" | "parsePipe" | "parseRedir" | "parseDashQuoted" | "parseQuoted" | "parseWord";
export const RECOGNIZERS: Recognizer[] = ["skipWhitespace", "parsePipe", "parseRedir", "parseDashQuoted", "parseQuoted", "parseWord"];

/** One pass of the while loop in Tokenizer::tokenize. */
export interface TokStep {
  wsFrom: number; // skipWhitespace started here
  start: number; // first non-space character
  end: number; // position after the recogniser
  tried: Recognizer[]; // recognisers that returned false
  hit: Recognizer; // the one that consumed input
  emitted: Token[];
}

const isAllowedChar = (c: string) =>
  isAlnum(c) || isSpace(c) || isPipe(c) || isRedir(c) || c === SYN.dash || c === SYN.quote ||
  c === "." || c === "_" || c === "/" || c === "\\" || c === ":" || c === "~";

/** Tokenizer::checkForLexicalErrors — returns the bad positions (the C++ throws if there are any). */
export function lexicalErrors(line: string): number[] {
  const bad: number[] = [];
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === SYN.quote) inQuotes = !inQuotes;
    else if (!inQuotes && !isAllowedChar(line[i])) bad.push(i);
  }
  return bad;
}

export function tokenizeTrace(line: string): { tokens: Token[]; steps: TokStep[] } {
  const bad = lexicalErrors(line);
  if (bad.length) {
    const marker = [...line].map((_, i) => (bad.includes(i) ? "^" : " ")).join("");
    throw new ShellError("Lexical", "Lexical Error: unexpected characters:\n" + line + "\n" + marker);
  }
  const tokens: Token[] = [];
  const steps: TokStep[] = [];
  const n = line.length;
  let pos = 0;
  while (pos < n) {
    const wsFrom = pos;
    while (pos < n && isSpace(line[pos])) pos++;
    if (pos >= n) break;
    const start = pos;
    const tried: Recognizer[] = [];
    const emitted: Token[] = [];
    let hit: Recognizer;
    const c = line[pos];
    if (isPipe(c)) {
      emitted.push({ text: SYN.pipe, quoted: false }); pos++; hit = "parsePipe";
    } else if ((tried.push("parsePipe"), c === SYN.redirOut || c === SYN.redirIn)) {
      if (c === SYN.redirOut && pos + 1 < n && line[pos + 1] === SYN.redirOut) { emitted.push({ text: ">>", quoted: false }); pos += 2; }
      else if (c === SYN.redirOut) { emitted.push({ text: ">", quoted: false }); pos++; }
      else { emitted.push({ text: "<", quoted: false }); pos++; }
      hit = "parseRedir";
    } else if ((tried.push("parseRedir"), c === SYN.dash && pos + 1 < n && line[pos + 1] === SYN.quote)) {
      emitted.push({ text: SYN.dash, quoted: false });
      pos += 2;
      let q = "";
      while (pos < n && line[pos] !== SYN.quote) q += line[pos++];
      if (pos >= n) throw new ShellError("Lexical", "Unterminated string literal");
      pos++;
      emitted.push({ text: q, quoted: true });
      hit = "parseDashQuoted";
    } else if ((tried.push("parseDashQuoted"), c === SYN.quote)) {
      pos++;
      let t = "";
      while (pos < n && line[pos] !== SYN.quote) t += line[pos++];
      if (pos >= n) throw new ShellError("Lexical", "Unterminated string literal");
      pos++;
      emitted.push({ text: t, quoted: true });
      hit = "parseQuoted";
    } else {
      tried.push("parseQuoted");
      let t = "";
      while (pos < n) {
        const ch = line[pos];
        if (isSpace(ch) || isPipe(ch) || isRedir(ch)) break;
        t += ch;
        pos++;
      }
      if (t) emitted.push({ text: t, quoted: false });
      hit = "parseWord";
    }
    tokens.push(...emitted);
    steps.push({ wsFrom, start, end: pos, tried, hit, emitted });
  }
  return { tokens, steps };
}

/* ---------------- RedirectionParser.cpp ---------------- */
const isRedirOp = (t: Token) => !t.quoted && isRedirToken(t.text);

export interface RedirResult { core: Token[]; in: RedirSpec; out: RedirSpec; peeled: number }

export function extractRedirs(segment: Token[]): RedirResult {
  if (segment.length && isRedirOp(segment[segment.length - 1])) throw new ShellError("Syntax", "Redirection missing filename");
  const r: RedirResult = { core: [...segment], in: noRedir(), out: noRedir(), peeled: 0 };
  let i = r.core.length - 1;
  while (i >= 1) {
    const file = r.core[i], op = r.core[i - 1];
    if (!isRedirOp(op)) break;
    if (file.text === "") throw new ShellError("Syntax", "Redirection missing filename");
    if (!file.quoted && file.text === SYN.pipe) throw new ShellError("Syntax", "Invalid redirection target");
    if (isRedirOp(file)) throw new ShellError("Syntax", "Redirection missing filename");
    if (op.text === "<") {
      if (r.in.present) throw new ShellError("Syntax", "Multiple input redirections");
      r.in = { present: true, filename: file.text, mode: "Truncate" };
    } else {
      if (r.out.present) throw new ShellError("Syntax", "Multiple output redirections");
      r.out = { present: true, filename: file.text, mode: op.text === ">>" ? "Append" : "Truncate" };
    }
    r.core.splice(i - 1, 2);
    r.peeled += 2;
    i = r.core.length - 1;
  }
  for (const t of r.core) if (isRedirOp(t)) throw new ShellError("Syntax", "Redirection must appear at the end of the command");
  if (!r.core.length) throw new ShellError("Syntax", "Missing command before redirection");
  return r;
}

/* ---------------- DerivedParsers.cpp ---------------- */
function simpleParse(tokens: Token[]): ParsedCommand {
  if (!tokens.length) throw new ShellError("Syntax", "Empty command");
  return { name: tokens[0].text, option: "", args: tokens.slice(1), in: noRedir(), out: noRedir(), hasSource: false };
}

function optionParse(tokens: Token[]): ParsedCommand {
  if (!tokens.length) throw new ShellError("Syntax", "Empty command");
  const cmd: ParsedCommand = { name: tokens[0].text, option: "", args: [], in: noRedir(), out: noRedir(), hasSource: false };
  let a = 1;
  if (tokens.length > 1 && tokens[1].text !== "" && tokens[1].text[0] === "-") {
    if (tokens[1].text.length < 2) throw new ShellError("Syntax", "Invalid option format");
    cmd.option = tokens[1].text.slice(1);
    a = 2;
  }
  cmd.args = tokens.slice(a);
  return cmd;
}

const TR_FMT = 'tr: expected format: tr -"what" ["with"]';
function trParse(tokens: Token[]): ParsedCommand {
  if (tokens.length < 2) throw new ShellError("Syntax", 'tr: expected format: tr [source] -"what" ["with"]');
  const cmd: ParsedCommand = { name: tokens[0].text, option: "", args: [], in: noRedir(), out: noRedir(), hasSource: false };
  let idx = 1;
  if (tokens[idx].text !== "" && tokens[idx].text[0] !== SYN.dash) {
    cmd.args.push(tokens[idx]);
    cmd.hasSource = true;
    idx++;
  }
  // parseWhat
  let what = "";
  if (idx >= tokens.length) throw new ShellError("Syntax", "");
  if (tokens[idx].text === SYN.dash) {
    if (idx + 1 >= tokens.length || !tokens[idx + 1].quoted) throw new ShellError("Syntax", TR_FMT);
    what = tokens[idx + 1].text;
    idx += 2;
  } else if (tokens[idx].text !== "" && tokens[idx].text[0] === SYN.dash) {
    const t = tokens[idx].text;
    if (t.length < 3 || t[1] !== SYN.quote || t[t.length - 1] !== SYN.quote) throw new ShellError("Syntax", TR_FMT);
    what = t.slice(2, t.length - 1);
    idx += 1;
  } else throw new ShellError("Syntax", TR_FMT);
  if (what === "") throw new ShellError("Syntax", "tr: what cannot be empty");
  // parseWith
  let withText = "";
  if (idx < tokens.length) {
    if (!tokens[idx].quoted) throw new ShellError("Syntax", "tr: with must be quoted");
    withText = tokens[idx].text;
    idx += 1;
  }
  if (idx !== tokens.length) throw new ShellError("Syntax", "tr: too many arguments");
  cmd.args.push({ text: what, quoted: true });
  if (withText !== "") cmd.args.push({ text: withText, quoted: true });
  return cmd;
}

const PARSERS: Record<ParserKind, (t: Token[]) => ParsedCommand> = {
  SimpleCommandParser: simpleParse, OptionCommandParser: optionParse, TrCommandParser: trParse,
};

/* ---------------- CommandParser.cpp / PipelineParser.cpp / Parser.cpp ---------------- */
export function parseCommand(tokens: Token[]): ParsedCommand {
  if (!tokens.length) throw new ShellError("Syntax", "Empty command");
  const info = lookup(tokens[0].text);
  if (!info) throw new ShellError("UnknownCommand", "Unknown command: " + tokens[0].text);
  return PARSERS[info.parser](tokens);
}

export interface SegmentTrace { tokens: Token[]; redir: RedirResult; cmd: ParsedCommand; parser: ParserKind }

/** Parser::parse, keeping every intermediate result for the figures. */
export function parseTrace(line: string) {
  const { tokens, steps } = tokenizeTrace(line);
  if (!tokens.length) throw new ShellError("Syntax", "Empty command line");
  const raw: Token[][] = [];
  let seg: Token[] = [];
  for (const t of tokens) {
    if (!t.quoted && t.text === SYN.pipe) { raw.push(seg); seg = []; }
    else seg.push(t);
  }
  raw.push(seg);
  // processSegment runs segment by segment, so an error in segment k stops everything after it
  const segments: SegmentTrace[] = [];
  for (const s of raw) {
    if (!s.length) throw new ShellError("Syntax", "Syntax error: empty command between pipes");
    const redir = extractRedirs(s);
    const cmd = parseCommand(redir.core);
    cmd.in = redir.in;
    cmd.out = redir.out;
    segments.push({ tokens: s, redir, cmd, parser: lookup(redir.core[0].text)!.parser });
  }
  return { tokens, steps, raw, segments };
}

export const parse = (line: string): ParsedCommand[] => parseTrace(line).segments.map((s) => s.cmd);

/** Canonical text form, printed identically by the C++ dumper used for the cross-check. */
export function dump(line: string): string {
  try {
    return parse(line).map((c) =>
      [c.name, c.option, c.args.map((a) => (a.quoted ? `"${a.text}"` : a.text)).join(","),
        c.in.present ? "<" + c.in.filename : "", c.out.present ? (c.out.mode === "Append" ? ">>" : ">") + c.out.filename : "",
        c.hasSource ? "S" : ""].join("·"),
    ).join(" | ");
  } catch (e) {
    if (e instanceof ShellError) return `ERR ${e.type}: ${e.message}`;
    throw e;
  }
}

/* =====================================================================================
 * Scenes for <ShellLab>. A frame is a full description of the figure's state:
 *   s  data-s attribute per keyed element (missing = "")
 *   t  text per keyed element (missing = the text rendered at build time)
 *   v  value of the CSS variable --v per keyed element
 * ===================================================================================== */
export interface LabFrame { caption: string; kind: string; s: Record<string, string>; t?: Record<string, string>; v?: Record<string, string> }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const code = (s: string) => `<code>${esc(s)}</code>`;
const show = (t: Token) => (t.quoted ? `"${t.text}"` : t.text);

/* ---------- stage 1: tokens ---------- */
export interface TokenLayout { line: string; tokens: Token[]; error?: { bad: number[]; message: string } }

export function tokenScene(line: string): { layout: TokenLayout; frames: LabFrame[] } {
  const frames: LabFrame[] = [];
  const bad = lexicalErrors(line);
  const chars = [...line];

  frames.push({
    kind: "info",
    caption: `<code>CommandReader</code> has read the line one character at a time up to <code>\\n</code>. The tokenizer gets a plain string of ${chars.length} characters and a position <code>pos = 0</code>.`,
    s: {}, v: { cursor: "0" }, t: { pos: "pos = 0" },
  });

  const lexS: Record<string, string> = {};
  let inQ = false;
  chars.forEach((c, i) => {
    if (c === SYN.quote) { inQ = !inQ; lexS[`c${i}`] = "q"; }
    else lexS[`c${i}`] = inQ ? "inq" : bad.includes(i) ? "bad" : "ok";
  });
  if (bad.length) {
    frames.push({
      kind: "warn",
      caption: `<b>Lexical check.</b> Before any token exists, <code>checkForLexicalErrors</code> scans the whole line. ${bad.map((i) => code(chars[i])).join(", ")} is not on the allowed list and is outside quotes, so the line is rejected with a <code>^</code> under each bad position. No recogniser ever runs.`,
      s: { ...lexS, marker: "on" }, v: { cursor: "0" }, t: { pos: "pos = 0" },
    });
    const message = "Lexical Error: unexpected characters:\n" + line + "\n" + chars.map((_, i) => (bad.includes(i) ? "^" : " ")).join("");
    return { layout: { line, tokens: [], error: { bad, message } }, frames };
  }
  frames.push({
    kind: "info",
    caption: `<b>Lexical check first.</b> <code>checkForLexicalErrors</code> walks the line once. Every character outside quotes must be a letter, a digit, a space, one of the <code>Syntax</code> symbols or one of <code>. _ / \\ : ~</code>. Characters inside quotes are not checked, so a quoted string can hold anything.`,
    s: lexS, v: { cursor: "0" }, t: { pos: "pos = 0" },
  });

  const { tokens, steps } = tokenizeTrace(line);
  const done: Record<string, string> = {};
  let tk = 0;
  let wordSeen = false;
  steps.forEach((st, k) => {
    const s: Record<string, string> = { ...done };
    for (let i = st.wsFrom; i < st.start; i++) s[`c${i}`] = "ws";
    for (let i = st.start; i < st.end; i++) s[`c${i}`] = "eat";
    st.tried.forEach((r) => (s[`r-${r}`] = "no"));
    s[`r-${st.hit}`] = "yes";
    if (st.start > st.wsFrom) s["r-skipWhitespace"] = "yes";
    for (let j = 0; j < tk; j++) s[`tk${j}`] = "on";
    for (let j = 0; j < st.emitted.length; j++) s[`tk${tk + j}`] = "new";

    const c = chars[st.start];
    const lead = st.start > st.wsFrom ? `<code>skipWhitespace</code> moves to ${st.start}. ` : "";
    const nope = st.tried.length === 4 && wordSeen && st.hit === "parseWord" && c !== SYN.dash
      ? ""
      : st.tried.length ? `${st.tried.map((r) => code(r)).join(", ")} ${st.tried.length === 1 ? "returns" : "return"} <code>false</code>. ` : "";
    let why = "";
    const out = st.emitted.map((t) => code(show(t))).join(" and ");
    switch (st.hit) {
      case "parsePipe": why = `${code(c)} at ${st.start} is the pipe symbol: <code>parsePipe</code> emits ${out} and the loop starts over.`; break;
      case "parseRedir": why = st.emitted[0].text === ">"
        ? `<code>parseRedir</code> sees <code>&gt;</code> and peeks one character ahead. It is not a second <code>&gt;</code>, so this is a truncating ${code(">")}, not ${code(">>")}.`
        : `<code>parseRedir</code> emits ${out}.`; break;
      case "parseDashQuoted": why = `A dash followed by a quote is <code>tr</code>'s <code>-"what"</code> syntax. <code>parseDashQuoted</code> emits <b>two</b> tokens: an unquoted ${code("-")} and the quoted text ${code(show(st.emitted[1]))}. The ${code(st.emitted[1].text)} is inside quotes, so it is just text.`; break;
      case "parseQuoted": why = `<code>parseQuoted</code> reads up to the closing quote and emits ${out}, marked <code>quoted</code>. The quotes themselves are dropped; the flag remembers them.`; break;
      case "parseWord": why = c === SYN.dash
        ? `A dash, but the next character is not a quote, so <code>parseDashQuoted</code> declines. <code>parseWord</code> takes ${out}: an option is just a word here. Which dash means what is decided later, by the command's own parser.`
        : wordSeen
          ? `All four special recognisers decline again, and <code>parseWord</code> emits ${out}.`
          : `Nothing special starts here, so <code>parseWord</code> reads until a space, pipe or redirection and emits ${out}.`;
        if (c !== SYN.dash) wordSeen = true;
        break;
    }
    const last = k === steps.length - 1;
    frames.push({
      kind: st.hit === "parseWord" ? "info" : "hit",
      caption: `${lead}${nope}${why}${last ? ` That was the last character: <b>${tokens.length} tokens</b>.` : ""}`,
      s, v: { cursor: String(st.start) }, t: { pos: `pos = ${st.start}` },
    });
    for (let i = st.wsFrom; i < st.end; i++) done[`c${i}`] = "done";
    tk += st.emitted.length;
  });

  const fin: Record<string, string> = { ...done };
  tokens.forEach((_, j) => (fin[`tk${j}`] = "on"));
  frames.push({
    kind: "done",
    caption: `The tokenizer's whole output: ${tokens.length} tokens, each a string and a <code>quoted</code> flag. The flag is the only trace of the quotes, and it is what later lets ${code('"|"')} be text while ${code("|")} is a pipe.`,
    s: fin, v: { cursor: String(chars.length) }, t: { pos: `pos = ${chars.length}` },
  });
  return { layout: { line, tokens }, frames };
}

/* ---------- stage 2: parse ---------- */
export interface ParseLayout { tokens: Token[]; segments: { tokens: Token[]; first: number }[]; pipes: number[]; cards: ParsedCommand[]; parsers: ParserKind[] }

export function describeRedir(r: RedirResult): string {
  const parts: string[] = [];
  if (r.in.present) parts.push(`in &larr; ${esc(r.in.filename)}`);
  if (r.out.present) parts.push(`out &rarr; ${esc(r.out.filename)} (${r.out.mode})`);
  return parts.length ? parts.join(", ") : "no trailing redirection";
}

export function parseScene(line: string): { layout: ParseLayout; frames: LabFrame[] } {
  const tr = parseTrace(line);
  const { tokens, segments } = tr;
  const pipes: number[] = [];
  tokens.forEach((t, i) => { if (!t.quoted && t.text === SYN.pipe) pipes.push(i); });
  const segs: ParseLayout["segments"] = [];
  let first = 0;
  tr.raw.forEach((s, k) => { segs.push({ tokens: s, first }); first += s.length + (k < pipes.length ? 1 : 0); });

  const frames: LabFrame[] = [];
  frames.push({
    kind: "info",
    caption: `The parser starts from the ${tokens.length} tokens, not from the text. From here on, nothing looks at characters any more.`,
    s: {},
  });

  const base: Record<string, string> = {};
  frames.push({
    kind: "hit",
    caption: `<b>PipelineParser</b> walks the tokens and cuts at every <b>unquoted</b> ${code("|")}. It gets ${segs.length} segments, one per command. An empty segment here (two pipes in a row, or one at either end) would be a syntax error.`,
    s: Object.assign(base, ...pipes.map((_, k) => ({ [`pp${k}`]: "cut" })), ...segs.map((_, k) => ({ [`sg${k}`]: "cut" }))),
  });

  const acc: Record<string, string> = { ...base };
  segments.forEach((seg, k) => {
    const peeled = seg.redir.peeled;
    const s1: Record<string, string> = { ...acc, [`sg${k}`]: "act", [`col${k}`]: "act", [`rd${k}`]: "on" };
    for (let j = seg.tokens.length - peeled; j < seg.tokens.length; j++) s1[`pt${segs[k].first + j}`] = "peel";
    frames.push({
      kind: peeled ? "hit" : "info",
      caption: peeled
        ? `Segment ${k + 1}: <b>RedirectionParser</b> looks at the <b>end</b> of the segment. ${code(show(seg.tokens[seg.tokens.length - 2]))} followed by a file name is peeled off into <code>${describeRedir(seg.redir)}</code>. What is left, ${seg.redir.core.map((t) => code(show(t))).join(" ")}, is the command itself.`
        : `Segment ${k + 1}: <b>RedirectionParser</b> checks the end of ${seg.tokens.map((t) => code(show(t))).join(" ")}. There is no ${code("<")}, ${code(">")} or ${code(">>")} there, so the whole segment is the command.`,
      s: s1,
    });
    const s2: Record<string, string> = { ...s1, [`cp${k}`]: "on", [`pc${k}`]: "on" };
    const c = seg.cmd;
    let how = "";
    if (seg.parser === "SimpleCommandParser") how = `everything after the name becomes an argument${c.args.length ? "" : ", and there is nothing after it"}.`;
    else if (seg.parser === "OptionCommandParser") how = c.option ? `the second token starts with a dash, so ${code("-" + c.option)} becomes <code>option = "${esc(c.option)}"</code> and the rest are arguments.` : "there is no option token, so all the rest are arguments.";
    else how = `the first token after <code>tr</code> is ${c.hasSource ? "a source" : "a dash, so there is no source"}; ${code("-")} plus a quoted token give <b>what</b>${c.args.length > (c.hasSource ? 2 : 1) ? ", and the next quoted token is <b>with</b>" : ""}.`;
    frames.push({
      kind: "hit",
      caption: `<b>CommandParser</b> looks up ${code(c.name)} in the registry and hands the tokens to its own parser, <code>${seg.parser}</code>: ${how}`,
      s: s2,
    });
    Object.assign(acc, s2, { [`sg${k}`]: "cut", [`col${k}`]: "", [`cp${k}`]: "on" });
  });

  frames.push({
    kind: "done",
    caption: `The result is a <code>ParsedPipeline</code>: ${segments.length} <code>ParsedCommand</code> structs with a name, an option, arguments that still remember their quotes, and redirections. The whole line has been checked, and nothing has run yet.`,
    s: acc,
  });
  return { layout: { tokens, segments: segs, pipes, cards: segments.map((s) => s.cmd), parsers: segments.map((s) => s.parser) }, frames };
}

/* ---------- stage 3: run ---------- */
export interface RunCmd { name: string; label: string; in: string; out: string }
export interface RunLayout { cmds: RunCmd[]; pipes: number; sink?: { file: string; mode: string } }

/** The few commands the run figure needs, with the exact output format of their C++ execute(). */
function runCommand(c: ParsedCommand, input: string, clock: string): string {
  switch (c.name) {
    case "time": return clock + "\n";
    case "echo": return input;
    case "tr": {
      const off = c.hasSource ? 1 : 0;
      const what = c.args[off].text, withText = c.args[off + 1]?.text ?? "";
      return input.split(what).join(withText);
    }
    case "wc": return String(c.option === "c" ? input.length : input.split(/\s+/).filter(Boolean).length) + "\n";
    default: throw new Error(`ShellLab run stage does not model "${c.name}"`);
  }
}

const vis = (s: string) => s.replace(/\n/g, "↵");

/** A command as typed, without its redirections: tr's "-" and its quoted text are written together again. */
function typed(tokens: Token[]): string {
  let out = "";
  tokens.forEach((t, i) => {
    const glued = i > 0 && tokens[i - 1].text === SYN.dash && !tokens[i - 1].quoted && t.quoted;
    out += (i && !glued ? " " : "") + show(t);
  });
  return out;
}

export function runScene(line: string, clock = "01:23:35"): { layout: RunLayout; frames: LabFrame[] } {
  const trace = parseTrace(line);
  const cmds = trace.segments.map((s) => s.cmd);
  const count = cmds.length;
  const last = cmds[count - 1];
  const layout: RunLayout = {
    cmds: trace.segments.map((sg) => ({ name: sg.cmd.name, label: typed(sg.redir.core), in: "", out: "" })),
    pipes: count - 1,
    sink: last.out.present ? { file: last.out.filename, mode: last.out.mode } : undefined,
  };
  const frames: LabFrame[] = [];
  const s: Record<string, string> = {};
  const t: Record<string, string> = {};
  const push = (kind: string, caption: string, extra: Record<string, string> = {}) =>
    frames.push({ kind, caption, s: { ...s, ...extra }, t: { ...t } });

  for (let k = 0; k < count - 1; k++) { t[`b${k}r`] = ""; t[`b${k}u`] = ""; t[`bp${k}`] = "m_pos = 0"; }
  cmds.forEach((_, i) => { t[`ci${i}`] = "in: ?"; t[`co${i}`] = "out: ?"; });
  if (layout.sink) t.sinkText = "";

  push("info", `<code>Engine</code> gets the <code>ParsedPipeline</code>. With ${count} commands it asks <code>PipeFlowController</code> for links: ${count - 1} <code>PipeStream</code> objects, each an empty string buffer with a read position <code>m_pos</code>.`,
    Object.fromEntries([...Array(count - 1)].map((_, k) => [`pipe${k}`, "on"])));
  for (let k = 0; k < count - 1; k++) s[`pipe${k}`] = "on";

  let flowing = "";
  cmds.forEach((c, i) => {
    const info = lookup(c.name)!;
    const firstCmd = i === 0, lastCmd = i === count - 1;
    // StreamResolver::resolveInput / resolveOutput, in the order of the C++
    let inRule: string, inText: string;
    if (!info.traits.hasInputStream) { inRule = "none"; inText = "in: none"; }
    else if (!firstCmd) { inRule = "pipe"; inText = `in: pipe #${i - 1}`; }
    else if (c.in.present) { inRule = "redir"; inText = `in: ${c.in.filename}`; }
    else if (info.traits.argument === "Source" && c.args.length && (c.name !== "tr" || c.hasSource)) { inRule = "arg"; inText = c.args[0].quoted ? `in: "${c.args[0].text}"` : `in: ${c.args[0].text}`; }
    else { inRule = "console"; inText = "in: console"; }
    let outRule: string, outText: string;
    if (!info.traits.hasOutputStream) { outRule = "none"; outText = "out: none"; }
    else if (c.out.present) { outRule = "file"; outText = `out: ${c.out.filename}`; }
    else { outRule = "default"; outText = lastCmd ? "out: console" : `out: pipe #${i}`; }

    t[`ci${i}`] = inText;
    t[`co${i}`] = outText;
    s[`cmd${i}`] = "act";
    const ruleS: Record<string, string> = {};
    const inOrder = ["pipe", "redir", "arg", "console"];
    if (inRule === "none") ruleS["ri-none"] = "yes";
    else inOrder.slice(0, inOrder.indexOf(inRule) + 1).forEach((r) => (ruleS[`ri-${r}`] = r === inRule ? "yes" : "no"));
    if (outRule === "none") ruleS["ro-none"] = "yes";
    else if (outRule === "file") ruleS["ro-file"] = "yes";
    else { ruleS["ro-file"] = "no"; ruleS["ro-default"] = "yes"; }

    const pos = firstCmd ? (lastCmd ? "alone" : "first") : lastCmd ? "last" : "in the middle";
    const inWhy: Record<string, string> = {
      none: `${code(c.name)} has no input stream at all (<code>hasInputStream = false</code>), which is exactly why it may only stand first`,
      pipe: `it is not first, so its input is the previous command's pipe (rule 1, <code>inputFromPipe</code>)`,
      redir: `a ${code("<")} redirection opens a <code>FileInputStream</code>`,
      arg: `its source argument becomes the input: quoted text is a <code>StringInputStream</code>, a bare word a <code>FileInputStream</code>`,
      console: `nothing else applies, so it reads the console`,
    };
    const outWhy: Record<string, string> = {
      none: "it has no output stream",
      file: `${code((c.out.mode === "Append" ? ">>" : ">") + " " + c.out.filename)} makes the resolver create its own <code>FileOutputStream</code> in <b>${c.out.mode}</b> mode`,
      default: lastCmd ? "its output goes to the console" : `its output is pipe #${i}`,
    };
    const checks = count > 1 ? "<code>validatePipelinePosition</code> lets it stand there, the registry creates the command object" : "The registry creates the command object";
    push("hit", `<b>${esc(c.name)}</b> is ${pos}. ${checks}, and <code>StreamResolver</code> decides its streams: ${inWhy[inRule]}; ${outWhy[outRule]}.`, ruleS);

    const input = inRule === "pipe" ? flowing : "";
    const output = runCommand(c, input, clock);
    const run: Record<string, string> = {};
    if (inRule === "pipe") {
      t[`b${i - 1}r`] = vis(flowing); t[`b${i - 1}u`] = ""; t[`bp${i - 1}`] = `m_pos = ${flowing.length}`;
      run[`pipe${i - 1}`] = "read";
    }
    if (outRule === "default" && !lastCmd) { t[`b${i}u`] = vis(output); run[`pipe${i}`] = "fill"; }
    if (outRule === "file") { t.sinkText = vis(output); run.sink = "fill"; }
    let what = "";
    if (c.name === "time") what = `<code>time.execute()</code> formats the clock as <code>%H:%M:%S</code> and writes ${code(vis(output))} into the pipe. It runs to the end before anything else starts.`;
    else if (c.name === "tr") what = `<code>tr.execute()</code> calls <code>loadInput()</code>, which reads the pipe with <code>get()</code> until EOF (<code>m_pos</code> reaches ${input.length}), replaces every ${code(c.args[c.hasSource ? 1 : 0].text)} with ${code(c.args[c.hasSource ? 2 : 1]?.text ?? "")}, and writes ${code(vis(output))} to its output.`;
    else if (c.name === "wc") what = `<code>wc.execute()</code> reads all ${input.length} characters, including the newline, and writes ${code(vis(output))}${outRule === "file" ? ` into ${code(c.out.filename)}` : ""}.`;
    else what = `<code>${esc(c.name)}.execute()</code> writes ${code(vis(output))}.`;
    s[`cmd${i}`] = "run";
    push("run", what, run);
    s[`cmd${i}`] = "done";
    if (inRule === "pipe") s[`pipe${i - 1}`] = "spent";
    if (outRule === "default" && !lastCmd) s[`pipe${i}`] = "full";
    if (outRule === "file") s.sink = "full";
    flowing = output;
  });

  push("done", `After the last command, the streams the resolver created are deleted, which closes ${layout.sink ? code(layout.sink.file) : "the files"}, and the <code>PipeFlowController</code> destructor deletes the pipes. ${layout.sink ? `${code(layout.sink.file)} now holds ${code(vis(flowing))}.` : ""}`);
  return { layout, frames };
}

/* ---------- pipeline positions for <TraitGrid> (Engine::validatePipelinePosition) ---------- */
export function positions(tr: Traits) {
  return {
    first: tr.hasOutputStream,
    middle: tr.hasInputStream && tr.hasOutputStream,
    last: tr.hasInputStream,
  };
}
