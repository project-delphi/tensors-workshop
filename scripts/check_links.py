#!/usr/bin/env python3
"""Verify the rendered site against _variables.yml.

    uv run --with pyyaml,nbformat python scripts/check_links.py
    uv run --with pyyaml,nbformat python scripts/check_links.py --notebooks-only

Fourteen checks, each of which catches a mistake that is otherwise invisible.
They are printed numbered in the order they actually run, which is the order
below; `--notebooks-only` runs the two marked [nb] and numbers those 1 and 2.

  - Notebooks are valid, have no outputs or execution counts, and each badge
    points at its own file — the thirteen sections and the extras alike. And
    every link from one notebook to another names an `.ipynb` that exists:
    nothing else looks at those, because a notebook reaches `docs/` as a
    verbatim copy rather than a rendered page. [nb]
  - Every notebook docs/ serves is byte-identical to the one committed in
    notebooks/. Quarto copies them verbatim instead of rendering them, so
    this is the only gate that would notice docs/ serving a stale notebook.
  - Internal links resolve — including the #fragment, so a link to
    kahoot.html#quiz-2 fails if that anchor is not on the page.
  - Colab URLs are well-formed AND point at a notebook that exists. A badge
    with the wrong filename still opens *something* in Colab, so this one
    never surfaces on its own.
  - Both decks carry every section anchor, and link the same set of ML blog
    posts. Adding a section to the English deck and forgetting the Spanish one
    is the single most likely way these two files drift; a reading chip added
    to one deck only is the same drift with no anchor to catch it. Every
    ml-blog URL in either deck, and in the notebooks, must be declared under
    `reading:` — the checker never fetches one, by design.
  - The EN and ES notebooks pages list the same thirteen sections. Extras are
    deliberately absent from both this check and the deck check above: an
    extra is take-home material with no slide and no place in the agenda.
  - The EN and ES references pages cite the same external works, every
    ml-blog URL among them is declared under `reading:`, and every group
    anchor in `references:` exists on both. The bibliography is generated,
    but the prose around it is not, and that is where a work gets cited in
    one language only.
  - Every section's `start` and `end` still match what the running clock
    derives from `minutes` and the quizzes and breaks between them, and the
    `agenda` rows both decks print still spell that clock out segment for
    segment. The start/end pair is written out in _variables.yml because
    `{{< var >}}` cannot add numbers, so nothing but this check stops it
    drifting when a `minutes` changes.
  - The deck timer's total still matches workshop.minutes. Quarto has no
    passthrough for reveal's `totalTime`, so the number lives in JavaScript
    and nothing else would notice it going stale.
  - No visible cell depends on a name bound only inside a folded solution
    cell. [nb]
  - Kahoot join URLs. A reminder, NOT a failure — see check_kahoot_urls.
  - The companion's artifact links and exports. Also a reminder, NOT a
    failure — see check_companion.
  - The two handbooks still have the same shape: heading counts, table rows,
    and the notebooks each links. `CLAUDE.md` requires them to change in the
    same commit and nothing else verifies it. Structure only — it cannot see
    wording, which is the half that actually drifts.
  - Both Kahoot pages carry the three quiz anchors. Adding a quiz heading to
    one language and forgetting the other is the same drift the notebooks-page
    check already watches.

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
# The handbook, by the one filename both languages use: the English one at
# the repo root, the Spanish translation of it under es/.
HANDBOOK = "tensors_workshop_plan_with_quizzes.md"
V = yaml.safe_load((ROOT / "_variables.yml").read_text(encoding="utf-8"))
SECTIONS = [V["sections"][k] for k in sorted(V["sections"])]
# Extras are notebooks that are not sections: take-home deep dives, off the
# clock. They are notebooks everywhere a notebook is checked, and nowhere a
# section is checked — no deck anchor, no parity row, no agenda segment.
EXTRAS = [V["extras"][k] for k in sorted(V.get("extras", {}))]
NOTEBOOKS = SECTIONS + EXTRAS
REPO = V["repo"]

COLAB_RE = re.compile(
    r"^https://colab\.research\.google\.com/github/"
    rf"{re.escape(REPO['user'])}/{re.escape(REPO['name'])}/blob/"
    rf"{re.escape(REPO['branch'])}/notebooks/([0-9]{{2}}-[a-z0-9-]+\.ipynb)$")

# Any reference to a notebook from *inside* another notebook. Two forms reach
# a reader: the full Colab URL, and the bare repo-relative path. Unanchored,
# unlike COLAB_RE above, because these are found inside prose rather than
# matched against a whole href.
NB_REF_RE = re.compile(
    r"(?:https://colab\.research\.google\.com/github/"
    rf"{re.escape(REPO['user'])}/{re.escape(REPO['name'])}/blob/"
    rf"{re.escape(REPO['branch'])}/)?notebooks/([0-9]{{2}}-[a-z0-9-]+\.ipynb)")

# The ML blog posts both decks and the two deep dives link to. These are the
# only external URLs in the deck, and nothing here fetches them — the checker
# is offline by design, and whether a post is still published is a manual
# concern (see the `reading:` comment in _variables.yml). What *is* checked,
# and what can go wrong silently, is that every ml-blog URL in the rendered
# decks and in the notebooks was declared in _variables.yml rather than typed
# in, and that the two decks link the same set.
READING = V.get("reading", {})
REFERENCES = V.get("references", {})
READING_URLS = {r["url"] for r in READING.values()}
BLOG_RE = re.compile(r"https://project-delphi\.github\.io/ml-blog/[^\s\"')<>]*")

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


def check_reading(urls: set[str], where: str) -> None:
    """Fail for any ml-blog URL `where` uses that _variables.yml does not own."""
    for url in sorted(urls - READING_URLS):
        fail(f"{where}: ml-blog URL {url} is not declared under `reading:` "
             f"in _variables.yml")


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
          f"{len(seen_notebooks)}/{len(NOTEBOOKS)} notebooks referenced")
    for s in NOTEBOOKS:
        name = f"{s['n']}-{s['slug']}.ipynb"
        if name not in seen_notebooks:
            fail(f"no page on the site links to notebooks/{name}")


# ── both decks carry every section ───────────────────────────────────────────

def check_decks() -> None:
    step("Section anchors in both decks")
    expected = [f"sec-{s['n']}-{s['slug']}" for s in SECTIONS]
    expected += [f"sec-kahoot-{q}" for q in (1, 2, 3)]
    found = {}
    reading: dict[str, set[str]] = {}
    for lang in ("en", "es"):
        deck = DOCS / "slides" / lang / "index.html"
        if not deck.exists():
            # `continue`, not `return`: bailing out here would skip the other
            # deck and the parity comparison, which is the point of this check.
            fail(f"missing deck {deck.relative_to(DOCS)}")
            continue
        h = harvest(deck)
        found[lang] = h.ids
        reading[lang] = {u for u in h.links if u in READING_URLS or
                         BLOG_RE.fullmatch(u)}
        check_reading(reading[lang], f"slides/{lang}")
        for anchor in expected:
            if anchor not in found[lang]:
                fail(f"slides/{lang}: missing anchor #{anchor}")
    if len(found) < 2:
        return
    # The reading chips carry no anchor, so the parity above cannot see them.
    # They are the newest way for the two decks to drift and the easiest to
    # miss: a chip added to one deck changes nothing visible in the other.
    for url in sorted(reading["en"] - reading["es"]):
        fail(f"reading link {url} is in the EN deck but not the ES deck")
    for url in sorted(reading["es"] - reading["en"]):
        fail(f"reading link {url} is in the ES deck but not the EN deck")
    only_en = {a for a in found["en"] if a.startswith("sec-")} - found["es"]
    only_es = {a for a in found["es"] if a.startswith("sec-")} - found["en"]
    for a in sorted(only_en):
        fail(f"anchor #{a} is in the EN deck but not the ES deck")
    for a in sorted(only_es):
        fail(f"anchor #{a} is in the ES deck but not the EN deck")
    print(f"      {len(expected)} anchors present in both decks, no extras in either")
    print(f"      {len(reading['en'])} reading links, identical in both decks, "
          f"all declared in _variables.yml")


# ── notebooks ────────────────────────────────────────────────────────────────

def check_notebooks() -> None:
    import json
    step("Notebooks")
    try:
        import nbformat
    except ImportError:
        nbformat = None
        print("      nbformat unavailable — structural checks only")

    n_refs = 0
    for s in NOTEBOOKS:
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
        # The parsed cells, not the file: in raw .ipynb JSON a source line
        # ends in a literal \n escape, which BLOG_RE's character class does
        # not exclude, so a bare autolink not followed by `)` would be
        # captured with the escape stuck to it and reported as undeclared.
        body = "".join("".join(c.get("source", [])) for c in nb["cells"])
        check_reading(set(BLOG_RE.findall(body)), name)
        # Links from one notebook to another. **Nothing else looks at these.**
        # Check 3 harvests links out of `docs/*.html`, and a notebook reaches
        # `docs/` as a verbatim `resources:` copy rather than a rendered page,
        # so its own links are never parsed. That is how notebook 01 came to
        # link `12-matrix-factorizations.ipynb` and
        # `13-tensor-factorizations.ipynb` -- the numbers the two
        # factorization notebooks carried before they became 09 and 11 --
        # and stay that way through every green build until #83.
        for target in sorted(set(NB_REF_RE.findall(body))):
            n_refs += 1
            if not (NBDIR / target).exists():
                fail(f"{name}: links notebooks/{target}, which does not exist")
    unknown = {p.name for p in NBDIR.glob("*.ipynb")} - {
        f"{s['n']}-{s['slug']}.ipynb" for s in NOTEBOOKS}
    for e in sorted(unknown):
        fail(f"notebooks/{e} is neither a section nor an extra "
             f"in _variables.yml")
    print(f"      {len(NOTEBOOKS)} notebooks ({len(SECTIONS)} sections, "
          f"{len(EXTRAS)} extras): valid, no outputs, no execution counts, "
          f"badges self-consistent")
    print(f"      {n_refs} links from one notebook to another, all resolving")


# ── docs/ serves the notebooks that are committed ────────────────────────────

def check_docs_notebooks() -> None:
    """The one staleness check that walks something other than *.html.

    Notebooks are `resources:` in _quarto.yml, not `render:` targets, so
    Quarto copies them into docs/ verbatim rather than building them. That
    makes a notebook committed without a re-render invisible to both existing
    gates: the regenerate step compares the tracked notebooks against the
    normalizer and never looks in docs/, and compare_render.py walks *.html
    only. docs/notebooks/ has gone stale twice that way, once to nine of the
    twelve at a stroke, and both times Pages served the old copies.

    Byte-for-byte is the right comparison here precisely because Quarto does
    not transform these files — unlike the HTML gate, which cannot be exact.
    CI runs this against docs/ AS COMMITTED, before any re-render, which is
    what Pages is serving right now.
    """
    step("docs/notebooks matches notebooks/")
    served_dir = DOCS / "notebooks"
    if not served_dir.is_dir():
        fail("docs/notebooks/ does not exist — run `quarto render`")
        return

    expected = {f"{s['n']}-{s['slug']}.ipynb" for s in NOTEBOOKS}
    stale = []
    for name in sorted(expected):
        source, served = NBDIR / name, served_dir / name
        if not source.exists():
            continue          # check_notebooks already reported this one
        if not served.exists():
            fail(f"docs/notebooks/{name} is missing — run `quarto render` "
                 f"and commit docs/")
        elif served.read_bytes() != source.read_bytes():
            stale.append(name)
    if stale:
        fail(f"docs/ serves an old copy of {len(stale)} notebook(s): "
             f"{', '.join(stale)} — run `quarto render` and commit docs/")
    for orphan in sorted({p.name for p in served_dir.glob("*.ipynb")}
                         - expected):
        fail(f"docs/notebooks/{orphan} is served but is neither a section nor "
             f"an extra — a rename left it behind; delete it")

    if not stale:
        print(f"      {len(expected)} notebooks served from docs/ are "
              f"byte-identical to the committed notebooks/")


# ── EN and ES notebooks pages agree ──────────────────────────────────────────

def check_notebooks_parity() -> None:
    """The EN and ES notebooks pages must list the same thirteen sections.

    This used to check the two landing pages, which carried the full section
    table until it was cut from both to make the homepage a front door rather
    than an index. The table did not move -- it went away -- so the guarantee
    moved to the narrower one that survived: `_includes/notebooks-{en,es}.md`,
    the only place on the site that still enumerates every section in both
    languages.

    Slide anchors are not checked here, because the notebooks table has none.
    Nothing is lost by that: check 4 already walks both decks for every
    `#sec-NN` anchor, which is the same guarantee from the other end.
    """
    step("EN / ES notebooks pages")
    en, es = DOCS / "notebooks.html", DOCS / "es" / "notebooks.html"
    if not (en.exists() and es.exists()):
        fail("a notebooks page is missing")
        return
    for page in (en, es):
        text = page.read_text(encoding="utf-8")
        for s in SECTIONS:
            if f"{s['n']}-{s['slug']}.ipynb" not in text:
                fail(f"{page.relative_to(DOCS)}: no notebook link for "
                     f"section {s['n']}")
    print(f"      both pages list all {len(SECTIONS)} sections "
          f"with notebook links")


def check_references() -> None:
    """The EN and ES references pages must cite the same works.

    The body of both pages is generated from `references:` by gen_tables.py,
    so parity there holds by construction — but the intro and the "not on this
    page" list around it are hand-written per language, and that is where a
    citation gets added to one page only.

    Comparing *external* links rather than every link is deliberate: the two
    pages' internal cross-links legitimately differ (`../handbook` on one,
    `handbook` on the other), while every book, DOI, author page and blog post
    is an absolute URL that is the same in both languages or is a mistake.
    """
    step("EN / ES references pages")
    en, es = DOCS / "references.html", DOCS / "es" / "references.html"
    if not (en.exists() and es.exists()):
        fail("a references page is missing")
        return

    external, ids = {}, {}
    for lang, page in (("en", en), ("es", es)):
        h = harvest(page)
        ids[lang] = h.ids
        external[lang] = {u for u in h.links if u.startswith(("http://", "https://"))}
        check_reading({u for u in external[lang] if BLOG_RE.fullmatch(u)},
                      f"references ({lang})")

    for url in sorted(external["en"] - external["es"]):
        fail(f"references: {url} is cited on the EN page but not the ES page")
    for url in sorted(external["es"] - external["en"]):
        fail(f"references: {url} is cited on the ES page but not the EN page")

    # Group anchors are written out in `references:` precisely so they do not
    # follow the (translated) heading text. The handbook and the section-10
    # prose link straight into them, and check_links() above only sees the
    # anchors a link actually names — a group renamed out from under an
    # unlinked anchor would pass there and fail here.
    for g in REFERENCES.get("groups", []):
        for lang in ("en", "es"):
            if g["anchor"] not in ids[lang]:
                fail(f"references ({lang}): no anchor #{g['anchor']}")

    n_groups = len(REFERENCES.get("groups", []))
    shared = external["en"] & external["es"]
    # Reporting the shared count rather than the EN one: with a mismatch above,
    # "N citations, identical on both pages" would be the one line in the run
    # that contradicts the FAILs printed directly over it.
    both = "identical on both pages" if external["en"] == external["es"] else \
           "on both pages, plus the mismatches above"
    print(f"      {len(shared)} external citations {both}, "
          f"across {n_groups} groups")


def check_schedule() -> None:
    """Compare the running clock with the written `start`/`end` and the agenda.

    timeline.py walks the sections in order, adding each one's `minutes`, plus
    `schedule.quiz_minutes` after a section a quiz follows and
    `schedule.break_minutes` after one in `schedule.break_after`. Three things
    have to agree with that walk: each section's written `start`/`end`; the
    total, which is what catches a break or a quiz going missing rather than a
    single offset being mistyped; and `agenda`, whose rows have to account for
    every segment exactly once and in order, since the table both decks print
    is generated straight from them.
    """
    from timeline import (ScheduleError, agenda_rows,  # noqa: PLC0415
                          clock, section_windows, total_minutes)

    step("Section start and end times")
    windows = section_windows()
    for s, start, end in windows:
        want = (clock(start, "+"), clock(end, "+"))
        got = (s.get("start"), s.get("end"))
        if got != want:
            fail(f"section {s['n']}: start/end is {got[0]}–{got[1]}, "
                 f"derived {want[0]}–{want[1]}")

    minute, total = total_minutes(), V["workshop"]["minutes"]
    if minute != total:
        fail(f"sections + quizzes + breaks come to {minute} min, "
             f"workshop.minutes says {total}")
    else:
        print(f"      {len(windows)} sections end at {clock(minute, '+')}"
              f" — {total} min including quizzes and breaks")

    # gen_tables.py raises rather than writing a wrong agenda, so this fails
    # only on a tree where _variables.yml has moved on and the generator has
    # not been rerun — the same state CI's regenerate gate catches, one push
    # later.
    try:
        rows = agenda_rows("en")
    except ScheduleError as e:
        fail(str(e))
    else:
        print(f"      {len(rows)} agenda rows account for all {len(windows)} "
              f"sections, 3 quizzes and "
              f"{len(V['schedule']['break_after'])} breaks, in clock order")


def check_deck_total() -> None:
    """The deck timer's total must still be workshop.minutes, in seconds.

    `total-time` in the deck header is silently ignored by Quarto — it never
    reaches the reveal config — so slides/deck-pace.html hard-codes the number
    and hands it to Reveal.configure(). That makes it the one number about the
    workshop's length that lives outside _variables.yml, and the only thing
    that would catch it drifting is this check.
    """
    step("Deck timer total")
    src = (ROOT / "slides" / "deck-pace.html").read_text(encoding="utf-8")
    m = re.search(r"var TOTAL_SECONDS = (\d+);", src)
    if not m:
        fail("slides/deck-pace.html: no `var TOTAL_SECONDS = <n>;` found")
        return
    got, want = int(m.group(1)), V["workshop"]["minutes"] * 60
    if got != want:
        fail(f"deck-pace.html TOTAL_SECONDS is {got}, "
             f"workshop.minutes ({V['workshop']['minutes']}) wants {want}")
    else:
        print(f"      TOTAL_SECONDS {got} = {V['workshop']['minutes']} min, "
              f"matching workshop.minutes")


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
    for s in NOTEBOOKS:
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
    print(f"      {checked} visible code cells across {len(NOTEBOOKS)} "
          f"notebooks are self-sufficient")


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


def check_companion() -> None:
    """Not a failure either, and for the same reason as the Kahoot check: an
    artifact that has not been exported yet has somewhere sensible to fall
    back to, and CI must not go red for the fortnight between publishing the
    page and finishing the exports.

    Two different placeholder shapes, because the artifacts differ in kind: a
    link-only artifact (quiz, flashcards, mind map) sits at `default_url`, the
    notebook's own front door, which does work; an exported one (video, audio,
    infographics) is simply empty, because there is no partial version of a
    file. The real gate on the exports is check 3 — once a path is listed, it
    has to exist in docs/."""
    step("Companion artifacts")
    c = V["companion"]
    pending = []
    for name in ("quiz", "flashcards", "mindmap"):
        for lang in ("en", "es"):
            if c[name][f"url_{lang}"] == c["default_url"]:
                pending.append(f"{name}.url_{lang}")
    interim = []
    for lang in ("en", "es"):
        if not c["video"].get(f"youtube_id_{lang}"):
            # A video published as a NotebookLM link is not unset -- it plays
            # today, it just costs the visitor a Google account. Report it
            # apart from the fields that show nothing at all.
            if c["video"].get(f"url_{lang}"):
                interim.append(f"video.youtube_id_{lang}")
            else:
                pending.append(f"video.youtube_id_{lang}")
        if not c["audio"].get(f"file_{lang}"):
            pending.append(f"audio.file_{lang}")
        # The running times are reported too. Without them the page still
        # renders -- it just quietly drops the "12 minutes ·" prefix -- and a
        # field that goes missing with no visible symptom is exactly what this
        # check exists to catch.
        for kind in ("video", "audio"):
            if not c[kind].get(f"minutes_{lang}"):
                pending.append(f"{kind}.minutes_{lang}")
    # The screenshots. An artifact with no `thumb` still renders -- as a card
    # or a link with no picture -- so this is a TODO like the rest; an artifact
    # *with* one and no alt text is different in kind, and gets said so,
    # because the generator quietly falls back to the title and a screen
    # reader is then told "Mind map" about a picture of thirteen boxes.
    for name in ("video", "audio", "quiz", "flashcards", "mindmap"):
        # The video is the one artifact whose poster has an expiry: once a
        # YouTube id lands in both languages the embed carries its own, and
        # video_block() stops reading `thumb` entirely. Asking for it then
        # would be asking for a PNG that changes nothing on the page.
        if name == "video" and all(c["video"].get(f"youtube_id_{la}")
                                   for la in ("en", "es")):
            continue
        if not c[name].get("thumb"):
            pending.append(f"{name}.thumb")
            continue
        for lang in ("en", "es"):
            if not c[name].get(f"thumb_alt_{lang}"):
                pending.append(f"{name}.thumb_alt_{lang} (has a thumb)")
    # The shorts. `covers` is a hand-made reading of each title, so what can be
    # checked is only that it names a section that exists -- a typo, or a
    # section renumbered out from under it. A wrong-but-real number is beyond
    # this check and always will be.
    known = {s["n"] for s in SECTIONS}
    for n, s in enumerate(c.get("shorts") or [], 1):
        missing = [k for k in ("url", "title_en", "title_es", "length",
                               "lang", "covers") if not s.get(k)]
        if missing:
            fail(f"companion.shorts[{n}] ({s.get('title_en') or 'untitled'}): "
                 f"missing {', '.join(missing)}")
        elif s["covers"] not in known:
            fail(f"companion.shorts[{n}] ({s['title_en']}): covers "
                 f"{s['covers']!r}, which is not a section")
        elif s["lang"] not in ("en", "es"):
            fail(f"companion.shorts[{n}] ({s['title_en']}): lang "
                 f"{s['lang']!r} is neither en nor es")
    if not c.get("shorts"):
        pending.append("shorts")
    if not c.get("infographics"):
        pending.append("infographics")
    else:
        # An entry still holding the notebook's own front door is a
        # placeholder, not a published link -- the same distinction the
        # quiz/flashcards/mindmap loop above draws with `default_url`.
        placeholder = [i for i in c["infographics"]
                       if i.get("url") == c["default_url"]]
        if placeholder:
            pending.append(f"{len(placeholder)} infographic url(s) still at "
                           f"default_url")
        unexported = [i for i in c["infographics"]
                      if not i.get("file") and i not in placeholder]
        if unexported:
            interim.append(f"{len(unexported)} infographic(s) linked, not "
                           f"exported")
    if pending:
        print(f"      TODO  {len(pending)} companion fields still unset: "
              f"{', '.join(pending)}")
        print("      Each one degrades to an honest note on the page, so the "
              "site is publishable meanwhile.")
    if interim:
        print(f"      TODO  published as NotebookLM links, not yet exported: "
              f"{', '.join(interim)}")
        print("      These work today, but only for a visitor with a Google "
              "account.")
    if not pending and not interim:
        print("      every companion artifact has a link or a committed file")


# ── the two handbooks move together ──────────────────────────────────────────

def check_handbooks() -> None:
    """The EN and ES handbooks still have the same shape.

    `CLAUDE.md` requires both to change in the same commit -- nothing
    generates the Spanish one from the English -- and until now nothing
    verified it. What can be compared without a translation dictionary is
    structure: how many sections, how many tables, and which notebooks each
    one sends a reader to.

    **What this cannot catch is wording**, which is the half that goes wrong
    most often. #83 edited "the whole family" to "the eight" in the English
    handbook and left "toda la familia" in the Spanish one, and every count
    below stayed equal through it. A guard that oversold itself here would be
    worse than none, so: this catches a heading, a table or a notebook link
    added to one side only, and nothing else.

    It is numbered 13 because the numbers are a contract --
    `CLAUDE.md`'s prose refers to checks 1, 3, 5, 6, 8 and 12 by number, and
    inserting this one where it reads best would silently renumber three of
    them. Check 14 (Kahoot page parity) was added after it, not inserted
    before.
    """
    step("EN / ES handbooks have the same shape")
    en, es = ROOT / HANDBOOK, ROOT / "es" / HANDBOOK
    if not (en.exists() and es.exists()):
        print("      one or both handbooks missing — nothing to compare")
        return

    def shape(path: pathlib.Path) -> dict:
        t = re.sub(r"```.*?```", "", path.read_text(encoding="utf-8"), flags=re.S)
        return {
            "## headings": len(re.findall(r"^## ", t, re.M)),
            "### headings": len(re.findall(r"^### ", t, re.M)),
            "table rows": len(re.findall(r"^\|", t, re.M)),
            "notebooks linked":
                len(set(re.findall(r"notebooks/(\d\d-[a-z0-9-]+)\.ipynb", t))),
        }

    a, b = shape(en), shape(es)
    for k in a:
        if a[k] != b[k]:
            fail(f"handbooks disagree on {k}: EN has {a[k]}, ES has {b[k]} — "
                 f"the two must change in the same commit")
    if a == b:
        print("      " + ", ".join(f"{v} {k}" for k, v in a.items())
              + " — identical in both")


def check_kahoot_pages() -> None:
    """Both Kahoot pages carry the three quiz anchors.

    The English how-to used to be the last unpaired page. The Spanish one is
    now a real counterpart, so a heading added on one side only would strand
    every Q1/Q2/Q3 link that gen_tables.py emits for that language.
    """
    step("EN / ES Kahoot pages have the quiz anchors")
    expected = [f"quiz-{n}" for n in (1, 2, 3)]
    pages = (("en", DOCS / "kahoot.html"),
             ("es", DOCS / "es" / "kahoot.html"))
    found = {}
    for lang, page in pages:
        if not page.exists():
            fail(f"missing Kahoot page {page.relative_to(DOCS)}")
            continue
        found[lang] = harvest(page).ids
        for anchor in expected:
            if anchor not in found[lang]:
                fail(f"kahoot ({lang}): missing anchor #{anchor}")
    if len(found) == 2 and all(a in found["en"] and a in found["es"]
                               for a in expected):
        print("      quiz-1, quiz-2, quiz-3 present on both pages")


def main() -> int:
    only_nb = "--notebooks-only" in sys.argv
    print(f"Checking {'notebooks' if only_nb else 'docs/ and notebooks/'} "
          f"against _variables.yml")
    check_notebooks()
    if not only_nb:
        check_docs_notebooks()
        check_links()
        check_decks()
        check_notebooks_parity()
        check_references()
        check_schedule()
        check_deck_total()
    check_solution_independence()
    if not only_nb:
        check_kahoot_urls()
        check_companion()
        check_handbooks()
        check_kahoot_pages()

    print()
    if failures:
        print(f"{len(failures)} FAILURE(S)")
        return 1
    print("All checks passed.")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    sys.exit(main())
