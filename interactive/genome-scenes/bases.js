// Scene 1: a sequence is a one-hot tensor. A double helix of beads, each
// bead a base in its own colour, and one base picked out: its chip names the
// letter and the row of the (L, 4) grid it becomes. The helix lies along x
// rather than up y, because the stage is twice as wide as it is tall and a
// standing helix would leave both sides empty; the kit's helix() is turned a
// quarter so its axis is x. Drawn in three.js, with an SVG twin from the same
// model. See genome-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const GC = window.GenomeCore, K = window.GenomeKit;

  const RISE = 0.3, RADIUS = 0.9;        // world units: a few across, never hundreds
  const BEAD = 0.2, BACKBONE = 0.05, RUNG = 0.03;
  const MAX_PAIRS = 40;
  const TAU = 0.2;
  // Brightness a bead is drawn at. Only the picked one is above the bloom
  // threshold, so only it glows; the rest stay below it on purpose.
  const DIM = 0.5, NORM = 0.8, LIT = 1.7;

  // The other strand, as arithmetic: the complement is the anti-diagonal
  // matrix of the transcription scene, applied to the same one-hot grid.
  function complement(ctx) {
    if (!ctx.cache.comp) {
      ctx.cache.comp = GC.decode(GC.applyAlphabet(GC.oneHot(ctx.seq), GC.matrixFor("complement")), GC.BASES);
    }
    return ctx.cache.comp;
  }

  const rowOf = (letter) => GC.oneHot(letter)[0];
  const flip = (p) => [p[1], p[0], p[2]];    // the kit's y-axis helix, laid along x

  // Everything both surfaces draw for the current controls, before easing:
  // one item per base pair (keyed, so a slider moved mid-move is a new target),
  // the labels, and the bounds.
  function target(ctx) {
    const s = ctx.state, n = s.pairs;
    const H = K.helix(n, {radius: RADIUS, rise: RISE});
    const items = H.pairs.map((p) => {
      const mid = flip(p.mid), a = flip(p.a), b = flip(p.b);
      return {
        key: "p:" + p.i, i: p.i, c: mid, s: 1,
        oa: [a[0] - mid[0], a[1] - mid[1], a[2] - mid[2]],
        ob: [b[0] - mid[0], b[1] - mid[1], b[2] - mid[2]]
      };
    });
    const letter = ctx.seq[s.pos];
    const row = rowOf(letter);
    const half = ((n - 1) / 2) * RISE;
    const pickX = items[s.pos].c[0];
    const labels = [
      {text: letter + " → " + K.idx(row), pos: [pickX, RADIUS + 0.85, 0], cls: K.BASE_CLS[letter], lit: true, size: 13},
      {text: "5′", pos: [-half - 0.55, 0, 0], cls: "mute"},
      {text: "3′", pos: [half + 0.55, 0, 0], cls: "mute"}
    ];
    // At ten pairs the helix is short and a chip over its end would hang off
    // it, so the frame is never narrower than a chip needs.
    const w = Math.max(half + 0.7, 2.6);
    return {items, labels, letter, row, bounds: {min: [-w, -RADIUS - 0.45, -RADIUS - 0.45], max: [w, RADIUS + 0.45, RADIUS + 0.45]}};
  }

  // The eased picture: pairs go through K.follow by identity, so one that
  // appears grows where it stands and one that goes shrinks there. Memoised
  // per frame, because bounds(), render() and draw() all ask.
  function shown(ctx) {
    const c = ctx.cache, t = ctx.now();
    const key = JSON.stringify(ctx.state) + "|" + ctx.hl + "|" + ctx.hover;
    if (c.memo && c.memo.key === key && t - c.memo.t < 4) return c.memo.m;
    const want = target(ctx);
    c.ease = c.ease || {};
    const out = K.follow(c.ease, want.items, t, TAU, ctx.instant).sort((p, q) => p.i - q.i);
    const m = compose(ctx, want, out);
    c.memo = {key, t, m};
    return m;
  }

  // From eased pairs to beads and strands. A bead's offset from the axis
  // scales with the pair's own growth, so a new pair opens out of the axis.
  function compose(ctx, want, out) {
    const s = ctx.state, hl = ctx.hl, seq = ctx.seq, comp = complement(ctx);
    const hov = ctx.hover && ctx.hover.startsWith("base:") ? Number(ctx.hover.slice(5)) : -1;
    const picked = seq[s.pos];
    const beads = [], segs = [], halo = [];
    const ends = out.map((it) => {
      const g = it.s[0];
      return {
        a: [it.c[0] + it.oa[0] * g, it.c[1] + it.oa[1] * g, it.c[2] + it.oa[2] * g],
        b: [it.c[0] + it.ob[0] * g, it.c[1] + it.ob[1] * g, it.c[2] + it.ob[2] * g], g
      };
    });
    out.forEach((it, q) => {
      const e = ends[q], i = it.i, g = e.g;
      const la = seq[i], lb = comp[i];
      const isPick = i === s.pos;
      // "base" lights every bead of the picked letter, on either strand: the
      // alphabet axis is what the four colours are.
      const same = (l) => hl === "base" && l === picked;
      const dim = hl === "base";
      const side = (l, pos, strand) => {
        const lit = strand === "a" && isPick;
        const big = lit || same(l) || hov === i;
        return {
          c: pos, r: BEAD * g * (big ? 1.3 : 1), token: K.BASE_TOKEN[l],
          k: lit ? LIT : (dim && !same(l) ? DIM : NORM),
          alpha: lit ? 1 : (dim && !same(l) ? 0.45 : 0.85),
          pick: it.pick === undefined && g > 0.5 ? "base:" + i : undefined
        };
      };
      const ba = side(la, e.a, "a"), bb = side(lb, e.b, "b");
      if (isPick) halo.push({c: e.a, r: BEAD * g * 1.75, token: "--gn-hit", k: 1.2, alpha: 1, pick: undefined});
      beads.push(ba, bb);
      segs.push({
        a: e.a, b: e.b, r: RUNG * g,
        token: isPick || hl === "pos" ? "--gn-hit" : "--stage-mute",
        k: isPick || hl === "pos" ? 1 : NORM, alpha: isPick || hl === "pos" ? 1 : 0.55
      });
      if (q > 0) {
        const p = ends[q - 1], gg = Math.min(g, p.g);
        segs.push({a: p.a, b: e.a, r: BACKBONE * gg, token: "--stage-mute", k: NORM, alpha: 0.8});
        segs.push({a: p.b, b: e.b, r: BACKBONE * gg, token: "--stage-mute", k: NORM, alpha: 0.8});
      }
    });
    return {beads: halo.concat(beads), segs, labels: want.labels, bounds: K.withLabels(want.bounds, want.labels)};
  }

  const frame = (ctx) => { const t = target(ctx); return K.withLabels(t.bounds, t.labels); };

  const EN = {
    k: "Section 01 · a sequence as a tensor",
    h: "A sequence is a grid of ones and zeros, and the alphabet became an axis",
    concept: "One-hot encoding gives every base a vector of four with a single 1 in its own " +
             "column, so a sequence of L bases is an L × 4 tensor. The letters were labels; " +
             "the tensor is what can be multiplied.",
    predict: "Before you touch anything: the whole gene is 180 bases. Once every base is a row " +
             "of four numbers, how many 1s are in the grid?",
    b: "Every bead in the helix is one row of a grid. The 180 bases of this gene become a " +
       "<b>180 × 4</b> grid of ones and zeros with exactly one 1 in each row: the alphabet has " +
       "become an axis. Pick a base with the slider, or click one, and the chip over it says " +
       "which row it is — A is [1, 0, 0, 0], C is [0, 1, 0, 0], G is [0, 0, 1, 0] and T is " +
       "[0, 0, 0, 1]. The helix draws only the first few pairs, and they are the first rows of " +
       "the 180. The letters are not numbers and never were: writing A as 1 and T as 4 would " +
       "say that T is four times A and that G sits halfway between them. One-hot says nothing " +
       "of the kind — every base is the same distance from every other — and that is what lets " +
       "a four-letter alphabet be multiplied.",
    eqcap: "X has one row for each position ℓ and one column for each base b. Every row sums to " +
           "exactly 1, because a base is exactly one letter. Point at a letter to light it.",
    claim: (n, letter, row) => "base " + n + " = " + letter + " → row " + K.idx(row),
    read: (n, letter, row, pairs, total) =>
      "<b>Base " + n + "</b> is <b>" + letter + "</b>: its row of the " + total + " × 4 grid is <b>" +
      K.idx(row) + "</b>. The helix draws " + pairs + " of the " + total + " bases.",
    tip: (n, letter, row) => "base " + n + " · " + letter + " → " + K.idx(row),
    aria: (ctx) => {
      const s = ctx.state, l = ctx.seq[s.pos];
      return "A double helix of " + s.pairs + " base pairs, each base a bead in its own colour. " +
             "Base " + (s.pos + 1) + " is lit: it is " + l + ", and its one-hot row is " + K.idx(rowOf(l)) + ".";
    },
    controls: {pairs: "Base pairs drawn", pos: "Which base"},
    options: {},
    np: {
      seq: (L) => L + " bases over A C G T",
      shape: (L) => "(" + L + ", 4): one row per base",
      row: (n, l) => "base " + n + " is " + l,
      ones: (L) => L + " ones: exactly one 1 per row"
    }
  };

  const ES = {
    k: "Sección 01 · una secuencia como tensor",
    h: "Una secuencia es una rejilla de unos y ceros, y el alfabeto pasó a ser un eje",
    concept: "La codificación one-hot da a cada base un vector de cuatro con un único 1 en su " +
             "propia columna, así que una secuencia de L bases es un tensor L × 4. Las letras " +
             "eran etiquetas; el tensor es lo que se puede multiplicar.",
    predict: "Antes de tocar nada: el gen entero tiene 180 bases. Cuando cada base es una fila " +
             "de cuatro números, ¿cuántos 1 hay en la rejilla?",
    b: "Cada cuenta de la hélice es una fila de una rejilla. Las 180 bases de este gen se " +
       "vuelven una rejilla de <b>180 × 4</b> de unos y ceros con exactamente un 1 en cada " +
       "fila: el alfabeto pasó a ser un eje. Elige una base con el deslizador, o haz clic en " +
       "una, y la etiqueta sobre ella dice qué fila es: A es [1, 0, 0, 0], C es [0, 1, 0, 0], " +
       "G es [0, 0, 1, 0] y T es [0, 0, 0, 1]. La hélice solo dibuja los primeros pares, y " +
       "son las primeras filas de las 180. Las letras no son números ni lo fueron nunca: " +
       "escribir A como 1 y T como 4 diría que T es cuatro veces A y que G está a medio " +
       "camino entre ambas. One-hot no dice nada parecido (cada base está a la misma " +
       "distancia de todas las demás) y por eso un alfabeto de cuatro letras se puede " +
       "multiplicar.",
    eqcap: "X tiene una fila por cada posición ℓ y una columna por cada base b. Cada fila suma " +
           "exactamente 1, porque una base es exactamente una letra. Señala una letra para iluminarla.",
    claim: (n, letter, row) => "base " + n + " = " + letter + " → fila " + K.idx(row),
    read: (n, letter, row, pairs, total) =>
      "<b>La base " + n + "</b> es <b>" + letter + "</b>: su fila de la rejilla de " + total +
      " × 4 es <b>" + K.idx(row) + "</b>. La hélice dibuja " + pairs + " de las " + total + " bases.",
    tip: (n, letter, row) => "base " + n + " · " + letter + " → " + K.idx(row),
    aria: (ctx) => {
      const s = ctx.state, l = ctx.seq[s.pos];
      return "Una doble hélice de " + s.pairs + " pares de bases, cada base una cuenta de su color. " +
             "La base " + (s.pos + 1) + " está iluminada: es " + l + " y su fila one-hot es " + K.idx(rowOf(l)) + ".";
    },
    controls: {pairs: "Pares de bases dibujados", pos: "Qué base"},
    options: {},
    np: {
      seq: (L) => L + " bases sobre A C G T",
      shape: (L) => "(" + L + ", 4): una fila por base",
      row: (n, l) => "la base " + n + " es " + l,
      ones: (L) => L + " unos: exactamente un 1 por fila"
    }
  };

  window.GenomeScenes.register({
    id: "bases", section: "01", gl: true,
    part: {en: "A sequence is a one-hot tensor", es: "Una secuencia es un tensor one-hot"},
    hl: ["pos", "base"],
    copy: {en: EN, es: ES},

    // The helix lies along x, so a wide turn shows it end-on; the limits keep
    // it a helix and not a ring.
    pose: {fov: 30, home: {az: -0.4, el: 0.3}, margin: 1.08,
           limits: {azMin: -0.95, azMax: 0.95, elMin: -0.35, elMax: 1.0, dollyMin: 0.5, dollyMax: 1.8}},

    controls: [
      {id: "pairs", type: "range", min: 10, max: MAX_PAIRS, step: 10, fmt: (v) => String(v)},
      {id: "pos", type: "range", min: 0, max: MAX_PAIRS - 1, step: 1, fmt: (v) => String(v + 1)}
    ],

    init(ctx) {
      ctx.state.pairs = 30;
      ctx.state.pos = 0;
    },

    // A base beyond the helix is not on the stage: pos follows pairs down, and
    // the slider's own range with it so the thumb does not sit past its end.
    sync(ctx) {
      const s = ctx.state;
      s.pos = Math.max(0, Math.min(s.pos, s.pairs - 1));
      const inp = ctx.control ? ctx.control("pos") : null;
      if (inp) {
        if (inp.max !== String(s.pairs - 1)) inp.max = String(s.pairs - 1);
        if (inp.value !== String(s.pos)) inp.value = String(s.pos);
      }
    },

    animates(ctx) { return !!(ctx.cache.ease && ctx.cache.ease.moving); },
    bounds(ctx) { return frame(ctx); },

    pick(ctx, key) {
      if (key.startsWith("base:")) ctx.setControls({pos: Number(key.slice(5))});
    },
    tip(ctx, key) {
      if (!key.startsWith("base:")) return "";
      const i = Number(key.slice(5)), l = ctx.seq[i];
      return ctx.copy.tip(i + 1, l, rowOf(l));
    },

    build(ctx) {
      const THREE = ctx.THREE;
      const scene = new THREE.Scene();
      K.light(scene);
      // Two beads a pair, and one more for the picked base's halo.
      const sph = K.spheres(2 * MAX_PAIRS + 1);
      scene.add(sph.mesh, sph.hit);
      // A backbone link on each strand and a rung, for every pair.
      const seg = K.segments(3 * MAX_PAIRS);
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
      const m = shown(ctx), b = frame(ctx);
      const P = ctx.projector(K.corners(b.min, b.max), ctx.box());
      const B = ctx.basis();
      K.segments2(ctx.svg, m.segs, B, P);
      K.spheres2(ctx.svg, m.beads, B, P);
      K.labels2(ctx.svg, m.labels, P);
    },

    readout(ctx) {
      const s = ctx.state, c = ctx.copy;
      const letter = ctx.seq[s.pos], row = rowOf(letter), total = ctx.seq.length;
      return {
        html: c.read(s.pos + 1, letter, row, s.pairs, total),
        claim: c.claim(s.pos + 1, letter, row),
        data: {
          pairs: String(s.pairs), pos: String(s.pos), base: letter, row: row.join(","),
          shape: total + ",4", length: String(total), ones: String(total)
        }
      };
    },

    code(ctx) {
      const s = ctx.state, np = ctx.copy.np, total = ctx.seq.length;
      const letter = ctx.seq[s.pos], row = rowOf(letter);
      return K.code([
        ["X = one_hot(seq)", np.seq(total)],
        ["X.shape", np.shape(total)],
        ["X[" + s.pos + "]", K.idx(row) + ": " + np.row(s.pos + 1, letter)],
        ["X.sum(axis=1)", np.ones(total)]
      ]);
    }
  });
})();
