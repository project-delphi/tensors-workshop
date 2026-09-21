// Pins the arithmetic under the voice tensor stage (interactive/audio-core.js).
// Run with `npm test`; no browser, no render, no AudioContext.
//
// The last test is the one that matters most. Appendix E of the handbook
// publishes a table of signal-to-noise ratios against rank, computed in
// Python with numpy and scipy; the stage recomputes that table in JavaScript
// from the same recording. This file recomputes it too, and fails if the two
// ever stop agreeing -- so a change to the transform, the window or the
// factorisation cannot quietly move a number the handbook prints.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../interactive/audio-core.js');

const WAV = path.join(__dirname, '..', 'interactive', 'vendor', 'voice.wav');

// A direct transform, to check the fast one against.
function dft(re, im) {
  const n = re.length, R = new Float64Array(n), I = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    for (let t = 0; t < n; t++) {
      const a = -2 * Math.PI * k * t / n, c = Math.cos(a), s = Math.sin(a);
      R[k] += re[t] * c - im[t] * s;
      I[k] += re[t] * s + im[t] * c;
    }
  }
  return {re: R, im: I};
}

const maxAbs = (a, b) => {
  let e = 0;
  for (let i = 0; i < a.length; i++) e = Math.max(e, Math.abs(a[i] - b[i]));
  return e;
};

test('the fast transform agrees with a direct one', () => {
  const n = 64, re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    re[i] = Math.sin(i * 0.7) + 0.3 * Math.cos(i * 2.1);
    im[i] = 0.1 * Math.sin(i * 1.3);
  }
  const want = dft(Float64Array.from(re), Float64Array.from(im));
  const got = core.fft(Float64Array.from(re), Float64Array.from(im), false);
  assert.ok(maxAbs(got.re, want.re) < 1e-10, 'real part');
  assert.ok(maxAbs(got.im, want.im) < 1e-10, 'imaginary part');
});

test('a window size that is not a power of two is refused, not rounded', () => {
  assert.throws(() => core.stft(new Float64Array(2048), 1000, 500, 'hann'), /power of two/);
});

test('the window is periodic, so Hann at half overlap sums to a constant', () => {
  const N = 64, w = core.windowOf('hann', N);
  assert.equal(w[0], 0);
  // w[n] + w[n + N/2] == 1 for a periodic Hann: that is the overlap-add
  // identity the inverse transform relies on.
  for (let i = 0; i < N / 2; i++) assert.ok(Math.abs(w[i] + w[i + N / 2] - 1) < 1e-12);
});

test('the inverse transform reconstructs the signal it was given', () => {
  const n = 20000, x = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = Math.sin(i * 0.03) * Math.exp(-i / 9000) + 0.2 * Math.sin(i * 0.31);
  }
  for (const [N, hop] of [[1024, 512], [512, 256], [256, 64]]) {
    const s = core.stft(x, N, hop, 'hann');
    const y = core.istft(s.Z, s.F, s.T, N, hop, 'hann', n);
    assert.ok(maxAbs(y, x) < 1e-9, `N=${N} hop=${hop} round trip`);
  }
});

test('halving the hop doubles the number of columns, and F is N/2 + 1', () => {
  const x = new Float64Array(20000);
  const wide = core.stft(x, 1024, 512, 'hann');
  const tight = core.stft(x, 1024, 256, 'hann');
  assert.equal(wide.F, 513);
  assert.equal(tight.F, 513);
  assert.ok(Math.abs(tight.T - 2 * wide.T) <= 2, `${tight.T} vs ${wide.T}`);
});

test('Q from the complex QR is orthonormal', () => {
  const m = 120, n = 40, Z = core.cplx(m * n), g = core.gaussians(2 * m * n, 3);
  for (let i = 0; i < m * n; i++) { Z.re[i] = g[2 * i]; Z.im[i] = g[2 * i + 1]; }
  const Q = core.qrComplex(Z, m, n);
  let worst = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let dr = 0, di = 0;
      for (let r = 0; r < m; r++) {
        const qr = Q.re[r * n + i], qi = Q.im[r * n + i];
        const pr = Q.re[r * n + j], pi = Q.im[r * n + j];
        dr += qr * pr + qi * pi;
        di += qr * pi - qi * pr;
      }
      worst = Math.max(worst, Math.abs(dr - (i === j ? 1 : 0)), Math.abs(di));
    }
  }
  assert.ok(worst < 1e-12, `Q*Q - I was ${worst}`);
});

