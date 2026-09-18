"""Read a notebook by cell instead of by file.

A notebook here is 80-130 KB of JSON, and most of what anyone wants from it
is one cell, or the cells that changed. This script is the cheap way to get
those; it never writes.

    nb_cells.py index NN              one line per cell: idx, id, type, tags,
                                      chars, first line
    nb_cells.py show NN ID [ID ...]   the source of those cells, id and tags
                                      as a header
    nb_cells.py diff [REF]            per notebook changed against REF
                                      (default main): cells added, removed,
                                      and a unified diff of *source* per
                                      changed cell. Outputs, metadata and
                                      execution counts are ignored.

NN is the two-digit notebook number; a full filename works too. Standard
library only, so it runs under the `site` group with nothing to install.
"""

from __future__ import annotations

import argparse
import difflib
import json
import pathlib
import signal
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
NOTEBOOKS = ROOT / "notebooks"


def source(cell: dict) -> str:
    src = cell.get("source", "")
    return src if isinstance(src, str) else "".join(src)


def tags(cell: dict) -> list[str]:
    return list(cell.get("metadata", {}).get("tags", []))


def resolve(name: str) -> pathlib.Path:
    """`09`, `09-matrix-factorizations` or `09-matrix-factorizations.ipynb`."""
    path = pathlib.Path(name)
    if path.suffix == ".ipynb" and path.exists():
        return path
    hits = sorted(NOTEBOOKS.glob(f"{name}*.ipynb"))
    if len(hits) != 1:
        sys.exit(f"nb_cells: {name!r} matches {len(hits)} notebooks, need 1")
    return hits[0]


def load(path: pathlib.Path) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))["cells"]


def first_line(text: str) -> str:
    for line in text.splitlines():
        if line.strip():
            return line.strip()
    return ""


def index_lines(cells: list[dict]) -> list[str]:
    out = []
    for i, cell in enumerate(cells):
        src = source(cell)
        tag = ",".join(tags(cell)) or "-"
        kind = {"markdown": "md", "code": "code"}.get(cell["cell_type"], "raw")
        out.append(
            f"{i:>3}  {cell.get('id', '?'):<22} {kind:<4} {tag:<38} "
            f"{len(src):>6}  {first_line(src)[:70]}"
        )
    return out


def show_lines(cells: list[dict], ids: list[str]) -> list[str]:
    by_id = {c.get("id"): c for c in cells}
    out = []
    for cid in ids:
        cell = by_id.get(cid)
        if cell is None:
            out.append(f"## {cid}: no such cell")
            continue
        out.append(f"## {cid}  {cell['cell_type']}  tags={tags(cell) or '-'}")
        out.append(source(cell))
        out.append("")
    return out


def diff_lines(old: list[dict], new: list[dict], label: str) -> list[str]:
    """Source-only diff between two cell lists, keyed on cell id."""
    old_by = {c.get("id"): c for c in old}
    new_by = {c.get("id"): c for c in new}
    out = []
    for cid in [c.get("id") for c in old if c.get("id") not in new_by]:
        out.append(f"- removed {cid}  ({first_line(source(old_by[cid]))[:60]})")
    for cid in [c.get("id") for c in new if c.get("id") not in old_by]:
        out.append(f"+ added   {cid}  ({first_line(source(new_by[cid]))[:60]})")
    for cid, cell in new_by.items():
        if cid not in old_by:
            continue
        a, b = source(old_by[cid]), source(cell)
        old_tags, new_tags = tags(old_by[cid]), tags(cell)
        if a == b and old_tags == new_tags:
            continue
        tag_note = f"tags={new_tags or '-'}"
        if old_tags != new_tags:
            tag_note = f"tags {old_tags or '-'} -> {new_tags or '-'}"
        out.append(f"~ changed {cid}  {tag_note}")
        out.extend(
            line.rstrip("\n")
            for line in difflib.unified_diff(
                a.splitlines(keepends=True),
                b.splitlines(keepends=True),
                fromfile=f"{label}:{cid}",
                tofile=f"work:{cid}",
                n=2,
            )
        )
    return out


def git(*args: str) -> str:
    run = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True)
    if run.returncode:
        sys.exit(f"nb_cells: git {' '.join(args)}: {run.stderr.strip()}")
    return run.stdout


def changed_notebooks(base: str) -> list[str]:
    """Notebooks that differ between BASE and the working tree, new ones included."""
    spec = ("--", "notebooks/*.ipynb")
    committed = git("diff", "--name-only", base, "HEAD", *spec)
    working = git("diff", "--name-only", "HEAD", *spec)
    untracked = git("ls-files", "--others", "--exclude-standard", *spec)
    return sorted({p for p in (committed + working + untracked).split() if p})


def cmd_diff(ref: str) -> int:
    base = git("merge-base", ref, "HEAD").strip()  # what `git diff REF...HEAD` sees
    paths = changed_notebooks(base)
    if not paths:
        print(f"no notebook differs from {ref}")
        return 0
    for rel in paths:
        old = []
        if git("ls-tree", "--name-only", base, "--", rel).strip():
            old = json.loads(git("show", f"{base}:{rel}"))["cells"]
        new = load(ROOT / rel) if (ROOT / rel).exists() else []
        print(f"=== {rel}")
        lines = diff_lines(old, new, ref)
        print("\n".join(lines) if lines else "(no source change; metadata only)")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("index", help="one line per cell")
    p.add_argument("notebook")
    p = sub.add_parser("show", help="print the source of the named cells")
    p.add_argument("notebook")
    p.add_argument("ids", nargs="+")
    p = sub.add_parser("diff", help="source-only diff of changed notebooks")
    p.add_argument("ref", nargs="?", default="main")
    args = parser.parse_args(argv)

    if args.cmd == "index":
        print("\n".join(index_lines(load(resolve(args.notebook)))))
    elif args.cmd == "show":
        print("\n".join(show_lines(load(resolve(args.notebook)), args.ids)))
    else:
        return cmd_diff(args.ref)
    return 0


if __name__ == "__main__":
    signal.signal(signal.SIGPIPE, signal.SIG_DFL)  # quiet under `| head`
    sys.exit(main())
