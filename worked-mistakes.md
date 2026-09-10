---
title: "Four mistakes worth testing"
lang: en
---

[Español](es/worked-mistakes.md) · [Facilitator guide](facilitator-guide.md) · [Teach this workshop](teach.qmd)

Predict first. Run the tiny counterexample. Rewrite the claim in one sentence.
These synthetic examples isolate a mistake; the notebooks use real data.

## 02 · The mean proves the order is unchanged

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

## 04 · The shape proves reshape worked

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

## 09 · A tiny residual proves reliable coefficients

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

## 11 · Equal ranks mean equal budgets

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