test('the Hermitian eigendecomposition rebuilds its matrix, in descending order', () => {
  const n = 24, M = core.cplx(n * n), g = core.gaussians(2 * n * n, 5);
  for (let i = 0; i < n * n; i++) { M.re[i] = g[2 * i]; M.im[i] = g[2 * i + 1]; }
  const H = core.cplx(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      H.re[i * n + j] = (M.re[i * n + j] + M.re[j * n + i]) / 2;
      H.im[i * n + j] = (M.im[i * n + j] - M.im[j * n + i]) / 2;
    }
  }
  const {values, vectors} = core.hermitianEig(H, n);
  for (let i = 1; i < n; i++) assert.ok(values[i] <= values[i - 1] + 1e-9, 'descending');
  let worst = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sr = 0, si = 0;
      for (let c = 0; c < n; c++) {
        const vr = vectors.re[i * n + c], vi = vectors.im[i * n + c];
        const wr = vectors.re[j * n + c], wi = -vectors.im[j * n + c];
        sr += values[c] * (vr * wr - vi * wi);
        si += values[c] * (vr * wi + vi * wr);
      }
      worst = Math.max(worst, Math.abs(sr - H.re[i * n + j]), Math.abs(si - H.im[i * n + j]));
    }
  }
  assert.ok(worst < 1e-10, `V L V* - H was ${worst}`);
});

test('the chunked factorisation and the drained one are the same arithmetic', () => {
  const F = 40, T = 30, Z = core.cplx(F * T), g = core.gaussians(2 * F * T, 11);
  for (let i = 0; i < F * T; i++) { Z.re[i] = g[2 * i]; Z.im[i] = g[2 * i + 1]; }
  const whole = core.leftSubspace(Z, F, T, {sketch: 20, power: 2});
  const it = core.leftSubspaceSteps(Z, F, T, {sketch: 20, power: 2});
  let r = it.next(), bands = 0;
  while (!r.done) { bands++; r = it.next(); }
  assert.ok(bands > 0, 'the generator yielded at least once');
  assert.equal(maxAbs(r.value.sigma, whole.sigma), 0);
});

test('the rank-k projection is a truncated SVD: it keeps k singular values', () => {
  const F = 40, T = 30, Z = core.cplx(F * T), g = core.gaussians(2 * F * T, 13);
  for (let i = 0; i < F * T; i++) { Z.re[i] = g[2 * i]; Z.im[i] = g[2 * i + 1]; }
  const {U, sigma, l} = core.leftSubspace(Z, F, T, {sketch: 30, power: 4});
  const total = core.frobSq(Z);
  for (const k of [1, 5, 20]) {
    const Zk = core.projectRank(Z, U, F, T, l, k);
    // ||Z_k||_F^2 is the sum of the first k squared singular values.
    let want = 0;
    for (let i = 0; i < k; i++) want += sigma[i] * sigma[i];
    assert.ok(Math.abs(core.frobSq(Zk) - want) / want < 1e-8, `k=${k} energy`);
    assert.ok(Math.abs(core.retained(sigma, k, total) - want / total) < 1e-12, `k=${k} retained`);
  }
  // Every singular value kept means the matrix back, unchanged.
  const full = core.projectRank(Z, U, F, T, l, Math.min(F, T));
  assert.ok(maxAbs(full.re, Z.re) < 1e-10 && maxAbs(full.im, Z.im) < 1e-10);
});

test('noise is scaled to the ratio it was asked for, and repeats on the same seed', () => {
  const n = 5000, clean = new Float64Array(n);
  for (let i = 0; i < n; i++) clean[i] = Math.sin(i * 0.05);
  for (const target of [0, 5, 12]) {
    const noise = core.noiseAtSnr(clean, target, 42);
    const noisy = Float64Array.from(clean, (v, i) => v + noise[i]);
    assert.ok(Math.abs(core.snrDb(clean, noisy) - target) < 1e-9, `${target} dB`);
  }
  assert.equal(maxAbs(core.noiseAtSnr(clean, 5, 42), core.noiseAtSnr(clean, 5, 42)), 0);
  assert.ok(maxAbs(core.noiseAtSnr(clean, 5, 42), core.noiseAtSnr(clean, 5, 43)) > 0);
});

