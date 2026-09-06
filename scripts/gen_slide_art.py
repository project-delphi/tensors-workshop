"""Draw the slide art that the #45 redesign left with no source.

Since #45 every slide in both decks is a PNG under
`slides/{en,es}/images/slides-final/`, drawn by hand in a tool that is not in
this repository. `slides/README.md` says the consequence out loud: "the slide
art has to be redrawn by hand." That is fine for thirty-one slides that already
exist and awkward for the thirty-second, so #63 -- which needs three new slides
in each language -- is the point at which the art gets a source.

The source is HTML and CSS, screenshotted by headless Chrome. Not matplotlib:
these slides are typography and cards, and every hour spent teaching a plotting
library to lay out a card grid is an hour not spent on the words. Chrome already
lays out card grids, the deck is already 1920x1080, and the browser that renders
the deck is the one that draws its art.

    uv run python scripts/gen_slide_art.py

Like `gen_thumbnails.py` and `gen_figures.py` this is **not** in the CI
regenerate gate: it shells out to a browser the workflow does not install and
fetches a webfont it cannot reach. Nothing will tell you a slide is stale --
rerun it by hand when the copy here changes, and commit the PNGs.

Two things it deliberately does not do:

  * **No page number.** The existing art bakes the number into the bottom-right
    corner, so inserting `slide-20a` leaves every later baked number ahead of
    its true position. Redrawing fourteen PNGs to fix a decoration is not worth
    it; the new slides simply carry no number, and `slides/README.md` records
    that the baked ones stop being authoritative after section 07.
  * **No lightbulb in the callout bar.** The existing bars put a lightbulb glyph
    in the teal disc. #65 is an argument against exactly that mark -- it labels
    a fact as an insight -- so the disc here holds an arrow. The shape and the
    colour still match the neighbouring slides; only the claim is dropped.

Copy lives in `SLIDES` below, in both languages, because that is what changes.
Spanish is a real translation in the terminology `slides/README.md` fixes --
*pseudoinversa*, *desplegado*, *contraccion*, *autovector* -- and code and
identifiers stay in English, as they do in both decks.
"""

from __future__ import annotations

import html
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DECKS = {lang: ROOT / "slides" / lang / "images" / "slides-final"
         for lang in ("en", "es")}

# The deck's own dimensions, from the revealjs header in both index.qmd files.
# The pre-existing art is 1672x941, which is the same 16:9 at a different
# export size; `background-size: contain` makes the two interchangeable.
WIDTH, HEIGHT = 1920, 1080

CHROME = ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
          "chromium", "google-chrome", "chrome")

# Read off the existing PNGs with a colour picker rather than invented. NAVY is
# the title ink, BLUE the accent half of a title and the eyebrow, TEAL the
# right-hand end of every gradient and the callout bar's border, AMBER the short
# rule under each card heading.
NAVY = "#16233f"
BLUE = "#1a6fd4"
TEAL = "#0f8f93"
AMBER = "#e8a33d"
BODY = "#3a4a5f"
CARD_EDGE = "#e6edf6"
DISC = "#dce9f9"

# Montserrat is the closest free match to the geometric sans the original art
# was set in, and Google Fonts is the same network dependency
# `gen_thumbnails.py` already carries. Without the network Chrome falls back
# down the stack and the PNG differs -- which is why this script is not a CI
# gate and why the render is checked by eye before the PNGs are committed.
FONT_URL = ("https://fonts.googleapis.com/css2"
            "?family=Montserrat:wght@400;500;600;700;800&display=swap")
FONT_STACK = ('Montserrat, "Avenir Next", "Segoe UI", system-ui, '
              '-apple-system, sans-serif')


# ── The copy ────────────────────────────────────────────────────────────────
# One entry per new slide. `stem` is the PNG name: the letter suffix says this
# slide was inserted after `slide-20`, rather than renumbering fourteen files
# whose numbers are painted on.
#
# A card is (glyph, heading, [lines]). The glyphs on 20a are the shapes
# themselves -- a square, a hatched square, a tall bar, a wide bar -- which is
# the one place on that slide where the geometry can be seen rather than read.

