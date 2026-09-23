// Scene 3: what the SVD of one unfolding finds. A scree of its singular
// values on a log scale (on a linear one there is a single bar), the kept
// columns of U drawn as the patterns they are -- day curves for hour,
// labelled bars for a borough -- and the unfolding beside what rank r misses
// of it. The piece hosvd() in factor-core.js assembles into Tucker's A, B, C.
// See factor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const FC = window.FactorCore, K = window.FactorKit;
  const RMAX_LABEL = [4, 5, 20];
  const LETTER = ["A", "B", "C"];
  const AXES = ["pickup", "dropoff", "hour"];
  const AXES_ES = ["origen", "destino", "hora"];

  function facts(ctx) {
    const T = ctx.taxi, s = ctx.state;
    const bases = FC.hosvdBases(T);
    const S = bases[s.mode].S;
    const U = FC.signFix(bases[s.mode].U, s.r);
    const e = FC.svdEnergy(S, s.r);
    const u = FC.unfoldingRebuild(T, s.mode, s.r, bases);
    const col0 = U.map((row) => row[0]);
    return {S, U, e, u, col0, rmax: RMAX_LABEL[s.mode]};
  }

  // Who a borough pattern is mostly about: its largest entry, by name.
  function mostly(ctx, mode, v) {
    let best = 0;
    for (let i = 1; i < v.length; i++) if (Math.abs(v[i]) > Math.abs(v[best])) best = i;
    const names = mode === 0 ? ctx.names.pickup : ctx.names.dropoff;
    return {name: names[best], w: v[best]};
  }


  const EN = {
    k: "The SVD of one unfolding · section 10",
    h: "An unfolding's SVD finds a few patterns, and each spans its whole axis",
    concept: 'The SVD of a matrix ranks its directions by how much of the matrix each explains, and keeping the first r is the best rank-r approximation there is -- the Eckart–Young theorem section 09 used on an image. The columns of U are patterns over the rows. <span class="cite">Deep Learning §2.8</span>',
    claim: "C = U[:, :r₂]  from  SVD(T₍₂₎)",
    predict: "Before you slide: “hour rank 3 keeps three of the 24 hours.” True or false?",
    b: "<p>The bars are the singular values of one unfolding, largest first, on a log scale -- on a linear one you would see a single bar, because the first holds 99.8% of the hour unfolding's energy: σ₁ = 1,101, σ₂ = 31. The lit bars are the ones kept; click a bar to keep up to it.</p><p>Underneath, each kept column of U is drawn as what it is. For hour, column 0 is the day's own shape -- the dashed line is the trips per hour, rescaled to match -- and the other columns are corrections to it, each running across all 24 hours. So hour rank 3 keeps three <em>patterns</em> over the whole day, not three of its hours. For a borough mode, column 0 is almost exactly Manhattan. On the right: the unfolding, and what rank r misses of it.</p>",
    eqcap: "The SVD of the hour unfolding; the hour factor C is its first r₂ left singular vectors, each a pattern over all 24 hours.",
    np: {
      unfold: (r, c) => "(" + r + ", " + c + ")",
      svd: (r, c) => "U: (" + r + ", " + c + "), the thin SVD",
      factor: (r, k, what) => "(" + r + ", " + k + "): " + k + " " + what + " patterns",
      energy: (e) => e + " of the energy"
    },
    controls: {mode: "Which unfolding", r: "Rank kept, r"},
    options: {mode: {0: "pickup (mode 0)", 1: "dropoff (mode 1)", 2: "hour (mode 2)"}},
    names: AXES,
    axScree: "σ, log scale",
    axPattern: (L, r) => L + " = U[:, :" + r + "]",
    axDay: "dashed: trips per hour",
    axX: (m, r, c) => "T" + m + "  " + r + " × " + c,
    axMiss: (r, x) => "what rank " + r + " misses, ×" + x,
    tip: (n, sv, e) => "σ" + n + " = " + sv + " · keep " + (n) + ": " + e + "%",
    readout: (mode, r, rmax, sv0, sv1, energy, uerr, u0) =>
      `Mode ${mode}'s SVD: σ₁ = <b>${sv0}</b>, σ₂ = <b>${sv1}</b>. Keeping <b>r = ${r}</b> of at most ${rmax} ` +
      `columns holds <b>${energy}%</b> of this unfolding's energy, and the rank-${r} rebuild misses it by <b>${uerr}%</b>. ` +
      u0 + (mode === 2 && rmax === 20 ? " (24 × 20: the thin U has 20 columns, so r stops at 20, not 24.)" : ""),
    u0Hour: (peak, busiest, r) => `Column 0 is the day's shape: it peaks at hour ${peak}, and the trips per hour peak at ${busiest}. ` +
      `Every kept column is a pattern across all 24 hours -- rank ${r} keeps ${r} ${r === 1 ? "pattern" : "patterns"}, not ${r} of the hours.`,
    u0Borough: (name, w) => `Column 0 is almost exactly ${name} (${w}): one borough carries this unfolding.`,
    aria: (ctx) => {
      const s = ctx.state;
      return `A log-scale bar chart of the singular values of the ${AXES[s.mode]} unfolding with the first ${s.r} lit, ` +
             `the ${s.r} kept columns of U drawn as patterns, and heat maps of the unfolding and of what rank ${s.r} misses of it.`;
    }
  };
  const ES = {
    k: "La SVD de un desplegado · sección 10",
    h: "La SVD de un desplegado encuentra unos pocos patrones, y cada uno recorre todo su eje",
    concept: 'La SVD de una matriz ordena sus direcciones por cuánto de la matriz explica cada una, y quedarse con las primeras r es la mejor aproximación de rango r que existe: el teorema de Eckart–Young que la sección 09 usó sobre una imagen. Las columnas de U son patrones sobre las filas. <span class="cite">Deep Learning §2.8</span>',
    claim: "C = U[:, :r₂]  desde  SVD(T₍₂₎)",
    predict: "Antes de deslizar: «el rango 3 de la hora conserva tres de las 24 horas». ¿Verdadero o falso?",
    b: "<p>Las barras son los valores singulares de un desplegado, el mayor primero, en escala logarítmica: en una lineal verías una sola barra, porque el primero contiene el 99,8% de la energía del desplegado de la hora: σ₁ = 1.101, σ₂ = 31. Las barras iluminadas son las que se conservan; haz clic en una barra para conservar hasta ella.</p><p>Debajo, cada columna conservada de U se dibuja como lo que es. Para la hora, la columna 0 es la forma misma del día (la línea discontinua son los viajes por hora, reescalados para coincidir) y las otras columnas son correcciones, cada una a lo largo de las 24 horas. Así que el rango 3 de la hora conserva tres <em>patrones</em> sobre el día entero, no tres de sus horas. Para un modo de barrio, la columna 0 es casi exactamente Manhattan. A la derecha: el desplegado, y lo que el rango r se deja de él.</p>",
    eqcap: "La SVD del desplegado de la hora; el factor de la hora C son sus primeros r₂ vectores singulares izquierdos, cada uno un patrón sobre las 24 horas.",
    np: {
      unfold: (r, c) => "(" + r + ", " + c + ")",
      svd: (r, c) => "U: (" + r + ", " + c + "), la SVD delgada",
      factor: (r, k, what) => "(" + r + ", " + k + "): " + k + " patrones de " + what,
      energy: (e) => e + " de la energía"
    },
    controls: {mode: "Qué desplegado", r: "Rango conservado, r"},
    options: {mode: {0: "origen (modo 0)", 1: "destino (modo 1)", 2: "hora (modo 2)"}},
    names: AXES_ES,
    axScree: "σ, escala log",
    axPattern: (L, r) => L + " = U[:, :" + r + "]",
    axDay: "discontinua: viajes por hora",
    axX: (m, r, c) => "T" + m + "  " + r + " × " + c,
    axMiss: (r, x) => "lo que se deja el rango " + r + ", ×" + x,
    tip: (n, sv, e) => "σ" + n + " = " + sv + " · conservar " + n + ": " + e + "%",
    readout: (mode, r, rmax, sv0, sv1, energy, uerr, u0) =>
      `La SVD del modo ${mode}: σ₁ = <b>${sv0}</b>, σ₂ = <b>${sv1}</b>. Conservar <b>r = ${r}</b> de a lo sumo ${rmax} ` +
      `columnas guarda el <b>${energy}%</b> de la energía de este desplegado, y la reconstrucción de rango ${r} falla por un <b>${uerr}%</b>. ` +
      u0 + (mode === 2 && rmax === 20 ? " (24 × 20: la U delgada tiene 20 columnas, así que r se detiene en 20, no en 24.)" : ""),
    u0Hour: (peak, busiest, r) => `La columna 0 es la forma del día: tiene su pico en la hora ${peak}, y los viajes por hora tienen el suyo en la ${busiest}. ` +
      `Cada columna conservada es un patrón a lo largo de las 24 horas: el rango ${r} conserva ${r} ${r === 1 ? "patrón" : "patrones"}, no ${r} de las horas.`,
    u0Borough: (name, w) => `La columna 0 es casi exactamente ${name} (${w}): un solo barrio lleva este desplegado.`,
    aria: (ctx) => {
      const s = ctx.state;
      return `Un gráfico de barras en escala logarítmica de los valores singulares del desplegado de ${AXES_ES[s.mode]} con los primeros ${s.r} iluminados, ` +
             `las ${s.r} columnas conservadas de U dibujadas como patrones, y mapas de calor del desplegado y de lo que el rango ${s.r} se deja de él.`;
    }
  };

  const num = (ctx, v, d) => K.num(v, d, ctx.lang);

  window.FactorScenes.register({
    id: "hosvd", section: "10",
    part: {en: "Tucker: one basis per axis", es: "Tucker: una base por eje"},
    hl: ["hour", "rank"],
    copy: {en: EN, es: ES},

    controls: [
      {id: "mode", type: "select", options: ["0", "1", "2"]},
      {id: "r", type: "range", min: 1, max: 20, step: 1, fmt: (v) => "r = " + v}
    ],

    init(ctx) {
      ctx.state.mode = 2;
      ctx.state.r = 3;
    },

    // The select's value is a string; the rank slider's ceiling depends on
    // which mode is chosen, so its max is rewritten here, before draw() and
    // readout() both read the clamped value.
    sync(ctx) {
      ctx.state.mode = Number(ctx.state.mode);
      const rmax = RMAX_LABEL[ctx.state.mode];
      const input = ctx.control("r");
      if (input && Number(input.max) !== rmax) input.max = String(rmax);
      if (ctx.state.r > rmax) ctx.state.r = rmax;
    },

    pick(ctx, key) {
      if (key.startsWith("r:")) ctx.setControls({r: Number(key.slice(2))});
    },
    tip(ctx, key) {
      if (!key.startsWith("r:")) return "";
      const n = Number(key.slice(2));
      const S = FC.hosvdBases(ctx.taxi)[ctx.state.mode].S;
      return ctx.copy.tip(n, num(ctx, S[n - 1], 1), K.pct(FC.svdEnergy(S, n).kept, 2, ctx.lang));
    },

    draw(ctx) {
      const s = ctx.state, svg = ctx.svg, c = ctx.copy;
      const f = facts(ctx);
      const hlHour = ctx.hl === "hour", hlRank = ctx.hl === "rank";
      const axTok = K.AXIS[s.mode];
      // The scree, log scale. Zero singular values (the hour unfolding's
      // last three) sit on the floor rather than at minus infinity.
      const pos = f.S.filter((v) => v > 1e-9);
      const lo = Math.log10(Math.min(...pos)) - 0.3, hi = Math.log10(f.S[0]) + 0.1;
      const logs = f.S.map((v) => (v > 1e-9 ? Math.log10(v) - lo : 0));
      K.label(svg, 40, 62, c.axScree, {size: 10.5, colour: "--stage-mute"});
      K.bars(svg, logs, {
        x: 40, y: 72, w: 340, h: 110, max: hi - lo, gap: 3,
        at: (i) => (i < s.r ? "--fa-t" : axTok), lit: (i) => i < s.r && hlRank,
        alpha: 0.7, pick: (i) => "r:" + (i + 1)
      });
      // Hover says which bar would be the cut.
      if (ctx.hover && ctx.hover.startsWith("r:")) {
        const n = Number(ctx.hover.slice(2));
        const bw = (340 - 3 * (f.S.length - 1)) / f.S.length;
        svg.appendChild(K.el("line", {x1: 40 + n * (bw + 3) - 1.5, y1: 70, x2: 40 + n * (bw + 3) - 1.5, y2: 184,
          stroke: K.css("--fa-t"), "stroke-width": 1.5, "stroke-dasharray": "3 3"}));
      }

      // The kept columns as the patterns they are.
      const y0 = 230, h = 150;
      K.label(svg, 40, y0 - 12, c.axPattern(LETTER[s.mode], s.r), {size: 11, colour: axTok, stroke: hlHour && s.mode === 2 ? axTok : undefined});
      if (s.mode === 2) {
        const hours = FC.marginal(ctx.taxi, 2);
        const norm = Math.hypot(...hours) || 1;
        const lim = Math.max(...f.U.map((row) => Math.max(...row.map(Math.abs))), 0.3);
        svg.appendChild(K.el("line", {x1: 40, y1: y0 + h / 2, x2: 380, y2: y0 + h / 2, stroke: K.css("--stage-mute"), "stroke-width": 0.8}));
        for (let q = s.r - 1; q >= 0; q--) {
          K.curve(svg, f.U.map((row) => row[q]), {
            x: 40, y: y0, w: 340, h, min: -lim, max: lim, token: "--fa-m2",
            width: q === 0 ? 2.6 : 1.3, opacity: q === 0 ? 1 : Math.max(0.3, 0.8 - 0.1 * q),
            dots: q === 0 ? (i) => i === FC.argmax(f.col0) : false, dotToken: () => "--fa-t", dotR: 3.4
          });
        }
        // The trips per hour, rescaled to U[:, 0]'s length, over the top: the
        // two lines lying on each other is the claim.
        K.curve(svg, hours.map((v) => v / norm), {x: 40, y: y0, w: 340, h, min: -lim, max: lim, token: "--stage-ink", width: 1.3, dash: "4 4"});
        [0, 6, 12, 18, 23].forEach((hr) => K.label(svg, 40 + (hr / 23) * 340, y0 + h + 14, String(hr), {size: 10, anchor: "middle", colour: "--fa-m2"}));
        K.label(svg, 380, y0 - 12, c.axDay, {size: 10, anchor: "end", colour: "--stage-mute"});
      } else {
        // Borough patterns: one group of bars per kept column, a borough per bar.
        const names = s.mode === 0 ? ctx.names.pickupShort : ctx.names.dropoffShort;
        const groupW = 340 / s.r;
        for (let q = 0; q < s.r; q++) {
          const v = f.U.map((row) => row[q]);
          const b = K.bars(svg, v, {
            x: 40 + q * groupW + 6, y: y0 + 4, w: groupW - 12, h: h - 20, max: 1, signed: true, gap: 2,
            at: (i) => (v[i] >= 0 ? axTok : "--fa-err"), alpha: q === 0 ? 0.95 : 0.6
          });
          if (groupW > 60) names.forEach((nm, i) => K.label(svg, b.px(i), y0 + h + 4, nm, {size: 9, anchor: "middle", colour: axTok}));
          K.label(svg, 40 + q * groupW + groupW / 2, y0 + h - 2 + (groupW > 60 ? 16 : 0), String(q), {size: 9.5, anchor: "middle", colour: "--stage-mute"});
        }
      }

      // The unfolding, and what rank r misses of it, each on its own scale.
      const X = f.u.X, R = f.u.residual;
      const rows = X.length, cols = X[0].length;
      K.label(svg, 430, 62, c.axX(K.mode(s.mode), rows, cols), {size: 11, colour: axTok});
      K.heat(svg, X, {x: 430, y: 72, w: 360, h: 140, pos: "--fa-core"});
      let peakX = 0, peakR = 0;
      for (const row of X) for (const v of row) peakX = Math.max(peakX, Math.abs(v));
      for (const row of R) for (const v of row) peakR = Math.max(peakR, Math.abs(v));
      const scale = peakR > 1e-9 ? Math.max(1, Math.round(peakX / peakR)) : 1;
      K.label(svg, 430, 244, c.axMiss(s.r, scale), {size: 11, colour: "--fa-err"});
      K.heat(svg, R, {x: 430, y: 254, w: 360, h: 140, peak: peakR > 1e-9 ? peakR : 1, pos: "--fa-err", neg: "--fa-core"});
    },

    readout(ctx) {
      const s = ctx.state, c = ctx.copy;
      const f = facts(ctx);
      let u0;
      if (s.mode === 2) {
        const hours = FC.marginal(ctx.taxi, 2);
        u0 = c.u0Hour(FC.argmax(f.col0), FC.argmax(hours), s.r);
      } else {
        const m = mostly(ctx, s.mode, f.col0);
        u0 = c.u0Borough(m.name, num(ctx, m.w, 2));
      }
      const energy = K.pct(f.e.kept, 2, ctx.lang), uerr = K.pct(f.u.error, 1, ctx.lang);
      return {
        html: c.readout(s.mode, s.r, f.rmax, num(ctx, f.S[0], 1), num(ctx, f.S[1] || 0, 1), energy, uerr, u0),
        claim: LETTER[s.mode] + " = U[:, :" + s.r + "]  from  SVD(T" + K.mode(s.mode) + ")",
        data: {
          mode: s.mode, r: s.r, rmax: f.rmax, sv0: f.S[0].toFixed(2), sv1: (f.S[1] || 0).toFixed(2),
          energy: f.e.kept.toFixed(4), uerr: f.u.error.toFixed(4),
          u0peak: FC.argmax(f.col0.map(Math.abs)),
          fshape: ctx.taxi.shape[s.mode] + "×" + s.r
        }
      };
    },

    shape(ctx) {
      const s = ctx.state;
      return "[" + ctx.taxi.shape[s.mode] + ", " + s.r + "]";
    },

    code(ctx) {
      const s = ctx.state, c = ctx.copy.np, T = ctx.taxi;
      const f = facts(ctx);
      const rows = T.shape[s.mode], cols = T.data.length / rows;
      return K.code([
        ["X = np.moveaxis(T, " + s.mode + ", 0).reshape(" + rows + ", -1)", c.unfold(rows, cols)],
        ["U, s, Vt = np.linalg.svd(X, full_matrices=False)", c.svd(rows, f.rmax)],
        [LETTER[s.mode] + " = U[:, :" + s.r + "]", c.factor(rows, s.r, ctx.copy.names[s.mode])],
        ["(s[:" + s.r + "] ** 2).sum() / (s ** 2).sum()", c.energy(f.e.kept.toFixed(4))]
      ]);
    }
  });
})();
