---
title: "Sixteen mistakes worth testing"
lang: en
---

[Español](es/worked-mistakes.md) · [Facilitator guide](facilitator-guide.md) · [Teach this workshop](teach.qmd)

Predict first. Run the tiny counterexample. Rewrite the claim in one sentence.
These synthetic examples isolate a mistake; the notebooks use real data.

One per notebook, numbered to match. Each is the counterexample that notebook's
predict-first cell runs, lifted out of the widget so it can be read, run and
argued with on its own.

## 00 · A correct shape proves the data is complete

<span data-language-key="00-a-correct-shape-proves-the-data-is-complete"></span>

“The table is `(20640, 10)`, exactly as promised, so it loaded cleanly.”

<details>
<summary>Test and correction</summary>

```python
import numpy as np
table = np.zeros((20640, 10))
table[:207, 4] = np.nan
assert table.shape == (20640, 10)
assert np.isnan(table).sum() == 207
assert not np.isfinite(table).all()
```

The shape check passes and 207 values are still missing — the same 207 rows
whose `total_bedrooms` California housing never recorded. A shape counts
positions; it never looks inside them. Read `isnan().sum()` beside `.shape`.
Transfer: name a column in this workshop's data where a shape check passes and
a range check fails.

</details>

## 01 · The shape tells you the rank

<span data-language-key="01-the-shape-tells-you-the-rank"></span>

“Both matrices are `(3, 3)`, so both have rank 3.”

<details>
<summary>Test and correction</summary>

```python
import numpy as np
full = np.array([[1., 0., 0.], [0., 1., 0.], [0., 0., 1.]])
flat = np.array([[1., 2., 3.], [2., 4., 6.], [3., 6., 9.]])
assert full.shape == flat.shape == (3, 3)
assert full.ndim == flat.ndim == 2
assert np.linalg.matrix_rank(full) == 3
assert np.linalg.matrix_rank(flat) == 1
```

Same shape, same order, ranks 3 and 1. Every row of `flat` is a multiple of the
first. Order is the number of axes and the shape gives it away; rank counts
independent directions and has to be computed.
Transfer: what is the largest rank a `(3, 7)` matrix can have, and why?

</details>

## 02 · The mean proves the order is unchanged

<span data-language-key="02-the-mean-proves-the-order-is-unchanged"></span>

“The average is identical after shuffling, so no information was lost.”

<details>
<summary>Test and correction</summary>

```python
import numpy as np
frames = np.array([0., 1., 2., 3.])
shuffled = frames[[0, 3, 1, 2]]
assert frames.mean() == shuffled.mean()
assert not np.array_equal(np.diff(frames), np.diff(shuffled))
```

Both means are 1.5. The changes are `[1, 1, 1]` versus `[3, -2, 1]`.
The mean cannot establish chronology. Check timestamps or source indices.
Transfer: when is shuffling acceptable for independent images and their labels?

</details>

## 03 · A NaN means the code is broken

<span data-language-key="03-a-nan-means-the-code-is-broken"></span>

“Standardizing produced NaNs, so there is a bug in the formula.”

<details>
<summary>Test and correction</summary>

```python
import numpy as np
D = np.array([[0., 1., 5.], [0., 3., 9.], [0., 2., 7.]])
std = D.std(axis=0)
assert std[0] == 0.0
with np.errstate(invalid="ignore", divide="ignore"):
    Z = (D - D.mean(axis=0)) / std
assert np.isnan(Z[:, 0]).all()
assert np.isfinite(Z[:, 1:]).all()
```

Column 0 never varies, so the formula divided by zero; every other column is
finite. The code is correct and it reported a property of the data. A
zero-variance feature is a finding, not a bug — drop it or keep it, but say
which.
Transfer: three pixels of `load_digits()` are constant across all 1,797 images.
What does a per-pixel z-score do to them?

</details>

## 04 · The shape proves reshape worked

<span data-language-key="04-the-shape-proves-reshape-worked"></span>

“Both results have shape `(3, 2, 2)`, so both are valid CHW images.”

<details>
<summary>Test and correction</summary>

```python
import numpy as np
hwc = np.arange(12).reshape(2, 2, 3)
right = hwc.transpose(2, 0, 1)
wrong = hwc.reshape(3, 2, 2)
assert right.shape == wrong.shape
assert right[1, 0, 0] == hwc[0, 0, 1] == 1
assert wrong[1, 0, 0] == 4
assert np.array_equal(right.transpose(1, 2, 0), hwc)
```

Shape checks pass; a channel-value check fails. Use transpose to reorder axes.
Transfer: write the matching coordinate check for NHWC → NCHW.

</details>

## 05 · The array's second frame is the video's second frame

<span data-language-key="05-the-array-s-second-frame-is-the-video-s-second-frame"></span>

“`clip` holds the video, so `clip[1]` is the second thing that happened.”

<details>
<summary>Test and correction</summary>

```python
import numpy as np
kept = np.arange(0, 720, 45)
assert kept.shape == (16,)
assert kept[0] == 0
assert kept[1] == 45
assert round(100 * len(kept) / 720, 1) == 2.2
```

