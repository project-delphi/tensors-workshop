"""Regression checks for the fast gate's own bookkeeping.

It deliberately does not run any of the six real checks -- that is what
`check_local.py` is for. What can rot here is the *list*: a check dropped from
it, a summary that counts a non-zero exit as a pass, or a failure whose output
is swallowed. Those are pinned with an injected runner.
"""

from __future__ import annotations

import contextlib
import io
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import scripts.check_local as gate  # noqa: E402


class CheckLocal(unittest.TestCase):
    def test_the_offline_set_is_whole_and_stays_offline(self) -> None:
        names = tuple(name for name, _ in gate.CHECKS)
        self.assertEqual(
            names,
            (
                "ruff check",
                "ruff format --check",
                "teaching materials",
                "unittest",
                "npm test",
                "notebook links",
            ),
        )
        for name, argv in gate.CHECKS:
            self.assertTrue(argv, name)
            for word in ("render", "check:navigation", "test_notebooks.py"):
                self.assertFalse(any(word in arg for arg in argv), (name, word))
        links = dict(gate.CHECKS)["notebook links"]
        self.assertEqual(links[-1], "--notebooks-only")

    def test_summary_counts_only_zero_exits(self) -> None:
        ok = ("npm test", 0, 0.1, "")
        bad = ("ruff check", 1, 0.2, "boom")
        self.assertEqual(gate.summary([ok, ok]), "All 2 offline checks passed.")
        self.assertEqual(gate.summary([ok, bad, ok]), "2/3 passed; failed: ruff check.")

    def test_failure_keeps_its_output(self) -> None:
        def fail(argv: tuple[str, ...], cwd: Path) -> tuple[int, str]:
            return 1, "boom from the real check\n"

        with contextlib.redirect_stdout(io.StringIO()) as out:
            results = gate.run_checks(
                (("ruff check", ("ruff",)),), cwd=ROOT, runner=fail
            )
        self.assertEqual(results[0][1], 1)
        self.assertIn("FAIL  ruff check", out.getvalue())
        self.assertIn("boom from the real check", out.getvalue())

    def test_a_missing_tool_is_a_failure_not_a_traceback(self) -> None:
        code, output = gate.system(("definitely-not-a-workshop-tool",), ROOT)
        self.assertEqual(code, 127)
        self.assertIn("cannot run definitely-not-a-workshop-tool", output)

    def test_main_exits_nonzero_but_runs_every_check(self) -> None:
        seen: list[tuple[str, ...]] = []

        def mixed(argv: tuple[str, ...], cwd: Path) -> tuple[int, str]:
            seen.append(argv)
            return (1 if argv == ("npm", "test") else 0), ""

        with contextlib.redirect_stdout(io.StringIO()) as out:
            code = gate.main([], runner=mixed)
        self.assertEqual(code, 1)
        self.assertEqual(len(seen), len(gate.CHECKS))
        self.assertIn("failed: npm test", out.getvalue())

    def test_list_prints_the_commands_without_running_them(self) -> None:
        def never(argv: tuple[str, ...], cwd: Path) -> tuple[int, str]:
            raise AssertionError("--list must not run anything")

        with contextlib.redirect_stdout(io.StringIO()) as out:
            code = gate.main(["--list"], runner=never)
        self.assertEqual(code, 0)
        text = out.getvalue()
        self.assertIn("npm test: npm test", text)
        self.assertIn("notebook links:", text)


if __name__ == "__main__":
    unittest.main()
