// Scene 2: the three ways to flatten the cube into a matrix. One tensor
// entry, chosen by `flat`, sits in all three unfoldings at once, at a
// different (row, col) in each -- the picture behind "layout is a choice".
// See factor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const FC = window.FactorCore, K = window.FactorKit;
  const SUBD = ["₀", "₁", "₂"];
  const subMode = (m) => "₍" + SUBD[m] + "₎";

  function otherAxes(shape, mode) {
    const o = [];
    for (let ax = 0; ax < shape.length; ax++) if (ax !== mode) o.push(ax);
    return o;
  }
  function decode(flat, shape) {
    const strides = [];
    let acc = 1;
    for (let i = shape.length - 1; i >= 0; i--) { strides[i] = acc; acc *= shape[i]; }
    const idx = new Array(shape.length);
    let rem = flat;
    for (let ax = 0; ax < shape.length; ax++) { idx[ax] = Math.floor(rem / strides[ax]); rem %= strides[ax]; }
    return idx;
  }
  function place(idx, shape, mode) {
    const others = otherAxes(shape, mode);
    let col = 0;
    for (const ax of others) col = col * shape[ax] + idx[ax];
    return {row: idx[mode], col, rows: shape[mode], cols: others.reduce((a, ax) => a * shape[ax], 1)};
  }

  const EN = {
    k: "Unfolding · section 10",
    h: "A matrix is a choice of which axis stays put",
    concept: "Unfolding a tensor along one axis peels it into a matrix: that axis becomes the rows, and every other combination of indices becomes one column, always in the same order. <span class=\"cite\">Deep Learning §2.1</span>",
    claim: "T ∈ ℝ⁴ˣ⁵ˣ²⁴ → T₍₂₎ ∈ ℝ²⁴ˣ²⁰",
    predict: "Before you slide: the same 480 numbers make up all three unfoldings. Does any of them have more entries than the others?",
    b: "<p>Pick a mode and the cube peels open along that axis: mode 2 makes hour the rows, so the unfolding is 24 rows by 20 columns of the other 480/24 = 20 (pickup, dropoff) pairs. The same idea unfolds mode 0 (pickup) into 4 × 120 and mode 1 (dropoff) into 5 × 96.</p><p>Drag <b>which entry</b> and watch the highlighted mark move in all three boxes at once: it is one number, T[i, j, k], living at a different (row, column) in each layout — the entry count never changes, only its address.</p>",
    controls: {mode: "Unfold along", flat: "Which entry"},
    options: {mode: {0: "pickup (mode 0)", 1: "dropoff (mode 1)", 2: "hour (mode 2)"}},
    readout: (mode, rows, cols, i, j, k) =>
      `Unfolding along <b>${["pickup", "dropoff", "hour"][mode]}</b> gives a <b>${rows} × ${cols}</b> matrix. ` +
      `Entry T[${i}, ${j}, ${k}] sits at row ${["i", "j", "k"][mode]} of the mode-${mode} unfolding, and the same number sits in the other two unfoldings too — 480 entries, however the cube is cut.`,
    aria: (ctx) => {
      const s = ctx.state;
      return `Three rectangles to scale, 4 by 120, 5 by 96 and 24 by 20, mode ${s.mode} outlined, with a marker at the same tensor entry's position in every one of them.`;
    }
  };
  const ES = {
    k: "Desdoblado · sección 10",
    h: "Una matriz es elegir qué eje se queda fijo",
    concept: "Desdoblar un tensor a lo largo de un eje lo despliega en una matriz: ese eje se vuelve las filas, y cada combinación de los otros índices se vuelve una columna, siempre en el mismo orden. <span class=\"cite\">Deep Learning §2.1</span>",
    claim: "T ∈ ℝ⁴ˣ⁵ˣ²⁴ → T₍₂₎ ∈ ℝ²⁴ˣ²⁰",
    predict: "Antes de deslizar: los mismos 480 números forman los tres desdoblados. ¿Tiene alguno más entradas que los otros?",
    b: "<p>Elige un modo y el cubo se abre a lo largo de ese eje: el modo 2 hace que la hora sea las filas, así que el desdoblado es 24 filas por 20 columnas de los otros 480/24 = 20 pares (origen, destino). La misma idea desdobla el modo 0 (origen) en 4 × 120 y el modo 1 (destino) en 5 × 96.</p><p>Arrastra <b>qué entrada</b> y observa cómo se mueve la marca resaltada en las tres cajas a la vez: es un solo número, T[i, j, k], que vive en una (fila, columna) distinta en cada disposición — el número de entradas nunca cambia, solo su dirección.</p>",
    controls: {mode: "Desdoblar a lo largo de", flat: "Qué entrada"},
    options: {mode: {0: "origen (modo 0)", 1: "destino (modo 1)", 2: "hora (modo 2)"}},
    readout: (mode, rows, cols, i, j, k) =>
      `Desdoblar a lo largo de <b>${["origen", "destino", "hora"][mode]}</b> da una matriz <b>${rows} × ${cols}</b>. ` +
      `La entrada T[${i}, ${j}, ${k}] está en la fila ${["i", "j", "k"][mode]} del desdoblado del modo ${mode}, y el mismo número está en los otros dos desdoblados también — 480 entradas, se corte como se corte el cubo.`,
    aria: (ctx) => {
      const s = ctx.state;
      return `Tres rectángulos a escala, 4 por 120, 5 por 96 y 24 por 20, con el modo ${s.mode} resaltado, y una marca en la posición de la misma entrada del tensor en cada uno.`;
    }
  };

  window.FactorScenes.register({
    id: "unfold", section: "10",
    copy: {en: EN, es: ES},

    controls: [
      {id: "mode", type: "select", options: ["0", "1", "2"]},
      {id: "flat", type: "range", min: 0, max: 479, step: 1, fmt: (v) => String(v)}
    ],

    init(ctx) {
      ctx.state.mode = 2;
      ctx.state.flat = 0;
    },

    // The select stores its value as a string; every other mode arithmetic
    // here indexes and compares as a number, so this is where it turns back
    // into one -- before draw() and readout() both read it.
    sync(ctx) { ctx.state.mode = Number(ctx.state.mode); },

    draw(ctx) {
      const T = ctx.taxi, s = ctx.state, svg = ctx.svg;
      const idx = decode(s.flat, T.shape);
      const boxes = [0, 1, 2].map((m) => Object.assign({mode: m}, place(idx, T.shape, m)));
      const tokens = ["--fa-core", "--fa-r", "--fa-fac"];
      const X0 = 50, Y0 = 60, GAP = 40, MAXW = 200, MAXH = 130;
      boxes.forEach((b, n) => {
        const scale = Math.min(MAXW / b.cols, MAXH / b.rows);
        const w = b.cols * scale, h = b.rows * scale;
        const x0 = X0 + n * (MAXW + GAP), y0 = Y0;
        svg.appendChild(K.el("rect", {
          x: x0, y: y0, width: w, height: h, fill: "none",
          stroke: K.css(b.mode === s.mode ? "--fa-t" : "--stage-mute"),
          "stroke-width": b.mode === s.mode ? 2.4 : 1.2
        }));
        const mx = x0 + (b.col + 0.5) * scale, my = y0 + (b.row + 0.5) * scale;
        svg.appendChild(K.el("circle", {cx: mx, cy: my, r: 4.2, fill: K.css(tokens[n])}));
        K.label(svg, x0, y0 - 10, `T${"₍" + SUBD[n] + "₎"}  ${b.rows}×${b.cols}`, {size: 11.5});
      });
    },

    readout(ctx) {
      const T = ctx.taxi, s = ctx.state, c = ctx.copy;
      const idx = decode(s.flat, T.shape);
      const b = place(idx, T.shape, s.mode);
      return {
        html: c.readout(s.mode, b.rows, b.cols, idx[0], idx[1], idx[2]),
        claim: `T ∈ ℝ⁴ˣ⁵ˣ²⁴ → T${subMode(s.mode)} ∈ ℝ${b.rows}ˣ${b.cols}`,
        data: {
          mode: s.mode, rows: b.rows, cols: b.cols, entries: T.data.length,
          invariant: "1", at: b.row + "," + b.col
        }
      };
    }
  });
})();