`clip` keeps every 45th frame of 720, so entry 1 is source frame 45 and 97.8% of
the recorded moments are not in the tensor at all. An index into a sampled axis
is a position in the array, not a moment in time.
Transfer: what would you have to store beside `clip` to answer “when was
`clip[1]`?” in seconds?

</details>

## 06 · Repeating an index sums the whole matrix

<span data-language-key="06-repeating-an-index-sums-the-whole-matrix"></span>

“`np.einsum('ii->', A)` has no axis left over, so it must be the total.”

<details>
<summary>Test and correction</summary>

```python
import numpy as np
A = np.array([[5., 2.], [7., 3.]])
assert np.einsum("ii->", A) == 8.0
assert A.sum() == 17.0
assert np.einsum("ii->", A) != A.sum()
assert np.einsum("ij->", A) == A.sum()
```

8.0 against 17.0. Repeating the letter selects the positions where both indices
agree — the diagonal — and only then sums. Two different letters, `ij->`, is the
sum of everything. Which letters repeat decides what enters the sum, before any
of it is added up.
Transfer: what does `np.einsum('ij->i', A)` return, and why is that a row sum?

</details>

## 07 · An answer from pinv proves the matrix was invertible

<span data-language-key="07-an-answer-from-pinv-proves-the-matrix-was-invertible"></span>

“`pinv` returned without complaining, so the matrix was fine.”

<details>
<summary>Test and correction</summary>

```python
import numpy as np
A = np.array([[1., 2., 3.], [4., 5., 6.], [7., 8., 10.]])
A[:, 2] = A[:, 1]
P = np.linalg.pinv(A)
assert np.linalg.matrix_rank(A) == 2
assert np.allclose(A @ P @ A, A)
assert np.allclose(P @ A @ P, P)
assert not np.allclose(P @ A, np.eye(3))
```

`pinv` is defined for every matrix, so it returns quietly on a rank-2 matrix in
a 3×3 box. The Moore–Penrose identities hold and `P @ A` is still not the
identity: the duplicated column cost a direction, and no exception was ever
going to say so. Check the rank.
Transfer: `np.linalg.inv` does not raise here either — it returns finite,
enormous numbers, and `A @ inv(A)` is not the identity. What would you check
before trusting either result?

</details>

## 08 · A small one-step error stays small

<span data-language-key="08-a-small-one-step-error-stays-small"></span>

“The one-step error is 1%, so the twelve-step forecast is about 1% off.”

<details>
<summary>Test and correction</summary>

```python
w, err = 1.1, 0.01
grown = err * w ** 12
shrunk = err * 0.9 ** 12
assert round(grown, 4) == 0.0314
assert grown > 3 * err
assert shrunk < err
```

At `w = 1.1` the 1% error is over 3% after twelve steps; at `w = 0.9` it dies
away. A recursive forecast eats its own output, so the update rule is applied to
the error as well. The horizon error depends on the coefficients, not on the
one-step error alone.
Transfer: at which `w` does the twelve-step error neither grow nor shrink?

</details>

## 09 · A tiny residual proves reliable coefficients

<span data-language-key="09-a-tiny-residual-proves-reliable-coefficients"></span>

“Both fits are almost exact, so their coefficients must agree.”

<details>
<summary>Test and correction</summary>

```python
import numpy as np
X = np.array([[1., 1.], [1., 1.000001]])
a, b = np.array([1., 1.]), np.array([2., 0.])
y = X @ a
assert np.linalg.norm(X @ a - y) == 0
assert np.isclose(np.linalg.norm(X @ b - y), 1e-6)
assert np.isclose(np.linalg.norm(a - b), np.sqrt(2))
```

The coefficients differ by about 1.414, while predictions differ by only
0.000001. Nearly dependent columns make this possible. Inspect conditioning
and coefficient sensitivity as well as fit. QR avoids forming `X.T @ X`;
it does not remove the problem's sensitivity.
Transfer: what happens if a small measurement error changes `y`?

</details>

## 10 · Hour rank 3 means only three hours survive

<span data-language-key="10-hour-rank-3-means-only-three-hours-survive"></span>

“Tucker with hour rank 3 keeps three of the 24 hours and discards the rest.”

<details>
<summary>Test and correction</summary>

```python
import numpy as np
rng = np.random.default_rng(0)
T = rng.random((24, 40))
U, s, Vt = np.linalg.svd(T, full_matrices=False)
U3 = U[:, :3]
assert U3.shape == (24, 3)
recon = U3 @ np.diag(s[:3]) @ Vt[:3]
assert recon.shape == (24, 40)
assert len(np.unique(recon.round(6), axis=0)) == 24
```

The hour basis has one row per real hour and one column per learned direction:
`U3` is `(24, 3)`, and all 24 reconstructed hour profiles are still distinct.
Rank 3 buys three directions to describe variation across all 24 hours. Rank is
a budget, not a subset.
Transfer: what would it actually take to drop an hour from the tensor?

</details>

## 11 · Equal ranks mean equal budgets

<span data-language-key="11-equal-ranks-mean-equal-budgets"></span>

