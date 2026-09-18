// Pins the arithmetic under the projection & SVD stage
// (interactive/linalg-core.js). Run with `npm test`; no browser, no render.
//
// Each case is a claim the widget makes on screen, so a failure here is a
// wrong number under a picture rather than a broken page -- the kind of
// regression the browser check, which asserts a handful of end states, cannot
// see. Two of them (`A v = sigma u`, and the two least-squares paths
// diverging) are the literal punchlines of sections 09 and 07.
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../interactive/linalg-core.js');

const near = (a, b, tol, what) =>
  assert.ok(Math.abs(a - b) <= (tol === undefined ? 1e-10 : tol),
    `${what || ''} expected ${b}, got ${a}`);

const nearVec = (a, b, tol, what) => {
  assert.equal(a.length, b.length, `${what || ''} length`);
  a.forEach((v, i) => near(v, b[i], tol, `${what || ''}[${i}]`));
};

const nearMat = (A, B, tol, what) => {
  assert.equal(A.length, B.length, `${what || ''} rows`);
  A.forEach((r, i) => nearVec(r, B[i], tol, `${what || ''}[${i}]`));
};

// U diag(S) V'
const rebuild = ({U, S, V}) =>
  core.mul(U.map((r) => r.map((v, j) => v * S[j])), core.transpose(V));

const WELL = [[3, 1], [1, 2], [2, 4]];                 // 3x2, tall, full rank
const SINGULAR = [[1, 2, 3], [2, 4, 6], [3, 6, 9]];    // rank 1 by construction
const WIDE = [[1, 2, 3], [4, 5, 6]];                   // 2x3, m < n

// A degree-10 Vandermonde is section 09's TODO 1, and is ill-conditioned on
// purpose: it is what makes the two least-squares paths disagree.
function vander(n, deg) {
  return Array.from({length: n}, (_, i) => {
    const x = i / (n - 1);
    return Array.from({length: deg + 1}, (_, k) => Math.pow(x, k));
  });
}

test('U diag(S) V\' rebuilds A, well-conditioned, rank-deficient and wide', () => {
  for (const [name, A] of [['well', WELL], ['singular', SINGULAR], ['wide', WIDE]]) {
    nearMat(rebuild(core.svd(A)), A, 1e-9, name);
  }
});

test('A v_j = sigma_j u_j -- step 8\'s whole claim', () => {
  for (const A of [WELL, [[3, 0], [0, 1]], [[2, 1], [1, 3]], WIDE]) {
    const {U, S, V} = core.svd(A);
    for (let j = 0; j < S.length; j++) {
      const Av = core.mulVec(A, core.col(V, j));
      const su = core.scale(core.col(U, j), S[j]);
      nearVec(Av, su, 1e-9, `j=${j}`);
    }
  }
});

test('U and V are orthonormal', () => {
  for (const A of [WELL, SINGULAR, WIDE]) {
    const {U, V} = core.svd(A);
    nearMat(core.mul(core.transpose(U), U), core.eye(core.cols(U)), 1e-9, 'U\'U');
    nearMat(core.mul(core.transpose(V), V), core.eye(core.cols(V)), 1e-9, 'V\'V');
  }
});

test('a singular matrix still yields a finite unit vector for the zero direction', () => {
  // sigma = 0 makes u = a / sigma a vector of NaN. This is not hypothetical:
  // it is the collapse step, driven there by a slider.
  const {U, S} = core.svd(SINGULAR);
  assert.ok(S[S.length - 1] < 1e-12, 'the third singular value should be ~0');
  for (let j = 0; j < S.length; j++) {
    const u = core.col(U, j);
    assert.ok(u.every(Number.isFinite), `u[${j}] has a non-finite entry`);
    near(core.norm(u), 1, 1e-9, `|u[${j}]|`);
  }
});

