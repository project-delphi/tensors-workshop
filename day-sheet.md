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
6. [Collinear columns](interactive/linalg-stage.html?lang=en#collinear)
7. [Tucker on the taxi tensor](interactive/factor-stage.html?lang=en#tucker)
8. [Same budget, CP and Tucker](interactive/factor-stage.html?lang=en#budget)
9. [Notebook 00]({{< var repo.colab_base >}}/00-setup-and-data.ipynb) in Colab

## Clock strip

<span data-language-key="clock-strip"></span>

Decide cuts at the clock, not in the moment. Full detail in
[If you are behind](facilitator-guide.md#if-you-are-behind).

| Check at | You should be starting | If you are behind |
|------|---------|----------------------------------------------|
| +0:39 | 02's axis-meaning task | One group reports; skip the rest (−3). |
| +1:00 | 04 | Bug hunt round 1 only, skip round 2's rewrite (−3). |
| +1:15 | Kahoot 1 | Run it. 6–10 min late: drop Kahoot 2 now. 10+: drop Kahoot 1 too. |
| +1:25 | 05 | Myth or fact → the retrieval question (−½); one group reports (−4). |
| +2:00 | 07 | Myth or fact → the retrieval question (−½); drop Kahoot 2 if still in (−5). |
| +2:30 | 09 | Skip the residual mistake; keep the SVD-to-Tucker bridge (−3). |
| +2:50 | 10 | Keep golf and the Tucker stage whole, whatever the clock says. |
| +3:10 | 11 | Hole 2 as a demo (−3); 10+ late: 3 min attempt then demo (−4). |
| +3:25 | 12 | Stop wherever you are and run the exit check. |

**Never cut:** the breaks, section 10, Kahoot 3, the exit check.

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
