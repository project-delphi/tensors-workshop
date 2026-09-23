// Scene 6: what CP finds -- R terms, each a weight and three unit vectors,
// drawn as cards heaviest first: a and b as borough bars, c as a curve over
// the day. On the synthetic tensor built from exactly three terms, R = 3
// finds those three; on the taxi tensor there is no answer to recover, and
// at some ranks two terms grow past the tensor itself and cancel.
// See factor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const FC = window.FactorCore, K = window.FactorKit;

  const SYN = FC.synthetic();
  const ITERS = 100;

  function tensorFor(ctx) { return ctx.state.data === "taxi" ? ctx.taxi : SYN.T; }
  function namesFor(ctx) {
    return ctx.state.data === "taxi" ? ctx.names
      : {pickup: ["P0", "P1", "P2", "P3"], dropoff: ["D0", "D1", "D2", "D3", "D4"],
         pickupShort: ["P0", "P1", "P2", "P3"], dropoffShort: ["D0", "D1", "D2", "D3", "D4"]};
  }

  function facts(ctx) {
    const s = ctx.state, T = tensorFor(ctx);
    const fit = FC.cpAls(T, s.r, ITERS, 1);
    const n = FC.cpNormalize(fit);
    // Planted term matched to each fitted column, on the synthetic tensor.
    const match = {};
    if (s.data === "synthetic") {
      FC.matchTerms(fit, SYN.terms).forEach((m) => { if (m.col >= 0) match[m.col] = m; });
    }
    return {T, fit, n, match, norm: FC.norm(T)};
  }

  const L = {x0: 118, x1: 790, a: [86, 142], b: [168, 224], c: [252, 332]};

  const EN = {
    k: "CP · section 11",
    h: "CP writes the cube as a sum of rank-1 terms, and only sometimes finds the same ones twice",
    concept: 'CP writes a tensor as a sum of R rank-1 terms, T ≈ Σᵣ λᵣ aᵣ ⊗ bᵣ ⊗ cᵣ, R(I + J + K) numbers in all. Unlike Tucker it has no core and no orthogonality: the terms can overlap, and nothing forces them to be unique. <span class="cite">Kolda &amp; Bader §3.2–3.3</span>',
    claim: "T ≈ Σᵣ λᵣ aᵣ ⊗ bᵣ ⊗ cᵣ,  R(I + J + K) = 99",
    predict: "Before you slide: the synthetic tensor was built from exactly three terms. At R = 3, will CP find those three, three others that fit as well, or no good fit at all?",
    b: "<p>Each card is one term: its weight λ, a and b as bars over the boroughs, and c as a curve over the day. On the synthetic tensor -- three terms added together, at scales 10, 6 and 3 -- R = 3 comes back with exactly those weights, every card matching a planted term. Give it a fourth term and the error stays at zero while the cards stop matching: with a rank to spare, CP can split one term into two.</p><p>On the taxi tensor there is no planted answer, only a fit: 99 numbers for 3.53% at R = 3, and term 0 is Manhattan to Manhattan through the day. Slide to R = 6 and watch two cards grow bigger than the whole tensor and point opposite ways: they cancel, and the fit spends its numbers on their difference. That is CP's known degeneracy, and Tucker cannot do it.</p>",
    eqcap: "R terms, each one weight and three vectors: R(4 + 5 + 24) numbers. Point at a letter to light its row of every card.",
    np: {
      model: (r) => "(4, 5, 24) from " + r + " terms",
      err: (e) => e + " relative error",
      count: (n) => n + " numbers",
      weights: (w) => w
    },
    controls: {r: "Terms, R", data: "Tensor"},
    options: {data: {synthetic: "synthetic (3 planted terms)", taxi: "real taxi trips"}},
    axRow: {a: "a · pickup", b: "b · dropoff", c: "c · hour"},
    axTerm: (r, w) => "term " + r + " · λ " + w,
    axMatch: (m) => "match " + m,
    axCancel: (c) => "cancelling: cos " + c,
    tip: (r, w, a, c) => "term " + r + " · λ = " + w + " · a mostly " + a + " · c peaks at " + c,
    readoutSyn: (r, err, rec, weights, split) =>
      `At R = <b>${r}</b>: <b>${err}%</b> error, and <b>${rec}</b> of the 3 planted terms recovered (match > 0.999). ` +
      (rec === 3 && r === 3 ? `The weights come back as <b>${weights}</b> -- the scales the terms were built with.` :
       r < 3 ? `With fewer terms than were planted, the fit keeps the heaviest and cannot afford the rest.` :
       split ? `The error is still zero, but the cards no longer match: with a rank to spare, CP splits a term in two, and the answer is no longer unique.` : ""),
    readoutTaxi: (r, err, params, term0, cancel) =>
      `At R = <b>${r}</b> on the taxi tensor: <b>${params}</b> numbers, <b>${err}%</b> error. There is no planted answer to recover. ` +
      term0 + (cancel || ""),
    term0: (w, a, b, c) => `Term 0 (λ = ${w}) is mostly ${a} → ${b}, peaking at hour ${c}.`,
    cancel: (p, q, wp, wq, cos, norm) => ` Terms ${p} and ${q} have λ = <b>${wp}</b> and <b>${wq}</b> -- bigger than the whole tensor, ` +
      `‖T‖ = ${norm} -- and point almost opposite ways (cos ${cos}): they <b>cancel</b>, and the fit spends its numbers on their difference.`,
    aria: (ctx) => {
      const s = ctx.state;
      return `${s.r} term cards from CP on the ${s.data === "taxi" ? "taxi" : "synthetic"} tensor, heaviest first, each with its weight, ` +
             `bars for its pickup and dropoff vectors and a curve for its hour vector.`;
    }
  };
  const ES = {
    k: "CP · sección 11",
    h: "CP escribe el cubo como una suma de términos de rango 1, y solo a veces encuentra los mismos dos veces",
    concept: 'CP escribe un tensor como una suma de R términos de rango 1, T ≈ Σᵣ λᵣ aᵣ ⊗ bᵣ ⊗ cᵣ, R(I + J + K) números en total. A diferencia de Tucker no tiene núcleo ni ortogonalidad: los términos pueden solaparse, y nada los obliga a ser únicos. <span class="cite">Kolda &amp; Bader §3.2–3.3</span>',
    claim: "T ≈ Σᵣ λᵣ aᵣ ⊗ bᵣ ⊗ cᵣ,  R(I + J + K) = 99",
    predict: "Antes de deslizar: el tensor sintético se construyó con exactamente tres términos. En R = 3, ¿CP encontrará esos tres, otros tres que ajusten igual de bien, o ningún buen ajuste?",
    b: "<p>Cada tarjeta es un término: su peso λ, a y b como barras sobre los barrios, y c como una curva sobre el día. En el tensor sintético (tres términos sumados, a escalas 10, 6 y 3) R = 3 vuelve con exactamente esos pesos, y cada tarjeta coincide con un término plantado. Dale un cuarto término y el error sigue en cero mientras las tarjetas dejan de coincidir: con un rango de sobra, CP puede partir un término en dos.</p><p>En el tensor de taxis no hay una respuesta plantada, solo un ajuste: 99 números para un 3,53% en R = 3, y el término 0 es de Manhattan a Manhattan a lo largo del día. Desliza hasta R = 6 y mira cómo dos tarjetas crecen más que el tensor entero y apuntan en sentidos opuestos: se cancelan, y el ajuste gasta sus números en su diferencia. Es la degeneración conocida de CP, y Tucker no puede hacerlo.</p>",
    eqcap: "R términos, cada uno un peso y tres vectores: R(4 + 5 + 24) números. Señala una letra para iluminar su fila en cada tarjeta.",
    np: {
      model: (r) => "(4, 5, 24) desde " + r + " términos",
      err: (e) => e + " de error relativo",
      count: (n) => n + " números",
      weights: (w) => w
    },
    controls: {r: "Términos, R", data: "Tensor"},
    options: {data: {synthetic: "sintético (3 términos plantados)", taxi: "viajes reales de taxi"}},
    axRow: {a: "a · origen", b: "b · destino", c: "c · hora"},
    axTerm: (r, w) => "término " + r + " · λ " + w,
    axMatch: (m) => "coincide " + m,
    axCancel: (c) => "se cancelan: cos " + c,
    tip: (r, w, a, c) => "término " + r + " · λ = " + w + " · a sobre todo " + a + " · c con pico en " + c,
    readoutSyn: (r, err, rec, weights, split) =>
      `En R = <b>${r}</b>: <b>${err}%</b> de error, y <b>${rec}</b> de los 3 términos plantados recuperados (coincidencia > 0,999). ` +
      (rec === 3 && r === 3 ? `Los pesos vuelven como <b>${weights}</b>: las escalas con que se construyeron los términos.` :
       r < 3 ? `Con menos términos de los que se plantaron, el ajuste se queda con los más pesados y no puede pagar el resto.` :
       split ? `El error sigue en cero, pero las tarjetas ya no coinciden: con un rango de sobra, CP parte un término en dos, y la respuesta deja de ser única.` : ""),
    readoutTaxi: (r, err, params, term0, cancel) =>
      `En R = <b>${r}</b> sobre el tensor de taxis: <b>${params}</b> números, <b>${err}%</b> de error. No hay una respuesta plantada que recuperar. ` +
      term0 + (cancel || ""),
    term0: (w, a, b, c) => `El término 0 (λ = ${w}) es sobre todo ${a} → ${b}, con su pico en la hora ${c}.`,
    cancel: (p, q, wp, wq, cos, norm) => ` Los términos ${p} y ${q} tienen λ = <b>${wp}</b> y <b>${wq}</b>, más que el tensor entero ` +
      `(‖T‖ = ${norm}), y apuntan en sentidos casi opuestos (cos ${cos}): se <b>cancelan</b>, y el ajuste gasta sus números en su diferencia.`,
    aria: (ctx) => {
      const s = ctx.state;
      return `${s.r} tarjetas de términos de CP sobre el tensor ${s.data === "taxi" ? "de taxis" : "sintético"}, el más pesado primero, cada una con su peso, ` +
             `barras para sus vectores de origen y destino y una curva para su vector horario.`;
    }
  };

  window.FactorScenes.register({
    id: "cp", section: "11",
    hl: ["rank", "pickup", "dropoff", "hour"],
    copy: {en: EN, es: ES},

    controls: [
      {id: "r", type: "range", min: 1, max: 6, step: 1, fmt: (v) => "R = " + v},
      {id: "data", type: "select", options: ["synthetic", "taxi"]}
    ],

    init(ctx) {
      ctx.state.r = 3;
      ctx.state.data = "synthetic";
    },

    tip(ctx, key) {
      if (!key.startsWith("term:")) return "";
      const r = Number(key.slice(5));
      const f = facts(ctx), names = namesFor(ctx);
      const a = f.n.factors[0][r], c = f.n.factors[2][r];
      return ctx.copy.tip(r, K.num(f.n.weights[r], 1, ctx.lang), names.pickup[FC.argmax(a.map(Math.abs))], FC.argmax(c.map(Math.abs)));
    },

    draw(ctx) {
      const s = ctx.state, svg = ctx.svg, c = ctx.copy;
      const f = facts(ctx), names = namesFor(ctx);
      const R = s.r, lit = ctx.hl;
      const w = (L.x1 - L.x0) / R, pad = Math.min(10, w * 0.08);
      // Row names down the left, once for every card.
      [["a", "pickup", L.a, "--fa-m0"], ["b", "dropoff", L.b, "--fa-m1"], ["c", "hour", L.c, "--fa-m2"]].forEach(([key, hl, band, tok]) => {
        K.label(svg, 40, (band[0] + band[1]) / 2, c.axRow[key], {size: 10, colour: tok, baseline: "middle", stroke: lit === hl ? tok : undefined});
      });
      const cancelling = new Set(f.n.cancelling.flat());
      const cmax = Math.max(0.3, ...f.n.factors[2].map((v) => Math.max(...v.map(Math.abs))));
      for (let r = 0; r < R; r++) {
        const x = L.x0 + r * w + pad, cw = w - 2 * pad;
        const key = "term:" + r;
        const hot = ctx.hover === key;
        // The card, and a hit target over all of it.
        svg.appendChild(K.el("rect", {
          x: x - 4, y: 58, width: cw + 8, height: 300, rx: 6, fill: "transparent",
          stroke: K.css(cancelling.has(r) ? "--fa-err" : hot ? "--fa-t" : "--stage-mute"),
          "stroke-opacity": cancelling.has(r) || hot ? 0.9 : 0.35, "stroke-width": cancelling.has(r) ? 1.6 : 1,
          "data-pick": key
        }));
        const weight = K.num(f.n.weights[r], f.n.weights[r] >= 100 ? 0 : 2, ctx.lang);
        K.label(svg, x + cw / 2, 72, w > 100 ? c.axTerm(r, weight) : "λ " + weight,
          {size: 10, anchor: "middle", baseline: "middle", colour: "--fa-core", stroke: lit === "rank" ? "--fa-core" : undefined});
        const a = f.n.factors[0][r], b = f.n.factors[1][r], cv = f.n.factors[2][r];
        const ba = K.bars(svg, a, {x, y: L.a[0], w: cw, h: L.a[1] - L.a[0], max: 1, signed: true, gap: 2,
          at: (i) => (a[i] >= 0 ? "--fa-m0" : "--fa-err"), alpha: lit === "pickup" ? 1 : 0.75});
        const bb = K.bars(svg, b, {x, y: L.b[0], w: cw, h: L.b[1] - L.b[0], max: 1, signed: true, gap: 2,
          at: (j) => (b[j] >= 0 ? "--fa-m1" : "--fa-err"), alpha: lit === "dropoff" ? 1 : 0.75});
        if (cw >= 84) {
          names.pickupShort.forEach((nm, i) => K.label(svg, ba.px(i), L.a[1] + 7, nm, {size: 8.5, anchor: "middle", baseline: "middle", colour: "--fa-m0"}));
          names.dropoffShort.forEach((nm, j) => K.label(svg, bb.px(j), L.b[1] + 7, nm, {size: 8.5, anchor: "middle", baseline: "middle", colour: "--fa-m1"}));
        }
        svg.appendChild(K.el("line", {x1: x, y1: (L.c[0] + L.c[1]) / 2, x2: x + cw, y2: (L.c[0] + L.c[1]) / 2, stroke: K.css("--stage-mute"), "stroke-width": 0.8}));
        const peak = FC.argmax(cv.map(Math.abs));
        K.curve(svg, cv, {x, y: L.c[0], w: cw, h: L.c[1] - L.c[0], min: -cmax, max: cmax, token: "--fa-m2",
          width: lit === "hour" ? 2.6 : 1.8, dots: (k) => k === peak, dotToken: () => "--fa-t"});
        if (s.data === "synthetic") {
          const m = f.match[f.n.order[r]];
          const score = m ? m.score : 0;
          K.label(svg, x + cw / 2, 346, c.axMatch(K.num(score, 3, ctx.lang)),
            {size: 9.5, anchor: "middle", baseline: "middle", colour: score > 0.999 ? "--fa-t" : "--fa-err"});
        }
      }
      // A cancelling pair is joined underneath, and says how opposite it is.
      f.n.cancelling.forEach(([p, q]) => {
        const xp = L.x0 + p * w + w / 2, xq = L.x0 + q * w + w / 2;
        svg.appendChild(K.el("path", {d: `M${xp} 362 L${xp} 372 L${xq} 372 L${xq} 362`, fill: "none",
          stroke: K.css("--fa-err"), "stroke-width": 1.6}));
        K.label(svg, (xp + xq) / 2, 386, c.axCancel(K.num(f.n.congruence[p][q], 2, ctx.lang)),
          {size: 10, anchor: "middle", baseline: "middle", colour: "--fa-err"});
      });
    },

    readout(ctx) {
      const s = ctx.state, c = ctx.copy;
      const f = facts(ctx), names = namesFor(ctx);
      const params = FC.cpParams(f.T.shape, s.r);
      const err = K.pct(f.fit.error, 2, ctx.lang);
      const claim = `T ≈ Σᵣ λᵣ aᵣ ⊗ bᵣ ⊗ cᵣ,  R(I + J + K) = ${params}`;
      const weights = f.n.weights.map((w) => w.toFixed(1)).join(",");
      const cancel = f.n.cancelling.length ? f.n.cancelling[0] : null;
      const base = {
        data: s.data, r: s.r, err: f.fit.error.toFixed(4), params, weights,
        cancelling: f.n.cancelling.map((p) => p.join("-")).join(";")
      };
      if (s.data === "synthetic") {
        const matches = FC.matchTerms(f.fit, SYN.terms);
        const recovered = matches.filter((m) => m.score > 0.999).length;
        const unique = recovered === SYN.terms.length && s.r === 3;
        const split = s.r > 3 && recovered < 3;
        const wtxt = f.n.weights.map((w) => K.num(w, 1, ctx.lang)).join(", ");
        return {
          html: c.readoutSyn(s.r, err, recovered, wtxt, split), claim,
          data: Object.assign(base, {recovered, unique: unique ? "1" : "0", split: split ? "1" : "0"})
        };
      }
      const a = f.n.factors[0][0], b = f.n.factors[1][0], cv = f.n.factors[2][0];
      const term0 = c.term0(K.num(f.n.weights[0], 1, ctx.lang), names.pickup[FC.argmax(a.map(Math.abs))],
                            names.dropoff[FC.argmax(b.map(Math.abs))], FC.argmax(cv.map(Math.abs)));
      const cancelTxt = cancel ? c.cancel(cancel[0], cancel[1], K.num(f.n.weights[cancel[0]], 1, ctx.lang),
        K.num(f.n.weights[cancel[1]], 1, ctx.lang), K.num(f.n.congruence[cancel[0]][cancel[1]], 2, ctx.lang),
        K.num(f.norm, 1, ctx.lang)) : "";
      return {
        html: c.readoutTaxi(s.r, err, params, term0, cancelTxt), claim,
        data: Object.assign(base, {recovered: 0, unique: "0", split: "0"})
      };
    },

    code(ctx) {
      const s = ctx.state, c = ctx.copy.np;
      const f = facts(ctx);
      const w = f.n.weights.slice(0, 3).map((v) => v.toFixed(1)).join(", ") + (s.r > 3 ? ", ..." : "");
      return K.code([
        ["lam", c.weights("[" + w + "]")],
        ['T_hat = np.einsum("r,ir,jr,kr->ijk", lam, A, B, C)', c.model(s.r)],
        ["np.linalg.norm(T - T_hat) / np.linalg.norm(T)", c.err(f.fit.error.toFixed(4))],
        [s.r + " * sum(T.shape)", c.count(FC.cpParams(f.T.shape, s.r))]
      ]);
    }
  });
})();
