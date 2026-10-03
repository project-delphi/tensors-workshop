// Scene 7: Strassen's seven blocks run as an algorithm on numbers. The seven
// blocks are a recipe: stage one is seven products, m_r = (u_r . a)(v_r . b),
// the only multiplications; stage two builds each entry of C as a signed sum
// of the m's, from the rows of W. The picture is the recipe laid out flat:
// A and B small at the top with the entries the picked product uses marked
// with their signed weights, the seven products as rows on the left, the four
// entries of C assembled from them on the right with every occurrence of the
// picked product marked, and the tally at the bottom -- seven multiplications
// plus eighteen additions against the schoolbook rule's eight plus four. On
// plain numbers it is a bad trade, and the readout says so before it says
// why it pays. The entrance computes the seven products one at a time, then
// the four sums. Flat: SVG only.
// See alphatensor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const AC = window.AlphaTensorCore, K = window.AlphaTensorKit;

  const N = 2, F = AC.STRASSEN, R = F.U.length;
  const SCHOOL = AC.schoolbook(N);
  const BLOCKS = AC.blocksOf(F);
  const TEXT = AC.formulas(F, N);
  const SCHOOL_MULTS = SCHOOL.U.length, SCHOOL_ADDS = AC.additions(SCHOOL);
  const MULTS = R, ADDS = AC.additions(F);

  // The three pairs of matrices. The first is the page's worked example; the
  // other two are fixed seeded integers, so a reader can see it is not luck.
  const SEEDS = {second: 7, third: 2024};
  const MATS = {example: [AC.A0, AC.B0]};
  Object.keys(SEEDS).forEach((k) => {
    const rand = AC.mulberry32(SEEDS[k]);
    MATS[k] = [AC.randomMatrix(rand, 4, -9, 9), AC.randomMatrix(rand, 4, -9, 9)];
  });

  const ENTRANCE = 3400, STEP = 260;          // seven products, then four sums, then a breath
  const AXIS = {a: "--at-a", b: "--at-b"};

  const sg = (v) => (v < 0 ? "−" + (-v) : String(v));          // a real minus, never "-0"
  const term = (v, first) => (first ? sg(v) : (v < 0 ? "− " : "+ ") + Math.abs(v));
  const wsign = (w) => (w < 0 ? "−1" : "+1");
  const mats = (ctx) => MATS[ctx.state.mats];

  // Everything the picture and the readout need, from the two controls.
  function facts(ctx) {
    const [A, B] = mats(ctx), res = AC.applyAlgorithm(F, A, B), ref = AC.matmul(N, A, B);
    const r = ctx.state.r - 1;
    const goes = F.W[r].map((w, c) => (w ? (w > 0 ? "+" : "−") + AC.name("c", N, c) : "")).filter(Boolean).join(" ");
    return {A, B, res, ref, r, goes, same: AC.equal(res.C, ref),
            m: res.m, c: res.C, name: AC.mName(r + 1), value: res.m[r]};
  }

  // How far the entrance has got: products dealt, sums dealt, and which
  // product it is on (null once it hands over to the control).
  function dealt(ctx) {
    const t = K.arrival(ctx, ENTRANCE);
    if (t >= 1) return {prods: R, sums: 4, live: null};
    const k = Math.floor(t * ENTRANCE / STEP) + 1;
    if (k <= R) return {prods: k, sums: 0, live: k};
    return {prods: R, sums: Math.min(4, k - R - 1), live: null};
  }

  function cellsOf(r) {
    const X = AC.rankOne(F.U[r], F.V[r], F.W[r]), out = [];
    X.forEach((v, i) => { if (v) out.push(i); });
    return out;
  }

  // A small matrix: each cell holds its name, its number and, when the
  // picked product uses it, the signed weight.
  function matrix(ctx, letter, x0, y0, vals, weights, hl) {
    const svg = ctx.svg, tok = AXIS[letter], CW = 84, CH = 44;
    K.text(svg, x0, y0 - 8, letter.toUpperCase(), {size: 17, colour: tok, weight: 700});
    for (let i = 0; i < 4; i++) {
      const x = x0 + (i % 2) * CW, y = y0 + Math.floor(i / 2) * CH, w = weights[i], on = w !== 0;
      const g = K.el("g", {"data-pick": letter + ":" + i});
      g.appendChild(K.el("rect", {x: x + 2, y: y + 2, width: CW - 4, height: CH - 4, rx: 6,
                                   fill: on || hl ? K.css(tok) : "transparent",
                                   "fill-opacity": on ? (hl ? 0.42 : 0.24) : (hl ? 0.1 : 1),
                                   stroke: K.css(tok), "stroke-opacity": on ? 1 : (hl ? 0.8 : 0.3),
                                   "stroke-width": on || hl ? 2 : 1}));
      K.text(g, x + 9, y + 15, AC.name(letter, N, i), {size: 11, colour: on ? tok : "--stage-mute", weight: 600});
      K.text(g, x + CW / 2 + 6, y + 31, sg(vals[i]), {size: 18, anchor: "middle", weight: 700,
                                                       colour: on ? "--stage-ink" : "--stage-mute"});
      if (on) K.text(g, x + CW - 9, y + 15, wsign(w), {size: 12, anchor: "end", weight: 700,
                                                       colour: w < 0 ? "--at-neg" : "--at-pos"});
      svg.appendChild(g);
    }
  }

  const EN = {
    tab: "run",
    k: "Section 11 · the recipe",
    h: "Seven multiplications turn 1 2 3 4 and 5 6 7 8 into 19 22 43 50",
    predict: "Seven multiplications where the schoolbook rule uses eight. Count the additions and " +
             "subtractions too: on plain numbers, does Strassen's recipe do less work in total, or more?",
    concept: "Seven blocks that add up to the cube are an algorithm. Each block is one product of two " +
             "sums, m = (u · a)(v · b): the only multiplications there are. Each entry of C is then a " +
             "signed sum of the products, read off the rows of W. Rows of U and V say which entries " +
             "go into the sums; rows of W say where each product goes.",
    b: "Pick a product, or press ▶. The entries of <b>A</b> and <b>B</b> it uses are marked with their " +
       "signs, and every place its number is added into <b>C</b> is marked on the right. Every sign is " +
       "printed: a product can be negative, and a block can be taken away. Switch the matrices to see " +
       "it is not luck.",
    eqcap: "Top: product r multiplies one signed sum of A's entries by one signed sum of B's, with " +
           "weights from row r of U and of V. Bottom: entry k of C adds up every product, each times its " +
           "weight in column k of W.",
    claim: (name, v, ops, school, ok) => name + " = " + v + " · " + ops + " operations against " + school +
      (ok ? " · same as A @ B" : " · differs from A @ B"),
    head1: "the seven products: the only multiplications",
    head2: "the four sums: no multiplications",
    goes: (name) => name + " goes into",
    nowhere: "nowhere",
    school: "schoolbook",
    tally: (m, a, t) => m + " multiplications + " + a + " additions = " + t,
    same: (ok) => "same as A @ B: " + (ok ? "yes" : "no"),
    legendM: "multiplication", legendA: "addition",
    read: (f, ops, school, ok) =>
      "<b>More:</b> " + ops + " operations against " + school + ". " + MULTS + " multiplications and " +
      ADDS + " additions or subtractions, where the schoolbook rule does " + SCHOOL_MULTS + " and " +
      SCHOOL_ADDS + ". Product " + f.name + " is <b>" + f.left + " · " + f.right + " = " + f.value +
      "</b>, and it is added into <b>" + f.goes + "</b>. The four sums come to " + f.c + " — " +
      (ok ? "exactly A @ B" : "not A @ B") + ". It still pays because the entries can be matrices: " +
      "multiplying blocks costs far more than adding them, and the next picture applies the recipe to blocks.",
    aria: (ctx) => {
      const f = facts(ctx);
      return "Strassen's recipe run on two 2 by 2 matrices. The seven products are " + f.m.join(", ") +
             " and they add up to " + f.c.join(", ") + ". Product " + f.name + " is " + f.value +
             ". Seven multiplications and eighteen additions make " + (MULTS + ADDS) +
             " operations against " + (SCHOOL_MULTS + SCHOOL_ADDS) + " for the schoolbook rule.";
    },
    controls: {r: "Which product", mats: "Which matrices", play: "▶ Run the seven"},
    options: {mats: {example: "the worked example", second: "a second pair", third: "a third pair"}},
    np: {
      comment: "7 multiplications, one per row of U and V",
      sums: "the four entries of C"
    }
  };

  const ES = {
    tab: "ejecución",
    k: "Sección 11 · la receta",
    h: "Siete multiplicaciones convierten 1 2 3 4 y 5 6 7 8 en 19 22 43 50",
    predict: "Siete multiplicaciones donde la regla escolar usa ocho. Cuenta también las sumas y " +
             "restas: con números corrientes, ¿la receta de Strassen hace menos trabajo en total, o más?",
    concept: "Siete bloques que suman el cubo son un algoritmo. Cada bloque es un producto de dos " +
             "sumas, m = (u · a)(v · b): las únicas multiplicaciones que hay. Cada entrada de C es " +
             "entonces una suma con signo de los productos, leída en las filas de W. Las filas de U y V " +
             "dicen qué entradas entran en las sumas; las filas de W dicen adónde va cada producto.",
    b: "Elige un producto, o pulsa ▶. Las entradas de <b>A</b> y <b>B</b> que usa se marcan con su " +
       "signo, y cada lugar donde su número se suma a <b>C</b> se marca a la derecha. Todos los signos " +
       "están escritos: un producto puede ser negativo, y un bloque puede restarse. Cambia las matrices " +
       "para ver que no es casualidad.",
    eqcap: "Arriba: el producto r multiplica una suma con signo de las entradas de A por una de B, con " +
           "los pesos de la fila r de U y de V. Abajo: la entrada k de C suma todos los productos, cada " +
           "uno por su peso en la columna k de W.",
    claim: (name, v, ops, school, ok) => name + " = " + v + " · " + ops + " operaciones frente a " + school +
      (ok ? " · igual que A @ B" : " · distinto de A @ B"),
    head1: "los siete productos: las únicas multiplicaciones",
    head2: "las cuatro sumas: ninguna multiplicación",
    goes: (name) => name + " va a",
    nowhere: "a ninguna parte",
    school: "regla escolar",
    tally: (m, a, t) => m + " multiplicaciones + " + a + " sumas = " + t,
    same: (ok) => "igual que A @ B: " + (ok ? "sí" : "no"),
    legendM: "multiplicación", legendA: "suma",
    read: (f, ops, school, ok) =>
      "<b>Más:</b> " + ops + " operaciones frente a " + school + ". " + MULTS + " multiplicaciones y " +
      ADDS + " sumas o restas, donde la regla escolar hace " + SCHOOL_MULTS + " y " + SCHOOL_ADDS +
      ". El producto " + f.name + " es <b>" + f.left + " · " + f.right + " = " + f.value +
      "</b>, y se suma a <b>" + f.goes + "</b>. Las cuatro sumas dan " + f.c + " — " +
      (ok ? "exactamente A @ B" : "no es A @ B") + ". Aun así compensa porque las entradas pueden ser " +
      "matrices: multiplicar bloques cuesta mucho más que sumarlos, y la siguiente imagen aplica la " +
      "receta a bloques.",
    aria: (ctx) => {
      const f = facts(ctx);
      return "La receta de Strassen aplicada a dos matrices de 2 por 2. Los siete productos son " +
             f.m.join(", ") + " y suman " + f.c.join(", ") + ". El producto " + f.name + " vale " + f.value +
             ". Siete multiplicaciones y dieciocho sumas hacen " + (MULTS + ADDS) +
             " operaciones frente a " + (SCHOOL_MULTS + SCHOOL_ADDS) + " de la regla escolar.";
    },
    controls: {r: "Qué producto", mats: "Qué matrices", play: "▶ Ejecutar los siete"},
    options: {mats: {example: "el ejemplo de siempre", second: "un segundo par", third: "un tercer par"}},
    np: {
      comment: "7 multiplicaciones, una por fila de U y V",
      sums: "las cuatro entradas de C"
    }
  };

  window.AlphaTensorScenes.register({
    id: "run", section: "11",
    hl: ["a", "b", "c", "r"],
    copy: {en: EN, es: ES},

    controls: [
      {id: "r", type: "range", min: 1, max: R, step: 1, fmt: (v) => AC.mName(v)},
      {id: "mats", type: "select", options: ["example", "second", "third"]},
      {id: "play", type: "play", target: "r", rate: 1}
    ],

    init(ctx) { ctx.state.r = 1; ctx.state.mats = "example"; },

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) { return K.arrival(ctx, ENTRANCE) < 1; },

    pick(ctx, key) {
      const [kind, i] = key.split(":"), n = Number(i);
      if (kind === "r") { ctx.setControls({r: n}); return; }
      // An entry of A or B: the first product that weighs it.
      const rows = kind === "a" ? F.U : kind === "b" ? F.V : null;
      const at = rows ? rows.findIndex((row) => row[n]) : F.W.findIndex((row) => row[n]);
      if (at >= 0) ctx.setControls({r: at + 1});
    },
    // The strip: go to the first product whose block touches that cell.
    seek(ctx, idx) {
      for (let r = 0; r < R; r++) {
        if (AC.rankOne(F.U[r], F.V[r], F.W[r])[idx]) { ctx.setControls({r: r + 1}); return; }
      }
    },

    draw(ctx) {
      const svg = ctx.svg, c = ctx.copy, d = dealt(ctx), hl = ctx.hl;
      const f = facts(ctx);
      // During the deal the picture follows the deal; afterwards the control.
      const p = d.live ? d.live - 1 : f.r;
      const lit = (n) => n === p;

      // --- top: A and B with the picked product's weights, and the product.
      matrix(ctx, "a", 34, 74, f.A, F.U[p], hl === "a");
      K.text(svg, 224, 126, "·", {size: 28, anchor: "middle", colour: "--stage-mute"});
      matrix(ctx, "b", 250, 74, f.B, F.V[p], hl === "b");

      const gname = AC.mName(p + 1), gl = f.res.left[p], gr = f.res.right[p];
      const gv = f.res.m[p];
      const goes = F.W[p].map((w, k) => (w ? (w > 0 ? "+" : "−") + AC.name("c", N, k) : "")).filter(Boolean).join(" ");
      K.text(svg, 458, 90, TEXT.products[p], {size: 16, weight: 700});
      K.text(svg, 458, 126, sg(gl) + " · " + sg(gr) + " = " + sg(gv),
             {size: 26, weight: 700, colour: hl === "r" ? "--at-pos" : "--stage-ink"});
      K.text(svg, 458, 154, c.goes(gname) + " " + goes, {size: 15, colour: "--at-c", weight: 700});

      // --- left: the seven products.
      K.text(svg, 14, 184, c.head1, {size: 13, colour: "--stage-mute", sans: true, weight: 600});
      for (let r = 0; r < R; r++) {
        const y = 192 + r * 28, on = lit(r), done = r < d.prods;
        const g = K.el("g", {"data-pick": "r:" + (r + 1)});
        g.appendChild(K.el("rect", {x: 14, y, width: 426, height: 25, rx: 5,
                                     fill: K.css(on ? "--at-pos" : "--stage-chip"),
                                     "fill-opacity": on ? (hl === "r" ? 0.5 : 0.28) : 1,
                                     stroke: K.css(on ? "--stage-ink" : "--stage-mute"),
                                     "stroke-opacity": on ? 1 : 0.35, "stroke-width": on ? 1.8 : 1}));
        K.text(g, 22, y + 17, TEXT.products[r], {size: 13, weight: on ? 700 : 500});
        if (done) {
          K.text(g, 250, y + 17, "= " + sg(f.res.left[r]) + " · " + sg(f.res.right[r]) + " = " + sg(f.res.m[r]),
                 {size: 13, weight: 700, colour: on ? "--stage-ink" : "--at-pos"});
        }
        svg.appendChild(g);
      }

      // --- right: the four entries of C, assembled from the products.
      K.text(svg, 458, 184, c.head2, {size: 13, colour: "--stage-mute", sans: true, weight: 600});
      for (let k = 0; k < 4; k++) {
        const y = 192 + k * 48, x = 458;
        const g = K.el("g", {"data-pick": "c:" + k});
        g.appendChild(K.el("rect", {x, y, width: 348, height: 44, rx: 5, fill: "transparent",
                                     stroke: K.css("--at-c"), "stroke-opacity": hl === "c" ? 1 : 0.4,
                                     "stroke-width": hl === "c" ? 2.2 : 1}));
        svg.appendChild(g);
        if (k >= d.sums) continue;
        const used = [];
        F.W.forEach((w, r) => { if (w[k]) used.push(r); });
        K.text(svg, x + 10, y + 19, AC.name("c", N, k) + " =", {size: 13, colour: "--at-c", weight: 700});
        used.forEach((r, i) => {
          const sx = x + 66 + i * 46, mark = r === p;
          if (mark) {
            svg.appendChild(K.el("rect", {x: sx - 4, y: y + 3, width: 45, height: 38, rx: 5,
                                           fill: K.css("--at-pos"), "fill-opacity": hl === "r" ? 0.5 : 0.3,
                                           stroke: K.css("--stage-ink"), "stroke-width": 1.4}));
          }
          const w = F.W[r][k];
          K.text(svg, sx, y + 19, (w < 0 ? "− " : i === 0 ? "" : "+ ") + AC.mName(r + 1),
                 {size: 13, weight: mark ? 700 : 500});
          K.text(svg, sx, y + 37, term(F.W[r][k] * f.res.m[r], i === 0),
                 {size: 13, weight: mark ? 700 : 500, colour: mark ? "--stage-ink" : "--stage-mute"});
        });
        K.text(svg, x + 66 + 4 * 46, y + 37, "= " + sg(f.res.C[k]), {size: 15, weight: 700, colour: "--at-c"});
      }

      // --- bottom: the tally, as unit squares and as words.
      const total = MULTS + ADDS, schoolTotal = SCHOOL_MULTS + SCHOOL_ADDS;
      const addShown = Math.round(ADDS * d.sums / 4);
      const rows = [
        {y: 412, name: "Strassen", m: MULTS, a: ADDS, mShow: d.prods, aShow: addShown, tot: total, tok: "--at-bad"},
        {y: 438, name: c.school, m: SCHOOL_MULTS, a: SCHOOL_ADDS, mShow: SCHOOL_MULTS, aShow: SCHOOL_ADDS,
         tot: schoolTotal, tok: "--at-good"}
      ];
      rows.forEach((row) => {
        K.text(svg, 14, row.y + 4, row.name, {size: 13, colour: "--stage-mute", weight: 600});
        for (let i = 0; i < row.m + row.a; i++) {
          const isM = i < row.m, shown = isM ? i < row.mShow : i - row.m < row.aShow;
          if (!shown) continue;
          svg.appendChild(K.el("rect", {x: 132 + i * 13, y: row.y - 6, width: 11, height: 11, rx: 2,
                                         fill: isM ? K.css("--at-pos") : "transparent",
                                         stroke: K.css(isM ? "--at-pos" : "--at-neg"), "stroke-width": 1.6}));
        }
        K.text(svg, 474, row.y + 4, c.tally(row.m, row.a, row.tot), {size: 13, weight: 700, colour: row.tok});
      });
      K.text(svg, 132, 468, "■ " + c.legendM + "   □ " + c.legendA, {size: 12, colour: "--stage-mute", weight: 500});
      K.text(svg, 468, 468, c.same(f.same) + "  (" + f.ref.join(", ") + ")",
             {size: 14, weight: 700, colour: f.same ? "--at-good" : "--at-bad"});
    },

    readout(ctx) {
      const c = ctx.copy, f = facts(ctx), ops = MULTS + ADDS, school = SCHOOL_MULTS + SCHOOL_ADDS;
      return {
        html: c.read({name: f.name, left: sg(f.res.left[f.r]), right: sg(f.res.right[f.r]), value: sg(f.value),
                      goes: f.goes, c: f.c.map(sg).join(", ")}, ops, school, f.same),
        claim: c.claim(f.name, sg(f.value), ops, school, f.same),
        strip: {mode: "built", terms: BLOCKS, count: R, lit: cellsOf(f.r)},
        data: {
          ops: String(ops), schoolops: String(school), mults: String(MULTS), adds: String(ADDS),
          r: String(f.r + 1), m: f.m.join(","), c: f.c.join(","), value: String(f.value),
          same: f.same ? "1" : "0", mats: ctx.state.mats
        }
      };
    },

    code(ctx) {
      const np = ctx.copy.np, f = facts(ctx);
      const rows = (M) => "np.array([[" + M[0] + ", " + M[1] + "], [" + M[2] + ", " + M[3] + "]])";
      return K.code([
        "A = " + rows(f.A),
        "B = " + rows(f.B),
        "# " + np.comment,
        "m = (U @ A.ravel()) * (V @ B.ravel())",
        ["m", "[" + f.m.join(", ") + "]"],
        ["W.T @ m", "[" + f.c.join(", ") + "]"],
        "np.array_equal((W.T @ m).reshape(2, 2), A @ B)",
        "# " + (f.same ? "True" : "False")
      ]);
    }
  });
})();