“CP rank 3 and Tucker ranks `(3, 3, 3)` use the same storage.”

<details>
<summary>Test and correction</summary>

```python
shape = (4, 4, 24)
cp = 3 * sum(shape)
tucker = 3**3 + 3 * sum(shape)
assert (cp, tucker) == (96, 123)
```

Tucker also stores a core: 27 more values here. This CP convention absorbs
component weights into one factor; count 3 extra values if weights are stored
separately. Match stored parameters, then report error on the same data.
Transfer: if budgets cannot match exactly, how should you disclose the gap?

</details>

## 12 · All the attention weights sum to 1

<span data-language-key="12-all-the-attention-weights-sum-to-1"></span>

“Softmax normalizes, so the whole weight matrix adds up to 1.”

<details>
<summary>Test and correction</summary>

```python
import numpy as np
scores = np.array([[2., 1., 0.], [0., 2., 1.]])
rowwise = np.exp(scores) / np.exp(scores).sum(axis=-1, keepdims=True)
whole = np.exp(scores) / np.exp(scores).sum()
assert np.allclose(rowwise.sum(axis=-1), 1.0)
assert np.isclose(rowwise.sum(), 2.0)
assert np.isclose(whole.sum(), 1.0)
assert not np.allclose(rowwise, whole)
```

Each row sums to 1 and the matrix sums to 2 — one per query. Softmax runs along
the last axis, so every row is its own distribution over the keys. Normalizing
the whole matrix also totals 1 and is a different thing entirely, which is why
the grand total is a bad check.
Transfer: for a `(batch, heads, queries, keys)` score tensor, which axis does
softmax take?

</details>

## 13 · Convolution and correlation are the same thing

<span data-language-key="13-convolution-and-correlation-are-the-same-thing"></span>

“Sliding a kernel and multiplying is convolution, whichever way you write it.”

<details>
<summary>Test and correction</summary>

```python
import numpy as np
x = np.array([1., 2., 3., 4., 5.])
k = np.array([1., 2., 3.])
corr = np.array([(x[i:i + 3] * k).sum() for i in range(3)])
conv = np.convolve(x, k, mode="valid")
assert not np.allclose(corr, conv)
assert np.allclose(corr, np.convolve(x, k[::-1], mode="valid"))
```

Convolution flips the kernel before sliding it, so the two disagree on an
asymmetric one. Flip it yourself and correlation reproduces convolution
exactly. For a symmetric kernel the distinction vanishes, which is why it goes
unnoticed — and why deep-learning “convolution” layers are correlation.
Transfer: if a trained layer's kernels were flipped, what would change?

</details>

## 14 · Rescaling a factor vector rescales the component

<span data-language-key="14-rescaling-a-factor-vector-rescales-the-component"></span>

“Neuron 12 has the biggest weight in this factor, so it drives the component.”

<details>
<summary>Test and correction</summary>

```python
import numpy as np
a = np.array([1., 2.])
b = np.array([3., 4.])
c = np.array([5.])
t1 = np.einsum("i,j,k->ijk", a, b, c)
t2 = np.einsum("i,j,k->ijk", 2 * a, b / 2, c)
assert np.allclose(t1, t2)
assert not np.allclose(2 * a, a)
lam = np.linalg.norm(a) * np.linalg.norm(b) * np.linalg.norm(c)
unit = np.einsum("i,j,k->ijk", a / np.linalg.norm(a), b / np.linalg.norm(b),
                 c / np.linalg.norm(c))
assert np.allclose(t1, lam * unit)
```

Double one vector and halve another and the rank-1 tensor does not move, so a
factor vector's magnitude is arithmetic, not data. Only two things are
readable: the unit-norm profile — the shape of the peaks and troughs — and one
weight holding all the size, which is what `tensorly` returns as `weights`.
Normalise before you compare two components, or before you name a peak.
Transfer: two runs return components in a different order. What must you match
on before comparing them?

</details>

## 15 · An error of 2 is an error of 2

<span data-language-key="15-an-error-of-2-is-an-error-of-2"></span>

“The model missed by 2, so it made the same size of mistake either way.”

<details>
<summary>Test and correction</summary>

```python
import numpy as np
def squared(x, m):
    return (x - m) ** 2
def deviance(x, m):
    return 2 * (m - x + x * np.log(x / m))
assert squared(2., 4.) == squared(2000., 2002.)
assert round(deviance(2., 4.), 3) == 1.227
assert round(deviance(2000., 2002.), 3) == 0.002
assert deviance(2., 4.) > 600 * deviance(2000., 2002.)
```

Squared error charges both misses 4, because it assumes the noise has the same
spread everywhere. A count's spread grows with its mean — a Poisson count's
variance *is* its mean — so missing by 2 on a cell that averages 2 is being
wrong about the order of magnitude, and missing by 2 on a cell holding 2000 is
rounding. The Poisson deviance charges the first about 600 times more. Choosing
the loss is choosing what kind of number you think you have.
Transfer: your tensor is 41% zeros. Which loss lets the model predict a
negative count, and why does the other one not need a constraint to stop it?

</details>
