// Scene 5: the scores are Q against K, one dot product per (query, key)
// pair, contracted over the feature axis -- the axis that disappears. One
// head, so L is 4 x 4, and with d_k = 4 the scaling by sqrt(d_k) is exactly a
// halving. Why the scaling is there at all is the next scene's job.
(function () {
  "use strict";

  // A term in the written-out dot product. A negative factor is bracketed,
  // because "0×0 + -1×-1" reads as a subtraction and "(-1)×(-1)" does not.
  const term = (v) => (v < 0 ? "(" + v + ")" : String(v));
  const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

  function pipeline(ctx) {
    if (ctx.cache.scores) return ctx.cache.scores;
    const AC = ctx.AC;
    const X = AC.gather(AC.embedding(), AC.IDS);
    const P = AC.headProjections(0);
    const Q = AC.matmul(X, P.WQ), K = AC.matmul(X, P.WK);
    ctx.cache.scores = {
      Q, K, raw: AC.scores([Q], [K], 4, false)[0], scaled: AC.scores([Q], [K], 4, true)[0]
    };
    return ctx.cache.scores;
  }

  function draw(ctx) {
    const data = pipeline(ctx);
    const K = ctx.K, svg = ctx.svg, s = ctx.state, AC = ctx.AC;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const root = K.el("g", {transform: "translate(0,44)"});
    svg.appendChild(root);
    const L = s.scale === "sqrt" ? data.scaled : data.raw;
    const words = AC.IDS.map((id) => AC.VOCAB[id]);
    const hl = ctx.hl;

    root.appendChild(K.text(150, 104, "queries", {size: 11, anchor: "end", fill: ctx.colour("--at-q")}));
    root.appendChild(K.text(320, 32, "keys", {size: 11, fill: ctx.colour("--at-k")}));
    root.appendChild(K.numGrid({
      x: 232, y: 58, cellW: 44, cellH: 34, values: L, fmt,
      rowLabels: words, colLabels: words,
      // Pointing at s or t in the equation bands that whole row or column.
      mark: (i, j) => (i === s.query && j === s.key) ||
        (hl === "query" && i === s.query) || (hl === "key" && j === s.key),
      colourOf: (i, j) => ctx.colour(hl === "key" && j === s.key && i !== s.query ? "--at-k" : "--at-q")
    }));

    // The two vectors the lit cell contracts, written under the grid in the
    // same columns, and then the sum itself term by term. Numbers rather
    // than bars: the claim is that d_k numbers go in and one comes out, and a
    // reader can only check that by adding them up.
    const q = data.Q[s.query], k = data.K[s.key];
    const vector = (label, vec, token, y) => {
      root.appendChild(K.numGrid({
        x: 232, y: y, cellW: 44, cellH: 26, values: [vec], size: 12,
        rowLabels: [label], mark: () => true, colourOf: () => ctx.colour(token)
      }));
    };
    vector("Q[" + s.query + "]", q, "--at-q", 210);
    vector("K[" + s.key + "]", k, "--at-k", 240);

    const raw = q.reduce((sum, v, d) => sum + v * k[d], 0);
    root.appendChild(K.text(320, 286,
      q.map((v, d) => term(v) + "×" + term(k[d])).join(" + ") + "  =  " + raw,
      {size: 12, fill: ctx.colour("--stage-ink"), attrs: {"font-weight": 500}}));
    root.appendChild(K.text(320, 314,
      "scores[" + s.query + ", " + s.key + "] = " +
      (s.scale === "sqrt" ? raw + " / √4 = " + fmt(L[s.query][s.key]) : String(raw)),
      {size: 15, fill: ctx.colour("--at-q")}));
  }

  window.AttentionScenes.register({
    id: "scores",
    section: "06",

    controls: [
      {id: "query", type: "range", min: 0, max: 3, step: 1, fmt: (v) => String(v)},
      {id: "key", type: "range", min: 0, max: 3, step: 1, fmt: (v) => String(v)},
      {id: "scale", type: "select", options: ["sqrt", "none"]}
    ],

    // Query 2 against key 1, not 0, 0: rows 1 and 3 of Q ("know") are all
    // zeros in this head, so those rows contract to four 0×0 terms and a flat
    // row of scores. The stage must not open on the one example where
    // nothing it is claiming can be seen happening.
    init(ctx) { Object.assign(ctx.state, {scale: "sqrt", query: 2, key: 1}); },
    draw,

    readout(ctx) {
      const data = pipeline(ctx);
      const s = ctx.state, AC = ctx.AC;
      const L = s.scale === "sqrt" ? data.scaled : data.raw;
      const flat = L.flat();
      const lmax = Math.max(...flat), lmin = Math.min(...flat);
      const q = data.Q[s.query], k = data.K[s.key];
      const raw = q.reduce((sum, v, d) => sum + v * k[d], 0);
      const words = AC.IDS.map((id) => AC.VOCAB[id]);
      const best = L[s.query].indexOf(Math.max(...L[s.query]));
      return {
        html: ctx.copy.readout(words[s.query], words[s.key], raw, L[s.query][s.key], words[best]),
        claim: s.scale === "sqrt" ? "scores = Q Kᵀ / √d_k" : "scores = Q Kᵀ",
        data: {
          shape: "4,4", scale: s.scale, dk: 4, contract: "d",
          lmax: lmax, lmin: lmin, halves: "1",
          query: s.query, key: s.key, dot: raw, cell: L[s.query][s.key]
        }
      };
    },

    code(ctx) {
      const data = pipeline(ctx);
      const s = ctx.state, c = ctx.copy.np;
      const L = s.scale === "sqrt" ? data.scaled : data.raw;
      return ctx.K.code([
        ["d_k = Q.shape[-1]", "4"],
        s.scale === "sqrt"
          ? ["scores = np.dot(Q, K.T) / np.sqrt(d_k)", c.shape]
          : ["scores = np.dot(Q, K.T)", c.unscaled],
        ["scores[" + s.query + ", " + s.key + "]", "= " + fmt(L[s.query][s.key]) + ", " + c.cell(s.query, s.key)]
      ]);
    },

    copy: {
      en: {
        tab: "Scores",
        k: "How well does each key answer each query · section 06",
        h: "A score is one query's dot product with one key",
        claim: "scores = Q Kᵀ / √d_k",
        concept: "To decide how much token s should listen to token t, compare what s is looking " +
                 "for with what t advertises: the dot product of s's query with t's key. Two vectors " +
                 "that point the same way give a large positive number, two that are unrelated give " +
                 "something near zero, and two that point in opposite directions give a negative " +
                 "one. Doing that for every pair at once is one matrix product, Q Kᵀ, which is a " +
                 "4 × 4 table with queries down the side and keys across the top. The feature axis " +
                 "d is summed away, so it is on both factors and on neither side of the result.",
        b: "<p>The two rows under the grid are the vectors the lit cell contracts, and the line " +
           "below them is that contraction written out: four products, one sum. Here d_k = 4, so " +
           "dividing by √d_k is exactly halving. Switch it off and every number in the grid " +
           "doubles. Now try the “know” rows: their query is all zeros, so every score in " +
           "those rows is 0.</p>",
        predict: "Switching the scale off doubles every score. Does it change which key each query " +
                 "scores highest?",
        eqcap: "d is the feature axis, and it is the one that disappears: it is on both Q and K " +
               "before the sum and on neither side of scores after it. s indexes queries (rows) " +
               "and t indexes keys (columns), and both survive. Point at a letter to band that axis " +
               "on the stage. In the code, L is scores.",
        controls: {query: "Query (row)", key: "Key (column)", scale: "Scale"},
        options: {scale: {sqrt: "÷ √d_k", none: "unscaled"}},
        np: {
          shape: "(4, 4): query rows, key columns",
          unscaled: "(4, 4), every entry twice as large",
          cell: (q, k) => "Q[" + q + "] · K[" + k + "]"
        },
        readout: (qw, kw, raw, cell, best) =>
          "“" + qw + "”'s query against “" + kw + "”'s key is <b>" + raw + "</b> over " +
          "four products, and its score is <b>" + cell + "</b>. The key this query scores " +
          "highest is “" + best + "” (the first, where two tie).",
        aria: (ctx) => "A four by four matrix of scores, the cell at query row " + ctx.state.query +
                        " and key column " + ctx.state.key + " highlighted, with that query's Q " +
                        "vector, that key's K vector and their dot product written out beneath it."
      },
      es: {
        tab: "Puntuaciones",
        k: "Cuánto responde cada clave a cada consulta · sección 06",
        h: "Una puntuación es el producto punto de una consulta con una clave",
        claim: "scores = Q Kᵀ / √d_k",
        concept: "Para decidir cuánto debe escuchar el token s al token t, se compara lo que busca " +
                 "s con lo que anuncia t: el producto punto de la consulta de s con la clave de t. " +
                 "Dos vectores que apuntan hacia el mismo lado dan un número positivo grande, dos " +
                 "que no tienen relación dan algo cercano a cero, y dos opuestos dan uno negativo. " +
                 "Hacerlo para todos los pares a la vez es un único producto de matrices, Q Kᵀ, " +
                 "una tabla de 4 × 4 con las consultas en las filas y las claves en las columnas. " +
                 "El eje de características d se suma y desaparece: está en ambos factores y en " +
                 "ningún lado del resultado.",
        b: "<p>Las dos filas bajo la cuadrícula son los vectores que contrae la celda iluminada, y " +
           "la línea de debajo es esa contracción escrita: cuatro productos, una suma. Aquí " +
           "d_k = 4, así que dividir entre √d_k es exactamente dividir entre dos. Desactívalo y " +
           "cada número de la cuadrícula se duplica. Prueba ahora las filas “know”: su " +
           "consulta es toda ceros, así que cada puntuación de esas filas es 0.</p>",
        predict: "Desactivar la escala duplica cada puntuación. ¿Cambia qué clave puntúa más alto " +
                 "para cada consulta?",
        eqcap: "d es el eje de características, y es el que desaparece: está en Q y en K antes de " +
               "la suma y en ningún lado de scores después. s indexa las consultas (filas) y t las " +
               "claves (columnas), y ambos sobreviven. Señala una letra para resaltar ese eje en " +
               "el escenario. En el código, L es scores.",
        controls: {query: "Consulta (fila)", key: "Clave (columna)", scale: "Escala"},
        options: {scale: {sqrt: "÷ √d_k", none: "sin escalar"}},
        np: {
          shape: "(4, 4): filas consulta, columnas clave",
          unscaled: "(4, 4), cada celda el doble",
          cell: (q, k) => "Q[" + q + "] · K[" + k + "]"
        },
        readout: (qw, kw, raw, cell, best) =>
          "La consulta de “" + qw + "” contra la clave de “" + kw + "” da <b>" + raw +
          "</b> sobre cuatro productos, y su puntuación es <b>" + cell + "</b>. La clave que " +
          "esta consulta puntúa más alto es “" + best + "” (la primera, si empatan).",
        aria: (ctx) => "Una matriz de cuatro por cuatro de puntuaciones, con la celda de la fila de " +
                        "consulta " + ctx.state.query + " y la columna de clave " + ctx.state.key +
                        " iluminada, y debajo el vector Q de esa consulta, el vector K de esa clave " +
                        "y su producto punto escrito."
      }
    }
  });
})();
