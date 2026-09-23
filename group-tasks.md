---
title: "Group tasks and discussion questions"
lang: en
---

Short, open-ended tasks to use during or after the notebooks.
[Español](es/group-tasks.md) · [Teach this workshop](teach.qmd)

## How to use these

<span data-language-key="how-to-use-these"></span>

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

Three tasks are games with a score: the bug hunt in 04, and compression golf
in 10 and 11. There, the share line carries the score, and the facilitator
keeps the leaderboard on the whiteboard or in the chat.

Quick picks: [axis meaning](#axis-meaning), [silent bugs](#silent-bugs), and
[compression](#compression).

## 00 · Would you trust this dataset?

<span data-language-key="00-would-you-trust-this-dataset"></span>

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

<span data-language-key="01-design-a-tensor-someone-else-can-read"></span>

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

<span data-language-key="02-same-shape-different-rules"></span>

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

<span data-language-key="03-what-should-normal-mean"></span>

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

## 04 · Bug hunt: which line scrambled the astronaut?

<span data-language-key="04-a-test-that-catches-the-bug"></span>

**When:** After Exercise 1 in
[Notebook 04](notebooks/04-reshape-and-transpose.ipynb), at the bug-hunt cell.
**Time:** 6 minutes: 2 to match, 3 to write a test, 1 to share.

Four lines each turn the astronaut from HWC into CHW. All four give shape
`(3, 512, 512)`, and none of them raises an error. The notebook draws the four
results side by side, A to D. Only one of them is right.

- Round 1: match each picture to its line. One is noise, one is blue, one lies
  on her side.
- Round 2: rewrite `looks_right(chw)` until `score_test` reports 3 of 3 bugs
  caught and no false alarm. It starts as a shape check, which catches none.
- Which bug gets past a test that looks at a whole channel at once, and why?

**Share:** Our matches → our test and its score → the bug a weaker test let
through.

## 05 · Keep the event, fit the budget

<span data-language-key="05-keep-the-event-fit-the-budget"></span>

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

<span data-language-key="06-what-counts-as-a-similar-digit"></span>

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

<span data-language-key="07-same-predictions-different-coefficients"></span>

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

<span data-language-key="08-one-good-prediction-is-not-enough"></span>

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

<span data-language-key="09-defend-a-factorization"></span>

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

## 10 · Compression golf, hole 1

<span data-language-key="10-what-must-compression-preserve"></span>

**When:** In the rank explorer in
[Notebook 10](notebooks/10-tucker-decomposition.ipynb).
**Time:** 8 minutes.

Store the taxi tensor in as few numbers as you can while the relative error
stays under 7%. The explorer starts at ranks (2, 2, 3): 102 numbers in place of
480, at 6.7%. It prints your score under the heatmaps. Fewest numbers wins.

- Which of the three ranks can you cut furthest before the error crosses 7%?
- Your entry scores the whole tensor. Could it still badly miss one route at
  its busiest hour? Check it in the explorer's error heatmap.
- What would a user who only cares about that route choose instead?

**Share:** Our entry (ranks · numbers · error) → the rank we cut furthest and
why it held → the user who would reject our entry.

## 11 · Compression golf, hole 2

<span data-language-key="11-is-this-comparison-fair"></span>

**When:** After Exercise 1 in
[Notebook 11](notebooks/11-tensor-factorizations.ipynb), at the golf cell.
**Time:** 8 minutes: 5 to play, 3 for the leaderboard.

Hole 1 was Tucker alone under 7%, and the best entry stored 60 numbers. Now
CP is in the bag too, and the bar is 2%. `golf("cp", 4)` or
`golf("tucker", (4, 4, 3))` fits one model and prints its scorecard line.
Fewest numbers under 2% wins.

- Which model did you try first, and why?
- Exercise 1 fixed the budget and compared errors. This hole fixes the error
  and compares budgets. Does the same model win?
- A report calls CP better than Tucker at “rank 3”. What did it hold fixed?

**Share:** Our entry → the other model's best entry → the bar at which the
other model would win.

## 12 · Bring a problem from your field

<span data-language-key="12-bring-a-problem-from-your-field"></span>

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

<span data-language-key="13-would-you-trust-the-sharper-image"></span>

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

## 14 · Which peak would you publish?

<span data-language-key="14-which-peak-would-you-publish"></span>

**When:** After the trial factor in
[Notebook 14](notebooks/14-cp-factorization.ipynb). Follow-up only.
**Time:** 8 minutes.

A rank-3 non-negative CP fit hands you three components, each a neuron profile,
a time course and a trial weighting. One is flat across all four reach targets;
two are tuned. Decide what you would claim in a figure caption.

- What does a peak in the time profile license you to say, and what does it not?
- Two components have different weights. What, exactly, is being compared?
- A colleague reruns the fit with a new seed and gets the components in a
  different order. What breaks, and what does not?

**Share:** One caption you would publish and one you would refuse, with the
reason. Name the check that separates them.

## 15 · Is it the city or the form?

<span data-language-key="15-is-it-the-city-or-the-form"></span>

**When:** After the midnight-and-noon component in
[Notebook 15](notebooks/15-generalized-cp.ipynb). Follow-up only.
**Time:** 10 minutes.

A GCP-Poisson fit spends a third of its rank-3 budget on a component that
spikes at exactly 00:00 and 12:00. Decide what to do about it.

- What would have to be true of the *recording process* for a component to
  look like this? Name a second dataset where the same thing could happen.
- Dropping those reports, masking those cells, and leaving them in are three
  different decisions. Who does each one hurt?
- Would a Gaussian fit of the same tensor have shown you this? Why or why not?

**Share:** Your decision and the sentence you would put in the methods section
to disclose it. Say what a reader would need in order to disagree with you.

## 16 · Which shadow belongs on the map?

<span data-language-key="16-which-shadow-belongs-on-the-map"></span>

**When:** After the comparison tables in
[Notebook 16](notebooks/16-pca-from-tensors.ipynb). Follow-up only.
**Time:** 10 minutes.

Your land-cover classifier has a twelve-score budget. Compare dense PCA and
multilinear PCA. Decide which representation to carry into a new-scene study.

- Which table supports classification, and which supports clustering?
- What does the tensor representation save, and what does it restrict?
- How could overlapping patches make the evaluation look optimistic?

**Share:** A recommendation with one measured result, the score shape, and a
plan for holding out a new scene. Explain what the cave's shadow cannot prove.

## 17 · Does the right shape contain the right tokens?

<span data-language-key="17-head-identity"></span>

**When:** After the tests in [Notebook 17](notebooks/17-multi-head-attention.ipynb). Follow-up only.
**Time:** 8 minutes.

Compare direct reshape with reshape followed by transpose. Trace one token's
features through each and explain why a shape-only test misses the error.

**Share:** One mismatched value, its four indices and the corrected permutation.

## 18 · What did the energy threshold preserve?

<span data-language-key="18-energy-and-storage"></span>

**When:** After the rank gallery in [Notebook 18](notebooks/18-feature-compression.ipynb). Follow-up only.
**Time:** 8 minutes.

Choose a rank using the image, energy curve and factor storage ratio. Explain
why the smallest rank reaching 95% energy might still erase an important detail.

**Share:** Your chosen rank, retained energy, factor count and one limitation.

## Facilitator prompts

<span data-language-key="facilitator-prompts"></span>

Use one follow-up when a discussion stalls:

- “What are you assuming?”
- “Show us a case where that choice fails.”
- “Which output supports that claim?”
- “What would make both groups right?”
- “What is the smallest experiment that could settle the disagreement?”

Listen for axis meaning, evidence, and trade-offs. Several designs may work;
check mathematical claims separately. Close with one useful distinction and
one open question. Save longer investigations for later.