test('the sign convention survives a small perturbation', () => {
  // Without a fixed sign, a slider crossing a threshold flips a drawn arrow
  // end for end, which reads as a bug because it is one.
  const A = [[3, 1], [1, 2], [2, 4]];
  const B = A.map((r, i) => r.map((v, j) => v + ((i + j) % 2 ? 1e-9 : -1e-9)));
  const a = core.svd(A);
  const b = core.svd(B);
  for (let j = 0; j < a.S.length; j++) {
    assert.ok(core.dot(core.col(a.V, j), core.col(b.V, j)) > 0.99,
      `v[${j}] flipped under a 1e-9 perturbation`);
    assert.ok(core.dot(core.col(a.U, j), core.col(b.U, j)) > 0.99,
      `u[${j}] flipped under a 1e-9 perturbation`);
  }
});

test('singular values come back sorted, descending', () => {
  for (const A of [WELL, SINGULAR, WIDE, vander(12, 6)]) {
    const S = core.svd(A).S;
    for (let j = 1; j < S.length; j++) {
      assert.ok(S[j - 1] >= S[j], `S is not descending at ${j}`);
    }
  }
});

test('the condition number is sigma_max / sigma_min, and Infinity when singular', () => {
  near(core.cond([[100, 0], [0, 1]]), 100, 1e-9);
  near(core.cond(core.eye(3)), 1, 1e-9);
  assert.equal(core.cond(SINGULAR), Infinity);
});

test('rank counts singular values above NumPy\'s own cutoff', () => {
  assert.equal(core.rank(SINGULAR), 1);
  assert.equal(core.rank(core.eye(3)), 3);
  assert.equal(core.rank(WELL), 2);
});

test('the pseudoinverse satisfies all four Moore-Penrose conditions', () => {
  // Section 07's extension 1, checked here so the widget cannot claim it
  // while quietly getting it wrong.
  for (const A of [WELL, SINGULAR, WIDE]) {
    const P = core.pinv(A);
    const AP = core.mul(A, P);
    const PA = core.mul(P, A);
    nearMat(core.mul(AP, A), A, 1e-8, 'A A+ A = A');
    nearMat(core.mul(PA, P), P, 1e-8, 'A+ A A+ = A+');
    nearMat(core.transpose(AP), AP, 1e-8, '(A A+)\' = A A+');
    nearMat(core.transpose(PA), PA, 1e-8, '(A+ A)\' = A+ A');
  }
});

test('the projection\'s residual is orthogonal to every column of X', () => {
  // The right angle is the picture step 1 draws; this is that angle as a
  // number.
  const y = [1, 5, 2];
  const {residual, yhat, beta} = core.project(WELL, y);
  const Xtr = core.mulVec(core.transpose(WELL), residual);
  nearVec(Xtr, [0, 0], 1e-10, 'X\'r');
  nearVec(core.add(yhat, residual), y, 1e-10, 'yhat + r');
  nearVec(core.mulVec(WELL, beta), yhat, 1e-10, 'X beta');
});

test('the projection agrees with the pseudoinverse', () => {
  const y = [1, 5, 2];
  nearVec(core.project(WELL, y).beta, core.mulVec(core.pinv(WELL), y), 1e-8);
});

test('QR and the normal equations agree when X is well-conditioned', () => {
  const y = [1, 5, 2];
  nearVec(core.lstsqQR(WELL, y), core.lstsqNormal(WELL, y), 1e-9);
});

