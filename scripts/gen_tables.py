#!/usr/bin/env python3
"""Generate every section table on the site from _variables.yml.

The EN and ES landing pages, the notebooks page and the READMEs all show the
same 12 sections. Writing those tables by hand is how bilingual sites drift, so
they are generated here instead and included with `{{< include >}}`.

    uv run --with pyyaml python scripts/gen_tables.py

Outputs (all overwritten, none hand-edited):
    _includes/sections-en.md      _includes/sections-es.md
    _includes/notebooks-en.md
    _includes/agenda-en.md        _includes/agenda-es.md
    _includes/readme-sections.md  _includes/readme-sections-es.md
"""
from __future__ import annotations

import html
import pathlib
import sys

import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
INCLUDES = ROOT / "_includes"
V = yaml.safe_load((ROOT / "_variables.yml").read_text(encoding="utf-8"))

SECTIONS = [V["sections"][k] for k in sorted(V["sections"])]
QUIZZES = [V["kahoot"][k] for k in ("q1", "q2", "q3")]
REPO = V["repo"]

L = {
    "en": dict(
        num="#", section="Section", fmt="Format", min="Min",
        slides_en="Slides EN", slides_es="Slides ES", nb="Notebook", quiz="Kahoot",
        colab="Open in Colab", none="—",
        quiz_row="Kahoot {n} — {title} · {q} questions · 5 min",
        covers="covers sections {covers}",
        nb_head=("#", "Notebook", "Covers", "Colab"),
        agenda_head=("Start Time", "Duration (min)", "Part", "Segment Name"),
    ),
    "es": dict(
        num="#", section="Sección", fmt="Formato", min="Min",
        slides_en="Diapos EN", slides_es="Diapos ES", nb="Cuaderno", quiz="Kahoot",
        colab="Abrir en Colab", none="—",
        quiz_row="Kahoot {n} — {title} · {q} preguntas · 5 min",
        covers="cubre las secciones {covers}",
        nb_head=("#", "Cuaderno", "Contenido", "Colab"),
        agenda_head=("Hora de inicio", "Duración (min)", "Parte", "Segmento"),
    ),
}


def notebook_name(s: dict) -> str:
    return f"{s['n']}-{s['slug']}.ipynb"


def colab_url(s: dict) -> str:
    return f"{REPO['colab_base']}/{notebook_name(s)}"


def quiz_for(n: str) -> dict | None:
    """The quiz whose questions cover section `n`, if any."""
    return next((q for q in QUIZZES if n in q["covers"]), None)


def quiz_after(n: str) -> dict | None:
    """The quiz that runs immediately after section `n`, if any."""
    return next((q for q in QUIZZES if q["after"] == n), None)


def html_table(lang: str, prefix: str) -> str:
    """The full section table as raw HTML.

    Raw HTML rather than a pipe table because the three Kahoot checkpoints are
    full-width highlighted rows in the run order, which pandoc pipe tables
    cannot express.
    """
    t = L[lang]
    title_key, fmt_key = f"title_{lang}", f"format_{lang}"
    sum_key = f"summary_{lang}"
    heads = [t["num"], t["section"], t["fmt"], t["min"],
             t["slides_en"], t["slides_es"], t["nb"], t["quiz"]]

    # `table-responsive` keeps the table scrolling inside itself on a phone
    # rather than scrolling the whole page. Widening it past the body column is
    # not possible here — Quarto places <main> in `column-body` regardless of
    # page-layout — so custom.scss keeps the link cells on one line instead.
    out = ['<div class="table-responsive">',
           '<table class="table table-sm table-striped section-table">',
           "<thead><tr>" + "".join(f"<th>{html.escape(h)}</th>" for h in heads)
           + "</tr></thead>", "<tbody>"]

    for s in SECTIONS:
        n, slug = s["n"], s["slug"]
        anchor = f"sec-{n}-{slug}"
        nb = notebook_name(s)
        q = quiz_for(n)
        qcell = (f'<a href="{prefix}kahoot.html#quiz-{q["n"]}">Q{q["n"]}</a>'
                 if q else t["none"])
        out += [
            "<tr>",
            f'<td>{n}</td>',
            f'<td><strong>{html.escape(s[title_key])}</strong><br>'
            f'<small>{html.escape(s[sum_key])}</small></td>',
            f'<td>{html.escape(s[fmt_key])}</td>',
            f'<td>{s["minutes"]}</td>',
            f'<td><a href="{prefix}slides/en/#{anchor}">EN</a></td>',
            f'<td><a href="{prefix}slides/es/#{anchor}">ES</a></td>',
            f'<td><a href="{colab_url(s)}" title="{html.escape(t["colab"])}">Colab</a>'
            f' · <a href="{REPO["url"]}/blob/{REPO["branch"]}/notebooks/{nb}">src</a></td>',
            f"<td>{qcell}</td>",
            "</tr>",
        ]
        after = quiz_after(n)
        if after:
            label = t["quiz_row"].format(
                n=after["n"], title=html.escape(after[title_key]), q=after["questions"])
            covers = t["covers"].format(covers=", ".join(after["covers"]))
            out += [
                '<tr class="kahoot-row">',
                f'<td>🎯</td><td colspan="7"><a href="{prefix}kahoot.html#quiz-{after["n"]}">'
                f"{label}</a> — <small>{covers}</small></td>",
                "</tr>",
            ]

    out += ["</tbody></table></div>"]
    return "\n".join(out) + "\n"


