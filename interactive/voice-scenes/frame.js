// Scene 4: one window is N numbers cut out of the array.
//
// The transform scenes after this one hand a *frame* to an FFT, and until
// this picture existed the page never showed one: the spectrogram scene went
// from a waveform straight to a matrix, and "window" was a word in a control
// label. Here the window is the only thing on the stage -- the N raw samples
// in yellow, the window shape over them in blue, and their product in purple,
// which is the array the transform actually receives.
//
// Play loops that one frame for a second. That is the lesson you can hear: a
// rectangular window cuts mid-swing, so every repeat begins with a jump and
// the loop buzzes at rate/N; a tapered one starts and ends at zero and does
// not. Nobody has to be told which is which.
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
    if (s.f && s.key === key) return;
    s.f = ctx.AC.frame(ctx.signal, i0, N, s.win);
    s.N = N;
    s.i0 = i0;
    s.key = key;
  }

  window.VoiceScenes.register({
    id: "frame",
    section: "E",
    part: {en: "From numbers to a matrix", es: "De los números a una matriz"},
    posControl: "pos",

    controls: [
      {id: "size", type: "range", min: 0, max: 3, step: 1,
       fmt: (v, ctx) => SIZES[v] + " (" + (SIZES[v] / ctx.rate * 1000).toFixed(1) + " ms)"},
      {id: "win", type: "select", options: ["hann", "hamming", "rect"]},
      {id: "pos", type: "range", min: 0, max: 1000, step: 1,
       fmt: (v, ctx) => ctx.state.i0 === undefined ? ""
         : (ctx.state.i0 / ctx.rate).toFixed(3) + " s"}
    ],

    init(ctx) { Object.assign(ctx.state, {size: 2, win: "hann", pos: 380, key: null}); },
    reset(ctx) { Object.assign(ctx.state, {size: 2, win: "hann", pos: 380, key: null}); },
    sync(ctx) { build(ctx); },

    region(ctx) { return {i0: ctx.state.i0, i1: ctx.state.i0 + ctx.state.N}; },
    animates(ctx) { return ctx.head() >= 0; },
    // Play loops this one frame rather than the recording, so the strip
    // under the stage must not draw a playhead running along the whole clip.
    loopAudio: true,
    playLabel(ctx) { return ctx.copy.playFrame(ctx.copy.options.win[ctx.state.win]); },

    draw(ctx) {
      const g = ctx.g, K = ctx.K, W = ctx.W, H = ctx.H;
      const s = ctx.state, f = s.f, N = s.N;
      const L = 44, R = 16, TOP = 40, BOT = 34;
      const pw = Math.max(10, W - L - R), ph = Math.max(10, H - TOP - BOT);
      const mid = TOP + ph / 2;
      // Everything is drawn against the loudest raw sample in this frame, so
      // a quiet stretch of the recording is not a flat line.
      let peak = 1e-3;
      for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(f.raw[i]));
      const X = (i) => L + (i / (N - 1)) * pw;
      const Y = (v) => mid - (v / peak) * (ph / 2 - 6);
      const step = Math.max(1, Math.floor(N / pw / 2));

      // The zero line and the axis.
      g.strokeStyle = K.css("--stage-mute");
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(L, Math.round(mid) + 0.5); g.lineTo(L + pw, Math.round(mid) + 0.5);
      g.stroke();

      // The window shape, as an envelope above and below zero: the factor
      // every sample is about to be multiplied by.
      g.strokeStyle = K.css("--v-axis");
      g.lineWidth = 1.5;
      for (const sign of [1, -1]) {
        g.beginPath();
        for (let i = 0; i < N; i += step) {
          const x = X(i), y = mid - sign * f.w[i] * (ph / 2 - 6);
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
      }

      // The raw samples, faint, and the tapered ones over them: the gap
      // between the two lines at the edges is what the window did.
      g.strokeStyle = K.css("--stage-mute");
      g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i < N; i += step) {
        const x = X(i), y = Y(f.raw[i]);
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();

      g.strokeStyle = K.css("--v-out");
      g.lineWidth = 1.6;
      g.beginPath();
      for (let i = 0; i < N; i += step) {
        const x = X(i), y = Y(f.tapered[i]);
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();

      // Where the frame starts and stops, and by how much it steps into the
      // recording: the two ends are the whole argument for the taper.
      g.strokeStyle = K.css("--v-sig");
      g.lineWidth = 1;
      for (const x of [L, L + pw]) {
        g.beginPath(); g.moveTo(Math.round(x) + 0.5, TOP); g.lineTo(Math.round(x) + 0.5, TOP + ph); g.stroke();
      }

      // The key runs along the bottom, not the top: the claim card is an HTML
      // element pinned to the stage's top left, and a label drawn at L there
      // sat underneath it.
      let kx = L;
      for (const [text, token] of [["x[n]", "--stage-mute"], ["w[n]", "--v-axis"],
                                   ["x[n]·w[n]", "--v-out"]]) {
        kx += K.label(g, text, kx, TOP + ph + 16, K.css(token), {size: 10, mono: true}) + 8;
      }
      K.label(g, "N = " + N, W - 6, TOP - 18, K.css("--v-sig"), {size: 12, mono: true, right: true});
      K.label(g, (s.i0 / ctx.rate).toFixed(3) + " s", W - 6, TOP + ph + 16, K.css("--stage-ink"),
              {size: 10, mono: true, right: true});
      K.label(g, "n = 0", L, TOP + ph + 3, K.css("--stage-mute"), {size: 10, mono: true});
      K.label(g, "n = " + (N - 1), L + pw, TOP + ph + 3, K.css("--stage-mute"),
              {size: 10, mono: true, right: true});

      // The playhead, while the loop runs: it crosses this one frame over and
      // over, which is what the sound is doing.
      const h = ctx.head();
      if (h >= 0) {
        const into = (h * ctx.rate) % N;
        K.playhead(g, X(into), TOP, TOP + ph, ctx.colour("--v-sig"));
      }
    },

    audio(ctx) {
      const s = ctx.state;
      return {samples: ctx.AC.loop(s.f.tapered, Math.round(LOOP_SECS * ctx.rate)),
              what: ctx.copy.playFrame(ctx.copy.options.win[s.win])};
    },

    shape(ctx) { const N = ctx.state.N; return N ? "[" + N + "]" : ""; },

    readout(ctx) {
      const s = ctx.state, N = s.N;
      const ms = N / ctx.rate * 1000;
      const reps = Math.round(ctx.rate / N);
      // How much of the frame the window has scaled below a half: the width
      // of the taper, as a fact rather than an adjective.
      let dimmed = 0;
      for (let i = 0; i < N; i++) if (s.f.w[i] < 0.5) dimmed++;
      const ends = Math.abs(s.f.tapered[0]) + Math.abs(s.f.tapered[N - 1]);
      return {
        html: ctx.copy.readout(N, ms, s.i0, s.i0 / ctx.rate, s.win, dimmed, reps, ends),
        claim: "xₜ[n] = x[t·H + n] · w[n],  xₜ.shape = (" + N + ",)",
        data: {
          n: N, win: s.win, i0: s.i0, ms: ms.toFixed(1),
          dimmed: dimmed, reps: reps, ends: ends.toExponential(2)
        }
      };
    },

    copy: {
      en: {
        tab: "One window",
        k: "The window · Appendix E",
        h: "One window is N numbers cut out of the array",
        claim: "xₜ[n] = x[t·H + n] · w[n],  xₜ.shape = (N,)",
        concept: "The transform is not given the recording. It is given a short run of consecutive " +
                 "samples — a frame — multiplied by a window: a taper that is zero at both ends and " +
                 "one in the middle. The frame is what everything after this point operates on.",
        b: "<p>Switch the window to rectangular and press play. The frame repeats 47 times a second " +
           "and you hear a buzz at exactly that rate. Nothing is wrong with the samples: the cut is " +
           "what you are hearing. A frame taken at an arbitrary moment starts and ends mid-swing, so " +
           "every repeat begins with a jump, and a jump is a click.</p>" +
           "<p>Switch back to Hann. The blue envelope is the window, the purple line is every sample " +
           "multiplied by it, and both ends are now zero — the frame begins and ends in silence, so " +
           "the repeats join without a seam. That is the entire reason for the taper, and the price " +
           "is on the next picture.</p>",
        predict: "Before you press play: the rectangular window keeps every sample exactly as it is. Should it sound cleaner, then?",
        playFrame: (win) => "this frame on repeat (" + win + ")",
        controls: {size: "Window size (N)", win: "Window shape", pos: "Where the frame is cut"},
        options: {win: {hann: "Hann", hamming: "Hamming", rect: "rectangular (no taper)"}},
        readout: (N, ms, i0, secs, win, dimmed, reps, ends) =>
          "A frame of <b>" + N.toLocaleString("en") + "</b> samples is <b>" + ms.toFixed(1) +
          " ms</b>, starting at <span class=\"shape\">x[" + i0.toLocaleString("en") + "]</span> (" +
          secs.toFixed(3) + " s), and it repeats <b>" + reps + "</b> times a second when you play it. " +
          (win === "rect"
            ? "<span class=\"fault\">The rectangular window keeps every sample and ends at " +
              ends.toPrecision(2) + " rather than zero, so each repeat starts with a jump — that is the buzz.</span>"
            : "The window scales " + dimmed.toLocaleString("en") + " of them below a half and both " +
              "ends to exactly zero, so the repeats join in silence."),
        aria: (ctx) => {
          const s = ctx.state;
          return "One frame of " + s.N + " samples from " + (s.i0 / ctx.rate).toFixed(3) +
                 " seconds: the raw samples, the " + s.win + " window over them, and their product, " +
                 "which tapers to zero at both ends.";
        }
      },
      es: {
        tab: "Una ventana",
        k: "La ventana · Apéndice E",
        h: "Una ventana son N números recortados del arreglo",
        claim: "xₜ[n] = x[t·H + n] · w[n],  xₜ.shape = (N,)",
        concept: "A la transformada no se le da la grabación. Se le da una tirada corta de muestras " +
                 "consecutivas —un marco— multiplicada por una ventana: un perfil que vale cero en " +
                 "los dos extremos y uno en el centro. El marco es sobre lo que opera todo lo que " +
                 "viene después.",
        b: "<p>Cambia la ventana a rectangular y pulsa reproducir. El marco se repite 47 veces por " +
           "segundo y oyes un zumbido exactamente a esa frecuencia. Las muestras no tienen nada malo: " +
           "lo que oyes es el corte. Un marco tomado en un momento cualquiera empieza y acaba a media " +
           "oscilación, así que cada repetición arranca con un salto, y un salto es un chasquido.</p>" +
           "<p>Vuelve a Hann. La envolvente azul es la ventana, la línea morada es cada muestra " +
           "multiplicada por ella, y ahora los dos extremos valen cero: el marco empieza y acaba en " +
           "silencio, así que las repeticiones se unen sin costura. Esa es toda la razón del perfil, " +
           "y el precio está en la imagen siguiente.</p>",
        predict: "Antes de reproducir: la ventana rectangular conserva cada muestra tal cual. ¿Debería sonar más limpia, entonces?",
        playFrame: (win) => "este marco en bucle (" + win + ")",
        controls: {size: "Tamaño de ventana (N)", win: "Forma de ventana", pos: "Dónde se corta el marco"},
        options: {win: {hann: "Hann", hamming: "Hamming", rect: "rectangular (sin perfil)"}},
        readout: (N, ms, i0, secs, win, dimmed, reps, ends) =>
          "Un marco de <b>" + N.toLocaleString("es") + "</b> muestras son <b>" +
          ms.toFixed(1).replace(".", ",") + " ms</b>, que empiezan en <span class=\"shape\">x[" +
          i0.toLocaleString("es") + "]</span> (" + secs.toFixed(3).replace(".", ",") +
          " s), y se repite <b>" + reps + "</b> veces por segundo al reproducirlo. " +
          (win === "rect"
            ? "<span class=\"fault\">La ventana rectangular conserva cada muestra y termina en " +
              ends.toPrecision(2).replace(".", ",") + " en vez de cero, así que cada repetición " +
              "arranca con un salto: ese es el zumbido.</span>"
            : "La ventana reduce " + dimmed.toLocaleString("es") + " de ellas por debajo de la mitad " +
              "y los dos extremos a cero exacto, así que las repeticiones se unen en silencio."),
        aria: (ctx) => {
          const s = ctx.state;
          return "Un marco de " + s.N + " muestras desde " + (s.i0 / ctx.rate).toFixed(3).replace(".", ",") +
                 " segundos: las muestras crudas, la ventana " + s.win + " sobre ellas, y su producto, " +
                 "que decae a cero en los dos extremos.";
        }
      }
    }
  });
})();
