#!/usr/bin/env python3
"""Normalize the twelve section notebooks in place.

    uv run --with pyyaml,nbformat python scripts/gen_notebooks.py

gen_notebooks.py owns exactly two cells plus structural hygiene:

- cell 0: the bilingual header -- title, intro, objectives, Colab badge
- the final cell: the bilingual footer -- next-section link, Kahoot block, nav
- per-cell metadata hygiene and stable cell ids, and removal of stale
  notebook-level widget state

Everything between cell 0 and the final cell is notebook-owned teaching-body
content, preserved here in place and in order. That explicitly includes the
entire Setup section: its heading, its explanatory prose and its code. Those
cells are edited directly in notebooks/*.ipynb, including in Colab with Gemini.

_variables.yml owns the bilingual header text: intro_en / intro_es,
objectives_en / objectives_es, optional format_line_en / format_line_es, and
workshop.closing_en / closing_es. gen_notebooks.py no longer reads
CONTENT["NN"]["setup"] from scripts/content.py.

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
WORKSHOP = V["workshop"]

# ── cell constructors ────────────────────────────────────────────────────────


def md(text: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": _lines(text)}


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
    part = f"Part {s['part']} · " if s["part"] != "—" else ""
    if s.get("format_line_en") and s.get("format_line_es"):
        fmt_line = f"{s['format_line_en']} / {s['format_line_es']}"
    elif s.get("format_line_en"):
        fmt_line = s["format_line_en"]
    else:
        fmt_line = f"{part}{s['format_en']} · {s['minutes']} min"

    objs_en = "\n".join(f"- {o}" for o in s["objectives_en"])
    objs_es = "\n".join(f"> - {o}" for o in s["objectives_es"])

    if s.get("intro_en"):
        # Sections 01-11: merged bilingual header. Intro prose is authored in
        # _variables.yml (intro_en / intro_es).
        return md(f"""# {s['n']} · {s['title_en']} / {s['title_es']}

{badge}

*{fmt_line}*

{s['intro_en'].rstrip(chr(10))}

{s['intro_es'].rstrip(chr(10))}

## What you will be able to do / Lo que podrás hacer

{objs_en}

> 🇪🇸
>
{objs_es}
""")

    # Section 00: single-language header with an ES summary callout.
    return md(f"""# {s['n']} · {s['title_en']}

{badge}

*{fmt_line}*

> 🇪🇸 **{s['title_es']}** — {s['summary_es']}

{s['summary_en']}

## What you will be able to do

{objs_en}

> 🇪🇸 **Lo que podrás hacer:**
>
{objs_es}
""")


def footer_cell(s: dict) -> dict:
    q = quiz_after(s["n"])
    site = REPO["site"]
    nxt = next((x for x in SECTIONS if x["n"] > s["n"]), None)

    if s.get("intro_en"):
        return _footer_bilingual(q, nxt, site)

    # Section 00: single-language footer.
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
        body = ("---\n\n## Done with this section\n"
                "\n> 🇪🇸 **Fin de esta sección.**\n")
    if nxt:
        body += (f"\nNext up: **{nxt['n']} · {nxt['title_en']}** — "
                 f"[open in Colab]({colab_url(nxt)}).\n")
    else:
        body += "\nThat is the whole workshop. Thank you for coming.\n"
    body += (f"\n[← Back to the workshop site]({site}/) · "
             f"[All notebooks]({site}/notebooks.html) · "
             f"[Handbook]({site}/tensors_workshop_plan_with_quizzes.html)\n")
    return md(body)


def _footer_bilingual(q: dict | None, nxt: dict | None, site: str) -> dict:
    """Merged bilingual footer for sections 01-11."""
    nav = ("[← Workshop site / Sitio del taller]"
           f"({site}/) · "
           "[All notebooks / Todos los notebooks]"
           f"({site}/notebooks.html) · "
           "[Handbook / Manual]"
           f"({site}/tensors_workshop_plan_with_quizzes.html)")

    parts = ["---", ""]
    if q:
        parts += [
            "## Time for Kahoot 🎯 / Hora de Kahoot 🎯",
            "",
            f"**Kahoot {q['n']} — {q['title_en']} / {q['title_es']}**  ",
            f"{q['questions']} questions / {q['questions']} preguntas · "
            "about 5 minutes / unos 5 minutos.",
            "",
            f"Join at **{V['kahoot']['join']}** with the PIN on the "
            "facilitator's screen.",
            "",
            f"> 🇪🇸 Entra a **{V['kahoot']['join']}** con el PIN que aparece "
            "en la pantalla del facilitador.",
            "",
            "- [Quiz details and facilitator notes]"
            f"({site}/kahoot.html#quiz-{q['n']})",
            "- [Import file (`.xlsx`)]"
            f"({REPO['url']}/blob/{REPO['branch']}/{q['xlsx']})",
            "",
        ]
    elif nxt:
        parts += ["## Done with this section / Fin de esta sección", ""]
    else:
        parts += ["## Done with the workshop / Fin del taller 🎉", ""]

    if nxt:
        parts += [
            f"Next / Siguiente: **{nxt['n']} · {nxt['title_en']} / "
            f"{nxt['title_es']}** — [open in Colab]({colab_url(nxt)}).",
            "",
        ]
    else:
        parts += [
            WORKSHOP["closing_en"],
            "",
            WORKSHOP["closing_es"].rstrip(chr(10)),
            "",
        ]

    parts.append(nav)
    return md("\n".join(parts))


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
    for key in ("colab", "outputId", "executionInfo", "id"):
        metadata.pop(key, None)

    # Colab may drop cellView when saving a notebook back to GitHub.
    # Restore the metadata required to keep solution cells folded.
    if "solution" in metadata.get("tags", []):
        metadata["cellView"] = "form"
        metadata.setdefault("jupyter", {})["source_hidden"] = True

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


def normalize_notebook(s: dict, path: pathlib.Path) -> dict:
    """Regenerate the header and footer; preserve every other cell in place.

    Ownership boundary:
      * cell 0: generated bilingual header
      * final cell: generated bilingual footer
      * every cell between them: notebook-owned teaching-body content
        (including the whole Setup section), preserved in source and order;
        only execution state and transient Colab per-cell metadata are cleaned

    Cell 0 and the final cell keep their existing ids so the rewrite is stable.
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

    if len(old_cells) < 2:
        raise ValueError(
            f"{path.relative_to(ROOT)} has {len(old_cells)} cells; "
            f"expected at least a header and a footer"
        )

    header = header_cell(s)
    header["id"] = old_cells[0].get("id")

    footer = footer_cell(s)
    footer["id"] = old_cells[-1].get("id")

    # Everything between cell 0 and the final cell is notebook-owned.
    cells: list[dict] = [header, *old_cells[1:-1], footer]

    for cell in cells:
        _normalize_cell(cell)

    _rewrite_cell_ids(s, cells)

    # Drop stale widget state left at the notebook level by prior executions;
    # kernelspec, language_info, colab and other metadata are kept.
    nb.get("metadata", {}).pop("widgets", None)

    nb["cells"] = cells
    return nb


def main() -> int:
    NBDIR.mkdir(exist_ok=True)

    for s in SECTIONS:
        path = NBDIR / notebook_name(s)
        try:
            nb = normalize_notebook(s, path)
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
