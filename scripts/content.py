"""Teaching content for the twelve section notebooks.

One entry per section number. Each is `{objectives, setup, cells}`:

    objectives  bullets for the generated header cell
    setup       source of the single self-contained setup cell
    cells       the body, built from md() / code() / solution()

Everything here is drawn from tensors_workshop_plan_with_quizzes.md — the
TODOs, the worked solutions and the verified numbers are the handbook's, not
invented. When the handbook and this file disagree, the handbook wins.

Scaffolding (header, badge, Kahoot footer) lives in gen_notebooks.py.
"""
from __future__ import annotations

from gen_notebooks import code, md, solution

# Repeated verbatim wherever a notebook needs one of the three CSVs, so that
# every notebook loads its own data and none depends on notebook 00 having run.
CSV_URLS = """HOUSING = "https://raw.githubusercontent.com/ageron/handson-ml2/master/datasets/housing/housing.csv"
TAXIS   = "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/taxis.csv"
FLIGHTS = "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/flights.csv\""""

UNFOLD = '''def unfold(T, axis):
    """Move `axis` to the front, flatten everything else into one long axis."""
    return np.moveaxis(T, axis, 0).reshape(T.shape[axis], -1)'''

CONTENT: dict[str, dict] = {}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["00"] = {
    "objectives": [
        "Confirm your Colab runtime can reach every dataset the workshop uses.",
        "Know which data ships inside the libraries and which is downloaded.",
        "Recognise the shapes you will be working with all day.",
    ],
    "setup": f"""# Nothing to install — Colab already has all of this.
import numpy as np
import pandas as pd
from sklearn.datasets import load_digits, load_breast_cancer
from skimage import data
from scipy import signal
from scipy.linalg import lu, toeplitz

{CSV_URLS}

housing = pd.read_csv(HOUSING)
taxis   = pd.read_csv(TAXIS)
flights = pd.read_csv(FLIGHTS)
print(housing.shape, taxis.shape, flights.shape)   # (20640, 10) (6433, 14) (144, 3)""",
    "cells": [
        md("""## All the data here is real

> 🇪🇸 Todos los datos de este taller son reales, no inventados.

Nothing in this workshop is invented with random numbers, because real data
contains problems that random data never shows — missing values, features on
incompatible scales, pixels that never change. **Finding those problems is part
of the work.**

### Included inside the libraries (no download, works offline)

| Dataset | What it is | Shape |
|---|---|---|
| `load_breast_cancer()` | 569 real patients, 30 measurements from tumour cell images | `(569, 30)` |
| `load_digits()` | 1797 real handwritten digits | `(1797, 8, 8)` |
| `data.camera()`, `data.astronaut()` | Real photographs | `(512, 512)`, `(512, 512, 3)` |
| `data.immunohistochemistry()`, `data.cell()` | Real histology and microscopy | `(512, 512, 3)`, `(660, 550)` |

### Downloaded once at the start (needs internet, takes a few seconds)

| Dataset | What it is | Used for |
|---|---|---|
| California Housing | 20,640 real housing districts, 1990 US census | Pseudoinverse, least squares (section 07) |
| NYC Taxi Trips | 6,433 real taxi journeys in New York | Tensor factorization (section 10) |
| Airline Passengers | 144 months of real airline traffic, 1949–1960 | Recursion, forecasting (section 08) |

If the setup cell above printed `(20640, 10) (6433, 14) (144, 3)`, you are ready.
**If it failed, say so in Discord immediately** — a silent download failure will
leave you stuck at sections 07 and 10, an hour from now, with no obvious cause."""),
        md("""## See it, not just its shape

> 🇪🇸 Confírmalo con los ojos, no solo con `.shape`.

A shape can match on paper for reasons that are actually bugs — a truncated
download, a stale cached file, a column that came back silently empty. These
three files just came over the network; a glance at each is cheaper than
discovering a bad download at section 07 or 10, an hour from now."""),
        code("""import matplotlib.pyplot as plt

fig, axes = plt.subplots(1, 3, figsize=(12, 3.2))

sc = axes[0].scatter(housing["longitude"], housing["latitude"],
                      c=housing["median_house_value"], cmap="viridis", s=4)
axes[0].set_title("housing — location, coloured by price")
fig.colorbar(sc, ax=axes[0], fraction=0.046)

axes[1].hist(taxis["fare"].dropna(), bins=30, color="#4C72B0")
axes[1].set_title("taxis — fare distribution")
axes[1].set_xlabel("fare ($)")

by_year = flights.groupby("year")["passengers"].sum()
axes[2].plot(by_year.index, by_year.values, marker="o", color="#55A868")
axes[2].set_title("flights — passengers per year")

fig.suptitle("Real California geography, real fares, real growth — "
             "if these look right, the downloads worked")
plt.tight_layout()
plt.show()"""),
        md("""## Exercise 1 — check the data you did not download

> 🇪🇸 Comprueba los datos que vienen dentro de las librerías."""),
        code("""# TODO 1: Load the breast cancer data and print the shape of its `.data`.
#         Say out loud what each of the two axes means.

# TODO 2: Print the shape of `load_digits().images` and of
#         `data.immunohistochemistry()`. Both are order 3 — three axes.
#         Do their axes mean the same things?"""),
        solution("""bc = load_breast_cancer()
print(bc.data.shape)                          # (569, 30)  patients x measurements

print(load_digits().images.shape)             # (1797, 8, 8)   images x height x width
print(data.immunohistochemistry().shape)      # (512, 512, 3)  height x width x colour

# Both are order 3, and they have nothing in common. `digits.images` counts
# IMAGES along axis 0; the photo counts COLOURS along axis 2. The shape alone
# never tells you what the axes mean. You must know, and you must keep track."""),
        md("""## Exercise 2 — a first look at the downloads

> 🇪🇸 Una primera mirada a los archivos descargados.

One of these three files has a problem waiting in it. You will meet it properly
in section 07, but it is worth seeing now."""),
        code("""# TODO 3: Print housing.shape, and then the number of missing values in
#         each column. Which column has them, and how many?

# TODO 4: The taxi data has a 'pickup' column of timestamps. Convert it with
#         pd.to_datetime and extract the hour. Which hour has the most trips?
#         (Keep this number — section 10 comes back to it.)"""),
        solution("""print(housing.shape)                                  # (20640, 10)
print(housing.isnull().sum()[lambda s: s > 0])        # total_bedrooms  207

hour = pd.to_datetime(taxis["pickup"]).dt.hour
print(hour.value_counts().idxmax())                   # 18 — evening rush

# 207 missing values in `total_bedrooms`. Real data. In section 07 you will drop
# those rows before solving a 20,433-equation system, and in section 10 a tensor
# decomposition will rediscover that hour 18 all by itself."""),
        md("""## A note on how these notebooks work

Every notebook is **self-contained**: it installs, imports and loads its own
data, so you can open any one of them cold without having run the others. That
means you will see these same three URLs again. That is deliberate, not
duplication by accident.

The notebooks are committed with **no outputs**. Every number you see is one you
produced. Expected results are quoted in the prose so you can check yours — and
if yours differ, that is worth investigating rather than dismissing."""),
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["01"] = {
    "objectives": [
        "Use the vocabulary: order, axis, mode, shape, slice, fiber, unfolding, contraction, decomposition.",
        "Read `.shape`, `.ndim` and `.size` off any array and say what each axis means.",
        "Take slices and fibers, and unfold a tensor into a matrix without losing anything.",
        "Write a dot product and a matrix product as `einsum` contractions.",
        "Place LU, QR, eigendecomposition, SVD, the pseudoinverse, Cholesky and Tucker in one map.",
    ],
    "setup": """import numpy as np
from sklearn.datasets import load_digits
from skimage import data
from scipy.linalg import lu

rng = np.random.default_rng(0)""",
    "cells": [
        md("""## 1.1 Vocabulary

> 🇪🇸 El vocabulario. Casi todos los términos son casi idénticos en español.

Keep this table open for the whole workshop.

| Term | Plain meaning | Spanish | Example |
|---|---|---|---|
| **Tensor** | An array of numbers with any number of axes | *tensor* | A colour image |
| **Axis** (pl. axes) | One direction along which data is arranged | *eje* | Height; width; colour |
| **Mode** | Another word for axis, used in tensor theory | *modo* | "mode-0 unfolding" |
| **Order** | How many axes a tensor has | *orden* | A matrix has order 2 |
| **Shape** | The size along each axis, as a tuple | *forma* | `(512, 512, 3)` |
| **Slice** | Fix one index, keep the rest | *corte* | One colour channel |
| **Fiber** | Fix every index except one | *fibra* | The 3 colour values of one pixel |
| **Unfolding** | Rearranging a tensor into a matrix | *desplegado* | Needed for decompositions |
| **Contraction** | Multiply and sum over a shared axis | *contracción* | The dot product |
| **Decomposition** | Writing one tensor as a product of simpler ones | *descomposición* | SVD, Tucker |

⚠️ **Warning about the word "rank".** In Chapter 2, *rank* means the number of
independent columns of a matrix. In tensor theory, *rank* often means the number
of axes. To avoid confusion, this workshop says **order** for the number of
axes, and **rank** only in Chapter 2's sense."""),
        md("""## 1.2 Shape in NumPy

> 🇪🇸 La forma en NumPy: `.shape`, `.ndim` y `.size`.

Every NumPy array has `.shape`, a tuple giving the size along each axis. The
length of that tuple is `.ndim`, the number of axes."""),
        code("""scalar = np.array(3.0)                     # book: a           — order 0
vector = np.array([1., 2., 3.])            # book: x, x_i      — order 1
matrix = np.array([[1., 2.], [3., 4.]])    # book: A, A_{i,j}  — order 2
tensor = rng.standard_normal((2, 3, 4))    # book: A_{i,j,k}   — order 3

for name, arr in [("scalar", scalar), ("vector", vector),
                  ("matrix", matrix), ("tensor", tensor)]:
    print(f"{name:8s} shape={str(arr.shape):12s} ndim={arr.ndim}  size={arr.size}")"""),
        md("""A scalar has `shape=()`, an empty tuple — there are no axes to measure. And
`size` is always the product of the numbers in `shape`: 2 × 3 × 4 = 24.

Now with real data."""),
        code("""digits = load_digits()
print(digits.images.shape)      # (1797, 8, 8)  — 1797 handwritten digits, 8x8 pixels

photo = data.immunohistochemistry()
print(photo.shape)              # (512, 512, 3) — height, width, colour"""),
        md("""Both are order 3, but their axes mean completely different things.
`digits.images` counts *images* along axis 0; `photo` counts *colours* along
axis 2. **The shape alone never tells you what the axes mean.** You must know,
and you must keep track."""),
        md("""## Exercise 1 — read the shapes

> 🇪🇸 Lee las formas y di qué significa cada eje."""),
        code("""# TODO 1: Build a scalar, a vector, a matrix and an order-3 tensor, and print
#         .shape, .ndim and .size for each. Which one has shape ()?

# TODO 2: Take load_digits().images and data.astronaut(). Both are order 3.
#         For each, write down in a comment what axis 0, 1 and 2 count."""),
        solution("""for arr in [np.array(3.0), np.zeros(3), np.zeros((2, 2)), np.zeros((2, 3, 4))]:
    print(arr.shape, arr.ndim, arr.size)
# ()        0 1
# (3,)      1 3
# (2, 2)    2 4
# (2, 3, 4) 3 24

print(load_digits().images.shape)   # (1797, 8, 8)   axis 0 = which image
                                    #                axis 1 = row of pixels
                                    #                axis 2 = column of pixels
print(data.astronaut().shape)       # (512, 512, 3)  axis 0 = height
                                    #                axis 1 = width
                                    #                axis 2 = colour channel"""),
        md("""## 1.3 The three operations that matter

> 🇪🇸 Cortes y fibras, desplegado y contracción — las tres operaciones clave.

### Slices and fibers — fixing indices takes a tensor apart"""),
        code("""print(photo[:, :, 0].shape)       # (512, 512) — a slice: one colour channel, still an image
print(photo[100, 200, :].shape)   # (3,)       — a fiber: the 3 colour values of one pixel"""),
        md("""Same picture, same two indexing operations — see them together. Drag the
sliders and watch the marked pixel move on both panels at once, while its
fiber (three numbers, one per colour) redraws on the right.

> 🇪🇸 Mueve los deslizadores: el mismo píxel se marca en el corte y en la
> imagen completa, y su fibra (tres números, uno por color) se redibuja."""),
        code("""# Colab renders ipywidgets through its own widget manager rather than the
# classic Jupyter one; this call is a no-op outside Colab, which is why it is
# guarded rather than assumed.
try:
    from google.colab import output
    output.enable_custom_widget_manager()
except ImportError:
    pass

import ipywidgets as widgets
import matplotlib.pyplot as plt

def show_slice_and_fiber(row, col):
    plt.close('all')
    fig, axes = plt.subplots(1, 3, figsize=(11, 3.2))

    axes[0].imshow(photo)
    axes[0].scatter([col], [row], color='#C44E52', s=70, edgecolor='white')
    axes[0].set_title('photo — the fiber, marked')
    axes[0].axis('off')

    axes[1].imshow(photo[:, :, 0], cmap='gray')
    axes[1].scatter([col], [row], color='#C44E52', s=70, edgecolor='white')
    axes[1].set_title('photo[:, :, 0] — a slice')
    axes[1].axis('off')

    fiber = photo[row, col, :]
    axes[2].bar(['R', 'G', 'B'], fiber, color=['#C44E52', '#55A868', '#4C72B0'])
    axes[2].set_title(f'photo[{row}, {col}, :] — the fiber')
    axes[2].set_ylim(0, 255)

    plt.tight_layout()
    plt.show()

widgets.interact(show_slice_and_fiber,
                  row=widgets.IntSlider(min=0, max=511, step=1, value=100, description='row'),
                  col=widgets.IntSlider(min=0, max=511, step=1, value=200, description='col'));"""),
        md("""### Unfolding — every decomposition begins here

Every tensor decomposition begins by turning the tensor into a matrix, one axis
at a time. Move axis *k* to the front, then flatten everything else into one
long axis."""),
        code(UNFOLD + """

print(unfold(photo, 0).shape)   # (512, 1536) — rows are the height axis
print(unfold(photo, 2).shape)   # (3, 262144) — rows are the 3 colour channels"""),
        md("""Unfolding **loses nothing**. It only rearranges. The mode-2 unfolding says
"each colour channel is one row of 262,144 numbers" — and now every matrix tool
you know, including SVD, can be applied to it.

You will use this exact function again in sections 07 and 10.

### Contraction — multiply along a shared axis and sum over it

The dot product (eq. 2.8) and the matrix product (eq. 2.5) are both
contractions. `np.einsum` writes them directly."""),
        code("""a = np.array([1., 2., 3.]); b = np.array([4., 5., 6.])
print(np.einsum('i,i->', a, b))          # dot product, sum over i          (eq 2.8)

A = np.array([[1., 2.], [3., 4.]]); B = np.array([[5., 6.], [7., 8.]])
print(np.einsum('ik,kj->ij', A, B))      # matrix product, sum over k       (eq 2.5)"""),
        md("""**The rule, in one sentence:** an index that appears in the inputs but **not**
after the arrow is summed over; an index that appears after the arrow is kept.

That one sentence is the whole of section 06."""),
        md("""## Exercise 2 — take a tensor apart and put it back

> 🇪🇸 Desmonta un tensor y vuelve a montarlo."""),
        code("""# TODO 3: From `photo`, extract (a) the green channel as a (512, 512) slice and
#         (b) the colour fiber at pixel (10, 20). Which is a slice, which a fiber?

# TODO 4: Unfold `photo` along all three axes and print the three shapes.
#         Confirm that each unfolding has exactly photo.size entries —
#         unfolding rearranges, it never loses anything.

# TODO 5: Write the dot product of `a` and `b` as einsum, and check it against
#         np.dot. Then write the matrix product of A and B, and check against @."""),
        solution("""green = photo[:, :, 1]        # slice — one index fixed, the rest kept
fiber = photo[10, 20, :]      # fiber — every index fixed except one
print(green.shape, fiber.shape)                # (512, 512) (3,)

for ax in range(3):
    M = unfold(photo, ax)
    print(ax, M.shape, M.size == photo.size)   # True every time

print(np.einsum('i,i->', a, b), np.dot(a, b))              # 32.0 32.0
print(np.allclose(np.einsum('ik,kj->ij', A, B), A @ B))    # True"""),
        md("""## 1.4 The map of factorizations

> 🇪🇸 El mapa de las factorizaciones: qué método sirve para qué.

A **factorization** writes one object as a product of simpler objects. You met
two in Chapter 2. Here is the whole family we will use today.

| Method | Works on | What it gives you | Where today |
|---|---|---|---|
| **LU** | Square matrix | Gaussian elimination, saved for reuse | Below |
| **QR / Gram-Schmidt** | Any matrix | Perpendicular, unit-length directions | Below |
| **Eigendecomposition** | Square matrix | Directions that only get scaled (§2.7) | Section 08 |
| **SVD** | Any matrix | The most general matrix factorization (§2.8) | Sections 07 and 10 |
| **Pseudoinverse** | Any matrix | "Inverse" when no true inverse exists (§2.9) | Section 07 |
| **Cholesky** | Symmetric positive-definite matrix | A "square root" of a covariance matrix, for *building* correlated data | Section 11, take-home D |
| **Tucker / CP** | **Tensor, any order** | PCA generalized to every axis | Section 10 |"""),
        code("""A3 = np.array([[4., 3., 2.], [2., 1., 1.], [6., 3., 5.]])

P, L, U = lu(A3)                            # LU: A = P L U
print(np.allclose(P @ L @ U, A3))           # True

Q, R = np.linalg.qr(A3)                     # QR: orthonormal directions
print(np.allclose(Q.T @ Q, np.eye(3)))      # True — book eq 2.37"""),
        md("""**LU** is Gaussian elimination stored as two triangular matrices, so `Ax = b`
can be solved cheaply many times for different `b`. **QR** (computed by
Gram-Schmidt, or more stably by other methods) produces *orthonormal* directions
— mutually perpendicular, each of length 1. It is used for orthogonal weight
initialization in neural networks and for stable least squares.

Everything in that table except the last row works on **matrices** — two axes.
Real data often has more. That is what section 10 addresses."""),
        md("""## Exercise 3 — which factorization?

> 🇪🇸 ¿Qué factorización usarías en cada caso?"""),
        code("""# TODO 6: For each situation, name the method from the table above.
#         Write your answer as a comment — no code needed.
#           (a) You must solve Ax = b for 500 different b, with the same square A.
#           (b) You need mutually perpendicular, unit-length directions.
#           (c) A has more rows than columns and there is no exact solution.
#           (d) Your data has three axes and you want to compress all three."""),
        solution("""# (a) LU  — factor once, then each new b is two cheap triangular solves.
# (b) QR  — Q's columns are orthonormal (Q.T @ Q == I).
# (c) Pseudoinverse — section 07. It is built from the SVD.
# (d) Tucker — section 10. PCA can only ever see two axes."""),
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["02"] = {
    "objectives": [
        "Say what a new axis *counts*, rather than saying \"we add a dimension\".",
        "Explain why a batch axis and a time axis behave differently despite identical shapes.",
        "Propose two ways to batch videos of different lengths, and say what each loses or invents.",
        "Map experimental choices onto axes of a real microscopy tensor.",
    ],
    "setup": """import numpy as np

rng = np.random.default_rng(0)""",
    "cells": [
        md("""## This one is a discussion, not an exercise

> 🇪🇸 Este bloque es de discusión en grupo. Diez minutos de debate y luego
> puesta en común. **Sin código** al principio: dibuja en la pizarra compartida.

Go to your breakout channel. **No code at first.** Sketch on the shared board.
10 minutes discussion, then share-back. The code cells further down are for the
share-back — leave them alone until then.

> A grayscale image is a matrix: two axes, height and width. Almost nothing in
> machine learning is a single grayscale image. Each thing you add — colour,
> many examples, time — adds an axis, and each axis means something different.
> Your task is to argue about which axis goes where, and why.

### The five questions

1. Start from a grayscale image `(H, W)`. What is the shape of **(a)** one
   colour image, **(b)** a batch of colour images, **(c)** one video, **(d)** a
   batch of videos? For each step, say what the new axis *counts*.
   **Do not say "we add a dimension."**
2. A batch axis and a time axis both look like ordinary integer indices in code.
   What is different about their **meaning**? Think about what happens if you
   shuffle the order along each one.
3. Batching requires every example to have the same shape, but real videos have
   different numbers of frames. Propose two ways to build one batched tensor
   from videos of different lengths. What does each one lose or invent?
4. Photographing the same dish of cells every 10 minutes for 48 hours gives a
   tensor with the same shape as a video. Which experimental choice maps to
   which axis: frame interval → ? field of view → ? number of dishes → ?
5. Is there a mathematical limit on how many axes a tensor can have? If not,
   what actually limits you when you are writing the code?"""),
        md("""## Exercise 1 — write down your group's answer to question 1

> 🇪🇸 Escribe la respuesta de tu grupo a la pregunta 1.

Do this *after* you have argued about it, not instead of arguing about it."""),
        code("""# TODO 1: Create one array for each of the five stages, using the shapes your
#         group agreed on. Print each shape with a comment saying what the NEW
#         axis counts at that step.

gray_image      = np.zeros((28, 28))
color_image     = ...   # + colour
batch_of_images = ...   # + many examples
video           = ...   # + ordered time
batch_of_videos = ...   # + many examples of ordered time"""),
        solution("""gray_image      = np.zeros((28, 28))            # (H, W)
color_image     = np.zeros((28, 28, 3))         # (H, W, C)      + colour
batch_of_images = np.zeros((32, 28, 28, 3))     # (N, H, W, C)   + many examples
video           = np.zeros((16, 28, 28, 3))     # (T, H, W, C)   + ordered time
batch_of_videos = np.zeros((8, 16, 28, 28, 3))  # (N, T, H, W, C)

for name, a in [("gray", gray_image), ("colour", color_image),
                ("batch", batch_of_images), ("video", video),
                ("batch of videos", batch_of_videos)]:
    print(f"{name:16s} {a.shape}  order {a.ndim}")"""),
        md("""## Exercise 2 — question 2, in code

> 🇪🇸 La pregunta 2, demostrada con código.

`batch_of_images` and `video` have the same *kind* of shape tuple. Question 2
claims they behave completely differently. Show it."""),
        code("""# TODO 2: Shuffle axis 0 of `batch_of_images` and argue why nothing is lost.
#         Then shuffle axis 0 of `video` and argue what exactly was destroyed.
#         Hint: put something recognisable along the axis first, so you can see
#         the damage — np.arange broadcast into each frame works well."""),
        solution("""# Label each position along axis 0 so the shuffle is visible.
batch = np.arange(8)[:, None, None] * np.ones((8, 4, 4))
video = np.arange(8)[:, None, None] * np.ones((8, 4, 4))

perm = rng.permutation(8)
print(batch[perm][:, 0, 0])   # e.g. [3. 0. 6. ...] — a different order
print(video[perm][:, 0, 0])   # the same numbers, and that is the problem

# The arrays are identical, and so is the operation. The DIFFERENCE IS MEANING:
#   batch — examples are independent, order carries no information.
#           Shuffling is harmless; every training loop does it on purpose.
#   video — order IS the information. Shuffled frames are no longer a video,
#           and nothing in the shape, dtype or size records that damage."""),
        md("""## Share-back

> 🇪🇸 Puesta en común.

```python
gray_image      = np.zeros((28, 28))            # (H, W)
color_image     = np.zeros((28, 28, 3))         # (H, W, C)      + colour
batch_of_images = np.zeros((32, 28, 28, 3))     # (N, H, W, C)   + many examples
video           = np.zeros((16, 28, 28, 3))     # (T, H, W, C)   + ordered time
batch_of_videos = np.zeros((8, 16, 28, 28, 3))  # (N, T, H, W, C)
```

The key idea is **question 2**. `batch_of_images` and `video` have the same
*kind* of shape tuple, but shuffling axis 0 is harmless for a batch — examples
are independent, order carries no information — and destroys a video, where
order **is** the information.

Chapter 2's notation has no concept of "order matters between elements." That is
genuinely new today.

### The other four, briefly

- **Q3** — pad every video to the longest and carry a mask (invents frames that
  were never recorded, and you must remember to ignore them), or sample a fixed
  number of frames from each (loses everything you did not sample). Take-home B
  in section 11 builds the mask.
- **Q4** — frame interval → the time axis; field of view → the height and width
  axes; number of dishes → a batch axis. Same shape as a video, completely
  different experiment.
- **Q5** — no mathematical limit. What limits you is memory, which grows as the
  product of the shape, and your own ability to remember what each axis means,
  which is why sections 03 and 04 exist."""),
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["03"] = {
    "objectives": [
        "Select a named column of real data by name, never by a hard-coded number.",
        "Combine fancy indexing and boolean indexing to pull out sub-tables in one operation.",
        "Standardize a data matrix with broadcasting.",
        "Recognise a zero-variance column, and know why real images contain them.",
    ],
    "setup": """import numpy as np
from sklearn.datasets import load_breast_cancer, load_digits

bc = load_breast_cancer()
X, y = bc.data, bc.target          # (569, 30); y: 0 = malignant, 1 = benign
names = list(bc.feature_names)
print(X.shape, len(names))""",
    "cells": [
        md("""## Why this matters

> 🇪🇸 Elegir la columna equivocada no da error: devuelve otra medida real, y el
> análisis continúa y da una respuesta segura y equivocada.

The `breast_cancer` data holds 30 real measurements of tumour cell nuclei for
569 real patients. Selecting the wrong column does not produce an error — it
returns a *different real measurement*, and your analysis continues and gives a
confident, wrong answer.

In research this produces results nobody can reproduce. In a clinical tool it
produces a wrong recommendation about a real person.

**In tech**, the identical operation runs on a `(users, items)` matrix to pull
one user's history before making a recommendation."""),
        md("""## Exercise 1 — indexing by name

> 🇪🇸 Indexación por nombre, nunca por número fijo."""),
        code("""# TODO 1: Print X.shape. Say out loud what each axis means.

# TODO 2: Extract the column "mean radius" for all patients -> shape (569,).
#         Find its position with names.index(...). Do not hard-code a number."""),
        solution("""print(X.shape)                 # (569, 30)  patients x measurements

i = names.index("mean radius")
radius = X[:, i]               # book notation A_{:,j}
print(i, radius.shape)         # 0 (569,)

# names.index() rather than 0 because the column order is not yours to assume.
# If the dataset is ever reordered, the hard-coded version keeps running and
# keeps being wrong."""),
        md("""## Exercise 2 — fancy and boolean indexing

> 🇪🇸 Indexación avanzada y booleana."""),
        code("""# TODO 3: Find the 5 patients with the LARGEST mean radius, then extract their
#         full 30-measurement profiles as one (5, 30) array, in ONE operation.

# TODO 4: Using boolean indexing, compare mean radius for malignant (y == 0)
#         against benign (y == 1) patients. Is there a real difference?"""),
        solution("""top5 = np.argsort(radius)[-5:]
profiles = X[top5, :]                               # (5, 30)
print(profiles.shape)

print(radius[y == 0].mean(), radius[y == 1].mean()) # 17.5 vs 12.1

# A real result: MALIGNANT TUMOURS REALLY DO HAVE A LARGER MEAN RADIUS,
# 17.5 against 12.1. Random data would never have shown you that."""),
        md("""`radius` was one column out of 30, picked because it happens to separate the
two groups well. Drag the slider below to look at all 30 — most separate far
less cleanly.

> 🇪🇸 Mueve el deslizador para ver las 30 medidas, una por una. La mayoría
> separa malignos de benignos mucho peor que el radio."""),
        code("""try:
    from google.colab import output
    output.enable_custom_widget_manager()
except ImportError:
    pass

import ipywidgets as widgets
import matplotlib.pyplot as plt

def show_feature(i):
    plt.close('all')
    col = X[:, i]
    fig, ax = plt.subplots(figsize=(6, 3))
    ax.hist(col[y == 0], bins=30, alpha=0.6, label='malignant', color='#C44E52')
    ax.hist(col[y == 1], bins=30, alpha=0.6, label='benign', color='#4C72B0')
    ax.set_title(names[i])
    ax.legend()
    plt.tight_layout()
    plt.show()
    print(f"malignant mean: {col[y == 0].mean():.3f}   "
          f"benign mean: {col[y == 1].mean():.3f}")

widgets.interact(show_feature,
                  i=widgets.IntSlider(min=0, max=len(names) - 1, step=1, value=0,
                                       description='feature'));"""),
        md("""## Broadcasting, on real images

> 🇪🇸 Broadcasting sobre imágenes reales.

Broadcasting stretches a smaller array across a larger one without copying it.
Standardizing a data matrix — subtract the mean of each column, divide by its
standard deviation — is the operation you will do most often.

Run TODO 6 and **look at the result before continuing**. Something is wrong with
it, and finding out what is the point of this block."""),
        code("""images = load_digits().images          # (1797, 8, 8)
D = images.reshape(len(images), -1)    # (1797, 64)
print(D.shape)"""),
        md("""## Exercise 3 — standardize, then find the trap

> 🇪🇸 Estandariza y encuentra el problema."""),
        code("""# TODO 5: Compute the mean and std of each of the 64 pixels across all images.

# TODO 6: Standardize with broadcasting: (D - mean) / std.
#         RUN IT AND LOOK AT THE RESULT before continuing.

# TODO 7: You will find NaN. How many pixels have std == 0, and why would a real
#         handwritten digit image contain such pixels? Fix it, then verify no NaN."""),
        solution("""mean, std = D.mean(axis=0), D.std(axis=0)
print(mean.shape, std.shape)                        # (64,) (64,)

Z_bad = (D - mean) / std
print(np.isnan(Z_bad).any())                        # True

print((std == 0).sum())                             # 3
Z = (D - mean) / np.where(std == 0, 1.0, std)
print(np.isnan(Z).any())                            # False

# THREE PIXELS ARE ALWAYS DARK in all 1797 digit images: they sit in corners
# where nobody writes. Their standard deviation is exactly zero, so dividing
# produces NaN. np.where leaves those columns as plain centred zeros, which is
# the honest thing to do with a feature that carries no information.

import matplotlib.pyplot as plt
fig, ax = plt.subplots(figsize=(3, 3))
ax.imshow(D.mean(axis=0).reshape(8, 8), cmap='gray')
zero_rows, zero_cols = np.where((std == 0).reshape(8, 8))
ax.scatter(zero_cols, zero_rows, s=250, marker='s',
           facecolors='none', edgecolors='#C44E52', linewidths=2)
ax.set_title('zero-variance pixels, marked')
ax.axis('off')
plt.show()"""),
        md("""## What just happened

Two real results, neither of which random data could have produced:

1. **Malignant tumours really do have a larger mean radius** — 17.5 against 12.1.
2. **Three pixels are always dark** in all 1797 digit images, so their standard
   deviation is exactly zero and dividing by it produces `NaN`.

The second is the one to remember. A zero-variance feature is not a bug in your
code — it is a fact about your data, and you have to decide what to do about it.
Silently propagating `NaN` into a model is the one option that is always wrong.

The Kahoot below asks you about exactly this."""),
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["04"] = {
    "objectives": [
        "Convert an image between `(H, W, C)` and `(C, H, W)` with `np.transpose`.",
        "Convert a batch between NHWC and NCHW, and know which axis is which when two share a size.",
        "Explain why `reshape` runs without error and still destroys the image.",
    ],
    "setup": """import numpy as np
from skimage import data

photo = data.immunohistochemistry()   # (512, 512, 3) real histology
cells = data.cell()                   # (660, 550)    real microscopy, grayscale
print(photo.shape, cells.shape)""",
    "cells": [
        md("""## Why this matters

> 🇪🇸 Los microscopios y las cámaras ordenan sus ejes según el hardware, no
> según lo que el modelo espera. Equivocarse no da error: el modelo funciona con
> datos revueltos y devuelve resultados seguros y sin sentido.

Microscopes and cameras order their axes according to the hardware, not
according to what a model expects. Getting this wrong does not crash — the model
runs on scrambled data and returns confident, meaningless output.

In a drug screen, that is a wrong decision about whether a compound works. The
famous version in tech: a model trained in TensorFlow (`NHWC`) deployed into
PyTorch (`NCHW`) with no transpose."""),
        md("""## Exercise 1 — one image, two orderings

> 🇪🇸 Una imagen, dos ordenaciones de ejes."""),
        code("""# TODO 1: Print both shapes. Which one has no colour axis?

# TODO 2: Convert `photo` from (H, W, C) to (C, H, W) with np.transpose."""),
        solution("""print(photo.shape, cells.shape)   # (512, 512, 3) (660, 550)
# `cells` is grayscale — order 2, no colour axis at all.

chw = np.transpose(photo, (2, 0, 1))      # (3, 512, 512) — correct
print(chw.shape)

# The tuple (2, 0, 1) reads: "the new axis 0 is the old axis 2, the new axis 1
# is the old axis 0, the new axis 2 is the old axis 1.\""""),
        md("""## Exercise 2 — a batch, and two axes of the same size

> 🇪🇸 Un lote, y dos ejes del mismo tamaño."""),
        code("""# TODO 3: Stack `photo` three times into a batch of shape (3, 512, 512, 3).
#         Which axis is the batch axis?

# TODO 4: Convert that batch from NHWC to NCHW -> (3, 3, 512, 512).
#         Two axes now both have size 3. How do you know which is which?"""),
        solution("""batch = np.stack([photo, photo, photo])      # (3, 512, 512, 3)
print(batch.shape)                            # axis 0 is the batch axis

nchw = np.transpose(batch, (0, 3, 1, 2))     # (3, 3, 512, 512)
print(nchw.shape)

# You know which is which ONLY because you wrote the transpose. Nothing in the
# array records it. Check it by hand — a batch axis and a colour axis behave
# differently under indexing:
print(np.array_equal(nchw[0], nchw[1]))      # True  — the 3 stacked copies
print(np.array_equal(nchw[:, 0], nchw[:, 1]))  # False — the 3 colour channels"""),
        md("""## Exercise 3 — the one that runs and is still wrong

> 🇪🇸 El que se ejecuta sin error y aun así está mal."""),
        code("""# TODO 5: photo.reshape(3, 512, 512) runs WITHOUT error but is wrong.
#         Run it, compare against TODO 2, and explain the difference.
#         Then display both with matplotlib and look at them."""),
        solution("""chw   = np.transpose(photo, (2, 0, 1))      # (3, 512, 512) — correct
wrong = photo.reshape(3, 512, 512)          # (3, 512, 512) — runs, but scrambles

print(chw.shape == wrong.shape)             # True  — identical shapes
print(np.array_equal(chw, wrong))           # False — completely different data

import matplotlib.pyplot as plt
fig, ax = plt.subplots(1, 2, figsize=(8, 4))
ax[0].imshow(chw[0],   cmap="gray"); ax[0].set_title("transpose — a channel")
ax[1].imshow(wrong[0], cmap="gray"); ax[1].set_title("reshape — nonsense")
plt.show()"""),
        md("""## What just happened

**Reshape only reinterprets numbers in memory order. Transpose moves them
according to axis meaning.** Both give shape `(3, 512, 512)`; only one is the
image.

> 🇪🇸 `reshape` reinterpreta los números en el orden en que están en memoria;
> `transpose` los mueve según el significado de cada eje.

And TODO 4 makes the deeper point: **once two axes share a size, the shape
cannot tell you which is which.** Only your own tracking can. No error will be
raised, no shape will look wrong, and the model will train — on scrambled data.

That is everything the first Kahoot asks about."""),
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["05"] = {
    "objectives": [
        "Design the tensor shape at each of five pipeline stages, for two different systems.",
        "Apply one ragged-length strategy from section 02 and give the exact batched shape.",
        "Decide where a new axis goes, and say how that choice affects the rest of the pipeline.",
    ],
    "setup": """import numpy as np   # only needed for the share-back sketches""",
    "cells": [
        md("""## Another discussion block

> 🇪🇸 Otro bloque de discusión: 10 minutos de diseño, 5 de puesta en común.
> No hay una única respuesta correcta.

Back to your breakout channel. 10 minutes design, 5 minutes share-back.
**There is no single correct answer.**

> Design the tensor shape at each stage — *raw file → decoded frames →
> preprocessed batch → model input → model output* — for **both** systems:
>
> - **Tech:** a short-video app computing one embedding per video from sampled
>   frames, to choose what to play next.
> - **Biotech:** a surgical-video model that labels the current phase of an
>   operation from an operating-room camera.

### The five questions

1. Sketch the shape at each of the five stages, for both. Where are they the
   same, and where must they differ?
2. Clips have different lengths — 30 seconds against 4 hours. Take one strategy
   your group proposed in section 02 and give the exact shape of the
   preprocessed batch. What does an invented or wasted value in that tensor
   represent?
3. The surgical system adds **three camera angles** recording at once. Where does
   that axis go, and why does its position change how easy the rest of the
   pipeline is to write?
4. The recommender samples 8 frames out of 900. Which operation from section 03
   does that, and what is lost?
5. Both systems must decide **which frames matter most**. What kind of mechanism
   could learn that weighting?"""),
        md("""## Exercise 1 — sketch the two pipelines

> 🇪🇸 Dibuja las dos tuberías, etapa por etapa.

Use comments. The point is the shapes and what each axis counts, not running
code."""),
        code("""# TODO 1: Fill in the shape at each stage for BOTH systems. Next to each,
#         write what the axes count.

# --- Tech: short-video recommender, one embedding per video -------------------
# raw file          : ...
# decoded frames    : ...
# preprocessed batch: ...
# model input       : ...
# model output      : ...

# --- Biotech: surgical phase labelling, one label per timestep ---------------
# raw file          : ...
# decoded frames    : ...
# preprocessed batch: ...
# model input       : ...
# model output      : ..."""),
        solution("""# One defensible answer. Your group's may differ and still be right — what
# matters is that you can say what every axis COUNTS.

# --- Tech: short-video recommender -------------------------------------------
# raw file          : bytes on disk, no shape yet
# decoded frames    : (900, 1080, 1920, 3)     T, H, W, C  — every frame
# preprocessed batch: (32, 8, 224, 224, 3)     N, T, H, W, C — 8 sampled frames
# model input       : (32, 8, 224, 224, 3)
# model output      : (32, 512)                N, embedding — TIME IS GONE,
#                                              collapsed into one vector per video

# --- Biotech: surgical phase labelling ---------------------------------------
# raw file          : bytes on disk
# decoded frames    : (432000, 1080, 1920, 3)  4 hours at 30fps
# preprocessed batch: (4, 64, 224, 224, 3)     N, T, H, W, C — a sliding window
# model input       : (4, 64, 224, 224, 3)
# model output      : (4, 64, 12)              N, T, classes — ONE LABEL PER
#                                              TIMESTEP, so time SURVIVES

# The five stages look alike until the output. The recommender destroys the time
# axis on purpose; the surgical model must keep it, because the answer to
# "what phase are we in?" changes during the operation."""),
        md("""## Exercise 2 — ragged lengths, and the extra camera

> 🇪🇸 Longitudes distintas y la cámara adicional."""),
        code("""# TODO 2: Take ONE ragged-length strategy from section 02 (pad + mask, or
#         sample a fixed number of frames). Give the exact shape of the
#         preprocessed batch for 4 clips of 30s, 45s, 2min and 4h at 30 fps.
#         What does an invented or wasted value in that tensor represent?

# TODO 3: Add three camera angles to the surgical system. Write the batch shape
#         with the camera axis in two different positions, and say which makes
#         the rest of the pipeline easier to write."""),
        solution("""# TODO 2 — padding to the longest clip is the honest disaster:
#   longest = 4h at 30fps = 432,000 frames
#   padded batch: (4, 432000, 224, 224, 3)  ~ 5.8e11 values. Not possible.
#   An invented value is a frame that was never recorded. The mask is what stops
#   the model from learning from footage that does not exist.
#
# Sampling a fixed 64 frames per clip:
#   batch: (4, 64, 224, 224, 3)  — fits easily.
#   Nothing is invented; a great deal is DISCARDED, and the 4-hour clip is
#   sampled 500x more sparsely than the 30-second one. That bias is real.

# TODO 3 — two placements:
#   (N, CAM, T, H, W, C)  = (4, 3, 64, 224, 224, 3)
#   (N * CAM, T, H, W, C) = (12, 64, 224, 224, 3)
#
# The second is easier: every existing per-video operation keeps working
# unchanged, because the camera axis has been folded into the batch axis — and
# a batch axis is exactly the axis whose order does not matter. You only need
# the first form when the model must COMBINE the angles, at which point you
# must unfold back and the shape bookkeeping becomes yours to get right."""),
        md("""## Share-back

> 🇪🇸 Puesta en común.

**Q4** — sampling 8 frames from 900 is *fancy indexing*, exactly section 03's
TODO 3: `frames[idx]` where `idx` is an array of positions. What is lost is
everything between the samples — and for a 4-hour surgical video, that is almost
all of it. That is why the surgical system uses a sliding window instead.

**Q5** — **attention**. It learns a weight per position from the data itself,
rather than you choosing which frames matter in advance. Take-home B in section
11 builds it from two `einsum` calls, and the padding mask from Q2 above turns
out to be the same mask attention needs.

### The thread running through both discussions

Section 02 asked what an axis *means*. This block asks where to *put* it. The
answer is the same in both: an axis whose order carries no information (batch,
camera) can be folded, shuffled and merged freely; an axis whose order **is** the
information (time) cannot."""),
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["06"] = {
    "objectives": [
        "State the einsum rule: an index missing after the arrow is summed over.",
        "Contract the colour axis of one image, and of a whole batch, with one call each.",
        "Write trace, transpose and the matrix product as `einsum` and check them against NumPy.",
        "Build a full similarity matrix between 1797 images with a single contraction.",
    ],
    "setup": """import numpy as np
from sklearn.datasets import load_digits
from skimage import data

photo = data.immunohistochemistry().astype(float)         # (512, 512, 3)
batch = np.stack([photo, data.astronaut().astype(float)])  # (2, 512, 512, 3)
w = np.array([0.2125, 0.7154, 0.0721])                     # RGB -> grayscale weights
A = np.array([[1., 2.], [3., 4.]])
B = np.array([[5., 6.], [7., 8.]])
print(photo.shape, batch.shape)""",
    "cells": [
        md("""## Why this matters

> 🇪🇸 Los sistemas de recomendación y de búsqueda ordenan los resultados con el
> producto punto entre el vector de un usuario y millones de vectores de
> artículos. Esa contracción *es* la señal de ranking.

Recommendation and search systems rank items by the dot product between a user
vector and every item vector — one user against millions of items, many times
per second. That contraction *is* the ranking signal. Sum over the wrong axis
and every user gets wrong results.

### The rule, again

An index that appears in the inputs but **not** after the arrow is **summed
over**. An index that appears after the arrow is **kept**.

That is the whole of `einsum`. Everything below is that one sentence applied."""),
        md("""## Exercise 1 — contract the colour axis

> 🇪🇸 Contrae el eje de color."""),
        code("""# TODO 1: With einsum, convert `photo` to grayscale by contracting the colour
#         axis against w. Result shape (512, 512).

# TODO 2: Do the same for the whole batch in ONE einsum call -> (2, 512, 512)."""),
        solution("""gray       = np.einsum('hwc,c->hw',   photo, w)     # (512, 512)
gray_batch = np.einsum('nhwc,c->nhw', batch, w)     # (2, 512, 512)
print(gray.shape, gray_batch.shape)

# `c` appears in the inputs but not after the arrow, so it is SUMMED OVER —
# that is the contraction. `n`, `h`, `w` appear after the arrow, so they are
# KEPT. Adding a batch axis costs exactly one letter."""),
        md("""## Exercise 2 — Chapter 2, rewritten as contractions

> 🇪🇸 Las operaciones del capítulo 2, escritas como contracciones."""),
        code("""# TODO 3: Write these Chapter 2 operations as einsum and check each against
#         NumPy:
#           (a) trace          (eq 2.48)
#           (b) transpose      (eq 2.3)
#           (c) matrix product (eq 2.5)"""),
        solution("""print(np.einsum('ii->', A),        np.trace(A))       # trace
print(np.einsum('ij->ji', A),     A.T, sep="\\n")       # transpose
print(np.einsum('ik,kj->ij', A, B), A @ B, sep="\\n")   # matrix product

for got, want in [(np.einsum('ii->', A), np.trace(A)),
                  (np.einsum('ij->ji', A), A.T),
                  (np.einsum('ik,kj->ij', A, B), A @ B)]:
    assert np.allclose(got, want)
print("all three agree")

# Trace: the repeated `i` with nothing after the arrow sums the diagonal.
# Transpose: no index is summed at all — einsum is just relabelling axes.
# Matrix product: `k` is shared and dropped, so it is the contracted axis."""),
        md("""## Exercise 3 — every pair of 1797 images, in one call

> 🇪🇸 Todos los pares de 1797 imágenes, en una sola llamada.

This one matters beyond the exercise: it is the same operation a search engine
runs, and it is the bridge to the distance and similarity questions in the
Kahoot below."""),
        code("""# TODO 4: Flatten the digits to (1797, 64) and compute the (1797, 1797)
#         similarity matrix between every pair of digit images with one einsum.
#
#         Then, for the quiz: normalize each row to unit length first and do it
#         again. That second version is COSINE SIMILARITY — the dot product
#         divided by the two norms. The unnormalized one is dominated by how
#         much ink each digit has, not by its shape."""),
        solution("""D = load_digits().images.reshape(1797, -1)          # (1797, 64)

S = np.einsum('id,jd->ij', D, D)                    # (1797, 1797)
print(S.shape, S.size)                              # 3,229,209 pairwise scores

# Cosine similarity: the same contraction on unit-length rows.
norms = np.linalg.norm(D, axis=1, keepdims=True)
Dn = D / np.where(norms == 0, 1.0, norms)
C = np.einsum('id,jd->ij', Dn, Dn)
print(C.diagonal()[:3])                             # ~1.0 — each digit matches itself

# EUCLIDEAN DISTANCE is the square root of summed squared differences, and it is
# built from the same contraction:
sq = (D ** 2).sum(1)
dist = np.sqrt(np.maximum(sq[:, None] + sq[None, :] - 2 * S, 0))
print(np.round(dist[0, :4], 1))"""),
        md("""## What just happened

`c` appears in the inputs but not after the arrow, so it is **summed over** —
that is the contraction. `n`, `h`, `w` appear after the arrow, so they are
**kept**. Adding a batch axis costs exactly one letter.

This is why `einsum` is worth learning: **the same expression works for one image
or for a million**, and it reads like the mathematics in Chapter 2.

> 🇪🇸 La misma expresión sirve para una imagen o para un millón, y se lee como
> las matemáticas del capítulo 2.

Keep it in mind for section 10, where a single `einsum` string contracts three
axes at once: `'ijk,ia,jb,kc->abc'`. That is why einsum came first."""),
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["07"] = {
    "objectives": [
        "Say when a square matrix has no inverse, and predict the error before you see it.",
        "Compute the Moore-Penrose pseudoinverse and verify its four defining conditions.",
        "Say what `x = A⁺b` gives you for a tall matrix and for a wide one.",
        "Solve a real 20,433-equation system that has no exact solution.",
        "Apply the pseudoinverse to a tensor by unfolding, solving, and folding back.",
    ],
    "setup": """import numpy as np
import pandas as pd

HOUSING = "https://raw.githubusercontent.com/ageron/handson-ml2/master/datasets/housing/housing.csv"
housing = pd.read_csv(HOUSING)

def unfold(T, axis):
    return np.moveaxis(T, axis, 0).reshape(T.shape[axis], -1)

rng = np.random.default_rng(0)
print(housing.shape)                                   # (20640, 10)
print(housing['total_bedrooms'].isnull().sum())        # 207 missing values!""",
    "cells": [
        md("""## Step 1 — square matrices

> 🇪🇸 Paso 1: matrices cuadradas. La inversa solo existe si las columnas son
> linealmente independientes.

Chapter 2 §2.3 defines `A⁻¹` for a square matrix, with `A⁻¹A = I`. But this only
exists when the columns are linearly independent. A matrix with dependent
columns is **singular** and has no inverse."""),
        code("""S = np.array([[2., 1.], [1., 3.]])
print(np.round(np.linalg.inv(S) @ S, 12))    # the identity, fine

Singular = np.array([[1., 2.], [2., 4.]])    # column 2 = 2 x column 1
try:
    np.linalg.inv(Singular)
except np.linalg.LinAlgError as e:
    print("LinAlgError:", e)                 # this error is the expected result"""),
        md("""## Step 2 — non-square matrices

> 🇪🇸 Paso 2: matrices no cuadradas. `A⁻¹` ni siquiera está definida, pero la
> pseudoinversa sí.

`A⁻¹` is not even defined. But we still need to solve `Ax = b`, and in machine
learning `A` is almost never square: it has one row per example and one column
per feature, and there are always far more examples than features.

The **Moore-Penrose pseudoinverse** `A⁺` (Chapter 2 §2.9) is the answer. It is
defined for *every* matrix — square or not, singular or not — and it is computed
from the SVD (eq. 2.47):

$$A^{+} = V D^{+} U^{\\top}$$"""),
        code("""A = rng.standard_normal((5, 3))
A_plus = np.linalg.pinv(A)
print(A.shape, A_plus.shape)               # (5, 3) (3, 5) — note the shape flips

U, S_, Vt = np.linalg.svd(A, full_matrices=False)
print(np.allclose(A_plus, Vt.T @ np.diag(1 / S_) @ U.T))   # True — this is eq 2.47"""),
        md("""It satisfies four conditions that define it uniquely."""),
        code("""print(np.allclose(A @ A_plus @ A, A))            # 1
print(np.allclose(A_plus @ A @ A_plus, A_plus))  # 2
print(np.allclose((A @ A_plus).T, A @ A_plus))   # 3
print(np.allclose((A_plus @ A).T, A_plus @ A))   # 4"""),
        md("""What `A⁺` gives you depends on the shape, exactly as Chapter 2 §2.9 says:

- **More rows than columns** (too many equations, usually no exact solution) →
  `x = A⁺b` gives the `x` that makes `Ax` as **close as possible** to `b`.
  This is least squares.
- **More columns than rows** (too few equations, infinitely many solutions) →
  `x = A⁺b` gives the valid solution with the **smallest norm**."""),
        md("""## Step 3 — what about tensors?

> 🇪🇸 Paso 3: ¿y los tensores? No hay una única inversa tensorial aceptada por
> todos. En la práctica se despliega, se resuelve como matriz y se vuelve a
> plegar.

This is a fair question with an honest answer. There is no single tensor inverse
that everyone uses. Several definitions exist (based on the Einstein product, or
the t-product for order-3 tensors), and they are active research.

**In practice, in machine learning, you unfold the tensor into a matrix, use the
matrix pseudoinverse, and fold the result back.** That works because unfolding
loses nothing — which you proved for yourself in section 01."""),
        code("""T = rng.standard_normal((4, 3, 5))
M = unfold(T, 0)                        # (4, 15)
M_plus = np.linalg.pinv(M)              # (15, 4)
print(M.shape, M_plus.shape)
print(np.allclose(M @ M_plus @ M, M))   # True"""),
        md("""**When a tensor problem is hard, unfold it to a matrix, solve it there, and
fold back.** That is a general lesson, and section 10 is built entirely on it."""),
        md("""## Exercise 1 — real California housing data

> 🇪🇸 Datos reales de vivienda en California: 20.640 distritos censales.

Predict house value from district features. 20,640 real districts, 207 of them
with a missing value.

::: {.callout-note}
TODO 3 asks you to trigger an error on purpose. If it raises, you did it right.
:::"""),
        code("""# TODO 1: Drop rows with missing values. How many rows remain?

# TODO 2: Build X from these columns, and add a column of ones for the bias:
#         ['housing_median_age','total_rooms','total_bedrooms',
#          'population','households','median_income']
#         Target y = 'median_house_value'. Print X.shape. Is X square?

# TODO 3: Try np.linalg.inv(X). What happens, and why?
#         THE ERROR IS THE EXPECTED RESULT — you have not done anything wrong."""),
        solution("""d = housing.dropna()
print(len(d))                                            # 20433 rows remain

feats = ['housing_median_age','total_rooms','total_bedrooms',
         'population','households','median_income']
X = np.column_stack([np.ones(len(d)), d[feats].to_numpy(float)])   # (20433, 7)
y = d['median_house_value'].to_numpy(float)
print(X.shape)                                           # (20433, 7) — very tall

try:
    np.linalg.inv(X)
except np.linalg.LinAlgError as e:
    print("LinAlgError:", e)   # inv() requires a SQUARE matrix. X has 20,433
                               # rows and 7 columns, so it cannot even be called."""),
        md("""## Exercise 2 — solve it anyway

> 🇪🇸 Resuélvelo de todas formas, con la pseudoinversa."""),
        code("""# TODO 4: Solve for the weights with the pseudoinverse: w = pinv(X) @ y.

# TODO 5: Check your answer against np.linalg.lstsq. Do they agree?

# TODO 6: Compute the RMSE of the predictions. Which feature has the largest
#         coefficient, and does that make sense for house prices?"""),
        solution("""w = np.linalg.pinv(X) @ y
w_lstsq, *_ = np.linalg.lstsq(X, y, rcond=None)
print(np.allclose(w, w_lstsq))                            # True

rmse = np.sqrt(((X @ w - y) ** 2).mean())
print(round(rmse))                                        # ~75980

coef, name = max(zip(w[1:], feats))
print(name, round(coef))                                  # median_income 47748

# X is 20433 x 7 — very tall, so np.linalg.inv cannot even be called. There is
# NO EXACT SOLUTION: no straight line passes through 20,433 points. The
# pseudoinverse gives the best possible answer instead, and lstsq agrees exactly
# because it solves the same problem.
#
# The largest coefficient belongs to median_income, which is the sensible
# result — income predicts house prices.

import matplotlib.pyplot as plt
pred = X @ w
residuals = pred - y
fig, axes = plt.subplots(1, 2, figsize=(9, 3.5))
axes[0].scatter(y, pred, s=3, alpha=0.2, color="#4C72B0")
lims = [min(y.min(), pred.min()), max(y.max(), pred.max())]
axes[0].plot(lims, lims, color="#C44E52", linewidth=1)
axes[0].set_xlabel("actual"); axes[0].set_ylabel("predicted")
axes[0].set_title("predicted vs actual")
axes[1].hist(residuals, bins=60, color="#55A868")
axes[1].set_xlabel("prediction - actual"); axes[1].set_title("residuals")
plt.tight_layout()
plt.show()

# No straight line fits 20,433 points exactly, and the residuals show it: they
# are not tightly clustered at zero, and the predicted-vs-actual scatter fans
# out badly at the high end. LEAST SQUARES MINIMIZES THE AVERAGE SQUARED ERROR
# ACROSS ALL POINTS — it says nothing about any one prediction being close."""),
        md("""## Exercise 3 — the tensor version

> 🇪🇸 La versión tensorial: despliega, resuelve, vuelve a plegar."""),
        code("""# TODO 7: Take an order-3 tensor T of shape (4, 3, 5) and a vector b of
#         length 4. Solve the unfolded least-squares problem for x, then fold
#         x back to the shape of a mode-0 slice. What shape must x have?"""),
        solution("""T = rng.standard_normal((4, 3, 5))
b = rng.standard_normal(4)

M = unfold(T, 0)                       # (4, 15) — one row per index along axis 0
x_flat = np.linalg.pinv(M) @ b         # (15,)   — min-norm solution, wide matrix
x = x_flat.reshape(T.shape[1], T.shape[2])       # fold back to (3, 5)
print(M.shape, x_flat.shape, x.shape)

print(np.allclose(M @ x_flat, b))      # True — 4 equations, 15 unknowns

# M is WIDE (4 x 15): infinitely many solutions, and pinv picks the one with the
# smallest norm. Folding back to (3, 5) is only meaningful because unfolding
# lost nothing in the first place."""),
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["08"] = {
    "objectives": [
        "Write a recurrence as repeated multiplication by one matrix.",
        "Find the dominant eigenvector by power iteration, and check it against `np.linalg.eig`.",
        "Fit an autoregressive model with the pseudoinverse and feed its own output back in.",
        "Recognise that structure as the skeleton of a recurrent neural network.",
    ],
    "setup": """import numpy as np
import pandas as pd

FLIGHTS = "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/flights.csv"
flights = pd.read_csv(FLIGHTS)

rng = np.random.default_rng(0)
print(flights.shape)                       # (144, 3) — 144 real months, 1949-1960""",
    "cells": [
        md("""## Recursion means defining something in terms of itself

> 🇪🇸 La recursión consiste en definir algo en términos de sí mismo. Con
> matrices, esto se convierte en aplicar la misma matriz una y otra vez.

With matrices this becomes: **apply the same matrix again and again.** Three
examples, increasing in usefulness.

This is a demo — read it, run it, ask about it. The exercises at the end are
short."""),
        md("""### 1. Fibonacci as repeated matrix multiplication

The rule `f(n) = f(n-1) + f(n-2)` is one matrix applied repeatedly."""),
        code("""F = np.array([[1, 1], [1, 0]])
v = np.array([1, 0])
for _ in range(10):
    v = F @ v
print(v[1])                                  # 55
print(np.linalg.matrix_power(F, 10)[0, 1])   # 55 — same answer, one step"""),
        md("""### 2. Power iteration — recursion that finds an eigenvector

Multiply any starting vector by `A` repeatedly, rescaling each time. It
converges to the eigenvector with the largest eigenvalue (Chapter 2 §2.7)."""),
        code("""A = np.array([[4., 1.], [2., 3.]])
x = rng.standard_normal(2); x /= np.linalg.norm(x)
for _ in range(50):
    x = A @ x
    x /= np.linalg.norm(x)

print(x @ A @ x)                    # 5.000000
print(np.linalg.eig(A)[0].max())    # 5.000000 — identical"""),
        code("""import matplotlib.pyplot as plt

xv = rng.standard_normal(2); xv /= np.linalg.norm(xv)
checkpoints = {}
for step in range(1, 51):
    xv = A @ xv
    xv /= np.linalg.norm(xv)
    if step in (1, 2, 5, 10, 50):
        checkpoints[step] = xv.copy()

eigvals, eigvecs = np.linalg.eig(A)
dominant = eigvecs[:, np.argmax(eigvals)].real
dominant /= np.linalg.norm(dominant)

fig, ax = plt.subplots(figsize=(4, 4))
theta = np.linspace(0, 2 * np.pi, 200)
ax.plot(np.cos(theta), np.sin(theta), color="lightgray", linewidth=1)
for step, v in checkpoints.items():
    ax.annotate("", xy=v, xytext=(0, 0), arrowprops=dict(
        arrowstyle="->", color="#4C72B0", alpha=0.3 + 0.7 * step / 50))
    ax.text(v[0] * 1.15, v[1] * 1.15, str(step), fontsize=8, ha="center")
for sign in (1, -1):
    ax.annotate("", xy=sign * dominant, xytext=(0, 0),
                arrowprops=dict(arrowstyle="->", color="#C44E52", linewidth=2))
ax.set_xlim(-1.3, 1.3); ax.set_ylim(-1.3, 1.3); ax.set_aspect("equal")
ax.set_title("power iteration converges to the eigenvector\\n(red = the true dominant eigenvector, both signs)")
plt.tight_layout()
plt.show()"""),
        md("""This is how PageRank ranks web pages, and it is why eigenvectors matter far
beyond Chapter 2: **repeated application of a matrix converges to its dominant
eigenvector.**"""),
        md("""### 3. Recursion on real data — forecasting airline traffic

This combines recursion with the pseudoinverse from section 07. We fit a model
that predicts each month from the previous 12, then apply it *to its own output*
to forecast forward."""),
        code("""y = flights['passengers'].to_numpy(float)     # 144 real months, 1949-1960
p = 12
rows = np.array([y[i:i+p] for i in range(len(y) - p)])
X = np.column_stack([np.ones(len(rows)), rows])
w = np.linalg.pinv(X) @ y[p:]                 # least squares, exactly as in section 07
print(X.shape)                                # (132, 13) — 132 training windows

history = list(y[-p:])
for _ in range(12):                           # recursion: feed predictions back in
    nxt = w[0] + np.dot(w[1:], history[-p:])
    history.append(nxt)

print(np.round(history[-12:], 1))
# [465.2 429.1 455.1 491.0 527.8 589.4 679.7 661.3 575.3 509.5 438.6 470.7]"""),
        md("""The forecast above extrapolates 12 months **past the end of the dataset**, so
there is nothing to check it against. To see the forecast next to real numbers,
hold out the last 12 months, fit on everything before them, and forecast those
same 12 months back.

> 🇪🇸 El pronóstico anterior se extiende 12 meses **más allá del final de los
> datos**, así que no hay nada real con qué compararlo. Para ver el pronóstico
> junto a números reales, se retienen los últimos 12 meses, se ajusta con todo
> lo anterior, y se pronostican esos mismos 12 meses."""),
        code("""y_train, y_test = y[:-12], y[-12:]
rows_tr = np.array([y_train[i:i+p] for i in range(len(y_train) - p)])
X_tr = np.column_stack([np.ones(len(rows_tr)), rows_tr])
w_tr = np.linalg.pinv(X_tr) @ y_train[p:]

hist_tr = list(y_train[-p:])
for _ in range(12):
    hist_tr.append(w_tr[0] + np.dot(w_tr[1:], hist_tr[-p:]))
forecast_holdout = np.array(hist_tr[-12:])

import matplotlib.pyplot as plt
months = np.arange(1, 13)
fig, ax = plt.subplots(figsize=(6, 3.2))
ax.plot(months, y_test, marker="o", label="actual", color="#4C72B0")
ax.plot(months, forecast_holdout, marker="o", label="forecast", color="#C44E52")
ax.set_xlabel("month (held out, never seen while fitting)")
ax.set_ylabel("passengers")
ax.set_title("forecast vs. actual — last 12 months held out")
ax.legend()
plt.tight_layout()
plt.show()

mape = (np.abs(forecast_holdout - y_test) / y_test).mean()
print(f"mean absolute percentage error: {mape:.1%}")"""),
        md("""The forecast reproduces the seasonal shape of real air travel — low in winter,
peaking in summer — because the model learned it from 132 real training windows.

**This is exactly the structure of a recurrent neural network**: a hidden state,
updated by the same weights at every step."""),
        code("""# The same shape, with a nonlinearity. W and U are the SAME at every step —
# that is the recursion.
W = rng.standard_normal((4, 4)) * 0.5
U = rng.standard_normal((4, 3)) * 0.5
xs = rng.standard_normal((6, 3))        # a sequence of 6 inputs, 3 features each

h = np.zeros(4)
for t in range(6):
    h = np.tanh(W @ h + U @ xs[t])
print(np.round(h, 3))"""),
        md("""## Exercise 1 — the forecast, and what breaks it

> 🇪🇸 El pronóstico, y qué lo rompe."""),
        code("""# TODO 1: Change the window length p from 12 to 3 and re-run the forecast.
#         The seasonal shape disappears. Why? What does p = 12 encode about
#         this particular dataset that p = 3 cannot?

# TODO 2: Forecast 60 months ahead instead of 12. Plot it if you can. Recursive
#         forecasting feeds predictions back in as if they were observations —
#         what does that do to the error over a long horizon?"""),
        solution("""def forecast(y, p, steps):
    rows = np.array([y[i:i+p] for i in range(len(y) - p)])
    X = np.column_stack([np.ones(len(rows)), rows])
    w = np.linalg.pinv(X) @ y[p:]
    hist = list(y[-p:])
    for _ in range(steps):
        hist.append(w[0] + np.dot(w[1:], hist[-p:]))
    return np.array(hist[-steps:])

print(np.round(forecast(y, 12, 12), 1))   # seasonal: winter low, summer peak
print(np.round(forecast(y, 3, 12), 1))    # smooth, seasonality gone

# p = 12 encodes ONE YEAR. The model can see the same month a year earlier, so
# seasonality is available to it as a linear term. With p = 3 it can only see a
# local trend, and a linear model has no way to invent a yearly cycle.

print(np.round(forecast(y, 12, 60)[-6:], 1))
# Errors compound: every predicted month becomes an input to the next
# prediction, so mistakes feed on themselves. Recursive forecasts are trustworthy
# for a short horizon and decorative for a long one."""),
        md("""## Exercise 2 — power iteration by hand

> 🇪🇸 Iteración de potencias, paso a paso."""),
        code("""# TODO 3: Run power iteration on A = [[4., 1.], [2., 3.]] but print the
#         estimate after 1, 2, 5, 10 and 50 steps. How fast does it converge?
#         Try a second matrix whose two eigenvalues are close together
#         (e.g. [[4., 1.], [0., 3.9]]). What changes, and why?"""),
        solution("""def power_iterate(M, steps, seed=0):
    v = np.random.default_rng(seed).standard_normal(M.shape[0])
    v /= np.linalg.norm(v)
    out = {}
    for k in range(1, max(steps) + 1):
        v = M @ v
        v /= np.linalg.norm(v)
        if k in steps:
            out[k] = round(float(v @ M @ v), 4)
    return out

A  = np.array([[4., 1.], [2., 3.]])         # eigenvalues 5 and 2
A2 = np.array([[4., 1.], [0., 3.9]])        # eigenvalues 4 and 3.9

print(power_iterate(A,  [1, 2, 5, 10, 50]))
print(power_iterate(A2, [1, 2, 5, 10, 50]))
print(np.linalg.eigvals(A), np.linalg.eigvals(A2))

# Convergence speed is set by the RATIO of the two largest eigenvalues. For A
# that ratio is 2/5, so each step shrinks the error to 40% of itself and ten
# steps are plenty. For A2 it is 3.9/4 = 0.975, and after 50 steps it is still
# arriving. Power iteration is fast exactly when one direction dominates."""),
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["09"] = {
    "objectives": [
        "Predict the output size of a convolution in `full`, `valid` and `same` mode.",
        "Say why what deep learning calls convolution is really correlation.",
        "Write a convolution as multiplication by a Toeplitz matrix.",
        "Distinguish transposed convolution from true deconvolution.",
        "Recover a blurred image with Richardson-Lucy, and measure it honestly.",
    ],
    "setup": """import numpy as np
from scipy import signal
from scipy.linalg import toeplitz
from skimage import data
from skimage.restoration import richardson_lucy

img = data.camera().astype(float) / 255.      # real photograph, 512x512
sobel = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], float)
print(img.shape, img.min(), img.max())""",
    "cells": [
        md("""## The theory

> 🇪🇸 La convolución desliza un núcleo pequeño sobre un array mayor,
> multiplicando y sumando en cada posición.

**Convolution** slides a small array (the **kernel**, or **filter**) across a
larger one, multiplying and summing at each position. It is the operation at the
heart of every convolutional neural network, and it is also how every blur,
sharpen and edge-detection filter works."""),
        code("""x = np.array([1., 2., 3., 4., 5.])
k = np.array([1., 0., -1.])

print(np.convolve(x, k, 'full'))    # [ 1.  2.  2.  2.  2. -4. -5.]  length 5+3-1 = 7
print(np.convolve(x, k, 'valid'))   # [ 2.  2.  2.]                  length 5-3+1 = 3
print(np.convolve(x, k, 'same'))    # [ 2.  2.  2.  2. -4.]          length 5"""),
        md("""Three modes, three output sizes. `valid` uses only positions where the kernel
fits completely — this is why convolution **shrinks** an image by
`kernel_size - 1`.

⚠️ **A detail that confuses everyone.** True convolution flips the kernel;
**correlation** does not. What deep learning libraries call "convolution" is
actually correlation. It makes no practical difference, because the network
*learns* the kernel — but you should know the names are inconsistent."""),
        code("""print(np.correlate(x, k, 'valid'))          # [-2. -2. -2.]
print(np.convolve(x, k[::-1], 'valid'))     # [-2. -2. -2.] — the same, with k flipped"""),
        md("""### Convolution is a matrix multiplication

This is the connection back to Chapter 2. Any convolution can be written as
multiplication by a **Toeplitz** matrix — a matrix where the kernel is shifted
along each row."""),
        code("""col = np.zeros(7); col[:3] = k
row = np.zeros(5); row[0] = k[0]
C = toeplitz(col, row)                             # (7, 5)
print(C.shape)
print(np.allclose(C @ x, np.convolve(x, k, 'full')))   # True"""),
        md("""So convolution is not a new kind of operation. It is a **structured matrix
multiplication** — one where the same few numbers are reused across the whole
matrix. That reuse is exactly why CNNs need so many fewer parameters than fully
connected networks.

### Deconvolution means two different things

Keep them separate:

1. **Transposed convolution** — the upsampling layer in a decoder or GAN. It
   makes things *bigger*. It is **not** a true inverse; the name is historical
   and misleading.
2. **True deconvolution** — recovering the original signal from a blurred one.
   This is a genuine inverse problem, and it is where section 07 comes back."""),
        md("""## Exercise 1 — convolve and blur a real photograph

> 🇪🇸 Convoluciona y desenfoca una fotografía real."""),
        code("""# TODO 1: Convolve `img` with `sobel` in 'valid' mode. What shape comes out,
#         and by how much did it shrink?

# TODO 2: Blur the image with a 9x9 averaging kernel (all entries equal,
#         summing to 1), mode='same'. Display it next to the original."""),
        solution("""edges = signal.convolve2d(img, sobel, mode='valid')     # (510, 510) — shrank by 2
print(edges.shape)

psf = np.ones((9, 9)); psf /= psf.sum()
blurred = signal.convolve2d(img, psf, mode='same', boundary='symm')
print(blurred.shape)                                    # (512, 512) — 'same' keeps it

import matplotlib.pyplot as plt
fig, ax = plt.subplots(1, 3, figsize=(12, 4))
for a, im, t in zip(ax, [img, edges, blurred], ["original", "sobel", "blurred"]):
    a.imshow(im, cmap="gray"); a.set_title(t); a.axis("off")
plt.show()

# 'valid' shrinks by kernel_size - 1 = 2 in each direction: 512 -> 510."""),
        md("""See the blur trade-off live: a bigger averaging kernel removes more detail,
and it shrinks a `'valid'`-mode output by more (`kernel_size - 1` per side).

> 🇪🇸 El deslizador muestra el compromiso del desenfoque: un kernel más grande
> elimina más detalle, y en modo `'valid'` recorta más el resultado."""),
        code("""try:
    from google.colab import output
    output.enable_custom_widget_manager()
except ImportError:
    pass

import ipywidgets as widgets
import matplotlib.pyplot as plt

def show_blur(k):
    psf_k = np.ones((k, k)); psf_k /= psf_k.sum()
    blurred_k = signal.convolve2d(img, psf_k, mode='same', boundary='symm')
    valid_k = signal.convolve2d(img, psf_k, mode='valid')

    plt.close('all')
    fig, axes = plt.subplots(1, 2, figsize=(8, 4))
    axes[0].imshow(blurred_k, cmap='gray')
    axes[0].set_title(f"{k}x{k} kernel, mode='same' — {blurred_k.shape}")
    axes[1].imshow(valid_k, cmap='gray')
    axes[1].set_title(f"{k}x{k} kernel, mode='valid' — {valid_k.shape}")
    for a in axes:
        a.axis('off')
    plt.tight_layout()
    plt.show()

widgets.interact(show_blur,
                  k=widgets.IntSlider(min=1, max=25, step=2, value=9,
                                       description='kernel size'));"""),
        md("""## Exercise 2 — transposed convolution

> 🇪🇸 Convolución transpuesta: hace las cosas más grandes, no las deshace."""),
        code("""# TODO 3: Upsample this 2x2 array to 3x3 by adding small * kernel into an
#         output array at each position:
#             small = np.array([[1., 2.], [3., 4.]]); ker = np.ones((2, 2))
#         What shape do you get? Why is this called "deconvolution" in CNNs
#         even though it does not undo anything?"""),
        solution("""small = np.array([[1., 2.], [3., 4.]])
ker = np.ones((2, 2))

out = np.zeros((3, 3))
for i in range(2):
    for j in range(2):
        out[i:i+2, j:j+2] += small[i, j] * ker
print(out)
# [[ 1.  3.  2.]
#  [ 4. 10.  6.]
#  [ 3.  7.  4.]]

# Shape (3, 3): it GREW, by kernel_size - 1, which is exactly what 'valid'
# convolution shrinks by. That inverse relationship between the SHAPES is the
# whole reason for the name. The VALUES are not undone at all — you cannot
# recover `small` from `out`. The name is historical and misleading."""),
        md("""## Exercise 3 — true deconvolution

> 🇪🇸 Deconvolución de verdad. **Recorta 25 píxeles del borde antes de medir.**

::: {.callout-warning}
**This is the hardest thing in the workshop, and it has a trap.** Deconvolution
creates strong artifacts at the edges, where the algorithm has no information
about what lies outside the image. If you measure error over the whole image,
the artifacts dominate and it looks like the method failed. **Crop 25 pixels off
every side before measuring.** Do this before you run it, not after.
:::"""),
        code("""# TODO 4: Add small noise to the blurred image, then try to recover the
#         original with skimage.restoration.richardson_lucy(..., num_iter=50).
#         Measure error BEFORE and AFTER, ignoring a 25-pixel border.
#         Did it improve?"""),
        solution("""psf = np.ones((9, 9)); psf /= psf.sum()
blurred = signal.convolve2d(img, psf, mode='same', boundary='symm')
noisy = blurred + 0.002 * np.random.default_rng(0).standard_normal(blurred.shape)

recovered = richardson_lucy(np.clip(noisy, 0, 1), psf, num_iter=50)

c = 25   # ignore the border: deconvolution always creates edge artifacts
err = lambda a: np.linalg.norm((a - img)[c:-c, c:-c]) / np.linalg.norm(img[c:-c, c:-c])
print(err(noisy), err(recovered))     # 0.1157 -> 0.0815

# Deconvolution REDUCED THE ERROR BY ABOUT 30%."""),
        md("""## Why not just invert the blur directly?

Because it fails badly. Blurring destroys high-frequency detail, so inverting it
divides by numbers very close to zero and amplifies noise enormously."""),
        code("""# Self-contained: rebuilds the blur and the noise rather than reusing names
# from the exercise above, so this cell runs whether or not you opened the
# solution — and whatever you called your own variables.
psf = np.ones((9, 9)); psf /= psf.sum()
blurred = signal.convolve2d(img, psf, mode='same', boundary='symm')
noisy = blurred + 0.002 * np.random.default_rng(0).standard_normal(blurred.shape)

K = np.fft.fft2(psf, s=img.shape)
naive = np.real(np.fft.ifft2(np.fft.fft2(noisy) / np.where(abs(K) < 1e-3, 1e-3, K)))

c = 25
err = lambda a: np.linalg.norm((a - img)[c:-c, c:-c]) / np.linalg.norm(img[c:-c, c:-c])
print(err(noisy), err(naive))     # 0.1157   ~2.49
#
# Richardson-Lucy got that 0.1157 down to 0.0815. The naive inverse takes it to
# ~2.49 — roughly TWENTY TIMES WORSE than the blurred image it started from.
# Cropping the border does not rescue it either (~2.51 uncropped): this is not
# an edge artifact, it is noise amplified across the whole image."""),
        md("""## What just happened

**This is the same lesson as section 07.** A direct inverse either does not exist
or is unusable, so you use a method that finds the best stable answer instead.
The pseudoinverse does this for linear systems; Richardson-Lucy and Wiener
filtering do it for deconvolution.

> 🇪🇸 Cuando no existe una inversa exacta, no te rindes: buscas la mejor
> aproximación estable.

In biotech this is routine: every fluorescence microscope blurs its images by a
known amount (the *point spread function*), and deconvolution is standard
practice before cells are counted or measured."""),
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["10"] = {
    "objectives": [
        "Build a genuine order-3 tensor out of a flat table of real trips.",
        "Compute a Tucker decomposition by HOSVD, using only unfolding, SVD and einsum.",
        "Contract three axes at once with a single `einsum` string.",
        "Measure reconstruction error against compression ratio.",
        "Read a factor matrix and recognise a real pattern the decomposition found by itself.",
    ],
    "setup": """import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from skimage import data

TAXIS = "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/taxis.csv"
taxis = pd.read_csv(TAXIS)

def unfold(T, axis):
    return np.moveaxis(T, axis, 0).reshape(T.shape[axis], -1)

print(taxis.shape)                       # (6433, 14) — 6,433 real NYC taxi trips""",
    "cells": [
        md("""## Rank you can see

> 🇪🇸 Antes de generalizar a tensores, comprimamos una sola matriz: una
> imagen real. La SVD truncada de rango k conserva las k direcciones
> singulares más fuertes y descarta el resto — por Eckart–Young, es la mejor
> aproximación de rango k posible en norma de Frobenius.

Before generalizing to tensors, let's compress a single matrix — a real
image. The rank-`k` truncated SVD keeps only the `k` strongest singular
directions and drops the rest. By the **Eckart–Young theorem**, that
truncation is the *optimal* rank-`k` approximation to the original matrix in
Frobenius norm — no other rank-`k` matrix is closer.

We'll reconstruct a 512×512 grayscale photograph (`skimage.data.camera()`) at
`k = 1, 5, 20, 50` and full rank, and compare three things side by side: how
much storage each reconstruction needs, how much of the image's Frobenius
energy it retains, and how it actually looks."""),
        code("""img = data.camera().astype(float)
m, n = img.shape                          # (512, 512)

U, s, Vt = np.linalg.svd(img, full_matrices=False)

ks = [1, 5, 20, 50, min(m, n)]
total_energy = np.sum(s**2)

fig, axes = plt.subplots(1, len(ks), figsize=(15, 3.5))
for ax, k in zip(axes, ks):
    recon = (U[:, :k] * s[:k]) @ Vt[:k, :]
    stored = k * (m + n + 1)                          # mk + k + nk
    storage_pct = 100 * stored / (m * n)
    factor = (m * n) / stored
    energy_pct = 100 * np.sum(s[:k]**2) / total_energy
    label = "full rank" if k == min(m, n) else f"k={k}"
    ax.imshow(recon, cmap="gray", vmin=0, vmax=255)
    ax.set_title(f"{label}\\n{storage_pct:.1f}% storage, {factor:.1f}x\\n{energy_pct:.1f}% energy",
                 fontsize=9)
    ax.axis("off")
plt.tight_layout()
plt.show()

for k in ks:
    stored = k * (m + n + 1)
    print(f"k={k:>3}  storage={100*stored/(m*n):6.2f}%  "
          f"{(m*n)/stored:6.2f}x  energy={100*np.sum(s[:k]**2)/total_energy:6.2f}%")
# k=  1  storage=  0.39%  255.75x  energy= 87.01%
# k=  5  storage=  1.96%   51.15x  energy= 97.04%
# k= 20  storage=  7.82%   12.79x  energy= 98.98%
# k= 50  storage= 19.55%    5.12x  energy= 99.60%
# k=512  storage=200.20%    0.50x  energy=100.00%"""),
        md("""## Storage, energy, and what your eyes see

> 🇪🇸 El almacenamiento, la energía retenida y la calidad perceptual no son
> la misma curva. Con muy pocos componentes ya se retiene casi toda la
> energía, y la imagen es reconocible con una fracción minúscula del
> almacenamiento original. La misma idea — quedarse con las direcciones más
> fuertes y descartar el resto — es exactamente lo que Tucker/HOSVD hace a
> continuación, un eje del tensor a la vez.

At `k = 1`, under 0.4% of the storage already recovers 87% of the energy —
but the picture is barely recognisable. By `k = 20`, storage is still under
8% of the original and the picture is already unmistakably the photograph,
while the energy curve hasn't yet reached its final digit. At full rank, the
factorized `U`, `s`, `Vt` together need *more* numbers than the dense image
itself (about 200% of its storage) — factorizing only pays off once you
truncate. The same idea — keep the strongest singular directions, drop the
rest — is what Tucker/HOSVD does next, one tensor axis at a time.

**The picture is recognisable at `k = 20` — under 8% of the storage — long
before the numbers claim it should be. Energy retained and perceptual
quality are not the same curve.**"""),
        md("""## The theory

> 🇪🇸 PCA comprime una **matriz**: dos ejes. La descomposición de Tucker
> generaliza PCA a un tensor de cualquier orden: una **matriz de factores por
> eje**, más un **tensor núcleo** pequeño.

PCA compresses a **matrix** — two axes. Real data often has more. **Tucker
decomposition** generalizes PCA to a tensor of any order: one **factor matrix
per axis**, plus a small **core tensor** describing how the factors combine.

The way to compute it, called **HOSVD**, uses only tools you already have:

1. **Unfold** the tensor along each axis (section 01).
2. Run **SVD** on each unfolding; keep the top components. These are the factor
   matrices.
3. **Contract** the original tensor against all factor matrices to get the core
   (section 06).

The related **CP decomposition** instead writes the tensor as a sum of simple
rank-1 pieces. Tucker is usually more accurate at the same size; CP is often
easier to interpret."""),
        md("""## Our real tensor

From 6,433 real New York taxi trips we build a genuine order-3 tensor:
**pickup borough × dropoff borough × hour of day.**

> 🇪🇸 Un tensor real de orden 3: barrio de origen × barrio de destino × hora."""),
        code("""taxis['hour'] = pd.to_datetime(taxis['pickup']).dt.hour
sub = taxis.dropna(subset=['pickup_borough', 'dropoff_borough'])
pb = sorted(sub['pickup_borough'].unique())
db = sorted(sub['dropoff_borough'].unique())

T = np.zeros((len(pb), len(db), 24))
for (p, d, h), v in sub.groupby(['pickup_borough', 'dropoff_borough', 'hour']).size().items():
    T[pb.index(p), db.index(d), h] = v

print(T.shape, pb, db)"""),
        md("""## Exercise 1 — read the tensor before you decompose it

> 🇪🇸 Entiende el tensor antes de descomponerlo."""),
        code("""# TODO 1: Print T.shape and T.sum(). What does the entry T[i, j, k] mean?

# TODO 2: Which hour has the most trips overall? (Sum over the first two axes.)

# TODO 3: Unfold T along each axis and print the three shapes. Confirm the total
#         number of entries is the same each time — unfolding loses nothing."""),
        solution("""print(T.shape, T.sum())
# T[i, j, k] = how many trips started in borough pb[i], ended in borough db[j],
# and were picked up during hour k.

by_hour = T.sum(axis=(0, 1))
print(by_hour.argmax())                    # 18 — evening rush hour

for ax in range(3):
    M = unfold(T, ax)
    print(ax, M.shape, M.size == T.size)   # True every time"""),
        md("""## Exercise 2 — HOSVD, in two einsum calls

> 🇪🇸 HOSVD en dos llamadas a einsum.

Look at the einsum strings you are about to write: `'ijk,ia,jb,kc->abc'`
contracts three axes in one expression. **That is why einsum came first.**"""),
        code("""# TODO 4: Run SVD on each unfolding, keep the top (2, 2, 3) components, and
#         build the core tensor with ONE einsum call.

# TODO 5: Reconstruct T from the core and factors, again with one einsum.
#         Compute the relative error and the compression ratio."""),
        solution("""Us = [np.linalg.svd(unfold(T, ax), full_matrices=False)[0] for ax in range(3)]
r = (2, 2, 3)
Us = [Us[i][:, :r[i]] for i in range(3)]
print([u.shape for u in Us])

core  = np.einsum('ijk,ia,jb,kc->abc', T, Us[0], Us[1], Us[2])   # (2, 2, 3)
recon = np.einsum('abc,ia,jb,kc->ijk', core, Us[0], Us[1], Us[2])

error = np.linalg.norm(T - recon) / np.linalg.norm(T)            # 0.067
ratio = T.size / (core.size + sum(u.size for u in Us))           # 4.71
print(core.shape, round(error, 3), round(ratio, 2))"""),
        md("""The exercise above fixed one rank, (2, 2, 3). Move the slider to see the
whole error/compression trade-off, not just that one point on it.

> 🇪🇸 El ejercicio anterior fijó un solo rango, (2, 2, 3). Mueve el
> deslizador para ver toda la curva de compensación, no solo ese punto."""),
        code("""try:
    from google.colab import output
    output.enable_custom_widget_manager()
except ImportError:
    pass

import ipywidgets as widgets
import matplotlib.pyplot as plt

# Precompute the full SVD basis for each axis once; the slider only re-slices
# and re-contracts these small matrices, which is what keeps it responsive.
bases = [np.linalg.svd(unfold(T, ax), full_matrices=False)[0] for ax in range(3)]
max_rank = min(u.shape[1] for u in bases)

ks, errors, ratios = list(range(1, max_rank + 1)), [], []
for kk in ks:
    Uk = [bases[ax][:, :kk] for ax in range(3)]
    core_k = np.einsum('ijk,ia,jb,kc->abc', T, *Uk)
    recon_k = np.einsum('abc,ia,jb,kc->ijk', core_k, *Uk)
    errors.append(np.linalg.norm(T - recon_k) / np.linalg.norm(T))
    ratios.append(T.size / (core_k.size + sum(u.size for u in Uk)))

def show_rank(k):
    i = k - 1
    plt.close('all')
    fig, ax1 = plt.subplots(figsize=(6, 3.2))
    ax1.plot(ks, errors, color='#C44E52')
    ax1.scatter([k], [errors[i]], color='#C44E52', zorder=5)
    ax1.set_xlabel('rank k (shared across all three axes)')
    ax1.set_ylabel('relative error', color='#C44E52')
    ax2 = ax1.twinx()
    ax2.plot(ks, ratios, color='#4C72B0')
    ax2.scatter([k], [ratios[i]], color='#4C72B0', zorder=5)
    ax2.set_ylabel('compression ratio (x)', color='#4C72B0')
    plt.tight_layout()
    plt.show()
    print(f"rank k={k}: error={errors[i]:.3f}, compression={ratios[i]:.2f}x")

widgets.interact(show_rank,
                  k=widgets.IntSlider(min=1, max=max_rank, step=1, value=2,
                                       description='rank k'));"""),
        md("""## Exercise 3 — what did it find?

> 🇪🇸 ¿Qué encontró la descomposición por sí sola?

This is the important one."""),
        code("""# TODO 6: Look at the first column of the hour factor matrix. At which hour is
#         it largest? Does that match what you found in TODO 2?"""),
        solution("""hour_factor = Us[2]                        # (24, 3) — one row per hour
peak = np.abs(hour_factor[:, 0]).argmax()
print(peak)                                # 18

print(T.sum(axis=(0, 1)).argmax())         # 18 — the same hour, from raw counts

# THE DECOMPOSITION DISCOVERED EVENING RUSH HOUR BY ITSELF. Nobody told it about
# time, traffic or commuting; it found the dominant pattern along that axis
# because that is what a decomposition does.
#
# (Take the absolute value: singular vectors are only defined up to sign, so the
# strongest component may come out negative.)"""),
        md("""## What just happened

**4.7× fewer numbers, 6.7% error.** But the important part is TODO 6. The
strongest pattern in the hour factor peaks at **hour 18** — and that is also the
busiest hour in the raw data. The decomposition found rush hour on its own.

**Where this is used.** In tech, Tucker and CP compress the large weight tensors
inside neural networks so models run on phones instead of servers. In biotech,
applied to data such as (genes × samples × conditions), they find structure
ordinary PCA cannot reach, because **PCA can only ever see two axes**.

For real projects use [`tensorly`](https://tensorly.org), which implements both
properly. Take-home C in section 11 compares CP against what you just built."""),
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
CONTENT["11"] = {
    "objectives": [
        "State the one idea that connects the pseudoinverse, deconvolution and Tucker.",
        "Find the scaling trap in PCA on real, unstandardized data (take-home A).",
        "Build attention out of two contractions, and mask padded positions (take-home B).",
        "Run a real CP decomposition and read its components as trip types nobody labelled (take-home C).",
        "Build correlated data from independent noise with Cholesky, and see why ignoring covariance understates portfolio risk (take-home D).",
        "Denoise a real voice recording by truncating the SVD of its STFT, and measure the result in SNR rather than by ear (take-home E).",
        "Trade parameter count against reconstruction error with a rank slider, on a real dense tensor (optional appendix).",
    ],
    "setup": """import numpy as np
import pandas as pd
from sklearn.datasets import load_breast_cancer
from scipy import signal

rng = np.random.default_rng(0)""",
    "cells": [
        md("""## What you did today

> 🇪🇸 Lo que hiciste hoy.

1. **Section 01** — learned the vocabulary of tensors (axis, order, shape, slice,
   fiber, unfolding, contraction, decomposition), and that unfolding turns any
   tensor into a matrix without losing anything.
2. **Sections 02 and 05** — argued about what axes *mean*, and found that a batch
   axis and a time axis behave differently even when the shapes look identical.
3. **Sections 03 and 04** — indexed, broadcast, reshaped and transposed real
   tumour data and real medical images, and hit real problems: zero-variance
   pixels, and reshape silently destroying an image.
4. **Sections 06–10** — wrote contractions with `einsum`; solved an unsolvable
   20,433-equation system with the pseudoinverse; used recursion to forecast real
   airline traffic and to find an eigenvector; convolved and deconvolved a real
   photograph; and compressed a real taxi tensor 4.7× with Tucker, which found
   rush hour on its own.

### One idea connects sections 07, 09 and 10

**When a problem has no exact answer or no true inverse, you do not give up —
you find the best stable approximation.** The pseudoinverse does this for linear
systems, Richardson-Lucy for blurred images, and Tucker for tensors that are too
large to keep in full.

> 🇪🇸 Cuando un problema no tiene respuesta exacta ni inversa verdadera, no te
> rindes: buscas la mejor aproximación estable."""),
        md("""## Where to go next

- `torch.einsum` / `tf.einsum` / `jnp.einsum` — **identical syntax** to what you
  used today.
- [`tensorly`](https://tensorly.org) — proper Tucker and CP decompositions.
- `np.linalg` — the rest of Chapter 2: eigendecomposition, `lstsq`, `pinv`, `qr`,
  `cholesky`.
- `scipy.signal` and `skimage.restoration` — convolution and deconvolution
  beyond today.
- The five take-homes below."""),
        md("""### Optional: the same contraction in PyTorch

Everything today was NumPy, because that is what the workshop's real datasets
and verified numbers are built on. The einsum string does not change when you
move to a deep learning framework — only the array type does."""),
        code("""# Optional. Colab has torch pre-installed; skip this cell if you prefer.
try:
    import torch
    photo = rng.standard_normal((8, 8, 3))
    w = np.array([0.2125, 0.7154, 0.0721])

    np_gray = np.einsum('hwc,c->hw', photo, w)
    pt_gray = torch.einsum('hwc,c->hw', torch.tensor(photo), torch.tensor(w))

    print(np.allclose(np_gray, pt_gray.numpy()))     # True — same string, same answer
except ImportError:
    print("torch not installed — nothing here you need")"""),
        md("""---

## Take-home A — How many principal components are enough?

> 🇪🇸 Ejercicio para casa A: ¿cuántas componentes principales bastan?

**Real data contains a trap here. Find it.**"""),
        code("""bc = load_breast_cancer(); X, y = bc.data, bc.target

# TODO 1: Center X, run np.linalg.svd, and compute the fraction of variance each
#         component explains (variance is proportional to S**2).

# TODO 2: How many components explain 95% of the variance? The answer will look
#         TOO GOOD. Do not trust it yet.

# TODO 3: Print X.var(axis=0). The 30 measurements use different units — some are
#         areas in the thousands, some are ratios below 1. What is that doing?

# TODO 4: Redo everything on standardized data: (X - mean) / std. How many now?

# TODO 5: Scatter-plot the first 2 components, coloured by y. Do the two groups
#         separate?"""),
        solution("""Xc = X - X.mean(axis=0)
S = np.linalg.svd(Xc, full_matrices=False)[1]
frac = S**2 / (S**2).sum()
n95 = np.argmax(np.cumsum(frac) >= 0.95) + 1      # 1  (!)
print(n95, round(frac[0], 3))                      # 1 0.982

print(np.sort(X.var(axis=0))[[0, -1]])             # ~0.0000075 up to ~324000

Xs = (X - X.mean(axis=0)) / X.std(axis=0)
S2 = np.linalg.svd(Xs, full_matrices=False)[1]
frac_scaled = S2**2 / (S2**2).sum()
n95_scaled = np.argmax(np.cumsum(frac_scaled) >= 0.95) + 1   # 10
print(n95_scaled)

# Without standardizing, the first component appears to explain 98.2% of the
# variance. IT IS AN ILLUSION: `worst area` has a variance around 323,000 while
# smoothness values sit below 1, so PCA reports the largest UNIT, not the
# largest PATTERN. After standardizing, the first component explains 44% and
# TEN components are needed.
#
# PCA KNOWS NOTHING ABOUT UNITS. Features on different scales must be
# standardized first.

import matplotlib.pyplot as plt
fig, ax = plt.subplots(figsize=(6.5, 3.5))
n_show = 15
ax.plot(range(1, n_show + 1), np.cumsum(frac[:n_show]), marker="o",
        label="unstandardized", color="#C44E52")
ax.plot(range(1, n_show + 1), np.cumsum(frac_scaled[:n_show]), marker="o",
        label="standardized", color="#4C72B0")
ax.axhline(0.95, color="gray", linestyle="--", linewidth=1, label="95% threshold")
ax.set_xlabel("number of components"); ax.set_ylabel("cumulative variance explained")
ax.set_title("The scree plot IS the standardisation trap")
ax.legend()
plt.tight_layout()
plt.show()

# TODO 5 — the two groups do separate, on standardized data, in 2 of 30 columns.
Z = Xs @ np.linalg.svd(Xs, full_matrices=False)[2][:2].T
fig, ax = plt.subplots(figsize=(5, 4))
ax.scatter(Z[:, 0], Z[:, 1], c=y, s=8, cmap="coolwarm")
ax.set_xlabel("component 1"); ax.set_ylabel("component 2")
ax.set_title("standardized data — malignant/benign in 2 components")
plt.tight_layout()
plt.show()"""),
        md("""---

## Take-home B — Attention is two contractions

> 🇪🇸 Ejercicio para casa B: la atención son dos contracciones.

Attention is the mechanism that answers question 5 from section 05: *which parts
of a sequence matter most?* Protein language models use it so every amino acid
can look at every other one; recommenders use it to weight a user's past
interactions."""),
        code("""np.random.seed(6)
batch, seq_len, dim = 4, 12, 16
Q, K, V = (np.random.randn(batch, seq_len, dim) for _ in range(3))

def softmax(x, axis=-1):
    x = x - x.max(axis=axis, keepdims=True)
    e = np.exp(x); return e / e.sum(axis=axis, keepdims=True)

# TODO 1: With einsum, compute scores[b,i,j] = how much position i attends to
#         position j. Shape (4, 12, 12). Scale by 1/sqrt(dim).

# TODO 2: Apply softmax on the correct axis so each row of weights sums to 1.

# TODO 3: With einsum, combine V using those weights -> (4, 12, 16).

# TODO 4: Suppose the last 3 positions are padding, not real data. Build a mask,
#         set those scores to -np.inf BEFORE the softmax, and verify the padded
#         positions receive exactly zero weight."""),
        solution("""scores  = np.einsum('bid,bjd->bij', Q, K) / np.sqrt(dim)
weights = softmax(scores, axis=-1)
output  = np.einsum('bij,bjd->bid', weights, V)
print(scores.shape, weights.shape, output.shape)
print(np.allclose(weights.sum(axis=-1), 1.0))        # True

mask = np.zeros((seq_len, seq_len)); mask[:, -3:] = -np.inf
weights_masked = softmax(scores + mask, axis=-1)
print(weights_masked[..., -3:].max())                # 0.0 — exactly zero weight

# `scores` is Chapter 2's dot product (eq. 2.8); `output` is Chapter 2's linear
# combination (eq. 2.28). ATTENTION IS TWO CONTRACTIONS built from ideas you had
# already read.
#
# TODO 4 solves the variable-length problem from section 02: THE MASK IS HOW
# REAL MODELS HANDLE SEQUENCES AND VIDEOS OF DIFFERENT LENGTHS."""),
        md("""---

## Take-home C — CP decomposition, compared to Tucker

> 🇪🇸 Ejercicio para casa C: CP comparado con Tucker."""),
        code("""# TODO 1: Build one rank-1 tensor with einsum from three random vectors of
#         length 4, 5 and 24. What shape is it? How many numbers define it?

# TODO 2: Compare that against 4*5*24. What is the compression of ONE rank-1 piece?"""),
        solution("""a, b, c = rng.standard_normal(4), rng.standard_normal(5), rng.standard_normal(24)
rank1 = np.einsum('i,j,k->ijk', a, b, c)     # (4, 5, 24) from only 33 numbers
print(rank1.shape, len(a) + len(b) + len(c), 4 * 5 * 24)   # (4,5,24) 33 480
print(round(480 / 33, 1))                                   # 14.5x for one piece

# A full CP decomposition is a SUM of R pieces like this one, not just a single
# rank-1 term. The cells below build a real rank-3 CP model on real data — no
# more commented-out pseudocode."""),
        md("""## Now decompose a real tensor with CP

> 🇪🇸 Ahora sí: una descomposición CP real sobre un tensor real.

This take-home is separate from section 10's notebook, so it rebuilds the same
real taxi tensor here rather than assuming section 10 already ran."""),
        code("""TAXIS = "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/taxis.csv"
taxis = pd.read_csv(TAXIS)
taxis['hour'] = pd.to_datetime(taxis['pickup']).dt.hour
sub = taxis.dropna(subset=['pickup_borough', 'dropoff_borough'])
pb = sorted(sub['pickup_borough'].unique())
db = sorted(sub['dropoff_borough'].unique())

T = np.zeros((len(pb), len(db), 24))
for (p, d, h), v in sub.groupby(['pickup_borough', 'dropoff_borough', 'hour']).size().items():
    T[pb.index(p), db.index(d), h] = v

print(T.shape, pb, db)   # (4, 5, 24) — the same real taxi tensor as section 10,
                         # rebuilt here so this notebook stands on its own"""),
        md("""CP needs a library here rather than the by-hand HOSVD from section 10: an ALS
loop short enough to read is also too short to be a reliable optimizer, and
getting that wrong would teach the wrong lesson. [`tensorly`](https://tensorly.org)
is not part of Colab's default image, so the install is explicit, the same way
section 10 tells you it borrowed the idea from a real library rather than
hiding it.

> 🇪🇸 CP necesita aquí una librería en vez del HOSVD hecho a mano de la sección
> 10: un bucle ALS lo bastante corto para leerse también es demasiado corto
> para ser un optimizador confiable. `tensorly` no viene instalado por defecto
> en Colab, así que la instalación es explícita."""),
        code("""%pip install -q tensorly

import tensorly as tl
from tensorly.decomposition import parafac

R = 3   # three real, checkable trip patterns fit this tensor's size
cp_weights, cp_factors = parafac(tl.tensor(T), rank=R, init='svd',
                                  random_state=0, n_iter_max=500, tol=1e-9)
Fpb, Fdb, Fhr = cp_factors                       # (4, 3), (5, 3), (24, 3)

cp_recon = tl.cp_to_tensor((cp_weights, cp_factors))
cp_error = np.linalg.norm(cp_recon - T) / np.linalg.norm(T)
print(f"CP rank {R}: relative reconstruction error = {cp_error:.3f}")
print("Section 10's Tucker, rank (2, 2, 3), measured 0.067 on this same tensor.")"""),
        md("""## What CP's uniqueness buys you, and what it does not

> 🇪🇸 Lo que la unicidad de CP te da, y lo que no te da.

PCA and Tucker's factor matrices are only defined up to an arbitrary rotation
within each subspace of similar size — ask for the "second principal
component" of near-equal-variance data and the answer is unstable. **CP has no
such freedom**, under a condition on the factor matrices called the Kruskal
condition, which this tensor satisfies. A CP component is only free to move in
three limited ways: the three components can be listed in any **order**; a
scalar can move between the three factor vectors of one component as long as
their **product** is unchanged; and because these are real (not just
positive) numbers, an even number of those factors can flip **sign** together.
None of that changes what one component *looks like* — it is still one
coherent pattern per axis, not a rotated mixture of several. That is why the
components below are worth reading individually, and why the code below uses
`abs()` before asking which entry is strongest — the strongest entry does not
move, only its sign might.

**Analysts benefit because CP exposes one interpretable pattern per axis —
pickup, dropoff and hour together — that can be read as a coherent trip type,
the way PCA's freely-rotating components cannot be.**"""),
        code("""# Colab renders ipywidgets through its own widget manager rather than the
# classic Jupyter one; this call is a no-op outside Colab, which is why it is
# guarded rather than assumed.
try:
    from google.colab import output
    output.enable_custom_widget_manager()
except ImportError:
    pass

import ipywidgets as widgets
import matplotlib.pyplot as plt

def show_component(component):
    r = component - 1   # the slider shows 1..R for students; factors are 0-indexed
    plt.close('all')
    fig, axes = plt.subplots(1, 3, figsize=(12, 3.2))
    axes[0].bar(pb, Fpb[:, r], color='#4C72B0')
    axes[0].set_title('Pickup borough'); axes[0].tick_params(axis='x', rotation=40)
    axes[1].bar(db, Fdb[:, r], color='#DD8452')
    axes[1].set_title('Dropoff borough'); axes[1].tick_params(axis='x', rotation=40)
    axes[2].bar(range(24), Fhr[:, r], color='#55A868')
    axes[2].set_title('Hour of day'); axes[2].set_xlabel('hour')
    fig.suptitle(f'CP component {component} of {R}')
    plt.tight_layout()
    plt.show()

    print(f"Strongest pickup borough:  {pb[np.argmax(np.abs(Fpb[:, r]))]}")
    print(f"Strongest dropoff borough: {db[np.argmax(np.abs(Fdb[:, r]))]}")
    print(f"Peak hour:                 {int(np.argmax(np.abs(Fhr[:, r])))}")

# TODO 3: Flip through all three components (1, 2, 3). Does each one read as
#         a different, nameable kind of trip? Which hour is each one busiest?
widgets.interact(show_component,
                  component=widgets.IntSlider(min=1, max=R, step=1, value=1,
                                               description='Component'));"""),
        md("""---

## Take-home D — Cholesky: the factorization that builds

> 🇪🇸 Ejercicio para casa D: Cholesky, la factorización que construye.

Every factorization used today — LU, QR, eigendecomposition, SVD — takes an
existing object **apart**. Cholesky is the one exception: you use it to
**build**. Given a covariance matrix `Sigma` that is symmetric and
positive-definite, `np.linalg.cholesky` finds a lower-triangular `L` with
`L @ L.T == Sigma`. Feed `L` independent Gaussian noise and it hands back
correlated draws with *exactly* that covariance.

`Sigma[i, j]` is the **covariance** between asset `i` and asset `j` — how much
they move together, in the assets' own units. Its diagonal `Sigma[i, i]` is
each asset's own variance. **Correlation** (`corr`) is the same relationship
rescaled to sit between -1 and 1, so it is comparable between assets of
different volatility; `Sigma = outer(vol, vol) * corr` puts the original scale
back in.

If `z` is independent noise (`Cov(z) = I`) and `x = L @ z`, then
`Cov(x) = L Cov(z) L.T = L L.T = Sigma` — which is exactly why `L` turns
independent draws into correlated ones.

> 🇪🇸 `Sigma[i, j]` es la covarianza entre el activo `i` y el `j`: cuánto se
> mueven juntos. La diagonal es la varianza de cada activo. `corr` es la misma
> relación reescalada entre -1 y 1. Si `z` es ruido independiente
> (`Cov(z) = I`) y `x = L @ z`, entonces `Cov(x) = L Cov(z) L.T = L L.T =
> Sigma`: por eso `L` convierte ruido independiente en ruido correlacionado."""),
        code("""vol = np.array([0.012, 0.015, 0.010])
corr = np.array([[1.00, 0.85, 0.20],
                  [0.85, 1.00, 0.20],
                  [0.20, 0.20, 1.00]])
Sigma = np.outer(vol, vol) * corr

weights = np.array([0.4, 0.4, 0.2])
mu = np.array([0.00030, 0.00035, 0.00020])
n_days, n_paths, initial_value = 252, 20_000, 100.0

rng = np.random.default_rng(5)
sample_sizes = [100, 1_000, 100_000]

# TODO 1: L = np.linalg.cholesky(Sigma). Verify np.allclose(L @ L.T, Sigma) is
#         True, and print L and the reconstruction L @ L.T, both rounded.

# TODO 2: For each n in sample_sizes, draw z = rng.standard_normal((3, n)),
#         build x = L @ z, and compute the Frobenius error between np.cov(x)
#         and Sigma. Confirm it shrinks as n grows. For the LARGEST n, also
#         print np.cov(z) (should look like the identity) and np.cov(x)
#         (should look like Sigma) — that is the whole trick, made visible.

# TODO 3: Simulate a CORRECT correlated portfolio. Draw
#         z_paths = rng.standard_normal((3, n_days * n_paths)), build
#         correlated_asset_returns = mu[:, None] + L @ z_paths, reshape to
#         (3, n_paths, n_days), combine with `weights` into one daily
#         portfolio return per path per day, and compound each path into
#         terminal_correlated = initial_value * prod(1 + daily_returns).

# TODO 4: Simulate the SAME portfolio again but WRONG: replace L with
#         independent_scale = np.diag(np.sqrt(np.diag(Sigma))) — same
#         individual volatilities, zero cross-asset correlation — and reuse
#         the SAME z_paths. Produce terminal_independent the same way.

# TODO 5: Plot terminal_correlated and terminal_independent as overlaid
#         histograms (density=True) on the same axes, labelled and legended.

# TODO 6: Compare std, and the 5th and 1st percentiles, of both. Which
#         distribution has the fatter left tail — and why, given that no
#         individual asset's volatility ever changed?"""),
        solution("""L = np.linalg.cholesky(Sigma)
print(np.allclose(L @ L.T, Sigma))          # True
print(np.round(L, 4))
print(np.round(L @ L.T, 6))                 # matches Sigma

errors = []
for n in sample_sizes:
    z = rng.standard_normal((3, n))
    x = L @ z
    err = np.linalg.norm(np.cov(x) - Sigma)
    errors.append(err)
    print(n, err)
print(errors[0] > errors[1] > errors[2])    # True — error shrinks as n grows

print(np.round(np.cov(z), 3))               # close to the identity
print(np.round(np.cov(x), 6))               # close to Sigma
# Cov(x) = Cov(Lz) = L Cov(z) L.T ~ L I L.T = L L.T = Sigma. Independent noise
# in, correlated noise out — Cholesky is the "square root" that makes it work.

z_paths = rng.standard_normal((3, n_days * n_paths))

correlated_asset_returns = (mu[:, None] + L @ z_paths).reshape(3, n_paths, n_days)
portfolio_returns_correlated = np.einsum('a,apd->pd', weights, correlated_asset_returns)
terminal_correlated = initial_value * np.prod(1 + portfolio_returns_correlated, axis=1)

independent_scale = np.diag(np.sqrt(np.diag(Sigma)))
independent_asset_returns = (mu[:, None] + independent_scale @ z_paths).reshape(3, n_paths, n_days)
portfolio_returns_independent = np.einsum('a,apd->pd', weights, independent_asset_returns)
terminal_independent = initial_value * np.prod(1 + portfolio_returns_independent, axis=1)

import matplotlib.pyplot as plt
plt.hist(terminal_independent, bins=80, density=True, alpha=0.6,
         label="Assets simulated independently")
plt.hist(terminal_correlated, bins=80, density=True, alpha=0.6,
         label="Correct correlated simulation")
plt.xlabel("Terminal portfolio value")
plt.ylabel("Density")
plt.legend()
plt.show()

print(terminal_correlated.std(), terminal_independent.std())               # ~18.8  ~13.6
print(np.percentile(terminal_correlated, [1, 5]))                           # ~70.7 ~79.7
print(np.percentile(terminal_independent, [1, 5]))                          # ~79.9 ~86.9

# EVERY asset kept its own individual volatility in BOTH simulations —
# independent_scale used the SAME diagonal as Sigma. The only thing that
# changed is whether the simulation lets the three assets fall together.
# Ignoring the positive covariance did not touch any single asset's risk; it
# erased real cross-asset comovement and manufactured DIVERSIFICATION THAT
# ISN'T THERE — the correlated portfolio's distribution is wider and its
# lower tail is worse.
#
# This is NOT "correlation always increases risk." It is specific to THIS
# positively-correlated book: a negatively correlated pair would do the
# opposite, and ignoring it would UNDERSTATE diversification, not overstate
# it. What generalizes is only this: assuming independence when assets are
# not independent gets the TAILS of the distribution wrong."""),
        md("""### What the comparison shows

**Every individual asset kept the same volatility in both simulations.** The
only thing that changed is whether the simulation lets the three assets move
together. Ignoring the positive covariance did not touch any single asset's
risk; it erased real cross-asset comovement and manufactured diversification
that was never there — the correlated portfolio's terminal-value distribution
is wider, and its bad days are worse, than the (wrong) independent one.

**This is not "correlation always increases risk."** It is specific to this
book, where every pair is positively correlated. A negatively correlated pair
would do the opposite: ignoring it would make the simulation *understate*
diversification, not overstate it. What is general is only this: **assuming
independence when assets are not independent gets the tails of the
distribution wrong.**

> 🇪🇸 Cada activo conservó su propia volatilidad en ambas simulaciones — lo
> único que cambió es si la simulación permite que los tres se muevan juntos.
> Ignorar la covarianza positiva no tocó el riesgo individual: borró el
> comovimiento real y fabricó una diversificación que no existía. Esto **no**
> significa que "la correlación siempre aumenta el riesgo" — es específico de
> esta cartera, donde todo está correlacionado positivamente. Con correlación
> negativa ocurriría lo contrario. Lo único general es que **asumir
> independencia cuando los activos no lo son distorsiona las colas de la
> distribución.**"""),
        md("""---

## Take-home E — Audio denoising by rank reduction

> 🇪🇸 Ejercicio para casa E: eliminar ruido de audio reduciendo el rango.

Section 10 used truncated SVDs of matrix unfoldings to build a Tucker
approximation of a real taxi tensor. This take-home applies the same
low-rank idea to the frequency × time matrix produced from sound.

**The recording is real**: a five-second CC0 voice sample by Bart Massey, from
[`pdx-cs-sound/wavs`](https://github.com/pdx-cs-sound/wavs), pinned to commit
`ed5ebcbbbc2d11f0adddc9b50b78d581c29f738c` so the file this notebook fetches
cannot silently change under you. It downloads at runtime and is checked
against a known SHA-256 — if the download is corrupted or does not match the
pinned file, `fetch_verified_wav` below raises instead of quietly handing you
something else. **The noise is not real** — it is added on purpose, with a
fixed seed and a target signal-to-noise ratio, precisely so there is a known
clean reference to measure against. Do not confuse the two: the recording is
real data, exactly like every other dataset today; the noise is the
controlled experiment.

### Why a waveform becomes a matrix

A recording is one axis: amplitude over time. The **short-time Fourier
transform** (STFT) slices it into overlapping windows and Fourier-transforms
each one, producing a matrix `Z` with two axes — **frequency × time**. Row `i`
is "how much of frequency `f_i` is present"; column `j` is "during time window
`t_j`." Nothing earlier today paired frequency against time this way.

Because `Z` is a matrix, the SVD from sections 07 and 10 applies unchanged —
except `Z` is **complex**, and truncating its SVD keeps both magnitude and
phase. Reconstructing from magnitude alone would throw phase away and produce
audible distortion, so the truncated matrix goes straight into the inverse
STFT.

Speech energy concentrates in a handful of dominant frequency-time patterns —
a few singular vectors carry most of the signal. Broadband, unstructured noise
has no such structure: it tends to spread its energy across many singular
directions, including many smaller ones. Keeping only the largest `k`
singular values keeps most of the speech and discards a disproportionate
share of the noise.

> 🇪🇸 La STFT convierte una onda de una dimensión (amplitud en el tiempo) en
> una matriz de dos ejes: frecuencia × tiempo. La voz concentra su energía en
> pocas direcciones singulares dominantes; el ruido de banda ancha tiende a
> repartir su energía entre muchas direcciones singulares, incluidas muchas
> pequeñas. Por eso conservar solo las `k` mayores retiene la voz y descarta
> una parte desproporcionada del ruido — pero **esto no es un eliminador de
> ruido universal**: la comprobación real es el SNR medido, no cómo suena.

**This is not a universal denoiser.** It only works to the extent that the
noise really is broadband relative to a structured signal — narrowband noise,
or noise correlated with the signal, is not separated this way. The proof
either way is the measured SNR below, not how it sounds."""),
        code("""VOICE_URL = "https://raw.githubusercontent.com/pdx-cs-sound/wavs/ed5ebcbbbc2d11f0adddc9b50b78d581c29f738c/voice.wav"
VOICE_SHA256 = "2c4b4d9d5f90715fdbf599869a465d521638f40ca978b186df96f1543a4d67dc"

def fetch_verified_wav(url, expected_sha256):
    \"\"\"Download a WAV and refuse to proceed if it does not match the pinned
    checksum. No silent fallback to synthetic data on failure.\"\"\"
    import hashlib
    import io
    import urllib.request
    from scipy.io import wavfile
    raw = urllib.request.urlopen(url, timeout=30).read()
    got = hashlib.sha256(raw).hexdigest()
    if got != expected_sha256:
        raise ValueError(
            f"checksum mismatch for {url}: expected {expected_sha256}, got "
            f"{got}. Refusing to use unverified audio data.")
    return wavfile.read(io.BytesIO(raw))

def snr_db(reference, estimate):
    \"\"\"Energy-based SNR in dB. `reference` is always the real clean signal.\"\"\"
    return 10 * np.log10(np.sum(reference**2) / np.sum((estimate - reference)**2))

# TODO 1: fs, clean_i16 = fetch_verified_wav(VOICE_URL, VOICE_SHA256).
#         Convert to float in [-1, 1] (divide by 32768), and average channels
#         to mono if clean.ndim > 1. Print fs, duration in seconds, and shape.

# TODO 2: With rng = np.random.default_rng(42) and TARGET_SNR_DB = 5.0, build
#         additive noise scaled from the CLEAN SIGNAL'S OWN MEAN POWER (not an
#         arbitrary standard deviation) so that clean + noise lands at the
#         target SNR. Verify with snr_db(clean, noisy)."""),
        solution("""fs, clean_i16 = fetch_verified_wav(VOICE_URL, VOICE_SHA256)
clean = clean_i16.astype(np.float64) / 32768.0
if clean.ndim > 1:
    clean = clean.mean(axis=1)
print(fs, round(len(clean) / fs, 3), clean.shape)      # 48000 4.949 (237568,)

rng = np.random.default_rng(42)
TARGET_SNR_DB = 5.0
noise = rng.standard_normal(clean.shape)
scale = np.sqrt(np.mean(clean**2) / (np.mean(noise**2) * 10**(TARGET_SNR_DB / 10)))
noisy = clean + scale * noise
print(round(snr_db(clean, noisy), 2))                   # 5.0 -- exactly the target, by construction

# fetch_verified_wav is not decorative: it raises ValueError instead of
# silently returning something else if the download is corrupted or does not
# match the pinned file. voice.wav ITSELF is real -- a five-second CC0
# recording. The noise added here is the controlled, synthetic part of the
# experiment: it exists only so `clean` is a known reference an SNR can be
# measured against."""),
        code("""# TODO 3: f, t, Z = signal.stft(noisy, fs=fs, nperseg=1024, noverlap=512).
#         Z is COMPLEX -- frequency bins x time frames. Print Z.shape and the
#         full possible rank, min(Z.shape).

# TODO 4: U, s, Vh = np.linalg.svd(Z, full_matrices=False), on the COMPLEX
#         matrix directly so phase survives truncation, not magnitude alone.
#         For k in [2, 5, 10, 20, 40, 80, len(s)]: build
#         Z_k = (U[:, :k] * s[:k]) @ Vh[:k, :], run
#         signal.istft(Z_k, fs=fs, nperseg=1024, noverlap=512), align its
#         length to `clean`, and print k, the retained singular-value energy
#         sum(s[:k]**2) / sum(s**2), and snr_db(clean, reconstruction).

# TODO 5: Pick the k with the best SNR among the candidates above. Report its
#         retained energy, its SNR, and the improvement over the noisy SNR
#         from TODO 2.

# TODO 6: Build ONE common peak-scale factor from
#         max(|noisy|, |denoised|, |clean|) and make playback-only copies
#         scaled by it -- SNR itself is computed on the unscaled signals
#         above, never on these copies. Then display Audio players for the
#         noisy ("before") and denoised ("after") copies. You may run this
#         cell to listen, but do not save its Audio output into the tracked
#         notebook: Audio() output contains embedded base64 data and must
#         not be committed."""),
        solution("""f, t, Z = signal.stft(noisy, fs=fs, nperseg=1024, noverlap=512)
full_rank = min(Z.shape)
print(Z.shape, full_rank)                               # (513, 465) 465

U, s, Vh = np.linalg.svd(Z, full_matrices=False)
for k in [2, 5, 10, 20, 40, 80, len(s)]:
    Zk = (U[:, :k] * s[:k]) @ Vh[:k, :]
    _, x_rec = signal.istft(Zk, fs=fs, nperseg=1024, noverlap=512)
    n = min(len(x_rec), len(clean))
    energy = np.sum(s[:k]**2) / np.sum(s**2)
    print(k, round(energy * 100, 1), round(snr_db(clean[:n], x_rec[:n]), 2))
# k    energy%  SNR dB
# 2     33.2     2.29
# 5     51.1     4.76
# 10    61.9     6.78
# 20    70.1     8.48
# 40    78.3     9.08   <- best of these candidates
# 80    87.1     7.68   <- WORSE than k=40: noise has leaked back in
# 465  100.0     5.00   <- full rank matches `noisy` to numerical precision

k = 40
Zk = (U[:, :k] * s[:k]) @ Vh[:k, :]
_, x_rec = signal.istft(Zk, fs=fs, nperseg=1024, noverlap=512)
n = min(len(x_rec), len(clean))
denoised, clean_a, noisy_a = x_rec[:n], clean[:n], noisy[:n]

snr_before = snr_db(clean_a, noisy_a)
snr_after = snr_db(clean_a, denoised)
print(round(snr_before, 2), round(snr_after, 2), round(snr_after - snr_before, 2))
# 5.0 9.08 4.08

peak = max(np.abs(clean_a).max(), np.abs(noisy_a).max(), np.abs(denoised).max())
noisy_play = noisy_a / peak
denoised_play = denoised / peak

from IPython.display import Audio, display
display(Audio(noisy_play, rate=fs))       # "before"
display(Audio(denoised_play, rate=fs))    # "after"

# k=40 keeps 40 of 465 possible components -- 8.6% of full rank -- and
# recovers 4.08 dB of SNR: real, but modest, not a miracle. k=2 and k=5 keep
# too little of the SPEECH itself to beat the noisy baseline by much. k=80
# already lets enough noise back into smaller-but-still-significant singular
# directions that SNR gets WORSE than at k=40 -- more components is not
# always better. At the full rank of 465 the reconstruction matches `noisy`
# to numerical precision: proof that whatever denoising happened at k=40
# came specifically from truncating, not from the STFT -> SVD -> ISTFT round
# trip itself."""),
        md("""### What the numbers say

Keeping 40 of 465 possible singular directions (8.6% of full rank, 78.3% of
the singular-value energy) raised the SNR from 5.00 dB to 9.08 dB — a real
**+4.08 dB** improvement, not a dramatic one. Fewer components (`k=2`, `k=5`)
discard too much of the speech itself; more (`k=80`) already lets noise back
in, and SNR gets worse again. At the full rank the reconstruction matches the
noisy signal to numerical precision, which is the honest control: the
denoising is entirely a property of truncating, not of the STFT/SVD/ISTFT
machinery itself.

**Do not generalize this to "truncated SVD removes noise."** It suppresses
noise that is broadband and unstructured relative to a signal that
concentrates in a few dominant directions — the same low-rank argument
section 10 used on the taxi tensor, applied here to sound instead of trip
counts. Narrowband noise, or noise correlated with the speech itself, would
not separate out this way, and the only way to know which situation you are
in is to measure the SNR, the way this take-home just did.

> 🇪🇸 Conservar 40 de 465 direcciones singulares posibles (8.6% del rango
> completo, 78.3% de la energía de los valores singulares) subió el SNR de
> 5.00 dB a 9.08 dB — una mejora real de **+4.08 dB**, no espectacular. Menos
> componentes descartan demasiada voz; más vuelven a dejar entrar ruido y el
> SNR empeora. En el rango completo la reconstrucción coincide con la señal
> ruidosa hasta la precisión numérica, lo cual es el control honesto: la
> reducción de ruido es una propiedad de truncar, no del mecanismo
> STFT/SVD/ISTFT en sí. **No generalices esto a "la SVD truncada siempre
> elimina el ruido."** Solo funciona cuando el ruido es de banda ancha y no
> estructurado frente a una señal que se concentra en pocas direcciones
> dominantes — el mismo argumento de bajo rango que la sección 10 usó con el
> tensor de taxis, aplicado aquí al sonido. La única forma de saberlo es
> medir el SNR, como se acaba de hacer."""),
        md("""---

## After the workshop — Tucker compression for deployment

> 🇪🇸 Después del taller — compresión de Tucker para producción.

**Optional — run this after the workshop.** Section 10 ran one fixed Tucker
rank. Here a **rank slider** drives the trade-off live, on a real dense array,
so you can feel the curve instead of reading one number on it.

One honest note before the code: this is **not** a neural network's weights.
A small, stable, seconds-to-download real conv-weight file that both fits a
free Colab CPU and is not already engineered to be maximally compact turned
out not to exist — the two real options checked while building this notebook
(a modern efficient architecture, and a small classifier trained from scratch
on this workshop's own data) were **already so parameter-efficient that Tucker
found almost nothing left to compress**, which is itself real and worth
knowing, just not the point of this appendix. So instead this is a
**comparable dense tensor**: real NYC taxi trips again, but counted over
**pickup borough × dropoff borough × hour × weekday** — a genuine order-4
array, the same shape of thing an on-device cache or a recommender's usage
table has to fit in memory. The Tucker math, the slider, and the trade-off it
shows are identical to compressing a weight tensor; only the source of the
numbers differs, and it seemed better to say that plainly than to relabel taxi
trips as something they are not.

**Deployment engineers benefit because Tucker lets them choose a point on this
curve explicitly** — cut most of an array's storage and pay only a measured,
bounded increase in error, rather than guessing at a fixed compression
level."""),
        code("""TAXIS = "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/taxis.csv"
taxis = pd.read_csv(TAXIS)
taxis['hour'] = pd.to_datetime(taxis['pickup']).dt.hour
taxis['weekday'] = pd.to_datetime(taxis['pickup']).dt.weekday
sub = taxis.dropna(subset=['pickup_borough', 'dropoff_borough'])
pb2 = sorted(sub['pickup_borough'].unique())
db2 = sorted(sub['dropoff_borough'].unique())

demand = np.zeros((len(pb2), len(db2), 24, 7))
for (p, d, h, wd), v in sub.groupby(
        ['pickup_borough', 'dropoff_borough', 'hour', 'weekday']).size().items():
    demand[pb2.index(p), db2.index(d), h, wd] = v

print(demand.shape, int(demand.sum()))   # (4, 5, 24, 7), same trips as above"""),
        code("""def unfold(T, axis):
    return np.moveaxis(T, axis, 0).reshape(T.shape[axis], -1)

# Precompute BOTH SVD bases once. The slider below only re-slices and
# re-contracts these small matrices — it never redoes an SVD, which is what
# keeps it responsive. Only the two time axes are compressed; pickup and
# dropoff borough stay exact, the way section 10's kernel spatial dims would
# stay exact in a channel-mode Tucker compression of a real conv layer.
basis_hour    = np.linalg.svd(unfold(demand, 2), full_matrices=False)[0]   # (24, 24)
basis_weekday = np.linalg.svd(unfold(demand, 3), full_matrices=False)[0]   # (7, 7)

n_pb, n_db, n_hour, n_weekday = demand.shape
original_params = demand.size

# Sweep every achievable rank once, up front, so the widget only ever looks
# values up rather than recomputing them.
ranks = list(range(1, n_hour + 1))
compressed_list, ratio_list, error_list, madds_list = [], [], [], []
for k in ranks:
    r_hour, r_weekday = k, min(k, n_weekday)
    Uh, Uw = basis_hour[:, :r_hour], basis_weekday[:, :r_weekday]
    core  = np.einsum('ijhw,hc,wd->ijcd', demand, Uh, Uw)
    recon = np.einsum('ijcd,hc,wd->ijhw', core, Uh, Uw)
    compressed = core.size + Uh.size + Uw.size
    compressed_list.append(compressed)
    ratio_list.append(original_params / compressed)
    error_list.append(np.linalg.norm(demand - recon) / np.linalg.norm(demand))
    # Multiply-adds to RE-EXPAND the compressed factors back to the full
    # array — the cost a deployed system pays each time it reads the cache.
    # This is not a network FLOP count; it is specifically that one contraction.
    madds_list.append(n_pb * n_db * n_hour * r_weekday * (r_hour + n_weekday))

print(f"original parameters: {original_params} "
      f"(pickup {n_pb} x dropoff {n_db} x hour {n_hour} x weekday {n_weekday})")"""),
        code("""try:
    from google.colab import output
    output.enable_custom_widget_manager()
except ImportError:
    pass

import ipywidgets as widgets
import matplotlib.pyplot as plt

def tucker_tradeoff(k):
    i = k - 1
    plt.close('all')
    fig, ax1 = plt.subplots(figsize=(6.5, 3.2))
    ax1.plot(ranks, error_list, color='#C44E52')
    ax1.scatter([k], [error_list[i]], color='#C44E52', zorder=5)
    ax1.set_xlabel('rank k (shared by the hour and weekday axes)')
    ax1.set_ylabel('relative error', color='#C44E52')
    ax2 = ax1.twinx()
    ax2.plot(ranks, ratio_list, color='#4C72B0')
    ax2.scatter([k], [ratio_list[i]], color='#4C72B0', zorder=5)
    ax2.set_ylabel('compression ratio (x)', color='#4C72B0')
    plt.tight_layout()
    plt.show()

    print(f"rank k = {k}")
    print(f"compressed parameters: {compressed_list[i]}  (of {original_params} original)")
    print(f"compression ratio:     {ratio_list[i]:.2f}x")
    print(f"relative error:        {error_list[i]:.3f}")
    print(f"reconstruction MAdds:  {madds_list[i]}  "
          f"(multiply-adds to re-expand the factors back to the full array)")

# Move the slider from 1 to n_hour. Both ends are worth visiting: rank 1 is
# the cheapest possible model, and the top end (hour AND weekday both at
# their true dimension) should reconstruct the tensor exactly — a check on
# the implementation, not just on the trade-off.
widgets.interact(tucker_tradeoff,
                  k=widgets.IntSlider(min=1, max=n_hour, step=1, value=4,
                                       description='rank k'));"""),
        md("""## Thank you

> 🇪🇸 Gracias por venir. Pregunta en Discord en español o en inglés — lo que te
> permita preguntar más rápido.

Questions stay welcome in Discord, in Spanish or English. The
[handbook](https://project-delphi.github.io/tensors-workshop/tensors_workshop_plan_with_quizzes.html)
has everything from today, including the facilitator notes."""),
    ],
}
