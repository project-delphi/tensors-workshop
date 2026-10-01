// Pins the arithmetic under the "DNA to an edit" stage
// (interactive/genome-core.js). Run with `npm test`; no browser, no render.
//
// The two sequence literals in that file have no byte gate of their own, and
// no generator regenerates them -- the ledger in
// interactive/genome-scenes/README.md records where they came from, and the
// first test below is what would notice either one being edited: it requires
// this file's genetic code to turn CDS into the published PROTEIN exactly. A
// typo in either literal breaks that, and so does a typo in the code table.
// Every other number pinned here is a claim the stage puts on screen.
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../interactive/genome-core.js');

const near = (a, b, tol, what) =>
  assert.ok(Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol),
    `${what || ''} expected ${b}, got ${a}`);

test('the code table turns CDS into the published protein, both ways', () => {
  assert.equal(G.CDS.length, 180, '60 codons');
  assert.equal(G.PROTEIN.length, 60);
  assert.ok(/^[ACGT]+$/.test(G.CDS), 'CDS is DNA over ACGT');
  assert.equal(G.CDS.slice(0, 3), 'ATG', 'it starts at the initiator codon');
  // The outside authority: a table lookup must reproduce the deposited
  // translation residue for residue.
  assert.equal(G.translate(G.CDS), G.PROTEIN);
  // And the contraction must agree with the lookup, or "einsum" is a word
  // rather than a mechanism.
  assert.equal(G.translateByContraction(G.CDS), G.PROTEIN);
  assert.equal(G.PROTEIN.slice(0, 10), 'MSIYQEFVNK');
});

test('the genetic code is 64 codons, 20 residues and 3 stops', () => {
  assert.equal(Object.keys(G.CODE).length, 64);
  const residues = new Set(Object.values(G.CODE));
  residues.delete(G.STOP);
  assert.equal(residues.size, 20);
  assert.equal(Object.values(G.CODE).filter(a => a === G.STOP).length, 3);
  assert.equal(G.AAS.length, 20);
  // The redundancy the codon cube is drawn to show: three residues take six
  // codons each, and two take exactly one.
  const perAA = {};
  for (const a of Object.values(G.CODE)) perAA[a] = (perAA[a] || 0) + 1;
  assert.deepEqual(Object.keys(perAA).filter(a => perAA[a] === 6).sort(), ['L', 'R', 'S']);
  assert.deepEqual(Object.keys(perAA).filter(a => perAA[a] === 1).sort(), ['M', 'W']);
});

test('CODE_T is the same table as a 4 x 4 x 4 tensor on the ACGT axis', () => {
  assert.equal(G.CODE_T.length, 4);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      assert.equal(G.CODE_T[i][j].length, 4);
      for (let k = 0; k < 4; k++) {
        const codon = G.BASES[i] + G.BASES[j] + G.BASES[k];
        const want = G.CODE[codon];
        const got = G.CODE_T[i][j][k];
        assert.equal(want === G.STOP ? 20 : G.AAS[got], want === G.STOP ? 20 : want,
          `${codon} reads as ${got}`);
      }
    }
  }
  // ATG is methionine: A=0, T=3, G=2 on the alphabetical axis.
  assert.equal(G.AAS[G.CODE_T[0][3][2]], 'M');
  // TAA, TAG and TGA are the three stops, and 20 is how the tensor says so.
  assert.equal(G.CODE_T[3][0][0], 20);
  assert.equal(G.CODE_T[3][0][2], 20);
  assert.equal(G.CODE_T[3][2][0], 20);
});

