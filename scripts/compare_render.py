#!/usr/bin/env python3
"""Compare committed HTML against a fresh render, ignoring asset-hash churn.

    python scripts/compare_render.py <committed-dir> <fresh-dir>

Why this exists: the obvious version of this check — `git status --porcelain`
after re-rendering — cannot work. Quarto compiles the theme SCSS at render time
and names the result by content hash, and that compilation is *platform
dependent*: macOS and ubuntu-latest produce different bytes at the same pinned
Quarto version, so the filename differs and every page that links to it differs
too. A byte-exact gate is red forever on any repo whose author is not on the
same OS as CI.

What actually needs guarding is narrower: that the committed pages say the same
thing as a fresh render of the same sources. So normalize the hashed asset names
away and compare the rest. Prose edited without re-rendering still fails, which
is the case the gate is for.
"""
from __future__ import annotations

import pathlib
import re
import sys

# site_libs/<name>-<32 hex>.min.css and friends, in filenames and in hrefs.
HASH_RE = re.compile(r"-[0-9a-f]{32}(\.min)?\.(css|js)")
# Quarto stamps the generator version into a meta tag.
META_RE = re.compile(r'<meta name="generator" content="quarto-[^"]*"\s*/?>')
IGNORE = {"sitemap.xml", "search.json"}


def normalize(text: str) -> str:
    text = HASH_RE.sub(r"-HASH\1.\2", text)
    return META_RE.sub('<meta name="generator" content="quarto-PINNED">', text)


def main() -> int:
    committed, fresh = (pathlib.Path(a).resolve() for a in sys.argv[1:3])
    pages = sorted(p for p in fresh.rglob("*.html"))
    if not pages:
        sys.exit(f"{fresh} contains no HTML — did the render run?")

    problems: list[str] = []
    for page in pages:
        rel = page.relative_to(fresh)
        if rel.name in IGNORE:
            continue
        old = committed / rel
        if not old.exists():
            problems.append(f"  {rel}: rendered now, but not committed")
            continue
        if normalize(old.read_text(encoding="utf-8", errors="replace")) != \
           normalize(page.read_text(encoding="utf-8", errors="replace")):
            problems.append(f"  {rel}: committed content differs from a fresh render")

    for old in sorted(committed.rglob("*.html")):
        rel = old.relative_to(committed)
        if rel.name not in IGNORE and not (fresh / rel).exists():
            problems.append(f"  {rel}: committed, but no longer rendered")

    if problems:
        print(f"{len(problems)} page(s) out of date:")
        print("\n".join(problems))
        print("\nRe-render and commit docs/:  quarto render")
        return 1
    print(f"{len(pages)} rendered pages match what is committed "
          f"(asset hashes normalized — they are platform-dependent).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
