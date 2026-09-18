// The arithmetic under the reshape & transpose visualizer: strides, contiguity,
// memory orders, and NumPy's rule for when a reshape is a view. It is kept
// apart from tensor-visualizer.html so `npm test` can pin it without a browser
// (tests/tensor_core.test.cjs): this is the lesson the widget exists to show,
// and the view-versus-copy rule was wrong once. Nothing here touches the DOM
// or the widget's state -- every function takes a shape and strides and
// returns a new array.
//
// The idle drift's state machine is here for the same reason and no other: it
// was wrong once too, in a way no screenshot shows and no end-state assertion
// catches. It is the one thing here that is about the camera rather than the
// tensor, and it is written the same way -- a state goes in, a new state comes
// out, and the widget owns the clock and the DOM.
//
// A plain script, not a module: the widget loads it with a <script src> so it
// works from file:// and inside the homepage's embed, and Node picks it up
// through module.exports.
(function (root) {
  "use strict";

  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const prod = (a) => a.reduce((x, y) => x * y, 1);
  const range = (k) => [...Array(k).keys()];
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

  // Memory layouts, by *position* in the shape: which position runs slowest
  // first. That is how NumPy and PyTorch define them -- channels_last is
  // "position 1 fastest, then 3, then 2, then 0", not "the C axis".
  const POS_ORDERS = { C: [0, 1, 2, 3], F: [3, 2, 1, 0], CL: [0, 2, 3, 1] };

  // The C-ordered index for a flat position k.
  function unravel(k, dims) {
    const out = new Array(dims.length);
    for (let i = dims.length - 1; i >= 0; i--) {
      out[i] = k % dims[i];
      k = (k - out[i]) / dims[i];
    }
    return out;
  }

  // C-contiguous strides, in elements.
  function cstrides(dims) {
    const s = new Array(dims.length);
    let run = 1;
    for (let k = dims.length - 1; k >= 0; k--) { s[k] = run; run *= dims[k]; }
    return s;
  }

  // Strides for `shape` laid out with the positions in `order`, slowest first.
  function stridesFor(shape, order) {
    const s = new Array(order.length);
    let run = 1;
    for (let k = order.length - 1; k >= 0; k--) { s[order[k]] = run; run *= shape[order[k]]; }
    return s;
  }

  // An axis of size 1 is never indexed by anything but 0, so its stride is
  // never read and NumPy ignores it when it reports contiguity. Comparing the
  // stride arrays outright called a one-photo batch non-contiguous.
  function contiguousInOrder(shape, stride, order) {
    let run = 1;
    for (let k = order.length - 1; k >= 0; k--) {
      const p = order[k];
      if (shape[p] === 1) continue;
      if (stride[p] !== run) return false;
      run *= shape[p];
    }
    return true;
  }

  // A memory layout as a *position* order, slowest first. C and F exist at any
  // rank; channels_last is defined on NCHW and so exists only at rank 4.
  function posOrder(rank, kind) {
    if (kind === "C") return range(rank);
    if (kind === "F") return range(rank).reverse();
    return rank === 4 ? POS_ORDERS.CL.slice() : null;
  }

  // Can this shape be reached without touching a byte? NumPy's own rule, and
  // it is not "the view is C-contiguous": axes are matched into groups whose
  // sizes multiply to the same thing on both sides, and a group is expressible
  // in strides as long as its old axes are contiguous *with respect to each
  // other*. Transposing to NCHW and merging the two 16s back together is the
  // case that matters -- 48 == 3 * 16, so it is a view, and calling it a copy
  // taught the opposite of the lesson. Returns the new strides, or null when
  // NumPy would copy.
  function reshapeStrides(shape, stride, next) {
    const old = [];
    for (let i = 0; i < shape.length; i++) if (shape[i] !== 1) old.push([shape[i], stride[i]]);
    const out = next.map(() => 0);
    let i = 0, j = 0;
    while (j < next.length) {
      if (next[j] === 1) { j++; continue; }
      if (i >= old.length) return null;
      const from = i, at = j;
      let have = old[i][0], want = next[j];
      i++;
      j++;
      while (have !== want) {
        if (have < want) {
          if (i >= old.length) return null;
          have *= old[i][0];
          i++;
        } else {
          if (j >= next.length) return null;
          want *= next[j];
          j++;
        }
      }
      for (let k = from; k < i - 1; k++) {
        if (old[k][1] !== old[k + 1][1] * old[k + 1][0]) return null;
      }
      let run = old[i - 1][1];
      for (let k = j - 1; k >= at; k--) { out[k] = run; run *= next[k]; }
    }
    if (i < old.length) return null;
    // A size-1 axis's stride is never read; give it the neighbouring one so the
    // table shows a number rather than a zero.
    for (let k = next.length - 1; k >= 0; k--) {
      if (next[k] === 1) out[k] = k + 1 < next.length ? out[k + 1] * next[k + 1] : 1;
    }
    return out;
  }

  // Which identity survives a reshape: an axis that is carried through whole,
  // matched from both ends. An axis that was split or merged has none, and is
  // known by its position from then on.
  function carryIds(oldShape, oldIds, next) {
    const ids = next.map(() => null);
    let i = oldShape.length - 1, j = next.length - 1;
    while (i >= 0 && j >= 0 && oldShape[i] === next[j]) { ids[j] = oldIds[i]; i--; j--; }
    let a = 0, b = 0;
    while (a <= i && b <= j && oldShape[a] === next[b]) { ids[b] = oldIds[a]; a++; b++; }
    return ids;
  }

  // ─── the idle drift ───────────────────────────────────────────────────────
  //
  // The stage sways and breathes until a reader reaches for it. Why these
  // numbers and not others is in DECISIONS.md; what is here is the part that
  // cannot be seen by looking at the widget for a second.
  //
  // The pose is a bounded excursion *around an origin*, so the origin has to
  // be a pose the reader left. Re-reading it from the live view on every
  // resume made each pause the origin of the next stretch, and then neither
  // bound bounded anything: the breath only ever pulls the scale down, so
  // every crossing of the stage left a smaller origin than the last, and the
  // yaw random-walked out of `yaw` below. Hence `seeded`. Hence `phase` too,
  // which carries the sway across a pause so that it resumes where it
  // stopped rather than stepping back to the origin.
  const DRIFT = {
    yaw: 0.26,      // radians either side of the origin
    yawMs: 16000,   // one full left-right-left swing
    zoom: 0.14,     // how far out the breath pulls, as a fraction of origin
    zoomMs: 8000,   // half the swing, so the camera is furthest out at each
                    // end of it -- which is where the tensor needs the room
    minScale: 0.5,  // zoomBy()'s own bounds. A reader already at either limit
    maxScale: 2.4   // sees the breath flatten against it instead of lurching.
  };

  const driftIdle = () =>
    ({on: false, seeded: false, yaw0: 0, scale0: 1, phase: 0, t0: 0});

  // The pose `phase` ms into a stretch that began at (yaw0, scale0).
  function driftPose(s, phase) {
    const turn = 2 * Math.PI * phase;
    // A raised cosine: starts at the reader's scale, pulls out to `zoom`
    // below it, and comes back. Never above -- the widget frames the tensor
    // with 12% to spare, so a scale above the reader's own crops the bottom
    // row of cubes, which an animation nobody asked for must never do.
    const breath = (1 - Math.cos(turn / DRIFT.zoomMs)) / 2;
    return {
      yaw: s.yaw0 + DRIFT.yaw * Math.sin(turn / DRIFT.yawMs),
      scale: Math.min(DRIFT.maxScale, Math.max(DRIFT.minScale,
        s.scale0 * (1 - DRIFT.zoom * breath)))
    };
  }

  // Starting. Seeds the origin from the view the first time only, and puts
  // the clock back by whatever phase the last pause banked.
  function driftStart(s, yaw, scale, now) {
    const seeded = s.seeded ? s
      : Object.assign({}, s, {yaw0: yaw, scale0: scale, phase: 0, seeded: true});
    return Object.assign({}, seeded, {on: true, t0: now - seeded.phase});
  }

  // Pausing: a pointer crossing the stage. Keeps the origin, banks the phase.
  function driftPause(s, now) {
    return s.on ? Object.assign({}, s, {on: false, phase: now - s.t0}) : s;
  }

  // The reader took the view -- a drag, a wheel, a gizmo click. The next
  // stretch belongs around wherever they leave it, so the seed goes with it.
  function driftRelease(s, now) {
    return Object.assign({}, driftPause(s, now), {seeded: false, phase: 0});
  }

  const TensorCore = {
    sum, prod, range, same, unravel, POS_ORDERS,
    cstrides, stridesFor, contiguousInOrder, posOrder, reshapeStrides, carryIds,
    DRIFT, driftIdle, driftPose, driftStart, driftPause, driftRelease
  };
  if (typeof module !== "undefined" && module.exports) module.exports = TensorCore;
  else root.TensorCore = TensorCore;
})(typeof window !== "undefined" ? window : globalThis);