SLIDES = [
    {
        "stem": "slide-20a",
        "en": {
            "eyebrow": "Notebook 07 · Inverses",
            "title": ["Three shapes,", "three answers"],
            "subtitle": "What A⁻¹ and A⁺ give you depends entirely on the "
                        "geometry",
            "cards": [
                ("■", "Square, full rank", [
                    "A⁻¹ exists.",
                    "A⁻¹A = I, and Ax = b has exactly one solution.",
                ]),
                ("▨", "Square, singular", [
                    "Columns are dependent.",
                    "A⁻¹ is undefined — but A⁺ still is, from the SVD.",
                ]),
                ("▮", "Tall · m > n", [
                    "More equations than unknowns.",
                    "Usually no exact solution; A⁺b minimises ‖Ax − b‖₂.",
                ]),
                ("▬", "Wide · m < n", [
                    "Infinitely many solutions.",
                    "A⁺b returns the one with the smallest ‖x‖₂.",
                ]),
            ],
            "callout": ("Before TODO 3:", "the LinAlgError you are about to "
                        "see is the expected result, not your mistake."),
        },
        "es": {
            "eyebrow": "Notebook 07 · Inversas",
            "title": ["Tres formas,", "tres respuestas"],
            "subtitle": "Lo que A⁻¹ y A⁺ te dan depende por completo de la "
                        "geometría",
            "cards": [
                ("■", "Cuadrada, rango completo", [
                    "A⁻¹ existe.",
                    "A⁻¹A = I, y Ax = b tiene exactamente una solución.",
                ]),
                ("▨", "Cuadrada, singular", [
                    "Las columnas son dependientes.",
                    "A⁻¹ no está definida; A⁺ sí, a partir de la SVD.",
                ]),
                ("▮", "Alta · m > n", [
                    "Más ecuaciones que incógnitas.",
                    "Casi nunca hay solución exacta; A⁺b minimiza ‖Ax − b‖₂.",
                ]),
                ("▬", "Ancha · m < n", [
                    "Infinitas soluciones.",
                    "A⁺b devuelve la de menor ‖x‖₂.",
                ]),
            ],
            "callout": ("Antes de la TAREA 3:", "el LinAlgError que verás es "
                        "el resultado esperado, no un error tuyo."),
        },
    },
    {
        "stem": "slide-21a",
        "en": {
            "eyebrow": "Notebook 07 · Tensor inverses",
            "title": ["What about", "tensors?"],
            "subtitle": "There is no single tensor inverse, so you borrow the "
                        "matrix one",
            "cards": [
                ("∄", "No single definition", [
                    "Nobody agrees on one tensor inverse.",
                    "This is a fair question with an honest answer, not a gap "
                    "in your reading.",
                ]),
                ("⊗", "Several do exist", [
                    "Built on the Einstein product, or the t-product for "
                    "order-3 tensors.",
                    "Both are active research.",
                ]),
                ("⇄", "What you actually do", [
                    "Unfold → pinv → fold back.",
                    "T (4, 3, 5) → M (4, 15) → M⁺ (15, 4), and M M⁺ M = M: "
                    "unfolding loses nothing.",
                ]),
            ],
            "callout": ("The move to remember:", "when a tensor problem is "
                        "hard, unfold it to a matrix, solve it there, and "
                        "fold back."),
        },
        "es": {
            "eyebrow": "Notebook 07 · Inversas tensoriales",
            "title": ["¿Y los", "tensores?"],
            "subtitle": "No existe una única inversa tensorial, así que se "
                        "toma prestada la de matrices",
            "cards": [
                ("∄", "Ninguna definición única", [
                    "No hay acuerdo sobre una sola inversa tensorial.",
                    "Es una pregunta legítima con una respuesta honesta, no un "
                    "hueco en tu lectura.",
                ]),
                ("⊗", "Sí existen varias", [
                    "Basadas en el producto de Einstein, o en el t-producto "
                    "para tensores de orden 3.",
                    "Ambas son investigación activa.",
                ]),
                ("⇄", "Lo que se hace en la práctica", [
                    "Desplegado → pinv → volver a plegar.",
                    "T (4, 3, 5) → M (4, 15) → M⁺ (15, 4), y M M⁺ M = M: el "
                    "desplegado no pierde nada.",
                ]),
            ],
            "callout": ("El movimiento que hay que recordar:", "cuando un "
                        "problema tensorial es difícil, despliégalo a matriz, "
                        "resuélvelo ahí y vuelve a plegarlo."),
        },
    },
    {
        "stem": "slide-28a",
        "en": {
            "eyebrow": "Notebook 10 · Deep dive 13",
            "title": ["Four decompositions,", "four bargains"],
            "subtitle": "Each one keeps a different structure — and that "
                        "choice is the decision",
            "cards": [
                ("∑", "CP", [
                    "A sum of rank-1 components.",
                    "R(I + J + K)",
                    "When the components must be read one by one.",
                ]),
                ("⊞", "Tucker / HOSVD", [
                    "One subspace per mode, plus a core.",
                    "R₁R₂R₃ + IR₁ + JR₂ + KR₃",
                    "When each mode needs a rank of its own.",
                ]),
                ("⧉", "Tensor Train", [
                    "A chain of small cores.",
                    "≈ O(N · I · r²)",
                    "When the order is high and a dense core explodes.",
                ]),
                ("≋", "t-SVD", [
                    "FFT along mode 3, matrix SVDs, inverse FFT.",
                    "Storage set by the tubal rank kept",
                    "When mode 3 carries a meaning of its own.",
                ]),
            ],
            "callout": ("Deep dive 13:", "runs all four on one tensor at a "
                        "matched parameter budget — the comparison this slide "
                        "only asserts."),
        },
        "es": {
            "eyebrow": "Notebook 10 · Profundización 13",
            "title": ["Cuatro descomposiciones,", "cuatro tratos"],
            "subtitle": "Cada una conserva una estructura distinta, y esa "
                        "elección es la decisión",
            "cards": [
                ("∑", "CP", [
                    "Una suma de componentes de rango 1.",
                    "R(I + J + K)",
                    "Cuando hay que leer los componentes uno a uno.",
                ]),
                ("⊞", "Tucker / HOSVD", [
                    "Un subespacio por modo, más un núcleo.",
                    "R₁R₂R₃ + IR₁ + JR₂ + KR₃",
                    "Cuando cada modo necesita su propio rango.",
                ]),
                ("⧉", "Tensor Train", [
                    "Una cadena de núcleos pequeños.",
                    "≈ O(N · I · r²)",
                    "Cuando el orden es alto y un núcleo denso explota.",
                ]),
                ("≋", "t-SVD", [
                    "FFT sobre el modo 3, SVD matriciales, FFT inversa.",
                    "Almacenamiento según el rango tubular conservado",
                    "Cuando el modo 3 tiene un significado propio.",
                ]),
            ],
            "callout": ("Profundización 13:", "ejecuta las cuatro sobre un "
                        "mismo tensor con el mismo presupuesto de parámetros: "
                        "la comparación que esta diapositiva solo afirma."),
        },
    },
]


