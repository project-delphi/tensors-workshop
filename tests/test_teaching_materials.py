"""Regression checks for routes, relative links and runnable teaching examples."""

import contextlib
import copy
import io
import json
import re
import sys
import tempfile
import types
import unittest
import unittest.mock
from pathlib import Path

from scripts.check_teaching_materials import (
    COUNTEREXAMPLE,
    ROOT,
    anchors,
    check_links,
    check_route,
    check_sequence,
    check_tasks,
    route_of,
    support_of,
)


class Links(unittest.TestCase):
    def test_relative_and_fragment(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "es").mkdir()
            (root / "target.md").write_text('# Example\n\n<a id="explicit"></a>\n')
            page = root / "es/source.md"
            for target in ("../target.md#example", "../target.md#explicit"):
                page.write_text(f"[go]({target})")
                check_links(page, root)
            for target in ("target.md", "../target.md#absent", "../../target.md"):
                page.write_text(f"[go]({target})")
                with self.subTest(target=target), self.assertRaises(ValueError):
                    check_links(page, root)

    def test_duplicate_headings_and_code(self):
        found = anchors("# Hello\n\n# Hello\n\n```python\n# Not a heading\n```\n")
        self.assertEqual(found, {"hello", "hello-1"})


class Routes(unittest.TestCase):
    def setUp(self):
        self.notebook = json.loads(
            next((ROOT / "notebooks").glob("01-*.ipynb")).read_text()
        )

    def test_valid(self):
        check_route(self.notebook, "fixture")

    def test_live_core_cannot_be_split_by_optional_material(self):
        for mode in (
            "interleaved",
            "missing",
            "checkpoint-before-attempt",
            "no-boundary",
        ):
            nb = copy.deepcopy(self.notebook)
            route = nb["cells"][1]["metadata"]["workshop"]
            if mode == "interleaved":
                nb["cells"].insert(
                    4,
                    {
                        "id": "optional",
                        "cell_type": "markdown",
                        "source": ["Optional explorer"],
                        "metadata": {},
                    },
                )
            elif mode == "missing":
                route["sequence"].remove(route["activity"])
            elif mode == "checkpoint-before-attempt":
                route["checkpoint"] = route["prep"][0]
            else:
                nb["cells"][2 + len(route["sequence"])]["source"] = []
            with self.subTest(mode=mode), self.assertRaises(ValueError):
                check_sequence(nb, "fixture")

    def test_every_live_practice_has_a_top_core(self):
        for number in range(1, 12):
            path = next((ROOT / "notebooks").glob(f"{number:02}-*.ipynb"))
            with self.subTest(notebook=path.name):
                self.assertTrue(check_sequence(json.loads(path.read_text()), path.name))

    def test_live_cores_do_not_open_on_a_table(self):
        """A live core's hook is the first thing a learner sees after setup.

        A Markdown table -- rows of data with no question attached -- is not a
        hook. Checked structurally (a table separator row) rather than by cell
        id, so it catches whichever cell a notebook happens to open its core
        with, predict-first or otherwise.
        """
        table_row = re.compile(r"^\s*\|?\s*:?-{3,}")
        failing = []
        for number in range(1, 12):
            path = next((ROOT / "notebooks").glob(f"{number:02}-*.ipynb"))
            nb = json.loads(path.read_text())
            sequence = check_sequence(nb, path.name)
            if not sequence:
                continue
            prep, _ = route_of(nb, path.name)
            ids = [c.get("id") for c in nb["cells"]]
            last_prep_at = (
                max(ids.index(cid) for cid in prep)
                if prep
                else ids.index(sequence[0]) - 1
            )
            opener = nb["cells"][last_prep_at + 1]
            source = "".join(opener.get("source", []))
            with self.subTest(notebook=path.name):
                if any(table_row.match(line) for line in source.splitlines()):
                    failing.append(path.name)
        self.assertEqual(
            failing,
            [],
            f"live cores open on a table: {failing}",
        )

    def test_broken_routes(self):
        for mode in (
            "missing",
            "duplicate",
            "solution",
            "order",
            "label",
            "translation",
        ):
            nb = copy.deepcopy(self.notebook)
            scaffold = next(
                c for c in nb["cells"] if "workshop" in c.get("metadata", {})
            )
            route = scaffold["metadata"]["workshop"]
            activity = next(c for c in nb["cells"] if c["id"] == route["activity"])
            if mode == "missing":
                route["prep"].append("does-not-exist")
            elif mode == "duplicate":
                nb["cells"].append(scaffold)
            elif mode == "solution":
                activity["metadata"]["tags"].append("solution")
            elif mode == "order":
                nb["cells"].remove(activity)
                nb["cells"].insert(0, activity)
            elif mode == "label":
                prep_at = next(
                    i for i, c in enumerate(nb["cells"]) if c["id"] == route["prep"][0]
                )
                nb["cells"][prep_at - 1]["source"] = []
            else:
                for c in nb["cells"]:
                    c["source"] = [
                        s.replace("Predice → Ejecuta → Explica → Comprueba", "")
                        for s in c["source"]
                    ]
            with self.subTest(mode=mode), self.assertRaises(ValueError):
                check_route(nb, "fixture")


