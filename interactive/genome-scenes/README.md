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
repo's genetic code against an outside authority instead of against itself. A
typo in either literal fails that test, which is the only guard these two
strings have.

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

The rest of this contract — the `register({...})` keys, the copy keys, the
`data-hl` tokens, the equations and what the browser check measures — is
written as the scenes land.
