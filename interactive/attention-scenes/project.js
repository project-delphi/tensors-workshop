// Scene 2: three copies of the same product, X against three different
// weight matrices, give Q, K and V. One row of X and one column of the
// chosen W are lit, and the dot product between them is written out term by
// term — the same contraction as the projection stage's least squares, run
// three times with three different matrices.
(function () {
  "use strict";

  // A factor in the written-out dot product. A negative one is bracketed,
  // the same way the scores scene brackets its own: "1×−1 + 1×−1" reads as
  // a chain of subtractions, and "1×(−1) + 1×(−1)" reads as two products.
  const term = (v) => (v < 0 ? "(" + v + ")" : String(v));

  function pipeline(ctx) {
    if (ctx.cache.proj) return ctx.cache.proj;
    const AC = ctx.AC;
    const X = AC.gather(AC.embedding(), AC.IDS);
    const P = AC.projections();
    ctx.cache.proj = {
      X, P,
      Q: AC.matmul(X, P.WQ), K: AC.matmul(X, P.WK), V: AC.matmul(X, P.WV)
    };
    return ctx.cache.proj;
  }

  function draw(ctx) {
    const data = pipeline(ctx);
    const K = ctx.K, svg = ctx.svg, s = ctx.state;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const root = K.el("g", {transform: "translate(0,44)"});
    svg.appendChild(root);
    const W = data.P["W" + s.which.toUpperCase()];
    const out = data[s.which.toUpperCase()];
    const roleTok = {q: "--at-q", k: "--at-k", v: "--at-v"}[s.which];

    root.appendChild(K.text(150, 20, "X (4×8)", {fill: ctx.colour("--stage-ink")}));
    root.appendChild(K.numGrid({
      x: 30, y: 34, cellW: 22, cellH: 26, values: data.X,
      mark: (i) => i === s.row, colourOf: () => ctx.colour("--at-w")
    }));

    root.appendChild(K.text(400, 20, "W_" + s.which.toUpperCase() + " (8×8)", {fill: ctx.colour("--stage-ink")}));
    root.appendChild(K.numGrid({
      x: 260, y: 34, cellW: 18, cellH: 26, values: W,
      mark: (i, j) => j === s.col, colourOf: () => ctx.colour(roleTok)
    }));

    root.appendChild(K.text(550, 20, s.which.toUpperCase() + " (4×8)", {fill: ctx.colour("--stage-ink")}));
    root.appendChild(K.numGrid({
      x: 500, y: 34, cellW: 18, cellH: 26, values: out,
      mark: (i, j) => i === s.row && j === s.col, colourOf: () => ctx.colour(roleTok)
    }));

    const terms = data.X[s.row].map((v, d) => term(v) + "×" + term(W[d][s.col])).join(" + ");
    root.appendChild(K.text(320, 320, terms, {size: 12, fill: ctx.colour("--stage-ink"), attrs: {"font-weight": 500}}));
    root.appendChild(K.text(320, 345, s.which.toUpperCase() + "[" + s.row + ", " + s.col + "] = " + out[s.row][s.col],
      {size: 15, fill: ctx.colour(roleTok)}));
  }

  window.AttentionScenes.register({
    id: "project",
    section: "06",

    controls: [
      {id: "which", type: "select", options: ["q", "k", "v"]},
      {id: "row", type: "range", min: 0, max: 3, step: 1, fmt: (v) => String(v)},
      {id: "col", type: "range", min: 0, max: 7, step: 1, fmt: (v) => String(v)}
    ],

    // Row 0 against column 5, not the opening 1, 0: W_Q's column 0 carries
    // its one non-zero entry where X's row 1 has a zero, so that cell was
    // eight 0×0 terms and a dot product with nothing happening in it.
    // Q[0, 5] = −2 is the cell here that takes two terms to reach, so the
    // line under the grids opens on a sum a reader can watch land.
    init(ctx) { Object.assign(ctx.state, {which: "q", row: 0, col: 5}); },
    draw,

    readout(ctx) {
      const data = pipeline(ctx);
      const s = ctx.state;
      const W = data.P["W" + s.which.toUpperCase()];
      const out = data[s.which.toUpperCase()];
      const dot = out[s.row][s.col];
      return {
        html: ctx.copy.readout(s.which.toUpperCase(), s.row, s.col, dot),
        data: {
          shape: "4,8", which: s.which, wparams: ctx.AC.paramCount(8, 2), terms: 8,
          dot: dot, integer: Number.isInteger(dot) ? "1" : "0"
        }
      };
    },

    copy: {
      en: {
        tab: "Projections",
        k: "One contraction, three matrices · section 06",
        h: "X against three weight matrices gives Q, K and V",
        claim: "Q = X W_Q,  K = X W_K,  V = X W_V",
        concept: "Q, K and V are the same contraction, X against a weight matrix, run three times " +
                 "with three different matrices. Nothing about the shape changes between them — only " +
                 "which numbers are in the second factor.",

        b: "<p>Pick which of the three you are looking at. The lit row of X and the lit column of the " +
           "chosen W are the two vectors the dot product below multiplies term by term; their sum is " +
           "the lit cell of the result.</p>",
        predict: "192 numbers make all three matrices. Which contributes more: an eighth row or an " +
                 "eighth column?",
        controls: {which: "Matrix", row: "Row of X", col: "Column of W"},
        options: {which: {q: "Q = X W_Q", k: "K = X W_K", v: "V = X W_V"}},
        readout: (which, row, col, dot) =>
          which + "[" + row + ", " + col + "] = <b>" + dot + "</b>, the dot product of X's row " + row +
          " and W_" + which + "'s column " + col + " — eight terms, summed.",
        aria: (ctx) => "X, a weight matrix and the product " + ctx.state.which.toUpperCase() +
                        ", with one row and one column lit and their eight-term dot product written out."
      },
      es: {
        tab: "Proyecciones",
        k: "Una contracción, tres matrices · sección 06",
        h: "X contra tres matrices de pesos da Q, K y V",
        claim: "Q = X W_Q,  K = X W_K,  V = X W_V",
        concept: "Q, K y V son la misma contracción, X contra una matriz de pesos, repetida tres " +
                 "veces con tres matrices distintas. Nada de la forma cambia entre ellas, solo qué " +
                 "números hay en el segundo factor.",
        b: "<p>Elige cuál de las tres estás mirando. La fila iluminada de X y la columna " +
           "iluminada de la W elegida son los dos vectores que el producto punto de abajo multiplica " +
           "término a término; su suma es la celda iluminada del resultado.</p>",
        predict: "192 números forman las tres matrices. ¿Qué aporta más: una octava " +
                 "fila o una octava columna?",
        controls: {which: "Matriz", row: "Fila de X", col: "Columna de W"},
        options: {which: {q: "Q = X W_Q", k: "K = X W_K", v: "V = X W_V"}},
        readout: (which, row, col, dot) =>
          which + "[" + row + ", " + col + "] = <b>" + dot + "</b>, el producto punto de la fila " + row +
          " de X y la columna " + col + " de W_" + which + ": ocho términos, sumados.",
        aria: (ctx) => "X, una matriz de pesos y el producto " + ctx.state.which.toUpperCase() +
                        ", con una fila y una columna iluminadas y su producto punto de ocho " +
                        "términos escrito."
      }
    }
  });
})();
