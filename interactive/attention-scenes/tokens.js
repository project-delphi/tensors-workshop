// Scene 1: a sequence is four rows gathered out of a table.
//
// Four made-up words, so a row has something to point at, but the concept
// line says outright that the words carry no meaning here — this stage is
// about the tensor operations attention is built from, not about language.
// ids = [3, 1, 4, 1] repeats id 1, so the same row of E is gathered twice:
// X's second and fourth rows are identical, which the picture shows before
// any control is touched.
(function () {
  "use strict";

  // Nonsense words, one per row of E (six rows; only four are ever gathered).
  // Never claimed to mean anything -- the concept line says so on the stage.
  const WORDS = ["blorp", "wug", "fep", "dax", "glim", "zop"];

  function pipeline(ctx) {
    if (ctx.cache.tok) return ctx.cache.tok;
    const AC = ctx.AC;
    const E = AC.embedding();
    const X = AC.gather(E, AC.IDS);
    ctx.cache.tok = {E, X};
    return ctx.cache.tok;
  }

  function draw(ctx) {
    const {E, X} = pipeline(ctx);
    const K = ctx.K, svg = ctx.svg, AC = ctx.AC;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const s = ctx.state;
    const sig = ctx.colour("--at-w");

    // E, six rows of eight, with the four ids' arrows pointing into it. The
    // top ~34 units are reserved for the claim and shape-badge chips the
    // frame draws over the stage, so nothing here starts above y = 42.
    const ex = 70, ey = 72, ecw = 22, ecl = 20;
    svg.appendChild(K.text(ex + 4 * ecw, 42, "E ∈ ℝ⁶ˣ⁸", {anchor: "middle", fill: ctx.colour("--stage-ink")}));
    // The arrow row lands in the slot a grid's column labels would occupy,
    // so without a name on it it reads as a header over E's eight feature
    // columns rather than as four ids being looked up in E's six rows.
    svg.appendChild(K.text(ex - 18, 58, "ids", {anchor: "end", size: 11, fill: ctx.colour("--stage-mute")}));
    svg.appendChild(K.arrowRow({
      x: ex + 20, y: 58, spacing: 46, ids: AC.IDS, labels: AC.IDS.map((id) => WORDS[id]),
      targetY: ey, targetRowH: ecl, activeIndex: s.token, activeColour: sig
    }));
    svg.appendChild(K.numGrid({
      x: ex, y: ey, cellW: ecw, cellH: ecl, values: E,
      rowLabels: WORDS,
      mark: (i, j) => AC.IDS.includes(i) && i === AC.IDS[s.token],
      colourOf: () => sig
    }));

    // X, the four gathered rows, beside it.
    // Titled the way every other grid on this stage is titled. It used to
    // carry the claim verbatim, which the frame was already writing on the
    // chip over the top-left corner -- the same sentence twice on one
    // picture, and the wider of the two panels spent on saying it again.
    const xx = 380, xy = 100, xcw = 24, xcl = 30;
    svg.appendChild(K.text(xx + 4 * xcw, 76, "X (4×8)", {anchor: "middle", fill: ctx.colour("--stage-ink")}));
    svg.appendChild(K.numGrid({
      x: xx, y: xy, cellW: xcw, cellH: xcl, values: X,
      rowLabels: AC.IDS.map((id) => WORDS[id]),
      mark: (i, j) => i === s.token && j === s.feature,
      colourOf: () => ctx.colour("--at-w")
    }));
  }

  window.AttentionScenes.register({
    id: "tokens",
    section: "04",

    controls: [
      {id: "token", type: "range", min: 0, max: 3, step: 1, fmt: (v) => String(v)},
      {id: "feature", type: "range", min: 0, max: 7, step: 1, fmt: (v) => String(v)}
    ],

    init(ctx) { Object.assign(ctx.state, {token: 1, feature: 0}); },
    draw,

    readout(ctx) {
      const {X} = pipeline(ctx);
      const s = ctx.state, AC = ctx.AC;
      const value = X[s.token][s.feature];
      return {
        html: ctx.copy.readout(s.token, s.feature, value, AC.IDS[s.token]),
        data: {
          s: 4, d: 8, shape: "4,8", ids: AC.IDS.join(","), erows: 6,
          trace: value, gather: "1"
        }
      };
    },

    copy: {
      en: {
        tab: "Tokens",
        k: "The gather · section 04",
        h: "A sequence is four rows gathered out of a table",
        claim: "X = E[ids],  X.shape = (4, 8)",
        concept: "A sequence of tokens is a list of row indices into an embedding table. Gathering " +
                 "those rows is not arithmetic — nothing is computed, a row is copied whole. The four " +
                 "words on this stage are placeholders with no meaning of their own; what matters is " +
                 "that id 1 repeats, so row 1 of E is copied into X twice.",
        b: "<p>E is six rows of eight made-up numbers. ids = [3, 1, 4, 1] says which four rows to take, " +
           "in order — that is X, four rows and eight columns. Drag the arrows or the token slider and " +
           "watch which row of E is highlighted; the traced cell on X is that row's own feature, " +
           "unmoved.</p>",
        predict: "Rows 2 and 4 of X (ids 1 and 1): same or different?",
        controls: {token: "Token (row of X)", feature: "Feature (column)"},
        readout: (token, feature, value, id) =>
          "X[" + token + ", " + feature + "] = <b>" + value + "</b>, gathered whole from row " + id +
          " of E — nothing here is computed.",
        aria: (ctx) => "A six by eight table E, with four arrows from ids " + ctx.AC.IDS.join(", ") +
                        " pointing into its rows, and the gathered four by eight table X beside it."
      },
      es: {
        tab: "Tokens",
        k: "La recolección · sección 04",
        h: "Una secuencia son cuatro filas recogidas de una tabla",
        claim: "X = E[ids],  X.shape = (4, 8)",
        concept: "Una secuencia de tokens es una lista de índices de fila en una tabla de " +
                 "embeddings. Recoger esas filas no es aritmética: no se calcula nada, una fila se " +
                 "copia entera. Las cuatro palabras de este escenario no tienen significado propio; lo " +
                 "que importa es que el id 1 se repite, así que la fila 1 de E se copia dos veces en X.",
        b: "<p>E son seis filas de ocho números inventados. ids = [3, 1, 4, 1] dice qué cuatro " +
           "filas tomar, en orden: eso es X, cuatro filas y ocho columnas. Arrastra las flechas o el " +
           "deslizador de token y observa qué fila de E se ilumina; la celda marcada en X es esa " +
           "misma característica, sin cambiar.</p>",
        predict: "¿Las filas 2 y 4 de X (ids 1 y 1): iguales o distintas?",
        controls: {token: "Token (fila de X)", feature: "Característica (columna)"},
        readout: (token, feature, value, id) =>
          "X[" + token + ", " + feature + "] = <b>" + value + "</b>, recogida entera de la fila " + id +
          " de E: aquí no se calcula nada.",
        aria: (ctx) => "Una tabla E de seis por ocho, con cuatro flechas desde los ids " +
                        ctx.AC.IDS.join(", ") + " que apuntan a sus filas, y la tabla X recogida de " +
                        "cuatro por ocho al lado."
      }
    }
  });
})();
