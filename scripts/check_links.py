#!/usr/bin/env python3
"""Verify the rendered site against _variables.yml.

    uv run --with pyyaml,nbformat python scripts/check_links.py
    uv run --with pyyaml,nbformat python scripts/check_links.py --notebooks-only

Eight checks, each of which catches a mistake that is otherwise invisible.
They are printed numbered in the order they actually run, which is the order
below; `--notebooks-only` runs the two marked [nb] and numbers those 1 and 2.

  - Notebooks are valid, have no outputs or execution counts, and each badge
    points at its own file. [nb]
  - Internal links resolve — including the #fragment, so a link to
    kahoot.html#quiz-2 fails if that anchor is not on the page.
  - Colab URLs are well-formed AND point at a notebook that exists. A badge
    with the wrong filename still opens *something* in Colab, so this one
    never surfaces on its own.
  - Both decks carry every section anchor. Adding a section to the English
    deck and forgetting the Spanish one is the single most likely way these
    two files drift.
  - The EN and ES landing pages list the same twelve sections.
  - Every section's `start` and `end` still match what the running clock
    derives from `minutes` and the quizzes and breaks between them. These are
    written out in _variables.yml because `{{< var >}}` cannot add numbers, so
    nothing but this check stops them drifting when a `minutes` changes.
  - No visible cell depends on a name bound only inside a folded solution
    cell. [nb]
  - Kahoot join URLs. A reminder, NOT a failure — see check_kahoot_urls.

Exit code is non-zero on any failure, so CI can gate on it.
"""
from __future__ import annotations

import html.parser
import pathlib
import re
import sys
import urllib.parse

import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
NBDIR = ROOT / "notebooks"
V = yaml.safe_load((ROOT / "_variables.yml").read_text(encoding="utf-8"))
SECTIONS = [V["sections"][k] for k in sorted(V["sections"])]
REPO = V["repo"]

COLAB_RE = re.compile(
    r"^https://colab\.research\.google\.com/github/"
    rf"{re.escape(REPO['user'])}/{re.escape(REPO['name'])}/blob/"
    rf"{re.escape(REPO['branch'])}/notebooks/([0-9]{{2}}-[a-z0-9-]+\.ipynb)$")

failures: list[str] = []


def fail(msg: str) -> None:
    failures.append(msg)
    print(f"  FAIL  {msg}")


_step = 0


def step(title: str) -> None:
    """Print the next heading, numbered in the order the checks actually run.

    Hard-coded numbers drifted once already: they were assigned in definition
    order while main() called the checks in another, so a passing run counted
    off 4, 1, 3, 5, 7, 6. Counting here means the numbering is right by
    construction, including under --notebooks-only, which runs only a subset.
    """
    global _step
    _step += 1
    print(f"\n[{_step}] {title}")


