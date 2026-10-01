// Scene 3: transcription, which is one 4 x 4 on the alphabet axis. Three
// strands, column for column: the coding strand, the template the enzyme
// actually reads, and the RNA it builds. The polymerase walks the template
// and the RNA comes out under it one base at a time -- and reads like the
// *other* strand, the one nothing touched. Under the strands is the same
// thing as arithmetic, for the base the enzyme is on: a one-hot row in, the
// 4 x 4, a one-hot row out. Against the template that 4 x 4 is the
// anti-diagonal and every 1 changes column; against the coding strand it is
// the identity and none does. Two complements undo each other, J @ J = I,
// which is the whole reason a transcript reads like its gene.
// Flat SVG: the picture is three rows and a matrix, and depth would add
// nothing to either. See genome-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const GC = window.GenomeCore, K = window.GenomeKit;

  const SHOWN = 18;          // bases on the board: six codons
  // The board is 820 x 500. Every x below is laid out from these, so the
  // rightmost thing drawn is the 3' label at 788 + its own width: SVG neither
  // clips a child laid out past the viewBox nor reports one.
  const X0 = 150, PITCH = 35, TW = 30, TH = 30;
  const ROW = {coding: 86, template: 126, rna: 206};
  const LIFT = 12;           // how far the strands part around the enzyme
  const REACH = 2.6;         // columns the bubble spans either side of it
  const PANEL = {xX: 40, yRow: 377, cw: 38, ch: 34, xM: 300, yM: 322, m: 36, xY: 516, xN: 744};
  const ENTRANCE = 1800;     // ms for the enzyme's first walk across

  const colX = (l) => X0 + l * PITCH;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  // Every number the picture and the readout share, from the core. `rows`
  // is the strand the matrix is applied to -- the template under the
  // anti-diagonal, the coding strand under the identity -- and `out` is the
  // RNA either way, which is the point.
  function facts(ctx) {
    const s = ctx.state;
    const coding = ctx.seq.substr(s.at, SHOWN);
    const template = GC.templateStrand(coding);
    const from = s.mode === "complement" ? template : coding;
    const M = GC.matrixFor(s.mode);
    const rows = GC.oneHot(from);
    const out = GC.applyAlphabet(rows, M);
    const rna = GC.decode(out, GC.RNA_BASES);
    const moved = GC.movedOnes(rows.slice(0, s.upto), out.slice(0, s.upto));
    return {coding, template, from, M, rows, out, rna, moved};
  }

  // The base the arithmetic panel is about: the one under the pointer, or
  // else the one the enzyme has just written.
  function focusOf(ctx) {
    const h = ctx.hover;
    if (h && h.startsWith("col:")) return Number(h.slice(4));
    return Math.max(0, ctx.state.upto - 1);
  }

  const EN = {
    tab: "transcribe",
    k: "Section 06 · transcription",
    h: "Transcription is one 4 × 4 matrix, used at every position",
    predict: "Before you press play: the enzyme reads the middle strand and builds the RNA " +
             "from it. Will the RNA's letters match the strand it read, or the other one?",
    concept: "A matrix on the alphabet axis. Every position is transformed by the same " +
             "4 × 4, so transcribing a whole gene is one contraction over the base axis, " +
             "not a loop over positions.",
    b: "RNA polymerase walks along the <b>template strand</b> and pairs each base with its " +
       "partner: A with U, C with G, G with C, T with A. On the one-hot grid that pairing is " +
       "a 4 × 4 with a single anti-diagonal, and <b>every 1 changes column</b>. Now compare " +
       "the RNA with the <b>coding strand</b>, the one the enzyme never touched: the same " +
       "letters, with U written for T. That matrix is the identity, and it moves nothing. " +
       "Two complements undo each other, which is why the copy of a gene reads like the gene. " +
       "The enzyme does this one base at a time; the einsum applies the same 4 × 4 to every " +
       "position at once.",
    eqcap: "The sum runs over b, the base that goes in; c is the base that comes out. The " +
           "position ℓ is only carried along, which is why one 4 × 4 does every row at once.",
    claim: (mode, moved, n) => (mode === "complement"
      ? "RNA vs template: " + moved + " of " + n + " ones changed column · M = J"
      : "RNA vs coding strand: " + moved + " of " + n + " ones changed column · M = I"),
    aria: (ctx) => {
      const f = facts(ctx), s = ctx.state;
      return "Three strands of " + SHOWN + " bases, column for column: the coding strand " + f.coding +
             ", the template " + f.template + ", and the RNA built from it, " + f.rna.slice(0, s.upto) +
             ". Below, the 4 by 4 matrix that maps one to the other: " + f.moved + " of " + s.upto +
             " ones changed column.";
    },
    rows: {coding: "coding 5′", template: "template 3′", rna: "RNA 5′"},
    ends: {coding: "3′", template: "5′", rna: "3′"},
    enzyme: "RNA polymerase",
    xLab: {complement: "template[ℓ]", relabel: "coding[ℓ]"},
    yLab: "RNA[ℓ]",
    mLab: {complement: "M = J", relabel: "M = I"},
    countCap: ["ones that", "changed column"],
    foot: (n) => "the same 4 × 4 at all " + n + " positions: one einsum, no loop",
    tip: (l, from, to) => "position " + l + " · " + from + " → " + to,
    controls: {mode: "Compare the RNA with", upto: "Bases transcribed", play: "▶ Transcribe", at: "Where in the gene"},
    options: {mode: {complement: "the template strand", relabel: "the coding strand"}},
    read: (mode, moved, n, a, b, rna) => (mode === "complement"
      ? "<b>RNA against the template</b>: " + moved + " of " + n + " ones changed column, so the " +
        "matrix is the anti-diagonal J."
      : "<b>RNA against the coding strand</b>: " + moved + " of " + n + " ones changed column, so the " +
        "matrix is the identity.") +
      " Bases " + a + "–" + b + " of the gene; the transcript so far is <code>" + (rna || "—") + "</code>.",
    np: {
      x: (n) => "(" + n + ", 4) over A C G T",
      partner: "the partner strand",
      j: "the anti-diagonal: A→U, T→A",
      i: "T→U only renames a column",
      y: () => "one 4 × 4, every position",
      undo: "True: J @ J = I",
      same: "True: no number moved"
    }
  };

  const ES = {
    tab: "transcribir",
    k: "Sección 06 · transcripción",
    h: "La transcripción es una sola matriz de 4 × 4, usada en cada posición",
    predict: "Antes de pulsar reproducir: la enzima lee la hebra del medio y construye el ARN " +
             "a partir de ella. ¿Las letras del ARN coincidirán con la hebra que leyó o con la otra?",
    concept: "Una matriz sobre el eje del alfabeto. Cada posición se transforma con la misma " +
             "4 × 4, así que transcribir un gen entero es una contracción sobre el eje de las " +
             "bases, no un bucle sobre las posiciones.",
    b: "La ARN polimerasa recorre la <b>hebra molde</b> y empareja cada base con su pareja: A " +
       "con U, C con G, G con C, T con A. En la rejilla one-hot ese emparejamiento es una 4 × 4 " +
       "con una sola antidiagonal, y <b>cada 1 cambia de columna</b>. Ahora compara el ARN con " +
       "la <b>hebra codificante</b>, la que la enzima nunca tocó: las mismas letras, con U en " +
       "lugar de T. Esa matriz es la identidad y no mueve nada. Dos complementos se deshacen " +
       "entre sí, y por eso la copia de un gen se lee como el gen. La enzima lo hace base por " +
       "base; el einsum aplica la misma 4 × 4 a todas las posiciones a la vez.",
    eqcap: "La suma recorre b, la base que entra; c es la base que sale. La posición ℓ solo " +
           "se arrastra, y por eso una sola 4 × 4 resuelve todas las filas a la vez.",
    claim: (mode, moved, n) => (mode === "complement"
      ? "ARN frente al molde: " + moved + " de " + n + " unos cambiaron de columna · M = J"
      : "ARN frente a la codificante: " + moved + " de " + n + " unos cambiaron de columna · M = I"),
    aria: (ctx) => {
      const f = facts(ctx), s = ctx.state;
      return "Tres hebras de " + SHOWN + " bases, columna por columna: la hebra codificante " + f.coding +
             ", el molde " + f.template + " y el ARN construido a partir de él, " + f.rna.slice(0, s.upto) +
             ". Debajo, la matriz de 4 por 4 que lleva de una a otra: " + f.moved + " de " + s.upto +
             " unos cambiaron de columna.";
    },
    rows: {coding: "codificante 5′", template: "molde 3′", rna: "ARN 5′"},
    ends: {coding: "3′", template: "5′", rna: "3′"},
    enzyme: "ARN polimerasa",
    xLab: {complement: "molde[ℓ]", relabel: "codificante[ℓ]"},
    yLab: "ARN[ℓ]",
    mLab: {complement: "M = J", relabel: "M = I"},
    countCap: ["unos que cambiaron", "de columna"],
    foot: (n) => "la misma 4 × 4 en las " + n + " posiciones: un einsum, ningún bucle",
    tip: (l, from, to) => "posición " + l + " · " + from + " → " + to,
    controls: {mode: "Comparar el ARN con", upto: "Bases transcritas", play: "▶ Transcribir", at: "Dónde en el gen"},
    options: {mode: {complement: "la hebra molde", relabel: "la hebra codificante"}},
    read: (mode, moved, n, a, b, rna) => (mode === "complement"
      ? "<b>ARN frente al molde</b>: " + moved + " de " + n + " unos cambiaron de columna, así que la " +
        "matriz es la antidiagonal J."
      : "<b>ARN frente a la hebra codificante</b>: " + moved + " de " + n + " unos cambiaron de columna, " +
        "así que la matriz es la identidad.") +
      " Bases " + a + "–" + b + " del gen; el transcrito hasta ahora es <code>" + (rna || "—") + "</code>.",
    np: {
      x: (n) => "(" + n + ", 4) sobre A C G T",
      partner: "la hebra pareja",
      j: "la antidiagonal: A→U, T→A",
      i: "T→U solo renombra una columna",
      y: () => "una 4 × 4, cada posición",
      undo: "True: J @ J = I",
      same: "True: ningún número se movió"
    }
  };

  // Where the enzyme is drawn, as a float: it chases `upto`, and on the
  // scene's first showing it walks there from the start. Never read by the
  // readout -- that is written from `upto` itself.
  function head(ctx) {
    const s = ctx.state;
    const goal = s.upto * K.smooth(K.arrival(ctx, ENTRANCE));
    return K.chase(ctx.cache, "u", goal, ctx.now(), 0.12, ctx.instant);
  }

  window.GenomeScenes.register({
    id: "transcribe", section: "06",
    part: {en: "Transcription is a matrix", es: "La transcripción es una matriz"},
    hl: ["pos", "base", "rna"],
    copy: {en: EN, es: ES},

    controls: [
      {id: "mode", type: "select", options: ["complement", "relabel"]},
      {id: "upto", type: "range", min: 0, max: SHOWN, step: 1, fmt: (v) => v + " / " + SHOWN},
      {id: "play", type: "play", target: "upto", rate: 5},
      {id: "at", type: "range", min: 0, max: GC.CDS.length - SHOWN, step: SHOWN,
       fmt: (v) => (v + 1) + "–" + (v + SHOWN)}
    ],

    init(ctx) {
      ctx.state.mode = "complement";
      ctx.state.upto = SHOWN;
      ctx.state.at = 0;
    },

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) {
      return K.arrival(ctx, ENTRANCE) < 1 || !!(ctx.cache.u && ctx.cache.u.moving);
    },

    pick(ctx, key) {
      if (key.startsWith("col:")) ctx.setControls({upto: Number(key.slice(4)) + 1});
    },
    tip(ctx, key) {
      if (!key.startsWith("col:")) return "";
      const l = Number(key.slice(4)), f = facts(ctx);
      return ctx.copy.tip(ctx.state.at + l + 1, f.from[l], f.rna[l]);
    },
    // The ribbon under the stage: a press on the gene moves this stretch there.
    seek(ctx, i) {
      ctx.setControls({at: Math.min(GC.CDS.length - SHOWN, Math.floor(i / SHOWN) * SHOWN)});
    },

    draw(ctx) {
      const svg = ctx.svg, c = ctx.copy, s = ctx.state, f = facts(ctx), lit = ctx.hl;
      const u = head(ctx);
      const focus = focusOf(ctx);
      const complement = s.mode === "complement";
      // The enzyme sits on the base it has just written; before the first one
      // it waits on column 0.
      const at = Math.max(0.5, Math.min(SHOWN - 0.5, u - 0.5));
      const open = (l) => K.smooth(clamp01(1 - Math.abs(l + 0.5 - at) / REACH));
      const yCoding = (l) => ROW.coding - LIFT * open(l);
      const yTemplate = (l) => ROW.template + LIFT * open(l);

      // The enzyme, behind everything it holds.
      const ex = colX(at) - PITCH * 1.45;
      svg.appendChild(K.el("rect", {
        x: ex.toFixed(1), y: ROW.coding - LIFT - 10, width: (PITCH * 2.9).toFixed(1),
        height: ROW.rna + TH + 10 - (ROW.coding - LIFT - 10), rx: 22,
        fill: K.css("--gn-rna"), "fill-opacity": 0.13,
        stroke: K.css("--gn-rna"), "stroke-width": 1.6, "stroke-opacity": 0.85
      }));

      // Backbones: one rail per strand, bending with the bubble.
      const rail = (y, token, from, to) => {
        if (to - from < 1) return;
        const pts = [];
        for (let l = from; l < to; l++) pts.push((colX(l) + TW / 2).toFixed(1) + "," + y(l).toFixed(1));
        svg.appendChild(K.el("polyline", {
          points: pts.join(" "), fill: "none", stroke: K.css(token), "stroke-width": 3,
          "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-opacity": 0.9
        }));
      };
      rail((l) => yCoding(l) - 5, "--stage-mute", 0, SHOWN);
      rail((l) => yTemplate(l) + TH + 5, "--stage-mute", 0, SHOWN);

      // Rungs where the two DNA strands are still paired.
      for (let l = 0; l < SHOWN; l++) {
        const o = open(l);
        if (o > 0.35) continue;
        const x = colX(l) + TW / 2;
        svg.appendChild(K.el("line", {
          x1: x, y1: yCoding(l) + TH + 1, x2: x, y2: yTemplate(l) - 1,
          stroke: K.css("--stage-mute"), "stroke-width": 2, "stroke-opacity": (0.9 * (1 - o / 0.35)).toFixed(2)
        }));
      }

      // The three strands. The one the matrix is being read against is solid;
      // the other DNA strand stands back as outlines.
      const ring = (l) => (l === focus && s.upto > 0) || lit === "pos" ? "--stage-ink" : null;
      for (let l = 0; l < SHOWN; l++) {
        K.tile(svg, colX(l), yCoding(l), TW, TH, f.coding[l],
          {solid: !complement, ring: !complement ? ring(l) : null, pick: "col:" + l});
        K.tile(svg, colX(l), yTemplate(l), TW, TH, f.template[l],
          {solid: complement, ring: complement ? ring(l) : null, pick: "col:" + l});
      }
      // The RNA so far. A base comes out from under the template and settles
      // into its own row; the rail follows the ones that have landed.
      const done = Math.min(SHOWN, Math.floor(u + 1e-6));
      rail(() => ROW.rna + TH + 5, "--gn-rna", 0, done);
      for (let l = 0; l < SHOWN; l++) {
        const e = K.smooth(clamp01(u - l));
        if (e < 0.02) continue;
        const y = (yTemplate(l) + TH + 6) + (ROW.rna - (yTemplate(l) + TH + 6)) * e;
        K.tile(svg, colX(l), y, TW, TH, f.rna[l], {
          token: K.BASE_TOKEN[f.rna[l]], solid: e > 0.98, ring: e > 0.98 ? (lit === "rna" ? "--gn-rna" : ring(l)) : null,
          pick: "col:" + l
        });
      }
      // Under each finished RNA base: did its 1 change column?
      for (let l = 0; l < Math.min(done, s.upto); l++) {
        const same = f.rows[l].indexOf(1) === f.out[l].indexOf(1);
        K.text(svg, colX(l) + TW / 2, ROW.rna + TH + 27, same ? "=" : "≠",
          {size: 17, anchor: "middle", weight: 700, colour: same ? "--gn-hit" : "--gn-miss"});
      }

      // Row names and ends, on the bare board at either side.
      const names = [["coding", ROW.coding, complement ? "--stage-mute" : "--stage-ink"],
                     ["template", ROW.template, complement ? "--stage-ink" : "--stage-mute"],
                     ["rna", ROW.rna, "--gn-rna"]];
      for (const [key, y, colour] of names) {
        K.text(svg, X0 - 12, y + TH / 2 + 4.5, c.rows[key], {size: 12.5, anchor: "end", colour});
        K.text(svg, colX(SHOWN) + 3, y + TH / 2 + 4.5, c.ends[key], {size: 12.5, colour: "--stage-mute"});
      }
      K.label(svg, Math.max(X0 + 60, Math.min(colX(SHOWN) - 60, colX(at))), ROW.coding - LIFT - 22, c.enzyme,
        {size: 12.5, anchor: "middle", colour: "--gn-rna"});

      // ---- the arithmetic for the base in focus: row in, 4 x 4, row out.
      const P = PANEL;
      const b = f.rows[focus].indexOf(1), cc = f.out[focus].indexOf(1);
      const live = s.upto > 0;
      const row = (x, vec, alphabet, name, hotToken, headLit) => {
        K.text(svg, x, P.yRow - 30, name, {size: 12.5, colour: "--stage-mute"});
        for (let j = 0; j < 4; j++) {
          const hot = live && vec[j] === 1;
          K.text(svg, x + j * P.cw + P.cw / 2, P.yRow - 8, alphabet[j],
            {size: 13, anchor: "middle", colour: headLit || hot ? K.BASE_TOKEN[alphabet[j]] : "--stage-mute"});
          svg.appendChild(K.el("rect", {
            x: x + j * P.cw + 1.5, y: P.yRow + 1.5, width: P.cw - 3, height: P.ch - 3, rx: 4,
            fill: K.css(hot ? hotToken : "--stage-chip"),
            stroke: K.css(hot ? hotToken : "--stage-mute"), "stroke-width": 1.2, "stroke-opacity": hot ? 1 : 0.5
          }));
          K.text(svg, x + j * P.cw + P.cw / 2, P.yRow + P.ch / 2 + 5.5, live ? String(vec[j]) : "·",
            {size: 15, anchor: "middle", weight: 700, colour: hot ? "--stage" : "--stage-mute"});
        }
      };
      row(P.xX, f.rows[focus], GC.BASES, c.xLab[s.mode], K.BASE_TOKEN[f.from[focus]], lit === "base");
      row(P.xY, f.out[focus], GC.RNA_BASES, c.yLab, K.BASE_TOKEN[f.rna[focus]], lit === "rna");
      K.text(svg, (P.xX + 4 * P.cw + P.xM - 24) / 2, P.yRow + P.ch / 2 + 10, "·", {size: 34, anchor: "middle"});
      K.text(svg, (P.xM + 4 * P.m + P.xY) / 2, P.yRow + P.ch / 2 + 6, "=", {size: 18, anchor: "middle"});

      // The matrix: rows are the base going in, columns the base coming out.
      K.text(svg, P.xM - 40, P.yM - 7, c.mLab[s.mode], {size: 13, anchor: "end", colour: "--gn-core", weight: 700});
      for (let i = 0; i < 4; i++) {
        const rowLit = live && i === b, colLit = live && i === cc;
        K.tile(svg, P.xM - 30, P.yM + i * P.m + 5, 24, P.m - 10, GC.BASES[i],
          {solid: rowLit || lit === "base", font: 13});
        K.tile(svg, P.xM + i * P.m + 6, P.yM - 20, P.m - 12, 17, GC.RNA_BASES[i],
          {solid: colLit || lit === "rna", font: 12, token: K.BASE_TOKEN[GC.RNA_BASES[i]]});
        for (let j = 0; j < 4; j++) {
          const one = f.M[i][j] === 1;
          const hot = live && one && i === b;
          svg.appendChild(K.el("rect", {
            x: P.xM + j * P.m + 1.5, y: P.yM + i * P.m + 1.5, width: P.m - 3, height: P.m - 3, rx: 4,
            fill: K.css(hot ? "--gn-core" : "--stage-chip"),
            "fill-opacity": 1,
            stroke: K.css(one ? "--gn-core" : "--stage-mute"), "stroke-width": one ? 1.6 : 1,
            "stroke-opacity": one ? 1 : (rowLit ? 0.8 : 0.4)
          }));
          K.text(svg, P.xM + j * P.m + P.m / 2, P.yM + i * P.m + P.m / 2 + 5.5, String(f.M[i][j]),
            {size: 15, anchor: "middle", weight: one ? 700 : 500,
             colour: hot ? "--stage" : (one ? "--gn-core" : "--stage-mute")});
        }
      }

      // The count the claim card quotes, large.
      K.text(svg, P.xN, P.yRow + 24, f.moved + " / " + s.upto,
        {size: 30, anchor: "middle", weight: 700, colour: complement ? "--gn-miss" : "--gn-hit", sans: true});
      c.countCap.forEach((line, n) => {
        K.text(svg, P.xN, P.yRow + 48 + n * 16, line, {size: 12, anchor: "middle", colour: "--stage-mute", sans: true});
      });
      K.text(svg, 410, 488, c.foot(SHOWN), {size: 12.5, anchor: "middle", colour: "--stage-mute"});
    },

    readout(ctx) {
      const s = ctx.state, c = ctx.copy, f = facts(ctx);
      const rna = f.rna.slice(0, s.upto);
      return {
        html: c.read(s.mode, f.moved, s.upto, s.at + 1, s.at + SHOWN, rna),
        claim: c.claim(s.mode, f.moved, s.upto),
        lens: {a: s.at, b: s.at + SHOWN, done: [s.at, s.at + s.upto]},
        data: {mode: s.mode, moved: String(f.moved), at: String(s.at), upto: String(s.upto),
               rna: rna, template: f.template, shown: String(SHOWN)}
      };
    },

    code(ctx) {
      const s = ctx.state, np = ctx.copy.np;
      const cut = "gene[" + s.at + ":" + (s.at + SHOWN) + "]";
      if (s.mode === "complement") {
        return K.code([
          ["coding = one_hot(" + cut + ")", np.x(SHOWN)],
          ["template = coding[:, ::-1]", np.partner],
          ["J = np.eye(4)[::-1]", np.j],
          ['rna = np.einsum("lb,bc->lc", template, J)', np.y(SHOWN)],
          ["np.array_equal(rna, coding)", np.undo]
        ]);
      }
      return K.code([
        ["coding = one_hot(" + cut + ")", np.x(SHOWN)],
        ["I = np.eye(4)", np.i],
        ['rna = np.einsum("lb,bc->lc", coding, I)', np.y(SHOWN)],
        ["np.array_equal(rna, coding)", np.same]
      ]);
    }
  });
})();