class FeedbackRoutes(unittest.TestCase):
    def fixture(self):
        return {
            "cells": [
                {
                    "id": "route",
                    "cell_type": "markdown",
                    "source": "<!-- CORE-PATH -->",
                    "metadata": {
                        "workshop": {
                            "prep": [],
                            "activity": "act",
                            "support": ["feedback"],
                        }
                    },
                },
                {
                    "id": "feedback",
                    "cell_type": "code",
                    "source": "def check_answer(x): pass",
                    "metadata": {"tags": ["workshop-support"]},
                },
                {"id": "act", "cell_type": "code", "source": "# TODO", "metadata": {}},
            ]
        }

    def test_valid_feedback(self):
        self.assertEqual(support_of(self.fixture(), "fixture"), ["feedback"])

    def test_invalid_feedback_declarations(self):
        for mode in (
            "missing",
            "duplicate",
            "not-list",
            "not-id",
            "solution",
            "markdown",
            "untagged",
            "undeclared",
            "after",
            "overlap",
        ):
            nb = self.fixture()
            route = nb["cells"][0]["metadata"]["workshop"]
            feedback = nb["cells"][1]
            if mode == "missing":
                route["support"] = ["absent"]
            elif mode == "duplicate":
                route["support"] *= 2
            elif mode == "not-list":
                route["support"] = "feedback"
            elif mode == "not-id":
                route["support"] = [{}]
            elif mode == "solution":
                feedback["metadata"]["tags"].append("solution")
            elif mode == "markdown":
                feedback["cell_type"] = "markdown"
            elif mode == "untagged":
                feedback["metadata"]["tags"] = []
            elif mode == "undeclared":
                route["support"] = []
            elif mode == "after":
                nb["cells"][1:] = reversed(nb["cells"][1:])
            elif mode == "overlap":
                route["prep"] = ["feedback"]
            with self.subTest(mode=mode), self.assertRaises(ValueError):
                support_of(nb, "fixture")


class Tasks(unittest.TestCase):
    def test_wrong_notebook_and_missing_deliverable(self):
        with tempfile.TemporaryDirectory() as folder:
            page = Path(folder) / "group-tasks.md"
            text = "## 00 · Task\n\n**Time:** 6 minutes.\n[Notebook](notebooks/00-example.ipynb)\n**Share:** a check\n"
            page.write_text(text)
            self.assertEqual(check_tasks(page, {"00": "00-example.ipynb"}), [("00", 6)])
            for broken in (
                text.replace("00-example.ipynb", "01-other.ipynb"),
                text.replace("**Share:**", "Result:"),
            ):
                page.write_text(broken)
                with self.assertRaises(ValueError):
                    check_tasks(page, {"00": "00-example.ipynb"})


