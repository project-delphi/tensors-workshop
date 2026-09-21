// The arithmetic under the voice tensor stage: the short-time Fourier
// transform, its inverse, the truncated SVD that Appendix E denoises with, and
// the NMF that section 09 factors with. It is kept apart from
// voice-stage.html so `npm test` can pin it without a browser
// (tests/audio_core.test.cjs), for the reason tensor-core.js is: this is the
// lesson the widget exists to show. Nothing here touches the DOM, the
// AudioContext or the widget's state -- signals go in, signals come out.
//
// Every number the stage puts on screen is computed here from the recording it
// is showing. Appendix E's table is not stored anywhere in this repo's
// JavaScript; tests/audio_core.test.cjs recomputes it from the same voice.wav
// the notebook verifies, and fails if the two ever stop agreeing.
//
// A plain script, not a module: the widget loads it with a <script src> so it
// works from file:// and inside the homepage's embed, and Node picks it up
// through module.exports. That is also why there is no Web Worker anywhere in
// this file -- a worker cannot be constructed from file://, so the long
// factorisation is written as a resumable step instead (see `sketchStep`).
(function (root) {
  "use strict";

  // ---------------------------------------------------------------- complex
  // Complex matrices are two flat Float64Arrays in row-major order, never an
  // array of {re, im} objects: the factorisation moves ~50 million of these
  // and one object per element is what makes that take ten seconds instead of
  // one.

  const cplx = (n) => ({re: new Float64Array(n), im: new Float64Array(n)});

  // C = A B, with A m*n and B n*p. `into`, `i0` and `i1` let a caller fill one
  // band of rows at a time and come back for the rest on the next frame; the
  // stage uses that to keep the page alive during the factorisation, since a
  // Web Worker is not available from file://.
  function cmatmul(A, B, m, n, p, into, i0, i1) {
    const C = into || cplx(m * p);
    const lo = i0 === undefined ? 0 : i0, hi = i1 === undefined ? m : i1;
    for (let i = lo; i < hi; i++) {
      const ib = i * p;
      for (let k = 0; k < n; k++) {
        const ar = A.re[i * n + k], ai = A.im[i * n + k];
        if (ar === 0 && ai === 0) continue;
        const kb = k * p;
        for (let j = 0; j < p; j++) {
          const br = B.re[kb + j], bi = B.im[kb + j];
          C.re[ib + j] += ar * br - ai * bi;
          C.im[ib + j] += ar * bi + ai * br;
        }
      }
    }
    return C;
  }

  // C = A* B, with A m*n (so A* is n*m) and B m*p. Kept separate from
  // cmatmul so nothing has to materialise a conjugate transpose.
  function cmatmulH(A, B, m, n, p, into, k0, k1) {
    const C = into || cplx(n * p);
    const lo = k0 === undefined ? 0 : k0, hi = k1 === undefined ? m : k1;
    for (let k = lo; k < hi; k++) {
      const kb = k * p;
      for (let i = 0; i < n; i++) {
        const ar = A.re[k * n + i], ai = -A.im[k * n + i];
        if (ar === 0 && ai === 0) continue;
        const ib = i * p;
        for (let j = 0; j < p; j++) {
          const br = B.re[kb + j], bi = B.im[kb + j];
          C.re[ib + j] += ar * br - ai * bi;
          C.im[ib + j] += ar * bi + ai * br;
        }
      }
    }
    return C;
  }

  const frobSq = (Z) => {
    let s = 0;
    for (let i = 0; i < Z.re.length; i++) s += Z.re[i] * Z.re[i] + Z.im[i] * Z.im[i];
    return s;
  };

  // Runs a step generator to completion. Every long piece of arithmetic here
  // is written once, as a generator that yields between bands of work; this is
  // what the Node tests and any caller that does not care about frames use,
  // so there is never a chunked implementation and a separate fast one that
  // could drift apart.
  function drain(it) {
    let r = it.next();
    while (!r.done) r = it.next();
    return r.value;
  }

  // Modified Gram-Schmidt with one reorthogonalisation pass. Classical MGS
  // loses orthogonality on these matrices after four power iterations, and a
  // Q that is not orthonormal quietly moves every singular value.
  function* qrComplexSteps(A, m, n) {
    const Q = {re: Float64Array.from(A.re), im: Float64Array.from(A.im)};
    for (let j = 0; j < n; j++) {
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < j; i++) {
          let dr = 0, di = 0;
          for (let r = 0; r < m; r++) {
            const qr = Q.re[r * n + i], qi = Q.im[r * n + i];
            const ar = Q.re[r * n + j], ai = Q.im[r * n + j];
            dr += qr * ar + qi * ai;
            di += qr * ai - qi * ar;
          }
          for (let r = 0; r < m; r++) {
            const qr = Q.re[r * n + i], qi = Q.im[r * n + i];
            Q.re[r * n + j] -= dr * qr - di * qi;
            Q.im[r * n + j] -= dr * qi + di * qr;
          }
        }
      }
      let nrm = 0;
      for (let r = 0; r < m; r++) {
        nrm += Q.re[r * n + j] * Q.re[r * n + j] + Q.im[r * n + j] * Q.im[r * n + j];
      }
      nrm = Math.sqrt(nrm);
      const inv = nrm > 1e-300 ? 1 / nrm : 0;
      for (let r = 0; r < m; r++) { Q.re[r * n + j] *= inv; Q.im[r * n + j] *= inv; }
      if ((j & 15) === 15) yield {phase: "qr", step: j + 1, total: n};
    }
    return Q;
  }
  const qrComplex = (A, m, n) => drain(qrComplexSteps(A, m, n));

  // Eigenvalues and eigenvectors of a Hermitian n*n matrix, by cyclic Jacobi,
  // returned in descending eigenvalue order. The stage needs this only at
  // n = SKETCH (240), on the Gram matrix of the sketch -- never on the
  // spectrogram itself, which is why a Jacobi sweep is affordable here.
  function* hermitianEigSteps(G, n, sweeps) {
    const a = {re: Float64Array.from(G.re), im: Float64Array.from(G.im)};
    const V = cplx(n * n);
    for (let i = 0; i < n; i++) V.re[i * n + i] = 1;
    const maxSweeps = sweeps === undefined ? 30 : sweeps;
    // The stopping test is relative to the matrix's own scale. An absolute
    // threshold looks strict and is not: this Gram matrix carries the
    // spectrogram's energy, which is far below 1, so a fixed 1e-14 kept
    // sweeping long after the off-diagonal had stopped moving.
    let scale = 0;
    for (let i = 0; i < n; i++) scale += a.re[i * n + i] * a.re[i * n + i];
    const tol = Math.sqrt(scale) * 1e-13 + 1e-300;

    let converged = false;
    for (let sweep = 0; sweep < maxSweeps; sweep++) {
      let off = 0;
      for (let p = 0; p < n; p++) {
        for (let q = p + 1; q < n; q++) {
          off += a.re[p * n + q] * a.re[p * n + q] + a.im[p * n + q] * a.im[p * n + q];
        }
      }
      if (Math.sqrt(off) < tol) { converged = true; break; }

      for (let p = 0; p < n; p++) {
        // A whole sweep of a 240x240 matrix is about seventy milliseconds,
        // which is a visible hitch on its own; yielding inside the sweep keeps
        // every band near the rest.
        if (p > 0 && (p & 31) === 0) yield {phase: "eig", step: sweep + 1, total: maxSweeps};
        for (let q = p + 1; q < n; q++) {
          const apqr = a.re[p * n + q], apqi = a.im[p * n + q];
          const mag = Math.hypot(apqr, apqi);
          if (mag < 1e-300) continue;
          // Rotate the off-diagonal onto the real axis, then use the real
          // symmetric Jacobi angle.
          const cr = apqr / mag, ci = apqi / mag;
          const app = a.re[p * n + p], aqq = a.re[q * n + q];
          const theta = (aqq - app) / (2 * mag);
          const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          const c = 1 / Math.sqrt(t * t + 1), s = t * c;

          for (let k = 0; k < n; k++) {
            const akpr = a.re[k * n + p], akpi = a.im[k * n + p];
            const akqr = a.re[k * n + q], akqi = a.im[k * n + q];
            // (s * conj(phase)) applied to column q before mixing
            const qr = akqr * cr + akqi * ci, qi = akqi * cr - akqr * ci;
            a.re[k * n + p] = c * akpr - s * qr;
            a.im[k * n + p] = c * akpi - s * qi;
            const nr = s * akpr + c * qr, ni = s * akpi + c * qi;
            a.re[k * n + q] = nr * cr - ni * ci;
            a.im[k * n + q] = ni * cr + nr * ci;
          }
          for (let k = 0; k < n; k++) {
            const apkr = a.re[p * n + k], apki = a.im[p * n + k];
            const aqkr = a.re[q * n + k], aqki = a.im[q * n + k];
            const qr = aqkr * cr - aqki * ci, qi = aqki * cr + aqkr * ci;
            a.re[p * n + k] = c * apkr - s * qr;
            a.im[p * n + k] = c * apki - s * qi;
            const nr = s * apkr + c * qr, ni = s * apki + c * qi;
            a.re[q * n + k] = nr * cr + ni * ci;
            a.im[q * n + k] = ni * cr - nr * ci;
          }
          for (let k = 0; k < n; k++) {
            const vkpr = V.re[k * n + p], vkpi = V.im[k * n + p];
            const vkqr = V.re[k * n + q], vkqi = V.im[k * n + q];
            const qr = vkqr * cr + vkqi * ci, qi = vkqi * cr - vkqr * ci;
            V.re[k * n + p] = c * vkpr - s * qr;
            V.im[k * n + p] = c * vkpi - s * qi;
            const nr = s * vkpr + c * qr, ni = s * vkpi + c * qi;
            V.re[k * n + q] = nr * cr - ni * ci;
            V.im[k * n + q] = ni * cr + nr * ci;
          }
        }
      }
      yield {phase: "eig", step: sweep + 1, total: maxSweeps};
    }

    const lam = new Float64Array(n);
    for (let i = 0; i < n; i++) lam[i] = a.re[i * n + i];
    const order = Array.from({length: n}, (_, i) => i).sort((x, y) => lam[y] - lam[x]);
    const vals = new Float64Array(n), vecs = cplx(n * n);
    for (let j = 0; j < n; j++) {
      vals[j] = lam[order[j]];
      for (let i = 0; i < n; i++) {
        vecs.re[i * n + j] = V.re[i * n + order[j]];
        vecs.im[i * n + j] = V.im[i * n + order[j]];
      }
    }
    // Cyclic Jacobi settles in well under thirty sweeps at this size, so a
    // false here is a matrix that was never diagonalised and eigenvalues that
    // are not eigenvalues -- worth a caller being able to ask.
    return {values: vals, vectors: vecs, converged};
  }
  const hermitianEig = (G, n, sweeps) => drain(hermitianEigSteps(G, n, sweeps));

  // -------------------------------------------------------------------- fft
  // Iterative radix-2 Cooley-Tukey, in place. N must be a power of two; the
  // stage's window sizes are all powers of two, and stft() checks.

  function fft(re, im, inverse) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const half = len >> 1;
      const ang = (inverse ? 2 : -2) * Math.PI / len;
      const wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < half; k++) {
          const ur = re[i + k], ui = im[i + k];
          const vr = re[i + k + half] * cr - im[i + k + half] * ci;
          const vi = re[i + k + half] * ci + im[i + k + half] * cr;
          re[i + k] = ur + vr; im[i + k] = ui + vi;
          re[i + k + half] = ur - vr; im[i + k + half] = ui - vi;
          const nr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
    if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
    return {re, im};
  }

  // ---------------------------------------------------------------- windows
  // Periodic, not symmetric: the denominator is N, which is what makes Hann at
  // 50% overlap sum to a constant and the inverse transform exact. scipy's
  // stft uses the periodic form for the same reason.

  // No prototype: a window name arriving from a control or a URL must not be
  // able to resolve `constructor` or `toString` into something callable, which
  // returned a boxed Number and filled the spectrogram with NaN.
  const WINDOWS = Object.assign(Object.create(null), {
    hann: (N) => {
      const w = new Float64Array(N);
      for (let i = 0; i < N; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
      return w;
    },
    hamming: (N) => {
      const w = new Float64Array(N);
      for (let i = 0; i < N; i++) w[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / N);
      return w;
    },
    rect: (N) => new Float64Array(N).fill(1)
  });
  const windowOf = (kind, N) => (WINDOWS[kind] || WINDOWS.hann)(N);

  // ------------------------------------------------------------------- stft
  // One-sided, F = N/2 + 1 rows, T columns, returned as one flat complex
  // matrix in row-major order so the factorisation can multiply it directly.
  //
  // The signal is padded with N/2 zeros at each end before framing. That is
  // scipy's boundary='zeros', and it is what makes 4.949 s at 48 kHz come out
  // as the (513, 465) of Appendix E rather than (513, 464): without it the
  // first and last half-windows have no second copy to overlap with, and the
  // inverse cannot recover them.

  function stft(x, N, hop, kind) {
    if ((N & (N - 1)) !== 0 || N < 2) throw new Error("stft: N must be a power of two");
    const w = windowOf(kind, N);
    const pad = N >> 1;
    const padded = new Float64Array(x.length + 2 * pad);
    padded.set(x, pad);
    const F = (N >> 1) + 1;
    const T = Math.floor((padded.length - N) / hop) + 1;
    const Z = cplx(F * T);
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let t = 0; t < T; t++) {
      const off = t * hop;
      for (let i = 0; i < N; i++) { re[i] = padded[off + i] * w[i]; im[i] = 0; }
      fft(re, im, false);
      for (let f = 0; f < F; f++) { Z.re[f * T + t] = re[f]; Z.im[f * T + t] = im[f]; }
    }
    return {Z, F, T, N, hop, kind: kind || "hann", length: x.length};
  }

  // Weighted overlap-add, normalised by the summed squared window. The
  // one-sided column is mirrored back to a full spectrum by Hermitian symmetry
  // before the inverse transform, which is what makes the output real.
  function istft(Z, F, T, N, hop, kind, length) {
    const w = windowOf(kind, N);
    const pad = N >> 1;
    const outLen = (T - 1) * hop + N;
    const acc = new Float64Array(outLen), wsum = new Float64Array(outLen);
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let t = 0; t < T; t++) {
      for (let f = 0; f < F; f++) { re[f] = Z.re[f * T + t]; im[f] = Z.im[f * T + t]; }
      for (let f = F; f < N; f++) { re[f] = re[N - f]; im[f] = -im[N - f]; }
      fft(re, im, true);
      const off = t * hop;
      for (let i = 0; i < N; i++) {
        acc[off + i] += re[i] * w[i];
        wsum[off + i] += w[i] * w[i];
      }
    }
    const want = length === undefined ? outLen - 2 * pad : length;
    const out = new Float64Array(want);
    for (let i = 0; i < want; i++) {
      const j = i + pad;
      out[i] = j < outLen && wsum[j] > 1e-12 ? acc[j] / wsum[j] : 0;
    }
    return out;
  }

  // --------------------------------------------------------------- measures
  // Appendix E's formula, unchanged: energy of the reference over energy of
  // the error. Both signals are trimmed to the shorter one, the way the
  // notebook does.
  function snrDb(reference, estimate) {
    const n = Math.min(reference.length, estimate.length);
    let sig = 0, err = 0;
    for (let i = 0; i < n; i++) {
      sig += reference[i] * reference[i];
      const d = estimate[i] - reference[i];
      err += d * d;
    }
    return 10 * Math.log10(sig / err);
  }

  // ------------------------------------------------------------------- rng
  // A seeded generator, so the noise the reader hears is the noise the readout
  // describes and a reload does not quietly move the number. sfc32 with a
  // Box-Muller normal: this is not numpy's PCG64, so the widget's draw is not
  // the notebook's draw. It does not need to be -- across seeds the peak of
  // Appendix E's curve moves by about 0.04 dB, which is why the stage reports
  // that peak to one decimal.

  function rng(seed) {
    let a = 0x9e3779b9, b = seed >>> 0, c = 0x243f6a88, d = 1;
    const step = () => {
      const t = (a + b | 0) + d | 0;
      d = d + 1 | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    };
    for (let i = 0; i < 12; i++) step();
    return step;
  }

  function gaussians(n, seed) {
    const r = rng(seed), out = new Float64Array(n);
    for (let i = 0; i < n; i += 2) {
      let u = r(); if (u < 1e-300) u = 1e-300;
      const mag = Math.sqrt(-2 * Math.log(u)), ang = 2 * Math.PI * r();
      out[i] = mag * Math.cos(ang);
      if (i + 1 < n) out[i + 1] = mag * Math.sin(ang);
    }
    return out;
  }

  // Gaussian noise scaled so the mixture sits at exactly `targetDb`. The
  // scaling is the check: measure the SNR afterwards and it comes back at the
  // target, which is TODO 2 of Appendix E.
  function noiseAtSnr(clean, targetDb, seed) {
    const noise = gaussians(clean.length, seed === undefined ? 42 : seed);
    let sig = 0, nz = 0;
    for (let i = 0; i < clean.length; i++) { sig += clean[i] * clean[i]; nz += noise[i] * noise[i]; }
    // Signal-to-noise ratio is undefined against silence, and scaling by zero
    // would hand back a clip with no noise in it and a NaN on the readout.
    if (!(sig > 0)) throw new Error("noiseAtSnr: the reference signal carries no energy");
    const scale = Math.sqrt(sig / (nz * Math.pow(10, targetDb / 10)));
    for (let i = 0; i < noise.length; i++) noise[i] *= scale;
    return noise;
  }

  // ------------------------------------------------------- the top subspace
  // A randomised range finder, then the eigendecomposition of the sketch's
  // Gram matrix. Two things make this the affordable route:
  //
  //   Z_k = U_k (U_k* Z).  The rank-k truncation is the projection onto the
  //   top-k left singular subspace, so V is never needed and never formed.
  //
  //   One sketch serves every k.  The slider truncates a factorisation that
  //   was computed once, so moving it costs two products, not a new SVD.
  //
  // SKETCH is the width of the sketch and POWER the number of power
  // iterations. What matters is that SKETCH is a fixed width comfortably above
  // the largest k on the ladder, not that it tracks k: a sketch of k + 10
  // columns leaves the k = 40 rung 0.16 dB low, which would print 8.92 where
  // the notebook prints 9.08, while a fixed 240 agrees with a dense SVD to
  // four decimals at every rung from 2 to 160. Given that width, two power
  // iterations already converge, and more only cost time.
  const SKETCH = 240;
  const POWER = 2;

  // About four million complex multiply-adds per band, which lands each band
  // near eight milliseconds -- small enough that the stage can run one per
  // frame and still draw.
  const BAND_OPS = 4e6;

  function* mulSteps(A, B, m, n, p, label) {
    const C = cplx(m * p);
    const band = Math.max(1, Math.round(BAND_OPS / (n * p)));
    for (let i = 0; i < m; i += band) {
      const hi = Math.min(i + band, m);
      cmatmul(A, B, m, n, p, C, i, hi);
      yield {phase: label, step: hi, total: m};
    }
    return C;
  }

  function* mulHSteps(A, B, m, n, p, label) {
    const C = cplx(n * p);
    const band = Math.max(1, Math.round(BAND_OPS / (n * p)));
    for (let k = 0; k < m; k += band) {
      const hi = Math.min(k + band, m);
      cmatmulH(A, B, m, n, p, C, k, hi);
      yield {phase: label, step: hi, total: m};
    }
    return C;
  }

  function* leftSubspaceSteps(Z, F, T, opts) {
    const o = opts || {};
    const l = Math.min(o.sketch || SKETCH, T);
    const q = o.power === undefined ? POWER : o.power;
    const seed = o.seed === undefined ? 1 : o.seed;

    const g = gaussians(2 * T * l, seed);
    const O = cplx(T * l);
    for (let i = 0; i < T * l; i++) { O.re[i] = g[2 * i]; O.im[i] = g[2 * i + 1]; }

    let Y = yield* mulSteps(Z, O, F, T, l, "range");
    for (let i = 0; i < q; i++) {
      const Qi = yield* qrComplexSteps(Y, F, l);
      const W = yield* mulHSteps(Z, Qi, F, T, l, "power");
      Y = yield* mulSteps(Z, W, F, T, l, "power");
    }
    const Q = yield* qrComplexSteps(Y, F, l);
    const B = yield* mulHSteps(Q, Z, F, l, T, "project");

    const G = cplx(l * l);                  // B B*, Hermitian
    const gband = Math.max(1, Math.round(BAND_OPS / (l * T)));
    for (let i0 = 0; i0 < l; i0 += gband) {
      const hi = Math.min(i0 + gband, l);
      for (let i = i0; i < hi; i++) {
        for (let j = i; j < l; j++) {
          let sr = 0, si = 0;
          for (let t = 0; t < T; t++) {
            const ar = B.re[i * T + t], ai = B.im[i * T + t];
            const br = B.re[j * T + t], bi = -B.im[j * T + t];
            sr += ar * br - ai * bi;
            si += ar * bi + ai * br;
          }
          G.re[i * l + j] = sr; G.im[i * l + j] = si;
          G.re[j * l + i] = sr; G.im[j * l + i] = -si;
        }
      }
      yield {phase: "gram", step: hi, total: l};
    }

    const eig = yield* hermitianEigSteps(G, l);
    if (!eig.converged) {
      throw new Error("leftSubspace: the sketch's Gram matrix did not diagonalise");
    }
    const U = yield* mulSteps(Q, eig.vectors, F, l, l, "rotate");
    const sigma = new Float64Array(l);
    for (let i = 0; i < l; i++) sigma[i] = Math.sqrt(Math.max(eig.values[i], 0));
    return {U, sigma, F, l};
  }
  const leftSubspace = (Z, F, T, opts) => drain(leftSubspaceSteps(Z, F, T, opts));

  // Z_k, as the projection of Z onto the first k columns of U.
  //
  // Only the first `l` components exist: the sketch is 240 columns wide and
  // the spectrogram's full rank is 465, so there is no rank-400 answer to give
  // here. Asking for one used to read past U and fill the result with NaN,
  // which the inverse transform turns into silence rather than an error. It
  // throws now. A caller that wants the no-truncation case does not want this
  // function at all -- nothing is discarded there, so it inverts Z itself.
  function projectRank(Z, U, F, T, l, k) {
    if (!(k >= 1 && k <= l)) {
      throw new Error(`projectRank: rank ${k} outside the ${l} components computed`);
    }
    const Uk = cplx(F * k);
    for (let r = 0; r < F; r++) {
      for (let c = 0; c < k; c++) {
        Uk.re[r * k + c] = U.re[r * l + c];
        Uk.im[r * k + c] = U.im[r * l + c];
      }
    }
    const C = cmatmulH(Uk, Z, F, k, T);     // k*T
    return cmatmul(Uk, C, F, k, T);         // F*T
  }

  // Share of the spectrogram's energy the first k components keep. The
  // denominator is the Frobenius norm rather than the sum of every squared
  // singular value, because the two are equal and only the first k are known.
  const retained = (sigma, k, total) => {
    // Refused rather than clamped, for the reason projectRank refuses: a
    // readout saying "98.9% retained" beside a rank the factorisation never
    // reached is a confident wrong answer, and this widget's whole claim is
    // that every number on screen was computed from what is on screen.
    if (!(k >= 0 && k <= sigma.length)) {
      throw new Error(`retained: rank ${k} outside the ${sigma.length} components computed`);
    }
    let s = 0;
    for (let i = 0; i < k; i++) s += sigma[i] * sigma[i];
    return s / total;
  };

  // -------------------------------------------------------------- layouts
  // Reorderings of a spectrogram, for the scene that plays one. Both are
  // permutations: every number that went in comes out, exactly once. That is
  // the claim the stage puts on screen next to the picture -- "the same
  // 263,169 numbers, in a different order" -- so it is pinned by a test
  // rather than left to the eye, which cannot count.

  function transposeC(Z, F, T) {
    const out = cplx(F * T);
    for (let f = 0; f < F; f++) {
      for (let t = 0; t < T; t++) {
        out.re[t * F + f] = Z.re[f * T + t];
        out.im[t * F + f] = Z.im[f * T + t];
      }
    }
    return out;
  }

  // Cut into `patch` by `patch` blocks and transpose the grid of blocks,
  // leaving what is inside each block alone -- what a patchifier does when its
  // two axes are read in the wrong order.
  //
  // Transposing a grid needs a square grid, so this needs a square matrix, and
  // the patch size must divide it. Neither condition is decoration: a size
  // that left a margin would never copy it, and a matrix taller than it is
  // wide sends half its blocks past the end of the destination, where a typed
  // array drops them without a word. Either way the result is a matrix with
  // holes in it while the readout still claims every number is present, which
  // is the one thing this function exists to guarantee.
  function patchShuffle(Z, F, T, patch) {
    if (F !== T) {
      throw new Error(`patchShuffle: needs a square matrix, got ${F} by ${T}`);
    }
    if (F % patch !== 0) {
      throw new Error(`patchShuffle: ${patch} does not divide ${F} by ${T}`);
    }
    const out = cplx(F * T);
    const rows = F / patch, colsP = T / patch;
    for (let pi = 0; pi < rows; pi++) {
      for (let pj = 0; pj < colsP; pj++) {
        for (let i = 0; i < patch; i++) {
          for (let j = 0; j < patch; j++) {
            const sf = pi * patch + i, st = pj * patch + j;
            const df = pj * patch + i, dt = pi * patch + j;
            out.re[df * T + dt] = Z.re[sf * T + st];
            out.im[df * T + dt] = Z.im[sf * T + st];
          }
        }
      }
    }
    return out;
  }

  // ------------------------------------------------------------------- nmf
  // Multiplicative updates on the magnitude spectrogram, which is non-negative
  // by construction. Lee and Seung's rule, minimising the same Frobenius norm
  // the SVD does but under W, H >= 0 -- the constraint that must cost error
  // and is chosen anyway, because the components come out as parts you can
  // name. Returned as a resumable state so the stage can draw the factors
  // converging instead of blocking on them.

  function magnitude(Z, F, T) {
    const V = new Float64Array(F * T);
    for (let i = 0; i < F * T; i++) V[i] = Math.hypot(Z.re[i], Z.im[i]);
    return V;
  }

  function nmfInit(V, F, T, k, seed) {
    const r = rng(seed === undefined ? 7 : seed);
    let mean = 0;
    for (let i = 0; i < V.length; i++) mean += V[i];
    mean = Math.sqrt((mean / V.length) / k) + 1e-12;
    const W = new Float64Array(F * k), H = new Float64Array(k * T);
    for (let i = 0; i < W.length; i++) W[i] = mean * (r() + 0.1);
    for (let i = 0; i < H.length; i++) H[i] = mean * (r() + 0.1);
    return {W, H, F, T, k, iter: 0};
  }

  function nmfStep(V, s, iters) {
    const W = s.W, H = s.H, F = s.F, T = s.T, k = s.k;
    const n = iters === undefined ? 1 : iters;
    const EPS = 1e-10;
    const WH = new Float64Array(F * T);
    const num = new Float64Array(k * T), den = new Float64Array(k * T);
    const numW = new Float64Array(F * k), denW = new Float64Array(F * k);

    const recon = () => {
      WH.fill(0);
      for (let i = 0; i < F; i++) {
        for (let c = 0; c < k; c++) {
          const w = W[i * k + c];
          if (w === 0) continue;
          for (let j = 0; j < T; j++) WH[i * T + j] += w * H[c * T + j];
        }
      }
    };

    for (let it = 0; it < n; it++) {
      recon();
      num.fill(0); den.fill(0);
      for (let i = 0; i < F; i++) {
        for (let c = 0; c < k; c++) {
          const w = W[i * k + c];
          if (w === 0) continue;
          for (let j = 0; j < T; j++) {
            num[c * T + j] += w * V[i * T + j];
            den[c * T + j] += w * WH[i * T + j];
          }
        }
      }
      for (let i = 0; i < H.length; i++) H[i] *= num[i] / (den[i] + EPS);

      recon();
      for (let i = 0; i < F; i++) {
        for (let c = 0; c < k; c++) {
          let a = 0, b = 0;
          for (let j = 0; j < T; j++) {
            const h = H[c * T + j];
            a += V[i * T + j] * h;
            b += WH[i * T + j] * h;
          }
          numW[i * k + c] = a; denW[i * k + c] = b;
        }
      }
      for (let i = 0; i < W.length; i++) W[i] *= numW[i] / (denW[i] + EPS);
      s.iter++;
    }
    return s;
  }

  function nmfError(V, s) {
    const W = s.W, H = s.H, F = s.F, T = s.T, k = s.k;
    let err = 0;
    for (let i = 0; i < F; i++) {
      for (let j = 0; j < T; j++) {
        let v = 0;
        for (let c = 0; c < k; c++) v += W[i * k + c] * H[c * T + j];
        const d = V[i * T + j] - v;
        err += d * d;
      }
    }
    return Math.sqrt(err);
  }

  // ------------------------------------------------- sampling and rounding
  // The three operations the stage's opening scenes draw: fewer measurements
  // a second, each measurement rounded to one of 2^bits levels, and the
  // interpolation the far view of the waveform is drawn through. Every number
  // those scenes print -- the count in a millisecond, the step between
  // levels, the signal-to-noise ratio the rounding costs -- comes from here.

  // Every k-th sample: the signal measured at rate / k. No anti-alias filter,
  // on purpose. What a lower rate throws away is the lesson, and a filter
  // would hide the half of it you can hear.
  function decimate(x, k) {
    if (!(k >= 1) || k !== Math.floor(k)) throw new Error("decimate: k must be a whole number >= 1");
    const n = Math.ceil(x.length / k);
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = x[i * k];
    return out;
  }

  // Zero-order hold: each sample repeated k times, back to `length` samples
  // at the original rate. This is what a decimated signal sounds like without
  // a reconstruction filter, and it is the staircase the sampling scene draws
  // in the output colour -- the same k that thinned the beads.
  function hold(y, k, length) {
    if (!(k >= 1) || k !== Math.floor(k)) throw new Error("hold: k must be a whole number >= 1");
    const n = length === undefined ? y.length * k : length;
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = y[Math.min(y.length - 1, Math.floor(i / k))];
    return out;
  }

  // Linear interpolation, k points per original interval, for the far view
  // of the waveform: a curve threaded through the samples so that from a
  // distance it reads as one continuous line. It is drawing, not signal
  // processing -- nothing plays it -- and it is here so the twin canvas and
  // the three.js tube read the same points.
  function upsample(x, k) {
    if (!(k >= 1) || k !== Math.floor(k)) throw new Error("upsample: k must be a whole number >= 1");
    if (x.length === 0) return new Float64Array(0);
    const n = (x.length - 1) * k + 1;
    const out = new Float64Array(n);
    for (let i = 0; i < x.length - 1; i++) {
      const a = x[i], b = x[i + 1];
      for (let j = 0; j < k; j++) out[i * k + j] = a + (b - a) * (j / k);
    }
    out[n - 1] = x[x.length - 1];
    return out;
  }

  // Uniform mid-tread quantisation to `bits` bits: the integer code is the
  // sample scaled by 2^(bits-1) and rounded, clamped to the signed range, and
  // the quantised value is that code scaled back. At 16 bits this is exactly
  // what a 16-bit PCM WAV stores, so quantize(x, 16) on the vendored
  // recordings is the identity -- the test pins that, because it is the
  // whole point of the scene: the recording was integers all along.
  function quantize(x, bits) {
    if (!(bits >= 1 && bits <= 24) || bits !== Math.floor(bits)) {
      throw new Error("quantize: bits must be a whole number from 1 to 24");
    }
    const half = Math.pow(2, bits - 1);
    const lo = -half, hi = half - 1;
    const codes = new Int32Array(x.length);
    const q = new Float64Array(x.length);
    let maxErr = 0;
    for (let i = 0; i < x.length; i++) {
      let c = Math.round(x[i] * half);
      if (c < lo) c = lo; else if (c > hi) c = hi;
      codes[i] = c;
      q[i] = c / half;
      const e = Math.abs(q[i] - x[i]);
      if (e > maxErr) maxErr = e;
    }
    return {q, codes, step: 1 / half, levels: 2 * half, maxErr};
  }

  // ------------------------------------------------------------- one frame
  // The transform scenes, one frame at a time: N samples cut out of the array
  // from i0, the window shape, and their product -- which is the thing the
  // transform is actually given. Past either end of the array the frame is
  // zero, the way stft() pads.
  function frame(x, i0, N, kind) {
    const w = windowOf(kind, N);
    const raw = new Float64Array(N), tapered = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const j = i0 + i;
      raw[i] = j >= 0 && j < x.length ? x[j] : 0;
      tapered[i] = raw[i] * w[i];
    }
    return {raw, w, tapered, i0, N};
  }

  // The transform of one frame, all N bins rather than the one-sided N/2 + 1,
  // so a scene can draw the mirror half that stft() drops: a real frame's
  // spectrum is Hermitian, X[N - f] is the conjugate of X[f], and |X| is the
  // same on both sides. mag is |X[f]|.
  function spectrum(tapered) {
    const N = tapered.length;
    if ((N & (N - 1)) !== 0 || N < 2) throw new Error("spectrum: N must be a power of two");
    const re = Float64Array.from(tapered), im = new Float64Array(N);
    fft(re, im, false);
    const mag = new Float64Array(N);
    for (let f = 0; f < N; f++) mag[f] = Math.hypot(re[f], im[f]);
    return {re, im, mag, N};
  }

  // The frame rebuilt from its k strongest components: rank the one-sided
  // bins by magnitude, keep the top k together with their mirror partners,
  // zero the rest and invert. k >= N/2 + 1 keeps every bin and the frame comes
  // back exactly, which is the claim the spectrum scene lets a reader hear.
  function synthTopK(sp, k) {
    const N = sp.N, F = (N >> 1) + 1;
    const order = Array.from({length: F}, (_, f) => f).sort((a, b) => sp.mag[b] - sp.mag[a]);
    const kept = order.slice(0, Math.max(0, Math.min(k, F)));
    const re = new Float64Array(N), im = new Float64Array(N);
    for (const f of kept) {
      re[f] = sp.re[f]; im[f] = sp.im[f];
      if (f > 0 && f < N - f) { re[N - f] = sp.re[N - f]; im[N - f] = sp.im[N - f]; }
    }
    fft(re, im, true);
    return {samples: re, bins: kept};
  }

  // One frame tiled to `length` samples: what a frame sounds like on repeat.
  // A frame cut with a rectangular window starts and ends mid-swing, so every
  // repeat is a click at rate / N a second; a tapered one does not.
  function loop(seg, length) {
    if (seg.length === 0) throw new Error("loop: empty frame");
    const out = new Float64Array(length);
    for (let i = 0; i < length; i++) out[i] = seg[i % seg.length];
    return out;
  }

  // A pure tone, for the built-in signal that makes every scene legible at a
  // glance: one peak in the spectrum, one line in the spectrogram. Peak
  // amplitude 0.5, starting at zero.
  function tone(n, rate, hz, amp) {
    const a = amp === undefined ? 0.5 : amp;
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = a * Math.sin(2 * Math.PI * hz * i / rate);
    return out;
  }

  // The matrix's shape from the three numbers that decide it, so a readout
  // can say why there are 465 columns without computing the matrix: half a
  // window of padding at each end, then one stop per hop while a whole window
  // still fits. Agrees with stft() by construction, and the test pins it.
  function stftShape(length, N, hop) {
    const padded = length + 2 * (N >> 1);
    return {F: (N >> 1) + 1, T: Math.floor((padded - N) / hop) + 1, padded};
  }

  // ------------------------------------------------------------------- wav
  // Enough of RIFF to read the one recording this stage ships, and to fail
  // loudly on anything else rather than play noise. The browser could use
  // decodeAudioData instead; this is here so `npm test` reads the same bytes
  // the page does, without an AudioContext.
  function decodeWav(bytes) {
    const v = new DataView(bytes.buffer || bytes, bytes.byteOffset || 0, bytes.byteLength);
    const tag = (o) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
    if (tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("decodeWav: not a RIFF/WAVE file");
    let off = 12, fmt = null, data = null;
    while (off + 8 <= v.byteLength) {
      const id = tag(off), size = v.getUint32(off + 4, true);
      if (id === "fmt ") {
        fmt = {format: v.getUint16(off + 8, true), channels: v.getUint16(off + 10, true),
               rate: v.getUint32(off + 12, true), bits: v.getUint16(off + 22, true)};
      } else if (id === "data") {
        data = {off: off + 8, size: size, have: v.byteLength - off - 8};
      }
      off += 8 + size + (size & 1);
    }
    if (!fmt || !data) throw new Error("decodeWav: missing fmt or data chunk");
    if (fmt.format !== 1 || fmt.bits !== 16) throw new Error("decodeWav: expected 16-bit PCM");
    // A streamed WAV writes 0 or 0xFFFFFFFF as its data size, and a truncated
    // download declares more than it carries. Both used to come back as a
    // valid-looking empty or short signal; the header above promises this
    // fails loudly instead.
    if (data.size === 0) throw new Error("decodeWav: data chunk is empty");
    if (data.size > data.have) {
      throw new Error(`decodeWav: data chunk declares ${data.size} bytes, file carries ${data.have}`);
    }
    const frames = Math.floor(data.size / 2 / fmt.channels);
    const out = new Float64Array(frames);
    for (let i = 0; i < frames; i++) {
      let acc = 0;
      for (let c = 0; c < fmt.channels; c++) acc += v.getInt16(data.off + 2 * (i * fmt.channels + c), true);
      out[i] = acc / fmt.channels / 32768;
    }
    return {samples: out, rate: fmt.rate, channels: fmt.channels};
  }

  const AudioCore = {
    cplx, cmatmul, cmatmulH, frobSq, drain,
    qrComplex, qrComplexSteps, hermitianEig, hermitianEigSteps,
    fft, WINDOWS, windowOf, stft, istft,
    snrDb, rng, gaussians, noiseAtSnr,
    SKETCH, POWER, leftSubspace, leftSubspaceSteps, projectRank, retained,
    transposeC, patchShuffle,
    magnitude, nmfInit, nmfStep, nmfError,
    decimate, hold, upsample, quantize,
    frame, spectrum, synthTopK, loop, tone, stftShape,
    decodeWav
  };
  if (typeof module !== "undefined" && module.exports) module.exports = AudioCore;
  else root.AudioCore = AudioCore;
})(typeof window !== "undefined" ? window : globalThis);
