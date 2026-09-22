// Scene 7: what a model is actually handed is a rank-4 tensor, B batches of
// H heads of an (S, D_k) matrix, and the two einsum strings that built the
// scores and the output are literal text on the stage — the same letters
// notebook 17 and this stage's own scores and output scenes use, with b and
// h simply carried along on both sides.
(function () {
  "use strict";

  function draw(ctx) {
    const K = ctx.K, svg = ctx.svg, s = ctx.state;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const root = K.el("g", {transform: "translate(0,44)"});
    svg.appendChild(root);
    // The shape line is the claim, and the frame already writes the claim on
    // the chip over the top-left of the stage -- drawing it here too printed
    // the same sentence twice on one picture.
    //
    // Every sheet is capped against a budget for the whole grid of them, so
    // the picture holds at every corner of the four sliders and not only at
    // their opening values; then the grid is centred in what is left, rather
    // than pinned to a fixed origin, which at the opening values left it a
    // small cluster in the top-left corner of an otherwise empty stage.
    const BUDGET_W = 500, BUDGET_H = 210, GAP_X = 16, GAP_Y = 18;
    const cellW = Math.min(14, 150 / s.dk, (BUDGET_W - (s.b - 1) * GAP_X) / s.b / s.dk);
    const cellH = Math.min(14, 150 / s.s, (BUDGET_H - (s.h - 1) * GAP_Y) / s.h / s.s);
    const sheetW = s.dk * cellW, sheetH = s.s * cellH;
    const gapX = sheetW + GAP_X, gapY = sheetH + GAP_Y;
    const gridW = s.b * sheetW + (s.b - 1) * GAP_X;
    const gridH = s.h * sheetH + (s.h - 1) * GAP_Y;
    const originX = (640 - gridW) / 2, originY = 30 + (BUDGET_H - gridH) / 2;

    for (let b = 0; b < s.b; b++) {
      for (let h = 0; h < s.h; h++) {
        const x = originX + b * gapX, y = originY + h * gapY;
        root.appendChild(K.el("rect", {
          x, y, width: sheetW, height: sheetH, rx: 3,
          fill: ctx.colour(h === 0 ? "--at-q" : "--at-k"), opacity: 0.55
        }));
        if (b === 0) {
          root.appendChild(K.text(originX - 14, y + sheetH / 2, "h" + h,
            {size: 10, anchor: "end", fill: ctx.colour("--stage-mute")}));
        }
      }
      root.appendChild(K.text(originX + b * gapX + sheetW / 2, originY + gridH + 14, "b" + b,
        {size: 10, fill: ctx.colour("--stage-mute")}));
    }
    // Notation, not a sentence: one sheet's shape serves both languages, and
    // the prose that says a sheet *is* an (S, D_k) slice lives in copy.b.
    root.appendChild(K.text(320, originY + gridH + 34,
      "sheet = (S, D_k) = (" + s.s + ", " + s.dk + ")",
      {size: 11, fill: ctx.colour("--stage-mute")}));

    root.appendChild(K.text(320, 296, "einsum('bhsd,bhtd->bhst', Q, K)",
      {size: 12, mono: true, fill: ctx.colour("--at-q"), attrs: {"text-anchor": "middle"}}));
    root.appendChild(K.text(320, 316, "einsum('bhst,bhtd->bhsd', A, V)",
      {size: 12, mono: true, fill: ctx.colour("--at-v"), attrs: {"text-anchor": "middle"}}));
  }

  window.AttentionScenes.register({
    id: "batch",
    section: "04",

    controls: [
      {id: "b", type: "range", min: 1, max: 4, step: 1, fmt: (v) => String(v)},
      {id: "h", type: "range", min: 1, max: 4, step: 1, fmt: (v) => String(v)},
      {id: "s", type: "range", min: 2, max: 16, step: 2, fmt: (v) => String(v)},
      {id: "dk", type: "range", min: 2, max: 16, step: 2, fmt: (v) => String(v)}
    ],

    init(ctx) { Object.assign(ctx.state, {b: 2, h: 2, s: 4, dk: 4}); },
    draw,

    readout(ctx) {
      const s = ctx.state, AC = ctx.AC;
      const shape = [s.b, s.h, s.s, s.dk];
      const lshape = [s.b, s.h, s.s, s.s];
      return {
        html: ctx.copy.readout(shape, AC.elementCount(shape)),
        claim: "𝒯 ∈ ℝ^(B×H×S×D_k) = (" + shape.join(", ") + ")",
        data: {
          shape: shape.join(","), b: s.b, h: s.h, s: s.s, dk: s.dk,
          lshape: lshape.join(","), elems: AC.elementCount(shape),
          einsum1: "bhsd,bhtd->bhst", einsum2: "bhst,bhtd->bhsd"
        }
      };
    },

    copy: {
      en: {
        tab: "Batch",
        k: "What a model is handed · section 04",
        h: "What a model is actually handed is a rank-4 tensor",
        claim: "𝒯 ∈ ℝ^(B×H×S×D_k) = (2, 2, 4, 4)",
        concept: "A batch of B sequences, each with H heads of its own (S, D_k) matrix, is one rank-4 " +
                 "tensor. Every contraction in this stage carries b and h along on both sides of its " +
                 "einsum string — they are never summed over, because a batch item's attention never " +
                 "mixes with another's.",
        b: "<p>Each sheet is one (S, D_k) slice; B columns of H sheets each is the whole tensor. Move " +
           "any slider and the element count below is that shape's own product, not a stored number.</p>",
        predict: "Doubling S doubles the element count. Does doubling D_k also double it?",
        controls: {b: "Batch B", h: "Heads H", s: "Sequence S", dk: "D_k"},
        readout: (shape, elems) =>
          "𝒯.shape = (" + shape.join(", ") + "), <b>" + elems.toLocaleString("en") +
          "</b> numbers in all.",
        aria: (ctx) => "A grid of rectangles, " + ctx.state.b + " batches of " + ctx.state.h +
                        " head sheets each " + ctx.state.s + " by " + ctx.state.dk +
                        ", with both einsum strings written below."
      },
      es: {
        tab: "Lote",
        k: "Lo que recibe un modelo · sección 04",
        h: "Lo que recibe de verdad un modelo es un tensor de rango 4",
        claim: "𝒯 ∈ ℝ^(B×H×S×D_k) = (2, 2, 4, 4)",
        concept: "Un lote de B secuencias, cada una con H cabezas de su propia matriz (S, D_k), es un " +
                 "solo tensor de rango 4. Cada contracción de este escenario lleva b y h en ambos " +
                 "lados de su cadena einsum: nunca se suman, porque la atención de un elemento del " +
                 "lote nunca se mezcla con la de otro.",
        b: "<p>Cada lámina es una rebanada (S, D_k); B columnas de H láminas cada una es el " +
           "tensor entero. Mueve cualquier deslizador y el conteo de elementos de abajo es el producto " +
           "propio de esa forma, no un número guardado.</p>",
        predict: "Duplicar S duplica el conteo de elementos. ¿Duplicar D_k también lo " +
                 "duplica?",
        controls: {b: "Lote B", h: "Cabezas H", s: "Secuencia S", dk: "D_k"},
        readout: (shape, elems) =>
          "𝒯.shape = (" + shape.join(", ") + "), <b>" + elems.toLocaleString("es") +
          "</b> números en total.",
        aria: (ctx) => "Una cuadrícula de rectángulos, " + ctx.state.b + " lotes de " +
                        ctx.state.h + " láminas de cabeza cada una " + ctx.state.s + " por " +
                        ctx.state.dk + ", con ambas cadenas einsum escritas debajo."
      }
    }
  });
})();