test('...and disagree when it is not -- section 09\'s punchline', () => {
  // "Both fits are almost exact, so their coefficients must agree." They are,
  // and they do not. kappa(X'X) = kappa(X)^2 is why, and the residuals are
  // the comparison that cannot see it.
  const X = vander(24, 12);
  const y = X.map((r, i) => Math.sin(i / 3) + 2);

  assert.ok(core.cond(X) > 1e8, `expected an ill-conditioned X, got ${core.cond(X)}`);

  const bQR = core.lstsqQR(X, y);
  const bNE = core.lstsqNormal(X, y);

  const rQR = core.norm(core.sub(core.mulVec(X, bQR), y));
  const rNE = core.norm(core.sub(core.mulVec(X, bNE), y));
  const spread = core.norm(core.sub(bQR, bNE)) / core.norm(bQR);

  // Both fits are all but exact -- residuals around 1e-6 and 1e-5 ...
  assert.ok(rQR < 1e-4, `QR residual ${rQR}`);
  assert.ok(rNE < 1e-3, `normal-equations residual ${rNE}`);
  // ... and the coefficients are not even the same size. The gap here is
  // over 100%: comparing residuals cannot see what comparing coefficients
  // cannot miss.
  assert.ok(spread > 0.1,
    `the two coefficient vectors should diverge; relative gap was ${spread}`);
});

test('kappa(X\'X) is kappa(X) squared', () => {
  const X = vander(12, 5);
  const G = core.mul(core.transpose(X), X);
  const ratio = Math.log10(core.cond(G)) / Math.log10(core.cond(X));
  near(ratio, 2, 0.02, 'log kappa(X\'X) / log kappa(X)');
});

test('ridge shrinks toward zero, and reaches the pseudoinverse as lambda -> 0', () => {
  const X = vander(12, 5);
  const y = X.map((_, i) => Math.cos(i / 2));
  nearVec(core.ridge(X, y, 0), core.mulVec(core.pinv(X), y), 1e-6, 'lambda = 0');
  let last = Infinity;
  for (const l of [0, 1e-8, 1e-4, 1e-2, 1, 10]) {
    const n = core.norm(core.ridge(X, y, l));
    assert.ok(n <= last + 1e-9, `|x| grew when lambda rose to ${l}`);
    last = n;
  }
});

test('the perturbation bound holds against a real perturbed solve', () => {
  // The widget prints this bound beside a measured wobble, so it is pinned
  // against an actual solve rather than against itself.
  const A = [[100, 0], [0, 1]];
  const b = [1, 1];
  const x = core.solve(A, b);
  const k = core.cond(A);
  for (const d of [[1e-6, 0], [0, 1e-6], [3e-7, -2e-7]]) {
    const b2 = core.add(b, d);
    const x2 = core.solve(A, b2);
    const relX = core.norm(core.sub(x2, x)) / core.norm(x);
    const relB = core.norm(d) / core.norm(b);
    assert.ok(relX <= core.perturbationBound(k, relB) + 1e-12,
      `bound violated: ${relX} > ${k * relB}`);
  }
});

test('digitsLost is the log10 of the condition number', () => {
  near(core.digitsLost(1e8), 8, 1e-12);
  near(core.digitsLost(1), 0, 1e-12);
  assert.equal(core.digitsLost(Infinity), Infinity);
});

test('ellipse() carries the circle, the ellipse and the pairing together', () => {
  const A = [[3, 0], [0, 1]];
  const e = core.ellipse(A);
  near(e.axes[0].sigma, 3, 1e-10);
  near(e.axes[1].sigma, 1, 1e-10);
  for (const ax of e.axes) {
    nearVec(e.apply(ax.v), core.scale(ax.u, ax.sigma), 1e-10, 'A v = sigma u');
    near(core.norm(ax.axis), ax.sigma, 1e-10, '|semi-axis|');
  }
});

test('alignedWith finds a right singular vector and only a right singular vector', () => {
  const A = [[3, 1], [1, 2]];
  const {V} = core.svd(A);
  assert.equal(core.alignedWith(A, core.col(V, 0)), 0);
  assert.equal(core.alignedWith(A, core.col(V, 1)), 1);
  assert.equal(core.alignedWith(A, core.scale(core.col(V, 0), 2.5)), 0,
    'length should not matter');
  // Sign *does* matter: A(-v1) = -sigma_1 u1, which is a different statement
  // from the one the widget prints when it reports an alignment.
  assert.equal(core.alignedWith(A, core.scale(core.col(V, 0), -2.5)), -1,
    'the antipode is not the same claim');
  // Halfway between the two axes is aligned with neither.
  const mid = core.add(core.col(V, 0), core.col(V, 1));
  assert.equal(core.alignedWith(A, mid), -1);
  assert.equal(core.alignedWith(A, [0, 0]), -1);
});

