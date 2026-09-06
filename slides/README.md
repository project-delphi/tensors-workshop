# Slides

Two revealjs decks, [`en/`](en/index.qmd) and [`es/`](es/index.qmd), with
**identical structure** and the same 16 slide anchors — thirteen `#sec-NN-slug`
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
changes, the slide art has to be redrawn.

The thirty-one PNGs numbered `slide-01` to `slide-31` were drawn by hand in a
tool that is not in this repository, so redrawing one means redrawing it there.
Anything added since — the `slide-NNa` insertions — has a source:
[`scripts/gen_slide_art.py`](../scripts/gen_slide_art.py), which holds the copy
in both languages, lays it out in CSS, and screenshots it with headless Chrome
at the deck's own 1920×1080. See *Drawing slide art* below.

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
- the **20-pixel border crop** in section 09, which must be said *before* the
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
   rendered decks contain **all thirteen `sec-NN-slug` anchors** plus the three
   Kahoot slides — 16 in total, with no extras in either — and that both link
   the **same set of ML blog posts**, every one of them declared under
   `reading:`. Add a section or a reading chip to one deck and not the other
   and CI goes red. What it does *not* do is fetch those posts: the checker is
   offline by design, so a post that disappears from the blog is caught by a
   human, not by CI.

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

Four opening slides → the agenda (the one text slide left, generated into
`_includes/agenda-{en,es}.md` by `scripts/gen_tables.py`) → then per section a
`##` divider slide carrying the `{#sec-NN-slug}` anchor and one to three
follow-on slides, with a full-bleed **Kahoot pause** slide after sections 04,
07 and 10.

Every slide but the agenda is a background PNG. What is *not* in the image and
must stay in the qmd:

- `<p class="sr-only">` — the slide's summary, this redesign's `fig-alt`.
- `<h1 class="sr-only">` on the sixteen divider slides — the section name the
  breadcrumb in `deck-pace.html` reads.
- `::: {.sec-part}` — the part number, for the same breadcrumb. It cannot be a
  `data-` attribute on the heading; see CLAUDE.md.
- `.colab-tab` links — the canonical notebook URLs `check_links.py` validates,
  which `deck-pace.html` promotes into the on-screen panel and which stay
  visible as the fallback if that script fails.
- `.reading-tab` chips — the companion ML blog post for the concept the slide
  introduces, on the slide that introduces it rather than in a bibliography at
  the end. Two per slide at most, from `reading:` in
  [`_variables.yml`](../_variables.yml) like every other shared URL. They work
  exactly like `.colab-tab`: `deck-pace.html` promotes them into the same
  panel — stacked under the amber buttons, outlined instead of filled, so they
  read as supplementary rather than as the thing to click during the exercise
  — and the inline copies are the fallback if that script fails. The posts are
  in English; the ES deck marks that with a "(EN)" suffix added by
  `slides.scss`, not retyped into each label.
- `::: {.notes}` — facilitator guidance, read in speaker view.

The `#sec-NN-slug` anchors are what the section tables on the site link to, so
**do not rename one** without updating `_variables.yml` — the link checker will
catch it if you do.

## Slide → notebook map

