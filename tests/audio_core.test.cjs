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
  assert.equal((100 * core.retained(sigma, sigma.length, total) <= 100.0000001), true);
});
