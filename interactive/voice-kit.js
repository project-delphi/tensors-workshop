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

  const VoiceScenes = {
    register(scene) {
      for (const k of REQUIRED) {
        if (!(k in scene)) throw new Error("scene " + (scene.id || "?") + " lacks " + k);
      }
      for (const lang of ["en", "es"]) {
        if (!scene.copy[lang]) throw new Error("scene " + scene.id + " lacks " + lang + " copy");
        if (!scene.copy[lang].aria) throw new Error("scene " + scene.id + " lacks " + lang + " aria");
      }
      if (scene.gl) {
        for (const k of ["pose", "build", "render"]) {
          if (!(k in scene)) throw new Error("scene " + scene.id + " draws in three.js but lacks " + k);
        }
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
    const ax = o.right ? x - w - pad * 2 : (o.center ? x - (w + pad * 2) / 2 : x);
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

  // ------------------------------------------------ the sampled wave
  // The picture the three opening scenes share, drawn twice from one slice
  // of the recording: in three.js as a tube that dissolves into beads on a
  // ruler as the time axis stretches, and on the 2-D canvas as the same
  // facts side-on, for a reader without WebGL and for the browser check.
  //
  // A scene computes the slice (`v`, below) in its sync(); nothing here
  // computes a number a readout quotes. Coordinates inside the group are
  // sample index along x (local, centred) and value along y, and the group's
  // x scale is what the zoom moves -- so zooming never rebuilds geometry, and
  // the entrance that dollies in from the continuous look is a scale tween.
  //
  //   v = {x, i0, L, k, bx, by0, by1, levels, step, held, stalks, ticks,
  //        chips, spanShown(), mixShown(), key}
  //
  //   x       the slice, L samples from absolute index i0
  //   k       the decimation: beads sit every k-th sample
  //   bx      bead local indices; by0 / by1 bead values before and after the
  //           rounding, so a bead's shown height is lerp(by0, by1, mixShown())
  //   levels  how many rounding levels to rule, or null for none
  //   chips   [{j, text}] value labels under beads, or null
  //   spanShown()  how many samples fill the stage right now (eased)

  const smooth = (t, a, b) => {
    const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
    return u * u * (3 - 2 * u);
  };

  // Two tubes over one path: a fat one for the far view, where a thin tube
  // is under a pixel and its frames sparkle, and a thin one for the near
  // view, where a fat tube would swallow the beads. They crossfade by span.
  const BEAD_R = 0.018, TUBE_R = 0.008, TUBE_FAR_R = 0.02, MAX_LEVEL_LINES = 1024;
  // How far past the frame's edge the slice is drawn before it is clipped:
  // enough that the ends fall outside the frame under the orbit's azimuth,
  // not so far that the far end recedes into aliasing.
  const CLIP = 1.4;

  // A CSS2D label on the stage's opaque chip.
  function label2d(text, cls) {
    const AD = root.THREE_ADDONS;
    const el = document.createElement("div");
    el.className = "lab" + (cls ? " " + cls : "");
    el.textContent = text;
    return new AD.CSS2DObject(el);
  }

  // The view width at the camera's target, in world units: what the frame's
  // vertical fit (pose.content is the half-height) implies across the aspect.
  const viewWidth = (ctx) => 2 * 1.35 * ctx.aspect * 0.92;

  function waveBuild(ctx) {
    const THREE = ctx.THREE;
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(40, ctx.aspect, 0.05, 200);
    const G = new THREE.Group();
    scene.add(G);
    const colour = (t) => new THREE.Color(ctx.colour(t));
    // Everything beyond the frame is clipped in world x. The slice is built
    // wider than any view so that zooming never rebuilds it, and unclipped
    // its lines ran a hundred units past the frame, where the rasteriser
    // dropped them whole: the ruler was built, positioned, visible and not
    // there.
    const clip = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 10),
                  new THREE.Plane(new THREE.Vector3(-1, 0, 0), 10)];
    const line = (token, opacity) => new THREE.LineBasicMaterial({
      color: colour(token), transparent: true, opacity: opacity, clippingPlanes: clip});
    const seg = (mat) => new THREE.LineSegments(new THREE.BufferGeometry(), mat);
    const gl = {
      scene, cam, G, clip,
      tubeMat: new THREE.MeshBasicMaterial({color: colour("--v-sig"), transparent: true, opacity: 1, clippingPlanes: clip}),
      tubeFarMat: new THREE.MeshBasicMaterial({color: colour("--v-sig"), transparent: true, opacity: 1, clippingPlanes: clip}),
      tubeFar: null,
      beadMat: new THREE.MeshBasicMaterial({color: colour("--v-sig"), transparent: true, opacity: 1, clippingPlanes: clip}),
      tube: null,
      beads: null,
      // Where a bead was before the rounding: a pink ghost under the stalk.
      ghostMat: new THREE.MeshBasicMaterial({color: colour("--v-res"), transparent: true, opacity: 0.55, clippingPlanes: clip}),
      ghosts: null,
      stalks: seg(line("--v-res", 0.9)),
      // The staircase a lower rate plays back, as thin quads rather than a
      // one-pixel line, so it reads beside the tube.
      heldMat: new THREE.MeshBasicMaterial({color: colour("--v-out"), transparent: true, opacity: 0.95, side: THREE.DoubleSide, clippingPlanes: clip}),
      heldH: null, heldV: null,
      ticks: seg(line("--stage-mute", 0.2)),
      // The ruler and the time axis are horizontal, so they live in the
      // scene in world units, sized to the frame each frame: inside the
      // stretched group they ran a hundred units past it and the rasteriser
      // dropped them whole.
      levels: seg(line("--v-axis", 0.38)),
      band: new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({color: colour("--v-axis"), transparent: true, opacity: 0.07, side: THREE.DoubleSide, clippingPlanes: clip})),
      axes: seg(line("--stage-ink", 0.6)),
      // The value axis and its labels sit at the frame's left edge in world
      // units, outside the stretched group, so they are there at every zoom.
      axisY: new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({
        color: colour("--stage-ink"), transparent: true, opacity: 0.6})),
      head: new THREE.Line(new THREE.BufferGeometry(), line("--v-out", 0.9)),
      labels: {},
      chips: [],
      key: null, sx: 1
    };
    for (const o of [gl.ticks, gl.stalks, gl.head]) G.add(o);
    for (const o of [gl.levels, gl.band, gl.axes, gl.axisY]) scene.add(o);
    gl.axes.geometry.setAttribute("position",
      new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0]), 3));
    gl.axisY.geometry.setAttribute("position",
      new THREE.BufferAttribute(new Float32Array([0, -1.08, 0, 0, 1.08, 0]), 3));
    gl.band.visible = false;
    gl.head.visible = false;
    gl.head.geometry.setAttribute("position",
      new THREE.BufferAttribute(new Float32Array([0, -1.08, 0, 0, 1.08, 0]), 3));

    // Labels live in the scene, not the group: their places are frame
    // places, set per frame from the view's width.
    const lab = (name, text, cls) => { gl.labels[name] = label2d(text, cls); scene.add(gl.labels[name]); };
    lab("t", "t", "axis big");
    lab("xn", "x[n]", "sig big");
    lab("plus", "+1", "mute");
    lab("zero", "0", "mute");
    lab("minus", "−1", "mute");
    lab("levels", "", "axis");
    gl.labels.levels.visible = false;
    return gl;
  }

  // Geometry for a slice, rebuilt only when the slice's key changes: a new
  // position, rate, bit depth or recording.
  function waveRebuild(ctx, gl, v) {
    const THREE = ctx.THREE;
    const L = v.L, half = L / 2;
    const G = gl.G;

    for (const name of ["tube", "tubeFar"]) {
      if (gl[name]) { G.remove(gl[name]); gl[name].geometry.dispose(); }
    }
    const pts = [];
    for (let j = 0; j < L; j++) pts.push(new THREE.Vector3(j - half, v.x[j], 0));
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const segs = Math.min(24000, L * 3);
    curve.arcLengthDivisions = segs;
    gl.tube = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, TUBE_R, 6, false), gl.tubeMat);
    gl.tubeFar = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, TUBE_FAR_R, 8, false), gl.tubeFarMat);
    G.add(gl.tube);
    G.add(gl.tubeFar);

    const nb = v.bx.length;
    const pool = (name, geom, mat) => {
      if (!gl[name] || gl[name].instanceMatrix.count < nb) {
        if (gl[name]) { G.remove(gl[name]); gl[name].geometry.dispose(); }
        gl[name] = new THREE.InstancedMesh(geom(), mat, Math.max(nb, 1));
        G.add(gl[name]);
      }
      gl[name].count = nb;
    };
    pool("beads", () => new THREE.SphereGeometry(1, 10, 8), gl.beadMat);
    pool("ghosts", () => new THREE.SphereGeometry(1, 8, 6), gl.ghostMat);
    pool("heldH", () => new THREE.PlaneGeometry(1, 1), gl.heldMat);
    pool("heldV", () => new THREE.PlaneGeometry(1, 1), gl.heldMat);
    gl.ghosts.visible = !!v.stalks;
    gl.heldH.visible = gl.heldV.visible = !!v.held;

    const put = (obj, arr) => {
      obj.geometry.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      obj.geometry.computeBoundingSphere();
    };
    const ticks = new Float32Array(nb * 6);
    for (let b = 0; b < nb; b++) {
      const x = v.bx[b] - half;
      ticks.set([x, -1.05, 0, x, 1.05, 0], b * 6);
    }
    put(gl.ticks, ticks);
    gl.ticks.visible = !!v.ticks;

    put(gl.stalks, new Float32Array(nb * 6));
    gl.stalks.visible = !!v.stalks;

    // The ruler: one line per level while they are still lines. Past that
    // they are closer than a pixel, so a faint band says where they are and
    // the label says how many.
    if (v.levels && v.levels <= MAX_LEVEL_LINES) {
      const lv = new Float32Array(v.levels * 6);
      const hlf = v.levels / 2;
      for (let c = -hlf; c < hlf; c++) {
        const y = c / hlf;
        lv.set([-0.5, y, 0, 0.5, y, 0], (c + hlf) * 6);
      }
      put(gl.levels, lv);
      gl.levels.visible = true;
      gl.band.visible = false;
    } else {
      gl.levels.visible = false;
      gl.band.visible = !!v.levels;
    }
    gl.labels.levels.visible = !!v.levels;
    gl.labels.levels.position.set(half, 1.0, 0);
    if (v.levels) gl.labels.levels.element.textContent = v.levelsText;


    // Value chips under the beads, from a pool.
    const chips = v.chips || [];
    while (gl.chips.length < chips.length) {
      const o = label2d("", "sig");
      gl.chips.push(o);
      G.add(o);
    }
    gl.chips.forEach((o, i) => {
      o.visible = i < chips.length;
      if (i < chips.length) {
        o.element.textContent = chips[i].text;
        o.element.className = "lab " + (chips[i].cls || "sig");
        o.position.set(chips[i].j - half, chips[i].y === undefined ? -1.2 : chips[i].y, 0);
      }
    });
    gl.key = v.key;
  }

  // Per frame: the zoom (the group's x scale), the beads' shown heights, the
  // crossfade between tube and beads, and the playhead.
  function waveFrame(ctx, gl, v) {
    const THREE = ctx.THREE;
    if (gl.key !== v.key) waveRebuild(ctx, gl, v);
    const L = v.L, half = L / 2;
    const span = Math.max(2, v.spanShown());
    const vw = viewWidth(ctx);
    const sx = vw / span;
    gl.G.scale.set(sx, 1, 1);
    gl.sx = sx;
    gl.clip[0].constant = vw / 2 * CLIP;
    gl.clip[1].constant = vw / 2 * CLIP;
    gl.levels.scale.set(vw * CLIP, 1, 1);
    gl.axes.scale.set(vw * CLIP, 1, 1);
    gl.band.scale.set(vw * CLIP, 2, 1);

    // The frame's furniture, at the frame's edges whatever the zoom.
    const ax = -vw / 2 + 0.16;
    gl.axisY.position.set(ax, 0, 0);
    gl.labels.plus.position.set(ax - 0.11, 1, 0);
    gl.labels.zero.position.set(ax - 0.09, 0, 0);
    gl.labels.minus.position.set(ax - 0.11, -1, 0);
    gl.labels.xn.position.set(ax + 0.24, 1.0, 0);
    gl.labels.t.position.set(vw / 2 - 0.12, -0.11, 0);
    gl.labels.levels.position.set(vw / 2 - 0.16 - gl.labels.levels.element.offsetWidth / 400, 1.18, 0);

    // Beads show once their spacing clears a bead's width; the tube thins to
    // a thread as they do. That crossfade is the lesson.
    const spacing = v.k * sx;
    const beadA = smooth(spacing / (2 * BEAD_R), 0.9, 1.6);
    gl.beadMat.opacity = beadA;
    gl.beads.visible = beadA > 0.01;
    const farA = smooth(span, 150, 420);
    gl.tubeFarMat.opacity = farA;
    gl.tubeFar.visible = farA > 0.01;
    gl.tubeMat.opacity = (1 - 0.78 * beadA) * (1 - farA);
    gl.tube.visible = gl.tubeMat.opacity > 0.01;
    gl.ticks.material.opacity = 0.22 * beadA;
    gl.stalks.material.opacity = 0.9 * beadA;

    const mix = v.mixShown();
    const nb = v.bx.length;
    const m = new THREE.Matrix4();
    const st = gl.stalks.geometry.attributes.position;
    const from = v.stalkFrom || v.by0;
    const THICK = 0.011;
    gl.ghostMat.opacity = 0.55 * beadA;
    for (let b = 0; b < nb; b++) {
      const x = v.bx[b] - half;
      const y = v.by0[b] + (v.by1[b] - v.by0[b]) * mix;
      m.makeScale(BEAD_R / sx, BEAD_R, BEAD_R);
      m.setPosition(x, y, 0);
      gl.beads.setMatrixAt(b, m);
      if (v.stalks) {
        st.array.set([x, from[b], 0, x, y, 0], b * 6);
        m.makeScale(BEAD_R * 0.6 / sx, BEAD_R * 0.6, BEAD_R * 0.6);
        m.setPosition(x, from[b], -0.001);
        gl.ghosts.setMatrixAt(b, m);
      }
      if (v.held) {
        const xn = b + 1 < nb ? v.bx[b + 1] - half : Math.min(half, x + v.k);
        const yn = b + 1 < nb ? v.by1[b + 1] : y;
        m.makeScale(xn - x, THICK, 1);
        m.setPosition((x + xn) / 2, y, -0.002);
        gl.heldH.setMatrixAt(b, m);
        m.makeScale(THICK / sx, Math.abs(yn - y) + THICK, 1);
        m.setPosition(xn, (y + yn) / 2, -0.002);
        gl.heldV.setMatrixAt(b, m);
      }
    }
    gl.beads.instanceMatrix.needsUpdate = true;
    if (v.stalks) { st.needsUpdate = true; gl.ghosts.instanceMatrix.needsUpdate = true; }
    if (v.held) { gl.heldH.instanceMatrix.needsUpdate = true; gl.heldV.instanceMatrix.needsUpdate = true; }

    // Where the sound is, while it plays and while it is on the stage.
    const h = ctx.head();
    const hs = h >= 0 ? h * ctx.rate - v.i0 - half : NaN;
    gl.head.visible = h >= 0 && hs >= -half && hs <= half;
    if (gl.head.visible) gl.head.position.set(hs, 0, 0);
  }

  // The twin: the same slice, side-on, on the 2-D canvas. The view is the
  // span the controls ask for, uneased, and the beads are at their target
  // heights, because the twin draws when told to rather than every frame.
  function waveDraw(g, ctx, v, opts) {
    const o = opts || {};
    const W = ctx.W, H = ctx.H;
    const Lm = 46, Rm = 18, Tm = 34, Bm = 28;
    const pw = Math.max(10, W - Lm - Rm), ph = Math.max(10, H - Tm - Bm);
    const span = v.span, half = v.L / 2;
    const px = pw / span;                             // pixels per sample
    const X = (j) => Lm + pw / 2 + (j - half) * px;   // local sample index -> x
    const Y = (y) => Tm + ph / 2 - y * (ph / 2.4);    // value -> y
    const j0 = Math.max(0, Math.floor(half - span / 2)), j1 = Math.min(v.L, Math.ceil(half + span / 2) + 1);
    const spacingPx = v.k * px;
    const beadA = smooth(spacingPx, 5, 12);
    const rgba = (token, a) => {
      const c = css(token).replace("#", "");
      const n = parseInt(c.length === 3 ? c.replace(/./g, "$&$&") : c, 16);
      return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    };

    // The ruler.
    if (v.levels) {
      const hlf = v.levels / 2;
      if (v.levels <= MAX_LEVEL_LINES && ph / v.levels >= 1.5) {
        g.strokeStyle = rgba("--v-axis", 0.4);
        g.lineWidth = 1;
        g.beginPath();
        for (let c = -hlf; c < hlf; c++) { const y = Math.round(Y(c / hlf)) + 0.5; g.moveTo(Lm, y); g.lineTo(Lm + pw, y); }
        g.stroke();
      } else {
        g.fillStyle = rgba("--v-axis", 0.08);
        g.fillRect(Lm, Y(1), pw, Y(-1) - Y(1));
      }
      label(g, v.levelsText, Lm + pw, Y(1) - 7, css("--v-axis"), {size: 11, right: true});
    }
    if (v.ticks && beadA > 0.01) {
      g.strokeStyle = rgba("--stage-mute", 0.25 * beadA);
      g.lineWidth = 1;
      g.beginPath();
      for (let b = 0; b < v.bx.length; b++) {
        const j = v.bx[b];
        if (j < j0 || j > j1) continue;
        const x = Math.round(X(j)) + 0.5;
        g.moveTo(x, Y(1.05)); g.lineTo(x, Y(-1.05));
      }
      g.stroke();
    }
    // Axes.
    g.strokeStyle = rgba("--stage-ink", 0.6);
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(Lm, Y(0) + 0.5); g.lineTo(Lm + pw, Y(0) + 0.5);
    g.moveTo(Lm + 0.5, Y(1.08)); g.lineTo(Lm + 0.5, Y(-1.08));
    g.stroke();
    label(g, "+1", 4, Y(1) - 7, css("--stage-mute"), {size: 10});
    label(g, "0", 4, Y(0) - 7, css("--stage-mute"), {size: 10});
    label(g, "−1", 4, Y(-1) - 7, css("--stage-mute"), {size: 10});
    label(g, "t", Lm + pw - 4, Y(0) + 6, css("--v-axis"), {size: 12, right: true, mono: true});
    label(g, "x[n]", Lm + 8, Y(1) - 7, css("--v-sig"), {size: 12, mono: true});

    // The held staircase, under the wave.
    if (v.held) {
      g.strokeStyle = rgba("--v-out", 0.85);
      g.lineWidth = 1.5;
      g.beginPath();
      for (let b = 0; b < v.bx.length; b++) {
        const j = v.bx[b], y = Y(v.by1[b]);
        const jn = b + 1 < v.bx.length ? v.bx[b + 1] : Math.min(v.L, j + v.k);
        if (jn < j0 || j > j1) continue;
        if (b === 0 || v.bx[b - 1] < j0) g.moveTo(X(j), y); else g.lineTo(X(j), y);
        g.lineTo(X(jn), y);
      }
      g.stroke();
    }
    // The wave, as a line that thins as the beads take over.
    g.strokeStyle = rgba("--v-sig", 1 - 0.7 * beadA);
    g.lineWidth = 2 - beadA;
    g.beginPath();
    for (let j = j0; j < j1; j++) {
      if (j === j0) g.moveTo(X(j), Y(v.x[j])); else g.lineTo(X(j), Y(v.x[j]));
    }
    g.stroke();
    // Stalks, then beads.
    if (v.stalks && beadA > 0.01) {
      g.strokeStyle = rgba("--v-res", 0.9 * beadA);
      g.lineWidth = 1.5;
      g.beginPath();
      for (let b = 0; b < v.bx.length; b++) {
        const j = v.bx[b];
        if (j < j0 || j > j1) continue;
        g.moveTo(X(j), Y((v.stalkFrom || v.by0)[b])); g.lineTo(X(j), Y(v.by1[b]));
      }
      g.stroke();
    }
    if (v.stalks && beadA > 0.01) {
      g.strokeStyle = rgba("--v-res", 0.8 * beadA);
      g.lineWidth = 1.2;
      for (let b = 0; b < v.bx.length; b++) {
        const j = v.bx[b];
        if (j < j0 || j > j1) continue;
        g.beginPath(); g.arc(X(j), Y((v.stalkFrom || v.by0)[b]), 2.6, 0, 2 * Math.PI); g.stroke();
      }
    }
    if (beadA > 0.01) {
      g.fillStyle = rgba("--v-sig", beadA);
      const r = 4;
      for (let b = 0; b < v.bx.length; b++) {
        const j = v.bx[b];
        if (j < j0 || j > j1) continue;
        g.beginPath(); g.arc(X(j), Y(v.by1[b]), r, 0, 2 * Math.PI); g.fill();
      }
    }
    // Value chips.
    if (v.chips) {
      for (const c of v.chips) {
        const x = X(c.j);
        if (x < Lm - 10 || x > Lm + pw + 10) continue;
        g.save();
        g.translate(x, Y(c.y === undefined ? -1.2 : c.y));
        if (o.rotateChips) g.rotate(-Math.PI / 2);
        label(g, c.text, o.rotateChips ? -60 : -18, -7, css(c.cls === "mute" ? "--stage-mute" : "--v-sig"), {size: 10, mono: true});
        g.restore();
      }
    }
    // The playhead.
    const h = ctx.head();
    if (h >= 0) {
      const js = h * ctx.rate - v.i0;
      if (js >= j0 && js <= j1) {
        g.strokeStyle = rgba("--v-out", 0.9);
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(X(js), Y(1.08)); g.lineTo(X(js), Y(-1.08)); g.stroke();
      }
    }
  }

  // ------------------------------------------------------------ the spectrum
  // |X[f]| as bars in dB above a floor, the same floor the spectrogram uses so
  // the two pictures agree. All N bins are drawn: the first `F` in the output
  // colour, the mirror half above them in the muted one, and the bins in
  // `kept` (a Set) brighter, for the scene that rebuilds the frame from its k
  // strongest components. Returns the peak bin among the first F.
  function bars(g, mag, F, rect, opts) {
    const o = opts || {};
    const floorDb = o.floorDb === undefined ? -70 : o.floorDb;
    const {x, y, w, h} = rect;
    const N = mag.length;
    let peak = 1e-12, peakF = 0;
    for (let f = 0; f < F; f++) if (mag[f] > peak) { peak = mag[f]; peakF = f; }
    const bw = w / N;
    for (let f = 0; f < N; f++) {
      const db = 20 * Math.log10((mag[f] > 0 ? mag[f] : 1e-12) / peak);
      const u = db <= floorDb ? 0 : db / -floorDb + 1;
      if (u <= 0) continue;
      const mirror = f >= F;
      g.fillStyle = mirror ? o.mirrorColour : (o.kept && o.kept.has(f) ? o.keptColour : o.colour);
      const bh = u * h;
      g.fillRect(x + f * bw, y + h - bh, Math.max(bw - (bw > 3 ? 1 : 0), 0.5), bh);
    }
    return peakF;
  }

  // A measured span: a rule between two ticks with its name over the middle.
  // The three flat transform scenes draw one when a letter in the equation
  // above is pointed at, so N, H and the bins each get the same picture --
  // an extent of the stage, bracketed, named. Nothing else on the page
  // measures anything, which is why the shape is worth sharing.
  function span(g, x0, x1, y, colour, text, opts) {
    const o = opts || {};
    const tick = o.tick === undefined ? 5 : o.tick;
    const yy = Math.round(y) + 0.5;
    g.strokeStyle = colour;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x0, yy); g.lineTo(x1, yy);
    for (const x of [x0, x1]) {
      g.moveTo(Math.round(x) + 0.5, yy - tick);
      g.lineTo(Math.round(x) + 0.5, yy + tick);
    }
    g.stroke();
    if (text) {
      // Below the rule by default on these scenes: above it the name lands
      // on the claim card, which is an HTML element pinned to the stage's
      // top left and nothing on the canvas can see.
      const ly = o.below ? yy + tick + 3 : yy - tick - 16;
      label(g, text, (x0 + x1) / 2, ly, colour, {size: 11, mono: true, center: true});
    }
  }

  // The window shapes of neighbouring frames along a waveform strip, so the
  // overlap is a picture rather than a fraction: one hump per frame, its
  // width N samples and its height the window's, the frame at `lit` brighter.
  function humps(g, w, starts, lit, rect, pxPerSample, colour, litColour) {
    const {x, y, h} = rect;
    const N = w.length;
    const stepN = Math.max(1, Math.floor(N / 64));
    starts.forEach((s0, idx) => {
      g.strokeStyle = idx === lit ? litColour : colour;
      g.lineWidth = idx === lit ? 2 : 1;
      g.beginPath();
      for (let n = 0; n <= N; n += stepN) {
        const px = x + (s0 + Math.min(n, N - 1)) * pxPerSample;
        const py = y + h - w[Math.min(n, N - 1)] * h;
        if (n === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.stroke();
    });
  }

  // The timeline strip under the stage: the whole recording as a min/max
  // waveform, cached per signal in an offscreen canvas, then the region the
  // scene is examining and the playhead. `cache` is the frame's, keyed here
  // on the signal's identity and the strip's size.
  function timeline(g, cache, signal, key, rect, region, headSample, colours) {
    const {x, y, w, h} = rect;
    const want = key + ":" + Math.round(w) + "x" + Math.round(h);
    if (cache.key !== want) {
      const c = cache.canvas || (cache.canvas = document.createElement("canvas"));
      const dpr = cache.dpr || 1;
      c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(h * dpr));
      const cg = c.getContext("2d");
      cg.setTransform(dpr, 0, 0, dpr, 0, 0);
      cg.fillStyle = colours.bg;
      cg.fillRect(0, 0, w, h);
      waveform(cg, signal, {x: 0, y: 2, w: w, h: h - 4}, colours.wave);
      cache.key = want;
    }
    g.drawImage(cache.canvas, x, y, w, h);
    if (region) {
      const x0 = x + region.i0 / signal.length * w, x1 = x + region.i1 / signal.length * w;
      g.fillStyle = colours.band;
      g.fillRect(x0, y, Math.max(2, x1 - x0), h);
      g.strokeStyle = colours.bandLine;
      g.lineWidth = 1;
      g.strokeRect(Math.round(x0) + 0.5, y + 0.5, Math.max(2, x1 - x0), h - 1);
    }
    if (headSample >= 0 && headSample <= signal.length) {
      const hx = Math.round(x + headSample / signal.length * w) + 0.5;
      g.strokeStyle = colours.head;
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(hx, y); g.lineTo(hx, y + h); g.stroke();
    }
  }

  // A playhead line on a scene's own picture, in the output colour.
  function playhead(g, px, y0, y1, colour) {
    g.strokeStyle = colour;
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(px, y0); g.lineTo(px, y1); g.stroke();
  }

  const VoiceKit = {
    VoiceScenes, css, ramp, spectrogramImage, blit, waveform, label, demoSignal,
    smooth, label2d, waveBuild, waveRebuild, waveFrame, waveDraw, BEAD_R,
    bars, humps, span, timeline, playhead
  };
  if (typeof module !== "undefined" && module.exports) module.exports = VoiceKit;
  else { root.VoiceKit = VoiceKit; root.VoiceScenes = VoiceScenes; }
})(typeof window !== "undefined" ? window : globalThis);