test('NMF drives its reconstruction error down and keeps both factors non-negative', () => {
  const F = 24, T = 18, k = 3;
  const V = new Float64Array(F * T);
  const r = core.rng(2);
  for (let i = 0; i < V.length; i++) V[i] = r() * r() + 0.01;
  const s = core.nmfInit(V, F, T, k, 7);
  const first = core.nmfError(V, s);
  core.nmfStep(V, s, 40);
  const later = core.nmfError(V, s);
  assert.ok(later < first, `${later} should be below ${first}`);
  assert.equal(s.iter, 40);
  for (const a of [s.W, s.H]) for (let i = 0; i < a.length; i++) assert.ok(a[i] >= 0);
});

test('a rank beyond the components computed is refused, not answered with NaN', () => {
  const F = 40, T = 30, Z = core.cplx(F * T), g = core.gaussians(2 * F * T, 17);
  for (let i = 0; i < F * T; i++) { Z.re[i] = g[2 * i]; Z.im[i] = g[2 * i + 1]; }
  const {U, sigma, l} = core.leftSubspace(Z, F, T, {sketch: 12, power: 2});
  assert.equal(l, 12);
  // Used to read past U, store undefined as NaN, and hand the inverse
  // transform a spectrogram that plays as silence.
  assert.throws(() => core.projectRank(Z, U, F, T, l, 20), /outside the 12 components/);
  assert.throws(() => core.retained(sigma, 20, core.frobSq(Z)), /outside the 12 components/);
  assert.ok(Number.isFinite(core.frobSq(core.projectRank(Z, U, F, T, l, l))));
});

test('a window name cannot reach through to Object.prototype', () => {
  // WINDOWS['constructor'] was truthy and callable, so this returned a boxed
  // Number and stft filled the spectrogram with NaN.
  for (const kind of ['constructor', 'toString', 'valueOf', '__proto__', 'nope']) {
    assert.ok(core.windowOf(kind, 8) instanceof Float64Array, kind);
  }
  assert.deepEqual(Array.from(core.windowOf('rect', 4)), [1, 1, 1, 1]);
});

test('a truncated or empty data chunk is refused, as the header promises', () => {
  const wav = fs.readFileSync(WAV);
  assert.throws(() => core.decodeWav(wav.subarray(0, 4096)), /declares .* carries/);
  const empty = Buffer.from(wav.subarray(0, 44));
  empty.writeUInt32LE(0, 40);            // a streamed WAV writes 0 here
  assert.throws(() => core.decodeWav(empty), /empty/);
});

test('noise against silence is refused rather than scaled to nothing', () => {
  assert.throws(() => core.noiseAtSnr(new Float64Array(64), 5, 1), /no energy/);
});

test('a transpose and a patch shuffle are permutations: every number survives', () => {
  // The voice stage prints "the same 263,169 numbers, in a different order"
  // beside the picture. That claim is this test.
  const F = 54, T = 54, Z = core.cplx(F * T), g = core.gaussians(2 * F * T, 23);
  for (let i = 0; i < F * T; i++) { Z.re[i] = g[2 * i]; Z.im[i] = g[2 * i + 1]; }
  const bag = (M) => Array.from(M.re).map((v, i) => v + 'i' + M.im[i]).sort();
  const want = bag(Z);
  for (const M of [core.transposeC(Z, F, T), core.patchShuffle(Z, F, T, 27)]) {
    assert.equal(M.re.length, F * T);
    assert.deepEqual(bag(M), want);
  }
  // Transposing twice is the identity; the shuffle moves something.
  const back = core.transposeC(core.transposeC(Z, F, T), T, F);
  assert.equal(maxAbs(back.re, Z.re), 0);
  assert.ok(maxAbs(core.patchShuffle(Z, F, T, 27).re, Z.re) > 0);
});

test('a patch shuffle that would drop numbers is refused, not truncated', () => {
  // 513 = 27 x 19, so 27 tiles it and 8 does not.
  const Z = core.cplx(54 * 54);
  assert.throws(() => core.patchShuffle(Z, 54, 54, 8), /does not divide/);
  assert.equal(513 % 27, 0);
  // A non-square matrix sends half its blocks past the end of the
  // destination, where a typed array drops them silently: with F=4, T=8 and
  // patch 2 the result held half the energy that went in, and both of the
  // tests above passed because they were square. Refused now.
  const R = core.cplx(4 * 8);
  for (let i = 0; i < 32; i++) { R.re[i] = i + 1; R.im[i] = 0; }
  assert.throws(() => core.patchShuffle(R, 4, 8, 2), /square/);
  const sum = (M) => M.re.reduce((a, b) => a + b, 0);
  const sq = core.cplx(6 * 6);
  for (let i = 0; i < 36; i++) { sq.re[i] = i + 1; sq.im[i] = 0; }
  assert.equal(sum(core.patchShuffle(sq, 6, 6, 2)), sum(sq), 'a square shuffle keeps every number');
  assert.equal(sum(core.transposeC(R, 4, 8)), sum(R), 'a transpose works on any shape');
});

