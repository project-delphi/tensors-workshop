# Tensors for Machine Learning

[![Publish](https://github.com/project-delphi/tensors-workshop/actions/workflows/publish.yml/badge.svg)](https://github.com/project-delphi/tensors-workshop/actions/workflows/publish.yml)
[![Site](https://img.shields.io/badge/site-GitHub%20Pages-2f4858)](https://project-delphi.github.io/tensors-workshop)
[![Built with Quarto](https://img.shields.io/badge/built%20with-Quarto-2c5f8a)](https://quarto.org)
[![Open in Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/00-setup-and-data.ipynb)
[![Slides EN](https://img.shields.io/badge/slides-EN-informational)](https://project-delphi.github.io/tensors-workshop/slides/en/)
[![Diapositivas ES](https://img.shields.io/badge/diapositivas-ES-informational)](https://project-delphi.github.io/tensors-workshop/slides/es/)

**A 3-hour workshop (195 minutes including three Kahoot knowledge checks) that
takes you from "I know matrices" to manipulating, solving, convolving and
factorizing tensors.**

📍 **[project-delphi.github.io/tensors-workshop](https://project-delphi.github.io/tensors-workshop)**
 · 🇪🇸 [En español](#tensores-para-aprendizaje-automático)

---

## Who it is for

You have read *[Deep Learning](https://www.deeplearningbook.org/contents/linear_algebra.html)*
(Goodfellow, Bengio & Courville), **Chapter 2 — Linear Algebra**. You know
matrices. The workshop assumes **no previous
knowledge of tensor theory**, and every new term is defined where it first
appears.

Taught in English; questions welcome in Spanish or English. The slide deck
exists in both languages and every notebook heading carries a one-line Spanish
summary.

## Prerequisites

- The linear algebra in Chapter 2: vectors, matrices, the matrix product, the
  inverse, eigendecomposition, SVD.
- A Google account, to run the notebooks in Colab. **Nothing to install.**
- Three CSV files download at the start. Run
  [notebook 00](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/00-setup-and-data.ipynb)
  **before** the session — a silent download failure leaves you stuck at
  sections 07 and 10, an hour in.

## All the data is real

No synthetic random arrays anywhere. Real tumour measurements, real handwritten
digits, real histology and microscopy images, real New York taxi trips, real
airline traffic — because real data contains problems random data never shows:
missing values, features on incompatible scales, pixels that never change.
Finding those problems is part of the work.

Most of it ships inside scikit-learn and scikit-image (`load_breast_cancer`,
`load_digits`, `data.camera()`, `data.astronaut()`). California Housing, NYC
Taxi Trips and the Airline Passengers series are downloaded once.

## The sections

<!-- BEGIN sections-en -->
| # | Section | Slides EN | Slides ES | Notebook | Quiz |
|---|---|---|---|---|---|
| 00 | Setup and welcome | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-00-setup-and-data) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-00-setup-and-data) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/00-setup-and-data.ipynb) | — |
| 01 | What a tensor is | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-01-what-a-tensor-is) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-01-what-a-tensor-is) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/01-what-a-tensor-is.ipynb) | [Q1](https://project-delphi.github.io/tensors-workshop/kahoot.html#quiz-1) |
| 02 | Thinking in N dimensions | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-02-thinking-in-n-dimensions) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-02-thinking-in-n-dimensions) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/02-thinking-in-n-dimensions.ipynb) | — |
| 03 | Indexing and broadcasting real data | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-03-indexing-and-broadcasting) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-03-indexing-and-broadcasting) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/03-indexing-and-broadcasting.ipynb) | [Q1](https://project-delphi.github.io/tensors-workshop/kahoot.html#quiz-1) |
| 04 | Reshape and transpose real images | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-04-reshape-and-transpose) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-04-reshape-and-transpose) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/04-reshape-and-transpose.ipynb) | [Q1](https://project-delphi.github.io/tensors-workshop/kahoot.html#quiz-1) |
| 05 | Video pipeline design | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-05-video-pipeline-design) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-05-video-pipeline-design) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/05-video-pipeline-design.ipynb) | — |
| 06 | Contraction with einsum | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-06-contraction-with-einsum) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-06-contraction-with-einsum) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/06-contraction-with-einsum.ipynb) | [Q2](https://project-delphi.github.io/tensors-workshop/kahoot.html#quiz-2) |
| 07 | Inverses and the pseudoinverse | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-07-inverses-and-pseudoinverse) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-07-inverses-and-pseudoinverse) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/07-inverses-and-pseudoinverse.ipynb) | [Q2](https://project-delphi.github.io/tensors-workshop/kahoot.html#quiz-2) |
| 08 | Recursion with matrices and vectors | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-08-recursion-with-matrices) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-08-recursion-with-matrices) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/08-recursion-with-matrices.ipynb) | — |
| 09 | Convolution and deconvolution | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-09-convolution-and-deconvolution) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-09-convolution-and-deconvolution) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/09-convolution-and-deconvolution.ipynb) | [Q3](https://project-delphi.github.io/tensors-workshop/kahoot.html#quiz-3) |
| 10 | Tucker decomposition on real data | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-10-tucker-decomposition) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-10-tucker-decomposition) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/10-tucker-decomposition.ipynb) | [Q3](https://project-delphi.github.io/tensors-workshop/kahoot.html#quiz-3) |
| 11 | Wrap-up and take-homes | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-11-wrap-up-and-take-homes) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-11-wrap-up-and-take-homes) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/11-wrap-up-and-take-homes.ipynb) | — |
<!-- END sections-en -->