class WorkedExamples(unittest.TestCase):
    def test_bilingual_examples_match_and_run(self):
        """One worked mistake per notebook, in both languages, and they run.

        The count is read off the notebooks rather than spelled out, the same
        way `test_notebook_predictions_run` does it: the page pairs one-to-one
        with the predict-first cells, so a notebook added without its entry
        fails here instead of drifting quietly. The headings carry the section
        numbers, which is what catches an entry written twice for 04 and none
        for 05 -- a count alone would pass that.

        Both languages must carry byte-identical code. Prose is translated;
        the counterexample is what the reader types, so it is not.
        """
        expected = sorted(p.name[:2] for p in (ROOT / "notebooks").glob("*.ipynb"))
        blocks = []
        for path in (ROOT / "worked-mistakes.md", ROOT / "es/worked-mistakes.md"):
            text = path.read_text()
            with self.subTest(path=path):
                self.assertEqual(
                    re.findall(r"^## (\d{2}) · ", text, re.MULTILINE), expected
                )
            code = re.findall(r"```python\n(.*?)\n```", text, re.DOTALL)
            self.assertEqual(len(code), len(expected))
            blocks.append(code)
            for i, source in enumerate(code):
                with self.subTest(path=path, example=i):
                    exec(compile(source, f"{path}:example-{i}", "exec"), {})
        self.assertEqual(*blocks)

    def test_notebook_predictions_run(self):
        """The predict-first cells carry the same counterexamples, and they run.

        A prediction cell teaches by asserting a claim is false, so its
        arithmetic has to be true. The block is delimited in the notebook so it
        can be lifted out and executed without ipywidgets, which the notebooks
        need and this test environment does not have.

        Every notebook carries exactly one, so the expectation is read off the
        directory rather than spelled out: a notebook that loses its block
        fails here, and so does one that gains a second -- which the old
        one-cell-per-name bookkeeping would have hidden.
        """
        begin = COUNTEREXAMPLE
        end = "# --- end counterexample"
        found = {}
        for path in sorted((ROOT / "notebooks").glob("*.ipynb")):
            cells = json.loads(path.read_text(encoding="utf-8"))["cells"]
            for cell in cells:
                if cell.get("cell_type") != "code":
                    continue
                source = "".join(cell.get("source", []))
                if begin not in source:
                    continue
                block = source.split(begin, 1)[1].split(end, 1)[0]
                block = block.split("\n", 1)[1]
                with self.subTest(notebook=path.name, cell=cell.get("id")):
                    self.assertIn("assert ", block)
                    exec(compile(block, f"{path.name}:{cell['id']}", "exec"), {})
                found.setdefault(path.name, []).append(cell["id"])

        self.assertEqual(
            sorted(found),
            sorted(p.name for p in (ROOT / "notebooks").glob("*.ipynb")),
        )
        for name, cells in sorted(found.items()):
            self.assertEqual(len(cells), 1, f"{name} has {len(cells)}: {cells}")

    def test_predict_cells_execute(self):
        """The predict-first widgets run, and the reveal branches both print.

        `run_set` in scripts/test_notebooks.py steps over a predict-first
        cell wherever it sits -- in `ci_cells` (notebooks 00, 12, 16, 17 and
        18) or in a live core `sequence` (02, 04 and 05 open theirs with one)
        -- because their live `RadioButtons` and `Checkbox` are what stalled
        the kernel sweep. That leaves the widget half of every predict cell
        -- `pred_panel`, `pred_render` and `check_prediction` -- executed by
        nothing else, so a typo there would reach Colab silently. The sibling
        test above runs only the delimited counterexample.

        Fifteen of the cells import ipywidgets and IPython themselves, so
        stubbing the names in the namespace is not enough and the modules are
        stubbed in `sys.modules` instead. That is also what keeps the test off
        the `notebooks` dependency group: neither package is in `test`.

        `pred_panel` is called directly because `pred_render` hands its result
        to a stubbed `display`, so nothing downstream would notice if the panel
        raised. The expected answer is read off `if choice == "..."` rather
        than restated here.
        """

        class Stub:
            """Absorbs any attribute access or call a cell makes."""

            def __getattr__(self, name):
                return Stub()

            def __call__(self, *args, **kwargs):
                return Stub()

        def stub_module(name, **attributes):
            module = types.ModuleType(name)
            for key, value in attributes.items():
                setattr(module, key, value)
            module.__getattr__ = lambda attribute: Stub()
            return module

        pyplot = stub_module("matplotlib.pyplot")
        pyplot.subplots = lambda *args, **kwargs: (Stub(), Stub())
        ipython = stub_module("IPython")
        ipython.display = stub_module(
            "IPython.display", display=lambda *args, **kwargs: None
        )
        modules = {
            "ipywidgets": stub_module("ipywidgets"),
            "IPython": ipython,
            "IPython.display": ipython.display,
        }

        begin = COUNTEREXAMPLE
        checked = []
        for path in sorted((ROOT / "notebooks").glob("*.ipynb")):
            for cell in json.loads(path.read_text(encoding="utf-8"))["cells"]:
                source = "".join(cell.get("source", []))
                if cell.get("cell_type") != "code" or begin not in source:
                    continue
                body = "\n".join(
                    line
                    for line in source.split("\n")
                    if not line.startswith(("#@title", "%", "!"))
                )
                namespace = {
                    "widgets": Stub(),
                    "plt": pyplot,
                    "display": lambda *args, **kwargs: None,
                }
                label = f"{path.name}:{cell['id']}"
                with self.subTest(notebook=path.name, cell=cell.get("id")):
                    with unittest.mock.patch.dict(sys.modules, modules):
                        with contextlib.redirect_stdout(io.StringIO()):
                            exec(compile(body, label, "exec"), namespace)

                        answer = re.search(r'if choice == "([^"]+)"', body).group(1)
                        for choice, reveal, expected in (
                            (None, False, "Choose an answer first"),
                            (answer, False, "Answer saved"),
                            (answer, True, "You were right"),
                            ("__not_an_option__", True, "You were wrong"),
                        ):
                            printed = io.StringIO()
                            with contextlib.redirect_stdout(printed):
                                namespace["check_prediction"](choice, reveal)
                            self.assertIn(expected, printed.getvalue())

                        # Every branch of the layout: a heading, a reading, a
                        # blank, and the two tagged explanation lines.
                        panel = namespace["pred_panel"](
                            "A heading\nShapes: (2, 3)\n\nEN: in English\nES: en espanol"
                        )
                        for fragment in (
                            "<div",
                            "A heading",
                            "(2, 3)",
                            "in English",
                            "en espanol",
                            "</div>",
                        ):
                            self.assertIn(fragment, panel)
                        with contextlib.redirect_stdout(io.StringIO()):
                            namespace["pred_render"](answer, True)
                checked.append(path.name)

        self.assertEqual(
            sorted(checked),
            sorted(p.name for p in (ROOT / "notebooks").glob("*.ipynb")),
        )

    def test_assessment_shapes(self):
        import numpy as np

        self.assertEqual(np.empty((20, 8, 8))[:, 3, 4].shape, (20,))
        x = np.zeros((6, 4, 3, 8, 8))
        self.assertEqual(x[:, -1, 1].shape, (6, 8, 8))
        self.assertEqual(x.mean(axis=1).shape, (6, 3, 8, 8))


if __name__ == "__main__":
    unittest.main()
