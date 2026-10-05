# Pedagogy, UI and interactivity improvement plan

Status: proposed work; no recommendations below have been implemented by this
plan. Recorded on 2026-10-03 against `fe511a3` (PR #220), including the merged
AlphaTensor stage and deep dive 20.

The opportunity is to make the existing material easier to navigate, attempt,
and learn from. Preserve the notebook core routes, optional hints, feedback
helpers, worked mistakes, assessments, and instructor pacing guidance already
in place.

This plan comes from a source review and sampled notebook activities. Browser
access failed during that review, so the UI findings concern information
structure, not a verified visual walkthrough. Recheck each finding against the
current source before implementation, especially where newer work overlaps it.

## Priorities

### 1. Make predictions precede answers

- [ ] Audit scene headings, concept paragraphs, equations, claim cards, code,
      and readouts for answers exposed before the prediction prompt.
- [ ] Start with the [CP/Tucker budget scene](interactive/factor-scenes/budget.js):
      its heading and concept explain that equal ranks cost different amounts
      before asking learners whether they cost the same.
- [ ] Use a neutral heading and pose the question before the explanation. If
      the opening picture necessarily reveals the answer, ask for a prediction
      about a change the learner has not yet made.
- [ ] Review both languages and include the newer AlphaTensor scenes in the
      audit, without assuming they share the same problem.

Acceptance: a learner can make a prediction without first being shown its
answer, then use the picture and explanation to revise their reasoning.

### 2. Add short, checkable challenges to existing widgets

- [ ] Pilot a broadcasting challenge: apply one offset per sample.
- [ ] Offer an optional hint, feedback tied to the current settings, and a new
      example for an independent retry. Keep free exploration available.
- [ ] After evaluating the pilot, consider an attention challenge: make each
      query's weights sum to one by choosing the normalization axis.

Example activity:

1. **Predict:** will `(3, 2) - (3,)` work?
2. **Try:** adjust the offset shape in the simulator.
3. **Feedback:** "The trailing dimensions are 2 and 3. Which shape gives one
   offset per row?"
4. **Explain:** name the axis across which each offset repeats.
5. **Transfer:** solve a fresh example without the simulator.

Acceptance: feedback distinguishes plausible mistakes and helps the learner
correct them; a successful retry requires reasoning beyond copying the first
answer. Use the existing core arithmetic and bilingual copy conventions.

### 3. Make the interactive directory easier to scan

- [ ] Shorten the cards in [Interactive](interactive.qmd) and its Spanish
      counterpart to a question, section labels, one suggested starting scene,
      and an action button.
- [ ] Put the longer scene tours in expandable sections, preserving useful
      named-scene links and coverage of all current widgets.
- [ ] Verify the rendered result at laptop and desktop sizes, including the
      Spanish copy, keyboard navigation, and the existing overflow canary.

Acceptance: a learner can choose a relevant widget and starting scene without
reading every long description. Keep this directory as the widget catalogue;
do not duplicate its cards on the homepage.

### 4. Clarify the next action between resources

- [ ] Add contextual destinations alongside the widgets' broad navigation:
      for example, "Practise this in Notebook 06" and a link to the handbook's
      contraction explanation.
- [ ] Preserve language and named scenes where applicable. Derive shared
      section facts from their existing owner rather than maintaining new
      copies of titles or inventories.

Acceptance: learners can move from a picture to its relevant exercise or
explanation without searching the full notebook or handbook catalogue.

### 5. Share an exact experiment

- [ ] Add "Copy this experiment" to a pilot stage. Existing named-scene links
      identify a scene; the proposed link should also reproduce its relevant
      control settings.
- [ ] Encode and validate ranks, axes, masks, or other mathematical settings
      using bounded URL parameters. Preserve language and the named scene.
- [ ] Handle absent, malformed, or obsolete parameters with safe defaults;
      retain a usable reset and a selectable-link fallback when clipboard
      access is unavailable.

Acceptance: a partner opening the copied link sees the same numerical state.
Test the state round trip and invalid inputs before extending it to other
stages. Camera settings are optional unless they carry the explanation.

### 6. Add a delayed transfer check

- [ ] Extend [assessments.md](assessments.md) and its Spanish counterpart with
      a short follow-up using unfamiliar data: explain an axis, repair a
      broadcast, and defend a compression choice.
- [ ] Supply a rubric and targeted follow-up resources, building on the
      existing entry, exit, and in-session checkpoints.
- [ ] Schedule it after the workshop, outside the 360-minute agenda, and keep
      responses private using the existing instructor collection approach.

Acceptance: the follow-up checks retained reasoning and transfer, not recall
of the workshop's exact arrays. Do not present score changes as causal evidence
of workshop impact.

### 7. Align the homepage rhythm with the lesson

- [ ] Replace the fixed 10-minute coding, 5-minute review, and 10-minute
      discussion sequence in [index.qmd](index.qmd) and [es/index.qmd](es/index.qmd)
      with **Predict → Run → Explain → Check**.
- [ ] Keep timing in its existing agenda and instructor-guide homes; preserve
      the homepage's role as an entry point.

Acceptance: the homepage describes the same learning cycle as the notebook
cores and instructor pace guide without implying every section lasts 25 minutes.

### 8. Continue migrating slide text into Quarto

- [ ] Follow the existing [slide inventory](slides/README.md), prioritizing
      documented stale wording and numerical inconsistencies when those slides
      are touched.
- [ ] Move equations, numbers, and teaching text into editable Quarto in both
      decks, checking numerical examples against their notebook sources.

Acceptance: changed teaching text is selectable, maintainable in both languages,
and consistent with the lesson. This continues the existing gradual migration;
it does not introduce a separate wholesale slide rewrite.

## First implementation pilot

Start with prediction leakage, the interactive directory, and one broadcasting
challenge. The homepage rhythm correction is a small related copy change.

Observe whether learners can find the activity, explain their mistake, and
solve a fresh example unaided. Record where they needed help and use those
observations to decide whether to extend the challenge pattern across stages.
Keep these observations separate from automated correctness and accessibility
checks.

For each implementation PR, follow [CONTRIBUTING.md](CONTRIBUTING.md), the
relevant scene contract, and [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).
Maintain English/Spanish parity, generated-file ownership, the existing motion
and fallback behavior, and the desktop/laptop target. Add meaningful core and
browser checks for new behavior; poll published state rather than adding fixed
waits. The planning-only PR changes no runtime or rendered-page behavior.

## Evidence and limits

Retrieval practice, explanatory questions, and alternating worked examples
with independent problems are supported by the
[IES practice guide on organizing instruction and study](https://ies.ed.gov/ncee/wwc/PracticeGuide/1).
It also recommends spacing learning over time. These principles support the
direction of the plan; they do not establish that a particular interface will
improve outcomes in this workshop. Evaluate the proposed interactions with
learners before expanding them.
