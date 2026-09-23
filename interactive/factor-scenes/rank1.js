// Scene 5: one rank-1 term is three vectors and a weight. The real best
// rank-1 fit of the taxi tensor -- lambda and unit vectors a, b, c, found by
// CP at R = 1 -- stands as three rows of bars on three edges of the cube,
// and fills the cube with lambda a[i] b[j] c[k]. Scaling one entry of a
// scales a whole plane; moving a factor from c into a changes nothing, which
// is why CP carries lambda at all. Drawn in three.js, with an SVG twin.
// See factor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const FC = window.FactorCore, K = window.FactorKit;
  const VIEWS = ["term", "taxi", "left"];
  const TAU = 0.2;

  // The best rank-1 term there is for this tensor, normalised: {lam, a, b,
  // c}. The same number as the Tucker core's corner, found a second way.
  function best(ctx) {
    if (!ctx.cache.best || ctx.cache.bestFor !== ctx.taxi) {
      const n = FC.cpNormalize(FC.cpAls(ctx.taxi, 1, 100, 1));
      ctx.cache.best = {lam: n.weights[0], a: n.factors[0][0], b: n.factors[1][0], c: n.factors[2][0]};
      ctx.cache.bestFor = ctx.taxi;
    }
    return ctx.cache.best;
  }

  // The term as the controls have it: a[entry] scaled, and a factor s moved
  // from c into a (a times s, c over s). Returned with the tensor it builds.
  function term(ctx) {
    const s = ctx.state, t = best(ctx);
    const move = Math.pow(2, s.move);
    const a = t.a.map((v, i) => v * move * (i === s.entry ? s.scale / 100 : 1));
    const c = t.c.map((v) => v / move);
    const T1 = FC.outer3(a.map((v) => v * t.lam), t.b, c);
    return {lam: t.lam, a, b: t.b, c, T1, move};
  }

  const LEN = {a: 2.4, b: 2.4, c: 8};   // world units per unit of each vector

  function target(ctx) {
    const s = ctx.state, T = ctx.taxi, shape = T.shape;
    const tm = term(ctx);
    const peak = Math.max(...T.data);
    const lit = ctx.hl;
    const items = [], labels = [];
    for (let flat = 0; flat < T.data.length; flat++) {
      const ix = FC.multiIndex(flat, shape);
      const key = "cell:" + flat;
      const inPlane = ix[0] === s.entry;
      let v, token;
      if (s.view === "term") { v = tm.T1.data[flat]; token = inPlane && s.scale !== 100 ? "--fa-t" : "--fa-core"; }
      else if (s.view === "taxi") { v = T.data[flat]; token = v > 0 ? "--stage-ink" : "--fa-ghost"; }
      else { v = T.data[flat] - tm.T1.data[flat]; token = v >= 0 ? "--fa-err" : "--fa-core"; }
      items.push({
        key, c: K.cubePos(ix, shape), s: K.side(Math.abs(v), peak, 0.08), token,
        alpha: inPlane && lit === "pickup" ? 1 : 0.78, pick: key,
        stroke: ctx.hover === key ? "--fa-t" : undefined
      });
    }
    const x0 = -(shape[2] - 1) / 2 - 0.5, y1 = (shape[0] - 1) / 2 + 0.5, z1 = (shape[1] - 1) / 2 + 0.5;
    // a down the near end, bars pointing out to the left; b across the top of
    // that end, bars pointing up; c along the bottom front edge, bars
    // pointing down -- the three edges that meet at one corner.
    tm.a.forEach((v, i) => {
      const at = [x0 - 0.6, (shape[0] - 1) / 2 - i, z1];
      const len = v * LEN.a;
      items.push({key: "a:" + i, c: [at[0] - len / 2, at[1], at[2]], s: [Math.max(0.05, Math.abs(len)), 0.62, 0.62],
                  token: i === s.entry ? "--fa-t" : "--fa-m0", alpha: lit === "pickup" || i === s.entry ? 1 : 0.8,
                  pick: "a:" + i, stroke: ctx.hover === "a:" + i ? "--fa-t" : undefined});
    });
    tm.b.forEach((v, j) => {
      const len = v * LEN.b;
      items.push({key: "b:" + j, c: [x0 + 0.5, y1 + 0.6 + len / 2, j - (shape[1] - 1) / 2], s: [0.62, Math.max(0.05, Math.abs(len)), 0.62],
                  token: "--fa-m1", alpha: lit === "dropoff" ? 1 : 0.8, pick: "b:" + j,
                  stroke: ctx.hover === "b:" + j ? "--fa-t" : undefined});
    });
    tm.c.forEach((v, k) => {
      const len = v * LEN.c;
      items.push({key: "c:" + k, c: [k - (shape[2] - 1) / 2, -y1 - 0.6 - len / 2, z1 + 0.5], s: [0.62, Math.max(0.05, Math.abs(len)), 0.62],
                  token: "--fa-m2", alpha: lit === "hour" ? 1 : 0.8, pick: "c:" + k,
                  stroke: ctx.hover === "c:" + k ? "--fa-t" : undefined});
    });
    labels.push({text: "a", pos: [x0 - 0.6 - LEN.a * 1.25, y1 + 0.3, z1], cls: "m0", lit: lit === "pickup", size: 13});
    labels.push({text: "b", pos: [x0 + 0.5, y1 + 0.9 + LEN.b, -z1 - 0.2], cls: "m1", lit: lit === "dropoff", size: 13});
    labels.push({text: "c", pos: [(shape[2] - 1) / 2 + 1.8, -y1 - 1.2, z1 + 0.5], cls: "m2", lit: lit === "hour", size: 13});
    labels.push({text: "λ = " + K.num(tm.lam, 1, ctx.lang), pos: [4, y1 + 1.4, 0], cls: "core", lit: lit === "rank", size: 13});
    ctx.names.pickupShort.forEach((nm, i) => labels.push({text: nm, pos: [x0 - 0.1, (shape[0] - 1) / 2 - i, z1 + 0.9], cls: "m0", lit: i === s.entry}));
    [0, 6, 12, 18, 23].forEach((k) => labels.push({text: String(k), pos: [k - (shape[2] - 1) / 2, -y1 - 0.9 - LEN.c * 0.33, z1 + 0.5], cls: "m2"}));
    const amax = Math.max(...tm.a.map(Math.abs)) * LEN.a;
    const cmax = Math.max(...tm.c.map(Math.abs)) * LEN.c;
    const bounds = {
      min: [x0 - 0.6 - Math.max(amax, LEN.a) - 1.2, -y1 - 0.9 - Math.max(cmax, LEN.c * 0.33) - 0.6, -z1 - 0.8],
      max: [-x0 + 2.6, y1 + 0.9 + LEN.b + 0.8, z1 + 1.2]
    };
    return {items, labels, bounds};
  }

  function shown(ctx) {
    const c = ctx.cache;
    const t = ctx.now();
    const key = JSON.stringify(ctx.state) + "|" + ctx.hl + "|" + ctx.hover;
    if (c.memo && c.memo.key === key && t - c.memo.t < 4) return c.memo.m;
    const want = target(ctx);
    c.ease = c.ease || {};
    const items = K.follow(c.ease, want.items, t, TAU, ctx.instant);
    const m = Object.assign({}, want, {items});
    c.memo = {key, t, m};
    return m;
  }

  // Whether the term with a[entry] scaled differs from the unscaled one in
  // exactly that plane, by exactly that factor -- the claim the scene makes.
  function proportional(ctx) {
    const s = ctx.state, t = best(ctx), shape = ctx.taxi.shape;
    const move = Math.pow(2, s.move);
    const base = FC.outer3(t.a.map((v) => v * move * t.lam), t.b, t.c.map((v) => v / move));
    const now = term(ctx).T1;
    const k = s.scale / 100;
    for (let flat = 0; flat < base.data.length; flat++) {
      const i = FC.multiIndex(flat, shape)[0];
      const want = i === s.entry ? base.data[flat] * k : base.data[flat];
      if (Math.abs(now.data[flat] - want) > 1e-9 * Math.max(1, Math.abs(want))) return false;
    }
    return true;
  }

  // Whether moving the factor left every one of the 480 numbers where it was.
  function unchanged(ctx) {
    const s = ctx.state, t = best(ctx);
    const k = s.scale / 100;
    const a0 = t.a.map((v, i) => v * (i === s.entry ? k : 1));
    const plain = FC.outer3(a0.map((v) => v * t.lam), t.b, t.c);
    const now = term(ctx).T1;
    let worst = 0;
    for (let n = 0; n < plain.data.length; n++) worst = Math.max(worst, Math.abs(plain.data[n] - now.data[n]));
    return worst < 1e-9;
  }

  const EN = {
    k: "A rank-1 term · section 11",
    h: "One weight and three vectors fill the whole cube -- and 10% is all they miss",
    concept: 'The simplest tensor that is not all zero is an outer product: T[i, j, k] = λ a[i] b[j] c[k]. It takes I + J + K numbers to describe I · J · K entries -- and the vectors can trade scale among themselves without changing a single entry. <span class="cite">Kolda &amp; Bader §3</span>',
    claim: "T[i, j, k] ≈ λ a[i] b[j] c[k],  33 numbers",
    predict: "Before you slide: double a and halve c. Does anything in the cube change?",
    b: "<p>This is the best single term the taxi tensor has: a weight λ = 1,096.8 and three unit vectors -- a over pickup (the bars on the left), b over dropoff (on top), c over the hour (along the bottom). Their product fills all 480 cells from 4 + 5 + 24 = 33 numbers, and misses the real counts by only 10.07%. a is almost exactly Manhattan, b too, and c is the shape of the day: the same λ as the Tucker core's corner, found a second way.</p><p>Scale one entry of <b>a</b> and a whole plane of the cube scales with it -- every dropoff, every hour -- because each of those cells is a[i] times the same b ⊗ c picture. Then <b>move</b> a factor from c into a: the bars change and not one voxel does. The scale lives in λ, and the vectors are unit length so that it has one place to live.</p>",
    eqcap: "One weight λ and three vectors of length 4, 5 and 24. Point at a letter to light its bars.",
    np: {
      build: "(4, 5, 24) from 33 numbers",
      err: (e) => e + " relative error",
      scale: (i, k) => "scales only T1[" + i + ", :, :], by " + k,
      move: (s) => "a × " + s + ", c ÷ " + s,
      same: "True: the same tensor"
    },
    controls: {entry: "Entry of a", scale: "Scale a[entry]", move: "Move a factor from c into a", view: "Show"},
    options: {view: {term: "the term, λ a ⊗ b ⊗ c", taxi: "the taxi tensor, T", left: "what the term misses"}},
    fmtMove: (s) => (s === 1 ? "none" : "a × " + s + ", c ÷ " + s),
    tipCell: (route, k, v) => route + " · hour " + k + " · " + v,
    tipVec: (L, i, v, name) => L + "[" + i + "] = " + v + (name ? " · " + name : ""),
    readout: (err, lam, aMost, bMost, cPeak, scaleLine, moveLine) =>
      `One term: <b>λ = ${lam}</b> and three unit vectors, 33 numbers, rebuild all 480 at <b>${err}%</b> error. ` +
      `a is mostly ${aMost}, b is mostly ${bMost}, and c peaks at hour ${cPeak}.` + scaleLine + moveLine,
    scaleLine: (name, pct, n) => ` Scaling a[${name}] to <b>${pct}%</b> scaled every one of the ${n} cells in the ${name} plane by exactly that, and nothing else.`,
    moveLine: (s) => ` Moving ×${s} from c into a changed both sets of bars and <b>none</b> of the 480 cells: the tensor cannot tell, which is why CP keeps a, b and c at unit length and puts the size in λ.`,
    aria: (ctx) => {
      const s = ctx.state;
      return `A 4 by 5 by 24 cube filled by one rank-1 term, with its three vectors as rows of bars along three edges: ` +
             `a on the left, b on top, c along the bottom. Entry ${s.entry} of a is scaled to ${s.scale} percent.`;
    }
  };
  const ES = {
    k: "Un término de rango 1 · sección 11",
    h: "Un peso y tres vectores llenan el cubo entero, y solo se dejan un 10%",
    concept: 'El tensor más simple que no es todo ceros es un producto externo: T[i, j, k] = λ a[i] b[j] c[k]. Hacen falta I + J + K números para describir I · J · K entradas, y los vectores pueden intercambiarse escala entre sí sin cambiar ni una entrada. <span class="cite">Kolda &amp; Bader §3</span>',
    claim: "T[i, j, k] ≈ λ a[i] b[j] c[k],  33 números",
    predict: "Antes de deslizar: duplica a y divide c a la mitad. ¿Cambia algo en el cubo?",
    b: "<p>Este es el mejor término único que tiene el tensor de taxis: un peso λ = 1.096,8 y tres vectores unitarios: a sobre el origen (las barras de la izquierda), b sobre el destino (arriba), c sobre la hora (a lo largo de la base). Su producto llena las 480 celdas con 4 + 5 + 24 = 33 números, y se aleja de los conteos reales solo un 10,07%. a es casi exactamente Manhattan, b también, y c es la forma del día: el mismo λ que la esquina del núcleo de Tucker, encontrado por otro camino.</p><p>Escala una entrada de <b>a</b> y todo un plano del cubo se escala con ella (cada destino, cada hora) porque cada una de esas celdas es a[i] por la misma imagen b ⊗ c. Después <b>mueve</b> un factor de c a a: las barras cambian y ni un vóxel lo hace. La escala vive en λ, y los vectores tienen longitud unitaria para que tenga un solo sitio donde vivir.</p>",
    eqcap: "Un peso λ y tres vectores de longitud 4, 5 y 24. Señala una letra para iluminar sus barras.",
    np: {
      build: "(4, 5, 24) desde 33 números",
      err: (e) => e + " de error relativo",
      scale: (i, k) => "escala solo T1[" + i + ", :, :], por " + k,
      move: (s) => "a × " + s + ", c ÷ " + s,
      same: "True: el mismo tensor"
    },
    controls: {entry: "Entrada de a", scale: "Escalar a[entrada]", move: "Mover un factor de c a a", view: "Mostrar"},
    options: {view: {term: "el término, λ a ⊗ b ⊗ c", taxi: "el tensor de taxis, T", left: "lo que se deja el término"}},
    fmtMove: (s) => (s === 1 ? "nada" : "a × " + s + ", c ÷ " + s),
    tipCell: (route, k, v) => route + " · hora " + k + " · " + v,
    tipVec: (L, i, v, name) => L + "[" + i + "] = " + v + (name ? " · " + name : ""),
    readout: (err, lam, aMost, bMost, cPeak, scaleLine, moveLine) =>
      `Un término: <b>λ = ${lam}</b> y tres vectores unitarios, 33 números, reconstruyen las 480 celdas con un <b>${err}%</b> de error. ` +
      `a es sobre todo ${aMost}, b es sobre todo ${bMost}, y c tiene su pico en la hora ${cPeak}.` + scaleLine + moveLine,
    scaleLine: (name, pct, n) => ` Escalar a[${name}] al <b>${pct}%</b> escaló exactamente en esa proporción cada una de las ${n} celdas del plano de ${name}, y nada más.`,
    moveLine: (s) => ` Mover ×${s} de c a a cambió los dos juegos de barras y <b>ninguna</b> de las 480 celdas: el tensor no lo nota, y por eso CP mantiene a, b y c de longitud unitaria y pone el tamaño en λ.`,
    aria: (ctx) => {
      const s = ctx.state;
      return `Un cubo de 4 por 5 por 24 lleno con un término de rango 1, con sus tres vectores como filas de barras a lo largo de tres aristas: ` +
             `a a la izquierda, b arriba, c a lo largo de la base. La entrada ${s.entry} de a está escalada al ${s.scale} por ciento.`;
    }
  };

  const moveFactor = (v) => {
    const s = Math.pow(2, v);
    return Number.isInteger(s) ? String(s) : s.toFixed(2).replace(/0+$/, "");
  };

  window.FactorScenes.register({
    id: "rank1", section: "11", gl: true,
    part: {en: "CP: a sum of rank-1 pieces", es: "CP: una suma de piezas de rango 1"},
    hl: ["rank", "pickup", "dropoff", "hour"],
    copy: {en: EN, es: ES},

    pose: {fov: 30, home: {az: -0.55, el: 0.36}, margin: 1.04,
           limits: {azMin: -1.4, azMax: 1.4, elMin: -0.3, elMax: 1.2, dollyMin: 0.5, dollyMax: 1.8}},

    controls: [
      {id: "entry", type: "range", min: 0, max: 3, step: 1, fmt: (v, ctx) => "a[" + v + "] · " + ctx.names.pickup[v]},
      {id: "scale", type: "range", min: 0, max: 200, step: 5, fmt: (v) => v + "%"},
      {id: "move", type: "range", min: -1, max: 1, step: 0.25, fmt: (v, ctx) => ctx.copy.fmtMove(moveFactor(v) === "1" ? 1 : moveFactor(v))},
      {id: "view", type: "select", options: VIEWS}
    ],

    init(ctx) {
      ctx.state.entry = 2;
      ctx.state.scale = 100;
      ctx.state.move = 0;
      ctx.state.view = "term";
    },

    animates(ctx) { return !!(ctx.cache.ease && ctx.cache.ease.moving); },
    bounds(ctx) { return shown(ctx).bounds; },

    pick(ctx, key) {
      if (key.startsWith("a:")) ctx.setControls({entry: Number(key.slice(2))});
    },
    tip(ctx, key) {
      const tm = term(ctx), c = ctx.copy;
      const [kind, rest] = key.split(":");
      const n = Number(rest);
      if (kind === "cell") {
        const ix = FC.multiIndex(n, ctx.taxi.shape);
        const v = ctx.state.view === "taxi" ? ctx.taxi.data[n] : ctx.state.view === "term" ? tm.T1.data[n] : ctx.taxi.data[n] - tm.T1.data[n];
        return c.tipCell(ctx.names.pickup[ix[0]] + " → " + ctx.names.dropoff[ix[1]], ix[2], K.num(v, 1, ctx.lang));
      }
      const vec = {a: tm.a, b: tm.b, c: tm.c}[kind];
      const name = kind === "a" ? ctx.names.pickup[n] : kind === "b" ? ctx.names.dropoff[n] : "";
      return c.tipVec(kind, n, K.num(vec[n], 3, ctx.lang), name);
    },

    build(ctx) {
      const THREE = ctx.THREE;
      const scene = new THREE.Scene();
      K.light(scene);
      const vox = K.voxels(700);
      scene.add(vox.mesh, vox.hit);
      const keys = [];
      return {
        scene, vox, keys, labels: K.labelPool(scene), col: K.palette(),
        cam: new THREE.PerspectiveCamera(this.pose.fov, ctx.aspect, 0.1, 500),
        pick: [{mesh: vox.hit, key: (id) => keys[id] || null}]
      };
    },

    render(ctx, gl) {
      const m = shown(ctx);
      gl.keys.length = 0;
      m.items.forEach((it, n) => {
        gl.vox.set(n, it.c, it.s, gl.col(it.stroke ? "--fa-t" : it.token, Math.min(1, it.alpha)));
        gl.keys[n] = it.pick || null;
      });
      gl.vox.count(m.items.length);
      gl.vox.commit();
      gl.labels.sync(m.labels);
    },

    draw(ctx) {
      const m = shown(ctx);
      const P = ctx.projector(K.corners(m.bounds.min, m.bounds.max), [40, 56, 780, 396]);
      K.boxes2(ctx.svg, m.items, ctx.basis(), P);
      K.labels2(ctx.svg, m.labels, P);
    },

    readout(ctx) {
      const s = ctx.state, c = ctx.copy, T = ctx.taxi;
      const tm = term(ctx), t = best(ctx);
      const err = FC.relError(T, tm.T1);
      const most = (v, names) => names[FC.argmax(v.map(Math.abs))] + " (" + K.num(v[FC.argmax(v.map(Math.abs))], 3, ctx.lang) + ")";
      const name = ctx.names.pickup[s.entry];
      const scaleLine = s.scale !== 100 ? c.scaleLine(name, s.scale, T.shape[1] * T.shape[2]) : "";
      const moveLine = s.move !== 0 ? c.moveLine(moveFactor(s.move)) : "";
      const prop = proportional(ctx), same = unchanged(ctx);
      return {
        html: c.readout(K.pct(err, 2, ctx.lang), K.num(t.lam, 1, ctx.lang), most(t.a, ctx.names.pickup),
                        most(t.b, ctx.names.dropoff), FC.argmax(t.c), scaleLine, moveLine),
        claim: "T[i, j, k] ≈ λ a[i] b[j] c[k],  λ = " + t.lam.toFixed(1) + ",  " + (err * 100).toFixed(2) + "%",
        data: {
          shape: "4,5,24", terms: 1, params: FC.cpParams(T.shape, 1), lambda: t.lam.toFixed(1),
          err: err.toFixed(4), entry: s.entry, scale: s.scale, move: s.move, view: s.view,
          scaled: tm.a[s.entry].toFixed(3), proportional: prop ? "1" : "0", unchanged: same ? "1" : "0"
        }
      };
    },

    code(ctx) {
      const s = ctx.state, c = ctx.copy.np;
      const rows = [
        ['T1 = lam * np.einsum("i,j,k->ijk", a, b, c)', c.build],
        ["np.linalg.norm(T - T1) / np.linalg.norm(T)", c.err(FC.cpAls(ctx.taxi, 1, 100, 1).error.toFixed(3))]
      ];
      if (s.scale !== 100) rows.push(["a[" + s.entry + "] *= " + (s.scale / 100), c.scale(s.entry, s.scale / 100)]);
      if (s.move !== 0) {
        const f = moveFactor(s.move);
        rows.push(["a2, c2 = a * " + f + ", c / " + f, c.move(f)]);
        rows.push(['T2 = lam * np.einsum("i,j,k->ijk", a2, b, c2)', ""]);
        rows.push(["np.allclose(T1, T2)", c.same]);
      }
      return K.code(rows);
    }
  });
})();
