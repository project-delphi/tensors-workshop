// Scene 4: a bigger matrix gives a bigger, emptier cube. For n x n matrices
// the cube is n^2 cells on a side and holds n^3 ones: 8 of 64 (12.5%), 27 of
// 729 (3.7%), 64 of 4,096 (1.6%), 125 of 15,625 (0.8%). "Multiplying takes n^3
// multiplications" is the statement that the cube has n^3 ones and each is
// paid for one at a time. Past 3 x 3 the cube is drawn as trays and block
// lines with no specks for the zeros. Beside it, on the inset, is a table of
// the four sizes (each row pickable) and a bar for the share that is nonzero.
// The 2 x 2 rule's eight cells are the corner of every bigger cube: pressing
// one on the strip lights the cell with the same (i, j, k) here.
// Drawn in three.js, with an SVG twin from the same model.
// See alphatensor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const AC = window.AlphaTensorCore, K = window.AlphaTensorKit;

  const SIZES = [2, 3, 4, 5], TAU = 0.16, ENTRANCE = 1500;
  const tensors = {};
  const tensorOf = (n) => tensors[n] || (tensors[n] = AC.tensor(n));
  const nOf = (ctx) => ctx.state.n;

  // Entry p of a 2 x 2 matrix is (i, j); in an n x n matrix the same (i, j)
  // is entry i * n + j.
  const up = (p, n) => Math.floor(p / 2) * n + (p % 2);

  // A flat mask over the n-cube: the cell with the same triple as the pressed
  // 2 x 2 cell, if it holds a 1.
  function marked(ctx) {
    const n = nOf(ctx), mark = ctx.state.mark;
    if (mark < 0) return null;
    const N = n * n, a = Math.floor(mark / 16), b = Math.floor(mark / 4) % 4, c = mark % 4;
    const idx = AC.cell(N, up(a, n), up(b, n), up(c, n));
    if (!tensorOf(n)[idx]) return null;
    const out = new Array(N * N * N).fill(0);
    out[idx] = 1;
    return out;
  }

  function shown(ctx) {
    const c = ctx.cache, t = ctx.now(), s = ctx.state, n = s.n;
    const key = n + "|" + s.mark + "|" + ctx.hl;
    if (c.memo && c.memo.key === key && t - c.memo.t < 4 && !(K.arrival(ctx, ENTRANCE) < 1)) return c.memo.m;
    const lit = marked(ctx);
    const m = K.cubeModel({n, values: tensorOf(n), lit}, {hl: ctx.hl, nameSize: ctx.embed ? 17 : 11});
    // The entrance: the ones arrive tray by tray, c11 first.
    const N = n * n, arr = K.arrival(ctx, ENTRANCE);
    if (arr < 1) {
      m.items.forEach((it) => {
        if (!it.v) return;
        const tray = it.idx % N;
        it.s *= K.smooth(Math.max(0, Math.min(1, arr * (N + 2) / 2.2 - tray * 0.5)));
      });
    }
    c.ease = c.ease || {};
    const store = c.ease[n] || (c.ease[n] = {});
    m.items = K.follow(store, m.items, t, TAU, ctx.instant);
    c.easeMoving = !!store.moving;
    c.memo = {key, t, m};
    return m;
  }

  const EN = {
    tab: "bigger",
    k: "Section 06 · bigger matrices",
    h: "A bigger matrix gives a bigger, emptier cube",
    predict: "For 3 × 3 matrices the cube is 9 × 9 × 9: 729 cells. How many of them hold a 1?",
    concept: "Every product in the schoolbook rule is one 1 in the cube. Multiplying two n × n matrices " +
             "takes n³ products, so the cube has n³ ones, while its side grows as n² and its cell count " +
             "as n⁶. The cube gets bigger and emptier together.",
    b: "Slide <b>n</b> from 2 to 5 and watch the cube grow while the ones stay few. The statement " +
       "\"matrix multiplication takes n³ multiplications\" is the statement that the cube holds n³ ones " +
       "and the schoolbook rule pays for them one at a time. Past 3 × 3 the cube is drawn as trays and " +
       "block lines only. Click a row of the table to jump to that size, or press a cell on the strip " +
       "below: the 2 × 2 rule is the corner of every bigger cube, so the same cell lights up here.",
    eqcap: "Tₙ is the cube for n × n matrices, n² cells on each side. Summing its entries counts the " +
           "1s, and there are n³ of them: one for each product the schoolbook rule makes.",
    th: {n: "n × n", side: "side", cells: "cells", ones: "ones", full: "full"},
    shareHead: "share of cells that hold a 1",
    side: (n, s) => n + " × " + n + " matrices · cube " + s + " × " + s + " × " + s,
    claim: (n, ones, cells, share) => n + " × " + n + " · " + ones + " ones in " + cells + " cells · " + share + "% full",
    read: (f) =>
      "<b>" + f.ones + "</b> ones: one per product, " + f.n + "³ = " + f.ones + ", in a cube of " + f.cells +
      " cells, so " + f.zeros + " cells hold a 0 and the cube is " + f.share + "% full. " +
      (f.n === 2 ? "This is the 2 × 2 cube: 8 of 64, the fullest this page will show."
        : "A 2 × 2 cube is " + f.share2 + "% full, so this one is " + f.ratio + " times emptier."),
    tip: (a, b, c, v) => "(" + a + ", " + b + ", " + c + ") holds " + v,
    aria: (ctx) => {
      const f = facts(ctx);
      return "The multiplication cube for " + f.n + " by " + f.n + " matrices, " + f.side + " cells on a side. " +
             f.ones + " of its " + f.cells + " cells hold a 1, " + f.share + " percent. Beside it, a table of the " +
             "four sizes and a bar for the share of cells that are nonzero.";
    },
    controls: {n: "Matrix size n", play: "▶ Walk through the sizes", mark: ""},
    np: {
      sum: (n, ones) => ones + " ones = " + n + "**3",
      mean: (share) => share + " of the cells"
    }
  };

  const ES = {
    tab: "mayor",
    k: "Sección 06 · matrices mayores",
    h: "Una matriz mayor da un cubo mayor y más vacío",
    predict: "Para matrices de 3 × 3 el cubo es de 9 × 9 × 9: 729 celdas. ¿Cuántas guardan un 1?",
    concept: "Cada producto de la regla escolar es un 1 en el cubo. Multiplicar dos matrices de n × n " +
             "necesita n³ productos, así que el cubo tiene n³ unos, mientras que su lado crece como n² y " +
             "su número de celdas como n⁶. El cubo se hace más grande y más vacío a la vez.",
    b: "Desliza <b>n</b> de 2 a 5 y mira cómo crece el cubo mientras los unos siguen siendo pocos. La " +
       "frase «multiplicar matrices necesita n³ multiplicaciones» es la frase «el cubo tiene n³ unos» y " +
       "la regla escolar paga cada uno por separado. Pasado 3 × 3 el cubo se dibuja solo con bandejas y " +
       "líneas de bloque. Haz clic en una fila de la tabla para ir a ese tamaño, o pulsa una celda de la " +
       "tira de abajo: la regla de 2 × 2 es la esquina de todos los cubos mayores, y aquí se ilumina la " +
       "misma celda.",
    eqcap: "Tₙ es el cubo de las matrices de n × n, con n² celdas por lado. Sumar sus entradas cuenta los " +
           "unos, y hay n³: uno por cada producto que hace la regla escolar.",
    th: {n: "n × n", side: "lado", cells: "celdas", ones: "unos", full: "llena"},
    shareHead: "parte de las celdas que guardan un 1",
    side: (n, s) => "matrices de " + n + " × " + n + " · cubo de " + s + " × " + s + " × " + s,
    claim: (n, ones, cells, share) => n + " × " + n + " · " + ones + " unos en " + cells + " celdas · " + share + " % llena",
    read: (f) =>
      "<b>" + f.ones + "</b> unos: uno por producto, " + f.n + "³ = " + f.ones + ", en un cubo de " + f.cells +
      " celdas, así que " + f.zeros + " celdas guardan un 0 y el cubo está lleno al " + f.share + " %. " +
      (f.n === 2 ? "Este es el cubo de 2 × 2: 8 de 64, el más lleno que verás en esta página."
        : "Un cubo de 2 × 2 está lleno al " + f.share2 + " %, así que este está " + f.ratio + " veces más vacío."),
    tip: (a, b, c, v) => "(" + a + ", " + b + ", " + c + ") vale " + v,
    aria: (ctx) => {
      const f = facts(ctx);
      return "El cubo de la multiplicación de matrices de " + f.n + " por " + f.n + ", con " + f.side +
             " celdas por lado. " + f.ones + " de sus " + f.cells + " celdas guardan un 1, el " + f.share +
             " por ciento. Al lado, una tabla con los cuatro tamaños y una barra con la parte de celdas distintas de cero.";
    },
    controls: {n: "Tamaño n de la matriz", play: "▶ Recorrer los tamaños", mark: ""},
    np: {
      sum: (n, ones) => ones + " unos = " + n + "**3",
      mean: (share) => share + " de las celdas"
    }
  };

  // Everything the readout and the inset quote, from the one control.
  function facts(ctx) {
    const n = nOf(ctx), z = AC.sizes(n), two = AC.sizes(2), lang = ctx.lang;
    return {
      n, side: z.side, cells: z.cells, ones: z.ones, zeros: z.cells - z.ones, raw: z.share,
      share: K.num(z.share * 100, 1, lang), share2: K.num(two.share * 100, 1, lang),
      ratio: K.num(two.share / z.share, 1, lang)
    };
  }

  window.AlphaTensorScenes.register({
    id: "bigger", section: "06", gl: true,
    hl: ["a", "b", "c"],
    copy: {en: EN, es: ES},

    pose: {fov: 30, home: {az: -0.5, el: 0.42}, margin: 1.02, inset: {right: 0.34},
           limits: {azMin: -1.15, azMax: 0.15, elMin: 0.18, elMax: 0.8, dollyMin: 0.5, dollyMax: 1.8}},

    controls: [
      {id: "n", type: "range", min: 2, max: 5, step: 1, fmt: (v) => v + " × " + v},
      {id: "play", type: "play", target: "n", rate: 0.5}
    ],

    init(ctx) {
      ctx.state.n = 3;
      ctx.state.mark = -1;
    },

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) {
      return K.arrival(ctx, ENTRANCE) < 1 || !!ctx.cache.easeMoving;
    },
    bounds(ctx) { return K.cubeBounds(nOf(ctx)); },

    pick(ctx, key) {
      if (key.startsWith("n:")) { ctx.setControls({n: Number(key.slice(2))}); return; }
      if (!key.startsWith("x:")) return;
      // A cell of the big cube: if it sits in the 2 x 2 corner, mark it.
      const n = nOf(ctx), [a, b, c] = key.slice(2).split(",").map(Number);
      const inCorner = (p) => Math.floor(p / n) < 2 && p % n < 2;
      const down = (p) => Math.floor(p / n) * 2 + (p % n);
      if (inCorner(a) && inCorner(b) && inCorner(c)) {
        const idx = AC.cell(4, down(a), down(b), down(c));
        if (AC.tensor(2)[idx]) ctx.setControls({mark: idx});
      }
    },
    tip(ctx, key) {
      if (!key.startsWith("x:")) return "";
      const n = nOf(ctx), N = n * n, [a, b, c] = key.slice(2).split(",").map(Number);
      return ctx.copy.tip(AC.name("a", n, a), AC.name("b", n, b), AC.name("c", n, c),
                          K.fmt(tensorOf(n)[AC.cell(N, a, b, c)], 0));
    },
    // The strip's eight cells are the corner of every cube.
    seek(ctx, idx) { ctx.setControls({mark: idx}); },

    build(ctx) {
      return K.cubeBuild(ctx, this.pose, {cells: 729, ghosts: 1, hollows: 0, rings: 0, trays: 25, lines: 200});
    },
    render(ctx, gl) { K.cubeRender(gl, shown(ctx)); },

    draw(ctx) {
      const m = shown(ctx), b = K.cubeBounds(nOf(ctx));
      K.cubeDraw(ctx.svg, m, ctx.basis(), ctx.projector(K.corners(b.min, b.max), ctx.box()));
    },

    // The inset: the four sizes as a table, and the share that is nonzero.
    hud(ctx, svg) {
      const c = ctx.copy, b = ctx.board(), cur = nOf(ctx), lang = ctx.lang;
      const x0 = b.w * 0.66, w = b.w - x0 - 18, rh = 27;
      const colX = [x0 + 2, x0 + w * 0.30, x0 + w * 0.58, x0 + w * 0.77, x0 + w];
      let y = 62;
      const head = [c.th.n, c.th.side, c.th.cells, c.th.ones, c.th.full];
      head.forEach((t, i) => K.text(svg, colX[i], y, t, {size: 11.5, colour: "--stage-mute", sans: true,
                                                         anchor: i === 0 ? "start" : "end"}));
      y += 10;
      const rows = SIZES.map((n) => AC.sizes(n));
      rows.forEach((z, r) => {
        const now = z.n === cur, ry = y + r * rh;
        const g = K.el("g", {"data-pick": "n:" + z.n});
        g.appendChild(K.el("rect", {x: x0 - 6, y: ry, width: w + 12, height: rh - 3, rx: 4,
                                     fill: now ? K.css("--at-pos") : K.css("--stage-chip"),
                                     "fill-opacity": now ? 0.24 : 1,
                                     stroke: now ? K.css("--stage-ink") : "none", "stroke-width": 1.4}));
        const cells = [z.n + " × " + z.n, String(z.side), K.num(z.cells, 0, lang), String(z.ones),
                       K.num(z.share * 100, 1, lang) + "%"];
        cells.forEach((t, i) => K.text(g, colX[i], ry + rh / 2 + 1, t, {
          size: 12, colour: now ? "--stage-ink" : "--stage-mute", weight: now ? 700 : 500,
          anchor: i === 0 ? "start" : "end", baseline: "middle"}));
        svg.appendChild(g);
      });
      y += rows.length * rh + 24;
      K.text(svg, x0, y, c.shareHead, {size: 11.5, colour: "--stage-mute", sans: true});
      const shares = rows.map((z) => z.share), top = shares[0];
      const bh = Math.max(46, Math.min(90, b.h - y - 70));
      const bars = K.bars(svg, shares, {
        x: x0, y: y + 26, w, h: bh, max: top, gap: 10,
        at: (i) => (SIZES[i] === cur ? "--at-pos" : "--stage-mute"),
        lit: (i) => SIZES[i] === cur, alpha: 0.7, pick: (i) => "n:" + SIZES[i]
      });
      shares.forEach((v, i) => {
        K.text(svg, bars.px(i), bars.zero - (v / top) * bars.h - 6, K.num(v * 100, 1, lang),
               {size: 11.5, anchor: "middle", colour: SIZES[i] === cur ? "--stage-ink" : "--stage-mute",
                weight: SIZES[i] === cur ? 700 : 500});
        K.text(svg, bars.px(i), bars.zero + 16, SIZES[i] + " × " + SIZES[i],
               {size: 11.5, anchor: "middle", colour: SIZES[i] === cur ? "--stage-ink" : "--stage-mute",
                weight: SIZES[i] === cur ? 700 : 500});
      });
    },

    readout(ctx) {
      const c = ctx.copy, f = facts(ctx), s = ctx.state, lang = ctx.lang;
      const fl = Object.assign({}, f, {cells: K.num(f.cells, 0, lang), ones: K.num(f.ones, 0, lang),
                                       zeros: K.num(f.zeros, 0, lang)});
      return {
        html: c.read(fl),
        claim: c.claim(f.n, fl.ones, fl.cells, f.share),
        caption: "",
        strip: {mode: "built", terms: AC.blocksOf(AC.schoolbook(2)), count: f.n * f.n * f.n,
                lit: s.mark >= 0 ? [s.mark] : []},
        data: {
          share: (f.raw * 100).toFixed(1), n: String(f.n), side: String(f.side), cells: String(f.cells),
          ones: String(f.ones), zeros: String(f.zeros), mark: String(s.mark),
          shape: [f.side, f.side, f.side].join(",")
        }
      };
    },

    code(ctx) {
      const np = ctx.copy.np, f = facts(ctx), z = AC.sizes(f.n);
      return K.code([
        "T = matmul_tensor(" + f.n + ")",
        ["T.shape", "(" + [f.side, f.side, f.side].join(", ") + ")"],
        ["T.sum()", np.sum(f.n, f.ones)],
        ["T.mean()", z.share.toFixed(3) + ": " + f.share.replace(",", ".") + "% " + (ctx.lang === "es" ? "de las celdas" : "of the cells")]
      ]);
    }
  });
})();
