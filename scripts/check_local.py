"""Run the offline checks from AGENTS.md's table before a render.

`AGENTS.md` maps each kind of change to the checks it owes. Most of those
checks need neither a rendered site nor a browser; this script runs that
offline set in one command:

    ruff check / ruff format --check / teaching materials / unittest /
    npm test / check_links.py --notebooks-only

It is a shortcut, not a second gate: CI runs these checks in its own order,
with `check_links.py` only after rendering and in its full form, and nothing
here replaces the checks a rendered page owes (`quarto render`,
`check_links.py`, `npm run check:navigation`). Install `uv` and run `npm ci`
once before the first invocation.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import time
from collections.abc import Callable
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

Runner = Callable[[tuple[str, ...], Path], tuple[int, str]]


def uv(group: str, *args: str) -> tuple[str, ...]:
    """The exact argv CI uses for a `uv run --group ...` command."""
    return ("uv", "run", "--group", group, *args)


# The offline checks from AGENTS.md's "Done means" table. CI runs each in its
# own job and order; `--notebooks-only` is the offline form of its link check.
CHECKS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("ruff check", uv("lint", "ruff", "check", "scripts", "tests")),
    (
        "ruff format --check",
        uv("lint", "ruff", "format", "--check", "scripts", "tests"),
    ),
    ("teaching materials", uv("test", "python", "scripts/check_teaching_materials.py")),
    (
        "unittest",
        uv("test", "python", "-m", "unittest", "discover", "-s", "tests", "-q"),
    ),
    ("npm test", ("npm", "test")),
    (
        "notebook links",
        uv("site", "python", "scripts/check_links.py", "--notebooks-only"),
    ),
)


def system(argv: tuple[str, ...], cwd: Path) -> tuple[int, str]:
    """Run one argv in `cwd`, returning (return code, combined output)."""
    try:
        proc = subprocess.run(
            argv, cwd=cwd, capture_output=True, text=True, check=False
        )
    except FileNotFoundError as error:
        return 127, f"cannot run {argv[0]}: {error}"
    return proc.returncode, proc.stdout + proc.stderr


def run_checks(
    checks: tuple[tuple[str, tuple[str, ...]], ...],
    *,
    cwd: Path,
    runner: Runner = system,
) -> list[tuple[str, int, float, str]]:
    """Run each check, print its status, and return its result and output."""
    results = []
    for name, argv in checks:
        start = time.monotonic()
        code, output = runner(argv, cwd)
        elapsed = time.monotonic() - start
        results.append((name, code, elapsed, output))
        print(
            f"{'PASS' if code == 0 else 'FAIL'}  {name}  ({elapsed:.1f}s)", flush=True
        )
        if code != 0:
            print(output.rstrip() or "(no output)", flush=True)
    return results


def summary(results: list[tuple[str, int, float, str]]) -> str:
    """One closing line: a pass count, or the names of what failed."""
    passed = sum(1 for _, code, _, _ in results if code == 0)
    if passed == len(results):
        return f"All {len(results)} offline checks passed."
    failed = ", ".join(name for name, code, _, _ in results if code != 0)
    return f"{passed}/{len(results)} passed; failed: {failed}."


def main(argv: list[str] | None = None, *, runner: Runner = system) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--list", action="store_true", help="print the checks and exit")
    args = parser.parse_args(argv)
    if args.list:
        for name, command in CHECKS:
            print(f"{name}: {' '.join(command)}")
        return 0
    print(f"Offline checks (cwd {ROOT}):")
    results = run_checks(CHECKS, cwd=ROOT, runner=runner)
    print(summary(results))
    return 0 if all(code == 0 for _, code, _, _ in results) else 1


if __name__ == "__main__":
    sys.exit(main())
