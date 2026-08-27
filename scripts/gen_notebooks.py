#!/usr/bin/env python3
"""Normalize the twelve section notebooks in place.

    uv run --with pyyaml,nbformat python scripts/gen_notebooks.py

This script owns only the notebook scaffolding:
- header, objectives and Colab badge
- Setup preamble
- Setup code
- footer

Teaching body cells live directly in notebooks/*.ipynb and may be edited in
Colab, including with Gemini. Those body cells are preserved in place.

_variables.yml owns shared facts and bilingual objectives.
scripts/content.py owns only centrally maintained Setup code.

Normalization removes outputs, execution counts and transient Colab per-cell
metadata while preserving meaningful metadata such as folded solutions.

Existing valid body cell ids are preserved. Missing, invalid or duplicate ids
receive stable content-derived ids.

Running the normalizer twice must be an exact no-op.
"""
from __future__ import annotations

import hashlib
import json
import pathlib
import re
import sys

import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
NBDIR = ROOT / "notebooks"
V = yaml.safe_load((ROOT / "_variables.yml").read_text(encoding="utf-8"))
SECTIONS = [V["sections"][k] for k in sorted(V["sections"])]
QUIZZES = [V["kahoot"][k] for k in ("q1", "q2", "q3")]
REPO = V["repo"]

# ── cell constructors ────────────────────────────────────────────────────────


