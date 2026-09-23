// Pins the arithmetic under the Tucker & CP stage (interactive/factor-core.js).
// Run with `npm test`; no browser, no render.
//
// `interactive/data/taxi.json` has no byte gate of its own -- this file's
// 4.71/0.067/argmax-18 assertions are the guard, which is why it reads the
// file from disk rather than trusting a copy pasted in here. Every number
// pinned below is a claim the stage puts on screen in words or on a card.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('../interactive/linalg-core.js');
const FC = require('../interactive/factor-core.js');

const near = (a, b, tol, what) =>
  assert.ok(Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol),
    `${what || ''} expected ${b}, got ${a}`);

const TAXI_PATH = path.join(__dirname, '..', 'interactive', 'data', 'taxi.json');
const raw = JSON.parse(fs.readFileSync(TAXI_PATH, 'utf8'));
const taxi = FC.tensor(raw.data, raw.shape);

test('taxi.json is a 4 x 5 x 24 tensor of non-negative integer counts', () => {
  assert.deepEqual(raw.shape, [4, 5, 24]);
  assert.equal(raw.data.length, 480);
  for (const v of raw.data) {
    assert.ok(Number.isInteger(v) && v >= 0, 'every count is a non-negative integer');
  }
});

test('unfold/fold round-trip exactly for every mode, mode 2 has 24 rows', () => {
  for (const mode of [0, 1, 2]) {
    const M = FC.unfold(taxi, mode);
    assert.equal(M.length, raw.shape[mode]);
    const back = FC.fold(M, mode, taxi.shape);
    for (let i = 0; i < taxi.data.length; i++) assert.equal(back.data[i], taxi.data[i]);
  }
  assert.equal(FC.unfold(taxi, 2).length, 24);
  assert.equal(FC.unfold(taxi, 2)[0].length, 20);
});

test('an identity mode product is a no-op', () => {
  const n = taxi.shape[0];
  const eye = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => (i === j ? 1 : 0)));
  const out = FC.modeProduct(taxi, eye, 0);
  for (let i = 0; i < taxi.data.length; i++) near(out.data[i], taxi.data[i], 1e-9);
});

test('outer3 is separable: T[i,j,k] = a[i] b[j] c[k]', () => {
  const a = [1, -2, 3], b = [0.5, 4], c = [2, -1, 0.25];
  const T = FC.outer3(a, b, c);
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++)
      for (let k = 0; k < c.length; k++)
        near(FC.at(T, i, j, k), a[i] * b[j] * c[k], 1e-12);
});

test('hosvd(taxi, [2,2,3]) reproduces the handbook\'s published numbers', () => {
  const h = FC.hosvd(taxi, [2, 2, 3]);
  assert.equal(h.params, 102);
  assert.equal(h.ratio.toFixed(2), '4.71');
  assert.equal(h.error.toFixed(3), '0.067');
});

test('the hour factor peaks at 18, and its sign is fixed positive', () => {
  const h = FC.hosvd(taxi, [2, 2, 3]);
  const col0 = h.factors[2].map((row) => row[0]);
  let best = 0;
  for (let i = 1; i < col0.length; i++) if (Math.abs(col0[i]) > Math.abs(col0[best])) best = i;
  assert.equal(best, 18);
  assert.ok(col0[best] > 0);
});

test('rmax is [4, 5, 20]: linalg-core.svd returns a thin U', () => {
  const bases = FC.hosvdBases(taxi);
  assert.deepEqual(bases.map((b) => b.U[0].length), [4, 5, 20]);
  const h = FC.hosvd(taxi, [2, 2, 3], bases);
  assert.deepEqual(h.rmax, [4, 5, 20]);
});

test('HOSVD error is non-increasing with rank, and near zero at full multilinear rank', () => {
  let prev = Infinity;
  for (let r = 1; r <= 4; r++) {
    const h = FC.hosvd(taxi, [r, r, r]);
    assert.ok(h.error <= prev + 1e-9);
    prev = h.error;
  }
  const full = FC.hosvd(taxi, [4, 5, 20]);
  assert.ok(full.error < 1e-10);
});

test('CP at rank 3 recovers three planted terms, across seeds', () => {
  const {T, terms} = FC.synthetic();
  for (const seed of [1, 2, 3]) {
    const fit = FC.cpAls(T, 3, 150, seed);
    assert.ok(fit.error < 1e-6, `seed ${seed} error ${fit.error}`);
    const matches = FC.matchTerms(fit, terms);
    assert.equal(matches.length, 3);
    for (const m of matches) assert.ok(m.score > 0.999, `seed ${seed} match ${m.score}`);
  }
});

