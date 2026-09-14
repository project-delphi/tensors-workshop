"""Regression checks for scripts/test_notebooks.py, the notebook execution gate.

The runner starts a kernel per notebook, which is far too slow and too
network-bound to be a unit test. What is testable, and what actually decides
whether the gate watches the right thing, is everything around the kernel:
which cells get chosen, and which notebooks get rejected before a kernel
starts. Those are pure functions and they are what this file drives.

Every test asserts both halves — that a broken notebook fails, and that the
same notebook fixed does not. A test that pinned only the first half would
still pass against a check that rejects everything.
"""
from __future__ import annotations

import contextlib
import io
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parent.parent
# test_notebooks.py does `from check_teaching_materials import route_of`, which
# only resolves with scripts/ on the path. It does this for itself when run as
# a script; importing it as a module does not.
sys.path.insert(0, str(ROOT / "scripts"))

import scripts.test_notebooks as tn  # noqa: E402


# ── harness ──────────────────────────────────────────────────────────────────

def cell(source, *, kind="code", cid="c", tags=None):
    out = {"cell_type": kind, "id": cid, "source": source, "metadata": {}}
    if tags:
        out["metadata"]["tags"] = tags
    if kind == "code":
        out["outputs"] = []
        out["execution_count"] = None
    return out


def notebook(*cells, prep=(), activity="act"):
    """A notebook with the CORE-PATH scaffold check_teaching_materials wants."""
    scaffold = cell("<!-- CORE-PATH -->\n", kind="markdown", cid="core-path")
    scaffold["metadata"]["workshop"] = {"prep": list(prep), "activity": activity}
    return {"cells": [cell("# header\n", kind="markdown", cid="hdr"),
                      scaffold, *cells]}


@contextlib.contextmanager
def collected():
    """Run a check with a clean failure list, yielding what it collected."""
    saved, tn.failures = tn.failures, []
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            yield tn.failures
    finally:
        tn.failures = saved


def parity(source):
    with collected() as found:
        tn.check_colab_parity(notebook(cell(source, cid="x")), "fixture")
    return found


# ── choosing what to execute ─────────────────────────────────────────────────

