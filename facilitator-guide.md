---
title: "Facilitator run sheet"
lang: en
---

[Español](es/facilitator-guide.md) · [Teach this workshop](teach.qmd) · [Day sheet](day-sheet.md)

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
After each break, in 05, 07 and 10, the deck's **Myth or fact?** slide is that
question instead, and it takes a minute: three claims from the block before
the break, a show of hands on each, one counterexample for a myth, then the
reveal.
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
| 04 · 15 min | Opening prediction and the projector 2; Exercise 1: 7; [bug hunt](group-tasks.md#silent-bugs) 6: match 2, test and score 3, share 1. | [Reshape a photo](interactive/image-tensor.html?lang=en#reshape): the cold open's bug, on an image. Name it as that bug. |
| 05 · 15 min | Myth or fact 1; opening prediction 2, which is Exercise 1's prediction step; Exercise 1: 4; group task 05: 8. | — |
| 06 · 15 min | Model one contraction 4; Exercise 1 and feedback 10; independent contraction checkpoint 1. | — |
| 07 · 15 min | Myth or fact 1; model duplicate columns 3; compare coefficients and norms 8; explain what remains unidentified and checkpoint 3. | [Collinear columns](interactive/linalg-stage.html?lang=en#collinear), inside the modelling 3. |
| 08 · 10 min | Model one update 3; Exercise 1 and check 7. | — |
| 09 · 15 min | Exercise 1: 9; residual mistake below: 3; required SVD-to-Tucker bridge: 3. No timing sweeps. | — |
| 10 · 15 min | Myth or fact 1; explain core and factors 3; [compression golf, hole 1](group-tasks.md#compression) in the rank explorer 8; leaderboard and defend the winner 3. | [Tucker on the taxi tensor](interactive/factor-stage.html?lang=en#tucker), inside the last 3, after golf: set it to the winning ranks, usually (3, 3, 1). Its one hour pattern peaks at 18, the hour the notebook printed. Never before golf. |
| 11 · 15 min | Exercise 1 in pairs: 7; compression golf, hole 2: 5; leaderboard and the stage 3. No model sweeps. | [Same budget, CP and Tucker](interactive/factor-stage.html?lang=en#budget), at the leaderboard: both holes in one picture. Not before the pair exercise, which it would answer. |
| 12 · 5 min | Individual exit check. Assign take-homes after collection. | Just before it, on the "one idea" slide: replay the transposed voice for 30 seconds and let the room name the bug. |

Use [group tasks 05 and 11](group-tasks.md) at their notebook headings.
Use the written prompts; optional explorers are not prerequisites. For task 04,
use the tiny reshape example in [worked mistakes](worked-mistakes.md) if needed.
Each time box includes sharing. Ask one group to speak; others submit three
lines: **choice → evidence → what would change our mind**.

The three games keep score. In the bug hunt, run the answer-key cell only after
round 2. In golf, each team posts one line (ranks · numbers · error) in the chat
or calls it out; keep the board sorted by numbers stored, and ask the leading
team how it got there. Par for hole 1 is Tucker (3, 3, 1), 60 numbers at 4.69%;
(2, 2, 1), (3, 2, 1) and (2, 3, 1) all miss by less than 0.15 points. Par for
hole 2 is CP rank 6, 198 numbers at 1.76%, against Tucker's best, (4, 4, 5) at
236. Put the two winners side by side: Tucker wins at 7% and CP wins at 2%,
which answers the "which model is better?" question before anyone asks it.

In Notebook 11, the CP and Tucker fits are supplied in the TODO cell; predict
storage first, then run it. Reserve the seven-minute pair slot for checking
the suggested ranks, counting parameters, computing both relative errors and
interpreting the gap; run installations during preparation.
If fitting takes too long, demonstrate the supplied solution after their
attempt. Keep the eight minutes of golf. Record actual completion
times and hint use to check whether this allocation works for the group.

## If you are behind

<span data-language-key="if-behind"></span>

Decide cuts at the clock, not in the moment. At each checkpoint, compare the
time with the planned start and take the cut for that row. Minutes are from the
session's start; write the real clock times in the margin before you begin.
Every cut keeps the core route, the checkpoints and the answer to the
section's question; what goes is sharing, a second round, or a vote.

| Check at | You should be starting | If you are | Cut, and what it saves |
|---|---|---|---|
| +0:45 | 03 | 5+ min late | In 02's axis-meaning task, one group reports and the rest skip the share-out (−3). |
| +1:00 | 04 | 5+ min late | Bug hunt round 1 only: match, then run the answer key; skip round 2's rewrite (−3). |
| +1:15 | Kahoot 1 | up to 5 min late | Run it. Kahoot 2 is now the planned cut. |
| | | 6–10 min late | Run it, and drop Kahoot 2 now, so you are not deciding at +2:15 (−5). |
| | | 10+ min late | Drop Kahoot 1 as well (−5). Take the break anyway. |
| +1:25 | 05 | 5+ min late | Myth or fact becomes the 30-second retrieval question (−1). Group task 05: one group reports (−4). |
| +2:00 | 07 | 5+ min late | Myth or fact becomes the retrieval question (−1). Drop Kahoot 2 if it is still in (−5). |
| +2:30 | 09 | 5+ min late | Skip the residual mistake; keep the SVD-to-Tucker bridge, which section 10 needs (−3). |
| +2:50 | 10 | any | Myth or fact becomes the retrieval question if late (−1). **Keep golf and the Tucker stage whole.** |
| +3:10 | 11 | 5+ min late | Hole 2 as a demonstration: show CP rank 6 at 198 numbers against Tucker's 236, then the stage (−3). |
| | | 10+ min late | Pair exercise: three minutes to attempt, then demonstrate the supplied solution (−4). |
| +3:25 | 12 | any | Stop wherever you are and run the exit check. |

**Never cut:** the breaks, section 10, Kahoot 3, or the exit check. The exit
check is the only record of what the session changed, and the next run is
planned from it. Kahoot 3 checks whether Tucker landed while the taxi result is
still on screen.

Together these cuts recover about 30 minutes, which is roughly how far a first
run is expected to drift: Kahoots, Myth or fact and the golf rounds each tend
to run a minute or two over. Write down which cuts you took and at what time;
they are the most useful line on the [feedback form](workshop-feedback.md).

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

The three **Myth or fact?** rounds after the breaks are the same entries in a
faster form: 02–04 before section 05, 05–06 before 07, and 07–09 before 10.
Each round mixes myths with true claims, so the vote is never a giveaway.

If half the room makes the same error, model the tiny example and ask a new
prediction. Drop an optional demonstration, not the next break or exit check.
Fast finishers design a counterexample before opening another exercise.

## After the session

<span data-language-key="after-the-session"></span>

Offer the two-minute [feedback form](workshop-feedback.md). Record the workshop
commit, actual timings on the [day sheet's timing strip](day-sheet.md#timing-strip),
common errors, and one change for the next run.
Use the [release checklist](https://github.com/project-delphi/tensors-workshop/blob/main/RELEASE_CHECKLIST.md) before publishing that change.
