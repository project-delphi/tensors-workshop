// Scene 7: the same parameter budget, spent two ways. Every Tucker rank
// triple that fits inside one CP rank's parameter count, scored by its own
// error -- a fair comparison only holds a budget fixed, never a rank.
// See factor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const FC = window.FactorCore, K = window.FactorKit;

  const EN = {
    k: "A fair comparison · section 11",
    h: "CP and Tucker spend the same parameter budget differently",
    concept: "Comparing a CP rank to a Tucker rank directly is comparing two different currencies. Comparing them at the same parameter count -- the same storage cost -- is the comparison that is actually fair. <span class=\"cite\">Deep Learning §2.1</span>",
    claim: "CP R = 3: 99 params  ·  Tucker (3, 3, 2): 93 params",
    predict: "Before you slide: does the best Tucker triple inside a CP rank's budget always beat CP's own error, or can spending the same numbers on Tucker's shape do worse?",
    b: "<p>CP at rank R spends R(4 + 5 + 24) parameters. The cloud is every Tucker rank triple (r0, r1, r2) whose own 480 → params count fits inside that same budget, plotted by its HOSVD error; the CP point at this R joins the Tucker triple the current rule picks.</p><p><b>Best error</b> picks the lowest-error triple in the cloud, whatever ranks that takes. <b>Closest params</b> picks the triple that spends closest to the full budget instead — and that can mean a degenerate rank-1 axis, marked in the error colour, that spends its numbers somewhere the tensor does not need them.</p>",
    controls: {cpr: "CP rank, R", rule: "Tucker picks by"},
    // Drawn on the stage. Every visible string is translated, including the
    // ones inside the picture -- the stage is not chrome, and a literal here
    // renders the same under a Spanish heading.
    axParams: "parameters →",
    axError: "↑ error",
    axKey: "gold: CP  ·  pink: degenerate Tucker  ·  teal: Tucker",
    options: {rule: {"best-error": "best error", "closest-params": "closest params"}},
    // The claim card is rebuilt on every change, so its words are here
    // rather than in the scene: "params" reads the same in English under
    // either rule, and the Spanish table has its own.
    claimFmt: (cpr, budget, tr, tp) =>
      `CP R = ${cpr}: ${budget} params  ·  Tucker (${tr.join(", ")}): ${tp} params`,
    claimNone: (cpr, budget, cheapest) =>
      `CP R = ${cpr}: ${budget} params  ·  Tucker: nothing under ${cheapest}`,
    axNone: (cheapest) => `no Tucker triple fits this budget — the smallest one there is costs ${cheapest}`,
    readoutNone: (cpr, budget, cperr, cheapest) =>
      `CP at R = <b>${cpr}</b> spends <b>${budget}</b> parameters for <b>${(cperr * 100).toFixed(2)}%</b> error. ` +
      `No Tucker triple fits inside that budget at all: the smallest one there is, <b>(1, 1, 1)</b>, ` +
      `costs <b>${cheapest}</b> — the same three columns CP buys, plus one number for the core.`,
    readout: (cpr, budget, cperr, tr, tp, terr, degenerate, better) =>
      `CP at R = <b>${cpr}</b> spends <b>${budget}</b> parameters for <b>${(cperr * 100).toFixed(2)}%</b> error. ` +
      `The <b>${tr.join(", ")}</b> Tucker triple spends <b>${tp}</b> for <b>${(terr * 100).toFixed(2)}%</b> error` +
      (degenerate ? ", with a degenerate rank-1 axis" : "") + `, ${better ? "beating" : "losing to"} CP at this budget.`,
    aria: (ctx) => {
      const s = ctx.state;
      return `A scatter of parameter count against error: six CP points for R 1 through 6, a cloud of Tucker rank triples within R = ${s.cpr}'s budget, and a line joining the CP point to the triple the ${s.rule} rule picks.`;
    }
  };
  const ES = {
    k: "Una comparación justa · sección 11",
    h: "CP y Tucker gastan el mismo presupuesto de parámetros de forma distinta",
    concept: "Comparar un rango de CP con un rango de Tucker directamente es comparar dos monedas distintas. Compararlos con el mismo número de parámetros — el mismo costo de almacenamiento — es la comparación que en verdad es justa. <span class=\"cite\">Deep Learning §2.1</span>",
    claim: "CP R = 3: 99 parámetros  ·  Tucker (3, 3, 2): 93 parámetros",
    predict: "Antes de deslizar: ¿el mejor trío de Tucker dentro del presupuesto de un rango de CP siempre vence al error propio de CP, o gastar los mismos números en la forma de Tucker puede salir peor?",
    b: "<p>CP en rango R gasta R(4 + 5 + 24) parámetros. La nube es cada trío de rangos de Tucker (r0, r1, r2) cuyo propio conteo 480 → parámetros cabe en ese mismo presupuesto, graficado por su error de HOSVD; el punto de CP en este R se une al trío de Tucker que elige la regla actual.</p><p><b>Mejor error</b> elige el trío de menor error de la nube, sean cuales sean sus rangos. <b>Parámetros más cercanos</b> elige en cambio el trío que gasta más cerca del presupuesto completo — y eso puede significar un eje degenerado de rango 1, marcado con el color de error, que gasta sus números donde el tensor no los necesita.</p>",
    controls: {cpr: "Rango de CP, R", rule: "Tucker elige por"},
    axParams: "parámetros →",
    axError: "↑ error",
    axKey: "oro: CP  ·  rosa: Tucker degenerado  ·  verde azulado: Tucker",
    options: {rule: {"best-error": "mejor error", "closest-params": "parámetros más cercanos"}},
    claimFmt: (cpr, budget, tr, tp) =>
      `CP R = ${cpr}: ${budget} parámetros  ·  Tucker (${tr.join(", ")}): ${tp} parámetros`,
    claimNone: (cpr, budget, cheapest) =>
      `CP R = ${cpr}: ${budget} parámetros  ·  Tucker: nada por debajo de ${cheapest}`,
    axNone: (cheapest) => `ningún trío de Tucker cabe en este presupuesto — el más pequeño que existe cuesta ${cheapest}`,
    readoutNone: (cpr, budget, cperr, cheapest) =>
      `CP en R = <b>${cpr}</b> gasta <b>${budget}</b> parámetros para un error del <b>${(cperr * 100).toFixed(2)}%</b>. ` +
      `Ningún trío de Tucker cabe en ese presupuesto: el más pequeño que existe, <b>(1, 1, 1)</b>, ` +
      `cuesta <b>${cheapest}</b> — las mismas tres columnas que compra CP, más un número para el núcleo.`,
    readout: (cpr, budget, cperr, tr, tp, terr, degenerate, better) =>
      `CP en R = <b>${cpr}</b> gasta <b>${budget}</b> parámetros para un error del <b>${(cperr * 100).toFixed(2)}%</b>. ` +
      `El trío de Tucker <b>${tr.join(", ")}</b> gasta <b>${tp}</b> para un error del <b>${(terr * 100).toFixed(2)}%</b>` +
      (degenerate ? ", con un eje degenerado de rango 1" : "") + `, ${better ? "venciendo a" : "perdiendo contra"} CP en este presupuesto.`,
    aria: (ctx) => {
      const s = ctx.state;
      return `Una dispersión de número de parámetros contra error: seis puntos de CP para R de 1 a 6, una nube de tríos de rangos de Tucker dentro del presupuesto de R = ${s.cpr}, y una línea que une el punto de CP con el trío que elige la regla ${s.rule}.`;
    }
  };

  window.FactorScenes.register({
    id: "budget", section: "11",
    copy: {en: EN, es: ES},

    controls: [
      {id: "cpr", type: "range", min: 1, max: 6, step: 1, fmt: (v) => String(v)},
      {id: "rule", type: "select", options: ["best-error", "closest-params"]}
    ],

    init(ctx) {
      ctx.state.cpr = 3;
      ctx.state.rule = "best-error";
    },

    facts(ctx) {
      const T = ctx.taxi, s = ctx.state;
      const cpPoints = [1, 2, 3, 4, 5, 6].map((r) => {
        const fit = FC.cpAls(T, r, 100, 1);
        return {r, params: FC.cpParams(T.shape, r), err: fit.error};
      });
      const budget = FC.cpParams(T.shape, s.cpr);
      const search = FC.tuckerSearch(T, budget);
      // At R = 1 the cloud is empty, and that is the finding rather than a
      // failure: CP spends 4 + 5 + 24 = 33, and the smallest Tucker there
      // is buys the same three columns and then pays one more for a core.
      // So `pick` can be undefined, and everything downstream says so.
      const pick = s.rule === "best-error" ? search.best : search.closest;
      const cheapest = FC.tuckerParams(T.shape, [1, 1, 1]);
      const cpAtR = cpPoints[s.cpr - 1];
      return {cpPoints, budget, search, pick, cpAtR, cheapest};
    },

    draw(ctx) {
      const svg = ctx.svg;
      const {cpPoints, search, pick, cpAtR, cheapest} = this.facts(ctx);
      const X0 = 60, Y0 = 240, W = 480, H = 180;
      const maxParams = Math.max(budgetSafe(cpPoints), 99) + 5;
      const maxErr = Math.max(0.3, ...cpPoints.map((p) => p.err), ...search.candidates.map((c) => c.error));
      const px = (p) => X0 + (p / maxParams) * W;
      const py = (e) => Y0 - (e / maxErr) * H;
      svg.appendChild(K.el("line", {x1: X0, y1: Y0, x2: X0 + W, y2: Y0, stroke: K.css("--stage-mute"), "stroke-width": 1}));
      svg.appendChild(K.el("line", {x1: X0, y1: Y0, x2: X0, y2: Y0 - H, stroke: K.css("--stage-mute"), "stroke-width": 1}));
      K.label(svg, X0, Y0 + 18, ctx.copy.axParams, {size: 10.5, colour: "--stage-mute"});
      K.label(svg, X0 - 6, Y0 - H - 8, ctx.copy.axError, {size: 10.5, colour: "--stage-mute", anchor: "start"});
      K.label(svg, X0 + W - 90, Y0 - H - 8,
        ctx.copy.axKey,
        {size: 9.5, colour: "--stage-mute", anchor: "start"});
      search.candidates.forEach((c) => {
        svg.appendChild(K.el("circle", {
          cx: px(c.params), cy: py(c.error), r: 2.4,
          fill: K.css(c.degenerate ? "--fa-err" : "--fa-fac"), "fill-opacity": 0.55
        }));
      });
      cpPoints.forEach((p) => {
        svg.appendChild(K.el("circle", {
          cx: px(p.params), cy: py(p.err), r: p.r === cpAtR.r ? 6 : 4,
          fill: K.css("--fa-t")
        }));
      });
      if (pick) {
        svg.appendChild(K.el("line", {
          x1: px(cpAtR.params), y1: py(cpAtR.err), x2: px(pick.params), y2: py(pick.error),
          stroke: K.css("--fa-core"), "stroke-width": 2, "stroke-dasharray": "5 4"
        }));
        svg.appendChild(K.el("circle", {
          cx: px(pick.params), cy: py(pick.error), r: 6, fill: "none",
          stroke: K.css(pick.degenerate ? "--fa-err" : "--fa-core"), "stroke-width": 2.4
        }));
      } else {
        // An empty cloud would otherwise be a picture of nothing happening.
        K.label(svg, X0 + 12, Y0 - H / 2, ctx.copy.axNone(cheapest),
          {size: 11.5, colour: "--fa-err", anchor: "start"});
      }

      function budgetSafe(pts) { return Math.max(...pts.map((p) => p.params)); }
    },

    readout(ctx) {
      const s = ctx.state, c = ctx.copy;
      const {budget, pick, cpAtR, cheapest} = this.facts(ctx);
      if (!pick) {
        return {
          html: c.readoutNone(s.cpr, budget, cpAtR.err, cheapest),
          claim: c.claimNone(s.cpr, budget, cheapest),
          data: {
            cpr: s.cpr, budget, cperr: cpAtR.err.toFixed(4), tuckerfits: "0", cheapest,
            tuckerranks: "", tuckerparams: "", tuckererr: "",
            rule: s.rule, degenerate: "0", better: "0"
          }
        };
      }
      const better = pick.error < cpAtR.err;
      return {
        html: c.readout(s.cpr, budget, cpAtR.err, pick.ranks, pick.params, pick.error, pick.degenerate, better),
        claim: c.claimFmt(s.cpr, budget, pick.ranks, pick.params),
        data: {
          cpr: s.cpr, budget, cperr: cpAtR.err.toFixed(4), tuckerfits: "1", cheapest,
          tuckerranks: pick.ranks.join(","), tuckerparams: pick.params, tuckererr: pick.error.toFixed(4),
          rule: s.rule, degenerate: pick.degenerate ? "1" : "0", better: better ? "1" : "0"
        }
      };
    }
  });
})();
