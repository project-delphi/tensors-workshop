"""Regression checks for scripts/check_links.py, the site's test suite.

`check_links.py` is what stands between a bad edit and a workshop that breaks
in front of a room, and until now nothing tested it. Its checks are the kind
that fail *open*: a rule that quietly stops matching reports success, the build
goes green, and the thing it was watching rots. Check 1's cross-notebook link
rule exists because notebook 01 linked two files that had never existed for
months of green builds; check 2 exists because docs/notebooks/ went stale
twice. A checker with that history needs its own tests.

Each test drives one check against a tree built in a temporary directory, with
the module's globals pointed at it, and asserts on what lands in `failures`.
Two things are asserted every time: that a broken tree fails, and that the
same tree fixed does not. A test that only pins the first half would still
pass against a check that fails on everything.
"""
from __future__ import annotations

import contextlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
# check_schedule does `from timeline import ...` at call time, which only
# resolves with scripts/ on the path. check_links.py does this for itself under
# `if __name__ == "__main__"`, which does not run on import.
sys.path.insert(0, str(ROOT / "scripts"))

import scripts.check_links as cl  # noqa: E402


# ── harness ──────────────────────────────────────────────────────────────────

@contextlib.contextmanager
def run(check, **overrides):
    """Run one check with module globals overridden, yielding its failures.

    `check_links.py` is a script: its checks take no arguments, read module
    globals and print as they go. Rather than reshape it to be testable — which
    would mean changing the thing under test — this swaps the globals, captures
    stdout, and restores everything afterwards. `failures` is module state too,
    so it is saved and restored rather than merely cleared; a test that left it
    dirty would leak into the next one.
    """
    saved = {k: getattr(cl, k) for k in overrides}
    kept = cl.failures[:]
    cl.failures.clear()
    for k, v in overrides.items():
        setattr(cl, k, v)
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            check()
        yield cl.failures
    finally:
        for k, v in saved.items():
            setattr(cl, k, v)
        cl.failures[:] = kept


def cell(source, *, kind="code", cid="c1", tags=(), **extra):
    # splitlines(keepends=True), because that is how a real .ipynb stores a
    # source: every line but the last ends in a literal "\n". Splitting them
    # off instead would glue each line onto the next when the checker does
    # "".join(source), and every multi-line fixture would fail to parse.
    c = {"cell_type": kind, "id": cid, "source": source.splitlines(True),
         "metadata": {"tags": list(tags)}}
    if kind == "code":
        c.setdefault("outputs", [])
        c.setdefault("execution_count", None)
    c.update(extra)
    return c


def notebook(*cells):
    return {"cells": list(cells), "metadata": {}, "nbformat": 4,
            "nbformat_minor": 5}


def badge_cell(name):
    """A header cell whose Colab badge points at `name`, as check 1 wants."""
    return cell(f"[![Open In Colab](x)]({cl.REPO['colab_base']}/{name})",
                kind="markdown", cid="hdr")


def section(n, slug):
    return {"n": n, "slug": slug}


def write_nb(directory, name, nb):
    (directory / name).write_text(json.dumps(nb), encoding="utf-8")


def page(directory, rel, body):
    p = directory / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(f"<html><body>{body}</body></html>", encoding="utf-8")
    return p


@contextlib.contextmanager
def tree():
    with tempfile.TemporaryDirectory() as folder:
        root = Path(folder)
        (root / "notebooks").mkdir()
        (root / "docs").mkdir()
        yield root, root / "notebooks", root / "docs"


# ── check 10: visible cells do not depend on folded solutions ────────────────

