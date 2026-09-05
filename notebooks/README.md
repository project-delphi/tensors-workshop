# Notebooks

Twelve notebooks, one per workshop section, numbered to match
[the section table](https://project-delphi.github.io/tensors-workshop) exactly —
plus two take-home deep dives, numbered 12 and 13, that are **not** sections.

**English-primary, with a one-line Spanish summary under each heading** —
*cada encabezado lleva un resumen en español.*

## Every notebook is self-contained

Its setup cell installs, imports and loads **its own data**, so you can open any
one of them cold in a fresh Colab runtime, in any order, without having run the
others. Sections 02, 05, 07, 08 and 10 re-fetch their own data rather than
depending on notebook 00, as do all three of 11, 12 and 13. You will see the
same URLs more than once — that is deliberate, not accidental duplication.

## The twelve sections

<!-- BEGIN notebooks -->
| # | Notebook | Covers | Colab |
|---|---|---|---|
| 00 | [`00-setup-and-data.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/00-setup-and-data.ipynb) | Setup and welcome — Load every dataset and confirm your runtime works before anything else. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/00-setup-and-data.ipynb) |
| 01 | [`01-what-a-tensor-is.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/01-what-a-tensor-is.ipynb) | What a tensor is — Learn to read a tensor's structure and track what its axes mean as you fix, rearrange, or contract them. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/01-what-a-tensor-is.ipynb) |
| 02 | [`02-thinking-in-n-dimensions.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/02-thinking-in-n-dimensions.ipynb) | Thinking in N dimensions — Learn to read real tensors by asking what every axis counts and why a batch axis is not the same thing as a time axis. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/02-thinking-in-n-dimensions.ipynb) |
| 03 | [`03-indexing-and-broadcasting.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/03-indexing-and-broadcasting.ipynb) | Indexing and broadcasting real data — Select named measurements from real tumour-sample data, compare meaningful subsets, then standardize real image data safely. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/03-indexing-and-broadcasting.ipynb) |
| 04 | [`04-reshape-and-transpose.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/04-reshape-and-transpose.ipynb) | Reshape and transpose real images — Use real images to move between HWC↔CHW and NHWC↔NCHW, then show why matching shapes do not guarantee matching axis semantics. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/04-reshape-and-transpose.ipynb) |
| 05 | [`05-video-pipeline-design.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/05-video-pipeline-design.ipynb) | Video pipeline design — Process one pinned real video end to end, then use what its axes actually mean to design two downstream video pipelines. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/05-video-pipeline-design.ipynb) |
| 06 | [`06-contraction-with-einsum.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/06-contraction-with-einsum.ipynb) | Contraction with einsum — Use one index rule on real data, then change the inputs interactively to test which index disappears. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/06-contraction-with-einsum.ipynb) |
| 07 | [`07-inverses-and-pseudoinverse.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/07-inverses-and-pseudoinverse.ipynb) | Inverses and the pseudoinverse — Use the pseudoinverse on real singular, tall, and wide systems, then inspect the geometry interactively. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/07-inverses-and-pseudoinverse.ipynb) |
| 08 | [`08-recursion-with-matrices.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/08-recursion-with-matrices.ipynb) | Recursion with matrices and vectors — Treat recursion as repeated state updates, connect repeated multiplication with dominant eigen-directions, and test recursive forecasting on real airline-passenger data. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/08-recursion-with-matrices.ipynb) |
| 09 | [`09-convolution-and-deconvolution.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/09-convolution-and-deconvolution.ipynb) | Convolution and deconvolution — Treat convolution as a structured linear operator, separate it from correlation, understand transposed convolution, and partially recover a real blurred image. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/09-convolution-and-deconvolution.ipynb) |
| 10 | [`10-tucker-decomposition.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/10-tucker-decomposition.ipynb) | Tucker decomposition on real data — Build a real tensor from New York taxi trips, compress each mode with HOSVD, and explore the trade-off between size, reconstruction error, and interpretable structure. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/10-tucker-decomposition.ipynb) |
| 11 | [`11-wrap-up-and-take-homes.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/11-wrap-up-and-take-homes.ipynb) | Wrap-up and take-homes — Wrap up the workshop around one connecting idea, then choose among five extensions: PCA, attention, CP, Cholesky, and audio. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/11-wrap-up-and-take-homes.ipynb) |
<!-- END notebooks -->

## The two extras

`12-matrix-factorizations.ipynb` and `13-tensor-factorizations.ipynb` are deep
dives, handed out as take-home material after the session. They are declared
under `extras:` in `_variables.yml` rather than `sections:`, and that mapping is
deliberately missing `minutes`, `start`, `end` and `part` — `scripts/timeline.py`
only ever walks `sections`, so nothing about an extra can move a start time or
the agenda. They also get no `#sec-NN` slide anchor and no Kahoot.

Everything else about them is a notebook like any other: the same generated
header and footer, the same ownership boundary, the same checks.

## Shape of each notebook

1. **Header** — title, objectives, Spanish summary, *Open in Colab* badge.
2. **Setup** — only what this section needs.
3. **Explanation and code**, alternating, building up rather than dumping a wall
   of code.
4. **Exercises** — `# TODO` stubs taken from the handbook, each followed by a
   folded solution cell (`cellView: form`, so Colab hides it behind a
   *Show code* toggle).
5. **Closing** — that section's Kahoot check, and a link back to the site. An
   extra has no Kahoot, so its closing is the next deep dive and the site links.

## No outputs, no execution counts

Committed deliberately clean, so every number a student sees is one they
produced. Expected results are quoted in the surrounding prose instead — and if
a student's result differs, **that is worth investigating rather than
dismissing**.

Every code cell has been executed against the real datasets. The handbook's
verified numbers all reproduce.

## Editing notebooks with Colab and Gemini

The teaching body of each notebook is editable directly. Edits made in Colab,
including edits made with Gemini, no longer need to be retyped into
`scripts/content.py`.

Ownership is split deliberately, for sections and extras alike:

- Generated: header, objectives, Colab badge, Setup preamble, Setup code, footer.
- Notebook-owned: teaching cells between Setup and the footer.

Shared objectives and workshop facts live in `_variables.yml`.
Central Setup code lives in `scripts/content.py`.

### Colab to GitHub workflow

1. Open the notebook from its Open in Colab badge.
2. Edit the teaching body with Gemini or by hand.
3. Use File > Save a copy in GitHub and save to your feature branch.
4. Run `uv run --with pyyaml,nbformat python scripts/gen_notebooks.py`.
5. Run `uv run --with pyyaml,nbformat python scripts/check_links.py`.
6. Render with the repository-pinned Quarto version.
7. Review the diff and open a pull request.

The normalizer removes outputs, execution counts and transient Colab per-cell
metadata while preserving teaching cells and folded-solution metadata.

Running `gen_notebooks.py` twice must produce no additional changes.

## Running them somewhere other than Colab

```bash
uv run --with numpy,pandas,matplotlib,scikit-learn,scikit-image,scipy,jupyterlab,ipywidgets jupyter lab
```

`matplotlib` and `ipywidgets` are in that list because every notebook plots and
all but 00 use sliders; both ship with Colab, so their absence only shows up
locally. `imageio[ffmpeg]` and `tensorly` are not, because the notebooks that
need them install them themselves.

`scikit-learn` and `scikit-image` ship the tumour data, the digits and the
photographs, so sections 01, 03, 04, 06 and 09 need no network at all. The other
nine fetch something the first time they run — see the table on the
[notebooks page](https://project-delphi.github.io/tensors-workshop/notebooks.html).