test('CP-ALS is deterministic and (with enough iterations) monotone; the seed matters', () => {
  const {T} = FC.synthetic();
  const a1 = FC.cpAls(T, 3, 80, 1);
  const a2 = FC.cpAls(T, 3, 80, 1);
  assert.equal(a1.error, a2.error);
  const more = FC.cpAls(T, 3, 200, 1);
  assert.ok(more.error <= a1.error + 1e-12);
  const other = FC.cpAls(T, 3, 80, 2);
  assert.notEqual(other.factors[0][0][0], a1.factors[0][0][0]);
});

test('parameter counts', () => {
  assert.equal(FC.cpParams(raw.shape, 3), 99);
  assert.equal(FC.tuckerParams(raw.shape, [2, 2, 3]), 102);
  assert.equal(FC.tuckerParams(raw.shape, [3, 3, 2]), 93);
  assert.equal(FC.tuckerParams(raw.shape, [4, 5, 1]), 85);
});

test('tuckerSearch(taxi, 99): both picks are within budget, best is at least as good, a degenerate closest pick costs error', () => {
  const s = FC.tuckerSearch(taxi, 99);
  assert.ok(s.best.params <= 99);
  assert.ok(s.closest.params <= 99);
  assert.ok(s.best.error <= s.closest.error);
  assert.deepEqual(s.best.ranks, [3, 3, 2]);
  assert.equal(s.best.params, 93);
  assert.ok(s.closest.degenerate);
  assert.ok(s.closest.error > s.best.error);
});

// ─── the overhaul's arithmetic: every fact below is a sentence on the stage ───

test('unfoldIndex puts every entry exactly where unfold() does, for every mode', () => {
  for (const mode of [0, 1, 2]) {
    const M = FC.unfold(taxi, mode);
    for (let flat = 0; flat < taxi.data.length; flat++) {
      const idx = FC.multiIndex(flat, taxi.shape);
      assert.equal(FC.flatIndex(idx, taxi.shape), flat);
      const p = FC.unfoldIndex(idx, taxi.shape, mode);
      assert.equal(p.rows, M.length);
      assert.equal(p.cols, M[0].length);
      assert.equal(M[p.row][p.col], taxi.data[flat], `mode ${mode} entry ${flat}`);
    }
  }
  // The three addresses the unfold scene's chips print for T[2, 2, 18].
  const idx = [2, 2, 18];
  assert.deepEqual([0, 1, 2].map((m) => {
    const p = FC.unfoldIndex(idx, taxi.shape, m);
    return [p.row, p.col];
  }), [[2, 66], [2, 66], [18, 12]]);
});

test('the taxi tensor: Manhattan to Manhattan is 4,885 of 6,383 trips, and hour 18 is the busiest', () => {
  const total = taxi.data.reduce((a, v) => a + v, 0);
  assert.equal(total, 6383);
  const mm = FC.fibre(taxi, 2, 2, 2).reduce((a, v) => a + v, 0);
  assert.equal(mm, 4885);
  const hours = FC.marginal(taxi, 2);
  assert.equal(FC.argmax(hours), 18);
  assert.equal(hours[18], 417);
  assert.equal(FC.at(taxi, 2, 2, 18), 318);
  assert.equal(taxi.data.filter((v) => v === 0).length, 207);
  assert.equal(FC.marginal(taxi, 0).reduce((a, v) => a + v, 0), total);
});

test('svdEnergy: the first singular value of each taxi unfolding holds 99% of it', () => {
  const bases = FC.hosvdBases(taxi);
  assert.equal(FC.svdEnergy(bases[2].S, 1).kept.toFixed(4), '0.9980');
  assert.equal(FC.svdEnergy(bases[0].S, 1).kept.toFixed(4), '0.9907');
  assert.equal(FC.svdEnergy(bases[1].S, 1).kept.toFixed(4), '0.9901');
  const full = FC.svdEnergy(bases[2].S, bases[2].S.length);
  near(full.kept, 1, 1e-12);
  near(full.error, 0, 1e-6);
  // Keeping r columns of one unfolding is that unfolding's own rank-r error.
  const e = FC.svdEnergy(bases[2].S, 3);
  near(e.error * e.error + e.kept, 1, 1e-12);
});

test('coreTerm: shares add to 1, and G[0,0,0] is 1096.8 and 99% of the (2, 2, 3) fit', () => {
  const h = FC.hosvd(taxi, [2, 2, 3]);
  let sum = 0;
  for (let a = 0; a < 2; a++)
    for (let b = 0; b < 2; b++)
      for (let c = 0; c < 3; c++) sum += FC.coreTerm(h, a, b, c).share;
  near(sum, 1, 1e-12);
  const g0 = FC.coreTerm(h, 0, 0, 0);
  assert.equal(g0.g.toFixed(1), '1096.8');
  assert.equal(g0.share.toFixed(3), '0.994');
  // Its three columns are Manhattan, Manhattan and the day.
  assert.equal(FC.argmax(g0.a), 2);
  assert.equal(FC.argmax(g0.b), 2);
  assert.equal(FC.argmax(g0.c), 18);
});

