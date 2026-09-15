# Notebooks

Thirteen notebooks, one per workshop section, numbered to match
[the section table](https://project-delphi.github.io/tensors-workshop) exactly —
plus one take-home deep dive, numbered 13, that is **not** a section.

**English-primary, with a one-line Spanish summary under each heading** —
*cada encabezado lleva un resumen en español.*

Each notebook marks a **core path**, optional work, two outcomes, and a
`predict → run → explain → check` activity. Follow the
contiguous core block in notebooks 01–11 from top to bottom: recall, example,
attempt, feedback, checkpoint. Try before opening hints or solutions. Stop at
**Core complete**; optional exercises and explorers follow under **Explore later**.

## Every notebook is self-contained

Its setup cell installs, imports and loads **its own data**, so you can open any
one of them cold in a fresh Colab runtime, in any order, without having run the
others. Sections 02, 05, 07, 08 and 10 re-fetch their own data rather than
depending on notebook 00, as do all three of 11, 12 and 13. You will see the
same URLs more than once — that is deliberate, not accidental duplication.

## The thirteen sections

<!-- BEGIN notebooks -->
| # | Notebook | Covers | Colab |
|---|---|---|---|
| 00 | [`00-setup-and-data.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/00-setup-and-data.ipynb) | Setup and welcome — Load every dataset and confirm your runtime works before the workshop starts. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/00-setup-and-data.ipynb) |
| 01 | [`01-what-a-tensor-is.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/01-what-a-tensor-is.ipynb) | What a tensor is — Learn to read a tensor's structure and track what its axes mean as you fix, rearrange, or contract them. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/01-what-a-tensor-is.ipynb) |
| 02 | [`02-thinking-in-n-dimensions.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/02-thinking-in-n-dimensions.ipynb) | Thinking in N dimensions — Learn to read real tensors by asking what every axis counts and why a batch axis is not the same thing as a time axis. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/02-thinking-in-n-dimensions.ipynb) |
| 03 | [`03-indexing-and-broadcasting.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/03-indexing-and-broadcasting.ipynb) | Indexing and broadcasting real data — Select named measurements from real tumour-sample data, compare meaningful subsets, then standardize real image data safely. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/03-indexing-and-broadcasting.ipynb) |
| 04 | [`04-reshape-and-transpose.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/04-reshape-and-transpose.ipynb) | Reshape and transpose real images — Use real images to move between HWC↔CHW and NHWC↔NCHW, then show why matching shapes do not guarantee matching axis semantics. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/04-reshape-and-transpose.ipynb) |
| 05 | [`05-video-pipeline-design.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/05-video-pipeline-design.ipynb) | Video pipeline design — Process one pinned real video end to end, then use what its axes actually mean to design two downstream video pipelines. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/05-video-pipeline-design.ipynb) |
| 06 | [`06-contraction-with-einsum.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/06-contraction-with-einsum.ipynb) | Contraction with einsum — Use one index rule on real data, then change the inputs interactively to test which index disappears. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/06-contraction-with-einsum.ipynb) |
| 07 | [`07-inverses-and-pseudoinverse.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/07-inverses-and-pseudoinverse.ipynb) | Inverses and the pseudoinverse — Use the pseudoinverse on real singular, tall, and wide systems, then inspect the geometry interactively. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/07-inverses-and-pseudoinverse.ipynb) |
| 08 | [`08-recursion-with-matrices.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/08-recursion-with-matrices.ipynb) | Recursion with matrices and vectors — Treat recursion as repeated state updates, connect repeated multiplication with dominant eigen-directions, and test recursive forecasting on real airline-passenger data. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/08-recursion-with-matrices.ipynb) |
| 09 | [`09-matrix-factorizations.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/09-matrix-factorizations.ipynb) | Matrix factorizations — Put LU, QR, Cholesky, eigendecomposition, SVD and NMF side by side on real data and see which question each one answers, and what each one costs. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/09-matrix-factorizations.ipynb) |
| 10 | [`10-tucker-decomposition.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/10-tucker-decomposition.ipynb) | Tucker decomposition on real data — Build a real tensor from New York taxi trips, compress each mode with HOSVD, and explore the trade-off between size, reconstruction error, and interpretable structure. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/10-tucker-decomposition.ipynb) |
| 11 | [`11-tensor-factorizations.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/11-tensor-factorizations.ipynb) | Tensor factorizations — Compare CP, Tucker/HOSVD, Tensor Train and t-SVD, understand the structure each one preserves, and measure what each representation costs. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/11-tensor-factorizations.ipynb) |
| 12 | [`12-wrap-up-and-take-homes.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/12-wrap-up-and-take-homes.ipynb) | Wrap-up and take-homes — Wrap up the workshop around one connecting idea, then choose among five extensions: PCA, attention, CP, Cholesky, and audio. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/12-wrap-up-and-take-homes.ipynb) |
<!-- END notebooks -->

## The extras

Three notebooks are deep dives, handed out as take-home material after the
session: `13-convolution-and-deconvolution.ipynb`,
`14-cp-factorization.ipynb` and `15-generalized-cp.ipynb`. Each is declared
under `extras:` in `_variables.yml` rather than `sections:`, and that mapping is
deliberately missing `minutes`, `start`, `end` and `part` —
`scripts/timeline.py` only ever walks `sections`, so nothing about an extra can
move a start time or the agenda. They also get no `#sec-NN` slide anchor and no
Kahoot.

Everything else about them is a notebook like any other: the same generated
header and footer, the same ownership boundary, the same checks.

13 was section 09 until matrix and tensor factorizations became sections 09 and
11. The workshop's connecting idea still has three legs — pseudoinverse,
deconvolution, Tucker — and this is the one the room no longer runs, which is
why sections 07, 10 and 12 all name it out loud.

14 and 15 go the other way: they pick up where section 11 stops. Section 11
fits CP as one of four methods and calls `parafac` deliberately as a black box,
so ALS is never named and the loss is never questioned. 14 fits CP by hand and
reads the factors as profiles; 15 replaces squared error with a Poisson or
Bernoulli loss. They are extras rather than sections because the room does not
have forty minutes, not because they are optional to understand.

## Shape of each notebook

1. **Header** — **Practise today** and **Explore later**, in both languages.
2. **Core block (01–11)** — recall, preparation, example, attempt, feedback,
   and checkpoint, together in reading order. Solutions remain folded.
3. **Core complete** — a stopping point with quiz/next-notebook links.
4. **Explore later** — optional reference, exercises, and explorers.
5. **Closing** — navigation for readers who continue through the extensions.

Notebook 00 begins with an entry check, 12 with an exit check; 13–15 are
entirely take-home material.

Every notebook carries **at least three animations**: small numbered cubes
performing the moves that section teaches, drawn by `scripts/gen_cube_gifs.py`
and served from the published site. The first two draw the moves; the third
draws the data the section teaches them on — a colour image being split into
its channels, a clip losing a moment, a count nobody recorded. In every section
notebook one of the three sits in the main body rather than in the optional
tail, where a reader who stops at *Core complete* would never have reached it.
`gen_cube_gifs.py` refuses to run if a notebook drops below three.

The URLs are absolute because a notebook on Colab has no checkout to resolve a
relative path against, which means a reader needs the network to *see* them —
not to run anything. The five notebooks the deps table calls network-free still compute
without a connection. Check 1 in `scripts/check_links.py` verifies that every
one of those URLs names a file in `images/`, that it has alt text, and that it
is one of that notebook's own `cube-NN-*` animations rather than another
notebook's.

Under them sits a folded **frame stepper**: a GIF cannot be paused, and after
its last loop the browser goes back to showing frame 0, so the stepper fetches
the same frames and hands them over one at a time. It is plumbing, it needs the
network like the images do, and it says so rather than raising when there is
none.

## No outputs, no execution counts

Committed deliberately clean, so every number a student sees is one they
produced. Expected results are quoted in the surrounding prose instead — and if
a student's result differs, **that is worth investigating rather than
dismissing**.

Every code cell has been executed against the real datasets. The handbook's
verified numbers all reproduce.

## Editing notebooks with Colab and Gemini

The teaching body of each notebook is editable directly, including in Colab
with Gemini. See [Contributing](../CONTRIBUTING.md) for the repository's editing
boundaries and validation workflow.

Ownership is split deliberately, for sections and extras alike:

- Generated: header, objectives, Colab badge and footer.
- Notebook-owned: every body cell, including Setup, core routes and learning prompts.

Shared objectives and workshop facts live in `_variables.yml`.
Core-route metadata lists preparation and activity cell IDs. Its optional
`support` list names executable feedback helpers before the activity, tagged
`workshop-support`. Keep declarations aligned with the visible instructions;
`scripts/check_teaching_materials.py` checks them and the execution runner
includes the helpers before testing the paired solution.

### Colab to GitHub workflow

1. Open the notebook from its Open in Colab badge.
2. Edit the teaching body with Gemini or by hand.
3. Use File > Save a copy in GitHub and save to your feature branch.
4. Run `uv run --group site python scripts/gen_notebooks.py`.
5. Run `uv run --group site python scripts/check_links.py`.
6. Render with the repository-pinned Quarto version.
7. Review the diff and open a pull request.

The normalizer removes outputs, execution counts and transient Colab per-cell
metadata while preserving teaching cells and folded-solution metadata.

Running `gen_notebooks.py` twice must produce no additional changes.

## Running them somewhere other than Colab

```bash
uv run --group notebooks jupyter lab
```

The `notebooks` group is declared in `pyproject.toml` and generated from what
these notebooks import, so adding an import and rerunning `gen_tables.py` is
what changes the environment. `matplotlib` and `ipywidgets` are in it because
every notebook plots, and every one now builds widgets — the fifteen that
carry sliders, and 00, whose only widget is its predict-first cell. Both ship
with Colab, so their absence only shows up locally. `imageio`, `tensorly`, `torch` and `pyttb`
are not, because the notebooks that need them install them themselves.

`scikit-learn` and `scikit-image` ship the tumour data, the digits and the
photographs, so notebooks 01, 03, 04, 06 and 13 need no network at all. The other
eleven fetch something the first time they run — see the table on the
[notebooks page](https://project-delphi.github.io/tensors-workshop/notebooks.html).
