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

  function cpStep(T, factors, R) {
    const next = factors.slice();
    for (let mode = 0; mode < T.shape.length; mode++) {
      const others = otherAxes(T.shape, mode);
      let V = null;
      for (const ax of others) {
        const G = LC.mul(LC.transpose(next[ax]), next[ax]);
        V = V ? hadamard(V, G) : G;
      }
      next[mode] = LC.mul(mttkrp(T, mode, next, R), LC.pinv(V));
    }
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

  // ─── CP budget vs Tucker ────────────────────────────────────────────────────
  //
  // Every Tucker rank triple that fits inside a CP model's parameter count,
  // scored by its HOSVD error; "best" is the lowest error inside the budget,
  // "closest" is the triple whose own parameter count comes nearest the
  // budget from below, which is often a worse, sometimes degenerate, pick.
  function tuckerSearch(T, budget, bases) {
    const B = bases || hosvdBases(T);
    const rmax = B.map((b) => b.U[0].length);
    const candidates = [];
    for (let r0 = 1; r0 <= rmax[0]; r0++)
      for (let r1 = 1; r1 <= rmax[1]; r1++)
        for (let r2 = 1; r2 <= rmax[2]; r2++) {
          const params = tuckerParams(T.shape, [r0, r1, r2]);
          if (params > budget) continue;
          const h = hosvd(T, [r0, r1, r2], B);
          candidates.push({
            ranks: [r0, r1, r2], params, error: h.error,
            degenerate: r0 === 1 || r1 === 1 || r2 === 1
          });
        }
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
    unfold, fold, modeProduct, outer3, relError,
    hosvdBases, hosvd, signFix, tuckerParams,
    cpParams, cpAls, cpRecon, matchTerms, tuckerSearch, synthetic,
    lcg
  };
  if (typeof module !== "undefined" && module.exports) module.exports = FactorCore;
  else root.FactorCore = FactorCore;
})(typeof window !== "undefined" ? window : this);
