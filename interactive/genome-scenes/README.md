# The genome stage's scenes

*DNA to an edit* (`interactive/genome-stage.html`) is a scroller: eight scenes
down the left, one sticky stage on the right. It follows one thread — a gene is
read, transcribed, translated into the protein that then searches a sequence —
and every arrow in that thread is an operation this workshop already teaches.

**It is a stage about representation, not a design tool.** It shows what the
arithmetic is. It does not recommend a target, score a real genome, or hand a
reader anything to build. The search scenes run on the same 180 bases the rest
of the stage reads, and the About panel says so in both languages.

| Scene | Section | The picture | The lesson |
|---|---|---|---|
| `#bases` | 01/04 | a double helix, 3-D | a base is a one-hot vector; a sequence is `(L, 4)` |
| `#window` | 04 | the window matrix | `(W, L, 4)` is a view, not a copy |
| `#transcribe` | 06 | two 4 × 4 matrices | T→U is the identity; the complement is the anti-diagonal |
| `#codons` | 04 | the 64-cell cube, 3-D | a codon is a **rank-one** 4 × 4 × 4 |
| `#translate` | 06 | cube against table | the genetic code is a 4 × 4 × 4; translation is one contraction |
| `#protein` | 06 | the chain in property space, 3-D | `(P, 20) @ (20, 3)` — an embedding is a contraction |
| `#search` | 06 | the guide sliding, 3-D | `einsum('wlb,lb->w')` — searching is one contraction |
| `#batch` | 02/06 | a G × W heatmap | a batch is one more index in the same einsum |

Four parts, each declared by the scene that opens it: *A sequence is a one-hot
tensor* (`bases`) · *Transcription is a matrix* (`transcribe`) · *Translation is
a contraction* (`codons`) · *The search is one einsum* (`search`).

## The data

Two literals in `interactive/genome-core.js`, and nothing else. There is **no
generator and no data file**: 180 bases and 60 residues are small enough to
read in the source, and a literal cannot go stale behind your back the way a
fetched file can.

Both were piped in, never retyped. `PROTEIN` is not decoration — it is the
deposited translation of `CDS`, so `tests/genome_core.test.cjs` can check this
repo's genetic code against an outside authority instead of against itself.

Be exact about what that guards. Any change that moves a residue fails the
test: a wrong entry in the code table, a base dropped or transposed, a shifted
reading frame. What it does **not** catch is a synonymous edit — `TTT` for
`TTC` leaves every residue where it was. Nothing in the repo would notice that,
and nothing can: the only thing that can tell you these 180 bases are still the
record's 180 bases is re-running the command in the ledger below. That is why
the command is written out rather than described.

### The coding sequence

`CDS` is the first 60 codons (180 bases) of the *cas12a* coding sequence of
*Francisella tularensis* subsp. *novicida* U112, starting at its initiator
`ATG`. Short on purpose: enough to draw, and no construct.

```
source   https://www.ebi.ac.uk/ena/browser/api/fasta/ABK90267.1
sha256   61f13f81104aa7b090bc9524540559658dc080c360bf1aed35fa671d4a8b02b4
fetched  2026-09-30
record   ENA ABK90267.1 — the CDS of the gene at CP000439.1:1473442..1477344
         (complement); 3903 bases = 1300 codons + one stop
literal  genome-core.js CDS — bases 1-180
command  curl -sS "https://www.ebi.ac.uk/ena/browser/api/fasta/ABK90267.1" \
           | grep -v '^>' | tr -d '\n' | cut -c1-180
```

### The protein

`PROTEIN` is the first 60 residues of the same gene's product, as deposited.

```
source   https://rest.uniprot.org/uniprotkb/A0Q7Q2.fasta
sha256   0cd96c42d6603f7b14f42e911484eb79e391896a0b37fb782d0a98ea3f8dd32a
fetched  2026-09-30
record   UniProtKB A0Q7Q2 (CS12A_FRATN), 1300 residues
literal  genome-core.js PROTEIN — residues 1-60
command  curl -sS "https://rest.uniprot.org/uniprotkb/A0Q7Q2.fasta" \
           | grep -v '^>' | tr -d '\n' | cut -c1-60
```

Why this record and not one of the other Cas12a proteins: it begins with its
initiator methionine, so the stage's first codon is `ATG` and the first residue
is `M`. The commonly cited *Lachnospiraceae* entry is deposited without that
first residue, which would have made the opening picture need a footnote.

### The two scales, and the code

`CODE` is the standard genetic code. It is written in the source in the classic
`TCAG × TCAG × TCAG` order so its block structure is visible as four rows of
sixteen, and it was verified against **all 1300** residues of the full protein,
not only the 60 kept here.

`PROPS` is 20 × 3: hydropathy from Kyte & Doolittle (1982), residue volume in
Å³ from Zamyatnin (1972), and the charge at pH 7 — whole for D, E, K and R, and
the partial +0.1 histidine is usually given.

## The arithmetic

All of it is in `interactive/genome-core.js`, and only arithmetic is: no DOM,
no drawing, no copy. A scene computes nothing a reader can check; it asks the
core and draws the answer.

- **Alphabet** — `BASES` (`ACGT`, alphabetical so a row is findable without a
  legend), `RNA_BASES`, `AAS`, `baseIndex`, `aaIndex`, `oneHot`, `decode`.
