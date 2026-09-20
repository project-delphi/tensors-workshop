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

// ─── the idle drift ─────────────────────────────────────────────────────────
//
// The stage sways and breathes while nobody points at it. These pin the one
// thing about it that a screenshot cannot show and the browser check, which
// asserts that the stage moves, stops and moves again, would pass right
// through: that stopping and starting does not itself move the tensor.

const HOME = {yaw: 0.9, scale: 1};
const started = (now = 0, view = HOME) =>
  core.driftStart(core.driftIdle(), view.yaw, view.scale, now);

test('a stretch of drift begins exactly where the reader left the view', () => {
  const pose = core.driftPose(started(), 0);
  assert.equal(pose.yaw, HOME.yaw);
  assert.equal(pose.scale, HOME.scale);
});

test('the swing stays within DRIFT.yaw of its origin, and the breath below its scale', () => {
  const s = started();
  for (let phase = 0; phase <= 2 * core.DRIFT.yawMs; phase += 50) {
    const {yaw, scale} = core.driftPose(s, phase);
    assert.ok(Math.abs(yaw - HOME.yaw) <= core.DRIFT.yaw + 1e-9,
      `yaw left its bound at ${phase}ms`);
    // Out and back, never in: a scale above the reader's own crops the cubes.
    assert.ok(scale <= HOME.scale + 1e-9 &&
              scale >= HOME.scale * (1 - core.DRIFT.zoom) - 1e-9,
      `scale left its bound at ${phase}ms`);
  }
});

test('the breath is furthest out at each end of the swing', () => {
  const s = started();
  for (const end of [core.DRIFT.yawMs / 4, 3 * core.DRIFT.yawMs / 4]) {
    assert.ok(Math.abs(core.driftPose(s, end).scale -
                       HOME.scale * (1 - core.DRIFT.zoom)) < 1e-9);
  }
});

test('a pause banks the phase, and the resumed sway picks it up where it stopped', () => {
  const paused = core.driftPause(started(0), 3000);
  assert.equal(paused.on, false);
  assert.equal(paused.phase, 3000);
  // Resumed 90 seconds later: the pose is the one the pause interrupted, not
  // the origin, so nothing jumps on the frame the pointer leaves.
  const back = core.driftStart(paused, 99, 99, 93000);
  assert.deepEqual(core.driftPose(back, 93000 - back.t0), core.driftPose(started(), 3000));
});

test('pausing and resuming never re-seeds the origin — the scale would ratchet down', () => {
  // The bug this pins: seeding from the live view on resume made every
  // crossing of the stage the origin of the next stretch. The breath only
  // pulls down, so the tensor shrank towards DRIFT.minScale a little at a
  // time. Eight crossings measured 82.6% of the framing they started at.
  let s = started(0);
  let clock = 0;
  let caught = 0;
  for (let crossing = 0; crossing < 40; crossing++) {
    clock += 2600;                                   // the pointer arrives mid-breath
    const at = core.driftPose(s, clock - s.t0);
    s = core.driftPause(s, clock);
    if (at.scale < HOME.scale) caught++;
    clock += 300;                                    // DRIFT_RESUME_MS, and back
    s = core.driftStart(s, at.yaw, at.scale, clock);  // the live view, as it was read
    assert.equal(s.yaw0, HOME.yaw);
    assert.equal(s.scale0, HOME.scale);
  }
  // Most crossings land with the breath partway out, which is what a resume
  // that re-read the view would have banked; a few land on its trough.
  assert.ok(caught > 30, `the probe caught the breath out only ${caught} times`);
  assert.equal(core.driftPose(s, 0).scale, HOME.scale);
});

test('a reader taking the view re-seeds it, and a crossing pointer does not', () => {
  const moved = {yaw: 2.2, scale: 1.4};
  // A drag, a wheel or a gizmo click: released, so the next stretch is theirs.
  const released = core.driftRelease(core.driftPause(started(0), 2000), 2000);
  assert.equal(released.seeded, false);
  assert.equal(released.phase, 0);
  const next = core.driftStart(released, moved.yaw, moved.scale, 9000);
  assert.deepEqual(core.driftPose(next, 0), moved);
  // The same view read after a mere pause is ignored.
  const paused = core.driftStart(core.driftPause(started(0), 2000), moved.yaw, moved.scale, 9000);
  assert.equal(paused.yaw0, HOME.yaw);
  assert.equal(paused.scale0, HOME.scale);
});

test('the breath flattens against zoomBy()\'s floor rather than going under it', () => {
  const low = started(0, {yaw: 0, scale: core.DRIFT.minScale});
  for (let phase = 0; phase <= core.DRIFT.zoomMs; phase += 50) {
    assert.ok(core.driftPose(low, phase).scale >= core.DRIFT.minScale);
  }
  assert.equal(core.driftPose(low, core.DRIFT.zoomMs / 2).scale, core.DRIFT.minScale);
});
