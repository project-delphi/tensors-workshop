"""Regression checks for the derived `notebooks` dependency group.

`scripts/gen_tables.py` reads the notebooks' imports twice: once for the *what
each notebook needs* table, and once for the `notebooks` group in
`pyproject.toml`. The table is read by a person, who would notice it going
wrong. The group is read by `uv`, which would install a working environment
missing one package and leave the failure to whoever runs the notebook — so
the rules it applies are pinned here.

CI's regenerate gate already fails on a hand-edited group. What it cannot say
is *why* the group holds what it holds, which is what breaks when someone adds
a `%pip install` to a notebook and the environment quietly grows a package the
notebook installs for itself.
"""
from __future__ import annotations

from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import gen_tables as gt  # noqa: E402


class NotebookRequirements(unittest.TestCase):
    def setUp(self):
        self.deps = gt.notebook_requirements()

    def test_numpy_and_jupyterlab_are_present(self):
        # Neither can be found by reading imports: DEP_SKIP drops NumPy because
        # the table's column is "beyond NumPy", and nothing imports the thing
        # that runs it.
        self.assertIn("numpy", self.deps)
        self.assertIn("jupyterlab", self.deps)

    def test_self_installed_packages_are_excluded(self):
        # The notebooks that need these run `%pip install -q` themselves, which
        # is what the dagger in the dependency table means. Putting them in the
        # group would install them twice and disagree with the table.
        for name in ("tensorly", "imageio"):
            with self.subTest(name=name):
                self.assertNotIn(name, self.deps)

    def test_every_imported_third_party_module_is_covered(self):
        # The property that matters: nothing a notebook imports is missing from
        # the environment unless the notebook installs it itself.
        for s in gt.NOTEBOOKS:
            code = gt.notebook_code(ROOT / "notebooks" / gt.notebook_name(s))
            pip = " ".join(gt.PIP_RE.findall(code))
            for mod in gt.IMPORT_RE.findall(code):
                name = gt.DEP_NAME.get(mod, mod)
                if name in gt.DEP_SKIP or name in pip:
                    continue
                with self.subTest(notebook=s["n"], module=name):
                    self.assertIn(name, self.deps)

    def test_no_duplicates_and_a_stable_order(self):
        self.assertEqual(len(self.deps), len(set(self.deps)))
        self.assertEqual(self.deps, gt.notebook_requirements())

    def test_an_unranked_dependency_is_kept_not_dropped(self):
        # DEP_ORDER is a display order, not an allowlist. A notebook importing
        # something nobody thought to rank must still reach the environment.
        original = gt.DEP_SKIP
        try:
            # `itertools` is imported by a notebook and skipped as stdlib. Stop
            # skipping it and it stands in for a third-party package nobody
            # ranked: DEP_ORDER must append it, not drop it.
            gt.DEP_SKIP = original - {"itertools"}
            self.assertIn("itertools", gt.notebook_requirements())
        finally:
            gt.DEP_SKIP = original

    def test_group_renders_floors_for_known_names(self):
        rendered = gt.pyproject_group()
        self.assertIn('  "numpy>=', rendered)
        for line in rendered.splitlines():
            with self.subTest(line=line):
                self.assertTrue(line.startswith('  "') and line.endswith('",'))

    def test_committed_group_matches_the_derivation(self):
        # The same guarantee CI's regenerate gate gives, one push earlier.
        body = (ROOT / "pyproject.toml").read_text(encoding="utf-8")
        region = body.split("# BEGIN notebooks-group\n", 1)[1] \
                     .split("# END notebooks-group", 1)[0]
        self.assertEqual(region, gt.pyproject_group())


if __name__ == "__main__":
    unittest.main()
