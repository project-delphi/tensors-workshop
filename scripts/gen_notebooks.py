#!/usr/bin/env python3
"""Generate the twelve section notebooks from _variables.yml + CONTENT below.

    uv run --with pyyaml,nbformat python scripts/gen_notebooks.py

Why generated rather than hand-written: every notebook needs the same header
(title, Spanish summary, objectives, Colab badge pointing at its own path on
GitHub) and the same footer (its Kahoot check, a link back to the site). Those
are exactly the things that rot when twelve files are edited by hand, and the
Colab badge is the worst of them — a badge pointing at the wrong notebook still
opens something, so the mistake is invisible until a student hits it.

So: this file owns the *scaffolding*, CONTENT owns the *teaching*, and
_variables.yml owns every fact that appears in more than one place.

Notebooks are written with no outputs and no execution counts, on purpose. The
handbook quotes its verified numbers in the prose instead, so a student can
check their own result without being shown it first.
"""
from __future__ import annotations

import json
import pathlib
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


def header_cell(s: dict, objectives: list[str]) -> dict:
    badge = ("[![Open In Colab](https://colab.research.google.com/assets/"
             f"colab-badge.svg)]({colab_url(s)})")
    objs = "\n".join(f"- {o}" for o in objectives)
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


def build(s: dict, spec: dict) -> dict:
    """Assemble one notebook. Cell ids are derived from the section number and
    position so that regenerating an unchanged notebook produces a byte-identical
    file — otherwise every run would show up as a diff."""
    cells = [header_cell(s, spec["objectives"])]
    if spec.get("setup"):
        cells.append(md("## Setup\n\nRun this first. It installs and imports "
                        "everything this notebook needs, and nothing else.\n\n"
                        "> 🇪🇸 Ejecuta esto primero: instala e importa todo lo "
                        "que este cuaderno necesita."))
        cells.append(code(spec["setup"]))
    cells += spec["cells"]
    cells.append(footer_cell(s))
    for i, cell in enumerate(cells):
        cell["id"] = f"s{s['n']}-{i:02d}"
    return {
        "cells": cells,
        "metadata": {
            "colab": {"name": notebook_name(s), "provenance": [],
                      "toc_visible": True},
            "kernelspec": {"display_name": "Python 3", "language": "python",
                           "name": "python3"},
            "language_info": {"name": "python"},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }


def main() -> int:
    from content import CONTENT  # noqa: PLC0415  (sibling module, see below)

    NBDIR.mkdir(exist_ok=True)
    missing = [s["n"] for s in SECTIONS if s["n"] not in CONTENT]
    if missing:
        sys.exit(f"no CONTENT for section(s): {', '.join(missing)}")

    for s in SECTIONS:
        nb = build(s, CONTENT[s["n"]])
        path = NBDIR / notebook_name(s)
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
