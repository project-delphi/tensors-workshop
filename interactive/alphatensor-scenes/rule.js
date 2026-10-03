// Scene 1: the rule for multiplying two 2 x 2 matrices, taken apart into the
// eight products it is made of. Three matrices across the top -- A, B and
// their product, the worked example every scene on this page carries -- and
// under them the eight products in four columns, one column per entry of C,
// each product a tile that says which entry of A, which entry of B, and
// what they make. Picking a product lights its three entries above. That is
// the whole idea of the page in one flat picture: every product is a triple
// (an entry of A, an entry of B, a destination in C), and the next scene
// puts a 1 at each triple. The entrance deals the eight tiles one at a time,
// which is also what moves on the page when it opens. Flat: SVG only.
// See alphatensor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const AC = window.AlphaTensorCore, K = window.AlphaTensorKit;

  const N = 2, TERMS = AC.terms(N);           // the eight products, c11's two first
  const A = AC.A0, B = AC.B0, C = AC.matmul(N, A, B);
  const SCHOOL = AC.blocksOf(AC.schoolbook(N));
  const ENTRANCE = 2600;                       // eight tiles, one every 300 ms, and a breath

  // The matrices: a cell holds the entry's name over its number.
  const CW = 62, CH = 52, MY = 74;
  const MX = {a: 118, b: 322, c: 548};
  const AXIS = {a: "--at-a", b: "--at-b", c: "--at-c"};
  // The tiles: one column per entry of C.
  const COL = 196, TX = 22, TW = 180, TH = 40, TY = [262, 312];

  const product = (ctx) => TERMS[ctx.state.p - 1];
  const value = (t) => A[t.a] * B[t.b];
  const nm = (letter, i) => AC.name(letter, N, i);

  // How many tiles the entrance has dealt, and which one it is dealing.
  function dealt(ctx) {
    const t = K.arrival(ctx, ENTRANCE);
    if (t >= 1) return {count: 8, live: null};
    const k = Math.min(8, Math.floor(t * ENTRANCE / 300) + 1);
    return {count: k, live: k};
  }

  function matrix(ctx, letter, vals, lit, hl) {
    const svg = ctx.svg, x0 = MX[letter], tok = AXIS[letter];
    const w = 2 * CW, h = 2 * CH;
    K.text(svg, x0 + w / 2, MY - 14, letter.toUpperCase(), {size: 17, anchor: "middle", colour: tok, weight: 700});
    // Brackets as strokes, so they scale with the matrix.
    for (const [x, d] of [[x0 - 8, 7], [x0 + w + 8, -7]]) {
      svg.appendChild(K.el("path", {
        d: "M " + (x + d) + " " + (MY - 4) + " L " + x + " " + (MY - 4) + " L " + x + " " + (MY + h + 4) + " L " + (x + d) + " " + (MY + h + 4),
        fill: "none", stroke: K.css(hl ? tok : "--stage-mute"), "stroke-width": hl ? 2.4 : 1.6
      }));
    }
    for (let i = 0; i < 4; i++) {
      const x = x0 + (i % 2) * CW, y = MY + Math.floor(i / 2) * CH, on = lit === i;
      const g = K.el("g", {"data-pick": letter + ":" + i});
      g.appendChild(K.el("rect", {x: x + 3, y: y + 3, width: CW - 6, height: CH - 6, rx: 6,
                                   fill: on ? K.css(tok) : "transparent", "fill-opacity": on ? 0.22 : 1,
                                   stroke: K.css(on ? tok : "--stage-mute"), "stroke-opacity": on ? 1 : 0.25,
                                   "stroke-width": on ? 2.2 : 1}));
      K.text(g, x + CW / 2, y + 19, nm(letter, i), {size: 11.5, anchor: "middle", colour: tok, weight: 600});
      K.text(g, x + CW / 2, y + 41, String(vals[i]), {size: 20, anchor: "middle", weight: 700});
      svg.appendChild(g);
    }
  }

  const EN = {
    tab: "rule",
    k: "Section 06 · the rule",
    h: "The rule for multiplying two matrices is a list of products",
    predict: "Before you look: c₁₁ is a sum of two products, and one of them is a₁₁ · b₁₁. Which entry " +
             "of A and which entry of B make the other?",
    concept: "Every product in the rule names three things: an entry of A, an entry of B, and the entry " +
             "of C it is added to. Write the rule as that list of triples and it mentions no numbers at " +
             "all. It works for every A and every B.",
    b: "The matrices are the example this page keeps: <code>[[1, 2], [3, 4]]</code> times " +
       "<code>[[5, 6], [7, 8]]</code>. Each tile is one product of the rule, filed under the entry of C " +
       "it goes into. <b>Pick a tile</b>, or press ▶, and the three entries it names light up above. " +
       "The strip under the stage already shows where this is going: the same eight products, as eight " +
       "cells.",
    eqcap: "One entry of the product, written out, and the rule it is an instance of: entry (p, q) of C " +
           "adds up a row of A against a column of B. Every term is one multiplication.",
    claim: (p, a, b, c) => "8 products · product " + p + ": " + a + " · " + b + " → " + c,
    caption: (m, s) => m + " multiplications, " + s + " additions",
    read: (p, a, b, c, x, y, v, total) =>
      "<b>" + a + " · " + b + " = " + x + " · " + y + " = " + v + "</b> is product " + p +
      ", and it is added into <b>" + c + "</b>, which comes to " + total + ". Every entry of C is a sum " +
      "of two products and all eight are different. Three facts pin each one down: which entry of A, " +
      "which entry of B, and where it goes.",
    sum: (x, y, t) => x + " + " + y + " = " + t,
    aria: (ctx) => {
      const t = product(ctx);
      return "Three 2 by 2 matrices, A times B equals C, with numbers 1 2 3 4, 5 6 7 8 and 19 22 43 50. " +
             "Under them the eight products of the rule in four columns, one per entry of C. Product " +
             ctx.state.p + " is " + nm("a", t.a) + " times " + nm("b", t.b) + ", which equals " + value(t) +
             " and is added into " + nm("c", t.c) + ".";
    },
    controls: {p: "Which product", play: "▶ Go through the eight"},
    np: {
      prod: "the product",
      one: (v, c) => v + ", added into " + c,
      count: "8 products, one multiplication each"
    }
  };

  const ES = {
    tab: "regla",
    k: "Sección 06 · la regla",
    h: "La regla para multiplicar dos matrices es una lista de productos",
    predict: "Antes de mirar: c₁₁ es una suma de dos productos, y uno de ellos es a₁₁ · b₁₁. ¿Qué entrada " +
             "de A y qué entrada de B forman el otro?",
    concept: "Cada producto de la regla nombra tres cosas: una entrada de A, una entrada de B y la " +
             "entrada de C a la que se suma. Escribe la regla como esa lista de ternas y no menciona " +
             "ningún número. Sirve para toda A y toda B.",
    b: "Las matrices son el ejemplo que esta página conserva: <code>[[1, 2], [3, 4]]</code> por " +
       "<code>[[5, 6], [7, 8]]</code>. Cada ficha es un producto de la regla, colocado bajo la entrada " +
       "de C a la que va. <b>Elige una ficha</b>, o pulsa ▶, y las tres entradas que nombra se " +
       "encienden arriba. La cinta bajo el escenario ya muestra adónde va esto: los mismos ocho " +
       "productos, como ocho celdas.",
    eqcap: "Una entrada del producto, escrita por extenso, y la regla de la que es un caso: la entrada " +
           "(p, q) de C suma una fila de A contra una columna de B. Cada término es una multiplicación.",
    claim: (p, a, b, c) => "8 productos · producto " + p + ": " + a + " · " + b + " → " + c,
    caption: (m, s) => m + " multiplicaciones, " + s + " sumas",
    read: (p, a, b, c, x, y, v, total) =>
      "<b>" + a + " · " + b + " = " + x + " · " + y + " = " + v + "</b> es el producto " + p +
      ", y se suma a <b>" + c + "</b>, que da " + total + ". Cada entrada de C es una suma de dos " +
      "productos y los ocho son distintos. Tres datos fijan cada uno: qué entrada de A, qué entrada " +
      "de B y adónde va.",
    sum: (x, y, t) => x + " + " + y + " = " + t,
    aria: (ctx) => {
      const t = product(ctx);
      return "Tres matrices de 2 por 2, A por B igual a C, con los números 1 2 3 4, 5 6 7 8 y 19 22 43 50. " +
             "Debajo, los ocho productos de la regla en cuatro columnas, una por entrada de C. El producto " +
             ctx.state.p + " es " + nm("a", t.a) + " por " + nm("b", t.b) + ", que vale " + value(t) +
             " y se suma a " + nm("c", t.c) + ".";
    },
    controls: {p: "Qué producto", play: "▶ Recorrer los ocho"},
    np: {
      prod: "el producto",
      one: (v, c) => v + ", sumado a " + c,
      count: "8 productos, una multiplicación cada uno"
    }
  };

  window.AlphaTensorScenes.register({
    id: "rule", section: "06",
    part: {en: "Part one · the rule is a cube", es: "Primera parte · la regla es un cubo"},
    hl: ["a", "b", "c"],
    copy: {en: EN, es: ES},

    controls: [
      {id: "p", type: "range", min: 1, max: 8, step: 1,
       fmt: (v) => { const t = TERMS[v - 1]; return v + " · " + nm("a", t.a) + "·" + nm("b", t.b); }},
      {id: "play", type: "play", target: "p", rate: 1.1}
    ],

    // Product 2 rather than product 1: a12 times b21 is the first one whose
    // two entries sit in different places, which is the case worth looking at.
    init(ctx) { ctx.state.p = 2; },

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) { return K.arrival(ctx, ENTRANCE) < 1; },

    pick(ctx, key) {
      const [kind, i] = key.split(":");
      if (kind === "p") { ctx.setControls({p: Number(i)}); return; }
      // An entry of a matrix: the first product that uses it.
      const at = TERMS.findIndex((t) => t[kind] === Number(i));
      if (at >= 0) ctx.setControls({p: at + 1});
    },
    // The strip: a press on one of the eight cells picks that product.
    seek(ctx, idx) {
      const q = AC.uncell(4, idx);
      const at = TERMS.findIndex((t) => t.a === q.a && t.b === q.b && t.c === q.c);
      if (at >= 0) ctx.setControls({p: at + 1});
    },

    draw(ctx) {
      const svg = ctx.svg, c = ctx.copy, d = dealt(ctx);
      // While the tiles are being dealt the picture follows the deal; after
      // that it follows the control. The readout is the control's throughout.
      const p = d.live || ctx.state.p, t = TERMS[p - 1];
      matrix(ctx, "a", A, t.a, ctx.hl === "a");
      K.text(svg, MX.a + 2 * CW + 38, MY + CH + 9, "·", {size: 30, anchor: "middle", colour: "--stage-mute"});
      matrix(ctx, "b", B, t.b, ctx.hl === "b");
      K.text(svg, MX.b + 2 * CW + 50, MY + CH + 8, "=", {size: 26, anchor: "middle", colour: "--stage-mute"});
      matrix(ctx, "c", C, t.c, ctx.hl === "c");

      for (let col = 0; col < 4; col++) {
        const x = TX + col * COL, pair = TERMS.filter((q) => q.c === col);
        K.text(svg, x + TW / 2, 246, nm("c", col), {size: 14, anchor: "middle", colour: "--at-c", weight: 700});
        pair.forEach((q, row) => {
          const n = TERMS.indexOf(q) + 1;
          if (n > d.count) return;
          const on = n === p;
          const g = K.el("g", {"data-pick": "p:" + n});
          g.appendChild(K.el("rect", {x, y: TY[row], width: TW, height: TH, rx: 7,
                                       fill: K.css("--at-pos"), "fill-opacity": on ? 0.3 : 0.1,
                                       stroke: K.css(on ? "--stage-ink" : "--at-pos"), "stroke-width": on ? 2 : 1,
                                       "stroke-opacity": on ? 1 : 0.6}));
          K.text(g, x + TW / 2, TY[row] + 25,
                 nm("a", q.a) + "·" + nm("b", q.b) + " = " + A[q.a] + "·" + B[q.b] + " = " + value(q),
                 {size: 13, anchor: "middle", weight: on ? 700 : 600});
          svg.appendChild(g);
        });
        if (d.count >= TERMS.indexOf(pair[1]) + 1) {
          K.text(svg, x + TW / 2, 378, c.sum(value(pair[0]), value(pair[1]), C[col]),
                 {size: 14, anchor: "middle", colour: "--stage-mute"});
        }
      }
      K.text(svg, 410, 440, c.caption(TERMS.length, AC.additions(AC.schoolbook(N))),
             {size: 15, anchor: "middle", weight: 700, sans: true});
    },

    readout(ctx) {
      const c = ctx.copy, p = ctx.state.p, t = product(ctx);
      return {
        html: c.read(p, nm("a", t.a), nm("b", t.b), nm("c", t.c), A[t.a], B[t.b], value(t), C[t.c]),
        claim: c.claim(p, nm("a", t.a), nm("b", t.b), nm("c", t.c)),
        strip: {mode: "built", terms: SCHOOL, count: TERMS.length, lit: [AC.cell(4, t.a, t.b, t.c)]},
        data: {
          p: String(p), entrya: String(t.a), entryb: String(t.b), entryc: String(t.c),
          value: String(value(t)), mults: String(TERMS.length), adds: String(AC.additions(AC.schoolbook(N))),
          product: C.join(",")
        }
      };
    },

    code(ctx) {
      const np = ctx.copy.np, t = product(ctx);
      const ix = (i) => "[" + Math.floor(i / N) + ", " + (i % N) + "]";
      return K.code([
        "A = np.array([[1, 2], [3, 4]])",
        "B = np.array([[5, 6], [7, 8]])",
        ["A @ B", "[[19, 22], [43, 50]]: " + np.prod],
        ["A" + ix(t.a) + " * B" + ix(t.b), np.one(value(t), "C" + ix(t.c))],
        ["2 ** 3", np.count]
      ]);
    }
  });
})();
