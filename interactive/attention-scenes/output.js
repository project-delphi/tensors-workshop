// Scene 8: the output is the attention weights against V, contracted over
// the key axis -- each token's new vector is a weighted average of every
// token's value, with weights that came from softmax and so are
// non-negative and sum to 1. That makes it a convex combination: every entry
// sits inside the range V's own column already spans. And the two "know"
// rows come out identical, because nothing so far has told attention where
// a token is -- the honest end of the one-head story, and the reason real
// models add positional encodings.
(function () {
  "use strict";

  function pipeline(ctx) {
    if (ctx.cache.output) return ctx.cache.output;
    const AC = ctx.AC;
    const X = AC.gather(AC.embedding(), AC.IDS);
    const P = AC.headProjections(0);
    const Q = AC.matmul(X, P.WQ), K = AC.matmul(X, P.WK), V = AC.matmul(X, P.WV);
    const A = AC.softmax(AC.scores([Q], [K], 4, true), "keys");
    const O = AC.attend(A, [V]);
    ctx.cache.output = {X, V, A: A[0], O: O[0], convex: AC.isConvex(O, [V], 1e-9)};
    return ctx.cache.output;
  }

  const same = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-12);

  function draw(ctx) {
    const data = pipeline(ctx);
    const K = ctx.K, svg = ctx.svg, s = ctx.state, AC = ctx.AC;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const root = K.el("g", {transform: "translate(0,44)"});
    svg.appendChild(root);
    const words = AC.IDS.map((id) => AC.VOCAB[id]);
    const {V, A, O} = data;
    const hl = ctx.hl;

    root.appendChild(K.text(140, 16, "V (values)", {fill: ctx.colour("--stage-ink")}));
    // A value row is tinted when this query gives it more than an equal
    // share of its weight, 1/S -- which is also exactly where a uniform row
    // of weights sits, so a "know" query tints nothing.
    const share = 1 / A[s.query].length;
    root.appendChild(K.numGrid({
      x: 60, y: 36, cellW: 40, cellH: 32, values: V, rowLabels: words,
      mark: () => hl === "key" || hl === "feat",
      colourOf: () => ctx.colour("--at-v"),
      textColourOf: (i) => ctx.colour(A[s.query][i] > share + 1e-12 ? "--at-v" : "--stage-mute")
    }));

    // hi is fixed rather than left to default to the row's own maximum: a
    // row of four equal weights and a row with a clear peak would otherwise
    // both draw four full-height bars.
    root.appendChild(K.text(318, 16, "weights of “" + words[s.query] + "”",
      {size: 12, fill: ctx.colour("--at-w")}));
    root.appendChild(K.bars({
      x: 258, y: 160, w: 120, h: 110, values: A[s.query], gap: 6, hi: 0.5,
      labels: A[s.query].map((v) => v.toFixed(2)),
      colourOf: () => ctx.colour("--at-w")
    }));

    root.appendChild(K.text(526, 16, "output", {fill: ctx.colour("--stage-ink")}));
    root.appendChild(K.numGrid({
      x: 430, y: 36, cellW: 48, cellH: 32, values: O, size: 12, rowLabels: words,
      mark: (i) => i === s.query,
      colourOf: () => ctx.colour("--at-w")
    }));

    // The weighted sum for the chosen query, written out in words and
    // weights, then the row it lands on.
    const terms = A[s.query].map((w, t) => w.toFixed(2) + "·V[" + t + "]").join(" + ");
    root.appendChild(K.text(320, 222, "output[" + s.query + "] = " + terms,
      {size: 12, fill: ctx.colour("--stage-ink"), attrs: {"font-weight": 500}}));
    root.appendChild(K.text(320, 248, "= [" + O[s.query].map((v) => v.toFixed(2)).join(", ") + "]",
      {size: 14, fill: ctx.colour("--at-w")}));

    const twin = same(O[1], O[3]);
    root.appendChild(K.text(320, 300,
      twin ? ctx.copy.twin : ctx.copy.untwin,
      {size: 12, fill: ctx.colour("--stage-ink"), mono: false}));
    root.appendChild(K.text(320, 322, ctx.copy.twin2,
      {size: 12, fill: ctx.colour("--stage-mute"), mono: false}));
  }

  window.AttentionScenes.register({
    id: "output",
    section: "06",

    controls: [
      {id: "query", type: "range", min: 0, max: 3, step: 1, fmt: (v) => String(v)}
    ],

    // Query 2 ("you"), not the opening 1: the "know" rows have an all-zero
    // query, so their weights are uniform and the bars are four identical
    // blocks -- a weighted average with nothing to see being weighted. It is
    // still one slider step away, and the copy sends the reader there.
    init(ctx) { Object.assign(ctx.state, {query: 2}); },
    draw,

    readout(ctx) {
      const data = pipeline(ctx);
      const s = ctx.state, AC = ctx.AC;
      const words = AC.IDS.map((id) => AC.VOCAB[id]);
      const omax = Math.max(...data.O.flat().map(Math.abs));
      return {
        html: ctx.copy.readout(words[s.query], data.convex),
        data: {
          shape: "4,4", contract: "t", query: s.query,
          convex: data.convex ? "1" : "0", omax: omax.toFixed(3),
          same: same(data.O[1], data.O[3]) ? "1" : "0",
          sameinput: same(data.X[1], data.X[3]) ? "1" : "0"
        }
      };
    },

    code(ctx) {
      const data = pipeline(ctx);
      const s = ctx.state, c = ctx.copy.np, K = ctx.K;
      return K.code([
        ["output = np.dot(attn_weights, V)", "(4, 4) @ (4, 4) -> (4, 4)"],
        ["output[" + s.query + "]", K.npRow(data.O[s.query])],
        ["np.allclose(output[1], output[3])",
         (same(data.O[1], data.O[3]) ? "True" : "False") + ": " + c.twin]
      ]);
    },

    copy: {
      en: {
        tab: "Output",
        k: "A weighted average of the values · section 06",
        h: "Each token's new vector is a weighted average of every token's value",
        claim: "output = attn_weights V",
        concept: "Each row of weights now says how much of every token's value this token takes: " +
                 "multiply each value row by its weight and add them up. Because the weights are " +
                 "positive and sum to 1, the result is a blend, a point somewhere between the value " +
                 "rows and never outside them. So attention cannot invent a number bigger than any " +
                 "value it was given; all it can do is mix. The token comes out as a vector built " +
                 "partly from its neighbours: that is what “contextualised” means.",
        b: "<p>The bars are the chosen query's four weights, on a fixed scale. A value row is " +
           "tinted when this query gives it more than an equal share, 1/4. Line up the written " +
           "sum with the lit row of the output. Then move to query 1 or 3, “know”: equal " +
           "weights, so the output is the plain average of the four values. Last, compare rows 1 " +
           "and 3 of the output.</p>",
        predict: "Both “know”s went in as identical rows. Will attention give them different " +
                 "outputs, since their neighbours differ?",
        eqcap: "t is the key axis, and it is the one that disappears here, the same axis that " +
               "indexes the columns of the weights. d, the feature axis, is on V and on the output, " +
               "which is why the output has V's width and not the sequence length. In the code, A is " +
               "attn_weights and O is output.",
        controls: {query: "Query (row)"},
        twin: "output[1] = output[3]: both “know”s come out identical.",
        untwin: "output[1] ≠ output[3]",
        twin2: "Attention alone cannot tell positions apart; real models add position to X first.",
        np: {twin: "same input row, same output row"},
        readout: (word, convex) =>
          "“" + word + "”'s output is a weighted average of the four value rows, and " +
          (convex ? "<b>every entry sits inside V's own range</b>." : "<b>a bound was broken</b>.") +
          " The two “know” rows come out <b>identical</b>: without position, the same word " +
          "in two places is the same query, key and value.",
        aria: (ctx) => "V and the output, with query row " + ctx.state.query + "'s attention weights " +
                        "drawn as bars between them and its weighted sum written out below."
      },
      es: {
        tab: "Salida",
        k: "Un promedio ponderado de los valores · sección 06",
        h: "El nuevo vector de cada token es un promedio ponderado de los valores de todos",
        claim: "output = attn_weights V",
        concept: "Cada fila de pesos dice ahora cuánto toma este token del valor de cada token: se " +
                 "multiplica cada fila de valor por su peso y se suman. Como los pesos son positivos " +
                 "y suman 1, el resultado es una mezcla, un punto en algún lugar entre las filas de " +
                 "valor y nunca fuera de ellas. Así que la atención no puede inventar un número mayor " +
                 "que cualquier valor que haya recibido: solo puede mezclar. El token sale como un " +
                 "vector construido en parte con sus vecinos, y eso es lo que significa " +
                 "“contextualizado”.",
        b: "<p>Las barras son los cuatro pesos de la consulta elegida, en una escala fija. Una " +
           "fila de valor se tiñe cuando esta consulta le da más que una parte igual, 1/4. " +
           "Compara la suma escrita con la fila iluminada de la salida. Después ve a la consulta " +
           "1 o 3, “know”: pesos iguales, así que la salida es el promedio simple de los " +
           "cuatro valores. Por último, compara las filas 1 y 3 de la salida.</p>",
        predict: "Los dos “know” entraron como filas idénticas. ¿Les dará la atención salidas " +
                 "distintas, ya que sus vecinos son distintos?",
        eqcap: "t es el eje de claves, y es el que desaparece aquí, el mismo eje que indexa las " +
               "columnas de los pesos. d, el eje de características, está en V y en la salida, por " +
               "lo que la salida tiene el ancho de V y no la longitud de la secuencia. En el código, A " +
               "es attn_weights y O es output.",
        controls: {query: "Consulta (fila)"},
        twin: "output[1] = output[3]: los dos “know” salen idénticos.",
        untwin: "output[1] ≠ output[3]",
        twin2: "La atención sola no distingue posiciones; los modelos reales suman la posición a X.",
        np: {twin: "misma fila de entrada, misma salida"},
        readout: (word, convex) =>
          "La salida de “" + word + "” es un promedio ponderado de las cuatro filas de valor, " +
          "y " + (convex ? "<b>cada celda cae dentro del rango propio de V</b>." :
          "<b>se rompió un límite</b>.") + " Las dos filas “know” salen <b>idénticas</b>: " +
          "sin posición, la misma palabra en dos sitios es la misma consulta, clave y valor.",
        aria: (ctx) => "V y la salida, con los pesos de atención de la fila de consulta " +
                        ctx.state.query + " dibujados como barras entre ambas y su suma ponderada " +
                        "escrita debajo."
      }
    }
  });
})();
