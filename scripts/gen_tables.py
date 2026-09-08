#!/usr/bin/env python3
"""Generate every section table on the site from _variables.yml.

The EN and ES notebooks pages and the READMEs all show the same thirteen
sections. Writing those tables by hand is how bilingual sites drift, so they
are generated here instead and included with `{{< include >}}`.

The `extras` — take-home deep dives that are not sections — get their own three
tables. They are deliberately narrower: no Slides column, because an extra has
no `#sec-NN` anchor in either deck, and no Quiz column, because no Kahoot
covers one.

    uv run --with pyyaml python scripts/gen_tables.py

It also owns marker-delimited regions inside four hand-written files: the
section and extras tables in `README.md` and `notebooks/README.md`, and the
schedule table in each language's handbook.

Outputs (all overwritten, none hand-edited):
    _includes/notebooks-en.md     _includes/notebooks-es.md
    _includes/notebooks-extra-en.md  _includes/notebooks-extra-es.md
    _includes/agenda-en.md        _includes/agenda-es.md
    _includes/readme-sections.md  _includes/readme-sections-es.md
    _includes/extras-en.md        _includes/extras-es.md
    _includes/companion-video-en.md          _includes/companion-video-es.md
    _includes/companion-audio-en.md          _includes/companion-audio-es.md
    _includes/companion-infographics-en.md
    _includes/companion-infographics-es.md
    _includes/companion-selfcheck-en.md      _includes/companion-selfcheck-es.md
    _includes/companion-map-en.md            _includes/companion-map-es.md
    _includes/references-en.md    _includes/references-es.md
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
EXTRAS = [V["extras"][k] for k in sorted(V.get("extras", {}))]
QUIZZES = [V["kahoot"][k] for k in ("q1", "q2", "q3")]
REPO = V["repo"]
COMPANION = V["companion"]
READING = V["reading"]
REFERENCES = V["references"]

L = {
    "en": dict(
        nb_head=("#", "Notebook", "Covers", "Colab"),
        extra_head=("#", "Deep dive", "Colab"),
        agenda_head=("Start Time", "Duration (min)", "Part", "Segment Name"),
    ),
    "es": dict(
        nb_head=("#", "Cuaderno", "Contenido", "Colab"),
        extra_head=("#", "Estudio a fondo", "Colab"),
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


def extras_notebooks_table(lang: str) -> str:
    """The extras, for the notebooks page — same shape as `notebooks_table`
    with the Covers column folded into the Deep dive one, since three columns
    is all an extra has to say."""
    t = L[lang]
    title_key, sum_key = f"title_{lang}", f"summary_{lang}"
    rows = ["| " + " | ".join(t["extra_head"]) + " |", "|---|---|---|"]
    for s in EXTRAS:
        badge = (f"[![Open In Colab](https://colab.research.google.com/assets/"
                 f"colab-badge.svg)]({colab_url(s)})")
        rows.append(
            f"| {s['n']} | [`{notebook_name(s)}`]"
            f"({REPO['url']}/blob/{REPO['branch']}/notebooks/{notebook_name(s)}) "
            f"— {s[title_key]} — {s[sum_key]} | {badge} |")
    return "\n".join(rows) + "\n"


def extras_readme_table(lang: str) -> str:
    """The extras, for the READMEs — absolute URLs, and no Slides or Quiz
    column, because an extra has neither."""
    t = L[lang]
    title_key = f"title_{lang}"
    rows = ["| " + " | ".join(t["extra_head"]) + " |", "|---|---|---|"]
    for s in EXTRAS:
        rows.append(f"| {s['n']} | {s[title_key]} "
                    f"| [Colab]({colab_url(s)}) |")
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


def handbook_schedule_table(lang: str = "en") -> str:
    """The handbook's schedule, and the only key to its own vocabulary.

    The handbook numbers its teaching by Part I-IV and Block 1-7; everything
    else on the site numbers it by section 00-12. A reader who meets "Block 4"
    in the prose has no way to reach notebook 07 unless one table shows both,
    so this is that table, and it is generated rather than written because the
    hand-written one it replaces carried no section numbers at all and its
    times could drift from the clock the decks print.

    Both languages get one, from the same walk of the clock: `lang` picks the
    column headings, the segment titles and the word for a break, and nothing
    else differs between them.

    It walks `timeline.atoms()` — the same run order as the agenda, but one row
    per segment rather than per agenda row, because the handbook's own headings
    are per segment.
    """
    from timeline import ScheduleError, atoms, clock  # noqa: PLC0415

    for s in SECTIONS:
        if "block" not in s:
            raise ScheduleError(
                f"_variables.yml `sections`: section {s['n']} has no `block` — "
                'every section needs one, "—" if it is not one of the six '
                "exercise blocks")
    by_n = {s["n"]: s for s in SECTIONS}
    by_q = {f"q{q['n']}": q for q in QUIZZES}
    title_key, fmt_key = f"title_{lang}", f"format_{lang}"
    head = HANDBOOK_HEAD[lang]
    rows = ["| " + " | ".join(head) + " |", "|---|---|---|---|---|---|---|"]
    minute = 0
    for name, length in atoms():
        if s := by_n.get(name):
            cells = (f"**{s['n']}**", s["part"], s["block"],
                     f"[{s[title_key]}]({colab_url(s)})", s[fmt_key])
        elif q := by_q.get(name):
            cells = ("—", "🎯", "—",
                     f"**Kahoot {q['n']} — {q[title_key]}**", "quiz")
        else:
            cells = ("—", "—", "—", HANDBOOK_BREAK[lang], "—")
        rows.append("| " + " | ".join(cells)
                    + f" | {length} | {clock(minute)} |")
        minute += length
    return "\n".join(rows) + "\n"


HANDBOOK_HEAD = {
    "en": ("#", "Part", "Block", "Segment", "Format", "Min", "Start"),
    "es": ("#", "Parte", "Bloque", "Segmento", "Formato", "Min", "Inicio"),
}
HANDBOOK_BREAK = {"en": "Break", "es": "Pausa"}


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


FENCE = "```"


def poster(prefix: str, thumb: str, alt: str, url: str, where: str) -> str:
    """A committed screenshot, linked to the artifact it is a picture of.

    The shape every unexportable artifact on this page ends up in: NotebookLM
    will not give us the thing itself, so what the site serves is a PNG of it
    and a link through to the real one. The image is ours -- no account, no
    third party, and it still shows something if the notebook is later
    deleted -- and the click is theirs.

    `where` names the field for the error message: an alt with a double quote
    in it would end the `{fig-alt="…"}` attribute early and truncate itself,
    silently, the same trap infographics_gallery() guards.
    """
    return f'[{image(prefix, thumb, alt, where)}]({url})'


def image(prefix: str, thumb: str, alt: str, where: str, cls: str = "") -> str:
    """A committed screenshot with its alt text, and the guard on that text.

    Every `{fig-alt="…"}` on this page is built here, so the double-quote
    check happens once: a bare quote in the alt ends the attribute early and
    truncates it with nothing to show for it, and a second copy of the guard
    is a second message to keep in step with the first.
    """
    if '"' in alt:
        sys.exit(f"companion.{where}: thumb_alt contains a double quote; "
                 f"use typographic quotes")
    return f'![]({prefix}{thumb}){{{cls + " " if cls else ""}fig-alt="{alt}"}}'



def video_block(lang: str, prefix: str) -> str:
    """The companion's Video Overview, as a raw-HTML embed.

    Generated rather than written into the two pages with a `{{< var >}}`,
    for two reasons. A shortcode inside a raw HTML attribute does not survive
    pandoc -- it ends the tag at the `>` in `>}}`, and the whole iframe comes
    out as smart-quoted literal text -- and the id may not exist yet, in which
    case an embed URL with nothing after `embed/` is a broken player. Here the
    substitution happens in Python and the missing case has somewhere to go.

    Three states, in order of preference: the YouTube embed, which needs no
    account; failing that a direct link to the artifact in NotebookLM, which
    plays but asks for one; failing both, the note that there is nothing yet.

    In that middle state a `thumb` -- a poster frame committed under images/ --
    turns the link into something that looks like a video. The embed does not
    use it: YouTube ships its own poster, and a second one underneath would
    only be a thing to get out of date.
    """
    v = COMPANION["video"]
    vid = v.get(f"youtube_id_{lang}") or ""
    title = v[f"title_{lang}"]
    if not vid:
        url = v.get(f"url_{lang}") or ""
        if url:
            mins = v.get(f"minutes_{lang}") or 0
            thumb = v.get("thumb") or ""
            head = ""
            if thumb:
                alt = v.get(f"thumb_alt_{lang}") or title
                head = ("::: {.poster-frame}\n"
                        + poster(prefix, thumb, alt, url, "video")
                        + "\n:::\n\n")
            return head + {
                "en": (f"**[{title}]({url})** — "
                       + (f"{mins} minutes. " if mins else "")
                       + "It has not been re-uploaded to YouTube yet, so this "
                         "one plays inside NotebookLM and will ask you for a "
                         "Google account. When the upload lands it will play "
                         "here instead, with no account and no sign-in.\n"),
                "es": (f"**[{title}]({url})** — "
                       + (f"{mins} minutos. " if mins else "")
                       + "Todavía no se ha subido a YouTube, así que este se "
                         "reproduce dentro de NotebookLM y te pedirá una "
                         "cuenta de Google. Cuando esté subido se reproducirá "
                         "aquí mismo, sin cuenta y sin iniciar sesión.\n"),
            }[lang]
        return {
            "en": "*Not published yet.* The video overview is generated in "
                  "NotebookLM and re-uploaded to YouTube; until then there is "
                  "nothing here that works without a Google account.\n",
            "es": "*Todavía sin publicar.* El resumen en vídeo se genera en "
                  "NotebookLM y se sube a YouTube; hasta entonces no hay aquí "
                  "nada que funcione sin una cuenta de Google.\n",
        }[lang]
    # youtube-nocookie, deliberately: the player sets no tracking cookie until
    # the visitor actually presses play.
    watch = {"en": "Watch on YouTube", "es": "Ver en YouTube"}[lang]
    mins = v.get(f"minutes_{lang}") or 0
    meta = {"en": f"{mins} minutes", "es": f"{mins} minutos"}[lang] if mins else ""
    line = f"{meta} · " if meta else ""
    return (
        f"{FENCE}{{=html}}\n"
        f'<div class="video-frame">\n'
        f'<iframe src="https://www.youtube-nocookie.com/embed/{vid}"\n'
        f'        title="{html.escape(title, quote=True)}"\n'
        f'        loading="lazy" allowfullscreen\n'
        f'        referrerpolicy="strict-origin-when-cross-origin"></iframe>\n'
        f"</div>\n"
        f"{FENCE}\n\n"
        f"{line}[{watch}](https://www.youtube.com/watch?v={vid})\n")


def audio_block(lang: str, prefix: str) -> str:
    """The companion's Audio Overview, as a plain `<audio controls>`.

    The file is committed and served from `media/`, so this works logged out.
    check_links.py harvests `src` from every tag, which means a path listed
    here that is not actually in `docs/` fails the build -- exactly the gate
    we want on a hand-exported asset.
    """
    a = COMPANION["audio"]
    f = a.get(f"file_{lang}") or ""
    title = a[f"title_{lang}"]
    mins = a.get(f"minutes_{lang}") or 0
    thumb = a.get("thumb") or ""
    alt = a.get(f"thumb_alt_{lang}") or title
    if not f:
        url = a.get(f"url_{lang}") or ""
        if url:
            # The middle state, matching the video's: the artifact plays in
            # NotebookLM today and costs a Google account, and the cover is
            # ours and costs nothing.
            head = ("::: {.poster-frame}\n"
                    + poster(prefix, thumb, alt, url, "audio")
                    + "\n:::\n\n") if thumb else ""
            return head + {
                "en": (f"**[{title}]({url})** — "
                       + (f"{mins} minutes. " if mins else "")
                       + "It has not been exported yet, so this one plays "
                         "inside NotebookLM and will ask you for a Google "
                         "account. Once the file is downloaded and committed "
                         "it will play here instead, with no account and no "
                         "third party.\n"),
                "es": (f"**[{title}]({url})** — "
                       + (f"{mins} minutos. " if mins else "")
                       + "Todavía no se ha exportado, así que este se "
                         "reproduce dentro de NotebookLM y te pedirá una "
                         "cuenta de Google. Cuando el archivo esté descargado "
                         "y guardado aquí sonará en esta misma página, sin "
                         "cuenta y sin terceros.\n"),
            }[lang]
        return {
            "en": "*Not exported yet.* NotebookLM's Audio Overview downloads "
                  "as a file, so when it lands it will play right here, with "
                  "no account and no third party.\n",
            "es": "*Todavía sin exportar.* El resumen en audio de NotebookLM "
                  "se descarga como archivo, así que cuando esté sonará aquí "
                  "mismo, sin cuenta y sin terceros.\n",
        }[lang]
    meta = ({"en": f"\n\n{mins} minutes.\n", "es": f"\n\n{mins} minutos.\n"}[lang]
            if mins else "")
    # With the file committed there is nothing left to link to, so the cover
    # art is a plain image: the player below it is the thing to click.
    cover = (image(prefix, thumb, alt, "audio", ".audio-cover") + "\n\n"
             if thumb else "")
    return cover + (
        f"{FENCE}{{=html}}\n"
        f'<audio class="companion-audio" controls preload="none"\n'
        f'       src="{prefix}{f}"></audio>\n'
        f"{FENCE}\n{meta}")


# Said under every screenshot of an artifact that cannot be exported. The
# picture is a still of something live, and a page that lets a reader think
# otherwise has mis-sold the click.
SHOT_NOTE = {
    "en": "Screenshot — the real one is interactive, in NotebookLM.",
    "es": "Captura de pantalla; el de verdad es interactivo, en NotebookLM.",
}

# The invitation to look before you click. It belongs here, above the cards it
# describes, rather than in the two .qmd pages -- with no thumb exported there
# are no pictures, and a page promising some is the small lie that makes the
# big warning at the top of it less believable. Exactly the reason
# infographics_gallery() keeps its own "click one to open it full size" behind
# `if exported`.
SHOT_INTRO = {
    "en": "The pictures are screenshots, served from this site, so you can "
          "see what is behind each link before you spend an account on it.",
    "es": "Las imágenes son capturas de pantalla, servidas desde este sitio, "
          "para que veas qué hay detrás de cada enlace antes de gastar una "
          "cuenta en él.",
}

# Carried on the card itself rather than only in the prose above it. Every
# heading on this page is a linked anchor, so a reader can arrive at `#map`
# with none of the page's earlier warnings behind them.
ACCOUNT_NOTE = {
    "en": "Opens in NotebookLM; needs a Google account.",
    "es": "Se abre en NotebookLM; pide una cuenta de Google.",
}

# An artifact whose `url_*` is still `default_url` has no share link of its own
# yet, so the card would drop a reader at the notebook's front door under a
# heading promising a quiz. The front door is also the one URL here that
# redirects to a Google sign-in, so the mis-sell is not hypothetical. Said on
# the card, because a heading on this page is a linked anchor and a reader can
# arrive at it with none of the page's prose behind them.
PLACEHOLDER_NOTE = {
    "en": "No share link of its own yet — this opens the notebook, not the "
          "artifact.",
    "es": "Todavía sin enlace propio: esto abre el cuaderno, no el artefacto.",
}


def infographics_gallery(lang: str, prefix: str) -> str:
    """The companion's infographic gallery, as `.info-card`s in an `.info-strip`.

    Generated for the same reason the section tables are: the EN and ES
    galleries must show the same PNGs in the same order, and hand-maintaining
    two copies of that is how they stop agreeing. Each card is one exported
    file plus the artifact it came from.

    An entry with a `file` is an exported PNG and becomes a card. An entry
    with no `file` is one that has not been exported yet: it still has an
    artifact URL, so it is published as a link into NotebookLM -- which asks
    for a Google account -- rather than withheld until the export happens.
    Those need no `alt_*`, having no image to describe.

    While `companion.infographics` is empty -- nothing published at all --
    this emits the honest version of the section rather than nothing at all,
    so the page never has a heading with a hole under it.
    """
    items = COMPANION.get("infographics") or []
    if not items:
        pending = {
            "en": ("*Not exported yet.* The infographics live in "
                   f"[the notebook]({COMPANION['notebook_url']}) until they "
                   "are exported as PNGs and committed here; that link needs "
                   "a Google account, and these pages will not."),
            "es": ("*Todavía sin exportar.* Las infografías están en "
                   f"[el cuaderno]({COMPANION['notebook_url']}) hasta que se "
                   "exporten como PNG y se guarden aquí; ese enlace pide una "
                   "cuenta de Google, y estas páginas no lo harán."),
        }
        return pending[lang] + "\n"

    title_key, alt_key = f"title_{lang}", f"alt_{lang}"
    seen = {"en": "See it in NotebookLM", "es": "Verla en NotebookLM"}[lang]
    for n, i in enumerate(items, 1):
        # These entries are pasted in by hand from the template in
        # _variables.yml, so a forgotten `alt_es` is the likeliest mistake
        # here -- and a bare KeyError names the field without saying which
        # entry or what to do about it.
        required = ("url", title_key)
        if i.get("file"):
            required += ("file", alt_key)
        missing = [k for k in required if not i.get(k)]
        if missing:
            sys.exit(f"companion.infographics[{n}] "
                     f"({i.get('file') or i.get(title_key) or 'no file'}): "
                     f"missing {', '.join(missing)}")
    exported = [i for i in items if i.get("file")]
    linked = [i for i in items if not i.get("file")]

    out = []
    # The invitation to click belongs here rather than under the heading in
    # the page: with nothing exported there is nothing to click, and a page
    # that says otherwise is the small lie that makes the big warning at the
    # top of it less believable.
    if exported:
        out += [{"en": "Click one to open it full size. These are PNG "
                       "exports, served from this site.",
                 "es": "Haz clic en una para abrirla a tamaño completo. Son "
                       "exportaciones en PNG, servidas desde este sitio."}[lang],
                "", "::: {.info-strip}"]
        for i in exported:
            alt = i[alt_key]
            if '"' in alt:
                # The alt lands inside a `{fig-alt="…"}` attribute, where a
                # bare double quote ends it early and silently truncates it.
                sys.exit(f"companion.infographics: {alt_key} for {i['file']} "
                         f"contains a double quote; use typographic quotes")
            out += [
                "::: {.info-card}",
                f"![]({prefix}{i['file']})"
                f'{{.lightbox group="infographics" fig-alt="{alt}"}}',
                "",
                f"**{i[title_key]}**<br>[{seen}]({i['url']})",
                ":::",
            ]
        out.append(":::")
    if linked:
        if exported:
            out.append("")
        out += [{"en": "Not exported yet, so these open in NotebookLM:",
                 "es": "Todavía sin exportar, así que estas se abren en "
                       "NotebookLM:"}[lang],
                "", "::: {.info-strip}"]
        for i in linked:
            out += ["::: {.info-card}",
                    f"**[{i[title_key]}]({i['url']})**",
                    f"<br>[{ACCOUNT_NOTE[lang]}]{{.shot-note}}",
                    ":::"]
        out.append(":::")
    return "\n".join(out) + "\n"


# What each link-only artifact is, and when a student would reach for it.
# It lives here rather than in the two .qmd pages for the reason every other
# table on this site does: written twice, EN and ES come to say different
# things about the same artifact, and nothing would catch it.
# Counts and shapes checked against the artifacts themselves on 2026-09-07,
# not guessed from what NotebookLM was asked for: the quiz is a fixed 26
# questions rather than an endless generator, the deck is 60 cards, and the
# mind map opens on five branches rather than on the workshop's thirteen
# sections. Copy that oversells what is behind a link is the failure this
# whole page is built to avoid.
LINK_COPY = {
    "quiz": {
        "en": ("Twenty-six generated multiple-choice questions across the "
               "whole workshop.",
               "After the session, to find out which sections did not stick."),
        "es": ("Veintiséis preguntas de opción múltiple generadas sobre todo "
               "el taller.",
               "Después de la sesión, para descubrir qué secciones no se te "
               "quedaron."),
    },
    "flashcards": {
        "en": ("Sixty cards, question on one side and answer on the other, "
               "over the linear algebra as well as the tensors.",
               "Spaced repetition, in the weeks after."),
        "es": ("Sesenta tarjetas, pregunta por un lado y respuesta por el "
               "otro, sobre el álgebra lineal además de los tensores.",
               "Repetición espaciada, en las semanas siguientes."),
    },
    "mindmap": {
        "en": ("Five branches off one root — defining tensors, storing data, "
               "moving axes, factorizing, computing — each opening further.",
               "Once, early: seeing the whole ladder before you climb it "
               "makes the middle rungs less arbitrary."),
        "es": ("Cinco ramas de una sola raíz —definir tensores, almacenar "
               "datos, mover ejes, factorizar, calcular—, y cada una se abre "
               "más.",
               "Una vez, pronto: ver la escalera entera antes de subirla hace "
               "que los peldaños del medio parezcan menos arbitrarios."),
    },
}

def link_cards(lang: str, prefix: str, names: tuple[str, ...]) -> str:
    """The quiz, the flashcards and the mind map, as `.info-card`s.

    These three are the artifacts NotebookLM does not let you export at all,
    so unlike the infographics there will never be a file to serve: the card
    is a committed screenshot linked through to the live artifact, and the
    caption says which of the two you are looking at.

    A card without a `thumb` is still a card -- title, what it is, when to use
    it -- because the copy is the half that does not depend on the export. It
    just has no picture yet, and the sentence promising pictures stays off the
    page until one of them has one.
    """
    cards = [COMPANION[name] for name in names]
    out = []
    if any(c.get("thumb") for c in cards):
        out += [SHOT_INTRO[lang], ""]
    out.append("::: {.info-strip}")
    for name, a in zip(names, cards):
        title, url = a[f"title_{lang}"], a[f"url_{lang}"]
        what, when = LINK_COPY[name][lang]
        thumb = a.get("thumb") or ""
        out.append("::: {.info-card}")
        if thumb:
            alt = a.get(f"thumb_alt_{lang}") or title
            out += [poster(prefix, thumb, alt, url, name), ""]
        note = ACCOUNT_NOTE[lang]
        if url == COMPANION["default_url"]:
            note += " " + PLACEHOLDER_NOTE[lang]
        out += [f"**[{title}]({url})**<br>{what}<br>*{when}*",
                f"<br>[{note}"
                + (f" {SHOT_NOTE[lang]}" if thumb else "")
                + "]{.shot-note}"]
        out.append(":::")
    out.append(":::")
    return "\n".join(out) + "\n"


REF_L = {
    "en": dict(
        also="Author pages",
        blog_home="Every post lives on [{title}]({url}).",
    ),
    "es": dict(
        also="Páginas de autor",
        blog_home="Todas las entradas están en [{title}]({url}).",
    ),
}


def reference_item(i: dict, lang: str) -> str:
    """One bibliography entry, as a Markdown bullet.

    Every field but `title`, `url` and the note is optional, and the shape of
    the line follows what is present: a book has no `year` and no `where`, a
    package has no `authors` at all. Assembling it from parts here is why the
    ES page cannot end up with an entry the EN page does not have, or with
    the same entry cited differently.
    """
    title = f"`{i['title']}`" if i.get("code") else f"*{i['title']}*"
    head = f"[{title}]({i['url']})"
    if authors := i.get("authors"):
        year = f" ({i['year']})." if i.get("year") else " —"
        head = f"{authors}{year} {head}"
    if where := i.get("where"):
        head += f", {where}"
    line = f"- {head} — {i[f'note_{lang}'].strip()}."
    if also := i.get("also"):
        links = " · ".join(f"[{a['name']}]({a['url']})" for a in also)
        line += f"<br>\n  <small>{REF_L[lang]['also']}: {links}</small>"
    return line


def references_list(lang: str) -> str:
    """The whole references page below its intro: every group, both languages.

    Generated for the same reason the section tables are. This list was the
    handbook's `## Further Reading`, in English only; making it a page meant
    making it bilingual, and two hand-maintained bibliographies is two
    bibliographies that disagree within a month.

    Group headings carry an explicit `{#ref-…}` id rather than letting pandoc
    derive one from the title, because the titles differ by language and
    anything linking in — the handbook, the READMEs — must not.
    """
    t = REF_L[lang]
    spine = REFERENCES["spine"]
    # `{{URL}}` rather than a bare `URL`: the notes are prose, and a future
    # one that simply uses the word ("a DOI rather than a URL") would
    # otherwise have it silently rewritten into the deeplearningbook link.
    # check_references() could not catch that — it happens in both
    # languages identically, so the parity comparison still passes.
    out = [spine[f"note_{lang}"].strip().replace("{{URL}}",
                                                 spine["chapter_url"]), ""]

    for g in REFERENCES["groups"]:
        out += [f"## {g[f'title_{lang}']} {{#{g['anchor']}}}", "",
                g[f"note_{lang}"].strip(), ""]
        if items := g.get("items"):
            out += [reference_item(i, lang) for i in items]
        else:
            # A `reading:` group cites the blog posts by their key in
            # `reading:`, so the URL is declared exactly once in the whole
            # repo and check_links.py's "every ml-blog URL is declared" rule
            # has nothing to make an exception for here.
            home = READING["home"]
            out += [t["blog_home"].format(title=home[f"title_{lang}"],
                                          url=home["url"]), ""]
            for key in g["reading"]:
                r = READING[key]
                out.append(f"- [{r[f'title_{lang}']}]({r['url']})")
        out.append("")

    return "\n".join(out).rstrip() + "\n"


BANNER = ("<!-- GENERATED by scripts/gen_tables.py from _variables.yml. "
          "Do not edit by hand. -->\n")


def inject(path: pathlib.Path, marker: str, body: str) -> None:
    """Replace the text between <!-- BEGIN marker --> and <!-- END marker -->.

    The READMEs are rendered by GitHub, not Quarto, so they cannot use
    `{{< include >}}` — the same tables have to be written into the files. This
    keeps them generated rather than hand-maintained. The handbook *is* a
    Quarto page and could use `{{< include >}}`, but it is also read raw on
    GitHub, where a shortcode shows as literal text — so it gets a marker
    region too.
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
            "notebooks-en.md": BANNER + notebooks_table("en"),
            "notebooks-es.md": BANNER + notebooks_table("es"),
            "notebooks-extra-en.md": BANNER + extras_notebooks_table("en"),
            "notebooks-extra-es.md": BANNER + extras_notebooks_table("es"),
            "agenda-en.md": BANNER + "\n" + agenda_table("en"),
            "agenda-es.md": BANNER + "\n" + agenda_table("es"),
            "readme-sections.md": BANNER + readme_table("en"),
            "readme-sections-es.md": BANNER + readme_table("es"),
            "extras-en.md": BANNER + extras_readme_table("en"),
            "extras-es.md": BANNER + extras_readme_table("es"),
            "companion-video-en.md": BANNER + video_block("en", ""),
            "companion-video-es.md": BANNER + video_block("es", "../"),
            "companion-audio-en.md": BANNER + audio_block("en", ""),
            "companion-audio-es.md": BANNER + audio_block("es", "../"),
            "companion-infographics-en.md":
                BANNER + infographics_gallery("en", ""),
            "companion-infographics-es.md":
                BANNER + infographics_gallery("es", "../"),
            "companion-selfcheck-en.md":
                BANNER + link_cards("en", "", ("quiz", "flashcards")),
            "companion-selfcheck-es.md":
                BANNER + link_cards("es", "../", ("quiz", "flashcards")),
            "companion-map-en.md":
                BANNER + link_cards("en", "", ("mindmap",)),
            "companion-map-es.md":
                BANNER + link_cards("es", "../", ("mindmap",)),
            "references-en.md": BANNER + references_list("en"),
            "references-es.md": BANNER + references_list("es"),
        }
        handbook_schedule = {la: handbook_schedule_table(la)
                             for la in ("en", "es")}
    except ScheduleError as e:
        # Nothing is written on the way out: half-regenerated includes would
        # leave the two decks disagreeing, which is the failure this whole
        # change exists to make impossible.
        sys.exit(str(e))
    for name, body in written.items():
        (INCLUDES / name).write_text(body, encoding="utf-8")
        print(f"  wrote _includes/{name}")
    for la, rel in (("en", "tensors_workshop_plan_with_quizzes.md"),
                    ("es", "es/tensors_workshop_plan_with_quizzes.md")):
        handbook = ROOT / rel
        if handbook.exists():
            inject(handbook, "handbook-schedule", handbook_schedule[la])
    readme, nb_readme = ROOT / "README.md", ROOT / "notebooks" / "README.md"
    if readme.exists():
        inject(readme, "sections-en", readme_table("en"))
        inject(readme, "sections-es", readme_table("es"))
        inject(readme, "extras-en", extras_readme_table("en"))
        inject(readme, "extras-es", extras_readme_table("es"))
    if nb_readme.exists():
        inject(nb_readme, "notebooks", notebooks_table("en"))

    taught = sum(s["minutes"] for s in SECTIONS)
    print(f"{len(SECTIONS)} sections, {len(QUIZZES)} quizzes, "
          f"{taught} taught + {total_minutes() - taught} quiz and break "
          f"= {total_minutes()} min")
    print(f"{len(EXTRAS)} extras, off the clock")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    sys.exit(main())