test('cpNormalize: weights are the planted scales, and the normalised terms rebuild the fit', () => {
  const {T} = FC.synthetic();
  const n = FC.cpNormalize(FC.cpAls(T, 3, 150, 1));
  assert.deepEqual(n.weights.map((w) => w.toFixed(3)), ['10.000', '6.000', '3.000']);
  assert.deepEqual(n.cancelling, []);
  const fit = FC.cpAls(taxi, 3, 100, 1);
  const nn = FC.cpNormalize(fit);
  const R = FC.cpRecon(fit.factors, taxi.shape);
  for (let flat = 0; flat < taxi.data.length; flat++) {
    const [i, j, k] = FC.multiIndex(flat, taxi.shape);
    let s = 0;
    for (let r = 0; r < 3; r++) s += nn.weights[r] * nn.factors[0][r][i] * nn.factors[1][r][j] * nn.factors[2][r][k];
    near(s, R.data[flat], 1e-9, `cell ${flat}`);
  }
  for (let r = 1; r < 3; r++) assert.ok(nn.weights[r] <= nn.weights[r - 1]);
  for (let r = 0; r < 3; r++) {
    for (const m of [0, 1]) {
      const v = nn.factors[m][r];
      const big = v.reduce((b, x, i) => (Math.abs(x) > Math.abs(v[b]) ? i : b), 0);
      assert.ok(v[big] > 0, 'a and b are turned positive at their largest entry');
    }
  }
});

test('the best rank-1 term is the Tucker core corner: lambda 1096.8, 10.07% either way', () => {
  const n = FC.cpNormalize(FC.cpAls(taxi, 1, 100, 1));
  assert.equal(n.weights[0].toFixed(1), '1096.8');
  assert.equal(FC.cpAls(taxi, 1, 100, 1).error.toFixed(4), '0.1007');
  assert.equal(FC.hosvd(taxi, [1, 1, 1]).error.toFixed(4), '0.1007');
});

test('taxi CP at R = 3 is not degenerate; at R = 6 two terms cancel', () => {
  const n3 = FC.cpNormalize(FC.cpAls(taxi, 3, 100, 1));
  assert.deepEqual(n3.cancelling, []);
  const n6 = FC.cpNormalize(FC.cpAls(taxi, 6, 100, 1));
  assert.equal(n6.cancelling.length, 1);
  const [p, q] = n6.cancelling[0];
  assert.deepEqual([p, q], [0, 1]);
  assert.ok(n6.congruence[p][q] < FC.CANCEL);
  const sum = n6.weights.reduce((a, w) => a + w, 0);
  assert.ok(sum > 3 * FC.norm(taxi), 'the weights add up to more than three times the tensor');
});

test('scaling a by s and c by 1/s leaves a rank-1 tensor unchanged', () => {
  const a = [0.2, -1.5, 3], b = [2, 0.5], c = [1, -4, 0.25, 2];
  for (const s of [0.25, 2, 4]) {
    const T1 = FC.outer3(a.map((x) => x * s), b, c.map((x) => x / s));
    const T0 = FC.outer3(a, b, c);
    for (let i = 0; i < T0.data.length; i++) near(T1.data[i], T0.data[i], 1e-12);
  }
});

test('cpTrace: one entry per solve, the error never rises, and it ends where cpAls does', () => {
  for (const [T, R, seed] of [[taxi, 2, 1], [taxi, 3, 2], [FC.synthetic().T, 3, 1]]) {
    const tr = FC.cpTrace(T, R, 100, seed);
    assert.equal(tr.steps.length, 1 + 3 * 100);
    assert.equal(tr.steps[0].mode, -1);
    assert.deepEqual(tr.steps.slice(1, 4).map((s) => s.mode), [0, 1, 2]);
    for (let i = 1; i < tr.steps.length; i++) {
      assert.ok(tr.steps[i].error <= tr.steps[i - 1].error + 1e-12,
        `step ${i}: ${tr.steps[i - 1].error} -> ${tr.steps[i].error}`);
    }
    const als = FC.cpAls(T, R, 100, seed);
    assert.deepEqual(tr.steps[tr.steps.length - 1].factors, als.factors);
    assert.equal(tr.steps[tr.steps.length - 1].error, als.error);
  }
  const syn = FC.cpTrace(FC.synthetic().T, 3, 100, 1);
  assert.ok(syn.steps[0].error > 1, 'the random start is worse than predicting zero');
  assert.ok(syn.steps[3 * 20].error < 1e-4, 'three planted terms are found by sweep 20');
});

