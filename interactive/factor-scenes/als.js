// Scene 7: how CP's terms are found -- alternating least squares, one solve
// at a time. Hold two factors, solve for the third exactly, move on. The
// error curve over every solve, from five random starts at once, and the
// three factors as they stand at the step the slider is on, the one just
// solved outlined. It never goes up, and it does not always end in the same
// place. See factor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const FC = window.FactorCore, K = window.FactorKit;

  const SYN = FC.synthetic();
  const SWEEPS = 100;
  const SEEDS = [1, 2, 3, 4, 5];
  const LETTER = ["A", "B", "C"];

  function tensorFor(ctx) { return ctx.state.data === "taxi" ? ctx.taxi : SYN.T; }

  function traces(ctx) {
    const s = ctx.state, T = tensorFor(ctx);
    return SEEDS.map((seed) => FC.cpTrace(T, s.r, SWEEPS, seed));
  }

  function facts(ctx) {
    const s = ctx.state;
    const all = traces(ctx);
    const tr = all[SEEDS.indexOf(s.seed)];
    const at = tr.steps[s.step];
    const ends = all.map((t) => t.steps[t.steps.length - 1].error);
    let best = 0;
    for (let i = 1; i < ends.length; i++) if (ends[i] < ends[best] - 1e-12) best = i;
    return {all, tr, at, ends, best};
  }

  const MAIN = {x: 70, y: 70, w: 390, h: 132};
  const ZOOM = {x: 515, y: 70, w: 170, h: 132};
  const FLOOR = 1e-5;

  const EN = {
    k: "Alternating least squares · section 11",
    h: "ALS fits one factor at a time, never goes uphill, and can stop in the wrong valley",
    concept: 'Fitting all three factors at once is hard; fitting one with the other two held fixed is a least-squares problem with a closed-form answer. ALS solves for A, then B, then C, and repeats. Each solve can only lower the error -- but the valley it ends in depends on where it started. <span class="cite">Kolda &amp; Bader §3.4</span>',
    claim: "A ← M (BᵀB ∗ CᵀC)⁺,  then B,  then C",
    predict: "Before you press Play: will a different random start find the same answer?",
    b: "<p>Press <b>Play</b> and watch the fit: every step is one exact least-squares solve, for the factor outlined below with the other two held still, and the curve is the error after each one. It never rises -- an exact minimum over one factor cannot be worse than where that factor was.</p><p>The faint curves are the same fit from four other random starts. On the taxi tensor at R = 2 they end in two different places: seed 1 stops at 7.00%, seeds 3 to 5 reach 6.73%. Same data, same rank, same rule -- a different answer, which a truncated SVD can never give. On the synthetic tensor at R = 3 every start finds the three planted terms, error going from 31% after the first sweep to 0.1% by the tenth.</p>",
    eqcap: "One solve: with B and C held, the best A is a least-squares solution in closed form. ∗ multiplies entry by entry; ⁺ is the pseudoinverse.",
    np: {
      mttkrp: (L) => "the one sum ALS needs for " + L,
      solve: (L, shape, rest) => shape + ": " + L + " solved, " + rest.join(" and ") + " held",
      sweep: "then the next factor; three solves make a sweep",
      err: (e) => "error after this solve: " + e
    },
    controls: {data: "Tensor", r: "Terms, R", seed: "Random start (seed)", step: "Solve", play: "▶ Play the fit"},
    options: {data: {synthetic: "synthetic (3 planted terms)", taxi: "real taxi trips"}},
    fmtStep: (n, sw, m) => (n === 0 ? "the random start" : "sweep " + sw + ", " + m),
    axErr: "error, log scale",
    axSolve: "solve (square-root scale) →",
    axZoom: (from) => "solves " + from + " to 300, close up",
    axSeed: (s, e) => "seed " + s + ": " + e,
    axFactor: (L, solved) => L + (solved ? " · just solved" : ""),
    // `better` is null when this start ends as well as any of the five, and
    // {seed, end} for the best one otherwise.
    readout: (n, sweep, L, err, start, end, seed, better, planted) =>
      (n === 0
        ? `The random start: error <b>${err}%</b> -- no better than guessing zero. `
        : `Solve ${n}, sweep ${sweep}: <b>${L}</b> just solved with the other two held, error <b>${err}%</b> (it started at ${start}%). `) +
      `Every solve is an exact least-squares minimum over one factor, so the error never goes up. ` +
      (planted
        ? `From seed ${seed} this fit ends at <b>${end}%</b>: the three planted terms, found.`
        : better
          ? `But it can stop in the wrong valley: from seed ${seed} it ends at <b>${end}%</b>, and seed ${better.seed} reaches <b>${better.end}%</b> -- same data, same rank.`
          : `From seed ${seed} it ends at <b>${end}%</b>, as well as any of the five starts.`),
    aria: (ctx) => {
      const s = ctx.state;
      return `The error of CP-ALS over 300 single-factor solves, on a log scale, from five random starts, with seed ${s.seed} bold and ` +
             `a marker at solve ${s.step}; below it the three factor matrices at that solve as heat maps, the one just solved outlined.`;
    }
  };
  const ES = {
    k: "Mínimos cuadrados alternos · sección 11",
    h: "ALS ajusta un factor cada vez, nunca va cuesta arriba, y puede detenerse en el valle equivocado",
    concept: 'Ajustar los tres factores a la vez es difícil; ajustar uno con los otros dos fijos es un problema de mínimos cuadrados con respuesta cerrada. ALS resuelve A, luego B, luego C, y repite. Cada resolución solo puede bajar el error, pero el valle en el que acaba depende de dónde empezó. <span class="cite">Kolda &amp; Bader §3.4</span>',
    claim: "A ← M (BᵀB ∗ CᵀC)⁺,  luego B,  luego C",
    predict: "Antes de pulsar Reproducir: ¿un punto de partida aleatorio distinto encontrará la misma respuesta?",
    b: "<p>Pulsa <b>Reproducir</b> y mira el ajuste: cada paso es una resolución exacta de mínimos cuadrados, para el factor enmarcado abajo con los otros dos quietos, y la curva es el error después de cada una. Nunca sube: un mínimo exacto sobre un factor no puede ser peor que donde estaba ese factor.</p><p>Las curvas tenues son el mismo ajuste desde otros cuatro puntos de partida aleatorios. En el tensor de taxis con R = 2 acaban en dos sitios distintos: la semilla 1 se detiene en un 7,00%, las semillas 3 a 5 llegan a un 6,73%. Mismos datos, mismo rango, misma regla: una respuesta distinta, algo que una SVD truncada nunca puede dar. En el tensor sintético con R = 3 cada punto de partida encuentra los tres términos plantados, con el error pasando del 31% tras el primer barrido al 0,1% en el décimo.</p>",
    eqcap: "Una resolución: con B y C fijos, la mejor A es una solución de mínimos cuadrados en forma cerrada. ∗ multiplica entrada a entrada; ⁺ es la pseudoinversa.",
    np: {
      mttkrp: (L) => "la suma que ALS necesita para " + L,
      solve: (L, shape, rest) => shape + ": " + L + " resuelta, " + rest.join(" y ") + " fijas",
      sweep: "luego el factor siguiente; tres resoluciones son un barrido",
      err: (e) => "error tras resolver: " + e
    },
    controls: {data: "Tensor", r: "Términos, R", seed: "Punto de partida (semilla)", step: "Resolución", play: "▶ Reproducir el ajuste"},
    options: {data: {synthetic: "sintético (3 términos plantados)", taxi: "viajes reales de taxi"}},
    fmtStep: (n, sw, m) => (n === 0 ? "el punto de partida" : "barrido " + sw + ", " + m),
    axErr: "error, escala log",
    axSolve: "resolución (escala de raíz cuadrada) →",
    axZoom: (from) => "resoluciones " + from + " a 300, de cerca",
    axSeed: (s, e) => "semilla " + s + ": " + e,
    axFactor: (L, solved) => L + (solved ? " · recién resuelta" : ""),
    readout: (n, sweep, L, err, start, end, seed, better, planted) =>
      (n === 0
        ? `El punto de partida aleatorio: error del <b>${err}%</b>, no mejor que adivinar cero. `
        : `Resolución ${n}, barrido ${sweep}: <b>${L}</b> recién resuelta con las otras dos fijas, error del <b>${err}%</b> (empezó en un ${start}%). `) +
      `Cada resolución es un mínimo exacto de mínimos cuadrados sobre un factor, así que el error nunca sube. ` +
      (planted
        ? `Desde la semilla ${seed} este ajuste acaba en un <b>${end}%</b>: los tres términos plantados, encontrados.`
        : better
          ? `Pero puede detenerse en el valle equivocado: desde la semilla ${seed} acaba en un <b>${end}%</b>, y la semilla ${better.seed} llega a un <b>${better.end}%</b>: mismos datos, mismo rango.`
          : `Desde la semilla ${seed} acaba en un <b>${end}%</b>, tan bien como cualquiera de los cinco puntos de partida.`),
    aria: (ctx) => {
      const s = ctx.state;
      return `El error de CP-ALS a lo largo de 300 resoluciones de un factor, en escala logarítmica, desde cinco puntos de partida, con la semilla ${s.seed} en negrita y ` +
             `una marca en la resolución ${s.step}; debajo, las tres matrices factor en esa resolución como mapas de calor, con la recién resuelta enmarcada.`;
    }
  };

  window.FactorScenes.register({
    id: "als", section: "11",
    hl: ["pickup", "dropoff", "hour", "rank"],
    copy: {en: EN, es: ES},

    controls: [
      {id: "data", type: "select", options: ["taxi", "synthetic"]},
      {id: "r", type: "range", min: 1, max: 6, step: 1, fmt: (v) => "R = " + v},
      {id: "seed", type: "range", min: 1, max: 5, step: 1, fmt: (v) => String(v)},
      {id: "step", type: "range", min: 0, max: 3 * SWEEPS, step: 1,
       fmt: (v, ctx) => ctx.copy.fmtStep(v, Math.ceil(v / 3), LETTER[(v - 1) % 3])},
      {id: "play", type: "play", target: "step", rate: 60}
    ],

    init(ctx) {
      ctx.state.data = "taxi";
      ctx.state.r = 2;
      ctx.state.seed = 1;
      ctx.state.step = 0;
    },

    pick(ctx, key) {
      if (key.startsWith("seed:")) ctx.setControls({seed: Number(key.slice(5))});
      if (key.startsWith("step:")) ctx.setControls({step: Number(key.slice(5))});
    },
    tip(ctx, key) {
      const f = facts(ctx);
      if (key.startsWith("seed:")) {
        const sd = Number(key.slice(5));
        return ctx.copy.axSeed(sd, K.pct(f.ends[SEEDS.indexOf(sd)], 2, ctx.lang) + "%");
      }
      if (key.startsWith("step:")) {
        const n = Number(key.slice(5));
        return ctx.copy.fmtStep(n, Math.ceil(n / 3), LETTER[(n - 1) % 3]) + " · " + K.pct(f.tr.steps[n].error, 2, ctx.lang) + "%";
      }
      return "";
    },

    draw(ctx) {
      const s = ctx.state, svg = ctx.svg, c = ctx.copy;
      const f = facts(ctx);
      const n = f.tr.steps.length;
      const minEnd = Math.min(...f.ends);
      let top = 0;
      for (const t of f.all) top = Math.max(top, t.steps[0].error);

      // The whole fit: error on a log scale against solves on a square-root
      // one, because nearly all of the fall happens in the first dozen solves
      // and a linear axis would draw it as a cliff.
      const M = MAIN;
      const lo = Math.log10(Math.max(FLOOR, minEnd * 0.5)), hi = Math.log10(Math.max(1.2, top * 1.05));
      const mx = (i) => M.x + Math.sqrt(i / (n - 1)) * M.w;
      const my = (e) => M.y + M.h - ((Math.log10(Math.max(e, Math.pow(10, lo))) - lo) / (hi - lo)) * M.h;
      K.label(svg, M.x, M.y - 10, c.axErr, {size: 10, colour: "--stage-mute"});
      [1, 0.1, 0.01, 0.001, 0.0001].forEach((v) => {
        if (Math.log10(v) < lo || Math.log10(v) > hi) return;
        const y = my(v);
        svg.appendChild(K.el("line", {x1: M.x, y1: y, x2: M.x + M.w, y2: y, stroke: K.css("--stage-mute"), "stroke-width": 0.5, "stroke-opacity": 0.5}));
        K.label(svg, M.x - 6, y, K.num(v * 100, v < 0.01 ? 2 : 0, ctx.lang) + "%", {size: 9, anchor: "end", baseline: "middle", colour: "--stage-mute"});
      });
      [1, 10, 30, 100, 300].forEach((i) => K.label(svg, mx(i), M.y + M.h + 13, String(i), {size: 9, anchor: "middle", colour: "--stage-mute"}));
      K.label(svg, M.x + M.w, M.y + M.h + 28, c.axSolve, {size: 9.5, anchor: "end", colour: "--stage-mute"});
      const line = (steps, map, token, width, opacity, from) => {
        const pts = [];
        for (let i = from || 0; i < steps.length; i++) pts.push(map.x(i).toFixed(1) + "," + map.y(steps[i].error).toFixed(1));
        svg.appendChild(K.el("polyline", {points: pts.join(" "), fill: "none", stroke: K.css(token), "stroke-width": width,
          "stroke-opacity": opacity, "stroke-linejoin": "round"}));
      };
      f.all.forEach((t, i) => { if (SEEDS[i] !== s.seed) line(t.steps, {x: mx, y: my}, "--stage-mute", 1, 0.6); });
      line(f.tr.steps, {x: mx, y: my}, "--fa-t", 2.2, 1);
      const x = mx(s.step);
      svg.appendChild(K.el("line", {x1: x, y1: M.y, x2: x, y2: M.y + M.h, stroke: K.css("--fa-t"), "stroke-width": 1, "stroke-dasharray": "3 3"}));
      svg.appendChild(K.el("circle", {cx: x, cy: my(f.at.error), r: 4.5, fill: K.css(f.at.mode < 0 ? "--fa-t" : K.AXIS[f.at.mode])}));
      const strips = 60;
      for (let q = 0; q < strips; q++) {
        const i0 = Math.round(Math.pow(q / strips, 2) * (n - 1));
        const x0 = M.x + (q / strips) * M.w;
        svg.appendChild(K.el("rect", {x: x0, y: M.y, width: M.w / strips, height: M.h, fill: "transparent", "data-pick": "step:" + i0}));
      }

      // The last half of the fit, close up, on a linear scale: where the five
      // starts settle, and whether they settle in the same place.
      const Z = ZOOM, from = Math.floor((n - 1) / 2);
      let zhi = minEnd;
      for (const t of f.all) zhi = Math.max(zhi, t.steps[from].error);
      zhi = Math.min(zhi, minEnd * 1.3 + 1e-6);
      const zlo = Math.max(0, minEnd - (zhi - minEnd) * 0.15);
      const span = Math.max(1e-9, zhi - zlo);
      const zx = (i) => Z.x + ((i - from) / (n - 1 - from)) * Z.w;
      const zy = (e) => Z.y + Z.h - ((Math.min(zhi, Math.max(zlo, e)) - zlo) / span) * Z.h;
      K.label(svg, Z.x, Z.y - 10, c.axZoom(from), {size: 10, colour: "--stage-mute"});
      svg.appendChild(K.el("rect", {x: Z.x, y: Z.y, width: Z.w, height: Z.h, fill: "none", stroke: K.css("--stage-mute"), "stroke-width": 0.8, "stroke-opacity": 0.6}));
      f.all.forEach((t, i) => { if (SEEDS[i] !== s.seed) line(t.steps, {x: zx, y: zy}, "--stage-mute", 1, 0.7, from); });
      line(f.tr.steps, {x: zx, y: zy}, "--fa-t", 2.2, 1, from);
      if (s.step >= from) {
        svg.appendChild(K.el("line", {x1: zx(s.step), y1: Z.y, x2: zx(s.step), y2: Z.y + Z.h, stroke: K.css("--fa-t"), "stroke-width": 1, "stroke-dasharray": "3 3"}));
      }
      // Where each start ends, named beside the close-up, clickable.
      const ends = f.all.map((t, i) => ({seed: SEEDS[i], e: t.steps[n - 1].error}));
      ends.sort((a, b) => b.e - a.e);
      let lastY = -Infinity;
      ends.forEach((q) => {
        let y = zy(q.e);
        if (y - lastY < 13) y = lastY + 13;
        lastY = y;
        K.label(svg, Z.x + Z.w + 6, y, c.axSeed(q.seed, K.pct(q.e, 2, ctx.lang) + "%"),
          {size: 9, baseline: "middle", colour: q.seed === s.seed ? "--fa-t" : "--stage-mute", pick: "seed:" + q.seed});
      });

      // The three factors at this step, each R rows deep: A over the four
      // pickups, B over the five dropoffs, C over the 24 hours, one shared
      // colour scale per factor so a column's growth is visible as it fits.
      const F = f.at.factors;
      const R = s.r;
      const rowH = Math.min(30, 130 / R);
      const y0 = 262;
      const boxes = [{x: 70, w: 120}, {x: 220, w: 150}, {x: 400, w: 380}];
      F.forEach((M, m) => {
        const MT = M[0].map((_, r) => M.map((row) => row[r]));   // R rows, one per term
        let peak = 0;
        for (const st of f.tr.steps) for (const row of st.factors[m]) for (const v of row) peak = Math.max(peak, Math.abs(v));
        const solved = f.at.mode === m;
        const hl = ctx.hl === K.HL_NAME[m];
        K.label(svg, boxes[m].x, y0 - 12, c.axFactor(LETTER[m], solved), {size: 10.5, colour: K.AXIS[m], stroke: solved || hl ? K.AXIS[m] : undefined});
        K.heat(svg, MT, {x: boxes[m].x, y: y0, w: boxes[m].w, h: rowH * R, pos: K.AXIS[m], neg: "--fa-err",
          peak: peak || 1, outline: solved ? K.AXIS[m] : undefined});
      });
      const names = ctx.state.data === "taxi" ? ctx.names : {pickupShort: ["P0", "P1", "P2", "P3"], dropoffShort: ["D0", "D1", "D2", "D3", "D4"]};
      names.pickupShort.forEach((nm, i) => K.label(svg, boxes[0].x + (i + 0.5) * boxes[0].w / 4, y0 + rowH * R + 12, nm, {size: 9, anchor: "middle", colour: "--fa-m0"}));
      names.dropoffShort.forEach((nm, j) => K.label(svg, boxes[1].x + (j + 0.5) * boxes[1].w / 5, y0 + rowH * R + 12, nm, {size: 9, anchor: "middle", colour: "--fa-m1"}));
      [0, 6, 12, 18, 23].forEach((k) => K.label(svg, boxes[2].x + (k + 0.5) * boxes[2].w / 24, y0 + rowH * R + 12, String(k), {size: 9, anchor: "middle", colour: "--fa-m2"}));
      for (let r = 0; r < R; r++) K.label(svg, 58, y0 + (r + 0.5) * rowH, String(r), {size: 9, anchor: "end", baseline: "middle", colour: "--stage-mute", stroke: ctx.hl === "rank" ? "--stage-mute" : undefined});
    },

    readout(ctx) {
      const s = ctx.state, c = ctx.copy;
      const f = facts(ctx);
      const sweep = Math.ceil(s.step / 3);
      const L = f.at.mode >= 0 ? LETTER[f.at.mode] : "";
      const end = f.ends[SEEDS.indexOf(s.seed)];
      const bestEnd = f.ends[f.best];
      const pct = (v) => K.pct(v, 2, ctx.lang);
      // Better only if it prints better: two ends that agree to the digits on
      // screen are the same valley to a reader.
      const better = pct(bestEnd) !== pct(end) && bestEnd < end ? {seed: SEEDS[f.best], end: pct(bestEnd)} : null;
      const planted = s.data === "synthetic" && s.r === 3 && end < 1e-4;
      const html = c.readout(s.step, sweep, L, pct(f.at.error), pct(f.tr.steps[0].error), pct(end), s.seed, better, planted);
      return {
        html,
        claim: s.step === 0 ? c.claim : (L + " ← M (" + LETTER.filter((x) => x !== L).map((x) => x + "ᵀ" + x).join(" ∗ ") + ")⁺,  " +
               (ctx.lang === "es" ? "barrido " : "sweep ") + sweep),
        data: {
          data: s.data, r: s.r, seed: s.seed, step: s.step, sweep, solved: f.at.mode,
          err: f.at.error.toFixed(4), start: f.tr.steps[0].error.toFixed(4), end: end.toFixed(4),
          bestend: bestEnd.toFixed(4), bestseed: SEEDS[f.best],
          monotone: f.tr.steps.every((q, i) => i === 0 || q.error <= f.tr.steps[i - 1].error + 1e-12) ? "1" : "0"
        }
      };
    },

    code(ctx) {
      const s = ctx.state, c = ctx.copy.np;
      const f = facts(ctx);
      const m = f.at.mode >= 0 ? f.at.mode : 0;
      const L = LETTER[m], others = LETTER.filter((x) => x !== L);
      const idx = ["i", "j", "k"], sub = ["ir", "jr", "kr"];
      const T = tensorFor(ctx);
      const spec = '"ijk,' + [0, 1, 2].filter((q) => q !== m).map((q) => sub[q]).join(",") + "->" + idx[m] + 'r"';
      return K.code([
        ["M = np.einsum(" + spec + ", T, " + others.join(", ") + ")", c.mttkrp(L)],
        [L + " = M @ np.linalg.pinv(" + others.map((x) => "(" + x + ".T @ " + x + ")").join(" * ") + ")",
         c.solve(L, "(" + T.shape[m] + ", " + s.r + ")", others)],
        ["# " + c.sweep, ""],
        ["np.linalg.norm(T - T_hat) / np.linalg.norm(T)", c.err(f.at.error.toFixed(4))]
      ]);
    }
  });
})();
