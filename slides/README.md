# Slides

Two revealjs decks, [`en/`](en/index.qmd) and [`es/`](es/index.qmd), with
**identical structure** and the same 15 slide anchors — twelve `#sec-NN-slug`
sections plus the three Kahoot dividers.

- 🇬🇧 [Slides (EN)](https://project-delphi.github.io/tensors-workshop/slides/en/)
- 🇪🇸 [Diapositivas (ES)](https://project-delphi.github.io/tensors-workshop/slides/es/)

## Render

```bash
quarto render slides/en/index.qmd      # one deck
quarto render                          # the whole site, both decks
quarto preview slides/es/index.qmd     # live reload while editing
```

No Python or Jupyter is needed, and since the issue #45 redesign there is no
code on a slide either: every slide is a rendered PNG under
`en|es/images/slides-final/`, and `execute: enabled: false` means Quarto never
runs anything. That keeps CI fast and means a deck cannot break because a
dependency moved — but it also means **nothing checks that a number shown on a
slide still matches the notebook it came from**. When a notebook's output
changes, the slide art has to be redrawn by hand.

## Present

| Key | What it does |
|---|---|
| `s` | **Speaker view** — notes, timer, next slide. Open this on your laptop. |
| `f` | Fullscreen |
| `o` | Overview of all slides — the section dividers make it skimmable |
| `e` | PDF export mode, then print to PDF |
| `?` | All shortcuts |

Every Kahoot slide and every difficult moment carries speaker notes, so run
speaker view rather than trusting memory. The notes hold Appendix G's facilitator
guidance where it is actually needed:

- the two meanings of **"rank"**, at the start of Part I
- the **deliberate `LinAlgError`** in section 07, which students will think is
  their mistake
- the **25-pixel border crop** in section 09, which must be said *before* the
  exercise, not after
- on each Kahoot slide: import ahead of time, budget 5 minutes, and where that
  quiz sits in the cutting order

## Keeping EN and ES in sync

Three mechanisms, in order of strength:

1. **Shared data.** Every URL, Colab link, quiz title, quiz length and section
   number is a `{{< var >}}` reference into
   [`_variables.yml`](../_variables.yml). Neither deck hard-codes any of them,
   so they cannot disagree on a fact.
2. **Shared styling.** Both decks load [`slides.scss`](slides.scss), so a change
   to the look lands in both at once.
3. **A check that fails the build.** `scripts/check_links.py` asserts that both
   rendered decks contain **all twelve `sec-NN-slug` anchors** plus the three
   Kahoot slides — 15 in total, with no extras in either. Add a section to one
   deck and not the other and CI goes red.

What is *not* automated is the prose. When you change a slide's wording,
**change both files in the same commit.** The Spanish is a real translation
using natural terminology — *eje*, *desplegado*, *contracción*, *pseudoinversa*,
*autovector* — not a word-for-word calque of the English. **Code and identifiers
stay in English** in both decks.

## Adding a section

1. Add it to `sections:` in [`_variables.yml`](../_variables.yml).
2. Regenerate the tables and the notebooks — two separate commands, since
   neither script reads its arguments:
   ```bash
   uv run --with pyyaml python scripts/gen_tables.py
   uv run --with pyyaml,nbformat python scripts/gen_notebooks.py
   ```
3. Draw the section's slide art, save it as the next
   `en|es/images/slides-final/slide-NN.png`, and add
   `## {#sec-NN-slug background-image="images/slides-final/slide-NN.png" ...}`
   with its `.sec-part` marker, its `h1.sr-only` heading, its `sr-only`
   summary and its `.colab-tab` link to **both** decks.
4. `quarto render && uv run --with pyyaml,nbformat python scripts/check_links.py`

Step 3 is the one nothing can do for you. Steps 1, 2 and 4 will tell you if you
forget it.

## Structure of each deck

Three opening slides → the agenda (the one text slide left, generated into
`_includes/agenda-{en,es}.md` by `scripts/gen_tables.py`) → then per section a
`##` divider slide carrying the `{#sec-NN-slug}` anchor and one to three
follow-on slides, with a full-bleed **Kahoot pause** slide after sections 04,
07 and 10.

Every slide but the agenda is a background PNG. What is *not* in the image and
must stay in the qmd:

- `<p class="sr-only">` — the slide's summary, this redesign's `fig-alt`.
- `<h1 class="sr-only">` on the fifteen divider slides — the section name the
  breadcrumb in `deck-pace.html` reads.
- `::: {.sec-part}` — the part number, for the same breadcrumb. It cannot be a
  `data-` attribute on the heading; see CLAUDE.md.
- `.colab-tab` links — the canonical notebook URLs `check_links.py` validates,
  which `deck-pace.html` promotes into the on-screen panel and which stay
  visible as the fallback if that script fails.
- `::: {.notes}` — facilitator guidance, read in speaker view.

The `#sec-NN-slug` anchors are what the section tables on the site link to, so
**do not rename one** without updating `_variables.yml` — the link checker will
catch it if you do.