class RunSet(unittest.TestCase):
    def test_prep_activity_and_paired_solution(self):
        nb = notebook(
            cell("setup()\n", cid="prep-1", tags=["workshop-core-prep"]),
            cell("noise()\n", cid="unrelated"),
            cell("# TODO 1\n", cid="act", tags=["workshop-core-activity"]),
            cell("answer()\n", cid="sol", tags=["solution", "hide-input"]),
            cell("later()\n", cid="after"),
            prep=["prep-1"])
        chosen, activity, paired = tn.run_set(nb, "fixture")
        ids = [nb["cells"][i]["id"] for i in chosen]
        self.assertEqual(ids, ["prep-1", "act", "sol"])
        self.assertEqual((activity, paired), ("act", "sol"))

    def test_markdown_activity_is_not_executed(self):
        nb = notebook(
            cell("setup()\n", cid="prep-1", tags=["workshop-core-prep"]),
            cell("## Core activity\n", kind="markdown", cid="act",
                 tags=["workshop-core-activity"]),
            prep=["prep-1"])
        chosen, _, paired = tn.run_set(nb, "fixture")
        self.assertEqual([nb["cells"][i]["id"] for i in chosen], ["prep-1"])
        self.assertIsNone(paired)

    def test_empty_route_falls_back_to_every_code_cell(self):
        """Notebooks 00 and 12: no prep, a markdown activity, nothing to run."""
        nb = notebook(
            cell("## Core activity\n", kind="markdown", cid="act",
                 tags=["workshop-core-activity"]),
            cell("setup()\n", cid="a"),
            cell("## prose\n", kind="markdown", cid="b"),
            cell("answer()\n", cid="c", tags=["solution", "hide-input"]),
            prep=[])
        chosen, _, _ = tn.run_set(nb, "fixture")
        self.assertEqual([nb["cells"][i]["id"] for i in chosen], ["a", "c"])

    def test_distant_solution_is_not_paired(self):
        """Only a solution right after the activity answers it."""
        nb = notebook(
            cell("setup()\n", cid="prep-1", tags=["workshop-core-prep"]),
            cell("# TODO 1\n", cid="act", tags=["workshop-core-activity"]),
            cell("a()\n", cid="x"), cell("b()\n", cid="y"),
            cell("answer()\n", cid="sol", tags=["solution"]),
            prep=["prep-1"])
        _, _, paired = tn.run_set(nb, "fixture")
        self.assertIsNone(paired)

    def test_cells_are_matched_by_id_not_by_prefix(self):
        """Notebook 09 carries s12-* ids and 11 carries s13-*, kept through a
        renumbering. Anything keying on the number would pick the wrong cell."""
        nb = notebook(
            cell("setup()\n", cid="s12-b-aaa", tags=["workshop-core-prep"]),
            cell("# TODO\n", cid="s12-b-bbb", tags=["workshop-core-activity"]),
            cell("answer()\n", cid="s12-b-ccc", tags=["solution"]),
            prep=["s12-b-aaa"], activity="s12-b-bbb")
        chosen, activity, paired = tn.run_set(nb, "fixture")
        self.assertEqual([nb["cells"][i]["id"] for i in chosen],
                         ["s12-b-aaa", "s12-b-bbb", "s12-b-ccc"])
        self.assertEqual(paired, "s12-b-ccc")


    def test_ci_cells_replaces_the_blanket_fallback(self):
        """Notebook 12: the route is code-free on purpose, so CI declares a set.

        The student-facing core path says "No code required ... explorers are
        optional", which is the real lesson. What CI executes is a separate
        question, answered explicitly rather than by running every code cell.
        """
        nb = notebook(
            cell("## Core activity\n", kind="markdown", cid="act",
                 tags=["workshop-core-activity"]),
            cell("setup()\n", cid="setup"),
            cell("answer()\n", cid="sol", tags=["solution", "hide-input"]),
            cell("explorer()\n", cid="explorer"))
        nb["cells"][1]["metadata"]["workshop"]["ci_cells"] = ["setup", "sol"]
        chosen, _, _ = tn.run_set(nb, "fixture")
        self.assertEqual([nb["cells"][i]["id"] for i in chosen], ["setup", "sol"],
                         "the explorer must not be executed")

    def test_ci_cells_must_name_real_code_cells(self):
        for bad, why in (("nope", "no such cell"), ("prose", "not code")):
            with self.subTest(case=why):
                nb = notebook(
                    cell("## Core activity\n", kind="markdown", cid="act",
                         tags=["workshop-core-activity"]),
                    cell("setup()\n", cid="setup"),
                    cell("## prose\n", kind="markdown", cid="prose"))
                nb["cells"][1]["metadata"]["workshop"]["ci_cells"] = ["setup", bad]
                with self.assertRaises(ValueError):
                    tn.run_set(nb, "fixture")

    def test_a_code_free_route_without_ci_cells_still_falls_back(self):
        """Notebook 00 keeps the blanket fallback: it is short and all setup."""
        nb = notebook(
            cell("## Core activity\n", kind="markdown", cid="act",
                 tags=["workshop-core-activity"]),
            cell("a()\n", cid="a"),
            cell("b()\n", cid="b"))
        chosen, _, _ = tn.run_set(nb, "fixture")
        self.assertEqual([nb["cells"][i]["id"] for i in chosen], ["a", "b"])

    def test_lone_paired_solution_does_not_suppress_the_fallback(self):
        """A markdown activity with a solution right after it still falls back.

        The fallback used to key on whether `chosen` was empty, which the
        paired-solution block had already filled -- so this shape executed one
        answer cell with none of its setup, and the NameError read as a broken
        notebook rather than a broken run set.
        """
        nb = notebook(
            cell("## Core activity\n", kind="markdown", cid="act",
                 tags=["workshop-core-activity"]),
            cell("answer()\n", cid="sol", tags=["solution", "hide-input"]),
            cell("setup()\n", cid="setup"))
        chosen, _, _ = tn.run_set(nb, "fixture")
        ids = [nb["cells"][i]["id"] for i in chosen]
        self.assertEqual(ids, ["sol", "setup"],
                         "expected the whole-notebook fallback, not the "
                         "solution cell on its own")


