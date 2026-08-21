# Kahoot quizzes

Three 6-question knowledge checks, as `.xlsx` files ready to import into
kahoot.it. They sit at the three natural seams of the workshop: after the shape
and vocabulary work, after the einsum and pseudoinverse stretch, and after the
decompositions.

Each sits **right after the blocks that supply its content**, while the material
is still fresh, and **before** the next context switch — a break or a new Part —
so it reinforces rather than interrupts.

## Which quiz belongs to which section

| Quiz | File | Runs after | Covers sections | Questions |
|---|---|---|---|---|
| **1 — Tensor Vocabulary & Shapes** | [`kahoot_quiz_1_vocabulary_shapes.xlsx`](kahoot_quiz_1_vocabulary_shapes.xlsx) | Section 04, before the first break | 01, 03, 04 | 6 |
| **2 — Einsum, Distance & the Pseudoinverse** | [`kahoot_quiz_2_distance_pseudoinverse.xlsx`](kahoot_quiz_2_distance_pseudoinverse.xlsx) | Section 07, before the recursion demo | 06, 07 | 6 |
| **3 — Convolution & Tensor Decompositions** | [`kahoot_quiz_3_convolution_decompositions.xlsx`](kahoot_quiz_3_convolution_decompositions.xlsx) | Section 10, immediately before the wrap-up | 09, 10 | 6 |

Sections **00, 02, 05, 08 and 11** have no quiz. That is deliberate: the
quizzes are checkpoints after exercise stretches, so the setup, the two group
blocks, the recursion demo and the wrap-up are not covered by one.

## How to run them

### Before the session

**Import each spreadsheet into kahoot.it ahead of time.** Create → Add question →
Import → Import spreadsheet. Doing this live costs several minutes you do not
have, three times over.

Then paste the three join URLs into
[`_variables.yml`](../_variables.yml) and re-render:

```yaml
kahoot:
  q1:
    url: "https://kahoot.it/"   # <- replace these three with the real join URLs
```

Until you do, every quiz link points at `kahoot.it` itself, which still works —
students enter the PIN from your screen. `scripts/check_links.py` reports how
many are still on the fallback.

Every link on the site, in both slide decks and in all twelve notebooks points
at that one file, so three edits cover everything.

### During the session

- **Budget 5 minutes each, including the podium.** Groups want to see the
  leaderboard, and that is fine — it is the payoff.
- Students join at **kahoot.it** with the PIN on your screen.
- The three quizzes add 15 minutes, taking the workshop from 180 to **195**.

## Two things to watch

**Quiz 2 is ahead of the material.** Two of its six questions ask about
Euclidean distance and cosine similarity, which the handbook never defines
directly. The only bridge is section 06's TODO 4 — the 1797×1797 digit
similarity matrix built with one `einsum`. **Say both terms out loud during that
exercise**, or expect the last two questions to land cold.

**Quiz 3 spoils section 10 if you run it early.** Its final question names hour
18 as the peak of the taxi tensor's hour factor, which is exactly what section
10's TODO 6 asks students to discover. It must come *after*.

## If you are running out of time

The handbook's cutting order, in order:

1. **Quiz 2** — the least novel of the three; the pseudoinverse and distance get
   re-covered narratively in the wrap-up.
2. TODO 4 of section 09 (true deconvolution — the most technically demanding).
3. The RNN snippet in section 08.
4. Question 5 of either group block.
5. **Quiz 1.**

**Never cut** section 01's *Three Operations That Matter*, section 10, or
**Quiz 3** — the last is the cheapest way to check whether Tucker and CP
actually landed before students leave.

## Editing a quiz

Edit the `.xlsx` and re-import it. The columns are Kahoot's own import format:
`Question | Answer 1..4 | Time limit (sec) | Correct answer(s)`. If you change
a quiz's title or length, update it in [`_variables.yml`](../_variables.yml) too
— that is where the site and both decks read it from.