class SolutionIndependence(unittest.TestCase):
    """The check with the most logic and the least visibility.

    It cannot be caught by running a notebook top to bottom — that is the
    point of it — so the only thing that can catch *it* going wrong is this.
    """

    def independence(self, nbdir, *cells):
        write_nb(nbdir, "00-x.ipynb", notebook(badge_cell("00-x.ipynb"), *cells))
        return run(cl.check_solution_independence, NBDIR=nbdir,
                   NOTEBOOKS=[section("00", "x")])

    def test_visible_cell_using_a_solution_only_name_fails(self):
        with tree() as (_, nbdir, _docs):
            with self.independence(
                nbdir,
                cell("psf = 1", cid="sol", tags=("solution", "hide-input")),
                cell("print(psf)", cid="vis"),
            ) as failures:
                self.assertEqual(len(failures), 1, failures)
                self.assertIn("`psf`", failures[0])
                self.assertIn("vis", failures[0])

    def test_visible_cell_binding_the_name_itself_passes(self):
        # The `- binds` rule. A cell that defines a name before using it is
        # self-sufficient even when a solution happens to use the same name.
        with tree() as (_, nbdir, _docs):
            with self.independence(
                nbdir,
                cell("psf = 1", cid="sol", tags=("solution",)),
                cell("psf = 2\nprint(psf)", cid="vis"),
            ) as failures:
                self.assertEqual(failures, [])

    def test_parameters_bind_rather_than_load(self):
        # Without the ast.arg rule, `err = lambda a: a` false-positives the
        # moment any solution cell binds a name matching a parameter.
        with tree() as (_, nbdir, _docs):
            with self.independence(
                nbdir,
                cell("a = 1", cid="sol", tags=("solution",)),
                cell("err = lambda a: a + 1\nprint(err(2))", cid="vis"),
            ) as failures:
                self.assertEqual(failures, [])

    def test_except_handler_name_binds(self):
        with tree() as (_, nbdir, _docs):
            with self.independence(
                nbdir,
                cell("e = 1", cid="sol", tags=("solution",)),
                cell("try:\n    pass\nexcept ValueError as e:\n    print(e)",
                     cid="vis"),
            ) as failures:
                self.assertEqual(failures, [])

    def test_earlier_visible_binding_carries_forward(self):
        with tree() as (_, nbdir, _docs):
            with self.independence(
                nbdir,
                cell("psf = 0", cid="first"),
                cell("psf = 1", cid="sol", tags=("solution",)),
                cell("print(psf)", cid="vis"),
            ) as failures:
                self.assertEqual(failures, [])

    def test_magics_and_shell_lines_are_stripped_not_parsed(self):
        # `%pip` and `!ls` are not Python. If they reached ast.parse the cell
        # would be reported as unparseable instead of checked.
        with tree() as (_, nbdir, _docs):
            with self.independence(
                nbdir,
                cell("#@title Setup\n%pip install -q tensorly\n!ls\nimport tensorly",
                     cid="vis"),
            ) as failures:
                self.assertEqual(failures, [])

    def test_unparseable_cell_is_reported_not_skipped(self):
        # Reported rather than skipped on purpose: skipping drops the cell's
        # bindings and manufactures a false positive in a later cell.
        with tree() as (_, nbdir, _docs):
            with self.independence(nbdir, cell("def (:", cid="bad")) as failures:
                self.assertEqual(len(failures), 1, failures)
                self.assertIn("does not parse", failures[0])

    def test_builtins_are_not_solution_names(self):
        with tree() as (_, nbdir, _docs):
            with self.independence(
                nbdir,
                cell("len = 1", cid="sol", tags=("solution",)),
                cell("print(len([1]))", cid="vis"),
            ) as failures:
                self.assertEqual(failures, [])


# ── check 1: the notebooks themselves ────────────────────────────────────────

