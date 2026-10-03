// Scene 8: seven beats eight because the entries can be matrices. The recipe
// never swaps two factors, so its "entries" may be blocks: cut two matrices
// into quarters, multiply with seven products of quarters instead of eight,
// and use the recipe again inside each product. On the left a matrix is cut
// into quarters, one quarter cut again, level by level (the drawing stops at
// four levels and says so), and each level shows its seven filled tiles and
// one empty outline. On the right, two bars drawn to scale -- 8^k and 7^k, with
// their numbers written out -- and under them the share saved against k.
// The entrance cuts the matrix level by level while the bars grow. Flat: SVG
// only. This scene has no `seek`: it is about a count, not about the cube's
// cells. See alphatensor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const AC = window.AlphaTensorCore, K = window.AlphaTensorKit;

  const KMAX = 10, DRAWN = 4;
  const STRASSEN = AC.blocksOf(AC.STRASSEN);
  const ENTRANCE = 2600;

  // Left: the matrix, and beside it one row of tiles a level.
  const MX = 24, MY = 74, S = 270, ROW = S / DRAWN;
  const LX = 300, TX = 362, TS = 21, TG = 3;
  // Right: the bars and the curve.
  const BX = 478, BW = 318;
  const CX = 528, CW = 262, CY = 276, CH = 142;

  const sizeOf = (k, level) => Math.pow(2, k - level);       // side of a quarter at this level
  const drawnLevels = (k) => Math.min(k, DRAWN);

  // How far the entrance has got: levels cut so far, and how grown the bars are.
  function entrance(ctx, D) {
    const t = K.arrival(ctx, ENTRANCE);
    if (t >= 1) return {levels: D, grow: 1};
    return {levels: Math.min(D, Math.floor(Math.min(1, t / 0.6) * D + 0.0001)), grow: K.smooth((t - 0.3) / 0.7)};
  }

  const EN = {
    tab: "recurse",
    k: "Section 11 · seven, again and again",
    h: "Used again inside each product, seven beats eight by more at every level",
    predict: "At 2 × 2 the recipe saves one multiplication in eight: 12.5%. Apply it to the quarters of a " +
             "1,024 × 1,024 matrix, and again inside each product, ten levels down. How much is saved by " +
             "then: still 12.5%, about a third, or about three quarters?",
    concept: "The recipe never swaps two factors, so its entries do not have to be numbers. They can be " +
             "blocks of a bigger matrix, and each product of blocks is a smaller matrix product that the " +
             "recipe can do again. Seven products a level, not eight, compound.",
    b: "Cut two n × n matrices into quarters and multiply them with <b>seven products of quarters</b> " +
       "instead of eight. Each of those is a smaller matrix product, so do it again inside. After k levels " +
       "a matrix of size n = 2<sup>k</sup> costs 7<sup>k</sup> multiplications of numbers where the " +
       "schoolbook rule costs 8<sup>k</sup>. <b>Slide k</b>, or press ▶: the two bars are drawn to scale, " +
       "so the lower one is what the recipe leaves of the upper.",
    eqcap: "M(n) is the multiplications for an n × n product. One level of the recipe turns it into R " +
           "products of half the size, R = 7. Unrolled k times that is R to the k, which is n to the log " +
           "base 2 of R: for R = 7, n^2.807 in place of n³.",
    claim: (k, n, saved) => "k = " + k + " · n = " + n + " · " + saved + "% saved",
    school: "schoolbook",
    stras: "Strassen",
    scale: "multiplications of numbers, to scale",
    sav: "saved",
    curveT: "share saved, by level k",
    level: "level",
    cap: "7 products of quarters, not 8",
    more: (r) => "… " + r + " more level" + (r === 1 ? "" : "s") + ", down to single numbers",
    left: (k, left) => "7/8 a level, " + k + " level" + (k === 1 ? "" : "s") + ": " + left + "% of the work left",
    omega: "7ᵏ = n^2.807 · 8ᵏ = n³",
    where: "the saving is in the exponent",
    read: (saved, k, n, sch, str, ratio, w) =>
      "<b>" + saved + "%</b> saved at " + k + " level" + (k === 1 ? "" : "s") + ", n = " + n + ". The " +
      "schoolbook rule does <b>" + sch + "</b> multiplications of numbers and the recipe, applied " +
      "inside every product, <b>" + str + "</b>, so the schoolbook rule does " + ratio + " multiplications for each of the recipe's. " +
      "The saving is in the exponent: 7<sup>k</sup> is n<sup>" + w + "</sup>, where 8<sup>k</sup> is n³.",
    aria: (ctx) => {
      const r = AC.recursion(ctx.state.k);
      return "Recursion with Strassen's recipe, " + ctx.state.k + " levels, matrix size " + r.n + ". A square " +
             "cut into quarters, one quarter cut again, with seven filled tiles and one empty tile at each " +
             "level. Two bars drawn to scale: " + r.school + " multiplications for the schoolbook rule and " +
             r.strassen + " for the recipe, which saves " + (r.saving * 100).toFixed(1) + " percent.";
    },
    controls: {k: "Levels", play: "▶ Go down the levels"},
    np: {
      count: "multiplications",
      school: "schoolbook",
      saved: "saved",
      expo: "the exponent"
    }
  };

  const ES = {
    tab: "recursión",
    k: "Sección 11 · siete, una y otra vez",
    h: "Usada otra vez dentro de cada producto, la regla de siete gana más en cada nivel",
    predict: "En 2 × 2 la receta ahorra una multiplicación de cada ocho: 12,5 %. Aplícala a los cuartos de " +
             "una matriz de 1.024 × 1.024, y otra vez dentro de cada producto, diez niveles más abajo. " +
             "¿Cuánto se ahorra para entonces: todavía 12,5 %, cerca de un tercio o cerca de tres cuartos?",
    concept: "La receta nunca intercambia dos factores, así que sus entradas no tienen que ser números. " +
             "Pueden ser bloques de una matriz mayor, y cada producto de bloques es un producto de " +
             "matrices más pequeño que la receta puede volver a hacer. Siete productos por nivel, no " +
             "ocho, se acumulan.",
    b: "Corta dos matrices n × n en cuartos y multiplícalas con <b>siete productos de cuartos</b> en " +
       "lugar de ocho. Cada uno es un producto de matrices más pequeño, así que repítelo dentro. Tras k " +
       "niveles, una matriz de tamaño n = 2<sup>k</sup> cuesta 7<sup>k</sup> multiplicaciones de números " +
       "donde la regla escolar cuesta 8<sup>k</sup>. <b>Mueve k</b>, o pulsa ▶: las dos barras están " +
       "dibujadas a escala, así que la de abajo es lo que la receta deja de la de arriba.",
    eqcap: "M(n) son las multiplicaciones de un producto n × n. Un nivel de la receta lo convierte en R " +
           "productos de la mitad de tamaño, con R = 7. Desplegado k veces es R elevado a k, que es n " +
           "elevado al logaritmo en base 2 de R: para R = 7, n^2,807 en lugar de n³.",
    claim: (k, n, saved) => "k = " + k + " · n = " + n + " · " + saved + " % ahorrado",
    school: "regla escolar",
    stras: "Strassen",
    scale: "multiplicaciones de números, a escala",
    sav: "ahorrado",
    curveT: "parte ahorrada, por nivel k",
    level: "nivel",
    cap: "7 productos de cuartos, no 8",
    more: (r) => "… " + r + " nivel" + (r === 1 ? "" : "es") + " más, hasta llegar a números sueltos",
    left: (k, left) => "7/8 por nivel, " + k + " nivel" + (k === 1 ? "" : "es") + ": queda el " + left + " % del trabajo",
    omega: "7ᵏ = n^2,807 · 8ᵏ = n³",
    where: "el ahorro está en el exponente",
    read: (saved, k, n, sch, str, ratio, w) =>
      "<b>" + saved + " %</b> ahorrado con " + k + " nivel" + (k === 1 ? "" : "es") + ", n = " + n + ". La " +
      "regla escolar hace <b>" + sch + "</b> multiplicaciones de números y la receta, aplicada dentro " +
      "de cada producto, <b>" + str + "</b>, así que la regla escolar hace " + ratio + " multiplicaciones por cada una de la receta. " +
      "El ahorro está en el exponente: 7<sup>k</sup> es n<sup>" + w + "</sup>, donde 8<sup>k</sup> es n³.",
    aria: (ctx) => {
      const r = AC.recursion(ctx.state.k);
      return "Recursión con la receta de Strassen, " + ctx.state.k + " niveles, matriz de tamaño " + r.n + ". " +
             "Un cuadrado cortado en cuartos, un cuarto cortado otra vez, con siete fichas llenas y una " +
             "vacía en cada nivel. Dos barras dibujadas a escala: " + r.school + " multiplicaciones " +
             "para la regla escolar y " + r.strassen + " para la receta, que ahorra " +
             (r.saving * 100).toFixed(1).replace(".", ",") + " por ciento.";
    },
    controls: {k: "Niveles", play: "▶ Bajar por los niveles"},
    np: {
      count: "multiplicaciones",
      school: "regla escolar",
      saved: "ahorrado",
      expo: "el exponente"
    }
  };

  function matrixPicture(ctx, k, levels) {
    const svg = ctx.svg, D = drawnLevels(k), n = Math.pow(2, k);
    K.text(svg, MX, MY - 10, K.num(n, 0, ctx.lang) + " × " + K.num(n, 0, ctx.lang),
           {size: 14, weight: 700});
    svg.appendChild(K.el("rect", {x: MX, y: MY, width: S, height: S, fill: "none",
                                   stroke: K.css("--stage-ink"), "stroke-width": 2}));
    let x = MX, y = MY, s = S;
    for (let i = 1; i <= levels; i++) {
      const h = s / 2, w = 2.4 - 0.35 * i;
      // The quarter this level multiplies: the one that is not cut again.
      svg.appendChild(K.el("rect", {x: x + h, y: y + h, width: h, height: h, fill: K.css("--at-good"),
                                     "fill-opacity": 0.1 + 0.03 * i}));
      svg.appendChild(K.el("path", {d: "M " + (x + h) + " " + y + " V " + (y + s) + " M " + x + " " + (y + h) + " H " + (x + s),
                                     fill: "none", stroke: K.css("--stage-ink"), "stroke-width": w}));
      K.text(svg, x + h + h / 2, y + h + h / 2 + 4.5, K.num(sizeOf(k, i), 0, ctx.lang),
             {size: i < 3 ? 15 : 11.5, anchor: "middle", colour: "--stage-ink", weight: 700});
      x += 0; y += 0; s = h;
    }
    if (levels >= D && k > D) {
      K.text(svg, MX + s / 2 + 0, MY + s / 2 + 5, "…", {size: 14, anchor: "middle", colour: "--stage-mute", weight: 700});
    }
  }

  function tileRows(ctx, k, levels) {
    const svg = ctx.svg, c = ctx.copy, on = ctx.hl === "r";
    for (let i = 1; i <= levels; i++) {
      const cy = MY + (i - 0.5) * ROW;
      K.text(svg, LX, cy - 1, K.num(sizeOf(k, i), 0, ctx.lang), {size: 17, weight: 700});
      K.text(svg, LX, cy + 16, c.level + " " + i, {size: 11, colour: "--stage-mute"});
      for (let t = 0; t < 8; t++) {
        const x = TX + (t % 4) * (TS + TG), y = cy - TS - TG / 2 + Math.floor(t / 4) * (TS + TG);
        if (t < 7) {
          svg.appendChild(K.el("rect", {x, y, width: TS, height: TS, rx: 3, fill: K.css("--at-good"),
                                         "fill-opacity": on ? 0.9 : 0.4,
                                         stroke: K.css(on ? "--stage-ink" : "--at-good"), "stroke-width": on ? 1.8 : 1}));
          K.text(svg, x + TS / 2, y + TS / 2 + 4, String(t + 1), {size: 11, anchor: "middle", weight: 700});
        } else {
          svg.appendChild(K.el("rect", {x, y, width: TS, height: TS, rx: 3, fill: "none",
                                         stroke: K.css("--stage-mute"), "stroke-width": 1.4, "stroke-dasharray": "3 2"}));
          K.text(svg, x + TS / 2, y + TS / 2 + 4, "×", {size: 12, anchor: "middle", colour: "--stage-mute"});
        }
      }
    }
  }

  function barsPicture(ctx, r, kv, grow) {
    const svg = ctx.svg, c = ctx.copy, lang = ctx.lang, k = r.k;
    // To scale, each against the schoolbook rule at this depth: the upper bar
    // is the whole width and the lower one is what seven-eighths a level
    // leaves of it. On a log scale the two bars were nearly the same length
    // at every depth, which is the opposite of what the picture is for.
    const lenS = BW * grow, lenT = BW * Math.pow(7 / 8, kv) * grow;
    K.text(svg, BX, 66, c.scale, {size: 12.5, colour: "--stage-mute"});
    const rows = [
      {y: 96, len: lenS, tok: "--at-bad", name: "8" + K.sup(k) + " · " + c.school, v: r.school},
      {y: 152, len: lenT, tok: "--at-good", name: "7" + K.sup(k) + " · " + c.stras, v: r.strassen}
    ];
    for (const b of rows) {
      K.text(svg, BX, b.y, b.name, {size: 13.5, colour: b.tok === "--at-bad" ? "--at-bad" : "--at-good", weight: 700});
      K.text(svg, BX + BW, b.y, K.num(b.v, 0, lang), {size: 17, anchor: "end", weight: 700});
      svg.appendChild(K.el("rect", {x: BX, y: b.y + 8, width: Math.max(2, b.len), height: 26, rx: 3,
                                     fill: K.css(b.tok), "fill-opacity": 0.85}));
    }
    // The gap between the two bar ends, labelled with the saving.
    const xs = BX + Math.max(2, lenS), xt = BX + Math.max(2, lenT);
    for (const x of [xs, xt]) {
      svg.appendChild(K.el("path", {d: "M " + x + " 188 V 212", stroke: K.css("--stage-mute"), "stroke-width": 1,
                                     "stroke-dasharray": "3 3", fill: "none"}));
    }
    svg.appendChild(K.el("path", {d: "M " + xt + " 204 H " + xs, stroke: K.css("--stage-ink"), "stroke-width": 2.2, fill: "none"}));
    K.text(svg, Math.min(xs + 4, BX + BW), 232, "−" + K.num(r.saving * 100, 1, lang) + "% " + c.sav,
           {size: 17, anchor: "end", colour: "--at-good", weight: 700});
  }

  function curvePicture(ctx, k) {
    const svg = ctx.svg, c = ctx.copy, lang = ctx.lang;
    const vals = [];
    for (let i = 1; i <= KMAX; i++) vals.push(AC.recursion(i).saving);
    K.text(svg, BX, 258, c.curveT, {size: 12.5, colour: "--stage-mute"});
    for (const g of [0, 0.4, 0.8]) {
      const y = CY + CH - (g / 0.8) * CH;
      svg.appendChild(K.el("path", {d: "M " + CX + " " + y + " H " + (CX + CW), stroke: K.css("--stage-mute"),
                                     "stroke-width": 0.6, "stroke-dasharray": "2 4", fill: "none"}));
      K.text(svg, CX - 8, y + 4, K.num(g * 100, 0, lang) + "%", {size: 11.5, anchor: "end", colour: "--stage-mute"});
    }
    const cv = K.curve(svg, vals, {x: CX, y: CY, w: CW, h: CH, min: 0, max: 0.8, token: "--at-good", width: 2.4,
                                   dots: true, dotR: 2.6});
    for (let i = 1; i <= KMAX; i++) {
      K.text(svg, cv.px(i - 1), CY + CH + 17, String(i), {size: 11.5, anchor: "middle",
             colour: i === k ? "--stage-ink" : "--stage-mute", weight: i === k ? 700 : 600});
    }
    const px = cv.px(k - 1), py = cv.py(vals[k - 1]);
    svg.appendChild(K.el("path", {d: "M " + px + " " + py + " V " + (CY + CH), stroke: K.css("--stage-ink"),
                                   "stroke-width": 1, "stroke-dasharray": "3 3", fill: "none"}));
    svg.appendChild(K.el("circle", {cx: px, cy: py, r: 6, fill: K.css("--at-good"), stroke: K.css("--stage-ink"), "stroke-width": 2}));
    const low = k <= 2, anchor = k >= 8 ? "end" : "start";
    const lx = low ? px + 12 : anchor === "end" ? px + 8 : px - 8;
    K.text(svg, lx, low ? py + 20 : py - 12, K.num(vals[k - 1] * 100, 1, lang) + "%", {size: 16, anchor, weight: 700});
  }

  window.AlphaTensorScenes.register({
    id: "recurse", section: "11",
    hl: ["r"],
    copy: {en: EN, es: ES},

    controls: [
      {id: "k", type: "range", min: 1, max: KMAX, step: 1,
       fmt: (v, ctx) => v + " · n = " + K.num(Math.pow(2, v), 0, ctx && ctx.lang)},
      {id: "play", type: "play", target: "k", rate: 1.5}
    ],

    init(ctx) { ctx.state.k = KMAX; },

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) {
      return K.arrival(ctx, ENTRANCE) < 1 || !!(ctx.cache.kv && ctx.cache.kv.moving);
    },

    draw(ctx) {
      const k = ctx.state.k, r = AC.recursion(k), D = drawnLevels(k), c = ctx.copy;
      const e = entrance(ctx, D);
      const kv = K.chase(ctx.cache, "kv", k, ctx.now(), 0.16, ctx.instant);
      matrixPicture(ctx, k, e.levels);
      tileRows(ctx, k, e.levels);
      const svg = ctx.svg;
      K.text(svg, MX, MY + S + 30, c.cap, {size: 16, weight: 700, sans: true});
      K.text(svg, MX, MY + S + 54,
             k > D ? c.more(k - D) : c.left(k, K.num((1 - r.saving) * 100, 1, ctx.lang)),
             {size: 13, colour: "--stage-mute"});
      if (k > D) K.text(svg, MX, MY + S + 74, c.left(k, K.num((1 - r.saving) * 100, 1, ctx.lang)), {size: 13, colour: "--stage-mute"});
      K.text(svg, MX, MY + S + 108, c.omega.replace(/ · /, "  ·  "), {size: 15, weight: 700});
      barsPicture(ctx, r, kv, e.grow);
      curvePicture(ctx, k);
    },

    readout(ctx) {
      const c = ctx.copy, lang = ctx.lang, k = ctx.state.k, r = AC.recursion(k);
      const saved = K.num(r.saving * 100, 1, lang);
      const w = K.num(AC.OMEGA, 3, lang);
      return {
        html: c.read(saved, k, K.num(r.n, 0, lang), K.num(r.school, 0, lang), K.num(r.strassen, 0, lang),
                     K.num(r.ratio, 2, lang), w),
        claim: c.claim(k, K.num(r.n, 0, lang), saved),
        strip: {mode: "built", terms: STRASSEN, count: r.strassen},
        data: {
          saved: (r.saving * 100).toFixed(1), k: String(k), n: String(r.n),
          school: String(r.school), strassen: String(r.strassen),
          ratio: r.ratio.toFixed(2), omega: AC.OMEGA.toFixed(3)
        }
      };
    },

    code(ctx) {
      const np = ctx.copy.np, k = ctx.state.k, r = AC.recursion(k), lang = ctx.lang;
      return K.code([
        ["7 ** " + k, K.num(r.strassen, 0, lang) + " " + np.count],
        ["8 ** " + k, K.num(r.school, 0, lang) + " " + np.school],
        ["1 - (7 / 8) ** " + k, K.num(r.saving, 3, lang) + " " + np.saved],
        ["np.log2(7)", K.num(AC.OMEGA, 3, lang) + ": " + np.expo]
      ]);
    }
  });
})();
