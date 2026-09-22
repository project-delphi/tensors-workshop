// Scene 5: softmax makes every row of weights sum to exactly 1 — over the
// keys, the direction attention actually uses. Over the queries instead, on
// purpose, the rows do not, which is the whole point of the axis control. A
// causal mask sends the future's score to -Infinity before the softmax, and
// softmax turns that into an exact zero weight, never a small one.
(function () {
  "use strict";

  function pipeline(ctx) {
    if (ctx.cache.softmax) return ctx.cache.softmax;
    const AC = ctx.AC;
    const X = AC.gather(AC.embedding(), AC.IDS);
    const P = AC.projections();
    const Q = AC.splitHeads(AC.matmul(X, P.WQ), 2);
    const K = AC.splitHeads(AC.matmul(X, P.WK), 2);
    ctx.cache.softmax = {L: AC.scores(Q, K, 4, true), mask: AC.causalMask(4)};
    return ctx.cache.softmax;
  }

  function current(ctx) {
    const data = pipeline(ctx), s = ctx.state, AC = ctx.AC;
    const L = s.mask === "causal" ? AC.applyMask(data.L, data.mask) : data.L;
    return {L, A: AC.softmax(L, s.axis)};
  }

  function draw(ctx) {
    const {L, A} = current(ctx);
    const K = ctx.K, svg = ctx.svg, s = ctx.state;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const root = K.el("g", {transform: "translate(0,44)"});
    svg.appendChild(root);

    // The group is translated clear of the claim chip, so everything below
    // has 356 units of height to live in rather than the viewBox's 400. Two
    // four-row grids and a bar chart only fit at cellH = 30; at 34 the last
    // row of A was drawn past the bottom edge and simply vanished. Nothing
    // clips an SVG child or complains about one, and the readout's numbers
    // stay right either way -- which is why these figures are worked out
    // against the height rather than nudged until they look about right.
    root.appendChild(K.text(160, 14, "L, head " + s.head, {fill: ctx.colour("--stage-ink")}));
    root.appendChild(K.numGrid({
      x: 40, y: 32, cellW: 40, cellH: 30, values: L[s.head],
      fmt: (v) => (v === -Infinity ? "−∞" : Number.isInteger(v) ? String(v) : v.toFixed(1)),
      colourOf: () => ctx.colour("--at-res"),
      mark: (i, j) => L[s.head][i][j] === -Infinity
    }));

    root.appendChild(K.text(190, 178, "A = softmax(L), over " + (s.axis === "keys" ? "t" : "s"), {fill: ctx.colour("--stage-ink")}));
    root.appendChild(K.numGrid({
      x: 40, y: 196, cellW: 58, cellH: 30, values: A[s.head],
      fmt: (v) => v.toFixed(3), size: 11,
      colourOf: () => ctx.colour("--at-w"),
      mark: () => false
    }));

    const sums = ctx.AC.rowSums(A, "t")[s.head];
    root.appendChild(K.text(490, 190, "row sums over t", {size: 11, fill: ctx.colour("--stage-mute")}));
    root.appendChild(K.bars({
      x: 400, y: 316, w: 180, h: 90, values: sums, hi: 1.2, gap: 8,
      labels: [0, 1, 2, 3].map(String),
      colourOf: (i) => Math.abs(sums[i] - 1) < 1e-6 ? ctx.colour("--at-w") : ctx.colour("--at-res")
    }));
  }

  window.AttentionScenes.register({
    id: "softmax",
    section: "B",

    controls: [
      {id: "axis", type: "select", options: ["keys", "queries"]},
      {id: "mask", type: "select", options: ["none", "causal"]},
      {id: "head", type: "range", min: 0, max: 1, step: 1, fmt: (v) => String(v)}
    ],

    init(ctx) { Object.assign(ctx.state, {axis: "keys", mask: "none", head: 0}); },
    draw,

    readout(ctx) {
      const {A} = current(ctx);
      const s = ctx.state, AC = ctx.AC;
      const sums = AC.rowSums(A, "t")[s.head];
      let worst = 0;
      for (let i = 1; i < sums.length; i++) if (Math.abs(sums[i] - 1) > Math.abs(sums[worst] - 1)) worst = i;
      const rowsum = sums[worst].toFixed(3);
      const amax = Math.max(...A[s.head].flat());
      // masked counts the causally-forbidden cells in L; exactZero is a
      // boolean sanity check that softmax actually turned at least one of
      // them into an *exact* zero weight in A, never a small positive one.
      let masked = 0, exactZero = 0;
      if (s.mask === "causal") {
        const mask = pipeline(ctx).mask;
        for (const row of mask) for (const v of row) if (v === -Infinity) masked++;
        exactZero = A[s.head].some((row) => row.some((v) => v === 0)) ? 1 : 0;
      }
      return {
        html: ctx.copy.readout(s.axis, worst, rowsum),
        claim: "A[h, s, t] = softmaxₜ L[h, s, t],  Σₜ A[h, s, t] = 1",
        data: {
          shape: "2,4,4",
          axis: s.axis, mask: s.mask, rowsum: rowsum, worstrow: worst,
          masked: masked, exactzero: exactZero, amax: amax.toFixed(3),
          over: s.axis === "keys" ? "t" : "s"
        }
      };
    },

    copy: {
      en: {
        tab: "Softmax",
        k: "Weights that sum to one · Appendix B",
        h: "Softmax makes every row of weights sum to exactly one",
        claim: "A[h, s, t] = softmaxₜ L[h, s, t],  Σₜ A[h, s, t] = 1",
        concept: "Softmax exponentiates and normalises, so the direction it sums over is a choice: " +
                 "over the keys (t) it is ordinary attention, and every query's weights add to exactly " +
                 "1. Normalise over the queries (s) instead and nothing stops that same row summing to " +
                 "anything else — the axis a sum is taken over is part of the definition, not a detail.",
        b: "<p>Switch axis to \"queries\" and watch the bar chart below stop reading 1.000 for most " +
           "rows. Switch mask to \"causal\" and the upper triangle of L turns to −∞; softmax " +
           "turns that into exact zeros in A, never a small positive weight.</p>",
        predict: "A masked score is −∞ before the softmax. What weight does it get after?",
        eqcap: "The subscript t on softmax says which axis the exponentials are normalised over: the " +
               "keys, which is the direction ordinary attention uses. b and h are carried on both " +
               "sides of the equation, untouched by the sum.",
        controls: {axis: "Normalise over", mask: "Mask", head: "Head"},
        options: {axis: {keys: "keys (ordinary attention)", queries: "queries (the wrong axis, on purpose)"},
                  mask: {none: "none", causal: "causal"}},
        readout: (axis, worst, rowsum) =>
          "Row " + worst + " sums to <b>" + rowsum + "</b> over t" +
          (axis === "keys" ? " — every row does." : ", not 1.000 — that is the point of this axis."),
        aria: (ctx) => "L and A as four by four grids for head " + ctx.state.head +
                        ", with each row's sum over t drawn as a bar chart below."
      },
      es: {
        tab: "Softmax",
        k: "Pesos que suman uno · Apéndice B",
        h: "Softmax hace que cada fila de pesos sume exactamente uno",
        claim: "A[h, s, t] = softmaxₜ L[h, s, t],  Σₜ A[h, s, t] = 1",
        concept: "Softmax exponencia y normaliza, así que la dirección sobre la que suma es " +
                 "una elección: sobre las claves (t) es la atención habitual, y los pesos de " +
                 "cada consulta suman exactamente 1. Normaliza sobre las consultas (s) en su lugar y " +
                 "nada impide que esa misma fila sume otra cosa: el eje sobre el que se suma es parte " +
                 "de la definición, no un detalle.",
        b: "<p>Cambia axis a «queries» y observa cómo el gráfico de barras de abajo " +
           "deja de marcar 1.000 en la mayoría de las filas. Cambia mask a «causal» y el " +
           "triángulo superior de L pasa a −∞; softmax lo convierte en ceros exactos en " +
           "A, nunca en un peso pequeño.</p>",
        predict: "Una puntuación enmascarada es −∞ antes del softmax. ¿Qué peso " +
                 "recibe después?",
        eqcap: "El subíndice t en softmax dice sobre qué eje se normalizan las " +
               "exponenciales: las claves, que es la dirección que usa la atención habitual. " +
               "b y h se llevan en ambos lados de la ecuación, sin que la suma los toque.",
        controls: {axis: "Normalizar sobre", mask: "Máscara", head: "Cabeza"},
        options: {axis: {keys: "claves (atención habitual)", queries: "consultas (el eje erróneo, a propósito)"},
                  mask: {none: "ninguna", causal: "causal"}},
        readout: (axis, worst, rowsum) =>
          "La fila " + worst + " suma <b>" + rowsum + "</b> sobre t" +
          (axis === "keys" ? ": todas las filas lo hacen." : ", no 1.000: ese es el punto de este eje."),
        aria: (ctx) => "L y A como cuadrículas de cuatro por cuatro para la cabeza " +
                        ctx.state.head + ", con la suma de cada fila sobre t dibujada como gráfico " +
                        "de barras debajo."
      }
    }
  });
})();
