// Scene 3: the cube does the multiplying. One tray of the tensor is a 4 x 4
// matrix of zeros and ones, and the formula for one entry of C is a sandwich,
// aᵀ M b: sixteen terms a_i * b_j, each multiplied by the tray's 0 or 1. The
// picture is that sandwich -- the four entries of A down the left of a 4 x 4
// grid, the four of B across its top, and in each cell its term, worked where
// the tray holds a 1 and struck out where it holds a 0 -- with the entry of C
// it makes written out on the right. Fourteen of sixteen vanish, which is the
// whole reason a multiplication count is a count of ones. The entrance writes
// the sixteen terms and then strikes the fourteen dead ones, leaving two.
// Flat: SVG only. See alphatensor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const AC = window.AlphaTensorCore, K = window.AlphaTensorKit;

  const N = 4, T = AC.tensor(2);
  const SCHOOL = AC.blocksOf(AC.schoolbook(2));
  const ENTRANCE = 3200;                       // sixteen terms, then the strike-out, then a breath

  // The matrices a reader can feed it: the page's example and two fixed draws.
  const MATS = (function () {
    const out = {example: {A: AC.A0, B: AC.B0}};
    [["second", 7], ["third", 41]].forEach(([id, seed]) => {
      const rand = AC.mulberry32(seed);
      out[id] = {A: AC.randomMatrix(rand, 4, -9, 9), B: AC.randomMatrix(rand, 4, -9, 9)};
    });
    return out;
  })();

  // Layout on the 820 x 500 board.
  const GX = 128, GY = 118, CW = 78, CH = 84;       // the grid of terms
  const RX = 478;                                   // the right-hand panel

  const nm = (letter, i) => AC.name(letter, 2, i);
  const sg = (v) => (v < 0 ? "−" + (-v) : String(v));
  const mat = (ctx) => MATS[ctx.state.mats] || MATS.example;
  const tray = (ctx) => ctx.state.tray - 1;

  // What the tray holds at (i, j): 0 or 1.
  const held = (k, i, j) => T[AC.cell(N, i, j, k)];
  // The surviving cells of a tray, as [i, j], reading order.
  function alive(k) {
    const out = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (held(k, i, j)) out.push([i, j]);
    return out;
  }
  // The numbers for one tray, all from the core.
  function facts(ctx) {
    const k = tray(ctx), {A, B} = mat(ctx), r = AC.readOff(T, A, B);
    const cells = alive(k);
    return {k, A, B, C: r.C, mults: r.mults, cells, alive: cells.length, dead: N * N - cells.length,
            value: r.C[k]};
  }
  // "1·5 + 2·7 = 19" for the picked tray.
  function written(f) {
    return nm("c", f.k) + " = " + f.cells.map(([i, j]) => sg(f.A[i]) + "·" + sg(f.B[j])).join(" + ") +
           " = " + sg(f.value);
  }

  // The entrance: terms written one a tick in the first half, the dead ones
  // struck in the next third. Returns how many are written and how many struck.
  function stage(ctx) {
    const t = K.arrival(ctx, ENTRANCE);
    if (t >= 1) return {shown: 16, struck: 16, on: false};
    const shown = Math.min(16, Math.floor(t / 0.45 * 16) + 1);
    const struck = t < 0.5 ? 0 : Math.min(16, Math.floor((t - 0.5) / 0.35 * 16) + 1);
    return {shown, struck, on: true};
  }

  const EN = {
    tab: "read",
    k: "Section 06 · reading the product",
    h: "The cube does the multiplying: one tray for each entry of C",
    predict: "Tray c₁₁ has sixteen cells, so the formula for c₁₁ has sixteen terms. How many of the " +
             "sixteen are not multiplied by zero?",
    concept: "The cube does the multiplying. For the tray of one entry of C, take every entry of A " +
             "against every entry of B, multiply the pair by the tray's 0 or 1, and add. A 0 deletes " +
             "its term, so the multiplications you pay for are the 1s.",
    b: "The tray is a 4 × 4 grid of zeros and ones, with the entries of A down its side and the " +
       "entries of B along its top. <b>Pick an entry of C</b>, or press ▶, and the grid becomes that " +
       "tray's: bright cells are the 1s and are worked out, struck cells hold a 0. Switch the " +
       "matrices and the numbers change; which cells are struck never does.",
    eqcap: "Entry k of C sums every entry of A times every entry of B, each pair multiplied by " +
           "T[i, j, k]: the tensor's 0 or 1 for that pair and that entry of C.",
    claim: (c, alive, v) => "16 terms · " + alive + " survive · " + c + " = " + v,
    read: (f) =>
      "<b>Two.</b> Tray " + nm("c", f.k) + " keeps " + f.alive + " of its " + N * N + " terms: " +
      f.cells.map(([i, j]) => nm("a", i) + "·" + nm("b", j) + " = " + sg(f.A[i]) + "·" + sg(f.B[j]) +
                              " = " + sg(f.A[i] * f.B[j])).join(" and ") +
      ", which make <b>" + nm("c", f.k) + " = " + sg(f.value) + "</b>. The other " + f.dead +
      " are multiplied by 0. One multiplication per 1: " + f.mults + " in all.",
    aria: (ctx) => {
      const f = facts(ctx);
      return "A four by four grid of the sixteen terms of " + nm("c", f.k) + ", entries of A down the " +
             "side and entries of B along the top. " + f.dead + " of the terms are multiplied by zero " +
             "and struck out; " + f.alive + " survive, and they make " + written(f) + ".";
    },
    controls: {tray: "Entry of C", mats: "Matrices", play: "▶ Go through the four trays"},
    options: {mats: {example: "the example", second: "second pair", third: "third pair"}},
    terms: "terms", zero: "times zero", survive: "survive",
    tally: (m) => m + " multiplications for all four trays",
    np: {
      all: "all four entries at once",
      slice: "one tray of the cube, a 4 × 4 matrix",
      one: "the same entry as a sandwich",
      ones: "the 1s in the tray"
    }
  };

  const ES = {
    tab: "lectura",
    k: "Sección 06 · leer el producto",
    h: "El cubo hace la multiplicación: una bandeja por cada entrada de C",
    predict: "La bandeja c₁₁ tiene dieciséis celdas, así que la fórmula de c₁₁ tiene dieciséis términos. " +
             "¿Cuántos de los dieciséis no se multiplican por cero?",
    concept: "El cubo hace la multiplicación. Para la bandeja de una entrada de C, empareja cada " +
             "entrada de A con cada entrada de B, multiplica el par por el 0 o el 1 de la bandeja y " +
             "suma. Un 0 borra su término, así que las multiplicaciones que pagas son los 1.",
    b: "La bandeja es una cuadrícula de 4 × 4 de ceros y unos, con las entradas de A a un lado y las " +
       "de B arriba. <b>Elige una entrada de C</b>, o pulsa ▶, y la cuadrícula pasa a ser la de esa " +
       "bandeja: las celdas brillantes son los 1 y se calculan, las tachadas guardan un 0. Cambia las " +
       "matrices y los números cambian; las celdas tachadas, nunca.",
    eqcap: "La entrada k de C suma cada entrada de A por cada entrada de B, y cada par se multiplica " +
           "por T[i, j, k]: el 0 o el 1 del tensor para ese par y esa entrada de C.",
    claim: (c, alive, v) => "16 términos · sobreviven " + alive + " · " + c + " = " + v,
    read: (f) =>
      "<b>Dos.</b> La bandeja " + nm("c", f.k) + " conserva " + f.alive + " de sus " + N * N +
      " términos: " +
      f.cells.map(([i, j]) => nm("a", i) + "·" + nm("b", j) + " = " + sg(f.A[i]) + "·" + sg(f.B[j]) +
                              " = " + sg(f.A[i] * f.B[j])).join(" y ") +
      ", que dan <b>" + nm("c", f.k) + " = " + sg(f.value) + "</b>. Los otros " + f.dead +
      " se multiplican por 0. Una multiplicación por cada 1: " + f.mults + " en total.",
    aria: (ctx) => {
      const f = facts(ctx);
      return "Una cuadrícula de cuatro por cuatro con los dieciséis términos de " + nm("c", f.k) +
             ", las entradas de A a un lado y las de B arriba. " + f.dead + " términos se multiplican " +
             "por cero y están tachados; sobreviven " + f.alive + ", y dan " + written(f) + ".";
    },
    controls: {tray: "Entrada de C", mats: "Matrices", play: "▶ Recorrer las cuatro bandejas"},
    options: {mats: {example: "el ejemplo", second: "segundo par", third: "tercer par"}},
    terms: "términos", zero: "por cero", survive: "sobreviven",
    tally: (m) => m + " multiplicaciones para las cuatro bandejas",
    np: {
      all: "las cuatro entradas a la vez",
      slice: "una bandeja del cubo, matriz de 4 × 4",
      one: "la misma entrada como un sándwich",
      ones: "los 1 de la bandeja"
    }
  };

  // An entry of A or B: its name over its value.
  function entry(ctx, letter, i, x, y, w, h, hl, wide) {
    const svg = ctx.svg, tok = letter === "a" ? "--at-a" : "--at-b", vals = letter === "a" ? facts(ctx).A : facts(ctx).B;
    const g = K.el("g", {"data-pick": letter + ":" + i});
    g.appendChild(K.el("rect", {x: x + 3, y: y + 3, width: w - 6, height: h - 6, rx: 7,
                                 fill: hl ? K.css(tok) : "transparent", "fill-opacity": hl ? 0.18 : 1,
                                 stroke: K.css(tok), "stroke-width": hl ? 2.2 : 1, "stroke-opacity": hl ? 1 : 0.5}));
    K.text(g, x + w / 2, y + (wide ? 25 : 31), nm(letter, i), {size: 13, anchor: "middle", colour: tok, weight: 700});
    K.text(g, x + w / 2, y + (wide ? 49 : 60), sg(vals[i]), {size: 20, anchor: "middle", weight: 700});
    svg.appendChild(g);
  }

  window.AlphaTensorScenes.register({
    id: "read", section: "06",
    hl: ["a", "b", "c"],
    copy: {en: EN, es: ES},

    controls: [
      {id: "tray", type: "range", min: 1, max: 4, step: 1, fmt: (v) => nm("c", v - 1)},
      {id: "mats", type: "select", options: ["example", "second", "third"]},
      {id: "play", type: "play", target: "tray", rate: 0.8}
    ],

    init(ctx) { ctx.state.tray = 1; ctx.state.mats = "example"; },

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) { return K.arrival(ctx, ENTRANCE) < 1; },

    pick(ctx, key) {
      const [kind, i] = key.split(":"), n = Number(i);
      if (kind === "c") { ctx.setControls({tray: n + 1}); return; }
      // An entry of A or B: the first tray that uses it.
      for (let k = 0; k < 4; k++) {
        for (let o = 0; o < N; o++) {
          if (kind === "a" ? held(k, n, o) : held(k, o, n)) { ctx.setControls({tray: k + 1}); return; }
        }
      }
    },
    // The strip: a press on a cell picks the tray it sits in.
    seek(ctx, idx) { ctx.setControls({tray: AC.uncell(N, idx).c + 1}); },

    draw(ctx) {
      const svg = ctx.svg, c = ctx.copy, f = facts(ctx), st = stage(ctx);
      const hlA = ctx.hl === "a", hlB = ctx.hl === "b", hlC = ctx.hl === "c";

      // B across the top, A down the left.
      for (let j = 0; j < N; j++) entry(ctx, "b", j, GX + j * CW, 48, CW, 66, hlB, true);
      for (let i = 0; i < N; i++) entry(ctx, "a", i, 36, GY + i * CH, 88, CH, hlA, false);
      K.text(svg, 80, 82, "aᵀ M b", {size: 15, anchor: "middle", colour: "--stage-mute", weight: 700});

      // The sixteen terms.
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const n = i * N + j;
        if (n >= st.shown) continue;
        const x = GX + j * CW, y = GY + i * CH, one = held(f.k, i, j);
        const dead = !one && (!st.on || n < st.struck);
        const g = K.el("g", {});
        g.appendChild(K.el("rect", {x: x + 3, y: y + 3, width: CW - 6, height: CH - 6, rx: 7,
                                     fill: one ? K.css("--at-pos") : "transparent", "fill-opacity": one ? 0.2 : 1,
                                     stroke: K.css(one ? "--at-pos" : "--stage-mute"),
                                     "stroke-width": one ? 2.2 : 1, "stroke-opacity": one ? 1 : 0.4,
                                     "stroke-dasharray": dead ? "4 3" : "none"}));
        const colour = dead ? "--stage-mute" : "--stage-ink";
        K.text(g, x + CW / 2, y + 22, nm("a", i) + "·" + nm("b", j), {size: 11, anchor: "middle", colour: "--stage-mute"});
        if (dead) {
          K.text(g, x + CW / 2, y + 56, "× 0", {size: 18, anchor: "middle", colour, weight: 700});
          g.appendChild(K.el("line", {x1: x + 9, y1: y + CH - 9, x2: x + CW - 9, y2: y + 9,
                                       stroke: K.css("--stage-mute"), "stroke-width": 1.4, "stroke-opacity": 0.7}));
        } else {
          K.text(g, x + CW / 2, y + 45, sg(f.A[i]) + "·" + sg(f.B[j]), {size: 14, anchor: "middle", colour});
          K.text(g, x + CW / 2, y + 68, "= " + sg(f.A[i] * f.B[j]), {size: 16, anchor: "middle", colour, weight: 700});
        }
        svg.appendChild(g);
      }

      // The entry it makes, written out.
      K.text(svg, RX, 78, written(f), {size: f.cells.length ? 16 : 14, colour: "--at-c", weight: 700});

      // C as a 2 x 2 matrix with the picked entry lit.
      const MX = RX + 20, MY = 106, MW = 92, MH = 54;
      K.text(svg, RX, MY + MH + 6, "C", {size: 17, anchor: "middle", colour: "--at-c", weight: 700});
      for (let q = 0; q < 4; q++) {
        const x = MX + (q % 2) * MW, y = MY + Math.floor(q / 2) * MH, on = q === f.k || hlC;
        const g = K.el("g", {"data-pick": "c:" + q});
        g.appendChild(K.el("rect", {x: x + 3, y: y + 3, width: MW - 6, height: MH - 6, rx: 7,
                                     fill: q === f.k ? K.css("--at-c") : "transparent", "fill-opacity": q === f.k ? 0.22 : 1,
                                     stroke: K.css("--at-c"), "stroke-width": on ? 2.4 : 1, "stroke-opacity": on ? 1 : 0.4}));
        K.text(g, x + 12, y + 22, nm("c", q), {size: 12, colour: "--at-c", weight: 700});
        K.text(g, x + MW / 2 + 8, y + 44, sg(f.C[q]), {size: 20, anchor: "middle", weight: 700});
        svg.appendChild(g);
      }

      // The tally.
      let dead = 0;
      for (let n = 0; n < (st.on ? st.struck : 16); n++) if (!held(f.k, Math.floor(n / N), n % N)) dead++;
      const live = N * N - dead;
      const ty = 252;
      K.text(svg, RX, ty, "16", {size: 30, colour: "--stage-ink", weight: 700});
      K.text(svg, RX + 56, ty, c.terms, {size: 16, sans: true, colour: "--stage-ink"});
      K.text(svg, RX, ty + 44, String(dead), {size: 30, colour: "--stage-mute", weight: 700});
      K.text(svg, RX + 56, ty + 44, c.zero, {size: 16, sans: true, colour: "--stage-mute"});
      K.text(svg, RX, ty + 88, String(live), {size: 30, colour: "--at-good", weight: 700});
      K.text(svg, RX + 56, ty + 88, c.survive, {size: 16, sans: true, colour: "--at-good"});
      svg.appendChild(K.el("line", {x1: RX, y1: ty + 112, x2: 790, y2: ty + 112,
                                     stroke: K.css("--stage-mute"), "stroke-opacity": 0.4}));
      K.text(svg, RX, ty + 140, c.tally(f.mults), {size: 14, sans: true, weight: 700});
    },

    readout(ctx) {
      const c = ctx.copy, f = facts(ctx);
      return {
        html: c.read(f),
        claim: c.claim(nm("c", f.k), f.alive, sg(f.value)),
        strip: {mode: "built", terms: SCHOOL, count: f.mults, tray: f.k,
                lit: f.cells.map(([i, j]) => AC.cell(N, i, j, f.k))},
        data: {
          alive: String(f.alive), dead: String(f.dead), terms: String(N * N), tray: String(f.k),
          value: String(f.value), mults: String(f.mults), product: f.C.join(","), mats: ctx.state.mats
        }
      };
    },

    code(ctx) {
      const np = ctx.copy.np, f = facts(ctx), {A, B} = f;
      const m = (v) => "np.array([[" + v[0] + ", " + v[1] + "], [" + v[2] + ", " + v[3] + "]])";
      return K.code([
        "A = " + m(A),
        "B = " + m(B),
        'c = np.einsum("abc,a,b->c", T, A.ravel(), B.ravel())',
        ["c", "[" + f.C.join(", ") + "]"],
        "M = T[:, :, " + f.k + "]",
        ["A.ravel() @ M @ B.ravel()", sg(f.value)],
        ["M.sum()", f.alive + (ctx.lang === "es" ? " de 16 términos sobreviven" : " of 16 terms survive")]
      ]);
    }
  });
})();
