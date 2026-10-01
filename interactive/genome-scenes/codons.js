// Scene 4: the genetic code as a 4 x 4 x 4 table. Sixty-four separate small
// cubes with gaps between them, one per codon at (first base, second base,
// third base), tinted by the residue each codes for, so the reader sees into
// the table and the blocks of one colour -- the code's redundancy, running
// along the third base -- read as blocks. Outside the cube, along each axis,
// stands a one-hot vector for the gene's codon: four cells with their letters,
// the codon's base lit. From each lit cell a translucent slab marks the plane
// of 16 cells it selects, and the three planes meet in exactly one cell: the
// outer product of three one-hot vectors, made visible. That cell glows and
// carries the codon's name. "One codon" mode keeps only the planes' cells.
// The entrance sweeps the three planes in; the play control walks the gene's
// sixty codons so the lit cell hops round the table. This is also the page's
// embed still. Drawn in three.js, with an SVG twin from the same model.
// See genome-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const GC = window.GenomeCore, K = window.GenomeKit;

  const SHOWS = ["code", "codon"];
  const TAU = 0.16;                      // cells ease by piece; the planes chase on their own
  const SIDE = 0.58;                     // a cell's edge; the gap is what lets you see into the table
  const SYN = 0.7, LITSIDE = 0.92;       // a synonym stands a little proud; the picked cell is the largest
  const VEC = 0.56, VLIT = 0.72;         // a one-hot vector's cells
  const FAR = 2.4;                      // how far outside the cube the one-hot vectors stand
  const STOP = 20;
  const DIM = 0.35, NORM = 0.85, SYNK = 1.2, LIT = 1.7;
  const ENTRANCE = 1400;
  const PLANE_TOKEN = ["--gn-hit", "--gn-core", "--stage-ink"];   // first, second, third base

  // A colour per residue, from the kit, so the codon cube and the code slices
  // in #translate agree: the blocks of one colour a reader spots in one
  // picture have to be the same blocks in the other. K.residueTint carries
  // the contrast floor and the reason for it.
  const resToken = (idx) => (idx === STOP ? K.css("--gn-mask") : K.residueTint(idx));

  const letterOf = (idx) => (idx === STOP ? GC.STOP : GC.AAS[idx]);
  // x third base, y second (A on top), z first.
  const cellPos = (i, j, k) => [k - 1.5, 1.5 - j, i - 1.5];
  // A one-hot vector's cell q along axis a (0 first, 1 second, 2 third base).
  const vecPos = (a, q) => (a === 0 ? [FAR, FAR, q - 1.5] : a === 1 ? [-FAR, 1.5 - q, FAR] : [q - 1.5, -FAR, FAR]);
  // Where a plane of axis a stands, for a continuous index p along that axis.
  const slabAt = (a, p) => (a === 0 ? {c: [0, 0, p - 1.5], s: [4, 4, 1]}
    : a === 1 ? {c: [0, 1.5 - p, 0], s: [4, 1, 4]} : {c: [p - 1.5, 0, 0], s: [1, 4, 4]});
  // Where the arm from a vector's lit cell meets its plane: the plane's nearest corner.
  const armEnd = (a, p) => (a === 0 ? [2, 2, p - 1.5] : a === 1 ? [-2, 1.5 - p, 2] : [p - 1.5, -2, 2]);

  // The chosen codon: its letters, its cell, its residue.
  function chosen(ctx) {
    const codon = GC.codonAt(ctx.seq, ctx.state.n);
    const cell = [...codon].map((ch) => GC.baseIndex(ch));
    const idx = GC.CODE_T[cell[0]][cell[1]][cell[2]];
    return {codon, cell, idx, aa: letterOf(idx), nz: GC.nonZeros(GC.codonTensor(codon)),
            fixed: GC.pairFixed(cell[0], cell[1])};
  }

  // What the labels that never move are: the twelve letters on the three
  // one-hot vectors and one name per axis. Bounds come from these alone, so
  // the camera does not refit as the codon changes.
  function fixedLabels(ctx) {
    const c = ctx.copy, out = [];
    for (let a = 0; a < 3; a++) for (let q = 0; q < 4; q++) {
      const b = GC.BASES[q];
      out.push({text: b, pos: vecPos(a, q), cls: K.BASE_CLS[b], axis: a, q});
    }
    for (let a = 0; a < 3; a++) out.push({text: c.ax[a], pos: nameSpots(a)[0], cls: "mute", name: a});
    return out;
  }

  // Where an axis's name may stand: past either end of its vector, or off to
  // its outer side. The first is where it stands at the home view; the others
  // are what a turn of the cube falls back on when that one would run over a
  // letter.
  const AXIS = [[0, 0, 1], [0, -1, 0], [1, 0, 0]];
  const OUT = [[1, 1, 0], [-1, 0, 1], [0, -1, 1]];
  function nameSpots(a, B) {
    const first = vecPos(a, 0), last = vecPos(a, 3), d = AXIS[a], o = OUT[a];
    const at = (p, k, v) => [p[0] + v[0] * k, p[1] + v[1] * k, p[2] + v[2] * k];
    const home = a === 0 ? at(last, 1.5, d) : a === 1 ? at(vecPos(a, 1), 1.35, o) : at(first, 1.9, [-1, 0, 0]);
    const spots = [home, at(last, 1.0, d), at(first, -1.0, d), at(vecPos(a, 1.5), 1.2, o), at(vecPos(a, 1.5), 0.8, o)];
    // Beside the vector, to either side of it on screen.
    if (B) {
      for (const k of [-0.95, 0.95]) spots.push(at(vecPos(a, 1.5), k, B.up));
      for (const k of [1.5, -1.5, 2.0, -2.0]) spots.push(at(vecPos(a, 1.5), k, B.right));
    }
    return spots;
  }

  const BOUNDS = {min: [-2.75, -2.75, -2.1], max: [2.75, 2.75, 2.75]};
  const frame = (ctx) => K.withLabels(BOUNDS, fixedLabels(ctx), 0.2);

  // How far the entrance has got to lighting the cell: its last third.
  function glow(ctx) { return K.smooth(Math.max(0, Math.min(1, (K.arrival(ctx, ENTRANCE) - 0.62) / 0.38))); }

  // Everything both surfaces draw for the current controls, before easing.
  function target(ctx) {
    const s = ctx.state, hl = ctx.hl, ch = chosen(ctx);
    const only = s.show === "codon";
    const hov = ctx.hover && ctx.hover.startsWith("v:") ? ctx.hover : null;
    const g = glow(ctx);
    const items = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) {
      const idx = GC.CODE_T[i][j][k];
      const lit = i === ch.cell[0] && j === ch.cell[1] && k === ch.cell[2];
      const key = "v:" + i + "," + j + "," + k;
      const syn = idx === ch.idx && !lit;
      const inPlane = i === ch.cell[0] || j === ch.cell[1] || k === ch.cell[2];
      // The picked cell sits somewhere inside the table, behind others. Cells
      // on the two short lines from it to the viewer -- toward the front, and
      // up to its name -- step back so it can be found from any angle the
      // orbit allows, unless they are the picked residue's own.
      const sight = !lit && !syn && ((j === ch.cell[1] && k === ch.cell[2])
        || (i === ch.cell[0] && k === ch.cell[2] && j < ch.cell[1] && j >= ch.cell[1] - 1));
      let size, bright, alpha;
      if (lit) {
        size = SIDE + (LITSIDE * (hl === "codon" ? 1.1 : 1) - SIDE) * g;
        bright = SYNK + (LIT - SYNK) * g; alpha = 1;
      } else if (only) { size = inPlane ? 0.34 : 0; bright = 0.9; alpha = 0.55; }
      else if (hl === "aa") { size = syn ? SYN : SIDE; bright = syn ? SYNK : DIM; alpha = syn ? 1 : 0.4; }
      else {
        size = sight ? 0.3 : (syn || hov === key) ? SYN : SIDE;
        bright = syn ? SYNK : NORM; alpha = sight ? 0.55 : syn ? 1 : 0.62;
      }
      items.push({key, cell: [i, j, k], c: cellPos(i, j, k), s: size,
                  token: resToken(idx), k: bright, alpha,
                  pick: only && !inPlane ? undefined : key});
    }
    // The three one-hot vectors: four cells each, the codon's base lit.
    for (let a = 0; a < 3; a++) for (let q = 0; q < 4; q++) {
      const on = q === ch.cell[a];
      items.push({key: "h:" + a + q, vec: true, c: vecPos(a, q), s: on ? VLIT : VEC * 0.8,
                  token: K.BASE_TOKEN[GC.BASES[q]], k: on ? (hl === "base" ? LIT : 1.25) : 0.4,
                  alpha: on ? 1 : 0.75, a, q, on});
    }
    const labels = fixedLabels(ctx).map((L) => (L.axis === undefined ? L
      : Object.assign({}, L, {lit: L.q === ch.cell[L.axis]})));
    return {items, labels, ch, here: cellPos(...ch.cell), g, only};
  }

  // Where the names stand. A chip is a flat thing, and the cube turns, so a
  // fixed place runs over a one-hot letter at some angle or for some codon.
  // Instead each name has a few places, and the one that covers least of the
  // letters, of the names already placed and of the picked cell is taken,
  // measured through the same view the picture is drawn in. The place a name
  // had last time wins a tie, so nothing hops about while the reader turns
  // the cube. The picked cell's own name tries a few spots around the cell.
  const OFFSETS = [[0, 0.85], [1.1, 0.75], [-1.1, 0.75], [0, -0.85], [1.25, -0.65], [-1.25, -0.65],
                   [1.7, 0.1], [-1.7, 0.1], [0, 1.3], [1.4, 1.2], [-1.4, 1.2]];
  function place(ctx, labels, here) {
    const B = ctx.basis(), cache = ctx.cache;
    // Through the view, with the camera's own perspective: it sits about this
    // far back for a bounds box this size, and near things stand out from the
    // middle of the picture by that much.
    const EYE = 11.5;
    const at = (p) => {
      const d = [p[0] - B.target[0], p[1] - B.target[1], p[2] - B.target[2]];
      const z = d[0] * B.fwd[0] + d[1] * B.fwd[1] + d[2] * B.fwd[2];
      const f = EYE / Math.max(1, EYE - z);
      return [f * (d[0] * B.right[0] + d[1] * B.right[1] + d[2] * B.right[2]),
              f * (d[0] * B.up[0] + d[1] * B.up[1] + d[2] * B.up[2])];
    };
    const half = (text) => (text.length === 1 ? 0.4 : 0.12 * text.length + 0.4);
    const c0 = at(here);
    const placed = labels.filter((L) => L.name === undefined).map((L) => ({c: at(L.pos), w: half(L.text), h: 0.42}));
    placed.push({c: c0, w: 0.5, h: 0.5});
    const overlap = (c, w, h) => {
      let sum = 0;
      for (const q of placed) {
        const dx = Math.min(c[0] + w, q.c[0] + q.w) - Math.max(c[0] - w, q.c[0] - q.w);
        const dy = Math.min(c[1] + h, q.c[1] + q.h) - Math.max(c[1] - h, q.c[1] - q.h);
        if (dx > 0 && dy > 0) sum += dx * dy;
      }
      return sum;
    };
    // The table itself, as the box its corners project to: a name is not
    // written across it (the picked cell's own name has to be).
    const hull = K.corners([-2, -2, -2], [2, 2, 2]).map(at);
    const lo = [Math.min(...hull.map((q) => q[0])), Math.min(...hull.map((q) => q[1]))];
    const hi = [Math.max(...hull.map((q) => q[0])), Math.max(...hull.map((q) => q[1]))];
    const onTable = (c, w, h) => {
      const dx = Math.min(c[0] + w, hi[0]) - Math.max(c[0] - w, lo[0]);
      const dy = Math.min(c[1] + h, hi[1]) - Math.max(c[1] - h, lo[1]);
      return dx > 0 && dy > 0 ? dx * dy : 0;
    };
    const choose = (key, text, spots, avoidTable) => {
      const w = half(text), h = 0.42;
      const sc = spots.map((p) => overlap(at(p), w, h) + (avoidTable ? 0.3 * onTable(at(p), w, h) : 0));
      cache.spot = cache.spot || {};
      const prev = cache.spot[key];
      let best = 0;
      if (prev !== undefined && prev < spots.length && sc[prev] < 1e-6) best = prev;
      else sc.forEach((v, n) => { if (v < sc[best] - 1e-9) best = n; });
      cache.spot[key] = best;
      placed.push({c: at(spots[best]), w, h});
      return spots[best];
    };
    const out = labels.map((L) => (L.name === undefined ? L
      : Object.assign({}, L, {pos: choose("n" + L.name, L.text, nameSpots(L.name, B), true)})));
    const cellSpots = OFFSETS.map((o) => [0, 1, 2].map((q) => here[q] + B.right[q] * o[0] + B.up[q] * o[1]));
    return {labels: out, top: choose("cell", "ATG → M", cellSpots)};
  }

  // Cells and vector cells go through K.follow by identity; the planes chase
  // the codon's indices as plain numbers, and sweep in from the A side on the
  // entrance. Memoised per frame, because bounds(), render() and draw() all ask.
  function shown(ctx) {
    const c = ctx.cache, t = ctx.now();
    const key = JSON.stringify(ctx.state) + "|" + ctx.hl + "|" + ctx.hover;
    if (c.memo && c.memo.key === key && t - c.memo.t < 4) return c.memo.m;
    const want = target(ctx), ch = want.ch;
    c.ease = c.ease || {};
    const out = K.follow(c.ease, want.items, t, TAU, ctx.instant);
    const cells = out.filter((it) => !it.vec), vecs = out.filter((it) => it.vec);
    const arr = K.arrival(ctx, ENTRANCE);
    const slabs = [0, 1, 2].map((a) => {
      const p = K.chase(c, "p" + a, ch.cell[a], t, 0.1, ctx.instant);
      const w = K.smooth(Math.max(0, Math.min(1, (arr - a * 0.1) / 0.6)));
      const q = -1.4 + (p + 1.4) * w;
      const geo = slabAt(a, q);
      const base = want.only ? 0.17 : 0.1;
      return {a, token: PLANE_TOKEN[a], c: geo.c, s: geo.s, alpha: (ctx.hl === "base" ? 0.24 : base) * w, w, p,
              min: geo.c.map((v, n) => v - geo.s[n] / 2), max: geo.c.map((v, n) => v + geo.s[n] / 2)};
    });
    const lit = cells.find((it) => it.key === "v:" + ch.cell.join(","));
    // An arm from each lit vector cell to its plane, growing with the sweep.
    const segs = slabs.map((sl) => {
      const from = vecPos(sl.a, sl.p), to = armEnd(sl.a, sl.p);
      return {a: from, b: [0, 1, 2].map((n) => from[n] + (to[n] - from[n]) * sl.w),
              r: 0.03, token: sl.token, k: 1.1, alpha: 0.9};
    });
    const placed = place(ctx, want.labels, want.here);
    const top = placed.top;
    const labels = placed.labels.slice();
    if (want.g > 0.5) {
      labels.push({text: ch.codon + " → " + (ch.idx === STOP ? ctx.copy.stop : ch.aa), pos: top, cls: "aa", lit: true, size: 13});
    }
    const box = (it, pad) => ({min: it.c.map((v, n) => v - it.s[n] / 2 - pad), max: it.c.map((v, n) => v + it.s[n] / 2 + pad)});
    const m = {cells, vecs, slabs, segs, labels, lit, ch, only: want.only,
               cellBox: lit ? box(lit, 0.04) : null,
               vecBoxes: vecs.filter((v) => v.on).map((v) => Object.assign({a: v.a}, box(v, 0.05)))};
    c.memo = {key, t, m};
    return m;
  }

  const EN = {
    tab: "codons",
    k: "Section 04 · the genetic code",
    h: "The genetic code is a 4 × 4 × 4 table: 64 cells for 21 outcomes",
    predict: "Before you turn the cube: there are 16 pairs of first and second base. For how many " +
             "of them does the third base not matter at all?",
    concept: "A codon is three bases, so the table that turns codons into residues has three " +
             "indices, one per base: a 4 × 4 × 4 tensor with a residue in each of its 64 cells. " +
             "One codon is one cell, the product of three one-hot vectors: a 4 × 4 × 4 holding a single 1.",
    b: "Each small cube is one of the 64 codons, tinted by the residue it codes for, so a " +
       "block of one colour is the code's redundancy. Beside each axis stands a one-hot vector " +
       "for the gene's codon. Its lit letter selects a plane of 16 cells, and <b>the three " +
       "planes meet in exactly one cell</b>. Choose <b>one codon</b> to keep only those cells. " +
       "▶ reads the gene's 60 codons in turn, and the lit cell hops round the table. " +
       "Drag to turn the cube; click a cell to jump to that codon.",
    eqcap: "K is the outer product of three one-hot vectors, one for each base of the codon: a, b " +
           "and c index the cube's three axes. Everything is zero except the one cell they name.",
    stop: "stop",
    ax: ["1st base", "2nd base", "3rd base"],
    claim: (n, codon, aa, nz) => "codon " + n + " = " + codon + " → " + aa + " · " +
      (nz === 1 ? "a single 1" : nz + " ones") + " among 64",
    caption: (n, total) => "codon " + n + " of " + total + " · bases " + (3 * n - 2) + "–" + (3 * n),
    read: (n, codon, aa, syn, code, boxes, fixed) =>
      "<b>" + boxes + " of the 16</b> pairs of first and second base fix the residue whatever the " +
      "third base is: those are the rows of four cubes of one colour. Codon " + n + " is <b>" + codon +
      "</b>, which codes for <b>" + aa + "</b>; its first two bases " +
      (fixed ? "are one of those pairs, so the third base could be anything" : "are not, so its third base matters") +
      ". The table spends " + syn + (syn === 1 ? " cell" : " cells") + " on " + aa +
      (code ? ", and they are all the cubes of its colour." : ". Switch to the whole code to see them."),
    tip: (codon, aa) => codon + " → " + aa,
    aria: (ctx) => {
      const ch = chosen(ctx);
      const aa = ch.idx === STOP ? "a stop" : ch.aa;
      return "The genetic code as a 4 by 4 by 4 table of 64 small cubes, with a one-hot vector beside each axis. " +
             (ctx.state.show === "code" ? "Each cube is tinted by the residue it codes for. " : "Only the three selected planes and the one chosen cell are shown. ") +
             "Codon " + (ctx.state.n + 1) + " of the gene is " + ch.codon + ", which codes for " + aa + ".";
    },
    controls: {n: "Which codon of the gene", show: "Show", play: "▶ Read the gene"},
    options: {show: {code: "the whole code, by residue", codon: "one codon: three planes, one cell"}},
    np: {
      uvw: (codon) => "one-hot " + [...codon].join(", "),
      one: (nz) => nz + ": a single 1 in 64 cells",
      shape: "a residue per cell",
      cell: (aa) => aa + ": the residue of this cell",
      group: (n) => "codon " + n + ": bases " + (3 * n - 2) + "–" + (3 * n),
      fixed: (b) => b + " of 16 pairs ignore the 3rd base"
    }
  };

  const ES = {
    tab: "codones",
    k: "Sección 04 · el código genético",
    h: "El código genético es una tabla de 4 × 4 × 4: 64 celdas para 21 resultados",
    predict: "Antes de girar el cubo: hay 16 pares de primera y segunda base. ¿En cuántos de ellos " +
             "la tercera base no importa en absoluto?",
    concept: "Un codón son tres bases, así que la tabla que convierte codones en residuos tiene tres " +
             "índices, uno por base: un tensor de 4 × 4 × 4 con un residuo en cada una de sus 64 celdas. " +
             "Un codón es una celda, el producto de tres vectores one-hot: un 4 × 4 × 4 con un solo 1.",
    b: "Cada cubito es uno de los 64 codones, teñido según el residuo que codifica, así que un " +
       "bloque de un color es la redundancia del código. Junto a cada eje hay un vector one-hot " +
       "del codón del gen. Su letra encendida elige un plano de 16 celdas, y <b>los tres planos " +
       "se cruzan en una sola celda</b>. Elige <b>un codón</b> para quedarte solo con esas celdas. " +
       "▶ recorre los 60 codones del gen y la celda encendida salta por la tabla. " +
       "Arrastra para girar el cubo; haz clic en una celda para ir a ese codón.",
    eqcap: "K es el producto exterior de tres vectores one-hot, uno por cada base del codón: a, b " +
           "y c indexan los tres ejes del cubo. Todo es cero salvo la celda que nombran.",
    stop: "alto",
    ax: ["1.ª base", "2.ª base", "3.ª base"],
    claim: (n, codon, aa, nz) => "codón " + n + " = " + codon + " → " + aa + " · " +
      (nz === 1 ? "un solo 1" : nz + " unos") + " entre 64",
    caption: (n, total) => "codón " + n + " de " + total + " · bases " + (3 * n - 2) + "–" + (3 * n),
    read: (n, codon, aa, syn, code, boxes, fixed) =>
      "<b>" + boxes + " de los 16</b> pares de primera y segunda base fijan el residuo sea cual sea " +
      "la tercera: son las filas de cuatro cubos de un mismo color. El codón " + n + " es <b>" + codon +
      "</b>, que codifica <b>" + aa + "</b>; sus dos primeras bases " +
      (fixed ? "son uno de esos pares, así que la tercera podría ser cualquiera" : "no lo son, así que su tercera base sí importa") +
      ". La tabla gasta " + syn + (syn === 1 ? " celda" : " celdas") + " en " + aa +
      (code ? ", y son todos los cubos de su color." : ". Cambia al código entero para verlas."),
    tip: (codon, aa) => codon + " → " + aa,
    aria: (ctx) => {
      const ch = chosen(ctx);
      const aa = ch.idx === STOP ? "un alto" : ch.aa;
      return "El código genético como una tabla de 4 por 4 por 4 con 64 cubitos y un vector one-hot junto a cada eje. " +
             (ctx.state.show === "code" ? "Cada cubito está teñido según el residuo que codifica. " : "Solo se ven los tres planos elegidos y la celda del codón. ") +
             "El codón " + (ctx.state.n + 1) + " del gen es " + ch.codon + ", que codifica " + aa + ".";
    },
    controls: {n: "Qué codón del gen", show: "Mostrar", play: "▶ Leer el gen"},
    options: {show: {code: "el código entero, por residuo", codon: "un codón: tres planos, una celda"}},
    np: {
      uvw: (codon) => "one-hot " + [...codon].join(", "),
      one: (nz) => nz + ": un solo 1 en 64 celdas",
      shape: "un residuo por celda",
      cell: (aa) => aa + ": el residuo de esta celda",
      group: (n) => "codón " + n + ": bases " + (3 * n - 2) + "–" + (3 * n),
      fixed: (b) => b + " de 16 pares ignoran la 3.ª base"
    }
  };

  window.GenomeScenes.register({
    id: "codons", section: "04", gl: true,
    part: {en: "Translation is a contraction", es: "La traducción es una contracción"},
    hl: ["codon", "base", "aa"],
    copy: {en: EN, es: ES},

    pose: {fov: 30, home: {az: -0.62, el: 0.28}, margin: 1.0,
           limits: {azMin: -0.95, azMax: -0.35, elMin: 0.2, elMax: 0.5, dollyMin: 0.5, dollyMax: 1.8}},

    controls: [
      {id: "n", type: "range", min: 0, max: GC.codonCount(GC.CDS) - 1, step: 1,
       fmt: (v, ctx) => (v + 1) + " · " + GC.codonAt(ctx.seq, v)},
      {id: "show", type: "select", options: SHOWS},
      {id: "play", type: "play", target: "n", rate: 4}
    ],

    init(ctx) {
      ctx.state.n = 0;
      // The hero's still is the flat twin at a small size, where 64 stacked
      // translucent cells are mud; it opens on the one-codon view, which is
      // also exactly what its caption says.
      ctx.state.show = ctx.embed ? "codon" : "code";
    },

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) {
      const c = ctx.cache;
      return K.arrival(ctx, ENTRANCE) < 1 || !!(c.ease && c.ease.moving)
        || !!(c.p0 && c.p0.moving) || !!(c.p1 && c.p1.moving) || !!(c.p2 && c.p2.moving);
    },
    bounds(ctx) { return frame(ctx); },

    pick(ctx, key) {
      if (!key.startsWith("v:")) return;
      const [i, j, k] = key.slice(2).split(",").map(Number);
      const codon = GC.BASES[i] + GC.BASES[j] + GC.BASES[k];
      for (let n = 0; n < GC.codonCount(ctx.seq); n++) {
        if (GC.codonAt(ctx.seq, n) === codon) { ctx.setControls({n}); return; }
      }
    },
    tip(ctx, key) {
      if (!key.startsWith("v:")) return "";
      const [i, j, k] = key.slice(2).split(",").map(Number);
      const idx = GC.CODE_T[i][j][k];
      return ctx.copy.tip(GC.BASES[i] + GC.BASES[j] + GC.BASES[k], idx === STOP ? ctx.copy.stop : letterOf(idx));
    },
    // The ribbon: a press on the gene lands in that base's codon.
    seek(ctx, i) { ctx.setControls({n: Math.max(0, Math.min(GC.codonCount(ctx.seq) - 1, Math.floor(i / 3)))}); },

    build(ctx) {
      const THREE = ctx.THREE;
      const scene = new THREE.Scene();
      K.light(scene);
      const vox = K.voxels(64);
      scene.add(vox.mesh, vox.hit);
      const vec = K.voxels(12);
      scene.add(vec.mesh);
      const seg = K.segments(4);
      scene.add(seg.mesh);
      // The planes: translucent slabs, drawn after the cells and never into
      // the depth buffer, so the cells show through them.
      const slabs = PLANE_TOKEN.map(() => {
        const mat = new THREE.MeshBasicMaterial({transparent: true, opacity: 0.1, depthWrite: false});
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
        mesh.frustumCulled = false;
        scene.add(mesh);
        return mesh;
      });
      const slabEdges = PLANE_TOKEN.map((t) => K.frameBox(t, 0.8));
      const vecEdges = PLANE_TOKEN.map((t) => K.frameBox(t, 1));
      const cellBox = K.frameBox("--gn-hit", 1);
      // The picked cell again, drawn over whatever stands in front of it: the
      // table is dense, and the cell is what the three planes are about.
      const glow = K.glowBox("--gn-core", 0.7);
      glow.material.transparent = true; glow.material.opacity = 0.92; glow.material.depthTest = false;
      glow.renderOrder = 10; glow.frustumCulled = false;
      scene.add(glow);
      scene.add(...slabEdges, ...vecEdges, cellBox);
      const keys = [];
      return {
        scene, vox, vec, seg, glow, slabs, slabEdges, vecEdges, cellBox, keys, labels: K.labelPool(scene), col: K.palette(),
        cam: new THREE.PerspectiveCamera(this.pose.fov, ctx.aspect, 0.1, 500),
        pick: [{mesh: vox.hit, key: (id) => keys[id] || null}]
      };
    },

    render(ctx, gl) {
      const m = shown(ctx);
      gl.keys.length = 0;
      m.cells.forEach((it, n) => {
        gl.vox.set(n, it.c, it.s, gl.col(it.token, it.k));
        gl.keys[n] = it.pick || null;
      });
      gl.vox.commit();
      m.vecs.forEach((it, n) => gl.vec.set(n, it.c, it.s, gl.col(it.token, it.k)));
      gl.vec.commit();
      m.segs.forEach((g, n) => gl.seg.set(n, g.a, g.b, g.r, gl.col(g.token, g.k)));
      gl.seg.count(m.segs.length);
      gl.seg.commit();
      m.slabs.forEach((sl, a) => {
        const mesh = gl.slabs[a];
        mesh.position.set(sl.c[0], sl.c[1], sl.c[2]);
        mesh.scale.set(sl.s[0], sl.s[1], sl.s[2]);
        mesh.material.color.copy(gl.col(sl.token, 1));
        mesh.material.opacity = sl.alpha;
        mesh.visible = sl.alpha > 0.002;
        gl.slabEdges[a].visible = sl.w > 0.01;
        K.setBox(gl.slabEdges[a], sl.min, sl.max);
      });
      gl.vecEdges.forEach((e, a) => {
        const b = m.vecBoxes.find((v) => v.a === a);
        e.visible = !!b;
        if (b) K.setBox(e, b.min, b.max);
      });
      gl.glow.visible = !!m.lit;
      if (m.lit) {
        const c = gl.col(m.lit.token, 1.0);
        gl.glow.material.color.copy(c);
        gl.glow.material.emissive.copy(c);
        gl.glow.position.set(m.lit.c[0], m.lit.c[1], m.lit.c[2]);
        gl.glow.scale.setScalar(Math.max(1e-3, m.lit.s[0] * 0.8));
      }
      gl.cellBox.visible = !!m.cellBox;
      if (m.cellBox) K.setBox(gl.cellBox, m.cellBox.min, m.cellBox.max);
      gl.labels.sync(m.labels);
    },

    // The twin: the same model, through the same orbit, fitted to the board.
    // It is also what the hero embed shows.
    draw(ctx) {
      const m = shown(ctx), b = frame(ctx);
      const P = ctx.projector(K.corners(b.min, b.max), ctx.box());
      const B = ctx.basis();
      // Opaque enough to stand as cubes: stacked half-transparent faces are mud.
      K.boxes2(ctx.svg, m.cells.filter((it) => it !== m.lit).map((it) => Object.assign({}, it, {alpha: 0.5 + 0.5 * it.alpha})), B, P);
      K.boxes2(ctx.svg, m.vecs, B, P);
      K.segments2(ctx.svg, m.segs, B, P);
      m.slabs.forEach((sl) => {
        if (sl.alpha > 0.002) K.boxes2(ctx.svg, [{c: sl.c, s: sl.s, token: sl.token, alpha: sl.alpha * 1.4}], B, P);
        if (sl.w > 0.01) K.edges2(ctx.svg, sl.min, sl.max, P, sl.token, {opacity: 0.8, width: 1.1});
      });
      if (m.lit) K.boxes2(ctx.svg, [Object.assign({}, m.lit, {stroke: "--stage-ink"})], B, P);
      m.vecBoxes.forEach((v) => K.edges2(ctx.svg, v.min, v.max, P, PLANE_TOKEN[v.a], {width: 1.6}));
      if (m.cellBox) K.edges2(ctx.svg, m.cellBox.min, m.cellBox.max, P, "--gn-hit", {width: 1.8});
      K.labels2(ctx.svg, m.labels, P);
    },

    readout(ctx) {
      const s = ctx.state, c = ctx.copy, ch = chosen(ctx);
      const aa = ch.idx === STOP ? c.stop : ch.aa, syn = GC.synonymCount(ch.idx);
      const total = GC.codonCount(ctx.seq), boxes = GC.fixedBoxes();
      return {
        html: c.read(s.n + 1, ch.codon, aa, syn, s.show === "code", boxes, ch.fixed),
        claim: c.claim(s.n + 1, ch.codon, aa, ch.nz),
        caption: c.caption(s.n + 1, total),
        lens: {a: 3 * s.n, b: 3 * s.n + 3},
        data: {
          n: String(s.n), show: s.show, codon: ch.codon, aa: ch.aa, aaindex: String(ch.idx),
          cell: ch.cell.join(","), nonzeros: String(ch.nz), synonyms: String(syn), shape: "4,4,4",
          boxes: String(boxes)
        }
      };
    },

    code(ctx) {
      const np = ctx.copy.np, ch = chosen(ctx), n = ctx.state.n + 1;
      return K.code([
        ["X.reshape(-1, 3, 4)[" + ctx.state.n + "]", np.group(n)],
        ['K = np.einsum("a,b,c->abc", u, v, w)', np.uvw(ch.codon)],
        ["K.sum()", np.one(ch.nz)],
        ["CODE.shape", "(4, 4, 4): " + np.shape],
        ["CODE[" + ch.cell.join(", ") + "]", np.cell(ch.aa)],
        ["(CODE == CODE[..., :1]).all(-1).sum()", np.fixed(GC.fixedBoxes())]
      ]);
    }
  });
})();