class Stub(unittest.TestCase):
    def test_comments_only_is_a_stub(self):
        self.assertTrue(tn.is_stub(cell("# TODO 1 / TAREA 1\n#\n# EN: do it\n")))
        self.assertTrue(tn.is_stub(cell("\n   \n")))

    def test_any_statement_is_not_a_stub(self):
        self.assertFalse(tn.is_stub(cell("# TODO 1\nmean = D.mean(axis=0)\n")))


# ── Colab parity ─────────────────────────────────────────────────────────────

class ColabParity(unittest.TestCase):
    GUARDED = ("try:\n"
               "    from google.colab import output\n"
               "    output.enable_custom_widget_manager()\n"
               "except ImportError:\n"
               "    pass\n")

    def test_guarded_colab_import_is_accepted(self):
        self.assertEqual(parity(self.GUARDED), [])

    def test_bare_colab_import_is_rejected(self):
        found = parity("from google.colab import output\n")
        self.assertEqual(len(found), 1)
        self.assertIn("google.colab", found[0])

    def test_absolute_paths_are_rejected(self):
        for path in ('"/Users/me/data.csv"', '"/content/drive/x"',
                     '"C:\\\\data\\\\x.csv"'):
            with self.subTest(path=path):
                self.assertTrue(parity(f"p = {path}\n"))
        self.assertEqual(parity('p = "data/x.csv"\n'), [])

    def test_pip_install_must_be_quiet(self):
        self.assertTrue(parity("%pip install tensorly\n"))
        self.assertEqual(parity('%pip install -q "imageio[ffmpeg]"\n'), [])

    def test_hardcoded_device_strings_are_rejected(self):
        for source in ('device = "mps"\n', 'device = "cuda"\n',
                       'x.to("cuda:0")\n'):
            with self.subTest(source=source):
                self.assertTrue(parity(source))
        self.assertEqual(parity('mode = "nearest"\n'), [])

    def test_markdown_cells_are_not_linted(self):
        nb = notebook(cell("Run `%pip install tensorly` on /Users/you",
                           kind="markdown", cid="m"))
        with collected() as found:
            tn.check_colab_parity(nb, "fixture")
        self.assertEqual(found, [])

    def test_every_shipped_notebook_passes(self):
        import nbformat
        paths = sorted((ROOT / "notebooks").glob("[0-9][0-9]-*.ipynb"))
        self.assertEqual(len(paths), 14)
        with collected() as found:
            for path in paths:
                tn.check_colab_parity(nbformat.read(path, as_version=4),
                                      path.name)
        self.assertEqual(found, [])


# ── reading a kernel's results ───────────────────────────────────────────────

class ColabGuardScope(unittest.TestCase):
    """The guard must belong to the import, not merely share a cell with one."""

    def test_real_guard_passes(self):
        self.assertEqual(parity("try:\n"
                                "    from google.colab import output\n"
                                "except ImportError:\n"
                                "    output = None\n"), [])

    def test_bare_import_fails(self):
        self.assertEqual(len(parity("from google.colab import output\n")), 1)

    def test_unrelated_try_and_except_do_not_vouch_for_it(self):
        """The case the unscoped check waved through.

        An earlier try/except ValueError and a later except ImportError, with a
        genuinely bare import between them: every substring the old test looked
        for is present, and the import still raises on a non-Colab kernel.
        """
        found = parity("try:\n"
                       "    x = 1\n"
                       "except ValueError:\n"
                       "    pass\n"
                       "from google.colab import output\n"
                       "try:\n"
                       "    y = 2\n"
                       "except ImportError:\n"
                       "    pass\n")
        self.assertEqual(len(found), 1)

    def test_try_without_an_except_fails(self):
        self.assertEqual(len(parity("try:\n"
                                    "    from google.colab import output\n"
                                    "finally:\n"
                                    "    pass\n")), 1)


