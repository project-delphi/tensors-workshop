// Scene 1: the taxi tensor itself, as the cube it is. 480 voxels whose
// *volume* is a trip count, the picked cell in gold, the three fibres through
// it framed in their axes' colours, and optionally the slice that fixing one
// index leaves. Drawn in three.js, with an SVG twin from the same model.
// See factor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const FC = window.FactorCore, K = window.FactorKit;

  const SLICES = ["none", "hour", "pickup", "dropoff"];

  // Everything both surfaces draw, from the controls: one item per voxel,
  // the three fibre frames, the slice frame, the labels. Built once per
  // change of anything it reads, and eased only by the entrance.
  function model(ctx) {
    const T = ctx.taxi, s = ctx.state, shape = T.shape, names = ctx.names;
    const peak = Math.max(...T.data);
    const lit = ctx.hl ? K.HL_AXIS[ctx.hl] : undefined;
    const grow = growth(ctx);
    const items = [];
    for (let flat = 0; flat < T.data.length; flat++) {
      const ix = FC.multiIndex(flat, shape);
      const [i, j, k] = ix;
      const v = T.data[flat];
      const on = [j === s.dropoff && k === s.hour, i === s.pickup && k === s.hour, i === s.pickup && j === s.dropoff];
      let token = v > 0 ? "--stage-ink" : "--fa-ghost";
      let alpha = v > 0 ? 0.5 : 0.55;
      const inSlice = (s.slice === "hour" && k === s.hour) || (s.slice === "pickup" && i === s.pickup) ||
                      (s.slice === "dropoff" && j === s.dropoff);
      if (inSlice && v > 0) alpha = 0.95;
      for (let a = 0; a < 3; a++) {
        if (on[a] && (lit === undefined || lit === a) && v > 0) { token = K.AXIS[a]; alpha = 0.85; }
      }
      const pick = "cell:" + ix.join(",");
      const sel = i === s.pickup && j === s.dropoff && k === s.hour;
      items.push({
        c: K.cubePos(ix, shape), s: sel ? 0 : K.side(v, peak, v > 0 ? 0.14 : 0.1) * grow(k),
        token, alpha, pick, stroke: ctx.hover === pick ? "--fa-t" : undefined
      });
    }
    const here = [s.pickup, s.dropoff, s.hour];
    const cell = FC.at(T, s.pickup, s.dropoff, s.hour);
    const selPos = K.cubePos(here, shape);
    const selSize = Math.max(0.34, K.side(cell, peak)) * grow(s.hour);
    // A fibre's frame: the line of cells it runs through, half a cell out.
    const line = (a) => {
      const lo = here.slice(), hi = here.slice();
      lo[a] = 0; hi[a] = shape[a] - 1;
      return box(K.cubePos(lo, shape), K.cubePos(hi, shape), 0.5);
    };
    const fibres = [0, 1, 2].map((a) => ({show: lit === undefined || lit === a, ...line(a)}));
    let slab = null;
    if (s.slice !== "none") {
      const ax = {pickup: 0, dropoff: 1, hour: 2}[s.slice];
      const lo = [0, 0, 0], hi = [shape[0] - 1, shape[1] - 1, shape[2] - 1];
      lo[ax] = hi[ax] = here[ax];
      slab = box(K.cubePos(lo, shape), K.cubePos(hi, shape), 0.56);
    }
    const c = ctx.copy;
    const x0 = -(shape[2] - 1) / 2 - 0.5, x1 = (shape[2] - 1) / 2 + 0.5;
    const yTop = (shape[0] - 1) / 2 + 0.5, yBot = -yTop;
    const z0 = -(shape[1] - 1) / 2 - 0.5, z1 = -z0;
    const labels = [];
    // Pickup names down the near end, dropoff names across its top, hour
    // ticks along the bottom front edge: three edges of the cube that meet
    // at one corner, so the three axes read the way the indices do.
    names.pickupShort.forEach((nm, i) => labels.push({
      text: nm, pos: [x0 - 0.9, (shape[0] - 1) / 2 - i, z1], cls: "m0", lit: i === s.pickup
    }));
    // Depth is foreshortened at every angle the orbit allows, so five names
    // down it overprint each other. The two ends say which way it runs, and
    // the picked borough says where the reader is; the tip names the rest.
    names.dropoffShort.forEach((nm, j) => {
      if (j !== 0 && j !== shape[1] - 1 && j !== s.dropoff) return;
      labels.push({text: nm, pos: [x0 - 0.2, yTop + 0.55, j - (shape[1] - 1) / 2], cls: "m1", lit: j === s.dropoff});
    });
    [0, 6, 12, 18, 23].forEach((h) => labels.push({
      text: String(h), pos: [h - (shape[2] - 1) / 2, yBot - 0.55, z1], cls: "m2", lit: h === s.hour
    }));
    labels.push({text: c.axPickup, pos: [x0 - 1.2, yBot - 0.6, z1], cls: "m0", lit: lit === 0});
    labels.push({text: c.axDropoff, pos: [x0 - 0.2, yTop + 0.6, z0 - 1.4], cls: "m1", lit: lit === 1});
    labels.push({text: c.axHour, pos: [x1 + 2.3, yBot - 0.55, z1], cls: "m2", lit: lit === 2});
    labels.push({text: String(Math.round(cell)), pos: [selPos[0], yTop + 1.0, selPos[2]], cls: "sig", size: 13});
    const outline = {min: [x0, yBot, z0], max: [x1, yTop, z1]};
    return {items, selPos, selSize, fibres, slab, labels, outline};
  }

  function box(a, b, pad) {
    return {
      min: [Math.min(a[0], b[0]) - pad, Math.min(a[1], b[1]) - pad, Math.min(a[2], b[2]) - pad],
      max: [Math.max(a[0], b[0]) + pad, Math.max(a[1], b[1]) + pad, Math.max(a[2], b[2]) + pad]
    };
  }

  // The entrance: the cube grows in hour by hour, left to right, the way the
  // day runs. A function of the clock, so both surfaces show the same frame.
  const ARRIVE = {lag: 28, ms: 650};
  function growth(ctx) {
    const t0 = ctx.cache.arrive;
    if (t0 === undefined) return () => 1;
    const t = ctx.now() - t0;
    return (k) => K.smooth((t - ARRIVE.lag * k) / ARRIVE.ms);
  }

  const BOUNDS = {min: [-14.2, -2.8, -4.2], max: [15.2, 3.2, 3.0]};

  function routeName(ctx, i, j) { return ctx.names.pickup[i] + " → " + ctx.names.dropoff[j]; }
  // The short form, for the NumPy comments, which have 82 characters to live in.
  function routeShort(ctx, i, j) { return ctx.names.pickupShort[i] + " → " + ctx.names.dropoffShort[j]; }

  const EN = {
    k: "The taxi tensor · section 10",
    h: "Three indices make a cube, and three quarters of it is one route",
    concept: 'An order-3 tensor is a cube of numbers T[i, j, k]. Fix two of the indices and what is left is a fibre, a vector; fix one and what is left is a slice, a matrix. <span class="cite">Deep Learning §2.1</span>',
    claim: "T ∈ ℝ⁴ˣ⁵ˣ²⁴,  480 counts",
    predict: "Before you drag: is the busiest hour the same on every route, or does each route keep its own clock?",
    b: "<p>Each voxel is one count: how many of 6,383 New York taxi trips went from one borough to another in one hour of the day. A voxel's <em>volume</em> is its count, so the long bright rod through the middle -- Manhattan to Manhattan, 4,885 trips -- is three quarters of the whole cube, and the ghosts are the 207 cells nobody rode.</p><p>Pick a cell with the sliders or by clicking a voxel. The three frames are the fibres through it: its route's whole day (green, along hour), every dropoff from its pickup in that hour (orange), every pickup into its dropoff in that hour (blue). A <b>slice</b> fixes one index instead and lights the matrix that is left.</p>",
    eqcap: "i is the pickup borough, j the dropoff borough, k the hour. Point at one to light the fibre that runs along it.",
    np: {
      shape: "pickup, dropoff, hour",
      cell: (n, route, h) => n + " trips: " + route + ", hour " + h,
      fibre: "a fibre: this route's whole day",
      slice: {none: "a slice: every route in one hour", hour: "a slice: every route in one hour",
              pickup: "a slice: every trip from one borough", dropoff: "a slice: every trip into one borough"},
      busiest: (h) => h + ": the busiest hour, summed over every route"
    },
    controls: {hour: "Hour, k", pickup: "Pickup borough, i", dropoff: "Dropoff borough, j", slice: "Light a slice"},
    options: {slice: {none: "no slice, only the fibres", hour: "fix the hour: T[:, :, k]",
                      pickup: "fix the pickup: T[i, :, :]", dropoff: "fix the dropoff: T[:, j, :]"}},
    axPickup: "pickup i", axDropoff: "dropoff j", axHour: "hour k",
    tip: (route, h, n) => route + " · hour " + h + " · " + n + " trips",
    // `pair` is two routes that run in opposite directions, with their peaks:
    // computed from the tensor, not typed, so the stand-in says what it has.
    readout: (route, h, cell, peak, busiest, total, pair) =>
      `<b>${route}</b> in hour <b>${h}</b>: <b>${cell}</b> trips. ` +
      (total === 0
        ? "Nobody took this route at any hour in this data: its whole fibre is zeros."
        : `This route's own busiest hour is <b>${peak}</b>` +
          (peak === busiest
            ? ", the same as the busiest hour summed over every route."
            : `; summed over every route the busiest is ${busiest}.`) +
          ` Routes keep their own clocks: ${pair[0].route} peaks at ${pair[0].peak}, ` +
          `${pair[1].route} at ${pair[1].peak}.`),
    aria: (ctx) => {
      const s = ctx.state;
      return `A 4 by 5 by 24 cube of voxels, one per trip count, each voxel's volume its count. ` +
             `The cell for ${routeName(ctx, s.pickup, s.dropoff)} in hour ${s.hour} is gold, and the three ` +
             `fibres through it are framed` + (s.slice !== "none" ? `, with the ${s.slice} slice lit.` : ".");
    }
  };
  const ES = {
    k: "El tensor de taxis · sección 10",
    h: "Tres índices forman un cubo, y tres cuartas partes de él son una sola ruta",
    concept: 'Un tensor de orden 3 es un cubo de números T[i, j, k]. Fija dos de los índices y lo que queda es una fibra, un vector; fija uno y lo que queda es un corte, una matriz. <span class="cite">Deep Learning §2.1</span>',
    claim: "T ∈ ℝ⁴ˣ⁵ˣ²⁴,  480 conteos",
    predict: "Antes de arrastrar: ¿la hora más ocupada es la misma en todas las rutas, o cada ruta lleva su propio reloj?",
    b: "<p>Cada vóxel es un conteo: cuántos de 6.383 viajes de taxi en Nueva York fueron de un barrio a otro en una hora del día. El <em>volumen</em> de un vóxel es su conteo, así que la barra larga y brillante del medio (de Manhattan a Manhattan, 4.885 viajes) es tres cuartas partes de todo el cubo, y los fantasmas son las 207 celdas en las que no viajó nadie.</p><p>Elige una celda con los deslizadores o haciendo clic en un vóxel. Los tres marcos son las fibras que pasan por ella: el día entero de su ruta (verde, a lo largo de la hora), cada destino desde su origen en esa hora (naranja), cada origen hacia su destino en esa hora (azul). Un <b>corte</b> fija en cambio un índice e ilumina la matriz que queda.</p>",
    eqcap: "i es el barrio de origen, j el barrio de destino, k la hora. Señala uno para iluminar la fibra que corre a lo largo de él.",
    np: {
      shape: "origen, destino, hora",
      cell: (n, route, h) => n + " viajes: " + route + ", hora " + h,
      fibre: "una fibra: el día entero de esta ruta",
      slice: {none: "un corte: todas las rutas en una hora", hour: "un corte: todas las rutas en una hora",
              pickup: "un corte: cada viaje desde un barrio", dropoff: "un corte: cada viaje hacia un barrio"},
      busiest: (h) => h + ": la hora más ocupada, sumando todas las rutas"
    },
    controls: {hour: "Hora, k", pickup: "Barrio de origen, i", dropoff: "Barrio de destino, j", slice: "Iluminar un corte"},
    options: {slice: {none: "sin corte, solo las fibras", hour: "fija la hora: T[:, :, k]",
                      pickup: "fija el origen: T[i, :, :]", dropoff: "fija el destino: T[:, j, :]"}},
    axPickup: "origen i", axDropoff: "destino j", axHour: "hora k",
    tip: (route, h, n) => route + " · hora " + h + " · " + n + " viajes",
    readout: (route, h, cell, peak, busiest, total, pair) =>
      `<b>${route}</b> en la hora <b>${h}</b>: <b>${cell}</b> viajes. ` +
      (total === 0
        ? "Nadie hizo esta ruta a ninguna hora en estos datos: toda su fibra son ceros."
        : `La hora más ocupada de esta ruta es la <b>${peak}</b>` +
          (peak === busiest
            ? ", la misma que la hora más ocupada sumando todas las rutas."
            : `; sumando todas las rutas la más ocupada es la ${busiest}.`) +
          ` Cada ruta lleva su propio reloj: ${pair[0].route} tiene su pico en la hora ${pair[0].peak}, ` +
          `${pair[1].route} en la ${pair[1].peak}.`),
    aria: (ctx) => {
      const s = ctx.state;
      const sl = {hour: "de la hora", pickup: "del origen", dropoff: "del destino"}[s.slice];
      return `Un cubo de 4 por 5 por 24 vóxeles, uno por conteo de viajes, con el volumen de cada vóxel igual a su conteo. ` +
             `La celda de ${routeName(ctx, s.pickup, s.dropoff)} en la hora ${s.hour} es dorada, y las tres ` +
             `fibras que pasan por ella están enmarcadas` + (sl ? `, con el corte ${sl} iluminado.` : ".");
    }
  };

  window.FactorScenes.register({
    id: "tensor", section: "10", gl: true,
    part: {en: "A table with three indices", es: "Una tabla con tres índices"},
    hl: ["pickup", "dropoff", "hour"],
    copy: {en: EN, es: ES},

    pose: {fov: 30, home: {az: -0.62, el: 0.46}, margin: 1.04,
           limits: {azMin: -1.4, azMax: 1.4, elMin: -0.25, elMax: 1.2, dollyMin: 0.5, dollyMax: 1.8}},

    controls: [
      {id: "hour", type: "range", min: 0, max: 23, step: 1, fmt: (v) => String(v)},
      {id: "pickup", type: "range", min: 0, max: 3, step: 1, fmt: (v, ctx) => ctx.names.pickup[v]},
      {id: "dropoff", type: "range", min: 0, max: 4, step: 1, fmt: (v, ctx) => ctx.names.dropoff[v]},
      {id: "slice", type: "select", options: SLICES}
    ],

    init(ctx) {
      ctx.state.hour = 18;
      ctx.state.pickup = 2;
      ctx.state.dropoff = 2;
      ctx.state.slice = "none";
    },

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) {
      return ctx.cache.arrive !== undefined && ctx.now() - ctx.cache.arrive < ARRIVE.lag * 24 + ARRIVE.ms;
    },

    bounds() { return BOUNDS; },

    pick(ctx, key) {
      if (!key.startsWith("cell:")) return;
      const [i, j, k] = key.slice(5).split(",").map(Number);
      ctx.setControls({pickup: i, dropoff: j, hour: k});
    },
    tip(ctx, key) {
      if (!key.startsWith("cell:")) return "";
      const [i, j, k] = key.slice(5).split(",").map(Number);
      return ctx.copy.tip(routeName(ctx, i, j), k, Math.round(FC.at(ctx.taxi, i, j, k)));
    },

    build(ctx) {
      const THREE = ctx.THREE;
      const scene = new THREE.Scene();
      K.light(scene);
      const n = ctx.taxi.data.length;
      const vox = K.voxels(n);
      scene.add(vox.mesh, vox.hit);
      const glow = K.glowBox("--fa-t");
      scene.add(glow);
      const fib = [0, 1, 2].map((a) => { const f = K.frameBox(K.AXIS[a]); scene.add(f); return f; });
      const slab = K.frameBox("--stage-ink", 0.85);
      scene.add(slab);
      const hull = K.frameBox("--stage-mute", 0.35);
      scene.add(hull);
      const shape = ctx.taxi.shape;
      return {
        scene, vox, glow, fib, slab, hull, labels: K.labelPool(scene), col: K.palette(),
        cam: new THREE.PerspectiveCamera(this.pose.fov, ctx.aspect, 0.1, 500),
        pick: [{mesh: vox.hit, key: (id) => "cell:" + FC.multiIndex(id, shape).join(",")}]
      };
    },

    render(ctx, gl) {
      const m = model(ctx);
      m.items.forEach((it, n) => {
        const bright = it.stroke ? 1 : it.alpha;
        gl.vox.set(n, it.c, it.s, gl.col(it.stroke ? "--fa-t" : it.token, bright));
      });
      gl.vox.commit();
      gl.glow.position.set(m.selPos[0], m.selPos[1], m.selPos[2]);
      gl.glow.scale.setScalar(Math.max(1e-3, m.selSize));
      m.fibres.forEach((f, a) => { gl.fib[a].visible = f.show; K.setBox(gl.fib[a], f.min, f.max); });
      K.setBox(gl.hull, m.outline.min, m.outline.max);
      gl.slab.visible = !!m.slab;
      if (m.slab) K.setBox(gl.slab, m.slab.min, m.slab.max);
      gl.labels.sync(m.labels);
    },

    // The twin: the same model, projected through the same view.
    draw(ctx) {
      const m = model(ctx);
      const pts = K.corners(BOUNDS.min, BOUNDS.max);
      const P = ctx.projector(pts, [70, 58, 750, 392]);
      const B = ctx.basis();
      K.edges2(ctx.svg, m.outline.min, m.outline.max, P, "--stage-mute", {opacity: 0.35, width: 1});
      if (m.slab) K.edges2(ctx.svg, m.slab.min, m.slab.max, P, "--stage-ink", {opacity: 0.7, dash: "4 3"});
      K.boxes2(ctx.svg, m.items.concat([{c: m.selPos, s: m.selSize, token: "--fa-t", alpha: 1.25,
                                           pick: "cell:" + [ctx.state.pickup, ctx.state.dropoff, ctx.state.hour].join(",")}]), B, P);
      m.fibres.forEach((f, a) => { if (f.show) K.edges2(ctx.svg, f.min, f.max, P, K.AXIS[a], {width: 1.4}); });
      K.labels2(ctx.svg, m.labels, P);
    },

    readout(ctx) {
      const T = ctx.taxi, s = ctx.state;
      const cell = Math.round(FC.at(T, s.pickup, s.dropoff, s.hour));
      const hours = FC.marginal(T, 2);
      const busiest = FC.argmax(hours);
      const fib = FC.fibre(T, 2, s.pickup, s.dropoff);
      const total = fib.reduce((a, v) => a + v, 0);
      const peak = FC.argmax(fib);
      const trips = Math.round(T.data.reduce((a, v) => a + v, 0));
      const mm = FC.fibre(T, 2, 2, 2).reduce((a, v) => a + v, 0);
      return {
        html: ctx.copy.readout(routeName(ctx, s.pickup, s.dropoff), s.hour, cell, peak, busiest, total,
          [[1, 2], [2, 1]].map(([i, j]) => ({route: routeName(ctx, i, j), peak: FC.argmax(FC.fibre(T, 2, i, j))}))),
        claim: "T" + K.idx([s.pickup, s.dropoff, s.hour]) + " = " + cell + ",  T ∈ ℝ⁴ˣ⁵ˣ²⁴",
        data: {
          shape: T.shape.join(","), order: T.shape.length, entries: T.data.length, trips,
          cell, busiest, hour: s.hour, pickup: s.pickup, dropoff: s.dropoff, slice: s.slice,
          routepeak: total > 0 ? peak : -1, routetotal: Math.round(total),
          zeros: T.data.filter((v) => v === 0).length,
          mmshare: trips ? (mm / trips).toFixed(3) : "0"
        }
      };
    },

    code(ctx) {
      const T = ctx.taxi, s = ctx.state, c = ctx.copy.np;
      const cell = Math.round(FC.at(T, s.pickup, s.dropoff, s.hour));
      const at = K.idx([s.pickup, s.dropoff, s.hour]);
      const slice = {
        none: ["T[:, :, " + s.hour + "].shape", "(4, 5)"],
        hour: ["T[:, :, " + s.hour + "].shape", "(4, 5)"],
        pickup: ["T[" + s.pickup + ", :, :].shape", "(5, 24)"],
        dropoff: ["T[:, " + s.dropoff + ", :].shape", "(4, 24)"]
      }[s.slice];
      const busiest = FC.argmax(FC.marginal(T, 2));
      return K.code([
        ["T.shape", "(4, 5, 24): " + c.shape],
        ["T" + at, c.cell(cell, routeShort(ctx, s.pickup, s.dropoff), s.hour)],
        ["T[" + s.pickup + ", " + s.dropoff + ", :].shape", "(24,): " + c.fibre],
        [slice[0], slice[1] + ": " + c.slice[s.slice]],
        ["T.sum(axis=(0, 1)).argmax()", c.busiest(busiest)]
      ]);
    }
  });
})();
