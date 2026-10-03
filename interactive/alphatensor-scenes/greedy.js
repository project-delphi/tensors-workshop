// Scene 11: always taking the best-looking move. From the full cube there are
// 128,000 moves; the histogram sorts them by how many nonzero cells each one
// leaves (bars to the left of the marker help, to the right hurt), and the
// answer is a sliver: 8 help, and they are the eight single cells, so a
// greedy player plays the schoolbook rule and needs 8, never 7. Strassen's
// own first move is among the 127,816 that raise the count. The slider plays
// k of Strassen's moves first and lets greedy look from there; the right half
// draws the two games as lines over moves, with greedy's continuation from
// the marked position. After Strassen's first move greedy's best reply is to
// take it back. The entrance raises the bars, the helping ones last. Flat:
// SVG only. The census is 128,000 moves (about 40 ms) so it is computed on
// demand, never in init, and remembered per k.
// See alphatensor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const AC = window.AlphaTensorCore, K = window.AlphaTensorKit;

  const N = 4, T = AC.tensor(2), F = AC.STRASSEN, R = F.U.length;   // 7 moves
  const ENTRANCE = 2400;

  // The histogram.
  const HX0 = 66, HX1 = 502, HBASE = 396, HTOP = 168, HMAX = 64;
  // The two games.
  const GX0 = 588, GX1 = 796, GBASE = 356, GTOP = 128, GMOVES = 10, GCELLS = 12;

  // Everything the picture and the readout need, per k, remembered.
  const MEMO = [];
  function facts(ctx) {
    const k = Math.max(0, Math.min(R, Math.round(ctx.state.k)));
    if (MEMO[k]) return MEMO[k];
    const blocks = AC.blocksOf(F, k), P = AC.play(T, blocks), pos = P.owed;
    const S = AC.survey(pos, N), G = AC.greedyPeel(pos, N);
    const full = AC.play(T, AC.blocksOf(F)).trail;
    const bx = AC.rankOne(S.best.u, S.best.v, S.best.w);
    let takesBack = false;
    if (k > 0) {
      const last = AC.rankOne(F.U[k - 1], F.V[k - 1], F.W[k - 1]);
      takesBack = last.every((v, i) => bx[i] === -v);
    }
    const lit = [];
    bx.forEach((v, i) => { if (v) lit.push(i); });
    return MEMO[k] = {
      k, blocks, S, G, full, now: S.before, best: S.best.nnz, takesBack, lit,
      gTotal: k + G.moves.length, gTrail: G.trail,
      left: G.solved ? 0 : G.trail[G.trail.length - 1]
    };
  }
  let ORD = null;
  const orders = () => ORD || (ORD = AC.orderings(T, F));

  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  const EN = {
    tab: "greedy",
    k: "Section 11 · the best-looking move",
    h: "Taking the best-looking move every turn does not find Strassen's seven",
    predict: "From the full cube there are 128,000 different moves: the distinct blocks counted in the last " +
             "picture. How many of them leave fewer than 8 nonzero cells?",
    concept: "We cannot look at every game, so play one game well: at each turn take the move that leaves the " +
             "fewest nonzero cells. For a matrix that works, because the SVD peels off the best layer every time. " +
             "On this cube it does not: the cell count has to go up before it can come down.",
    b: "Each bar counts the moves that leave that many cells. <b>Slide</b> to play some of Strassen's seven " +
       "moves first, then let greedy look from there. After Strassen's first move the best-looking reply is " +
       "to take it back, and from there greedy needs 10 moves in all. Strassen's seven moves, in any of the " +
       "5,040 orders, climb to at least 10 cells before they fall.",
    eqcap: "The count greedy minimises: the number of cells (i, j, k) where the cube S is not zero. A move " +
           "subtracts a block, and greedy keeps the move that leaves this count lowest.",
    claim: (k, lower, raise) => "after " + k + " of Strassen's · " + lower + " lower it · " + raise + " raise it",
    lower: "lower it", same: "keep it", raise: "raise it",
    rise: (n) => "by up to " + n,
    now: (n) => "now: " + n + " cells",
    axisX: "cells left after the move",
    axisY: "moves (square-root scale)",
    fewer: "fewer cells", equal: "same", more: "more cells",
    gTitle: "Cells left after each move",
    gMoves: "moves played",
    lines: {
      strassen: (n) => "Strassen: " + n + " moves",
      school: (n) => "Schoolbook: " + n + " moves",
      greedy: (n, k) => k ? "Greedy from here: " + n + " in all" : "Greedy from the start: " + n
    },
    here: "now",
    words: {0: "None", 8: "Eight"},
    read: (f, v) => {
      let s = "<b>" + v.lead + "</b> of the 128,000 moves lower the count" +
        (f.k === 0 ? ": they are the eight single cells, so greedy plays the schoolbook rule, " +
                     f.gTotal + " moves, never 7." : ".") +
        " From this position " + v.same + " keep it at " + f.now + " and " + v.raise +
        " raise it, by as much as " + f.S.maxRise + ". ";
      if (f.k === 0) {
        s += "Strassen's first move is not a helper: it takes " + f.now + " up to " + f.full[1] + ".";
      } else if (f.now === 0) {
        s += "The cube is empty, so every move can only add cells: greedy has nothing to do, and " +
             "Strassen's " + f.k + " moves are the whole game.";
      } else {
        s += "Strassen's move " + f.k + " left " + f.now + ". Greedy's best reply leaves " + f.best +
             (f.takesBack ? " (it takes the move back)" : "") + ", and it needs " + f.gTotal +
             " moves in all, against Strassen's " + R + ".";
      }
      return s + " In all " + v.orders + " orders of Strassen's seven, the count reaches at least " +
        v.low + " before it falls.";
    },
    aria: (ctx) => {
      const f = facts(ctx);
      return "A histogram of the 128,000 moves by how many nonzero cells they leave, and two lines of cells " +
             "left over moves. After " + f.k + " of Strassen's moves the cube has " + f.now + " nonzero cells: " +
             f.S.lower + " moves lower the count, " + f.S.same + " keep it and " + f.S.raise +
             " raise it. Greedy finishes in " + f.gTotal + " moves in all.";
    },
    controls: {k: "Strassen's moves played first", play: "▶ Play Strassen's moves"},
    fmtK: (v) => "after " + v + " of Strassen's",
    np: {
      every: "(128000, 4, 4, 4): every block",
      lower: (n) => n + " lower the count",
      same: (n) => n + " keep it",
      raise: (n) => n + " raise it"
    }
  };

  const ES = {
    tab: "voraz",
    k: "Sección 11 · la jugada que mejor se ve",
    h: "Tomar siempre la jugada que mejor se ve no encuentra las siete de Strassen",
    predict: "Desde el cubo completo hay 128.000 jugadas distintas: los bloques distintos que contó la " +
             "imagen anterior. ¿Cuántas de ellas dejan menos de 8 celdas distintas de cero?",
    concept: "No podemos mirar todas las partidas, así que juega una bien: en cada turno, toma la jugada " +
             "que deja menos celdas distintas de cero. Con una matriz funciona, porque la SVD arranca la " +
             "mejor capa cada vez. Con este cubo no: la cuenta de celdas tiene que subir antes de poder bajar.",
    b: "Cada barra cuenta las jugadas que dejan ese número de celdas. <b>Desliza</b> para jugar antes " +
       "algunas de las siete jugadas de Strassen y deja que el voraz mire desde ahí. Tras la primera " +
       "jugada de Strassen, la respuesta que mejor se ve es deshacerla, y desde ahí el voraz necesita 10 " +
       "jugadas en total. Las siete jugadas de Strassen, en cualquiera de los 5.040 órdenes, suben por " +
       "lo menos a 10 celdas antes de bajar.",
    eqcap: "La cuenta que minimiza el voraz: el número de celdas (i, j, k) donde el cubo S no es cero. " +
           "Una jugada resta un bloque, y el voraz se queda con la que deja esta cuenta más baja.",
    claim: (k, lower, raise) => "tras " + k + " de Strassen · " + lower + " la bajan · " + raise + " la suben",
    lower: "la bajan", same: "la mantienen", raise: "la suben",
    rise: (n) => "hasta " + n + " más",
    now: (n) => "ahora: " + n + " celdas",
    axisX: "celdas que quedan tras la jugada",
    axisY: "jugadas (escala de raíz cuadrada)",
    fewer: "menos celdas", equal: "igual", more: "más celdas",
    gTitle: "Celdas que quedan tras cada jugada",
    gMoves: "jugadas hechas",
    lines: {
      strassen: (n) => "Strassen: " + n + " jugadas",
      school: (n) => "Regla escolar: " + n + " jugadas",
      greedy: (n, k) => k ? "Voraz desde aquí: " + n + " en total" : "Voraz desde el inicio: " + n
    },
    here: "ahora",
    words: {0: "Ninguna", 8: "Ocho"},
    read: (f, v) => {
      let s = "<b>" + v.lead + "</b> de las 128.000 jugadas " + (v.lowerN <= 1 ? "baja" : "bajan") +
        " la cuenta" +
        (f.k === 0 ? ": son las ocho celdas sueltas, así que el voraz juega la regla escolar, " +
                     f.gTotal + " jugadas, nunca 7." : ".") +
        " Desde esta posición " + v.same + " la mantienen en " + f.now + " y " + v.raise +
        " la suben, hasta " + f.S.maxRise + " celdas más. ";
      if (f.k === 0) {
        s += "La primera jugada de Strassen no es de las que ayudan: lleva la cuenta de " + f.now + " a " +
             f.full[1] + ".";
      } else if (f.now === 0) {
        s += "El cubo está vacío, así que toda jugada solo puede añadir celdas: el voraz no tiene nada " +
             "que hacer, y las " + f.k + " jugadas de Strassen son la partida entera.";
      } else {
        s += "La jugada " + f.k + " de Strassen dejó " + f.now + ". La mejor respuesta del voraz deja " +
             f.best + (f.takesBack ? " (deshace la jugada)" : "") + ", y necesita " + f.gTotal +
             " jugadas en total, frente a las " + R + " de Strassen.";
      }
      return s + " En los " + v.orders + " órdenes de las siete jugadas de Strassen, la cuenta llega por " +
        "lo menos a " + v.low + " antes de bajar.";
    },
    aria: (ctx) => {
      const f = facts(ctx);
      return "Un histograma de las 128.000 jugadas según cuántas celdas distintas de cero dejan, y dos líneas " +
             "de celdas restantes sobre las jugadas. Tras " + f.k + " jugadas de Strassen el cubo tiene " +
             f.now + " celdas distintas de cero: " + f.S.lower + " jugadas bajan la cuenta, " + f.S.same +
             " la mantienen y " + f.S.raise + " la suben. El voraz termina en " + f.gTotal + " jugadas en total.";
    },
    controls: {k: "Jugadas de Strassen hechas antes", play: "▶ Jugar las de Strassen"},
    fmtK: (v) => "tras " + v + " de Strassen",
    np: {
      every: "(128000, 4, 4, 4): cada bloque",
      lower: (n) => n + " bajan la cuenta",
      same: (n) => n + " la mantienen",
      raise: (n) => n + " la suben"
    }
  };

  window.AlphaTensorScenes.register({
    id: "greedy", section: "11",
    hl: ["a", "b", "c"],
    copy: {en: EN, es: ES},

    controls: [
      {id: "k", type: "range", min: 0, max: R, step: 1, fmt: (v, ctx) => ((ctx && ctx.copy) || EN).fmtK(v)},
      {id: "play", type: "play", target: "k", rate: 0.7}
    ],

    init(ctx) { ctx.state.k = 0; },

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) { return K.arrival(ctx, ENTRANCE) < 1; },

    // The strip: the first of Strassen's moves that touches the cell.
    seek(ctx, idx) {
      for (let r = 0; r < R; r++) {
        if (AC.rankOne(F.U[r], F.V[r], F.W[r])[idx]) { ctx.setControls({k: r + 1}); return; }
      }
    },

    draw(ctx) {
      const svg = ctx.svg, c = ctx.copy, f = facts(ctx), S = f.S, hist = S.hist;
      const t = K.arrival(ctx, ENTRANCE), hlit = !!ctx.hl;
      const fmtN = (n) => K.num(n, 0, ctx.lang);

      // ----------------------------------------------------- the three totals
      const tot = [
        [HX0, S.lower, c.lower, "--at-good"],
        [HX0 + 120, S.same, c.same, "--stage-ink"],
        [HX0 + 250, S.raise, c.raise, "--at-bad"]
      ];
      tot.forEach(([x, n, word, col], i) => {
        K.text(svg, x, 92, fmtN(n), {size: 28, weight: 700, colour: col});
        K.text(svg, x, 112, word + (i === 2 ? " · " + c.rise(S.maxRise) : ""), {size: 12.5, colour: col, sans: true});
      });

      // -------------------------------------------------------- the histogram
      let lo = HMAX;
      for (let i = 0; i <= HMAX; i++) if (hist[i]) { lo = i; break; }
      lo = Math.min(lo, f.now);
      const n = HMAX - lo + 1, bw = (HX1 - HX0) / n;
      const px = (i) => HX0 + (i - lo + 0.5) * bw;
      let peak = 1;
      for (let i = lo; i <= HMAX; i++) peak = Math.max(peak, hist[i]);
      const H = HBASE - HTOP, hOf = (v) => (v ? Math.max(5, Math.sqrt(v / peak) * H) : 0);

      // gridlines at a few counts, on the square-root scale
      [100, 1000, 4000].filter((g) => g < peak).forEach((g) => {
        const y = HBASE - hOf(g);
        svg.appendChild(K.el("line", {x1: HX0, x2: HX1, y1: y, y2: y, stroke: K.css("--stage-mute"),
                                      "stroke-opacity": 0.28, "stroke-width": 1, "stroke-dasharray": "3 4"}));
        K.text(svg, HX0 - 6, y + 4, fmtN(g), {size: 11, anchor: "end", colour: "--stage-mute"});
      });
      svg.appendChild(K.el("line", {x1: HX0, x2: HX1, y1: HBASE, y2: HBASE, stroke: K.css("--stage-mute"), "stroke-width": 1.5}));
      K.text(svg, HX0 - 6, HBASE + 4, "0", {size: 11, anchor: "end", colour: "--stage-mute"});

      for (let i = lo; i <= HMAX; i++) {
        if (!hist[i]) continue;
        const help = i < f.now, start = help ? 0.62 : ((i - lo) / n) * 0.5;
        const grow = K.smooth(clamp01((t - start) / 0.3));
        const h = hOf(hist[i]) * grow;
        if (h <= 0) continue;
        const col = help ? "--at-good" : (i === f.now ? "--stage-mute" : "--at-bad");
        svg.appendChild(K.el("rect", {x: px(i) - bw / 2 + 0.7, y: HBASE - h, width: Math.max(1, bw - 1.4), height: h,
                                      fill: K.css(col)}));
      }

      // counts printed over a few bars: the marker's, the helpers, the peak
      const placed = [];
      const putCount = (i) => {
        if (i < lo || i > HMAX || !hist[i] || placed.some((j) => Math.abs(j - i) < 4)) return;
        placed.push(i);
        const help = i < f.now;
        K.text(svg, px(i), HBASE - hOf(hist[i]) - 6, fmtN(hist[i]),
               {size: help ? 14 : 12, anchor: "middle", weight: 700,
                colour: help ? "--at-good" : (i === f.now ? "--stage-ink" : "--stage-ink")});
      };
      let tallestHelp = -1;
      for (let i = lo; i < f.now; i++) if (hist[i] && (tallestHelp < 0 || hist[i] > hist[tallestHelp])) tallestHelp = i;
      if (t >= 1) {
        putCount(tallestHelp);
        putCount(f.now);
        let pk = lo;
        for (let i = lo; i <= HMAX; i++) if (hist[i] > hist[pk]) pk = i;
        putCount(pk);
      }

      // the marker: the cell count of this position
      const mx = px(f.now);
      svg.appendChild(K.el("line", {x1: mx, x2: mx, y1: HTOP - 22, y2: HBASE + 6, stroke: K.css("--stage-ink"),
                                    "stroke-width": hlit ? 3 : 1.6, "stroke-dasharray": "5 3"}));
      svg.appendChild(K.el("path", {d: "M " + (mx - 6) + " " + (HBASE + 14) + " L " + mx + " " + (HBASE + 5) +
                                       " L " + (mx + 6) + " " + (HBASE + 14) + " Z", fill: K.css("--stage-ink")}));
      const mAnchor = mx < HX0 + 60 ? "start" : (mx > HX1 - 60 ? "end" : "middle");
      K.text(svg, mAnchor === "start" ? mx - 6 : (mAnchor === "end" ? mx + 6 : mx), HTOP - 28, c.now(f.now),
             {size: 13, weight: 700, anchor: mAnchor});

      // x axis: ticks every 8, the axis in words, and the colour key
      for (let v = Math.ceil(lo / 8) * 8; v <= HMAX; v += 8) {
        K.text(svg, px(v), HBASE + 30, String(v), {size: 11.5, anchor: "middle", colour: "--stage-mute"});
      }
      if (lo % 8 && px(Math.ceil(lo / 8) * 8) - px(lo) > 44) K.text(svg, px(lo), HBASE + 30, String(lo), {size: 11.5, anchor: "middle", colour: "--stage-mute"});
      K.text(svg, (HX0 + HX1) / 2, HBASE + 50, c.axisX + " · " + c.axisY,
             {size: 12.5, anchor: "middle", colour: hlit ? "--stage-ink" : "--stage-mute", weight: hlit ? 700 : 600});
      [[c.fewer, "--at-good"], [c.equal, "--stage-mute"], [c.more, "--at-bad"]].forEach(([w, col], i) => {
        const x = HX0 + 6 + i * 150;
        svg.appendChild(K.el("rect", {x, y: HBASE + 63, width: 11, height: 11, fill: K.css(col)}));
        K.text(svg, x + 17, HBASE + 73, w, {size: 12, colour: "--stage-ink"});
      });

      // -------------------------------------------------- the two games, right
      const gx = (m) => GX0 + (m / GMOVES) * (GX1 - GX0);
      const gy = (v) => GBASE - (v / GCELLS) * (GBASE - GTOP);
      K.text(svg, GX0 - 28, 84, c.gTitle, {size: 13, weight: 700, sans: true});
      [0, 4, 8, 12].forEach((v) => {
        svg.appendChild(K.el("line", {x1: GX0 - 4, x2: GX1 + 4, y1: gy(v), y2: gy(v), stroke: K.css("--stage-mute"),
                                      "stroke-opacity": v ? 0.25 : 0.7, "stroke-width": 1}));
        K.text(svg, GX0 - 10, gy(v) + 4, String(v), {size: 11.5, anchor: "end", colour: "--stage-mute"});
      });
      for (let m = 0; m <= GMOVES; m += 2) {
        K.text(svg, gx(m), GBASE + 18, String(m), {size: 11.5, anchor: "middle", colour: "--stage-mute"});
      }
      K.text(svg, (GX0 + GX1) / 2, GBASE + 36, c.gMoves, {size: 12, anchor: "middle", colour: "--stage-mute"});

      const path = (pts) => pts.map((p, i) => (i ? "L " : "M ") + gx(p[0]).toFixed(1) + " " + gy(p[1]).toFixed(1)).join(" ");
      const school = [8, 7, 6, 5, 4, 3, 2, 1, 0].map((v, m) => [m, v]);
      svg.appendChild(K.el("path", {d: path(school), fill: "none", stroke: K.css("--stage-mute"), "stroke-width": 2.2,
                                    "stroke-dasharray": "6 4"}));
      const str = f.full.map((v, m) => [m, v]);
      svg.appendChild(K.el("path", {d: path(str), fill: "none", stroke: K.css("--at-pos"), "stroke-width": 3,
                                    "stroke-linejoin": "round"}));
      const gr = f.gTrail.map((v, j) => [f.k + j, v]);
      if (gr.length > 1) {
        svg.appendChild(K.el("path", {d: path(gr), fill: "none", stroke: K.css("--at-good"), "stroke-width": 3.6,
                                      "stroke-linejoin": "round"}));
      }
      str.forEach(([m, v]) => {
        svg.appendChild(K.el("circle", {cx: gx(m), cy: gy(v), r: 4, fill: K.css("--at-pos")}));
        K.text(svg, gx(m), gy(v) - 14, String(v), {size: 12, anchor: "middle", weight: 700, colour: "--stage-ink"});
      });
      gr.forEach(([m, v], j) => {
        svg.appendChild(K.el("circle", {cx: gx(m), cy: gy(v), r: 3.6, fill: K.css("--at-good")}));
        const shared = str[m] && str[m][1] === v;
        if (j && !shared) K.text(svg, gx(m), gy(v) + (v ? 18 : -10), String(v), {size: 12, anchor: "middle", weight: 700, colour: "--at-good"});
      });
      // where Strassen's game stands
      svg.appendChild(K.el("line", {x1: gx(f.k), x2: gx(f.k), y1: gy(str[f.k][1]) + 9, y2: GBASE, stroke: K.css("--stage-ink"),
                                    "stroke-width": 1.4, "stroke-dasharray": "3 3"}));
      svg.appendChild(K.el("circle", {cx: gx(f.k), cy: gy(str[f.k][1]), r: 9, fill: "none", stroke: K.css("--stage-ink"), "stroke-width": 2.4}));

      const leg = [
        [c.lines.strassen(R), "--at-pos", false],
        [c.lines.school(8), "--stage-mute", true],
        [c.lines.greedy(f.gTotal, f.k), "--at-good", false]
      ];
      leg.forEach(([w, col, dash], i) => {
        const y = GBASE + 62 + i * 24;
        svg.appendChild(K.el("line", {x1: GX0 - 24, x2: GX0 + 4, y1: y - 4, y2: y - 4, stroke: K.css(col),
                                      "stroke-width": 3.4, "stroke-dasharray": dash ? "6 4" : "none"}));
        K.text(svg, GX0 + 10, y, w, {size: 12.5, colour: "--stage-ink"});
      });
    },

    readout(ctx) {
      const c = ctx.copy, f = facts(ctx), S = f.S, o = orders();
      const fmtN = (n) => K.num(n, 0, ctx.lang);
      const lead = S.lower === 0 || S.lower === 8 ? c.words[S.lower] : fmtN(S.lower);
      return {
        html: c.read(f, {lead, lowerN: S.lower, same: fmtN(S.same), raise: fmtN(S.raise),
                         orders: fmtN(o.orders), low: o.lowPeak}),
        claim: c.claim(f.k, fmtN(S.lower), fmtN(S.raise)),
        strip: {mode: "owed", terms: f.blocks, count: f.k, lit: f.lit},
        data: {
          raise: String(S.raise), lower: String(S.lower), same: String(S.same), total: String(S.total),
          maxrise: String(S.maxRise), k: String(f.k), now: String(f.now), best: String(f.best),
          takesback: f.takesBack ? "1" : "0", greedytotal: String(f.gTotal),
          peaklow: String(o.lowPeak), peakhigh: String(o.highPeak)
        }
      };
    },

    code(ctx) {
      const np = ctx.copy.np, f = facts(ctx), S = f.S, fmtN = (n) => K.num(n, 0, ctx.lang);
      return K.code([
        ["moves.shape", np.every],
        "after = np.count_nonzero(S - moves, axis=(1, 2, 3))",
        ["(after < " + f.now + ").sum()", np.lower(fmtN(S.lower))],
        ["(after == " + f.now + ").sum()", np.same(fmtN(S.same))],
        ["(after > " + f.now + ").sum()", np.raise(fmtN(S.raise))]
      ]);
    }
  });
})();
