// Scene 8: a batch is one more index in the same einsum.
// Nothing about the arithmetic changes: the contraction over position and
// alphabet is the one the search scene already did, with a guide index carried
// along in front. The picture is that (G, W) result as a heatmap, one row per
// guide, each row's best window marked. Rows differ only by how far the guide
// was walked from the first, so the perfect score falls by exactly one per
// mismatch and you can read it off the column.
// Flat SVG, and the cells are sized from the box, so G = 6 and W = 161 fit.
// See genome-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const GC = window.GenomeCore, K = window.GenomeKit;

  // The first guide is the window that starts at base 41 (index 40): the only
  // one of the 161 that the core scores a full 20 against.
  const SOURCE = 40, WIDTH = 20;
  const L = {
    labX: 44, heatX: 108, heatW: 500, heatY: 112, maxRow: 34, heatMaxH: 204,
    rightX: 620, headY: 84, axisGap: 18, line1Y: 362, line2Y: 382
  };

  function facts(ctx) {
    const s = ctx.state;
    const G = Math.max(1, Math.min(6, s.guides));
    const step = Math.max(0, Math.min(6, s.mismatch));
    const first = GC.windows(ctx.seq, WIDTH).at(SOURCE);
    const off = [], guides = [];
    for (let g = 0; g < G; g++) {
      off.push(Math.min(g * step, WIDTH));                 // a guide cannot miss more than it is long
      guides.push(GC.mutate(first, off[g]));
    }
    const S = GC.batchScores(guides, ctx.seq);
    const best = S.map((row) => GC.topMatches(row, 1)[0]);   // {at, score}, per row
    const W = S[0].length;
    return {
      G, step, guides, off, S, best, W, total: G * W,
      exact: S.map((row) => row[SOURCE])                     // the exact window's column
    };
  }

  const EN = {
    k: "Section 02 · a batch",
    h: "A batch is one more index in the same einsum",
    concept: "A guide axis carried in front. The sum is still over position and alphabet; " +
             "the guide index g is never summed, so it survives into the result.",
    predict: "Before you drag: with three guides and 161 windows, how many scores does one " +
             "einsum produce? And if each next guide is walked two mismatches away, how " +
             "high does its best score reach?",
    b: "Three guides against 161 windows is <b>483 scores from one einsum</b>. Nothing about " +
       "the arithmetic changed: it is the same contraction over position and alphabet as " +
       "before, with a guide index <b>g</b> carried along in front, so the result is " +
       "<b>(G, W)</b> and not <b>(W,)</b>. Consecutive rows differ only by how far the guide " +
       "was walked from the first, so the first guide's perfect 20 falls by exactly one " +
       "for each base changed. Watch the marked cell: it is each row's best window, and " +
       "it sits at the same place until the guide has been walked so far that another window " +
       "matches it better. Raise the mismatch step and the rows fade from top to bottom.",
    eqcap: "Same contraction as before, over ℓ and b: g and w are never summed, which is why " +
           "both are still there in S, one entry per guide and window.",
    claim: (G, W, total) =>
      G + (G === 1 ? " guide" : " guides") + " × " + W + " windows = " + total +
      " scores, one einsum",
    aria: (ctx) => {
      const f = facts(ctx);
      return "A heatmap of " + f.G + " guides by " + f.W + " windows, " + f.total + " scores, " +
             "with each row's best window marked. The exact window scores " +
             f.exact.join(", ") + " from the first guide to the last.";
    },
    shapeHead: (G, W) => "S: (" + G + ", " + W + "), one row per guide, one column per window",
    guideLab: (g) => "guide " + g,
    rowR: (score, at, k) => score + "/" + WIDTH + " at " + at + " · " + k + " off",
    axisL: "window 1",
    axisR: (W) => "window " + W,
    fall: (list, at) => "score at window " + at + ", row by row: " + list.join(" · "),
    same: "the same sum over position and alphabet; only the guide index g is new",
    controls: {guides: "How many guides", mismatch: "Mismatches per step"},
    options: {},
    read: (f) =>
      "<b>" + f.G + (f.G === 1 ? " guide" : " guides") + " × " + f.W + " windows = " + f.total +
      " scores</b> · shape (" + f.G + ", " + f.W + ") · each guide is " + f.step +
      " mismatches further from the first · the exact window scores " + f.exact.join(", "),
    np: {
      q: "one guide per row",
      w: "as before",
      s: "one more index",
      col: (list, at) => "window " + at + ": " + list.join(" ")
    }
  };

  const ES = {
    k: "Sección 02 · un lote",
    h: "Un lote es un índice más en el mismo einsum",
    concept: "Un eje de guías llevado por delante. La suma sigue siendo sobre posición y " +
             "alfabeto; el índice de guía g nunca se suma, así que sobrevive al resultado.",
    predict: "Antes de arrastrar: con tres guías y 161 ventanas, ¿cuántas puntuaciones produce " +
             "un einsum? Y si cada guía se aleja dos cambios de la anterior, ¿hasta dónde " +
             "llega su mejor puntuación?",
    b: "Tres guías contra 161 ventanas son <b>483 puntuaciones de un solo einsum</b>. Nada de " +
       "la aritmética cambió: es la misma contracción sobre posición y alfabeto de antes, con " +
       "un índice de guía <b>g</b> llevado por delante, así que el resultado es <b>(G, W)</b> " +
       "y no <b>(W,)</b>. Las filas consecutivas solo se distinguen por cuánto se alejó la " +
       "guía de la primera, así que el 20 perfecto de la primera guía baja exactamente uno " +
       "por cada base cambiada. Mira la celda marcada: es la mejor ventana de cada fila, y " +
       "se queda en el mismo sitio hasta que la guía se aleja tanto que otra ventana " +
       "coincide mejor. Sube el paso de cambios y las filas se apagan de arriba abajo.",
    eqcap: "La misma contracción de antes, sobre ℓ y b: g y w nunca se suman, y por eso los " +
           "dos siguen en S, una entrada por guía y ventana.",
    claim: (G, W, total) =>
      G + (G === 1 ? " guía" : " guías") + " × " + W + " ventanas = " + total +
      " puntuaciones, un einsum",
    aria: (ctx) => {
      const f = facts(ctx);
      return "Un mapa de calor de " + f.G + " guías por " + f.W + " ventanas, " + f.total +
             " puntuaciones, con la mejor ventana de cada fila marcada. La ventana exacta " +
             "puntúa " + f.exact.join(", ") + " de la primera guía a la última.";
    },
    shapeHead: (G, W) => "S: (" + G + ", " + W + "), una fila por guía, una columna por ventana",
    guideLab: (g) => "guía " + g,
    rowR: (score, at, k) => score + "/" + WIDTH + " en " + at + " · " + k + " dif",
    axisL: "ventana 1",
    axisR: (W) => "ventana " + W,
    fall: (list, at) => "puntuación en la ventana " + at + ", fila a fila: " + list.join(" · "),
    same: "la misma suma sobre posición y alfabeto; solo el índice de guía g es nuevo",
    controls: {guides: "Cuántas guías", mismatch: "Cambios por paso"},
    options: {},
    read: (f) =>
      "<b>" + f.G + (f.G === 1 ? " guía" : " guías") + " × " + f.W + " ventanas = " + f.total +
      " puntuaciones</b> · forma (" + f.G + ", " + f.W + ") · cada guía está " + f.step +
      " cambios más lejos de la primera · la ventana exacta puntúa " + f.exact.join(", "),
    np: {
      q: "una guía por fila",
      w: "como antes",
      s: "un índice más",
      col: (list, at) => "ventana " + at + ": " + list.join(" ")
    }
  };

  window.GenomeScenes.register({
    id: "batch", section: "02",
    hl: ["guide", "win", "pos", "base"],
    copy: {en: EN, es: ES},

    controls: [
      {id: "guides", type: "range", min: 1, max: 6, step: 1, fmt: (v) => String(v)},
      {id: "mismatch", type: "range", min: 0, max: 6, step: 1, fmt: (v) => String(v)}
    ],

    init(ctx) {
      ctx.state.guides = 3;
      ctx.state.mismatch = 2;
    },

    draw(ctx) {
      const svg = ctx.svg, c = ctx.copy, f = facts(ctx), lit = ctx.hl;
      const rowH = Math.min(L.maxRow, L.heatMaxH / f.G);
      const h = rowH * f.G;
      const cw = L.heatW / f.W;

      K.label(svg, L.labX, L.headY, c.shapeHead(f.G, f.W), {size: 12, colour: "--gn-core"});

      const hm = K.heat(svg, f.S, {
        x: L.heatX, y: L.heatY, w: L.heatW, h: h, peak: WIDTH,
        at: (i, j) => (f.best[i].at === j ? "--gn-hit" : null)
      });

      // Each row's best window: an outline wide enough to see at 3 px a cell.
      f.best.forEach((b, i) => {
        svg.appendChild(K.el("rect", {
          x: (L.heatX + b.at * cw - 1.5).toFixed(2), y: (L.heatY + i * rowH).toFixed(2),
          width: (cw + 3).toFixed(2), height: rowH.toFixed(2), fill: "none",
          stroke: K.css("--stage-ink"), "stroke-width": lit === "win" ? 2.4 : 1.4
        }));
        const y = L.heatY + i * rowH + rowH / 2;
        K.label(svg, L.labX, y, c.guideLab(i + 1), {
          size: 11, baseline: "middle", colour: lit === "guide" ? "--gn-hit" : "--stage-mute"
        });
        K.label(svg, L.rightX, y, c.rowR(b.score, b.at + 1, f.off[i]), {
          size: 11, baseline: "middle", colour: lit === "guide" ? "--gn-hit" : "--stage-ink"
        });
      });

      K.label(svg, L.heatX, hm.y1 + L.axisGap, c.axisL, {size: 10, colour: "--stage-mute"});
      K.label(svg, L.heatX + L.heatW, hm.y1 + L.axisGap, c.axisR(f.W),
        {size: 10, anchor: "end", colour: "--stage-mute"});

      K.label(svg, L.labX, L.line1Y, c.fall(f.exact, SOURCE + 1), {size: 12, colour: "--gn-hit"});
      K.label(svg, L.labX, L.line2Y, c.same, {size: 12});
    },

    readout(ctx) {
      const f = facts(ctx), c = ctx.copy;
      return {
        html: c.read(f),
        claim: c.claim(f.G, f.W, f.total),
        data: {guides: String(f.G), mismatch: String(f.step), windows: String(f.W),
               scores: String(f.total), shape: f.G + "x" + f.W,
               exact: f.exact.join(","), best: f.best.map((b) => b.score).join(",")}
      };
    },

    code(ctx) {
      const f = facts(ctx), np = ctx.copy.np;
      return K.code([
        ["Q = one_hot_batch(guides)", "(" + f.G + ", " + WIDTH + ", 4): " + np.q],
        ["W = win(X, " + WIDTH + ", axis=0).transpose(0, 2, 1)",
         "(" + f.W + ", " + WIDTH + ", 4), " + np.w],
        ['S = np.einsum("glb,wlb->gw", Q, W)', "(" + f.G + ", " + f.W + "): " + np.s],
        ["S[:, " + SOURCE + "]", np.col(f.exact, SOURCE + 1)]
      ]);
    }
  });
})();