test('the recording decodes as the mono 48 kHz the handbook describes', () => {
  const wav = core.decodeWav(fs.readFileSync(WAV));
  assert.equal(wav.rate, 48000);
  assert.equal(wav.channels, 1);
  assert.equal(wav.samples.length, 237568);
  // 4.949 seconds, as Appendix E says.
  assert.equal((wav.samples.length / wav.rate).toFixed(3), '4.949');
});

test('something that is not a RIFF/WAVE file is refused', () => {
  assert.throws(() => core.decodeWav(Buffer.from('not audio at all, really')), /RIFF/);
});

// The agreement gate. Appendix E of the handbook publishes these numbers,
// executed in Python; this recomputes them in JavaScript from the same bytes.
//
// The tolerance is 0.05 dB and it is not slack. The widget's noise comes from
// a seeded generator in audio-core.js, not from numpy's PCG64, so it is a
// different draw of Gaussian noise at the same 5 dB. Across seeds the peak of
// this curve moves by about 0.04 dB, which is the whole of the budget below --
// the shape of the curve, the rank it peaks at, and the two ends are not
// realisation-dependent at all, and those are asserted exactly.
test('Appendix E: the stage reproduces the handbook table from the same recording', () => {
  const wav = core.decodeWav(fs.readFileSync(WAV));
  const clean = wav.samples;
  const noise = core.noiseAtSnr(clean, 5, 42);
  const noisy = Float64Array.from(clean, (v, i) => v + noise[i]);

  assert.equal(core.snrDb(clean, noisy).toFixed(2), '5.00', 'the noisy input is 5 dB by construction');

  const s = core.stft(noisy, 1024, 512, 'hann');
  assert.equal(s.F, 513, 'frequency bins');
  assert.equal(s.T, 465, 'time frames');
  assert.equal(Math.min(s.F, s.T), 465, 'full rank');

  const {U, sigma, l} = core.leftSubspace(s.Z, s.F, s.T);
  const total = core.frobSq(s.Z);
  const rank = (k) => {
    const Zk = core.projectRank(s.Z, U, s.F, s.T, l, k);
    return {
      snr: core.snrDb(clean, core.istft(Zk, s.F, s.T, 1024, 512, 'hann', clean.length)),
      retained: 100 * core.retained(sigma, k, total)
    };
  };

  // k, the handbook's SNR, the handbook's retained energy.
  const TABLE = [[2, 2.29, 33.2], [5, 4.76, 51.1], [10, 6.78, 61.9],
                 [20, 8.48, 70.1], [40, 9.08, 78.3], [80, 7.68, 87.1]];
  const got = {};
  for (const [k, snr, retained] of TABLE) {
    const r = rank(k);
    got[k] = r.snr;
    assert.ok(Math.abs(r.snr - snr) < 0.05,
      `k=${k}: handbook says ${snr} dB, got ${r.snr.toFixed(2)} dB`);
    assert.ok(Math.abs(r.retained - retained) < 0.5,
      `k=${k}: handbook says ${retained}% retained, got ${r.retained.toFixed(1)}%`);
  }

  // The two ends, which are the lesson and are exact.
  assert.ok(got[2] < 5.00, 'at k=2 the denoiser is worse than the noise it started from');
  const best = TABLE.map(([k]) => k).reduce((a, b) => (got[b] > got[a] ? b : a));
  assert.equal(best, 40, 'the curve peaks at k=40');

  // At full rank nothing is discarded, so the reconstruction is the input --
  // which needs no factorisation at all, only the inverse transform.
  const full = core.istft(s.Z, s.F, s.T, 1024, 512, 'hann', clean.length);
  assert.equal(core.snrDb(clean, full).toFixed(2), '5.00',
    'at full rank the SNR returns to exactly the noisy input');

  // The handbook's last row says 100% retained at rank 465. That row is the
  // no-truncation case, which is the line above: it needs no factorisation,
  // and this sketch does not reach it -- 240 components is 98.9% of the
  // energy, not 100%. Pinned here so that the gap is a stated number rather
  // than something a later reader has to rediscover, and so that a rank the
  // sketch never computed is refused rather than silently answered for 240.
  const top = 100 * core.retained(sigma, sigma.length, total);
  assert.ok(Math.abs(top - 98.9) < 0.2, `the 240-column sketch retains ${top.toFixed(1)}%`);
  assert.throws(() => core.retained(sigma, 465, total), /outside the 240 components/);
  assert.throws(() => core.projectRank(s.Z, U, s.F, s.T, l, 465), /outside the 240 components/);
});

