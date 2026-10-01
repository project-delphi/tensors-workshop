// Scene 1: a sequence is a one-hot tensor. A double helix lying along x, and
// under it the grid it becomes: one column per base of the top strand, one
// row per letter, a single lit cell where they meet. The molecule and its
// tensor are in the same frame and share an axis -- position -- so a reader
// can drop from a bead straight down to the 1 that encodes it. On the scene's
// first showing the ones fall out of the helix into the grid, 5' to 3'.
// The helix lies along x because the stage is wider than it is tall; the
// kit's helix() is turned a quarter so its axis is x. Drawn in three.js, with
// an SVG twin from the same model. See genome-scenes/README.md for the
// contract this keeps.
(function () {
  "use strict";
  const GC = window.GenomeCore, K = window.GenomeKit;

  const RISE = 0.3, RADIUS = 0.9;        // world units: a few across, never hundreds
  const BEAD = 0.2, BACKBONE = 0.05, RUNG = 0.03;
  const MAX_PAIRS = 36;
  const TAU = 0.2;
  // The grid: four rows under the helix, A at the top, standing up so it
  // reads as the matrix it is.
  const GRID_TOP = -RADIUS - 0.6, LY = 0.36, CELL = 0.8, DEPTH = 0.14;
  const rowY = (j) => GRID_TOP - (j + 0.5) * LY;
  const GRID_BOTTOM = GRID_TOP - 4 * LY;
  const ENTRANCE = {ms: 1700, lag: 5};   // the ones fall in a wave this many columns wide
  // Brightness. Only what the reader has picked is above the bloom
  // threshold, so only it glows; the rest stay below it on purpose.
  const DIM = 0.4, NORM = 0.8, LIT = 1.7;

  // The other strand, as arithmetic: the complement is the anti-diagonal
  // matrix of the transcription scene, applied to the same one-hot grid.
  function partner(ctx) {
    if (!ctx.cache.comp) ctx.cache.comp = GC.templateStrand(ctx.seq);
    return ctx.cache.comp;
  }

  const rowOf = (letter) => GC.oneHot(letter)[0];
  const flip = (p) => [p[1], p[0], p[2]];    // the kit's y-axis helix, laid along x
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  // Everything both surfaces draw for the current controls, before easing:
  // one item per base pair (keyed, so a slider moved mid-move is a new
  // target), the labels, and the bounds.
  function target(ctx) {
    const s = ctx.state, n = s.pairs, c = ctx.copy;
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
    const rowX = Math.max(-half + 0.7, Math.min(half - 0.7, pickX));
    const labels = [
      {text: c.bead(s.pos + 1, letter), pos: [rowX, RADIUS + 0.6, 0], cls: K.BASE_CLS[letter], lit: true},
      {text: "X[" + s.pos + "] = " + K.idx(row), pos: [rowX, GRID_BOTTOM - 0.5, 0], cls: K.BASE_CLS[letter], lit: true, size: 13},
      {text: "5′", pos: [-half - 0.6, 0, 0], cls: "mute"},
      {text: "3′", pos: [half + 0.6, 0, 0], cls: "mute"}
    ];
    for (let j = 0; j < 4; j++) {
      labels.push({text: GC.BASES[j], pos: [-half - 0.6, rowY(j), 0], cls: K.BASE_CLS[GC.BASES[j]],
                   lit: ctx.hl === "base" && j === row.indexOf(1)});
    }
    return {
      items, labels, letter, row, half,
      bounds: {min: [-half - 1.0, GRID_BOTTOM - 0.3, -RADIUS - 0.4], max: [half + 1.0, RADIUS + 0.45, RADIUS + 0.4]}
    };
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

  // From eased pairs to beads, strands and grid cells. A bead's offset from
  // the axis scales with the pair's own growth, so a new pair opens out of
  // the axis; its column of the grid grows with it.
  function compose(ctx, want, out) {
    const s = ctx.state, hl = ctx.hl, seq = ctx.seq, comp = partner(ctx);
    const hov = ctx.hover && ctx.hover.startsWith("base:") ? Number(ctx.hover.slice(5)) : -1;
    const picked = seq[s.pos], pickRow = want.row.indexOf(1);
    const arrive = K.arrival(ctx, ENTRANCE.ms);
    const beads = [], segs = [], cells = [];
    let column = null;
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
      const isPick = i === s.pos, isHov = hov === i;
      const laneLit = hl === "base" && la === picked;
      const key = it.pick === undefined && g > 0.5 ? "base:" + i : undefined;

      // The strand the grid encodes is drawn full; its partner stands back.
      beads.push({
        c: e.a, r: BEAD * g * (isPick || isHov || laneLit ? 1.3 : 1), token: K.BASE_TOKEN[la],
        k: isPick ? LIT : (hl === "base" && !laneLit ? DIM : NORM), alpha: 1, pick: key
      });
      beads.push({c: e.b, r: BEAD * g * 0.8, token: K.BASE_TOKEN[lb], k: DIM, alpha: 0.6, pick: key});
      segs.push({a: e.a, b: e.b, r: RUNG * g, token: "--stage-mute", k: NORM, alpha: 0.5});
      if (q > 0) {
        const p = ends[q - 1], gg = Math.min(g, p.g);
        segs.push({a: p.a, b: e.a, r: BACKBONE * gg, token: "--stage-mute", k: NORM, alpha: 0.9});
        segs.push({a: p.b, b: e.b, r: BACKBONE * gg, token: "--stage-mute", k: DIM, alpha: 0.6});
      }

      // This base's column of the grid. During the entrance its 1 is still
      // on its way down from the bead, a few columns behind the wave's front.
      const fall = K.smooth(Math.max(0, Math.min(1, (arrive * (want.items.length + ENTRANCE.lag) - i) / ENTRANCE.lag)));
      const hot = GC.BASES.indexOf(la);
      for (let j = 0; j < 4; j++) {
        const home = [it.c[0], rowY(j), 0];
        const one = j === hot;
        const rowLit = hl === "base" && j === pickRow;
        cells.push({
          c: one ? lerp(e.a, home, fall) : home,
          s: [RISE * CELL * g, LY * CELL * g * (one ? 1 : fall), DEPTH * (one ? 1.6 : 1) * g],
          token: one ? K.BASE_TOKEN[la] : "--stage-mute",
          k: one ? (isPick ? LIT : (hl === "base" && !rowLit ? DIM : 1.05)) : (isPick || rowLit ? 0.45 : 0.16),
          alpha: one ? 1 : (isPick || rowLit ? 0.6 : 0.3), pick: key
        });
      }
      if (isPick) {
        // The line from the bead to its 1, and the frame round its column.
        segs.push({a: e.a, b: [it.c[0], rowY(hot) + LY * CELL / 2, 0], r: 0.022 * g, token: K.BASE_TOKEN[la], k: 1.2, alpha: 0.95});
        column = {min: [it.c[0] - RISE / 2, GRID_BOTTOM, -DEPTH], max: [it.c[0] + RISE / 2, GRID_TOP, DEPTH]};
      }
    });
    return {beads, segs, cells, column, labels: want.labels, bounds: K.withLabels(want.bounds, want.labels, 0.5)};
  }

  const frame = (ctx) => { const t = target(ctx); return K.withLabels(t.bounds, t.labels, 0.5); };

  const EN = {
    tab: "bases",
    k: "Section 01 · a sequence as a tensor",
    h: "A gene is a grid: 180 bases become 180 × 4 ones and zeros",
    predict: "Before you touch anything: suppose the bases were numbered instead, A = 1, C = 2, " +
             "G = 3, T = 4. Which base would the numbers say is most like A, and is that true " +
             "of the molecule?",
    concept: "One-hot encoding gives every base a row of four numbers with a single 1 in its " +
             "own column, so a sequence of L bases is an L × 4 tensor. The letters were " +
             "labels; the grid is what can be multiplied.",
    b: "Each base on the bright strand drops into the grid under it: one column for its " +
       "position, one row for its letter, and <b>a single 1 where they meet</b>. That is all " +
       "one-hot encoding is, and it is why every later picture on this page is a " +
       "multiplication. Pick a base with the slider, or click one, and follow the line down to " +
       "its 1. The helix draws the first few dozen bases; the ribbon under the stage is all " +
       "180. The fainter strand carries nothing new — it is the bright one's partner, base " +
       "for base, and two pictures on that pairing turns out to be a matrix.",
    eqcap: "X has one row for each position ℓ and one column for each base b. Every row sums to " +
           "exactly 1, because a base is exactly one letter. Point at a letter to light it.",
    claim: (n, letter, row) => "base " + n + " = " + letter + " → " + K.idx(row),
    bead: (n, letter) => "base " + n + " · " + letter,
    read: (n, letter, row, others, total) =>
      "<b>Base " + n + "</b> is <b>" + letter + "</b>: its row of the " + total + " × 4 grid is <b>" +
      K.idx(row) + "</b>. Its distance to " + others + " is the same, √2 ≈ 1.41 — one-hot puts no " +
      "base nearer to another. Numbered 1 to 4, T would sit three steps from A and C only one.",
    tip: (n, letter, row) => "base " + n + " · " + letter + " → " + K.idx(row),
    aria: (ctx) => {
      const s = ctx.state, l = ctx.seq[s.pos];
      return "A double helix of " + s.pairs + " base pairs over a grid of four rows, one per letter, " +
             "with one lit cell under each base. Base " + (s.pos + 1) + " is picked: it is " + l +
             ", and its one-hot row is " + K.idx(rowOf(l)) + ".";
    },
    controls: {pairs: "Base pairs drawn", pos: "Which base", play: "▶ Read along"},
    options: {},
    np: {
      seq: (L) => L + " bases over A C G T",
      shape: (L) => "(" + L + ", 4): one row per base",
      row: (n, l) => "base " + n + " is " + l,
      ones: (L) => L + " ones: exactly one per row"
    }
  };

  const ES = {
    tab: "bases",
    k: "Sección 01 · una secuencia como tensor",
    h: "Un gen es una rejilla: 180 bases se vuelven 180 × 4 unos y ceros",
    predict: "Antes de tocar nada: supón que las bases se numeraran, A = 1, C = 2, G = 3, " +
             "T = 4. ¿Qué base dirían los números que se parece más a A, y es eso cierto de " +
             "la molécula?",
    concept: "La codificación one-hot da a cada base una fila de cuatro números con un único 1 " +
             "en su propia columna, así que una secuencia de L bases es un tensor L × 4. Las " +
             "letras eran etiquetas; la rejilla es lo que se puede multiplicar.",
    b: "Cada base de la hebra brillante cae en la rejilla que tiene debajo: una columna para " +
       "su posición, una fila para su letra y <b>un único 1 donde se cruzan</b>. Eso es todo " +
       "lo que hace la codificación one-hot, y por eso cada imagen posterior de esta página " +
       "es una multiplicación. Elige una base con el deslizador, o haz clic en una, y sigue " +
       "la línea hasta su 1. La hélice dibuja las primeras decenas de bases; la cinta bajo el " +
       "escenario son las 180. La hebra más tenue no aporta nada nuevo: es la pareja de la " +
       "brillante, base por base, y dos imágenes más adelante ese emparejamiento resulta ser " +
       "una matriz.",
    eqcap: "X tiene una fila por cada posición ℓ y una columna por cada base b. Cada fila suma " +
           "exactamente 1, porque una base es exactamente una letra. Señala una letra para iluminarla.",
    claim: (n, letter, row) => "base " + n + " = " + letter + " → " + K.idx(row),
    bead: (n, letter) => "base " + n + " · " + letter,
    read: (n, letter, row, others, total) =>
      "<b>La base " + n + "</b> es <b>" + letter + "</b>: su fila de la rejilla de " + total +
      " × 4 es <b>" + K.idx(row) + "</b>. Su distancia a " + others + " es la misma, √2 ≈ 1,41: " +
      "one-hot no acerca ninguna base a otra. Numeradas del 1 al 4, T quedaría a tres pasos de A " +
      "y C a solo uno.",
    tip: (n, letter, row) => "base " + n + " · " + letter + " → " + K.idx(row),
    aria: (ctx) => {
      const s = ctx.state, l = ctx.seq[s.pos];
      return "Una doble hélice de " + s.pairs + " pares de bases sobre una rejilla de cuatro filas, " +
             "una por letra, con una celda iluminada bajo cada base. La base " + (s.pos + 1) +
             " está seleccionada: es " + l + " y su fila one-hot es " + K.idx(rowOf(l)) + ".";
    },
    controls: {pairs: "Pares de bases dibujados", pos: "Qué base", play: "▶ Leer a lo largo"},
    options: {},
    np: {
      seq: (L) => L + " bases sobre A C G T",
      shape: (L) => "(" + L + ", 4): una fila por base",
      row: (n, l) => "la base " + n + " es " + l,
      ones: (L) => L + " unos: exactamente uno por fila"
    }
  };

  window.GenomeScenes.register({
    id: "bases", section: "01", gl: true,
    part: {en: "A sequence is a one-hot tensor", es: "Una secuencia es un tensor one-hot"},
    hl: ["pos", "base"],
    copy: {en: EN, es: ES},

    // Nearly square-on, so the grid under the helix reads as a matrix; the
    // limits keep the helix a helix and not a ring.
    pose: {fov: 30, home: {az: -0.22, el: 0.1}, margin: 1.04,
           limits: {azMin: -0.9, azMax: 0.9, elMin: -0.3, elMax: 0.9, dollyMin: 0.5, dollyMax: 1.8}},

    controls: [
      {id: "pairs", type: "range", min: 12, max: MAX_PAIRS, step: 12, fmt: (v) => String(v)},
      {id: "pos", type: "range", min: 0, max: MAX_PAIRS - 1, step: 1, fmt: (v) => String(v + 1)},
      {id: "play", type: "play", target: "pos", rate: 6}
    ],

    init(ctx) {
      ctx.state.pairs = 24;
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

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) {
      return K.arrival(ctx, ENTRANCE.ms) < 1 || !!(ctx.cache.ease && ctx.cache.ease.moving);
    },
    bounds(ctx) { return frame(ctx); },

    pick(ctx, key) {
      if (key.startsWith("base:")) ctx.setControls({pos: Number(key.slice(5))});
    },
    tip(ctx, key) {
      if (!key.startsWith("base:")) return "";
      const i = Number(key.slice(5)), l = ctx.seq[i];
      return ctx.copy.tip(i + 1, l, rowOf(l));
    },
    // The ribbon: a press on the gene picks that base, if the helix draws it.
    seek(ctx, i) { ctx.setControls({pos: Math.min(i, ctx.state.pairs - 1)}); },

    build(ctx) {
      const THREE = ctx.THREE;
      const scene = new THREE.Scene();
      K.light(scene);
      const sph = K.spheres(2 * MAX_PAIRS);
      scene.add(sph.mesh, sph.hit);
      // A backbone link on each strand and a rung for every pair, and the
      // picked base's line down to its 1.
      const seg = K.segments(3 * MAX_PAIRS + 1);
      scene.add(seg.mesh);
      const vox = K.voxels(4 * MAX_PAIRS);
      scene.add(vox.mesh, vox.hit);
      const column = K.frameBox("--gn-hit", 0.95);
      scene.add(column);
      const beadKeys = [], cellKeys = [];
      return {
        scene, sph, seg, vox, column, beadKeys, cellKeys, labels: K.labelPool(scene), col: K.palette(),
        cam: new THREE.PerspectiveCamera(this.pose.fov, ctx.aspect, 0.1, 500),
        pick: [{mesh: sph.hit, key: (id) => beadKeys[id] || null},
               {mesh: vox.hit, key: (id) => cellKeys[id] || null}]
      };
    },

    render(ctx, gl) {
      const m = shown(ctx);
      gl.beadKeys.length = 0;
      m.beads.forEach((b, n) => {
        gl.sph.set(n, b.c, b.r, gl.col(b.token, b.k));
        gl.beadKeys[n] = b.pick || null;
      });
      gl.sph.count(m.beads.length);
      gl.sph.commit();
      m.segs.forEach((g, n) => gl.seg.set(n, g.a, g.b, g.r, gl.col(g.token, g.k)));
      gl.seg.count(m.segs.length);
      gl.seg.commit();
      gl.cellKeys.length = 0;
      m.cells.forEach((v, n) => {
        gl.vox.set(n, v.c, v.s, gl.col(v.token, v.k));
        gl.cellKeys[n] = v.pick || null;
      });
      gl.vox.count(m.cells.length);
      gl.vox.commit();
      gl.column.visible = !!m.column;
      if (m.column) K.setBox(gl.column, m.column.min, m.column.max);
      gl.labels.sync(m.labels);
    },

    // The twin: the same model, through the same orbit, fitted to the board.
    draw(ctx) {
      const m = shown(ctx), b = frame(ctx);
      const P = ctx.projector(K.corners(b.min, b.max), ctx.box());
      const B = ctx.basis();
      K.boxes2(ctx.svg, m.cells, B, P);
      if (m.column) K.edges2(ctx.svg, m.column.min, m.column.max, P, "--gn-hit");
      K.segments2(ctx.svg, m.segs, B, P);
      K.spheres2(ctx.svg, m.beads, B, P);
      K.labels2(ctx.svg, m.labels, P);
    },

    readout(ctx) {
      const s = ctx.state, c = ctx.copy;
      const letter = ctx.seq[s.pos], row = rowOf(letter), total = ctx.seq.length;
      const others = GC.BASES.split("").filter((l) => l !== letter);
      const list = others.slice(0, 2).join(", ") + (ctx.lang === "es" ? " y " : " and ") + others[2];
      return {
        html: c.read(s.pos + 1, letter, row, list, total),
        claim: c.claim(s.pos + 1, letter, row),
        lens: {a: 0, b: s.pairs, mark: s.pos},
        data: {
          pairs: String(s.pairs), pos: String(s.pos), base: letter, row: row.join(","),
          shape: total + ",4", length: String(total), ones: String(total),
          distance: GC.oneHotDistance(letter, others[0]).toFixed(3)
        }
      };
    },

    code(ctx) {
      const s = ctx.state, np = ctx.copy.np, total = ctx.seq.length;
      const letter = ctx.seq[s.pos], row = rowOf(letter);
      return K.code([
        ["X = one_hot(gene)", np.seq(total)],
        ["X.shape", np.shape(total)],
        ["X[" + s.pos + "]", K.idx(row) + ": " + np.row(s.pos + 1, letter)],
        ["X.sum(axis=1)", np.ones(total)]
      ]);
    }
  });
})();
