# Tensors for Machine Learning

Materials for a 3-hour workshop (195 minutes including three Kahoot knowledge checks) introducing tensors for machine learning. Assumes familiarity with matrices — *Deep Learning* (Goodfellow, Bengio & Courville), Chapter 2 — and **no** prior tensor theory.

## Contents

| Path | What it is |
|---|---|
| [`tensors_workshop_plan_with_quizzes.md`](tensors_workshop_plan_with_quizzes.md) | Full student handbook and facilitator plan: theory, six exercise blocks, group exercise, appendices |
| [`kahoot/`](kahoot) | Three 6-question Kahoot quizzes, ready to import as `.xlsx` |

## What it covers

- Tensor vocabulary, shape, and axes in NumPy
- Indexing, broadcasting, reshape, and transpose on real images
- Contraction with `einsum`
- Inverses, the pseudoinverse, and least squares
- Recursion with matrices and vectors
- Convolution and deconvolution
- Tucker decomposition (with CP compared in an appendix)

## Data

All data used is real — no synthetic random arrays. Most of it ships inside scikit-learn and scikit-image (`load_breast_cancer`, `load_digits`, `data.camera()`, `data.astronaut()`); California Housing, NYC Taxi Trips, and the Airline Passengers series are downloaded once at the start.

## How the workshop runs

Notebooks on GitHub, run in Colab, discussion in Discord. Exercise blocks are 10 minutes coding then 5 minutes explanation; group blocks are 10 minutes discussion then share-back.

Taught in English; questions welcome in Spanish or English.
