/*
 * genome-core.js -- the arithmetic behind "DNA to an edit".
 *
 * Only arithmetic lives here: no DOM, no drawing, no copy. Every number the
 * stage prints comes out of this file, and tests/genome_core.test.cjs pins it.
 * The scenes draw; this decides.
 *
 * Provenance for the two sequence literals is the ledger in
 * interactive/genome-scenes/README.md -- record URL, the SHA-256 of the record
 * as fetched, the date, and the command that produced the literal. Both were
 * piped in, never retyped. `PROTEIN` is not decoration: it is the published
 * translation of `CDS`, so the test can check this file's genetic code against
 * an outside authority rather than against itself.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GenomeCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // The one-hot axis is alphabetical, so a reader can find a row without a
  // legend. RNA swaps one label and nothing else, which is the whole point of
  // the transcription scene.
  var BASES = "ACGT";
  var RNA_BASES = "ACGU";
  var AAS = "ACDEFGHIKLMNPQRSTVWY";   // 20, alphabetical; "*" is the stop
  var STOP = "*";

  // 180 bases: the first 60 codons of the cas12a coding sequence, starting at
  // its initiator ATG. Short on purpose -- enough to draw, and no construct.
  var CDS =
  "ATGTCAATTTATCAAGAATTTGTTAATAAATATAGTTTAAGTAAAACTCTAAGATTTGAG" +
  "TTAATCCCACAGGGTAAAACACTTGAAAACATAAAAGCAAGAGGTTTGATTTTAGATGAT" +
  "GAGAAAAGAGCTAAAGACTACAAAAAGGCTAAACAAATAATTGATAAATATCATCAGTTT";

  // The published translation of those 180 bases, as deposited. The test
  // translates CDS with the table below and requires this exactly, which is
  // what pins CODE without trusting it.
  var PROTEIN = "MSIYQEFVNKYSLSKTLRFELIPQGKTLENIKARGLILDDEKRAKDYKKAKQIIDKYHQF";

  // The standard genetic code, written in the classic TCAG x TCAG x TCAG
  // order so the block structure is visible in the source: read four rows of
  // sixteen. Verified against all 1300 residues of the full protein, not just
  // the 60 kept here.
  var TCAG = "TCAG";
  var CODE_STRING =
    "FFLLSSSSYY**CC*W" +   // T..
    "LLLLPPPPHHQQRRRR" +   // C..
    "IIIMTTTTNNKKSSRR" +   // A..
    "VVVVAAAADDEEGGGG";    // G..

  var CODE = (function () {
    var m = {}, i, j, k;
    for (i = 0; i < 4; i++) {
      for (j = 0; j < 4; j++) {
        for (k = 0; k < 4; k++) {
          m[TCAG[i] + TCAG[j] + TCAG[k]] = CODE_STRING[i * 16 + j * 4 + k];
        }
      }
    }
    return m;
  })();

  // Two published per-residue scales and the charge at pH 7, in AAS order.
  // Hydropathy is Kyte & Doolittle (1982); volume is the residue volume in
  // cubic angstroms (Zamyatnin 1972). Histidine carries the partial charge it
  // is usually given at pH 7 rather than a whole one.
  var HYDRO = {A: 1.8, C: 2.5, D: -3.5, E: -3.5, F: 2.8, G: -0.4, H: -3.2,
    I: 4.5, K: -3.9, L: 3.8, M: 1.9, N: -3.5, P: -1.6, Q: -3.5, R: -4.5,
    S: -0.8, T: -0.7, V: 4.2, W: -0.9, Y: -1.3};
  var VOLUME = {A: 88.6, C: 108.5, D: 111.1, E: 138.4, F: 189.9, G: 60.1,
    H: 153.2, I: 166.7, K: 168.6, L: 166.7, M: 162.9, N: 114.1, P: 112.7,
    Q: 143.8, R: 173.4, S: 89.0, T: 116.1, V: 140.0, W: 227.8, Y: 193.6};
  var CHARGE = {D: -1, E: -1, K: 1, R: 1, H: 0.1};

  // 20 x 3. This is the matrix the embedding scene contracts against, and the
  // reason an embedding is a contraction and not a lookup: three numbers per
  // residue, one row per residue, one matrix product.
  var PROPS = AAS.split("").map(function (a) {
    return [HYDRO[a], VOLUME[a], CHARGE[a] || 0];
  });
  var PROP_NAMES = ["hydropathy", "volume", "charge"];

  function baseIndex(ch) {
    var i = BASES.indexOf(ch);
    if (i < 0) throw new Error("not a base: " + ch);
    return i;
  }

  function aaIndex(ch) {
    if (ch === STOP) return 20;
    var i = AAS.indexOf(ch);
    if (i < 0) throw new Error("not a residue: " + ch);
    return i;
  }

  // (L, 4): one row per position, one column per base, exactly one 1 per row.
  function oneHot(seq) {
    return seq.split("").map(function (ch) {
      var row = [0, 0, 0, 0];
      row[baseIndex(ch)] = 1;
      return row;
    });
  }

  // How far apart two bases are once they are one-hot rows: the Euclidean
  // distance between them. It is the square root of 2 for every pair of
  // different letters, which is the whole argument for one-hot over numbering
  // the bases 1 to 4 -- no base is nearer to one than to another.
  function oneHotDistance(a, b) {
    var u = oneHot(a)[0], v = oneHot(b)[0], d = 0, i;
    for (i = 0; i < 4; i++) d += (u[i] - v[i]) * (u[i] - v[i]);
    return Math.sqrt(d);
  }

  // The two 4 x 4 matrices the transcription scene puts side by side.
  // T -> U moves no number at all: it is the identity, and only the label on
  // the axis changes. The complement swaps A with T and C with G, which in
  // alphabetical order is the reversal permutation -- the anti-diagonal.
  var RELABEL = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  var COMPLEMENT = [[0, 0, 0, 1], [0, 0, 1, 0], [0, 1, 0, 0], [1, 0, 0, 0]];

  function matrixFor(mode) {
    if (mode === "relabel") return RELABEL;
    if (mode === "complement") return COMPLEMENT;
    throw new Error("no such transcription: " + mode);
  }

  // (L, 4) x (4, 4) -> (L, 4). The alphabet axis is the one that contracts.
  function applyAlphabet(rows, M) {
    return rows.map(function (row) {
      var out = [0, 0, 0, 0], b, c;
      for (b = 0; b < 4; b++) {
        if (!row[b]) continue;
        for (c = 0; c < 4; c++) out[c] += row[b] * M[b][c];
      }
      return out;
    });
  }

  function decode(rows, alphabet) {
    return rows.map(function (row) {
      var best = 0, b;
      for (b = 1; b < 4; b++) if (row[b] > row[best]) best = b;
      return alphabet[best];
    }).join("");
  }

  // The coding strand transcribes by relabelling; the template strand has to
  // be complemented first. Both are the same contraction with a different
  // 4 x 4 in the middle.
  function transcribe(seq, mode) {
    return decode(applyAlphabet(oneHot(seq), matrixFor(mode || "relabel")), RNA_BASES);
  }

  // The strand the polymerase actually reads. Paired base for base with the
  // coding strand, so at every position it is the complement -- and on a
  // one-hot grid in alphabetical order that is the alphabet axis reversed,
  // X[:, ::-1], the same anti-diagonal matrix again. Transcribing it by that
  // matrix gives back the coding strand's letters with U for T: the
  // complement of a complement, J @ J = I, which is why the RNA reads like
  // the strand that was never touched.
  function templateStrand(seq) {
    return decode(applyAlphabet(oneHot(seq), COMPLEMENT), BASES);
  }

  // How many ones sit in a different column of `out` than of `rows`: what a
  // 4 x 4 moved. 0 for the identity, every row for the anti-diagonal.
  function movedOnes(rows, out) {
    var n = 0, i;
    for (i = 0; i < rows.length; i++) if (rows[i].indexOf(1) !== out[i].indexOf(1)) n++;
    return n;
  }

  // A window is a view, not a copy: `count` of them, each `width` wide, and
  // `at(i)` reads straight out of the original string. Nothing is duplicated,
  // which is the same stride argument the image visualizer makes.
  function windows(seq, width) {
    if (width < 1 || width > seq.length) throw new Error("bad window: " + width);
    return {
      width: width,
      count: seq.length - width + 1,
      shape: [seq.length - width + 1, width, 4],
      at: function (i) { return seq.substr(i, width); }
    };
  }

  // How many windows contain base i: the window array repeats every stored
  // base, and this is how often. Windows w with w <= i < w + width, w in range.
  function appearances(length, width, i) {
    var lo = Math.max(0, i - width + 1), hi = Math.min(i, length - width);
    return Math.max(0, hi - lo + 1);
  }

  // A codon is the outer product of three one-hot vectors, so as a 4 x 4 x 4
  // it has exactly one non-zero -- rank one, and the cheapest possible tensor
  // that still needs three indices to address.
  function codonTensor(codon) {
    var a = baseIndex(codon[0]), b = baseIndex(codon[1]), c = baseIndex(codon[2]);
    var T = [], i, j, k;
    for (i = 0; i < 4; i++) {
      T.push([]);
      for (j = 0; j < 4; j++) {
        T[i].push([]);
        for (k = 0; k < 4; k++) T[i][j].push(i === a && j === b && k === c ? 1 : 0);
      }
    }
    return T;
  }

  function nonZeros(T) {
    var n = 0, i, j, k;
    for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) for (k = 0; k < 4; k++) if (T[i][j][k]) n++;
    return n;
  }

  // The genetic code as a 4 x 4 x 4 table of residue indices, on the same
  // alphabetical axis as everything else. 20 is the stop. This is the tensor
  // the codon cube draws, and its blocks of one colour are the redundancy.
  var CODE_T = (function () {
    var T = [], i, j, k;
    for (i = 0; i < 4; i++) {
      T.push([]);
      for (j = 0; j < 4; j++) {
        T[i].push([]);
        for (k = 0; k < 4; k++) T[i][j].push(aaIndex(CODE[BASES[i] + BASES[j] + BASES[k]]));
      }
    }
    return T;
  })();

  function codonAt(seq, n) { return seq.substr(n * 3, 3); }
  function codonCount(seq) { return Math.floor(seq.length / 3); }

  // The reshape the codon scene is named after: (L, 4) -> (L/3, 3, 4), free,
  // because the bases were already in that order in memory.
  function codonGrid(seq) {
    var rows = oneHot(seq), out = [], n;
    for (n = 0; n < codonCount(seq); n++) out.push(rows.slice(n * 3, n * 3 + 3));
    return out;
  }

  // Translation by table lookup -- the obvious way.
  function translate(seq) {
    var out = "", n;
    for (n = 0; n < codonCount(seq); n++) out += CODE[codonAt(seq, n)];
    return out;
  }

  // Translation as a contraction: each codon's rank-one 4 x 4 x 4 against the
  // code table, summed over all three base axes. Same answer, and the test
  // requires that it is the same answer, because "einsum" has to mean
  // something a reader can check.
  function translateByContraction(seq) {
    var out = "", n, T, i, j, k, acc;
    for (n = 0; n < codonCount(seq); n++) {
      T = codonTensor(codonAt(seq, n));
      acc = 0;
      for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) for (k = 0; k < 4; k++) {
        acc += T[i][j][k] * CODE_T[i][j][k];
      }
      out += acc === 20 ? STOP : AAS[acc];
    }
    return out;
  }

  // (P, 20) x (20, 3) -> (P, 3). The chain the protein scene draws.
  function embed(protein) {
    return protein.split("").map(function (a) {
      if (a === STOP) return [0, 0, 0];
      return PROPS[aaIndex(a)].slice();
    });
  }

  // How many of the window's bases the guide agrees with. As a contraction it
  // is einsum('wlb,lb->w') over the position and alphabet axes at once: the
  // dot product of two one-hot rows is 1 exactly when the bases match, so the
  // sum over both axes counts matches. Integers, so a reader can count them.
  function matchScores(guide, seq) {
    var w = windows(seq, guide.length), out = [], i, l, n;
    for (i = 0; i < w.count; i++) {
      n = 0;
      for (l = 0; l < guide.length; l++) if (seq[i + l] === guide[l]) n++;
      out.push(n);
    }
    return out;
  }

  // The same contraction with a third operand: a weight per position. With
  // every weight 1 it is matchScores again, which the test checks -- an
  // einsum gains an operand without gaining a new idea.
  function weightedScores(guide, seq, weights) {
    if (weights.length !== guide.length) throw new Error("one weight per position");
    var w = windows(seq, guide.length), out = [], i, l, s;
    for (i = 0; i < w.count; i++) {
      s = 0;
      for (l = 0; l < guide.length; l++) if (seq[i + l] === guide[l]) s += weights[l];
      out.push(s);
    }
    return out;
  }

  // Cas12a needs a short T-rich motif immediately before the stretch it
  // pairs with. As a tensor that is a boolean per window, and the picture is
  // the scores multiplied by it -- a mask is broadcasting, nothing more.
  var MOTIF = "TTTV";                      // V is any of A, C or G
  function motifAt(seq, i, motif) {
    var m = motif || MOTIF, k;
    if (i < 0 || i + m.length > seq.length) return false;
    for (k = 0; k < m.length; k++) {
      var want = m[k], got = seq[i + k];
      if (want === "V") { if (got === "T") return false; }
      else if (want !== got) return false;
    }
    return true;
  }

  // One flag per window: is the motif sitting immediately upstream of it?
  function motifMask(seq, width, motif) {
    var m = motif || MOTIF, w = windows(seq, width), out = [], i;
    for (i = 0; i < w.count; i++) out.push(motifAt(seq, i - m.length, m) ? 1 : 0);
    return out;
  }

  function maskedScores(scores, mask) {
    return scores.map(function (s, i) { return s * mask[i]; });
  }

  // Walk the guide away from a window it matches exactly, one base at a time,
  // deterministically: position 0 first, then the last, then inwards. No
  // randomness, so the readout is reproducible and the test can name numbers.
  var SWAP = {A: "C", C: "A", G: "T", T: "G"};
  function mutate(guide, k) {
    if (k < 0 || k > guide.length) throw new Error("bad mismatch count: " + k);
    var order = [], lo = 0, hi = guide.length - 1, out = guide.split("");
    while (lo <= hi) { order.push(lo++); if (lo <= hi) order.push(hi--); }
    for (var n = 0; n < k; n++) out[order[n]] = SWAP[out[order[n]]];
    return out.join("");
  }

  // (G, W): one row per guide, the same einsum with one more index in front.
  function batchScores(guides, seq) {
    return guides.map(function (g) { return matchScores(g, seq); });
  }

  function topMatches(scores, n) {
    return scores.map(function (s, i) { return {at: i, score: s}; })
      .sort(function (a, b) { return b.score - a.score || a.at - b.at; })
      .slice(0, n === undefined ? 1 : n);
  }

  // How many of the 64 codons code for one residue. A tally over the table
  // rather than new biology -- but it is the number the codon cube and the
  // code slices both put on their claim card ("6 codons", "1 codon"), so it
  // is pinned here rather than counted twice in two scenes.
  function synonymCount(idx) {
    var n = 0, i, j, k;
    for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) for (k = 0; k < 4; k++) {
      if (CODE_T[i][j][k] === idx) n++;
    }
    return n;
  }

  // How many windows tie for the top score, and what the next score down is.
  // The gap between them is the search scene's whole claim -- one window at
  // 20 and the runner-up at 12 is what makes a contraction a search rather
  // than a ranking -- so both are pinned.
  function scoreSpread(scores) {
    var top = max(scores), n = 0, next = -Infinity, i;
    for (i = 0; i < scores.length; i++) {
      if (scores[i] === top) n++;
      else if (scores[i] > next) next = scores[i];
    }
    return {top: top, count: n, runnerUp: next === -Infinity ? top : next};
  }

  // The average score over every window: the chance level the search scene's
  // predict question turns on. Two unrelated 20-base stretches agree at about
  // five places, so the best wrong window is judged against this.
  function meanScore(scores) {
    var sum = 0, i;
    for (i = 0; i < scores.length; i++) sum += scores[i];
    return scores.length ? sum / scores.length : 0;
  }

  // Distinct residues in a chain. The protein scene draws 60 beads that land
  // on far fewer points, and says so.
  function distinctResidues(protein) {
    var seen = {}, n = 0, i;
    for (i = 0; i < protein.length; i++) {
      if (!seen[protein[i]]) { seen[protein[i]] = 1; n++; }
    }
    return n;
  }

  // Swapping only the third base of a codon: the residues the four choices
  // give, in alphabetical A C G T order, and for how many codons of a coding
  // sequence every one of them is the same residue (the wobble position,
  // where the code's blocks of one colour pay off). Counted from the table.
  function thirdSwaps(codon) {
    var out = [], k;
    for (k = 0; k < 4; k++) out.push(CODE[codon.slice(0, 2) + BASES[k]]);
    return out;
  }
  function wobbleSilent(seq) {
    var n = 0, i, s;
    for (i = 0; i < codonCount(seq); i++) {
      s = thirdSwaps(codonAt(seq, i));
      if (s[0] === s[1] && s[1] === s[2] && s[2] === s[3]) n++;
    }
    return n;
  }

  // The embedding table on one footing. Volume runs 60-228 and charge only
  // -1..1, so every axis is mapped to [-1, 1] by the extremes of the 20 x 3
  // table itself (not of any one protein): the same residue is at the same
  // point in any chain, and "near" means near on all three at once.
  var PROP_LO = [0, 1, 2].map(function (d) {
    return Math.min.apply(null, PROPS.map(function (r) { return r[d]; }));
  });
  var PROP_HI = [0, 1, 2].map(function (d) {
    return Math.max.apply(null, PROPS.map(function (r) { return r[d]; }));
  });
  function scaleProps(row) {
    return row.map(function (v, d) { return 2 * (v - PROP_LO[d]) / (PROP_HI[d] - PROP_LO[d]) - 1; });
  }
  // The kind whose row of the scaled table lies nearest this one's (itself
  // excluded), and how far: what it means for the space to mean something.
  function nearestKind(aa) {
    var from = scaleProps(PROPS[aaIndex(aa)]), best = null, bd = Infinity;
    AAS.split("").forEach(function (b, i) {
      if (b === aa) return;
      var to = scaleProps(PROPS[i]);
      var d = Math.sqrt(from.reduce(function (acc, v, k) { return acc + (v - to[k]) * (v - to[k]); }, 0));
      if (d < bd) { bd = d; best = b; }
    });
    return {aa: best, distance: bd};
  }

  function max(list) { return list.reduce(function (a, b) { return b > a ? b : a; }, -Infinity); }

  // ---- the fold. A structure is (N, 3): one row per residue, x, y and z of
  // its alpha-carbon in angstroms. The numbers themselves are not here --
  // they are the generated literal in genome-fold.js -- only what is done
  // with them is.

  // The free reshape: a flat run of 3N numbers read as N rows of three.
  function points(flat) {
    if (flat.length % 3) throw new Error("not a run of x, y, z: " + flat.length);
    var out = [], i;
    for (i = 0; i < flat.length; i += 3) out.push([flat[i], flat[i + 1], flat[i + 2]]);
    return out;
  }

  // (A, 3) against (B, 3) -> (A, B): every distance between a row of X and a
  // row of Y. In NumPy this is one broadcast, X[:, None, :] - Y[None, :, :],
  // squared and summed over the last axis; the two loops here are that
  // subtraction written out, and the test checks a cell of it by hand.
  function pairDistances(X, Y) {
    return X.map(function (a) {
      return Y.map(function (b) {
        var dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      });
    });
  }

  // Row i of D is residue i of the stretch, and since the stretch is the
  // start of the chain, column i is the same residue: D[i][i] is 0 and is
  // not a pair. Everything else under the cutoff is.
  function closeTo(D, i, cutoff) {
    var out = [], j;
    for (j = 0; j < D[i].length; j++) if (j !== i && D[i][j] < cutoff) out.push(j);
    return out;
  }

  // What the grid says about the fold, as the fold scene quotes it: how many
  // pairs are under the cutoff, how many rows have a partner more than `far`
  // residues down the chain, and the pair that is farthest apart in the
  // sequence while still close in space.
  function foldSummary(D, cutoff, far) {
    var pairs = 0, rows = 0, best = null, i, j, reach, sep;
    for (i = 0; i < D.length; i++) {
      reach = false;
      for (j = 0; j < D[i].length; j++) {
        if (j === i || D[i][j] >= cutoff) continue;
        pairs++;
        sep = Math.abs(j - i);
        if (sep > far) reach = true;
        if (!best || sep > best.apart) best = {i: i, j: j, apart: sep, d: D[i][j]};
      }
      if (reach) rows++;
    }
    return {pairs: pairs, rows: rows, farthest: best};
  }

  // The farthest-in-sequence residue that is close to residue i, or null.
  function farthestPartner(D, i, cutoff) {
    var best = null, j;
    for (j = 0; j < D[i].length; j++) {
      if (j === i || D[i][j] >= cutoff) continue;
      if (!best || Math.abs(j - i) > best.apart) best = {j: j, apart: Math.abs(j - i), d: D[i][j]};
    }
    return best;
  }

  // The distance from each residue to the next along the chain. It is the
  // one number in a fold that does not depend on the fold: two neighbouring
  // alpha-carbons are about 3.8 angstroms apart in every protein.
  function bondLengths(X) {
    var out = [], i;
    for (i = 0; i + 1 < X.length; i++) out.push(pairDistances([X[i]], [X[i + 1]])[0][0]);
    return out;
  }

  function mean(list) {
    if (!list.length) return 0;
    return list.reduce(function (a, b) { return a + b; }, 0) / list.length;
  }

  return {
    BASES: BASES, RNA_BASES: RNA_BASES, AAS: AAS, STOP: STOP,
    CDS: CDS, PROTEIN: PROTEIN, CODE: CODE, CODE_T: CODE_T,
    PROPS: PROPS, PROP_NAMES: PROP_NAMES, MOTIF: MOTIF,
    RELABEL: RELABEL, COMPLEMENT: COMPLEMENT,
    baseIndex: baseIndex, aaIndex: aaIndex, oneHot: oneHot, oneHotDistance: oneHotDistance,
    matrixFor: matrixFor, applyAlphabet: applyAlphabet, decode: decode,
    transcribe: transcribe, templateStrand: templateStrand, movedOnes: movedOnes, windows: windows, appearances: appearances,
    codonTensor: codonTensor, nonZeros: nonZeros, codonGrid: codonGrid,
    codonAt: codonAt, codonCount: codonCount,
    translate: translate, translateByContraction: translateByContraction,
    embed: embed, matchScores: matchScores, weightedScores: weightedScores,
    motifAt: motifAt, motifMask: motifMask, maskedScores: maskedScores,
    mutate: mutate, batchScores: batchScores, topMatches: topMatches, max: max,
    synonymCount: synonymCount, scoreSpread: scoreSpread, meanScore: meanScore,
    distinctResidues: distinctResidues,
    thirdSwaps: thirdSwaps, wobbleSilent: wobbleSilent,
    points: points, pairDistances: pairDistances, closeTo: closeTo, foldSummary: foldSummary,
    farthestPartner: farthestPartner, bondLengths: bondLengths, mean: mean,
    scaleProps: scaleProps, nearestKind: nearestKind
  };
});
