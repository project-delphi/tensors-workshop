// Scene 2: the cube laying itself flat. The same 480 voxels turn, are dealt
// out slab by slab, and are pressed into the mode-n unfolding -- one entry
// traced in gold the whole way, and the fibre through it along the chosen
// axis, which is what becomes one column of the matrix. Drawn in three.js,
// with an SVG twin from the same positions. See factor-scenes/README.md.
(function () {
  "use strict";
  const FC = window.FactorCore, K = window.FactorKit;

  const AXES = ["pickup", "dropoff", "hour"];
  const AXES_ES = ["origen", "destino", "hora"];
  // How fast the picture follows its controls: the whole flatten in about
  // 0.7 s, so a dragged slider leads and the cube keeps up.
  const SPEED = 1.4;

  // The picture's own {mode, t}, stepped towards the controls' by
  // FC.morphStep, which folds back through the cube to change mode.
  function shown(ctx) {
    const s = ctx.state, want = {mode: s.mode, t: s.flatten / 100};
    const c = ctx.cache;
    const t = ctx.now();
    if (!c.shown || ctx.instant) c.shown = want;
    else if (c.last !== undefined) c.shown = FC.morphStep(c.shown, want, Math.min(0.1, (t - c.last) / 1000), SPEED);
    c.last = t;
    return c.shown;
  }

  // The peel hint: once, on first arrival, the front slab slides out and
  // back. It suggests the move without making it -- playing the flatten
  // itself would answer the question the scene asks before the reader has.
  const PEEL = 1300;
  function peel(ctx) {
    const t0 = ctx.cache.peel;
    if (t0 === undefined) return 0;
    const u = (ctx.now() - t0) / PEEL;
    return u >= 1 ? 0 : Math.sin(Math.PI * u) * 1.6;
  }

  // bounds() and render() both ask for the model every frame; one build.
  function model(ctx) {
    const c = ctx.cache;
    const key = JSON.stringify(ctx.state) + "|" + ctx.hl + "|" + ctx.hover;
    const t = ctx.now();
    if (c.memo && c.memo.key === key && t - c.memo.t < 4 && !ctx.instant) return c.memo.m;
    const m = build(ctx);
    c.memo = {key, t, m};
    return m;
  }

  function build(ctx) {
    const T = ctx.taxi, s = ctx.state, shape = T.shape;
    const view = shown(ctx);
    const m = view.mode, t = view.t;
    const peak = Math.max(...T.data);
    const here = FC.multiIndex(s.flat, shape);
    const lit = ctx.hl ? K.HL_AXIS[ctx.hl] : m;
    const turn = K.unfoldTurn(m, t);
    const lift = peel(ctx);
    const items = [];
    let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    let selPos = null;
    for (let flat = 0; flat < T.data.length; flat++) {
      const ix = FC.multiIndex(flat, shape);
      const v = T.data[flat];
      const p = K.unfoldPose(ix, shape, m, t);
      if (lift && ix[1] === shape[1] - 1) p[2] += lift;
      for (let q = 0; q < 3; q++) { lo[q] = Math.min(lo[q], p[q]); hi[q] = Math.max(hi[q], p[q]); }
      // The fibre along the lit axis through the traced entry: the column it
      // becomes, when that axis is the one being unfolded.
      let onFibre = true;
      for (let a = 0; a < 3; a++) if (a !== lit && ix[a] !== here[a]) onFibre = false;
      const sel = flat === s.flat;
      if (sel) selPos = p;
      const pick = "cell:" + flat;
      items.push({
        c: p, s: sel ? 0 : K.side(v, peak, v > 0 ? 0.16 : 0.1),
        token: v > 0 ? (onFibre ? K.AXIS[lit] : "--stage-ink") : "--fa-ghost",
        alpha: v > 0 ? (onFibre ? 0.9 : 0.5) : 0.55, pick,
        stroke: ctx.hover === pick ? "--fa-t" : undefined
      });
    }
    const cell = T.data[s.flat];
    const selSize = Math.max(0.4, K.side(cell, peak));
    // Labels only at the ends of the move, where they name something still.
    const labels = [];
    const c = ctx.copy;
    let side = 1.6;
    if (t > 0.9) {
      const p = FC.unfoldIndex(here, shape, m);
      const rows = p.rows, cols = p.cols;
      const x0 = -(cols - 1) / 2 - 0.5, y0 = (rows - 1) / 2 + 0.5;
      // A label is a fixed number of pixels wide, and a 120-column strip
      // puts a cell at five of them: the offsets grow with the layout, or the
      // row names sit on the matrix and run off the stage.
      side = 1.6 + cols * 0.07;
      // Row names down the left: the mode's own axis.
      const rowNames = m === 0 ? ctx.names.pickupShort : m === 1 ? ctx.names.dropoffShort : null;
      // A 120-column strip gives each of its four rows a few pixels: no
      // room for a name, so the rows go unnamed and the tip names them.
      const wide = cols > 60;
      if (wide) {
        // nothing: see above
      } else if (rowNames) {
        rowNames.forEach((nm, r) => labels.push({text: nm, pos: [x0 - side * 0.6, y0 - 0.5 - r, 0], cls: K.AXIS_CLS[m], lit: r === p.row}));
      } else {
        [0, 6, 12, 18, 23].forEach((h) => labels.push({text: String(h), pos: [x0 - side * 0.6, y0 - 0.5 - h, 0], cls: "m2", lit: h === p.row}));
      }
      // Column blocks along the top: the slower of the other two axes, one
      // block per index, named.
      const other = [0, 1, 2].filter((a) => a !== m);
      const slow = other[0], fast = other[1];
      const width = shape[fast];
      const blockNames = slow === 0 ? ctx.names.pickupShort : ctx.names.dropoffShort;
      for (let b = 0; b < shape[slow]; b++) {
        labels.push({
          text: blockNames[b], pos: [x0 + b * width + width / 2, y0 + 0.8 + cols * 0.012, 0],
          cls: K.AXIS_CLS[slow], lit: b === here[slow]
        });
      }
      labels.push({text: c.axRows(m), pos: wide ? [x0 + cols * 0.06, -y0 - 0.8 - cols * 0.03, 0] : [x0 - side * 0.6, y0 + 0.8 + cols * 0.012, 0],
                   cls: K.AXIS_CLS[m], lit: lit === m});
    } else if (t < 0.05) {
      // The cube's own labels, where the tensor scene puts them.
      labels.push({text: c.axPickup, pos: [-12.5 - 1.2, -2.6, 2.5], cls: "m0", lit: lit === 0});
      labels.push({text: c.axDropoff, pos: [-12.5 - 0.2, 2.6, -2.5 - 1.4], cls: "m1", lit: lit === 1});
      labels.push({text: c.axHour, pos: [12.5 + 2.3, -2.55, 2.5], cls: "m2", lit: lit === 2});
      ctx.names.pickupShort.forEach((nm, i) => labels.push({text: nm, pos: [-12.5 - 0.9, 1.5 - i, 2.5], cls: "m0", lit: i === here[0]}));
      [0, 6, 12, 18, 23].forEach((h) => labels.push({text: String(h), pos: [h - 11.5, -2.55, 2.5], cls: "m2", lit: h === here[2]}));
    }
    if (selPos) labels.push({text: String(Math.round(cell)), pos: [selPos[0], selPos[1] + 1.1, selPos[2] + 0.3], cls: "sig", size: 13});
    const pad = t > 0.9 ? [side * 1.25, 2.6 + shape[2] * 0 + side * 0.1, 0.8] : [2.6, 1.6, 1.6];
    const bounds = K.withLabels({min: [lo[0] - pad[0], lo[1] - pad[1], lo[2] - pad[2]],
                                 max: [hi[0] + pad[0] * 0.4, hi[1] + pad[1] + 0.6, hi[2] + pad[2]]}, labels);
    // The cube's outline, only while it is one.
    const outline = t < 0.02 ? {min: [-12.5, -2, -2.5], max: [12.5, 2, 2.5]} : null;
    return {items, selPos, selSize, labels, bounds, turn, view, outline};
  }

  function addresses(ctx) {
    const here = FC.multiIndex(ctx.state.flat, ctx.taxi.shape);
    return [0, 1, 2].map((m) => {
      const p = FC.unfoldIndex(here, ctx.taxi.shape, m);
      return {m, row: p.row, col: p.col, rows: p.rows, cols: p.cols};
    });
  }

  function route(ctx, here, m) {
    // What one column of the mode-m unfolding is: the fibre along m through
    // this entry, named by the two indices that stay fixed.
    const n = ctx.names;
    if (m === 2) return n.pickup[here[0]] + " → " + n.dropoff[here[1]];
    if (m === 1) return ctx.copy.atHour(n.pickup[here[0]], here[2]);
    return ctx.copy.atHour(n.dropoff[here[1]], here[2]);
  }

  const EN = {
    k: "Unfolding · section 10",
    h: "Laid flat along one axis, the cube is a matrix whose columns are its fibres",
    concept: 'Unfolding a tensor along one mode lays it out as a matrix: that mode becomes the rows, and every combination of the other indices becomes one column, the last index fastest. Nothing is lost -- the same 480 numbers, at new addresses. <span class="cite">Deep Learning §2.1</span>',
    claim: "T ∈ ℝ⁴ˣ⁵ˣ²⁴ → T₍₂₎ ∈ ℝ²⁴ˣ²⁰",
    predict: "Before you press Play: once the cube lies flat along hour, what does one column of the matrix hold?",
    b: "<p>Press <b>Play</b> and the cube turns, is dealt out one slab at a time, and is pressed flat into T₍₂₎: 24 rows, one per hour, by 20 columns, one per (pickup, dropoff) pair. The gold voxel is one number, T[2, 2, 18] = 318, and it lands at row 18, column 12.</p><p>Watch the green voxels: they are the day of the gold one's route, a fibre along hour, and flat they are exactly column 12. Every column of this matrix is one route's whole day -- which is why the next picture's SVD of it finds <em>daily patterns</em>. Unfold along pickup instead and you get a 4 × 120 matrix; along dropoff, 5 × 96. The count never changes, only the addresses.</p>",
    eqcap: "Unfolding along hour: row k is the hour, column 5i + j is the route. Point at a letter to light the fibre along it.",
    np: {
      unfold: (m, r, c) => "(" + r + ", " + c + "): " + AXES[m] + " on the rows",
      same: "True: one number, a new address",
      column: (fibre) => fibre + ": one column is one fibre"
    },
    controls: {mode: "Unfold along", flatten: "How flat", play: "▶ Play the unfold", flat: "Which entry"},
    options: {mode: {0: "pickup (mode 0): 4 × 120", 1: "dropoff (mode 1): 5 × 96", 2: "hour (mode 2): 24 × 20"}},
    axPickup: "pickup i", axDropoff: "dropoff j", axHour: "hour k",
    axRows: (m) => "rows: " + AXES[m],
    atHour: (name, h) => name + " at " + h + ":00",
    tip: (i, j, k, v, r, c, m) => "T[" + i + ", " + j + ", " + k + "] = " + v + " → T₍" + m + "₎[" + r + ", " + c + "]",
    readout: (m, rows, cols, at, v, r, c, what, pct) =>
      (pct > 0 && pct < 100 ? `Laid ${pct}% flat. ` : "") +
      `Unfolding along <b>${AXES[m]}</b> gives a <b>${rows} × ${cols}</b> matrix of the same 480 numbers. ` +
      `T${at} = <b>${v}</b> sits at row <b>${r}</b>, column <b>${c}</b>, and column ${c} is ${what}: ` +
      `one fibre of the cube became one column of the matrix.`,
    whatCol: {2: (x) => `the whole day of ${x}`, 1: (x) => `every dropoff borough for trips from ${x}`,
              0: (x) => `every pickup borough for trips into ${x}`},
    aria: (ctx) => {
      const s = ctx.state;
      return `The 4 by 5 by 24 cube of trip counts, ${s.flatten} percent laid flat into its ${AXES[s.mode]} unfolding, ` +
             `with one entry traced in gold and the fibre through it along ${AXES[s.mode]} lit, which becomes one column.`;
    }
  };
  const ES = {
    k: "Desplegado · sección 10",
    h: "Extendido a lo largo de un eje, el cubo es una matriz cuyas columnas son sus fibras",
    concept: 'Desplegar un tensor a lo largo de un modo lo extiende como una matriz: ese modo se vuelve las filas, y cada combinación de los otros índices se vuelve una columna, el último índice el más rápido. No se pierde nada: los mismos 480 números, en direcciones nuevas. <span class="cite">Deep Learning §2.1</span>',
    claim: "T ∈ ℝ⁴ˣ⁵ˣ²⁴ → T₍₂₎ ∈ ℝ²⁴ˣ²⁰",
    predict: "Antes de pulsar Reproducir: cuando el cubo quede extendido a lo largo de la hora, ¿qué contiene una columna de la matriz?",
    b: "<p>Pulsa <b>Reproducir</b> y el cubo gira, se reparte losa a losa y se aplana en T₍₂₎: 24 filas, una por hora, por 20 columnas, una por par (origen, destino). El vóxel dorado es un número, T[2, 2, 18] = 318, y cae en la fila 18, columna 12.</p><p>Mira los vóxeles verdes: son el día de la ruta del dorado, una fibra a lo largo de la hora, y aplanados son exactamente la columna 12. Cada columna de esta matriz es el día entero de una ruta, y por eso la SVD de la imagen siguiente encuentra <em>patrones diarios</em>. Despliega a lo largo del origen y obtienes una matriz de 4 × 120; a lo largo del destino, de 5 × 96. El conteo nunca cambia, solo las direcciones.</p>",
    eqcap: "Desplegado a lo largo de la hora: la fila k es la hora, la columna 5i + j es la ruta. Señala una letra para iluminar la fibra a lo largo de ella.",
    np: {
      unfold: (m, r, c) => "(" + r + ", " + c + "): " + AXES_ES[m] + " en las filas",
      same: "True: un número, una dirección nueva",
      column: (fibre) => fibre + ": una columna es una fibra"
    },
    controls: {mode: "Desplegar a lo largo de", flatten: "Cuánto aplanado", play: "▶ Reproducir el desplegado", flat: "Qué entrada"},
    options: {mode: {0: "origen (modo 0): 4 × 120", 1: "destino (modo 1): 5 × 96", 2: "hora (modo 2): 24 × 20"}},
    axPickup: "origen i", axDropoff: "destino j", axHour: "hora k",
    axRows: (m) => "filas: " + AXES_ES[m],
    atHour: (name, h) => name + " a las " + h + ":00",
    tip: (i, j, k, v, r, c, m) => "T[" + i + ", " + j + ", " + k + "] = " + v + " → T₍" + m + "₎[" + r + ", " + c + "]",
    readout: (m, rows, cols, at, v, r, c, what, pct) =>
      (pct > 0 && pct < 100 ? `Aplanado al ${pct}%. ` : "") +
      `Desplegar a lo largo de <b>${AXES_ES[m]}</b> da una matriz de <b>${rows} × ${cols}</b> con los mismos 480 números. ` +
      `T${at} = <b>${v}</b> está en la fila <b>${r}</b>, columna <b>${c}</b>, y la columna ${c} es ${what}: ` +
      `una fibra del cubo se volvió una columna de la matriz.`,
    whatCol: {2: (x) => `el día entero de ${x}`, 1: (x) => `cada barrio de destino de los viajes desde ${x}`,
              0: (x) => `cada barrio de origen de los viajes hacia ${x}`},
    aria: (ctx) => {
      const s = ctx.state;
      return `El cubo de 4 por 5 por 24 conteos de viajes, aplanado al ${s.flatten} por ciento en su desplegado de ${AXES_ES[s.mode]}, ` +
             `con una entrada trazada en dorado y la fibra que pasa por ella a lo largo de ${AXES_ES[s.mode]} iluminada, que se vuelve una columna.`;
    }
  };

  window.FactorScenes.register({
    id: "unfold", section: "10", gl: true,
    hl: ["pickup", "dropoff", "hour"],
    copy: {en: EN, es: ES},

    pose: {fov: 30, home: {az: -0.62, el: 0.46}, margin: 1.04,
           limits: {azMin: -1.4, azMax: 1.4, elMin: -0.25, elMax: 1.2, dollyMin: 0.5, dollyMax: 1.8}},

    controls: [
      {id: "mode", type: "select", options: ["0", "1", "2"]},
      {id: "flatten", type: "range", min: 0, max: 100, step: 1, fmt: (v) => v + "%"},
      {id: "play", type: "play", target: "flatten", rate: 38},
      {id: "flat", type: "range", min: 0, max: 479, step: 1,
       fmt: (v, ctx) => "T" + K.idx(FC.multiIndex(v, ctx.taxi ? ctx.taxi.shape : [4, 5, 24]))}
    ],

    init(ctx) {
      ctx.state.mode = 2;
      ctx.state.flatten = 0;
      // T[2, 2, 18]: the cell the tensor scene opened on, so the reader
      // follows one number from the cube into the matrix.
      ctx.state.flat = 2 * 120 + 2 * 24 + 18;
    },

    // The select stores its value as a string; everything here indexes with
    // it as a number.
    sync(ctx) { ctx.state.mode = Number(ctx.state.mode); },

    arrive(ctx) { if (ctx.state.flatten === 0) ctx.cache.peel = ctx.now(); },
    animates(ctx) {
      const c = ctx.cache, s = ctx.state;
      const moving = !c.shown || c.shown.mode !== s.mode || Math.abs(c.shown.t - s.flatten / 100) > 1e-9;
      return moving || (c.peel !== undefined && ctx.now() - c.peel < PEEL);
    },
    // No idle sway once the cube lies flat: a matrix swinging about is a
    // picture that will not hold still to be read.
    still(ctx) { return ctx.state.flatten > 30; },

    // As the cube lies down the camera levels out to face the matrix, from the
    // same eased t -- and only the view it is drawn from moves, never the
    // reader's own orbit, which comes back when the cube does.
    framing(ctx, v) {
      const t = ctx.cache.shown ? ctx.cache.shown.t : ctx.state.flatten / 100;
      const e = K.smooth((t - 0.3) / 0.7);
      return {az: v.az * (1 - 0.9 * e), el: v.el * (1 - 0.85 * e), dolly: v.dolly};
    },
    bounds(ctx) { return model(ctx).bounds; },

    pick(ctx, key) {
      if (key.startsWith("cell:")) ctx.setControls({flat: Number(key.slice(5))});
    },
    tip(ctx, key) {
      if (!key.startsWith("cell:")) return "";
      const flat = Number(key.slice(5)), shape = ctx.taxi.shape;
      const ix = FC.multiIndex(flat, shape);
      const p = FC.unfoldIndex(ix, shape, ctx.state.mode);
      return ctx.copy.tip(ix[0], ix[1], ix[2], Math.round(ctx.taxi.data[flat]), p.row, p.col, K.sub(ctx.state.mode));
    },

    build(ctx) {
      const THREE = ctx.THREE;
      const scene = new THREE.Scene();
      K.light(scene);
      const vox = K.voxels(ctx.taxi.data.length);
      scene.add(vox.mesh, vox.hit);
      const glow = K.glowBox("--fa-t");
      scene.add(glow);
      const hull = K.frameBox("--stage-mute", 0.35);
      scene.add(hull);
      return {
        scene, vox, glow, hull, labels: K.labelPool(scene), col: K.palette(),
        cam: new THREE.PerspectiveCamera(this.pose.fov, ctx.aspect, 0.1, 900),
        pick: [{mesh: vox.hit, key: (id) => "cell:" + id}]
      };
    },

    render(ctx, gl) {
      const m = model(ctx);
      m.items.forEach((it, n) => {
        gl.vox.set(n, it.c, it.s, gl.col(it.stroke ? "--fa-t" : it.token, it.stroke ? 1 : it.alpha), m.turn);
      });
      gl.vox.commit();
      if (m.selPos) {
        gl.glow.position.set(m.selPos[0], m.selPos[1], m.selPos[2]);
        gl.glow.scale.setScalar(m.selSize);
        if (m.turn) gl.glow.quaternion.setFromAxisAngle(new ctx.THREE.Vector3(...m.turn.axis), m.turn.angle);
        else gl.glow.quaternion.identity();
      }
      gl.hull.visible = !!m.outline;
      if (m.outline) K.setBox(gl.hull, m.outline.min, m.outline.max);
      gl.labels.sync(m.labels);
    },

    draw(ctx) {
      const m = model(ctx);
      const pts = K.corners(m.bounds.min, m.bounds.max);
      const P = ctx.projector(pts, ctx.box());
      const items = m.items.slice();
      if (m.selPos) items.push({c: m.selPos, s: m.selSize, token: "--fa-t", alpha: 1.25, pick: "cell:" + ctx.state.flat});
      if (m.outline) K.edges2(ctx.svg, m.outline.min, m.outline.max, P, "--stage-mute", {opacity: 0.35, width: 1});
      K.boxes2(ctx.svg, items, ctx.basis(), P, {turn: m.turn});
      K.labels2(ctx.svg, m.labels, P);
    },

    readout(ctx) {
      const T = ctx.taxi, s = ctx.state, c = ctx.copy;
      const here = FC.multiIndex(s.flat, T.shape);
      const A = addresses(ctx);
      const p = A[s.mode];
      const v = Math.round(T.data[s.flat]);
      const what = c.whatCol[s.mode](route(ctx, here, s.mode));
      return {
        html: c.readout(s.mode, p.rows, p.cols, K.idx(here), v, p.row, p.col, what, s.flatten),
        claim: "T ∈ ℝ⁴ˣ⁵ˣ²⁴ → T" + K.mode(s.mode) + " ∈ ℝ" + K.shapeSup([p.rows, p.cols]),
        // The three addresses of the one entry, the same in every language.
        caption: A.map((a) => "T" + K.mode(a.m) + "[" + a.row + ", " + a.col + "]").join("  ·  "),
        data: {
          mode: s.mode, rows: p.rows, cols: p.cols, entries: T.data.length, flatten: s.flatten,
          invariant: "1", at: p.row + "," + p.col, entry: here.join(","), value: v,
          addresses: A.map((a) => a.row + "," + a.col).join(";")
        }
      };
    },

    shape(ctx) {
      const p = addresses(ctx)[ctx.state.mode];
      return ctx.state.flatten === 100 ? "[" + p.rows + ", " + p.cols + "]" : "[4, 5, 24]";
    },

    code(ctx) {
      const T = ctx.taxi, s = ctx.state, c = ctx.copy.np;
      const here = FC.multiIndex(s.flat, T.shape);
      const p = addresses(ctx)[s.mode];
      const fibre = "T[" + here.map((v, a) => (a === s.mode ? ":" : String(v))).join(", ") + "]";
      return K.code([
        ["X = np.moveaxis(T, " + s.mode + ", 0).reshape(" + p.rows + ", -1)", c.unfold(s.mode, p.rows, p.cols)],
        ["X[" + p.row + ", " + p.col + "] == T" + K.idx(here), c.same],
        ["X[:, " + p.col + "]", c.column(fibre)]
      ]);
    }
  });

})();