class Harvester(html.parser.HTMLParser):
    """Collect every link and every id from one page."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[str] = []
        self.ids: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = {k: (v or "") for k, v in attrs}
        if "id" in a:
            self.ids.add(a["id"])
        if "name" in a and tag == "a":
            self.ids.add(a["name"])
        for key in ("href", "src"):
            if key in a and a[key]:
                self.links.append(a[key])


def harvest(path: pathlib.Path) -> Harvester:
    h = Harvester()
    h.feed(path.read_text(encoding="utf-8", errors="replace"))
    return h


# ── links ────────────────────────────────────────────────────────────────────

def check_links() -> None:
    pages = sorted(DOCS.rglob("*.html"))
    step(f"Internal links across {len(pages)} pages")
    if not pages:
        fail("docs/ has no HTML — run `quarto render` first")
        # Emit the second heading on the way out too. Bailing without it would
        # renumber every check that follows — the very drift `step` exists to
        # prevent — on the one run where docs/ is empty.
        step("Colab URLs")
        return

    harvested = {p: harvest(p) for p in pages}
    ids_by_page = {p: h.ids for p, h in harvested.items()}
    n_internal = n_colab = 0
    seen_notebooks: set[str] = set()

    for page, h in harvested.items():
        for raw in h.links:
            if raw.startswith(("mailto:", "data:", "javascript:", "#!")):
                continue

            if raw.startswith(("http://", "https://")):
                m = COLAB_RE.match(raw)
                # Only /github/ URLs open a notebook; /assets/ is the badge image.
                if raw.startswith("https://colab.research.google.com/github/"):
                    n_colab += 1
                    if not m:
                        fail(f"{page.relative_to(DOCS)}: malformed Colab URL {raw}")
                    elif not (NBDIR / m.group(1)).exists():
                        fail(f"{page.relative_to(DOCS)}: Colab URL points at "
                             f"notebooks/{m.group(1)}, which does not exist")
                    else:
                        seen_notebooks.add(m.group(1))
                continue

            url = urllib.parse.urlparse(raw)
            n_internal += 1

            if not url.path:                       # bare "#anchor" — same page
                if url.fragment and url.fragment not in h.ids:
                    fail(f"{page.relative_to(DOCS)}: no anchor #{url.fragment} on this page")
                continue

            path_part = urllib.parse.unquote(url.path)
            if path_part.startswith("/"):
                # `page.parent / "/foo"` silently discards page.parent and
                # resolves against the filesystem root, reporting a valid link
                # as broken. Root-relative means relative to the site root.
                target = (DOCS / path_part.lstrip("/")).resolve()
            else:
                target = (page.parent / path_part).resolve()
            if not target.is_relative_to(DOCS.resolve()):
                fail(f"{page.relative_to(DOCS)}: {raw} escapes docs/")
                continue
            if target.is_dir():
                target = target / "index.html"
            if not target.exists():
                fail(f"{page.relative_to(DOCS)}: broken link {raw}")
                continue
            if url.fragment and target.suffix == ".html":
                # Not setdefault(): Python evaluates the default eagerly, so
                # harvest() would re-parse the page on every cache hit — ~600x.
                if target not in ids_by_page:
                    ids_by_page[target] = harvest(target).ids
                if url.fragment not in ids_by_page[target]:
                    fail(f"{page.relative_to(DOCS)}: {raw} — page exists but "
                         f"has no anchor #{url.fragment}")

    print(f"      {n_internal} internal links checked (path + fragment)")
    step("Colab URLs")
    print(f"      {n_colab} Colab URLs, all well-formed, "
          f"{len(seen_notebooks)}/{len(SECTIONS)} notebooks referenced")
    for s in SECTIONS:
        name = f"{s['n']}-{s['slug']}.ipynb"
        if name not in seen_notebooks:
            fail(f"no page on the site links to notebooks/{name}")


# ── both decks carry every section ───────────────────────────────────────────

def check_decks() -> None:
    step("Section anchors in both decks")
    expected = [f"sec-{s['n']}-{s['slug']}" for s in SECTIONS]
    expected += [f"sec-kahoot-{q}" for q in (1, 2, 3)]
    found = {}
    for lang in ("en", "es"):
        deck = DOCS / "slides" / lang / "index.html"
        if not deck.exists():
            # `continue`, not `return`: bailing out here would skip the other
            # deck and the parity comparison, which is the point of this check.
            fail(f"missing deck {deck.relative_to(DOCS)}")
            continue
        found[lang] = harvest(deck).ids
        for anchor in expected:
            if anchor not in found[lang]:
                fail(f"slides/{lang}: missing anchor #{anchor}")
    if len(found) < 2:
        return
    only_en = {a for a in found["en"] if a.startswith("sec-")} - found["es"]
    only_es = {a for a in found["es"] if a.startswith("sec-")} - found["en"]
    for a in sorted(only_en):
        fail(f"anchor #{a} is in the EN deck but not the ES deck")
    for a in sorted(only_es):
        fail(f"anchor #{a} is in the ES deck but not the EN deck")
    print(f"      {len(expected)} anchors present in both decks, no extras in either")


# ── notebooks ────────────────────────────────────────────────────────────────

def check_notebooks() -> None:
    import json
    step("Notebooks")
    try:
        import nbformat
    except ImportError:
        nbformat = None
        print("      nbformat unavailable — structural checks only")

    for s in SECTIONS:
        name = f"{s['n']}-{s['slug']}.ipynb"
        path = NBDIR / name
        if not path.exists():
            fail(f"missing notebook {name}")
            continue
        nb = json.loads(path.read_text(encoding="utf-8"))
        if nbformat is not None:
            try:
                nbformat.validate(nbformat.reads(path.read_text(encoding="utf-8"),
                                                 as_version=4))
            except Exception as e:  # noqa: BLE001 — report, do not raise
                fail(f"{name}: nbformat.validate — {e}")
        for c in nb["cells"]:
            if c["cell_type"] != "code":
                continue
            if c.get("outputs"):
                fail(f"{name}: cell {c.get('id')} has committed outputs")
            if c.get("execution_count") is not None:
                fail(f"{name}: cell {c.get('id')} has a stale execution count")
        first = nb["cells"][0] if nb.get("cells") else None
        badge = "".join(first.get("source", [])) if first else ""
        if not badge:
            fail(f"{name}: has no first cell to carry the Colab badge")
        elif f"{REPO['colab_base']}/{name})" not in badge:
            fail(f"{name}: header badge does not point at this notebook")
    extra = {p.name for p in NBDIR.glob("*.ipynb")} - {
        f"{s['n']}-{s['slug']}.ipynb" for s in SECTIONS}
    for e in sorted(extra):
        fail(f"notebooks/{e} is not a section in _variables.yml")
    print(f"      {len(SECTIONS)} notebooks: valid, no outputs, no execution "
          f"counts, badges self-consistent")


# ── EN and ES landing pages agree ────────────────────────────────────────────

def check_landing_parity() -> None:
    step("EN / ES landing pages")
    en, es = DOCS / "index.html", DOCS / "es" / "index.html"
    if not (en.exists() and es.exists()):
        fail("a landing page is missing")
        return
    for page in (en, es):
        text = page.read_text(encoding="utf-8")
        for s in SECTIONS:
            if f"sec-{s['n']}-{s['slug']}" not in text:
                fail(f"{page.relative_to(DOCS)}: section {s['n']} "
                     f"({s['slug']}) is not in the table")
            if f"{s['n']}-{s['slug']}.ipynb" not in text:
                fail(f"{page.relative_to(DOCS)}: no notebook link for "
                     f"section {s['n']}")
    print(f"      both pages list all {len(SECTIONS)} sections "
          f"with slide anchors and notebook links")


def check_schedule() -> None:
    """Recompute the running clock and compare it with the written `start`/`end`.

    Walk the sections in order, adding each one's `minutes`, plus
    `schedule.quiz_minutes` after a section a quiz follows and
    `schedule.break_minutes` after one in `schedule.break_after`. The total has
    to land on `workshop.minutes`, which is the check that catches a break or a
    quiz going missing rather than a single offset being mistyped.
    """
    step("Section start and end times")
    sched = V["schedule"]
    quizzes = [V["kahoot"][k] for k in ("q1", "q2", "q3")]
    break_after = set(sched["break_after"])

    def clock(m: int) -> str:
        return f"+{m // 60:02d}:{m % 60:02d}"

    minute = 0
    for s in SECTIONS:
        want = (clock(minute), clock(minute + s["minutes"]))
        got = (s.get("start"), s.get("end"))
        if got != want:
            fail(f"section {s['n']}: start/end is {got[0]}–{got[1]}, "
                 f"derived {want[0]}–{want[1]}")
        minute += s["minutes"]
        if any(q["after"] == s["n"] for q in quizzes):
            minute += sched["quiz_minutes"]
        if s["n"] in break_after:
            minute += sched["break_minutes"]

    total = V["workshop"]["minutes"]
    if minute != total:
        fail(f"sections + quizzes + breaks come to {minute} min, "
             f"workshop.minutes says {total}")
    else:
        print(f"      {len(SECTIONS)} sections end at {clock(minute)}"
              f" — {total} min including quizzes and breaks")


def check_solution_independence() -> None:
    """No visible cell may depend on a name bound only inside a folded solution.

    This is the bug that does not show up when you run a notebook top to bottom
    with everything executed: the solution cell defines `psf`/`noisy`, a later
    visible cell uses them, and it works — until a student who solved the
    exercise themselves, or never opened the solution, hits NameError on it.
    """
    import ast
    import builtins
    step("Visible cells do not depend on folded solutions")
    checked = 0
    for s in SECTIONS:
        path = NBDIR / f"{s['n']}-{s['slug']}.ipynb"
        if not path.exists():
            continue
        import json
        nb = json.loads(path.read_text(encoding="utf-8"))
        visible_bound: set[str] = set(dir(builtins))
        solution_bound: set[str] = set()
        for c in nb["cells"]:
            if c["cell_type"] != "code":
                continue
            src = "\n".join(l for l in "".join(c["source"]).split("\n")
                             if not l.lstrip().startswith(("#@title", "%", "!")))
            try:
                tree = ast.parse(src)
            except SyntaxError as e:
                # Do not `continue` quietly: skipping a cell drops its bindings
                # from visible_bound and manufactures a false positive later.
                fail(f"{path.name}: cell {c['id']} does not parse — {e}")
                continue
            is_solution = "solution" in c["metadata"].get("tags", [])
            loads = {n.id for n in ast.walk(tree)
                     if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load)}
            binds = {n.id for n in ast.walk(tree)
                     if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store)}
            binds |= {n.name for n in ast.walk(tree)
                      if isinstance(n, (ast.FunctionDef, ast.ClassDef))}
            binds |= {(a.asname or a.name).split(".")[0]
                      for n in ast.walk(tree)
                      if isinstance(n, (ast.Import, ast.ImportFrom))
                      for a in n.names}
            # Parameters bind, they do not load. Without this, the `err = lambda
            # a: ...` idiom in notebook 09 false-positives as soon as any
            # solution cell happens to bind a name matching a parameter.
            binds |= {n.arg for n in ast.walk(tree) if isinstance(n, ast.arg)}
            binds |= {n.name for n in ast.walk(tree)
                      if isinstance(n, ast.ExceptHandler) and n.name}
            if is_solution:
                solution_bound |= binds
            else:
                # `- binds` matters: a cell that defines a name itself before
                # using it is self-sufficient, even if a solution happens to use
                # the same name. That is exactly how s09-20 was fixed.
                leaked = (loads & solution_bound) - visible_bound - binds
                for name in sorted(leaked):
                    fail(f"{path.name}: visible cell {c['id']} uses `{name}`, "
                         f"which only a folded solution cell defines")
                visible_bound |= binds
                checked += 1
    print(f"      {checked} visible code cells across {len(SECTIONS)} notebooks "
          f"are self-sufficient")


def check_kahoot_urls() -> None:
    """Not a failure: the default sends students to kahoot.it, where the PIN on
    the facilitator's screen works. It is a reminder that the direct join links
    have not been pasted in yet."""
    step("Kahoot join URLs")
    todo = [q for q in ("q1", "q2", "q3")
            if V["kahoot"][q]["url"] == V["kahoot"]["default_url"]]
    if todo:
        print(f"      TODO  {len(todo)} of 3 still use the generic "
              f"{V['kahoot']['default_url']} fallback: {', '.join(todo)}")
        print(f"      Import each .xlsx at kahoot.it, then paste the join URLs "
              f"into _variables.yml.")
    else:
        print("      all three point at a specific kahoot")


def main() -> int:
    only_nb = "--notebooks-only" in sys.argv
    print(f"Checking {'notebooks' if only_nb else 'docs/ and notebooks/'} "
          f"against _variables.yml")
    check_notebooks()
    if not only_nb:
        check_links()
        check_decks()
        check_landing_parity()
        check_schedule()
    check_solution_independence()
    if not only_nb:
        check_kahoot_urls()

    print()
    if failures:
        print(f"{len(failures)} FAILURE(S)")
        return 1
    print("All checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
