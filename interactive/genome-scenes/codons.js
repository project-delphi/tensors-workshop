// Scene 4: the genetic code as a 4 x 4 x 4 cube. One box per codon, at
// (first base, second base, third base) on the ACGT axes, each coloured by the
// residue it codes for, so the redundancy of the code is a thing you can see:
// blocks of one colour, most of them running along the third base. The chosen
// codon of the gene is lit, and "codon" mode shows only that cell -- the
// rank-one tensor a single codon is. This is also the page's embed still.
// Drawn in three.js, with an SVG twin from the same model.
// See genome-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const GC = window.GenomeCore, K = window.GenomeKit;

  const SHOWS = ["code", "codon"];
  const TAU = 0.2;
  const SIDE = 0.9;                      // a cell's edge; the gap is what makes it a grid of boxes
  const STOP = 20;
  const DIM = 0.35, NORM = 0.85, LIT = 1.6;

  // A colour per residue, from the kit, so the codon cube and the code slices
  // in #translate agree: the blocks of one colour a reader spots in one
  // picture have to be the same blocks in the other. K.residueTint carries
  // the contrast floor and the reason for it.
  const resToken = (idx) => (idx === STOP ? K.css("--gn-mask") : K.residueTint(idx));

  const letterOf = (idx) => (idx === STOP ? GC.STOP : GC.AAS[idx]);
  const cellPos = (i, j, k) => [k - 1.5, 1.5 - j, i - 1.5];   // x third, y second (A on top), z first

  // How many codons the table spends on one residue -- what the blocks of
  // colour add up to. It is on the claim card, so it lives in the core where
  // the test pins it, not in two scenes counting the same table twice.
  const synonyms = (idx) => GC.synonymCount(idx);

  // The chosen codon: its letters, its cell, its residue.
  function chosen(ctx) {
    const codon = GC.codonAt(ctx.seq, ctx.state.n);
    const cell = [...codon].map((ch) => GC.baseIndex(ch));
    const idx = GC.CODE_T[cell[0]][cell[1]][cell[2]];
    return {codon, cell, idx, aa: letterOf(idx), nz: GC.nonZeros(GC.codonTensor(codon))};
  }

  function target(ctx) {
    const s = ctx.state, hl = ctx.hl, ch = chosen(ctx);
    const only = s.show === "codon";
    const hov = ctx.hover && ctx.hover.startsWith("v:") ? ctx.hover : null;
    const items = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) {
      const idx = GC.CODE_T[i][j][k];
      const lit = i === ch.cell[0] && j === ch.cell[1] && k === ch.cell[2];
      const key = "v:" + i + "," + j + "," + k;
      // "aa" lights every cell that codes for the chosen residue: the block.
      const kin = hl === "aa" && idx === ch.idx;
      const back = hl === "aa" && !kin;
      // The lit cell is wherever the gene's codon puts it, which for ATG is
      // the back of the cube, behind three others. Nothing reports that: the
      // claim card goes on naming a cell the reader cannot find. So the rest
      // of its own first-base column shrinks to a ghost, which opens a line
      // of sight to it from any angle the orbit allows -- and says something
      // true while doing it, since those three are the same second and third
      // base with a different first.
      const column = !only && !lit
        && j === ch.cell[1] && k === ch.cell[2];
      items.push({
        key, cell: [i, j, k], c: cellPos(i, j, k),
        s: only ? (lit ? SIDE : 0)
          : lit ? (hl === "codon" ? 1.08 : 1)
          : column ? 0.42 : (hov === key ? 1 : SIDE),
        token: resToken(idx),
        k: lit ? LIT : (kin ? 1.25 : (back ? DIM : NORM)),
        alpha: lit ? 1 : column ? 0.5 : (back ? 0.4 : 0.92),
        pick: only && !lit ? undefined : key
      });
    }
    const here = cellPos(...ch.cell);
    const c = ctx.copy;
    const labels = [];
    // Three edges, each ticked with the base itself in its own colour, and
    // each named beside its ticks rather than above or below them: the
    // stage is twice as wide as it is tall, so the names go out to the sides.
    [...GC.BASES].forEach((b, q) => {
      labels.push({text: b, pos: [q - 1.5, -2.45, 2.1], cls: K.BASE_CLS[b], lit: q === ch.cell[2]});
      labels.push({text: b, pos: [-2.6, 1.5 - q, 2.1], cls: K.BASE_CLS[b], lit: q === ch.cell[1]});
      labels.push({text: b, pos: [2.6, -2.45, q - 1.5], cls: K.BASE_CLS[b], lit: q === ch.cell[0]});
    });
    labels.push({text: c.ax3, pos: [-3.7, -2.45, 2.1], cls: "mute", lit: hl === "base"});
    labels.push({text: c.ax2, pos: [-3.1, 2.5, 2.1], cls: "mute", lit: hl === "base"});
    labels.push({text: c.ax1, pos: [3.9, -2.45, 0], cls: "mute", lit: hl === "base"});
    labels.push({text: ch.codon + " → " + (ch.idx === STOP ? c.stop : ch.aa), pos: [here[0], 2.6, here[2]],
                 cls: "aa", lit: true, size: 13});
    // The three one-hot vectors, as the rods through the chosen cell: what
    // the cell is the product of.
    const rod = (axis) => {
      const min = here.map((v) => v - 0.5), max = here.map((v) => v + 0.5);
      min[axis] = -2; max[axis] = 2;
      return {min, max};
    };
    const rods = [0, 1, 2].map(rod);
    return {
      items, labels, rods, ch, here, showRods: only || hl === "base",
      cell: {min: here.map((v) => v - 0.56), max: here.map((v) => v + 0.56)},
      bounds: {min: [-2.6, -2.5, -2.3], max: [2.6, 2.5, 2.3]}
    };
  }

  // Cells go through K.follow by identity: a cell that switches off shrinks
  // where it stands, and one that switches on grows there. Memoised per
  // frame, because bounds(), render() and draw() all ask.
  function shown(ctx) {
    const c = ctx.cache, t = ctx.now();
    const key = JSON.stringify(ctx.state) + "|" + ctx.hl + "|" + ctx.hover;
    if (c.memo && c.memo.key === key && t - c.memo.t < 4) return c.memo.m;
    const want = target(ctx);
    c.ease = c.ease || {};
    const items = K.follow(c.ease, want.items, t, TAU, ctx.instant);
    const m = Object.assign({}, want, {items});
    c.memo = {key, t, m};
    return m;
  }

  const frame = (ctx) => { const t = target(ctx); return K.withLabels(t.bounds, t.labels, 0.45); };
  const hull = {min: [-2, -2, -2], max: [2, 2, 2]};

  const EN = {
    tab: "codons",
    k: "Section 04 · the genetic code",
    h: "The genetic code is a 4 × 4 × 4 cube, and its blocks of one colour are redundancy",
    concept: "A codon is three bases, so it has three indices, and the table that turns codons " +
             "into residues is a tensor of order 3 with one axis per base. A single codon is the " +
             "simplest tensor that still needs all three: one 1 among 64 cells.",
    predict: "Before you switch the view: 64 codons code for 20 residues and a stop. Will the " +
             "colours land in 64 scattered cells, or in blocks, and which base will the blocks run along?",
    b: "Each box is one of the 64 codons, at (first base, second base, third base), coloured by the " +
       "residue it codes for. Colour all 64 and <b>blocks of one colour appear</b>: leucine, " +
       "arginine and serine each have six codons, methionine and tryptophan have one each, and " +
       "in many blocks the third base does not matter at all — GCA, GCC, GCG and GCT are all " +
       "alanine. That is why this table is worth drawing as a tensor instead of listing: the " +
       "redundancy that a list of 64 lines hides is, in the cube, a colour you can see. Switch " +
       "to <b>one codon</b> and every cell goes but the one the gene is reading: that is the " +
       "rank-one picture, the product of three one-hot vectors, with exactly one 1 in 64 cells. " +
       "Pick a codon of the gene with the slider, or click a cell.",
    eqcap: "K is the outer product of three one-hot vectors, one for each base of the codon: a, b " +
           "and c index the cube's three axes. Everything is zero except the one cell they name.",
    stop: "stop",
    ax1: "1st base, a", ax2: "2nd base, b", ax3: "3rd base, c",
    claim: (n, codon, aa, nz) => "codon " + n + " = " + codon + " → " + aa + " · " +
      (nz === 1 ? "one 1" : nz + " ones") + " in a 4 × 4 × 4",
    read: (n, codon, aa, syn, code) =>
      "<b>Codon " + n + "</b> of the gene is <b>" + codon + "</b>, which codes for <b>" + aa + "</b>. " +
      "The table spends " + syn + (syn === 1 ? " codon" : " codons") + " on it" +
      (code ? ", and they are all the cells of its colour." : ". Switch to the whole code to see them."),
    tip: (codon, aa) => codon + " → " + aa,
    aria: (ctx) => {
      const ch = chosen(ctx);
      const aa = ch.idx === STOP ? "a stop" : ch.aa;
      return "The genetic code as a 4 by 4 by 4 cube with one box per codon, " +
             (ctx.state.show === "code" ? "each coloured by the residue it codes for. " : "with only the chosen one shown. ") +
             "Codon " + (ctx.state.n + 1) + " of the gene is " + ch.codon + ", which codes for " + aa + ".";
    },
    controls: {n: "Which codon of the gene", show: "Show"},
    options: {show: {code: "the whole code, by residue", codon: "one codon: rank one"}},
    np: {
      uvw: (codon) => "one-hot " + [...codon].join(", "),
      one: (nz) => nz + ": one 1 in 64 cells, rank one",
      shape: "a residue per cell",
      cell: (aa) => aa + ": the residue this cell codes for"
    }
  };

  const ES = {
    tab: "codones",
    k: "Sección 04 · el código genético",
    h: "El código genético es un cubo de 4 × 4 × 4, y sus bloques de un color son redundancia",
    concept: "Un codón son tres bases, así que tiene tres índices, y la tabla que convierte codones " +
             "en residuos es un tensor de orden 3 con un eje por base. Un solo codón es el tensor " +
             "más simple que aún necesita los tres: un 1 entre 64 celdas.",
    predict: "Antes de cambiar la vista: 64 codones codifican 20 residuos y un alto. ¿Los colores " +
             "caerán en 64 celdas sueltas, o en bloques, y a lo largo de qué base irán los bloques?",
    b: "Cada caja es uno de los 64 codones, en (primera base, segunda base, tercera base), coloreada " +
       "por el residuo que codifica. Colorea los 64 y <b>aparecen bloques de un solo color</b>: la " +
       "leucina, la arginina y la serina tienen seis codones cada una, la metionina y el " +
       "triptófano uno cada uno, y en muchos bloques la tercera base no importa en absoluto: " +
       "GCA, GCC, GCG y GCT son todos alanina. Por eso esta tabla vale la pena dibujarla como " +
       "tensor en lugar de listarla: la redundancia que una lista de 64 líneas esconde es, en el " +
       "cubo, un color que se ve. Cambia a <b>un codón</b> y desaparecen todas las celdas menos la " +
       "que lee el gen: es la imagen de rango uno, el producto de tres vectores one-hot, con " +
       "exactamente un 1 en 64 celdas. Elige un codón del gen con el deslizador, o haz clic en una celda.",
    eqcap: "K es el producto exterior de tres vectores one-hot, uno por cada base del codón: a, b " +
           "y c indexan los tres ejes del cubo. Todo es cero salvo la celda que nombran.",
    stop: "alto",
    ax1: "1.ª base, a", ax2: "2.ª base, b", ax3: "3.ª base, c",
    claim: (n, codon, aa, nz) => "codón " + n + " = " + codon + " → " + aa + " · " +
      (nz === 1 ? "un solo 1" : nz + " unos") + " en un 4 × 4 × 4",
    read: (n, codon, aa, syn, code) =>
      "El <b>codón " + n + "</b> del gen es <b>" + codon + "</b>, que codifica <b>" + aa + "</b>. " +
      "La tabla gasta " + syn + (syn === 1 ? " codón" : " codones") + " en él" +
      (code ? ", y son todas las celdas de su color." : ". Cambia al código entero para verlos."),
    tip: (codon, aa) => codon + " → " + aa,
    aria: (ctx) => {
      const ch = chosen(ctx);
      const aa = ch.idx === STOP ? "un alto" : ch.aa;
      return "El código genético como un cubo de 4 por 4 por 4 con una caja por codón, " +
             (ctx.state.show === "code" ? "cada una coloreada por el residuo que codifica. " : "con solo el elegido a la vista. ") +
             "El codón " + (ctx.state.n + 1) + " del gen es " + ch.codon + ", que codifica " + aa + ".";
    },
    controls: {n: "Qué codón del gen", show: "Mostrar"},
    options: {show: {code: "el código entero, por residuo", codon: "un codón: rango uno"}},
    np: {
      uvw: (codon) => "one-hot " + [...codon].join(", "),
      one: (nz) => nz + ": un 1 en 64 celdas, rango uno",
      shape: "un residuo por celda",
      cell: (aa) => aa + ": el residuo que codifica esta celda"
    }
  };

  window.GenomeScenes.register({
    id: "codons", section: "04", gl: true,
    part: {en: "Translation is a contraction", es: "La traducción es una contracción"},
    hl: ["codon", "base", "aa"],
    copy: {en: EN, es: ES},

    pose: {fov: 30, home: {az: -0.62, el: 0.42}, margin: 1.06,
           limits: {azMin: -1.4, azMax: 1.4, elMin: -0.25, elMax: 1.2, dollyMin: 0.5, dollyMax: 1.8}},

    controls: [
      {id: "n", type: "range", min: 0, max: 59, step: 1,
       fmt: (v, ctx) => (v + 1) + " · " + GC.codonAt(ctx.seq, v)},
      {id: "show", type: "select", options: SHOWS}
    ],

    init(ctx) {
      ctx.state.n = 0;
      ctx.state.show = "code";
    },

    animates(ctx) { return !!(ctx.cache.ease && ctx.cache.ease.moving); },
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

    build(ctx) {
      const THREE = ctx.THREE;
      const scene = new THREE.Scene();
      K.light(scene);
      const vox = K.voxels(64);
      scene.add(vox.mesh, vox.hit);
      const hullBox = K.frameBox("--stage-mute", 0.35);
      const cellBox = K.frameBox("--gn-hit", 1);
      const rods = [0, 1, 2].map(() => K.frameBox("--gn-core", 0.9));
      scene.add(hullBox, cellBox, ...rods);
      K.setBox(hullBox, hull.min, hull.max);
      const keys = [];
      return {
        scene, vox, hullBox, cellBox, rods, keys, labels: K.labelPool(scene), col: K.palette(),
        cam: new THREE.PerspectiveCamera(this.pose.fov, ctx.aspect, 0.1, 500),
        pick: [{mesh: vox.hit, key: (id) => keys[id] || null}]
      };
    },

    render(ctx, gl) {
      const m = shown(ctx);
      gl.keys.length = 0;
      m.items.forEach((it, n) => {
        gl.vox.set(n, it.c, it.s, gl.col(it.token, it.k));
        gl.keys[n] = it.pick || null;
      });
      gl.vox.commit();
      K.setBox(gl.cellBox, m.cell.min, m.cell.max);
      gl.rods.forEach((r, a) => { r.visible = m.showRods; K.setBox(r, m.rods[a].min, m.rods[a].max); });
      gl.labels.sync(m.labels);
    },

    // The twin: the same model, through the same orbit, fitted to the board.
    // It is also what the hero embed shows.
    draw(ctx) {
      const m = shown(ctx), b = frame(ctx);
      const P = ctx.projector(K.corners(b.min, b.max), ctx.box());
      const B = ctx.basis();
      K.edges2(ctx.svg, hull.min, hull.max, P, "--stage-mute", {opacity: 0.35, width: 1});
      K.boxes2(ctx.svg, m.items, B, P);
      K.edges2(ctx.svg, m.cell.min, m.cell.max, P, "--gn-hit", {width: 1.8});
      if (m.showRods) m.rods.forEach((r) => K.edges2(ctx.svg, r.min, r.max, P, "--gn-core", {width: 1.4}));
      K.labels2(ctx.svg, m.labels, P);
    },

    readout(ctx) {
      const s = ctx.state, c = ctx.copy, ch = chosen(ctx);
      const aa = ch.idx === STOP ? c.stop : ch.aa, syn = synonyms(ch.idx);
      return {
        html: c.read(s.n + 1, ch.codon, aa, syn, s.show === "code"),
        claim: c.claim(s.n + 1, ch.codon, aa, ch.nz),
        data: {
          n: String(s.n), show: s.show, codon: ch.codon, aa: ch.aa, aaindex: String(ch.idx),
          cell: ch.cell.join(","), nonzeros: String(ch.nz), synonyms: String(syn), shape: "4,4,4"
        }
      };
    },

    code(ctx) {
      const np = ctx.copy.np, ch = chosen(ctx);
      return K.code([
        ['K = np.einsum("a,b,c->abc", u, v, w)', np.uvw(ch.codon)],
        ["K.sum()", np.one(ch.nz)],
        ["CODE.shape", "(4, 4, 4): " + np.shape],
        ["CODE[" + ch.cell.join(", ") + "]", np.cell(ch.aa)]
      ]);
    }
  });
})();
