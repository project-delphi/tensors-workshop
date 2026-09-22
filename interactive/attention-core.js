// The arithmetic under the attention stage: the embedding lookup, the three
// projections, the reshape-then-transpose that gives each head its own axis
// (and the direct reshape that does not), the two contractions attention is
// built from, and the row/column bookkeeping the readouts quote. Kept apart
// from the widget's HTML so `npm test` can pin it without a browser
// (tests/attention_core.test.cjs), for the reason tensor-core.js and
// linalg-core.js exist: this is the lesson the widget is there to show, and a
// wrong number here is a wrong claim on screen rather than a broken page.
//
// A plain script, not a module: the widget loads it with a <script src> so it
// works from file:// and Node picks it up through module.exports.
//
// Matrices are arrays of rows, `A[i][j]`. A per-head tensor is `T[h][i][j]`.
// Nothing here mutates an argument.
(function (root) {
  "use strict";

  // The seed every picture on the stage opens from. Chosen so every Q, K, V
  // entry lands as an integer with |value| <= 3 and every unscaled score is
  // an integer (a half once divided by sqrt(D_k) = 2) -- legible numbers a
  // reader can add up by eye. tests/attention_core.test.cjs pins that
  // contract; if a future seed breaks it, the seed is what changes.
  const SEED = 17;
  const D = 8;       // the embedding width
  const S = 4;        // the sequence length (four token ids)
  const H = 2;         // the head count this stage fixes
  const IDS = [3, 1, 4, 1];

  // ─── a tiny deterministic generator ────────────────────────────────────────
  // A linear congruential generator, not Math.random: the same seed has to
  // produce the same numbers in Node (the tests) and in every browser (the
  // page), and Math.random gives neither guarantee.
  function lcg(seed) {
    let s = (seed >>> 0) || 1;
    return function next() {
      // Numerical Recipes' constants, doubled up so the low bits (the ones a
      // small modulus like "0..1" would otherwise draw from) are not the
      // weak ones of a 32-bit LCG.
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  // rows x cols of integers in [lo, hi], inclusive, from one generator.
  function smallInts(seed, rows, cols, lo, hi) {
    const rnd = lcg(seed);
    const span = hi - lo + 1;
    const out = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) row.push(lo + Math.floor(rnd() * span));
      out.push(row);
    }
    return out;
  }

  // A D x D projection with at most `maxNZ` non-zero entries per column, each
  // +-1: X is a 0/1 mask (embedding() below), so a column with k non-zero
  // entries can only ever total between -k and +k -- the legibility contract
  // this whole stage is built to keep.
  function projMatrix(seed, size, maxNZ) {
    const rnd = lcg(seed);
    const M = Array.from({length: size}, () => new Array(size).fill(0));
    for (let j = 0; j < size; j++) {
      const count = 1 + Math.floor(rnd() * maxNZ);
      const rowsUsed = new Set();
      let guard = 0;
      while (rowsUsed.size < count && guard++ < 100) {
        rowsUsed.add(Math.floor(rnd() * size));
      }
      for (const i of rowsUsed) M[i][j] = rnd() < 0.5 ? -1 : 1;
    }
    return M;
  }

  // The six-row embedding table, and the four ids notebook 17 uses. Both
  // fixed by SEED, so the whole stage opens on the same numbers every time.
  function embedding() { return smallInts(SEED, 6, D, 0, 1); }

  // X = E[ids] -- one row per id, in order. A gather, not a matrix product:
  // every row of X is copied whole from E, nothing is computed to build it.
  function gather(E, ids) { return ids.map((i) => E[i].slice()); }

  function projections() {
    return {
      WQ: projMatrix(SEED + 1, D, 3),
      WK: projMatrix(SEED + 2, D, 3),
      WV: projMatrix(SEED + 3, D, 3)
    };
  }

  // ─── plain linear algebra ──────────────────────────────────────────────────

  function transpose(A) {
    if (!A.length) return [];
    return A[0].map((_, j) => A.map((r) => r[j]));
  }

  function matmul(A, B) {
    const Bt = transpose(B);
    return A.map((r) => Bt.map((c) => r.reduce((s, v, i) => s + v * c[i], 0)));
  }

  // ─── heads ──────────────────────────────────────────────────────────────
  // (S, D) -> (S, H, D/H) -> (H, S, D/H): a reshape, then a transpose of the
  // first two axes. Every head keeps every token's own row; only which
  // columns belong to which head changes.
  function splitHeads(X, heads) {
    const s = X.length, d = X[0].length, dh = d / heads;
    const out = [];
    for (let h = 0; h < heads; h++) {
      const head = [];
      for (let i = 0; i < s; i++) {
        const row = [];
        for (let j = 0; j < dh; j++) row.push(X[i][h * dh + j]);
        head.push(row);
      }
      out.push(head);
    }
    return out;
  }

  // The bug: a *direct* reshape of the flat (S, D) buffer into (H, S, D/H),
  // with no transpose. Same shape, wrong contents -- every head after the
  // first is built from rows that belonged to other tokens.
  function splitHeadsWrong(X, heads) {
    const s = X.length, d = X[0].length, dh = d / heads;
    const flat = [];
    for (let i = 0; i < s; i++) for (let j = 0; j < d; j++) flat.push(X[i][j]);
    const out = [];
    for (let h = 0; h < heads; h++) {
      const head = [];
      for (let i = 0; i < s; i++) {
        const row = [];
        for (let j = 0; j < dh; j++) row.push(flat[(h * s + i) * dh + j]);
        head.push(row);
      }
      out.push(head);
    }
    return out;
  }

  // Which cell of X a cell of the reshaped tensor actually came from -- the
  // trace the `heads` scene draws when a reader points at one. `wrong` picks
  // which reshape traceCell is explaining.
  function traceCell(X, heads, wrong, h, s, d) {
    const rows = X.length, cols = X[0].length, dh = cols / heads;
    if (!wrong) return {value: X[s][h * dh + d], from: {s: s, d: h * dh + d}};
    const flatIndex = (h * rows + s) * dh + d;
    const fromS = Math.floor(flatIndex / cols);
    const fromD = flatIndex % cols;
    return {value: X[fromS][fromD], from: {s: fromS, d: fromD}};
  }

  // (H, S, D/H) -> (S, D). The inverse of splitHeads, used to draw the merged
  // output back into one (4, 8) grid.
  function mergeHeads(Xh) {
    const heads = Xh.length, s = Xh[0].length, dh = Xh[0][0].length;
    const out = [];
    for (let i = 0; i < s; i++) {
      const row = [];
      for (let h = 0; h < heads; h++) for (let j = 0; j < dh; j++) row.push(Xh[h][i][j]);
      out.push(row);
    }
    return out;
  }

  // ─── the two contractions ──────────────────────────────────────────────────

  // L[h, s, t] = sum_d Q[h, s, d] K[h, t, d], contracted over d. Scaled
  // divides by sqrt(dk) -- with dk = 4 that is exactly a halving.
  function scores(Q, K, dk, scaled) {
    const heads = Q.length, s = Q[0].length;
    const div = scaled ? Math.sqrt(dk) : 1;
    const out = [];
    for (let h = 0; h < heads; h++) {
      const L = [];
      for (let i = 0; i < s; i++) {
        const row = [];
        for (let j = 0; j < s; j++) {
          let acc = 0;
          for (let d = 0; d < dk; d++) acc += Q[h][i][d] * K[h][j][d];
          row.push(acc / div);
        }
        L.push(row);
      }
      out.push(L);
    }
    return out;
  }

  // Softmax of an (H, S, S) tensor. axis "keys" normalises each row over t
  // (ordinary attention: every query's weights sum to 1 over the keys);
  // axis "queries" normalises each column over s instead, on purpose, so the
  // stage can show that the *other* direction does not sum to 1. Max-shifted
  // for stability, and a masked (-Infinity) entry becomes exactly 0: that is
  // Math.exp(-Infinity), not a rounding accident.
  function softmax(L, axis) {
    const heads = L.length, s = L[0].length, t = L[0][0].length;
    const out = L.map((head) => head.map((row) => row.slice()));
    if (axis === "queries") {
      for (let h = 0; h < heads; h++) {
        for (let j = 0; j < t; j++) {
          let mx = -Infinity;
          for (let i = 0; i < s; i++) mx = Math.max(mx, L[h][i][j]);
          let sum = 0;
          const e = new Array(s);
          for (let i = 0; i < s; i++) { e[i] = Math.exp(L[h][i][j] - mx); sum += e[i]; }
          for (let i = 0; i < s; i++) out[h][i][j] = e[i] / sum;
        }
      }
    } else {
      for (let h = 0; h < heads; h++) {
        for (let i = 0; i < s; i++) {
          let mx = -Infinity;
          for (let j = 0; j < t; j++) mx = Math.max(mx, L[h][i][j]);
          let sum = 0;
          const e = new Array(t);
          for (let j = 0; j < t; j++) { e[j] = Math.exp(L[h][i][j] - mx); sum += e[j]; }
          for (let j = 0; j < t; j++) out[h][i][j] = e[j] / sum;
        }
      }
    }
    return out;
  }

  // A causal mask on an S x S score matrix: position s may attend to key t
  // only where t <= s. Added to the scores before softmax, never after.
  function causalMask(size) {
    const M = [];
    for (let i = 0; i < size; i++) {
      const row = [];
      for (let j = 0; j < size; j++) row.push(j > i ? -Infinity : 0);
      M.push(row);
    }
    return M;
  }

  function applyMask(L, mask) {
    return L.map((head) => head.map((row, i) => row.map((v, j) => v + mask[i][j])));
  }

  // O[h, s, d] = sum_t A[h, s, t] V[h, t, d], contracted over t.
  function attend(A, V) {
    const heads = A.length, s = A[0].length, t = A[0][0].length, dv = V[0][0].length;
    const out = [];
    for (let h = 0; h < heads; h++) {
      const O = [];
      for (let i = 0; i < s; i++) {
        const row = new Array(dv).fill(0);
        for (let j = 0; j < t; j++) {
          const w = A[h][i][j];
          if (w === 0) continue;
          for (let d = 0; d < dv; d++) row[d] += w * V[h][j][d];
        }
        O.push(row);
      }
      out.push(O);
    }
    return out;
  }

  // The whole pipeline, X through to the merged output, for a scene that
  // wants every stage of it at once.
  function attention(X, heads, opts) {
    const o = opts || {};
    const dk = X[0].length / heads;
    const Q = splitHeads(matmul(X, o.WQ), heads);
    const K = splitHeads(matmul(X, o.WK), heads);
    const V = splitHeads(matmul(X, o.WV), heads);
    let L = scores(Q, K, dk, o.scaled !== false);
    if (o.mask) L = applyMask(L, o.mask);
    const A = softmax(L, o.axis || "keys");
    const O = attend(A, V);
    return {Q: Q, K: K, V: V, L: L, A: A, O: O, merged: mergeHeads(O)};
  }

  // 3 D^2, independent of the head count: splitting into more heads only
  // slices the same three D x D matrices differently.
  function paramCount(dim, heads) { return 3 * dim * dim; }

  function elementCount(shape) { return shape.reduce((a, b) => a * b, 1); }

  // Per-row / per-column sums of an (H, S, S) tensor, for the readout that
  // says how far from 1.000 the "wrong" axis sits. along "t" sums each row
  // (fixing h, s) over t; along "s" sums each column (fixing h, t) over s.
  function rowSums(A, along) {
    const heads = A.length, s = A[0].length, t = A[0][0].length;
    const out = [];
    for (let h = 0; h < heads; h++) {
      if (along === "s") {
        const row = new Array(t).fill(0);
        for (let i = 0; i < s; i++) for (let j = 0; j < t; j++) row[j] += A[h][i][j];
        out.push(row);
      } else {
        const row = new Array(s).fill(0);
        for (let i = 0; i < s; i++) for (let j = 0; j < t; j++) row[i] += A[h][i][j];
        out.push(row);
      }
    }
    return out;
  }

  // O is a convex combination of V's rows (the weights are non-negative and
  // sum to 1), so every entry has to sit within V's own range on that column,
  // give or take rounding.
  function isConvex(O, V, eps) {
    const e = eps === undefined ? 1e-9 : eps;
    for (let h = 0; h < O.length; h++) {
      const dv = V[h][0].length;
      for (let d = 0; d < dv; d++) {
        let lo = Infinity, hi = -Infinity;
        for (let t = 0; t < V[h].length; t++) {
          lo = Math.min(lo, V[h][t][d]);
          hi = Math.max(hi, V[h][t][d]);
        }
        for (let s = 0; s < O[h].length; s++) {
          const v = O[h][s][d];
          if (v < lo - e || v > hi + e) return false;
        }
      }
    }
    return true;
  }

  const AttentionCore = {
    SEED, D, S, H, IDS,
    lcg, smallInts, projMatrix,
    embedding, gather, projections,
    transpose, matmul,
    splitHeads, splitHeadsWrong, traceCell, mergeHeads,
    scores, softmax, causalMask, applyMask, attend, attention,
    paramCount, elementCount, rowSums, isConvex
  };

  if (typeof module !== "undefined" && module.exports) module.exports = AttentionCore;
  else root.AttentionCore = AttentionCore;
})(typeof window !== "undefined" ? window : globalThis);
