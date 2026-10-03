// Scene 2: put a 1 at each of the rule's eight triples and the rule is a
// 4 x 4 x 4 cube of cells -- sixty-four of them, eight 1s and fifty-six
// zeros -- drawn as four trays, one per entry of C. Picking a product circles
// its cell; picking a tray (or an empty cell) lifts that tray clear of the
// stack. Beside the cube, on the stage's inset, is the tray being read, flat,
// as a 4 x 4 grid of 0s and 1s with a row for each entry of A and a column for
// each entry of B, and under it that tray read out against the page's worked
// example: the 1s are the products, and they add up to the entry of C.
// The entrance grows the eight 1s one after another. Drawn in three.js, with
// an SVG twin from the same model.
// See alphatensor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const AC = window.AlphaTensorCore, K = window.AlphaTensorKit;

  const N = 2, SIDE = N * N, T = AC.tensor(N), TERMS = AC.terms(N);
  const A = AC.A0, B = AC.B0, C = AC.matmul(N, A, B);
  const SCHOOL = AC.blocksOf(AC.schoolbook(N));
  const TAU = 0.16, ENTRANCE = 2200;
  const nm = (letter, i) => AC.name(letter, N, i);
  const ONES = AC.nnz(T), CELLS = T.length;

  const product = (ctx) => TERMS[ctx.state.p - 1];
  const picked = (ctx) => (ctx.state.tray === "all" ? null : Number(ctx.state.tray));
  // The tray being read: the picked one, or else the tray product p lands in.
  const shownTray = (ctx) => (picked(ctx) === null ? product(ctx).c : picked(ctx));

  // The tray's own 1s and what they add up to, from the worked example.
  function reading(c) {
    const ts = TERMS.filter((t) => t.c === c);
    return {
      ts, value: AC.readOff(T, A, B).C[c],
      names: ts.map((t) => nm("a", t.a) + "·" + nm("b", t.b)).join(" + "),
      nums: ts.map((t) => A[t.a] + "·" + B[t.b]).join(" + ")
    };
  }

  // The model both surfaces draw: the cube for this state, eased by piece.
  function shown(ctx) {
    const c = ctx.cache, t = ctx.now(), s = ctx.state;
    const key = s.tray + "|" + s.p + "|" + ctx.hl;
    c.ease = c.ease || {};
    const lift = K.trayLift(c, N, picked(ctx), t, ctx.instant);
    if (c.memo && c.memo.key === key && t - c.memo.t < 4 && !c.liftMoving) return c.memo.m;
    const p = product(ctx);
    const m = K.cubeModel({n: N, values: T, slice: picked(ctx), cell: {a: p.a, b: p.b, c: p.c}},
                          {lift, hl: ctx.hl, zeros: "cells", nameSize: ctx.embed ? 17 : 11});
    // The entrance: the eight 1s grow one after another, each from nothing.
    const e = K.arrival(ctx, ENTRANCE);
    if (e < 1) {
      m.items.forEach((it) => {
        if (!it.v) return;
        const ord = TERMS.findIndex((q) => AC.cell(SIDE, q.a, q.b, q.c) === it.idx);
        const g = Math.max(0, Math.min(1, (e - ord * 0.09) / 0.28));
        it.s *= K.smooth(g);
      });
    }
    m.items = K.follow(c.ease, m.items, t, TAU, ctx.instant);
    c.memo = {key, t, m};
    return m;
  }

  const EN = {
    tab: "cube",
    k: "Section 06 · the cube",
    h: "Put a 1 at each product and the rule is a cube of 64 cells",
    predict: "The cube has 64 cells, one for every choice of an entry of A, an entry of B and an entry of C. " +
             "Before you count: how many of the 64 hold a 1?",
    concept: "Put a 1 at each of the rule's triples and the rule becomes a 4 × 4 × 4 cube. Its cell " +
             "(i, j, k) holds a 1 when the product of entry i of A and entry j of B is added into entry k " +
             "of C, and a 0 when it is not. Nothing about the numbers is left in it, only the pattern.",
    b: "The cube is drawn as <b>four trays</b>, one per entry of C, with the entries of A running down the " +
       "rows and the entries of B across the columns. Each violet cell is one product of the rule. " +
       "<b>Pick a tray</b>, a product, or any cell: the tray lifts clear, and on the right it is laid " +
       "flat and read against the page's example. The strip under the stage is the same cube again.",
    eqcap: "T is the cube: 4 × 4 × 4 cells, each a zero or a one, with one axis for the entries of A, one " +
           "for B and one for C. Below it, what a 1 at (i, j, k) says: multiply a_i by b_j and add it into " +
           "c_k. Here i counts the four entries of A (a₁₁, a₁₂, a₂₁, a₂₂, in that order), j those of B " +
           "and k those of C.",
    claim: (p, a, b, c, tray) => "8 ones in 64 cells · " + a + " · " + b + " → " + c +
                                 (tray === "all" ? "" : " · tray " + tray),
    read: (f) =>
      "<b>Eight</b>: one for each product of the rule, and the other " + f.zeros + " of the " + f.cells +
      " cells are zeros. Product " + f.p + " is " + f.a + " · " + f.b + " → " + f.c + ", the cell <code>T[" +
      f.ix + "]</code>. " + (f.own ? "Its tray, " : "The tray lifted, ") + f.tray + ", reads " + f.names +
      " = " + f.nums + " = <b>" + f.value + "</b>.",
    tip: (a, b, c, v) => a + " · " + b + " → " + c + " holds " + v,
    aria: (ctx) => {
      const t = product(ctx);
      return "The multiplication cube as four stacked trays of sixteen cells, with the eight cells the rule " +
             "fills drawn solid violet and a point in each of the other fifty-six. Product " + ctx.state.p +
             " is " + nm("a", t.a) + " times " + nm("b", t.b) + " into " + nm("c", t.c) +
             ". Beside it, the tray being read as a four by four grid of zeros and ones.";
    },
    controls: {tray: "Which tray", p: "Which 1", play: "▶ Go through the eight"},
    options: {tray: {all: "all four trays", 0: "tray c₁₁", 1: "tray c₁₂", 2: "tray c₂₁", 3: "tray c₂₂"}},
    head: (c) => "tray " + c + ", flat",
    rows: "rows: entries of A",
    cols: "columns: entries of B",
    np: {
      build: "the cube, 64 cells",
      ones: "one 1 per product",
      cell: (a, b, c) => "product " + a + " · " + b + " → " + c,
      tray: (c) => "tray " + c + ": a 4 × 4 slice",
      reads: (v) => "what the tray reads to: " + v
    }
  };

  const ES = {
    tab: "cubo",
    k: "Sección 06 · el cubo",
    h: "Pon un 1 en cada producto y la regla es un cubo de 64 celdas",
    predict: "El cubo tiene 64 celdas, una por cada elección de una entrada de A, una de B y una de C. " +
             "Antes de contar: ¿cuántas de las 64 guardan un 1?",
    concept: "Pon un 1 en cada terna de la regla y la regla se vuelve un cubo de 4 × 4 × 4. Su celda " +
             "(i, j, k) guarda un 1 cuando el producto de la entrada i de A por la entrada j de B se suma " +
             "a la entrada k de C, y un 0 cuando no. De los números no queda nada, solo el patrón.",
    b: "El cubo se dibuja como <b>cuatro bandejas</b>, una por entrada de C, con las entradas de A en las " +
       "filas y las de B en las columnas. Cada celda violeta es un producto de la regla. " +
       "<b>Elige una bandeja</b>, un producto o cualquier celda: la bandeja se levanta, y a la derecha " +
       "aparece plana y leída con el ejemplo de la página. La cinta bajo el escenario es el mismo cubo.",
    eqcap: "T es el cubo: 4 × 4 × 4 celdas, cada una un cero o un uno, con un eje para las entradas de A, " +
           "uno para las de B y otro para las de C. Debajo, lo que dice un 1 en (i, j, k): multiplica a_i " +
           "por b_j y súmalo a c_k. Aquí i cuenta las cuatro entradas de A (a₁₁, a₁₂, a₂₁, a₂₂, en ese " +
           "orden), j las de B y k las de C.",
    claim: (p, a, b, c, tray) => "8 unos en 64 celdas · " + a + " · " + b + " → " + c +
                                 (tray === "all" ? "" : " · bandeja " + tray),
    read: (f) =>
      "<b>Ocho</b>: uno por cada producto de la regla, y las otras " + f.zeros + " de las " + f.cells +
      " celdas son ceros. El producto " + f.p + " es " + f.a + " · " + f.b + " → " + f.c + ", la celda <code>T[" +
      f.ix + "]</code>. " + (f.own ? "Su bandeja, " : "La bandeja levantada, ") + f.tray + ", se lee " +
      f.names + " = " + f.nums + " = <b>" + f.value + "</b>.",
    tip: (a, b, c, v) => a + " · " + b + " → " + c + " vale " + v,
    aria: (ctx) => {
      const t = product(ctx);
      return "El cubo de la multiplicación como cuatro bandejas apiladas de dieciséis celdas, con las ocho " +
             "celdas que la regla llena dibujadas en violeta y un punto en cada una de las otras cincuenta y seis. " +
             "El producto " + ctx.state.p + " es " + nm("a", t.a) + " por " + nm("b", t.b) + " hacia " +
             nm("c", t.c) + ". Al lado, la bandeja leída como una cuadrícula de cuatro por cuatro de ceros y unos.";
    },
    controls: {tray: "Qué bandeja", p: "Qué 1", play: "▶ Recorrer los ocho"},
    options: {tray: {all: "las cuatro bandejas", 0: "bandeja c₁₁", 1: "bandeja c₁₂", 2: "bandeja c₂₁", 3: "bandeja c₂₂"}},
    head: (c) => "bandeja " + c + ", plana",
    rows: "filas: entradas de A",
    cols: "columnas: entradas de B",
    np: {
      build: "el cubo, 64 celdas",
      ones: "un 1 por producto",
      cell: (a, b, c) => "producto " + a + " · " + b + " → " + c,
      tray: (c) => "bandeja " + c + ": un corte de 4 × 4",
      reads: (v) => "lo que lee la bandeja: " + v
    }
  };

  window.AlphaTensorScenes.register({
    id: "cube", section: "06", gl: true,
    hl: ["a", "b", "c"],
    copy: {en: EN, es: ES},

    pose: {fov: 30, home: {az: -0.5, el: 0.42}, margin: 1.02, inset: {right: 0.36},
           limits: {azMin: -1.15, azMax: 0.15, elMin: 0.18, elMax: 0.8, dollyMin: 0.5, dollyMax: 1.8}},

    controls: [
      {id: "tray", type: "select", options: ["all", "0", "1", "2", "3"]},
      {id: "p", type: "range", min: 1, max: 8, step: 1,
       fmt: (v) => { const t = TERMS[v - 1]; return v + " · " + nm("a", t.a) + "·" + nm("b", t.b); }},
      {id: "play", type: "play", target: "p", rate: 1.1}
    ],

    init(ctx) { ctx.state.tray = "all"; ctx.state.p = 2; },

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) {
      return K.arrival(ctx, ENTRANCE) < 1 || !!(ctx.cache.ease && ctx.cache.ease.moving) || !!ctx.cache.liftMoving;
    },
    bounds() { return K.cubeBounds(N, true); },

    // A 1 is a product; an empty cell is only a place in a tray.
    pick(ctx, key) {
      if (key.startsWith("t:")) { ctx.setControls({tray: key.slice(2)}); return; }
      if (!key.startsWith("x:")) return;
      const [a, b, c] = key.slice(2).split(",").map(Number);
      this.seek(ctx, AC.cell(SIDE, a, b, c));
    },
    tip(ctx, key) {
      if (!key.startsWith("x:")) return "";
      const [a, b, c] = key.slice(2).split(",").map(Number);
      return ctx.copy.tip(nm("a", a), nm("b", b), nm("c", c), String(T[AC.cell(SIDE, a, b, c)]));
    },
    seek(ctx, idx) {
      const q = AC.uncell(SIDE, idx);
      const at = TERMS.findIndex((t) => t.a === q.a && t.b === q.b && t.c === q.c);
      if (at >= 0) ctx.setControls({p: at + 1});
      else ctx.setControls({tray: String(q.c)});
    },

    build(ctx) {
      return K.cubeBuild(ctx, this.pose, {cells: 64, ghosts: 1, hollows: 1, rings: 1, trays: 4, lines: 8});
    },
    render(ctx, gl) { K.cubeRender(gl, shown(ctx)); },

    draw(ctx) {
      const m = shown(ctx), b = K.cubeBounds(N, true);
      K.cubeDraw(ctx.svg, m, ctx.basis(), ctx.projector(K.corners(b.min, b.max), ctx.box()));
    },

    // The inset: the tray being read, flat, and what it reads to.
    hud(ctx, svg) {
      const c = ctx.copy, bd = ctx.board(), p = product(ctx), tc = shownTray(ctx), r = reading(tc);
      const x0 = bd.w * 0.66, w = bd.w - x0 - 18;
      const lab = 36, cw = Math.min(34, (w - lab) / SIDE), ch = cw, gx = x0 + lab, gy = 128;
      K.text(svg, x0, 64, c.head(nm("c", tc)), {size: 14, weight: 700, sans: true, colour: "--at-c"});
      K.text(svg, x0, 82, c.rows, {size: 11, colour: "--at-a", sans: true});
      K.text(svg, x0, 96, c.cols, {size: 11, colour: "--at-b", sans: true});
      for (let j = 0; j < SIDE; j++) {
        K.text(svg, gx + j * cw + cw / 2, gy - 4, nm("b", j), {size: 11, anchor: "middle", colour: "--at-b", weight: 700});
      }
      for (let i = 0; i < SIDE; i++) {
        K.text(svg, gx - 5, gy + i * ch + ch / 2, nm("a", i), {size: 11, anchor: "end", baseline: "middle", colour: "--at-a", weight: 700});
        for (let j = 0; j < SIDE; j++) {
          const v = T[AC.cell(SIDE, i, j, tc)], on = v && p.c === tc && p.a === i && p.b === j;
          const g = K.el("g", {"data-pick": "x:" + i + "," + j + "," + tc});
          g.appendChild(K.el("rect", {x: gx + j * cw + 1.5, y: gy + i * ch + 1.5, width: cw - 3, height: ch - 3, rx: 4,
                                       fill: v ? K.css("--at-pos") : K.css("--stage-chip"), "fill-opacity": v ? (on ? 0.55 : 0.28) : 1,
                                       stroke: K.css(on ? "--stage-ink" : v ? "--at-pos" : "--stage-mute"),
                                       "stroke-width": on ? 2.2 : 1, "stroke-opacity": v ? 1 : 0.35}));
          K.text(g, gx + j * cw + cw / 2, gy + i * ch + ch / 2 + 1, String(v),
                 {size: 14, anchor: "middle", baseline: "middle", weight: v ? 700 : 500, colour: v ? "--stage-ink" : "--stage-mute"});
          svg.appendChild(g);
        }
      }
      const y = gy + SIDE * ch + 30;
      K.text(svg, x0, y, nm("c", tc) + " =", {size: 13, weight: 700, colour: "--at-c"});
      r.ts.forEach((t, k) => {
        K.text(svg, x0, y + 20 + k * 18, (k ? "+ " : "  ") + nm("a", t.a) + "·" + nm("b", t.b), {size: 12.5});
      });
      const y2 = y + 20 + r.ts.length * 18 + 4;
      K.text(svg, x0, y2, "= " + r.nums, {size: 12.5, colour: "--stage-mute"});
      K.text(svg, x0, y2 + 22, "= " + r.value, {size: 17, weight: 700});
    },

    readout(ctx) {
      const c = ctx.copy, s = ctx.state, t = product(ctx), tc = shownTray(ctx), r = reading(tc);
      const pk = picked(ctx);
      const ix = t.a + ", " + t.b + ", " + t.c;
      // The tray read out is the one shown: the product's own until a reader
      // lifts another, and the sentence says which. How many 1s it holds is
      // the next scene's question, so the readout does not count them.
      const f = {
        zeros: CELLS - ONES, cells: CELLS, p: s.p, a: nm("a", t.a), b: nm("b", t.b), c: nm("c", t.c), ix,
        own: tc === t.c, tray: nm("c", tc), names: nm("c", tc) + " = " + r.names, nums: r.nums, value: r.value
      };
      return {
        html: c.read(f),
        claim: c.claim(s.p, f.a, f.b, f.c, pk === null ? "all" : nm("c", pk)),
        strip: {mode: "built", terms: SCHOOL, count: ONES, lit: [AC.cell(SIDE, t.a, t.b, t.c)],
                tray: pk === null ? undefined : pk},
        data: {
          ones: String(ONES), cells: String(CELLS), zeros: String(CELLS - ONES), tray: s.tray, p: String(s.p),
          cell: [t.a, t.b, t.c].join(","), trayvalue: String(r.value), shape: "4,4,4"
        }
      };
    },

    code(ctx) {
      const np = ctx.copy.np, t = product(ctx), tc = shownTray(ctx), r = reading(tc);
      return K.code([
        "n = 2; T = np.zeros((n*n,) * 3, dtype=int)",
        "for i, j, k in itertools.product(range(n), repeat=3):",
        "    T[i*n + k, k*n + j, i*n + j] = 1",
        ["T.sum()", String(ONES) + ": " + np.ones],
        ["T[" + t.a + ", " + t.b + ", " + t.c + "]", "1, " + np.cell(nm("a", t.a), nm("b", t.b), nm("c", t.c))],
        ["T[:, :, " + tc + "]", np.tray(nm("c", tc))],
        ["np.einsum(\"abc,a,b->c\", T, a, b)[" + tc + "]", String(r.value)]
      ]);
    }
  });
})();
