// Pins the arithmetic under the AlphaTensor stage
// (interactive/alphatensor-core.js). Run with `npm test`; no browser, no
// render.
//
// The core is a port of the model behind three ML-blog posts, and nothing
// regenerates it, so this file is what would notice an edit. Every number
// pinned here is a claim the stage puts on screen. Two of the tests check the
// core against a record outside it rather than against itself: Strassen's
// U, V and W must equal the arrays in the handbook's "Still open" note, and
// the bounds and exponents the last scene quotes must be the ones that note
// prints.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../interactive/alphatensor-core.js');

const ROOT = path.resolve(__dirname, '..');
const HANDBOOK = fs.readFileSync(path.join(ROOT, 'tensors_workshop_plan_with_quizzes.md'), 'utf8');
// The note runs from its heading to the next rule.
const NOTE = HANDBOOK.slice(HANDBOOK.indexOf('{#still-open}'));
const STILL_OPEN = NOTE.slice(0, NOTE.indexOf('\n---\n'));

const N = 4, T = M.tensor(2), S = M.STRASSEN;

test('the tensor has n³ ones, n to a tray, and reading it off multiplies', () => {
  for (const n of [2, 3]) {
    const NN = n * n, X = M.tensor(n);
    assert.equal(X.length, NN ** 3);
    assert.ok(X.every(x => x === 0 || x === 1), 'entries are 0 or 1');
    assert.equal(M.nnz(X), n ** 3);
    for (let c = 0; c < NN; c++) {
      let ones = 0;
      for (let a = 0; a < NN; a++) for (let b = 0; b < NN; b++) ones += X[M.cell(NN, a, b, c)];
      assert.equal(ones, n, `tray ${c} holds ${n} ones`);
    }
    const rand = M.mulberry32(20261002 + n);
    for (let trial = 0; trial < 200; trial++) {
      const A = M.randomMatrix(rand, NN, -9, 9), B = M.randomMatrix(rand, NN, -9, 9);
      const got = M.readOff(X, A, B);
      assert.deepEqual(got.C, M.matmul(n, A, B));
      assert.equal(got.mults, n ** 3, 'one multiplication per 1');
    }
  }
});

test('the worked example is 19, 22, 43, 50, and the cells are where the scenes say', () => {
  assert.deepEqual(M.A0, [1, 2, 3, 4]);
  assert.deepEqual(M.B0, [5, 6, 7, 8]);
  assert.deepEqual(M.matmul(2, M.A0, M.B0), [19, 22, 43, 50]);
  assert.deepEqual(M.readOff(T, M.A0, M.B0).C, [19, 22, 43, 50]);
  // a12 * b21 goes to c11: T[1, 2, 0] in code, "entry 2, entry 3, entry 1" in prose.
  assert.equal(T[M.cell(N, 1, 2, 0)], 1);
  assert.deepEqual(M.uncell(N, M.cell(N, 1, 2, 0)), {a: 1, b: 2, c: 0});
  const eight = M.terms(2);
  assert.equal(eight.length, 8);
  assert.deepEqual(eight.slice(0, 2), [{a: 0, b: 0, c: 0}, {a: 1, b: 2, c: 0}], 'c11 first');
  assert.equal(M.name('a', 2, 1), 'a₁₂');
  assert.equal(M.name('c', 2, 2), 'c₂₁');
  // Tray c21: a21 b11 + a22 b21 = 3·5 + 4·7 = 43.
  const tray = eight.filter(t => t.c === 2);
  assert.deepEqual(tray.map(t => [t.a, t.b]), [[2, 0], [3, 2]]);
  assert.equal(tray.reduce((s, t) => s + M.A0[t.a] * M.B0[t.b], 0), 43);
});

