// Scene 1: how a 1-D signal becomes a 2-D matrix.
//
// The reader moves a window along the waveform and watches one column of the
// matrix be the answer to "which frequencies are in this slice". The controls
// are the three numbers that decide the matrix's shape -- window size, how far
// it hops, and which taper -- so the shape tag moves while they drag, and the
// claim on the stage is the shape itself.
//
// Playing here rebuilds the signal from the matrix rather than playing the
// recording, because the point of the scene is that nothing was lost: a
// spectrogram is a change of basis, not a picture of one. Set the overlap to
// none with a tapered window and the rebuild clicks, audibly, which is the
// reason the overlap is there.
(function () {
  "use strict";

  const SIZES = [256, 512, 1024, 2048];
  const OVERLAPS = {none: 1, half: 2, quarter: 4};   // hop = N / this

  function recompute(ctx) {
    const s = ctx.state;
    const N = SIZES[s.size];
    const hop = Math.max(1, Math.round(N / OVERLAPS[s.overlap]));
    const key = N + ":" + hop + ":" + s.win;
    if (s.key === key) return;
    const st = ctx.AC.stft(ctx.signal, N, hop, s.win);
    s.key = key;
    s.N = N; s.hop = hop;
    s.stft = st;
    s.mag = ctx.AC.magnitude(st.Z, st.F, st.T);
    s.img = null;
  }

  const frameOf = (ctx) =>
    Math.min(ctx.state.stft.T - 1, Math.round(ctx.state.pos / 1000 * (ctx.state.stft.T - 1)));

  window.VoiceScenes.register({
    id: "window",
    section: "E",

    controls: [
      {id: "size", type: "range", min: 0, max: 3, step: 1,
       fmt: (v) => SIZES[v] + " samples"},
      {id: "overlap", type: "select", options: ["none", "half", "quarter"]},
      {id: "win", type: "select", options: ["hann", "hamming", "rect"]},
      {id: "pos", type: "range", min: 0, max: 1000, step: 1,
       fmt: (v, ctx) => {
         if (!ctx.state.stft) return "";
         const t = frameOf(ctx) * ctx.state.hop / ctx.rate;
         return t.toFixed(2) + " s";
       }}
    ],

    sync(ctx) { recompute(ctx); },

    init(ctx) {
      Object.assign(ctx.state, {size: 2, overlap: "half", win: "hann", pos: 380});
      recompute(ctx);
    },

    reset(ctx) {
      Object.assign(ctx.state, {size: 2, overlap: "half", win: "hann", pos: 380, key: null});
      recompute(ctx);
    },

    draw(ctx) {
      const g = ctx.g, K = ctx.K, W = ctx.W, H = ctx.H;
      const st = ctx.state.stft, mag = ctx.state.mag;
      const L = 52, R = 84, TOP = 14, BOT = 22;
      const waveH = Math.max(36, H * 0.2);
      const specY = TOP + waveH + 12;
      const specH = Math.max(40, H - specY - BOT);
      const plotW = Math.max(10, W - L - R);
      const f = frameOf(ctx);

      // The waveform, with the active window on it.
      K.waveform(g, ctx.signal, {x: L, y: TOP, w: plotW, h: waveH}, ctx.colour("--v-sig"));
      const winX = L + (f * ctx.state.hop / ctx.signal.length) * plotW;
      const winW = Math.max(2, (ctx.state.N / ctx.signal.length) * plotW);
      g.fillStyle = "rgba(255, 216, 77, 0.28)";
      g.fillRect(winX, TOP, winW, waveH);
      g.strokeStyle = ctx.colour("--v-sig");
      g.lineWidth = 1;
      g.strokeRect(winX + 0.5, TOP + 0.5, winW, waveH - 1);

      // The matrix.
      if (!ctx.state.img) {
        ctx.state.img = K.spectrogramImage(mag, st.F, st.T, {floorDb: -70});
      }
      K.blit(g, ctx.state.img, ctx.cache, L, specY, plotW, specH);

      // The column the window is over.
      const colX = L + (f + 0.5) / st.T * plotW;
      g.strokeStyle = ctx.colour("--v-axis");
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(colX, specY); g.lineTo(colX, specY + specH); g.stroke();

      // That column on its own, frequency upward, to the right of the matrix.
      const stripX = L + plotW + 10, stripW = R - 18;
      let peak = 1e-12, peakF = 0;
      for (let i = 0; i < st.F; i++) {
        const v = mag[i * st.T + f];
        if (v > peak) { peak = v; peakF = i; }
      }
      g.fillStyle = ctx.colour("--v-out");
      for (let i = 0; i < st.F; i++) {
        const v = mag[i * st.T + f] / peak;
        const y = specY + specH - (i + 1) / st.F * specH;
        g.fillRect(stripX, y, Math.max(0.5, v * stripW), Math.max(1, specH / st.F));
      }

      // Axes. Frequency in kHz up the left, time in seconds along the bottom.
      // The unit rides on the topmost tick rather than sitting above it: as a
      // separate label it landed on the Nyquist tick and hid it.
      const nyq = ctx.rate / 2000;
      for (let i = 0; i <= 4; i++) {
        const y = specY + specH - (i / 4) * specH;
        const text = (nyq * i / 4).toFixed(0) + (i === 4 ? " kHz" : "");
        K.label(g, text, 6, Math.max(specY - 6, y - 7), ctx.colour("--stage-mute"), {size: 10});
      }
      const dur = ctx.signal.length / ctx.rate;
      for (let i = 0; i <= 4; i++) {
        const x = L + (i / 4) * plotW;
        K.label(g, (dur * i / 4).toFixed(1) + "s", x, specY + specH + 4, ctx.colour("--stage-mute"),
                {size: 10, right: i === 4});
      }
      K.label(g, "[" + st.F + ", " + st.T + "]", L, specY + 6, ctx.colour("--v-axis"),
              {size: 12, mono: true});
      K.label(g, (peakF * ctx.rate / ctx.state.N).toFixed(0) + " Hz",
              W - 6, specY + 6, ctx.colour("--v-out"), {size: 11, mono: true, right: true});
    },

    audio(ctx) {
      const st = ctx.state.stft;
      const out = ctx.AC.istft(st.Z, st.F, st.T, ctx.state.N, ctx.state.hop,
                               ctx.state.win, ctx.signal.length);
      return {samples: out, what: ctx.copy.rebuilt};
    },

    readout(ctx) {
      const st = ctx.state.stft, f = frameOf(ctx);
      let peak = 1e-12, peakF = 0;
      for (let i = 0; i < st.F; i++) {
        const v = ctx.state.mag[i * st.T + f];
        if (v > peak) { peak = v; peakF = i; }
      }
      const hz = peakF * ctx.rate / ctx.state.N;
      const secs = f * ctx.state.hop / ctx.rate;
      // A tapered window that never overlaps leaves gaps the inverse cannot
      // fill. Worth saying, because it is what the rebuild sounds like.
      const gapped = ctx.state.win !== "rect" && ctx.state.hop >= ctx.state.N;
      return {
        html: ctx.copy.readout(st.F, st.T, ctx.state.N, ctx.state.hop, secs, hz, gapped),
        data: {
          shape: st.F + "," + st.T,
          n: ctx.state.N,
          hop: ctx.state.hop,
          win: ctx.state.win,
          frame: f,
          peakhz: hz.toFixed(0)
        }
      };
    },

    copy: {
      en: {
        tab: "Window & hop",
        k: "Short-time Fourier transform · Appendix E",
        h: "A window slides, and each stop is one column",
        claim: "x[n] → X[f, t]",
        concept: "Cut the signal into short overlapping windows and ask which frequencies are in " +
                 "each one. The answers, stacked side by side, are a matrix: frequency down, time " +
                 "across. Nothing is lost — the transform is invertible.",
        b: "The yellow band is the window the transform is looking through right now, and the " +
           "line in the matrix below is the column it produces. Drag the window along the " +
           "recording and watch the column move with it. Then change the window size and the hop " +
           "and watch the shape tag change: a shorter hop means more columns, for the same voice.",
        predict: "Before you drag: halve the hop. Does the matrix get taller, or wider?",
        rebuilt: "the signal rebuilt from the matrix",
        controls: {size: "Window size (N)", overlap: "Overlap", win: "Window shape",
                   pos: "Window position"},
        options: {
          overlap: {none: "none — hop = N", half: "half — hop = N/2", quarter: "three quarters — hop = N/4"},
          win: {hann: "Hann", hamming: "Hamming", rect: "rectangular (none)"}
        },
        readout: (F, T, N, hop, secs, hz, gapped) =>
          "A window of <b>" + N + "</b> samples hopping <b>" + hop + "</b> gives a " +
          "<span class=\"shape\">[" + F + ", " + T + "]</span> matrix — " + F +
          " frequencies by " + T + " time steps. The window is at <b>" + secs.toFixed(2) +
          " s</b>, and the loudest frequency in it is <b>" + hz.toFixed(0) + " Hz</b>." +
          (gapped
            ? " <span class=\"fault\">This window tapers to zero at both ends and never overlaps, " +
              "so the gaps between windows are gone for good — press play and you will hear them.</span>"
            : ""),
        aria: (ctx) => {
          const st = ctx.state.stft, f = frameOf(ctx);
          return "A waveform above a spectrogram. The window of " + ctx.state.N +
                 " samples is at " + (f * ctx.state.hop / ctx.rate).toFixed(2) +
                 " seconds, producing column " + (f + 1) + " of a " + st.F + " by " + st.T +
                 " matrix.";
        }
      },
      es: {
        tab: "Ventana y salto",
        k: "Transformada de Fourier de tiempo corto · Apéndice E",
        h: "Una ventana se desliza y cada parada es una columna",
        claim: "x[n] → X[f, t]",
        concept: "Corta la señal en ventanas cortas superpuestas y pregunta qué frecuencias hay en " +
                 "cada una. Las respuestas, apiladas una junto a otra, son una matriz: frecuencia " +
                 "hacia abajo, tiempo a lo ancho. No se pierde nada: la transformada es invertible.",
        b: "La banda amarilla es la ventana por la que mira la transformada ahora mismo, y la " +
           "línea en la matriz de abajo es la columna que produce. Arrastra la ventana por la " +
           "grabación y observa cómo la columna la sigue. Después cambia el tamaño de la ventana y " +
           "el salto, y mira cómo cambia la etiqueta de forma: un salto más corto significa más " +
           "columnas, para la misma voz.",
        predict: "Antes de arrastrar: reduce el salto a la mitad. ¿La matriz se hace más alta o más ancha?",
        rebuilt: "la señal reconstruida a partir de la matriz",
        controls: {size: "Tamaño de ventana (N)", overlap: "Superposición", win: "Forma de ventana",
                   pos: "Posición de la ventana"},
        options: {
          overlap: {none: "ninguna — salto = N", half: "mitad — salto = N/2", quarter: "tres cuartos — salto = N/4"},
          win: {hann: "Hann", hamming: "Hamming", rect: "rectangular (ninguna)"}
        },
        readout: (F, T, N, hop, secs, hz, gapped) =>
          "Una ventana de <b>" + N + "</b> muestras con salto <b>" + hop + "</b> da una matriz " +
          "<span class=\"shape\">[" + F + ", " + T + "]</span>: " + F + " frecuencias por " + T +
          " pasos de tiempo. La ventana está en <b>" + secs.toFixed(2) +
          " s</b>, y la frecuencia más fuerte en ella es <b>" + hz.toFixed(0) + " Hz</b>." +
          (gapped
            ? " <span class=\"fault\">Esta ventana decae a cero en ambos extremos y nunca se " +
              "superpone, así que los huecos entre ventanas se han perdido: pulsa reproducir y los oirás.</span>"
            : ""),
        aria: (ctx) => {
          const st = ctx.state.stft, f = frameOf(ctx);
          return "Una forma de onda sobre un espectrograma. La ventana de " + ctx.state.N +
                 " muestras está en " + (f * ctx.state.hop / ctx.rate).toFixed(2) +
                 " segundos, y produce la columna " + (f + 1) + " de una matriz de " + st.F +
                 " por " + st.T + ".";
        }
      }
    }
  });
})();