test('a one-hot row has exactly one 1, and the sequence is (L, 4)', () => {
  const rows = G.oneHot('ACGT');
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0], [1, 0, 0, 0]);
  assert.deepEqual(rows[3], [0, 0, 0, 1]);
  for (const row of G.oneHot(G.CDS)) {
    assert.equal(row.reduce((a, b) => a + b, 0), 1, 'one 1 per position');
    assert.equal(row.length, 4);
  }
  assert.throws(() => G.oneHot('ACGN'), /not a base/);
  // Every pair of different bases is the same distance apart, the square
  // root of 2: one-hot puts no letter nearer to another, which numbering
  // them 1 to 4 would.
  for (const a of G.BASES) {
    for (const b of G.BASES) {
      assert.ok(Math.abs(G.oneHotDistance(a, b) - (a === b ? 0 : Math.SQRT2)) < 1e-12, `${a}-${b}`);
    }
  }
});

test('T to U is the identity; the complement is the anti-diagonal', () => {
  // The claim the transcription scene makes: transcribing the coding strand
  // moves no number at all, it only renames the axis.
  assert.deepEqual(G.RELABEL, [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]);
  // A<->T and C<->G is index 0<->3 and 1<->2, which in alphabetical order is
  // the reversal permutation -- a matrix with a single anti-diagonal.
  assert.deepEqual(G.COMPLEMENT, [[0, 0, 0, 1], [0, 0, 1, 0], [0, 1, 0, 0], [1, 0, 0, 0]]);
  assert.equal(G.transcribe('ATG', 'relabel'), 'AUG');
  assert.equal(G.transcribe('ATG', 'complement'), 'UAC');
  // Applying it twice is the identity, so the complement is its own inverse.
  const twice = G.applyAlphabet(G.applyAlphabet(G.oneHot(G.CDS), G.COMPLEMENT), G.COMPLEMENT);
  assert.equal(G.decode(twice, G.BASES), G.CDS);
  assert.equal(G.transcribe(G.CDS, 'relabel'), G.CDS.replace(/T/g, 'U'));
  assert.throws(() => G.matrixFor('nonsense'), /no such transcription/);
});

test('the polymerase reads the template, and the RNA comes out as the coding strand', () => {
  // The template pairs with the coding strand base for base.
  assert.equal(G.templateStrand('ATGC'), 'TACG');
  // On the one-hot grid that is the alphabet axis reversed: X[:, ::-1].
  const X = G.oneHot(G.CDS);
  assert.deepEqual(G.oneHot(G.templateStrand(G.CDS)), X.map((row) => row.slice().reverse()));
  // Reading the template by the anti-diagonal is relabelling the coding
  // strand by the identity: J @ J = I. This is the transcription scene's
  // whole claim, so it is pinned on all 180 bases.
  const template = G.templateStrand(G.CDS);
  assert.equal(G.transcribe(template, 'complement'), G.transcribe(G.CDS, 'relabel'));
  // Against the template every 1 changes column; against the coding strand
  // none does.
  const rna = G.applyAlphabet(G.oneHot(template), G.COMPLEMENT);
  assert.equal(G.movedOnes(G.oneHot(template), rna), 180);
  assert.equal(G.movedOnes(X, rna), 0);
});

test('windows are a view: W = L - w + 1, and nothing is copied', () => {
  const w = G.windows(G.CDS, 20);
  assert.equal(w.count, 161);
  assert.deepEqual(w.shape, [161, 20, 4]);
  assert.equal(w.at(0), G.CDS.slice(0, 20));
  assert.equal(w.at(160), G.CDS.slice(160, 180));
  assert.equal(G.windows(G.CDS, 180).count, 1);
  assert.throws(() => G.windows(G.CDS, 0), /bad window/);
  assert.throws(() => G.windows(G.CDS, 181), /bad window/);
});

test('a stored base is seen again in up to `width` windows', () => {
  const n = G.CDS.length, w = 20, count = G.windows(G.CDS, w).count;
  assert.equal(G.appearances(n, w, 0), 1);
  assert.equal(G.appearances(n, w, 19), 20);
  assert.equal(G.appearances(n, w, 90), 20);
  assert.equal(G.appearances(n, w, 179), 1);
  // Brute force, and the total is the 3,220 entries of the array.
  let total = 0;
  for (let i = 0; i < n; i++) {
    let k = 0;
    for (let j = 0; j < count; j++) if (i >= j && i < j + w) k++;
    assert.equal(G.appearances(n, w, i), k);
    total += k;
  }
  assert.equal(total, count * w);
});