test('ALS has local minima: taxi R = 2 stops at 7.00% from seed 1 and 6.73% from seed 3', () => {
  assert.equal(FC.cpAls(taxi, 2, 100, 1).error.toFixed(4), '0.0700');
  assert.equal(FC.cpAls(taxi, 2, 100, 3).error.toFixed(4), '0.0673');
});

test('tuckerFrontier is a falling staircase that agrees with tuckerSearch', () => {
  const f = FC.tuckerFrontier(taxi);
  for (let i = 1; i < f.length; i++) {
    assert.ok(f[i].params > f[i - 1].params);
    assert.ok(f[i].error < f[i - 1].error);
  }
  assert.deepEqual(f[0].ranks, [1, 1, 1]);
  assert.equal(f[0].params, 34);
  for (const budget of [66, 99, 132, 165, 198]) {
    const under = f.filter((s) => s.params <= budget);
    const best = FC.tuckerSearch(taxi, budget).best;
    assert.equal(under[under.length - 1].error, best.error, `budget ${budget}`);
  }
  assert.equal(FC.tuckerCandidates(taxi).length, 4 * 5 * 20);
});

test('at the same budget Tucker wins at 66 and CP wins from 99 on', () => {
  const best66 = FC.tuckerSearch(taxi, 66).best;
  assert.deepEqual(best66.ranks, [3, 3, 1]);
  assert.equal(best66.error.toFixed(4), '0.0469');
  assert.ok(best66.error < FC.cpAls(taxi, 2, 100, 1).error);
  for (const R of [3, 4, 5, 6]) {
    const budget = FC.cpParams(taxi.shape, R);
    assert.ok(FC.cpAls(taxi, R, 100, 1).error < FC.tuckerSearch(taxi, budget).best.error, `R ${R}`);
  }
  // Equal ranks are not an equal budget.
  assert.equal(FC.tuckerParams(taxi.shape, [3, 3, 3]), 126);
  assert.equal(FC.cpParams(taxi.shape, 3), 99);
});

test('largestMiss names the cell a rebuild misses by most, signed', () => {
  const h = FC.hosvd(taxi, [2, 2, 3]);
  const m = FC.largestMiss(taxi, h.recon);
  let worst = 0;
  for (let i = 0; i < taxi.data.length; i++) worst = Math.max(worst, Math.abs(taxi.data[i] - h.recon.data[i]));
  near(Math.abs(m.diff), worst, 1e-12);
  near(m.t, FC.at(taxi, ...m.idx), 0);
  near(m.diff, m.t - m.r, 1e-12);
});

test('morphStep: reaches its target without overshoot, and folds back to the cube to change mode', () => {
  let s = {mode: 2, t: 0};
  const want = {mode: 2, t: 1};
  let frames = 0;
  while ((s.t !== want.t || s.mode !== want.mode) && frames < 1000) {
    const next = FC.morphStep(s, want, 1 / 60, 1.4);
    assert.ok(next.t >= s.t && next.t <= 1, 'monotone towards the target, never past it');
    s = next; frames++;
  }
  assert.deepEqual(s, want);
  assert.ok(frames > 30 && frames < 60, `${frames} frames at 1.4 per second`);
  // Interrupted half way to a new mode: it goes down to the cube in the old
  // mode first, switches only at t = 0, then comes back up.
  s = {mode: 2, t: 1};
  const other = {mode: 0, t: 1};
  const seen = [];
  for (let n = 0; n < 200 && !(s.mode === 0 && s.t === 1); n++) {
    s = FC.morphStep(s, other, 1 / 60, 1.4);
    seen.push(s);
  }
  const switchAt = seen.findIndex((q) => q.mode === 0);
  assert.equal(seen[switchAt].t, 0);
  assert.ok(seen.slice(0, switchAt).every((q) => q.mode === 2));
  assert.deepEqual(s, other);
  // No time, no motion.
  assert.deepEqual(FC.morphStep({mode: 1, t: 0.4}, {mode: 1, t: 0.9}, 0, 1.4), {mode: 1, t: 0.4});
});

test('unfoldingRebuild: rank r of one unfolding misses exactly the energy past r', () => {
  const bases = FC.hosvdBases(taxi);
  for (const [mode, r] of [[2, 1], [2, 3], [0, 2], [1, 4]]) {
    const u = FC.unfoldingRebuild(taxi, mode, r, bases);
    near(u.error, FC.svdEnergy(bases[mode].S, r).error, 1e-9, `mode ${mode} r ${r}`);
    for (let i = 0; i < u.X.length; i++)
      for (let j = 0; j < u.X[0].length; j++) near(u.rebuilt[i][j] + u.residual[i][j], u.X[i][j], 1e-9);
  }
  near(FC.unfoldingRebuild(taxi, 2, 20, bases).error, 0, 1e-9);
});
