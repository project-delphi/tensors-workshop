// Scene 5: the transform asks one frame which frequencies are in it.
//
// The page said "ask which frequencies are in each window" for months and
// never showed the asking. This is it, on one frame: the magnitudes of all N
// bins, the top half drawn in grey and labelled as the mirror image the
// one-sided transform throws away -- which is where the 513 rows of the
// matrix come from, and the second place on this page where a reader meets a
// symmetry and is told why it is there.
//
// The k slider rebuilds the frame from its k strongest components and plays
// the result, so "a change of basis, nothing lost" is something you can hear
// arrive one sinusoid at a time.
(function () {
  "use strict";

  const SIZES = [256, 512, 1024, 2048];
  const LOOP_SECS = 1;

  function build(ctx) {
    const s = ctx.state;
    const N = SIZES[s.size];
    const max = Math.max(0, ctx.signal.length - N);
    const i0 = Math.min(max, Math.round(s.pos / 1000 * max / 16) * 16);
    const key = ctx.source + ":" + i0 + ":" + N + ":" + s.win;
    if (!s.sp || s.key !== key) {
      s.f = ctx.AC.frame(ctx.signal, i0, N, s.win);
      s.sp = ctx.AC.spectrum(s.f.tapered);
      s.N = N;
      s.i0 = i0;
      s.key = key;
      s.synth = null;
      s.synthK = -1;
    }
    // The rebuild is only recomputed when k moves, not on every repaint.
    // The slider reaches every bin the transform kept, because the scene's
    // claim is that the frame comes back exactly -- and it only does at
    // k = N/2 + 1. At 64 of 513 the rebuild carries 63% of the energy and
    // never lands on the frame, which made the body copy a promise the
    // control could not keep.
    const F = (N >> 1) + 1;
    const input = ctx.control("k");
    if (input && Number(input.max) !== F) input.max = String(F);
    if (s.k > F) s.k = F;
    const k = Math.min(s.k, F);
    if (s.synthK !== k) {
      s.synth = ctx.AC.synthTopK(s.sp, k);
      s.synthK = k;
      s.kept = new Set(s.synth.bins);
      // How far the rebuild still is from the frame, as a fraction of the
      // frame's own peak: the number behind "until the line lies on the
      // yellow one", and it reaches 0 only when every bin is kept.
      let err = 0, pk = 1e-12;
      for (let i = 0; i < N; i++) {
        err = Math.max(err, Math.abs(s.synth.samples[i] - s.f.tapered[i]));
        pk = Math.max(pk, Math.abs(s.f.tapered[i]));
      }
      s.err = err / pk;
    }
    // The loudest bin, skipping DC: a constant offset is not a frequency a
    // reader is looking for, and the stage and the readout used to scan from
    // different bins and could name two different peaks on one picture.
    if (s.peakKey !== s.key) {
      s.peakKey = s.key;
      let peak = 0;
      for (let f = 1; f < (N >> 1) + 1; f++) if (s.sp.mag[f] > s.sp.mag[peak]) peak = f;
      s.peak = peak;
      // The mirror partner of every kept bin is kept too, and the picture
      // says so: it is the same number, on the other side.
      for (const f of s.synth.bins) if (f > 0 && f < N - f) s.kept.add(N - f);
    }
  }

  window.VoiceScenes.register({
    id: "spectrum",
    section: "E",
    posControl: "pos",

    controls: [
      {id: "size", type: "range", min: 0, max: 3, step: 1,
       fmt: (v, ctx) => SIZES[v] + " → " + ((ctx.rate / SIZES[v]).toFixed(1)) + " Hz a bin"},
      // max is re-set from the window size in build(): 513 bins at N = 1024.
      {id: "k", type: "range", min: 1, max: 513, step: 1,
       fmt: (v, ctx) => ctx.copy.kOf(Math.min(v, ((ctx.state.N || 1024) >> 1) + 1))},
      {id: "win", type: "select", options: ["hann", "hamming", "rect"]},
      {id: "pos", type: "range", min: 0, max: 1000, step: 1,
       fmt: (v, ctx) => ctx.state.i0 === undefined ? "" : (ctx.state.i0 / ctx.rate).toFixed(3) + " s"}
    ],

    init(ctx) { Object.assign(ctx.state, {size: 2, k: 8, win: "hann", pos: 380, key: null, synthK: -1}); },
    reset(ctx) { Object.assign(ctx.state, {size: 2, k: 8, win: "hann", pos: 380, key: null, synthK: -1}); },
    sync(ctx) { build(ctx); },

    region(ctx) { return {i0: ctx.state.i0, i1: ctx.state.i0 + ctx.state.N}; },
    animates(ctx) { return ctx.head() >= 0; },
    // Play loops this one frame rather than the recording, so the strip
    // under the stage must not draw a playhead running along the whole clip.
    loopAudio: true,
    playLabel(ctx) { return ctx.copy.playK(ctx.state.synthK); },

    draw(ctx) {
      const g = ctx.g, K = ctx.K, W = ctx.W, H = ctx.H;
      const s = ctx.state, N = s.N, F = (N >> 1) + 1;
      const L = 44, R = 14, TOP = 42, BOT = 30;
      const pw = Math.max(10, W - L - R);
      // The frame in a strip on top, the spectrum of it filling the rest:
      // the input and the answer, one above the other.
      const waveH = Math.max(34, (H - TOP - BOT) * 0.26);
      // Three label rows have to fit between the two pictures: what the wave
      // strip shows, and what each half of the bars is. They are stacked
      // rather than shared, because on one row they overlapped.
      const specY = TOP + waveH + 38;
      const specH = Math.max(40, H - specY - BOT);

      let peak = 1e-3;
      for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(s.f.raw[i]));
      const step = Math.max(1, Math.floor(N / pw / 2));
      const line = (arr, colour, width) => {
        g.strokeStyle = colour;
        g.lineWidth = width;
        g.beginPath();
        for (let i = 0; i < N; i += step) {
          const x = L + (i / (N - 1)) * pw, y = TOP + waveH / 2 - (arr[i] / peak) * (waveH / 2 - 2);
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
      };
      line(s.f.tapered, K.css("--v-sig"), 1.4);
      // What the k components add up to, over the frame they came from.
      line(s.synth.samples, K.css("--v-out"), 1.4);

      // All N bins. The first F are the answer; the rest are the same numbers
      // read backwards, and the transform drops them.
      K.bars(g, s.sp.mag, F, {x: L, y: specY, w: pw, h: specH}, {
        floorDb: -70,
        colour: K.css("--v-axis"),
        mirrorColour: K.css("--stage-mute"),
        keptColour: K.css("--v-out"),
        kept: s.kept
      });

      const peakF = s.peak;

      // The fold: where the one-sided transform stops.
      const foldX = L + (F / N) * pw;
      g.strokeStyle = K.css("--stage-ink");
      g.lineWidth = 1;
      g.setLineDash([4, 4]);
      g.beginPath(); g.moveTo(foldX, specY); g.lineTo(foldX, specY + specH); g.stroke();
      g.setLineDash([]);

      // Axes: frequency along the bottom, in kHz, and the two halves named.
      // A kept bin is one bar in 513 -- under a pixel wide -- so each one
      // also gets a mark it can be seen by, above the bars it belongs to.
      g.fillStyle = K.css("--v-out");
      for (const f of s.synth.bins) {
        const x = L + (f / N) * pw;
        g.fillRect(x - 1, specY - 7, 3, 5);
      }

      const nyq = ctx.rate / 2000;
      for (let i = 0; i <= 2; i++) {
        const x = L + (i / 2) * (F / N) * pw;
        K.label(g, (nyq * i / 2).toFixed(0) + (i === 2 ? " kHz" : ""),
                x, specY + specH + 5, K.css("--stage-mute"), {size: 10, right: i === 2});
      }
      // Both halves are named on the row above the bars, and the loudest bin
      // is labelled where it actually is rather than in the middle.
      K.label(g, ctx.copy.axKept(F), L, specY - 24, K.css("--v-axis"), {size: 11});
      K.label(g, ctx.copy.axMirror, W - 6, specY - 24, K.css("--stage-mute"), {size: 11, right: true});
      // The loudest bin is named where it is: a tick on it, and the text
      // inside the bars so it cannot land on either half's name.
      const px = L + (peakF / N) * pw;
      g.fillStyle = K.css("--v-out");
      g.fillRect(px - 1, specY - 16, 2, 9);
      K.label(g, (peakF * ctx.rate / N).toFixed(0) + " Hz", Math.min(px + 4, L + pw - 60),
              specY + 4, K.css("--v-out"), {size: 11, mono: true});
      // What the two lines over the frame are, under the frame.
      K.label(g, ctx.copy.axFrame, L, TOP + waveH + 2, K.css("--v-sig"), {size: 10});
      K.label(g, ctx.copy.axSynth(s.synthK), W - 6, TOP + waveH + 2, K.css("--v-out"),
              {size: 10, right: true});

      const h = ctx.head();
      if (h >= 0) {
        const into = (h * ctx.rate) % N;
        K.playhead(g, L + (into / (N - 1)) * pw, TOP, TOP + waveH, ctx.colour("--v-sig"));
      }
    },

    audio(ctx) {
      const s = ctx.state;
      return {samples: ctx.AC.loop(s.synth.samples, Math.round(LOOP_SECS * ctx.rate)),
              what: ctx.copy.playK(s.synthK)};
    },

    readout(ctx) {
      const s = ctx.state, N = s.N, F = (N >> 1) + 1;
      const binHz = ctx.rate / N;
      const peakF = s.peak;
      // How much of the frame's energy the k kept components carry.
      let all = 0, kept = 0;
      for (let f = 0; f < F; f++) {
        const e = s.sp.mag[f] * s.sp.mag[f];
        all += e;
        if (s.kept.has(f)) kept += e;
      }
      const share = all > 0 ? kept / all : 0;
      return {
        html: ctx.copy.readout(N, F, binHz, peakF, peakF * binHz, s.synthK, share, ctx.rate / 2, s.err),
        data: {
          n: N, bins: F, binhz: binHz.toFixed(3), peakbin: peakF,
          peakhz: (peakF * binHz).toFixed(1), k: s.synthK,
          share: (share * 100).toFixed(1), err: s.err.toFixed(3), win: s.win, i0: s.i0
        }
      };
    },

    copy: {
      en: {
        tab: "The transform",
        k: "The discrete Fourier transform · Appendix E",
        h: "The transform asks one frame which frequencies are in it",
        claim: "X[f] = Σₙ xₜ[n] e^(−2πifn/N)",
        concept: "A frame of N samples can be written as a sum of N sinusoids, one per frequency, " +
                 "and the transform is the change of basis that finds their sizes. It loses nothing: " +
                 "the same N numbers go in and come out, in a different coordinate system.",
        b: "<p>Take k down to 1 and press play: one sinusoid, and you can hear which one — the bar " +
           "lit purple in the picture, and the frequency in the box below. Raise k and the others " +
           "arrive one at a time. At 513 — every bin the transform kept — the purple line lies exactly " +
           "on the yellow one and the sound is the frame again: nothing was approximated, the " +
           "components were simply summed back up. The box below counts how far off the rebuild " +
           "still is, and it reaches zero only there.</p>" +
           "<p>The grey half of the picture is the same answer twice. A recording is a list of real " +
           "numbers, and the transform of real numbers is mirror-symmetric: the bar at 20 kHz is the " +
           "bar at 4 kHz reflected, carrying no new information. So only the first half plus one is " +
           "kept, which is where the matrix's 513 rows come from. " +
           "<a href='https://www.youtube.com/watch?v=spUNpyF58BY'>3Blue1Brown builds this transform " +
           "from a rotating vector</a> if you want the machinery.</p>",
        predict: "Before you slide the window size: doubling N doubles the number of bars. Do they reach higher in frequency, or sit closer together?",
        kOf: (k) => k === 1 ? "the strongest 1" : "the strongest " + k,
        playK: (k) => k + (k === 1 ? " sinusoid" : " sinusoids"),
        axFrame: "the frame", axSynth: (k) => "rebuilt from " + k,
        axKept: (F) => F + " bins kept", axMirror: "mirror image, dropped",
        controls: {size: "Window size (N)", k: "Components to rebuild from (k)",
                   win: "Window shape", pos: "Where the frame is cut"},
        options: {win: {hann: "Hann", hamming: "Hamming", rect: "rectangular (no taper)"}},
        readout: (N, F, binHz, peakBin, peakHz, k, share, nyq, err) =>
          "A frame of <b>" + N.toLocaleString("en") + "</b> samples gives <b>" + N.toLocaleString("en") +
          "</b> bins from 0 to " + (nyq * 2 / 1000).toFixed(0) + " kHz, one every <b>" +
          binHz.toFixed(1) + " Hz</b> — but the top half mirrors the bottom, so <b>" + F +
          "</b> are kept, up to " + (nyq / 1000).toFixed(0) + " kHz. The loudest is bin <b>" + peakBin +
          "</b>, which is <b>" + peakHz.toFixed(0) + " Hz</b>. The <b>" + k + "</b> strongest carry <b>" +
          (share * 100).toFixed(1) + "%</b> of this frame's energy, and the rebuilt line is still " +
          (err < 0.0005
            ? "<b>exactly the frame</b>: every bin is kept, so nothing was approximated."
            : "<b>" + (err * 100).toFixed(1) + "%</b> of the frame's own height away from it."),
        aria: (ctx) => {
          const s = ctx.state, F = (s.N >> 1) + 1;
          return "A frame of " + s.N + " samples above the magnitudes of its " + s.N +
                 " frequency bins, the first " + F + " kept and the rest greyed out as a mirror " +
                 "image, with the " + s.synthK + " strongest highlighted.";
        }
      },
      es: {
        tab: "La transformada",
        k: "La transformada discreta de Fourier · Apéndice E",
        h: "La transformada pregunta a un marco qué frecuencias hay en él",
        claim: "X[f] = Σₙ xₜ[n] e^(−2πifn/N)",
        concept: "Un marco de N muestras puede escribirse como una suma de N sinusoides, una por " +
                 "frecuencia, y la transformada es el cambio de base que halla sus tamaños. No " +
                 "pierde nada: entran y salen los mismos N números, en otro sistema de coordenadas.",
        b: "<p>Baja k a 1 y pulsa reproducir: una sinusoide, y puedes oír cuál — la barra encendida " +
           "en morado en la imagen, y la frecuencia en la caja de abajo. Sube k y las demás van " +
           "llegando de una en una. En 513 —todos los bins que guardó la transformada— la línea morada " +
           "se apoya exactamente sobre la amarilla y el sonido vuelve a ser el marco: no se aproximó " +
           "nada, simplemente se volvieron a sumar las componentes. La caja de abajo cuenta cuánto le " +
           "falta a la reconstrucción, y solo llega a cero ahí.</p>" +
           "<p>La mitad gris de la imagen es la misma respuesta dos veces. Una grabación es una lista " +
           "de números reales, y la transformada de números reales es simétrica respecto al centro: " +
           "la barra de 20 kHz es la de 4 kHz reflejada, y no aporta nada nuevo. Por eso solo se " +
           "guarda la primera mitad más uno, que es de donde salen las 513 filas de la matriz. " +
           "<a href='https://www.youtube.com/watch?v=spUNpyF58BY'>3Blue1Brown construye esta " +
           "transformada a partir de un vector que gira</a> si quieres la maquinaria.</p>",
        predict: "Antes de mover el tamaño de ventana: duplicar N duplica el número de barras. ¿Llegan más alto en frecuencia, o se juntan más?",
        kOf: (k) => k === 1 ? "la más fuerte" : "las " + k + " más fuertes",
        playK: (k) => k + (k === 1 ? " sinusoide" : " sinusoides"),
        axFrame: "el marco", axSynth: (k) => "reconstruido con " + k,
        axKept: (F) => F + " bins guardados", axMirror: "imagen especular, descartada",
        controls: {size: "Tamaño de ventana (N)", k: "Componentes para reconstruir (k)",
                   win: "Forma de ventana", pos: "Dónde se corta el marco"},
        options: {win: {hann: "Hann", hamming: "Hamming", rect: "rectangular (sin perfil)"}},
        readout: (N, F, binHz, peakBin, peakHz, k, share, nyq, err) =>
          "Un marco de <b>" + N.toLocaleString("es") + "</b> muestras da <b>" + N.toLocaleString("es") +
          "</b> bins de 0 a " + (nyq * 2 / 1000).toFixed(0) + " kHz, uno cada <b>" +
          binHz.toFixed(1).replace(".", ",") + " Hz</b>, pero la mitad de arriba refleja la de abajo, " +
          "así que se guardan <b>" + F + "</b>, hasta " + (nyq / 1000).toFixed(0) + " kHz. El más " +
          "fuerte es el bin <b>" + peakBin + "</b>, que son <b>" + peakHz.toFixed(0) + " Hz</b>. Las <b>" +
          k + "</b> más fuertes llevan el <b>" + (share * 100).toFixed(1).replace(".", ",") +
          " %</b> de la energía de este marco, y la línea reconstruida todavía está " +
          (err < 0.0005
            ? "<b>exactamente sobre el marco</b>: se guardan todos los bins, así que no se aproximó nada."
            : "a <b>" + (err * 100).toFixed(1).replace(".", ",") + " %</b> de la altura del propio marco."),
        aria: (ctx) => {
          const s = ctx.state, F = (s.N >> 1) + 1;
          return "Un marco de " + s.N + " muestras sobre las magnitudes de sus " + s.N +
                 " bins de frecuencia, con los primeros " + F + " guardados y el resto en gris como " +
                 "imagen especular, y las " + s.synthK + " más fuertes resaltadas.";
        }
      }
    }
  });
})();
