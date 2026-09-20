// The voice stage's drawing kit and its scene registry. Everything here turns
// numbers that audio-core.js computed into pixels on one 2-D canvas; nothing
// here computes a number a readout quotes. That split is the same one
// linalg-kit.js keeps against linalg-core.js, and for the same reason: the
// arithmetic is the lesson and `npm test` pins it, while the drawing is what
// the browser check and a screenshot catch.
//
// A plain script, not a module, so the page works from file://.
(function (root) {
  "use strict";

  // ------------------------------------------------------------- registry
  // One file per scene, loaded in order by plain <script src> lines. The page
  // reads the registry back in that order, so a new scene is: one file here,
  // one <script src> line, and one repo.widgets line.
  const scenes = [];
  const REQUIRED = ["id", "section", "copy", "init", "draw", "readout"];
  // Every string the frame writes into the page, in both languages. This list
  // used to be just `aria`, and a scene shipped without a Spanish `predict`:
  // the frame assigned undefined to textContent, which writes the word
  // "undefined" where the predict-first question should be. Nothing else
  // noticed -- the browser check does not read the copy, and the teaching
  // checker only pairs markers in .qmd and .md.
  const REQUIRED_COPY = ["tab", "k", "h", "claim", "concept", "b", "predict", "aria"];

  const VoiceScenes = {
    register(scene) {
      for (const k of REQUIRED) {
        if (!(k in scene)) throw new Error("scene " + (scene.id || "?") + " lacks " + k);
      }
      for (const lang of ["en", "es"]) {
        const copy = scene.copy[lang];
        if (!copy) throw new Error("scene " + scene.id + " lacks " + lang + " copy");
        for (const k of REQUIRED_COPY) {
          if (copy[k] === undefined) {
            throw new Error("scene " + scene.id + " lacks " + lang + " copy." + k);
          }
        }
      }
      // Both languages carry the same keys, so a readout or an option label
      // added to one and forgotten in the other fails at boot rather than
      // rendering as a blank or a stray "undefined" for half the readers.
      const en = Object.keys(scene.copy.en).sort().join(",");
      const es = Object.keys(scene.copy.es).sort().join(",");
      if (en !== es) {
        throw new Error("scene " + scene.id + ": en and es copy keys differ");
      }
      scenes.push(scene);
    },
    list() { return scenes.slice(); }
  };

  // --------------------------------------------------------------- colour
  const css = (name) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // The spectrogram ramp: black through deep purple and orange to near-white,
  // the shape of matplotlib's "inferno". It is monotonic in lightness, which
  // is what makes it readable without colour vision and what stops a
  // mid-range band reading as a peak. It starts at the stage's own black so
  // silence is the background rather than a shade close to it.
  const RAMP = [
    [0, 0, 4], [22, 11, 57], [66, 10, 104], [106, 23, 110],
    [147, 38, 103], [188, 55, 84], [221, 81, 58], [243, 120, 25],
    [252, 165, 10], [246, 215, 70], [252, 255, 164]
  ];

  function ramp(t) {
    const u = t <= 0 ? 0 : t >= 1 ? 1 : t;
    const f = u * (RAMP.length - 1);
    const i = Math.min(Math.floor(f), RAMP.length - 2);
    const g = f - i, a = RAMP[i], b = RAMP[i + 1];
    return [a[0] + (b[0] - a[0]) * g, a[1] + (b[1] - a[1]) * g, a[2] + (b[2] - a[2]) * g];
  }

  // ---------------------------------------------------------- spectrogram
  // Built as an ImageData the size of the matrix and then scaled onto the
  // stage, rather than one filled rectangle per cell: a (513, 513) matrix is
  // 263,169 cells, and 263,169 fillRect calls do not hold a frame.
  //
  // `floorDb` is the dynamic range. Voice sits perhaps 60 dB above the noise
  // floor of this recording, and at 80 dB the quiet half of the picture is
  // mush; the value is the scene's to choose and the readout says nothing
  // about it, because it changes the picture and not a number.
  function spectrogramImage(mag, F, T, opts) {
    const o = opts || {};
    const floorDb = o.floorDb === undefined ? -70 : o.floorDb;
    let peak = 0;
    for (let i = 0; i < mag.length; i++) if (mag[i] > peak) peak = mag[i];
    const ref = peak > 0 ? peak : 1;
    const img = new ImageData(T, F);
    const d = img.data;
    for (let f = 0; f < F; f++) {
      // Row 0 of the matrix is 0 Hz; a spectrogram is drawn with 0 Hz at the
      // bottom, so the image is filled upside down rather than flipped later.
      const row = (F - 1 - f) * T * 4;
      for (let t = 0; t < T; t++) {
        const v = mag[f * T + t];
        const db = 20 * Math.log10((v > 0 ? v : 1e-12) / ref);
        const u = db <= floorDb ? 0 : db / -floorDb + 1;
        const c = ramp(u);
        const p = row + t * 4;
        d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 255;
      }
    }
    return img;
  }

  // Draw an ImageData into a rect, scaled. A canvas cannot scale an ImageData
  // directly, so it goes through an offscreen canvas the scene keeps.
  function blit(g, img, cache, x, y, w, h, smooth) {
    const c = cache.canvas || (cache.canvas = document.createElement("canvas"));
    if (c.width !== img.width || c.height !== img.height) {
      c.width = img.width; c.height = img.height;
    }
    (cache.g || (cache.g = c.getContext("2d"))).putImageData(img, 0, 0);
    g.imageSmoothingEnabled = smooth !== false;
    g.drawImage(c, 0, 0, img.width, img.height, x, y, w, h);
  }

  // ------------------------------------------------------------ waveform
  // Min/max per column, so a 237,568-sample signal drawn 800 pixels wide
  // keeps its envelope instead of aliasing into a thin noisy band.
  function waveform(g, x, rect, colour) {
    const {x: rx, y: ry, w, h} = rect;
    const mid = ry + h / 2, half = h / 2;
    let peak = 1e-12;
    for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > peak) peak = a; }
    g.fillStyle = colour;
    const step = x.length / w;
    for (let px = 0; px < w; px++) {
      const a = Math.floor(px * step), b = Math.min(Math.floor((px + 1) * step), x.length);
      let lo = 0, hi = 0;
      for (let i = a; i < b; i++) { const v = x[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
      const top = mid - (hi / peak) * half, bot = mid - (lo / peak) * half;
      g.fillRect(rx + px, top, 1, Math.max(1, bot - top));
    }
  }

  // ---------------------------------------------------------------- text
  // Every label is drawn on the stage's own black chip, opaque, because axe
  // cannot resolve contrast over a canvas and reports "incomplete" otherwise.
  function label(g, text, x, y, colour, opts) {
    const o = opts || {};
    const size = o.size || 12;
    g.font = (o.weight || 600) + " " + size + "px " + (o.mono
      ? 'ui-monospace, "SF Mono", Menlo, monospace'
      : '"Source Sans 3", "Segoe UI", sans-serif');
    g.textBaseline = "top";
    const pad = 3, w = g.measureText(text).width;
    const ax = o.right ? x - w - pad * 2 : x;
    g.fillStyle = css("--stage-chip");
    g.fillRect(ax, y - pad, w + pad * 2, size + pad * 2);
    g.fillStyle = colour;
    g.fillText(text, ax + pad, y);
    return w + pad * 2;
  }

  // --------------------------------------------------- the stand-in signal
  // Not a recording and not pretending to be one. The homepage hero shows
  // this stage as a still picture, and half a megabyte of audio is not what a
  // landing page is worth, so embed mode draws the same scenes from this
  // instead -- at exactly the recording's length and rate, so every shape on
  // screen is the shape the full page shows. It is also what a reader sees if
  // the recording fails to load, which beats an empty stage blaming their
  // browser.
  //
  // A pitch that drifts, a handful of harmonics under a slow formant sweep,
  // and syllable-rate gating: enough structure that a spectrogram of it looks
  // like something rather than like a test card.
  function demoSignal(n, rate) {
    const x = new Float64Array(n);
    // A cheap linear-congruential stream, so the stand-in is the same picture
    // on every load and on every machine.
    let seed = 20260920 >>> 0;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
    let hp = 0, prev = 0;
    const nyq = rate / 2;
    for (let i = 0; i < n; i++) {
      const t = i / rate;
      // Syllables at about three a second, with their loudness varying so the
      // waveform has an envelope rather than a row of identical blobs.
      const ph = 3.1 * t;
      const syl = Math.floor(ph);
      const frac = ph - syl;
      const env = Math.sin(Math.PI * Math.min(1, frac / 0.82)) ** 1.4;
      if (env <= 0.001) continue;
      const loud = 0.45 + 0.55 * Math.abs(Math.sin(syl * 2.399));
      // Every sixth syllable is a fricative: broadband noise with a high tilt,
      // which is what puts energy in the top half of the picture.
      if (syl % 6 === 5) {
        const w = rnd();
        hp = 0.82 * (hp + w - prev);
        prev = w;
        x[i] = 0.16 * env * loud * hp;
        continue;
      }
      const f0 = 118 + 26 * Math.sin(2 * Math.PI * 0.6 * t) + 14 * Math.sin(syl * 1.7);
      const F1 = 520 + 300 * Math.sin(syl * 1.1);
      const F2 = 1500 + 620 * Math.sin(syl * 2.3);
      const F3 = 2680 + 220 * Math.sin(syl * 0.7);
      let v = 0;
      for (let h = 1; f0 * h < nyq; h++) {
        const f = f0 * h;
        // The source rolls off steeply, the way a voice does. Without this the
        // harmonics stay visible to the Nyquist limit and the picture reads as
        // a test card rather than as speech.
        let a = Math.exp(-f / 3200) / (1 + 0.0009 * f);
        a *= 1 + 5.5 * Math.exp(-(((f - F1) / 110) ** 2))
               + 4.0 * Math.exp(-(((f - F2) / 170) ** 2))
               + 2.4 * Math.exp(-(((f - F3) / 240) ** 2));
        v += a * Math.sin(2 * Math.PI * f * t + h * 0.7);
      }
      x[i] = 0.09 * env * loud * v;
    }
    return x;
  }

  const VoiceKit = {
    VoiceScenes, css, ramp, spectrogramImage, blit, waveform, label, demoSignal
  };
  if (typeof module !== "undefined" && module.exports) module.exports = VoiceKit;
  else { root.VoiceKit = VoiceKit; root.VoiceScenes = VoiceScenes; }
})(typeof window !== "undefined" ? window : globalThis);