The 🎯 quizzes run after sections 04, 07 and 10. The twelve sections come to 165
minutes; the three quizzes add 15 and three 5-minute breaks another 15, for 195.

## Run it locally

```bash
git clone https://github.com/project-delphi/tensors-workshop.git
cd tensors-workshop
quarto preview          # live-reloading site at http://localhost:4200
quarto render           # writes docs/
```

Only Quarto is needed to build the site — the notebooks are **not** executed at
render time. To run the notebooks locally instead of in Colab:

```bash
uv run --with numpy,pandas,scikit-learn,scikit-image,scipy,matplotlib,jupyterlab jupyter lab
```

### Regenerating the derived files

`_variables.yml` is the single source of truth: repo coordinates, the twelve
sections, the three quizzes. Two scripts read it, and **nothing they produce
should be edited by hand**:

```bash
uv run --with pyyaml python scripts/gen_tables.py               # tables + README tables
uv run --with pyyaml,nbformat python scripts/gen_notebooks.py   # the 12 notebooks
uv run --with pyyaml,nbformat python scripts/check_links.py     # verify docs/
```

## How it deploys

GitHub Pages serves the **`docs/` folder on `main`**, so `docs/` is committed.
`.github/workflows/publish.yml` re-renders on every push and fails if the
committed `docs/` is stale or any link is broken — it is a guard, not the
publisher. Render and commit `docs/` along with your change.

## Repo layout

```
_variables.yml          single source of truth — sections, quizzes, URLs
_quarto.yml             website config; renders to docs/
_includes/              generated tables, included by the .qmd pages
index.qmd  es/index.qmd landing pages, EN and ES
notebooks.qmd  kahoot.qmd
slides/en/  slides/es/  the two revealjs decks + shared slides.scss
notebooks/              12 Colab notebooks, one per section
kahoot/                 3 .xlsx quiz import files
scripts/                generators and the link checker
tensors_workshop_plan_with_quizzes.md   the source handbook
docs/                   rendered site (committed — this is what Pages serves)
```

Directory READMEs: [`notebooks/`](notebooks/README.md) ·
[`slides/`](slides/README.md) · [`kahoot/`](kahoot/README.md)

## Further reading

