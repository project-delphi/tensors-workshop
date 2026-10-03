// Scene 6: Strassen's seven blocks, added to an empty cube one at a time.
// The cube is the stack of four trays every 3-D scene here draws; a ring
// marks each of the eight cells the rule wants a 1 in, and the cells are what
// the blocks so far add up to. The first block lights eight cells and only
// two of them are ringed -- so the count of cells that differ from the rule
// goes *up*, from 8 to 12 -- and the later blocks cancel the damage: a cell
// that held something and is back at zero is left as a hollow outline, so the
// overshoot stays visible after it is gone. Beside the cube, on the stage's
// inset, are the products themselves and the count after each one. Switching
// to the schoolbook rule's eight blocks is the contrast: one ringed cell a
// press, nothing ever hollow. Cells ease in and out by identity; the readout
// is written from the two controls. This is also the page's embed still.
// Drawn in three.js, with an SVG twin from the same model.
// See alphatensor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const AC = window.AlphaTensorCore, K = window.AlphaTensorKit;

  const N = 2, T = AC.tensor(N);
  const SPLITS = {strassen: AC.STRASSEN, school: AC.schoolbook(N)};
  const TAU = 0.16, ENTRANCE = 1200;
  const split = (ctx) => SPLITS[ctx.state.split];
  const count = (ctx) => split(ctx).U.length;

  // Everything the picture and the readout need, from the two controls.
  function facts(ctx) {
    const F = split(ctx), R = F.U.length, k = Math.min(ctx.state.k, R);
    const blocks = AC.blocksOf(F, k), P = AC.play(T, blocks);
    const full = AC.play(T, AC.blocksOf(F));
    const last = k > 0 ? AC.rankOne(F.U[k - 1], F.V[k - 1], F.W[k - 1]) : null;
    const rep = k > 0 ? AC.blockReport(T, F.U[k - 1], F.V[k - 1], F.W[k - 1]) : null;
    return {F, R, k, blocks, P, full, last, rep, off: P.trail[k], was: k > 0 ? P.trail[k - 1] : P.trail[0],
            touched: AC.nnz(P.everSum), hollow: AC.nnz(P.everSum) - AC.nnz(P.sum), text: AC.formulas(F, N)};
  }

  // Where product r is added: "+c₁₁ −c₂₂", from its row of W.
  function goes(F, r) {
    return F.W[r].map((w, c) => (w ? (w > 0 ? "+" : "−") + AC.name("c", N, c) : "")).filter(Boolean).join(" ");
  }

  // The model both surfaces draw: the cube for this state, eased by piece.
  function shown(ctx) {
    const c = ctx.cache, t = ctx.now(), s = ctx.state;
    const key = s.split + "|" + s.k + "|" + ctx.hl;
    if (c.memo && c.memo.key === key && t - c.memo.t < 4) return c.memo.m;
    const f = facts(ctx);
    const lit = f.last ? f.last.map((v) => (v ? 1 : 0)) : null;
    const m = K.cubeModel({n: N, values: f.P.sum, ever: f.P.everSum, rings: T, slice: null,
                           lit: ctx.hl === "r" ? lit : null},
                          {zeros: ctx.embed ? "grid" : "cells", hl: ctx.hl, nameSize: ctx.embed ? 17 : 11});
    // The block just added stands a little proud, so the eye finds it.
    if (lit && ctx.hl !== "r") m.items.forEach((it) => { if (it.v && lit[it.idx]) { it.s *= 1.14; it.k = 1.5; } });
    // The entrance: the cells grow into the rings that were waiting for them.
    const grow = K.smooth(K.arrival(ctx, ENTRANCE));
    if (grow < 1) m.items.forEach((it) => { if (it.v) it.s *= grow; });
    c.ease = c.ease || {};
    m.items = K.follow(c.ease, m.items, t, TAU, ctx.instant);
    c.memo = {key, t, m};
    return m;
  }

  const EN = {
    tab: "strassen",
    k: "Section 11 · seven blocks",
    h: "Seven blocks that add up to the cube, exactly",
    predict: "Before you add anything: the cube needs eight cells filled. After the first of Strassen's " +
             "seven blocks, will fewer than eight cells be wrong, or more?",
    concept: "A split of the cube into R blocks is a CP factorization with an equals sign: every one of " +
             "the 64 cells has to match. Each block costs one multiplication, so R blocks are an " +
             "algorithm with R multiplications. Strassen's algorithm is a split into seven.",
    b: "The rings are the eight cells the rule wants. <b>Add the blocks one at a time</b> and watch the " +
       "count of cells that differ from the rule. A block covers cells the rule never asked for; a " +
       "later block puts the opposite sign on the same cell, and it goes hollow: cancelled back to " +
       "zero. Switch to <b>the schoolbook's eight</b> for the contrast, where every block is a single " +
       "ringed cell and nothing is ever cancelled. Click a product on the right to jump to it.",
    eqcap: "T is the cube, and each term is one block: three lists of weights, u, v and w, multiplied " +
           "out into a 4 × 4 × 4. R, the number of terms, is the number of multiplications.",
    splitName: {strassen: "Strassen", school: "schoolbook"},
    head: (k, R) => "blocks added: " + k + " of " + R,
    trail: "cells that differ, after each block",
    claim: (k, R, off) => k + " of " + R + " blocks · " + (off ? off + (off === 1 ? " cell differs" : " cells differ") : "the cube, exactly"),
    caption: (formula, to) => formula + "  →  " + to,
    read: (f, name) => {
      if (f.k === 0) return "<b>Nothing added yet</b>: all 8 ringed cells are missing, so 8 cells differ from the rule. Add the first block.";
      const moved = f.off - f.was;
      const step = moved > 0 ? "<b>More, not fewer:</b> the count went up, from " + f.was + " to <b>" + f.off + "</b>."
        : moved < 0 ? "The count fell from " + f.was + " to <b>" + f.off + "</b>."
        : "The count stayed at <b>" + f.off + "</b>.";
      const did = "Block " + f.k + " covers " + f.rep.cells + (f.rep.cells === 1 ? " cell" : " cells") + ": " +
        f.rep.wanted + " on a ring" + (f.rep.damage ? " and " + f.rep.damage + " where the rule has a 0." : ".");
      const end = f.off === 0
        ? " <b>All " + f.R + " " + name + " blocks sum to the cube exactly</b>: " + f.R + " multiplications. " +
          (f.hollow ? f.touched + " cells held something on the way, and " + f.hollow + " of them ended hollow."
                    : "No cell was ever cancelled.")
        : "";
      return step + " " + did + end;
    },
    tip: (a, b, c, v) => "(" + a + ", " + b + ", " + c + ") holds " + v,
    aria: (ctx) => {
      const f = facts(ctx);
      return "The multiplication cube as four stacked trays of sixteen cells, with a ring on each of the " +
             "eight cells the rule fills. " + f.k + " of " + f.R + " blocks have been added, and " + f.off +
             " cells differ from the rule. Beside it, the list of products and a bar for the count after each one.";
    },
    controls: {split: "Which split", k: "Blocks added", play: "▶ Add them in turn"},
    options: {split: {strassen: "Strassen's seven", school: "the schoolbook's eight"}},
    np: {
      rows: (R) => R + " blocks, four weights each",
      differ: (off) => off + (off === 1 ? " cell differs" : " cells differ"),
      exact: (R) => "True: " + R + " blocks are the cube"
    }
  };

  const ES = {
    tab: "strassen",
    k: "Sección 11 · siete bloques",
    h: "Siete bloques que suman el cubo, exactamente",
    predict: "Antes de sumar nada: el cubo necesita ocho celdas llenas. Tras el primero de los siete " +
             "bloques de Strassen, ¿habrá menos de ocho celdas mal, o más?",
    concept: "Una partición del cubo en R bloques es una factorización CP con signo igual: cada una de " +
             "las 64 celdas tiene que coincidir. Cada bloque cuesta una multiplicación, así que R " +
             "bloques son un algoritmo con R multiplicaciones. El algoritmo de Strassen es una " +
             "partición en siete.",
    b: "Los anillos son las ocho celdas que la regla quiere. <b>Suma los bloques de uno en uno</b> y " +
       "mira cuántas celdas difieren de la regla. Un bloque cubre celdas que la regla nunca pidió; un " +
       "bloque posterior pone el signo contrario en la misma celda, y queda hueca: cancelada de vuelta " +
       "a cero. Cambia a <b>los ocho de la regla escolar</b> para el contraste, donde cada bloque es " +
       "una sola celda con anillo y nunca se cancela nada. Haz clic en un producto de la derecha para " +
       "ir a él.",
    eqcap: "T es el cubo, y cada término es un bloque: tres listas de pesos, u, v y w, multiplicadas " +
           "hasta dar un 4 × 4 × 4. R, el número de términos, es el número de multiplicaciones.",
    splitName: {strassen: "de Strassen", school: "de la regla escolar"},
    head: (k, R) => "bloques sumados: " + k + " de " + R,
    trail: "celdas que difieren, tras cada bloque",
    claim: (k, R, off) => k + " de " + R + " bloques · " + (off ? (off === 1 ? "1 celda difiere" : off + " celdas difieren") : "el cubo, exacto"),
    caption: (formula, to) => formula + "  →  " + to,
    read: (f, name) => {
      if (f.k === 0) return "<b>Aún no se ha sumado nada</b>: faltan las 8 celdas con anillo, así que 8 celdas difieren de la regla. Suma el primer bloque.";
      const moved = f.off - f.was;
      const step = moved > 0 ? "<b>Más, no menos:</b> la cuenta subió, de " + f.was + " a <b>" + f.off + "</b>."
        : moved < 0 ? "La cuenta bajó de " + f.was + " a <b>" + f.off + "</b>."
        : "La cuenta se quedó en <b>" + f.off + "</b>.";
      const did = "El bloque " + f.k + " cubre " + f.rep.cells + (f.rep.cells === 1 ? " celda" : " celdas") + ": " +
        f.rep.wanted + " sobre un anillo" + (f.rep.damage ? " y " + f.rep.damage + " donde la regla tiene un 0." : ".");
      const end = f.off === 0
        ? " <b>Los " + f.R + " bloques " + name + " suman exactamente el cubo</b>: " + f.R + " multiplicaciones. " +
          (f.hollow ? f.touched + " celdas tuvieron algo por el camino, y " + f.hollow + " acabaron huecas."
                    : "Ninguna celda se canceló nunca.")
        : "";
      return step + " " + did + end;
    },
    tip: (a, b, c, v) => "(" + a + ", " + b + ", " + c + ") vale " + v,
    aria: (ctx) => {
      const f = facts(ctx);
      return "El cubo de la multiplicación como cuatro bandejas apiladas de dieciséis celdas, con un anillo " +
             "en cada una de las ocho celdas que la regla llena. Se han sumado " + f.k + " de " + f.R +
             " bloques, y " + f.off + " celdas difieren de la regla. Al lado, la lista de productos y una " +
             "barra con la cuenta tras cada uno.";
    },
    controls: {split: "Qué partición", k: "Bloques sumados", play: "▶ Sumarlos por turno"},
    options: {split: {strassen: "los siete de Strassen", school: "los ocho de la regla escolar"}},
    np: {
      rows: (R) => R + " bloques, cuatro pesos cada uno",
      differ: (off) => (off === 1 ? "1 celda difiere" : off + " celdas difieren"),
      exact: (R) => "True: " + R + " bloques son el cubo"
    }
  };

  window.AlphaTensorScenes.register({
    id: "strassen", section: "11", gl: true,
    hl: ["r"],
    copy: {en: EN, es: ES},

    pose: {fov: 30, home: {az: -0.5, el: 0.42}, margin: 1.02, inset: {right: 0.36},
           limits: {azMin: -1.15, azMax: 0.15, elMin: 0.18, elMax: 0.8, dollyMin: 0.5, dollyMax: 1.8}},

    controls: [
      {id: "split", type: "select", options: ["strassen", "school"]},
      {id: "k", type: "range", min: 0, max: 8, step: 1, fmt: (v, ctx) => v + " / " + count(ctx)},
      {id: "play", type: "play", target: "k", rate: 0.9}
    ],

    // One block in: the picture a reader has just been asked to predict. The
    // hero's still takes three, where a cell holding -1 is on show.
    init(ctx) {
      ctx.state.split = "strassen";
      ctx.state.k = ctx.embed ? 3 : 1;
    },
    // The schoolbook rule has eight blocks and Strassen's has seven, so the
    // slider's top moves with the split.
    sync(ctx) {
      const R = count(ctx), input = ctx.control("k");
      if (input) input.max = R;
      if (ctx.state.k > R) { ctx.state.k = R; if (input) input.value = String(R); }
    },

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) {
      return K.arrival(ctx, ENTRANCE) < 1 || !!(ctx.cache.ease && ctx.cache.ease.moving);
    },
    bounds() { return K.cubeBounds(N); },

    pick(ctx, key) {
      if (key.startsWith("r:")) { ctx.setControls({k: Number(key.slice(2))}); return; }
      if (!key.startsWith("x:")) return;
      const [a, b, c] = key.slice(2).split(",").map(Number);
      this.seek(ctx, AC.cell(4, a, b, c));
    },
    tip(ctx, key) {
      if (!key.startsWith("x:")) return "";
      const [a, b, c] = key.slice(2).split(",").map(Number);
      const v = facts(ctx).P.sum[AC.cell(4, a, b, c)];
      return ctx.copy.tip(AC.name("a", N, a), AC.name("b", N, b), AC.name("c", N, c), K.fmt(v, 0));
    },
    // The strip, or a cell of the cube: go to the first block that touches it.
    seek(ctx, idx) {
      const F = split(ctx);
      for (let r = 0; r < F.U.length; r++) {
        if (AC.rankOne(F.U[r], F.V[r], F.W[r])[idx]) { ctx.setControls({k: r + 1}); return; }
      }
    },

    build(ctx) {
      return K.cubeBuild(ctx, this.pose, {cells: 64, ghosts: 1, hollows: 24, rings: 8, trays: 4, lines: 8});
    },
    render(ctx, gl) { K.cubeRender(gl, shown(ctx)); },

    // The twin: the same model, through the same orbit, fitted to the board.
    // It is also what the hero embed shows.
    draw(ctx) {
      const m = shown(ctx), b = K.cubeBounds(N);
      K.cubeDraw(ctx.svg, m, ctx.basis(), ctx.projector(K.corners(b.min, b.max), ctx.box()));
    },

    // The inset: the products, and the count after each. Drawn on the twin's
    // own board, over either surface.
    hud(ctx, svg) {
      const c = ctx.copy, f = facts(ctx), b = ctx.board();
      const x0 = b.w * 0.66, w = b.w - x0 - 22, rows = f.R, rh = Math.min(23, (b.h - 250) / rows);
      let y = 62;
      K.text(svg, x0, y, c.head(f.k, f.R), {size: 13, weight: 700, sans: true});
      y += 12;
      for (let r = 0; r < rows; r++) {
        const done = r < f.k, now = r === f.k - 1;
        const g = K.el("g", {"data-pick": "r:" + (r + 1)});
        g.appendChild(K.el("rect", {x: x0 - 6, y: y + r * rh, width: w + 12, height: rh - 3, rx: 4,
                                     fill: now ? K.css("--at-pos") : K.css("--stage-chip"),
                                     "fill-opacity": now ? (ctx.hl === "r" ? 0.4 : 0.24) : 1,
                                     stroke: now ? K.css("--stage-ink") : "none", "stroke-width": 1.4}));
        K.text(g, x0, y + r * rh + rh / 2 + 2, f.text.products[r],
               {size: 11.5, colour: done ? "--stage-ink" : "--stage-mute", weight: now ? 700 : 500, baseline: "middle"});
        svg.appendChild(g);
      }
      y += rows * rh + 26;
      K.text(svg, x0, y, c.trail, {size: 11.5, colour: "--stage-mute", sans: true});
      const bars = K.bars(svg, f.full.trail, {
        x: x0, y: y + 26, w, h: Math.max(40, Math.min(70, b.h - y - 96)), max: 12, gap: 5,
        at: (i) => (i <= f.k ? (f.full.trail[i] > 8 ? "--at-bad" : "--at-good") : "--stage-mute"),
        lit: (i) => i === f.k, alpha: 0.6, pick: (i) => "r:" + i
      });
      f.full.trail.forEach((v, i) => {
        K.text(svg, bars.px(i), bars.zero - (v / 12) * bars.h - 6, String(v),
               {size: 11.5, anchor: "middle", colour: i <= f.k ? "--stage-ink" : "--stage-mute", weight: i === f.k ? 700 : 500});
      });
    },

    readout(ctx) {
      const c = ctx.copy, f = facts(ctx), s = ctx.state;
      const lit = [];
      if (f.last) f.last.forEach((v, i) => { if (v) lit.push(i); });
      return {
        html: c.read(f, c.splitName[s.split]),
        claim: c.claim(f.k, f.R, f.off),
        caption: f.k ? c.caption(f.text.products[f.k - 1], goes(f.F, f.k - 1)) : "",
        strip: {mode: "built", terms: f.blocks, count: f.k, lit},
        data: {
          split: s.split, k: String(f.k), blocks: String(f.R), off: String(f.off),
          touched: String(f.touched), hollow: String(f.hollow), trail: f.full.trail.join(","),
          shape: "4,4,4"
        }
      };
    },

    code(ctx) {
      const np = ctx.copy.np, f = facts(ctx);
      return K.code([
        ["U.shape", "(" + f.R + ", 4): " + np.rows(f.R)],
        'S = np.einsum("ra,rb,rc->abc", U[:' + f.k + "], V[:" + f.k + "], W[:" + f.k + "])",
        ["(S != T).sum()", np.differ(f.off)],
        'full = np.einsum("ra,rb,rc->abc", U, V, W)',
        ["np.array_equal(full, T)", np.exact(f.R)]
      ]);
    }
  });
})();
