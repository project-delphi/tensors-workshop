// Scene 6: the window hops along, and every stop is one column.
//
// By the time a reader reaches this picture they have seen one frame (the
// frame scene) and the transform of it (the spectrum scene). This is the
// only new idea left: do that at every hop and stand the answers side by
// side. So the stage draws the hop -- the neighbouring windows as overlapping
// humps on the waveform, which is what "50% overlap" means and what no
// fraction in a control label ever conveyed -- and the column the current
// window produces, beside the matrix it belongs to.
//
// The entrance fills the matrix in column by column while the band walks the
// recording, once, because that is the sentence the picture is making.
//
// Playing rebuilds the signal from the matrix rather than playing the
// recording, because the point is that nothing was lost: a spectrogram is a
// change of basis, not a picture of one. Set the overlap to none with a
// tapered window and the rebuild clicks, audibly, which is the reason the
// overlap is there.
(function () {
  "use strict";

  const SIZES = [256, 512, 1024, 2048];
  const OVERLAPS = {none: 1, half: 2, quarter: 4};   // hop = N / this
  const REVEAL_MS = 2600;

  function recompute(ctx) {
    const s = ctx.state;
    const N = SIZES[s.size];
    const hop = Math.max(1, Math.round(N / OVERLAPS[s.overlap]));
    const key = ctx.source + ":" + N + ":" + hop + ":" + s.win;
    if (s.key === key) return;
    const st = ctx.AC.stft(ctx.signal, N, hop, s.win);
    s.key = key;
    s.N = N; s.hop = hop;
    s.stft = st;
    s.shape = ctx.AC.stftShape(ctx.signal.length, N, hop);
    s.mag = ctx.AC.magnitude(st.Z, st.F, st.T);
    s.w = ctx.AC.windowOf(s.win, N);
    s.img = null;
    s.peakRow = null;
  }

  // The loudest bin in the whole matrix, for the band that shows what f is.
  // The current window's own peak would do, except that the scene opens on
  // the tail of the recording, where it is bin 0 and the band lands under the
  // time axis looking like part of it.
  function peakRow(ctx) {
    const s = ctx.state;
    if (s.peakRow !== null && s.peakRow !== undefined) return s.peakRow;
    const st = s.stft, mag = s.mag;
    let best = -1, at = 0;
    for (let f = 0; f < st.F; f++) {
      let row = 0;
      for (let t = 0; t < st.T; t++) row += mag[f * st.T + t];
      if (row > best) { best = row; at = f; }
    }
    s.peakRow = at;
    return at;
  }

  const frameOf = (ctx) =>
    Math.min(ctx.state.stft.T - 1, Math.round(ctx.state.pos / 1000 * (ctx.state.stft.T - 1)));

  // How many columns of the matrix are on the stage: all of them, unless the
  // entrance is still running.
  function shownCols(ctx) {
    const s = ctx.state;
    if (!s.reveal) return s.stft.T;
    const t = ctx.LC.tweenAt(s.reveal, ctx.now());
    if (t.done) { s.reveal = null; return s.stft.T; }
    return Math.max(1, Math.round(t.value * s.stft.T));
  }

  window.VoiceScenes.register({
    id: "window",
    section: "E",
    posControl: "pos",

    controls: [
      {id: "size", type: "range", min: 0, max: 3, step: 1,
       fmt: (v, ctx) => SIZES[v] + " (" + (SIZES[v] / ctx.rate * 1000).toFixed(1) + " ms)"},
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
      Object.assign(ctx.state, {size: 2, overlap: "half", win: "hann", pos: 380, key: null, reveal: null});
    },

    reset(ctx) {
      Object.assign(ctx.state, {size: 2, overlap: "half", win: "hann", pos: 380, key: null, reveal: null});
    },

    // The matrix fills in, column by column, the first time the reader
    // reaches this picture: a spectrogram is built one window at a time, and
    // an image that is simply there does not say so.
    arrive(ctx) {
      recompute(ctx);
      ctx.state.reveal = ctx.LC.tweenStart(0, 1, ctx.now(), REVEAL_MS);
    },

    animates(ctx) { return !!ctx.state.reveal || ctx.head() >= 0; },

    region(ctx) {
      const f = frameOf(ctx);
      return {i0: f * ctx.state.hop, i1: f * ctx.state.hop + ctx.state.N};
    },
    playLabel(ctx) { return ctx.copy.rebuilt; },

    draw(ctx) {
      const g = ctx.g, K = ctx.K, W = ctx.W, H = ctx.H;
      const s = ctx.state, st = s.stft, mag = s.mag;
      const L = 52, R = 84, TOP = 34, BOT = 22;
      const waveH = Math.max(40, H * 0.22);
      const specY = TOP + waveH + 14;
      const specH = Math.max(40, H - specY - BOT);
      const plotW = Math.max(10, W - L - R);
      // While the entrance runs the window walks with it, so the band and
      // the columns are telling one story rather than two.
      const cols = shownCols(ctx);
      const f = s.reveal ? Math.max(0, cols - 1) : frameOf(ctx);

      // The waveform *near the window*, not the whole recording: at 4.9
      // seconds across, one window is three pixels wide and the overlap --
      // the thing this picture exists to show -- cannot be seen at all. The
      // whole recording is the strip under the stage, and the band on it
      // says where this close-up is taken from.
      const NEAR = 2;                                    // windows drawn either side
      const span = s.N + 2 * NEAR * s.hop;
      let a0 = f * s.hop - NEAR * s.hop;
      a0 = Math.max(0, Math.min(Math.max(0, ctx.signal.length - span), a0));
      const pxPerSample = plotW / span;
      K.waveform(g, ctx.signal.subarray(a0, Math.min(ctx.signal.length, a0 + span)),
                 {x: L, y: TOP, w: plotW, h: waveH}, ctx.colour("--v-sig"));

      const winX = L + (f * s.hop - a0) * pxPerSample;
      const winW = Math.max(2, s.N * pxPerSample);
      g.fillStyle = "rgba(255, 216, 77, 0.28)";
      g.fillRect(winX, TOP, winW, waveH);

      // The neighbouring windows, as the humps they are: where they cross is
      // the overlap, and at hop = N they do not cross at all.
      const near = [];
      for (let d = -NEAR; d <= NEAR; d++) {
        const idx = f + d;
        if (idx >= 0 && idx < st.T) near.push({idx: idx, start: idx * s.hop - a0});
      }
      K.humps(g, s.w, near.map((n) => n.start), near.findIndex((n) => n.idx === f),
              {x: L, y: TOP, h: waveH}, pxPerSample,
              "rgba(88, 196, 221, 0.5)", ctx.colour("--v-axis"));
      K.label(g, (a0 / ctx.rate).toFixed(2) + "–" + ((a0 + span) / ctx.rate).toFixed(2) + " s",
              L + plotW, TOP + waveH - 13, ctx.colour("--stage-mute"), {size: 10, right: true});

      // The matrix.
      if (!ctx.state.img) {
        ctx.state.img = K.spectrogramImage(mag, st.F, st.T, {floorDb: -70});
      }
      const shownW = plotW * (cols / st.T);
      K.blit(g, ctx.state.img, ctx.cache, L, specY, plotW, specH);
      if (cols < st.T) {
        // The columns that have not arrived yet are the stage's own black.
        g.fillStyle = K.css("--stage");
        g.fillRect(L + shownW, specY, plotW - shownW + 1, specH);
      }

      // The column the window is over.
      const colX = L + (f + 0.5) / st.T * plotW;
      g.strokeStyle = ctx.colour("--v-axis");
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(colX, specY); g.lineTo(colX, specY + specH); g.stroke();

      // That column on its own, frequency upward, to the right of the matrix:
      // the picture the previous scene drew, stood on its end.
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
      K.label(g, (peakF * ctx.rate / s.N).toFixed(0) + " Hz",
              W - 6, specY + 6, ctx.colour("--v-out"), {size: 11, mono: true, right: true});

      // Pointing at f or t in the equation above bands the extent that letter
      // measures -- a row of the matrix for a frequency bin, a column for a
      // frame. This is what ties a letter to the pixels it stands for, and it
      // is drawn over the matrix but under the playhead.
      if (ctx.hl === "freq" || ctx.hl === "time") {
        const lit = ctx.colour("--v-comp");
        g.strokeStyle = lit;
        g.lineWidth = 2;
        if (ctx.hl === "freq") {
          const pr = peakRow(ctx);
          const rowH = Math.max(3, specH / st.F);
          const y = specY + specH - (pr + 1) / st.F * specH;
          g.strokeRect(L, y - 0.5, plotW, rowH + 1);
          K.label(g, "f = " + pr + "  (" + (pr * ctx.rate / s.N).toFixed(0) + " Hz)",
                  L + plotW, Math.max(specY + 6, y - 18), lit,
                  {size: 11, mono: true, right: true});
        } else {
          const colW = Math.max(2, plotW / st.T);
          const x = L + f / st.T * plotW;
          g.strokeRect(x - 0.5, specY, colW + 1, specH);
          K.label(g, "t = " + f, L, specY + 24, lit, {size: 11, mono: true});
        }
      }

      // Where the rebuilt signal has got to, on the waveform and across the
      // matrix: the same instant in both pictures.
      const h = ctx.head();
      if (h >= 0) {
        const hs = h * ctx.rate;
        const px = L + (hs - a0) * pxPerSample;
        if (px >= L && px <= L + plotW) K.playhead(g, px, TOP, TOP + waveH, ctx.colour("--v-out"));
        // Across the matrix the playhead is at the same instant, on the
        // whole-recording axis the spectrogram is drawn on.
        K.playhead(g, L + (hs / ctx.signal.length) * plotW, specY, specY + specH,
                   ctx.colour("--v-out"));
      }
    },

    audio(ctx) {
      const st = ctx.state.stft;
      const out = ctx.AC.istft(st.Z, st.F, st.T, ctx.state.N, ctx.state.hop,
                               ctx.state.win, ctx.signal.length);
      return {samples: out, what: ctx.copy.rebuilt};
    },

    readout(ctx) {
      const s = ctx.state, st = s.stft, f = frameOf(ctx);
      let peak = 1e-12, peakF = 0;
      for (let i = 0; i < st.F; i++) {
        const v = s.mag[i * st.T + f];
        if (v > peak) { peak = v; peakF = i; }
      }
      const hz = peakF * ctx.rate / s.N;
      const secs = f * s.hop / ctx.rate;
      const overlap = Math.max(0, s.N - s.hop);
      // A tapered window that never overlaps leaves gaps the inverse cannot
      // fill. Worth saying, because it is what the rebuild sounds like.
      const gapped = s.win !== "rect" && s.hop >= s.N;
      return {
        html: ctx.copy.readout(st.F, st.T, s.N, s.hop, secs, hz, gapped, s.shape.padded, overlap),
        // The whole point of this picture, said in shapes: a control moves and
        // the arrow moves with it, so the card cannot go stale under the hop.
        claim: "x[n] → X[f, t],  (" + ctx.signal.length + ",) → (" + st.F + ", " + st.T + ")",
        data: {
          shape: st.F + "," + st.T,
          n: s.N,
          hop: s.hop,
          win: s.win,
          frame: f,
          padded: s.shape.padded,
          overlap: overlap,
          peakhz: hz.toFixed(0)
        }
      };
    },

    copy: {
      en: {
        tab: "Hop",
        k: "Hop and the spectrogram · Appendix E",
        h: "The window hops along, and every stop is one column",
        claim: "x[n] → X[f, t]",
        concept: "Take the transform of one frame, move the window along by a fixed hop, and take " +
                 "it again. The answers, stacked side by side, are a matrix: frequency down, time " +
                 "across. Nothing is lost — with enough overlap the transform is invertible.",
        b: "<p>The blue humps on the waveform are the windows either side of the one you are on. At " +
           "a hop of half the window they cross halfway up, so every sample is covered twice and the " +
           "taper that scaled it down in one frame scales it up in the next. Set the overlap to none " +
           "and the humps separate: now the samples under each dip are scaled towards zero and " +
           "nothing puts them back. Press play — that is the clicking.</p>" +
           "<p>Each stop of the window is one column of the matrix, marked in blue, and the strip on " +
           "the right is that column on its own: the bars of the previous picture, stood on end. " +
           "Change the window size and the hop and watch the shape tag move — a shorter hop means " +
           "more columns for the same voice, and the box below counts them.</p>",
        eqcap: "f picks a frequency bin and t picks a frame, so X[f, t] is one cell of the " +
               "matrix below — point at either letter to see which extent of the picture it " +
               "measures. H is the hop and w is the window shape, both of them controls here. " +
               "S is the magnitude of X, which is what the spectrogram actually draws.",
        predict: "Before you drag: halve the hop. Does the matrix get taller, or wider?",
        rebuilt: "the signal rebuilt from the matrix",
        controls: {size: "Window size (N)", overlap: "Overlap", win: "Window shape",
                   pos: "Where the window is"},
        options: {
          overlap: {none: "none — hop = N", half: "half — hop = N/2", quarter: "three quarters — hop = N/4"},
          win: {hann: "Hann", hamming: "Hamming", rect: "rectangular (none)"}
        },
        readout: (F, T, N, hop, secs, hz, gapped, padded, overlap) =>
          "Padded by half a window at each end, the array is " + padded.toLocaleString("en") +
          " long; a window of <b>" + N + "</b> samples hopping <b>" + hop + "</b> stops <b>" + T +
          "</b> times in it, and each stop answers with " + F + " frequencies — a " +
          "<span class=\"shape\">[" + F + ", " + T + "]</span> matrix. Neighbouring windows share <b>" +
          overlap.toLocaleString("en") + "</b> samples. The window is at <b>" + secs.toFixed(2) +
          " s</b>, and the loudest frequency in it is <b>" + hz.toFixed(0) + " Hz</b>." +
          (gapped
            ? " <span class=\"fault\">This window tapers to zero at both ends and never overlaps, " +
              "so the gaps between windows are gone for good — press play and you will hear them.</span>"
            : ""),
        aria: (ctx) => {
          const st = ctx.state.stft, f = frameOf(ctx);
          return "A waveform above a spectrogram. The window of " + ctx.state.N +
                 " samples is at " + (f * ctx.state.hop / ctx.rate).toFixed(2) +
                 " seconds, overlapping its neighbours, and producing column " + (f + 1) +
                 " of a " + st.F + " by " + st.T + " matrix.";
        }
      },
      es: {
        tab: "Salto",
        k: "El salto y el espectrograma · Apéndice E",
        h: "La ventana avanza, y cada parada es una columna",
        claim: "x[n] → X[f, t]",
        concept: "Transforma un marco, mueve la ventana un salto fijo y transforma otra vez. Las " +
                 "respuestas, apiladas una junto a otra, son una matriz: frecuencia hacia abajo, " +
                 "tiempo a lo ancho. No se pierde nada: con suficiente superposición la " +
                 "transformada es invertible.",
        b: "<p>Las jorobas azules sobre la onda son las ventanas a un lado y otro de la que estás " +
           "mirando. Con un salto de media ventana se cruzan a media altura, así que cada muestra " +
           "queda cubierta dos veces y el perfil que la redujo en un marco la realza en el " +
           "siguiente. Pon la superposición en ninguna y las jorobas se separan: ahora las muestras " +
           "bajo cada valle se reducen hacia cero y nada las devuelve. Pulsa reproducir: eso es el " +
           "chasquido.</p>" +
           "<p>Cada parada de la ventana es una columna de la matriz, marcada en azul, y la tira de " +
           "la derecha es esa columna sola: las barras de la imagen anterior, puestas de pie. Cambia " +
           "el tamaño de la ventana y el salto y mira moverse la etiqueta de forma: un salto más " +
           "corto significa más columnas para la misma voz, y la caja de abajo las cuenta.</p>",
        eqcap: "f elige un bin de frecuencia y t elige una trama, así que X[f, t] es una celda " +
               "de la matriz de abajo; señala cualquiera de las dos letras para ver qué extensión " +
               "de la imagen mide. H es el salto y w es la forma de la ventana, ambos controles " +
               "aquí. S es la magnitud de X, que es lo que dibuja el espectrograma.",
        predict: "Antes de arrastrar: reduce el salto a la mitad. ¿La matriz se hace más alta o más ancha?",
        rebuilt: "la señal reconstruida a partir de la matriz",
        controls: {size: "Tamaño de ventana (N)", overlap: "Superposición", win: "Forma de ventana",
                   pos: "Dónde está la ventana"},
        options: {
          overlap: {none: "ninguna — salto = N", half: "mitad — salto = N/2", quarter: "tres cuartos — salto = N/4"},
          win: {hann: "Hann", hamming: "Hamming", rect: "rectangular (ninguna)"}
        },
        readout: (F, T, N, hop, secs, hz, gapped, padded, overlap) =>
          "Rellenado con media ventana en cada extremo, el arreglo mide " + padded.toLocaleString("es") +
          "; una ventana de <b>" + N + "</b> muestras con salto <b>" + hop + "</b> para <b>" + T +
          "</b> veces dentro de él, y cada parada responde con " + F + " frecuencias: una matriz " +
          "<span class=\"shape\">[" + F + ", " + T + "]</span>. Las ventanas vecinas comparten <b>" +
          overlap.toLocaleString("es") + "</b> muestras. La ventana está en <b>" +
          secs.toFixed(2).replace(".", ",") + " s</b>, y la frecuencia más fuerte en ella es <b>" +
          hz.toFixed(0) + " Hz</b>." +
          (gapped
            ? " <span class=\"fault\">Esta ventana decae a cero en ambos extremos y nunca se " +
              "superpone, así que los huecos entre ventanas se han perdido: pulsa reproducir y los oirás.</span>"
            : ""),
        aria: (ctx) => {
          const st = ctx.state.stft, f = frameOf(ctx);
          return "Una forma de onda sobre un espectrograma. La ventana de " + ctx.state.N +
                 " muestras está en " + (f * ctx.state.hop / ctx.rate).toFixed(2).replace(".", ",") +
                 " segundos, superpuesta con sus vecinas, y produce la columna " + (f + 1) +
                 " de una matriz de " + st.F + " por " + st.T + ".";
        }
      }
    }
  });
})();
