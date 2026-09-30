// Scene 3: transcription, which is one contraction over the alphabet axis.
// The whole scene is the 4 x 4 in the middle: reading the coding strand is
// the identity -- every T is called U and not one number moves -- while the
// complement is the reversal permutation, and every 1 changes column. Two
// matrices, one picture, and the count of ones that moved is the difference.
// Flat SVG: there is no depth in a 4 x 4.
// See genome-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const GC = window.GenomeCore, K = window.GenomeKit;

  const SHOWN = 12;          // bases on screen; 12 is four codons
  const L = {
    dnaX: 58, rnaX: 560, stripY: 92, gridY: 118,
    cellW: 26, cellH: 21, mX: 330, mY: 168, mCell: 30
  };

  function facts(ctx) {
    const s = ctx.state;
    const dna = ctx.seq.substr(s.at, SHOWN);
    const M = GC.matrixFor(s.mode);
    const rows = GC.oneHot(dna);
    const out = GC.applyAlphabet(rows, M);
    const rna = GC.decode(out, GC.RNA_BASES);
    // A 1 "moved" when it came out in a different column from the one it went
    // in at. That is the number the two matrices actually differ by, and it is
    // countable by eye on the stage.
    let moved = 0;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].indexOf(1) !== out[i].indexOf(1)) moved++;
    }
    return {dna, rna, rows, out, M, moved};
  }

  const EN = {
    k: "Section 06 · transcription",
    h: "Transcription is a 4 × 4 matrix, and which one is the whole story",
    concept: "A matrix on the alphabet axis. The sequence axis is untouched: every position " +
             "is transformed by the same 4 × 4, which is what makes this one contraction " +
             "rather than a loop over bases.",
    predict: "Before you switch: reading the coding strand renames every T to U. Of the 12 " +
             "ones in the grid, how many do you think that moves?",
    b: "Transcribing the coding strand renames every T to a U and <b>moves no number at " +
       "all</b> — the grid that comes out is the grid that went in, and only the label on " +
       "the fourth column changed. That is the identity matrix, and it is worth seeing once " +
       "that an operation with a name can be arithmetically nothing. The complement is the " +
       "one that does work: A swaps with T and C with G, and because the axis is " +
       "alphabetical that is the matrix with a single anti-diagonal. Now every 1 changes " +
       "column. Switch between them and watch the count.",
    eqcap: "The sum runs over b, the base that goes in; c is the base that comes out. The " +
           "position ℓ is only carried along, which is why one 4 × 4 does all 12 rows at once.",
    claim: (mode, moved) => mode + ": " + moved + " of " + SHOWN + " ones moved",
    aria: (ctx) => {
      const f = facts(ctx);
      return "A window of " + SHOWN + " bases, its one-hot grid, the 4 by 4 matrix, and the " +
             "result. " + f.moved + " of " + SHOWN + " ones changed column.";
    },
    dnaLab: "DNA  (A C G T)", rnaLab: "RNA  (A C G U)", mLab: "M",
    controls: {mode: "Which matrix", at: "Where in the gene"},
    options: {relabel: "T → U (relabel)", complement: "complement"},
    read: (mode, moved, at) =>
      "<b>" + mode + "</b> · " + moved + " of " + SHOWN + " ones changed column · " +
      "bases " + (at + 1) + "–" + (at + SHOWN),
    np: {
      x: "(12, 4) over A C G T",
      relabel: "T → U is a relabel: the identity",
      complement: "A↔T, C↔G: the anti-diagonal",
      y: "one contraction over the base axis",
      same: "True — not one number moved",
      diff: "False — every 1 changed column"
    }
  };

  const ES = {
    k: "Sección 06 · transcripción",
    h: "La transcripción es una matriz de 4 × 4, y cuál sea es toda la historia",
    concept: "Una matriz sobre el eje del alfabeto. El eje de la secuencia no se toca: cada " +
             "posición se transforma con la misma 4 × 4, y eso es lo que hace de esto una " +
             "contracción y no un bucle sobre las bases.",
    predict: "Antes de cambiar: leer la hebra codificante renombra cada T como U. De los 12 " +
             "unos de la rejilla, ¿cuántos crees que mueve eso?",
    b: "Transcribir la hebra codificante renombra cada T como U y <b>no mueve ningún " +
       "número</b> — la rejilla que sale es la que entró, y solo cambió la etiqueta de la " +
       "cuarta columna. Esa es la matriz identidad, y vale la pena ver una vez que una " +
       "operación con nombre puede no ser nada aritméticamente. El complemento sí trabaja: " +
       "A se intercambia con T y C con G, y como el eje es alfabético esa es la matriz con " +
       "una sola antidiagonal. Ahora cada 1 cambia de columna. Alterna entre las dos y mira " +
       "la cuenta.",
    eqcap: "La suma recorre b, la base que entra; c es la base que sale. La posición ℓ solo " +
           "se arrastra, y por eso una sola 4 × 4 resuelve las 12 filas a la vez.",
    claim: (mode, moved) => mode + ": " + moved + " de " + SHOWN + " unos se movieron",
    aria: (ctx) => {
      const f = facts(ctx);
      return "Una ventana de " + SHOWN + " bases, su rejilla one-hot, la matriz de 4 por 4 y " +
             "el resultado. " + f.moved + " de " + SHOWN + " unos cambiaron de columna.";
    },
    dnaLab: "ADN  (A C G T)", rnaLab: "ARN  (A C G U)", mLab: "M",
    controls: {mode: "Qué matriz", at: "Dónde en el gen"},
    options: {relabel: "T → U (renombrar)", complement: "complemento"},
    read: (mode, moved, at) =>
      "<b>" + mode + "</b> · " + moved + " de " + SHOWN + " unos cambiaron de columna · " +
      "bases " + (at + 1) + "–" + (at + SHOWN),
    np: {
      x: "(12, 4) sobre A C G T",
      relabel: "T → U es renombrar: la identidad",
      complement: "A↔T, C↔G: la antidiagonal",
      y: "una contracción sobre el eje de las bases",
      same: "True — no se movió ni un número",
      diff: "False — cada 1 cambió de columna"
    }
  };

  window.GenomeScenes.register({
    id: "transcribe", section: "06",
    part: {en: "Transcription is a matrix", es: "La transcripción es una matriz"},
    hl: ["pos", "base", "rna"],
    copy: {en: EN, es: ES},

    controls: [
      {id: "mode", type: "select", options: ["relabel", "complement"]},
      {id: "at", type: "range", min: 0, max: GC.CDS.length - SHOWN, step: SHOWN,
       fmt: (v) => (v + 1) + "–" + (v + SHOWN)}
    ],

    init(ctx) {
      ctx.state.mode = "relabel";
      ctx.state.at = 0;
    },

    draw(ctx) {
      const svg = ctx.svg, c = ctx.copy, f = facts(ctx), lit = ctx.hl;
      const gridOpts = (rows, x, alphabet) => ({
        x: x, y: L.gridY, cellW: L.cellW, cellH: L.cellH, digits: 0,
        at: (i, j) => {
          if (lit === "pos" && rows[i][j]) return "--gn-hit";
          if (!rows[i][j]) return null;
          return alphabet === GC.RNA_BASES ? "--gn-rna" : "--" + "gb-" + "acgt"[j];
        }
      });

      // The two strips, each over its own grid, so a reader can drop from a
      // letter to the row that encodes it.
      K.label(svg, L.dnaX, L.stripY - 16, c.dnaLab, {size: 11, colour: "--stage-mute"});
      K.seqStrip(svg, f.dna, {
        x: L.dnaX, y: L.stripY, w: SHOWN * L.cellW, h: 18,
        lit: () => lit === "base"
      });
      K.numGrid(svg, f.rows, gridOpts(f.rows, L.dnaX, GC.BASES));

      K.label(svg, L.rnaX, L.stripY - 16, c.rnaLab, {size: 11, colour: "--stage-mute"});
      K.seqStrip(svg, f.rna, {
        x: L.rnaX, y: L.stripY, w: SHOWN * L.cellW, h: 18,
        at: () => "--gn-rna", lit: () => lit === "rna"
      });
      K.numGrid(svg, f.out, gridOpts(f.out, L.rnaX, GC.RNA_BASES));

      // The matrix itself, between them, at the size that makes it the thing
      // the scene is about.
      K.label(svg, L.mX, L.mY - 14, c.mLab, {size: 12, colour: "--gn-core"});
      K.numGrid(svg, f.M, {
        x: L.mX, y: L.mY, cellW: L.mCell, cellH: L.mCell, digits: 0,
        at: (i, j) => (f.M[i][j] ? "--gn-core" : null)
      });
      // Column headers on the matrix: rows are the base going in, columns the
      // base coming out, and without these it is four numbers with no meaning.
      for (let j = 0; j < 4; j++) {
        K.label(svg, L.mX + j * L.mCell + L.mCell / 2, L.mY - 2, GC.RNA_BASES[j],
          {size: 10, anchor: "middle", colour: lit === "rna" ? "--gn-rna" : "--stage-mute"});
        K.label(svg, L.mX - 8, L.mY + j * L.mCell + L.mCell / 2, GC.BASES[j],
          {size: 10, anchor: "end", baseline: "middle",
           colour: lit === "base" ? "--gb-" + "acgt"[j] : "--stage-mute"});
      }
    },

    readout(ctx) {
      const s = ctx.state, c = ctx.copy, f = facts(ctx);
      const name = c.options[s.mode];
      return {
        html: c.read(name, f.moved, s.at),
        claim: c.claim(name, f.moved),
        data: {mode: s.mode, moved: String(f.moved), at: String(s.at),
               rna: f.rna, shown: String(SHOWN)}
      };
    },

    code(ctx) {
      const s = ctx.state, np = ctx.copy.np;
      const relabel = s.mode === "relabel";
      return K.code([
        ["X = one_hot(dna)", np.x],
        [relabel ? "M = np.eye(4)" : "M = np.eye(4)[::-1]", relabel ? np.relabel : np.complement],
        ['Y = np.einsum("lb,bc->lc", X, M)', np.y],
        ["np.array_equal(Y, X)", relabel ? np.same : np.diff]
      ]);
    }
  });
})();
