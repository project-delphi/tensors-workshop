// Scene 1: a pressure wave becomes a list of numbers.
//
// From a distance the recording is a wave; come close and it is beads, one
// every 1/rate seconds, and nothing in between. The zoom is the lesson, so
// it is the first control, and the entrance plays it once. The rate control
// keeps every k-th bead and drops the rest -- no anti-alias filter, on
// purpose: what a lower rate throws away is what you hear when you press
// play, because the staircase in purple is what a lower rate plays back.
//
// Both paths draw one slice of the recording, SLICE samples around the
// position, and the zoom only changes how many of them fill the stage. The
// slice, the beads and the held staircase are all computed here; the kit
// only draws them.
(function () {
  "use strict";

  const SLICE = 2400;                    // 50 ms at 48 kHz is built; the view shows part of it
  const SPAN_MAX = 480;                 // 10 ms: the far view, where the wave looks continuous
  const SPAN_MIN = 48;                   // 1 ms: the near view
  const RATES = [1, 2, 4, 8, 16];        // the decimation the rate slider picks

  const spanOf = (zoom) => Math.round(SPAN_MAX * Math.pow(SPAN_MIN / SPAN_MAX, zoom / 100));

  function slice(ctx) {
    const s = ctx.state, N = ctx.signal.length;
    const k = RATES[s.rate];
    // The slice starts on a multiple of 48, so every rate on the slider sits
    // on the same absolute sample grid and the beads never drift as k changes.
    let i0 = Math.round(s.pos / 1000 * (N - SLICE) / 48) * 48;
    i0 = Math.max(0, Math.min(N - SLICE, i0));
    const key = ctx.source + ":" + i0 + ":" + k;
    if (s.v && s.v.key === key) return;
    const x = Float64Array.from(ctx.signal.subarray(i0, i0 + SLICE));
    const nb = Math.ceil(SLICE / k);
    const bx = new Int32Array(nb), by = new Float64Array(nb);
    for (let b = 0; b < nb; b++) { bx[b] = b * k; by[b] = x[b * k]; }
    s.v = {
      x, i0, L: SLICE, k, bx, by0: by, by1: by,
      levels: null, held: k > 1, stalks: false, ticks: true, chips: null,
      key,
      get span() { return spanOf(s.zoom); },
      spanShown: () => {
        const t = s.zoomTween ? ctx.LC.tweenAt(s.zoomTween, ctx.now()) : null;
        return t && !t.done && !ctx.instant ? spanOf(t.value) : spanOf(s.zoom);
      },
      mixShown: () => 1
    };
  }

  window.VoiceScenes.register({
    id: "sample",
    section: "00",
    gl: true,
    pose: {
      content: 1.35, fov: 40, target: [0, 0, 0],
      home: {az: 0.18, el: 0.16},
      limits: {azMin: -0.6, azMax: 0.6, elMin: -0.1, elMax: 0.6, dollyMin: 0.6, dollyMax: 1.8}
    },

    controls: [
      {id: "zoom", type: "range", min: 0, max: 100, step: 1,
       fmt: (v, ctx) => {
         const ms = spanOf(v) / ctx.rate * 1000;
         return (ms >= 10 ? ms.toFixed(0) : ms.toFixed(1)) + " ms";
       }},
      {id: "rate", type: "range", min: 0, max: 4, step: 1,
       fmt: (v, ctx) => (ctx.rate / RATES[v]).toLocaleString(ctx.lang === "es" ? "es" : "en") + " Hz"},
      {id: "pos", type: "range", min: 0, max: 1000, step: 1,
       fmt: (v, ctx) => (v / 1000 * (ctx.signal.length - SLICE) / ctx.rate).toFixed(2) + " s"}
    ],

    init(ctx) {
      Object.assign(ctx.state, {zoom: 0, rate: 0, pos: 380});
      slice(ctx);
    },
    reset(ctx) {
      Object.assign(ctx.state, {zoom: 0, rate: 0, pos: 380, v: null, zoomTween: null});
      slice(ctx);
    },
    sync(ctx) { slice(ctx); },

    // The entrance: from the far view, where the wave looks continuous, in to
    // where the beads separate, then the slider is the reader's.
    arrive(ctx) {
      const s = ctx.state;
      s.zoomTween = ctx.LC.tweenStart(0, 93, ctx.now(), 3200);
      s.zoom = 93;
      ctx.setControls({zoom: 93});
    },

    build(ctx) { return ctx.K.waveBuild(ctx); },
    render(ctx, gl) {
      const s = ctx.state;
      // A slider moved mid-entrance retargets the tween from wherever it is.
      if (s.zoomTween && s.zoomTween.to !== s.zoom) {
        s.zoomTween = ctx.LC.retarget(s.zoomTween, s.zoom, ctx.now(), 500);
      }
      ctx.K.waveFrame(ctx, gl, s.v);
    },
    draw(ctx) { ctx.K.waveDraw(ctx.g, ctx, ctx.state.v); },

    audio(ctx) {
      const k = ctx.state.v.k;
      const out = ctx.AC.hold(ctx.AC.decimate(ctx.signal, k), k, ctx.signal.length);
      return {samples: out, what: ctx.copy.held(ctx.rate / k)};
    },

    readout(ctx) {
      const s = ctx.state, v = s.v;
      const rate = ctx.rate / v.k;
      const span = v.span;
      const inview = Math.ceil(span / v.k);
      const ms = span / ctx.rate * 1000;
      const total = Math.ceil(ctx.signal.length / v.k);
      const secs = ctx.signal.length / ctx.rate;
      return {
        html: ctx.copy.readout(rate, v.k, ms, inview, total, secs, Math.round(rate / 1000)),
        data: {
          rate, factor: v.k, n: total, inview, span, ms: ms.toFixed(1), zoom: s.zoom,
          i0: v.i0
        }
      };
    },

    copy: {
      en: {
        tab: "Sampling",
        k: "Sampling · section 00",
        h: "A microphone measures the air 48 000 times a second",
        claim: "x[n] = p(n / fₛ)",
        concept: "Sound is a pressure that varies continuously in time. A recording is not: it is " +
                 "that pressure measured at equal intervals, fₛ times a second, and nothing " +
                 "between the measurements is kept. The measurements, in order, are a one-dimensional " +
                 "array.",
        b: "From far away the recording looks like a wave. Slide the zoom in and it comes apart into " +
           "beads: one number every 1/48 000 of a second, with nothing between them. Then lower the " +
           "rate. The beads thin out, the purple staircase is what that rate plays back, and pressing " +
           "play lets you hear what fewer numbers a second sounds like.",
        predict: "Before you zoom: how many numbers is one millisecond of this recording?",
        held: (rate) => "the recording held at " + rate.toLocaleString("en") + " Hz",
        controls: {zoom: "Zoom (how much time fills the stage)", rate: "Sampling rate", pos: "Position"},
        readout: (rate, k, ms, inview, total, secs, khz) =>
          "At <b>" + rate.toLocaleString("en") + " Hz</b> there are <b>" + khz + "</b> numbers in a " +
          "millisecond, so the <b>" + (ms >= 10 ? ms.toFixed(0) : ms.toFixed(1)) + " ms</b> on the " +
          "stage hold <b>" + inview.toLocaleString("en") + "</b> of them, and the whole " +
          secs.toFixed(2) + " s recording is <span class=\"shape\">(" + total.toLocaleString("en") +
          ",)</span> numbers long." +
          (k > 1 ? " Every " + k + "th measurement is kept and the rest are dropped — press play to hear it."
                 : " Every measurement is kept: this is the recording as it was made."),
        aria: (ctx) => {
          const v = ctx.state.v;
          return "A waveform that separates into " + Math.ceil(v.span / v.k) + " beads as the time " +
                 "axis stretches, one every 1/" + (ctx.rate / v.k) + " of a second, " +
                 (v.span / ctx.rate * 1000).toFixed(1) + " milliseconds across the stage.";
        }
      },
      es: {
        tab: "Muestreo",
        k: "Muestreo · sección 00",
        h: "Un micrófono mide el aire 48 000 veces por segundo",
        claim: "x[n] = p(n / fₛ)",
        concept: "El sonido es una presión que varía de forma continua en el tiempo. Una grabación " +
                 "no: es esa presión medida a intervalos iguales, fₛ veces por segundo, y nada de " +
                 "lo que hay entre las medidas se conserva. Las medidas, en orden, son un arreglo de " +
                 "una dimensión.",
        b: "De lejos la grabación parece una onda. Acerca el zoom y se deshace en cuentas: un número " +
           "cada 1/48 000 de segundo, y nada entre ellas. Después baja la frecuencia de muestreo. Las " +
           "cuentas se espacian, la escalera morada es lo que esa frecuencia reproduce, y al pulsar " +
           "reproducir oyes cómo suenan menos números por segundo.",
        predict: "Antes de acercar: ¿cuántos números hay en un milisegundo de esta grabación?",
        held: (rate) => "la grabación retenida a " + rate.toLocaleString("es") + " Hz",
        controls: {zoom: "Zoom (cuánto tiempo llena el escenario)", rate: "Frecuencia de muestreo", pos: "Posición"},
        readout: (rate, k, ms, inview, total, secs, khz) =>
          "A <b>" + rate.toLocaleString("es") + " Hz</b> hay <b>" + khz + "</b> números en un " +
          "milisegundo, así que los <b>" + (ms >= 10 ? ms.toFixed(0) : ms.toFixed(1).replace(".", ",")) +
          " ms</b> del escenario contienen <b>" + inview.toLocaleString("es") + "</b>, y la " +
          "grabación entera de " + secs.toFixed(2).replace(".", ",") + " s mide " +
          "<span class=\"shape\">(" + total.toLocaleString("es") + ",)</span> números." +
          (k > 1 ? " Se conserva una medida de cada " + k + " y el resto se descartan: pulsa reproducir para oírlo."
                 : " Se conserva cada medida: esta es la grabación tal como se hizo."),
        aria: (ctx) => {
          const v = ctx.state.v;
          return "Una forma de onda que se separa en " + Math.ceil(v.span / v.k) + " cuentas al " +
                 "estirar el eje del tiempo, una cada 1/" + (ctx.rate / v.k) + " de segundo, " +
                 (v.span / ctx.rate * 1000).toFixed(1).replace(".", ",") + " milisegundos a lo ancho del escenario.";
        }
      }
    }
  });
})();
