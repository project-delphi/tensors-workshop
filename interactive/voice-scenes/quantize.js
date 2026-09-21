// Scene 2: each measurement is rounded to one of 2^bits levels.
//
// Close in, on the same slice the sampling scene uses, with a ruler drawn
// behind the beads: one line per level the bit depth allows. Change the bits
// and every bead eases up or down onto the nearest line, with a pink stalk
// from where it was to where it landed -- the rounding error, which is what
// the readout measures as a signal-to-noise ratio and what play lets you
// hear. At 16 bits the beads do not move at all: the recording was 16-bit
// integers all along, and audio-core's test pins that.
(function () {
  "use strict";

  const SLICE = 2400;
  const SPAN_MAX = 480;
  const SPAN_MIN = 48;
  const spanOf = (zoom) => Math.round(SPAN_MAX * Math.pow(SPAN_MIN / SPAN_MAX, zoom / 100));

  function slice(ctx) {
    const s = ctx.state, N = ctx.signal.length;
    let i0 = Math.round(s.pos / 1000 * (N - SLICE) / 48) * 48;
    i0 = Math.max(0, Math.min(N - SLICE, i0));
    const key = ctx.source + ":" + i0 + ":" + s.bits;
    if (s.v && s.v.key === key) return;
    const x = (s.v && s.v.i0 === i0 && s.v.src === ctx.source)
      ? s.v.x : Float64Array.from(ctx.signal.subarray(i0, i0 + SLICE));
    const q = ctx.AC.quantize(x, s.bits);
    const nb = SLICE;
    const bx = new Int32Array(nb);
    for (let b = 0; b < nb; b++) bx[b] = b;
    // The beads start from wherever they were shown last -- the previous
    // rounding, part way through its own move -- never from the raw values,
    // or a quick pair of slider moves would make every bead jump back first.
    const from = new Float64Array(nb);
    if (s.v && s.v.i0 === i0 && s.v.src === ctx.source) {
      const m = s.v.mixShown();
      for (let b = 0; b < nb; b++) from[b] = s.v.by0[b] + (s.v.by1[b] - s.v.by0[b]) * m;
    } else {
      from.set(x);
    }
    s.mixTween = ctx.LC.tweenStart(0, 1, ctx.now(), 700);
    s.v = {
      x, i0, L: SLICE, k: 1, bx, by0: from, by1: q.q, raw: x,
      levels: q.levels, step: q.step, maxErr: q.maxErr, held: false, stalks: true, ticks: true,
      chips: null, src: ctx.source, key,
      levelsText: ctx.copy.levelsText(q.levels),
      get span() { return spanOf(s.zoom); },
      spanShown: () => spanOf(s.zoom),
      mixShown: () => {
        if (ctx.instant || !s.mixTween) return 1;
        const t = ctx.LC.tweenAt(s.mixTween, ctx.now());
        return t.value;
      }
    };
    // The stalks are the error against the *raw* values, whatever the beads
    // are easing from.
    s.v.stalkFrom = x;
  }

  window.VoiceScenes.register({
    id: "quantize",
    section: "00",
    gl: true,
    posControl: "pos",
    pose: {
      content: 1.35, fov: 40, target: [0, 0, 0],
      home: {az: 0.16, el: 0.16},
      limits: {azMin: -0.6, azMax: 0.6, elMin: -0.1, elMax: 0.55, dollyMin: 0.6, dollyMax: 1.8}
    },

    controls: [
      {id: "bits", type: "range", min: 2, max: 16, step: 1,
       fmt: (v) => v + (v === 1 ? " bit" : " bits")},
      {id: "zoom", type: "range", min: 40, max: 100, step: 1,
       fmt: (v, ctx) => {
         const ms = spanOf(v) / ctx.rate * 1000;
         return (ms >= 10 ? ms.toFixed(0) : ms.toFixed(1)) + " ms";
       }},
      {id: "pos", type: "range", min: 0, max: 1000, step: 1,
       fmt: (v, ctx) => (v / 1000 * (ctx.signal.length - SLICE) / ctx.rate).toFixed(2) + " s"}
    ],

    init(ctx) {
      Object.assign(ctx.state, {bits: 4, zoom: 87, pos: 380});
      slice(ctx);
    },
    reset(ctx) {
      Object.assign(ctx.state, {bits: 4, zoom: 87, pos: 380, v: null});
      slice(ctx);
    },
    sync(ctx) { slice(ctx); },

    // The entrance: the beads drop from the raw values onto the ruler, once.
    arrive(ctx) {
      const s = ctx.state;
      s.v.by0 = s.v.raw;
      s.mixTween = ctx.LC.tweenStart(0, 1, ctx.now(), 1400);
    },

    region(ctx) { const v = ctx.state.v; return {i0: v.i0, i1: v.i0 + v.L}; },
    animates(ctx) { return ctx.head() >= 0; },
    playLabel(ctx) { return ctx.copy.playBits(ctx.state.bits); },

    build(ctx) { return ctx.K.waveBuild(ctx); },
    render(ctx, gl) { ctx.K.waveFrame(ctx, gl, ctx.state.v); },
    draw(ctx) { ctx.K.waveDraw(ctx.g, ctx, ctx.state.v); },

    audio(ctx) {
      const q = ctx.AC.quantize(ctx.signal, ctx.state.bits);
      return {samples: q.q, what: ctx.copy.rounded(ctx.state.bits)};
    },

    readout(ctx) {
      const s = ctx.state, v = s.v;
      const q = ctx.AC.quantize(ctx.signal, s.bits);
      const snr = ctx.AC.snrDb(ctx.signal, q.q);
      // What one more bit is worth, measured rather than quoted. The
      // textbook's "6 dB a bit" is only true once the levels are fine enough
      // to stop clipping the peaks -- on this recording the step from 2 to 3
      // bits is worth 2.2 dB, not 6 -- and a claim the stage contradicts is
      // worse than no claim.
      const more = s.bits < 16
        ? ctx.AC.snrDb(ctx.signal, ctx.AC.quantize(ctx.signal, s.bits + 1).q) : Infinity;
      const inview = v.span;
      // The largest move among the beads on the stage, not in the recording.
      const half = v.L / 2;
      let maxErr = 0;
      for (let j = Math.max(0, Math.floor(half - inview / 2)); j < Math.min(v.L, Math.ceil(half + inview / 2)); j++) {
        maxErr = Math.max(maxErr, Math.abs(v.by1[j] - v.raw[j]));
      }
      return {
        html: ctx.copy.readout(s.bits, v.levels, v.step, snr, maxErr, inview, more),
        data: {
          bits: s.bits, levels: v.levels, step: v.step.toExponential(3),
          snr: Number.isFinite(snr) ? snr.toFixed(2) : "inf",
          gain: Number.isFinite(more) && Number.isFinite(snr) ? (more - snr).toFixed(2) : "inf",
          maxerr: maxErr.toExponential(3), inview, span: v.span, zoom: s.zoom, i0: v.i0
        }
      };
    },

    copy: {
      en: {
        tab: "Quantization",
        k: "Quantization · section 00",
        h: "Each measurement is rounded to one of 2ᵇ levels",
        claim: "q[n] = ⌊x[n] · 2ᵇ⁻¹⌉ / 2ᵇ⁻¹",
        concept: "A measurement is a real number; a stored one is not. With b bits there are 2ᵇ " +
                 "values a sample can take, equally spaced between −1 and +1, and every " +
                 "measurement is moved to the nearest. The move is the quantization error, and it " +
                 "is the only thing the stored array has lost.",
        b: "<p>Take the bits down to 3 and there is a hiss sitting under the voice that was not " +
           "there before. It is on the stage in pink: every bead has been dragged to the nearest " +
           "blue line, and the stalk under it is how far it had to go. Nothing else about the " +
           "recording changed — the same 237 568 numbers, the same rate — and the stalks are what " +
           "you are hearing.</p>" +
           "<p>The blue lines are the values a sample is allowed to take, 2ᵇ of them. Slide the bits " +
           "down and they thin out while the stalks grow; slide up to 16 and the beads stop moving " +
           "altogether, because this recording was stored as 16-bit integers and the rounding is " +
           "already in it.</p>",
        predict: "Before you slide: at 4 bits, how many different heights can a bead have?",
        rounded: (bits) => "the recording rounded to " + bits + " bits",
        playBits: (bits) => "rounded to " + bits + " bits",
        levelsText: (n) => n.toLocaleString("en") + (n > 1024 ? " levels, closer than a pixel" : " levels"),
        controls: {bits: "Bit depth", zoom: "Zoom", pos: "Position"},
        readout: (bits, levels, step, snr, maxErr, inview, more) =>
          "<b>" + bits + " bits</b> is <b>" + levels.toLocaleString("en") + "</b> levels, " +
          "<b>" + step.toPrecision(3) + "</b> apart. The largest move any of the " +
          inview.toLocaleString("en") + " beads on the stage made is " + maxErr.toPrecision(2) +
          ", and across the whole recording the rounding leaves a signal-to-noise ratio of " +
          (Number.isFinite(snr)
            ? "<b>" + snr.toFixed(1) + " dB</b>. " +
              (Number.isFinite(more)
                ? "One more bit halves the step and takes it to " + more.toFixed(1) + " dB."
                : "One more bit is 16, where the rounding stops moving anything at all.")
            : "<b>exactly the recording</b>: no bead moved, because it was stored at 16 bits."),
        aria: (ctx) => {
          const v = ctx.state.v;
          return "Beads on a ruler of " + v.levels.toLocaleString("en") + " levels, " + v.span +
                 " samples across the stage, each with a stalk showing how far it was rounded.";
        }
      },
      es: {
        tab: "Cuantización",
        k: "Cuantización · sección 00",
        h: "Cada medida se redondea a uno de 2ᵇ niveles",
        claim: "q[n] = ⌊x[n] · 2ᵇ⁻¹⌉ / 2ᵇ⁻¹",
        concept: "Una medida es un número real; una medida guardada no. Con b bits hay 2ᵇ " +
                 "valores que una muestra puede tomar, espaciados por igual entre −1 y +1, y " +
                 "cada medida se mueve al más cercano. Ese movimiento es el error de cuantización, " +
                 "y es lo único que el arreglo guardado ha perdido.",
        b: "<p>Baja los bits a 3 y aparece un siseo bajo la voz que antes no estaba. Está en el " +
           "escenario en rosa: cada cuenta ha sido arrastrada a la línea azul más cercana, y el tallo " +
           "que queda debajo es cuánto tuvo que moverse. Nada más cambió en la grabación \u2014 los " +
           "mismos 237 568 números, la misma frecuencia \u2014 y lo que oyes son los tallos.</p>" +
           "<p>Las líneas azules son los valores que una muestra puede tomar, 2\u1d47 de ellos. Baja " +
           "los bits y se espacian mientras los tallos crecen; súbelos a 16 y las cuentas dejan de " +
           "moverse del todo, porque esta grabación se guardó como enteros de 16 bits y el redondeo ya " +
           "está en ella.</p>",
        predict: "Antes de deslizar: a 4 bits, ¿cuántas alturas distintas puede tener una cuenta?",
        rounded: (bits) => "la grabación redondeada a " + bits + " bits",
        playBits: (bits) => "redondeada a " + bits + " bits",
        levelsText: (n) => n.toLocaleString("es") + (n > 1024 ? " niveles, más juntos que un píxel" : " niveles"),
        controls: {bits: "Profundidad de bits", zoom: "Zoom", pos: "Posición"},
        readout: (bits, levels, step, snr, maxErr, inview, more) =>
          "<b>" + bits + " bits</b> son <b>" + levels.toLocaleString("es") + "</b> niveles, " +
          "separados <b>" + step.toPrecision(3).replace(".", ",") + "</b>. El mayor movimiento de " +
          "las " + inview.toLocaleString("es") + " cuentas del escenario es " +
          maxErr.toPrecision(2).replace(".", ",") + ", y en toda la grabación el redondeo deja una " +
          "relación señal a ruido de " +
          (Number.isFinite(snr)
            ? "<b>" + snr.toFixed(1).replace(".", ",") + " dB</b>. " +
              (Number.isFinite(more)
                ? "Un bit más parte el paso por la mitad y la lleva a " +
                  more.toFixed(1).replace(".", ",") + " dB."
                : "Un bit más son 16, donde el redondeo deja de mover nada.")
            : "<b>exactamente la grabación</b>: ninguna cuenta se movió, porque se guardó a 16 bits."),
        aria: (ctx) => {
          const v = ctx.state.v;
          return "Cuentas sobre una regla de " + v.levels.toLocaleString("es") + " niveles, " + v.span +
                 " muestras a lo ancho del escenario, cada una con un tallo que muestra cuánto se redondeó.";
        }
      }
    }
  });
})();