- **Transcription** — `RELABEL` and `COMPLEMENT`, the two 4 × 4 matrices;
  `matrixFor`, `applyAlphabet`, `transcribe`. The claim the scene makes is that
  transcribing the coding strand moves no number at all, and that
  complementation is the reversal permutation, which the test pins by applying
  it twice and getting the sequence back.
- **Windows** — `windows(seq, width)` returns `{width, count, shape, at}` and
  copies nothing.
- **Codons** — `codonTensor` (one non-zero, so rank one), `nonZeros`,
  `codonGrid` (the free reshape), `codonAt`, `codonCount`.
- **Translation** — `CODE_T`, the code as a 4 × 4 × 4 of residue indices with
  20 for a stop; `translate` by lookup and `translateByContraction` by summing
  over all three base axes. The test requires the two to agree, because
  "einsum" has to name a mechanism a reader can check.
- **The embedding** — `PROPS`, `PROP_NAMES`, `embed`.
- **The search** — `matchScores` (`einsum('wlb,lb->w')`), `weightedScores` (the
  same with a third operand, and identical to `matchScores` when every weight
  is 1), `motifAt` / `motifMask` / `maskedScores` (a mask is broadcasting),
  `mutate` (deterministic, outside-in, so the readout is reproducible),
  `batchScores`, `topMatches`, `max`.

Numbers the stage puts on screen, all pinned: the guide at window 40 is the
only one of 161 that scores 20, the runner-up scores 12, six windows carry the
motif, and each mismatch costs exactly one.
## What a scene provides

`GenomeScenes.register` throws unless the scene has `id`, `section`, `copy`,
`init`, `draw`, `readout` and `code`; a `gl` scene must also have `pose`,
`build`, `render` and `bounds`, and both languages need `copy.aria`.

| key | what it is for |
|---|---|
| `id` | the section, the `#fragment`, the dot on the step bar |
| `section` | the workshop section, for the kicker |
| `part` | `{en, es}`, on the scene that opens one of the four parts |
| `hl` | the `data-hl` tokens its section's `<math>` may point at |
| `controls` | `range` (min, max, step, fmt) or `select` (options) |
| `copy` | `{en, es}`: k, h, concept, claim, predict, b, eqcap, aria, np, controls, options |
| `init` | seed `ctx.state` |
| `sync` | derive from the controls, and clamp one against another, before anything reads them |
| `draw` | paint `ctx.svg` — a flat picture, or a GL scene's twin |
| `readout` | `{html, claim, data}` |
| `code` | the NumPy lines, through `K.code(rows)` |
| `pick` / `tip` | click and hover |
| `pose` / `bounds` / `build` / `render` | the three.js half |

**Copy keys must match exactly between the two languages**, `np` included, and
`options` is keyed by **control id first, then value** — flat looks right and
silently falls back to the raw value, which is how the first scene shipped.

**Every readout key is lowercase and every value a string**, because
`stage.dataset.fN` writes `data-f-n`. The frame owns `ready`, `scene`, `gl`,
`cam`, `easing`, `playing`, `paused`, `hl`, `hover`, `grab`, `turns` and
`tensorshape`; a readout returning one of those has it overwritten next frame.

**A claim is rebuilt from the controls**, never left as the copy table's static
string. `tests/genome_scenes.test.cjs` fails a scene whose claim says the same
thing at every setting, on the grounds that it is then decoration.

**No NumPy line passes 82 characters** at any setting in either language,
measured in the test and again live in the browser check.

**The eight `data-hl` tokens are a closed set**: `pos`, `base`, `win`, `rna`,
`codon`, `aa`, `prop`, `guide`. Pointing at a letter repaints the stage and
never calls `changed()`, because a hover must not rewrite the readout.

**The residue tint is one function**, `K.residueTint`, shared by the codon cube
and the code slices — the blocks of one colour a reader spots in one have to be
the same blocks in the other. It carries a lightness floor: at 62% the blue
near hue 243 sat at 4.08:1 against the stage's black, and 68% puts the worst
hue at 5.5:1.

## What the browser check measures

`scripts/navigation/widgets/genome-stage.cjs` opens each scene **by name**,
never `#step-N`, through a helper that waits for the scroll to stop and for a
key only that scene publishes — `data-scene` flips a frame before the rest of
the dataset is rewritten, and the other keys are cleared, not stale, so waiting
on `data-scene` alone reads `undefined`. That fails reliably only on the slower
CI runner.

It asserts the teaching numbers off `data-*`: transcription moving 0 of 12 ones
one way and 12 the other, the search scoring 20 against a runner-up of 12 with
each mismatch costing exactly one, a codon always holding exactly one non-zero,
and 161 windows over 180 stored bases against the 3,220 copying them would take.

It measures the SVG children's union **through `getScreenCTM().inverse()`**, at
each scene's opening values and at the corners of every control. The inverse is
the point: `getCTM()` lands in viewport pixels, so a child 50 user units past
the edge measures as comfortably inside and the check passes while the picture
is wrong. That is not hypothetical — it is how the RNA strip ran to 872 on an
820-wide board and swept clean. SVG neither clips such a child nor reports it;
it simply never paints it.
