---
title: "Instructor pace guide"
subtitle: "First session · one-page clock and decisions"
lang: en
toc: false
---

::: {.day-sheet-intro}

[Español](es/instructor-pace.md) · [Teaching kit](teach.qmd) · [Full facilitator guide](facilitator-guide.md)

Print this page or keep it beside your slides. Timings and teaching cues follow the existing workshop agenda and facilitator guide.

:::

::: {.day-sheet .pace-guide}

**Start: ______ · Finish: ______ · {{< var workshop.minutes >}} minutes, including quizzes, deep dives and breaks; lunch is extra.** Times below are session minutes: the clock stops for lunch. Set a timer for each slot.

## Before learners arrive {#before}

Open [slides](slides/en/index.qmd), [notebooks](notebooks.qmd), [Kahoot](kahoot.qmd) and the [day sheet’s demo tabs](day-sheet.md#tabs-to-open-in-order). Test sound and keep a working Colab runtime ready. Setup is pre-work; pair anyone still blocked instead of debugging for the room.

## Keep this clock {#clock}

| Start | Slot | Your cue / stopping point |
|---|-------|----------------------|
| {{< var sections.s00.start >}} | 00 · Welcome | Voice cold open 1½ min; individual entry check 3; welcome/runtime ½. |
| {{< var sections.s01.start >}} | 01 · Tensors | Model one shape 4 min; exercise and partner check 16. Skim computing slides. |
| {{< var sections.s02.start >}} | 02 · Axes | Prediction 2; axis key and exercise 12; axis-meaning task 6. |
| {{< var sections.s03.start >}} | 03 · Broadcasting | Model/simulator 3; exercise and feedback 14; one group shares 2; checkpoint 1. |
| {{< var sections.s04.start >}} | 04 · Reshape | Prediction/photo demo 2; exercise 10; bug hunt 6; name the voice bug 2. |
| {{< var sections.s04.end >}} | Kahoot 1 + break | Quiz {{< var schedule.quiz_minutes >}} min, then break {{< var schedule.break_minutes >}}. Announce the return time. |
| {{< var sections.s05.start >}} | 05 · Video | Myth or fact 1; prediction 2; exercise 4; group design task 8. |
| {{< var sections.s06.start >}} | 06 · Contraction | Model 4; exercise and feedback 13; one pair shares 2; checkpoint 1. |
| {{< var sections.s06.end >}} | Break | {{< var schedule.break_minutes >}} min. Restart on time. |
| {{< var schedule.labs.x17.start >}} | 17 · Attention (deep dive) | Setup 4; `split_heads` and tests 12; predict first 5; explain 4. Then **lunch**: the clock stops. |
| {{< var sections.s07.start >}} | 07 · Pseudoinverse | Back from lunch. Myth or fact 1; duplicate columns 3; compare 11; explain/check 5. |
| {{< var sections.s07.end >}} | Kahoot 2 | {{< var schedule.quiz_minutes >}} min. First quiz to drop if behind. |
| {{< var sections.s08.start >}} | 08 · Recursion | Model one update 3; exercise and check 7. |
| {{< var sections.s09.start >}} | 09 · SVD | Exercise 12; residual mistake 4; SVD-to-Tucker bridge 4. Keep the bridge. |
| {{< var sections.s09.end >}} | Break | {{< var schedule.break_minutes >}} min. Restart on time. |
| {{< var schedule.labs.x13.start >}} | 13 · Convolution (deep dive) | Predict first 4; exercise 1: 13; deconvolution demo 6; name the idea 2. |
| {{< var sections.s10.start >}} | 10 · Tucker | Myth or fact 1; core/factors 5; golf 8; defend winner + stage 6. |
| {{< var sections.s10.end >}} | Kahoot 3 | {{< var schedule.quiz_minutes >}} min. Protect this check of Tucker. |
| {{< var sections.s11.start >}} | 11 · CP vs Tucker | Pair exercise 10; golf 5; leaderboard + stage 5. No model sweeps. |
| {{< var sections.s11.end >}} | Break | {{< var schedule.break_minutes >}} min. Run notebook 14's prep cells now. |
| {{< var schedule.labs.x14.start >}} | 14 · CP (deep dive) | Predict first 3; rank-1 exercise 12; explain `lam` and check 5. |
| {{< var schedule.labs.x20.start >}} | 20 · AlphaTensor (deep dive) | Predict first 4; exercise 1: 10; one game on the stage 6. |
| {{< var sections.s12.start >}} | 12 · Exit | Stop teaching. Individual exit check: axes/evidence 3; Tucker transfer 2. |
| {{< var sections.s12.end >}} | Finish | Collect answers, then point to take-homes. |

## Rhythm and rescue {#rescue}

**Predict → Run → Explain → Check.** Follow each notebook’s core block; stop at **Core complete**. Take one group’s answer, then move on. Give a two-minute warning before each exercise ends. Keep questions for later if they need an extension.

- **5 minutes late:** shorten share-outs; in 04, do bug-hunt round 1 only; in 09, skip the residual mistake. Keep checkpoints.
- **More than 10 minutes late at Kahoot 1:** drop it; take the break. Lunch absorbs the rest of the morning. Late after lunch: drop Kahoot 2.
- **Late at a deep dive:** predict first, then demonstrate its exercise. Shorten it, never skip it.
- **Still late in 11:** demonstrate golf hole 2; if 10+ late, allow a three-minute pair attempt, then show the supplied solution.
- **Protect:** breaks, section 10, Kahoot 3 and the exit check at {{< var sections.s12.start >}}. Show the Tucker stage after golf. Leave extensions for home.

**If technology stalls:** pair learners with a working neighbour or use your prepared runtime on the projector. Record actual times and cuts on the [day sheet](day-sheet.md#timing-strip).

:::
