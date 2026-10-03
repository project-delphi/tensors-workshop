/*
 * alphatensor-core.js -- the arithmetic behind "AlphaTensor, from a rule to a
 * game".
 *
 * Only arithmetic lives here: no DOM, no drawing, no copy. Every number the
 * stage prints comes out of this file, and tests/alphatensor_core.test.cjs
 * pins it. The scenes draw; this decides.
 *
 * It is a port of the model behind the three ML-blog posts the stage follows
 * (posts/alphatensor-matmul-cube/model.js); the ledger in
 * interactive/alphatensor-scenes/README.md records the commit. Two things
 * are not the blog's: `survey`, which does its census and its best-move scan
 * in one pass and remembers the answer per position, and `play`, which is
 * what the frame's strip is drawn from.
 *
 * Conventions. For n x n matrices, N = n * n. A matrix is a flat row-major
 * array of length N, so entry (i, j) sits at i * n + j. The tensor is a flat
 * array of length N^3 with cell (a, b, c) at (a * N + b) * N + c: `a` indexes
 * an entry of A, `b` an entry of B, `c` an entry of C = AB. A block is
 * {u, v, w}, three vectors of length N; its tensor is u o v o w. A
 * factorisation is {U, V, W}, each a list of R vectors, and term r is the
 * block {U[r], V[r], W[r]}.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AlphaTensorCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var SUB = "₀₁₂₃₄₅₆₇₈₉";

  function zeros(len) { var x = [], i; for (i = 0; i < len; i++) x.push(0); return x; }
  function cell(N, a, b, c) { return (a * N + b) * N + c; }
  /** The (a, b, c) a flat cell index names. */
  function uncell(N, idx) {
    return { a: Math.floor(idx / (N * N)), b: Math.floor(idx / N) % N, c: idx % N };
  }

  /** The n x n matrix multiplication tensor: T[a, b, c] = 1 when the product
   *  A_a * B_b is one of the terms of C_c, that is when a = (i, j), b = (j, k)
   *  and c = (i, k). It has n^3 ones among N^3 cells. */
  function tensor(n) {
    var N = n * n, T = zeros(N * N * N), i, j, k;
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) for (k = 0; k < n; k++)
      T[cell(N, i * n + j, j * n + k, i * n + k)] = 1;
    return T;
  }

  /** The n^3 products of the schoolbook rule, as {a, b, c}, grouped by output
   *  entry: the two that make c11 first, then c12, and so on. */
  function terms(n) {
    var out = [], i, j, k;
    for (i = 0; i < n; i++) for (k = 0; k < n; k++) for (j = 0; j < n; j++)
      out.push({ a: i * n + j, b: j * n + k, c: i * n + k });
    return out;
  }

  /** Side, cells, ones and the share that is nonzero, for n x n matrices. */
  function sizes(n) {
    var side = n * n, cells = side * side * side, ones = n * n * n;
    return { n: n, side: side, cells: cells, ones: ones, share: ones / cells };
  }

  /** "a₁₂" for letter "a" and flat index 1 of a 2 x 2 matrix. */
  function name(letter, n, idx) {
    return letter + SUB.charAt(Math.floor(idx / n) + 1) + SUB.charAt(idx % n + 1);
  }
  function names(letter, n) {
    var out = [], i;
    for (i = 0; i < n * n; i++) out.push(name(letter, n, i));
    return out;
  }
  /** "m₁₀" for product 10. */
  function mName(r) {
    return "m" + String(r).split("").map(function (d) { return SUB.charAt(+d); }).join("");
  }

  // ------------------------------------------------------------ tensors
  /** u o v o w: the tensor whose (a, b, c) cell is u[a] * v[b] * w[c]. */
  function rankOne(u, v, w) {
    var N = u.length, X = zeros(N * N * N), a, b, c;
    for (a = 0; a < N; a++) if (u[a]) for (b = 0; b < N; b++) if (v[b]) for (c = 0; c < N; c++)
      X[cell(N, a, b, c)] = u[a] * v[b] * w[c];
    return X;
  }
  function add(X, Y) { return X.map(function (x, i) { return x + Y[i]; }); }
  function subtract(X, Y) { return X.map(function (x, i) { return x - Y[i]; }); }
  function nnz(X) { var k = 0, i; for (i = 0; i < X.length; i++) if (X[i]) k++; return k; }
  function isZero(X) { return nnz(X) === 0; }
  function equal(X, Y) {
    if (X.length !== Y.length) return false;
    for (var i = 0; i < X.length; i++) if (X[i] !== Y[i]) return false;
    return true;
  }

  // --------------------------------------------------------- algorithms
  /** Strassen's seven products (Strassen 1969), one row per product. Rows of
   *  U weight (a11, a12, a21, a22), rows of V weight (b11, b12, b21, b22), and
   *  rows of W say which of (c11, c12, c21, c22) the product is added to. The
   *  handbook's "Still open" note carries the same three arrays, and the test
   *  requires these to equal them. */
  var STRASSEN = {
    U: [[1, 0, 0, 1], [0, 0, 1, 1], [1, 0, 0, 0], [0, 0, 0, 1], [1, 1, 0, 0], [-1, 0, 1, 0], [0, 1, 0, -1]],
    V: [[1, 0, 0, 1], [1, 0, 0, 0], [0, 1, 0, -1], [-1, 0, 1, 0], [0, 0, 0, 1], [1, 1, 0, 0], [0, 0, 1, 1]],
    W: [[1, 0, 0, 1], [0, 0, 1, -1], [0, 1, 0, 1], [1, 0, 1, 0], [-1, 1, 0, 0], [0, 0, 0, 1], [1, 0, 0, 0]]
  };

  /** The schoolbook rule as a factorisation: one term per 1 in the tensor,
   *  each term a single cell. */
  function schoolbook(n) {
    var N = n * n, F = { U: [], V: [], W: [] };
    terms(n).forEach(function (t) {
      var u = zeros(N), v = zeros(N), w = zeros(N);
      u[t.a] = 1; v[t.b] = 1; w[t.c] = 1;
      F.U.push(u); F.V.push(v); F.W.push(w);
    });
    return F;
  }

  /** The first `count` terms of a factorisation as a list of blocks (all of
   *  them by default). */
  function blocksOf(F, count) {
    var out = [], r;
    if (count === undefined) count = F.U.length;
    for (r = 0; r < count; r++) out.push({ u: F.U[r], v: F.V[r], w: F.W[r] });
    return out;
  }

  /** The sum of the first `count` terms of a factorisation. */
  function sumOfTerms(F, count) {
    var N = F.U[0].length, X = zeros(N * N * N), r;
    if (count === undefined) count = F.U.length;
    for (r = 0; r < count; r++) X = add(X, rankOne(F.U[r], F.V[r], F.W[r]));
    return X;
  }

  /** Play a list of blocks against the target T, one at a time. `sum` is what
   *  the blocks add up to and `owed` is T minus that; `everSum` and `everOwed`
   *  mark the cells either has ever held, which is what a hollow cell is drawn
   *  from; `trail[k]` is how many cells differ from T after k blocks -- the
   *  same number whether you are adding towards T or subtracting from it. */
  function play(T, list) {
    var len = T.length, sum = zeros(len), owed = T.slice(), everSum = zeros(len), everOwed = zeros(len);
    var trail = [nnz(T)], i;
    for (i = 0; i < len; i++) if (owed[i]) everOwed[i] = 1;
    list.forEach(function (t) {
      var X = rankOne(t.u, t.v, t.w);
      for (i = 0; i < len; i++) {
        sum[i] += X[i]; owed[i] -= X[i];
        if (sum[i]) everSum[i] = 1;
        if (owed[i]) everOwed[i] = 1;
      }
      trail.push(nnz(owed));
    });
    return { sum: sum, owed: owed, everSum: everSum, everOwed: everOwed, trail: trail };
  }

  /** What one block does to the target: the cells it covers, how many of
   *  them are a 1 of T that it fills with a 1, and how many are damage. */
  function blockReport(T, u, v, w) {
    var X = rankOne(u, v, w), cells = 0, wanted = 0, i;
    for (i = 0; i < X.length; i++) if (X[i]) { cells++; if (X[i] === 1 && T[i] === 1) wanted++; }
    return { cells: cells, wanted: wanted, damage: cells - wanted };
  }

  function dot(x, y) { var s = 0, i; for (i = 0; i < x.length; i++) s += x[i] * y[i]; return s; }

  /** Run a factorisation as an algorithm on flat matrices A and B. Term r
   *  costs one multiplication: m[r] = (U[r] . A) * (V[r] . B). */
  function applyAlgorithm(F, A, B) {
    var R = F.U.length, N = A.length, left = [], right = [], m = [], C = zeros(N), r, c;
    for (r = 0; r < R; r++) {
      left.push(dot(F.U[r], A));
      right.push(dot(F.V[r], B));
      m.push(left[r] * right[r]);
      for (c = 0; c < N; c++) C[c] += F.W[r][c] * m[r];
    }
    return { left: left, right: right, m: m, C: C };
  }

  /** The schoolbook product of two flat n x n matrices. */
  function matmul(n, A, B) {
    var C = zeros(n * n), i, j, k;
    for (i = 0; i < n; i++) for (k = 0; k < n; k++) for (j = 0; j < n; j++)
      C[i * n + k] += A[i * n + j] * B[j * n + k];
    return C;
  }

  /** The product read straight off the tensor: C_c = sum over (a, b) of
   *  T[a, b, c] * A_a * B_b. Also returns how many multiplications it did. */
  function readOff(T, A, B) {
    var N = A.length, C = zeros(N), mults = 0, a, b, c;
    for (a = 0; a < N; a++) for (b = 0; b < N; b++) for (c = 0; c < N; c++)
      if (T[cell(N, a, b, c)]) { C[c] += T[cell(N, a, b, c)] * A[a] * B[b]; mults++; }
    return { C: C, mults: mults };
  }

  /** "a₁₁ + a₂₂" for a weight vector over named entries; a positive term leads. */
  function combo(vec, labels) {
    var parts = [], i;
    for (i = 0; i < vec.length; i++) if (vec[i] > 0) parts.push({ k: vec[i], s: labels[i] });
    for (i = 0; i < vec.length; i++) if (vec[i] < 0) parts.push({ k: vec[i], s: labels[i] });
    if (!parts.length) return "0";
    return parts.map(function (p, j) {
      var mag = Math.abs(p.k) === 1 ? "" : String(Math.abs(p.k));
      if (j === 0) return (p.k < 0 ? "−" : "") + mag + p.s;
      return (p.k < 0 ? " − " : " + ") + mag + p.s;
    }).join("");
  }

  /** The algorithm a factorisation spells out, as text: the two sums each
   *  product multiplies, and the products each output entry adds up. */
  function formulas(F, n) {
    var R = F.U.length, N = n * n, an = names("a", n), bn = names("b", n), cn = names("c", n);
    var mn = [], r, c, out = { left: [], right: [], products: [], outputs: [] };
    for (r = 0; r < R; r++) mn.push(mName(r + 1));
    for (r = 0; r < R; r++) {
      out.left.push(combo(F.U[r], an));
      out.right.push(combo(F.V[r], bn));
      out.products.push(mn[r] + " = (" + out.left[r] + ")(" + out.right[r] + ")");
    }
    for (c = 0; c < N; c++)
      out.outputs.push(cn[c] + " = " + combo(F.W.map(function (w) { return w[c]; }), mn));
    return out;
  }

  /** Additions and subtractions one pass of the algorithm does. */
  function additions(F) {
    var N = F.U[0].length, total = 0, c;
    function extra(vec) { return Math.max(0, vec.filter(function (x) { return x !== 0; }).length - 1); }
    F.U.forEach(function (u) { total += extra(u); });
    F.V.forEach(function (v) { total += extra(v); });
    for (c = 0; c < N; c++) total += extra(F.W.map(function (w) { return w[c]; }));
    return total;
  }

  // Matrices as arrays of rows, for the recursion.
  function madd(X, Y, s) {
    return X.map(function (row, i) { return row.map(function (x, j) { return x + s * Y[i][j]; }); });
  }
  function mzero(n) { var X = [], i; for (i = 0; i < n; i++) X.push(zeros(n)); return X; }
  function quarters(X) {
    var h = X.length / 2, out = [], bi, bj;
    function rows(bi, bj) {
      return X.slice(bi * h, bi * h + h).map(function (row) { return row.slice(bj * h, bj * h + h); });
    }
    for (bi = 0; bi < 2; bi++) for (bj = 0; bj < 2; bj++) out.push(rows(bi, bj));
    return out;
  }

  /** Multiply two 2^k x 2^k matrices (arrays of rows) by applying a 2 x 2
   *  factorisation to their four quarters, and again inside each product of
   *  quarters. Returns the product and how many scalar multiplications it
   *  took. */
  function multiplyRecursive(F, A, B) {
    var n = A.length;
    if (n === 1) return { C: [[A[0][0] * B[0][0]]], mults: 1 };
    var h = n / 2, Ab = quarters(A), Bb = quarters(B), Cb = [mzero(h), mzero(h), mzero(h), mzero(h)], mults = 0;
    F.U.forEach(function (u, r) {
      var L = mzero(h), Rt = mzero(h), i;
      for (i = 0; i < 4; i++) {
        if (u[i]) L = madd(L, Ab[i], u[i]);
        if (F.V[r][i]) Rt = madd(Rt, Bb[i], F.V[r][i]);
      }
      var p = multiplyRecursive(F, L, Rt);
      mults += p.mults;
      for (i = 0; i < 4; i++) if (F.W[r][i]) Cb[i] = madd(Cb[i], p.C, F.W[r][i]);
    });
    var C = [], i;
    for (i = 0; i < h; i++) C.push(Cb[0][i].concat(Cb[1][i]));
    for (i = 0; i < h; i++) C.push(Cb[2][i].concat(Cb[3][i]));
    return { C: C, mults: mults };
  }

  /** Multiplications to multiply two 2^k x 2^k matrices by recursion on 2 x 2
   *  blocks: 8 per level for the schoolbook rule, 7 for Strassen's. Exact in a
   *  double up to k = 17. */
  function recursion(k) {
    var school = 1, strassen = 1, i;
    for (i = 0; i < k; i++) { school *= 8; strassen *= 7; }
    return { k: k, n: Math.pow(2, k), school: school, strassen: strassen,
      saving: 1 - strassen / school, ratio: school / strassen };
  }

  /** The exponent a rank-R split of the n x n rule buys when it is applied to
   *  blocks, over and over: n^(log_n R). 2 and 7 give Strassen's 2.807. */
  function exponent(n, R) { return Math.log(R) / Math.log(n); }
  var OMEGA = exponent(2, 7);

  /** The record board the last scene draws. Every figure is a published one,
   *  and the scenes README says where each comes from: `lower` is the best
   *  proof that no split is shorter, `upper` the shortest split anyone has
   *  found, `before` what `upper` replaced when AlphaTensor reported it. */
  var RECORDS = [
    { id: "2x2", shape: [2, 2, 2], lower: 7, upper: 7 },
    { id: "3x3", shape: [3, 3, 3], lower: 19, upper: 23 },
    { id: "4x4", shape: [4, 4, 4], upper: 49 },
    { id: "4x4mod2", shape: [4, 4, 4], upper: 47, before: 49, mod2: true, alphatensor: true },
    { id: "4x5", shape: [4, 5, 5], upper: 76, before: 80, alphatensor: true }
  ];

  // --------------------------------------------------------------- game
  /** Every nonzero vector of length N with entries in lo..hi, in base-(hi-lo+1)
   *  order with the first entry most significant. */
  function vectors(N, lo, hi) {
    var f = hi - lo + 1, total = Math.pow(f, N), out = [], t, i, x, v, any;
    for (t = 0; t < total; t++) {
      v = zeros(N); x = t; any = false;
      for (i = N - 1; i >= 0; i--) { v[i] = x % f + lo; x = Math.floor(x / f); if (v[i]) any = true; }
      if (any) out.push(v);
    }
    return out;
  }
  /** Keep the vectors whose first nonzero entry is positive: one of each +/- pair. */
  function canonical(vs) {
    return vs.filter(function (v) {
      for (var i = 0; i < v.length; i++) if (v[i]) return v[i] > 0;
      return false;
    });
  }

  /** The 81 weight vectors a reader can set by hand, {-1, 0, 1}^4, numbered so
   *  that one slider reaches each: base 3, first entry most significant, digit
   *  minus one. Index 40 is all zeros. */
  var WEIGHTS = 81, ZERO_WEIGHT = 40;
  function weightAt(idx) {
    var v = [0, 0, 0, 0], x = idx, i;
    for (i = 3; i >= 0; i--) { v[i] = x % 3 - 1; x = Math.floor(x / 3); }
    return v;
  }
  function weightIndex(v) {
    var x = 0, i;
    for (i = 0; i < 4; i++) x = x * 3 + (v[i] + 1);
    return x;
  }

  /** The moves with entries in {-1, 0, 1}, each rank-one tensor listed once:
   *  flipping the sign of two of u, v, w leaves the tensor unchanged, so u and
   *  v are taken with a positive leading entry and w runs over both signs.
   *  Built once per N. */
  var MOVES = {};
  function moves(N) {
    if (MOVES[N]) return MOVES[N];
    var all = vectors(N, -1, 1), half = canonical(all);
    function support(v) {
      var idx = [], val = [], i;
      for (i = 0; i < v.length; i++) if (v[i]) { idx.push(i); val.push(v[i]); }
      return { v: v, idx: idx, val: val };
    }
    MOVES[N] = { u: half, v: half, w: all, count: half.length * half.length * all.length,
      su: half.map(support), sv: half.map(support), sw: all.map(support) };
    return MOVES[N];
  }

  /** The score a greedy player minimises: nonzero cells first, then the sum
   *  of absolute values, so a cell holding 2 counts as further from zero. */
  function score(X) {
    var k = 0, s = 0, i;
    for (i = 0; i < X.length; i++) if (X[i]) { k++; s += Math.abs(X[i]); }
    return { nnz: k, abs: s };
  }
  function better(p, q) { return p.nnz < q.nnz || (p.nnz === q.nnz && p.abs < q.abs); }

  /** Every {-1, 0, 1} move from position R, looked at once: how many lower
   *  the count of nonzero cells, keep it, or raise it; the largest rise;
   *  `hist[k]`, how many moves leave exactly k nonzero cells; and `best`, the
   *  move a greedy player takes -- the first found wins a tie.
   *
   *  A move changes only the cells its block covers, so each is scored from
   *  those cells alone. The answer is remembered per position: one pass is
   *  128,000 moves, a readout asks for it several times, and a readout is
   *  written from the controls rather than from whichever frame got there
   *  first. */
  var SURVEYS = {};
  function survey(R, N) {
    var key = N + ":" + R.join(",");
    if (SURVEYS[key]) return SURVEYS[key];
    var mv = moves(N), now = score(R), hist = zeros(R.length + 1);
    var out = { total: 0, lower: 0, same: 0, raise: 0, maxRise: 0, hist: hist, best: null, before: now.nnz };
    var ui, vi, wi, su, sv, sw, ia, ib, ic, base, p, old, x, k, s;
    for (ui = 0; ui < mv.su.length; ui++) {
      su = mv.su[ui];
      for (vi = 0; vi < mv.sv.length; vi++) {
        sv = mv.sv[vi];
        for (wi = 0; wi < mv.sw.length; wi++) {
          sw = mv.sw[wi]; k = now.nnz; s = now.abs;
          for (ia = 0; ia < su.idx.length; ia++) for (ib = 0; ib < sv.idx.length; ib++) {
            base = (su.idx[ia] * N + sv.idx[ib]) * N; p = su.val[ia] * sv.val[ib];
            for (ic = 0; ic < sw.idx.length; ic++) {
              old = R[base + sw.idx[ic]]; x = old - p * sw.val[ic];
              if (x && !old) k++; else if (!x && old) k--;
              s += (x < 0 ? -x : x) - (old < 0 ? -old : old);
            }
          }
          out.total++; hist[k]++;
          if (k < now.nnz) out.lower++; else if (k === now.nnz) out.same++; else out.raise++;
          if (k - now.nnz > out.maxRise) out.maxRise = k - now.nnz;
          if (!out.best || k < out.best.nnz || (k === out.best.nnz && s < out.best.abs))
            out.best = { u: su.v, v: sv.v, w: sw.v, nnz: k, abs: s };
        }
      }
    }
    SURVEYS[key] = out;
    return out;
  }

  /** Play greedily from R: take the best move while it improves the score. */
  function greedyPeel(R, N, maxMoves) {
    var played = [], trail = [nnz(R)], now = score(R), best;
    while (now.nnz > 0 && played.length < (maxMoves || 64)) {
      best = survey(R, N).best;
      if (!better(best, now)) break;
      R = subtract(R, rankOne(best.u, best.v, best.w));
      now = { nnz: best.nnz, abs: best.abs };
      played.push({ u: best.u, v: best.v, w: best.w });
      trail.push(now.nnz);
    }
    return { moves: played, trail: trail, residual: R, solved: now.nnz === 0 };
  }

  /** Nonzero cells left after each term of F is subtracted from R, in `order`. */
  function trajectory(R, F, order) {
    var trail = [nnz(R)];
    (order || F.U.map(function (_, r) { return r; })).forEach(function (r) {
      R = subtract(R, rankOne(F.U[r], F.V[r], F.W[r]));
      trail.push(nnz(R));
    });
    return trail;
  }

  /** Every order the terms of F can be subtracted in: how many there are, the
   *  lowest and highest peak the count of nonzero cells reaches, and how many
   *  orders never go up. A sum of blocks does not depend on order, so the
   *  count after a set of them is looked up by which are in the set. */
  var ORDERS = null;
  function orderings(T, F) {
    if (ORDERS && ORDERS.T === T && ORDERS.F === F) return ORDERS.out;
    var R = F.U.length, full = (1 << R) - 1, count = [], X = [], mask, r, low;
    var blocks = F.U.map(function (u, i) { return rankOne(u, F.V[i], F.W[i]); });
    X[0] = T.slice(); count[0] = nnz(T);
    for (mask = 1; mask <= full; mask++) {
      low = mask & -mask; r = 0;
      while ((1 << r) !== low) r++;
      X[mask] = subtract(X[mask ^ low], blocks[r]);
      count[mask] = nnz(X[mask]);
    }
    var out = { orders: 0, lowPeak: Infinity, highPeak: 0, neverUp: 0 };
    (function walk(mask, peak, up) {
      if (mask === full) {
        out.orders++;
        if (peak < out.lowPeak) out.lowPeak = peak;
        if (peak > out.highPeak) out.highPeak = peak;
        if (!up) out.neverUp++;
        return;
      }
      for (var i = 0; i < R; i++) if (!(mask & (1 << i))) {
        var next = mask | (1 << i);
        walk(next, Math.max(peak, count[next]), up || count[next] > count[mask]);
      }
    })(0, count[0], false);
    ORDERS = { T: T, F: F, out: out };
    return out;
  }

  // ------------------------------------------------------- search space
  function log10(x) { return Math.log(x) / Math.LN10; }
  /** log10 of the choices at one move: three vectors of length n^2, each
   *  entry one of f values, so f^(3 n^2) triples (all-zero vectors included). */
  function log10Moves(n, f) { return 3 * n * n * log10(f); }
  /** log10 of the number of move sequences of a given length. */
  function log10Games(n, f, depth) { return depth * log10Moves(n, f); }
  /** How many digits a whole number with this log10 has. */
  function digits(lg) { return Math.floor(lg + 1e-9) + 1; }
  /** {mant, exp} with 1 <= mant < 10, for "3.6 x 10^33". */
  function sci(lg) {
    var exp = Math.floor(lg + 1e-9), mant = Math.pow(10, lg - exp);
    if (mant >= 9.95) { mant = 1; exp++; }
    return { mant: mant, exp: exp };
  }
  /** f^e written out in full, as a string of digits. */
  function powString(f, e) {
    var x = BigInt(1), b = BigInt(f), i;
    for (i = 0; i < e; i++) x = x * b;
    return x.toString();
  }
  /** log10 of the years it takes to write down 10^lg things at `perSecond`. */
  var SECONDS_A_YEAR = 365.25 * 24 * 3600;
  function log10Years(lg, perSecond) { return lg - log10(perSecond) - log10(SECONDS_A_YEAR); }
  /** log10 of "n choose k". */
  function log10Choose(n, k) {
    var s = 0, i;
    for (i = 0; i < k; i++) s += log10(n - i) - log10(i + 1);
    return s;
  }

  /** Seeded integers, for the checks and the "random matrices" control. */
  function mulberry32(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randomMatrix(rand, len, lo, hi) {
    var out = [], i;
    for (i = 0; i < len; i++) out.push(lo + Math.floor(rand() * (hi - lo + 1)));
    return out;
  }

  /** The worked example every scene carries: the numbers are small enough to
   *  check in the margin, and the product is 19, 22, 43, 50. */
  var A0 = [1, 2, 3, 4], B0 = [5, 6, 7, 8];

  return {
    cell: cell, uncell: uncell, tensor: tensor, terms: terms, sizes: sizes,
    name: name, names: names, mName: mName,
    rankOne: rankOne, add: add, subtract: subtract, nnz: nnz, isZero: isZero, equal: equal,
    STRASSEN: STRASSEN, schoolbook: schoolbook, blocksOf: blocksOf, sumOfTerms: sumOfTerms,
    play: play, blockReport: blockReport,
    applyAlgorithm: applyAlgorithm, matmul: matmul, readOff: readOff,
    combo: combo, formulas: formulas, additions: additions,
    multiplyRecursive: multiplyRecursive, recursion: recursion,
    exponent: exponent, OMEGA: OMEGA, RECORDS: RECORDS,
    vectors: vectors, canonical: canonical, moves: moves,
    WEIGHTS: WEIGHTS, ZERO_WEIGHT: ZERO_WEIGHT, weightAt: weightAt, weightIndex: weightIndex,
    score: score, better: better, survey: survey, greedyPeel: greedyPeel,
    trajectory: trajectory, orderings: orderings,
    log10Moves: log10Moves, log10Games: log10Games, digits: digits, sci: sci,
    powString: powString, log10Years: log10Years, log10Choose: log10Choose,
    mulberry32: mulberry32, randomMatrix: randomMatrix,
    A0: A0, B0: B0
  };
});
