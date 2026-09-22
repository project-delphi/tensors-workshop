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
