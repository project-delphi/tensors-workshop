"""Regression checks for the notebook normalizer's key ordering.

`scripts/gen_notebooks.py` sorts the keys inside every cell so that a notebook
round-tripped through a different editor does not come back with all of its
cells rewritten, burying the one real edit. Nothing reads a notebook by key
order, so the only thing this protects is the diff -- which is exactly why it
needs a test rather than a reader noticing.

The property that matters is that **one** pass is a fixed point. CI's
byte-exact regenerate gate runs the generator once and fails on a dirty tree,
so a normalizer that only settles on the second pass turns a legitimate PR red
with nothing to point at. That is not hypothetical: sorting inside
`_normalize_cell` did exactly this, because `_rewrite_cell_ids` runs afterwards
and assigning `cell["id"]` appends the key on a cell that had none -- as an
nbformat 4.0-4.4 writer emits.
"""

from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import gen_notebooks as gn  # noqa: E402

SECTION = {"n": "04", "slug": "reshape-and-transpose"}


def normalize(cells: list[dict]) -> list[dict]:
    """One full normalizer pass over a list of cells."""
    cells = copy.deepcopy(cells)
    for cell in cells:
        gn._normalize_cell(cell)
    gn._rewrite_cell_ids(SECTION, cells)
    for cell in cells:
        gn._sort_cell_keys(cell)
    return cells


class CellKeyOrder(unittest.TestCase):
    def assertSorted(self, cells, where):
        for i, cell in enumerate(cells):
            keys = list(cell)
            self.assertEqual(keys, sorted(keys), f"{where}: cell {i} is {keys}")

    def test_sorted_after_one_pass(self):
        """Every cell comes out sorted, whatever order it went in as."""
        cells = [
            {"cell_type": "markdown", "metadata": {}, "source": ["hi\n"], "id": "a"},
            {"source": ["x = 1\n"], "cell_type": "code", "metadata": {}, "id": "b"},
            {
                "cell_type": "code",
                "id": "c",
                "metadata": {},
                "outputs": [],
                "execution_count": 3,
                "source": ["y = 2\n"],
            },
        ]
        self.assertSorted(normalize(cells), "sorted input")

    def test_cell_with_no_id_is_still_sorted(self):
        """The regression: `_rewrite_cell_ids` appends `id`, so it must sort after.

        An nbformat 4.0-4.4 writer emits cells with no `id` at all. Sorting
        before the ids are assigned leaves `id` last, and the generator is then
        not a fixed point in a single run.
        """
        cells = [
            {"cell_type": "markdown", "metadata": {}, "source": ["hi\n"]},
            {"cell_type": "code", "metadata": {}, "source": ["x = 1\n"]},
        ]
        out = normalize(cells)
        self.assertSorted(out, "cells with no id")
        for cell in out:
            self.assertIn("id", cell, "the normalizer must still assign an id")

    def test_one_pass_is_a_fixed_point(self):
        """A second pass must change nothing -- CI only runs the generator once."""
        cells = [
            {"cell_type": "markdown", "metadata": {}, "source": ["hi\n"]},
            {"source": ["x = 1\n"], "cell_type": "code", "metadata": {}},
            {
                "cell_type": "code",
                "metadata": {"tags": ["solution", "hide-input"]},
                "source": ["z = 3\n"],
                "outputs": [],
                "execution_count": 7,
            },
        ]
        once = normalize(cells)
        twice = normalize(once)
        self.assertEqual(once, twice, "the normalizer is not idempotent")
        self.assertEqual(
            [list(c) for c in once],
            [list(c) for c in twice],
            "key order moved on the second pass",
        )

    def test_folded_metadata_survives_the_sort(self):
        """Sorting rewrites the cell dict, so the folding contract must hold."""
        cells = [
            {
                "cell_type": "code",
                "metadata": {"tags": ["solution", "hide-input"]},
                "source": ["ans = 1\n"],
            }
        ]
        cell = normalize(cells)[0]
        self.assertEqual(cell["metadata"]["cellView"], "form")
        self.assertTrue(cell["metadata"]["jupyter"]["source_hidden"])
        self.assertIsNone(cell["execution_count"])
        self.assertEqual(cell["outputs"], [])


if __name__ == "__main__":
    unittest.main()
