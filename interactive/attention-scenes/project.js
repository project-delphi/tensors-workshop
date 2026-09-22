// Scene 4: three copies of the same product, X against three different
// weight matrices, give Q, K and V -- one attention head, so each W is 8 x 4
// and d_k = 4. The three matrices are columns 0-3 of the full 8 x 8
// projections the heads scene splits later (AC.headProjections(0)), so every
// number on this part of the stage is head 0's number there too. One row of
// X and one column of the chosen W are lit, and the dot product between
// them is written out term by term.
(function () {
  "use strict";

  // A factor in the written-out dot product. A negative one is bracketed:
  // "1×−1 + 1×−1" reads as a chain of subtractions, "1×(−1) + 1×(−1)" as two
  // products.
  const term = (v) => (v < 0 ? "(" + v + ")" : String(v));

  function pipeline(ctx) {
    if (ctx.cache.proj) return ctx.cache.proj;
    const AC = ctx.AC;
    const X = AC.gather(AC.embedding(), AC.IDS);
    const P = AC.headProjections(0);
    ctx.cache.proj = {
      X, P,
      Q: AC.matmul(X, P.WQ), K: AC.matmul(X, P.WK), V: AC.matmul(X, P.WV)
    };
    return ctx.cache.proj;
  }

  const ROLE = {q: "--at-q", k: "--at-k", v: "--at-v"};

  function draw(ctx) {
    const data = pipeline(ctx);
    const K = ctx.K, svg = ctx.svg, s = ctx.state, AC = ctx.AC;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const root = K.el("g", {transform: "translate(0,44)"});
    svg.appendChild(root);
    const L = s.which.toUpperCase();
    const W = data.P["W" + L];
    const out = data[L];
    const roleTok = ROLE[s.which];

    root.appendChild(K.text(144, 16, "X (4×8)", {fill: ctx.colour("--stage-ink")}));
    root.appendChild(K.numGrid({
      x: 56, y: 34, cellW: 22, cellH: 26, values: data.X, size: 12,
      rowLabels: AC.IDS.map((id) => AC.VOCAB[id]),
      mark: (i) => i === s.row, colourOf: () => ctx.colour("--at-w")
    }));
    root.appendChild(K.text(247, 86, "×", {size: 20, fill: ctx.colour("--stage-mute")}));

    root.appendChild(K.text(314, 16, "W_" + s.which + " (8×4)", {fill: ctx.colour("--stage-ink")}));
    root.appendChild(K.numGrid({
      x: 262, y: 34, cellW: 26, cellH: 24, values: W, size: 12,
      mark: (i, j) => j === s.col, colourOf: () => ctx.colour(roleTok)
    }));
    root.appendChild(K.text(393, 86, "=", {size: 20, fill: ctx.colour("--stage-mute")}));

    root.appendChild(K.text(500, 16, L + " (4×4)", {fill: ctx.colour("--stage-ink")}));
    root.appendChild(K.numGrid({
      x: 420, y: 34, cellW: 40, cellH: 26, values: out,
      mark: (i, j) => i === s.row && j === s.col, colourOf: () => ctx.colour(roleTok)
    }));

    const terms = data.X[s.row].map((v, d) => term(v) + "×" + term(W[d][s.col])).join(" + ");
    root.appendChild(K.text(320, 272, terms, {size: 12, fill: ctx.colour("--stage-ink"), attrs: {"font-weight": 500}}));
    root.appendChild(K.text(320, 300, L + "[" + s.row + ", " + s.col + "] = " + out[s.row][s.col],
      {size: 15, fill: ctx.colour(roleTok)}));
    root.appendChild(K.text(320, 330, ctx.copy.role[s.which],
      {size: 12, fill: ctx.colour("--stage-mute"), mono: false}));
  }

  window.AttentionScenes.register({
    id: "project",
    section: "06",
    part: {en: "One attention head", es: "Una cabeza de atención"},

    controls: [
      {id: "which", type: "select", options: ["q", "k", "v"]},
      {id: "row", type: "range", min: 0, max: 3, step: 1, fmt: (v) => String(v)},
      {id: "col", type: "range", min: 0, max: 3, step: 1, fmt: (v) => String(v)}
    ],

    init(ctx) { Object.assign(ctx.state, {which: "q", row: 0, col: 0}); },
    draw,

    readout(ctx) {
      const data = pipeline(ctx);
      const s = ctx.state;
      const out = data[s.which.toUpperCase()];
      const dot = out[s.row][s.col];
      const all = [data.Q, data.K, data.V].every((M) => M.flat().every(Number.isInteger));
      return {
        html: ctx.copy.readout(s.which.toUpperCase(), s.row, s.col, dot),
        data: {
          shape: "4,4", which: s.which, wparams: 3 * 8 * 4, terms: 8, dk: 4,
          dot: dot, integer: all ? "1" : "0"
        }
      };
    },

    code(ctx) {
      const data = pipeline(ctx);
      const s = ctx.state, c = ctx.copy.np;
      const L = s.which.toUpperCase();
      return ctx.K.code([
        ["W_q.shape", "(8, 4): " + c.shape],
        ["Q = np.dot(embeddings, W_q)", c.q],
        ["K = np.dot(embeddings, W_k)", c.k],
        ["V = np.dot(embeddings, W_v)", c.v],
        [L + "[" + s.row + ", " + s.col + "]",
         "= " + data[L][s.row][s.col] + ", " + c.cell(s.row, s.col, s.which)]
      ]);
    },

    copy: {
      en: {
        tab: "Q, K, V",
        k: "Queries, keys and values · section 06",
        h: "Each token asks, advertises and offers: Q, K and V",
        claim: "Q = X W_q,  K = X W_k,  V = X W_v",
        concept: "Attention lets each token gather information from the others, and it gives every " +
                 "token three roles to do that. Its <b>query</b> is what it is looking for. Its " +
                 "<b>key</b> is what it advertises, the thing other tokens' queries are matched " +
                 "against. Its <b>value</b> is what it actually hands over once it has been " +
                 "chosen. All three are the same operation, the token's row of X times a learned " +
                 "weight matrix, done with three different matrices. Keeping the key separate from " +
                 "the value means “how findable am I” and “what do I contribute” can be " +
                 "learned apart.",
        b: "<p>Each W is 8 × 4: eight features in and d_k = 4 out, so Q, K and V are each 4 × 4, " +
           "one row per token. Pick a matrix and a cell. The lit row of X and the lit column of W " +
           "are multiplied term by term below, and their sum is the lit cell.</p>",
        predict: "Rows 1 and 3 of X are both “know”. Will rows 1 and 3 of Q be the same?",
        controls: {which: "Matrix", row: "Row of X (token)", col: "Column of W"},
        options: {which: {q: "Q = X W_q (queries)", k: "K = X W_k (keys)", v: "V = X W_v (values)"}},
        role: {q: "query: what this token is looking for",
               k: "key: what this token advertises to the others",
               v: "value: what this token hands over when chosen"},
        np: {
          shape: "8 features in, d_k = 4 out",
          q: "(4, 4): what each token looks for",
          k: "(4, 4): what each token advertises",
          v: "(4, 4): what each token hands over",
          cell: (r, c, w) => "row " + r + " of X · column " + c + " of W_" + w
        },
        readout: (which, row, col, dot) =>
          which + "[" + row + ", " + col + "] = <b>" + dot + "</b>, the dot product of X's row " + row +
          " and W_" + which.toLowerCase() + "'s column " + col + ": eight products, summed. The " +
          "three matrices hold 3 × 8 × 4 = 96 learned numbers. Rows 1 and 3 of Q, K and V are " +
          "identical, because the rows of X they came from are.",
        aria: (ctx) => "X, the weight matrix W_" + ctx.state.which + " and the product " +
                        ctx.state.which.toUpperCase() + ", with one row and one column lit and " +
                        "their eight-term dot product written out."
      },
      es: {
        tab: "Q, K, V",
        k: "Consultas, claves y valores · sección 06",
        h: "Cada token pregunta, se anuncia y ofrece: Q, K y V",
        claim: "Q = X W_q,  K = X W_k,  V = X W_v",
        concept: "La atención deja que cada token recoja información de los demás, y para eso le " +
                 "da tres papeles. Su <b>consulta</b> es lo que busca. Su <b>clave</b> es lo que " +
                 "anuncia, aquello contra lo que se comparan las consultas de los otros tokens. Su " +
                 "<b>valor</b> es lo que entrega de verdad una vez elegido. Los tres son la misma " +
                 "operación, la fila del token en X por una matriz de pesos aprendida, hecha con " +
                 "tres matrices distintas. Separar la clave del valor permite aprender por " +
                 "separado “cuánto se me encuentra” y “qué aporto”.",
        b: "<p>Cada W es de 8 × 4: ocho características de entrada y d_k = 4 de salida, así que " +
           "Q, K y V son de 4 × 4, una fila por token. Elige una matriz y una celda. La fila " +
           "iluminada de X y la columna iluminada de W se multiplican término a término abajo, y " +
           "su suma es la celda iluminada.</p>",
        predict: "Las filas 1 y 3 de X son ambas “know”. ¿Serán iguales las filas 1 y 3 de Q?",
        controls: {which: "Matriz", row: "Fila de X (token)", col: "Columna de W"},
        options: {which: {q: "Q = X W_q (consultas)", k: "K = X W_k (claves)", v: "V = X W_v (valores)"}},
        role: {q: "consulta: lo que busca este token",
               k: "clave: lo que este token anuncia a los demás",
               v: "valor: lo que este token entrega si se le elige"},
        np: {
          shape: "8 de entrada, d_k = 4 de salida",
          q: "(4, 4): lo que busca cada token",
          k: "(4, 4): lo que anuncia cada token",
          v: "(4, 4): lo que entrega cada token",
          cell: (r, c, w) => "fila " + r + " de X · columna " + c + " de W_" + w
        },
        readout: (which, row, col, dot) =>
          which + "[" + row + ", " + col + "] = <b>" + dot + "</b>, el producto punto de la fila " + row +
          " de X y la columna " + col + " de W_" + which.toLowerCase() + ": ocho productos, sumados. " +
          "Las tres matrices guardan 3 × 8 × 4 = 96 números aprendidos. Las filas 1 y 3 de Q, K y V " +
          "son idénticas, porque lo son las filas de X de las que salen.",
        aria: (ctx) => "X, la matriz de pesos W_" + ctx.state.which + " y el producto " +
                        ctx.state.which.toUpperCase() + ", con una fila y una columna iluminadas y " +
                        "su producto punto de ocho términos escrito."
      }
    }
  });
})();
