/**
 * about.ts — the content of the About page, kept apart from its layout.
 * Edit the story here; the page and its components only decide how it looks.
 * `body` strings may contain simple inline HTML (<a>, <code>, <em>).
 */

export const now = [
  { key: "studying", text: "Software Engineering at the School of Electrical Engineering, Belgrade" },
  { key: "teaching", text: "Physics and programming at Petnica Science Center" },
  { key: "building", text: "A path tracer in C++ and a population of evolving neural agents" },
  { key: "learning", text: "Theory of computation and how neural networks actually compute" },
];

export type LogEntry = {
  /** Shown like a commit date: "high school", "2025", "year 2"… */
  when: string;
  /** Short tag next to the date. */
  kind: string;
  title: string;
  body: string;
  /** Still true today: gets a "still running" marker. */
  running?: boolean;
};

/** Oldest first: this is a story, so it reads forwards (git log --reverse). */
export const log: LogEntry[] = [
  {
    when: "high school",
    kind: "petnica",
    title: "Went to Petnica for the first time",
    body: "At seventeen I went to the Technical Sciences seminar at Petnica Science Center: mathematics, physics, computer science, electronics and astronomy under one roof. I came for the math and the physics. The computers were just the thing in the corner.",
  },
  {
    when: "high school",
    kind: "first code",
    title: "Wrote my first simulation and understood about half of it",
    body: "A flocking simulation in Python: every bird follows three simple rules, and a flock appears out of nowhere. I copied more than I understood, but I remember the moment it started to move. It was the first time code felt less like homework and more like a microscope.",
  },
  {
    when: "high school",
    kind: "physics",
    title: "Switched to physics",
    body: "Physical phenomena pulled harder, so I moved to Petnica's physics seminar. By the end I was simulating molecules diffusing through a liquid and modelling the stock market, and noticing that both ran on the same Monte Carlo ideas. That is where I learned that the interesting problems live <em>between</em> fields.",
  },
  {
    when: "2024",
    kind: "decision",
    title: "Picked software engineering out of pure curiosity",
    body: "Software engineering looked exotic, which was exactly the problem: I knew almost nothing about it. I had years of math and physics behind me and close to zero programming. The programming courses turned out to be the hardest thing I had done so far, so they got most of my time.",
  },
  {
    when: "year 1",
    kind: "algorithms",
    title: "Algorithms and data structures: I hadn't made a mistake",
    body: "The first course where everything clicked: math, logic and problem-solving, applied to something that actually runs. It was also the moment I stopped wondering whether I should have picked electrical engineering instead.",
  },
  {
    when: "2025",
    kind: "teaching",
    title: "Went back to Petnica, this time to teach",
    body: "Now I'm on the other side of the lab bench: lectures and exercises in physics and programming, and mentoring high-school students through their first research projects. Explaining something to a curious seventeen-year-old is the fastest way to find out whether you really understand it.",
    running: true,
  },
  {
    when: "year 2",
    kind: "oop",
    title: "Object-oriented programming rewired how I design programs",
    body: "The question changed from <em>what should this code do?</em> to <em>what are the pieces, and who is responsible for what?</em> My <a href=\"/projects/cli-interpreter-cpp/\">command-line interpreter</a> came out of that course: a parser in five layers that I kept refactoring long after it was good enough.",
  },
  {
    when: "year 2",
    kind: "theory",
    title: "Discrete math opened the door to theory",
    body: "Computability, formal languages, logic: the first time I saw that <em>what can a computer do at all?</em> is a precise mathematical question. Theoretical computer science has been quietly taking over my reading list ever since.",
    running: true,
  },
];

export const earlier = [
  { year: "2024", where: "Petnica · Computational finance", title: "VIX as a predictor of higher moments in financial returns", text: "A maximum-likelihood model fitted to 34 years of S&P 500 and VIX data, written in Python.", tags: ["Python", "MLE", "time series"] },
  { year: "2024", where: "Petnica · Physics", title: "Simulating fluorescence correlation spectroscopy", text: "Monte Carlo diffusion of molecules, then diffusion coefficients recovered from the autocorrelation curve.", tags: ["Python", "Monte Carlo", "curve fitting"] },
  { year: "2024", where: "Data Science Camp", title: "Predicting used-car prices", text: "Linear regression, random forests and XGBoost, with feature engineering and cross-validation.", tags: ["scikit-learn", "XGBoost", "regression"] },
];

export const toolbox: { key: string; items: string[]; solid?: boolean }[] = [
  { key: "languages", items: ["C++", "C", "Python", "Java", "SQL", "MATLAB"] },
  { key: "scientific", items: ["NumPy", "Pandas", "SciPy", "scikit-learn", "Matplotlib"] },
  { key: "methods", items: ["Monte Carlo simulation", "Maximum likelihood", "Object-oriented design", "Algorithm design"] },
  { key: "tools", items: ["Git", "CMake", "Jupyter", "Astro"] },
];

/** The opening sentence, split so it can be revealed word by word. `hl` = underlined phrase. */
export const lead: { t: string; hl?: boolean }[] = [
  { t: "I'm Marko. I study Software Engineering in Belgrade, and I like building things" },
  { t: "from first principles", hl: true },
  { t: "(shells, renderers, neural networks) until I understand why they work." },
];

/** A few true numbers from the story. `n` counts up; `text` is shown as-is when there is no number. */
export const numbers: { n?: number; text?: string; suffix?: string; label: string }[] = [
  { n: 5, label: "sciences at my first Petnica seminar" },
  { n: 34, suffix: " yrs", label: "of market data in my first model" },
  { n: 5, label: "layers in my command-line parser" },
  { text: "∞", label: "things I still want to understand" },
];

export const quote = "The interesting problems live between fields.";

/** Subjects the contact terminal cycles through. */
export const mailSubjects = ["a parser", "a simulation", "a paper you liked", "a problem worth building from scratch"];

/** Points of the header trajectory: code (0–1), math & physics (0–1), time (0–1, chronological). */
export const trajectory = [
  { label: "petnica", code: 0.08, theory: 0.52, time: 0.0 },
  { label: "first sim", code: 0.22, theory: 0.4, time: 0.14 },
  { label: "physics", code: 0.18, theory: 0.82, time: 0.3 },
  { label: "etf", code: 0.45, theory: 0.3, time: 0.52 },
  { label: "algorithms", code: 0.6, theory: 0.58, time: 0.66 },
  { label: "theory", code: 0.66, theory: 0.86, time: 0.8 },
  { label: "now", code: 0.8, theory: 0.72, time: 0.9, now: true },
  { label: "next: AI research", code: 0.95, theory: 0.95, time: 1.0, next: true },
];
