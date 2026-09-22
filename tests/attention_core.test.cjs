// Pins interactive/attention-core.js without a browser: the seed's
// legibility contract, the reshape-then-transpose that gives each head its
// own axis versus the direct reshape that does not, the two contractions,
// softmax's two axes, the causal mask, and the arithmetic identities the
// stage's claims depend on.
const test = require('node:test');
const assert = require('node:assert/strict');
const AC = require('../interactive/attention-core.js');

const HEADS = 2, DK = 4;

function pipeline() {
  const E = AC.embedding();
  const X = AC.gather(E, AC.IDS);
  const P = AC.projections();
  return {E, X, P};
}

test('the seed keeps every Q, K, V entry an integer with |value| <= 3', () => {
  const {X, P} = pipeline();
  const Q = AC.matmul(X, P.WQ), K = AC.matmul(X, P.WK), V = AC.matmul(X, P.WV);
  for (const M of [Q, K, V]) {
    for (const row of M) {
      for (const v of row) {
        assert.ok(Number.isInteger(v), `entry ${v} is not an integer`);
        assert.ok(Math.abs(v) <= 3, `entry ${v} exceeds the legibility bound of 3`);
      }
    }
  }
});

test('X = E[ids] has shape (4, 8) and repeats a row where ids repeat', () => {
  const {X} = pipeline();
  assert.equal(X.length, 4);
  assert.equal(X[0].length, 8);
  // ids = [3, 1, 4, 1]: rows 1 and 3 are the same gather.
  assert.deepEqual(X[1], X[3]);
});

test('splitHeads is reshape-then-transpose: head h, token s, feature d reads X[s][h*Dh+d]', () => {
  const {X} = pipeline();
  const Xh = AC.splitHeads(X, HEADS);
  const dh = X[0].length / HEADS;
  for (let h = 0; h < HEADS; h++) {
    for (let s = 0; s < X.length; s++) {
      for (let d = 0; d < dh; d++) {
        assert.equal(Xh[h][s][d], X[s][h * dh + d]);
      }
    }
  }
});

test('splitHeadsWrong keeps the shape but not the contents, and traceCell explains both', () => {
  const {X} = pipeline();
  const right = AC.splitHeads(X, HEADS);
  const wrong = AC.splitHeadsWrong(X, HEADS);
  assert.deepEqual(right.map(h => [h.length, h[0].length]),
                    wrong.map(h => [h.length, h[0].length]));
  assert.notDeepEqual(right[1], wrong[1], 'head 1 should differ between the two reshapes');
  const good = AC.traceCell(X, HEADS, false, 0, 1, 0);
  const bad = AC.traceCell(X, HEADS, true, 0, 1, 0);
  assert.equal(good.from.s, 1, 'the honest reshape keeps token 1 as token 1');
  assert.notEqual(bad.from.s, good.from.s, 'the direct reshape reads a different token');
  assert.equal(good.value, X[good.from.s][good.from.d]);
  assert.equal(bad.value, X[bad.from.s][bad.from.d]);
});

test('mergeHeads undoes splitHeads exactly', () => {
  const {X} = pipeline();
  assert.deepEqual(AC.mergeHeads(AC.splitHeads(X, HEADS)), X);
});

test('scores contracts over d, and scaled is exactly half of unscaled', () => {
  const {X, P} = pipeline();
  const Q = AC.splitHeads(AC.matmul(X, P.WQ), HEADS);
  const K = AC.splitHeads(AC.matmul(X, P.WK), HEADS);
  const raw = AC.scores(Q, K, DK, false);
  const scaled = AC.scores(Q, K, DK, true);
  for (let h = 0; h < HEADS; h++) {
    for (let i = 0; i < Q[0].length; i++) {
      for (let j = 0; j < Q[0].length; j++) {
        assert.equal(scaled[h][i][j], raw[h][i][j] / 2);
      }
    }
  }
});

test('softmax over keys: every row sums to 1; over queries, rows need not', () => {
  const {X, P} = pipeline();
  const Q = AC.splitHeads(AC.matmul(X, P.WQ), HEADS);
  const K = AC.splitHeads(AC.matmul(X, P.WK), HEADS);
  const L = AC.scores(Q, K, DK, true);
  const overKeys = AC.softmax(L, 'keys');
  for (const row of AC.rowSums(overKeys, 't')) {
    for (const v of row) assert.ok(Math.abs(v - 1) < 1e-9);
  }
  const overQueries = AC.softmax(L, 'queries');
  const rowSumsQ = AC.rowSums(overQueries, 't');
  const anyOff = rowSumsQ.some(row => row.some(v => Math.abs(v - 1) > 1e-6));
  assert.ok(anyOff, 'softmax over queries should not make every row over t sum to 1');
  // But every *column* over s does.
  const colSumsQ = AC.rowSums(overQueries, 's');
  for (const row of colSumsQ) for (const v of row) assert.ok(Math.abs(v - 1) < 1e-9);
});

