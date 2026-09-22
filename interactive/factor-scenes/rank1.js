// Scene 5: a rank-1 term is three vectors and an outer product. Scaling one
// entry of a scales an entire row of every slab, because that row is
// literally a[i] times the same (b, c) picture -- the fact CP's whole model
// is built from. See factor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const FC = window.FactorCore, K = window.FactorKit;

  // One planted term from the synthetic tensor, reused rather than a fresh
  // arbitrary vector: it is already arithmetic factor-core.js owns and
  // npm test pins, not a new number typed into this file.
  const TERM = FC.synthetic().terms[0];

  const EN = {
    k: "A rank-1 term · section 11",
    h: "A rank-1 tensor is three vectors and nothing else",
    concept: "The simplest tensor of a given shape that is not all zero is an outer product of vectors: T[i, j, k] = a[i] b[j] c[k]. It takes I + J + K numbers to describe a tensor with I · J · K entries. <span class=\"cite\">Deep Learning §2.1</span>",
    claim: "T[i, j, k] = a[i] b[j] c[k]",
    predict: "Before you slide: if you double a[2], does the whole slab brighten evenly, or does only row 2 of it double?",
    b: "<p>Three short vectors, a (length 4), b (length 5) and c (length 24), build the whole 4 × 5 × 24 cube by multiplying one entry from each — 33 numbers standing in for 480. The picture shows one hour's 4 × 5 slab of that cube.</p><p>Pick an entry of a and scale it: every cell in that row of every slab scales by the same factor, because the row is a[i] times the same b ⊗ c picture at every hour. Nothing else in the slab moves.</p>",
    controls: {slab: "Hour (which slab)", entry: "Entry of a", scale: "Scale a[entry] (%)"},
    // Drawn on the stage. Every visible string is translated, including the
    // ones inside the picture -- the stage is not chrome, and a literal here
    // renders the same under a Spanish heading.
    axSlab: (h) => `hour ${h}'s slab, a ⊗ b ⊗ c`,
    readout: (i, scale, val, slab) =>
      `Row <b>a[${i}]</b> is scaled to <b>${scale}%</b> (${val.toFixed(3)}). Every cell in row ${i} of hour ${slab}'s slab scaled by the same amount; every other row is untouched.`,
    aria: (ctx) => {
      const s = ctx.state;
      return `A 4 by 5 slab of a rank-1 tensor for hour ${s.slab}, row ${s.entry} scaled to ${s.scale} percent, and three short bar charts for a, b and c beside it.`;
    }
  };
  const ES = {
    k: "Un término de rango 1 · sección 11",
    h: "Un tensor de rango 1 es tres vectores y nada más",
    concept: "El tensor más simple de una forma dada que no es todo ceros es un producto externo de vectores: T[i, j, k] = a[i] b[j] c[k]. Hacen falta I + J + K números para describir un tensor con I · J · K entradas. <span class=\"cite\">Deep Learning §2.1</span>",
    claim: "T[i, j, k] = a[i] b[j] c[k]",
    predict: "Antes de deslizar: si duplicas a[2], ¿se ilumina toda la losa por igual, o solo se duplica la fila 2?",
    b: "<p>Tres vectores cortos, a (longitud 4), b (longitud 5) y c (longitud 24), construyen todo el cubo 4 × 5 × 24 multiplicando una entrada de cada uno — 33 números en lugar de 480. La imagen muestra la losa 4 × 5 de una hora de ese cubo.</p><p>Elige una entrada de a y escala: cada celda de esa fila de cada losa se escala por el mismo factor, porque la fila es a[i] veces la misma imagen b ⊗ c en cada hora. Nada más en la losa se mueve.</p>",
    controls: {slab: "Hora (qué losa)", entry: "Entrada de a", scale: "Escalar a[entrada] (%)"},
    axSlab: (h) => `la losa de la hora ${h}, a ⊗ b ⊗ c`,
    readout: (i, scale, val, slab) =>
      `La fila <b>a[${i}]</b> se escala al <b>${scale}%</b> (${val.toFixed(3)}). Cada celda de la fila ${i} de la losa de la hora ${slab} se escaló en la misma proporción; el resto de filas no cambia.`,
    aria: (ctx) => {
      const s = ctx.state;
      return `Una losa de 4 por 5 de un tensor de rango 1 para la hora ${s.slab}, con la fila ${s.entry} escalada al ${s.scale} por ciento, y tres gráficos de barras cortos para a, b y c al lado.`;
    }
  };

  window.FactorScenes.register({
    id: "rank1", section: "11",
    part: {en: "What CP says", es: "Lo que dice CP"},
    copy: {en: EN, es: ES},

    controls: [
      {id: "slab", type: "range", min: 0, max: 23, step: 1, fmt: (v) => String(v)},
      {id: "entry", type: "range", min: 0, max: 3, step: 1, fmt: (v) => String(v)},
      {id: "scale", type: "range", min: 0, max: 200, step: 5, fmt: (v) => v + "%"}
    ],

    init(ctx) {
      ctx.state.slab = 18;
      ctx.state.entry = 0;
      ctx.state.scale = 100;
    },

    scaledA(ctx) {
      const s = ctx.state;
      return TERM.a.map((v, i) => (i === s.entry ? v * (s.scale / 100) : v));
    },

    draw(ctx) {
      const s = ctx.state, svg = ctx.svg;
      const a = this.scaledA(ctx);
      const slab = a.map((ai) => TERM.b.map((bj) => ai * bj * TERM.c[s.slab]));
      const g = K.numGrid(svg, slab, {
        x: 40, y: 60, digits: 3, cellW: 60, cellH: 20,
        at: (i, j) => (i === s.entry ? "--fa-t" : null),
        title: ctx.copy.axSlab(s.slab)
      });
      K.bars(svg, a, {x: 40, y: g.y1 + 50, w: 100, h: 60, at: (i) => (i === s.entry ? "--fa-t" : "--fa-fac"), lit: (i) => i === s.entry});
      K.label(svg, 40, g.y1 + 38, "a", {size: 11.5, colour: "--stage-mute"});
      K.bars(svg, TERM.b, {x: 170, y: g.y1 + 50, w: 110, h: 60, at: () => "--fa-r"});
      K.label(svg, 170, g.y1 + 38, "b", {size: 11.5, colour: "--stage-mute"});
      K.bars(svg, TERM.c, {x: 310, y: g.y1 + 50, w: 250, h: 60, at: (k) => (k === s.slab ? "--fa-t" : "--fa-core"), lit: (k) => k === s.slab});
      K.label(svg, 310, g.y1 + 38, "c", {size: 11.5, colour: "--stage-mute"});
    },

    readout(ctx) {
      const s = ctx.state, c = ctx.copy;
      const a = this.scaledA(ctx);
      return {
        html: c.readout(s.entry, s.scale, a[s.entry], s.slab),
        data: {
          shape: "4,5,24", terms: 1, params: FC.cpParams([4, 5, 24], 1),
          slab: s.slab, scaled: a[s.entry].toFixed(3), proportional: "1"
        }
      };
    }
  });
})();
