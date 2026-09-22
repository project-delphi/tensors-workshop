// Scene 6: why the scores are divided by sqrt(d_k). A dot product of d_k
// components that each have variance 1 has variance d_k, so its spread grows
// like sqrt(d_k): at d_k = 256 the raw scores run to +-60. Softmax turns a
// spread that wide into a nearly one-hot row -- one weight near 1, the rest
// near 0 -- and a one-hot softmax has almost no gradient to learn from.
// Dividing by sqrt(d_k) puts the spread back at 1 for every d_k. Every
// number here is AC.scaleSpread's, from +-1 random vectors on a fixed seed;
// nothing on this scene is the stage's own Q or K.
(function () {
  "use strict";

  const TRIALS = 400, KEYS = 8, AXIS = 48, BIN = 2;

  function data(ctx) {
    const dk = 2 ** ctx.state.p;
    ctx.cache.spread = ctx.cache.spread || {};
    if (!ctx.cache.spread[dk]) ctx.cache.spread[dk] = ctx.AC.scaleSpread(dk, TRIALS, KEYS);
    return ctx.cache.spread[dk];
  }

  // Counts in fixed-width bins over [-AXIS, AXIS], with anything past an end
  // piled into the end bin, so the axis never rescales under a reader's
  // finger: the scores are seen spreading, not the axis shrinking.
  function histogram(values) {
    const n = (2 * AXIS) / BIN, counts = new Array(n).fill(0);
    for (const v of values) {
      const i = Math.min(n - 1, Math.max(0, Math.floor((v + AXIS) / BIN)));
      counts[i]++;
    }
    return counts;
  }

  function strip(ctx, root, values, y, label, token, std) {
    const K = ctx.K, x0 = 60, w = 520, h = 62;
    const counts = histogram(values), hi = Math.max(...counts);
    const bw = w / counts.length;
    root.appendChild(K.text(x0, y - h - 8, label, {size: 12, anchor: "start", fill: ctx.colour(token)}));
    counts.forEach((c, i) => {
      if (!c) return;
      const bh = Math.max(1, (c / hi) * h);
      root.appendChild(K.el("rect", {
        x: x0 + i * bw + 0.5, y: y - bh, width: bw - 1, height: bh, fill: ctx.colour(token), rx: 1
      }));
    });
    root.appendChild(K.el("line", {x1: x0, y1: y, x2: x0 + w, y2: y,
      stroke: ctx.colour("--stage-mute"), "stroke-width": 1}));
    [-48, -24, 0, 24, 48].forEach((t) => {
      root.appendChild(K.text(x0 + ((t + AXIS) / (2 * AXIS)) * w, y + 11, String(t),
        {size: 10, fill: ctx.colour("--stage-mute")}));
    });
    // The spread itself, as a bracket of +-one standard deviation.
    const sx = (v) => x0 + ((Math.max(-AXIS, Math.min(AXIS, v)) + AXIS) / (2 * AXIS)) * w;
    root.appendChild(K.el("line", {x1: sx(-std), y1: y - h - 2, x2: sx(std), y2: y - h - 2,
      stroke: ctx.colour(token), "stroke-width": 2}));
    root.appendChild(K.text(x0 + w, y - h - 8, "σ = " + std.toFixed(2),
      {size: 12, anchor: "end", fill: ctx.colour(token)}));
  }

  function draw(ctx) {
    const r = data(ctx);
    const K = ctx.K, svg = ctx.svg;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const root = K.el("g", {transform: "translate(0,44)"});
    svg.appendChild(root);

    strip(ctx, root, r.raw, 96, "q·k", "--at-q", r.rawStd);
    strip(ctx, root, r.scaled, 190, "q·k / √d_k", "--at-w", r.scaledStd);

    // One query's softmax over its eight keys, both ways, on the same fixed
    // scale of 0 to 1 -- the saturation a reader should see is a single bar
    // hitting the top while the other seven flatten.
    const panel = (x, weights, label, token) => {
      root.appendChild(K.text(x + 110, 232, label, {size: 11, fill: ctx.colour(token)}));
      root.appendChild(K.bars({
        x: x, y: 330, w: 220, h: 82, values: weights, hi: 1, gap: 5,
        colourOf: () => ctx.colour(token)
      }));
      root.appendChild(K.text(x + 110, 346, "max " + Math.max(...weights).toFixed(2),
        {size: 11, fill: ctx.colour("--stage-mute")}));
    };
    panel(60, r.sample.wRaw, "softmax(q·k), a typical query", "--at-q");
    panel(360, r.sample.wScaled, "softmax(q·k / √d_k)", "--at-w");
  }

  window.AttentionScenes.register({
    id: "scale",
    section: "B",

    controls: [
      {id: "p", type: "range", min: 0, max: 8, step: 1, fmt: (v) => "d_k = " + 2 ** v}
    ],

    init(ctx) { Object.assign(ctx.state, {p: 2}); },
    draw,

    readout(ctx) {
      const r = data(ctx);
      return {
        html: ctx.copy.readout(r.dk, r.rawStd.toFixed(2), r.scaledStd.toFixed(2),
          r.peakRaw.toFixed(2), r.peakScaled.toFixed(2)),
        claim: "Var(q·k) = d_k = " + r.dk + ",  σ = √d_k = " + Number(Math.sqrt(r.dk).toFixed(2)),
        data: {
          dk: r.dk, rawstd: r.rawStd.toFixed(2), scaledstd: r.scaledStd.toFixed(2),
          peakraw: r.peakRaw.toFixed(2), peakscaled: r.peakScaled.toFixed(2)
        }
      };
    },

    shape(ctx) { return "[" + TRIALS + ", " + KEYS + "]"; },

    code(ctx) {
      const dk = 2 ** ctx.state.p, c = ctx.copy.np;
      const root = Number(Math.sqrt(dk).toFixed(2));
      return ctx.K.code([
        "d_k = " + dk,
        "rng = np.random.default_rng(0)",
        ["q = rng.choice([-1, 1], size=(400, d_k))", c.q],
        ["k = rng.choice([-1, 1], size=(400, 8, d_k))", c.k],
        ["raw = (q[:, None, :] * k).sum(axis=-1)", "std ≈ √d_k = " + root],
        ["scaled = raw / np.sqrt(d_k)", c.scaled]
      ]);
    },

    copy: {
      en: {
        tab: "√d_k",
        k: "Why divide by √d_k · Appendix B",
        h: "Without the √d_k, more features make softmax pick one key and ignore the rest",
        claim: "Var(q·k) = d_k = 4,  σ = √d_k = 2",
        concept: "A dot product adds up d_k products. If each component is about as big as 1, each " +
                 "product is too, and a sum of d_k of them that don't line up spreads out like " +
                 "√d_k, the same way a random walk of d_k steps ends about √d_k from where it " +
                 "started. So the wider the vectors, the bigger the scores, even when nothing is " +
                 "more relevant. Softmax exaggerates gaps, so big scores make it close to one-hot: " +
                 "one key gets nearly all the weight, and a nearly one-hot softmax barely changes " +
                 "when its inputs change, so there is almost no gradient to learn from. Dividing " +
                 "by √d_k keeps the spread at 1 whatever d_k is.",
        b: "<p>Drag d_k from 1 up to 256. The top histogram is 3,200 raw dot products of random " +
           "±1 vectors, and it widens with every step. The one under it is the same scores divided " +
           "by √d_k, and it holds still. The bars are one typical query's softmax over eight keys: unscaled, " +
           "one bar climbs towards 1 as d_k grows, while scaled they stay spread out.</p>",
        predict: "Multiply d_k by 4. By how much does the spread of the raw scores grow: ×4, ×2 or " +
                 "not at all?",
        eqcap: "Each of the d_k products q_d k_d has variance 1 when the components are independent " +
               "with variance 1, and variances of independent terms add, so the sum has variance " +
               "d_k and a spread of √d_k. Dividing the score by √d_k divides its variance by d_k, " +
               "which is back to 1.",
        controls: {p: "Width of Q and K"},
        np: {
          q: "400 random queries",
          k: "8 keys for each",
          scaled: "std ≈ 1, for every d_k"
        },
        readout: (dk, rs, ss, pr, ps) =>
          "At d_k = " + dk + " the raw scores have spread <b>" + rs + "</b> and the scaled ones <b>" +
          ss + "</b>. The largest softmax weight in a row averages <b>" + pr + "</b> unscaled and <b>" +
          ps + "</b> scaled.",
        aria: (ctx) => "Two histograms of dot products at d_k = " + 2 ** ctx.state.p + ", raw above " +
                        "and divided by the square root of d_k below, and one query's softmax weights " +
                        "over eight keys, unscaled and scaled."
      },
      es: {
        tab: "√d_k",
        k: "Por qué dividir entre √d_k · Apéndice B",
        h: "Sin el √d_k, más características hacen que softmax elija una clave e ignore el resto",
        claim: "Var(q·k) = d_k = 4,  σ = √d_k = 2",
        concept: "Un producto punto suma d_k productos. Si cada componente es más o menos de tamaño " +
                 "1, cada producto también lo es, y una suma de d_k de ellos que no se alinean se " +
                 "dispersa como √d_k, igual que un paseo aleatorio de d_k pasos acaba a unos √d_k " +
                 "del punto de partida. Así que cuanto más anchos los vectores, más grandes las " +
                 "puntuaciones, aunque nada sea más relevante. Softmax exagera las diferencias, así " +
                 "que con puntuaciones grandes se vuelve casi one-hot: una clave se lleva casi todo " +
                 "el peso, y un softmax casi one-hot apenas cambia cuando cambian sus entradas, así " +
                 "que casi no deja gradiente del que aprender. Dividir entre √d_k mantiene la " +
                 "dispersión en 1 sea cual sea d_k.",
        b: "<p>Arrastra d_k de 1 a 256. El histograma de arriba son 3.200 productos punto " +
           "crudos de vectores aleatorios de ±1, y se ensancha a cada paso. El de debajo son las " +
           "mismas puntuaciones divididas entre √d_k, y no se mueve. Las barras son el softmax de " +
           "una consulta típica sobre ocho claves: sin escalar, una barra sube hacia 1 a medida que crece " +
           "d_k, y escaladas siguen repartidas.</p>",
        predict: "Multiplica d_k por 4. ¿Cuánto crece la dispersión de las puntuaciones crudas: ×4, " +
                 "×2 o nada?",
        eqcap: "Cada uno de los d_k productos q_d k_d tiene varianza 1 cuando las componentes son " +
               "independientes y de varianza 1, y las varianzas de términos independientes se suman, " +
               "así que la suma tiene varianza d_k y una dispersión de √d_k. Dividir la puntuación " +
               "entre √d_k divide su varianza entre d_k, y vuelve a ser 1.",
        controls: {p: "Anchura de Q y K"},
        np: {
          q: "400 consultas aleatorias",
          k: "8 claves para cada una",
          scaled: "std ≈ 1, para cada d_k"
        },
        readout: (dk, rs, ss, pr, ps) =>
          "Con d_k = " + dk + " las puntuaciones crudas tienen dispersión <b>" + rs + "</b> y las " +
          "escaladas <b>" + ss + "</b>. El mayor peso de softmax en una fila vale de media <b>" + pr +
          "</b> sin escalar y <b>" + ps + "</b> escalado.",
        aria: (ctx) => "Dos histogramas de productos punto con d_k = " + 2 ** ctx.state.p + ", crudos " +
                        "arriba y divididos entre la raíz de d_k abajo, y los pesos de softmax de una " +
                        "consulta sobre ocho claves, sin escalar y escalados."
      }
    }
  });
})();
