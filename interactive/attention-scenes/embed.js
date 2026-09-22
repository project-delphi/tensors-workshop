// Scene 3: the ids fetch rows out of an embedding table, and the fetched
// rows are the sequence as a matrix. A gather, not arithmetic: every row of
// X is copied whole from E, nothing is computed to build it. ids = [3, 1,
// 4, 1] repeats id 1, so the same row of E is gathered twice -- X's rows 1
// and 3 ("know" and "know") are identical, which the picture shows before
// any control is touched and the output scene comes back to.
(function () {
  "use strict";

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
    const words = AC.IDS.map((id) => AC.VOCAB[id]);

    // E, six rows of eight, with the four ids' arrows pointing into it. The
    // top ~34 units are reserved for the claim and shape-badge chips the
    // frame draws over the stage, so nothing here starts above y = 42.
    const ex = 70, ey = 72, ecw = 22, ecl = 20;
    svg.appendChild(K.text(ex + 4 * ecw, 42, "E = vocab_matrix (6×8)", {anchor: "middle", fill: ctx.colour("--stage-ink")}));
    // The arrow row lands in the slot a grid's column labels would occupy,
    // so without a name on it it reads as a header over E's eight feature
    // columns rather than as four ids being looked up in E's six rows.
    svg.appendChild(K.text(ex - 18, 58, "ids", {anchor: "end", size: 11, fill: ctx.colour("--stage-mute")}));
    svg.appendChild(K.arrowRow({
      x: ex + 20, y: 58, spacing: 46, ids: AC.IDS, labels: AC.IDS,
      targetY: ey, targetRowH: ecl, activeIndex: s.token, activeColour: sig
    }));
    svg.appendChild(K.numGrid({
      x: ex, y: ey, cellW: ecw, cellH: ecl, values: E,
      rowLabels: AC.VOCAB,
      mark: (i) => i === AC.IDS[s.token],
      colourOf: () => sig
    }));

    const xx = 380, xy = 100, xcw = 24, xcl = 30;
    svg.appendChild(K.text(xx + 4 * xcw, 76, "X = embeddings (4×8)", {anchor: "middle", fill: ctx.colour("--stage-ink")}));
    svg.appendChild(K.numGrid({
      x: xx, y: xy, cellW: xcw, cellH: xcl, values: X,
      rowLabels: words,
      mark: (i, j) => i === s.token && j === s.feature,
      colourOf: () => ctx.colour("--at-w")
    }));
    svg.appendChild(K.text(xx + 4 * xcw, xy + 4 * xcl + 22,
      "one row per token · one column per feature",
      {size: 11, fill: ctx.colour("--stage-mute"), mono: false}));
  }

  window.AttentionScenes.register({
    id: "embed",
    section: "04",

    controls: [
      {id: "token", type: "range", min: 0, max: 3, step: 1, fmt: (v) => String(v)},
      {id: "feature", type: "range", min: 0, max: 7, step: 1, fmt: (v) => String(v)}
    ],

    init(ctx) { Object.assign(ctx.state, {token: 1, feature: 1}); },
    draw,

    readout(ctx) {
      const {X} = pipeline(ctx);
      const s = ctx.state, AC = ctx.AC;
      const value = X[s.token][s.feature];
      return {
        html: ctx.copy.readout(s.token, s.feature, value, AC.IDS[s.token], AC.VOCAB[AC.IDS[s.token]]),
        data: {
          s: 4, d: 8, shape: "4,8", ids: AC.IDS.join(","), erows: 6,
          trace: value, gather: "1", repeat: X[1].join() === X[3].join() ? "1" : "0"
        }
      };
    },

    code(ctx) {
      const {X} = pipeline(ctx);
      const s = ctx.state, c = ctx.copy.np, AC = ctx.AC;
      return ctx.K.code([
        ["vocab_matrix.shape", "(6, 8): " + c.table],
        ["embeddings = vocab_matrix[token_ids]", "(4, 8): " + c.rows],
        ["embeddings[" + s.token + ", " + s.feature + "]",
         "= " + X[s.token][s.feature] + ", " + c.from(AC.IDS[s.token], s.feature)],
        ["np.array_equal(embeddings[1], embeddings[3])", "True: " + c.same]
      ]);
    },

    copy: {
      en: {
        tab: "Embedding",
        k: "The embedding lookup · section 04",
        h: "Each id fetches one row of a table: that row is the token's vector",
        claim: "X = E[ids],  X.shape = (4, 8)",
        concept: "An embedding table has one row per vocabulary entry and one column per feature. " +
                 "Indexing it with the ids is a lookup, not a calculation: row 3 of the table " +
                 "<em>is</em> the vector for “I”, copied whole. Stack the four fetched rows " +
                 "and the sentence has become a 4 × 8 matrix, which is what everything after this " +
                 "works on. In a trained model these rows are learned floats, placed so that words " +
                 "used alike sit close together. This table is seeded to 0s and 1s so every sum " +
                 "later on can be checked by eye, and its rows mean nothing about their words.",
        b: "<p>Drag the token slider and watch which row of E lights up. The lit cell of X is that " +
           "same row's feature, unchanged. Then compare the two rows that came from " +
           "“know”; the last picture of the next part comes back to them.</p>",
        predict: "Rows 1 and 3 of X are both “know”. Same numbers, or different?",
        controls: {token: "Token (row of X)", feature: "Feature (column)"},
        np: {
          table: "one row per word",
          rows: "rows 3, 1, 4, 1",
          from: (id, f) => "row " + id + " of E, copied",
          same: "same id, same row"
        },
        readout: (token, feature, value, id, word) =>
          "X[" + token + ", " + feature + "] = <b>" + value + "</b>, copied from row " + id +
          " of E, the row for “" + word + "”. Nothing here is computed, so rows 1 and 3, " +
          "both “know”, are the same row copied twice.",
        aria: (ctx) => "A six by eight table E, with four arrows from ids " + ctx.AC.IDS.join(", ") +
                        " pointing into its rows, and the gathered four by eight table X beside it."
      },
      es: {
        tab: "Embedding",
        k: "La búsqueda del embedding · sección 04",
        h: "Cada id trae una fila de una tabla: esa fila es el vector del token",
        claim: "X = E[ids],  X.shape = (4, 8)",
        concept: "Una tabla de embeddings tiene una fila por entrada del vocabulario y una columna " +
                 "por característica. Indexarla con los ids es una búsqueda, no un cálculo: la " +
                 "fila 3 de la tabla <em>es</em> el vector de “I”, copiado entero. Apila las " +
                 "cuatro filas recogidas y la frase se ha convertido en una matriz de 4 × 8, que es " +
                 "sobre lo que trabaja todo lo que viene después. En un modelo entrenado estas " +
                 "filas son floats aprendidos, colocados de modo que las palabras que se usan " +
                 "parecido queden cerca. Esta tabla está sembrada con 0 y 1 para que cada suma " +
                 "posterior pueda comprobarse a ojo, y sus filas no dicen nada de sus palabras.",
        b: "<p>Arrastra el deslizador de token y observa qué fila de E se ilumina. La celda " +
           "iluminada de X es esa misma característica de esa fila, sin cambiar. Después compara " +
           "las dos filas que vienen de “know”; la última imagen de la parte siguiente " +
           "vuelve a ellas.</p>",
        predict: "Las filas 1 y 3 de X son ambas “know”. ¿Mismos números, o distintos?",
        controls: {token: "Token (fila de X)", feature: "Característica (columna)"},
        np: {
          table: "una fila por palabra",
          rows: "filas 3, 1, 4, 1",
          from: (id, f) => "fila " + id + " de E, copiada",
          same: "mismo id, misma fila"
        },
        readout: (token, feature, value, id, word) =>
          "X[" + token + ", " + feature + "] = <b>" + value + "</b>, copiado de la fila " + id +
          " de E, la de “" + word + "”. Aquí no se calcula nada, así que las filas 1 y 3, " +
          "ambas “know”, son la misma fila copiada dos veces.",
        aria: (ctx) => "Una tabla E de seis por ocho, con cuatro flechas desde los ids " +
                        ctx.AC.IDS.join(", ") + " que apuntan a sus filas, y la tabla X recogida de " +
                        "cuatro por ocho al lado."
      }
    }
  });
})();