def notebooks_table(lang: str) -> str:
    t = L[lang]
    title_key, sum_key = f"title_{lang}", f"summary_{lang}"
    rows = ["| " + " | ".join(t["nb_head"]) + " |", "|---|---|---|---|"]
    for s in SECTIONS:
        badge = (f"[![Open In Colab](https://colab.research.google.com/assets/"
                 f"colab-badge.svg)]({colab_url(s)})")
        rows.append(
            f"| {s['n']} | [`{notebook_name(s)}`]"
            f"({REPO['url']}/blob/{REPO['branch']}/notebooks/{notebook_name(s)}) "
            f"| {s[title_key]} — {s[sum_key]} | {badge} |")
    return "\n".join(rows) + "\n"


def agenda_table(lang: str) -> str:
    """The agenda both decks show, as a pipe table.

    Every number in it — start time, duration, Part — is derived by
    timeline.py; `_variables.yml` only says which segments share a row and what
    to call them. The clock used to be written out by hand in both decks, where
    the check that verifies each section's start/end could not see it: bump a
    `minutes` and the rows below it kept the old times while the heading above
    them, a `{{< var >}}`, updated. A facilitator got two schedules.
    """
    from timeline import agenda_rows  # noqa: PLC0415  (sibling module)

    t = L[lang]
    rows = ["| " + " | ".join(t["agenda_head"]) + " |", "|---|---|---|---|"]
    for r in agenda_rows(lang):
        rows.append(f"| {r['start']} | {r['minutes']} | {r['part']} "
                    f"| {r['label']} |")
    return "\n".join(rows) + "\n"


def readme_table(lang: str) -> str:
    """Markdown table for the READMEs — absolute URLs, since GitHub renders
    these outside the site."""
    site = REPO["site"]
    title_key = f"title_{lang}"
    head = (("#", "Section", "Slides EN", "Slides ES", "Notebook", "Quiz")
            if lang == "en" else
            ("#", "Sección", "Diapos EN", "Diapos ES", "Cuaderno", "Quiz"))
    rows = ["| " + " | ".join(head) + " |", "|---|---|---|---|---|---|"]
    for s in SECTIONS:
        anchor = f"sec-{s['n']}-{s['slug']}"
        q = quiz_for(s["n"])
        qc = f"[Q{q['n']}]({site}/kahoot.html#quiz-{q['n']})" if q else "—"
        rows.append(
            f"| {s['n']} | {s[title_key]} "
            f"| [EN]({site}/slides/en/#{anchor}) | [ES]({site}/slides/es/#{anchor}) "
            f"| [Colab]({colab_url(s)}) | {qc} |")
    return "\n".join(rows) + "\n"


BANNER = ("<!-- GENERATED by scripts/gen_tables.py from _variables.yml. "
          "Do not edit by hand. -->\n")


def inject(path: pathlib.Path, marker: str, body: str) -> None:
    """Replace the text between <!-- BEGIN marker --> and <!-- END marker -->.

    The READMEs are rendered by GitHub, not Quarto, so they cannot use
    `{{< include >}}` — the same tables have to be written into the files. This
    keeps them generated rather than hand-maintained.
    """
    begin, end = f"<!-- BEGIN {marker} -->", f"<!-- END {marker} -->"
    text = path.read_text(encoding="utf-8")
    if begin not in text or end not in text:
        sys.exit(f"{path}: missing {begin} / {end} markers")
    head, rest = text.split(begin, 1)
    _, tail = rest.split(end, 1)
    path.write_text(f"{head}{begin}\n{body}{end}{tail}", encoding="utf-8")
    print(f"  injected {marker} into {path.relative_to(ROOT)}")


def main() -> int:
    from timeline import ScheduleError, total_minutes  # noqa: PLC0415

    INCLUDES.mkdir(exist_ok=True)
    try:
        written = {
            "sections-en.md": BANNER + html_table("en", ""),
            "sections-es.md": BANNER + html_table("es", "../"),
            "notebooks-en.md": BANNER + notebooks_table("en"),
            "agenda-en.md": BANNER + "\n" + agenda_table("en"),
            "agenda-es.md": BANNER + "\n" + agenda_table("es"),
            "readme-sections.md": BANNER + readme_table("en"),
            "readme-sections-es.md": BANNER + readme_table("es"),
        }
    except ScheduleError as e:
        # Nothing is written on the way out: half-regenerated includes would
        # leave the two decks disagreeing, which is the failure this whole
        # change exists to make impossible.
        sys.exit(str(e))
    for name, body in written.items():
        (INCLUDES / name).write_text(body, encoding="utf-8")
        print(f"  wrote _includes/{name}")
    readme, nb_readme = ROOT / "README.md", ROOT / "notebooks" / "README.md"
    if readme.exists():
        inject(readme, "sections-en", readme_table("en"))
        inject(readme, "sections-es", readme_table("es"))
    if nb_readme.exists():
        inject(nb_readme, "notebooks", notebooks_table("en"))

    taught = sum(s["minutes"] for s in SECTIONS)
    print(f"{len(SECTIONS)} sections, {len(QUIZZES)} quizzes, "
          f"{taught} taught + {total_minutes() - taught} quiz and break "
          f"= {total_minutes()} min")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    sys.exit(main())
