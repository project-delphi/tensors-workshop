// Scene 6: CP-ALS finding several rank-1 terms at once. On the synthetic
// tensor built from exactly three planted terms, rank 3 recovers all of
// them; on the real taxi tensor there is no ground truth to recover, only
// an error curve. See factor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const FC = window.FactorCore, K = window.FactorKit;

  const SYN = FC.synthetic();

  const EN = {
    k: "CP-ALS · section 11",
    h: "Alternating least squares finds several rank-1 terms at once",
    concept: "CP writes a tensor as a sum of R rank-1 terms and fits all R by alternating: fix two factor matrices, solve a least-squares problem for the third, rotate. Nothing here is unique the way Tucker's SVD is — a different random start can find a different, equally good, fit. <span class=\"cite\">Deep Learning §2.1</span>",
    claim: "T ≈ Σᵣ aᵣ ⊗ bᵣ ⊗ cᵣ,  R(I + J + K) = 99",
    predict: "Before you slide: the synthetic tensor was built from exactly three rank-1 terms. At R = 3, will ALS find those three terms exactly, find three different ones that fit just as well, or fail to fit at all?",
    b: "<p>The synthetic tensor is three rank-1 terms added together, at three different scales, so none of them is degenerate. At R = 3 with enough iterations, ALS's random start still lands on <em>those</em> three terms — each fitted triplet matches one planted (a, b, c) almost exactly, which is what \"recovered\" counts below.</p><p>Switch to the taxi tensor and there is no planted answer to recover, only an error that falls as R grows — the same trade-off Tucker's ranks make, from a different kind of model.</p>",
    controls: {r: "Rank, R", iters: "ALS iterations", data: "Tensor"},
    // Drawn on the stage, so translated like everything else in the picture.
    axFit: "fit",
    axTerm: (p) => `term ${p}`,
    axKey: "left bar: 1 − relative error. right bars: each planted term's match, 1.000 = exact.",
    options: {data: {synthetic: "synthetic (3 planted terms)", taxi: "real taxi trips"}},
    readoutSyn: (r, err, recovered, unique) =>
      `At R = <b>${r}</b>: relative error <b>${(err * 100).toFixed(2)}%</b>, and <b>${recovered}</b> of the 3 planted terms recovered (match > 0.999).` +
      (unique ? " Every term recovered: this fit is essentially the planted one." : ""),
    readoutTaxi: (r, err) =>
      `At R = <b>${r}</b> on the real taxi tensor: relative error <b>${(err * 100).toFixed(2)}%</b>. There is no planted answer here to recover.`,
    aria: (ctx) => {
      const s = ctx.state;
      return `${s.r} factor triplets from CP-ALS on the ${s.data} tensor, and a bar showing the fit error at rank ${s.r}.`;
    }
  };
  const ES = {
    k: "CP-ALS · sección 11",
    h: "Los mínimos cuadrados alternos encuentran varios términos de rango 1 a la vez",
    concept: "CP escribe un tensor como una suma de R términos de rango 1 y ajusta las R alternando: fija dos matrices factor, resuelve mínimos cuadrados para la tercera, rota. Nada aquí es único como lo es la SVD de Tucker — otro punto de partida aleatorio puede encontrar un ajuste distinto, igual de bueno. <span class=\"cite\">Deep Learning §2.1</span>",
    claim: "T ≈ Σᵣ aᵣ ⊗ bᵣ ⊗ cᵣ,  R(I + J + K) = 99",
    predict: "Antes de deslizar: el tensor sintético se construyó con exactamente tres términos de rango 1. En R = 3, ¿ALS encontrará esos tres términos exactamente, encontrará tres distintos que ajusten igual de bien, o no ajustará?",
    b: "<p>El tensor sintético es tres términos de rango 1 sumados, en tres escalas distintas, para que ninguno sea degenerado. En R = 3 con suficientes iteraciones, el punto de partida aleatorio de ALS igual llega a esos tres términos — cada trío ajustado coincide con un (a, b, c) plantado casi exactamente, lo que cuenta \"recuperados\" abajo.</p><p>Cambia al tensor de taxis y no hay una respuesta plantada que recuperar, solo un error que baja al crecer R — el mismo compromiso que hacen los rangos de Tucker, desde un tipo de modelo distinto.</p>",
    controls: {r: "Rango, R", iters: "Iteraciones de ALS", data: "Tensor"},
    axFit: "ajuste",
    axTerm: (p) => `término ${p}`,
    axKey: "barra izquierda: 1 − error relativo. barras derechas: coincidencia de cada término plantado, 1,000 = exacta.",
    options: {data: {synthetic: "sintético (3 términos plantados)", taxi: "viajes reales de taxi"}},
    readoutSyn: (r, err, recovered, unique) =>
      `En R = <b>${r}</b>: error relativo <b>${(err * 100).toFixed(2)}%</b>, y <b>${recovered}</b> de los 3 términos plantados recuperados (coincidencia > 0,999).` +
      (unique ? " Todos los términos recuperados: este ajuste es esencialmente el plantado." : ""),
    readoutTaxi: (r, err) =>
      `En R = <b>${r}</b> sobre el tensor real de taxis: error relativo <b>${(err * 100).toFixed(2)}%</b>. Aquí no hay una respuesta plantada que recuperar.`,
    aria: (ctx) => {
      const s = ctx.state;
      return `${s.r} tríos factor de CP-ALS sobre el tensor ${s.data}, y una barra que muestra el error de ajuste en el rango ${s.r}.`;
    }
  };

  window.FactorScenes.register({
    id: "cp", section: "11",
    copy: {en: EN, es: ES},

    controls: [
      {id: "r", type: "range", min: 1, max: 6, step: 1, fmt: (v) => String(v)},
      {id: "iters", type: "range", min: 20, max: 200, step: 20, fmt: (v) => String(v)},
      {id: "data", type: "select", options: ["synthetic", "taxi"]}
    ],

    init(ctx) {
      ctx.state.r = 3;
      ctx.state.iters = 100;
      ctx.state.data = "synthetic";
    },

    tensorFor(ctx) { return ctx.state.data === "taxi" ? ctx.taxi : SYN.T; },

    draw(ctx) {
      const s = ctx.state, svg = ctx.svg;
      const T = this.tensorFor(ctx);
      const fit = FC.cpAls(T, s.r, s.iters, 1);
      let matches = [];
      if (s.data === "synthetic") matches = FC.matchTerms(fit, SYN.terms);
      const shapeNames = ["pickup", "dropoff", "hour"];
      // Both dimensions of this picture move: the hour factor has 24 rows,
      // and all three factors have R columns for an R the reader slides up
      // to 6. SVG neither clips a child laid out past the viewBox nor
      // reports one -- it just does not draw it -- so the layout is computed
      // from what has to fit rather than from the opening values. Three
      // grids in a row would put the hour one through the term bars below
      // at R = 3 and off the right edge at R = 6, so the two short factors
      // stack down the left and the tall one is right-aligned in its own
      // column, where it can use the full height. Its rows are capped to
      // end at y = 390, the floor hosvd's own 24-row factor uses.
      const cellW = 46, cellH = 16;
      const hour = fit.factors[2];
      const hourX = 790 - hour[0].length * cellW;
      K.numGrid(svg, fit.factors[0], {x: 40, y: 60, digits: 2, cellW, cellH, title: shapeNames[0]});
      K.numGrid(svg, fit.factors[1], {
        x: 40, y: 60 + fit.factors[0].length * cellH + 38, digits: 2, cellW, cellH,
        title: shapeNames[1]
      });
      K.numGrid(svg, hour, {
        x: hourX, y: 60, digits: 2, cellW, cellH: Math.min(cellH, 330 / hour.length),
        title: shapeNames[2]
      });
      K.bars(svg, [1 - fit.error], {
        x: 40, y: 280, w: 60, h: 90, max: 1, at: () => "--fa-t"
      });
      K.label(svg, 40, 268, ctx.copy.axFit, {size: 10.5, colour: "--stage-mute"});
      if (matches.length) {
        matches.forEach((m, p) => {
          K.bars(svg, [m.score], {x: 160 + p * 80, y: 280, w: 60, h: 90, max: 1, at: () => (m.score > 0.999 ? "--fa-t" : "--fa-err")});
          K.label(svg, 160 + p * 80, 268, ctx.copy.axTerm(p), {size: 10.5, colour: "--stage-mute"});
        });
      }
      K.label(svg, 40, 400, ctx.copy.axKey,
        {size: 9.5, colour: "--stage-mute"});
    },

    readout(ctx) {
      const s = ctx.state, c = ctx.copy;
      const T = this.tensorFor(ctx);
      const fit = FC.cpAls(T, s.r, s.iters, 1);
      const params = FC.cpParams(T.shape, s.r);
      // The claim card carries R(I + J + K), which is 99 only at R = 3 --
      // the opening value, and the one the copy table's static claim was
      // written at. It is rebuilt here so it cannot go on asserting a
      // parameter count the reader has already slid away from. No words in
      // it, so one form serves both languages.
      const claim = `T ≈ Σᵣ aᵣ ⊗ bᵣ ⊗ cᵣ,  R(I + J + K) = ${params}`;
      if (s.data === "synthetic") {
        const matches = FC.matchTerms(fit, SYN.terms);
        const recovered = matches.filter((m) => m.score > 0.999).length;
        const unique = recovered === SYN.terms.length;
        return {
          html: c.readoutSyn(s.r, fit.error, recovered, unique),
          claim,
          data: {
            data: s.data, r: s.r, iters: s.iters, err: fit.error.toFixed(4), params,
            recovered, unique: unique ? "1" : "0"
          }
        };
      }
      return {
        html: c.readoutTaxi(s.r, fit.error),
        claim,
        data: {data: s.data, r: s.r, iters: s.iters, err: fit.error.toFixed(4), params, recovered: 0, unique: "0"}
      };
    }
  });
})();
