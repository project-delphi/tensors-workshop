"""Regression checks for routes, relative links and runnable teaching examples."""
import copy
import json
from pathlib import Path
import re
import tempfile
import unittest

from scripts.check_teaching_materials import ROOT, anchors, check_links, check_route, check_tasks


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
        found = anchors('# Hello\n\n# Hello\n\n```python\n# Not a heading\n```\n')
        self.assertEqual(found, {"hello", "hello-1"})


class Routes(unittest.TestCase):
    def setUp(self):
        self.notebook = json.loads(next((ROOT / "notebooks").glob("01-*.ipynb")).read_text())

    def test_valid(self):
        check_route(self.notebook, "fixture")

    def test_broken_routes(self):
        for mode in ("missing", "duplicate", "solution", "order", "label", "translation"):
            nb = copy.deepcopy(self.notebook)
            scaffold = next(c for c in nb["cells"] if "workshop" in c.get("metadata", {}))
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
                prep_at = next(i for i, c in enumerate(nb["cells"]) if c["id"] == route["prep"][0])
                nb["cells"][prep_at-1]["source"] = []
            else:
                for c in nb["cells"]:
                    c["source"] = [s.replace("Predice → Ejecuta → Explica → Comprueba", "") for s in c["source"]]
            with self.subTest(mode=mode), self.assertRaises(ValueError):
                check_route(nb, "fixture")


class Tasks(unittest.TestCase):
    def test_wrong_notebook_and_missing_deliverable(self):
        with tempfile.TemporaryDirectory() as folder:
            page = Path(folder) / "group-tasks.md"
            text = '## 00 · Task\n\n**Time:** 6 minutes.\n[Notebook](notebooks/00-example.ipynb)\n**Share:** a check\n'
            page.write_text(text)
            self.assertEqual(check_tasks(page, {"00": "00-example.ipynb"}), [("00", 6)])
            for broken in (text.replace("00-example.ipynb", "01-other.ipynb"), text.replace("**Share:**", "Result:")):
                page.write_text(broken)
                with self.assertRaises(ValueError):
                    check_tasks(page, {"00": "00-example.ipynb"})


class WorkedExamples(unittest.TestCase):
    def test_bilingual_examples_match_and_run(self):
        blocks = []
        for path in (ROOT / "worked-mistakes.md", ROOT / "es/worked-mistakes.md"):
            code = re.findall(r"```python\n(.*?)\n```", path.read_text(), re.DOTALL)
            self.assertEqual(len(code), 4)
            blocks.append(code)
            for i, source in enumerate(code):
                with self.subTest(path=path, example=i):
                    exec(compile(source, f"{path}:example-{i}", "exec"), {})
        self.assertEqual(*blocks)

    def test_assessment_shapes(self):
        import numpy as np
        self.assertEqual(np.empty((20, 8, 8))[:, 3, 4].shape, (20,))
        x = np.zeros((6, 4, 3, 8, 8))
        self.assertEqual(x[:, -1, 1].shape, (6, 8, 8))
        self.assertEqual(x.mean(axis=1).shape, (6, 3, 8, 8))


if __name__ == "__main__":
    unittest.main()