class Notebooks(unittest.TestCase):
    def notebooks(self, nbdir, sections):
        return run(cl.check_notebooks, NBDIR=nbdir, NOTEBOOKS=sections,
                   SECTIONS=sections, EXTRAS=[])

    def test_clean_notebook_passes(self):
        with tree() as (_, nbdir, _docs):
            write_nb(nbdir, "00-x.ipynb",
                     notebook(badge_cell("00-x.ipynb"), cell("x = 1")))
            with self.notebooks(nbdir, [section("00", "x")]) as failures:
                self.assertEqual(failures, [])

    def test_committed_outputs_fail(self):
        with tree() as (_, nbdir, _docs):
            write_nb(nbdir, "00-x.ipynb", notebook(
                badge_cell("00-x.ipynb"),
                cell("x = 1", cid="out",
                     outputs=[{"output_type": "stream", "name": "stdout",
                               "text": ["1\n"]}])))
            with self.notebooks(nbdir, [section("00", "x")]) as failures:
                self.assertTrue(any("committed outputs" in f for f in failures),
                                failures)

    def test_stale_execution_count_fails(self):
        with tree() as (_, nbdir, _docs):
            write_nb(nbdir, "00-x.ipynb", notebook(
                badge_cell("00-x.ipynb"),
                cell("x = 1", cid="run", execution_count=3)))
            with self.notebooks(nbdir, [section("00", "x")]) as failures:
                self.assertTrue(any("execution count" in f for f in failures),
                                failures)

    def test_badge_pointing_at_another_notebook_fails(self):
        with tree() as (_, nbdir, _docs):
            write_nb(nbdir, "00-x.ipynb",
                     notebook(badge_cell("01-y.ipynb"), cell("x = 1")))
            with self.notebooks(nbdir, [section("00", "x")]) as failures:
                self.assertTrue(any("header badge" in f for f in failures),
                                failures)

    def test_link_to_a_notebook_that_does_not_exist_fails(self):
        # The rule that took months of green builds to arrive: nothing else on
        # the site parses links *inside* a notebook, because a notebook reaches
        # docs/ as a verbatim copy rather than a rendered page.
        with tree() as (_, nbdir, _docs):
            write_nb(nbdir, "00-x.ipynb", notebook(
                badge_cell("00-x.ipynb"),
                cell("See notebooks/12-gone.ipynb", kind="markdown", cid="ref")))
            with self.notebooks(nbdir, [section("00", "x")]) as failures:
                self.assertTrue(
                    any("12-gone.ipynb" in f and "does not exist" in f
                        for f in failures), failures)

    def test_missing_notebook_fails(self):
        with tree() as (_, nbdir, _docs):
            with self.notebooks(nbdir, [section("00", "x")]) as failures:
                self.assertTrue(any("missing notebook" in f for f in failures),
                                failures)

    def test_notebook_declared_nowhere_fails(self):
        with tree() as (_, nbdir, _docs):
            write_nb(nbdir, "00-x.ipynb",
                     notebook(badge_cell("00-x.ipynb"), cell("x = 1")))
            write_nb(nbdir, "99-stray.ipynb",
                     notebook(badge_cell("99-stray.ipynb"), cell("x = 1")))
            with self.notebooks(nbdir, [section("00", "x")]) as failures:
                self.assertTrue(
                    any("99-stray" in f and "neither a section nor an extra" in f
                        for f in failures), failures)


# ── check 2: docs/ serves what is committed ──────────────────────────────────

