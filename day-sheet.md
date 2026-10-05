---
title: "Day sheet"
subtitle: "One page for the room"
lang: en
---

::: {.day-sheet-intro}

[Español](es/day-sheet.md) · [Teach this workshop](teach.qmd)

Everything on this page is assembled from the
[facilitator guide](facilitator-guide.md), the
[agenda](tensors_workshop_plan_with_quizzes.md#schedule), [Kahoot](kahoot.qmd)
and the [FAQ](faq.qmd#colab-access) — nothing here is new. Print it, or keep
it open on a second screen.

:::

::: {.day-sheet}

## Tabs to open, in order

<span data-language-key="tabs-to-open-in-order"></span>

1. [Slides](slides/en/index.qmd)
2. [Audio stage cold open](interactive/voice-stage.html?lang=en#scramble) (sound on)
3. [kahoot.it](https://kahoot.it)
4. [Broadcasting simulator](interactive/broadcasting-simulator.html?lang=en)
5. [Reshape a photo](interactive/image-tensor.html?lang=en#reshape)
6. [The heads picture](interactive/attention-stage.html?lang=en#heads) (deep dive 17)
7. [Collinear columns](interactive/linalg-stage.html?lang=en#collinear)
8. [Tucker on the taxi tensor](interactive/factor-stage.html?lang=en#tucker)
9. [Same budget, CP and Tucker](interactive/factor-stage.html?lang=en#budget)
10. [One rank-1 term](interactive/factor-stage.html?lang=en#rank1) (deep dive 14)
11. [The AlphaTensor game](interactive/alphatensor-stage.html?lang=en#game) (deep dive 20)
12. [Notebook 00]({{< var repo.colab_base >}}/00-setup-and-data.ipynb) in Colab

## Clock strip

<span data-language-key="clock-strip"></span>

Decide cuts at the clock, not in the moment. Full detail in
[If you are behind](facilitator-guide.md#if-you-are-behind).

| Check at | You should be starting | If you are behind |
|------|---------|----------------------------------------------|
| +0:39 | 02's axis-meaning task | One group reports; skip the rest (−3). |
| +1:05 | 04 | Bug hunt round 1 only, skip round 2's rewrite (−3). |
| +1:25 | Kahoot 1 | Run it. 10+ min late: drop it, take the break. |
| +1:40 | 05 | Myth or fact → the retrieval question (−½); one group reports (−4). |
| +2:25 | Deep dive 17 | 3 min attempt, then the folded solution; keep predict-first (−8). |
| +2:50 | 07 | Lunch reset the clock. Myth or fact in full. |
| +3:10 | Kahoot 2 | 5+ min late: drop it (−5). |
| +3:25 | 09 | Skip the residual mistake; keep the SVD-to-Tucker bridge (−4). |
| +3:55 | Deep dive 13 | Demonstrate Exercise 1; keep predict-first and the explorer (−8). |
| +4:20 | 10 | Keep golf and the Tucker stage whole, whatever the clock says. |
| +4:45 | 11 | Hole 2 as a demo (−3); 10+ late: 3 min attempt then demo (−7). |
| +5:15 | Deep dive 14 | Predict first, then demonstrate Exercise 1 (−8). |
| +5:35 | Deep dive 20 | Predict first, then the game on the stage (−8). |
| +5:55 | 12 | Stop wherever you are and run the exit check. |

**Never cut:** the breaks, section 10, Kahoot 3, the exit check. Shorten a deep dive, never skip it.

## Kahoot PINs

<span data-language-key="kahoot-pins"></span>

Write each PIN down as it appears on screen — Kahoot generates it live at
launch. See [Kahoot](kahoot.qmd) for the join links and import files.

| Quiz | PIN |
|---|---|
| Quiz 1 — after section 04 | _______ |
| Quiz 2 — after section 07 | _______ |
| Quiz 3 — after section 10 | _______ |

## If Colab or Wi-Fi fails

<span data-language-key="if-colab-or-wi-fi-fails"></span>

- [Keep a working runtime ready](facilitator-guide.md#before-the-session) and
  demonstrate on the projector if a download fails.
- Students without a working Colab [pair with a neighbour](faq.qmd#colab-access);
  the interactive widgets run in any browser and need no account.
- Every notebook download falls back to the workshop's own copy of the
  dataset, and prints a bilingual message if both the original source and the
  fallback fail.

:::

::: {.day-sheet-strip}

## Timing strip

<span data-language-key="timing-strip"></span>

Fill this in as the session runs; it is what the
[feedback form](workshop-feedback.md) and the [facilitator
guide](facilitator-guide.md#after-the-session) ask you to bring back. Planned
values are from the [agenda](tensors_workshop_plan_with_quizzes.md#schedule).

{{< include _includes/day-sheet-strip-en.md >}}

:::
