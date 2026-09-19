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

test('alignedWithAxes answers the same question from axes already in hand', () => {
  // The render loop uses this one so it is not running an SVD per frame; it
  // has to agree with the convenience form exactly.
  const A = [[3, 1.2], [0.4, 1]];
  const e = core.ellipse(A);
  for (let deg = 0; deg < 360; deg += 3) {
    const t = (deg * Math.PI) / 180;
    const x = [Math.cos(t), Math.sin(t)];
    assert.equal(core.alignedWithAxes(e.axes, x), core.alignedWith(A, x), `${deg} deg`);
  }
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

// ─── the camera ─────────────────────────────────────────────────────────────
//
// The stage turns, in both render paths, from one pair of angles. These pin
// the parts of that a screenshot cannot show: that the shipped framing of step
// 1 survives being expressed as an orbit, that neither clamp lets a reader get
// under the floor, and that crossing the stage a few dozen times does not walk
// the camera away from where they left it.

// Step 1's camera as the widget has always written it: framed on the tip of
// y-hat, at a distance fitted to the content rather than guessed.
const EYE = [13.57, 5.51, -4.64];
const AT = [2.25, 2.09, 2.08];

test('a camera written as a position round-trips through the orbit unchanged', () => {
  const home = core.orbitFrom(AT, EYE);
  near(home.radius, 13.6014, 1e-3, 'the fitted distance');
  nearVec(core.orbitEye(AT, home.radius, home), EYE, 1e-9, 'step 1 home pose');
  // And the dolly is a multiplier on that distance, not a replacement for it.
  const closer = core.orbitDolly(home, 0.8);
  near(core.norm(core.sub(core.orbitEye(AT, home.radius, closer), AT)),
    home.radius * 0.8, 1e-9, 'dollied in');
});

test('a solid scene turns all the way round; a flat one is clamped both ways', () => {
  const v = core.orbitView(0, 0.3);
  near(core.orbitBy(v, 2 * Math.PI, 0).az, 2 * Math.PI, 1e-12,
    'a full turn is allowed to keep going');
  assert.equal(core.orbitBy(v, 0, 9).el, core.CAMERA.elMax, 'up is clamped');
  assert.equal(core.orbitBy(v, 0, -9).el, core.CAMERA.elMin, 'down is clamped');
  // The portal is two planes: past a quarter turn a reader is reading them
  // from behind, where the picture is mirrored and every label is backwards.
  const lim = {azMin: -0.75, azMax: 0.75, elMin: -0.55, elMax: 0.65};
  assert.equal(core.orbitBy(v, 9, 0, lim).az, 0.75);
  assert.equal(core.orbitBy(v, -9, 0, lim).az, -0.75);
  assert.equal(core.orbitBy(v, 0, -9, lim).el, -0.55);
  assert.equal(core.orbitBy(v, 0, 9, lim).el, 0.65);
  assert.equal(core.orbitDolly(v, 100).dolly, core.CAMERA.dollyMax);
  assert.equal(core.orbitDolly(v, 0.001).dolly, core.CAMERA.dollyMin);
});

test('the orbit stays on the unit sphere, and nothing it draws ever rolls', () => {
  for (let az = -3; az <= 3; az += 0.37) {
    for (let el = -0.5; el <= 1.2; el += 0.31) {
      near(core.norm(core.orbitDir({az, el, dolly: 1})), 1, 1e-12);
    }
  }
  // Straight ahead is +Z, straight up is +Y: one convention, and it is the
  // camera's own up as well, which is what keeps the horizon level.
  nearVec(core.orbitDir({az: 0, el: 0, dolly: 1}), [0, 0, 1], 1e-12, 'front');
  nearVec(core.orbitDir({az: 0, el: Math.PI / 2, dolly: 1}), core.UP, 1e-12, 'overhead');
  nearVec(core.orbitDir({az: Math.PI / 2, el: 0, dolly: 1}), [1, 0, 0], 1e-12, 'side');
});

// ─── the idle drift ─────────────────────────────────────────────────────────

const HOME = core.orbitView(2.1, 0.25);
const started = (now = 0, view = HOME) =>
  core.driftStart(core.driftIdle(), view, now);

test('a stretch of drift begins exactly where the reader left the view', () => {
  assert.deepEqual(core.driftPose(started(), 0), HOME);
});

test('the sway stays within CAMERA.sway of its origin, and the lift only lifts', () => {
  const s = started();
  for (let phase = 0; phase <= 2 * core.CAMERA.swayMs; phase += 50) {
    const {az, el} = core.driftPose(s, phase);
    assert.ok(Math.abs(az - HOME.az) <= core.CAMERA.sway + 1e-9,
      `the sway left its bound at ${phase}ms`);
    // Up and back, never down: under the floor there is nothing drawn.
    assert.ok(el >= HOME.el - 1e-9 && el <= HOME.el + core.CAMERA.bob + 1e-9,
      `the lift left its bound at ${phase}ms`);
  }
});

test('the camera is highest at each end of the sway', () => {
  const s = started();
  for (const end of [core.CAMERA.swayMs / 4, 3 * core.CAMERA.swayMs / 4]) {
    near(core.driftPose(s, end).el, HOME.el + core.CAMERA.bob, 1e-9);
  }
});

test('a pause banks the phase, and the resumed sway picks it up where it stopped', () => {
  const paused = core.driftPause(started(0), 3000);
  assert.equal(paused.on, false);
  assert.equal(paused.phase, 3000);
  const back = core.driftStart(paused, core.orbitView(99, 99), 93000);
  assert.deepEqual(core.driftPose(back, 93000 - back.t0),
    core.driftPose(started(), 3000));
});

test('pausing and resuming never re-seeds the origin — the camera would climb', () => {
  // The same ratchet tensor-core.js pins for the visualizer, one axis over:
  // the lift only ever raises the camera, so seeding the next stretch from the
  // live view would leave every crossing of the stage a little higher than the
  // last, until the reader is looking straight down at a scene drawn to be
  // seen from the side.
  let s = started(0);
  let clock = 0;
  for (let crossing = 0; crossing < 40; crossing++) {
    clock += 2600;                                  // the pointer arrives mid-lift
    const at = core.driftPose(s, clock - s.t0);
    s = core.driftPause(s, clock);
    assert.ok(at.el > HOME.el, 'the pointer should arrive somewhere above the origin');
    clock += 900;
    s = core.driftStart(s, at, clock);              // the live view, as it was read
  }
  assert.equal(core.driftPose(s, 0).el, HOME.el, 'the origin moved');
  assert.equal(core.driftPose(s, 0).az, HOME.az, 'the origin moved');
});

test('taking the view hands the next stretch a new origin', () => {
  const moved = core.orbitView(HOME.az + 1.4, HOME.el + 0.3);
  const released = core.driftRelease(started(0), 2000);
  assert.deepEqual(core.driftPose(core.driftStart(released, moved, 9000), 0), moved,
    'a drag re-seeds');
  const paused = core.driftStart(core.driftPause(started(0), 2000), moved, 9000);
  assert.deepEqual(core.driftPose(paused, 0), HOME,
    'merely crossing the stage does not');
});