class ServedNotebooks(unittest.TestCase):
    """The gate that closed the hole neither other gate could see.

    The regenerate gate never looks in docs/; compare_render.py walks *.html
    only. docs/notebooks/ went stale twice, once to nine notebooks at a stroke.
    """

    def served(self, nbdir, docs, sections):
        return run(cl.check_docs_notebooks, NBDIR=nbdir, DOCS=docs,
                   NOTEBOOKS=sections)

    def test_identical_copy_passes(self):
        with tree() as (_, nbdir, docs):
            nb = notebook(badge_cell("00-x.ipynb"), cell("x = 1"))
            write_nb(nbdir, "00-x.ipynb", nb)
            (docs / "notebooks").mkdir()
            write_nb(docs / "notebooks", "00-x.ipynb", nb)
            with self.served(nbdir, docs, [section("00", "x")]) as failures:
                self.assertEqual(failures, [])

    def test_stale_copy_fails(self):
        with tree() as (_, nbdir, docs):
            write_nb(nbdir, "00-x.ipynb",
                     notebook(badge_cell("00-x.ipynb"), cell("x = 2")))
            (docs / "notebooks").mkdir()
            write_nb(docs / "notebooks", "00-x.ipynb",
                     notebook(badge_cell("00-x.ipynb"), cell("x = 1")))
            with self.served(nbdir, docs, [section("00", "x")]) as failures:
                self.assertTrue(any("old copy" in f for f in failures), failures)

    def test_missing_served_copy_fails(self):
        with tree() as (_, nbdir, docs):
            write_nb(nbdir, "00-x.ipynb",
                     notebook(badge_cell("00-x.ipynb"), cell("x = 1")))
            (docs / "notebooks").mkdir()
            with self.served(nbdir, docs, [section("00", "x")]) as failures:
                self.assertTrue(any("is missing" in f for f in failures),
                                failures)

    def test_orphan_left_by_a_rename_fails(self):
        with tree() as (_, nbdir, docs):
            nb = notebook(badge_cell("00-x.ipynb"), cell("x = 1"))
            write_nb(nbdir, "00-x.ipynb", nb)
            (docs / "notebooks").mkdir()
            write_nb(docs / "notebooks", "00-x.ipynb", nb)
            write_nb(docs / "notebooks", "00-old-name.ipynb", nb)
            with self.served(nbdir, docs, [section("00", "x")]) as failures:
                self.assertTrue(
                    any("00-old-name" in f and "rename" in f for f in failures),
                    failures)


# ── checks 3 and 4: internal links and Colab URLs ────────────────────────────