def md(text: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": _lines(text)}


def code(text: str) -> dict:
    return {"cell_type": "code", "execution_count": None, "metadata": {},
            "outputs": [], "source": _lines(text)}


def solution(text: str, title: str = "Solution — try it yourself first") -> dict:
    """A folded solution cell.

    `cellView: form` is what Colab honours: it collapses the body behind the
    `#@title` line, so the answer is one deliberate click away rather than
    sitting in view above the exercise. `jupyter.source_hidden` does the same
    in JupyterLab, and `tags` keeps nbconvert in step.
    """
    body = f"#@title {title} {{ display-mode: 'form' }}\n" + text
    cell = code(body)
    cell["metadata"] = {
        "cellView": "form",
        "jupyter": {"source_hidden": True},
        "tags": ["solution", "hide-input"],
    }
    return cell


def _lines(text: str) -> list[str]:
    """nbformat stores source as a list of lines, each keeping its newline
    except the last."""
    text = text.strip("\n")
    return [ln + "\n" for ln in text.split("\n")[:-1]] + [text.split("\n")[-1]]


# ── scaffolding ──────────────────────────────────────────────────────────────

def notebook_name(s: dict) -> str:
    return f"{s['n']}-{s['slug']}.ipynb"


def colab_url(s: dict) -> str:
    return f"{REPO['colab_base']}/{notebook_name(s)}"


def quiz_after(n: str) -> dict | None:
    return next((q for q in QUIZZES if q["after"] == n), None)


def header_cell(s: dict) -> dict:
    badge = ("[![Open In Colab](https://colab.research.google.com/assets/"
             f"colab-badge.svg)]({colab_url(s)})")
    objs = "\n".join(f"- {o}" for o in s["objectives_en"])
    part = f"Part {s['part']} · " if s["part"] != "—" else ""
    return md(f"""# {s['n']} · {s['title_en']}

{badge}

*{part}{s['format_en']} · {s['minutes']} min*

> 🇪🇸 **{s['title_es']}** — {s['summary_es']}

{s['summary_en']}

## What you will be able to do

{objs}
""")


def footer_cell(s: dict) -> dict:
    q = quiz_after(s["n"])
    site = REPO["site"]
    nxt = next((x for x in SECTIONS if x["n"] > s["n"]), None)
    if q:
        body = f"""---

## Time for Kahoot 🎯

**Kahoot {q['n']} — {q['title_en']}** · {q['questions']} questions, about 5 minutes.

> 🇪🇸 **{q['title_es']}** — {q['questions']} preguntas, unos 5 minutos.

Join at **{V['kahoot']['join']}** with the PIN on the facilitator's screen.

- [Quiz details and facilitator notes]({site}/kahoot.html#quiz-{q['n']})
- [Import file (`.xlsx`)]({REPO['url']}/blob/{REPO['branch']}/{q['xlsx']})
"""
    else:
        body = "---\n\n## Done with this section\n"
    if nxt:
        body += (f"\nNext up: **{nxt['n']} · {nxt['title_en']}** — "
                 f"[open in Colab]({colab_url(nxt)}).\n")
    else:
        body += "\nThat is the whole workshop. Thank you for coming.\n"
    body += (f"\n[← Back to the workshop site]({site}/) · "
             f"[All notebooks]({site}/notebooks.html) · "
             f"[Handbook]({site}/tensors_workshop_plan_with_quizzes.html)\n")
    return md(body)


SETUP_PREAMBLE = """## Setup

Run this first. It installs and imports everything this notebook needs, and nothing else.

> 🇪🇸 Ejecuta esto primero: instala e importa todo lo que este cuaderno necesita."""


def _valid_cell_id(value: object) -> bool:
    """Return whether *value* is a valid nbformat v4 cell id."""
    return (
        isinstance(value, str)
        and 1 <= len(value) <= 64
        and re.fullmatch(r"[A-Za-z0-9_-]+", value) is not None
    )


def _generated_body_id(s: dict, cell: dict) -> str:
    """Stable id for a body cell that arrived from Colab without a usable id.

    Existing valid ids are preserved. Only missing, invalid or duplicate ids
    come through here, so inserting a new cell does not renumber later cells.
    """
    payload = json.dumps(
        {
            "cell_type": cell.get("cell_type"),
            "source": cell.get("source", []),
        },
        ensure_ascii=False,
        sort_keys=True,
    ).encode("utf-8")
    digest = hashlib.sha1(payload).hexdigest()[:12]
    return f"s{s['n']}-b-{digest}"


def _normalize_cell(cell: dict) -> dict:
    """Remove execution state and Colab-only per-cell metadata.

    Teaching metadata is deliberately left alone. In particular this preserves
    the metadata used by folded solution cells: cellView, jupyter.source_hidden
    and the solution/hide-input tags.
    """
    metadata = cell.setdefault("metadata", {})
    for key in ("colab", "outputId", "executionInfo"):
        metadata.pop(key, None)

    if cell.get("cell_type") == "code":
        cell["execution_count"] = None
        cell["outputs"] = []
    else:
        cell.pop("execution_count", None)
        cell.pop("outputs", None)

    return cell


def _rewrite_cell_ids(s: dict, cells: list[dict]) -> None:
    """Preserve good ids and deterministically repair only unusable ones."""
    used: set[str] = set()

    for cell in cells:
        current = cell.get("id")
        if _valid_cell_id(current) and current not in used:
            used.add(current)
            continue

        base = _generated_body_id(s, cell)
        candidate = base
        suffix = 2
        while candidate in used:
            candidate = f"{base}-{suffix}"
            suffix += 1

        cell["id"] = candidate
        used.add(candidate)


def normalize_notebook(s: dict, spec: dict, path: pathlib.Path) -> dict:
    """Refresh owned scaffolding while preserving the notebook body in place.

    Ownership boundary:
      * cell 0: generated header
      * Setup preamble + Setup code: generated when ``spec["setup"]`` exists
      * body cells: notebook-owned; source and meaningful metadata are preserved
      * final cell: generated footer

    Body cells are normalized only for execution state and Colab's transient
    per-cell metadata.
    """
    if not path.exists():
        raise FileNotFoundError(
            f"cannot normalize missing notebook: {path.relative_to(ROOT)}"
        )

    nb = json.loads(path.read_text(encoding="utf-8"))
    old_cells = nb.get("cells")

    if not isinstance(old_cells, list):
        raise ValueError(
            f"{path.relative_to(ROOT)} has no valid cells list"
        )

    has_setup = bool(spec.get("setup"))
    minimum_cells = 4 if has_setup else 2
    if len(old_cells) < minimum_cells:
        raise ValueError(
            f"{path.relative_to(ROOT)} has {len(old_cells)} cells; "
            f"expected at least {minimum_cells}"
        )

    # Preserve the existing scaffold ids so this migration is byte-stable on
    # today's untouched notebooks.
    header = header_cell(s)
    header["id"] = old_cells[0].get("id")

    cells: list[dict] = [header]

    if has_setup:
        setup_md = md(SETUP_PREAMBLE)
        setup_md["id"] = old_cells[1].get("id")

        setup_code = code(spec["setup"])
        setup_code["id"] = old_cells[2].get("id")

        body = old_cells[3:-1]
        cells.extend((setup_md, setup_code))
    else:
        body = old_cells[1:-1]

    # This is the key ownership change: teaching cells come from the notebook,
    # not from spec["cells"] / content.py.
    cells.extend(body)

    footer = footer_cell(s)
    footer["id"] = old_cells[-1].get("id")
    cells.append(footer)

    for cell in cells:
        _normalize_cell(cell)

    _rewrite_cell_ids(s, cells)

    # Preserve notebook-level metadata and nbformat fields exactly as they were.
    nb["cells"] = cells
    return nb

def main() -> int:
    from content import CONTENT  # noqa: PLC0415  (sibling module, see below)

    NBDIR.mkdir(exist_ok=True)
    missing = [s["n"] for s in SECTIONS if s["n"] not in CONTENT]
    if missing:
        sys.exit(f"no CONTENT for section(s): {', '.join(missing)}")

    for s in SECTIONS:
        path = NBDIR / notebook_name(s)
        try:
            nb = normalize_notebook(s, CONTENT[s["n"]], path)
        except (FileNotFoundError, ValueError) as exc:
            sys.exit(str(exc))
        path.write_text(json.dumps(nb, indent=1, ensure_ascii=False) + "\n",
                        encoding="utf-8")
        n_code = sum(c["cell_type"] == "code" for c in nb["cells"])
        n_sol = sum("solution" in c["metadata"].get("tags", [])
                    for c in nb["cells"])
        print(f"  {path.relative_to(ROOT)}  "
              f"{len(nb['cells'])} cells ({n_code} code, {n_sol} solutions)")

    try:
        import nbformat
    except ImportError:
        print("\nnbformat not available — skipping validation")
        return 0
    for s in SECTIONS:
        nbformat.validate(nbformat.read(NBDIR / notebook_name(s), as_version=4))
    print(f"\nnbformat.validate: {len(SECTIONS)}/{len(SECTIONS)} valid")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    sys.exit(main())
