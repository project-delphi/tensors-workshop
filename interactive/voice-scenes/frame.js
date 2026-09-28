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
    // The whole matrix this frame is one column of. There is no hop control
    // here -- the hop is the next picture's -- so the numbers are quoted at
    // the hop that picture opens on, which is what the caption says.
    s.hop = N >> 1;
    s.cost = ctx.AC.stftCost(N, s.hop, ctx.signal.length);
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

      // Pointing at a letter in the equation above bands what it measures on
      // this picture: n runs the width of the frame, H is the step to the
      // next column of the matrix, and t is which column this one is.
      if (ctx.hl === "samp" || ctx.hl === "hop" || ctx.hl === "time") {
        const lit = ctx.colour("--v-comp");
        if (ctx.hl === "samp") {
          K.span(g, L, L + pw, TOP + 8, lit, "n = 0 … " + (N - 1), {below: true});
        } else if (ctx.hl === "hop") {
          K.span(g, L, X(Math.min(N - 1, s.hop)), TOP + 8, lit, "H = " + s.hop, {below: true});
        } else {
          const t = Math.round(s.i0 / s.hop);
          g.strokeStyle = lit;
          g.lineWidth = 2;
          g.strokeRect(L - 0.5, TOP - 0.5, pw + 1, ph + 1);
          K.label(g, "t = " + t + " of " + s.cost.T, L + pw / 2, TOP + 8, lit,
                  {size: 11, mono: true, center: true});
        }
      }

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
          dimmed: dimmed, reps: reps, ends: ends.toExponential(2),
          // The matrix the equation above names. `reshape` is the one case
          // where stacking the frames copies nothing: at hop = N the columns
          // tile the padded signal instead of overlapping it.
          frames: s.cost.T, stride: s.hop, reshape: s.hop === N ? "1" : "0",
          fshape: N + "," + s.cost.T
        }
      };
    },

    // One frame and its window. `np.hanning(N + 1)[:-1]` is not fussiness:
    // np.hanning(N) is the *symmetric* window, w[0] == w[N-1] == 0, and
    // AC.windowOf builds the *periodic* one, 0.5 - 0.5*cos(2*pi*i/N), which
    // is what an STFT wants and what scipy's get_window returns. Dropping the
    // last point of the N+1 symmetric window is exactly that.
    code(ctx) {
      const s = ctx.state, c = ctx.copy.np, N = s.N, i0 = s.i0;
      const win = {hann: "np.hanning(N + 1)[:-1]", hamming: "np.hamming(N + 1)[:-1]",
                   rect: "np.ones(N)"}[s.win];
      return ctx.K.code([
        ["N = " + N, c.ms(N / ctx.rate * 1000)],
        ["w = " + win, c.win[s.win]],
        "",
        ["xt = x[" + i0 + ":" + (i0 + N) + "] * w", c.frame(N)],
        ["abs(xt[0]) + abs(xt[-1])", c.ends(Math.abs(s.f.tapered[0]) + Math.abs(s.f.tapered[N - 1]))]
      ]);
    },

    copy: {
      en: {
        tab: "One window",
        k: "The window · Appendix E",
        h: "One window is N numbers cut out of the array",
        claim: "xₜ[n] = x[t·H + n] · w[n],  xₜ.shape = (N,)",
        concept: "The transform is not given the whole recording. It is given a short run of " +
                 "consecutive samples — a <em>frame</em>, a few tens of milliseconds long — multiplied " +
                 "sample by sample by a <em>window</em>: a smooth taper that is zero at both ends and " +
                 "one in the middle. The usual one is the Hann window, a single raised cosine, " +
                 "w[n] = ½ − ½ cos(2πn/N). The windowed frame is what everything after this point " +
                 "operates on.",
        b: "<p>Switch the window to rectangular and press play. The frame repeats 47 times a second " +
           "and you hear a buzz at exactly that rate. Nothing is wrong with the samples: the cut is " +
           "what you are hearing. A frame taken at an arbitrary moment starts and ends mid-swing, so " +
           "every repeat begins with a jump, and a jump is a click.</p>" +
           "<p>Why is a loop the right test? Because it is exactly what the transform on the next " +
           "picture assumes. It describes N samples as a sum of waves that each fit a whole number " +
           "of cycles into the frame, so as far as the transform can tell, the frame is one period " +
           "of a signal that repeats for ever — the loop you are hearing. The seam is real to it " +
           "too. A sudden jump is built out of every frequency at once, so the transform of a " +
           "rectangular frame smears each true frequency across dozens of neighbouring ones: " +
           "<em>spectral leakage</em>. A pure tone that should be one bar becomes a hill, and a " +
           "quiet sound near a loud one is buried under the loud one's skirt.</p>" +
           "<p>Switch back to Hann. The blue envelope is the window, the purple line is every sample " +
           "multiplied by it, and both ends are now zero — the frame begins and ends in silence, so " +
           "the repeats join without a seam and the leakage falls away steeply. That is the entire " +
           "reason for the taper. Its price is that samples near the ends are turned down, so a " +
           "Hann frame hears its middle more than its edges; the hop picture shows how overlapping " +
           "the frames pays that back. Hamming is a tuned compromise that stops at 0.08 instead of " +
           "zero: it suppresses the leakage nearest a peak better than Hann and the far leakage " +
           "worse.</p>",
        eqcap: "𝒳 is every frame at once, one column per frame, and building it computes " +
               "nothing — 𝒳[n, t] is simply sample t·H + n of the recording, read at a " +
               "stride. H is the hop, the step from one column to the next; at H = N the columns tile " +
               "the padded signal without overlapping and the whole matrix is a plain reshape of it. " +
               "Point at a letter to see the extent it measures. The counts are quoted at H = N/2, " +
               "the hop the next picture opens on.",
        predict: "Before you press play: the rectangular window keeps every sample exactly as it is. Should it sound cleaner, then?",
        why: "Almost every spectrogram you will meet was computed through a Hann window: it is the " +
             "default in librosa and torchaudio and in the front end of speech models such as " +
             "Whisper. It is the cheapest fix for leakage there is — N multiplications per frame — " +
             "and it is what lets a transform tell a quiet sound from the edge of a loud one. The " +
             "frame length is a choice too. For speech it is usually 20 to 30 ms: short enough that " +
             "the sound is roughly steady inside it, since a vowel lasts longer than that, and long " +
             "enough to hold a couple of cycles of a low voice's pitch.",
        playFrame: (win) => "this frame on repeat (" + win + ")",
        np: {
          ms: (ms) => ms.toFixed(1) + " ms of sound",
          win: {hann: "periodic, not np.hanning(N)", hamming: "periodic, ends at 0.08",
                rect: "no taper at all"},
          frame: (n) => "(" + n + ",) — one column of the matrix",
          ends: (e) => "what the ends are worth: " + e.toExponential(2)
        },
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
        concept: "A la transformada no se le da la grabación entera. Se le da una tirada corta de muestras " +
                 "consecutivas —un <em>marco</em>, de unas pocas decenas de milisegundos— multiplicada muestra a " +
                 "muestra por una <em>ventana</em>: un perfil suave que vale cero en los dos extremos y uno en el " +
                 "centro. La habitual es la ventana de Hann, un único coseno elevado, w[n] = ½ − ½ cos(2πn/N). El " +
                 "marco con ventana es sobre lo que opera todo lo que viene después.",
        b: "<p>Cambia la ventana a rectangular y pulsa reproducir. El marco se repite 47 veces por " +
           "segundo y oyes un zumbido exactamente a esa frecuencia. Las muestras no tienen nada malo: " +
           "lo que oyes es el corte. Un marco tomado en un momento cualquiera empieza y acaba a media " +
           "oscilación, así que cada repetición arranca con un salto, y un salto es un chasquido.</p>" +
           "<p>¿Por qué un bucle es la prueba adecuada? Porque es exactamente lo que supone la transformada de " +
           "la imagen siguiente. Describe N muestras como una suma de ondas que caben cada una un número " +
           "entero de ciclos en el marco, así que, hasta donde la transformada puede saber, el marco es un " +
           "periodo de una señal que se repite para siempre: el bucle que estás oyendo. La costura también es " +
           "real para ella. Un salto brusco está hecho de todas las frecuencias a la vez, así que la " +
           "transformada de un marco rectangular esparce cada frecuencia verdadera entre decenas de vecinas: " +
           "la <em>fuga espectral</em>. Un tono puro que debería ser una barra se convierte en una colina, y " +
           "un sonido débil junto a uno fuerte queda enterrado bajo la falda del fuerte.</p>" +
           "<p>Vuelve a Hann. La envolvente azul es la ventana, la línea morada es cada muestra multiplicada " +
           "por ella, y ahora los dos extremos valen cero: el marco empieza y acaba en silencio, así que las " +
           "repeticiones se unen sin costura y la fuga cae con fuerza. Esa es toda la razón del perfil. Su " +
           "precio es que las muestras cercanas a los extremos se atenúan, así que un marco con Hann oye más " +
           "su centro que sus bordes; la imagen del salto muestra cómo superponer los marcos lo compensa. " +
           "Hamming es un compromiso ajustado que se detiene en 0,08 en vez de en cero: suprime mejor que Hann " +
           "la fuga más cercana a un pico y peor la fuga lejana.</p>",
        eqcap: "𝒳 son todos los marcos a la vez, una columna por marco, y construirla no " +
               "calcula nada: 𝒳[n, t] es sencillamente la muestra t·H + n de la grabación, " +
               "leída a un paso fijo. H es el salto, el paso de una columna a la siguiente; con H = N " +
               "las columnas embaldosan la señal rellenada sin superponerse y toda la matriz es un " +
               "reshape sin más. Señala una letra para ver la extensión que mide. Las cuentas están " +
               "dadas con H = N/2, el salto con el que abre la imagen siguiente.",
        predict: "Antes de reproducir: la ventana rectangular conserva cada muestra tal cual. ¿Debería sonar más limpia, entonces?",
        why: "Casi todos los espectrogramas que verás se calcularon con una ventana de Hann: es la opción por " +
             "defecto en librosa y torchaudio y en la entrada de modelos de voz como Whisper. Es el remedio más " +
             "barato que existe contra la fuga —N multiplicaciones por marco— y es lo que permite a una " +
             "transformada distinguir un sonido débil del borde de uno fuerte. La longitud del marco también es " +
             "una elección. Para la voz suele ser de 20 a 30 ms: lo bastante corta para que el sonido sea más o " +
             "menos estable dentro de ella, ya que una vocal dura más que eso, y lo bastante larga para contener " +
             "un par de ciclos del tono de una voz grave.",
        playFrame: (win) => "este marco en bucle (" + win + ")",
        np: {
          ms: (ms) => ms.toFixed(1).replace(".", ",") + " ms de sonido",
          win: {hann: "periódica, no np.hanning(N)", hamming: "periódica, acaba en 0,08",
                rect: "sin perfil ninguno"},
          frame: (n) => "(" + n + ",) — una columna de la matriz",
          ends: (e) => "lo que valen los extremos: " + e.toExponential(2)
        },
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
