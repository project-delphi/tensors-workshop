// Scene 5: one multiplication, one block of the cube.
// (a11 + a22)(b11 + b22) is a single multiplication that delivers four
// products. Added into c11 and c22 it fills 2 x 2 x 2 = 8 cells of the cube:
// two sit on a ring (the rule wants a 1 there) and six are damage. The block
// is three lists of weights -- u over the entries of A, v over B, w over C --
// and the cell (i, j, k) holds u[i] v[j] w[k]: a rank-one tensor. Each list is
// one slider over the 81 vectors of {-1, 0, 1}^4 and, on the stage's inset, a
// row of chips a reader can press to cycle 0, +1, -1. The cube draws the
// block alone, so a wanted cell is a filled cell inside a ring and damage is a
// filled cell with none. Drawn in three.js, with an SVG twin from the same
// model. See alphatensor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const AC = window.AlphaTensorCore, K = window.AlphaTensorKit;

  const N = 2, T = AC.tensor(N);
  const TAU = 0.16, ENTRANCE = 1200;
  const AN = AC.names("a", N), BN = AC.names("b", N), CN = AC.names("c", N);
  const NAMES = {u: AN, v: BN, w: CN};
  const one = (i) => [0, 1, 2, 3].map((k) => (k === i ? 1 : 0));
  const PRESETS = {
    cell: {u: one(1), v: one(2), w: one(0)},
    m1: {u: [1, 0, 0, 1], v: [1, 0, 0, 1], w: [1, 0, 0, 1]},
    m6: {u: [-1, 0, 1, 0], v: [1, 1, 0, 0], w: [0, 0, 0, 1]}
  };
  const WORDS = {
    en: ["None", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"],
    es: ["Ninguna", "Una", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete", "Ocho", "Nueve", "Diez"]
  };
  const word = (lang, n) => (n < WORDS[lang].length ? WORDS[lang][n] : String(n));

  // Everything the picture and the readout need, from the three controls.
  function facts(ctx) {
    const s = ctx.state, u = AC.weightAt(s.u), v = AC.weightAt(s.v), w = AC.weightAt(s.w);
    const empty = AC.nnz(u) === 0 || AC.nnz(v) === 0 || AC.nnz(w) === 0;
    const X = empty ? AC.rankOne([0, 0, 0, 0], v, w) : AC.rankOne(u, v, w);
    const rep = AC.blockReport(T, u, v, w);
    return {u, v, w, empty, X, rep, dims: [AC.nnz(u), AC.nnz(v), AC.nnz(w)],
            lit: X.map((x, i) => (x ? i : -1)).filter((i) => i >= 0)};
  }

  const vec = (x) => "[" + x.join(", ") + "]";

  // The model both surfaces draw: the block alone, eased by piece.
  function shown(ctx) {
    const c = ctx.cache, t = ctx.now(), s = ctx.state;
    const key = [s.u, s.v, s.w, ctx.hl].join("|");
    if (c.memo && c.memo.key === key && t - c.memo.t < 4) return c.memo.m;
    const f = facts(ctx);
    const m = K.cubeModel({n: N, values: f.X, rings: T, slice: null, lit: null},
                          {zeros: ctx.embed ? "grid" : "cells", hl: ctx.hl, nameSize: ctx.embed ? 17 : 11});
    // The entrance: the block's cells grow into the rings that were waiting for them.
    const grow = K.smooth(K.arrival(ctx, ENTRANCE));
    if (grow < 1) m.items.forEach((it) => { if (it.v) it.s *= grow; });
    c.ease = c.ease || {};
    m.items = K.follow(c.ease, m.items, t, TAU, ctx.instant);
    c.memo = {key, t, m};
    return m;
  }

  const EN = {
    tab: "block",
    k: "Section 11 · one block",
    h: "One multiplication can fill a whole block of the cube",
    predict: "(a₁₁ + a₂₂)(b₁₁ + b₂₂) is one multiplication. Add its result into c₁₁ and into c₂₂ and it " +
             "fills eight cells of the cube. How many of the eight are cells the rule wants?",
    concept: "Three lists of weights, u over the entries of A, v over B and w over C, make a block: the " +
             "cell (i, j, k) holds u[i] · v[j] · w[k]. That is a rank-one tensor. It costs one " +
             "multiplication, however many cells it covers.",
    b: "The rings are the eight cells the rule wants. The cube shows <b>this block alone</b>. A filled " +
       "cell inside a ring is work the rule asked for; a filled cell with no ring is <b>damage</b>, " +
       "which a later block has to undo. Press the weights on the right to cycle them 0, +1, −1, drag " +
       "the sliders, or load a block: <b>one cell</b>, Strassen's first product, or his sixth, which " +
       "carries a −1.",
    eqcap: "X is the block. Its cell (i, j, k) is the product of one weight from each list: u[i] from " +
           "the entries of A, v[j] from B and w[k] from C. It is 0 wherever any of the three is 0.",
    claim: (r) => (r.empty ? "no block yet" : r.cells + " cells · " + r.wanted + " wanted, " + r.damage + " damage"),
    head: "the block, as three lists of weights",
    sumA: "add up A", sumB: "add up B", into: "add the product into C",
    mult: (n) => (n ? "1 multiplication" : "0 multiplications"),
    count: (d, r) => d.join(" × ") + " = " + r.cells + " cells",
    split: (r) => r.wanted + " wanted, " + r.damage + " damage",
    emptyInset: "a block needs all three",
    emptyRead: "<b>No block yet</b>: one of the three lists is all zeros, so every cell is 0 and nothing " +
               "is multiplied. A block needs all three lists to have a weight that is not zero.",
    read: (f, lang) => {
      const r = f.rep, d = r.damage;
      return "<b>" + word(lang, r.wanted) + " of the " + r.cells + "</b> " + (r.cells === 1 ? "cell" : "cells") + " " + (r.wanted === 1 ? "is" : "are") + " wanted by the rule. " +
        (r.cells === 0 ? "" : d === 0 ? "The block has no damage: every cell sits on a ring. "
          : "The other " + d + (d === 1 ? " is" : " are") + " damage: a cell filled where the rule has " +
            "a 0, or where its sign is wrong, which a later block has to undo. ") +
        "The block is " + f.dims.join(" × ") + " cells: one multiplication, however many cells.";
    },
    tip: (a, b, c, v) => "(" + a + ", " + b + ", " + c + ") holds " + v,
    aria: (ctx) => {
      const f = facts(ctx);
      return "The multiplication cube as four stacked trays of sixteen cells, with a ring on each of the eight " +
             "cells the rule fills, showing one block alone. " +
             (f.empty ? "The block is empty." : "It covers " + f.rep.cells + " cells, " + f.rep.wanted +
              " on a ring and " + f.rep.damage + " damage.") + " Beside it, the three lists of weights.";
    },
    controls: {u: "u, over A", v: "v, over B", w: "w, over C", cell: "load one cell", m1: "load m₁", m6: "load m₆"},
    np: {
      overA: "over the entries of A", overB: "over B", overC: "over C",
      cells: (n) => n + (n === 1 ? " cell" : " cells"),
      wanted: (n) => n + " of them wanted"
    }
  };

  const ES = {
    tab: "bloque",
    k: "Sección 11 · un bloque",
    h: "Una multiplicación puede llenar un bloque entero del cubo",
    predict: "(a₁₁ + a₂₂)(b₁₁ + b₂₂) es una multiplicación. Suma su resultado en c₁₁ y en c₂₂ y llena " +
             "ocho celdas del cubo. ¿Cuántas de las ocho son celdas que la regla quiere?",
    concept: "Tres listas de pesos, u sobre las entradas de A, v sobre las de B y w sobre las de C, forman " +
             "un bloque: la celda (i, j, k) vale u[i] · v[j] · w[k]. Es un tensor de rango uno. Cuesta una " +
             "multiplicación, cubra las celdas que cubra.",
    b: "Los anillos son las ocho celdas que la regla quiere. El cubo muestra <b>solo este bloque</b>. Una " +
       "celda llena dentro de un anillo es trabajo que la regla pedía; una celda llena sin anillo es " +
       "<b>daño</b>, que un bloque posterior tiene que deshacer. Pulsa los pesos de la derecha para " +
       "recorrer 0, +1, −1, mueve los deslizadores o carga un bloque: <b>una celda</b>, el primer producto " +
       "de Strassen o su sexto, que lleva un −1.",
    eqcap: "X es el bloque. Su celda (i, j, k) es el producto de un peso de cada lista: u[i] de las " +
           "entradas de A, v[j] de B y w[k] de C. Vale 0 siempre que alguno de los tres sea 0.",
    claim: (r) => (r.empty ? "aún no hay bloque" : r.cells + " celdas · " + r.wanted + " buenas, " + r.damage + " de daño"),
    head: "el bloque, como tres listas de pesos",
    sumA: "suma las de A", sumB: "suma las de B", into: "suma el producto en C",
    mult: (n) => (n ? "1 multiplicación" : "0 multiplicaciones"),
    count: (d, r) => d.join(" × ") + " = " + r.cells + " celdas",
    split: (r) => r.wanted + " buenas, " + r.damage + " de daño",
    emptyInset: "un bloque necesita las tres",
    emptyRead: "<b>Aún no hay bloque</b>: una de las tres listas es todo ceros, así que todas las celdas " +
               "valen 0 y no se multiplica nada. Un bloque necesita que las tres listas tengan algún peso " +
               "distinto de cero.",
    read: (f, lang) => {
      const r = f.rep, d = r.damage;
      return "<b>" + word(lang, r.wanted) + (r.cells === 1 ? " de la " : " de las ") + r.cells + "</b> " + (r.cells === 1 ? "celda" : "celdas") + " " + (r.wanted === 1 ? "es" : "son") + " de las que la regla quiere. " +
        (r.cells === 0 ? "" : d === 0 ? "El bloque no hace daño: cada celda está sobre un anillo. "
          : (d === 1 ? "La otra es daño" : "Las otras " + d + " son daño") + ": celdas llenas donde la regla " +
            "tiene un 0, o con el signo equivocado, que un bloque posterior tiene que deshacer. ") +
        "El bloque es de " + f.dims.join(" × ") + " celdas, una multiplicación, cubra las celdas que cubra.";
    },
    tip: (a, b, c, v) => "(" + a + ", " + b + ", " + c + ") vale " + v,
    aria: (ctx) => {
      const f = facts(ctx);
      return "El cubo de la multiplicación como cuatro bandejas apiladas de dieciséis celdas, con un anillo en " +
             "cada una de las ocho celdas que la regla llena, mostrando un solo bloque. " +
             (f.empty ? "El bloque está vacío." : "Cubre " + f.rep.cells + " celdas, " + f.rep.wanted +
              " sobre un anillo y " + f.rep.damage + " de daño.") + " Al lado, las tres listas de pesos.";
    },
    controls: {u: "u, sobre A", v: "v, sobre B", w: "w, sobre C", cell: "cargar una celda", m1: "cargar m₁", m6: "cargar m₆"},
    np: {
      overA: "sobre las entradas de A", overB: "sobre B", overC: "sobre C",
      cells: (n) => n + (n === 1 ? " celda" : " celdas"),
      wanted: (n) => n + " buenas"
    }
  };

  const widx = (name) => ({id: name, type: "range", min: 0, max: AC.WEIGHTS - 1, step: 1,
    fmt: (v) => AC.combo(AC.weightAt(Number(v)), NAMES[name])});

  function load(ctx, p) {
    ctx.setControls({u: AC.weightIndex(p.u), v: AC.weightIndex(p.v), w: AC.weightIndex(p.w)});
  }

  window.AlphaTensorScenes.register({
    id: "block", section: "11", gl: true,
    part: {en: "Part two · a factorization is an algorithm", es: "Segunda parte · una factorización es un algoritmo"},
    hl: ["a", "b", "c"],
    copy: {en: EN, es: ES},

    pose: {fov: 30, home: {az: -0.5, el: 0.42}, margin: 1.02, inset: {right: 0.38},
           limits: {azMin: -1.15, azMax: 0.15, elMin: 0.18, elMax: 0.8, dollyMin: 0.5, dollyMax: 1.8}},

    controls: [
      widx("u"), widx("v"), widx("w"),
      {id: "cell", type: "button"}, {id: "m1", type: "button"}, {id: "m6", type: "button"}
    ],

    init(ctx) {
      ctx.state.u = AC.weightIndex(PRESETS.m1.u);
      ctx.state.v = AC.weightIndex(PRESETS.m1.v);
      ctx.state.w = AC.weightIndex(PRESETS.m1.w);
    },
    press(ctx, id) { if (PRESETS[id]) load(ctx, PRESETS[id]); },

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) {
      return K.arrival(ctx, ENTRANCE) < 1 || !!(ctx.cache.ease && ctx.cache.ease.moving);
    },
    bounds() { return K.cubeBounds(N); },

    pick(ctx, key) {
      if (key.startsWith("w:")) {
        const [, name, i] = key.split(":");
        const v = AC.weightAt(ctx.state[name]).slice(), x = v[Number(i)];
        v[Number(i)] = x === 0 ? 1 : x === 1 ? -1 : 0;
        ctx.setControls({[name]: AC.weightIndex(v)});
        return;
      }
      if (!key.startsWith("x:")) return;
      const [a, b, c] = key.slice(2).split(",").map(Number);
      this.seek(ctx, AC.cell(4, a, b, c));
    },
    tip(ctx, key) {
      if (!key.startsWith("x:")) return "";
      const [a, b, c] = key.slice(2).split(",").map(Number);
      const v = facts(ctx).X[AC.cell(4, a, b, c)];
      return ctx.copy.tip(AN[a], BN[b], CN[c], K.fmt(v, 0));
    },
    // A cell of the cube or of the strip: the block that covers that cell alone.
    seek(ctx, idx) {
      const q = AC.uncell(4, idx);
      load(ctx, {u: one(q.a), v: one(q.b), w: one(q.c)});
    },

    build(ctx) {
      return K.cubeBuild(ctx, this.pose, {cells: 64, ghosts: 1, hollows: 0, rings: 8, trays: 4, lines: 8});
    },
    render(ctx, gl) { K.cubeRender(gl, shown(ctx)); },

    draw(ctx) {
      const m = shown(ctx), b = K.cubeBounds(N);
      K.cubeDraw(ctx.svg, m, ctx.basis(), ctx.projector(K.corners(b.min, b.max), ctx.box()));
    },

    // The inset: the three lists, then the block read as an instruction.
    hud(ctx, svg) {
      const c = ctx.copy, f = facts(ctx), b = ctx.board();
      const x0 = b.w * 0.66, w = b.w - x0 - 22;
      // The board is as tall as the stage is: 420 on a short screen, more on
      // a tall one. Everything below is spaced for the short one and opened
      // up when there is room, so the last line never leaves the board.
      const tight = b.h < 470, step = tight ? 40 : 48;
      let y = 62;
      K.text(svg, x0, y, c.head, {size: 13, weight: 700, sans: true});
      const wt = K.weights2(svg, {u: f.u, v: f.v, w: f.w}, {x: x0, y: y + 12, w, rowH: tight ? 38 : 44, hl: ctx.hl});
      y = wt.y1 + (tight ? 30 : 38);
      if (f.empty) {
        K.text(svg, x0, y, c.emptyInset, {size: 15, weight: 700, sans: true});
        return;
      }
      const row = (label, text, tok) => {
        K.text(svg, x0, y, label, {size: 11.5, colour: "--stage-mute", sans: true});
        K.text(svg, x0, y + (tight ? 19 : 21), text, {size: 16, weight: 700, colour: tok});
        y += step;
      };
      row(c.sumA, "(" + AC.combo(f.u, AN) + ")", "--at-a");
      row(c.sumB, "(" + AC.combo(f.v, BN) + ")", "--at-b");
      row(c.into, "→ " + AC.combo(f.w, CN), "--at-c");
      K.text(svg, x0, y, c.mult(1), {size: 14, weight: 700, sans: true});
      y += tight ? 22 : 28;
      K.text(svg, x0, y, c.count(f.dims, f.rep), {size: 14, weight: 700, sans: true});
      y += tight ? 20 : 22;
      K.text(svg, x0, y, c.split(f.rep), {size: 14, weight: 700, sans: true,
                                           colour: f.rep.damage ? "--at-bad" : "--at-good"});
    },

    readout(ctx) {
      const c = ctx.copy, f = facts(ctx), s = ctx.state, r = f.rep;
      const none = {cells: 0, wanted: 0, damage: 0};
      const rep = f.empty ? none : r;
      return {
        html: f.empty ? c.emptyRead : c.read({rep: r, dims: f.dims}, ctx.lang),
        claim: c.claim(Object.assign({empty: f.empty}, rep)),
        strip: {mode: "built", terms: f.empty ? [] : [{u: f.u, v: f.v, w: f.w}], count: f.empty ? 0 : 1,
                lit: f.empty ? [] : f.lit},
        data: {
          damage: String(rep.damage), wanted: String(rep.wanted), cells: String(rep.cells),
          mults: f.empty ? "0" : "1",
          u: f.u.join(","), v: f.v.join(","), w: f.w.join(","), shape: "4,4,4"
        }
      };
    },

    code(ctx) {
      const np = ctx.copy.np, f = facts(ctx), rep = f.empty ? {cells: 0, wanted: 0} : f.rep;
      return K.code([
        ["u = np.array(" + vec(f.u) + ")", np.overA],
        ["v = np.array(" + vec(f.v) + ")", np.overB],
        ["w = np.array(" + vec(f.w) + ")", np.overC],
        'X = np.einsum("a,b,c->abc", u, v, w)',
        ["np.count_nonzero(X)", np.cells(rep.cells)],
        ["((X == 1) & (T == 1)).sum()", np.wanted(rep.wanted)]
      ]);
    }
  });
})();
