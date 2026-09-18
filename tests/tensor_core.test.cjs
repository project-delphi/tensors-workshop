// Pins the arithmetic under the reshape & transpose visualizer
// (interactive/tensor-core.js). Run with `npm test`; no browser, no render.
// Each case is a lesson the widget teaches, so a failure here is a wrong
// number on screen rather than a broken page -- the kind of regression the
// browser check, which asserts a handful of end states, would not see.
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../interactive/tensor-core.js');

const NHWC = [3, 16, 16, 3];
const permute = (shape, stride, perm) => [perm.map(p => shape[p]), perm.map(p => stride[p])];

test('C-contiguous strides count elements, fastest last', () => {
  assert.deepEqual(core.cstrides([2, 3, 4]), [12, 4, 1]);
  assert.deepEqual(core.cstrides(NHWC), [768, 48, 3, 1]);
  assert.deepEqual(core.cstrides([]), []);
});

test('transpose permutes shape and strides together, reading nothing', () => {
  const [shape, stride] = permute(NHWC, core.cstrides(NHWC), [0, 3, 1, 2]);
  assert.deepEqual(shape, [3, 3, 16, 16]);
  assert.deepEqual(stride, [768, 1, 48, 3]);
  assert.equal(core.contiguousInOrder(shape, stride, core.range(4)), false);
});

test('merging the two 16s after a transpose to NCHW is a view (48 == 3 * 16)', () => {
  const [shape, stride] = permute(NHWC, core.cstrides(NHWC), [0, 3, 1, 2]);
  assert.deepEqual(core.reshapeStrides(shape, stride, [3, 3, 256]), [768, 1, 3]);
});

test('flattening across the channel axis after that transpose copies', () => {
  const [shape, stride] = permute(NHWC, core.cstrides(NHWC), [0, 3, 1, 2]);
  assert.equal(core.reshapeStrides(shape, stride, [3, 768]), null);
  assert.equal(core.reshapeStrides(shape, stride, [2304]), null);
});

test('a Fortran-ordered matrix cannot be flattened as a view; a C-ordered one can', () => {
  assert.equal(core.reshapeStrides([2, 3], [1, 2], [6]), null);
  assert.deepEqual(core.reshapeStrides([2, 3], [3, 1], [6]), [1]);
  assert.deepEqual(core.reshapeStrides([2, 3], [3, 1], [3, 2]), [2, 1]);
  assert.deepEqual(core.reshapeStrides([2, 3, 4], [12, 4, 1], [24]), [1]);
  assert.deepEqual(core.reshapeStrides([2, 3, 4], [12, 4, 1], [6, 4]), [4, 1]);
});

test('every factorisation of np.arange(24) is a reshape it can take', () => {
  for (const next of [[24], [2, 12], [4, 6], [2, 3, 4], [2, 2, 2, 3], [3, 8]]) {
    assert.deepEqual(core.reshapeStrides([2, 3, 4], [12, 4, 1], next), core.cstrides(next), `to ${next}`);
  }
  assert.equal(core.reshapeStrides([2, 3, 4], [12, 4, 1], [5, 5]), null, 'wrong element count');
});

test('a size-1 axis is skipped when matching and never gets stride 0', () => {
  assert.deepEqual(core.reshapeStrides([1, 4], [4, 1], [4]), [1]);
  assert.deepEqual(core.reshapeStrides([4], [1], [1, 4]), [4, 1]);
  assert.deepEqual(core.reshapeStrides([4], [1], [4, 1]), [1, 1]);
  assert.equal(core.reshapeStrides([1, 4], [4, 1], [4]).includes(0), false);
});

test('contiguity ignores a size-1 axis, so a one-photo batch is contiguous', () => {
  const one = [1, 16, 16, 3];
  assert.equal(core.contiguousInOrder(one, [768, 48, 3, 1], core.range(4)), true);
  assert.equal(core.contiguousInOrder(one, [999, 48, 3, 1], core.range(4)), true, 'its stride is never read');
  assert.equal(core.contiguousInOrder([2, 3], [1, 2], core.range(2)), false);
  assert.equal(core.contiguousInOrder([2, 3], [1, 2], [1, 0]), true, 'Fortran order');
});

test('memory layouts as position orders; channels_last only at rank 4', () => {
  assert.deepEqual(core.posOrder(3, 'C'), [0, 1, 2]);
  assert.deepEqual(core.posOrder(3, 'F'), [2, 1, 0]);
  assert.deepEqual(core.posOrder(4, 'CL'), [0, 2, 3, 1]);
  assert.equal(core.posOrder(3, 'CL'), null);
  assert.deepEqual(core.stridesFor([3, 3, 16, 16], core.posOrder(4, 'CL')), [768, 1, 48, 3]);
  assert.deepEqual(core.stridesFor([3, 3, 16, 16], core.posOrder(4, 'C')), [768, 256, 16, 1]);
  assert.deepEqual(core.stridesFor([2, 3], core.posOrder(2, 'F')), [1, 2]);
});

test('an axis carried through a reshape whole keeps its identity; a merged one loses it', () => {
  assert.deepEqual(core.carryIds([3, 16, 16, 3], [0, 1, 2, 3], [3, 256, 3]), [0, null, 3]);
  assert.deepEqual(core.carryIds([3, 3, 16, 16], [0, 3, 1, 2], [3, 3, 256]), [0, 3, null]);
  assert.deepEqual(core.carryIds([2, 3, 4], [0, 1, 2], [24]), [null]);
  assert.deepEqual(core.carryIds([2, 3, 4], [0, 1, 2], [2, 3, 4]), [0, 1, 2]);
});

test('unravel is the C-ordered index of a flat position', () => {
  assert.deepEqual(core.unravel(33, [4, 5, 6]), [1, 0, 3]);
  assert.deepEqual(core.unravel(0, [2, 2]), [0, 0]);
  assert.equal(core.sum(core.unravel(33, [4, 5, 6]).map((v, i) => v * core.cstrides([4, 5, 6])[i])), 33);
});