// The opening scenes: fewer measurements a second, each rounded to one of
// 2^bits levels. What they print is what these pin.
test('decimation keeps every k-th sample and the hold puts the staircase back', () => {
  const x = Float64Array.from({length: 23}, (_, i) => Math.sin(i * 0.4));
  assert.equal(maxAbs(core.hold(core.decimate(x, 1), 1, x.length), x), 0);
  const y = core.decimate(x, 4);
  assert.equal(y.length, 6);                         // ceil(23 / 4)
  assert.deepEqual(Array.from(y), [x[0], x[4], x[8], x[12], x[16], x[20]]);
  const h = core.hold(y, 4, x.length);
  assert.equal(h.length, x.length);
  for (let i = 0; i < x.length; i++) assert.equal(h[i], x[4 * Math.floor(i / 4)]);
  assert.throws(() => core.decimate(x, 0), /whole number/);
  assert.throws(() => core.hold(y, 2.5), /whole number/);
});

test('the far-view curve passes through every sample and halves the gaps', () => {
  const x = Float64Array.from([0, 1, -1, 0.5]);
  const u = core.upsample(x, 4);
  assert.equal(u.length, 13);                        // (4 - 1) * 4 + 1
  for (let i = 0; i < x.length; i++) assert.equal(u[i * 4], x[i]);
  assert.equal(u[2], 0.5);                           // halfway from 0 to 1
  assert.equal(u[6], 0);                             // halfway from 1 to -1
  assert.equal(core.upsample(new Float64Array(0), 3).length, 0);
  assert.equal(core.upsample(Float64Array.from([7]), 3)[0], 7);
});

test('quantisation is mid-tread, clamped, and exact at the bits the WAV stores', () => {
  const x = Float64Array.from([0, 0.5, -0.5, 0.26, 0.24, 1, -1, 1.5, -1.5]);
  const q4 = core.quantize(x, 4);
  assert.equal(q4.levels, 16);
  assert.equal(q4.step, 1 / 8);
  // 0.26 * 8 = 2.08 -> 2 -> 0.25; 0.24 * 8 = 1.92 -> 2 -> 0.25.
  assert.equal(q4.q[3], 0.25);
  assert.equal(q4.q[4], 0.25);
  // +1 has no code at 4 bits: the range is -8 .. 7, so it clamps to 7/8.
  assert.equal(q4.codes[5], 7);
  assert.equal(q4.q[5], 0.875);
  assert.equal(q4.codes[6], -8);
  assert.equal(q4.codes[7], 7, 'out of range clamps rather than wrapping');
  assert.equal(q4.codes[8], -8);
  assert.ok(q4.maxErr >= 0.5 && q4.maxErr <= 0.625, `max error ${q4.maxErr}`);
  assert.throws(() => core.quantize(x, 0), /1 to 24/);
  assert.throws(() => core.quantize(x, 3.5), /1 to 24/);

  // The recording was 16-bit integers all along: at 16 bits the rounding
  // changes nothing, and at 4 bits it changes almost everything.
  const wav = core.decodeWav(fs.readFileSync(WAV));
  const q16 = core.quantize(wav.samples, 16);
  assert.equal(maxAbs(q16.q, wav.samples), 0, 'quantize(x, 16) is the identity on a 16-bit WAV');
  assert.equal(q16.maxErr, 0);
  assert.ok(maxAbs(core.quantize(wav.samples, 4).q, wav.samples) > 0.01);

  // Fewer bits, lower signal-to-noise ratio, monotonically -- roughly 6 dB a
  // bit, which is the textbook's number and the readout's claim.
  let prev = -Infinity;
  for (const bits of [2, 4, 6, 8, 12]) {
    const snr = core.snrDb(wav.samples, core.quantize(wav.samples, bits).q);
    assert.ok(snr > prev, `${bits} bits: ${snr} should exceed ${prev}`);
    prev = snr;
  }
  assert.equal(core.snrDb(wav.samples, q16.q), Infinity, 'no error means an infinite ratio');
});

