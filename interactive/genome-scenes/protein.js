// Scene 6: an embedding. Every residue is a one-hot row of 20; multiplying the
// (P, 20) grid by the (20, 3) table of published properties (hydropathy,
// volume, charge) places each at a point. The picture is that table drawn as a
// map -- the 20 kinds of residue as 20 spheres, each standing where its three
// numbers put it, sized by how often the chain has used it -- with the chain
// walking over it: a faint path for everything up to `upto`, and a bright
// comet of the last few steps running into the residue picked. Sixty residues
// touch only eighteen spheres, and the neighbours on the map are chemically
// alike, which is the whole reason to place them. Drawn in three.js, with an
// SVG twin from the same model. See genome-scenes/README.md for the contract.
(function () {
  "use strict";
  const GC = window.GenomeCore, K = window.GenomeKit;

  const TAU = 0.2;
  const AXIS = 0.012, FAINT = 0.012, LEADER = 0.01;
  const COMET = 6;                          // steps of the chain drawn bright
  const ENTRANCE_MS = 1800;
  // Half the extent of each axis in world units: hydropathy runs across the
  // stage, which is wide; volume and charge fit the height. The axes are put
  // on one [-1, 1] footing by the core (GC.scaleProps) and only then given a
  // length, so "one unit of charge" is half the width of its own axis.
  const SPAN = [4.8, 3.1, 1.5];
  const PROTEIN = GC.PROTEIN;
  const N = PROTEIN.length;
  const KINDS = GC.AAS.split("");

  const place = (row) => GC.scaleProps(row).map((v, d) => v * SPAN[d]);
  const RAW = GC.embed(PROTEIN);                // (60, 3): the contraction
  const POINTS = RAW.map(place);                // the same, scaled, in world units
  const TABLE = GC.PROPS.map(place);            // the 20 places a residue can be
  const COUNTS = (upto) => {
    const c = {};
    for (let n = 0; n < upto; n++) c[PROTEIN[n]] = (c[PROTEIN[n]] || 0) + 1;
    return c;
  };
  const radiusOf = (count) => (count ? 0.11 + 0.055 * Math.sqrt(count) : 0.09);

  const fmtRow = (row) => [K.fmt(row[0], 1), K.fmt(row[1], 1), K.fmt(row[2], 1)];
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  // Where each kind's letter chip goes. A chip on its own sphere would hide
  // it, and kinds that are chemically alike -- the whole point -- are close.
  // So the layout is done on the screen as the home view sees it: each chip
  // starts just above or below its sphere and is pushed until it clears every
  // other chip and every sphere, then lifted back into the sphere's own depth.
  // Fixed at load, so a chip never jumps; a turned view is a turned picture,
  // and the chips turn with it.
  const HOME = {az: -0.38, el: 0.2};
  const LC = window.LinalgCore;
  const VB = K.viewBasis(LC.orbitView(HOME.az, HOME.el));
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const onScreen = (p) => [dot(p, VB.right), dot(p, VB.up)];
  const lift = (p, s) => {
    const q = onScreen(p);
    return [0, 1, 2].map((k) => p[k] + VB.right[k] * (s[0] - q[0]) + VB.up[k] * (s[1] - q[1]));
  };
  const SCREEN = TABLE.map(onScreen);
  const RMAX = radiusOf(10);
  // Where the six axis-end names stand, in 3-D and on the screen, and about
  // how much room each takes (half width, half height): chips that are not
  // the letters' to move, so the letters move off them.
  const endPos = (d, sgn) => {
    const pos = [0, 0, 0];
    pos[d] = sgn * (SPAN[d] + (d === 0 ? 0.95 : 0.5));
    return pos;
  };
  const ENDS = [];
  [0, 1, 2].forEach((d) => [-1, 1].forEach((sgn) => {
    ENDS.push({d, sgn, pos: endPos(d, sgn), s: onScreen(endPos(d, sgn)), hw: d === 0 ? 1.55 : 0.8, hh: 0.22});
  }));
  const ANCHORS = (() => {
    const midY = SCREEN.reduce((a, p) => a + p[1], 0) / SCREEN.length;
    const out = SCREEN.map((p) => [p[0], p[1] + (p[1] >= midY ? 0.5 : -0.5)]);
    const W = [0.75, 0.46];                    // a chip: wide and short
    const clear = (a, b, min) => {
      const d = [(a[0] - b[0]) / W[0], (a[1] - b[1]) / W[1]];
      const m = Math.hypot(d[0], d[1]);
      if (m >= min) return null;
      const dir = m < 1e-6 ? [0, 1] : [d[0] / m, d[1] / m];
      return [dir[0] * (min - m) * W[0], dir[1] * (min - m) * W[1]];
    };
    for (let it = 0; it < 200; it++) {
      for (let a = 0; a < out.length; a++) {
        for (let b = a + 1; b < out.length; b++) {
          const v = clear(out[a], out[b], 1);
          if (!v) continue;
          out[a][0] += v[0] / 2; out[a][1] += v[1] / 2;
          out[b][0] -= v[0] / 2; out[b][1] -= v[1] / 2;
        }
        // And off the axis names, which stay where they are.
        ENDS.forEach((e) => {
          const dx = out[a][0] - e.s[0], dy = out[a][1] - e.s[1];
          const px = e.hw + 0.35 - Math.abs(dx), py = e.hh + 0.25 - Math.abs(dy);
          if (px <= 0 || py <= 0) return;
          if (py < px * 0.5) out[a][1] += (dy >= 0 ? 1 : -1) * py;
          else out[a][0] += (dx >= 0 ? 1 : -1) * px;
        });
        // And off every sphere, its own included.
        for (let b = 0; b < SCREEN.length; b++) {
          const v = clear(out[a], SCREEN[b], 0.55 + RMAX);
          if (v) { out[a][0] += v[0]; out[a][1] += v[1]; }
        }
      }
    }
    return out.map((s, i) => lift(TABLE[i], s));
  })();

  // The picked residue's chip is wide (its three numbers), so it is not left
  // where its letter would be: of a few places round its sphere, it takes the
  // one that covers least of the other chips and spheres and stays on stage.
  const WIDE = 1.95, TALL = 0.24;
  const mid = [0, 1].map((d) => SCREEN.reduce((a, p) => a + p[d], 0) / SCREEN.length);
  const PICKED = KINDS.map((a, i) => {
    const at = SCREEN[i];
    let best = null, bestCost = Infinity;
    [[0, 0.75], [0, -0.75], [-2.4, 0.2], [2.4, 0.2], [-2.1, 0.75], [2.1, 0.75], [-2.1, -0.75], [2.1, -0.75],
     [0, 1.35], [0, -1.35]].forEach((o) => {
      const c = [at[0] + o[0], at[1] + o[1]];
      let cost = 0;
      const hit = (p, hw, hh) => {
        const ox = Math.max(0, WIDE + hw - Math.abs(c[0] - p[0])), oy = Math.max(0, TALL + hh - Math.abs(c[1] - p[1]));
        return ox * oy;
      };
      ANCHORS.forEach((q, j) => { if (j !== i) cost += hit(onScreen(q), 0.3, 0.22) * 3; });
      SCREEN.forEach((p, j) => { cost += hit(p, 0.5, 0.45) * (j === i ? 4 : 1); });
      ENDS.forEach((e) => { cost += hit(e.s, e.hw, e.hh) * 3; });
      // Better out in the clear than inside the cloud.
      cost -= 0.15 * Math.hypot(c[0] - mid[0], (c[1] - mid[1]) * 1.6);
      cost += Math.max(0, Math.abs(c[0]) + WIDE - 6.4) * 4 + Math.max(0, Math.abs(c[1]) - 4.0) * 8;
      if (cost < bestCost - 1e-9) { bestCost = cost; best = c; }
    });
    return lift(TABLE[i], best);
  });

  // The model for the current controls, before easing: one item per kind
  // (keyed, so a sphere that is first used grows where it stands), and
  // everything that does not ease.
  function target(ctx) {
    const s = ctx.state, c = ctx.copy;
    const counts = COUNTS(s.upto);
    const items = KINDS.map((a, i) => ({key: "k:" + a, a, i, c: TABLE[i], s: radiusOf(counts[a] || 0)}));

    const aa = PROTEIN[s.pick];
    const near = GC.nearestKind(aa).aa;
    const labels = [];
    // Three axes, each end named in words.
    ENDS.forEach((e) => {
      labels.push({text: c.ends[e.d][e.sgn < 0 ? 0 : 1], pos: e.pos, cls: "mute", size: 12, lit: ctx.hl === "prop"});
    });
    KINDS.forEach((a, i) => {
      if (a === aa) return;
      labels.push({
        text: a, pos: ANCHORS[i], size: 12, lit: a === near,
        cls: a === near ? "core" : (counts[a] ? "aa" : "mute")
      });
    });
    const bounds = K.withLabels({min: [-SPAN[0] - 0.4, -SPAN[1] - 0.4, -SPAN[2] - 0.4],
                                 max: [SPAN[0] + 0.4, SPAN[1] + 0.4, SPAN[2] + 0.4]}, labels, 0.35);
    // The picked chip is not part of the bounds: the camera must not move
    // when the pick does.
    const ia = KINDS.indexOf(aa);
    labels.push({
      text: aa + " · " + fmtRow(RAW[s.pick]).join(", "),
      pos: PICKED[ia], cls: "hit", lit: true, size: 13
    });
    return {items, labels, bounds, counts, aa, near};
  }

  function shown(ctx) {
    const c = ctx.cache, t = ctx.now();
    const key = JSON.stringify(ctx.state) + "|" + ctx.hl + "|" + ctx.hover;
    if (c.memo && c.memo.key === key && t - c.memo.t < 4) return c.memo.m;
    const want = target(ctx);
    c.ease = c.ease || {};
    const out = K.follow(c.ease, want.items, t, TAU, ctx.instant);
    const m = compose(ctx, want, out);
    c.memo = {key, t, m};
    return m;
  }

  // From eased kinds to spheres, the chain's path, the comet and the axes.
  function compose(ctx, want, out) {
    const s = ctx.state, hl = ctx.hl;
    const aa = want.aa, near = want.near;
    const hov = ctx.hover && ctx.hover.startsWith("kind:") ? ctx.hover.slice(5) : "";
    // How much of the chain the entrance has drawn: the head runs from
    // residue 1 and the spheres swell as it passes over them.
    const reach = s.upto * K.arrival(ctx, ENTRANCE_MS);
    const seen = COUNTS(Math.floor(reach + 1e-9));
    const beads = [], segs = [];

    out.forEach((it) => {
      const a = it.a, here = seen[a] || 0;
      const used = want.counts[a] > 0;
      const lit = a === aa, isNear = a === near;
      const base = it.s[0];                 // eased radius for the settled count
      // During the entrance a kind is as big as the chain has made it so far.
      const r = here ? Math.min(base, radiusOf(here)) : (used ? 0.1 : base);
      const kin = hl === "aa" && used;
      beads.push({
        c: it.c, r: r * (lit ? 1.5 : (hov === a ? 1.25 : 1)),
        token: used ? K.residueTint(it.i) : "--stage-mute",
        k: lit ? 1.7 : (kin ? 1.25 : (used ? 0.95 : 0.55)),
        alpha: used ? 1 : 0.7,
        pick: used && it.s[0] > 0.05 ? "kind:" + a : undefined
      });
    });

    // The chain: faint all the way, bright for the last COMET steps.
    const read = hl === "codon";
    for (let q = 1; q < s.upto; q++) {
      const t = clamp01(reach - q);
      if (t <= 0) break;
      const a = POINTS[q - 1], b = lerp(a, POINTS[q], t);
      const comet = q <= s.pick && q > s.pick - COMET;
      segs.push({a, b, r: FAINT * (read && q <= s.pick ? 2.2 : 1), token: read && q <= s.pick ? "--gn-hit" : "--gn-aa",
                 k: read && q <= s.pick ? 0.9 : 0.5, alpha: read && q <= s.pick ? 0.9 : 0.3});
      if (comet) {
        const w = 1 - (s.pick - q) / COMET;      // 1 at the picked residue, fading back
        segs.push({a, b, r: 0.02 + 0.07 * w, token: "--gn-hit", k: 0.6 + 0.9 * w, alpha: 0.3 + 0.7 * w});
      }
    }
    // The nearest kind, joined to the picked one: what makes the space mean something.
    const ia = KINDS.indexOf(aa), ib = KINDS.indexOf(near);
    segs.push({a: TABLE[ia], b: TABLE[ib], r: 0.022, token: "--gn-core", k: 1, alpha: 0.9});
    // A hairline from a sphere to its chip when the chip has been pushed off it.
    KINDS.forEach((a, i) => {
      const to = a === aa ? PICKED[i] : ANCHORS[i];
      const d = Math.hypot(to[0] - TABLE[i][0], to[1] - TABLE[i][1], to[2] - TABLE[i][2]);
      if (d > 0.45) segs.push({a: TABLE[i], b: to, r: LEADER, token: a === aa ? "--gn-hit" : "--stage-mute", k: 0.8, alpha: 0.6});
    });
    [0, 1, 2].forEach((d) => {
      const a = [0, 0, 0], b = [0, 0, 0];
      a[d] = -SPAN[d]; b[d] = SPAN[d];
      const lit = hl === "prop";
      segs.push({a, b, r: AXIS, token: lit ? "--gn-core" : "--stage-mute", k: lit ? 1 : 0.7, alpha: lit ? 1 : 0.6});
    });
    return {beads, segs, labels: want.labels, bounds: want.bounds};
  }

  const EN = {
    tab: "protein",
    k: "Section 06 · the protein",
    h: "An embedding is a table you multiply by: 20 kinds of residue, three numbers each",
    concept: "A residue is a one-hot row of 20, exactly as a base is a row of 4. Multiplying the " +
             "(P, 20) grid by a 20 × 3 table of published properties is one matrix product, and " +
             "it puts every residue at a point in a space with one axis per property.",
    predict: "Before you grow the chain: 60 residues, 20 possible kinds. How many distinct points " +
             "will the chain touch — and which kind do you expect to sit nearest isoleucine?",
    b: "Each sphere is one of the 20 kinds of residue, standing where three published numbers put " +
       "it: how much it avoids water, how much room it takes, and its charge at pH 7. A sphere " +
       "swells with each use. The bright tail is the last few steps of the " +
       "chain, running into the residue you picked. Grow the chain, click a sphere, or press play " +
       "to walk it end to end. This is the same answer as looking each residue up in the table, " +
       "written as one matrix product that places all of them at once; each axis is rescaled to " +
       "−1…1 so volume does not drown charge.",
    eqcap: "P has a row for each residue n and a column for each of the 20 kinds a; F has a row " +
           "for each kind and a column for each property d. The sum over a is the contraction.",
    props: ["hydropathy", "volume", "charge"],
    ends: [["loves water", "avoids water"], ["small", "large"], ["charge −", "charge +"]],
    claim: (upto) => "(" + upto + ", 20) @ (20, 3) = (" + upto + ", 3)",
    read: (n, aa, row, near, upto, distinct, iso) =>
      "<b>Residue " + n + "</b> is <b>" + aa + "</b>: its row of 20, times the (20, 3) table, is the point <b>" +
      "hydropathy " + row[0] + ", volume " + row[1] + ", charge " + row[2] + "</b>. The kind nearest it " +
      "in this space is <b>" + near + "</b>. So far the chain is " + upto + (upto === 1 ? " residue" : " residues") +
      " on <b>" + distinct + "</b> distinct " + (distinct === 1 ? "point." : "points.") +
      " Isoleucine's nearest kind is " + iso + ".",
    tip: (aa, row, count) => aa + " · " + row.join(", ") + " · " + count + (count === 1 ? " residue" : " residues"),
    aria: (ctx) => {
      const s = ctx.state, near = GC.nearestKind(PROTEIN[s.pick]).aa;
      return "A map of the 20 kinds of amino acid placed by hydropathy, volume and charge, with a protein of " +
             s.upto + " residues walking over it. Residue " + (s.pick + 1) + ", " + PROTEIN[s.pick] +
             ", is lit; the nearest kind to it is " + near + ".";
    },
    controls: {upto: "How much of the chain", pick: "Which residue", play: "▶ Walk the chain"},
    options: {},
    np: {
      p: (upto) => "(" + upto + ", 20): one row per residue",
      f: "(20, 3): hydropathy, volume, charge",
      e: (upto) => "(" + upto + ", 3): every residue, placed",
      row: (n, aa) => "residue " + n + " is " + aa,
      uniq: (d) => d + (d === 1 ? " distinct point" : " distinct points")
    }
  };

  const ES = {
    tab: "proteína",
    k: "Sección 06 · la proteína",
    h: "Un embedding es una tabla por la que se multiplica: 20 tipos de residuo, tres números cada uno",
    concept: "Un residuo es una fila one-hot de 20, igual que una base es una fila de 4. " +
             "Multiplicar la rejilla (P, 20) por una tabla de 20 × 3 de propiedades publicadas es un " +
             "solo producto de matrices, y coloca cada residuo en un punto de un espacio con un eje " +
             "por propiedad.",
    predict: "Antes de hacer crecer la cadena: 60 residuos, 20 tipos posibles. ¿Cuántos puntos " +
             "distintos tocará la cadena, y qué tipo esperas que quede más cerca de la isoleucina?",
    b: "Cada esfera es uno de los 20 tipos de residuo, colocado donde lo ponen tres números " +
       "publicados: cuánto rehúye el agua, cuánto espacio ocupa y su carga a pH 7. Una esfera " +
       "crece con cada uso. La cola brillante son los últimos pasos de la " +
       "cadena, que llegan al residuo elegido. Alarga la cadena, pulsa una esfera o dale a " +
       "reproducir para recorrerla entera. Es la misma respuesta que buscar cada residuo en la " +
       "tabla, escrita como un solo producto de matrices que los coloca todos a la vez; cada eje " +
       "se reescala a −1…1 para que el volumen no ahogue la carga.",
    eqcap: "P tiene una fila por cada residuo n y una columna por cada uno de los 20 tipos a; F " +
           "tiene una fila por cada tipo y una columna por cada propiedad d. La suma sobre a es la contracción.",
    props: ["hidropatía", "volumen", "carga"],
    ends: [["ama el agua", "rehúye el agua"], ["pequeño", "grande"], ["carga −", "carga +"]],
    claim: (upto) => "(" + upto + ", 20) @ (20, 3) = (" + upto + ", 3)",
    read: (n, aa, row, near, upto, distinct, iso) =>
      "<b>El residuo " + n + "</b> es <b>" + aa + "</b>: su fila de 20, por la tabla de 20 × 3, es el punto <b>" +
      "hidropatía " + row[0] + ", volumen " + row[1] + ", carga " + row[2] + "</b>. El tipo más cercano en " +
      "este espacio es <b>" + near + "</b>. Hasta ahora la cadena " + (upto === 1 ? "es 1 residuo" : "son " + upto + " residuos") +
      " en <b>" + distinct + "</b> " + (distinct === 1 ? "punto distinto." : "puntos distintos.") +
      " El tipo más cercano a la isoleucina es " + iso + ".",
    tip: (aa, row, count) => aa + " · " + row.join(", ") + " · " + count + (count === 1 ? " residuo" : " residuos"),
    aria: (ctx) => {
      const s = ctx.state, near = GC.nearestKind(PROTEIN[s.pick]).aa;
      return "Un mapa de los 20 tipos de aminoácido colocados por hidropatía, volumen y carga, con una proteína de " +
             s.upto + " residuos que lo recorre. El residuo " + (s.pick + 1) + ", " + PROTEIN[s.pick] +
             ", está iluminado; el tipo más cercano es " + near + ".";
    },
    controls: {upto: "Cuánta cadena", pick: "Qué residuo", play: "▶ Recorrer la cadena"},
    options: {},
    np: {
      p: (upto) => "(" + upto + ", 20): una fila por residuo",
      f: "(20, 3): hidropatía, volumen, carga",
      e: (upto) => "(" + upto + ", 3): cada residuo, colocado",
      row: (n, aa) => "el residuo " + n + " es " + aa,
      uniq: (d) => d + (d === 1 ? " punto distinto" : " puntos distintos")
    }
  };

  window.GenomeScenes.register({
    id: "protein", section: "06", gl: true,
    hl: ["aa", "codon", "prop"],
    copy: {en: EN, es: ES},

    pose: {fov: 30, home: HOME, margin: 1.0,
           limits: {azMin: -0.85, azMax: 0.85, elMin: -0.3, elMax: 0.8, dollyMin: 0.5, dollyMax: 1.8}},

    controls: [
      {id: "upto", type: "range", min: 1, max: N, step: 1, fmt: (v) => String(v)},
      {id: "pick", type: "range", min: 0, max: N - 1, step: 1, fmt: (v) => (v + 1) + " · " + PROTEIN[v]},
      {id: "play", type: "play", target: "pick", rate: 5}
    ],

    init(ctx) {
      ctx.state.upto = N;
      ctx.state.pick = 0;
    },

    // A residue not yet built is not on the stage: pick follows upto down,
    // and the slider's own range with it so the thumb does not sit past its end.
    sync(ctx) {
      const s = ctx.state;
      s.pick = Math.max(0, Math.min(s.pick, s.upto - 1));
      const inp = ctx.control ? ctx.control("pick") : null;
      if (inp) {
        if (inp.max !== String(s.upto - 1)) inp.max = String(s.upto - 1);
        if (inp.value !== String(s.pick)) inp.value = String(s.pick);
      }
    },

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) {
      return K.arrival(ctx, ENTRANCE_MS) < 1 || !!(ctx.cache.ease && ctx.cache.ease.moving);
    },
    bounds(ctx) { return target(ctx).bounds; },

    // A press on a sphere picks the residue of that kind nearest the current one.
    pick(ctx, key) {
      if (!key.startsWith("kind:")) return;
      const a = key.slice(5);
      let best = -1;
      for (let n = 0; n < ctx.state.upto; n++) {
        if (PROTEIN[n] === a && (best < 0 || Math.abs(n - ctx.state.pick) < Math.abs(best - ctx.state.pick))) best = n;
      }
      if (best >= 0) ctx.setControls({pick: best});
    },
    tip(ctx, key) {
      if (!key.startsWith("kind:")) return "";
      const a = key.slice(5), count = COUNTS(ctx.state.upto)[a] || 0;
      return ctx.copy.tip(a, fmtRow(GC.PROPS[KINDS.indexOf(a)]), count);
    },
    // The ribbon: three bases a residue.
    seek(ctx, i) { ctx.setControls({pick: Math.min(Math.floor(i / 3), ctx.state.upto - 1)}); },

    build(ctx) {
      const THREE = ctx.THREE;
      const scene = new THREE.Scene();
      K.light(scene);
      const sph = K.spheres(20);
      scene.add(sph.mesh, sph.hit);
      // Up to 59 faint bonds, 6 comet steps, the nearest-kind link, 20 hairlines, 3 axes.
      const seg = K.segments(100);
      scene.add(seg.mesh);
      const keys = [];
      return {
        scene, sph, seg, keys, labels: K.labelPool(scene), col: K.palette(),
        cam: new THREE.PerspectiveCamera(this.pose.fov, ctx.aspect, 0.1, 500),
        pick: [{mesh: sph.hit, key: (id) => keys[id] || null}]
      };
    },

    render(ctx, gl) {
      const m = shown(ctx);
      gl.keys.length = 0;
      m.beads.forEach((b, n) => {
        gl.sph.set(n, b.c, b.r, gl.col(b.token, b.k));
        gl.keys[n] = b.pick || null;
      });
      gl.sph.count(m.beads.length);
      gl.sph.commit();
      m.segs.forEach((g, n) => gl.seg.set(n, g.a, g.b, g.r, gl.col(g.token, g.k)));
      gl.seg.count(m.segs.length);
      gl.seg.commit();
      gl.labels.sync(m.labels);
    },

    // The twin: the same model, through the same orbit, fitted to the board.
    draw(ctx) {
      const m = shown(ctx), b = m.bounds;
      const P = ctx.projector(K.corners(b.min, b.max), ctx.box());
      const B = ctx.basis();
      K.segments2(ctx.svg, m.segs, B, P);
      K.spheres2(ctx.svg, m.beads, B, P);
      K.labels2(ctx.svg, m.labels, P);
    },

    readout(ctx) {
      const s = ctx.state, c = ctx.copy, row = fmtRow(RAW[s.pick]);
      const aa = PROTEIN[s.pick];
      const distinct = new Set(PROTEIN.slice(0, s.upto)).size;
      const near = GC.nearestKind(aa).aa;
      return {
        html: c.read(s.pick + 1, aa, row, near, s.upto, distinct, GC.nearestKind("I").aa),
        claim: c.claim(s.upto),
        caption: "E[" + s.pick + "] = P[" + s.pick + "] @ F = [" + row.join(", ") + "]",
        lens: {a: 3 * s.pick, b: 3 * s.pick + 3, done: [0, 3 * s.upto]},
        data: {
          upto: String(s.upto), pick: String(s.pick), aa,
          hydropathy: row[0], volume: row[1], charge: row[2],
          distinct: String(distinct), shape: s.upto + ",3", nearest: near
        }
      };
    },

    code(ctx) {
      const s = ctx.state, np = ctx.copy.np, row = fmtRow(RAW[s.pick]);
      const distinct = new Set(PROTEIN.slice(0, s.upto)).size;
      return K.code([
        [s.upto === N ? "P = one_hot(protein)" : "P = one_hot(protein[:" + s.upto + "])", np.p(s.upto)],
        ["F = props", np.f],
        ['E = np.einsum("na,ad->nd", P, F)', np.e(s.upto)],
        ["E[" + s.pick + "]", "[" + row.join(", ") + "]: " + np.row(s.pick + 1, PROTEIN[s.pick])],
        ["np.unique(E, axis=0).shape[0]", np.uniq(distinct)]
      ]);
    }
  });
})();