class InternalLinks(unittest.TestCase):
    def links(self, nbdir, docs, sections):
        return run(cl.check_links, NBDIR=nbdir, DOCS=docs, NOTEBOOKS=sections)

    def site(self, docs, nbdir, body):
        """A one-page site whose single notebook is linked, so only `body` fails."""
        write_nb(nbdir, "00-x.ipynb",
                 notebook(badge_cell("00-x.ipynb"), cell("x = 1")))
        colab = f'<a href="{cl.REPO["colab_base"]}/00-x.ipynb">nb</a>'
        page(docs, "index.html", colab + body)

    def test_resolving_links_pass(self):
        with tree() as (_, nbdir, docs):
            page(docs, "other.html", '<h2 id="here">x</h2>')
            self.site(docs, nbdir,
                      '<a href="other.html#here">a</a>'
                      '<a href="/other.html">b</a>'
                      '<a href="#self">c</a><span id="self"></span>')
            with self.links(nbdir, docs, [section("00", "x")]) as failures:
                self.assertEqual(failures, [])

    def test_broken_relative_link_fails(self):
        with tree() as (_, nbdir, docs):
            self.site(docs, nbdir, '<a href="gone.html">x</a>')
            with self.links(nbdir, docs, [section("00", "x")]) as failures:
                self.assertTrue(any("broken link" in f for f in failures),
                                failures)

    def test_fragment_missing_on_an_existing_page_fails(self):
        # The half of check 3 that a plain link checker skips.
        with tree() as (_, nbdir, docs):
            page(docs, "other.html", "<p>no anchors</p>")
            self.site(docs, nbdir, '<a href="other.html#nope">x</a>')
            with self.links(nbdir, docs, [section("00", "x")]) as failures:
                self.assertTrue(
                    any("no anchor #nope" in f for f in failures), failures)

    def test_missing_same_page_anchor_fails(self):
        with tree() as (_, nbdir, docs):
            self.site(docs, nbdir, '<a href="#nowhere">x</a>')
            with self.links(nbdir, docs, [section("00", "x")]) as failures:
                self.assertTrue(
                    any("no anchor #nowhere" in f for f in failures), failures)

    def test_root_relative_link_resolves_against_the_site_root(self):
        # `page.parent / "/foo"` discards the parent and resolves against the
        # filesystem root, reporting a good link as broken. This is that guard.
        with tree() as (_, nbdir, docs):
            page(docs, "es/index.html", '<a href="/other.html">x</a>')
            page(docs, "other.html", "<p>x</p>")
            self.site(docs, nbdir, "")
            with self.links(nbdir, docs, [section("00", "x")]) as failures:
                self.assertEqual(failures, [])

    def test_link_escaping_docs_fails(self):
        with tree() as (_, nbdir, docs):
            self.site(docs, nbdir, '<a href="../secret.html">x</a>')
            with self.links(nbdir, docs, [section("00", "x")]) as failures:
                self.assertTrue(any("escapes docs/" in f for f in failures),
                                failures)

    def test_colab_url_for_a_missing_notebook_fails(self):
        with tree() as (_, nbdir, docs):
            self.site(docs, nbdir,
                      f'<a href="{cl.REPO["colab_base"]}/09-gone.ipynb">x</a>')
            with self.links(nbdir, docs, [section("00", "x")]) as failures:
                self.assertTrue(
                    any("09-gone.ipynb" in f and "does not exist" in f
                        for f in failures), failures)

    def test_malformed_colab_url_fails(self):
        with tree() as (_, nbdir, docs):
            self.site(docs, nbdir,
                      '<a href="https://colab.research.google.com/github/'
                      'someone/else/blob/main/notebooks/00-x.ipynb">x</a>')
            with self.links(nbdir, docs, [section("00", "x")]) as failures:
                self.assertTrue(any("malformed Colab URL" in f for f in failures),
                                failures)

    def test_notebook_no_page_links_to_fails(self):
        with tree() as (_, nbdir, docs):
            self.site(docs, nbdir, "")
            write_nb(nbdir, "01-y.ipynb",
                     notebook(badge_cell("01-y.ipynb"), cell("y = 1")))
            with self.links(nbdir, docs,
                            [section("00", "x"), section("01", "y")]) as failures:
                self.assertTrue(
                    any("01-y.ipynb" in f and "no page on the site" in f
                        for f in failures), failures)

    def test_empty_docs_still_emits_both_headings(self):
        # Bailing out without the second `step()` would renumber every check
        # after it — the drift the counter exists to prevent.
        with tree() as (_, nbdir, docs):
            before = cl._step
            with self.links(nbdir, docs, []) as failures:
                self.assertTrue(any("no HTML" in f for f in failures), failures)
                self.assertEqual(cl._step - before, 2)


# ── check 8: the running clock ───────────────────────────────────────────────

class Schedule(unittest.TestCase):
    """Driven against the real _variables.yml with one value bent.

    timeline.py holds its own parse of the file, so a fixture would mean
    rebuilding a valid workshop; bending one number in a copy of the real
    sections tests the comparison, which is the part that can rot.
    """

    def setUp(self):
        import copy
        import timeline
        self.timeline = timeline
        self.sections = copy.deepcopy(timeline.SECTIONS)

    def patched(self, sections=None, minutes=None):
        import copy
        sections = self.sections if sections is None else sections
        overrides = {}
        if minutes is not None:
            v = copy.deepcopy(cl.V)
            v["workshop"]["minutes"] = minutes
            overrides["V"] = v
        self.timeline.SECTIONS = sections
        self.timeline.BY_N = {s["n"]: s for s in sections}
        return run(cl.check_schedule, **overrides)

    def tearDown(self):
        import timeline
        timeline.SECTIONS = [timeline.V["sections"][k]
                             for k in sorted(timeline.V["sections"])]
        timeline.BY_N = {s["n"]: s for s in timeline.SECTIONS}

    def test_real_schedule_passes(self):
        with self.patched() as failures:
            self.assertEqual(failures, [])

    def test_mistyped_start_fails(self):
        self.sections[3]["start"] = "+99:99"
        with self.patched() as failures:
            self.assertTrue(any("start/end" in f for f in failures), failures)

    def test_total_disagreeing_with_workshop_minutes_fails(self):
        with self.patched(minutes=cl.V["workshop"]["minutes"] + 5) as failures:
            self.assertTrue(
                any("workshop.minutes says" in f for f in failures), failures)

    def test_a_section_losing_a_minute_moves_every_later_window(self):
        # The total is what catches a whole quiz or break going missing, as
        # opposed to a single offset being mistyped.
        self.sections[0]["minutes"] -= 5
        with self.patched() as failures:
            self.assertTrue(len(failures) > 1, failures)