test('a bigger matrix gives a bigger, emptier cube', () => {
  assert.deepEqual([2, 3, 4, 5].map(n => M.sizes(n)).map(s => [s.side, s.cells, s.ones]),
    [[4, 64, 8], [9, 729, 27], [16, 4096, 64], [25, 15625, 125]]);
  assert.deepEqual([2, 3, 4, 5].map(n => (100 * M.sizes(n).share).toFixed(1)),
    ['12.5', '3.7', '1.6', '0.8']);
});

test("Strassen's U, V and W are the handbook's, array for array", () => {
  // The outside record. The handbook's fenced code is byte-identical in both
  // languages (check 13), so the English one stands for both.
  const found = {};
  for (const m of STILL_OPEN.matchAll(/^([UVW]) = np\.array\((\[\[[\s\S]*?\]\])\)/gm))
    found[m[1]] = JSON.parse(m[2]);
  assert.deepEqual(Object.keys(found).sort(), ['U', 'V', 'W'], 'the note still carries all three');
  assert.deepEqual(S.U, found.U);
  assert.deepEqual(S.V, found.V);
  assert.deepEqual(S.W, found.W);
});

test('seven blocks sum to the cube, and so do the schoolbook eight', () => {
  assert.ok(M.equal(M.sumOfTerms(S), T));
  assert.ok(M.equal(M.sumOfTerms(M.schoolbook(2)), T));
  assert.ok(M.equal(M.sumOfTerms(M.schoolbook(3)), M.tensor(3)));
  assert.equal(S.U.length, 7);
  assert.equal(M.schoolbook(2).U.length, 8);
  assert.equal(M.blocksOf(S, 3).length, 3);
  assert.deepEqual(M.blocksOf(S)[5], {u: [-1, 0, 1, 0], v: [1, 1, 0, 0], w: [0, 0, 0, 1]});
});

test('the first block covers eight cells: two wanted, six damage', () => {
  assert.deepEqual(M.blockReport(T, S.U[0], S.V[0], S.W[0]), {cells: 8, wanted: 2, damage: 6});
  // A schoolbook block is one cell and does no damage.
  const one = M.blocksOf(M.schoolbook(2))[1];
  assert.deepEqual(M.blockReport(T, one.u, one.v, one.w), {cells: 1, wanted: 1, damage: 0});
  assert.deepEqual([one.u, one.v, one.w], [[0, 1, 0, 0], [0, 0, 1, 0], [1, 0, 0, 0]]);
});

test('adding the seven goes 8, 12, 12, 12, 10, 8, 4, 0, through twenty cells', () => {
  const p = M.play(T, M.blocksOf(S));
  assert.deepEqual(p.trail, [8, 12, 12, 12, 10, 8, 4, 0]);
  assert.ok(M.equal(p.sum, T));
  assert.ok(M.isZero(p.owed));
  assert.equal(M.nnz(p.everSum), 20, 'twenty cells hold something on the way');
  assert.equal(M.nnz(p.everSum) - M.nnz(p.sum), 12, 'and twelve end hollow');
  // The cell the copy follows: (a11, b22, c12) is -1 after the third block and
  // the fifth clears it.
  const at = M.cell(N, 0, 3, 1);
  assert.equal(M.play(T, M.blocksOf(S, 3)).sum[at], -1);
  assert.equal(M.play(T, M.blocksOf(S, 4)).sum[at], -1);
  assert.equal(M.play(T, M.blocksOf(S, 5)).sum[at], 0);
  // The schoolbook rule, for contrast: one wanted cell a press, nothing hollow.
  const q = M.play(T, M.blocksOf(M.schoolbook(2)));
  assert.deepEqual(q.trail, [8, 7, 6, 5, 4, 3, 2, 1, 0]);
  assert.equal(M.nnz(q.everSum), 8);
  // What is owed is the target minus the sum, at every step.
  for (let k = 0; k <= 7; k++) {
    const r = M.play(T, M.blocksOf(S, k));
    assert.ok(M.equal(r.owed, M.subtract(T, r.sum)));
    assert.equal(r.trail[k], M.nnz(r.owed));
  }
});

