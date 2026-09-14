---
title: "Entry and exit checks"
lang: en
---

[Español](es/assessments.md) · [Facilitator guide](facilitator-guide.md) · [Teach this workshop](teach.qmd)

Answer alone. Short sentences are enough. No code needed.
The learner prompts are also in Notebooks 00 and 12.

## Entry · 3 minutes

<span data-language-key="entry-3-minutes"></span>

`X.shape == (20, 8, 8)`.

1. Give two possible meanings for its axes.
2. Predict `X[:, 3, 4].shape`. Name the remaining axis in each interpretation.
3. What evidence would distinguish independent images from video frames?

## Exit · 5 minutes

<span data-language-key="exit-5-minutes"></span>

`X.shape == (6, 4, 3, 8, 8)`: plants, visits, channels, rows, columns.

Spend about three minutes on 1–3 and two minutes on 4.

1. Predict `X[:, -1, 1].shape`. Name its axes.
2. Predict `X.mean(axis=1).shape`. Name its axes.
3. What could averaging visits hide? Give one test for that loss.
4. A Tucker model compresses the visits mode from length 4 to rank 2. After
   reconstruction, does the visits axis have length 2 or 4? Explain why
   restoring the shape does not guarantee that every brief disease signal survives.

<details>
<summary>Facilitator key and rubric · reveal after collection</summary>

Entry: `(images, rows, columns)` or `(time, rows, columns)` both fit. The
selection has shape `(20,)`: one pixel across images or time. Acquisition
records, timestamps and sample IDs establish the meaning; shape alone cannot.

Exit: selection `(6, 8, 8)` means plants, rows, columns: last visit, channel 1.
The mean has shape `(6, 3, 8, 8)`: plants, channels, rows, columns.
Averaging can hide a brief disease signal or growth trend. Compare the visit
sequence with its average, using a known transient or a downstream detection test.
Other concrete, defensible tests are valid.

Transfer (question 4): the reconstructed visits axis has length **4**. The
visits factor has shape `(4, 2)` and expands the core's length-2 mode back to
four visits. Compression can discard variation outside the retained subspace,
including a brief disease signal. Restoring shape does not restore every value.

Score each dimension **0** (missing/wrong), **1** (partly right), or **2** (correct
and explained). Score the three dimensions below separately for entry and exit,
each out of 6. Record question 4 as a separate transfer score out of 2; it has
no entry counterpart.

| Dimension | Entry evidence | Exit evidence |
|---|---|---|
| Axis meaning | Both interpretations, all axes named | Remaining axes named in both results |
| Shape reasoning | Correct selection shape and why | Both output shapes and why |
| Evidence | Metadata that establishes batch versus time | A specific loss and a test that can detect it |

If axis or shape reasoning scores 0–1, revisit the slice in Notebook 01.
If evidence scores 0–1, use group task 02.

For transfer, award **0** for a wrong/missing axis length, **1** for length 4
with an incomplete explanation, and **2** for length 4 with both the factor's
expansion and possible loss of signal explained. For a score of 0–1, revisit
core and factor shapes in Notebook 10. If all four dimensions score 2, assign
a take-home chosen by interest.
Do not treat score differences as a causal measure of workshop impact.

</details>

## Checkpoints during the lesson

<a id="in-section-checkpoints"></a>

<span data-language-key="in-section-checkpoints"></span>

Use the final minute of the core activities in Notebooks 03 and 06 for these
individual, closed-solution checks. They replace part of the activity's
explain/check time; they do not add questions or time to the five-minute exit.
Collect the first attempt before discussion or revealing the key.

| Notebook | Independent prompt |
|---|---|
| 03 · Broadcasting | `X.shape == (3, 2)` and per-sample offsets `b.shape == (3,)`. Does `X - b` work? Write the corrected expression and output shape. Explain which axis repeats. |
| 06 · Contraction | `S.shape == (2, 3, 4)` means batch, time, feature; `w.shape == (4,)`. Write an `einsum` that retains batch and time. Give the shape and contracted index. What changes with `'ntf,f->n'`? |

<details>
<summary>Checkpoint key and next teaching step · reveal after collection</summary>

| Check | Evidence for 2 points | If incomplete, revisit |
|---|---|---|
| Broadcasting | `X - b` fails: trailing lengths 2 and 3 conflict. `X - b[:, None]` has shape `(3, 2)`; one offset per sample repeats across feature columns. | Align `(3, 2)` and `(3, 1)` on paper, label sample and feature, then retry with different dimensions. |
| Contraction | `np.einsum('ntf,f->nt', S, w)` gives `(2, 3)` and sums `f`. `'ntf,f->n'` also sums time `t`, giving `(2,)`. | Cross out indices absent from the output, name the information each reduction removes, then retry a new output signature. |

Record each checkpoint separately: **0** = missing or wrong operation;
**1** = correct operation with an incomplete shape or axis explanation;
**2** = all evidence in the table. Use 0–1 to choose the follow-up, then ask
for another independent attempt. Keep these formative scores separate from
the entry/exit comparison.

</details>
