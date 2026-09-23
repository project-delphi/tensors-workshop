// Scene 4: the Tucker model itself, in one picture. The core G as a block of
// voxels, and one factor matrix against each of its sides, every one of them
// sharing an axis with the core: C's rows run to the right as 24-hour
// patterns, A hangs below, B stands above. A second and third view swap the
// diagram for the rebuilt cube and for what it misses. This is the picture
// the handbook's "4.7x fewer numbers, 6.7% error" is of, and its twin is the
// homepage hero's still. See factor-scenes/README.md for the contract.
(function () {
  "use strict";
  const FC = window.FactorCore, K = window.FactorKit;
  const GAP = 1.3;
  const VIEWS = ["parts", "rebuilt", "residual"];
  const TAU = 0.2;

  function fit(ctx) {
    const s = ctx.state;
    const key = s.r0 + "," + s.r1 + "," + s.r2;
    if (ctx.cache.fitKey !== key) {
      ctx.cache.fitKey = key;
      ctx.cache.fit = FC.hosvd(ctx.taxi, [s.r0, s.r1, s.r2], FC.hosvdBases(ctx.taxi));
    }
    return ctx.cache.fit;
  }

  const entryOf = (ctx) => ctx.state.entry.split(",").map(Number);

  // The ten heaviest core entries, and the one picked if it is not among
  // them: a select of all 400 at full rank is a list nobody reads.
  function entries(ctx) {
    const h = fit(ctx);
    const G = h.core, [r0, r1, r2] = G.shape;
    const all = [];
    for (let a = 0; a < r0; a++)
      for (let b = 0; b < r1; b++)
        for (let c = 0; c < r2; c++) all.push({key: a + "," + b + "," + c, g: FC.at(G, a, b, c)});
    all.sort((p, q) => Math.abs(q.g) - Math.abs(p.g));
    const top = all.slice(0, 10).map((e) => e.key);
    if (ctx.state.entry && !top.includes(ctx.state.entry) && all.some((e) => e.key === ctx.state.entry)) top.push(ctx.state.entry);
    return top;
  }

  // Who a pattern is mostly about, by name: the largest entry of a borough
  // factor's column, or the peak hour of an hour factor's.
  function describe(ctx, mode, v) {
    let best = 0;
    for (let i = 1; i < v.length; i++) if (Math.abs(v[i]) > Math.abs(v[best])) best = i;
    if (mode === 2) return ctx.copy.hourPat(best);
    const names = mode === 0 ? ctx.names.pickup : ctx.names.dropoff;
    return ctx.copy.boroughPat(names[best], K.num(v[best], 2, ctx.lang));
  }

  // Everything both surfaces draw for the current controls, before easing.
  function target(ctx) {
    const s = ctx.state, T = ctx.taxi, h = fit(ctx);
    const [r0, r1, r2] = [s.r0, s.r1, s.r2];
    const [ea, eb, ec] = entryOf(ctx);
    const lit = ctx.hl;
    const items = [], frames = [], labels = [];
    const c = ctx.copy;
    if (s.view === "parts") {
      const G = h.core;
      let gmax = 0;
      for (const v of G.data) gmax = Math.max(gmax, Math.abs(v));
      const corePos = (a, b, cc) => [a - (r0 - 1) / 2, (r2 - 1) / 2 - cc, b - (r1 - 1) / 2];
      for (let a = 0; a < r0; a++)
        for (let b = 0; b < r1; b++)
          for (let cc = 0; cc < r2; cc++) {
            const g = FC.at(G, a, b, cc);
            const key = "G:" + a + "," + b + "," + cc;
            const sel = a === ea && b === eb && cc === ec;
            items.push({
              key, c: corePos(a, b, cc), s: Math.max(0.12, 0.92 * Math.cbrt(Math.abs(g) / gmax)),
              token: sel ? "--fa-t" : g >= 0 ? "--fa-core" : "--fa-err",
              alpha: sel ? 1.2 : 0.8, pick: key, glow: sel,
              stroke: ctx.hover === key ? "--fa-t" : undefined
            });
          }
      // The three factor plates. Each tile is sized by |entry| (a factor's
      // columns are unit vectors, so 1.0 is a full tile) and coloured by its
      // axis, or pink where it is negative; the picked entry's column is gold.
      // Tiles are scaled within their own plate, the largest entry a full
      // tile: the hour factor's entries are spread over 24 rows and none is
      // above 0.3, and on the pickup scale they would be specks.
      const plate = (mode, M, pos, thin, selCol) => {
        const ax = K.AXIS[mode], L = ["A", "B", "C"][mode];
        let big = 1e-9;
        for (const row of M) for (const v of row) big = Math.max(big, Math.abs(v));
        M.forEach((row, i) => row.forEach((v, q) => {
          const key = L + ":" + i + "," + q;
          const t = Math.max(0.08, 0.9 * Math.sqrt(Math.abs(v) / big));
          const sz = thin === 0 ? [0.22, t, t] : [t, t, 0.22];
          items.push({
            key, c: pos(i, q), s: sz,
            token: q === selCol ? "--fa-t" : v >= 0 ? ax : "--fa-err",
            alpha: q === selCol ? 1 : (lit === K.HL_NAME[mode] ? 1 : 0.72), pick: key,
            stroke: ctx.hover === key ? "--fa-t" : undefined
          });
        }));
      };
      const [A, B, C] = h.factors;
      const aPos = (i, q) => [q - (r0 - 1) / 2, -r2 / 2 - GAP - i - 0.5, 0];
      const bPos = (j, q) => [0, r2 / 2 + GAP + j + 0.5, q - (r1 - 1) / 2];
      const cPos = (k, q) => [r0 / 2 + GAP + k + 0.5, (r2 - 1) / 2 - q, 0];
      plate(0, A, aPos, 1, ea);
      plate(1, B, bPos, 0, eb);
      plate(2, C, cPos, 1, ec);
      const pad = 0.35;
      const boxes = {
        core: {min: [-r0 / 2 - pad, -r2 / 2 - pad, -r1 / 2 - pad], max: [r0 / 2 + pad, r2 / 2 + pad, r1 / 2 + pad], token: "--fa-core"},
        pickup: {min: [-r0 / 2 - pad, -r2 / 2 - GAP - 4 - pad, -0.4], max: [r0 / 2 + pad, -r2 / 2 - GAP + pad, 0.4], token: "--fa-m0"},
        dropoff: {min: [-0.4, r2 / 2 + GAP - pad, -r1 / 2 - pad], max: [0.4, r2 / 2 + GAP + 5 + pad, r1 / 2 + pad], token: "--fa-m1"},
        hour: {min: [r0 / 2 + GAP - pad, -r2 / 2 - pad, -0.4], max: [r0 / 2 + GAP + 24 + pad, r2 / 2 + pad, 0.4], token: "--fa-m2"}
      };
      // Every piece has its outline, so the diagram's shape reads even where
      // its tiles are specks; the one an equation letter names is lit.
      for (const k of ["core", "pickup", "dropoff", "hour"]) {
        frames.push(Object.assign({}, boxes[k], {faint: lit !== k}));
      }
      if (lit === "rank") {
        frames.push({min: [ea - (r0 - 1) / 2 - 0.5, -r2 / 2 - GAP - 4, -0.3], max: [ea - (r0 - 1) / 2 + 0.5, -r2 / 2 - GAP, 0.3], token: "--fa-t"});
        frames.push({min: [-0.3, r2 / 2 + GAP, eb - (r1 - 1) / 2 - 0.5], max: [0.3, r2 / 2 + GAP + 5, eb - (r1 - 1) / 2 + 0.5], token: "--fa-t"});
        frames.push({min: [r0 / 2 + GAP, (r2 - 1) / 2 - ec - 0.5, -0.3], max: [r0 / 2 + GAP + 24, (r2 - 1) / 2 - ec + 0.5, 0.3], token: "--fa-t"});
      }
      // Labels: each plate's name and size, the rows it runs over, the core's.
      const g = FC.at(G, ea, eb, ec);
      const at = corePos(ea, eb, ec);
      labels.push({text: "G · " + r0 + "×" + r1 + "×" + r2, pos: [-r0 / 2 - 2.6, Math.min(0, at[1] - 1.6), 0], cls: "core", lit: lit === "core"});
      labels.push({text: "A · 4×" + r0, pos: [r0 / 2 + 2.4, -r2 / 2 - GAP - 2, 0], cls: "m0", lit: lit === "pickup"});
      labels.push({text: "B · 5×" + r1, pos: [2.6, r2 / 2 + GAP + 2.5, 0], cls: "m1", lit: lit === "dropoff"});
      labels.push({text: "C · 24×" + r2, pos: [r0 / 2 + GAP + 12, r2 / 2 + 0.9, 0], cls: "m2", lit: lit === "hour"});
      ctx.names.pickupShort.forEach((nm, i) => labels.push({text: nm, pos: [-r0 / 2 - 1.1, -r2 / 2 - GAP - i - 0.5, 0], cls: "m0"}));
      ctx.names.dropoffShort.forEach((nm, j) => labels.push({text: nm, pos: [-1.2, r2 / 2 + GAP + j + 0.5, -r1 / 2 - 0.2], cls: "m1"}));
      [0, 6, 12, 18, 23].forEach((k) => labels.push({text: String(k), pos: [r0 / 2 + GAP + k + 0.5, -r2 / 2 - 0.75, 0], cls: "m2"}));
      labels.push({text: "G[" + [ea, eb, ec].join(", ") + "] = " + K.num(g, 1, ctx.lang), pos: [-r0 / 2 - 4.4, at[1] + 0.4, 0], cls: "sig"});
      const bounds = {
        min: [-r0 / 2 - 7.4, -r2 / 2 - GAP - 5.4, -Math.max(r1 / 2, 1) - 0.8],
        max: [r0 / 2 + GAP + 24 + 1.2, r2 / 2 + GAP + 5.8, Math.max(r1 / 2, 1) + 0.8]
      };
      return {items, frames, labels, bounds};
    }
    // The rebuilt cube, or what it misses, in the tensor scene's own frame.
    const R = h.recon, shape = T.shape;
    const peakT = Math.max(...T.data);
    let peakRes = 0;
    for (let n = 0; n < T.data.length; n++) peakRes = Math.max(peakRes, Math.abs(T.data[n] - R.data[n]));
    for (let flat = 0; flat < T.data.length; flat++) {
      const ix = FC.multiIndex(flat, shape);
      const key = "cell:" + flat;
      if (s.view === "rebuilt") {
        const v = R.data[flat];
        items.push({key, c: K.cubePos(ix, shape), s: K.side(Math.abs(v), peakT, 0.08),
                    token: v >= 0 ? "--fa-core" : "--fa-err", alpha: 0.78, pick: key,
                    stroke: ctx.hover === key ? "--fa-t" : undefined});
      } else {
        const d = T.data[flat] - R.data[flat];
        items.push({key, c: K.cubePos(ix, shape), s: K.side(Math.abs(d), peakRes, 0.06),
                    token: d >= 0 ? "--fa-err" : "--fa-core", alpha: 0.85, pick: key,
                    stroke: ctx.hover === key ? "--fa-t" : undefined});
      }
    }
    const x1 = (shape[2] - 1) / 2 + 0.5, y1 = (shape[0] - 1) / 2 + 0.5, z1 = (shape[1] - 1) / 2 + 0.5;
    frames.push({min: [-x1, -y1, -z1], max: [x1, y1, z1], token: "--stage-mute", faint: true});
    if (s.view === "residual") {
      const miss = FC.largestMiss(T, R);
      const p = K.cubePos(miss.idx, shape);
      frames.push({min: [p[0] - 0.55, p[1] - 0.55, p[2] - 0.55], max: [p[0] + 0.55, p[1] + 0.55, p[2] + 0.55], token: "--fa-t"});
      labels.push({text: c.missLab(Math.max(1, Math.round(peakT / Math.max(1e-9, peakRes)))), pos: [-x1 + 3, y1 + 1.0, z1], cls: "err"});
    } else {
      labels.push({text: "T̂ = G ×₀ A ×₁ B ×₂ C", pos: [0, y1 + 1.0, z1], cls: "core"});
    }
    [0, 6, 12, 18, 23].forEach((k) => labels.push({text: String(k), pos: [k - (shape[2] - 1) / 2, -y1 - 0.55, z1], cls: "m2"}));
    ctx.names.pickupShort.forEach((nm, i) => labels.push({text: nm, pos: [-x1 - 0.9, (shape[0] - 1) / 2 - i, z1], cls: "m0"}));
    return {items, frames, labels, bounds: {min: [-x1 - 2.2, -y1 - 1.3, -z1 - 0.6], max: [x1 + 0.8, y1 + 1.6, z1 + 0.6]}};
  }

  // The eased picture: target() through K.follow, keyed by piece. Memoised
  // per frame, because bounds() and render() both ask.
  function shown(ctx) {
    const c = ctx.cache;
    const t = ctx.now();
    const key = JSON.stringify(ctx.state) + "|" + ctx.hl + "|" + ctx.hover;
    if (c.memo && c.memo.key === key && t - c.memo.t < 4) return c.memo.m;
    const want = target(ctx);
    c.ease = c.ease || {};
    const items = K.follow(c.ease, want.items, t, TAU, ctx.instant);
    const m = Object.assign({}, want, {items, bounds: K.withLabels(want.bounds, want.labels)});
    c.memo = {key, t, m};
    return m;
  }

  function sharesText(ctx) {
    const s = ctx.state;
    const core = s.r0 * s.r1 * s.r2, a = 4 * s.r0, b = 5 * s.r1, cc = 24 * s.r2;
    return "G " + core + " + A " + a + " + B " + b + " + C " + cc + " = " + (core + a + b + cc) + " / 480";
  }

  const EN = {
    k: "Tucker decomposition · section 10",
    h: "A small core, and one factor matrix per axis, stand in for the whole cube",
    concept: 'Tucker keeps one truncated SVD basis per mode and contracts the tensor down onto all three at once: a small core G, plus three tall, thin factor matrices A, B, C with orthonormal columns, rebuild the original cube. <span class="cite">Kolda &amp; Bader §4</span>',
    claim: "T ≈ G ×₀ A ×₁ B ×₂ C,  480 → 102,  4.71×  at  6.7%",
    predict: "Before you slide: lower the hour rank from 3 to 1. Does the error jump, or barely move?",
    b: "<p>This is the whole Tucker model on one stage: the core G in the middle, and one factor matrix against each of its sides -- C to the right, one row of 24 tiles per hour pattern, A below for pickup and B above for dropoff, each tile sized by its entry. At ranks (2, 2, 3) they hold 102 numbers in place of 480: a 4.71× saving, at 6.7% relative error.</p><p>Every trip count is a sum over the core: each entry G[a, b, c] weights one pickup pattern, one dropoff pattern and one hour pattern. Click a core voxel, or a factor's column, to pick the entry that multiplies it. One entry, G[0, 0, 0] = 1,096.8, is 99.4% of the fit on its own: Manhattan, Manhattan and the day. Switch the view to see the cube this rebuilds, and what it misses.</p>",
    eqcap: "Each count is a sum over the core: G[a, b, c] weights pickup pattern a, dropoff pattern b and hour pattern c. Point at a letter to light its piece.",
    np: {
      ranks: "pickup, dropoff, hour",
      shapes: (r) => "(4, " + r[0] + ") (5, " + r[1] + ") (24, " + r[2] + ")",
      core: (r) => "(" + r.join(", ") + "): the core",
      back: "(4, 5, 24) again",
      err: (e) => e + " relative error",
      share: (sh) => "its share of the fit: " + sh
    },
    controls: {r0: "Pickup rank, r₀", r1: "Dropoff rank, r₁", r2: "Hour rank, r₂", view: "Show", entry: "Core entry"},
    options: {
      view: {parts: "the parts: core and factors", rebuilt: "the rebuilt cube, T̂", residual: "what it misses, T − T̂"},
      entry: (o, ctx) => {
        const [a, b, c] = o.split(",").map(Number);
        const h = fit(ctx), g = FC.coreTerm(h, a, b, c);
        return "G[" + a + ", " + b + ", " + c + "] = " + K.num(g.g, 1, "en") + "  (" + K.pct(g.share, 1, "en") + "%)";
      }
    },
    missLab: (x) => "T − T̂, drawn ×" + x,
    hourPat: (k) => "peaks at hour " + k,
    boroughPat: (name, w) => "mostly " + name + ", " + w,
    tipG: (a, b, c, g, sh) => "G[" + a + ", " + b + ", " + c + "] = " + g + " · " + sh + "% of the fit",
    tipF: (L, i, q, v, what) => L + "[" + i + ", " + q + "] = " + v + " · " + what,
    tipCell: (route, k, t, r) => route + " · hour " + k + " · " + t + " trips, rebuilt " + r,
    readout: (r, core, a, b, c, params, ratio, err, g, share, pats, extra) =>
      `At ranks <b>(${r.join(", ")})</b> the core holds ${core} ${core === 1 ? "number" : "numbers"} and the factors ${a} + ${b} + ${c}: ` +
      (params < 480
        ? `<b>${params}</b> in place of 480, a <b>${ratio}×</b> saving, at <b>${err}%</b> error. `
        : `<b>${params}</b> -- more numbers than the 480 it stands in for, and so no saving at all, at <b>${err}%</b> error. `) +
      `<b>G[${pats.at}] = ${g}</b> is <b>${share}%</b> of the fit on its own: it multiplies pickup pattern ${pats.ai} ` +
      `(${pats.a}), dropoff pattern ${pats.bi} (${pats.b}) and hour pattern ${pats.ci} (${pats.c}).` + extra,
    extraRebuilt: "The rebuilt cube is drawn at the tensor's own scale: at these ranks it keeps the day's shape on every route it can afford.",
    extraMiss: (route, k, t, r) => ` The biggest miss is <b>${route}</b> in hour <b>${k}</b>: ${t} trips, rebuilt as ${r}.`,
    aria: (ctx) => {
      const s = ctx.state;
      if (s.view !== "parts") {
        return `The 4 by 5 by 24 cube ${s.view === "rebuilt" ? "rebuilt from" : "minus its rebuild from"} a Tucker model at ranks ${s.r0}, ${s.r1}, ${s.r2}.`;
      }
      return `A Tucker model at ranks ${s.r0}, ${s.r1}, ${s.r2}: a ${s.r0} by ${s.r1} by ${s.r2} core of voxels, ` +
             `with the hour factor C as rows of 24 tiles to its right, the pickup factor A below and the dropoff factor B above.`;
    }
  };
  const ES = {
    k: "Descomposición de Tucker · sección 10",
    h: "Un núcleo pequeño y una matriz factor por eje sustituyen al cubo entero",
    concept: 'Tucker conserva una base de SVD truncada por modo y contrae el tensor sobre las tres a la vez: un núcleo G pequeño, más tres matrices factor altas y delgadas A, B, C de columnas ortonormales, reconstruyen el cubo original. <span class="cite">Kolda &amp; Bader §4</span>',
    claim: "T ≈ G ×₀ A ×₁ B ×₂ C,  480 → 102,  4.71×  al  6.7%",
    predict: "Antes de deslizar: baja el rango de la hora de 3 a 1. ¿El error se dispara, o apenas se mueve?",
    b: "<p>Este es el modelo de Tucker entero en un escenario: el núcleo G en el medio, y una matriz factor contra cada uno de sus lados: C a la derecha, una fila de 24 teselas por patrón horario, A debajo para el origen y B encima para el destino, cada tesela del tamaño de su entrada. En los rangos (2, 2, 3) guardan 102 números en lugar de 480: un ahorro de 4,71×, con un error relativo del 6,7%.</p><p>Cada conteo de viajes es una suma sobre el núcleo: cada entrada G[a, b, c] pondera un patrón de origen, uno de destino y uno horario. Haz clic en un vóxel del núcleo, o en una columna de un factor, para elegir la entrada que la multiplica. Una entrada, G[0, 0, 0] = 1.096,8, es por sí sola el 99,4% del ajuste: Manhattan, Manhattan y el día. Cambia la vista para ver el cubo que reconstruye, y lo que se deja.</p>",
    eqcap: "Cada conteo es una suma sobre el núcleo: G[a, b, c] pondera el patrón de origen a, el de destino b y el horario c. Señala una letra para iluminar su pieza.",
    np: {
      ranks: "origen, destino, hora",
      shapes: (r) => "(4, " + r[0] + ") (5, " + r[1] + ") (24, " + r[2] + ")",
      core: (r) => "(" + r.join(", ") + "): el núcleo",
      back: "(4, 5, 24) otra vez",
      err: (e) => e + " de error relativo",
      share: (sh) => "su parte del ajuste: " + sh
    },
    controls: {r0: "Rango de origen, r₀", r1: "Rango de destino, r₁", r2: "Rango de la hora, r₂", view: "Mostrar", entry: "Entrada del núcleo"},
    options: {
      view: {parts: "las piezas: núcleo y factores", rebuilt: "el cubo reconstruido, T̂", residual: "lo que se deja, T − T̂"},
      entry: (o, ctx) => {
        const [a, b, c] = o.split(",").map(Number);
        const h = fit(ctx), g = FC.coreTerm(h, a, b, c);
        return "G[" + a + ", " + b + ", " + c + "] = " + K.num(g.g, 1, "es") + "  (" + K.pct(g.share, 1, "es") + "%)";
      }
    },
    missLab: (x) => "T − T̂, dibujado ×" + x,
    hourPat: (k) => "con su pico en la hora " + k,
    boroughPat: (name, w) => "sobre todo " + name + ", " + w,
    tipG: (a, b, c, g, sh) => "G[" + a + ", " + b + ", " + c + "] = " + g + " · " + sh + "% del ajuste",
    tipF: (L, i, q, v, what) => L + "[" + i + ", " + q + "] = " + v + " · " + what,
    tipCell: (route, k, t, r) => route + " · hora " + k + " · " + t + " viajes, reconstruido " + r,
    readout: (r, core, a, b, c, params, ratio, err, g, share, pats, extra) =>
      `En los rangos <b>(${r.join(", ")})</b> el núcleo guarda ${core} ${core === 1 ? "número" : "números"} y los factores ${a} + ${b} + ${c}: ` +
      (params < 480
        ? `<b>${params}</b> en lugar de 480, un ahorro de <b>${ratio}×</b>, con un error del <b>${err}%</b>. `
        : `<b>${params}</b>, más números que los 480 a los que sustituye, así que ningún ahorro, con un error del <b>${err}%</b>. `) +
      `<b>G[${pats.at}] = ${g}</b> es por sí sola el <b>${share}%</b> del ajuste: multiplica el patrón de origen ${pats.ai} ` +
      `(${pats.a}), el de destino ${pats.bi} (${pats.b}) y el horario ${pats.ci} (${pats.c}).` + extra,
    extraRebuilt: "El cubo reconstruido se dibuja a la escala del propio tensor: con estos rangos conserva la forma del día en cada ruta que puede pagar.",
    extraMiss: (route, k, t, r) => ` El mayor fallo es <b>${route}</b> en la hora <b>${k}</b>: ${t} viajes, reconstruidos como ${r}.`,
    aria: (ctx) => {
      const s = ctx.state;
      if (s.view !== "parts") {
        return `El cubo de 4 por 5 por 24 ${s.view === "rebuilt" ? "reconstruido desde" : "menos su reconstrucción desde"} un modelo de Tucker en los rangos ${s.r0}, ${s.r1}, ${s.r2}.`;
      }
      return `Un modelo de Tucker en los rangos ${s.r0}, ${s.r1}, ${s.r2}: un núcleo de ${s.r0} por ${s.r1} por ${s.r2} vóxeles, ` +
             `con el factor horario C como filas de 24 teselas a su derecha, el factor de origen A debajo y el de destino B encima.`;
    }
  };

  window.FactorScenes.register({
    id: "tucker", section: "10", gl: true,
    hl: ["core", "pickup", "dropoff", "hour", "rank"],
    copy: {en: EN, es: ES},

    pose: {fov: 30, home: {az: -0.72, el: 0.32}, margin: 1.03,
           limits: {azMin: -1.2, azMax: 1.2, elMin: -0.35, elMax: 1.1, dollyMin: 0.5, dollyMax: 1.8}},

    controls: [
      {id: "r0", type: "range", min: 1, max: 4, step: 1, fmt: (v) => String(v)},
      {id: "r1", type: "range", min: 1, max: 5, step: 1, fmt: (v) => String(v)},
      {id: "r2", type: "range", min: 1, max: 20, step: 1, fmt: (v) => String(v)},
      {id: "view", type: "select", options: VIEWS},
      {id: "entry", type: "select", options: ["0,0,0"], available: (ctx) => entries(ctx)}
    ],

    init(ctx) {
      ctx.state.r0 = 2;
      ctx.state.r1 = 2;
      ctx.state.r2 = 3;
      ctx.state.view = "parts";
      ctx.state.entry = "0,0,0";
    },

    // An entry the ranks no longer have goes back to the corner, which every
    // rank has.
    sync(ctx) {
      const s = ctx.state;
      const [a, b, c] = entryOf(ctx);
      if (!(a < s.r0 && b < s.r1 && c < s.r2)) s.entry = "0,0,0";
    },

    animates(ctx) { return !!(ctx.cache.ease && ctx.cache.ease.moving); },
    bounds(ctx) { return shown(ctx).bounds; },

    pick(ctx, key) {
      const [kind, rest] = key.split(":");
      const v = rest.split(",").map(Number);
      const [a, b, c] = entryOf(ctx);
      if (kind === "G") ctx.setControls({entry: v.join(",")});
      else if (kind === "A") ctx.setControls({entry: [v[1], b, c].join(",")});
      else if (kind === "B") ctx.setControls({entry: [a, v[1], c].join(",")});
      else if (kind === "C") ctx.setControls({entry: [a, b, v[1]].join(",")});
    },
    tip(ctx, key) {
      const [kind, rest] = key.split(":");
      const v = rest.split(",").map(Number);
      const h = fit(ctx), c = ctx.copy;
      if (kind === "G") {
        const g = FC.coreTerm(h, v[0], v[1], v[2]);
        return c.tipG(v[0], v[1], v[2], K.num(g.g, 1, ctx.lang), K.pct(g.share, 1, ctx.lang));
      }
      if (kind === "cell") {
        const ix = FC.multiIndex(v[0], ctx.taxi.shape);
        return c.tipCell(ctx.names.pickup[ix[0]] + " → " + ctx.names.dropoff[ix[1]], ix[2],
                         Math.round(ctx.taxi.data[v[0]]), K.num(h.recon.data[v[0]], 1, ctx.lang));
      }
      const mode = {A: 0, B: 1, C: 2}[kind];
      const name = mode === 2 ? String(v[0]) : (mode === 0 ? ctx.names.pickup : ctx.names.dropoff)[v[0]];
      return c.tipF(kind, v[0], v[1], K.num(h.factors[mode][v[0]][v[1]], 2, ctx.lang), name);
    },

    build(ctx) {
      const THREE = ctx.THREE;
      const scene = new THREE.Scene();
      K.light(scene);
      // Sized for the largest diagram (400 core voxels and 521 tiles at full
      // rank) plus a cube's worth of pieces shrinking away from the last view.
      const vox = K.voxels(1500);
      scene.add(vox.mesh, vox.hit);
      const glow = K.glowBox("--fa-t", 0.35);
      scene.add(glow);
      const frames = [0, 1, 2, 3, 4, 5, 6].map(() => { const f = K.frameBox("--stage-ink"); scene.add(f); return f; });
      // Which piece each instance is this frame: the set changes with the
      // ranks and while old pieces shrink away, so the map is rewritten by
      // render() and read by the frame's raycast.
      const keys = [];
      return {
        scene, vox, glow, frames, keys, labels: K.labelPool(scene), col: K.palette(), frameCol: K.palette(),
        cam: new THREE.PerspectiveCamera(this.pose.fov, ctx.aspect, 0.1, 600),
        pick: [{mesh: vox.hit, key: (id) => keys[id] || null}]
      };
    },

    render(ctx, gl) {
      const m = shown(ctx);
      gl.keys.length = 0;
      let glowAt = null;
      m.items.forEach((it, n) => {
        gl.vox.set(n, it.c, it.s, gl.col(it.stroke ? "--fa-t" : it.token, Math.min(1, it.alpha)));
        gl.keys[n] = it.pick || null;
        if (it.glow) glowAt = it;
      });
      gl.vox.count(m.items.length);
      gl.vox.commit();
      gl.glow.visible = !!glowAt;
      if (glowAt) {
        gl.glow.position.set(glowAt.c[0], glowAt.c[1], glowAt.c[2]);
        gl.glow.scale.set(glowAt.s[0] * 1.02, glowAt.s[1] * 1.02, glowAt.s[2] * 1.02);
      }
      gl.frames.forEach((f, n) => {
        const b = m.frames[n];
        f.visible = !!b;
        if (!b) return;
        f.material.color.copy(gl.frameCol(b.token, 1));
        f.material.opacity = b.faint ? 0.4 : 0.95;
        K.setBox(f, b.min, b.max);
      });
      gl.labels.sync(m.labels);
    },

    draw(ctx) {
      const m = shown(ctx);
      const P = ctx.projector(K.corners(m.bounds.min, m.bounds.max), ctx.box());
      m.frames.filter((f) => f.faint).forEach((f) => K.edges2(ctx.svg, f.min, f.max, P, f.token, {opacity: 0.35, width: 1}));
      K.boxes2(ctx.svg, m.items, ctx.basis(), P);
      m.frames.filter((f) => !f.faint).forEach((f) => K.edges2(ctx.svg, f.min, f.max, P, f.token, {width: 1.6}));
      K.labels2(ctx.svg, m.labels, P);
    },

    readout(ctx) {
      const T = ctx.taxi, s = ctx.state, c = ctx.copy;
      const h = fit(ctx);
      const [a, b, cc] = entryOf(ctx);
      const term = FC.coreTerm(h, a, b, cc);
      const col0 = h.factors[2].map((row) => row[0]);
      const hourpeak = FC.argmax(col0);
      const r = [s.r0, s.r1, s.r2];
      const pats = {
        at: [a, b, cc].join(", "), ai: a, bi: b, ci: cc,
        a: describe(ctx, 0, term.a), b: describe(ctx, 1, term.b), c: describe(ctx, 2, term.c)
      };
      const miss = FC.largestMiss(T, h.recon);
      let extra = "";
      if (s.view === "rebuilt") extra = " " + c.extraRebuilt;
      if (s.view === "residual") {
        extra = c.extraMiss(ctx.names.pickup[miss.idx[0]] + " → " + ctx.names.dropoff[miss.idx[1]], miss.idx[2],
                            Math.round(miss.t), K.num(miss.r, 1, ctx.lang));
      }
      const errPct = K.pct(h.error, 1, ctx.lang);
      return {
        html: c.readout(r, s.r0 * s.r1 * s.r2, 4 * s.r0, 5 * s.r1, 24 * s.r2, h.params,
                        K.num(h.ratio, 2, ctx.lang), errPct, K.num(term.g, 1, ctx.lang), K.pct(term.share, 1, ctx.lang), pats, extra),
        claim: `T ≈ G ×₀ A ×₁ B ×₂ C,  480 → ${h.params},  ${h.ratio.toFixed(2)}×  ${ctx.lang === "es" ? "al" : "at"}  ${(h.error * 100).toFixed(1)}%`,
        caption: sharesText(ctx),
        data: {
          ranks: r.join(","), core: h.core.data.length, params: h.params,
          dense: T.data.length, ratio: h.ratio.toFixed(2), err: h.error.toFixed(3),
          hourpeak, shape: T.shape.join(","), view: s.view, entry: [a, b, cc].join(","),
          g: term.g.toFixed(1), share: term.share.toFixed(3),
          miss: miss.idx.join(","), missdiff: miss.diff.toFixed(1)
        }
      };
    },

    code(ctx) {
      const s = ctx.state, c = ctx.copy.np;
      const h = fit(ctx);
      const r = [s.r0, s.r1, s.r2];
      const [a, b, cc] = entryOf(ctx);
      const term = FC.coreTerm(h, a, b, cc);
      return K.code([
        ["ranks = (" + r.join(", ") + ")", c.ranks],
        ["A, B, C = (U[:, :r] for U, r in zip(bases, ranks))", c.shapes(r)],
        ['G = np.einsum("ijk,ia,jb,kc->abc", T, A, B, C)', c.core(r)],
        ['T_hat = np.einsum("abc,ia,jb,kc->ijk", G, A, B, C)', c.back],
        ["np.linalg.norm(T - T_hat) / np.linalg.norm(T)", c.err(h.error.toFixed(3))],
        ["G[" + [a, b, cc].join(", ") + "] ** 2 / (G ** 2).sum()", c.share(term.share.toFixed(3))]
      ]);
    }
  });
})();
