// Scene 7: softmax turns a row of scores into weights -- exponentiate, then
// divide by the row's total -- so every weight is positive, the row sums to
// exactly 1, and a bigger score still means a bigger weight. The chosen
// query's row is worked through on the right, one step per line. Normalised
// over the queries instead, on purpose, the rows do not sum to 1, which is
// the point of the axis control. A causal mask sends the future's score to
// -Infinity before the softmax, and softmax turns that into an exact zero
// weight, never a small one.
(function () {
  "use strict";

  const f1 = (v) => (v === -Infinity ? "−∞" : Number.isInteger(v) ? String(v) : v.toFixed(1));

  function pipeline(ctx) {
    if (ctx.cache.softmax) return ctx.cache.softmax;
    const AC = ctx.AC;
    const X = AC.gather(AC.embedding(), AC.IDS);
    const P = AC.headProjections(0);
    const Q = AC.matmul(X, P.WQ), K = AC.matmul(X, P.WK);
    ctx.cache.softmax = {L: AC.scores([Q], [K], 4, true), mask: AC.causalMask(4)};
    return ctx.cache.softmax;
  }

  function current(ctx) {
    const data = pipeline(ctx), s = ctx.state, AC = ctx.AC;
    const L = s.mask === "causal" ? AC.applyMask(data.L, data.mask) : data.L;
    return {L, A: AC.softmax(L, s.axis)};
  }

  function draw(ctx) {
    const {L, A} = current(ctx);
    const K = ctx.K, svg = ctx.svg, s = ctx.state, AC = ctx.AC;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const root = K.el("g", {transform: "translate(0,44)"});
    svg.appendChild(root);
    const words = AC.IDS.map((id) => AC.VOCAB[id]);
    const hl = ctx.hl;
    // Pointing at s or t in the equation bands the chosen row: s picks the
    // row, and the sum over t runs along it.
    const band = (i) => (hl === "query" || hl === "key") && i === s.query;

    // The group is translated clear of the claim chip, so everything below
    // has 356 units of height to live in rather than the viewBox's 400. Two
    // four-row grids and a bar chart only fit at cellH = 30; at 34 the last
    // row of A was drawn past the bottom edge and simply vanished.
    root.appendChild(K.text(150, 14, "scores", {fill: ctx.colour("--stage-ink")}));
    root.appendChild(K.numGrid({
      x: 70, y: 32, cellW: 40, cellH: 30, values: L[0], fmt: f1, rowLabels: words,
      colourOf: (i, j) => ctx.colour(L[0][i][j] === -Infinity ? "--at-res" : "--at-q"),
      mark: (i, j) => L[0][i][j] === -Infinity || i === s.query || band(i)
    }));

    root.appendChild(K.text(186, 178, "attn_weights, over " + (s.axis === "keys" ? "keys (t)" : "queries (s)"),
      {fill: ctx.colour("--stage-ink")}));
    root.appendChild(K.numGrid({
      x: 70, y: 196, cellW: 58, cellH: 30, values: A[0], rowLabels: words,
      fmt: (v) => v.toFixed(2), size: 12,
      colourOf: () => ctx.colour("--at-w"),
      mark: (i, j) => i === s.query || band(i)
    }));

    // The chosen query's row, worked: the scores, their exponentials, and
    // each exponential over the row's total. Under "queries" the bottom line
    // is still what A holds, which is why it stops summing to 1.
    const row = L[0][s.query];
    const ex = row.map((v) => Math.exp(v));
    const total = ex.reduce((a, b) => a + b, 0);
    root.appendChild(K.text(496, 14, "row " + s.query + " (“" + words[s.query] + "”)",
      {fill: ctx.colour("--stage-ink")}));
    root.appendChild(K.numGrid({
      x: 384, y: 32, cellW: 58, cellH: 30,
      values: [row, ex, A[0][s.query]],
      fmt: (v, i) => (i === 0 ? f1(v) : v.toFixed(2)), size: 12,
      rowLabels: ["score", "exp", "weight"],
      mark: (i) => i === 2, colourOf: () => ctx.colour("--at-w")
    }));
    root.appendChild(K.text(496, 136, "Σ exp = " + total.toFixed(2),
      {size: 12, fill: ctx.colour("--stage-mute")}));

    const sums = AC.rowSums(A, "t")[0];
    root.appendChild(K.text(490, 190, "each row's sum over t", {size: 11, fill: ctx.colour("--stage-mute")}));
    root.appendChild(K.bars({
      x: 400, y: 316, w: 180, h: 90, values: sums, hi: 1.2, gap: 8,
      labels: words,
      colourOf: (i) => Math.abs(sums[i] - 1) < 1e-6 ? ctx.colour("--at-w") : ctx.colour("--at-res")
    }));
  }

  window.AttentionScenes.register({
    id: "softmax",
    section: "B",

    controls: [
      {id: "query", type: "range", min: 0, max: 3, step: 1, fmt: (v) => String(v)},
      {id: "axis", type: "select", options: ["keys", "queries"]},
      {id: "mask", type: "select", options: ["none", "causal"]}
    ],

    init(ctx) { Object.assign(ctx.state, {query: 2, axis: "keys", mask: "none"}); },
    draw,

    readout(ctx) {
      const {A} = current(ctx);
      const s = ctx.state, AC = ctx.AC;
      const sums = AC.rowSums(A, "t")[0];
      let worst = 0;
      for (let i = 1; i < sums.length; i++) if (Math.abs(sums[i] - 1) > Math.abs(sums[worst] - 1)) worst = i;
      const rowsum = sums[worst].toFixed(3);
      const amax = Math.max(...A[0].flat());
      // masked counts the causally-forbidden cells in L; exactzero is a
      // boolean check that softmax turned at least one of them into an
      // *exact* zero weight in A, never a small positive one.
      let masked = 0, exactZero = 0;
      if (s.mask === "causal") {
        const mask = pipeline(ctx).mask;
        for (const r of mask) for (const v of r) if (v === -Infinity) masked++;
        exactZero = A[0].some((r) => r.some((v) => v === 0)) ? 1 : 0;
      }
      return {
        html: ctx.copy.readout(s.axis, worst, rowsum),
        data: {
          shape: "4,4",
          axis: s.axis, mask: s.mask, rowsum: rowsum, worstrow: worst,
          masked: masked, exactzero: exactZero, amax: amax.toFixed(3),
          over: s.axis === "keys" ? "t" : "s", query: s.query
        }
      };
    },

    code(ctx) {
      const {A} = current(ctx);
      const s = ctx.state, c = ctx.copy.np, K = ctx.K;
      const axis = s.axis === "keys" ? "-1" : "0";
      const rows = [];
      if (s.mask === "causal") {
        rows.push("# " + c.mask);
        rows.push("scores = np.where(np.tri(4, dtype=bool), scores, -np.inf)");
      }
      if (s.axis === "queries") rows.push("# " + c.wrong);
      rows.push("attn_weights = np.exp(scores) / np.sum(np.exp(scores), axis=" + axis +
                ", keepdims=True)");
      rows.push(["attn_weights[" + s.query + "]", K.npRow(A[0][s.query])]);
      rows.push(["attn_weights.sum(axis=-1)", K.npRow(ctx.AC.rowSums(A, "t")[0])]);
      rows.push("# " + c.stable);
      return K.code(rows);
    },

    copy: {
      en: {
        tab: "Softmax",
        k: "Weights that sum to one · Appendix B",
        h: "Softmax turns each row of scores into weights that sum to exactly one",
        claim: "attn_weights = softmax(scores),  each row sums to 1",
        concept: "Scores can be any size and either sign, but the next step takes a weighted " +
                 "average, and that needs weights that are positive and add up to 1. Softmax " +
                 "gets both in two moves. Exponentiating makes every score positive and keeps " +
                 "their order, so a bigger score still means a bigger weight. Dividing by the " +
                 "row's total then makes the row add up to exactly 1. Since e<sup>a</sup> / " +
                 "e<sup>b</sup> = e<sup>a−b</sup>, only the gaps between scores matter, which is " +
                 "why the previous picture's spread mattered so much.",
        b: "<p>The right-hand panel works one row through: its scores, their exponentials, and " +
           "each exponential divided by the total Σ. Move the query slider to change the row. " +
           "The “know” rows have four equal scores, so they get four equal weights of 0.25: " +
           "a query that matches nothing spreads its attention evenly. Switch axis to " +
           "“queries” and the bars stop reading 1.00. Switch mask to “causal” and every " +
           "later key becomes −∞, which softmax turns into an exact 0.</p>",
        predict: "A score of −∞ goes into the softmax. What weight comes out: small, or exactly 0?",
        eqcap: "exp makes every term positive, and the sum underneath runs over t′, every key in " +
               "the same row, so the weights in a row add up to exactly 1. s, the query, is the " +
               "same on the top and the bottom: each query's row is normalised on its own. In the code, " +
               "L is scores and A is attn_weights.",
        controls: {query: "Query (row)", axis: "Normalise over", mask: "Mask"},
        options: {axis: {keys: "keys (ordinary attention)", queries: "queries (the wrong axis, on purpose)"},
                  mask: {none: "none", causal: "causal"}},
        np: {
          mask: "hide every later key",
          wrong: "axis=0 normalises each column: the wrong way, on purpose",
          stable: "real code subtracts scores.max(axis=-1, keepdims=True) first; same result"
        },
        readout: (axis, worst, rowsum) =>
          "Row " + worst + " sums to <b>" + rowsum + "</b> over t" +
          (axis === "keys" ? ", and so does every other row." : ", not 1.000. That is what normalising the wrong axis does."),
        aria: (ctx) => "The scores and the attention weights as four by four grids, the row for query " +
                        ctx.state.query + " worked through as score, exponential and weight, and " +
                        "each row's sum drawn as a bar chart."
      },
      es: {
        tab: "Softmax",
        k: "Pesos que suman uno · Apéndice B",
        h: "Softmax convierte cada fila de puntuaciones en pesos que suman exactamente uno",
        claim: "attn_weights = softmax(scores),  cada fila suma 1",
        concept: "Las puntuaciones pueden ser de cualquier tamaño y signo, pero el paso siguiente " +
                 "hace un promedio ponderado, y para eso hacen falta pesos positivos que sumen 1. " +
                 "Softmax consigue las dos cosas en dos movimientos. La exponencial hace positiva " +
                 "cada puntuación y conserva su orden, así que una puntuación mayor sigue dando un " +
                 "peso mayor. Dividir entre el total de la fila hace que la fila sume exactamente " +
                 "1. Como e<sup>a</sup> / e<sup>b</sup> = e<sup>a−b</sup>, solo importan las " +
                 "diferencias entre puntuaciones, y por eso importaba tanto la dispersión de la " +
                 "imagen anterior.",
        b: "<p>El panel de la derecha desarrolla una fila: sus puntuaciones, sus exponenciales y " +
           "cada exponencial dividida entre el total Σ. Mueve el deslizador de consulta para " +
           "cambiar de fila. Las filas “know” tienen cuatro puntuaciones iguales, así que " +
           "reciben cuatro pesos iguales de 0.25: una consulta que no encaja con nada reparte su " +
           "atención por igual. Cambia axis a “queries” y las barras dejan de marcar 1.00. " +
           "Cambia mask a “causal” y cada clave posterior pasa a −∞, que softmax convierte " +
           "en un 0 exacto.</p>",
        predict: "Una puntuación de −∞ entra en el softmax. ¿Qué peso sale: pequeño, o exactamente 0?",
        eqcap: "exp hace positivo cada término, y la suma de abajo recorre t′, todas las claves de " +
               "la misma fila, así que los pesos de una fila suman exactamente 1. s, la consulta, " +
               "es la misma arriba y abajo: cada fila de consulta se normaliza por su cuenta. En el " +
               "código, L es scores y A es attn_weights.",
        controls: {query: "Consulta (fila)", axis: "Normalizar sobre", mask: "Máscara"},
        options: {axis: {keys: "claves (atención habitual)", queries: "consultas (el eje erróneo, a propósito)"},
                  mask: {none: "ninguna", causal: "causal"}},
        np: {
          mask: "oculta cada clave posterior",
          wrong: "axis=0 normaliza cada columna: el eje erróneo, a propósito",
          stable: "el código real resta antes scores.max(axis=-1, keepdims=True); igual"
        },
        readout: (axis, worst, rowsum) =>
          "La fila " + worst + " suma <b>" + rowsum + "</b> sobre t" +
          (axis === "keys" ? ", y también todas las demás." : ", no 1.000. Eso hace normalizar el eje erróneo."),
        aria: (ctx) => "Las puntuaciones y los pesos de atención como cuadrículas de cuatro por " +
                        "cuatro, la fila de la consulta " + ctx.state.query + " desarrollada como " +
                        "puntuación, exponencial y peso, y la suma de cada fila como gráfico de barras."
      }
    }
  });
})();