# ── check 9: the deck timer ──────────────────────────────────────────────────

class DeckTotal(unittest.TestCase):
    def test_real_deck_matches(self):
        with run(cl.check_deck_total) as failures:
            self.assertEqual(failures, [])

    def test_wrong_total_fails(self):
        with tree() as (root, _nb, _docs):
            (root / "slides").mkdir()
            (root / "slides" / "deck-pace.html").write_text(
                "var TOTAL_SECONDS = 60;", encoding="utf-8")
            with run(cl.check_deck_total, ROOT=root) as failures:
                self.assertTrue(any("TOTAL_SECONDS is 60" in f
                                    for f in failures), failures)

    def test_missing_declaration_fails(self):
        with tree() as (root, _nb, _docs):
            (root / "slides").mkdir()
            (root / "slides" / "deck-pace.html").write_text(
                "// the timer moved", encoding="utf-8")
            with run(cl.check_deck_total, ROOT=root) as failures:
                self.assertTrue(any("no `var TOTAL_SECONDS" in f
                                    for f in failures), failures)


# ── check 13: the two handbooks have the same shape ──────────────────────────

class Handbooks(unittest.TestCase):
    def handbooks(self, root, en, es):
        (root / "es").mkdir(exist_ok=True)
        (root / cl.HANDBOOK).write_text(en, encoding="utf-8")
        (root / "es" / cl.HANDBOOK).write_text(es, encoding="utf-8")
        return run(cl.check_handbooks, ROOT=root)

    def test_same_shape_passes(self):
        with tree() as (root, _nb, _docs):
            with self.handbooks(root, "## One\n\n| a |\n", "## Uno\n\n| a |\n") as f:
                self.assertEqual(f, [])

    def test_heading_added_to_one_side_only_fails(self):
        with tree() as (root, _nb, _docs):
            with self.handbooks(root, "## One\n\n## Two\n", "## Uno\n") as f:
                self.assertTrue(any("## headings" in x for x in f), f)

    def test_notebook_linked_from_one_side_only_fails(self):
        with tree() as (root, _nb, _docs):
            with self.handbooks(root,
                                "## One\n\n[a](notebooks/00-setup-and-data.ipynb)\n",
                                "## Uno\n") as f:
                self.assertTrue(any("notebooks linked" in x for x in f), f)

    def test_code_fences_are_excluded_from_the_shape(self):
        # Identifiers stay English inside code, so a fenced block full of
        # pipes or hashes would otherwise read as a shape difference.
        with tree() as (root, _nb, _docs):
            with self.handbooks(root,
                                "## One\n\n```\n| not | a | table |\n```\n",
                                "## Uno\n\n```\n# not a heading\n```\n") as f:
                self.assertEqual(f, [])

    def test_wording_drift_is_not_caught_and_the_docstring_says_so(self):
        # Pinning the documented limit, not an aspiration. If this ever starts
        # failing, check 13 has grown a capability its docstring disclaims.
        with tree() as (root, _nb, _docs):
            with self.handbooks(root, "## One\n\nthe eight\n",
                                "## Uno\n\ntoda la familia\n") as f:
                self.assertEqual(f, [])


if __name__ == "__main__":
    unittest.main()