test('a codon is a rank-one 4 x 4 x 4: 64 slots, one of them 1', () => {
  const T = G.codonTensor('ATG');
  assert.equal(G.nonZeros(T), 1, 'rank one means one non-zero');
  assert.equal(T[0][3][2], 1);
  let total = 0;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) total += T[i][j][k];
  assert.equal(total, 1);
  // Every codon in the sequence is rank one, not just the first.
  for (let n = 0; n < G.codonCount(G.CDS); n++) {
    assert.equal(G.nonZeros(G.codonTensor(G.codonAt(G.CDS, n))), 1);
  }
});

test('the codon reshape is (L, 4) -> (L/3, 3, 4) and loses nothing', () => {
  const grid = G.codonGrid(G.CDS);
  assert.equal(grid.length, 60);
  assert.equal(grid[0].length, 3);
  assert.equal(grid[0][0].length, 4);
  // Flattening the reshape back gives the original one-hot rows: a reshape is
  // free because the bases were already in that order.
  const flat = [].concat.apply([], grid);
  assert.deepEqual(flat, G.oneHot(G.CDS));
  assert.equal(G.codonCount(G.CDS), 60);
  assert.equal(G.codonAt(G.CDS, 0), 'ATG');
});

test('the property matrix is 20 x 3, and the embedding is a contraction', () => {
  assert.equal(G.PROPS.length, 20);
  for (const row of G.PROPS) assert.equal(row.length, 3);
  assert.deepEqual(G.PROP_NAMES, ['hydropathy', 'volume', 'charge']);
  // Methionine's published values, which the protein scene prints.
  assert.deepEqual(G.PROPS[G.aaIndex('M')], [1.9, 162.9, 0]);
  // Isoleucine is the most hydrophobic, arginine the least: the two ends of
  // the axis the chain is drawn along.
  const hydro = G.PROPS.map(r => r[0]);
  assert.equal(G.AAS[hydro.indexOf(Math.max.apply(null, hydro))], 'I');
  assert.equal(G.AAS[hydro.indexOf(Math.min.apply(null, hydro))], 'R');
  // Charge: two negative, two positive, histidine partial, the rest neutral.
  const charged = G.AAS.split('').filter(a => G.PROPS[G.aaIndex(a)][2] !== 0);
  assert.deepEqual(charged.sort(), ['D', 'E', 'H', 'K', 'R']);
  const rows = G.embed(G.PROTEIN);
  assert.equal(rows.length, 60, 'one row per residue');
  assert.deepEqual(rows[0], [1.9, 162.9, 0], 'the chain opens on methionine');
});

test('the match score is a contraction, and it separates one window', () => {
  const guide = G.windows(G.CDS, 20).at(40);
  assert.equal(guide, 'GTAAAACTCTAAGATTTGAG');
  const scores = G.matchScores(guide, G.CDS);
  assert.equal(scores.length, 161);
  for (const s of scores) assert.ok(Number.isInteger(s) && s >= 0 && s <= 20);
  // The window the guide came from is the only perfect one, and the runner-up
  // is a long way behind -- which is the claim the search scene makes.
  assert.equal(scores[40], 20);
  assert.equal(scores.filter(s => s === 20).length, 1);
  const top = G.topMatches(scores, 3);
  assert.deepEqual(top.map(t => t.at), [40, 90, 21]);
  assert.deepEqual(top.map(t => t.score), [20, 12, 11]);
  assert.equal(G.max(scores), 20);
});

