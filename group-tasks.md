---
title: "Group tasks and discussion questions"
lang: en
---

Short, open-ended tasks to use during or after the notebooks.
[Español](es/group-tasks.md) · [Teach this workshop](teach.qmd)

## How to use these

Work in groups of 3–4. Choose a speaker, a recorder, and someone to challenge
assumptions. A fourth person can run short checks. Rotate roles.
Discuss in English or Spanish.

Pick a few tasks. Replace an existing discussion slot or use them after the
session; these are not extra requirements for every notebook.

For a 6-minute task: think alone for 1 minute, discuss for 4, then share for 1.
For an 8-minute task, give the discussion 6 minutes. Run setup before starting
the timer. Reuse notebook outputs; a sketch or pseudocode is enough.

Every group shares: **our choice → our evidence → what could change our mind**.
Different choices are welcome. Make the assumptions clear.
Post these three lines in Discord. Invite one group to explain its choice.

Quick picks: [axis meaning](#axis-meaning), [silent bugs](#silent-bugs), and
[compression](#compression).

## 00 · Would you trust this dataset?

**When:** After the data checks in [Notebook 00](notebooks/00-setup-and-data.ipynb).
**Time:** 6 minutes.

Choose one loaded dataset. Your team must decide whether it is ready for a
specific analysis. Agree on that analysis first.

- What does one observation represent?
- Which defect would matter most for your analysis? Which might not matter?
- What would you check beyond whether the file loaded and its shape looks right?

**Share:** A three-check acceptance list. Point to one notebook result and name
one question the notebook cannot answer.

## 01 · Design a tensor someone else can read

**When:** After “read shapes as sentences” in
[Notebook 01](notebooks/01-what-a-tensor-is.ipynb).
**Time:** 6 minutes.

Design a tensor for repeated photographs of the same plants. You decide how
many plants, visits, and image channels to keep.

- Which axes do you need? What does each index mean?
- What would a slice or fiber tell a researcher?
- Which detail could someone misread if you gave them only the shape?

**Share:** A labeled shape, one useful selection, and a sentence explaining its
result. Ask another group to interpret it without extra help.

<a id="axis-meaning"></a>

## 02 · Same shape, different rules

**When:** After the shuffle comparison in
[Notebook 02](notebooks/02-thinking-in-n-dimensions.ipynb).
**Time:** 6 minutes.

Two arrays have shape `(20, 8, 8)`. One contains independent digit images.
The other contains consecutive video frames. Propose an operation that is
reasonable for one task but misleading for the other.

- What happens if you shuffle or average the first axis?
- What question would make averaging useful? What question would it destroy?
- What metadata must travel with the array?

**Share:** Two interpretations of the same operation. Include a condition under
which your recommendation would change.

## 03 · What should “normal” mean?

**When:** After the standardization exercise in
[Notebook 03](notebooks/03-indexing-and-broadcasting.ipynb).
**Time:** 8 minutes.

Your team wants to compare handwritten digits. Decide whether to standardize
each image separately or each pixel position across images.

- What variation does each choice remove? What does it keep?
- When might overall brightness be useful information?
- How will you handle a pixel with zero variance?

**Share:** Your rule, the axes used to compute its statistics, and one example
where it would be a poor choice. Use a notebook plot or a small sketch.

<a id="silent-bugs"></a>

## 04 · A test that catches the bug

**When:** After “code that runs and is still wrong” in
[Notebook 04](notebooks/04-reshape-and-transpose.ipynb).
**Time:** 6 minutes.

A teammate converts NHWC images to NCHW using `reshape`. The output has the
requested shape. Design a review that can tell whether pixel meaning survived.

- What could a shape check miss?
- Which pixel or channel would you track through the conversion?
- What test would still work when two axes have the same size?

**Share:** One test in code or pseudocode and one visual check. Explain what
each catches. Try them on the notebook's correct and incorrect conversions.

## 05 · Keep the event, fit the budget

**When:** During “pad or sample?” in
[Notebook 05](notebooks/05-video-pipeline-design.ipynb). Use this as an alternative
to its group discussion.
**Time:** 8 minutes.

Design a batch pipeline for clips of different lengths. Your task is to detect
a brief event. Each clip gets at most 16 stored frames.

- Would you sample, crop, pad, or combine them? Explain the trade-off.
- What happens when the event falls between selected frames?
- How would a model distinguish padding from a measured dark frame?

**Share:** An input-to-batch sketch with axis labels and a mask if needed.
Name one failure case and one way to test for it.

## 06 · What counts as a similar digit?

**When:** After the retrieval explorer in
[Notebook 06](notebooks/06-contraction-with-einsum.ipynb).
**Time:** 6 minutes.

Choose a query digit. Decide whether raw dot product or cosine similarity gives
the more useful neighbors for a goal your group defines.

- Does “similar” mean the same label, stroke pattern, or amount of ink?
- Where do the two rankings disagree? What might explain that?
- How would you evaluate the choice beyond this one query?

**Share:** Your goal, two retrieved examples, and a proposed evaluation.
Explain what the summed index in `id,jd->ij` represents.

## 07 · Same predictions, different coefficients

**When:** After the singular-system exercise in
[Notebook 07](notebooks/07-inverses-and-pseudoinverse.ipynb).
**Time:** 8 minutes.

A teammate duplicates a feature column. Two fitted coefficient vectors now
give the same predictions. Decide what your team can responsibly conclude.

- Would a small residual settle which coefficients to trust?
- What does the pseudoinverse choose when several solutions fit equally well?
- What extra information would help you interpret individual coefficients?

**Share:** A short message to the teammate: what the fit supports, what it does
not establish, and what you would check next.

## 08 · One good prediction is not enough

**When:** After recursive forecasting in
[Notebook 08](notebooks/08-recursion-with-matrices.ipynb).
**Time:** 6 minutes.

A forecast looks good one month ahead. Your team wants to reuse it recursively
for a year. Design a test before approving that change.

- What changes when the model starts consuming its own predictions?
- How could a small error grow or shrink through repeated updates?
- Which forecast horizon and baseline would you report?

**Share:** An evaluation plan and a stopping rule. Use the airline forecast or
state-update explorer to support one concern.

## 09 · Defend a factorization

**When:** After the method chooser in
[Notebook 09](notebooks/09-matrix-factorizations.ipynb).
**Time:** 8 minutes.

Choose one brief: fit a tall data matrix once; solve the same square system
many times; or compress an image under a storage budget. Recommend a method
and compare it with one plausible alternative.

- Which matrix property must you check first?
- What matters most: stability, runtime, storage, or readable factors?
- What new fact would make you switch methods?

**Share:** A recommendation with one condition and one measurement. Another
group supplies the new fact; revise your answer if needed.

<a id="compression"></a>

## 10 · What must compression preserve?

**When:** After the rank explorer in
[Notebook 10](notebooks/10-tucker-decomposition.ipynb).
**Time:** 8 minutes.

The taxi tensor supports two users: one studies the overall daily pattern;
the other studies a particular pickup–dropoff route at its busiest hour.
Propose a compression choice for each.

- Would the same Tucker mode ranks suit both users?
- Could a small global error hide a large error in the route they care about?
- Which plot or local error would you inspect before accepting the result?

**Share:** Two rank proposals, or one shared proposal with a defense. Use a
notebook result and specify one additional check.

## 11 · Is this comparison fair?

**When:** After the matched-budget comparison in
[Notebook 11](notebooks/11-tensor-factorizations.ipynb).
**Time:** 8 minutes.

A report declares CP better than Tucker because CP had lower error at
“rank 3.” Design a comparison that could support a useful recommendation.

- What does rank 3 mean for each model? What was actually stored?
- Which budget should be matched: parameters, bytes, or runtime?
- Besides reconstruction error, what outcome matters for the intended task?

**Share:** A three-measure benchmark plan. Name what you will hold fixed and
one uncertainty that would remain after running it.

## 12 · Bring a problem from your field

**When:** During the final discussion in
[Notebook 12](notebooks/12-wrap-up-and-take-homes.ipynb).
**Time:** 5 minutes: 1 to think, 3 to discuss, 1 to share.

Choose a real problem one group member cares about. Sketch how tensors could
help. You do not need the data today.

- What would each axis mean? What would one observation be?
- Which workshop operation would help answer your question?
- What would count as success? What assumption might fail?

**Share:** A labeled shape, a proposed operation, and the first experiment you
would run. Each learner adds one thing they still need to understand.

## 13 · Would you trust the sharper image?

**When:** After deconvolution in
[Notebook 13](notebooks/13-convolution-and-deconvolution.ipynb). Follow-up only.
**Time:** 8 minutes.

Two restorations of the notebook image disagree. One looks sharper; the other
has lower error against the known original. Decide how you would judge them.

- What kinds of artifact might look like recovered detail?
- How do noise, the assumed blur kernel, and image borders affect the comparison?
- What could you check on a new image with no clean original?

**Share:** An acceptance checklist. Separate checks that need a clean reference
from checks available without one. State what neither can prove.

## Facilitator prompts

Use one follow-up when a discussion stalls:

- “What are you assuming?”
- “Show us a case where that choice fails.”
- “Which output supports that claim?”
- “What would make both groups right?”
- “What is the smallest experiment that could settle the disagreement?”

Listen for axis meaning, evidence, and trade-offs. Several designs may work;
check mathematical claims separately. Close with one useful distinction and
one open question. Save longer investigations for later.
