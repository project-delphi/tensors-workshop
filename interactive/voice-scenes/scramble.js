// Scene 2: what a reshape does to a tensor you can hear.
//
// Section 04 teaches that a transpose permutes shape and strides while reading
// nothing, and that a reshape after a transpose has to copy. It is drawn there
// on a batch of photographs, where a wrong layout is a scrambled picture the
// reader has to be told is wrong. Here it is a scrambled voice, and nobody has
// to be told.
//
// The window and hop are fixed at 1024 and 464, which is not arbitrary: it
// makes the matrix exactly (513, 513). A transpose is only a legal spectrogram
// again -- only something the inverse transform can turn back into sound -- if
// the matrix is square, and that constraint is the scene's own lesson rather
// than a convenience. 464 x 512 is exactly the recording's 237568 samples.
(function () {
  "use strict";

  const N = 1024, HOP = 464;
  const PATCH = 27;                       // 513 = 27 x 19, so patches tile it exactly

  function compute(ctx) {
    const s = ctx.state;
    if (s.base) return;
    const F = (N >> 1) + 1;
    const n = (F - 1) * HOP;              // exactly the length that makes T === F
    const x = new Float64Array(n);
    x.set(ctx.signal.subarray(0, Math.min(n, ctx.signal.length)));
    const st = ctx.AC.stft(x, N, HOP, "hann");
    s.base = st; s.len = n;
    s.views = {};
  }

  // Each layout returns a new complex matrix of the same shape. Nothing is
  // resampled, nothing is thrown away, and every one of them holds exactly the
  // same 263,169 numbers -- only in a different order.
  function view(ctx, kind) {
    const s = ctx.state;
    if (s.views[kind]) return s.views[kind];
    const st = s.base;
    s.views[kind] =
      kind === "none" ? st.Z
      : kind === "transpose" ? ctx.AC.transposeC(st.Z, st.F, st.T)
      : ctx.AC.patchShuffle(st.Z, st.F, st.T, PATCH);
    return s.views[kind];
  }

  window.VoiceScenes.register({
    id: "scramble",
    section: "04",
    part: {en: "What a layout does to it", es: "Qué le hace una disposición"},

    controls: [
      {id: "layout", type: "select", options: ["none", "transpose", "patches"]}
    ],

    sync(ctx) { compute(ctx); },
    animates(ctx) { return ctx.head() >= 0; },
    region(ctx) { return {i0: 0, i1: ctx.state.len || ctx.signal.length}; },
    playLabel(ctx) { return ctx.copy.names[ctx.state.layout]; },

    init(ctx) {
      ctx.state.layout = "none";
      compute(ctx);
    },

    reset(ctx) {
      ctx.state.layout = "none";
    },

    draw(ctx) {
      const g = ctx.g, K = ctx.K, W = ctx.W, H = ctx.H;
      const st = ctx.state.base, F = st.F, T = st.T;
      const L = 52, R = 16, TOP = 26, BOT = 24;
      const side = Math.max(40, Math.min(W - L - R, H - TOP - BOT));
      const x0 = L + Math.max(0, (W - L - R - side) / 2);
      const y0 = TOP + Math.max(0, (H - TOP - BOT - side) / 2);

      const kind = ctx.state.layout;
      if (!ctx.state.imgs) ctx.state.imgs = {};
      if (!ctx.state.imgs[kind]) {
        const Z = view(ctx, kind);
        ctx.state.imgs[kind] = K.spectrogramImage(
          ctx.AC.magnitude(Z, F, T), F, T, {floorDb: -70});
      }
      K.blit(g, ctx.state.imgs[kind], ctx.cache, x0, y0, side, side);

      const wrong = kind !== "none";
      g.strokeStyle = wrong ? ctx.colour("--v-res") : ctx.colour("--v-axis");
      g.lineWidth = 2;
      g.strokeRect(x0 + 1, y0 + 1, side - 2, side - 2);

      // The axes are the point: on a transpose they swap, and the picture is
      // the same numbers read the other way.
      const down = wrong && kind === "transpose" ? ctx.copy.axTime : ctx.copy.axFreq;
      const across = wrong && kind === "transpose" ? ctx.copy.axFreq : ctx.copy.axTime;
      g.save();
      g.translate(14, y0 + side / 2);
      g.rotate(-Math.PI / 2);
      K.label(g, down, 0, 0, ctx.colour("--stage-mute"), {size: 11});
      g.restore();
      K.label(g, across, x0, y0 + side + 5, ctx.colour("--stage-mute"), {size: 11});
      // Both tags hug the right edge of the square: the claim card is an HTML
      // element pinned to the stage's top left, and a tag drawn at x0 sat
      // underneath it.
      K.label(g, "[" + F + ", " + T + "]", x0 + side, y0 - 18, ctx.colour("--v-axis"),
              {size: 12, mono: true, right: true});
      K.label(g, ctx.copy.count((F * T).toLocaleString(ctx.lang === "es" ? "es" : "en")),
              x0 + side, y0 + side + 5, wrong ? ctx.colour("--v-res") : ctx.colour("--stage-mute"),
              {size: 11, right: true});
    },

    audio(ctx) {
      const st = ctx.state.base;
      const Z = view(ctx, ctx.state.layout);
      const out = ctx.AC.istft(Z, st.F, st.T, N, HOP, "hann", ctx.state.len);
      return {samples: out, what: ctx.copy.names[ctx.state.layout]};
    },

    readout(ctx) {
      const st = ctx.state.base, kind = ctx.state.layout;
      return {
        html: ctx.copy.readout(kind, st.F, st.T,
                               (st.F * st.T).toLocaleString(ctx.lang === "es" ? "es" : "en")),
        data: {
          shape: st.F + "," + st.T,
          layout: kind,
          square: st.F === st.T ? "1" : "0",
          cells: st.F * st.T
        }
      };
    },

    copy: {
      en: {
        tab: "Reshape & hear it",
        k: "Layout and contiguity · section 04",
        h: "The same numbers, in a different order",
        claim: "[F, T] → [T, F]",
        concept: "A transpose permutes the shape and the strides and reads nothing. The numbers do " +
                 "not move, and not one of them is lost. Whether that matters depends entirely on " +
                 "what reads the buffer next.",
        b: "<p>Choose the transpose and press play. Every one of the 263,169 numbers is still " +
           "there — the count above the picture does not move — and the voice is gone. Nothing was " +
           "lost and nothing is recoverable by listening: what was a frequency is being read as a " +
           "time, and that is the whole of the damage.</p>" +
           "<p>The matrix is square on purpose, 513 by 513, because a transposed spectrogram is only " +
           "something you can turn back into sound when its two axes are the same length. The patch " +
           "shuffle is the milder version of the same mistake: inside each 27 by 27 block the sound " +
           "survives, across them it does not, so you hear the voice arriving in the wrong order " +
           "rather than as noise.</p>",
        predict: "Before you press play: the transpose loses nothing at all. Should it still sound like a voice?",
        controls: {layout: "Layout"},
        options: {layout: {none: "as the transform built it", transpose: "transposed",
                           patches: "27 × 27 patches, shuffled"}},
        axFreq: "frequency", axTime: "time",
        count: (n) => n + " numbers",
        names: {none: "the matrix as it was built", transpose: "the transposed matrix",
                patches: "the patch-shuffled matrix"},
        readout: (kind, F, T, n) => {
          const head = "All three layouts hold the same <b>" + n + "</b> numbers in a " +
                       "<span class=\"shape\">[" + F + ", " + T + "]</span> matrix. ";
          if (kind === "none") {
            return head + "This is the order the transform built them in, so it inverts back to " +
                   "the voice that went in.";
          }
          if (kind === "transpose") {
            return head + "<span class=\"fault\">Transposed</span>, every number is still here and " +
                   "every one is in the wrong place: what was a frequency is being read as a time. " +
                   "Nothing was lost and it is unintelligible — which is the whole of why layout " +
                   "is not bookkeeping.";
          }
          return head + "<span class=\"fault\">Patch-shuffled</span> into 27 by 27 blocks whose " +
                 "order was transposed. Inside each block the sound survives; across them it does " +
                 "not, so you hear the voice arriving in the wrong order rather than as noise.";
        },
        aria: (ctx) => {
          const st = ctx.state.base;
          return "A " + st.F + " by " + st.T + " spectrogram, " +
                 ({none: "in the order the transform built it",
                   transpose: "with its frequency and time axes swapped",
                   patches: "with its 27 by 27 patches reordered"})[ctx.state.layout] + ".";
        }
      },
      es: {
        tab: "Cambiar la forma y oírlo",
        k: "Disposición y contigüidad · sección 04",
        h: "Los mismos números, en otro orden",
        claim: "[F, T] → [T, F]",
        concept: "Una transposición permuta la forma y los pasos, y no lee nada. Los números no se " +
                 "mueven, y no se pierde ninguno. Que eso importe depende por completo de qué lea " +
                 "el búfer a continuación.",
        b: "<p>Elige la transposición y pulsa reproducir. Los 263.169 números siguen todos ahí —el " +
           "conteo sobre la imagen no se mueve— y la voz ha desaparecido. No se perdió nada y nada " +
           "se recupera escuchando: lo que era una frecuencia se lee como un tiempo, y ese es todo " +
           "el daño.</p>" +
           "<p>La matriz es cuadrada a propósito, 513 por 513, porque un espectrograma transpuesto " +
           "solo se puede volver a convertir en sonido cuando sus dos ejes miden lo mismo. El barajado " +
           "en parches es la versión suave del mismo error: dentro de cada bloque de 27 por 27 el " +
           "sonido sobrevive, entre ellos no, así que oyes la voz llegando en el orden equivocado y " +
           "no como ruido.</p>",
        predict: "Antes de reproducir: la transposición no pierde nada. ¿Debería seguir sonando como una voz?",
        controls: {layout: "Disposición"},
        options: {layout: {none: "como la construyó la transformada", transpose: "transpuesta",
                           patches: "parches de 27 × 27, barajados"}},
        axFreq: "frecuencia", axTime: "tiempo",
        count: (n) => n + " números",
        names: {none: "la matriz tal como se construyó", transpose: "la matriz transpuesta",
                patches: "la matriz con parches barajados"},
        readout: (kind, F, T, n) => {
          const head = "Las tres disposiciones contienen los mismos <b>" + n + "</b> números en una " +
                       "matriz <span class=\"shape\">[" + F + ", " + T + "]</span>. ";
          if (kind === "none") {
            return head + "Este es el orden en que la transformada los construyó, así que se " +
                   "invierte y devuelve la voz que entró.";
          }
          if (kind === "transpose") {
            return head + "<span class=\"fault\">Transpuesta</span>, todos los números siguen aquí " +
                   "y todos están en el lugar equivocado: lo que era una frecuencia se lee como un " +
                   "tiempo. No se perdió nada y es ininteligible, que es exactamente por qué la " +
                   "disposición no es mera contabilidad.";
          }
          return head + "<span class=\"fault\">Barajada en parches</span> de 27 por 27 cuyo orden se " +
                 "transpuso. Dentro de cada bloque el sonido sobrevive; entre ellos no, así que oyes " +
                 "la voz llegando en el orden equivocado y no como ruido.";
        },
        aria: (ctx) => {
          const st = ctx.state.base;
          return "Un espectrograma de " + st.F + " por " + st.T + ", " +
                 ({none: "en el orden en que lo construyó la transformada",
                   transpose: "con sus ejes de frecuencia y tiempo intercambiados",
                   patches: "con sus parches de 27 por 27 reordenados"})[ctx.state.layout] + ".";
        }
      }
    }
  });
})();