class Outputs(unittest.TestCase):
    def test_stdout_joins_streams_and_results(self):
        got = tn.stdout_of({"outputs": [
            {"output_type": "stream", "text": ["a\n", "b\n"]},
            {"output_type": "display_data", "data": {"image/png": "..."}},
            {"output_type": "execute_result", "data": {"text/plain": "42"}}]})
        self.assertEqual(got, "a\nb\n42")

    def test_errors_are_reported_without_ansi_escapes(self):
        found = tn.errors_in({"outputs": [{
            "output_type": "error", "ename": "ValueError", "evalue": "bad",
            "traceback": ["\x1b[31mValueError\x1b[39m: bad"]}]})
        self.assertEqual(len(found), 1)
        self.assertNotIn("\x1b", found[0])
        self.assertIn("ValueError: bad", found[0])

    def test_every_expected_cell_id_exists_in_its_notebook(self):
        """EXPECTED names cells by id; a renamed cell must not go unnoticed."""
        import nbformat
        for number, wanted in tn.EXPECTED.items():
            path = next((ROOT / "notebooks").glob(f"{number}-*.ipynb"))
            ids = {c.get("id") for c in nbformat.read(path, as_version=4)["cells"]}
            for cid in wanted:
                with self.subTest(notebook=number, cell=cid):
                    self.assertIn(cid, ids)


class InjectedCells(unittest.TestCase):
    """The prologue and probe are source strings built at import time."""

    def test_placeholders_are_substituted(self):
        for placeholder in ("__BUDGET__", "__CHANGES__"):
            self.assertNotIn(placeholder, tn.PROBE)
        self.assertIn(str(tn.PROBE_MAX_CHANGES), tn.PROBE)

    def test_both_cells_are_valid_python(self):
        import ast
        for name, src in (("PROLOGUE", tn.PROLOGUE), ("PROBE", tn.PROBE)):
            with self.subTest(cell=name):
                ast.parse(src)

    def test_prologue_survives_a_kernel_without_ipywidgets(self):
        """Notebook 00 imports no widgets; the prologue must not raise."""
        self.assertIn("except ImportError", tn.PROLOGUE)
        namespace = {}
        exec(compile(tn.PROLOGUE, "PROLOGUE", "exec"), namespace)

    def test_probe_silences_the_display_publisher(self):
        """Not decoration, and not interchangeable with stubbing display().

        A large payload leaving an Output widget makes nbclient wait out the
        whole cell timeout -- that is what turned the notebooks job red on
        notebook 12, whose audio explorer renders a base64 WAV per change.
        Silencing the publisher is what fixes it, because a callback resolves
        the name `display` from its own namespace rather than the probe's.
        """
        self.assertIn("display_pub", tn.PROBE)
        self.assertIn("publish", tn.PROBE)

    def test_probe_restores_what_it_silenced(self):
        """In a finally: a probe that raises must not leave the kernel mute."""
        import ast
        tree = ast.parse(tn.PROBE)
        finallies = [n for n in ast.walk(tree) if isinstance(n, ast.Try) and n.finalbody]
        self.assertTrue(finallies, "the sweep must restore in a finally:")
        restored = "\n".join(ast.unparse(n) for f in finallies for n in f.finalbody)
        self.assertIn("publish", restored)
        self.assertIn("show", restored)


if __name__ == "__main__":
    unittest.main()
