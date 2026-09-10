---
title: "Entry and exit checks"
lang: en
---

[Español](es/assessments.md) · [Facilitator guide](facilitator-guide.md) · [Teach this workshop](teach.qmd)

Answer alone. Short sentences are enough. No code needed.
The learner prompts are also in Notebooks 00 and 12.

## Entry · 3 minutes

`X.shape == (20, 8, 8)`.

1. Give two possible meanings for its axes.
2. Predict `X[:, 3, 4].shape`. Name the remaining axis in each interpretation.
3. What evidence would distinguish independent images from video frames?

## Exit · 5 minutes

`X.shape == (6, 4, 3, 8, 8)`: plants, visits, channels, rows, columns.

1. Predict `X[:, -1, 1].shape`. Name its axes.
2. Predict `X.mean(axis=1).shape`. Name its axes.
3. What could averaging visits hide? Give one test for that loss.
4. Compare with your entry answer. Name one corrected idea and one open question.

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

Score each dimension **0** (missing/wrong), **1** (partly right), or **2** (correct
and explained). Score entry and exit separately, out of 6:

| Dimension | Entry evidence | Exit evidence |
|---|---|---|
| Axis meaning | Both interpretations, all axes named | Remaining axes named in both results |
| Shape reasoning | Correct selection shape and why | Both output shapes and why |
| Evidence | Metadata that establishes batch versus time | A specific loss and a test that can detect it |

If axis or shape reasoning scores 0–1, revisit the slice in Notebook 01.
If evidence scores 0–1, use group task 02. If all three score 2, assign a
take-home chosen by interest. Reflection is unscored.
Do not treat score differences as a causal measure of workshop impact.

</details>
