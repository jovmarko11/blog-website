# Voice and style

## Tone
- First person, calm, precise. "I", not "we". Conversational but not chatty; no hype words
  ("blazing", "powerful", "seamless"), no emojis, no exclamation marks.
- Explain simply first, then precisely. A reader without the course should follow the Idea and
  Architecture sections; the Implementation section can assume a programmer.
- Short paragraphs (2–5 sentences). Bold at most one phrase per paragraph, for the key term.
- English, American spelling is fine but be consistent within a post.
- Honest: say what was assigned vs. what you chose; say what doesn't work. A good `Note kind="wrong"`
  (a real mistake and its lesson) is worth more than polish.

## Sections
**Idea** — `###` is the question the project answers. One or two paragraphs: the problem, why it's
interesting. Coursework: one sentence on the assignment, one on what was added on top.

**Architecture** — the parts and how they talk, or the core concept. This is where the main
animation usually goes: the figure that makes the idea click. Follow it with a list of parts
(one line each, bold name) or the key data structure.

**Implementation** — 2–4 "interesting bits", each: a sentence of intuition → optional figure →
real CodeBlock → a sentence on what to notice in the code. Mention complexity with `<M>` where
it matters. Prefer the code that carries the idea over boilerplate.

**Results** — real Terminal output, then measured numbers (DataTable or chart) with the method in
the caption. One sentence after each saying what to read from it.

**Lessons** — 3 concrete lessons (bold lead + one or two sentences), then at most one
`Note kind="wrong"`. No generic advice ("testing is important") without the specific story.

## Captions and figures
- A caption says **what to notice**, not what the figure is ("Inserting 55 splits two nodes and the
  tree grows at the top", not "Insertion example").
- Number figures `01, 02…` in order; DataTables have their own numbering.
- Refer to figures in text ("figure 03", "equation (1)").

## Code
- Excerpts of 5–40 lines. Keep the author's comments (even in Serbian); don't translate code.
- Highlight 1–4 lines the prose mentions.
- If the post explains an algorithm the repo doesn't implement correctly, show no code for it.

## Avoid
- Invented output or numbers; screenshots of code instead of CodeBlock.
- Repeating the figure caption in the paragraph next to it.
- Explaining what the reader can see ("As you can see…").
- Personal data in commands or output (student ID numbers, home paths, usernames): rename
  binaries neutrally (`./scheduler`) and say so to the user.