Nothing checks this table, which is exactly why it is written down: the deck and
the notebooks are the two halves of the same lesson and they drift silently
(#63). A `·` means the slide carries no notebook of its own and inherits its
section's.

| Slide | Anchor | Notebook | What it introduces |
|---|---|---|---|
| 01–02 | — | — | Title, the workshop idea |
| **02a** | — | — | Four ideas, one object — the whole day in four cards |
| 03 | — | — | The four datasets |
| agenda | — | — | The running clock, from `_includes/agenda-{en,es}.md` |
| 04 | `sec-00-setup-and-data` | 00 | Setup and welcome |
| 05 | `sec-01-what-a-tensor-is` | 01 | What a tensor is |
| 06 | · | 01 | Map of factorizations — the map section 09 walks |
| 07 | · | 01 | What a factorization gives you: number → polynomial → matrix → tensor |
| 08 | `sec-02-thinking-in-n-dimensions` | 02 | Thinking in N dimensions |
| 09 | · | 02 | Batch is not time |
| 10 | `sec-03-indexing-and-broadcasting` | 03 | Indexing and broadcasting |
| 11 | · | 03 | Broadcasting on real images |
| 12 | `sec-04-reshape-and-transpose` | 04 | Reshape and transpose |
| 13 | · | 04 | Reshape vs. transpose |
| 14 | `sec-kahoot-1` | — | Quiz 1 |
| 15 | `sec-05-video-pipeline-design` | 05 | Video pipeline design |
| 16 | · | 05 | Pad or sample |
| 17 | `sec-06-contraction-with-einsum` | 06 | Contraction with einsum |
| 18 | · | 06 | Reading an einsum expression |
| 19 | · | 06 | NumPy and einsum, side by side |
| 20 | `sec-07-inverses-and-pseudoinverse` | 07 | Inverses and the pseudoinverse |
| **20a** | · | 07 | Square, singular, tall, wide — and what `A⁺` returns in each |
| 21 | · | 07 | California Housing, 20,433 equations |
| **21a** | · | 07 | Tensor inverses: unfold → `pinv` → fold, and the second half's through-line |
| 22 | `sec-kahoot-2` | — | Quiz 2 |
| 23 | `sec-08-recursion-with-matrices` | 08 | Recursion with matrices |
| 24 | · | 08 | Eigenvectors and the dominant direction |
| **25a** | `sec-09-matrix-factorizations` | 09 | Matrix factorizations, and where eigendecomposition is named |
| **26a** | · | 09 | Factor once, solve many — three routes to the same least squares |
| 27 | `sec-10-tucker-decomposition` | 10 | Tucker decomposition |
| 28 | · | 10 | Table → tensor → HOSVD → reconstruction |
| 29 | `sec-kahoot-3` | — | Quiz 3 |
| **29a** | `sec-11-tensor-factorizations` | 11 | Tensor factorizations: structure first, then rank |
| **29b** | · | 11 | CP, Tucker, TT and t-SVD — what each stores and what it buys |
| 30 | · | 12 | One idea connects sections 07, 10 and take-home 13 |
| **31a** | `sec-12-wrap-up-and-take-homes` | 12 · take-home 13 | Wrap-up and take-homes |

**Unused art.** `slide-25.png` and `slide-26.png` (the old convolution slides)
and `slide-31.png` (the old wrap-up, which read `11 ·`) are still in the
repository and referenced by nothing. They are kept because they cannot be
regenerated: the tool that drew them is not here.

**What the notebooks teach that no slide does**, and deliberately so — these are
take-home material, and the room's 210 minutes do not stretch to them:

- **Take-home 13** in full: correlation against true convolution, the Toeplitz
  view, transposed convolution as overlap-add, and Richardson-Lucy on a real
  photograph. Slides 21a, 30 and 31 all name it; none teaches it.
- **Take-homes A–E** in notebook 12 — PCA's scaling trap, attention as two
  contractions, Cholesky, audio denoising. Slide 31 lists them; none is taught.
- Parts of notebooks 09 and 11 that 15 minutes will not reach: NMF, the fitted
  cost exponent, t-SVD's exact-versus-truncated comparison. The slides frame the
  section; the notebook outruns it, which is the intent.

## Drawing slide art

`slide-NNa` is an **insertion**: `slide-02a` follows `slide-02`. The alternative
was renumbering every later file, and the page number on the old art is painted
into the image, so a rename would have made the numbering wrong in a second
place rather than right in the first. Two consequences, both deliberate:

- The baked corner number no longer matches the slide's true position. It is
  decoration — `slide-number: false` in both deck headers means reveal shows no
  number of its own — and since `slide-02a` it stops being authoritative from
  `slide-03` onward, rather than after section 07 as it did when `slide-20a`
  was the first insertion.
- New art carries **no corner number at all**, so it cannot be wrong.
- The **closing slide was rebuilt** here rather than left stale. `slide-31`'s
  art read `11 · Wrap-up and take-homes` after the wrap-up became section 12,
  so `slide-31a` replaces it — same layout, correct number, and without the
  Spanish that had leaked into the English card labels (*compara
  representations*, *STFT → matriz → SVD*). It is the `closing` layout in
  `gen_slide_art.py`: five centred cards, the sentence to leave with, and the
  thanks line, with no callout bar competing against the closing statement.

To add or change one of the generated slides, edit `SLIDES` in
[`scripts/gen_slide_art.py`](../scripts/gen_slide_art.py) — copy for both
languages lives there, next to each other, which is the point — and run:

```bash
uv run python scripts/gen_slide_art.py
```

It needs Chrome or Chromium and the network (Google Fonts), so like
`gen_thumbnails.py` and `gen_figures.py` it is **not** in the CI regenerate
gate: nothing will tell you a slide is stale. It is deterministic — rerunning it
rewrites the same bytes — so `git status` after a rerun is the check.