test('an interrupted tween takes its origin from where it is, not where it began', () => {
  // The bug this exists to stop: retargeting from `from` makes the stage jump
  // backwards before it catches up, and no end-state assertion sees it.
  const s = core.tweenStart(0, 10, 1000, 400);
  near(core.tweenAt(s, 1000).value, 0, 1e-12);
  near(core.tweenAt(s, 1400).value, 10, 1e-12);
  assert.equal(core.tweenAt(s, 1400).done, true);
  assert.equal(core.tweenAt(s, 1200).done, false);

  const half = core.tweenAt(s, 1200).value;      // eased, not 5
  near(half, 5, 1e-12, 'easeInOutCubic is symmetric at the midpoint');

  const r = core.retarget(s, -4, 1200);
  near(r.from, half, 1e-12, 'retarget origin');
  near(core.tweenAt(r, 1200).value, half, 1e-12, 'no jump at the moment of retarget');
  near(core.tweenAt(r, 1600).value, -4, 1e-12, 'reaches the new target');
});

test('retargeting from nothing is a plain start, not a crash', () => {
  const r = core.retarget(null, 5, 100);
  near(core.tweenAt(r, 100).value, 5, 1e-12);
  assert.equal(core.tweenAt(r, 100).done, true);
});

test('a tween past its end, and a zero-length tween, both just sit on the target', () => {
  const s = core.tweenStart(2, 7, 0, 100);
  near(core.tweenAt(s, 1e6).value, 7, 1e-12);
  near(core.tweenAt(core.tweenStart(2, 7, 0, 0), 0).value, 7, 1e-12);
});

test('easeInOutCubic pins its ends and its middle', () => {
  near(core.easeInOutCubic(0), 0, 1e-12);
  near(core.easeInOutCubic(0.5), 0.5, 1e-12);
  near(core.easeInOutCubic(1), 1, 1e-12);
});

test('pickActive: one step in the band is that step', () => {
  const rects = [{top: -900, bottom: -100}, {top: -100, bottom: 700}, {top: 700, bottom: 1500}];
  assert.equal(core.pickActive(rects, 350, 450, 0), 1);
});

test('pickActive: two in the band picks the nearer centre, not the first', () => {
  // A boundary crossing. Taking the first match makes the step stick one
  // section behind for the whole overlap.
  const rects = [{top: -1000, bottom: 380}, {top: 380, bottom: 900}];
  assert.equal(core.pickActive(rects, 350, 450, 0), 1, 'centres -310 and 640, band 400');
  const other = [{top: 0, bottom: 480}, {top: 480, bottom: 2000}];
  assert.equal(core.pickActive(other, 350, 450, 1), 0, 'centres 240 and 1240, band 400');
});

test('pickActive: nothing in the band holds the previous step', () => {
  // A gap between sections must not flick the stage back to step 0.
  const rects = [{top: -800, bottom: 300}, {top: 500, bottom: 1400}];
  assert.equal(core.pickActive(rects, 350, 450, 1), 1);
  assert.equal(core.pickActive(rects, 350, 450, 0), 0);
});

test('pickActive: with no previous step it falls back to the nearest', () => {
  const rects = [{top: -800, bottom: 300}, {top: 500, bottom: 1400}];
  assert.equal(core.pickActive(rects, 350, 450, undefined), 1,
    'centres -250 and 950 against a band centred on 400: 550 beats 650');
  assert.equal(core.pickActive([], 350, 450, undefined), -1);
});
