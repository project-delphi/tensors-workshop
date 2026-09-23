// Scene 8: the same parameter budget, spent two ways. CP's error for R = 1
// to 6 as a line, every Tucker rank triple as a cloud, the best Tucker at
// every budget as a staircase, and one budget drawn as a line through both.
// A fair comparison holds the parameter count fixed, never the rank.
// See factor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const FC = window.FactorCore, K = window.FactorKit;

  const PLOT = {x: 72, y: 62, w: 470, h: 280, pmax: 210, emax: 0.11};
  const RS = [1, 2, 3, 4, 5, 6];

  function facts(ctx) {
    const T = ctx.taxi, s = ctx.state;
    const cp = RS.map((r) => ({r, params: FC.cpParams(T.shape, r), err: FC.cpAls(T, r, 100, 1).error}));
    const budget = FC.cpParams(T.shape, s.cpr);
    const search = FC.tuckerSearch(T, budget);
    // At R = 1 nothing fits, and that is the finding rather than a failure:
    // CP spends 4 + 5 + 24 = 33, and the smallest Tucker there is buys the
    // same three columns and then pays one more for a core.
    const pick = s.rule === "best-error" ? search.best : search.closest;
    const cheapest = FC.tuckerParams(T.shape, [1, 1, 1]);
    const cpAt = cp[s.cpr - 1];
    const same = FC.hosvd(T, [s.cpr, Math.min(s.cpr, 5), Math.min(s.cpr, 20)].map((r, m) => Math.min(r, [4, 5, 20][m])));
    const frontier = FC.tuckerFrontier(T);
    // Who wins at each of the six budgets, Tucker's best against CP.
    const wins = cp.map((q) => {
      const b = FC.tuckerSearch(T, q.params).best;
      return b ? (b.error < q.err ? "tucker" : "cp") : "none";
    });
    return {cp, budget, search, pick, cheapest, cpAt, same, frontier, wins};
  }

  const px = (p) => PLOT.x + (Math.min(p, PLOT.pmax) / PLOT.pmax) * PLOT.w;
  const py = (e) => PLOT.y + PLOT.h - (Math.min(e, PLOT.emax) / PLOT.emax) * PLOT.h;

  const EN = {
    k: "A fair comparison · section 11",
    h: "Compare CP and Tucker at the same number of parameters, never at the same rank",
    concept: "A CP rank and a Tucker rank are two different currencies: CP rank 3 costs 3(4 + 5 + 24) = 99 numbers here, Tucker (3, 3, 3) costs 27 + 12 + 15 + 72 = 126. The comparison that means something holds the storage fixed and asks which model spends it better.",
    claim: "CP R = 3: 99 params  ·  Tucker (3, 3, 2): 93 params",
    predict: "Before you slide: CP rank 3 and Tucker ranks (3, 3, 3) -- do they cost the same?",
    b: "<p>The gold line is CP's error for R = 1 to 6, each point at its own parameter count. Every other dot is a Tucker rank triple, at its own count and its own error; the purple staircase is the best Tucker there is at each budget. The dashed line is the budget CP spends at the rank you pick, and the ring is the Tucker triple the rule picks inside it. Click a gold point to move the budget there.</p><p>Held to the same budget, the answer depends on the budget: at 66 numbers Tucker wins, 4.69% against 7.00%; from 99 on, CP does. <b>Closest to the whole budget</b> spends as near the whole budget as it can and can hand Tucker a rank-1 axis, marked pink -- more numbers, spent where the tensor does not need them. The Tucker errors are HOSVD's and the CP ones are one run of ALS (seed 1, 100 sweeps), so both are good fits, not proven best ones.</p>",
    eqcap: "What each model costs: CP pays for three vectors per term; Tucker pays for a core as well as its three factors.",
    np: {
      cp: (n) => n + " numbers for CP",
      tucker: (n, r) => n + " for Tucker " + r,
      same: (n) => n + ": equal ranks, not an equal budget"
    },
    controls: {cpr: "CP rank, R (sets the budget)", rule: "Tucker picks by"},
    options: {rule: {"best-error": "best error inside the budget", "closest-params": "closest to the whole budget"}},
    axParams: "parameters →",
    axError: "↑ error",
    axCP: "CP",
    axFrontier: "best Tucker",
    axSame: (r, n) => "Tucker (" + r + "): " + n,
    axBudget: (n) => "budget " + n,
    axSpend: "where the numbers go",
    axCore: "core",
    axNone: (n) => "no Tucker fits under " + n,
    tipCP: (r, n, e) => "CP R = " + r + " · " + n + " params · " + e + "%",
    tipT: (r, n, e) => "Tucker (" + r + ") · " + n + " params · " + e + "%",
    claimFmt: (cpr, budget, tr, tp) => `CP R = ${cpr}: ${budget} params  ·  Tucker (${tr.join(", ")}): ${tp} params`,
    claimNone: (cpr, budget, cheapest) => `CP R = ${cpr}: ${budget} params  ·  Tucker: nothing under ${cheapest}`,
    readoutNone: (cpr, budget, cperr, cheapest) =>
      `CP at R = <b>${cpr}</b> spends <b>${budget}</b> parameters for <b>${cperr}%</b> error. ` +
      `No Tucker triple fits inside that budget at all: the smallest one there is, <b>(1, 1, 1)</b>, ` +
      `costs <b>${cheapest}</b> -- the same three columns CP buys, plus one number for the core.`,
    readout: (cpr, budget, cperr, tr, tp, terr, degenerate, better, wins) =>
      `CP at R = <b>${cpr}</b> spends <b>${budget}</b> parameters for <b>${cperr}%</b> error. ` +
      `Tucker <b>(${tr.join(", ")})</b> spends <b>${tp}</b> for <b>${terr}%</b>` +
      (degenerate ? ", with a rank-1 axis" : "") + `: <b>${better ? "Tucker wins" : "CP wins"}</b> at this budget. ` + wins,
    wins: (list) => "Across the six budgets: " + list + ".",
    winner: {tucker: "Tucker", cp: "CP", none: "no Tucker"},
    aria: (ctx) => {
      const s = ctx.state;
      return `A scatter of parameter count against error: CP's six points as a line, every Tucker rank triple as a cloud with the best at each budget as a staircase, ` +
             `a dashed line at CP rank ${s.cpr}'s budget and a ring on the Tucker triple the ${s.rule} rule picks inside it.`;
    }
  };
  const ES = {
    k: "Una comparación justa · sección 11",
    h: "Compara CP y Tucker con el mismo número de parámetros, nunca con el mismo rango",
    concept: "Un rango de CP y un rango de Tucker son dos monedas distintas: el rango 3 de CP cuesta aquí 3(4 + 5 + 24) = 99 números, Tucker (3, 3, 3) cuesta 27 + 12 + 15 + 72 = 126. La comparación que significa algo fija el almacenamiento y pregunta qué modelo lo gasta mejor.",
    claim: "CP R = 3: 99 parámetros  ·  Tucker (3, 3, 2): 93 parámetros",
    predict: "Antes de deslizar: el rango 3 de CP y los rangos (3, 3, 3) de Tucker, ¿cuestan lo mismo?",
    b: "<p>La línea dorada es el error de CP para R = 1 a 6, cada punto en su propio número de parámetros. Cada otro punto es un trío de rangos de Tucker, en su propio conteo y con su propio error; la escalera morada es el mejor Tucker que existe en cada presupuesto. La línea discontinua es el presupuesto que gasta CP en el rango que elijas, y el anillo es el trío de Tucker que la regla elige dentro de él. Haz clic en un punto dorado para mover el presupuesto allí.</p><p>Con el mismo presupuesto, la respuesta depende del presupuesto: con 66 números gana Tucker, un 4,69% contra un 7,00%; desde 99, gana CP. <b>Más cercano al presupuesto entero</b> gasta lo más cerca posible del presupuesto entero y puede darle a Tucker un eje de rango 1, marcado en rosa: más números, gastados donde el tensor no los necesita. Los errores de Tucker son los de HOSVD y los de CP son una ejecución de ALS (semilla 1, 100 barridos), así que los dos son buenos ajustes, no los mejores demostrados.</p>",
    eqcap: "Lo que cuesta cada modelo: CP paga tres vectores por término; Tucker paga un núcleo además de sus tres factores.",
    np: {
      cp: (n) => n + " números para CP",
      tucker: (n, r) => n + " para Tucker " + r,
      same: (n) => n + ": rangos iguales, presupuesto distinto"
    },
    controls: {cpr: "Rango de CP, R (fija el presupuesto)", rule: "Tucker elige por"},
    options: {rule: {"best-error": "mejor error dentro del presupuesto", "closest-params": "más cercano al presupuesto entero"}},
    axParams: "parámetros →",
    axError: "↑ error",
    axCP: "CP",
    axFrontier: "mejor Tucker",
    axSame: (r, n) => "Tucker (" + r + "): " + n,
    axBudget: (n) => "presupuesto " + n,
    axSpend: "a dónde van los números",
    axCore: "núcleo",
    axNone: (n) => "ningún Tucker cabe bajo " + n,
    tipCP: (r, n, e) => "CP R = " + r + " · " + n + " parámetros · " + e + "%",
    tipT: (r, n, e) => "Tucker (" + r + ") · " + n + " parámetros · " + e + "%",
    claimFmt: (cpr, budget, tr, tp) => `CP R = ${cpr}: ${budget} parámetros  ·  Tucker (${tr.join(", ")}): ${tp} parámetros`,
    claimNone: (cpr, budget, cheapest) => `CP R = ${cpr}: ${budget} parámetros  ·  Tucker: nada por debajo de ${cheapest}`,
    readoutNone: (cpr, budget, cperr, cheapest) =>
      `CP en R = <b>${cpr}</b> gasta <b>${budget}</b> parámetros para un error del <b>${cperr}%</b>. ` +
      `Ningún trío de Tucker cabe en ese presupuesto: el más pequeño que existe, <b>(1, 1, 1)</b>, ` +
      `cuesta <b>${cheapest}</b>: las mismas tres columnas que compra CP, más un número para el núcleo.`,
    readout: (cpr, budget, cperr, tr, tp, terr, degenerate, better, wins) =>
      `CP en R = <b>${cpr}</b> gasta <b>${budget}</b> parámetros para un error del <b>${cperr}%</b>. ` +
      `Tucker <b>(${tr.join(", ")})</b> gasta <b>${tp}</b> para un <b>${terr}%</b>` +
      (degenerate ? ", con un eje de rango 1" : "") + `: <b>${better ? "gana Tucker" : "gana CP"}</b> en este presupuesto. ` + wins,
    wins: (list) => "En los seis presupuestos: " + list + ".",
    winner: {tucker: "Tucker", cp: "CP", none: "ningún Tucker"},
    aria: (ctx) => {
      const s = ctx.state;
      const rule = s.rule === "best-error" ? "de mejor error" : "del presupuesto más cercano";
      return `Una dispersión de número de parámetros contra error: los seis puntos de CP como una línea, cada trío de rangos de Tucker como una nube con el mejor en cada presupuesto como una escalera, ` +
             `una línea discontinua en el presupuesto del rango ${s.cpr} de CP y un anillo en el trío de Tucker que elige dentro de él la regla ${rule}.`;
    }
  };

  window.FactorScenes.register({
    id: "budget", section: "11",
    part: {en: "A fair comparison", es: "Una comparación justa"},
    hl: ["rank", "core", "pickup", "dropoff", "hour"],
    copy: {en: EN, es: ES},

    controls: [
      {id: "cpr", type: "range", min: 1, max: 6, step: 1, fmt: (v) => "R = " + v},
      {id: "rule", type: "select", options: ["best-error", "closest-params"]}
    ],

    init(ctx) {
      ctx.state.cpr = 3;
      ctx.state.rule = "best-error";
    },

    pick(ctx, key) {
      if (key.startsWith("cpr:")) ctx.setControls({cpr: Number(key.slice(4))});
    },
    tip(ctx, key) {
      const c = ctx.copy, T = ctx.taxi;
      if (key.startsWith("cpr:")) {
        const r = Number(key.slice(4));
        return c.tipCP(r, FC.cpParams(T.shape, r), K.pct(FC.cpAls(T, r, 100, 1).error, 2, ctx.lang));
      }
      if (key.startsWith("tk:")) {
        const ranks = key.slice(3).split(",").map(Number);
        const cand = FC.tuckerCandidates(T).find((q) => q.ranks.join(",") === ranks.join(","));
        return cand ? c.tipT(ranks.join(", "), cand.params, K.pct(cand.error, 2, ctx.lang)) : "";
      }
      return "";
    },

    draw(ctx) {
      const svg = ctx.svg, c = ctx.copy, s = ctx.state;
      const f = facts(ctx);
      const X0 = PLOT.x, Y1 = PLOT.y + PLOT.h;
      svg.appendChild(K.el("line", {x1: X0, y1: Y1, x2: X0 + PLOT.w, y2: Y1, stroke: K.css("--stage-mute"), "stroke-width": 1}));
      svg.appendChild(K.el("line", {x1: X0, y1: Y1, x2: X0, y2: PLOT.y, stroke: K.css("--stage-mute"), "stroke-width": 1}));
      [0, 50, 100, 150, 200].forEach((p) => K.label(svg, px(p), Y1 + 14, String(p), {size: 9.5, anchor: "middle", colour: "--stage-mute"}));
      [0, 0.02, 0.04, 0.06, 0.08, 0.1].forEach((e) => K.label(svg, X0 - 6, py(e), (e * 100).toFixed(0) + "%", {size: 9.5, anchor: "end", baseline: "middle", colour: "--stage-mute"}));
      K.label(svg, X0 + PLOT.w, Y1 + 30, c.axParams, {size: 10, anchor: "end", colour: "--stage-mute"});
      K.label(svg, X0, PLOT.y - 12, c.axError, {size: 10, colour: "--stage-mute"});

      // The Tucker cloud, dim outside the budget and bright inside it.
      FC.tuckerCandidates(ctx.taxi).forEach((q) => {
        if (q.params > PLOT.pmax) return;
        const inside = q.params <= f.budget;
        const key = "tk:" + q.ranks.join(",");
        svg.appendChild(K.el("circle", {
          cx: px(q.params), cy: py(q.error), r: ctx.hover === key ? 4.4 : 2.6,
          fill: K.css(q.degenerate ? "--fa-err" : "--fa-core"), "fill-opacity": inside ? 0.8 : 0.22,
          "data-pick": key
        }));
      });
      // The best Tucker at every budget, as the staircase it is.
      const fr = f.frontier.filter((q) => q.params <= PLOT.pmax);
      let d = "";
      fr.forEach((q, i) => {
        const next = fr[i + 1] ? fr[i + 1].params : PLOT.pmax;
        d += (i ? "L" : "M") + px(q.params).toFixed(1) + " " + py(q.error).toFixed(1) + "L" + px(next).toFixed(1) + " " + py(q.error).toFixed(1);
      });
      svg.appendChild(K.el("path", {d, fill: "none", stroke: K.css("--fa-core"), "stroke-width": 1.8}));
      // Named where the staircase is alone: under its step at about 60
      // parameters, well left of CP's line.
      const named = fr.reduce((a, q) => (Math.abs(q.params - 60) < Math.abs(a.params - 60) ? q : a), fr[0]);
      K.label(svg, px(named.params) + 6, py(named.error) + 14, c.axFrontier, {size: 10, colour: "--fa-core"});
      // The budget, and the triple the rule picks inside it.
      svg.appendChild(K.el("line", {x1: px(f.budget), y1: PLOT.y, x2: px(f.budget), y2: Y1, stroke: K.css("--stage-ink"), "stroke-width": 1, "stroke-dasharray": "5 4"}));
      K.label(svg, px(f.budget), PLOT.y - 12, c.axBudget(f.budget), {size: 10, anchor: "middle"});
      // Equal ranks, for comparison: never the same budget.
      if (f.same.params <= PLOT.pmax) {
        svg.appendChild(K.el("circle", {cx: px(f.same.params), cy: py(f.same.error), r: 5.5, fill: "none", stroke: K.css("--stage-ink"), "stroke-width": 1.2, "stroke-dasharray": "2 2"}));
        K.label(svg, px(f.same.params) + 4, py(f.same.error) - 16, c.axSame(f.same.ranks.join(", "), f.same.params), {size: 9.5, colour: "--stage-mute"});
      }
      if (f.pick) {
        svg.appendChild(K.el("line", {x1: px(f.cpAt.params), y1: py(f.cpAt.err), x2: px(f.pick.params), y2: py(f.pick.error),
          stroke: K.css("--stage-ink"), "stroke-width": 1.2, "stroke-dasharray": "3 3"}));
        svg.appendChild(K.el("circle", {cx: px(f.pick.params), cy: py(f.pick.error), r: 7, fill: "none",
          stroke: K.css(f.pick.degenerate ? "--fa-err" : "--fa-core"), "stroke-width": 2.4}));
      } else {
        K.label(svg, X0 + 16, PLOT.y + 30, c.axNone(f.cheapest), {size: 10.5, colour: "--fa-err"});
      }
      // CP last, on top: a line through its six points.
      svg.appendChild(K.el("polyline", {
        points: f.cp.map((q) => px(q.params).toFixed(1) + "," + py(q.err).toFixed(1)).join(" "),
        fill: "none", stroke: K.css("--fa-t"), "stroke-width": 2
      }));
      f.cp.forEach((q) => {
        const key = "cpr:" + q.r;
        svg.appendChild(K.el("circle", {cx: px(q.params), cy: py(q.err), r: q.r === s.cpr ? 6.5 : (ctx.hover === key ? 5.5 : 4.2),
          fill: K.css("--fa-t"), stroke: K.css("--stage"), "stroke-width": 1.2}));
        // A hit target bigger than the dot.
        svg.appendChild(K.el("circle", {cx: px(q.params), cy: py(q.err), r: 11, fill: "transparent", "data-pick": key}));
      });
      K.label(svg, px(f.cp[0].params) + 8, py(f.cp[0].err) - 10, c.axCP, {size: 10.5, colour: "--fa-t", stroke: ctx.hl === "rank" ? "--fa-t" : undefined});

      // Where each model's numbers go, as two stacked bars on one scale.
      const BX = 590, BW = 200;
      const scale = BW / Math.max(f.budget, f.pick ? f.pick.params : 0, 1);
      K.label(svg, BX, PLOT.y - 12, c.axSpend, {size: 10, colour: "--stage-mute"});
      const seg = (y, parts) => {
        let x = BX;
        parts.forEach((p) => {
          const w = p.n * scale;
          const on = ctx.hl && ctx.hl === p.hl;
          svg.appendChild(K.el("rect", {x, y, width: Math.max(0.5, w - 1), height: 22, fill: K.css(p.token),
            "fill-opacity": on ? 1 : 0.7, stroke: on ? K.css("--stage-ink") : "none", "stroke-width": on ? 1.4 : 0}));
          if (w > 22) K.label(svg, x + w / 2, y + 36, String(p.n), {size: 9.5, anchor: "middle", colour: p.token});
          x += w;
        });
      };
      const R = s.cpr;
      K.label(svg, BX, 96, "CP · " + f.budget, {size: 10.5, colour: "--fa-t"});
      seg(104, [{n: 4 * R, token: "--fa-m0", hl: "pickup"}, {n: 5 * R, token: "--fa-m1", hl: "dropoff"}, {n: 24 * R, token: "--fa-m2", hl: "hour"}]);
      if (f.pick) {
        const [r0, r1, r2] = f.pick.ranks;
        K.label(svg, BX, 186, "Tucker (" + f.pick.ranks.join(", ") + ") · " + f.pick.params, {size: 10.5, colour: "--fa-core"});
        seg(194, [{n: r0 * r1 * r2, token: "--fa-core", hl: "core"}, {n: 4 * r0, token: "--fa-m0", hl: "pickup"},
                  {n: 5 * r1, token: "--fa-m1", hl: "dropoff"}, {n: 24 * r2, token: "--fa-m2", hl: "hour"}]);
        K.label(svg, BX, 262, c.axCore + " = " + r0 + " × " + r1 + " × " + r2, {size: 9.5, colour: "--fa-core"});
      }
    },

    readout(ctx) {
      const s = ctx.state, c = ctx.copy;
      const f = facts(ctx);
      const pct = (v) => K.pct(v, 2, ctx.lang);
      const winsTxt = c.wins(f.cp.map((q, i) => q.params + " → " + c.winner[f.wins[i]]).join(", "));
      const common = {cpr: s.cpr, budget: f.budget, cperr: f.cpAt.err.toFixed(4), cheapest: f.cheapest, rule: s.rule,
                      wins: f.wins.join(","), sameparams: f.same.params};
      if (!f.pick) {
        return {
          html: c.readoutNone(s.cpr, f.budget, pct(f.cpAt.err), f.cheapest),
          claim: c.claimNone(s.cpr, f.budget, f.cheapest),
          data: Object.assign(common, {tuckerfits: "0", tuckerranks: "", tuckerparams: "", tuckererr: "", degenerate: "0", better: "0"})
        };
      }
      const better = f.pick.error < f.cpAt.err;
      return {
        html: c.readout(s.cpr, f.budget, pct(f.cpAt.err), f.pick.ranks, f.pick.params, pct(f.pick.error), f.pick.degenerate, better, winsTxt),
        claim: c.claimFmt(s.cpr, f.budget, f.pick.ranks, f.pick.params),
        data: Object.assign(common, {
          tuckerfits: "1", tuckerranks: f.pick.ranks.join(","), tuckerparams: f.pick.params,
          tuckererr: f.pick.error.toFixed(4), degenerate: f.pick.degenerate ? "1" : "0", better: better ? "1" : "0"
        })
      };
    },

    code(ctx) {
      const s = ctx.state, c = ctx.copy.np;
      const f = facts(ctx);
      const rows = [["R = " + s.cpr, ""], ["R * sum(T.shape)", c.cp(f.budget)]];
      if (f.pick) {
        rows.push(["r = (" + f.pick.ranks.join(", ") + ")", ""]);
        rows.push(["np.prod(r) + np.dot(T.shape, r)", c.tucker(f.pick.params, "(" + f.pick.ranks.join(", ") + ")")]);
      }
      rows.push(["rr = (" + f.same.ranks.join(", ") + ")", ""]);
      rows.push(["np.prod(rr) + np.dot(T.shape, rr)", c.same(f.same.params)]);
      return K.code(rows);
    }
  });
})();
