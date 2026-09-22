// Scene 6: the output is A against V, contracted over the key axis — a
// weighted average of V's rows, with weights that came from softmax and so
// are non-negative and sum to 1. That makes O a convex combination of V:
// every entry of O sits inside the range V's own column already spans.
// Merging the two heads back together is mergeHeads, the exact inverse of
// splitHeads from the heads scene.
(function () {
  "use strict";

  function pipeline(ctx) {
    if (ctx.cache.output) return ctx.cache.output;
    const AC = ctx.AC;
    const X = AC.gather(AC.embedding(), AC.IDS);
    const P = AC.projections();
    const out = AC.attention(X, 2, {WQ: P.WQ, WK: P.WK, WV: P.WV, scaled: true});
    ctx.cache.output = out;
    return out;
  }

  function draw(ctx) {
    const data = pipeline(ctx);
    const K = ctx.K, svg = ctx.svg, s = ctx.state;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const root = K.el("g", {transform: "translate(0,44)"});
    svg.appendChild(root);

    if (s.merge === "merged") {
      root.appendChild(K.text(150, 20, "O merged (4×8)", {fill: ctx.colour("--stage-ink")}));
      root.appendChild(K.numGrid({
        x: 40, y: 40, cellW: 44, cellH: 30, values: data.merged, size: 10,
        mark: (i) => i === s.query, colourOf: () => ctx.colour("--at-w")
      }));
      return;
    }

    const V = data.V[s.head], A = data.A[s.head], O = data.O[s.head];
    root.appendChild(K.text(120, 20, "V, head " + s.head, {fill: ctx.colour("--stage-ink")}));
    // Tinted when this query gives the row more than an equal share of its
    // weight. The threshold used to be a flat 0.35, which no row of this
    // stage's four ever reaches — the weights run 0.069 to 0.336 — so the
    // tinting the copy promises never once appeared. An equal share is 1/S,
    // which is also the number a uniform row sits exactly on.
    const share = 1 / A[s.query].length;
    const weightColour = (i) => ctx.colour(A[s.query][i] > share ? "--at-v" : "--stage-mute");
    root.appendChild(K.numGrid({
      x: 40, y: 40, cellW: 30, cellH: 32, values: V,
      mark: () => false, textColourOf: weightColour
    }));

    // hi is fixed rather than left to default to the row's own maximum: a
    // row of four equal weights and a row with a clear peak both drew four
    // full-height bars once each was scaled to itself, so dragging the
    // query slider changed the numbers underneath and nothing in the shape.
    root.appendChild(K.bars({
      x: 260, y: 260, w: 120, h: 60, values: A[s.query], gap: 6, hi: 0.5,
      colourOf: () => ctx.colour("--at-v")
    }));
    root.appendChild(K.text(320, 285, "A[" + s.query + "]", {size: 11, fill: ctx.colour("--stage-mute")}));

    root.appendChild(K.text(480, 20, "O, head " + s.head, {fill: ctx.colour("--stage-ink")}));
    root.appendChild(K.numGrid({
      x: 440, y: 40, cellW: 46, cellH: 32, values: O, size: 11,
      mark: (i) => i === s.query, colourOf: () => ctx.colour("--at-w")
    }));
  }

  window.AttentionScenes.register({
    id: "output",
    section: "06",

    controls: [
      {id: "head", type: "range", min: 0, max: 1, step: 1, fmt: (v) => String(v)},
      {id: "query", type: "range", min: 0, max: 3, step: 1, fmt: (v) => String(v)},
      {id: "merge", type: "select", options: ["heads", "merged"]}
    ],

    // Query 2, not the opening 1: head 0's query rows 1 and 3 have an
    // all-zero Q, so their weights come out uniform and the bars are four
    // identical blocks — a weighted average with nothing to see being
    // weighted. Query 2's weights are 0.204, 0.336, 0.124, 0.336, which is
    // the picture this scene exists to draw. Both are still a slider away.
    init(ctx) { Object.assign(ctx.state, {head: 0, query: 2, merge: "heads"}); },
    draw,

    readout(ctx) {
      const data = pipeline(ctx);
      const s = ctx.state;
      const convex = ctx.AC.isConvex(data.O, data.V, 1e-9);
      const omax = Math.max(...data.O[s.head].flat().map(Math.abs));
      return {
        html: ctx.copy.readout(s.head, s.query, convex),
        claim: "O = A V,  (2, 4, 4) → (4, 8)",
        data: {
          shape: "2,4,4", merged: "4,8", contract: "t",
          convex: convex ? "1" : "0", omax: omax.toFixed(3), merge: s.merge
        }
      };
    },

    copy: {
      en: {
        tab: "Output",
        k: "A weighted average of V · section 06",
        h: "The output is A against V, a weighted average of V's rows",
        claim: "O = A V,  (2, 4, 4) → (4, 8)",
        concept: "O[b, h, s, d] sums A[b, h, s, t] V[b, h, t, d] over t, the key axis. Because A's " +
                 "weights are non-negative and each row sums to 1, O's row is a convex combination of " +
                 "V's rows — it can never leave the range V already spans. Merging the heads back into " +
                 "(4, 8) is exactly the inverse of the split two scenes back.",
        b: "<p>The bars are the chosen query's weights over the four value rows, on a fixed scale, so " +
           "a row of four equal weights looks different from one with a peak. A value row is tinted " +
           "when this query gives it more than an equal share — more than 1/4. Flip merge to " +
           "\"merged\" and the two (4, 4) heads become one (4, 8) row per token again.</p>",
        predict: "O is a weighted average of V's rows. Can any entry of O fall outside V's own range?",
        eqcap: "t is the key axis, and it is the one that disappears here — the same axis L's own " +
               "columns are indexed by. d, the feature axis, is on both A's absence and V and O's " +
               "presence, which is why the output has V's own width and not the sequence length.",
        controls: {head: "Head", query: "Query row", merge: "View"},
        options: {merge: {heads: "per head", merged: "merged (4, 8)"}},
        readout: (head, query, convex) =>
          "Head " + head + ", O[" + query + "] is a weighted average of V's four rows — " +
          (convex ? "<b>every entry sits inside V's own range</b>." : "<b>a bound was broken</b>."),
        aria: (ctx) => "V and O for head " + ctx.state.head + ", with query row " + ctx.state.query +
                        "'s attention weights drawn as bars between them."
      },
      es: {
        tab: "Salida",
        k: "Un promedio ponderado de V · sección 06",
        h: "La salida es A contra V, un promedio ponderado de las filas de V",
        claim: "O = A V,  (2, 4, 4) → (4, 8)",
        concept: "O[b, h, s, d] suma A[b, h, s, t] V[b, h, t, d] sobre t, el eje de claves. Como los " +
                 "pesos de A no son negativos y cada fila suma 1, la fila de O es una combinación " +
                 "convexa de las filas de V: nunca puede salir del rango que V ya abarca. Fusionar las " +
                 "cabezas de nuevo en (4, 8) es exactamente el inverso de la división de dos " +
                 "escenas atrás.",
        b: "<p>Las barras son los pesos de la consulta elegida sobre las cuatro filas de valor, en una " +
           "escala fija, así que una fila de cuatro pesos iguales se ve distinta de una con un pico. " +
           "Una fila de valor se tiñe cuando esta consulta le da más que una parte igual: más de 1/4. " +
           "Cambia merge a «merged» y las dos cabezas de (4, 4) vuelven a ser una fila de (4, 8) por " +
           "token.</p>",
        predict: "O es un promedio ponderado de las filas de V. ¿Puede alguna celda de O salir " +
                 "del rango propio de V?",
        eqcap: "t es el eje de claves, y es el que desaparece aquí: el mismo eje que indexa las " +
               "columnas propias de L. d, el eje de características, está tanto en la ausencia de A " +
               "como en la presencia de V y O, por lo que la salida tiene el ancho propio de V y no " +
               "la longitud de la secuencia.",
        controls: {head: "Cabeza", query: "Fila de consulta", merge: "Vista"},
        options: {merge: {heads: "por cabeza", merged: "fusionada (4, 8)"}},
        readout: (head, query, convex) =>
          "Cabeza " + head + ", O[" + query + "] es un promedio ponderado de las cuatro filas de V " +
          "— " + (convex ? "<b>cada celda cae dentro del rango propio de V</b>." : "<b>se " +
          "rompió un límite</b>."),
        aria: (ctx) => "V y O para la cabeza " + ctx.state.head + ", con los pesos de atención de " +
                        "la fila de consulta " + ctx.state.query + " dibujados como barras entre " +
                        "ambas."
      }
    }
  });
})();
