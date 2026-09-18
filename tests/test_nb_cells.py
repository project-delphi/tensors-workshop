"""`scripts/nb_cells.py` reads a notebook by cell so an agent or a reviewer
does not have to load the whole JSON. These tests pin the three views on a
tiny synthetic notebook: the index line per cell, `show` by id, and the
source-only diff that ignores outputs and metadata.
"""

from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import nb_cells as nc  # noqa: E402

CELLS = [
    {
        "id": "s04-00",
        "cell_type": "markdown",
        "metadata": {},
        "source": ["# Reshape\n", "\n", "Prose.\n"],
    },
    {
        "id": "s04-01",
        "cell_type": "code",
        "metadata": {"tags": ["workshop-core-prep"]},
        "source": "import numpy as np\nx = np.arange(6)\n",
        "outputs": [],
        "execution_count": None,
    },
    {
        "id": "s04-02",
        "cell_type": "code",
        "metadata": {"tags": ["solution", "hide-input"]},
        "source": "y = x.reshape(2, 3)\n",
        "outputs": [],
        "execution_count": None,
    },
]


class IndexAndShow(unittest.TestCase):
    def test_index_has_one_line_per_cell_with_id_tags_and_first_line(self):
        lines = nc.index_lines(CELLS)
        self.assertEqual(len(lines), 3)
        self.assertIn("s04-00", lines[0])
        self.assertIn("md", lines[0])
        self.assertIn("# Reshape", lines[0])
        self.assertIn("solution,hide-input", lines[2])

    def test_show_prints_source_and_flags_a_missing_id(self):
        out = "\n".join(nc.show_lines(CELLS, ["s04-01", "nope"]))
        self.assertIn("## s04-01  code  tags=['workshop-core-prep']", out)
        self.assertIn("x = np.arange(6)", out)
        self.assertIn("## nope: no such cell", out)
        self.assertNotIn("reshape", out)


class Diff(unittest.TestCase):
    def test_outputs_and_execution_counts_are_not_a_change(self):
        new = copy.deepcopy(CELLS)
        new[1]["outputs"] = [{"output_type": "stream", "text": "hi"}]
        new[1]["execution_count"] = 3
        self.assertEqual(nc.diff_lines(CELLS, new, "main"), [])

    def test_source_change_added_and_removed_cells_are_reported(self):
        new = copy.deepcopy(CELLS)
        new[1]["source"] = "import numpy as np\nx = np.arange(12)\n"
        del new[2]
        new.append(
            {
                "id": "s04-03",
                "cell_type": "markdown",
                "metadata": {},
                "source": "New prose.\n",
            }
        )
        out = nc.diff_lines(CELLS, new, "main")
        self.assertIn("- removed s04-02  (y = x.reshape(2, 3))", out)
        self.assertIn("+ added   s04-03  (New prose.)", out)
        self.assertIn("~ changed s04-01  tags=['workshop-core-prep']", out)
        self.assertIn("-x = np.arange(6)", out)
        self.assertIn("+x = np.arange(12)", out)

    def test_tag_change_alone_is_reported(self):
        new = copy.deepcopy(CELLS)
        new[2]["metadata"]["tags"] = ["plumbing", "hide-input"]
        out = nc.diff_lines(CELLS, new, "main")
        self.assertEqual(out, ["~ changed s04-02  tags=['plumbing', 'hide-input']"])


if __name__ == "__main__":
    unittest.main()