test('run on numbers: 65, 35, −2, 8, 24, 22, −30 make 19, 22, 43, 50', () => {
  const r = M.applyAlgorithm(S, M.A0, M.B0);
  assert.deepEqual(r.m, [65, 35, -2, 8, 24, 22, -30]);
  assert.deepEqual(r.C, [19, 22, 43, 50]);
  assert.deepEqual(r.left, [5, 7, 1, 4, 3, 2, -2]);
  assert.deepEqual(r.right, [13, 5, -2, 2, 8, 11, 15]);
  assert.equal(M.additions(S), 18);
  assert.equal(M.additions(M.schoolbook(2)), 4);
  const rand = M.mulberry32(7);
  for (let trial = 0; trial < 300; trial++) {
    const A = M.randomMatrix(rand, 4, -9, 9), B = M.randomMatrix(rand, 4, -9, 9);
    assert.deepEqual(M.applyAlgorithm(S, A, B).C, M.matmul(2, A, B));
  }
});

test('the algorithm reads as Strassen wrote it', () => {
  const f = M.formulas(S, 2);
  assert.equal(f.products[0], 'm₁ = (a₁₁ + a₂₂)(b₁₁ + b₂₂)');
  assert.equal(f.products[5], 'm₆ = (a₂₁ − a₁₁)(b₁₁ + b₁₂)');
  assert.deepEqual(f.outputs, [
    'c₁₁ = m₁ + m₄ + m₇ − m₅', 'c₁₂ = m₃ + m₅', 'c₂₁ = m₂ + m₄', 'c₂₂ = m₁ + m₃ + m₆ − m₂']);
  assert.equal(M.combo([0, 0, 0, 0], M.names('a', 2)), '0');
});

test('seven beats eight in the exponent: 73.7% saved at 1,024', () => {
  assert.equal(M.OMEGA.toFixed(3), '2.807');
  const r = M.recursion(10);
  assert.deepEqual([r.n, r.school, r.strassen], [1024, 1073741824, 282475249]);
  assert.equal((100 * r.saving).toFixed(1), '73.7');
  assert.equal(r.ratio.toFixed(2), '3.80');
  assert.equal((100 * M.recursion(1).saving).toFixed(1), '12.5');
  assert.equal((100 * M.recursion(3).saving).toFixed(1), '33.0');
  // The count is the recursion's own, not a formula beside it.
  const rand = M.mulberry32(11);
  const mat = n => Array.from({length: n}, () => M.randomMatrix(rand, n, -3, 3));
  for (const k of [1, 2, 3]) {
    const n = 2 ** k, A = mat(n), B = mat(n);
    const flat = X => X.flat();
    const fast = M.multiplyRecursive(S, A, B), slow = M.multiplyRecursive(M.schoolbook(2), A, B);
    assert.deepEqual(flat(fast.C), M.matmul(n, flat(A), flat(B)));
    assert.equal(fast.mults, M.recursion(k).strassen);
    assert.equal(slow.mults, M.recursion(k).school);
  }
});

test('the game has 128,000 moves, each a different block', () => {
  const mv = M.moves(N);
  assert.equal(M.vectors(N, -1, 1).length, 80);   // 3^4 - 1
  assert.equal(mv.u.length, 40);
  assert.equal(mv.count, 128000);                  // 80^3 / 4
  const seen = new Set();
  for (const u of mv.u) for (const v of mv.v) for (const w of mv.w) seen.add(M.rankOne(u, v, w).join(','));
  assert.equal(seen.size, 128000);
  assert.equal(M.moves(N), mv, 'built once');
});