test('a third operand adds a weight per position, not a new idea', () => {
  const guide = G.windows(G.CDS, 20).at(40);
  const ones = new Array(20).fill(1);
  assert.deepEqual(G.weightedScores(guide, G.CDS, ones), G.matchScores(guide, G.CDS));
  // Weighting the first ten positions only: the perfect window keeps half.
  const half = ones.map((v, i) => (i < 10 ? 1 : 0));
  assert.equal(G.weightedScores(guide, G.CDS, half)[40], 10);
  assert.throws(() => G.weightedScores(guide, G.CDS, [1, 1]), /one weight per position/);
});

test('mutating the guide walks the score down one base at a time', () => {
  const guide = G.windows(G.CDS, 20).at(40);
  assert.equal(G.mutate(guide, 0), guide);
  for (let k = 0; k <= 20; k++) {
    const m = G.mutate(guide, k);
    assert.equal(m.length, 20);
    // Every swap is a real change, so the score against its own window falls
    // by exactly one per mismatch.
    assert.equal(G.matchScores(m, G.CDS)[40], 20 - k, `${k} mismatches`);
  }
  // Deterministic and outside-in: position 0 first, then the last.
  assert.equal(G.mutate(guide, 1)[0], 'T');
  assert.equal(G.mutate(guide, 2)[19], 'T');
  assert.equal(G.mutate(guide, 2).slice(1, 19), guide.slice(1, 19));
  assert.throws(() => G.mutate(guide, 21), /bad mismatch count/);
});

test('the motif mask is one flag per window, and masking is a product', () => {
  const mask = G.motifMask(G.CDS, 20);
  assert.equal(mask.length, 161);
  for (const m of mask) assert.ok(m === 0 || m === 1);
  assert.equal(mask.reduce((a, b) => a + b, 0), 6, 'six windows carry the motif');
  assert.equal(G.MOTIF, 'TTTV');
  // V is any base but T, which is what makes the motif four characters and
  // three of them fixed.
  assert.equal(G.motifAt('TTTA', 0), true);
  assert.equal(G.motifAt('TTTG', 0), true);
  assert.equal(G.motifAt('TTTT', 0), false, 'V is not T');
  assert.equal(G.motifAt('ATTTA', 0), false);
  assert.equal(G.motifAt('TTT', 0), false, 'it runs off the end');
  const scores = G.matchScores(G.windows(G.CDS, 20).at(40), G.CDS);
  const masked = G.maskedScores(scores, mask);
  assert.equal(masked.length, scores.length);
  for (let i = 0; i < masked.length; i++) {
    assert.equal(masked[i], mask[i] ? scores[i] : 0);
  }
});

test('the batch adds one index in front and changes nothing else', () => {
  const w = G.windows(G.CDS, 20);
  const guides = [w.at(40), G.mutate(w.at(40), 2), w.at(90)];
  const rows = G.batchScores(guides, G.CDS);
  assert.equal(rows.length, 3, 'G');
  for (const row of rows) assert.equal(row.length, 161, 'W');
  // Each row is exactly what the same guide scores on its own.
  for (let g = 0; g < guides.length; g++) {
    assert.deepEqual(rows[g], G.matchScores(guides[g], G.CDS));
  }
  assert.equal(rows[0][40], 20);
  assert.equal(rows[1][40], 18, 'two mismatches cost two');
  assert.equal(rows[2][90], 20);
});

test('index helpers refuse what is not a base or a residue', () => {
  assert.equal(G.baseIndex('A'), 0);
  assert.equal(G.baseIndex('T'), 3);
  assert.throws(() => G.baseIndex('U'), /not a base/);
  assert.equal(G.aaIndex('A'), 0);
  assert.equal(G.aaIndex('Y'), 19);
  assert.equal(G.aaIndex(G.STOP), 20);
  assert.throws(() => G.aaIndex('B'), /not a residue/);
  near(G.PROPS[G.aaIndex('W')][1], 227.8, 1e-9, 'tryptophan is the largest');
});

