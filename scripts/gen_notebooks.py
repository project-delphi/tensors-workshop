#!/usr/bin/env python3
"""Normalize the notebooks in place: the thirteen sections and the extras.

    uv run --group site python scripts/gen_notebooks.py

An *extra* is a notebook that is not a section — a take-home deep dive declared
under `extras:` in _variables.yml rather than `sections:`. It carries no
`minutes`, `start`/`end` or `part`, which is what keeps it out of the running
clock, and it gets no Kahoot block. Everything else about it — the header, the
ownership boundary, the normalization — is identical to a section.

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
workshop.closing_en / closing_es. Setup code lives only in the notebooks.

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
EXTRAS = [V["extras"][k] for k in sorted(V.get("extras", {}))]
NOTEBOOKS = SECTIONS + EXTRAS
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


# ── the visual system ────────────────────────────────────────────────────────
#
# Three rules hold this together, and all three come from where the notebooks
# are read rather than from taste:
#
# 1. Inline `style=` attributes only. Colab strips a `<style>` block, so a
#    stylesheet would silently do nothing.
# 2. Every styled block must still read as plain prose with the styling gone.
#    GitHub renders .ipynb and strips the style attribute itself, so colour
#    may never be the only thing carrying a meaning -- the Spanish box says
#    "ESPAÑOL" in words for exactly that reason.
# 3. No opaque background and no hard-coded text colour. The tints are rgba
#    over whatever the theme is painting, so one palette reads on Colab light
#    and Colab dark without a second set of values.

SANS = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif"
MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"

# One accent per notebook, indexed by section number, so a reader can tell at
# a glance which notebook a screenshot came from. Mid-saturation hues only:
# each has to hold its own against a white page and against Colab's #1e1e1e.
ACCENTS = [
    "#0ea5e9", "#6366f1", "#0891b2", "#7c3aed", "#059669", "#d97706",
    "#db2777", "#0d9488", "#2563eb", "#c2410c", "#9333ea", "#16a34a",
    "#e11d48", "#0284c7",
]


def accent(s: dict) -> str:
    return ACCENTS[int(s["n"]) % len(ACCENTS)]


def rgba(hex_colour: str, alpha: float) -> str:
    r, g, b = (int(hex_colour[i:i + 2], 16) for i in (1, 3, 5))
    return f"rgba({r},{g},{b},{alpha:g})"


def rule(colour: str) -> str:
    """The accent rule that opens a notebook: solid at the left, gone by the
    right margin."""
    return ('<div style="height:3px;border-radius:2px;margin:1.4em 0 1.6em;'
            f'background:linear-gradient(90deg,{colour},{rgba(colour, 0)})">'
            '</div>')


def eyebrow(text: str, colour: str) -> str:
    """Small caps, letter-spaced, in the accent: the format-and-length line."""
    return (f'<span style="font:700 11px/1.6 {MONO};letter-spacing:.18em;'
            f'color:{colour}">{text}</span>')


_CODE_RE = re.compile(r"`([^`]+)`")
_BOLD_RE = re.compile(r"\*\*(.+?)\*\*")
_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def inline_html(text: str) -> str:
    """The inline markdown the headers actually use, rendered as HTML.

    A styled `<div>` is a raw HTML block: nothing inside it is parsed as
    markdown, so `**bold**` written there reaches the reader as asterisks.
    Bold, code and links are the whole vocabulary `_variables.yml` uses.
    """
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # `<code>` needs no inline font: every renderer that strips <style> still
    # styles the tag itself.
    text = _CODE_RE.sub(lambda m: f"<code>{m.group(1)}</code>", text)
    text = _BOLD_RE.sub(lambda m: f"<b>{m.group(1)}</b>", text)
    return _LINK_RE.sub(lambda m: f'<a href="{m.group(2)}">{m.group(1)}</a>',
                        text)


def es_box(body_html: str) -> str:
    """The Spanish half of a bilingual block, set apart rather than merely
    indented.

    Deliberately neutral grey and not the notebook's accent: Spanish is not a
    kind of remark, it is the same remark, and colouring it would rank it.
    """
    return (
        '<div style="border-left:4px solid rgba(130,130,150,.5);'
        'background:rgba(130,130,150,.09);border-radius:0 8px 8px 0;'
        f'padding:12px 16px;margin:1.2em 0 1.8em;font:400 14.5px/1.7 {SANS}">'
        f'<div style="font:700 10.5px/1 {MONO};letter-spacing:.18em;'
        'opacity:.62;margin-bottom:10px">🇪🇸 ESPAÑOL</div>'
        f"{body_html}</div>"
    )


def es_prose(text: str) -> str:
    """`> 🇪🇸 ...` blockquote prose from _variables.yml, as a Spanish box.

    The leading flag is dropped -- the box carries its own label -- and blank
    lines become paragraph breaks.
    """
    lines = [re.sub(r"^>\s?", "", ln) for ln in text.strip().splitlines()]
    stripped = "\n".join(lines).strip()
    stripped = re.sub(r"^🇪🇸\s*", "", stripped)
    paragraphs = [p.strip().replace("\n", " ")
                  for p in re.split(r"\n\s*\n", stripped) if p.strip()]
    last = len(paragraphs) - 1
    body = "".join(
        f'<div style="margin:0 0 {"0" if i == last else ".7em"}">'
        f"{inline_html(p)}</div>"
        for i, p in enumerate(paragraphs))
    return es_box(body)


def es_list(items: list[str]) -> str:
    """A Spanish objectives list, as a Spanish box."""
    body = ('<ul style="margin:0;padding-left:1.2em">'
            + "".join(f'<li style="margin:.35em 0">{inline_html(i)}</li>'
                      for i in items)
            + "</ul>")
    return es_box(body)


# ── scaffolding ──────────────────────────────────────────────────────────────

def notebook_name(s: dict) -> str:
    return f"{s['n']}-{s['slug']}.ipynb"


def colab_url(s: dict) -> str:
    return f"{REPO['colab_base']}/{notebook_name(s)}"


def quiz_after(n: str) -> dict | None:
    return next((q for q in QUIZZES if q["after"] == n), None)


def is_extra(s: dict) -> bool:
    """An extra is what a section is missing: no `minutes` on the clock."""
    return "minutes" not in s


def next_notebook(s: dict) -> dict | None:
    """The notebook `s` hands off to — within its own group.

    Sections chain through the sections and stop at 11; extras chain through
    the extras. Section 11 must not point at extra 12: the workshop ends there,
    and the take-home deep dives are reached from the site, not from the end of
    the last section.
    """
    group = EXTRAS if is_extra(s) else SECTIONS
    return next((x for x in group if x["n"] > s["n"]), None)


def header_cell(s: dict) -> dict:
    badge = ("[![Open In Colab](https://colab.research.google.com/assets/"
             f"colab-badge.svg)]({colab_url(s)})")
    if s.get("format_line_en") and s.get("format_line_es"):
        fmt_line = f"{s['format_line_en']} / {s['format_line_es']}"
    elif s.get("format_line_en"):
        fmt_line = s["format_line_en"]
    else:
        # An extra has neither `part` nor `minutes` — it is not on the clock —
        # so both fall away and the line is the format alone.
        part = f"Part {s['part']} · " if s.get("part", "—") != "—" else ""
        mins = f" · {s['minutes']} min" if s.get("minutes") else ""
        fmt_line = f"{part}{s['format_en']}{mins}"

    a = accent(s)
    objs_en = "\n".join(f"- {o}" for o in s["objectives_en"])

    # The heading stays a real markdown heading: Colab builds its outline from
    # those, and a styled <div> title would leave the notebook unnavigable.
    if s.get("intro_en"):
        # Sections 01-11 and the extras: merged bilingual header. Intro
        # prose is authored in _variables.yml (intro_en / intro_es).
        return md(f"""# {s['n']} · {s['title_en']} / {s['title_es']}