test('a causal mask gives exact zero weight to the future, and row 0 attends only to itself', () => {
  const S = 4;
  const {X, P} = pipeline();
  const Q = AC.splitHeads(AC.matmul(X, P.WQ), HEADS);
  const K = AC.splitHeads(AC.matmul(X, P.WK), HEADS);
  const mask = AC.causalMask(S);
  let maskedCount = 0;
  for (const row of mask) for (const v of row) if (v === -Infinity) maskedCount++;
  assert.equal(maskedCount, 6);
  const L = AC.applyMask(AC.scores(Q, K, DK, true), mask);
  const A = AC.softmax(L, 'keys');
  for (const head of A) {
    for (let i = 0; i < S; i++) {
      for (let j = i + 1; j < S; j++) assert.equal(head[i][j], 0);
    }
    assert.equal(head[0][0], 1, 'row 0 has exactly one non-zero weight, at t=0');
  }
});

test('the attention output is a convex combination of V', () => {
  const {X, P} = pipeline();
  const out = AC.attention(X, HEADS, {WQ: P.WQ, WK: P.WK, WV: P.WV, scaled: true});
  assert.ok(AC.isConvex(out.O, out.V, 1e-9));
});

test('paramCount is 3D^2, independent of the head count', () => {
  for (const heads of [1, 2, 4]) assert.equal(AC.paramCount(8, heads), 192);
});

test('the pipeline agrees with a hand-written triple loop', () => {
  const {X, P} = pipeline();
  const out = AC.attention(X, HEADS, {WQ: P.WQ, WK: P.WK, WV: P.WV, scaled: true});
  const dh = X[0].length / HEADS;
  // Hand-rolled Q for head 0 straight from X and WQ, no splitHeads helper.
  for (let s = 0; s < X.length; s++) {
    for (let d = 0; d < dh; d++) {
      let acc = 0;
      for (let k = 0; k < X[0].length; k++) acc += X[s][k] * P.WQ[k][d];
      assert.equal(out.Q[0][s][d], acc);
    }
  }
  // And the merged output's shape is (4, 8).
  assert.equal(out.merged.length, 4);
  assert.equal(out.merged[0].length, 8);
});

test('elementCount multiplies a shape', () => {
  assert.equal(AC.elementCount([2, 2, 4, 4]), 64);
});

test('smallInts and projMatrix are deterministic for a fixed seed', () => {
  assert.deepEqual(AC.smallInts(3, 2, 2, 0, 1), AC.smallInts(3, 2, 2, 0, 1));
  assert.deepEqual(AC.projMatrix(3, 8, 3), AC.projMatrix(3, 8, 3));
});

test('the sentence tokenises to the stage ids, and the tokenizer sets S', () => {
  const words = AC.tokenize(AC.SENTENCE, 'words');
  assert.deepEqual(words, ['I', 'know', 'you', 'know']);
  assert.deepEqual(AC.encode(words, AC.VOCAB), AC.IDS);
  assert.equal(AC.tokenize(AC.SENTENCE, 'chars').length, 15);
  assert.throws(() => AC.encode(['cat'], AC.VOCAB), /not in the vocabulary/);
});

test('headProjections(h) is exactly the head-h slice splitHeads takes of X W', () => {
  const {X, P} = pipeline();
  for (let h = 0; h < HEADS; h++) {
    const Ph = AC.headProjections(h);
    for (const w of ['WQ', 'WK', 'WV']) {
      assert.deepEqual(AC.matmul(X, Ph[w]), AC.splitHeads(AC.matmul(X, P[w]), HEADS)[h]);
    }
  }
});

test('the spread of q.k grows like sqrt(d_k), and dividing by sqrt(d_k) holds it at 1', () => {
  let lastPeak = 0;
  for (const dk of [1, 4, 16, 64, 256]) {
    const r = AC.scaleSpread(dk, 400, 8);
    assert.ok(Math.abs(r.rawStd / Math.sqrt(dk) - 1) < 0.1, `d_k=${dk}: raw std ${r.rawStd}`);
    assert.ok(Math.abs(r.scaledStd - 1) < 0.1, `d_k=${dk}: scaled std ${r.scaledStd}`);
    assert.ok(r.peakRaw >= lastPeak, `d_k=${dk}: the unscaled peak should only rise`);
    lastPeak = r.peakRaw;
  }
  assert.ok(AC.scaleSpread(256, 400, 8).peakRaw > 0.9, 'unscaled softmax should saturate at 256');
  assert.ok(AC.scaleSpread(256, 400, 8).peakScaled < 0.5, 'scaled softmax should not');
  assert.deepEqual(AC.scaleSpread(16, 50, 8).raw, AC.scaleSpread(16, 50, 8).raw, 'seeded');
});

test('without position, the two "know" rows come out of attention identical', () => {
  const {X} = pipeline();
  const P = AC.headProjections(0);
  const Q = AC.matmul(X, P.WQ), K = AC.matmul(X, P.WK), V = AC.matmul(X, P.WV);
  const O = AC.attend(AC.softmax(AC.scores([Q], [K], DK, true), 'keys'), [V])[0];
  assert.deepEqual(O[1], O[3]);
  assert.notDeepEqual(O[0], O[2]);
});
