# Verification

Why this file exists: the first post written this way almost showcased a `deleteProcess` that
crashed under random input. It compiled and passed the hand-picked menu demo; a 300-trial random
stress test broke it immediately. Test before you write.

## 1. Build the project as its author does
- CMake: `cmake -S <repo> -B /tmp/<name>-build && cmake --build /tmp/<name>-build`.
- Plain C++ without a build file: `g++ -std=c++17 -O1 -g -Wall -fsanitize=address,undefined *.cpp -o /tmp/<name>`.
- Java: `javac -d /tmp/<name>-out $(find src -name '*.java')`. Python: create a venv, install
  requirements, run the entry point.
- Warnings that another compiler would reject (e.g. a missing `#include <vector>`): note them for
  the user; build around them with `-include vector` rather than editing their code.

## 2. Run it for real output
Pipe a scripted session instead of typing into menus, and keep the input file:
```bash
printf "2\nprocs.txt\n6\n1\n0\n" | ./program > session.txt
```
Use excerpts of this output in `<Terminal>`; show the command as the user would run it.

## 3. Stress-test the parts the post shows
Write a small harness **outside the project repo** that links the project's own source files:
- Random operation sequences (insert/delete/search, push/pop, …) against a trusted reference
  (`std::set`, `std::map`, a sorted vector, Python dict).
- After *every* operation, check invariants: ordering, sizes, balance/height rules, colours,
  parent pointers — whatever the structure promises.
- Run each trial in a forked process (or separate executable run) so one crash doesn't hide the rest;
  build with `-fsanitize=address,undefined`.
- Report: trials run, operations, failures, first failing sequence (shrink it by hand if short).
A few hundred trials × a few hundred operations takes seconds and is usually enough.

## 4. Cross-check a model against the original
If an animation runs a re-implementation (TypeScript model of C++ logic):
- Add a tiny "dumper" to the original (a separate .cpp in /tmp that includes their headers) that
  prints the structure in a canonical string form.
- Print the same form from the model (`dump()` in `lib/tree234.ts`).
- Feed both the same few hundred random inputs; require **0 differences**. Mention the number in
  the post ("300 random sequences, identical trees") — it's a credibility point.

## 5. Measure numbers
Median of ≥ 5 runs, fixed seeds, say sizes and method in the DataTable caption. Compare to a
theoretical bound when there is one.

## 6. Check the page
```bash
npm run build          # must pass
npm run dev            # then, in another terminal:
node .claude/skills/project-post/scripts/screenshot.mjs http://localhost:4321/projects/<slug>/
```
The script saves one PNG per `<figure>` for desktop-dark, desktop-light and mobile (390 px) into
`/tmp/post-shots/`, and prints console errors. Look at every image. Also click through each
animation to its last frame (the script's `--step` option does this for frame players).
Errors from third-party scripts (analytics) blocked in a sandbox can be ignored.
