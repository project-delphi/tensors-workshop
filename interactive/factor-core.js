// The arithmetic under the Tucker & CP stage: unfolding an order-3 tensor,
// the HOSVD that builds Tucker's core and three factor matrices, CP-ALS, and
// the search that pairs a CP budget with the Tucker ranks that fit inside it.
// It is kept apart from factor-stage.html so `npm test` can pin it without a
// browser (tests/factor_core.test.cjs), for the reason tensor-core.js and
// linalg-core.js are: this is the lesson the widget exists to show, and a
// wrong number here is a wrong claim on the stage rather than a broken page.
//
// A plain script, not a module: the widget loads it with a <script src>,
// after linalg-core.js (it calls LC.svd, LC.mul, LC.transpose, LC.pinv), so
// it works from file:// and Node picks it up through module.exports.
//
// A tensor here is {data: Float64Array, shape: [d0, d1, ...], strides},
// C order (last axis fastest) -- the same order the generated taxi.json is
// written in, so a page can hand its `data` array straight to `tensor()`.
(function (root) {
  "use strict";

  const LC = root.LinalgCore ||
    (typeof require !== "undefined" ? require("./linalg-core.js") : null);
  if (!LC) throw new Error("factor-core.js: linalg-core.js must load first");

  // ─── the tensor ────────────────────────────────────────────────────────────

  function strides(shape) {
    const s = new Array(shape.length);
    let acc = 1;
    for (let i = shape.length - 1; i >= 0; i--) { s[i] = acc; acc *= shape[i]; }
    return s;
  }

  function tensor(data, shape) {
    const n = shape.reduce((a, b) => a * b, 1);
    const arr = data instanceof Float64Array ? data : Float64Array.from(data);
    if (arr.length !== n) {
      throw new Error("tensor: " + arr.length + " values do not fill shape " + shape.join("x"));
    }
    return {data: arr, shape: shape.slice(), strides: strides(shape)};
  }

  // A single entry, T.data[at(T, i, j, k)]'s value -- at(T, 1, 2, 3), not an
  // index array, because every call site here is a scene reading one cell.
  function at(T) {
    let off = 0;
    for (let a = 1; a < arguments.length; a++) off += arguments[a] * T.strides[a - 1];
    return T.data[off];
  }

  const otherAxes = (shape, mode) => {
    const o = [];
    for (let ax = 0; ax < shape.length; ax++) if (ax !== mode) o.push(ax);
    return o;
  };

  // The fibre through a cell along `mode`, the other axes held fixed: T[:,j,k]
  // is fibre(T, 0, j, k), T[i,:,k] is fibre(T, 1, i, k), T[i,j,:] is
  // fibre(T, 2, i, j) -- `fixed` is always the other axes in ascending order.
  function fibre(T, mode) {
    const fixed = Array.prototype.slice.call(arguments, 2);
    const n = T.shape[mode];
    const idx = new Array(T.shape.length);
    let fi = 0;
    for (let ax = 0; ax < T.shape.length; ax++) if (ax !== mode) idx[ax] = fixed[fi++];
    const out = new Array(n);
    for (let v = 0; v < n; v++) { idx[mode] = v; out[v] = at.apply(null, [T].concat(idx)); }
    return out;
  }

  // ─── unfold / fold ─────────────────────────────────────────────────────────
  //
  // numpy's own definition: moveaxis(T, mode, 0).reshape(shape[mode], -1).
  // Rows are `mode`; columns enumerate every other axis in its original
  // order, the last one fastest -- so unfold(T, 2) puts hour on the rows and
  // (pickup, dropoff) on the columns, pickup slower than dropoff.

  function unfold(T, mode) {
    const shape = T.shape;
    const others = otherAxes(shape, mode);
    const dims = others.map((ax) => shape[ax]);
    const rows = shape[mode];
    const cols = dims.reduce((a, b) => a * b, 1);
    const M = Array.from({length: rows}, () => new Array(cols));
    const idx = new Array(shape.length);
    for (let c = 0; c < cols; c++) {
      let rem = c;
      for (let k = others.length - 1; k >= 0; k--) {
        idx[others[k]] = rem % dims[k];
        rem = Math.floor(rem / dims[k]);
      }
      for (let r = 0; r < rows; r++) {
        idx[mode] = r;
        M[r][c] = at.apply(null, [T].concat(idx));
      }
    }
    return M;
  }

  // Where one entry T[idx] lands in the mode-`mode` unfolding: its row is its
  // own index on that axis, its column the other indices read as one number,
  // the last axis fastest -- the same decoding unfold() writes with, run the
  // other way. The unfold scene flies each voxel to this address, so it is
  // pinned against unfold() itself for every cell and every mode.
  function unfoldIndex(idx, shape, mode) {
    const others = otherAxes(shape, mode);
    let col = 0;
    for (const ax of others) col = col * shape[ax] + idx[ax];
    return {
      row: idx[mode], col, rows: shape[mode],
      cols: others.reduce((a, ax) => a * shape[ax], 1)
    };
  }

  // The flat offset of T[idx] -- the "which entry" slider's own number -- and
  // back again.
  function flatIndex(idx, shape) {
    let off = 0;
    for (let ax = 0; ax < shape.length; ax++) off = off * shape[ax] + idx[ax];
    return off;
  }
  function multiIndex(flat, shape) {
    const idx = new Array(shape.length);
    let rem = flat;
    for (let ax = shape.length - 1; ax >= 0; ax--) { idx[ax] = rem % shape[ax]; rem = Math.floor(rem / shape[ax]); }
    return idx;
  }

  // The sum over every axis but `mode`: marginal(T, 2) is the trips in each
  // hour across all twenty routes, the curve the hour factor's first column
  // turns out to be the shape of.
  function marginal(T, mode) {
    const out = new Array(T.shape[mode]).fill(0);
    const idx = new Array(T.shape.length);
    for (let flat = 0; flat < T.data.length; flat++) {
      let rem = flat;
      for (let ax = 0; ax < T.shape.length; ax++) { idx[ax] = Math.floor(rem / T.strides[ax]); rem %= T.strides[ax]; }
      out[idx[mode]] += T.data[flat];
    }
    return out;
  }

  function argmax(v) {
    let best = 0;
    for (let i = 1; i < v.length; i++) if (v[i] > v[best]) best = i;
    return best;
  }

  // fold's exact inverse: the same column decoding, written back.
  function fold(M, mode, shape) {
    const others = otherAxes(shape, mode);
    const dims = others.map((ax) => shape[ax]);
    const n = shape.reduce((a, b) => a * b, 1);
    const T = tensor(new Float64Array(n), shape);
    const idx = new Array(shape.length);
    const cols = M[0].length;
    for (let c = 0; c < cols; c++) {
      let rem = c;
      for (let k = others.length - 1; k >= 0; k--) {
        idx[others[k]] = rem % dims[k];
        rem = Math.floor(rem / dims[k]);
      }
      for (let r = 0; r < M.length; r++) {
        idx[mode] = r;
        let off = 0;
        for (let ax = 0; ax < shape.length; ax++) off += idx[ax] * T.strides[ax];
        T.data[off] = M[r][c];
      }
    }
    return T;
  }

  // T times a (newDim x shape[mode]) matrix along `mode`: unfold, matrix
  // multiply, fold back with that axis replaced by newDim.
  function modeProduct(T, Mat, mode) {
    const Y = LC.mul(Mat, unfold(T, mode));
    const newShape = T.shape.slice();
    newShape[mode] = Mat.length;
    return fold(Y, mode, newShape);
  }

  function outer3(a, b, c) {
    const shape = [a.length, b.length, c.length];
    const data = new Float64Array(a.length * b.length * c.length);
    let p = 0;
    for (let i = 0; i < a.length; i++)
      for (let j = 0; j < b.length; j++)
        for (let k = 0; k < c.length; k++) data[p++] = a[i] * b[j] * c[k];
    return tensor(data, shape);
  }

  function relError(T, R) {
    let num = 0, den = 0;
    for (let i = 0; i < T.data.length; i++) {
      const d = T.data[i] - R.data[i];
      num += d * d;
      den += T.data[i] * T.data[i];
    }
    return den > 0 ? Math.sqrt(num / den) : 0;
  }

  function norm(T) {
    let s = 0;
    for (let i = 0; i < T.data.length; i++) s += T.data[i] * T.data[i];
    return Math.sqrt(s);
  }

  // The cell a reconstruction misses by most, and by how much, signed:
  // {idx, t, r, diff} with diff = t - r, so a positive diff is trips the model
  // left out.
  function largestMiss(T, R) {
    let best = 0;
    for (let i = 1; i < T.data.length; i++) {
      if (Math.abs(T.data[i] - R.data[i]) > Math.abs(T.data[best] - R.data[best])) best = i;
    }
    return {
      idx: multiIndex(best, T.shape), t: T.data[best], r: R.data[best],
      diff: T.data[best] - R.data[best]
    };
  }

  // How much of a matrix's squared mass its first r singular values hold,
  // and the relative error of keeping only those r: sqrt(1 - kept). On the
  // taxi unfoldings the first value alone holds 99%, which is why the stage
  // publishes this to two decimals rather than as a rounded percent -- a
  // whole-percent readout said 100% at r = 1.
  function svdEnergy(S, r) {
    let total = 0, kept = 0;
    for (let i = 0; i < S.length; i++) {
      total += S[i] * S[i];
      if (i < r) kept += S[i] * S[i];
    }
    const share = total > 0 ? kept / total : 1;
    return {kept: share, error: Math.sqrt(Math.max(0, 1 - share))};
  }

  // ─── HOSVD / Tucker ────────────────────────────────────────────────────────
  //
  // One SVD per unfolding, cached on the tensor object: a rank slider only
  // slices columns out of a basis already found, so there is no busy phase
  // once a mode's bases exist. `linalg-core.svd` returns a *thin* U -- mode 2's
  // 24x20 unfolding caps the hour rank at 20, not 24 -- and its sign
  // convention differs between the wide unfoldings (modes 0 and 1, which
  // recurse through the transpose) and the tall one (mode 2, direct): the
  // fix below renormalises every kept column to positive-largest itself,
  // rather than trusting whichever convention the branch that produced it
  // happened to use, or hour 18's bar is a coin flip on reload.
  const basesCache = new WeakMap();

  function hosvdBases(T) {
    if (basesCache.has(T)) return basesCache.get(T);
    const bases = T.shape.map((_, mode) => {
      const Xm = unfold(T, mode);
      const s = LC.svd(Xm);
      return {U: s.U, S: s.S};
    });
    basesCache.set(T, bases);
    return bases;
  }

  function signFix(U, cols) {
    const flips = [];
    for (let c = 0; c < cols; c++) {
      let best = 0;
      for (let i = 1; i < U.length; i++) if (Math.abs(U[i][c]) > Math.abs(U[best][c])) best = i;
      flips.push(U[best][c] < 0 ? -1 : 1);
    }
    return U.map((row) => row.slice(0, cols).map((v, c) => v * flips[c]));
  }

  function tuckerParams(shape, ranks) {
    const core = ranks.reduce((a, b) => a * b, 1);
    const facs = shape.reduce((a, d, i) => a + d * ranks[i], 0);
    return core + facs;
  }

  // T ~= G x1 A x2 B x3 C. `bases` lets a scene reuse hosvdBases(T) across a
  // rank slider instead of re-running the SVD on every drag.
  function hosvd(T, ranks, bases) {
    const B = bases || hosvdBases(T);
    const factors = ranks.map((r, mode) => signFix(B[mode].U, r));
    let core = T;
    factors.forEach((A, mode) => { core = modeProduct(core, LC.transpose(A), mode); });
    let recon = core;
    factors.forEach((A, mode) => { recon = modeProduct(recon, A, mode); });
    const error = relError(T, recon);
    const params = tuckerParams(T.shape, ranks);
    return {
      core, factors, recon, error, params,
      ratio: T.data.length / params,
      ranks: ranks.slice(),
      rmax: B.map((b) => b.U[0].length)
    };
  }

  // One unfolding kept at rank r: U_r U_r^T X, the best rank-r matrix there
  // is for it (Eckart-Young), and what that leaves behind. Its relative error
  // is svdEnergy(S, r).error, which the test holds it to.
  function unfoldingRebuild(T, mode, r, bases) {
    const B = bases || hosvdBases(T);
    const X = unfold(T, mode);
    const U = B[mode].U.map((row) => row.slice(0, r));
    const rebuilt = LC.mul(U, LC.mul(LC.transpose(U), X));
    const residual = X.map((row, i) => row.map((v, j) => v - rebuilt[i][j]));
    let num = 0, den = 0;
    for (let i = 0; i < X.length; i++)
      for (let j = 0; j < X[0].length; j++) { num += residual[i][j] ** 2; den += X[i][j] ** 2; }
    return {X, rebuilt, residual, error: den > 0 ? Math.sqrt(num / den) : 0};
  }

  // What one core entry G[a, b, c] contributes: g times the outer product of
  // A[:, a], B[:, b] and C[:, c]. Those columns are orthonormal, so the
  // contributions are mutually orthogonal and each one's share of the
  // reconstruction's squared norm is just g^2 / sum(g^2) -- no second
  // reconstruction needed, and the shares add to exactly 1.
  function coreTerm(h, a, b, c) {
    const G = h.core;
    const g = at(G, a, b, c);
    let total = 0;
    for (let i = 0; i < G.data.length; i++) total += G.data[i] * G.data[i];
    const col = (M, j) => M.map((row) => row[j]);
    return {
      g, share: total > 0 ? (g * g) / total : 0,
      a: col(h.factors[0], a), b: col(h.factors[1], b), c: col(h.factors[2], c)
    };
  }

  // ─── CP-ALS ────────────────────────────────────────────────────────────────

  function lcg(seed) {
    let s = (seed >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function randFactor(rows, R, rng) {
    return Array.from({length: rows}, () => Array.from({length: R}, () => rng() * 2 - 1));
  }

  function hadamard(A, B) { return A.map((row, i) => row.map((v, j) => v * B[i][j])); }

  // The matricised-tensor-times-Khatri-Rao product, written as the plain
  // triple sum it is rather than an explicit Khatri-Rao matrix -- the taxi
  // tensor is 480 entries, so a loop over every one, R times, is cheaper to
  // read and to get right than a second matrix product to keep in step with
  // unfold's own column order.
  function mttkrp(T, mode, factors, R) {
    const shape = T.shape;
    const others = otherAxes(shape, mode);
    const out = Array.from({length: shape[mode]}, () => new Array(R).fill(0));
    const idx = new Array(shape.length);
    for (let flat = 0; flat < T.data.length; flat++) {
      const val = T.data[flat];
      if (val === 0) continue;
      let rem = flat;
      for (let ax = 0; ax < shape.length; ax++) { idx[ax] = Math.floor(rem / T.strides[ax]); rem %= T.strides[ax]; }
      for (let r = 0; r < R; r++) {
        let prod = val;
        for (const ax of others) prod *= factors[ax][idx[ax]][r];
        out[idx[mode]][r] += prod;
      }
    }
    return out;
  }

  // One least-squares solve: the factor for `mode` that best fits T with the
  // other two held where they are. It is the whole of ALS's arithmetic, and
  // it is split out so cpTrace() can stop between the three solves of a sweep
  // and still land, bit for bit, where cpAls() does.
  function cpSolveMode(T, factors, R, mode) {
    const others = otherAxes(T.shape, mode);
    let V = null;
    for (const ax of others) {
      const G = LC.mul(LC.transpose(factors[ax]), factors[ax]);
      V = V ? hadamard(V, G) : G;
    }
    return LC.mul(mttkrp(T, mode, factors, R), LC.pinv(V));
  }

  function cpStep(T, factors, R) {
    const next = factors.slice();
    for (let mode = 0; mode < T.shape.length; mode++) next[mode] = cpSolveMode(T, next, R, mode);
    return next;
  }

  function cpRecon(factors, shape) {
    const R = factors[0][0].length;
    const T = tensor(new Float64Array(shape.reduce((a, b) => a * b, 1)), shape);
    const idx = new Array(shape.length);
    for (let flat = 0; flat < T.data.length; flat++) {
      let rem = flat;
      for (let ax = 0; ax < shape.length; ax++) { idx[ax] = Math.floor(rem / T.strides[ax]); rem %= T.strides[ax]; }
      let s = 0;
      for (let r = 0; r < R; r++) {
        let p = 1;
        for (let ax = 0; ax < shape.length; ax++) p *= factors[ax][idx[ax]][r];
        s += p;
      }
      T.data[flat] = s;
    }
    return T;
  }

  function cpParams(shape, R) { return R * shape.reduce((a, b) => a + b, 0); }

  // Deterministic (an LCG, never Math.random) and cached by (R, iters, seed)
  // on the tensor, because a control that only moves iters or R must not
  // re-run ALS from scratch when the reader nudges it back.
  const cpCache = new WeakMap();

  function cpAls(T, R, iters, seed) {
    const s = seed === undefined ? 1 : seed;
    const key = R + "|" + iters + "|" + s;
    let m = cpCache.get(T);
    if (!m) { m = new Map(); cpCache.set(T, m); }
    if (m.has(key)) return m.get(key);
    const rng = lcg(s);
    let factors = T.shape.map((d) => randFactor(d, R, rng));
    for (let it = 0; it < iters; it++) factors = cpStep(T, factors, R);
    const recon = cpRecon(factors, T.shape);
    const out = {factors, recon, error: relError(T, recon), R, iters, seed: s};
    m.set(key, out);
    return out;
  }

  // ALS one solve at a time: entry 0 is the random start, then every sweep
  // adds three entries, one per factor solved (mode 0, 1, 2). Each entry
  // keeps the factors as they stand after that solve and the error they
  // give. Every solve is an exact least-squares minimum over one factor with
  // the other two fixed, so the error can never rise from one entry to the
  // next -- the property the als scene's curve draws, and the test pins.
  const traceCache = new WeakMap();

  function cpTrace(T, R, sweeps, seed) {
    const s = seed === undefined ? 1 : seed;
    const key = R + "|" + sweeps + "|" + s;
    let m = traceCache.get(T);
    if (!m) { m = new Map(); traceCache.set(T, m); }
    if (m.has(key)) return m.get(key);
    const rng = lcg(s);
    let factors = T.shape.map((d) => randFactor(d, R, rng));
    const steps = [{sweep: 0, mode: -1, factors, error: relError(T, cpRecon(factors, T.shape))}];
    for (let sw = 1; sw <= sweeps; sw++) {
      for (let mode = 0; mode < T.shape.length; mode++) {
        const next = factors.slice();
        next[mode] = cpSolveMode(T, factors, R, mode);
        factors = next;
        steps.push({sweep: sw, mode, factors, error: relError(T, cpRecon(factors, T.shape))});
      }
    }
    const out = {steps, R, sweeps, seed: s};
    m.set(key, out);
    return out;
  }

  // A CP fit's columns carry their scale anywhere: a*2 with c/2 is the same
  // tensor. So a term is drawn as a weight and three unit vectors -- lambda_r
  // = |a_r| |b_r| |c_r| -- sorted heaviest first, with a and b turned so their
  // largest entry is positive and any leftover sign carried by c. `order[r]`
  // is the fitted column that became term r.
  //
  // `congruence[p][q]` is the cosine between terms p and q as whole rank-1
  // tensors, which is the product of their three cosines. Two terms near -1
  // point opposite ways: both large, mostly cancelling, the fit spending its
  // numbers on a difference -- CP's known degeneracy. `cancelling` lists the
  // pairs past CANCEL, heaviest first.
  const CANCEL = -0.85;

  function cpNormalize(fit) {
    const F = fit.factors;
    const R = F[0][0].length;
    const terms = [];
    for (let r = 0; r < R; r++) {
      const cols = F.map((M) => M.map((row) => row[r]));
      const norms = cols.map((v) => Math.sqrt(v.reduce((a, x) => a + x * x, 0)));
      const unit = cols.map((v, m) => v.map((x) => (norms[m] > 0 ? x / norms[m] : 0)));
      for (let m = 0; m < unit.length - 1; m++) {
        let big = 0;
        for (let i = 1; i < unit[m].length; i++) if (Math.abs(unit[m][i]) > Math.abs(unit[m][big])) big = i;
        if (unit[m][big] < 0) {
          unit[m] = unit[m].map((x) => -x);
          const last = unit.length - 1;
          unit[last] = unit[last].map((x) => -x);
        }
      }
      terms.push({col: r, weight: norms.reduce((a, b) => a * b, 1), vecs: unit});
    }
    terms.sort((p, q) => q.weight - p.weight);
    const dot = (u, v) => u.reduce((a, x, i) => a + x * v[i], 0);
    const congruence = terms.map((p) => terms.map((q) =>
      p.vecs.reduce((acc, u, m) => acc * dot(u, q.vecs[m]), 1)));
    const cancelling = [];
    for (let p = 0; p < R; p++)
      for (let q = p + 1; q < R; q++)
        if (congruence[p][q] < CANCEL) cancelling.push([p, q]);
    return {
      weights: terms.map((t) => t.weight),
      factors: [0, 1, 2].map((m) => terms.map((t) => t.vecs[m])),   // [mode][term] -> vector
      order: terms.map((t) => t.col),
      congruence, cancelling
    };
  }

  function normalize(v) {
    const n = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
    return v.map((x) => x / n);
  }
  const colOf = (A, c) => A.map((row) => row[c]);
  const absCos = (u, v) => {
    const nu = normalize(u), nv = normalize(v);
    return Math.abs(nu.reduce((a, x, i) => a + x * nv[i], 0));
  };

  // Greedy match of every planted term to its best unused fitted column,
  // across all three modes at once -- a term is "recovered" only if its
  // shape agrees in pickup, dropoff and hour together, not one axis alone.
  function matchTerms(fitted, planted) {
    const R = fitted.factors[0][0].length;
    const score = (r, p) =>
      absCos(colOf(fitted.factors[0], r), planted[p].a) *
      absCos(colOf(fitted.factors[1], r), planted[p].b) *
      absCos(colOf(fitted.factors[2], r), planted[p].c);
    const used = new Set();
    const matches = [];
    for (let p = 0; p < planted.length; p++) {
      let best = -1, bestScore = -1;
      for (let r = 0; r < R; r++) {
        if (used.has(r)) continue;
        const sc = score(r, p);
        if (sc > bestScore) { bestScore = sc; best = r; }
      }
      // With R below the number of planted terms there is no column left to
      // match against: that is a score of zero, not the -1 the search
      // started from. A negative score reaches a bar chart as a bar drawn
      // downwards off the bottom of the stage, which nothing clips and
      // nothing reports.
      if (best < 0) { matches.push({term: p, col: -1, score: 0}); continue; }
      used.add(best);
      matches.push({term: p, col: best, score: bestScore});
    }
    return matches;
  }

  // Three planted rank-1 terms on the taxi tensor's own shape, so CP at this
  // shape and CP on the real taxi tensor share one rank slider and one
  // reading of `cpParams`. Distinct scales keep the three terms from being a
  // degenerate, order-ambiguous mix.
  function synthetic() {
    const shape = [4, 5, 24];
    const scales = [10, 6, 3];
    const terms = scales.map((scale, t) => {
      const rng = lcg(11 + t * 97);
      return {
        a: normalize(Array.from({length: shape[0]}, () => rng() * 2 - 1)),
        b: normalize(Array.from({length: shape[1]}, () => rng() * 2 - 1)),
        c: normalize(Array.from({length: shape[2]}, () => rng() * 2 - 1)),
        scale
      };
    });
    let T = tensor(new Float64Array(shape.reduce((a, b) => a * b, 1)), shape);
    for (const t of terms) {
      const part = outer3(t.a.map((v) => v * t.scale), t.b, t.c);
      for (let i = 0; i < T.data.length; i++) T.data[i] += part.data[i];
    }
    return {T, shape, terms};
  }

  // ─── the unfold's picture, moving ──────────────────────────────────────────
  //
  // What the unfold scene shows -- a mode and how far the cube has been laid
  // flat along it, 0 to 1 -- stepping towards what its controls say, at a
  // fixed speed per second. A change of mode folds the picture back up to the
  // cube before laying it down the new way: one flat matrix cannot become a
  // different one without passing through the cube, and a straight blend
  // between two layouts sends voxels through each other. It never overshoots,
  // and it takes its origin from wherever it was interrupted, which is the
  // part a screenshot cannot show and this state-in, state-out form can pin.
  function morphStep(shown, want, dt, speed) {
    const step = Math.max(0, speed * dt);
    if (shown.mode !== want.mode) {
      if (shown.t <= step) return {mode: want.mode, t: 0};
      return {mode: shown.mode, t: shown.t - step};
    }
    const d = want.t - shown.t;
    if (Math.abs(d) <= step) return {mode: want.mode, t: want.t};
    return {mode: shown.mode, t: shown.t + Math.sign(d) * step};
  }

  // ─── CP budget vs Tucker ────────────────────────────────────────────────────
  //
  // Every Tucker rank triple that fits inside a CP model's parameter count,
  // scored by its HOSVD error; "best" is the lowest error inside the budget,
  // "closest" is the triple whose own parameter count comes nearest the
  // budget from below, which is often a worse, sometimes degenerate, pick.
  // Every rank triple the bases allow, scored once and cached on the tensor:
  // 4 x 5 x 20 = 400 HOSVDs of a 480-entry tensor. The budget scene used to
  // run a fresh HOSVD for every triple under budget on every change, twice.
  const candCache = new WeakMap();

  function tuckerCandidates(T, bases) {
    if (candCache.has(T)) return candCache.get(T);
    const B = bases || hosvdBases(T);
    const rmax = B.map((b) => b.U[0].length);
    const all = [];
    for (let r0 = 1; r0 <= rmax[0]; r0++)
      for (let r1 = 1; r1 <= rmax[1]; r1++)
        for (let r2 = 1; r2 <= rmax[2]; r2++) {
          const h = hosvd(T, [r0, r1, r2], B);
          all.push({
            ranks: [r0, r1, r2], params: h.params, error: h.error,
            degenerate: r0 === 1 || r1 === 1 || r2 === 1
          });
        }
    candCache.set(T, all);
    return all;
  }

  // The lowest HOSVD error any Tucker triple reaches for each budget, as a
  // staircase: one step per triple that beats everything cheaper. Ties on
  // parameters keep the lower error.
  function tuckerFrontier(T, bases) {
    const all = tuckerCandidates(T, bases).slice().sort((a, b) => a.params - b.params || a.error - b.error);
    const steps = [];
    let best = Infinity;
    for (const c of all) {
      if (c.error < best - 1e-15) { best = c.error; steps.push(c); }
    }
    return steps;
  }

  function tuckerSearch(T, budget, bases) {
    const B = bases || hosvdBases(T);
    const rmax = B.map((b) => b.U[0].length);
    const candidates = tuckerCandidates(T, B).filter((c) => c.params <= budget);
    candidates.sort((a, b) => a.error - b.error);
    const best = candidates[0];
    const closest = candidates.reduce((a, b) => {
      if (b.params > a.params) return b;
      if (b.params === a.params && b.error < a.error) return b;
      return a;
    }, candidates[0]);
    return {best, closest, candidates, rmax};
  }

  const FactorCore = {
    tensor, at, fibre,
    unfold, fold, unfoldIndex, flatIndex, multiIndex, marginal, argmax,
    modeProduct, outer3, relError, norm, largestMiss, svdEnergy,
    hosvdBases, hosvd, unfoldingRebuild, coreTerm, signFix, tuckerParams,
    cpParams, cpAls, cpSolveMode, cpTrace, cpNormalize, cpRecon, matchTerms, CANCEL,
    tuckerCandidates, tuckerFrontier, tuckerSearch, synthetic,
    morphStep, lcg
  };
  if (typeof module !== "undefined" && module.exports) module.exports = FactorCore;
  else root.FactorCore = FactorCore;
})(typeof window !== "undefined" ? window : this);
