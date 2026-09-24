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
  { year: "2024", where: "Petnica · Computational finance", title: "VIX as a predictor of higher moments in financial returns", text: "A maximum-likelihood model fitted to 34 years of S&P 500 and VIX data, written in Python." },
  { year: "2024", where: "Petnica · Physics", title: "Simulating fluorescence correlation spectroscopy", text: "Monte Carlo diffusion of molecules, then diffusion coefficients recovered from the autocorrelation curve." },
  { year: "2024", where: "Data Science Camp", title: "Predicting used-car prices", text: "Linear regression, random forests and XGBoost, with feature engineering and cross-validation." },
];

export const toolbox: { key: string; items: string[]; solid?: boolean }[] = [
  { key: "languages", items: ["C++", "Python", "Java"] },
  { key: "scientific", items: ["NumPy", "Pandas", "SciPy", "scikit-learn", "Matplotlib"] },
  { key: "ides", items: ["CLion", "PyCharm", "IntelliJ IDEA", "DataGrip", "DataSpell"], solid: true },
  { key: "tools", items: ["Git", "CMake", "Jupyter", "Astro"] },
];
