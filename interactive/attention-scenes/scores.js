// Scene 4: the scores are Q against K, contracted over the feature axis —
// the axis that disappears. Scaling by sqrt(D_k) is exactly a halving here,
// because D_k = 4.
(function () {
  "use strict";

  // A term in the written-out dot product. A negative factor is bracketed,
  // because "0×0 + -1×-1" reads as a subtraction and "(-1)×(-1)" does not.
  const term = (v) => (v < 0 ? "(" + v + ")" : String(v));

  function pipeline(ctx) {
    if (ctx.cache.scores) return ctx.cache.scores;
    const AC = ctx.AC;
    const X = AC.gather(AC.embedding(), AC.IDS);
    const P = AC.projections();
    const Q = AC.splitHeads(AC.matmul(X, P.WQ), 2);
    const K = AC.splitHeads(AC.matmul(X, P.WK), 2);
    ctx.cache.scores = {
      Q, K, raw: AC.scores(Q, K, 4, false), scaled: AC.scores(Q, K, 4, true)
    };
    return ctx.cache.scores;
  }

  function draw(ctx) {
    const data = pipeline(ctx);
    const K = ctx.K, svg = ctx.svg, s = ctx.state;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const root = K.el("g", {transform: "translate(0,44)"});
    svg.appendChild(root);
    const L = (s.scale === "sqrt" ? data.scaled : data.raw)[s.head];

    root.appendChild(K.text(320, 14, "L = Q Kᵀ / √D_k,  head " + s.head, {fill: ctx.colour("--stage-ink")}));
    root.appendChild(K.numGrid({
      x: 232, y: 46, cellW: 44, cellH: 38, values: L,
      fmt: (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1)),
      rowLabels: [0, 1, 2, 3].map((i) => "q" + i), colLabels: [0, 1, 2, 3].map((j) => "k" + j),
      mark: (i, j) => i === s.query && j === s.key, colourOf: () => ctx.colour("--at-q")
    }));

    // The two vectors the lit cell contracts, written under the grid in the
    // same columns, and then the sum itself term by term. Numbers rather
    // than bars: the whole claim of this scene is that D_k numbers go in and
    // one comes out, and a reader can only check that by adding them up.
    const q = data.Q[s.head][s.query], k = data.K[s.head][s.key];
    const vector = (label, vec, token, y) => {
      root.appendChild(K.numGrid({
        x: 232, y: y, cellW: 44, cellH: 28, values: [vec], size: 12,
        rowLabels: [label], mark: () => true, colourOf: () => ctx.colour(token)
      }));
    };
    vector("Q[" + s.query + "]", q, "--at-q", 214);
    vector("K[" + s.key + "]", k, "--at-k", 246);

    const raw = q.reduce((sum, v, d) => sum + v * k[d], 0);
    root.appendChild(K.text(320, 294,
      q.map((v, d) => term(v) + "×" + term(k[d])).join(" + ") + "  =  " + raw,
      {size: 12, fill: ctx.colour("--stage-ink"), attrs: {"font-weight": 500}}));
    root.appendChild(K.text(320, 322,
      "L[" + s.query + ", " + s.key + "] = " +
      (s.scale === "sqrt" ? raw + " / √4 = " + L[s.query][s.key] : String(raw)),
      {size: 15, fill: ctx.colour("--at-q")}));
  }

  window.AttentionScenes.register({
    id: "scores",
    section: "06",

    controls: [
      {id: "head", type: "range", min: 0, max: 1, step: 1, fmt: (v) => String(v)},
      {id: "scale", type: "select", options: ["sqrt", "none"]},
      {id: "query", type: "range", min: 0, max: 3, step: 1, fmt: (v) => String(v)},
      {id: "key", type: "range", min: 0, max: 3, step: 1, fmt: (v) => String(v)}
    ],

    // Query 2 against key 1, not the opening 0, 0: head 0's Q rows 1 and 3
    // are all zeros (ids 1 and 3 are the same token, and its first four
    // features land in the other head), so those rows contract to eight
    // 0×0 terms and a flat row of scores. The stage must not open on the
    // one example where nothing it is claiming can be seen happening.
    init(ctx) { Object.assign(ctx.state, {head: 0, scale: "sqrt", query: 2, key: 1}); },
    draw,

    readout(ctx) {
      const data = pipeline(ctx);
      const s = ctx.state;
      const L = (s.scale === "sqrt" ? data.scaled : data.raw)[s.head];
      const flat = L.flat();
      const lmax = Math.max(...flat), lmin = Math.min(...flat);
      const q = data.Q[s.head][s.query], k = data.K[s.head][s.key];
      const raw = q.reduce((sum, v, d) => sum + v * k[d], 0);
      return {
        html: ctx.copy.readout(s.head, s.query, s.key, raw, L[s.query][s.key], lmax, lmin),
        data: {
          shape: "2,4,4", head: s.head, scale: s.scale, dk: 4, contract: "d",
          lmax: lmax, lmin: lmin, halves: "1",
          query: s.query, key: s.key, dot: raw, cell: L[s.query][s.key]
        }
      };
    },

    copy: {
      en: {
        tab: "Scores",
        k: "The axis that disappears · section 06",
        h: "The scores are Q against K, contracted over the feature axis",
        claim: "L = Q Kᵀ / √D_k,  L.shape = (2, 4, 4)",
        concept: "L[b, h, s, t] sums Q[b, h, s, d] K[b, h, t, d] over d — the feature axis is on both " +
                 "sides of the equation before the sum and on neither side after it. Scaling by " +
                 "√D_k keeps the size of the scores from growing with the feature count; here " +
                 "D_k = 4, so √D_k = 2 and the scale is exactly a halving.",
        b: "<p>L is one 4×4 matrix per head: query rows against key columns. The two rows under the " +
           "grid are the vectors the lit cell contracts, and the line below them is that contraction " +
           "written out — eight products, one sum, and the feature axis gone. Switch scale to " +
           "\"none\" and every number in the grid exactly doubles — the halving in the concept above, " +
           "on this head's own numbers.</p>",
        predict: "Switching scale off doubles every score. By how much does it change which row is " +
                 "biggest?",
        eqcap: "d is the feature axis, and it is the one that disappears: it is on both Q and K " +
               "before the sum and on neither side of L after it. b and h are on both sides too, but " +
               "they are never summed over — a batch item's attention never mixes with another's, and " +
               "one head's scores never mix with another head's.",
        controls: {head: "Head", scale: "Scale", query: "Query row", key: "Key column"},
        options: {scale: {sqrt: "÷ √D_k", none: "unscaled"}},
        readout: (head, query, key, raw, cell, lmax, lmin) =>
          "Q[" + query + "] against K[" + key + "] is <b>" + raw + "</b> over eight products, and " +
          "L[" + query + ", " + key + "] = <b>" + cell + "</b>. Head " + head + "'s scores run from " +
          lmin + " to " + lmax + ".",
        aria: (ctx) => "A four by four matrix of scores for head " + ctx.state.head +
                        ", the cell at query row " + ctx.state.query + " and key column " +
                        ctx.state.key + " highlighted, with that query's Q vector, that key's K " +
                        "vector and their dot product written out beneath it."
      },
      es: {
        tab: "Puntuaciones",
        k: "El eje que desaparece · sección 06",
        h: "Las puntuaciones son Q contra K, contraídas sobre el eje de características",
        claim: "L = Q Kᵀ / √D_k,  L.shape = (2, 4, 4)",
        concept: "L[b, h, s, t] suma Q[b, h, s, d] K[b, h, t, d] sobre d: el eje de características " +
                 "está en ambos lados de la ecuación antes de la suma y en ninguno después. " +
                 "Escalar por √D_k evita que el tamaño de las puntuaciones crezca con el " +
                 "número de características; aquí D_k = 4, así que √D_k = 2 y " +
                 "escalar es exactamente dividir entre dos.",
        b: "<p>L es una matriz de 4×4 por cabeza: filas de consulta contra columnas de clave. " +
           "Las dos filas bajo la cuadrícula son los vectores que contrae la celda iluminada, y la " +
           "línea de debajo es esa contracción escrita: ocho productos, una suma y el eje de " +
           "características desaparecido. Cambia scale a «none» y cada número de la cuadrícula se " +
           "duplica exactamente: la división a la mitad del concepto de arriba, en los números " +
           "propios de esta cabeza.</p>",
        predict: "Desactivar scale duplica cada puntuación. ¿En cuánto cambia qué " +
                 "fila es la mayor?",
        eqcap: "d es el eje de características, y es el que desaparece: está en Q y en K " +
               "antes de la suma y en ninguno de los dos lados de L después. b y h también " +
               "están en ambos lados, pero nunca se suman: la atención de un elemento del " +
               "lote nunca se mezcla con la de otro, ni las puntuaciones de una cabeza con las de " +
               "otra.",
        controls: {head: "Cabeza", scale: "Escala", query: "Fila de consulta", key: "Columna de clave"},
        options: {scale: {sqrt: "÷ √D_k", none: "sin escalar"}},
        readout: (head, query, key, raw, cell, lmax, lmin) =>
          "Q[" + query + "] contra K[" + key + "] da <b>" + raw + "</b> sobre ocho productos, y " +
          "L[" + query + ", " + key + "] = <b>" + cell + "</b>. Las puntuaciones de la cabeza " +
          head + " van de " + lmin + " a " + lmax + ".",
        aria: (ctx) => "Una matriz de cuatro por cuatro de puntuaciones para la cabeza " +
                        ctx.state.head + ", con la celda de la fila de consulta " + ctx.state.query +
                        " y la columna de clave " + ctx.state.key + " iluminada, y debajo el vector " +
                        "Q de esa consulta, el vector K de esa clave y su producto escalar escrito."
      }
    }
  });
})();