# ── The page ────────────────────────────────────────────────────────────────

CSS = f"""
@import url("{FONT_URL}");

* {{ margin: 0; padding: 0; box-sizing: border-box; }}

html, body {{
  width: {WIDTH}px;
  height: {HEIGHT}px;
  overflow: hidden;
  font-family: {FONT_STACK};
  color: {BODY};
  background: #ffffff;
}}

/* The ground: an off-white page with two very soft blue washes in the upper
   right, which is what the existing art has behind its content. */
.page {{
  position: relative;
  width: {WIDTH}px;
  height: {HEIGHT}px;
  background:
    radial-gradient(900px 640px at 88% 6%,  rgba(203, 219, 246, .55), transparent 70%),
    radial-gradient(760px 520px at 99% 44%, rgba(226, 232, 250, .70), transparent 72%),
    #fbfcfe;
  overflow: hidden;
}}

/* The two dot grids, top left and mid right. 5x5, and the right-hand one is
   lighter, exactly as on slides 06 and 21. */
.dots {{
  position: absolute;
  width: 128px;
  height: 128px;
  background-image: radial-gradient({BLUE} 3.6px, transparent 3.7px);
  background-size: 32px 32px;
}}
.dots.tl {{ top: 34px;  left: 46px; opacity: .85; }}
.dots.mr {{ top: 236px; right: 44px; opacity: .5; }}

/* The wave band along the bottom edge. Three overlapping ellipses -- blue on
   the left, green on the right, a pale sheet over both -- which is as close as
   a border-radius gets to the painted original, and close enough at the size
   it is actually seen. */
.wave {{ position: absolute; bottom: 0; left: 0; width: 100%; height: 300px; }}
.wave i {{ position: absolute; display: block; border-radius: 50%; }}
.wave .w1 {{ left: -8%;  bottom: -190px; width: 62%; height: 300px;
             background: rgba(163, 195, 240, .70); }}
.wave .w2 {{ left: -14%; bottom: -215px; width: 46%; height: 300px;
             background: rgba(120, 168, 232, .52); }}
.wave .w3 {{ right: -12%; bottom: -205px; width: 66%; height: 320px;
             background: rgba(150, 205, 170, .60); }}
.wave .w4 {{ right: -6%;  bottom: -240px; width: 52%; height: 330px;
             background: rgba(112, 186, 150, .54); }}
.wave .w5 {{ left: 8%;   bottom: -250px; width: 90%; height: 330px;
             background: rgba(224, 235, 248, .60); }}

.content {{ position: relative; padding: 62px 78px 0 78px; }}

/* Indented past the corner dot grid, which is where the eyebrow sits on the
   existing art: the dots own the margin, the title does not. */
.eyebrow, .rule {{ margin-left: 126px; }}

.eyebrow {{
  font-size: 25px;
  font-weight: 700;
  letter-spacing: .19em;
  text-transform: uppercase;
  color: {BLUE};
}}
.rule {{
  width: 620px;
  height: 5px;
  margin-top: 18px;
  margin-bottom: 34px;
  border-radius: 3px;
  background: linear-gradient(90deg, {BLUE}, {TEAL});
}}

h1 {{
  font-size: 104px;
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -.015em;
  color: {NAVY};
}}
h1 .accent {{
  background: linear-gradient(90deg, {BLUE}, {TEAL});
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}}
h2 {{
  margin-top: 16px;
  font-size: 40px;
  font-weight: 600;
  color: #2b3a55;
}}

.cards {{
  display: grid;
  gap: 24px;
  margin-top: 42px;
}}
.cards.n3 {{ grid-template-columns: repeat(3, 1fr); }}
.cards.n4 {{ grid-template-columns: repeat(4, 1fr); }}

.card {{
  padding: 26px 28px 28px 28px;
  border: 1px solid {CARD_EDGE};
  border-radius: 20px;
  background: rgba(255, 255, 255, .93);
  box-shadow: 0 10px 26px rgba(31, 63, 110, .07);
}}
.disc {{
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: {DISC};
  color: {BLUE};
  font-size: 34px;
  line-height: 1;
}}
.card h3 {{
  margin-top: 18px;
  font-size: 31px;
  font-weight: 700;
  color: {BLUE};
}}
.card .amber {{
  width: 52px;
  height: 4px;
  margin: 10px 0 16px 0;
  border-radius: 2px;
  background: {AMBER};
}}
.card p {{
  font-size: 23px;
  font-weight: 500;
  line-height: 1.34;
}}
.card p + p {{ margin-top: 10px; }}

/* The callout bar, same shape and colour as the one on every neighbouring
   slide. The disc holds an arrow rather than a lightbulb; see the module
   docstring. */
.callout {{
  position: absolute;
  left: 78px;
  right: 78px;
  bottom: 54px;
  display: flex;
  align-items: center;
  gap: 26px;
  padding: 22px 34px;
  border: 2px solid rgba(15, 143, 147, .55);
  border-radius: 20px;
  background: rgba(255, 255, 255, .94);
  box-shadow: 0 10px 26px rgba(31, 63, 110, .07);
}}
.callout .mark {{
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 62px;
  height: 62px;
  border-radius: 50%;
  background: {TEAL};
  color: #ffffff;
  font-size: 32px;
  line-height: 1;
}}
.callout p {{ font-size: 31px; font-weight: 500; color: {NAVY}; }}
.callout strong {{ color: {TEAL}; font-weight: 700; }}
"""

