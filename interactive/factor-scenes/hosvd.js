// Scene 3: what the SVD says about one unfolding. A scree of singular
// values, the first r lit, and the factor matrix those r columns make --
// the piece hosvd() in factor-core.js assembles into Tucker's A, B and C.
// See factor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const FC = window.FactorCore, K = window.FactorKit;
  const SUBD = ["₀", "₁", "₂"];
  const RMAX_LABEL = [4, 5, 20];

  const EN = {
    k: "The SVD of one unfolding · section 10",
    h: "Each unfolding has its own SVD, and its own rank",
    concept: "The SVD of a matrix ranks its directions by how much of the matrix each explains. Keeping the first r of them is the best possible rank-r approximation — the Eckart–Young theorem, the same one section 09's truncated SVD used on an image. <span class=\"cite\">Deep Learning §2.8</span>",
    claim: "A = U[:, :r]  from  SVD(T₍₀₎)",
    predict: "Before you slide: mode 2's unfolding is 24 × 20. Can r ever reach 24 there, or does something else cap it first?",
    b: "<p>Each of the three unfoldings gets its own SVD, computed once and cached: sliding r just keeps more or fewer of its columns. The bars are the singular values, largest first; the ones inside r are lit, and how fast they fall off is how compressible this mode is.</p><p>Mode 2's unfolding is only 24 × 20, so its SVD hands back at most 20 columns — a <em>thin</em> U, the shape NumPy's own <code>svd(..., full_matrices=False)</code> returns. That is the hour rank's ceiling, not 24.</p>",
    controls: {mode: "Which unfolding", r: "Rank kept, r"},
    // Drawn on the stage. Every visible string is translated, including the
    // ones inside the picture -- the stage is not chrome, and a literal here
    // renders the same under a Spanish heading.
    axSingular: (sub) => `Singular values, mode ${sub}`,
    axFactor: (r) => `A: U[:, :${r}]`,
    options: {mode: {0: "pickup (mode 0)", 1: "dropoff (mode 1)", 2: "hour (mode 2)"}},
    readout: (mode, r, rmax, sv0, kept) =>
      `Mode ${mode}'s SVD keeps <b>r = ${r}</b> of at most <b>${rmax}</b> columns. ` +
      `The largest singular value is <b>${sv0.toFixed(1)}</b>, and the kept columns hold <b>${kept}%</b> of the singular-value mass.` +
      (mode === 2 && rmax === 20 ? " (24 × 20: the thin U caps this mode at 20, not 24.)" : ""),
    aria: (ctx) => {
      const s = ctx.state;
      return `A bar chart of singular values for mode ${s.mode}, largest first, with the first ${s.r} lit, and a matrix of ${s.r} factor columns beside it.`;
    }
  };
  const ES = {
    k: "La SVD de un desdoblado · sección 10",
    h: "Cada desdoblado tiene su propia SVD, y su propio rango",
    concept: "La SVD de una matriz ordena sus direcciones por cuánto de la matriz explica cada una. Quedarse con las primeras r es la mejor aproximación posible de rango r — el teorema de Eckart–Young, el mismo que usó la SVD truncada de la sección 09 sobre una imagen. <span class=\"cite\">Deep Learning §2.8</span>",
    claim: "A = U[:, :r]  desde  SVD(T₍₀₎)",
    predict: "Antes de deslizar: el desdoblado del modo 2 es 24 × 20. ¿Puede r llegar a 24 ahí, o algo más lo limita antes?",
    b: "<p>Cada uno de los tres desdoblados tiene su propia SVD, calculada una vez y guardada: deslizar r solo conserva más o menos de sus columnas. Las barras son los valores singulares, el mayor primero; los que están dentro de r se iluminan, y qué tan rápido caen dice cuán compresible es este modo.</p><p>El desdoblado del modo 2 es solo 24 × 20, así que su SVD devuelve como mucho 20 columnas — una U <em>delgada</em>, la forma que devuelve el propio <code>svd(..., full_matrices=False)</code> de NumPy. Ese es el techo del rango de la hora, no 24.</p>",
    controls: {mode: "Qué desdoblado", r: "Rango conservado, r"},
    axSingular: (sub) => `Valores singulares, modo ${sub}`,
    axFactor: (r) => `A: U[:, :${r}]`,
    options: {mode: {0: "origen (modo 0)", 1: "destino (modo 1)", 2: "hora (modo 2)"}},
    readout: (mode, r, rmax, sv0, kept) =>
      `La SVD del modo ${mode} conserva <b>r = ${r}</b> de a lo sumo <b>${rmax}</b> columnas. ` +
      `El mayor valor singular es <b>${sv0.toFixed(1)}</b>, y las columnas conservadas contienen el <b>${kept}%</b> de la masa de valores singulares.` +
      (mode === 2 && rmax === 20 ? " (24 × 20: la U delgada limita este modo a 20, no a 24.)" : ""),
    aria: (ctx) => {
      const s = ctx.state;
      return `Un gráfico de barras de valores singulares para el modo ${s.mode}, el mayor primero, con los primeros ${s.r} iluminados, y una matriz de ${s.r} columnas factor al lado.`;
    }
  };

  window.FactorScenes.register({
    id: "hosvd", section: "10",
    copy: {en: EN, es: ES},

    controls: [
      {id: "mode", type: "select", options: ["0", "1", "2"]},
      {id: "r", type: "range", min: 1, max: 20, step: 1, fmt: (v) => "r = " + v}
    ],

    init(ctx) {
      ctx.state.mode = 2;
      ctx.state.r = 3;
    },

    // The select's value is a string; the rank slider's ceiling depends on
    // which mode is chosen, so its max attribute is rewritten here, before
    // draw() and readout() both read the clamped value.
    sync(ctx) {
      ctx.state.mode = Number(ctx.state.mode);
      const rmax = RMAX_LABEL[ctx.state.mode];
      const input = ctx.control("r");
      if (input && Number(input.max) !== rmax) input.max = String(rmax);
      if (ctx.state.r > rmax) ctx.state.r = rmax;
    },

    draw(ctx) {
      const T = ctx.taxi, s = ctx.state, svg = ctx.svg;
      const bases = FC.hosvdBases(T);
      const S = bases[s.mode].S;
      const U = bases[s.mode].U;
      const rmax = RMAX_LABEL[s.mode];
      K.bars(svg, S, {
        x: 40, y: 60, w: 420, h: 130,
        at: (i) => (i < s.r ? "--fa-t" : "--fa-fac"), lit: (i) => i < s.r
      });
      K.label(svg, 40, 48, ctx.copy.axSingular(SUBD[s.mode]), {size: 11.5, colour: "--stage-mute"});
      const factor = FC.signFix(U, s.r);
      // The factor matrix has as many rows as this mode's own dimension --
      // up to 24, on the hour mode -- so its row height is capped to fit
      // the stage rather than running the grid off the bottom of it.
      const cellH = Math.min(18, 330 / factor.length);
      K.numGrid(svg, factor, {x: 500, y: 60, digits: 3, cellW: 62, cellH, title: ctx.copy.axFactor(s.r)});
    },

    readout(ctx) {
      const T = ctx.taxi, s = ctx.state, c = ctx.copy;
      const bases = FC.hosvdBases(T);
      const S = bases[s.mode].S;
      const rmax = RMAX_LABEL[s.mode];
      const total = S.reduce((a, v) => a + v * v, 0);
      const kept = total > 0 ? Math.round(100 * S.slice(0, s.r).reduce((a, v) => a + v * v, 0) / total) : 0;
      const fshape = T.shape[s.mode] + "×" + s.r;
      return {
        html: c.readout(s.mode, s.r, rmax, S[0], kept),
        claim: `A = U[:, :${s.r}]  from  SVD(T₍${SUBD[s.mode]}₎)`,
        data: {mode: s.mode, r: s.r, rmax, sv0: S[0].toFixed(2), kept, fshape}
      };
    }
  });
})();
