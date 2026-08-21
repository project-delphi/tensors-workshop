# Notebooks

Twelve notebooks, one per workshop section, numbered to match
[the section table](https://project-delphi.github.io/tensors-workshop) exactly.

**English-primary, with a one-line Spanish summary under each heading** —
*cada encabezado lleva un resumen en español.*

## Every notebook is self-contained

Its setup cell installs, imports and loads **its own data**, so you can open any
one of them cold in a fresh Colab runtime, in any order, without having run the
others. Sections 07, 08 and 10 re-fetch their CSV from GitHub rather than
depending on notebook 00. You will see the same three URLs more than once — that
is deliberate, not accidental duplication.

## The twelve

<!-- BEGIN notebooks -->
| # | Notebook | Covers | Colab |
|---|---|---|---|
| 00 | [`00-setup-and-data.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/00-setup-and-data.ipynb) | Setup and welcome — Load every dataset and confirm your runtime works before anything else. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/00-setup-and-data.ipynb) |
| 01 | [`01-what-a-tensor-is.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/01-what-a-tensor-is.ipynb) | What a tensor is — The vocabulary, shape in NumPy, and the three operations that matter. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/01-what-a-tensor-is.ipynb) |
| 02 | [`02-thinking-in-n-dimensions.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/02-thinking-in-n-dimensions.ipynb) | Thinking in N dimensions — Argue about what each axis means, and why a batch axis differs from a time axis. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/02-thinking-in-n-dimensions.ipynb) |
| 03 | [`03-indexing-and-broadcasting.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/03-indexing-and-broadcasting.ipynb) | Indexing and broadcasting real data — Select the right column of real tumour data, then meet zero-variance pixels. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/03-indexing-and-broadcasting.ipynb) |
| 04 | [`04-reshape-and-transpose.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/04-reshape-and-transpose.ipynb) | Reshape and transpose real images — HWC to CHW, NHWC to NCHW, and why reshape silently destroys an image. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/04-reshape-and-transpose.ipynb) |
| 05 | [`05-video-pipeline-design.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/05-video-pipeline-design.ipynb) | Video pipeline design — Design the tensor shape at every stage of two real video systems. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/05-video-pipeline-design.ipynb) |
| 06 | [`06-contraction-with-einsum.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/06-contraction-with-einsum.ipynb) | Contraction with einsum — One notation for the dot product, the matrix product, and a batch of images. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/06-contraction-with-einsum.ipynb) |
| 07 | [`07-inverses-and-pseudoinverse.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/07-inverses-and-pseudoinverse.ipynb) | Inverses and the pseudoinverse — Solve a 20,433-equation system that has no exact solution. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/07-inverses-and-pseudoinverse.ipynb) |
| 08 | [`08-recursion-with-matrices.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/08-recursion-with-matrices.ipynb) | Recursion with matrices and vectors — Apply one matrix again and again: Fibonacci, eigenvectors, and a real forecast. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/08-recursion-with-matrices.ipynb) |
| 09 | [`09-convolution-and-deconvolution.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/09-convolution-and-deconvolution.ipynb) | Convolution and deconvolution — Convolution is a structured matrix product, and blur can be partly undone. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/09-convolution-and-deconvolution.ipynb) |
| 10 | [`10-tucker-decomposition.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/10-tucker-decomposition.ipynb) | Tucker decomposition on real data — PCA generalized to every axis, on a real tensor of New York taxi trips. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/10-tucker-decomposition.ipynb) |
| 11 | [`11-wrap-up-and-take-homes.ipynb`](https://github.com/project-delphi/tensors-workshop/blob/main/notebooks/11-wrap-up-and-take-homes.ipynb) | Wrap-up and take-homes — What connects Blocks 4, 5 and 6, plus three take-home exercises. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/11-wrap-up-and-take-homes.ipynb) |
<!-- END notebooks -->

## Shape of each notebook

1. **Header** — title, objectives, Spanish summary, *Open in Colab* badge.
2. **Setup** — only what this section needs.
3. **Explanation and code**, alternating, building up rather than dumping a wall
   of code.
4. **Exercises** — `# TODO` stubs taken from the handbook, each followed by a
   folded solution cell (`cellView: form`, so Colab hides it behind a
   *Show code* toggle).
5. **Closing** — that section's Kahoot check, and a link back to the site.

## No outputs, no execution counts

Committed deliberately clean, so every number a student sees is one they
produced. Expected results are quoted in the surrounding prose instead — and if
a student's result differs, **that is worth investigating rather than
dismissing**.

Every code cell has been executed against the real datasets. The handbook's
verified numbers all reproduce.

## Do not edit these files directly

They are generated:

```bash
uv run --with pyyaml,nbformat python scripts/gen_notebooks.py
```

Teaching content lives in [`scripts/content.py`](../scripts/content.py);
the header, Colab badge and Kahoot footer are built by
[`scripts/gen_notebooks.py`](../scripts/gen_notebooks.py) from
[`_variables.yml`](../_variables.yml). Editing a notebook by hand means your
change disappears the next time anyone regenerates.

## Running them somewhere other than Colab

```bash
uv run --with numpy,pandas,scikit-learn,scikit-image,scipy,jupyterlab jupyter lab
```

`scikit-learn` and `scikit-image` ship the tumour data, the digits and the
photographs, so most sections work with no network at all.
