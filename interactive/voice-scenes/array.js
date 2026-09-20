// Scene 3: those numbers, in order, are the tensor.
//
// Twelve beads face-on with their values written under them, and a slider
// that walks the window along the whole array. The values are written two
// ways, because both are true of the same bytes: as the float32 a library
// hands back, and as the int16 codes the file stores -- which is why 4.949
// seconds is 475 kB and not 950. The shape is the claim on the stage, and
// the readout is the arithmetic under it.
(function () {
  "use strict";

  const SHOW = 12;

  function slice(ctx) {
    const s = ctx.state, N = ctx.signal.length;
    const i0 = Math.max(0, Math.min(N - SHOW, s.start));
    const key = ctx.source + ":" + i0 + ":" + s.dtype;
    if (s.v && s.v.key === key) return;
    const x = Float64Array.from(ctx.signal.subarray(i0, i0 + SHOW));
    const codes = ctx.AC.quantize(x, 16).codes;
    const bx = new Int32Array(SHOW);
    for (let b = 0; b < SHOW; b++) bx[b] = b;
    const chips = [];
    for (let b = 0; b < SHOW; b++) {
      chips.push({j: b, y: -1.22,
                  text: s.dtype === "int16" ? String(codes[b]) : x[b].toFixed(3)});
    }
    chips.push({j: -0.7, y: -1.22, text: i0 > 0 ? "[ …" : "[", cls: "mute"});
    chips.push({j: SHOW - 0.3, y: -1.22, text: i0 + SHOW < N ? "… ]" : "]", cls: "mute"});
    s.v = {
      x, i0, L: SHOW, k: 1, bx, by0: x, by1: x, codes,
      levels: null, held: false, stalks: false, ticks: true, chips, key,
      get span() { return SHOW + 1.6; },
      spanShown: () => SHOW + 1.6,
      mixShown: () => 1
    };
  }

  window.VoiceScenes.register({
    id: "array",
    section: "00",
    gl: true,
    pose: {
      content: 1.35, fov: 40, target: [0, 0, 0],
      home: {az: 0.0, el: 0.12},
      limits: {azMin: -0.4, azMax: 0.4, elMin: -0.1, elMax: 0.5, dollyMin: 0.7, dollyMax: 1.6}
    },

    controls: [
      {id: "start", type: "range", min: 0, max: 237556, step: 1,
       fmt: (v, ctx) => "x[" + v.toLocaleString(ctx.lang === "es" ? "es" : "en") + "]"},
      {id: "dtype", type: "select", options: ["float32", "int16"]}
    ],

    init(ctx) {
      Object.assign(ctx.state, {start: 90048, dtype: "float32"});
      slice(ctx);
    },
    reset(ctx) {
      Object.assign(ctx.state, {start: 90048, dtype: "float32", v: null});
      slice(ctx);
    },
    sync(ctx) {
      // The slider's range is the array's: a shorter file the reader brought
      // has fewer places to stand.
      const input = document.getElementById("c-start");
      const max = Math.max(0, ctx.signal.length - SHOW);
      if (input && Number(input.max) !== max) input.max = String(max);
      if (ctx.state.start > max) ctx.state.start = max;
      slice(ctx);
    },

    build(ctx) { return ctx.K.waveBuild(ctx); },
    render(ctx, gl) { ctx.K.waveFrame(ctx, gl, ctx.state.v); },
    draw(ctx) { ctx.K.waveDraw(ctx.g, ctx, ctx.state.v, {rotateChips: true}); },

    audio(ctx) {
      return {samples: ctx.signal, what: ctx.copy.whole};
    },

    readout(ctx) {
      const s = ctx.state, v = s.v, N = ctx.signal.length;
      const itemsize = s.dtype === "int16" ? 2 : 4;
      const bytes = N * itemsize;
      const first = s.dtype === "int16" ? String(v.codes[0]) : v.x[0].toFixed(4);
      return {
        html: ctx.copy.readout(N, s.dtype, itemsize, bytes, v.i0, first, N / ctx.rate),
        data: {
          shape: N, dtype: s.dtype, itemsize, bytes, i0: v.i0, x0: first, show: SHOW
        }
      };
    },

    copy: {
      en: {
        tab: "The array",
        k: "Shape and dtype · section 00",
        h: "Those numbers, in order, are the tensor",
        claim: "x.shape = (237568,)",
        concept: "A one-dimensional tensor is a list of numbers with a length and a dtype: how many " +
                 "there are, and how many bytes each one takes. Nothing about a sound is left once " +
                 "those two facts and the numbers themselves are written down.",
        b: "Twelve of the numbers, with their values under them, and a slider that walks along all " +
           "237 568 of them. Switch the dtype to int16 and the same beads show the integers the file " +
           "stores; float32 is what a library hands you after dividing by 32 768. Same bytes, read " +
           "two ways — and the readout says what each way costs.",
        predict: "Before you switch: how many bytes is 4.95 s of int16?",
        whole: "the whole recording",
        controls: {start: "First index shown", dtype: "dtype"},
        options: {dtype: {float32: "float32 (values in −1 … +1)", int16: "int16 (the codes the file stores)"}},
        readout: (N, dtype, itemsize, bytes, i0, first, secs) =>
          "<span class=\"shape\">x.shape = (" + N.toLocaleString("en") + ",)</span>, dtype <b>" + dtype +
          "</b>: " + N.toLocaleString("en") + " numbers at " + itemsize + " bytes each is <b>" +
          bytes.toLocaleString("en") + " bytes</b> for " + secs.toFixed(2) + " s. The first bead on the " +
          "stage is <span class=\"shape\">x[" + i0.toLocaleString("en") + "] = " + first + "</span>.",
        aria: (ctx) => {
          const v = ctx.state.v;
          return "Twelve beads in a row from index " + v.i0 + " of a " + ctx.signal.length +
                 "-element array, each with its " + ctx.state.dtype + " value written under it.";
        }
      },
      es: {
        tab: "El arreglo",
        k: "Forma y dtype · sección 00",
        h: "Esos números, en orden, son el tensor",
        claim: "x.shape = (237568,)",
        concept: "Un tensor de una dimensión es una lista de números con una longitud y un dtype: " +
                 "cuántos hay, y cuántos bytes ocupa cada uno. De un sonido no queda nada más una vez " +
                 "escritos esos dos datos y los propios números.",
        b: "Doce de los números, con sus valores debajo, y un deslizador que recorre los " +
           "237 568. Cambia el dtype a int16 y las mismas cuentas muestran los enteros que guarda el " +
           "archivo; float32 es lo que una biblioteca te entrega tras dividir entre 32 768. Los " +
           "mismos bytes, leídos de dos maneras, y la lectura dice lo que cuesta cada una.",
        predict: "Antes de cambiar: ¿cuántos bytes son 4,95 s en int16?",
        whole: "la grabación entera",
        controls: {start: "Primer índice mostrado", dtype: "dtype"},
        options: {dtype: {float32: "float32 (valores en −1 … +1)", int16: "int16 (los códigos que guarda el archivo)"}},
        readout: (N, dtype, itemsize, bytes, i0, first, secs) =>
          "<span class=\"shape\">x.shape = (" + N.toLocaleString("es") + ",)</span>, dtype <b>" + dtype +
          "</b>: " + N.toLocaleString("es") + " números a " + itemsize + " bytes cada uno son <b>" +
          bytes.toLocaleString("es") + " bytes</b> para " + secs.toFixed(2).replace(".", ",") + " s. La " +
          "primera cuenta del escenario es <span class=\"shape\">x[" + i0.toLocaleString("es") + "] = " +
          first + "</span>.",
        aria: (ctx) => {
          const v = ctx.state.v;
          return "Doce cuentas en fila desde el índice " + v.i0 + " de un arreglo de " +
                 ctx.signal.length + " elementos, cada una con su valor " + ctx.state.dtype + " escrito debajo.";
        }
      }
    }
  });
})();