test('the 81 hand-set weight vectors round-trip, with zero in the middle', () => {
  assert.equal(M.WEIGHTS, 81);
  assert.deepEqual(M.weightAt(M.ZERO_WEIGHT), [0, 0, 0, 0]);
  const seen = new Set();
  for (let i = 0; i < M.WEIGHTS; i++) {
    const v = M.weightAt(i);
    assert.ok(v.every(x => x === -1 || x === 0 || x === 1));
    assert.equal(M.weightIndex(v), i);
    seen.add(v.join(','));
  }
  assert.equal(seen.size, 81);
  assert.equal(M.weightIndex([1, 0, 0, 1]), 68);
});

test('of 128,000 first moves, 8 lower the count, 176 keep it, 127,816 raise it', () => {
  const s = M.survey(T, N);
  assert.deepEqual([s.total, s.lower, s.same, s.raise, s.maxRise], [128000, 8, 176, 127816, 56]);
  assert.equal(s.before, 8);
  assert.equal(s.hist.reduce((a, b) => a + b, 0), 128000);
  assert.equal(s.hist[7], 8);
  assert.equal(s.hist[8], 176);
  assert.equal(s.hist[64], 8);
  assert.equal(s.hist.findIndex(x => x > 0), 7, 'no move leaves fewer than seven');
  assert.equal(M.survey(T, N), s, 'remembered per position');
  // The eight that help are the eight single cells of the cube.
  const mv = M.moves(N), lowering = [];
  for (const u of mv.u) for (const v of mv.v) for (const w of mv.w) {
    const X = M.rankOne(u, v, w);
    if (M.nnz(M.subtract(T, X)) < 8) lowering.push(X);
  }
  assert.equal(lowering.length, 8);
  assert.ok(lowering.every(X => M.nnz(X) === 1 && X.every((x, i) => !x || T[i] === 1)));
});

test('the one-pass survey agrees with scoring every move the long way', () => {
  // After three of Strassen's moves the position holds a -1, which is where
  // an incremental count would go wrong if it could.
  const R = M.play(T, M.blocksOf(S, 3)).owed, s = M.survey(R, N), mv = M.moves(N);
  let lower = 0, same = 0, raise = 0, best = null;
  const hist = new Array(65).fill(0);
  for (const u of mv.u) for (const v of mv.v) for (const w of mv.w) {
    const sc = M.score(M.subtract(R, M.rankOne(u, v, w)));
    hist[sc.nnz]++;
    if (sc.nnz < 12) lower++; else if (sc.nnz === 12) same++; else raise++;
    if (!best || M.better(sc, best)) best = {u, v, w, nnz: sc.nnz, abs: sc.abs};
  }
  assert.deepEqual([s.lower, s.same, s.raise], [lower, same, raise]);
  assert.deepEqual(s.hist, hist);
  assert.deepEqual(s.best, best);
});

test('greedy plays the schoolbook rule: eight moves, never seven', () => {
  const g = M.greedyPeel(T, N);
  assert.ok(g.solved);
  assert.deepEqual(g.trail, [8, 7, 6, 5, 4, 3, 2, 1, 0]);
  for (const m of g.moves) {
    const X = M.rankOne(m.u, m.v, m.w);
    assert.equal(M.nnz(X), 1);
    assert.ok(X.every((x, i) => !x || T[i] === 1));
  }
});

test("greedy takes Strassen's first move back, and then needs ten", () => {
  const total = [];
  for (let k = 0; k <= 7; k++) {
    const R = M.play(T, M.blocksOf(S, k)).owed, g = M.greedyPeel(R, N);
    assert.ok(g.solved);
    total.push(k + g.moves.length);
  }
  assert.deepEqual(total, [8, 10, 10, 9, 9, 7, 7, 7]);
  const R1 = M.play(T, M.blocksOf(S, 1)).owed, reply = M.survey(R1, N).best;
  assert.ok(M.equal(M.rankOne(reply.u, reply.v, reply.w),
    M.rankOne(S.U[0], S.V[0], S.W[0]).map(x => -x || 0)), 'its reply is minus the move');
  assert.equal(reply.nnz, 8, 'and the count is back at eight');
});