PAGE = """<!doctype html>
<html lang="{lang}"><head><meta charset="utf-8"><style>{css}</style></head>
<body><div class="page">
  <span class="dots tl"></span><span class="dots mr"></span>
  <div class="wave"><i class="w1"></i><i class="w2"></i><i class="w3"></i>
    <i class="w4"></i><i class="w5"></i></div>
  <div class="content">
    <div class="eyebrow">{eyebrow}</div>
    <div class="rule"></div>
    <h1>{title}</h1>
    <h2>{subtitle}</h2>
    <div class="cards n{n}">{cards}</div>
  </div>
  <div class="callout"><span class="mark">→</span>
    <p><strong>{lead}</strong> {rest}</p></div>
</div></body></html>
"""


def e(text: str) -> str:
    return html.escape(text, quote=False)


def page(copy: dict, lang: str) -> str:
    """One slide's HTML. The second half of the title carries the gradient."""
    first, accent = copy["title"]
    title = f'{e(first)}<br><span class="accent">{e(accent)}</span>'
    cards = "".join(
        '<div class="card">'
        f'<div class="disc">{e(glyph)}</div>'
        f"<h3>{e(heading)}</h3>"
        '<div class="amber"></div>'
        + "".join(f"<p>{e(line)}</p>" for line in lines)
        + "</div>"
        for glyph, heading, lines in copy["cards"]
    )
    lead, rest = copy["callout"]
    return PAGE.format(lang=lang, css=CSS, eyebrow=e(copy["eyebrow"]),
                       title=title, subtitle=e(copy["subtitle"]),
                       n=len(copy["cards"]), cards=cards,
                       lead=e(lead), rest=e(rest))


