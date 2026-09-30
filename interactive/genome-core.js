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

  function max(list) { return list.reduce(function (a, b) { return b > a ? b : a; }, -Infinity); }

  return {
    BASES: BASES, RNA_BASES: RNA_BASES, AAS: AAS, STOP: STOP,
    CDS: CDS, PROTEIN: PROTEIN, CODE: CODE, CODE_T: CODE_T,
    PROPS: PROPS, PROP_NAMES: PROP_NAMES, MOTIF: MOTIF,
    RELABEL: RELABEL, COMPLEMENT: COMPLEMENT,
    baseIndex: baseIndex, aaIndex: aaIndex, oneHot: oneHot,
    matrixFor: matrixFor, applyAlphabet: applyAlphabet, decode: decode,
    transcribe: transcribe, windows: windows,
    codonTensor: codonTensor, nonZeros: nonZeros, codonGrid: codonGrid,
    codonAt: codonAt, codonCount: codonCount,
    translate: translate, translateByContraction: translateByContraction,
    embed: embed, matchScores: matchScores, weightedScores: weightedScores,
    motifAt: motifAt, motifMask: motifMask, maskedScores: maskedScores,
    mutate: mutate, batchScores: batchScores, topMatches: topMatches, max: max
  };
});
