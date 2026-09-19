// The arithmetic under the projection & SVD stage: least squares, the
// pseudoinverse, the condition number, the null space, the eigenvectors of a
// 3 x 3, float32 rounding, and the SVD everything else is built on. It is kept apart from the widget's HTML so `npm test` can pin it
// without a browser (tests/linalg_core.test.cjs), for the reason
// tensor-core.js exists: this is the lesson the widget is there to show, and
// a wrong number here is a wrong claim on screen rather than a broken page.
//
// Three state machines are here for the *other* reason tensor-core.js gives --
// they are invisible in a screenshot and survive an end-state assertion. An
// interrupted tween that takes its origin from the wrong place, a step that
// flickers when two sections share the activation band, and a camera whose
// idle drift creeps a little further from its origin on every pause, are all
// bugs you can only see while they happen. So they are written the same way
// the visualizer's drift is: a state goes in, a new state comes out, and the
// widget owns the clock and the DOM.
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

  // ─── the camera ───────────────────────────────────────────────────────────
  //
  // Where the stage looks from, as two angles and a dolly. It is here rather
  // than in the page for the reason the tween above is: an orbit whose clamp is
  // wrong at one end, and an idle drift whose origin creeps a little on every
  // pause, are both invisible in a screenshot and survive an end-state
  // assertion. A state goes in, a new state comes out; the page owns the
  // clock, the pointer and three.js, and nothing here knows any of them exist.
  //
  // Both render paths take the camera from `orbitEye`, which is what keeps the
  // promise `CAM` makes in the widget: the flat SVG fallback derives its screen
  // basis from the GL camera, so the two paths show the same view rather than
  // two views that happen to have been aimed the same way once.

  const CAMERA = {
    elMin: -0.12,     // radians above the horizon. Barely below it: the grid
    elMax: 1.25,      // floor is opaque from underneath and says nothing there
    dollyMin: 0.55,   // a multiplier on the scene's fitted radius, so a step that
    dollyMax: 1.9,    // refits its framing keeps whatever zoom the reader chose
    sway: 0.24,       // radians of azimuth either side of the origin
    swayMs: 19000,    // one full there-and-back
    bob: 0.10,        // radians of elevation, and only ever *up*: the drift must
    bobMs: 9500       // never dip under a floor, and runs at half the sway so the
                      // camera is highest at each end of the swing
  };

  // One convention for both scenes: azimuth turns about world +Y, elevation
  // lifts above the x-z plane, and the camera's own up stays +Y -- so nothing
  // the stage draws ever rolls. A scene that is flat, like the SVD portal's two
  // planes, is then a card being tipped rather than a plate being spun, and it
  // says so by clamping azimuth as well as elevation.
  const UP = [0, 1, 0];
  const RIGHT = [1, 0, 0];
  const FRONT = [0, 0, 1];

  const orbitView = (az, el, dolly) =>
    ({az: az || 0, el: el || 0, dolly: dolly === undefined ? 1 : dolly});

  // Elevation is always clamped: past either end the scene is being read from
  // somewhere it draws nothing. Azimuth is free unless the caller says
  // otherwise -- a solid scene may be turned all the way round and come back,
  // and a flat one may not, because the far side of a plane is the same picture
  // mirrored and every label on it is backwards.
  function orbitClamp(view, lim) {
    const l = lim || {};
    const elMin = l.elMin === undefined ? CAMERA.elMin : l.elMin;
    const elMax = l.elMax === undefined ? CAMERA.elMax : l.elMax;
    const dMin = l.dollyMin === undefined ? CAMERA.dollyMin : l.dollyMin;
    const dMax = l.dollyMax === undefined ? CAMERA.dollyMax : l.dollyMax;
    const dolly = view.dolly === undefined ? 1 : view.dolly;
    let az = view.az;
    if (l.azMin !== undefined) az = Math.max(l.azMin, az);
    if (l.azMax !== undefined) az = Math.min(l.azMax, az);
    return {
      az: az,
      el: Math.min(elMax, Math.max(elMin, view.el)),
      dolly: Math.min(dMax, Math.max(dMin, dolly))
    };
  }

  const orbitBy = (view, dAz, dEl, lim) =>
    orbitClamp({az: view.az + dAz, el: view.el + dEl, dolly: view.dolly}, lim);

  const orbitDolly = (view, factor, lim) =>
    orbitClamp({az: view.az, el: view.el,
                dolly: (view.dolly === undefined ? 1 : view.dolly) * factor}, lim);

  // The unit vector from the target to the camera.
  function orbitDir(view) {
    const ce = Math.cos(view.el), se = Math.sin(view.el);
    return [ce * Math.sin(view.az), se, ce * Math.cos(view.az)];
  }

  const orbitEye = (target, radius, view) =>
    add(target, scale(orbitDir(view),
                      radius * (view.dolly === undefined ? 1 : view.dolly)));

  // The inverse. A pose written as a camera position -- which is how step 1's
  // fixed camera was written, and it is framed on data, not on a round number
  // -- becomes the orbit's origin without anyone typing an angle for it.
  function orbitFrom(target, eye) {
    const d = sub(eye, target);
    const r = norm(d) || 1;
    const u = scale(d, 1 / r);
    return {
      az: Math.atan2(dot(u, RIGHT), dot(u, FRONT)),
      el: Math.asin(Math.max(-1, Math.min(1, dot(u, UP)))),
      dolly: 1,
      radius: r
    };
  }

  // ─── the idle drift ───────────────────────────────────────────────────────
  //
  // The same machine tensor-core.js runs for the reshape visualizer, with this
  // stage's own constants and one difference: there is no breath on the dolly.
  // The portal's framing is fitted to sigma_1 and a breath that pulled the
  // camera *in* would crop the ellipse it exists to show, so the second axis of
  // motion is a small lift in elevation instead -- which can only ever flatten
  // against `elMax`, never crop anything.
  //
  // `seeded` and `phase` carry the same weight they carry there. The excursion
  // is bounded *around an origin*, so re-reading the origin from the live view
  // on every resume would make each pause the origin of the next stretch, the
  // lift would ratchet the camera upwards a little every time a reader crossed
  // the stage, and neither bound would bound anything.

  const driftIdle = () =>
    ({on: false, seeded: false, az0: 0, el0: 0, dolly0: 1, phase: 0, t0: 0});

  // The pose `phase` ms into a stretch that began at (az0, el0).
  function driftPose(s, phase, lim) {
    const turn = 2 * Math.PI * phase;
    // A raised cosine: starts at the reader's elevation, lifts by `bob`, comes
    // back. Never below -- see above.
    const lift = (1 - Math.cos(turn / CAMERA.bobMs)) / 2;
    return orbitClamp({
      az: s.az0 + CAMERA.sway * Math.sin(turn / CAMERA.swayMs),
      el: s.el0 + CAMERA.bob * lift,
      dolly: s.dolly0
    }, lim);
  }

  // Starting. Seeds the origin from the view the first time only, and puts the
  // clock back by whatever phase the last pause banked.
  function driftStart(s, view, now) {
    const seeded = s.seeded ? s : Object.assign({}, s, {
      az0: view.az, el0: view.el,
      dolly0: view.dolly === undefined ? 1 : view.dolly,
      phase: 0, seeded: true
    });
    return Object.assign({}, seeded, {on: true, t0: now - seeded.phase});
  }

  // Pausing: a pointer crossing the stage. Keeps the origin, banks the phase.
  function driftPause(s, now) {
    return s.on ? Object.assign({}, s, {on: false, phase: now - s.t0}) : s;
  }

  // The reader took the view -- a drag, a key, a dolly. The next stretch belongs
  // around wherever they leave it, so the seed goes with it.
  function driftRelease(s, now) {
    return Object.assign({}, driftPause(s, now), {seeded: false, phase: 0});
  }

  // ─── the null space: step 2 ───────────────────────────────────────────────
  //
  // An orthonormal basis of {x : A x = 0}. The wide-matrix step draws the
  // solution set as a line, x+ plus every multiple of this, and the SVD above
  // only returns rank-many right singular vectors for a wide A -- the null
  // direction is exactly the one it has no column for. So it is completed
  // here, against everything the SVD did return, the same way a zero sigma's
  // left vector is.
  function nullspace(A, tol) {
    const n = cols(A);
    const {S, V} = svd(A);
    const cut = tol === undefined ? rankTol(A, S) : tol;
    const range = [], out = [];
    for (let j = 0; j < S.length; j++) {
      (S[j] > cut ? range : out).push(col(V, j));
    }
    while (range.length + out.length < n) out.push(completeColumn(range.concat(out), n));
    return out;
  }

  // ─── eigenvectors of a 3 x 3: step 5 ──────────────────────────────────────
  //
  // The characteristic cubic, solved by the trigonometric formula, and each
  // eigenvector as the null vector of A - lambda I. Real, distinct eigenvalues
  // only: the step's whole claim is "these three directions are only scaled",
  // and a complex pair or a repeated root is a different picture (a rotation,
  // or a plane of them) that this page does not draw. Both return [] rather
  // than a wrong arrow, and the widget says so.
  function eig3(A) {
    const tr = A[0][0] + A[1][1] + A[2][2];
    // The sum of the principal 2 x 2 minors.
    const c2 = (A[0][0] * A[1][1] - A[0][1] * A[1][0]) +
               (A[0][0] * A[2][2] - A[0][2] * A[2][0]) +
               (A[1][1] * A[2][2] - A[1][2] * A[2][1]);
    const d = det3(A);
    // lambda^3 - tr lambda^2 + c2 lambda - d = 0, depressed by lambda = t + tr/3.
    const p = c2 - tr * tr / 3;
    const q = (-2 * tr * tr * tr + 9 * tr * c2 - 27 * d) / 27;
    const disc = -(4 * p * p * p + 27 * q * q);
    // The scale the discriminant is measured against, or a matrix with
    // eigenvalues near 1e-3 reads as "repeated" through an absolute epsilon.
    const mag = Math.max(1, Math.abs(tr), Math.abs(c2), Math.abs(d));
    if (!(disc > 1e-9 * Math.pow(mag, 6)) || p >= 0) return [];
    const r = 2 * Math.sqrt(-p / 3);
    const phi = Math.acos(Math.max(-1, Math.min(1, (3 * q / (2 * p)) * Math.sqrt(-3 / p))));
    const lambdas = [0, 1, 2].map((k) => r * Math.cos(phi / 3 - 2 * Math.PI * k / 3) + tr / 3);

    const out = [];
    for (const lambda of lambdas) {
      const B = A.map((row, i) => row.map((v, j) => (i === j ? v - lambda : v)));
      // Any two rows of B span its row space when B has rank 2; their cross
      // product is normal to both, which is the null vector. Take the longest.
      let best = null, bestLen = 0;
      const pairs = [[0, 1], [0, 2], [1, 2]];
      for (const [i, j] of pairs) {
        const v = cross3(B[i], B[j]);
        const len = norm(v);
        if (len > bestLen) { best = v; bestLen = len; }
      }
      if (!best || bestLen < 1e-12 * mag * mag) return [];
      let v = scale(best, 1 / bestLen);
      // The same sign rule the SVD keeps, and for the same reason: an
      // eigenvector is a line, and a slider must not flip the arrow drawn on it.
      let at = 0;
      for (let i = 1; i < 3; i++) if (Math.abs(v[i]) > Math.abs(v[at])) at = i;
      if (v[at] < 0) v = scale(v, -1);
      out.push({lambda: lambda, v: v});
    }
    return out.sort((a, b) => b.lambda - a.lambda);
  }

  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1],
                            a[2] * b[0] - a[0] * b[2],
                            a[0] * b[1] - a[1] * b[0]];

  // Which eigen-direction x lies along, or -1. Unlike alignedWithAxes this is
  // unsigned: -v is the same eigenvector with the same lambda, and the claim
  // on screen is "M x is a multiple of x", which the antipode satisfies too.
  function alignedEigen(eig, x, tolCos) {
    const nx = norm(x);
    if (nx === 0) return -1;
    const cut = tolCos === undefined ? 0.9999 : tolCos;
    for (let j = 0; j < eig.length; j++) {
      if (Math.abs(dot(eig[j].v, x)) / nx >= cut) return j;
    }
    return -1;
  }

  // ─── near-collinear predictors: steps 6 and 7 ─────────────────────────────
  //
  // Two unit columns in the floor plane (y = 0), theta radians apart, the pair
  // turned phi0 off the x-axis. The turn is not decoration: float32 keeps
  // *relative* precision, so a difference that lives in a component near zero
  // is representable however small it is, and two columns split only there
  // would never round together. At phi0 = pi/4 the difference sits in
  // components near 0.7, where the spacing is 2^-24, and step 7's collapse is
  // a fact about the format rather than a threshold in the page.
  function basisAtAngle(theta, phi0) {
    const a = phi0 === undefined ? Math.PI / 4 : phi0;
    const x1 = [Math.cos(a), 0, Math.sin(a)];
    const x2 = [Math.cos(a + theta), 0, Math.sin(a + theta)];
    return {x1: x1, x2: x2, X: x1.map((v, i) => [v, x2[i]])};
  }

  // ─── float32: step 7 ──────────────────────────────────────────────────────

  // Every entry rounded to the nearest single-precision float, which is what a
  // float32 tensor holds. Math.fround is IEEE round-to-nearest-even, so this
  // is the real rounding and not a model of it.
  const f32 = (v) => v.map((x) => Math.fround(x));

  // The spacing between adjacent float32 values at x: 23 fraction bits, so one
  // unit in the last place is 2^(exponent - 23). At zero, the smallest
  // subnormal, so a caller that scales by it never divides by nothing.
  function ulp32(x) {
    const a = Math.abs(x);
    if (a === 0 || !isFinite(a)) return Math.pow(2, -149);
    return Math.pow(2, Math.max(-149, Math.floor(Math.log2(a)) - 23));
  }

  // Cramer's rule on a 2 x 2, with no guard on the determinant -- and that is
  // the point. solve() above pivots around a zero and backSolve() writes 0 for
  // it; both are what a library does. This is what the textbook formula
  // beta = (X'X)^-1 X'y does when X'X is singular: divides by zero and hands
  // back NaN. Step 7 prints that answer because it is the true one.
  function cramer2(G, c) {
    const det = G[0][0] * G[1][1] - G[0][1] * G[1][0];
    return [(c[0] * G[1][1] - c[1] * G[0][1]) / det,
            (G[0][0] * c[1] - G[1][0] * c[0]) / det];
  }

  // ─── the tween, for a vector ──────────────────────────────────────────────
  //
  // The cube's corners and the house's points ease from wherever they are to
  // A v, and the reason the scalar tween lives here applies to each of them:
  // a slider dragged mid-flight must retarget from the interpolated position,
  // never from the last endpoint, or the shape jumps back before it catches
  // up. One state per vector, the same easing, the same retarget rule.
  const tweenVec = (from, to, now, ms) =>
    ({from: from.slice(), to: to.slice(), t0: now, ms: ms});

  function tweenVecAt(s, now) {
    if (!s || s.ms <= 0) return {value: s ? s.to.slice() : [], done: true};
    const t = Math.min(1, Math.max(0, (now - s.t0) / s.ms));
    const k = easeInOutCubic(t);
    return {value: s.from.map((f, i) => f + (s.to[i] - f) * k), done: t >= 1};
  }

  function retargetVec(s, to, now, ms) {
    const here = s ? tweenVecAt(s, now).value : to.slice();
    const span = ms === undefined ? (s ? s.ms : 0) : ms;
    return tweenVec(here, to, now, span);
  }

  const LinalgCore = {
    EPS,
    rows, cols, copy, zeros, eye, transpose, dot, norm, add, sub, scale,
    mul, mulVec, col, det2, det3,
    svd, rank, rankTol, cond, pinv,
    qr, backSolve, solve, lstsqQR, lstsqNormal, project, ridge,
    digitsLost, perturbationBound,
    ellipse, alignedWith, alignedWithAxes,
    nullspace, eig3, alignedEigen, basisAtAngle, f32, ulp32, cramer2,
    easeInOutCubic, tweenStart, tweenAt, retarget,
    tweenVec, tweenVecAt, retargetVec,
    pickActive,
    CAMERA, UP, orbitView, orbitClamp, orbitBy, orbitDolly,
    orbitDir, orbitEye, orbitFrom,
    driftIdle, driftPose, driftStart, driftPause, driftRelease
  };
  if (typeof module !== "undefined" && module.exports) module.exports = LinalgCore;
  else root.LinalgCore = LinalgCore;
})(typeof window !== "undefined" ? window : globalThis);