def chrome() -> str:
    for candidate in CHROME:
        found = candidate if Path(candidate).exists() else shutil.which(candidate)
        if found:
            return found
    sys.exit("no Chrome or Chromium found; see CHROME in this file")


def shoot(browser: str, source: Path, out: Path) -> None:
    """Screenshot one page. `--virtual-time-budget` is what waits for the
    webfont: without it Chrome shoots the fallback stack and the PNG is a
    different picture with no error to say so."""
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [browser, "--headless", "--disable-gpu", "--hide-scrollbars",
         "--force-device-scale-factor=1",
         f"--window-size={WIDTH},{HEIGHT}",
         "--virtual-time-budget=10000",
         f"--screenshot={out}", source.as_uri()],
        check=True, capture_output=True,
    )
    if not out.exists():
        sys.exit(f"Chrome wrote no file for {out.name}")


def main() -> None:
    browser = chrome()
    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        for slide in SLIDES:
            for lang, directory in DECKS.items():
                source = tmpdir / f"{slide['stem']}-{lang}.html"
                source.write_text(page(slide[lang], lang), encoding="utf-8")
                out = directory / f"{slide['stem']}.png"
                shoot(browser, source, out)
                print(f"  {out.relative_to(ROOT)}")
    print(f"{len(SLIDES) * len(DECKS)} slides drawn at {WIDTH}x{HEIGHT}")


if __name__ == "__main__":
    main()
