---
title: "Facilitator run sheet"
lang: en
---

[Español](es/facilitator-guide.md) · [Teach this workshop](teach.qmd)

Use the existing **210-minute agenda**. These activities replace practice or
discussion time; they do not extend the session. Notebook 13 is take-home work.

## Before the session

<span data-language-key="before-the-session"></span>

- Run Notebook 00 before class. Test each selected notebook in a fresh runtime.
- In notebooks 01–11, follow the contiguous core block from top to bottom: recall, example, attempt, feedback, checkpoint. Stop at **Core complete**. **Explore later** follows afterward.
- Prepare groups of 3–4: recorder, speaker, challenger, optional code runner.
- Keep a working runtime ready to demonstrate if a download fails.

**Practise today** and **Explore later** match across notebook headers, slides, and handbook. In Notebook 07, the Moore–Penrose identities and housing fit are extensions; the core example needs only NumPy. In 11, the live comparison uses taxis, CP and Tucker; Tensor Train, t-SVD and the video download are extensions. Selected group discussions are already inside the core block; do not repeat them from another page. Checkpoints replace part of explain/check time within the listed slots.

## Live rhythm

<span data-language-key="live-rhythm"></span>

**Predict → Run → Explain → Check.** Get a written prediction before execution.
Then ask for one result and one revised explanation. Rotate group roles.
Open solutions only after an attempt. Run selected folded plotting cells;
folded code still needs to execute.

Use the opening retrieval question for about 30 seconds within each slot.
Projector moments are predict-first too: ask the room what will happen before
you press anything, and take one answer before the reveal. Each one sits inside
its slot's modelling time, so it replaces talk rather than adding to it.
Learners try first, open Hint 1 if stuck, then Hint 2 only if needed. Where a
feedback helper is supplied, run its definition and call it with the learner's
own results before revealing the solution. Passing its numerical checks still
requires an explanation of the axes and the result.

## Run sheet

<span data-language-key="run-sheet"></span>

Follow the [workshop agenda](tensors_workshop_plan_with_quizzes.md).
Keep its quizzes and breaks. Within the selected notebook slots:

| Notebook | Use the slot this way | On the projector |
|---|---|---|
| 00 · 5 min | Cold open 1½; entry check 3; runtime check and welcome ½. Setup was pre-work. | [A voice, transposed](interactive/voice-stage.html?lang=en#scramble): play it as built, then transposed. Ask why the same numbers now sound like noise; do not answer yet. Sound on. |
| 01 · 20 min | Model one shape 4; Exercise 1 and partner check 16. | — |
| 02 · 20 min | Opening prediction 2; axis key and Exercise 2: 12; [axis-meaning task](group-tasks.md#axis-meaning): 6. | — |
| 03 · 15 min | Model broadcasting 3; Exercise 3 and feedback 11; independent broadcasting checkpoint 1. | [Broadcasting simulator](interactive/broadcasting-simulator.html?lang=en), inside the modelling 3: the room predicts the result shape, then one mismatch that errors. |
| 04 · 15 min | Opening prediction and the projector 2; Exercise 1: 7; [silent-bug task](group-tasks.md#silent-bugs): 6. | [Reshape a photo](interactive/image-tensor.html?lang=en#reshape): the cold open's bug, on an image. Name it as that bug. |
| 05 · 15 min | Opening prediction 2, which is Exercise 1's prediction step; Exercise 1: 5; group task 05: 8. | — |
| 06 · 15 min | Model one contraction 4; Exercise 1 and feedback 10; independent contraction checkpoint 1. | — |
| 07 · 15 min | Model duplicate columns 3; compare coefficients and norms 9; explain what remains unidentified and checkpoint 3. | [Collinear columns](interactive/linalg-stage.html?lang=en#collinear), inside the modelling 3. |
| 08 · 10 min | Model one update 3; Exercise 1 and check 7. | — |
| 09 · 15 min | Exercise 1: 9; residual mistake below: 3; required SVD-to-Tucker bridge: 3. No timing sweeps. | — |
| 10 · 15 min | Explain core and factors 4; rank explorer 8; defend a choice 3. | [Tucker on the taxi tensor](interactive/factor-stage.html?lang=en#tucker), inside defend-a-choice 3, after the rank explorer: its hour factor peaks at 18, the hour the notebook printed. Never before it. |
| 11 · 15 min | Exercise 1 in pairs: 7; group task 11: 8. No model sweeps. | [Same budget, CP and Tucker](interactive/factor-stage.html?lang=en#budget), at group task 11's share-out, as the matched comparison the task asks for. Not before the pair exercise, which it would answer. |
| 12 · 5 min | Individual exit check. Assign take-homes after collection. | Just before it, on the "one idea" slide: replay the transposed voice for 30 seconds and let the room name the bug. |

Use [group tasks 05 and 11](group-tasks.md) at their notebook headings.
Use the written prompts; optional explorers are not prerequisites. For task 04,
use the tiny reshape example in [worked mistakes](worked-mistakes.md) if needed.
Each time box includes sharing. Ask one group to speak; others submit three
lines: **choice → evidence → what would change our mind**.

In Notebook 11, predict storage first, then use the optional partial-code hint
to complete the fit and comparison. Reserve the seven-minute pair slot for
choosing, checking and interpreting; run installations during preparation.
If fitting takes too long, demonstrate the supplied solution after their
attempt. Keep the eight-minute group discussion. Record actual completion
times and hint use to check whether this allocation works for the group.

## Entry and exit checks

<span data-language-key="entry-and-exit-checks"></span>

Use the prompts in Notebooks 00 and 12. The [assessment key](assessments.md)
has scoring and follow-up actions. Collect individual answers, not group answers.
Compare reasoning by dimension; this is not a validated learning test.
Keep the exit check to five minutes: three for axes and evidence, two for the
Tucker transfer question. Record transfer separately because it has no entry
counterpart; use its result to plan follow-up on Notebook 10.

Collect the one-minute checkpoints in Notebooks 03 and 06 before revealing
their answers. Use the [in-section keys](assessments.md#in-section-checkpoints)
to decide whether to revisit the axis rule. Keep these separate from the
entry/exit scores and within the existing lesson slots.

## Wrong-answer clinic

<span data-language-key="wrong-answer-clinic"></span>

Use [worked mistakes](worked-mistakes.md) inside the slots above. There is one
per notebook; the four that fit a group slot are axis order in 02, reshape in
04, residuals in 09, and rank budgets in 11. Show the claim first. Ask for a
counterexample. Reveal the correction last.

If half the room makes the same error, model the tiny example and ask a new
prediction. Drop an optional demonstration, not the next break or exit check.
Fast finishers design a counterexample before opening another exercise.

## After the session

<span data-language-key="after-the-session"></span>

Offer the two-minute [feedback form](workshop-feedback.md). Record the workshop
commit, actual timings, common errors, and one change for the next run.
Use the [release checklist](https://github.com/project-delphi/tensors-workshop/blob/main/RELEASE_CHECKLIST.md) before publishing that change.