test('the tallies a claim card quotes are the core\'s, and these are them', () => {
  // Redundancy, as the codon cube and the code slices both print it.
  assert.equal(G.synonymCount(G.aaIndex('M')), 1, 'methionine has one codon');
  assert.equal(G.synonymCount(G.aaIndex('W')), 1, 'tryptophan has one');
  for (const a of ['L', 'R', 'S']) assert.equal(G.synonymCount(G.aaIndex(a)), 6, `${a} has six`);
  assert.equal(G.synonymCount(20), 3, 'three stops');
  assert.equal(G.fixedBoxes(), 8, 'eight of the sixteen first-two-base pairs fix the residue');
  let boxesByHand = 0;
  for (const a of 'ACGT') for (const b of 'ACGT') {
    if (new Set([...'ACGT'].map((c) => G.translate(a + b + c))).size === 1) boxesByHand++;
  }
  assert.equal(G.pairFixed(0, 0), false, 'AA: AAA and AAT are not one residue');
  assert.equal(G.pairFixed(2, 3), true, 'GT: GTx is valine whatever the third base');
  assert.equal(G.fixedBoxes(), boxesByHand, 'fixedBoxes agrees with a direct count');
  // Every codon is spent on something, so the tallies sum to 64.
  let total = 0;
  for (let i = 0; i <= 20; i++) total += G.synonymCount(i);
  assert.equal(total, 64);

  // The gap the search scene is built on: one perfect window, runner-up 12.
  const scores = G.matchScores(G.windows(G.CDS, 20).at(40), G.CDS);
  const spread = G.scoreSpread(scores);
  assert.deepEqual(spread, {top: 20, count: 1, runnerUp: 12});
  // Walk the guide off and the top comes down with it, still alone.
  const walked = G.matchScores(G.mutate(G.windows(G.CDS, 20).at(40), 3), G.CDS);
  assert.equal(G.scoreSpread(walked).top, 17);
  // A spread over one value has no runner-up below it, and says so rather
  // than returning -Infinity into a readout.
  assert.deepEqual(G.scoreSpread([4, 4, 4]), {top: 4, count: 3, runnerUp: 4});

  // 60 residues land on far fewer distinct points, which the protein scene
  // prints as the reason its chain revisits places.
  assert.equal(G.distinctResidues(G.PROTEIN), 18);
  assert.equal(G.distinctResidues('AAA'), 1);
  assert.equal(G.distinctResidues(''), 0);
});

test('the mean score over all 161 windows is the chance level the search predict turns on', () => {
  const scores = G.matchScores(G.windows(G.CDS, 20).at(40), G.CDS);
  let sum = 0;
  for (const v of scores) sum += v;
  assert.equal(G.meanScore(scores), sum / 161);
  assert.equal(scores.length, 161);
  // Far below the runner-up and near the one-in-four a random pair agrees at.
  assert.ok(G.meanScore(scores) > 3 && G.meanScore(scores) < 7);
  assert.equal(G.meanScore([2, 4, 6]), 4);
  assert.equal(G.meanScore([]), 0);
});

test('a third-base swap: which codons it cannot change, counted from the table', () => {
  assert.deepEqual(G.thirdSwaps('CTA'), ['L', 'L', 'L', 'L']);
  assert.deepEqual(G.thirdSwaps('ATG'), ['I', 'I', 'M', 'I']);
  // The count agrees with an independent loop over the gene's own codons.
  let want = 0;
  for (let n = 0; n < 60; n++) {
    const c = G.CDS.substr(n * 3, 3);
    if (['A', 'C', 'G', 'T'].every((b) => G.CODE[c.slice(0, 2) + b] === G.CODE[c])) want++;
  }
  assert.equal(G.wobbleSilent(G.CDS), want);
  assert.ok(want > 0 && want < 60);
  assert.equal(G.wobbleSilent('CTA'), 1);
  assert.equal(G.wobbleSilent('ATG'), 0);
});

