// Scene 5: the genetic code is a 4 x 4 x 4 table, and translation is one
// contraction of a rank-one codon against it. The picture is the table drawn
// as four 4 x 4 slices, one per first base, each cell tinted by the residue
// it codes for -- so the redundancy of the code is a thing to look at: blocks
// of one colour, six cells for L, R and S, one each for M and W.
// Flat SVG: a 4 x 4 x 4 is four pages, and the cube gets its own scene.
// See genome-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const GC = window.GenomeCore, K = window.GenomeKit;

  const L = {
    headY: 112,
    codonX: 60, cell: 30,                    // the codon's three one-hot rows
    sliceX: 214, sliceCell: 24, sliceGap: 18, // the four slices of the table
    titleY: 144, colY: 162, gridY: 168,
    resX: 716,                                // the big residue letter
    barX: 50, barW: 504, barY: 312, barH: 44, letY: 374,
    synX: 580
  };

  // Shared with the codon cube, so the redundancy a reader spots in one
  // picture matches the other. See K.residueTint for the contrast floor.
  const tint = (idx) => K.residueTint(idx);

  function facts(ctx) {
    const n = Math.max(0, Math.min(GC.codonCount(ctx.seq) - 1, ctx.state.n));
    const codon = GC.codonAt(ctx.seq, n);
    const T = GC.codonTensor(codon);
    const aa = GC.translateByContraction(codon);          // the letter, or "*"
    // Where the rank-one tensor's single 1 sits: the cell that lights.
    let cell = [0, 0, 0];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) {
      if (T[i][j][k]) cell = [i, j, k];
    }
    const idx = GC.CODE_T[cell[0]][cell[1]][cell[2]];       // 0..19, or 20 for stop
    // The redundancy, tallied from the table itself: how many of the 64
    // cells carry each residue, and which codons they are.
    const symbols = GC.AAS + GC.STOP;
    const count = symbols.split("").map(() => 0);
    const same = [];
    Object.keys(GC.CODE).forEach((cd) => {
      const r = GC.CODE[cd];
      count[symbols.indexOf(r)]++;
      if (r === aa) same.push(cd);
    });
    const cells = GC.CODE_T.length * GC.CODE_T[0].length * GC.CODE_T[0][0].length;
    return {n, codon, T, aa, cell, idx, symbols, count, same, cells, residues: GC.AAS.length};
  }

  const EN = {
    tab: "translate",
    k: "Section 06 · translation",
    h: "Translation is one contraction against a 4 × 4 × 4 table",
    concept: "Three one-hot rows make a rank-one tensor, and the genetic code is a tensor too: " +
             "multiply them entry by entry and sum, and all that survives is the one cell the " +
             "codon points at.",
    predict: "Before you step through: 64 codons, 20 residues and a stop. Look at the four " +
             "slices. Which residues do you expect to own the most cells?",
    b: "The genetic code is a <b>4 × 4 × 4 table</b>: first base, second base, third base, and " +
       "in each cell the residue that codon makes. A codon is three one-hot rows, and their " +
       "outer product is a 4 × 4 × 4 that is zero everywhere except one cell. Multiply it " +
       "into the table and sum over all three axes: the answer is the residue, in a single " +
       "contraction and no lookup. Now look at the colours. The code is <b>redundant</b>, " +
       "and you can see it: blocks of one colour, mostly varying in the third base. Leucine, " +
       "arginine and serine own six cells each; methionine and tryptophan own one, and " +
       "three cells are stops. Step through the codons and watch a different cell light.",
    eqcap: "The sum runs over all three base axes a, b and c. The codon tensor is zero in 63 " +
           "of its 64 cells, so the sum picks out exactly one entry of the table.",
    claim: (num, codon, aa, cells, residues) =>
      "codon " + num + " = " + codon + " → " + aa + " · one of " + cells + " cells, " +
      residues + " residues",
    aria: (ctx) => {
      const f = facts(ctx);
      return "Codon " + (f.n + 1) + ", " + f.codon + ", as three one-hot rows; the genetic " +
             "code as four 4 by 4 slices with that codon's cell lit; and the residue it " +
             "codes for, " + (f.aa === GC.STOP ? "a stop" : f.aa) + ". " + f.same.length +
             " of " + f.cells + " cells code for it.";
    },
    stop: "stop",
    codonHead: (num, codon) => "codon " + num + " = " + codon,
    codeHead: "CODE[a, b, c]: the residue of each codon",
    resHead: "residue",
    first: (b) => "first base " + b,
    perHead: (cells) => "cells per residue, " + cells + " in all",
    owns: (aa) => "codons for " + aa,
    many: (k) => (k === 1 ? "1 codon" : k + " codons"),
    controls: {n: "Which codon"},
    options: {},
    read: (f) =>
      "<b>codon " + (f.n + 1) + " = " + f.codon + " → " + (f.aa === GC.STOP ? "stop" : f.aa) +
      "</b> · " + f.same.length + " of " + f.cells + " cells code for it · the table spends " +
      f.cells + " cells on " + f.residues + " residues and a stop",
    np: {
      uvw: "three one-hot rows, (4,) each",
      k: "(4, 4, 4): rank one",
      sum: "1: a single cell is lit",
      aa: "CODE holds residue indices",
      res: (i, letter) => i === 20 ? "20 is the stop" : "index " + i + " is " + letter
    }
  };

  const ES = {
    tab: "traducir",
    k: "Sección 06 · traducción",
    h: "Traducir es una contracción contra una tabla de 4 × 4 × 4",
    concept: "Tres filas one-hot forman un tensor de rango uno, y el código genético también " +
             "es un tensor: multiplícalos entrada por entrada y suma, y solo sobrevive la " +
             "celda a la que apunta el codón.",
    predict: "Antes de recorrerlos: 64 codones, 20 residuos y un alto. Mira los cuatro cortes. " +
             "¿Qué residuos crees que tienen más celdas?",
    b: "El código genético es una <b>tabla de 4 × 4 × 4</b>: primera base, segunda base, " +
       "tercera base, y en cada celda el residuo que ese codón produce. Un codón son tres " +
       "filas one-hot, y su producto exterior es un 4 × 4 × 4 que vale cero en todas partes " +
       "menos en una celda. Multiplícalo por la tabla y suma sobre los tres ejes: la " +
       "respuesta es el residuo, en una sola contracción y sin consulta. Ahora mira los " +
       "colores. El código es <b>redundante</b>, y se ve: bloques de un solo color, que " +
       "varían sobre todo en la tercera base. Leucina, arginina y serina tienen seis celdas " +
       "cada una; metionina y triptófano una, y tres celdas son altos. Recorre los codones " +
       "y mira cómo se ilumina otra celda.",
    eqcap: "La suma recorre los tres ejes de bases a, b y c. El tensor del codón es cero en 63 " +
           "de sus 64 celdas, así que la suma escoge exactamente una entrada de la tabla.",
    claim: (num, codon, aa, cells, residues) =>
      "codón " + num + " = " + codon + " → " + aa + " · una de " + cells + " celdas, " +
      residues + " residuos",
    aria: (ctx) => {
      const f = facts(ctx);
      return "El codón " + (f.n + 1) + ", " + f.codon + ", como tres filas one-hot; el código " +
             "genético como cuatro cortes de 4 por 4 con la celda de ese codón iluminada; y " +
             "el residuo que codifica, " + (f.aa === GC.STOP ? "un alto" : f.aa) + ". " +
             f.same.length + " de " + f.cells + " celdas lo codifican.";
    },
    stop: "alto",
    codonHead: (num, codon) => "codón " + num + " = " + codon,
    codeHead: "CODE[a, b, c]: el residuo de cada codón",
    resHead: "residuo",
    first: (b) => "1.ª base " + b,
    perHead: (cells) => "celdas por residuo, " + cells + " en total",
    owns: (aa) => "codones de " + aa,
    many: (k) => (k === 1 ? "1 codón" : k + " codones"),
    controls: {n: "Qué codón"},
    options: {},
    read: (f) =>
      "<b>codón " + (f.n + 1) + " = " + f.codon + " → " + (f.aa === GC.STOP ? "alto" : f.aa) +
      "</b> · " + f.same.length + " de " + f.cells + " celdas lo codifican · la tabla gasta " +
      f.cells + " celdas en " + f.residues + " residuos y un alto",
    np: {
      uvw: "tres filas one-hot, (4,) cada una",
      k: "(4, 4, 4): rango uno",
      sum: "1: una sola celda encendida",
      aa: "CODE guarda índices de residuo",
      res: (i, letter) => i === 20 ? "20 es el alto" : "el índice " + i + " es " + letter
    }
  };

  window.GenomeScenes.register({
    id: "translate", section: "06",
    hl: ["codon", "base", "aa"],
    copy: {en: EN, es: ES},

    controls: [
      {id: "n", type: "range", min: 0, max: GC.codonCount(GC.CDS) - 1, step: 1,
       fmt: (v, ctx) => (v + 1) + " · " + (ctx ? GC.codonAt(ctx.seq, v) : "")}
    ],

    init(ctx) {
      ctx.state.n = 0;
    },

    draw(ctx) {
      const svg = ctx.svg, c = ctx.copy, f = facts(ctx), lit = ctx.hl;
      const name = f.aa === GC.STOP ? c.stop : f.aa;
      const baseTok = (b) => "--gb-" + "acgt"[b];

      // Headings.
      K.label(svg, L.codonX - 10, L.headY, c.codonHead(f.n + 1, f.codon),
        {size: 11, colour: lit === "codon" ? "--gn-hit" : "--stage-mute"});
      K.label(svg, L.sliceX - 6, L.headY, c.codeHead, {size: 11, colour: "--gn-core"});
      K.label(svg, L.resX, L.headY, c.resHead,
        {size: 11, anchor: "middle", colour: lit === "aa" ? "--gn-hit" : "--stage-mute"});

      // The codon: three one-hot rows, each the base it names.
      for (let j = 0; j < 4; j++) {
        K.label(svg, L.codonX + j * L.cell + L.cell / 2, L.colY, GC.BASES[j], {
          size: 10, anchor: "middle",
          colour: lit === "base" ? baseTok(j) : "--stage-mute"
        });
      }
      const rows = GC.oneHot(f.codon);
      K.numGrid(svg, rows, {
        x: L.codonX, y: L.gridY, cellW: L.cell, cellH: L.cell, digits: 0,
        at: (i, j) => (rows[i][j] ? (lit === "codon" ? "--gn-hit" : baseTok(j)) : null)
      });
      for (let i = 0; i < 3; i++) {
        K.label(svg, L.codonX - 8, L.gridY + i * L.cell + L.cell / 2, f.codon[i], {
          size: 12, anchor: "end", baseline: "middle", colour: baseTok(GC.baseIndex(f.codon[i]))
        });
      }

      // The table: four slices, one per first base. Rows are the second base,
      // columns the third; every cell carries its residue's letter and tint.
      const sw = 4 * L.sliceCell;
      for (let a = 0; a < 4; a++) {
        const x0 = L.sliceX + a * (sw + L.sliceGap), y0 = L.gridY;
        const here = f.cell[0] === a;
        K.label(svg, x0, L.titleY, c.first(GC.BASES[a]),
          {size: 11, colour: here ? "--stage-ink" : "--stage-mute"});
        for (let k = 0; k < 4; k++) {
          K.label(svg, x0 + k * L.sliceCell + L.sliceCell / 2, L.colY, GC.BASES[k], {
            size: 10, anchor: "middle", colour: lit === "base" ? baseTok(k) : "--stage-mute"
          });
        }
        if (a === 0) {
          for (let b = 0; b < 4; b++) {
            K.label(svg, x0 - 6, y0 + b * L.sliceCell + L.sliceCell / 2, GC.BASES[b], {
              size: 10, anchor: "end", baseline: "middle",
              colour: lit === "base" ? baseTok(b) : "--stage-mute"
            });
          }
        }
        for (let b = 0; b < 4; b++) {
          for (let k = 0; k < 4; k++) {
            const r = GC.CODE_T[a][b][k], x = x0 + k * L.sliceCell, y = y0 + b * L.sliceCell;
            const chosen = here && f.cell[1] === b && f.cell[2] === k;
            const kin = lit === "aa" && r === f.idx;
            svg.appendChild(K.el("rect", {
              x: x + 0.5, y: y + 0.5, width: L.sliceCell - 1, height: L.sliceCell - 1, rx: 2,
              fill: tint(r), "fill-opacity": chosen || kin ? 0.75 : 0.32
            }));
            svg.appendChild(K.el("text", {
              x: x + L.sliceCell / 2, y: y + L.sliceCell / 2 + 4, "text-anchor": "middle",
              "font-family": "var(--mono)", "font-size": 11.5, "font-weight": chosen ? 700 : 600,
              fill: K.css("--stage-ink")
            }, r === 20 ? GC.STOP : GC.AAS[r]));
            if (chosen || kin) {
              svg.appendChild(K.el("rect", {
                x: x + 1, y: y + 1, width: L.sliceCell - 2, height: L.sliceCell - 2, rx: 2,
                fill: "none", stroke: K.css(chosen ? "--stage-ink" : "--gn-hit"),
                "stroke-width": chosen ? 2.4 : 1.4
              }));
            }
          }
        }
      }

      // The answer, large, and how many codons say it.
      K.label(svg, L.resX, 240, name === c.stop ? GC.STOP : name, {
        size: 64, anchor: "middle", colour: lit === "aa" ? "--gn-hit" : "--stage-ink",
        stroke: lit === "aa" ? "--gn-hit" : null
      });
      K.label(svg, L.resX, 272, c.many(f.same.length), {size: 12, anchor: "middle"});

      // The redundancy as a count: one bar per symbol, this residue's lit.
      K.label(svg, L.barX, L.barY - 14, c.perHead(f.cells), {size: 11, colour: "--stage-mute"});
      const most = Math.max(...f.count), gap = 2;
      const bw = (L.barW - gap * (f.count.length - 1)) / f.count.length;
      f.count.forEach((cnt, i) => {
        const h = Math.max(1, (cnt / most) * L.barH), x = L.barX + i * (bw + gap);
        const on = i === f.idx;
        svg.appendChild(K.el("rect", {
          x: x.toFixed(2), y: (L.barY + L.barH - h).toFixed(2), width: bw.toFixed(2),
          height: h.toFixed(2), fill: tint(i), "fill-opacity": on ? 1 : 0.4
        }));
        K.label(svg, x + bw / 2, L.letY, f.symbols[i], {
          size: 10, anchor: "middle", pad: 1, colour: on ? "--stage-ink" : "--stage-mute"
        });
      });

      // And the codons themselves, for the residue that is lit.
      K.label(svg, L.synX, L.barY - 14, c.owns(name === c.stop ? GC.STOP : name),
        {size: 11, colour: "--stage-mute"});
      K.label(svg, L.synX, L.barY + 16, f.same.join(" "), {size: 12});
    },

    readout(ctx) {
      const f = facts(ctx), c = ctx.copy;
      return {
        html: c.read(f),
        claim: c.claim(f.n + 1, f.codon, f.aa === GC.STOP ? c.stop : f.aa, f.cells, f.residues),
        data: {n: String(f.n), codon: f.codon, aa: f.aa, cell: f.cell.join(","),
               synonyms: String(f.same.length), cells: String(f.cells)}
      };
    },

    code(ctx) {
      const f = facts(ctx), np = ctx.copy.np;
      return K.code([
        ['u, v, w = one_hot("' + f.codon + '")', np.uvw],
        ['K = np.einsum("a,b,c->abc", u, v, w)', np.k],
        ["K.sum()", np.sum],
        ['aa = np.einsum("abc,abc->", K, CODE)', np.aa],
        ["AAS[aa]", np.res(f.idx, f.aa)]
      ]);
    }
  });
})();
