#!/usr/bin/env python3
"""
repo_summary.py — a quick map of a project before writing about it.

    python3 repo_summary.py <path-to-cloned-repo> [--top 15]

Prints: languages by lines of code, build system, likely entry points, commit period (for the
post's `period:` front-matter), README head, and the largest source files. Standard library only.
"""
import argparse
import collections
import os
import re
import subprocess
import sys

EXT = {
    ".c": "C", ".h": "C/C++ header", ".cpp": "C++", ".cc": "C++", ".cxx": "C++", ".hpp": "C++ header",
    ".java": "Java", ".py": "Python", ".js": "JavaScript", ".mjs": "JavaScript", ".ts": "TypeScript",
    ".tsx": "TypeScript", ".jsx": "JavaScript", ".rs": "Rust", ".go": "Go", ".cs": "C#", ".kt": "Kotlin",
    ".s": "Assembly", ".S": "Assembly", ".asm": "Assembly", ".m": "MATLAB/Obj-C", ".jl": "Julia",
    ".r": "R", ".R": "R", ".ipynb": "Jupyter", ".astro": "Astro", ".vue": "Vue", ".html": "HTML",
    ".css": "CSS", ".scss": "SCSS", ".sql": "SQL", ".sh": "Shell", ".fxml": "FXML",
}
SKIP_DIRS = {".git", "node_modules", "build", "dist", "out", "target", "cmake-build-debug",
             "cmake-build-release", ".idea", ".vscode", "__pycache__", ".venv", "venv", ".gradle", "bin", "obj"}
BUILD_FILES = {
    "CMakeLists.txt": "CMake", "Makefile": "Make", "makefile": "Make", "pom.xml": "Maven",
    "build.gradle": "Gradle", "build.gradle.kts": "Gradle", "package.json": "npm",
    "pyproject.toml": "Python (pyproject)", "setup.py": "Python (setup.py)", "requirements.txt": "pip",
    "Cargo.toml": "Cargo", "go.mod": "Go modules", "meson.build": "Meson",
}
ENTRY = [
    (re.compile(r"\bint\s+main\s*\("), "C/C++ main()"),
    (re.compile(r"public\s+static\s+void\s+main\s*\("), "Java main()"),
    (re.compile(r"if\s+__name__\s*==\s*['\"]__main__['\"]"), "Python __main__"),
    (re.compile(r"\bfn\s+main\s*\("), "Rust main()"),
    (re.compile(r"extends\s+Application\b"), "JavaFX Application"),
]


def git(repo, *args):
    try:
        return subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True, check=True).stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("repo")
    ap.add_argument("--top", type=int, default=15)
    a = ap.parse_args()
    repo = os.path.abspath(a.repo)
    if not os.path.isdir(repo):
        sys.exit(f"not a directory: {repo}")

    loc = collections.Counter()
    files = []
    builds = []
    entries = []
    for root, dirs, names in os.walk(repo):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
        for n in names:
            p = os.path.join(root, n)
            rel = os.path.relpath(p, repo)
            if n in BUILD_FILES:
                builds.append(f"{BUILD_FILES[n]} ({rel})")
            lang = EXT.get(os.path.splitext(n)[1])
            if not lang:
                continue
            try:
                with open(p, encoding="utf-8", errors="replace") as f:
                    text = f.read()
            except OSError:
                continue
            lines = sum(1 for line in text.splitlines() if line.strip())
            loc[lang] += lines
            files.append((lines, rel))
            for rx, label in ENTRY:
                m = rx.search(text)
                if m:
                    line_no = text.count("\n", 0, m.start()) + 1
                    entries.append(f"{label}: {rel}:{line_no}")

    total = sum(loc.values()) or 1
    print(f"# {os.path.basename(repo)}\n")
    print("## Languages (non-blank lines)")
    for lang, n in loc.most_common():
        print(f"  {lang:<16} {n:>7}  {100 * n / total:5.1f}%")
    print(f"  {'total':<16} {sum(loc.values()):>7}\n")

    print("## Build")
    print("  " + ("\n  ".join(builds) if builds else "no build file found (compile sources directly)"))
    print("\n## Entry points")
    print("  " + ("\n  ".join(entries) if entries else "none found"))

    first = git(repo, "log", "--reverse", "--format=%ad", "--date=format:%Y-%m").splitlines()[:1]
    last = git(repo, "log", "-1", "--format=%ad", "--date=format:%Y-%m")
    count = git(repo, "rev-list", "--count", "HEAD")
    remote = git(repo, "config", "--get", "remote.origin.url")
    print("\n## History")
    if count:
        print(f"  commits: {count}   first: {first[0] if first else '?'}   last: {last}")
        print(f'  → period: {{ start: "{first[0] if first else "?"}", end: "{last}" }}')
        print(f"  remote: {remote or '-'}")
    else:
        print("  not a git repository")

    for name in ("README.md", "README", "readme.md", "README.txt"):
        p = os.path.join(repo, name)
        if os.path.isfile(p):
            with open(p, encoding="utf-8", errors="replace") as f:
                head = f.read().splitlines()[:25]
            print(f"\n## {name} (first {len(head)} lines)")
            for line in head:
                print("  " + line)
            break
    else:
        print("\n## README\n  none")

    print(f"\n## Largest source files (top {a.top})")
    for n, rel in sorted(files, reverse=True)[: a.top]:
        print(f"  {n:>6}  {rel}")


if __name__ == "__main__":
    main()
