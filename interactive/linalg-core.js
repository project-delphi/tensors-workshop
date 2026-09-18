// The arithmetic under the projection & SVD stage: least squares, the
// pseudoinverse, the condition number, and the SVD everything else is built
// on. It is kept apart from the widget's HTML so `npm test` can pin it
// without a browser (tests/linalg_core.test.cjs), for the reason
// tensor-core.js exists: this is the lesson the widget is there to show, and
// a wrong number here is a wrong claim on screen rather than a broken page.
//
// Two state machines are here for the *other* reason tensor-core.js gives --
// they are invisible in a screenshot and survive an end-state assertion. An
// interrupted tween that takes its origin from the wrong place, and a step
// that flickers when two sections share the activation band, are both bugs
// you can only see while they happen. So they are written the same way the
// idle drift is: a state goes in, a new state comes out, and the widget owns
// the clock and the DOM.
//
// A plain script, not a module: the widget loads it with a <script src> so it
// works from file:// and Node picks it up through module.exports.
//
// Matrices are arrays of rows, `A[i][j]`, i < m, j < n. Vectors are flat
// arrays. Nothing here mutates an argument.
(function (root) {
  "use strict";

  const EPS = 2.220446049250313e-16;

  // ─── small dense helpers ──────────────────────────────────────────────────

  const rows = (A) => A.length;
  const cols = (A) => (A.length ? A[0].length : 0);
  const copy = (A) => A.map((r) => r.slice());
  const zeros = (m, n) => Array.from({length: m}, () => new Array(n).fill(0));
  const eye = (n) => zeros(n, n).map((r, i) => { r[i] = 1; return r; });

  const transpose = (A) =>
    Array.from({length: cols(A)}, (_, j) => A.map((r) => r[j]));

  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  const norm = (a) => Math.sqrt(dot(a, a));
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const scale = (a, k) => a.map((v) => v * k);

  // A @ B
  function mul(A, B) {
    const Bt = transpose(B);
    return A.map((r) => Bt.map((c) => dot(r, c)));
  }

  // A @ x
  const mulVec = (A, x) => A.map((r) => dot(r, x));

  // The j-th column of A, as a flat array.
  const col = (A, j) => A.map((r) => r[j]);

  const det2 = (A) => A[0][0] * A[1][1] - A[0][1] * A[1][0];

  const det3 = (A) =>
    A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
    A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
    A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

  // ─── the SVD ──────────────────────────────────────────────────────────────
  //
  // One-sided Jacobi. Rotate pairs of columns until every pair is orthogonal;
  // what is left is U scaled by the singular values, and the accumulated
  // rotations are V. It is short, it needs no eigenvalue solver, and at the
  // sizes on this page (2x2 up to a few dozen rows) it lands at machine
  // precision. Everything else in this file is built on it.
  function svd(A, tol) {
    const m = rows(A);
    const n = cols(A);

    // Jacobi wants at least as many rows as columns. A wide matrix is the
    // tall one lying down, so run on the transpose and swap the two bases --
    // the wide-matrix step needs this and gets it wrong silently otherwise.
    if (m < n) {
      const s = svd(transpose(A), tol);
      return {U: s.V, S: s.S, V: s.U};
    }

    const W = copy(A);
    const V = eye(n);

    for (let sweep = 0; sweep < 60; sweep++) {
      let off = 0;
      for (let p = 0; p < n - 1; p++) {
        for (let q = p + 1; q < n; q++) {
          let alpha = 0, beta = 0, gamma = 0;
          for (let i = 0; i < m; i++) {
            alpha += W[i][p] * W[i][p];
            beta += W[i][q] * W[i][q];
            gamma += W[i][p] * W[i][q];
          }
          if (Math.abs(gamma) <= EPS * Math.sqrt(alpha * beta) || gamma === 0) continue;
          off += gamma * gamma;

          const zeta = (beta - alpha) / (2 * gamma);
          // Math.sign(0) is 0, which would make t 0 and the rotation a no-op
          // on the one case that most needs it: alpha === beta, where the
          // answer is a 45-degree turn.
          const sgn = zeta >= 0 ? 1 : -1;
          const t = sgn / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
          const c = 1 / Math.sqrt(1 + t * t);
          const s = c * t;

          for (let i = 0; i < m; i++) {
            const wp = W[i][p], wq = W[i][q];
            W[i][p] = c * wp - s * wq;
            W[i][q] = s * wp + c * wq;
          }
          for (let i = 0; i < n; i++) {
            const vp = V[i][p], vq = V[i][q];
            V[i][p] = c * vp - s * vq;
            V[i][q] = s * vp + c * vq;
          }
        }
      }
      if (off === 0) break;
    }

    // The column norms are the singular values; normalising the columns gives
    // U. Sort descending, carrying U and V with it.
    const S = [];
    for (let j = 0; j < n; j++) S.push(norm(col(W, j)));
    const order = S.map((v, j) => j).sort((a, b) => S[b] - S[a]);

    const Ssorted = order.map((j) => S[j]);
    const Ucols = order.map((j) => col(W, j));
    const Vcols = order.map((j) => col(V, j));

    // sigma ~ 0 makes u = a / sigma a vector of NaN, and that is not a corner
    // case here -- it is the collapse step, driven there by a slider. Fill the
    // direction in by orthogonalising a fresh axis against the columns already
    // found, so U stays an orthonormal basis and the picture keeps an axis to
    // draw.
    const cut = (tol === undefined ? Math.max(m, n) * EPS * (Ssorted[0] || 0) : tol);
    for (let j = 0; j < n; j++) {
      if (Ssorted[j] > cut && Ssorted[j] > 0) {
        Ucols[j] = scale(Ucols[j], 1 / Ssorted[j]);
      } else {
        Ucols[j] = completeColumn(Ucols.slice(0, j), m);
      }
    }

    // Fix the sign, or a slider crossing a threshold flips a drawn arrow end
    // for end and it reads as a bug. The rule is arbitrary and only has to be
    // stable: the largest-magnitude component of each right singular vector is
    // positive, and its left partner follows it.
    for (let j = 0; j < n; j++) {
      let at = 0;
      for (let i = 1; i < Vcols[j].length; i++) {
        if (Math.abs(Vcols[j][i]) > Math.abs(Vcols[j][at])) at = i;
      }
      if (Vcols[j][at] < 0) {
        Vcols[j] = scale(Vcols[j], -1);
        Ucols[j] = scale(Ucols[j], -1);
      }
    }

    return {U: transpose(Ucols), S: Ssorted, V: transpose(Vcols)};
  }

  // A unit vector of length m orthogonal to every column in `taken`. Tries the
  // axes in turn, because at least one of them has a component left over.
  function completeColumn(taken, m) {
    for (let axis = 0; axis < m; axis++) {
      let v = new Array(m).fill(0);
      v[axis] = 1;
      for (const u of taken) v = sub(v, scale(u, dot(v, u)));
      const len = norm(v);
      if (len > 1e-8) return scale(v, 1 / len);
    }
    const v = new Array(m).fill(0);
    v[0] = 1;
    return v;
  }

  // NumPy's own cutoff. Getting it wrong is a wrong rank on screen, which no
  // screenshot catches and no end-state assertion sees.
  const rankTol = (A, S) => Math.max(rows(A), cols(A)) * EPS * (S[0] || 0);

  const rank = (A, tol) => {
    const S = svd(A).S;
    const cut = tol === undefined ? rankTol(A, S) : tol;
    return S.filter((s) => s > cut).length;
  };

  // sigma_max / sigma_min. Infinity when the matrix is singular, which is the
  // honest answer and the one the collapse step prints.
  function cond(A) {
    const S = svd(A).S;
    const lo = S[S.length - 1];
    return lo > 0 ? S[0] / lo : Infinity;
  }

  // The Moore-Penrose pseudoinverse, from the SVD, exactly as section 07's
  // eq. 2.47 defines it.
  function pinv(A, tol) {
    const {U, S, V} = svd(A);
    const cut = tol === undefined ? rankTol(A, S) : tol;
    const D = S.map((s) => (s > cut ? 1 / s : 0));
    const VD = V.map((r) => r.map((v, j) => v * D[j]));
    return mul(VD, transpose(U));
  }

  // ─── least squares, two ways ──────────────────────────────────────────────
  //
  // These are deliberately two functions rather than one with a flag. Their
  // answers diverging on an ill-conditioned X is the whole lesson of section
  // 09's core activity -- "both fits are almost exact, so their coefficients
  // must agree" is the claim its predict-first cell asks a reader to judge --
  // and a shared implementation would let that lesson quietly become a branch
  // nobody exercises.

  // Modified Gram-Schmidt. Reduced QR: Q is m x n, R is n x n.
  function qr(A) {
    const m = rows(A);
    const n = cols(A);
    const Q = Array.from({length: n}, (_, j) => col(A, j));
    const R = zeros(n, n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < j; i++) {
        R[i][j] = dot(Q[i], Q[j]);
        Q[j] = sub(Q[j], scale(Q[i], R[i][j]));
      }
      R[j][j] = norm(Q[j]);
      Q[j] = R[j][j] > 0 ? scale(Q[j], 1 / R[j][j]) : new Array(m).fill(0);
    }
    return {Q: transpose(Q), R: R};
  }

  // Back substitution on an upper-triangular R.
  function backSolve(R, b) {
    const n = b.length;
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let j = i + 1; j < n; j++) s -= R[i][j] * x[j];
      x[i] = R[i][i] === 0 ? 0 : s / R[i][i];
    }
    return x;
  }

  // Gaussian elimination with partial pivoting -- what np.linalg.solve does.
  function solve(A, b) {
    const n = b.length;
    const M = A.map((r, i) => r.concat([b[i]]));
    for (let k = 0; k < n; k++) {
      let piv = k;
      for (let i = k + 1; i < n; i++) {
        if (Math.abs(M[i][k]) > Math.abs(M[piv][k])) piv = i;
      }
      if (piv !== k) { const t = M[k]; M[k] = M[piv]; M[piv] = t; }
      if (M[k][k] === 0) continue;
      for (let i = k + 1; i < n; i++) {
        const f = M[i][k] / M[k][k];
        for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j];
      }
    }
    const R = M.map((r) => r.slice(0, n));
    return backSolve(R, M.map((r) => r[n]));
  }

  // QR: never forms X'X, so the error scales with kappa(X) * eps.
  function lstsqQR(X, y) {
    const {Q, R} = qr(X);
    return backSolve(R, mulVec(transpose(Q), y));
  }

  // The normal equations: forms X'X, whose condition number is kappa(X)
  // squared. Same data, same objective, error squared.
  function lstsqNormal(X, y) {
    const Xt = transpose(X);
    return solve(mul(Xt, X), mulVec(Xt, y));
  }

  // The projection of y onto the column space of X: the picture step 1 draws.
  // Solved through QR because the residual's right angle is the claim on
  // screen, and the normal equations are the path that loses it first.
  function project(X, y) {
    const beta = lstsqQR(X, y);
    const yhat = mulVec(X, beta);
    const residual = sub(y, yhat);
    return {beta: beta, yhat: yhat, residual: residual, rnorm: norm(residual)};
  }

  // Ridge in the SVD basis: each direction is shrunk by sigma / (sigma^2 + l).
  // Written this way rather than as (X'X + lI)^-1 X'y because the shrinkage
  // per singular direction *is* what the step draws.
  function ridge(X, y, lambda) {
    const {U, S, V} = svd(X);
    const c = mulVec(transpose(U), y);
    const d = S.map((s, j) => (s * c[j]) / (s * s + lambda));
    return mulVec(V, d);
  }

  // ─── what the conditioning costs ──────────────────────────────────────────

  // kappa = 10^k costs you k of the roughly 16 digits a double carries.
  const digitsLost = (kappa) => (kappa > 0 && isFinite(kappa) ? Math.log10(kappa) : Infinity);

  // The standard bound: a relative wobble in b becomes at most kappa times
  // that in x. The widget prints it beside a measured perturbation, so the
  // test pins the bound against a real solve rather than against itself.
  const perturbationBound = (kappa, relB) => kappa * relB;

  // ─── step 8: the image of the unit circle ─────────────────────────────────
  //
  // A maps the unit circle to an ellipse whose semi-axes are sigma_i * u_i,
  // reached from the circle at v_i. Returning all of it together is what lets
  // the widget draw `A v_i = sigma_i u_i` as a computed identity rather than
  // as a coincidence it has arranged.
  function ellipse(A) {
    const {U, S, V} = svd(A);
    const axes = S.map((s, j) => ({
      sigma: s,
      v: col(V, j),          // where on the circle
      u: col(U, j),          // where it lands
      axis: scale(col(U, j), s)
    }));
    return {axes: axes, S: S, U: U, V: V, apply: (x) => mulVec(A, x)};
  }

  // Which right singular vector, if any, x points along. Returns the index or
  // -1. The widget's snap keys on this, so the alignment is measured in the
  // same place the arrows are drawn from.
  //
  // The comparison is signed, deliberately. The claim on screen is
  // `A v = sigma u`, and `A(-v) = -sigma u` -- so the antipode is *not* the
  // same statement, even though the length is. Taking |cos| here let the page
  // say "x is on v1, so A x is exactly sigma_1 u1" while the drawn arrow
  // pointed the other way.
  function alignedWith(A, x, tolCos) {
    return alignedWithAxes(ellipse(A).axes, x, tolCos);
  }

  // The same question against axes already in hand. A caller inside a render
  // loop has them; making it pass A instead meant an SVD per frame.
  function alignedWithAxes(axes, x, tolCos) {
    const nx = norm(x);
    if (nx === 0) return -1;
    const cut = tolCos === undefined ? 0.9995 : tolCos;
    for (let j = 0; j < axes.length; j++) {
      if (dot(axes[j].v, x) / nx >= cut) return j;
    }
    return -1;
  }

  // ─── the tween ────────────────────────────────────────────────────────────
  //
  // The GSAP replacement, and the reason it is in this file rather than in the
  // page: where an *interrupted* tween takes its origin is invisible in a
  // screenshot and survives any end-state assertion, which is exactly the
  // argument tensor-core.js makes for keeping the idle drift here. Retarget
  // from the current interpolated value, never from the previous endpoint, or
  // a reader who scrolls fast sees the stage jump backwards before it catches
  // up.

  const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const tweenStart = (from, to, now, ms) => ({from: from, to: to, t0: now, ms: ms});

  function tweenAt(s, now) {
    if (!s || s.ms <= 0) return {value: s ? s.to : 0, done: true};
    const t = Math.min(1, Math.max(0, (now - s.t0) / s.ms));
    const k = easeInOutCubic(t);
    return {value: s.from + (s.to - s.from) * k, done: t >= 1};
  }

  // A new destination mid-flight. The origin is wherever it is *now*. Takes a
  // null state the way tweenAt does, so a first retarget before anything has
  // started is a plain start rather than a crash.
  function retarget(s, to, now, ms) {
    const here = s ? tweenAt(s, now).value : to;
    const span = ms === undefined ? (s ? s.ms : 0) : ms;
    return tweenStart(here, to, now, span);
  }

  // ─── which step is active ─────────────────────────────────────────────────
  //
  // The activation band is a thin strip through the middle of the viewport.
  // `rects` are the step sections' viewport-space {top, bottom}, in order.
  // Two states flicker if they are not decided deliberately: nothing in the
  // band (short steps, or a scroll past the end) and two things in it. Neither
  // is visible in a screenshot, and both are visible to a reader.
  function pickActive(rects, bandTop, bandBottom, previous) {
    const mid = (bandTop + bandBottom) / 2;
    const near = (r) => Math.abs((r.top + r.bottom) / 2 - mid);

    const inBand = [];
    for (let i = 0; i < rects.length; i++) {
      if (rects[i].bottom > bandTop && rects[i].top < bandBottom) inBand.push(i);
    }
    // One is the ordinary case. Several means the band spans a boundary, and
    // the nearest centre is the one the reader is looking at.
    if (inBand.length === 1) return inBand[0];
    if (inBand.length > 1) {
      return inBand.reduce((best, i) => (near(rects[i]) < near(rects[best]) ? i : best));
    }
    // None. Holding the previous step is what stops a flicker through a gap;
    // falling back to the nearest is for the first call, before there is one.
    if (previous !== undefined && previous !== null &&
        previous >= 0 && previous < rects.length) return previous;
    if (!rects.length) return -1;
    return rects.reduce((best, r, i) => (near(r) < near(rects[best]) ? i : best), 0);
  }

  const LinalgCore = {
    EPS,
    rows, cols, copy, zeros, eye, transpose, dot, norm, add, sub, scale,
    mul, mulVec, col, det2, det3,
    svd, rank, rankTol, cond, pinv,
    qr, backSolve, solve, lstsqQR, lstsqNormal, project, ridge,
    digitsLost, perturbationBound,
    ellipse, alignedWith, alignedWithAxes,
    easeInOutCubic, tweenStart, tweenAt, retarget,
    pickActive
  };
  if (typeof module !== "undefined" && module.exports) module.exports = LinalgCore;
  else root.LinalgCore = LinalgCore;
})(typeof window !== "undefined" ? window : globalThis);