test('the property space is on one footing, and it means something', () => {
  // Every axis runs exactly -1..1 over the 20-row table, so none dominates.
  const S = G.PROPS.map(G.scaleProps);
  for (let d = 0; d < 3; d++) {
    assert.equal(Math.min(...S.map((r) => r[d])), -1);
    assert.equal(Math.max(...S.map((r) => r[d])), 1);
  }
  // Chemically alike kinds are neighbours: isoleucine's is leucine (same
  // volume, a little less hydrophobic), and the charged pairs sit together.
  assert.equal(G.nearestKind('I').aa, 'L');
  assert.equal(G.nearestKind('L').aa, 'I');
  assert.equal(G.nearestKind('K').aa, 'R');
  assert.equal(G.nearestKind('D').aa, 'E');
  assert.equal(G.nearestKind('E').aa, 'D');
  assert.ok(Math.abs(G.nearestKind('I').distance - 0.1556) < 1e-3);
  // A kind is never its own neighbour.
  for (const a of G.AAS) assert.notEqual(G.nearestKind(a).aa, a);
});

test('the fold: 1,300 residues, three coordinates each, and one grid of distances', () => {
  const F = require('../interactive/genome-fold.js');
  assert.equal(F.seq.length, 1300);
  assert.equal(F.ca.length, 3 * 1300);
  assert.equal(F.plddt.length, 1300);
  // The structure is of the protein this gene encodes: its first 60 residues
  // are the core's own PROTEIN, which is the deposited translation of CDS.
  assert.equal(F.seq.slice(0, 60), G.PROTEIN);

  const Y = G.points(F.ca), X = Y.slice(0, 60);
  assert.equal(Y.length, 1300);
  assert.deepEqual(Y[0], F.ca.slice(0, 3));
  assert.throws(() => G.points([1, 2, 3, 4]), /not a run of x, y, z/);

  // (60, 3) against (1300, 3) is (60, 1300), and one cell of it by hand.
  const D = G.pairDistances(X, Y);
  assert.equal(D.length, 60);
  assert.equal(D[0].length, 1300);
  const by = Math.hypot(X[3][0] - Y[1056][0], X[3][1] - Y[1056][1], X[3][2] - Y[1056][2]);
  assert.ok(Math.abs(D[3][1056] - by) < 1e-9);
  for (let i = 0; i < 60; i++) assert.equal(D[i][i], 0);

  // The one number that does not depend on the fold: neighbouring
  // alpha-carbons are about 3.8 angstroms apart, all 1,299 times.
  const bonds = G.bondLengths(Y);
  assert.equal(bonds.length, 1299);
  for (const b of bonds) assert.ok(b > 3.6 && b < 4.05, `a bond of ${b}`);
  assert.ok(Math.abs(G.mean(bonds) - 3.85) < 0.01);

  // What the fold scene quotes at its opening cutoff of 8 angstroms: 556
  // close pairs, 40 of the 60 rows reaching more than 100 positions down the
  // chain, and residue 4 lying 7.7 angstroms from residue 1,057.
  const s = G.foldSummary(D, 8, 100);
  assert.equal(s.pairs, 556);
  assert.equal(s.rows, 40);
  assert.equal(s.farthest.i, 3);
  assert.equal(s.farthest.j, 1056);
  assert.equal(s.farthest.apart, 1053);
  assert.equal(s.farthest.d.toFixed(1), '7.7');
  // And at the residue it opens on, the tenth.
  assert.equal(G.closeTo(D, 9, 8).length, 10);
  const far = G.farthestPartner(D, 9, 8);
  assert.equal(far.j, 1055);
  assert.equal(far.apart, 1046);
  // A tighter cutoff can only lose pairs.
  assert.ok(G.foldSummary(D, 5, 100).pairs < s.pairs);
  // The model's own confidence, averaged over the protein.
  assert.equal(G.mean(F.plddt).toFixed(1), '92.9');
  assert.equal(G.mean([]), 0);
});
