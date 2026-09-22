// Scene 3: giving each head its own axis is a reshape, then a transpose —
// and the bug you get from skipping the transpose. "split" is splitHeads,
// the honest reshape-then-transpose; "flat" is splitHeadsWrong, a direct
// reshape of the same flat buffer. Both give a (2, 4, 4) tensor; only one of
// them keeps every head's rows belonging to the token they started as.
(function () {
  "use strict";

  function pipeline(ctx) {
    if (ctx.cache.heads) return ctx.cache.heads;
    const AC = ctx.AC;
    const X = AC.gather(AC.embedding(), AC.IDS);
    ctx.cache.heads = {
      X, split: AC.splitHeads(X, 2), flat: AC.splitHeadsWrong(X, 2)
    };
    return ctx.cache.heads;
  }

  function draw(ctx) {
    const data = pipeline(ctx);
    const K = ctx.K, svg = ctx.svg, s = ctx.state;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const root = K.el("g", {transform: "translate(0,44)"});
    svg.appendChild(root);
    const wrong = s.order === "flat";
    const Xh = wrong ? data.flat : data.split;
    const trace = ctx.AC.traceCell(data.X, 2, wrong, s.head, s.token, 0);

    // --at-res says the picture has gone wrong, so the traced cell only
    // earns it once the flat reshape has actually pulled the wrong token.
    // Under "split" that cell is the one the reader asked for and there is
    // nothing wrong with it; spending the alarm colour on it would leave
    // the scene no way left to say the thing it exists to say.
    const misread = wrong && trace.from.s !== s.token;
    root.appendChild(K.text(150, 20, "X (4×8)", {fill: ctx.colour("--stage-ink")}));
    root.appendChild(K.numGrid({
      x: 40, y: 36, cellW: 24, cellH: 26, values: data.X,
      mark: (i, j) => i === trace.from.s && j === trace.from.d,
      colourOf: () => ctx.colour(misread ? "--at-res" : "--at-w")
    }));

    root.appendChild(K.text(500, 20,
      (wrong ? "flat reshape" : "split heads") + " → (2, 4, 4)",
      {fill: ctx.colour("--stage-ink")}));
    [0, 1].forEach((h) => {
      const hy = 40 + h * 130;
      root.appendChild(K.text(360, hy - 6, "head " + h, {size: 11, fill: ctx.colour("--stage-mute"), anchor: "start"}));
      const rowColour = (i) => {
        // Every row's text is tinted by which token of X it actually came
        // from, so "flat" reads as a head whose rows are mixed sources at a
        // glance; the traced cell also gets a highlight chip in that colour.
        const t = ctx.AC.traceCell(data.X, 2, wrong, h, i, 0).from.s;
        return ctx.colour(["--at-q", "--at-k", "--at-v", "--at-w"][t % 4]);
      };
      root.appendChild(K.numGrid({
        x: 360, y: hy, cellW: 26, cellH: 26, values: Xh[h],
        mark: (i, j) => h === s.head && i === s.token && j === 0,
        colourOf: rowColour, textColourOf: rowColour
      }));
    });
  }

  window.AttentionScenes.register({
    id: "heads",
    section: "04",

    controls: [
      {id: "order", type: "select", options: ["split", "flat"]},
      {id: "head", type: "range", min: 0, max: 1, step: 1, fmt: (v) => String(v)},
      {id: "token", type: "range", min: 0, max: 3, step: 1, fmt: (v) => String(v)}
    ],

    init(ctx) { Object.assign(ctx.state, {order: "split", head: 0, token: 1}); },
    draw,

    readout(ctx) {
      const data = pipeline(ctx);
      const s = ctx.state;
      const wrong = s.order === "flat";
      const trace = ctx.AC.traceCell(data.X, 2, wrong, s.head, s.token, 0);
      const agree = trace.from.s === s.token;
      return {
        html: ctx.copy.readout(s.order, s.head, s.token, trace.from.s, agree),
        claim: "(4, 8) → (4, 2, 4) → (2, 4, 4)",
        data: {
          order: s.order, shape: "2,4,4", sameshape: "1",
          agree: agree ? "1" : "0", mixed: agree ? "0" : "1",
          trace: trace.value, srcof: trace.from.s
        }
      };
    },

    copy: {
      en: {
        tab: "Heads",
        k: "Reshape, then transpose · section 04",
        h: "Giving each head its own axis is a reshape, then a transpose",
        claim: "(4, 8) → (4, 2, 4) → (2, 4, 4)",
        concept: "Splitting the feature axis into heads is a reshape that keeps every token's own row, " +
                 "followed by a transpose that moves the head axis to the front. Skip the transpose and " +
                 "the shape is still right — (2, 4, 4) either way — but a head's rows are read straight " +
                 "off the flat buffer, mixing tokens that were never adjacent.",
        b: "<p>Switch order to \"flat\" and watch head 1's rows change colour: under the honest " +
           "reshape every row in a head keeps the colour of the token it came from; under the flat " +
           "one, most rows do not. The lit cell on X is where the traced cell of the chosen head " +
           "actually came from — same shape, different source.</p>",
        predict: "Both give a (2, 4, 4) tensor. Does the shape alone prove the split is correct?",
        controls: {order: "Reshape", head: "Head", token: "Token"},
        options: {order: {split: "reshape, then transpose", flat: "flat reshape (no transpose)"}},
        readout: (order, head, token, srcOf, agree) =>
          "Head " + head + ", token " + token + " reads from X's token " + srcOf + " — " +
          (agree ? "<b>the token it should</b>." : "<b>not the token it should be</b>."),
        aria: (ctx) => "X and two (4, 4) head matrices built by " +
                        (ctx.state.order === "flat" ? "a flat reshape" : "a reshape then a transpose") +
                        ", each row coloured by the token of X it actually came from."
      },
      es: {
        tab: "Cabezas",
        k: "Reshape y después transpose · sección 04",
        h: "Dar a cada cabeza su propio eje es un reshape y después un transpose",
        claim: "(4, 8) → (4, 2, 4) → (2, 4, 4)",
        concept: "Dividir el eje de características en cabezas es un reshape que conserva la fila " +
                 "propia de cada token, seguido de un transpose que mueve el eje de cabezas al frente. " +
                 "Si se salta el transpose la forma sigue siendo correcta —(2, 4, 4) en ambos " +
                 "casos—, pero las filas de una cabeza se leen directo del búfer plano, " +
                 "mezclando tokens que nunca fueron vecinos.",
        b: "<p>Cambia el orden a «flat» y observa cómo cambian de color las filas de la " +
           "cabeza 1: con el reshape honesto, cada fila de una cabeza conserva el color del token del " +
           "que vino; con el plano, la mayoría no. La celda iluminada en X es de donde " +
           "realmente vino la celda marcada de la cabeza elegida: misma forma, origen distinto.</p>",
        predict: "Ambos dan un tensor (2, 4, 4). ¿La forma sola demuestra que la división es " +
                 "correcta?",
        controls: {order: "Reshape", head: "Cabeza", token: "Token"},
        options: {order: {split: "reshape y después transpose", flat: "reshape plano (sin transpose)"}},
        readout: (order, head, token, srcOf, agree) =>
          "La cabeza " + head + ", token " + token + " lee del token " + srcOf + " de X — " +
          (agree ? "<b>el token que debería</b>." : "<b>no el token que debería</b>."),
        aria: (ctx) => "X y dos matrices de cabeza de (4, 4) construidas mediante " +
                        (ctx.state.order === "flat" ? "un reshape plano" : "un reshape y un transpose") +
                        ", cada fila coloreada según el token de X del que realmente vino."
      }
    }
  });
})();