{badge}

{rule(a)}

{eyebrow(fmt_line.upper(), a)}

{s['intro_en'].rstrip(chr(10))}

{es_prose(s['intro_es'])}

## What you will be able to do / Lo que podrás hacer

{objs_en}

{es_list(s['objectives_es'])}
""")

    # Section 00: single-language header with an ES summary callout.
    return md(f"""# {s['n']} · {s['title_en']}

{badge}

{rule(a)}

{eyebrow(fmt_line.upper(), a)}

{s['summary_en']}

{es_prose(f"**{s['title_es']}** — {s['summary_es']}")}

## What you will be able to do

{objs_en}

{es_list(s['objectives_es'])}
""")


def footer_cell(s: dict) -> dict:
    q = quiz_after(s["n"])
    site = REPO["site"]
    nxt = next_notebook(s)
    colour = accent(s)

    if s.get("intro_en"):
        return _footer_bilingual(q, nxt, site, accent(s), extra=is_extra(s))

    # Section 00: single-language footer.
    if q:
        body = f"""{rule(colour)}

## Time for Kahoot 🎯

**Kahoot {q['n']} — {q['title_en']}** · {q['questions']} questions, about 5 minutes.

{es_prose(f"**{q['title_es']}** — {q['questions']} preguntas, unos 5 minutos.")}

