// Scene 4: the Tucker decomposition itself -- one SVD basis per mode, sliced
// to a rank and put back together as a small core times three factors.
// This is the picture the handbook's "4.7x fewer numbers, 6.7% error" is of.
// See factor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const FC = window.FactorCore, K = window.FactorKit;

  const EN = {
    k: "Tucker decomposition · section 10",
    h: "A core cube, and one factor matrix per axis, replace the whole tensor",
    concept: "Tucker keeps one truncated SVD basis per mode and contracts the tensor down onto all three at once: a small core G plus three tall, thin factor matrices A, B, C stand in for the original cube. <span class=\"cite\">Deep Learning §2.1</span>",
    claim: "T ≈ G ×₁ A ×₂ B ×₃ C,  480 → 102,  4.71×  at  6.7%",
    predict: "Before you slide: if you lower the hour rank from 3 to 1, does the error get worse a little, or does hour 18's bar disappear from the picture entirely?",
    b: "<p>At ranks (2, 2, 3) -- pickup, dropoff, hour -- the core and three factors together hold 102 numbers in place of the tensor's 480: a 4.71× saving, for 6.7% relative error. The rightmost picture is column 0 of the hour factor, C; hour 18 is the tallest bar in it, the same peak the raw counts and the marginal sum both point to.</p><p>Raise or lower any one rank and every number here changes together — the core, all three factors, the error and the ratio — because they come from one contraction, not three independent choices.</p>",
    controls: {r0: "Pickup rank", r1: "Dropoff rank", r2: "Hour rank"},
    // Drawn on the stage. Every visible string is translated, including the
    // ones inside the picture -- the stage is not chrome.
    axCore: "core G (mode-2 unfolding)",
    axA: "A (pickup)", axB: "B (dropoff)", axC: "C, column 0 (hour)",
    readout: (params, ratio, err, hourpeak) =>
      `At these ranks: <b>${params}</b> numbers replace 480, a <b>${ratio.toFixed(2)}×</b> saving, at <b>${(err * 100).toFixed(1)}%</b> relative error. ` +
      `The hour factor's first column still peaks at hour <b>${hourpeak}</b>.`,
    aria: (ctx) => {
      const s = ctx.state;
      return `Four number grids -- a core cube and three factor matrices at ranks ${s.r0}, ${s.r1}, ${s.r2} -- and a bar chart of the hour factor's first column, hour 18 lit.`;
    }
  };
  const ES = {
    k: "Descomposición de Tucker · sección 10",
    h: "Un cubo núcleo y una matriz factor por eje sustituyen al tensor entero",
    concept: "Tucker conserva una base de SVD truncada por modo y contrae el tensor sobre las tres a la vez: un núcleo G pequeño más tres matrices factor altas y delgadas A, B, C sustituyen al cubo original. <span class=\"cite\">Deep Learning §2.1</span>",
    claim: "T ≈ G ×₁ A ×₂ B ×₃ C,  480 → 102,  4.71×  al  6.7%",
    predict: "Antes de deslizar: si bajas el rango de la hora de 3 a 1, ¿empeora el error un poco, o desaparece del todo la barra de la hora 18?",
    b: "<p>En los rangos (2, 2, 3) — origen, destino, hora — el núcleo y los tres factores juntos guardan 102 números en lugar de los 480 del tensor: un ahorro de 4,71×, con un error relativo del 6,7%. La imagen de la derecha es la columna 0 del factor de la hora, C; la hora 18 es la barra más alta, el mismo pico que señalan los conteos brutos y la suma marginal.</p><p>Sube o baja cualquier rango y todos los números aquí cambian juntos — el núcleo, los tres factores, el error y la proporción — porque vienen de una sola contracción, no de tres elecciones independientes.</p>",
    controls: {r0: "Rango de origen", r1: "Rango de destino", r2: "Rango de la hora"},
    axCore: "núcleo G (despliegue de modo 2)",
    axA: "A (origen)", axB: "B (destino)", axC: "C, columna 0 (hora)",
    readout: (params, ratio, err, hourpeak) =>
      `Con estos rangos: <b>${params}</b> números sustituyen a 480, un ahorro de <b>${ratio.toFixed(2)}×</b>, con un error relativo de <b>${(err * 100).toFixed(1)}%</b>. ` +
      `La primera columna del factor de la hora sigue con su pico en la hora <b>${hourpeak}</b>.`,
    aria: (ctx) => {
      const s = ctx.state;
      return `Cuatro cuadrículas numéricas — un cubo núcleo y tres matrices factor en los rangos ${s.r0}, ${s.r1}, ${s.r2} — y un gráfico de barras de la primera columna del factor de la hora, con la hora 18 iluminada.`;
    }
  };

  window.FactorScenes.register({
    id: "tucker", section: "10",
    part: {en: "What the SVD says", es: "Lo que dice la SVD"},
    copy: {en: EN, es: ES},

    controls: [
      {id: "r0", type: "range", min: 1, max: 4, step: 1, fmt: (v) => String(v)},
      {id: "r1", type: "range", min: 1, max: 5, step: 1, fmt: (v) => String(v)},
      {id: "r2", type: "range", min: 1, max: 20, step: 1, fmt: (v) => String(v)}
    ],

    init(ctx) {
      ctx.state.r0 = 2;
      ctx.state.r1 = 2;
      ctx.state.r2 = 3;
    },

    draw(ctx) {
      const T = ctx.taxi, s = ctx.state, svg = ctx.svg;
      const bases = FC.hosvdBases(T);
      const h = FC.hosvd(T, [s.r0, s.r1, s.r2], bases);
      const core2d = FC.unfold(h.core, 2); // the core, flattened for a readable grid
      K.numGrid(svg, core2d, {x: 40, y: 60, digits: 2, cellW: 58, cellH: 18, title: ctx.copy.axCore});
      K.numGrid(svg, h.factors[0], {x: 40, y: 60 + core2d.length * 18 + 40, digits: 2, cellW: 46, cellH: 16, title: ctx.copy.axA});
      K.numGrid(svg, h.factors[1], {x: 250, y: 60 + core2d.length * 18 + 40, digits: 2, cellW: 46, cellH: 16, title: ctx.copy.axB});
      const col0 = h.factors[2].map((row) => row[0]);
      let peak = 0;
      for (let i = 1; i < col0.length; i++) if (col0[i] > col0[peak]) peak = i;
      K.bars(svg, col0, {
        x: 460, y: 60, w: 300, h: 100,
        at: (i) => (i === peak ? "--fa-t" : "--fa-core"), lit: (i) => i === peak
      });
      K.label(svg, 460, 48, ctx.copy.axC, {size: 11.5, colour: "--stage-mute"});
    },

    readout(ctx) {
      const T = ctx.taxi, s = ctx.state, c = ctx.copy;
      const bases = FC.hosvdBases(T);
      const h = FC.hosvd(T, [s.r0, s.r1, s.r2], bases);
      const col0 = h.factors[2].map((row) => row[0]);
      let peak = 0;
      for (let i = 1; i < col0.length; i++) if (col0[i] > col0[peak]) peak = i;
      const ratio = h.ratio;
      const err = h.error;
      return {
        html: c.readout(h.params, ratio, err, peak),
        claim: `T ≈ G ×₁ A ×₂ B ×₃ C,  480 → ${h.params},  ${ratio.toFixed(2)}×  at  ${(err * 100).toFixed(1)}%`,
        data: {
          ranks: [s.r0, s.r1, s.r2].join(","), core: h.core.data.length, params: h.params,
          dense: T.data.length, ratio: ratio.toFixed(2), err: err.toFixed(3),
          hourpeak: peak, shape: T.shape.join(",")
        }
      };
    }
  });
})();