test('one frame is N samples from i0, zero past the ends, times the window', () => {
  const x = Float64Array.from({length: 20}, (_, i) => i + 1);
  const r = core.frame(x, 16, 8, 'rect');
  assert.deepEqual(Array.from(r.raw), [17, 18, 19, 20, 0, 0, 0, 0]);
  assert.deepEqual(Array.from(r.tapered), Array.from(r.raw), 'rectangular changes nothing');
  const h = core.frame(x, -2, 8, 'hann');
  assert.deepEqual(Array.from(h.raw), [0, 0, 1, 2, 3, 4, 5, 6]);
  assert.equal(h.w[0], 0, 'Hann starts at zero');
  assert.equal(h.tapered[0], 0);
  assert.ok(Math.abs(h.tapered[4] - 3 * h.w[4]) < 1e-12);
});

test('the spectrum of a bin-aligned tone peaks at that bin and mirrors above N/2', () => {
  const N = 64, rate = 6400, bin = 5;
  const t = core.tone(N, rate, bin * rate / N, 0.5);
  assert.equal(t.length, N);
  assert.equal(t[0], 0);
  const sp = core.spectrum(t);
  let peak = 0;
  for (let f = 1; f <= N / 2; f++) if (sp.mag[f] > sp.mag[peak]) peak = f;
  assert.equal(peak, bin);
  assert.ok(Math.abs(sp.mag[N - bin] - sp.mag[bin]) < 1e-9, 'the mirror half repeats the first');
  assert.ok(sp.mag[bin] > 100 * sp.mag[bin + 2], 'a bin-aligned tone does not leak');
  assert.throws(() => core.spectrum(new Float64Array(100)), /power of two/);
});

test('the k strongest sinusoids rebuild the frame; all of them rebuild it exactly', () => {
  const N = 256, rate = 25600;
  // Two bin-aligned sines, so each lives in exactly one bin.
  const x = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    x[i] = 0.4 * Math.sin(2 * Math.PI * 7 * i / N) + 0.2 * Math.sin(2 * Math.PI * 30 * i / N + 0.3);
  }
  const sp = core.spectrum(x);
  // With a third component that is not bin-aligned, and so leaks into every
  // bin, keeping every bin is still the identity.
  const leaky = Float64Array.from(x, (v, i) => v + 0.05 * Math.cos(i * 0.9));
  const all = core.synthTopK(core.spectrum(leaky), N / 2 + 1);
  assert.ok(maxAbs(all.samples, leaky) < 1e-9, 'every bin kept is the identity');
  const one = core.synthTopK(sp, 1);
  assert.equal(one.bins[0], 7, 'the strongest component is the 7-cycle sine');
  const want = Float64Array.from({length: N}, (_, i) => 0.4 * Math.sin(2 * Math.PI * 7 * i / N));
  assert.ok(maxAbs(one.samples, want) < 1e-9, 'one bin back is that sine alone');
  assert.equal(core.synthTopK(sp, 2).bins[1], 30);
  assert.equal(core.synthTopK(sp, 0).bins.length, 0);
  assert.equal(rate, 25600);
});

test('a frame on repeat tiles to the length asked for', () => {
  const seg = Float64Array.from([1, 2, 3]);
  assert.deepEqual(Array.from(core.loop(seg, 8)), [1, 2, 3, 1, 2, 3, 1, 2]);
  assert.throws(() => core.loop(new Float64Array(0), 4), /empty/);
});

test('the built-in tone is not 16-bit integers, so rounding it moves something', () => {
  const t = core.tone(48000, 48000, 440);
  let peak = 0;
  for (let i = 0; i < t.length; i++) peak = Math.max(peak, Math.abs(t[i]));
  assert.ok(peak <= 0.5 && peak > 0.499);
  assert.ok(core.quantize(t, 16).maxErr > 0);
});

test('the shape formula agrees with the transform it describes', () => {
  for (const [L, N, hop] of [[20000, 1024, 512], [237568, 1024, 512], [237568, 1024, 464], [4096, 256, 64]]) {
    const st = core.stft(new Float64Array(L), N, hop, 'hann');
    const sh = core.stftShape(L, N, hop);
    assert.equal(sh.F, st.F);
    assert.equal(sh.T, st.T, `L=${L} N=${N} hop=${hop}`);
    assert.equal(sh.padded, L + N);
  }
  assert.equal(core.stftShape(237568, 1024, 512).T, 465, 'the handbook\'s 465 columns');
  assert.equal(core.stftShape(237568, 1024, 464).T, 513, 'the square matrix');
});