Join at **{V['kahoot']['join']}** with the PIN on the facilitator's screen.

- [Quiz details and facilitator notes]({site}/kahoot.html#quiz-{q['n']})
- [Import file (`.xlsx`)]({REPO['url']}/blob/{REPO['branch']}/{q['xlsx']})
"""
    else:
        body = (f"{rule(colour)}\n\n## Done with this section\n\n"
                f"{es_prose('**Fin de esta sección.**')}\n")
    if nxt:
        body += (f"\nNext up: **{nxt['n']} · {nxt['title_en']}** — "
                 f"[open in Colab]({colab_url(nxt)}).\n")
    else:
        body += "\nThat is the whole workshop. Thank you for coming.\n"
    body += (f"\n[← Back to the workshop site]({site}/) · "
             f"[All notebooks]({site}/notebooks.html) · "
             f"[Handbook]({site}/tensors_workshop_plan_with_quizzes.html)\n")
    return md(body)


def _footer_bilingual(q: dict | None, nxt: dict | None, site: str,
                      colour: str, extra: bool = False) -> dict:
    """Merged bilingual footer for sections 01-11 and for the extras.

    An extra never gets a Kahoot block — `q` is always None for one — and the
    last extra closes on a link back to the site rather than on the workshop's
    closing words, which belong to section 11 and are said once.
    """
    nav = ("[← Workshop site / Sitio del taller]"
           f"({site}/) · "
           "[All notebooks / Todos los notebooks]"
           f"({site}/notebooks.html) · "
           "[Handbook / Manual]"
           f"({site}/tensors_workshop_plan_with_quizzes.html)")

    parts = [rule(colour), ""]
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
            es_prose(f"Entra a **{V['kahoot']['join']}** con el PIN que "
                     "aparece en la pantalla del facilitador."),
            "",
            "- [Quiz details and facilitator notes]"
            f"({site}/kahoot.html#quiz-{q['n']})",
            "- [Import file (`.xlsx`)]"
            f"({REPO['url']}/blob/{REPO['branch']}/{q['xlsx']})",
            "",
        ]
    elif extra:
        parts += ["## Done with this deep dive / Fin de este estudio a fondo",
                  ""]
    elif nxt:
        parts += ["## Done with this section / Fin de esta sección", ""]
    else:
        parts += ["## Done with the workshop / Fin del taller 🎉", ""]

    if nxt and extra:
        parts += [
            f"Next deep dive / Siguiente estudio a fondo: **{nxt['n']} · "
            f"{nxt['title_en']} / {nxt['title_es']}** — "
            f"[open in Colab]({colab_url(nxt)}).",
            "",
        ]
    elif nxt:
        parts += [
            f"Next / Siguiente: **{nxt['n']} · {nxt['title_en']} / "
            f"{nxt['title_es']}** — [open in Colab]({colab_url(nxt)}).",
            "",
        ]
    elif extra:
        parts += [
            f"That is the last deep dive. The rest is back on "
            f"[the workshop site]({site}/).",
            "",
            es_prose("Ese es el último estudio a fondo. El resto está en "
                     f"[el sitio del taller]({site}/)."),
            "",
        ]
    else:
        parts += [
            WORKSHOP["closing_en"],
            "",
            es_prose(WORKSHOP["closing_es"]),
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
    the metadata used by every folded cell: cellView, jupyter.source_hidden
    and the solution/plumbing/hide-input tags.
    """
    metadata = cell.setdefault("metadata", {})
    for key in ("colab", "outputId", "executionInfo", "id"):
        metadata.pop(key, None)

    # Colab may drop cellView when saving a notebook back to GitHub.
    # Restore the metadata required to keep a folded cell folded. Two kinds
    # of cell are folded, and `hide-input` is what they share:
    #
    #   solution  -- an answer the reader should not see yet;
    #   plumbing  -- widget and plotting scaffolding whose output is the
    #                lesson and whose source is noise.
    #
    # The distinction is not cosmetic. Check 10 in check_links.py holds that
    # no visible cell may depend on a name only a *solution* binds, because a
    # reader may never open one. A plumbing cell carries no such rule: it is
    # meant to be run, and folding hides its source, not its execution.
    if "hide-input" in metadata.get("tags", []):
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

    for s in NOTEBOOKS:
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
    for s in NOTEBOOKS:
        nbformat.validate(nbformat.read(NBDIR / notebook_name(s), as_version=4))
    print(f"\nnbformat.validate: {len(NOTEBOOKS)}/{len(NOTEBOOKS)} valid "
          f"({len(SECTIONS)} sections, {len(EXTRAS)} extras)")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    sys.exit(main())
