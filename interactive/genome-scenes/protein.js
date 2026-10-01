// Scene 6: a protein as a chain through property space. Every residue is a
// one-hot row of 20; multiplied by the 20 x 3 table of published properties
// (hydropathy, volume, charge) it lands at a point, and the chain of 60 such
// points is what the protein looks like to arithmetic. Drawn in three.js, with
// an SVG twin from the same model. See genome-scenes/README.md for the contract.
(function () {
  "use strict";
  const GC = window.GenomeCore, K = window.GenomeKit;

  const TAU = 0.2;
  const BEAD = 0.17, BOND = 0.045, AXIS = 0.012, GHOST = 0.09;
  // Half the extent of each axis in world units: hydropathy runs across the
  // stage, which is wide, and volume and charge fit the height. Every axis is
  // normalised to the same [-1, 1] first; only then is it given a length.
  const SPAN = [4.2, 2.8, 2.8];
  const PROTEIN = GC.PROTEIN;
  const N = PROTEIN.length;

  // The three axes have nothing in common but the table they come from:
  // volume runs 60-228 and charge -1..1, so placed raw the chain would be a
  // line along volume and charge would be a rounding error. Each axis is
  // mapped from the extremes of the 20 x 3 table itself -- not of this
  // protein -- to [-1, 1], so the same residue sits at the same point in any
  // chain, and "one unit of charge" and "one unit of hydropathy" are each half
  // the width of their own axis.
  const EXT = [0, 1, 2].map((d) => {
    let lo = Infinity, hi = -Infinity;
    for (const row of GC.PROPS) { lo = Math.min(lo, row[d]); hi = Math.max(hi, row[d]); }
    return {lo, hi};
  });
  const place = (row) => row.map((v, d) => (2 * (v - EXT[d].lo) / (EXT[d].hi - EXT[d].lo) - 1) * SPAN[d]);

  const RAW = GC.embed(PROTEIN);            // (60, 3): the contraction
  const POINTS = RAW.map(place);            // the same, normalised, in world units
  const TABLE = GC.PROPS.map(place);        // the 20 places a residue can be

  const fmtRow = (row) => [K.fmt(row[0], 1), K.fmt(row[1], 1), K.fmt(row[2], 1)];

  function target(ctx) {
    const s = ctx.state, hl = ctx.hl, c = ctx.copy;
    const items = [];
    for (let n = 0; n < N; n++) {
      items.push({key: "r:" + n, n, c: POINTS[n], s: n < s.upto ? 1 : 0});
    }
    const labels = [];
    // The static frame: the three axis names, at the positive ends.
    [0, 1, 2].forEach((d) => {
      const pos = [0, 0, 0];
      pos[d] = SPAN[d] + (d === 0 ? 0.8 : 0.5);
      labels.push({text: c.props[d], pos, cls: "core", lit: hl === "prop"});
    });
    const bounds = K.withLabels({min: [-SPAN[0] - 0.3, -SPAN[1] - 0.3, -SPAN[2] - 0.3],
                                 max: [SPAN[0] + 0.3, SPAN[1] + 0.3, SPAN[2] + 0.3]}, labels);
    // The far left has no axis label to hold it open, and the chip over the
    // most hydrophobic-poor bead is about two units wide, so it is held open
    // by the same margin as the right-hand side.
    bounds.min[0] = Math.min(bounds.min[0], -SPAN[0] - 1.6);
    // The picked residue's chip is not part of the bounds: it hangs half a
    // unit above its bead, which the frame's margin above the volume axis
    // already holds, and the camera must not move when the pick does.
    const at = POINTS[s.pick];
    const chip = {
      text: PROTEIN[s.pick] + "  " + fmtRow(RAW[s.pick]).join(", "),
      pos: [at[0], at[1] + 0.5, at[2]], cls: "aa", lit: true, size: 13
    };
    return {items, labels: labels.concat([chip]), bounds};
  }

  function shown(ctx) {
    const c = ctx.cache, t = ctx.now();
    const key = JSON.stringify(ctx.state) + "|" + ctx.hl + "|" + ctx.hover;
    if (c.memo && c.memo.key === key && t - c.memo.t < 4) return c.memo.m;
    const want = target(ctx);
    c.ease = c.ease || {};
    const out = K.follow(c.ease, want.items, t, TAU, ctx.instant).sort((p, q) => p.n - q.n);
    const m = compose(ctx, want, out);
    c.memo = {key, t, m};
    return m;
  }

  // From eased residues to beads, bonds, axes and ghosts.
  function compose(ctx, want, out) {
    const s = ctx.state, hl = ctx.hl;
    const aa = PROTEIN[s.pick];
    const hov = ctx.hover && ctx.hover.startsWith("res:") ? Number(ctx.hover.slice(4)) : -1;
    const beads = [], segs = [];
    out.forEach((it) => {
      const n = it.n, g = it.s[0], here = it.c;
      const lit = n === s.pick;
      const kin = hl === "aa" && PROTEIN[n] === aa;
      // The chain runs N to C, and brightness says which way: a few steps
      // only, so the recolouring allocates nothing.
      const k = 0.55 + 0.3 * Math.round((n / (N - 1)) * 4) / 4;
      beads.push({
        c: here, r: BEAD * g * (lit ? 1.6 : (kin || hov === n ? 1.35 : 1)),
        token: lit ? "--gn-hit" : "--gn-aa", k: lit ? 1.7 : (kin ? 1.2 : k),
        alpha: lit ? 1 : (kin ? 1 : 0.6 + 0.3 * (k - 0.55) / 0.3),
        pick: g > 0.5 ? "res:" + n : undefined
      });
    });
    out.forEach((it, q) => {
      if (q === 0) return;
      const p = out[q - 1], g = Math.min(it.s[0], p.s[0]);
      // "codon" reads the chain up to the picked residue: the path so far.
      const read = hl === "codon" && it.n <= s.pick;
      segs.push({
        a: p.c, b: it.c, r: BOND * g, token: read ? "--gn-hit" : "--gn-aa",
        k: read ? 0.9 : 0.5, alpha: read ? 0.95 : 0.5
      });
    });
    [0, 1, 2].forEach((d) => {
      const a = [0, 0, 0], b = [0, 0, 0];
      a[d] = -SPAN[d]; b[d] = SPAN[d];
      const lit = hl === "prop";
      segs.push({a, b, r: AXIS, token: lit ? "--gn-core" : "--stage-mute", k: lit ? 1 : 0.7, alpha: lit ? 1 : 0.6});
    });
    const ghosts = hl === "aa"
      ? TABLE.map((c) => ({c, r: GHOST, token: "--stage-mute", k: 0.8, alpha: 0.55, pick: undefined}))
      : [];
    return {beads: beads.concat(ghosts), segs, labels: want.labels, bounds: want.bounds};
  }

  const EN = {
    k: "Section 06 · the protein",
    h: "An embedding is a contraction, not a lookup, and the chain is what it draws",
    concept: "A residue is a one-hot row of 20, exactly as a base is a row of 4. Multiplying the " +
             "(P, 20) grid by a 20 × 3 table of published properties is one matrix product, and " +
             "it puts every residue at a point in a space with one axis per property.",
    predict: "Before you grow the chain: 60 residues, but only 20 kinds. When two residues are " +
             "the same kind, where do they land?",
    b: "Each bead is a residue of the protein, placed by three published numbers: how much it " +
       "avoids water (hydropathy), how much room it takes (volume) and its charge at pH 7. The " +
       "chain is the protein in reading order, joined bead to bead. Nothing here is a lookup: " +
       "every residue is a one-hot row of 20, the table is a 20 × 3 matrix, and the point is " +
       "what comes out of multiplying them. That is why the same kind of residue always lands " +
       "on the same point — the chain is 60 steps between only 20 places, and keeps returning " +
       "to the ones it has used. The three axes are each scaled to the same range before they " +
       "are drawn, because volume runs from 60 to 228 and charge only from −1 to 1. Grow the " +
       "chain with the first slider; pick a residue with the second.",
    eqcap: "P has a row for each residue n and a column for each of the 20 kinds a; F has a row " +
           "for each kind and a column for each property d. The sum over a is the contraction.",
    props: ["hydropathy", "volume", "charge"],
    claim: (upto) => "(" + upto + ", 20) @ (20, 3) = (" + upto + ", 3)",
    read: (n, aa, row, upto, distinct) =>
      "<b>Residue " + n + "</b> is <b>" + aa + "</b>: its row of 20, times the 20 × 3 table, is the point <b>" +
      "hydropathy " + row[0] + ", volume " + row[1] + ", charge " + row[2] + "</b>. The chain so far " +
      "is " + upto + " residues on " + distinct + " distinct points.",
    tip: (n, aa, row) => "residue " + n + " · " + aa + " · " + row.join(", "),
    aria: (ctx) => {
      const s = ctx.state;
      return "A protein of " + s.upto + " residues drawn as a chain of beads through a space whose axes are " +
             "hydropathy, volume and charge. Residue " + (s.pick + 1) + ", " + PROTEIN[s.pick] + ", is lit.";
    },
    controls: {upto: "How much of the chain", pick: "Which residue"},
    options: {},
    np: {
      p: (upto) => "(" + upto + ", 20): one row per residue",
      f: "(20, 3): hydropathy, volume, charge",
      e: (upto) => "(" + upto + ", 3): every residue, placed",
      shape: (upto) => "(" + upto + ", 3): a point per residue",
      row: (n, aa) => "residue " + n + " is " + aa
    }
  };

  const ES = {
    k: "Sección 06 · la proteína",
    h: "Un embedding es una contracción, no una consulta, y la cadena es lo que dibuja",
    concept: "Un residuo es una fila one-hot de 20, igual que una base es una fila de 4. " +
             "Multiplicar la rejilla (P, 20) por una tabla de 20 × 3 de propiedades publicadas es un " +
             "solo producto de matrices, y coloca cada residuo en un punto de un espacio con un eje " +
             "por propiedad.",
    predict: "Antes de hacer crecer la cadena: 60 residuos, pero solo 20 tipos. Cuando dos residuos " +
             "son del mismo tipo, ¿dónde caen?",
    b: "Cada cuenta es un residuo de la proteína, colocado por tres números publicados: cuánto " +
       "rehúye el agua (hidropatía), cuánto espacio ocupa (volumen) y su carga a pH 7. La cadena " +
       "es la proteína en orden de lectura, unida cuenta a cuenta. Nada de esto es una consulta: " +
       "cada residuo es una fila one-hot de 20, la tabla es una matriz de 20 × 3, y el punto es " +
       "lo que sale de multiplicarlas. Por eso un mismo tipo de residuo siempre cae en el mismo " +
       "punto: la cadena son 60 pasos entre solo 20 lugares, y vuelve una y otra vez a los que ya " +
       "usó. Los tres ejes se llevan al mismo rango antes de dibujarse, porque el volumen va de 60 " +
       "a 228 y la carga solo de −1 a 1. Haz crecer la cadena con el primer deslizador; elige un " +
       "residuo con el segundo.",
    eqcap: "P tiene una fila por cada residuo n y una columna por cada uno de los 20 tipos a; F " +
           "tiene una fila por cada tipo y una columna por cada propiedad d. La suma sobre a es la contracción.",
    props: ["hidropatía", "volumen", "carga"],
    claim: (upto) => "(" + upto + ", 20) @ (20, 3) = (" + upto + ", 3)",
    read: (n, aa, row, upto, distinct) =>
      "<b>El residuo " + n + "</b> es <b>" + aa + "</b>: su fila de 20, por la tabla de 20 × 3, es el punto <b>" +
      "hidropatía " + row[0] + ", volumen " + row[1] + ", carga " + row[2] + "</b>. La cadena hasta " +
      "ahora son " + upto + " residuos en " + distinct + " puntos distintos.",
    tip: (n, aa, row) => "residuo " + n + " · " + aa + " · " + row.join(", "),
    aria: (ctx) => {
      const s = ctx.state;
      return "Una proteína de " + s.upto + " residuos dibujada como una cadena de cuentas en un espacio cuyos ejes son " +
             "hidropatía, volumen y carga. El residuo " + (s.pick + 1) + ", " + PROTEIN[s.pick] + ", está iluminado.";
    },
    controls: {upto: "Cuánta cadena", pick: "Qué residuo"},
    options: {},
    np: {
      p: (upto) => "(" + upto + ", 20): una fila por residuo",
      f: "(20, 3): hidropatía, volumen, carga",
      e: (upto) => "(" + upto + ", 3): cada residuo, colocado",
      shape: (upto) => "(" + upto + ", 3): un punto por residuo",
      row: (n, aa) => "el residuo " + n + " es " + aa
    }
  };

  window.GenomeScenes.register({
    id: "protein", section: "06", gl: true,
    hl: ["aa", "codon", "prop"],
    copy: {en: EN, es: ES},

    pose: {fov: 30, home: {az: -0.6, el: 0.34}, margin: 1.06,
           limits: {azMin: -1.4, azMax: 1.4, elMin: -0.35, elMax: 1.2, dollyMin: 0.5, dollyMax: 1.8}},

    controls: [
      {id: "upto", type: "range", min: 6, max: N, step: 6, fmt: (v) => String(v)},
      {id: "pick", type: "range", min: 0, max: N - 1, step: 1, fmt: (v) => (v + 1) + " · " + PROTEIN[v]}
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

    animates(ctx) { return !!(ctx.cache.ease && ctx.cache.ease.moving); },
    bounds(ctx) { return target(ctx).bounds; },

    pick(ctx, key) {
      if (key.startsWith("res:")) ctx.setControls({pick: Number(key.slice(4))});
    },
    tip(ctx, key) {
      if (!key.startsWith("res:")) return "";
      const n = Number(key.slice(4));
      return ctx.copy.tip(n + 1, PROTEIN[n], fmtRow(RAW[n]));
    },

    build(ctx) {
      const THREE = ctx.THREE;
      const scene = new THREE.Scene();
      K.light(scene);
      // 60 residues, then the 20 ghosts the table draws on demand.
      const sph = K.spheres(N + 20);
      scene.add(sph.mesh, sph.hit);
      // Up to 59 bonds, and the three axes.
      const seg = K.segments(N + 3);
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
      const distinct = new Set(PROTEIN.slice(0, s.upto)).size;
      return {
        html: c.read(s.pick + 1, PROTEIN[s.pick], row, s.upto, distinct),
        claim: c.claim(s.upto),
        data: {
          upto: String(s.upto), pick: String(s.pick), aa: PROTEIN[s.pick],
          hydropathy: row[0], volume: row[1], charge: row[2],
          distinct: String(distinct), shape: s.upto + ",3"
        }
      };
    },

    code(ctx) {
      const s = ctx.state, np = ctx.copy.np, row = fmtRow(RAW[s.pick]);
      return K.code([
        ["P = one_hot(protein)", np.p(s.upto)],
        ["F = props", np.f],
        ['E = np.einsum("na,ad->nd", P, F)', np.e(s.upto)],
        ["E.shape", np.shape(s.upto)],
        ["E[" + s.pick + "]", "[" + row.join(", ") + "]: " + np.row(s.pick + 1, PROTEIN[s.pick])]
      ]);
    }
  });
})();