test("no order of Strassen's seven is downhill: every one peaks at ten or more", () => {
  assert.deepEqual(M.trajectory(T, S), [8, 12, 12, 12, 10, 8, 4, 0]);
  assert.deepEqual(M.orderings(T, S), {orders: 5040, lowPeak: 10, highPeak: 14, neverUp: 0});
  // The lookup by subset is the same count as subtracting in order.
  assert.deepEqual(M.trajectory(T, S, [6, 5, 4, 3, 2, 1, 0]).slice(-1), [0]);
  assert.ok(Math.max(...M.trajectory(T, S, [6, 5, 4, 3, 2, 1, 0])) >= 10);
});

test('the search space: 5¹² at one move, 1,644 digits for 4 × 4 at 49', () => {
  assert.equal(M.powString(5, 12), '244140625');
  assert.equal(M.powString(3, 12), '531441');
  assert.equal(M.powString(5, 27), '7450580596923828125');
  assert.equal(M.powString(3, 27), '7625597484987');
  assert.equal(M.digits(M.log10Games(4, 5, 49)), 1644);
  assert.equal(M.digits(M.log10Moves(2, 5)), 9);
  const one = M.sci(M.log10Moves(4, 5));
  assert.deepEqual([one.mant.toFixed(1), one.exp], ['3.6', 33]);
  const seven = M.sci(M.log10Games(2, 5, 7));
  assert.deepEqual([seven.mant.toFixed(1), seven.exp], ['5.2', 58]);
  const years = M.sci(M.log10Years(M.log10Games(2, 5, 7), 1e9));
  assert.deepEqual([years.mant.toFixed(1), years.exp], ['1.6', 42]);
  // Cut down as far as it goes: unordered sets of seven of the 128,000.
  const sets = M.sci(M.log10Choose(128000, 7));
  assert.deepEqual([sets.mant.toFixed(1), sets.exp], ['1.1', 32]);
  const setYears = M.sci(M.log10Years(M.log10Choose(128000, 7), 1e9));
  assert.deepEqual([setYears.mant.toFixed(1), setYears.exp], ['3.5', 15]);
  assert.deepEqual(M.sci(Math.log10(9.99)), {mant: 1, exp: 1}, 'a mantissa never prints as 10.0');
});

test("the record board is the handbook's: 19 to 23, and what 21 would buy", () => {
  const by = Object.fromEntries(M.RECORDS.map(r => [r.id, r]));
  assert.deepEqual(M.RECORDS.map(r => r.id), ['2x2', '3x3', '4x4', '4x4mod2', '4x5']);
  assert.deepEqual([by['2x2'].lower, by['2x2'].upper], [7, 7]);
  assert.deepEqual([by['4x4mod2'].upper, by['4x4mod2'].before], [47, 49]);
  assert.deepEqual([by['4x5'].upper, by['4x5'].before], [76, 80]);
  assert.equal(by['4x4'].upper, M.recursion(2).strassen, "Strassen's seven, applied twice");
  // The outside record: the note's own sentences.
  assert.match(STILL_OPEN, new RegExp(`at least ${by['3x3'].lower} \\(Bläser, 2003\\)`));
  assert.match(STILL_OPEN, new RegExp(`at most ${by['3x3'].upper} \\(Laderman, 1976\\)`));
  assert.ok(STILL_OPEN.includes(`n^${M.exponent(3, 21).toFixed(3)}`), 'rank 21');
  assert.ok(STILL_OPEN.includes(`n^${M.exponent(3, 22).toFixed(3)}`), 'rank 22');
  assert.ok(STILL_OPEN.includes(`n^${M.OMEGA.toFixed(3)}`), "Strassen's exponent");
  assert.ok(M.exponent(3, 21) < M.OMEGA && M.OMEGA < M.exponent(3, 22),
    '21 would beat Strassen and 22 would not');
});