Books, the seminal Tucker/CP/SVD papers (with DOIs and author pages), and the
`tensorly` docs: see **[Further Reading](https://project-delphi.github.io/tensors-workshop/tensors_workshop_plan_with_quizzes.html#further-reading)**
in the Handbook.

---

# Tensores para Aprendizaje Automático

**Un taller de 3 horas (195 minutos con tres controles de conocimiento con
Kahoot) que te lleva de «sé lo que es una matriz» a manipular, resolver,
convolucionar y factorizar tensores.**

📍 **[project-delphi.github.io/tensors-workshop/es](https://project-delphi.github.io/tensors-workshop/es/)**
 · 🇬🇧 [In English](#tensors-for-machine-learning)

## Para quién es

Has leído *[Deep Learning](https://www.deeplearningbook.org/contents/linear_algebra.html)*
(Goodfellow, Bengio y Courville), **capítulo 2 — Álgebra lineal**. Sabes qué es
una matriz. El taller **no supone ningún
conocimiento previo de teoría de tensores**, y cada término nuevo se define
donde aparece por primera vez.

Se imparte en inglés; las preguntas son bienvenidas en español o en inglés. Las
diapositivas están en los dos idiomas y cada encabezado de los cuadernos lleva un
resumen de una línea en español.

## Requisitos previos

- El álgebra lineal del capítulo 2: vectores, matrices, el producto matricial,
  la inversa, la descomposición espectral y la SVD.
- Una cuenta de Google para ejecutar los cuadernos en Colab. **No hay que
  instalar nada.**
- Al principio se descargan tres archivos CSV. Ejecuta el
  [cuaderno 00](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/00-setup-and-data.ipynb)
  **antes** de la sesión: una descarga que falla en silencio te deja atascado en
  las secciones 07 y 10, una hora después.

## Todos los datos son reales

Ni un solo array aleatorio. Medidas reales de tumores, dígitos manuscritos
reales, imágenes reales de histología y microscopía, viajes reales en taxi de
Nueva York, tráfico aéreo real, porque los datos reales contienen problemas que
los aleatorios nunca muestran: valores faltantes, variables en escalas
incompatibles, píxeles que nunca cambian. Encontrar esos problemas es parte del
trabajo.

## Las secciones

<!-- BEGIN sections-es -->
| # | Sección | Diapos EN | Diapos ES | Cuaderno | Quiz |
|---|---|---|---|---|---|
| 00 | Preparación y bienvenida | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-00-setup-and-data) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-00-setup-and-data) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/00-setup-and-data.ipynb) | — |
| 01 | Qué es un tensor | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-01-what-a-tensor-is) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-01-what-a-tensor-is) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/01-what-a-tensor-is.ipynb) | [Q1](https://project-delphi.github.io/tensors-workshop/kahoot.html#quiz-1) |
| 02 | Pensar en N dimensiones | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-02-thinking-in-n-dimensions) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-02-thinking-in-n-dimensions) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/02-thinking-in-n-dimensions.ipynb) | — |
| 03 | Indexación y broadcasting con datos reales | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-03-indexing-and-broadcasting) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-03-indexing-and-broadcasting) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/03-indexing-and-broadcasting.ipynb) | [Q1](https://project-delphi.github.io/tensors-workshop/kahoot.html#quiz-1) |
| 04 | Reshape y transposición de imágenes reales | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-04-reshape-and-transpose) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-04-reshape-and-transpose) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/04-reshape-and-transpose.ipynb) | [Q1](https://project-delphi.github.io/tensors-workshop/kahoot.html#quiz-1) |
| 05 | Diseño de un pipeline de vídeo | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-05-video-pipeline-design) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-05-video-pipeline-design) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/05-video-pipeline-design.ipynb) | — |
| 06 | Contracción con einsum | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-06-contraction-with-einsum) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-06-contraction-with-einsum) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/06-contraction-with-einsum.ipynb) | [Q2](https://project-delphi.github.io/tensors-workshop/kahoot.html#quiz-2) |
| 07 | Inversas y la pseudoinversa | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-07-inverses-and-pseudoinverse) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-07-inverses-and-pseudoinverse) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/07-inverses-and-pseudoinverse.ipynb) | [Q2](https://project-delphi.github.io/tensors-workshop/kahoot.html#quiz-2) |
| 08 | Recursión con matrices y vectores | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-08-recursion-with-matrices) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-08-recursion-with-matrices) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/08-recursion-with-matrices.ipynb) | — |
| 09 | Convolución y deconvolución | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-09-convolution-and-deconvolution) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-09-convolution-and-deconvolution) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/09-convolution-and-deconvolution.ipynb) | [Q3](https://project-delphi.github.io/tensors-workshop/kahoot.html#quiz-3) |
| 10 | Descomposición de Tucker con datos reales | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-10-tucker-decomposition) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-10-tucker-decomposition) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/10-tucker-decomposition.ipynb) | [Q3](https://project-delphi.github.io/tensors-workshop/kahoot.html#quiz-3) |
| 11 | Cierre y ejercicios para casa | [EN](https://project-delphi.github.io/tensors-workshop/slides/en/#sec-11-wrap-up-and-take-homes) | [ES](https://project-delphi.github.io/tensors-workshop/slides/es/#sec-11-wrap-up-and-take-homes) | [Colab](https://colab.research.google.com/github/project-delphi/tensors-workshop/blob/main/notebooks/11-wrap-up-and-take-homes.ipynb) | — |
<!-- END sections-es -->

Los cuestionarios 🎯 se ejecutan después de las secciones 04, 07 y 10. Las doce
secciones suman 165 minutos; los tres cuestionarios añaden 15 y las tres pausas
de 5 minutos otros 15: en total, 195.

## Ejecutarlo en local

```bash
git clone https://github.com/project-delphi/tensors-workshop.git
cd tensors-workshop
quarto preview          # sitio con recarga automática en http://localhost:4200
quarto render           # escribe docs/
```

Solo hace falta Quarto para construir el sitio: los cuadernos **no** se ejecutan
al renderizar.

## Cómo se publica

GitHub Pages sirve la carpeta **`docs/` de `main`**, así que `docs/` está en el
repositorio. `.github/workflows/publish.yml` vuelve a renderizar en cada push y
falla si el `docs/` publicado está desactualizado o si algún enlace está roto.
Renderiza y haz commit de `docs/` junto con tu cambio.

## Lectura adicional

Libros, los artículos originales de Tucker/CP/SVD (con DOI y páginas de los
autores) y la documentación de `tensorly`: consulta
**[Further Reading](https://project-delphi.github.io/tensors-workshop/tensors_workshop_plan_with_quizzes.html#further-reading)**
en el Handbook (en inglés).
