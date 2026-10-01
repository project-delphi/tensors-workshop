// Scene 5: translation is one contraction. The ribosome reads the mRNA three
// letters at a time; each codon is three one-hot rows, and those rows pick one
// cell of the genetic code -- the first base a slice, the second a row, the
// third a column -- and the residue in that cell joins the protein. The
// stage is that, top to bottom: the mRNA strip scrolling through its
// ribosome, the contraction (three rows, four slices, the one cell where the
// three meet, the residue), and the protein so far, sixty slots that fill.
// A `third` control swaps only the third base of the current codon, which is
// this page's first real edit: where the code's blocks of one colour pay off.
// Flat SVG: a 4 x 4 x 4 is four pages, and the cube has its own scene.
// See genome-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const GC = window.GenomeCore, K = window.GenomeKit;

  const N = GC.codonCount(GC.CDS);   // 60
  const ENTRANCE = 1200;             // ms: the selection lands, the residue drops
  // The board is 820 x 500. Everything below is laid out from these numbers.
  const S = {cx: 410, cp: 110, bp: 34, tw: 31, th: 32, ty: 78};       // the mRNA strip
  const C = {gx: 48, gy: 184, gc: 37, sx: 248, sy: 184, sc: 28, sg: 8, rx: 736, ry: 190, rs: 74};
  const P = {x: 20, pitch: 26, y: 426, rowGap: 30, w: 24, h: 26};      // the chain
  const ST = 4 * C.sc + C.sg;        // one slice plus its gap

  const AA3 = {A: "Ala", C: "Cys", D: "Asp", E: "Glu", F: "Phe", G: "Gly", H: "His", I: "Ile",
               K: "Lys", L: "Leu", M: "Met", N: "Asn", P: "Pro", Q: "Gln", R: "Arg", S: "Ser",
               T: "Thr", V: "Val", W: "Trp", Y: "Tyr"};
  const toRna = (s) => s.replace(/T/g, "U");
  const toDna = (s) => s.replace(/U/g, "T");
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const tint = (idx) => K.residueTint(idx);

  // Every number the picture and the readout share. `edit` is the codon after
  // the third-base swap; with no swap it is the codon itself.
  function facts(ctx) {
    const s = ctx.state;
    const n = Math.max(0, Math.min(N - 1, s.n));
    const dna = GC.codonAt(ctx.seq, n);
    const third = s.third === "same" ? dna[2] : toDna(s.third);
    const editDna = dna.slice(0, 2) + third;
    const edited = editDna !== dna;
    const cellOf = (cd) => {
      const T = GC.codonTensor(cd);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) {
        if (T[i][j][k]) return [i, j, k];
      }
      return [0, 0, 0];
    };
    const aa = GC.translateByContraction(dna), aaEdit = GC.translateByContraction(editDna);
    if (!ctx.cache.chain) {
      ctx.cache.chain = GC.translate(ctx.seq);
      ctx.cache.mrna = toRna(ctx.seq);
      ctx.cache.wobble = GC.wobbleSilent(ctx.seq);
    }
    const cell = cellOf(dna), cellEdit = cellOf(editDna);
    const idxOf = (c) => GC.CODE_T[c[0]][c[1]][c[2]];
    const swaps = GC.thirdSwaps(dna);
    const silentSwaps = swaps.filter((r, k) => GC.BASES[k] !== dna[2] && r === aa).length;
    return {
      n, dna, rna: toRna(dna), editRna: toRna(editDna), edited, aa, aaEdit, cell, cellEdit,
      idx: idxOf(cell), idxEdit: idxOf(cellEdit), silent: aa === aaEdit,
      synonyms: GC.synonymCount(idxOf(cell)), cells: 64,
      swaps, silentSwaps, wobble: ctx.cache.wobble, chain: ctx.cache.chain, mrna: ctx.cache.mrna
    };
  }

  const EN = {
    tab: "translate",
    k: "Section 06 · translation",
    h: "Translation is one contraction: three one-hot rows pick 1 cell of 64",
    predict: "Before you change it: swap only the third base of this codon. Will the residue " +
             "change — and for how many of the gene's 60 codons would no swap of the third " +
             "base change it?",
    concept: "A codon is the product of three one-hot vectors: a 4 × 4 × 4 with a single 1. " +
             "Multiply it into the code table and sum over all three base axes, and one " +
             "residue is all that survives.",
    b: "The ribosome reads the mRNA three letters at a time. Each codon is three one-hot rows: " +
       "the first base picks a slice of the code table, the second a row, the third a " +
       "column, and one cell lights where they meet. Its residue joins the chain below. It " +
       "is the same answer a table lookup gives, written so that one einsum does all 60 " +
       "codons at once. The table's axes run A C G T as everywhere on this page, with U " +
       "written for T: the relabel the transcription scene showed moves no number. Step or " +
       "play along the gene, then change only the third base.",
    eqcap: "p[n] is the residue of codon n. K[n] is that codon's 4 × 4 × 4 tensor, a single 1 " +
           "at [a, b, c], and G is the code table. The sum runs over all three base axes, so " +
           "exactly one entry of G survives.",
    claim: (num, rna, nm, edited, to, silent) => !edited
      ? "codon " + num + " = " + rna + " → " + nm + " · one cell of 64"
      : "codon " + num + " edited: " + rna + " → " + to + (silent ? " · silent" : " · " + nm + " changes"),
    aria: (ctx) => {
      const f = facts(ctx);
      return "Translation of codon " + (f.n + 1) + " of 60, " + f.rna + ", read from the mRNA: its " +
             "three one-hot rows pick one cell of the genetic code, four slices of 4 by 4, and " +
             "the residue " + (f.aaEdit === GC.STOP ? "stop" : AA3[f.aaEdit]) + " joins a protein " +
             "that is " + (f.n + 1) + " residues long." + (f.edited ? " The third base was swapped from " +
             f.rna + " to " + f.editRna + "." : "");
    },
    stop: "stop",
    mrna: "mRNA 5′ →",
    ribosome: "ribosome",
    oneHead: (num, rna) => "codon " + num + " = " + rna,
    sliceHead: (b) => "a = " + b,
    resHead: "residue",
    calcCap: "G: slice a, row b, column c · axes A C G U, the code's T written U",
    calc1: (cell) => "K[a,b,c] = u[a]·v[b]·w[c]  →  63 zeros, a single 1 at " + K.idx(cell),
    calc2: (cell, letter, nm) => "Σ K·G = 1 · G" + K.idx(cell) + " = " + letter + " · " + nm,
    editLine: (a, b, from, to, silent) => a + " → " + b + " · " + (silent
      ? from + " stays " + to + ": silent" : from + " becomes " + to),
    chainHead: (n) => "protein so far: " + n + " of " + N + " residues",
    tip: (num, rna, nm) => "codon " + num + " = " + rna + " → " + nm,
    controls: {n: "Which codon", third: "Third base", play: "▶ Translate"},
    options: {third: {same: "as written", A: "A", C: "C", G: "G", U: "U"}},
    read: (f, nm) => {
      const list = GC.BASES.split("").map((b, k) => ({b, r: f.swaps[k]})).filter((x) => x.b !== f.dna[2])
        .map((x) => f.rna.slice(0, 2) + toRna(x.b) + " " + nm(x.r)).join(", ");
      const wob = " In this gene, for <b>" + f.wobble + " of the 60 codons</b> no swap of the third " +
                  "base changes the residue.";
      if (f.edited) {
        return "<b>" + f.rna + " → " + f.editRna + ": " + nm(f.aa) +
               (f.silent ? " stays " + nm(f.aaEdit) + "</b>, a silent change" : " becomes " + nm(f.aaEdit) + "</b>") +
               " · the lit cell moved along its row, from G" + K.idx(f.cell) + " to G" + K.idx(f.cellEdit) + "." + wob;
      }
      return "<b>codon " + (f.n + 1) + " = " + f.rna + " → " + nm(f.aa) + "</b> · the lit cell is G" +
             K.idx(f.cell) + ". Swapping only its third base gives " + list + ": " + f.silentSwaps +
             " of the 3 are silent." + wob;
    },
    np: {
      u: "three rows, (4,) each",
      swap: "the third base, swapped",
      k: "(4, 4, 4): a single 1",
      p: "sum over a, b and c",
      aa: (l) => "'" + l + "'",
      all: "all 60 codons, no loop"
    }
  };

  const ES = {
    tab: "traducir",
    k: "Sección 06 · traducción",
    h: "Traducir es una contracción: tres filas one-hot eligen 1 celda de 64",
    predict: "Antes de cambiarlo: cambia solo la tercera base de este codón. ¿Cambiará el " +
             "residuo — y para cuántos de los 60 codones del gen ningún cambio de la tercera " +
             "base lo cambiaría?",
    concept: "Un codón es el producto de tres vectores one-hot: un 4 × 4 × 4 con un solo 1. " +
             "Multiplícalo por la tabla del código y suma sobre los tres ejes de bases: lo " +
             "único que sobrevive es un residuo.",
    b: "El ribosoma lee el ARNm de tres en tres letras. Cada codón son tres filas one-hot: la " +
       "primera base elige un corte de la tabla del código, la segunda una fila, la tercera " +
       "una columna, y se enciende la celda donde se cruzan. Su residuo se suma a la cadena " +
       "de abajo. Es la misma respuesta que da una consulta a la tabla, escrita para que un " +
       "solo einsum haga los 60 codones a la vez. Los ejes de la tabla van A C G T, como en " +
       "toda la página, con U escrita por T: el cambio de etiqueta que mostró la " +
       "transcripción no mueve ningún número. Recorre el gen y cambia solo la tercera base.",
    eqcap: "p[n] es el residuo del codón n. K[n] es el tensor de 4 × 4 × 4 de ese codón, con un " +
           "solo 1 en [a, b, c], y G es la tabla del código. La suma recorre los tres ejes de " +
           "bases, así que sobrevive exactamente una entrada de G.",
    claim: (num, rna, nm, edited, to, silent) => !edited
      ? "codón " + num + " = " + rna + " → " + nm + " · una celda de 64"
      : "codón " + num + " editado: " + rna + " → " + to + (silent ? " · silencioso" : " · " + nm + " cambia"),
    aria: (ctx) => {
      const f = facts(ctx);
      return "Traducción del codón " + (f.n + 1) + " de 60, " + f.rna + ", leído del ARNm: sus tres " +
             "filas one-hot eligen una celda del código genético, cuatro cortes de 4 por 4, y el " +
             "residuo " + (f.aaEdit === GC.STOP ? "alto" : AA3[f.aaEdit]) + " se suma a una proteína " +
             "de " + (f.n + 1) + " residuos." + (f.edited ? " Se cambió la tercera base de " +
             f.rna + " a " + f.editRna + "." : "");
    },
    stop: "alto",
    mrna: "ARNm 5′ →",
    ribosome: "ribosoma",
    oneHead: (num, rna) => "codón " + num + " = " + rna,
    sliceHead: (b) => "a = " + b,
    resHead: "residuo",
    calcCap: "G: corte a, fila b, columna c · ejes A C G U, la T del código escrita U",
    calc1: (cell) => "K[a,b,c] = u[a]·v[b]·w[c]  →  63 ceros, un solo 1 en " + K.idx(cell),
    calc2: (cell, letter, nm) => "Σ K·G = 1 · G" + K.idx(cell) + " = " + letter + " · " + nm,
    editLine: (a, b, from, to, silent) => a + " → " + b + " · " + (silent
      ? from + " sigue siendo " + to + ": silencioso" : from + " pasa a ser " + to),
    chainHead: (n) => "proteína hasta ahora: " + n + " de " + N + " residuos",
    tip: (num, rna, nm) => "codón " + num + " = " + rna + " → " + nm,
    controls: {n: "Qué codón", third: "Tercera base", play: "▶ Traducir"},
    options: {third: {same: "como está escrito", A: "A", C: "C", G: "G", U: "U"}},
    read: (f, nm) => {
      const list = GC.BASES.split("").map((b, k) => ({b, r: f.swaps[k]})).filter((x) => x.b !== f.dna[2])
        .map((x) => f.rna.slice(0, 2) + toRna(x.b) + " " + nm(x.r)).join(", ");
      const wob = " En este gen, para <b>" + f.wobble + " de los 60 codones</b> ningún cambio de la " +
                  "tercera base altera el residuo.";
      if (f.edited) {
        return "<b>" + f.rna + " → " + f.editRna + ": " + nm(f.aa) +
               (f.silent ? " sigue siendo " + nm(f.aaEdit) + "</b>, un cambio silencioso" : " pasa a ser " + nm(f.aaEdit) + "</b>") +
               " · la celda encendida se movió a lo largo de su fila, de G" + K.idx(f.cell) + " a G" + K.idx(f.cellEdit) + "." + wob;
      }
      return "<b>codón " + (f.n + 1) + " = " + f.rna + " → " + nm(f.aa) + "</b> · la celda encendida es G" +
             K.idx(f.cell) + ". Cambiar solo su tercera base da " + list + ": " + f.silentSwaps +
             " de las 3 son silenciosas." + wob;
    },
    np: {
      u: "tres filas, (4,) cada una",
      swap: "la tercera base, cambiada",
      k: "(4, 4, 4): un solo 1",
      p: "suma sobre a, b y c",
      aa: (l) => "'" + l + "'",
      all: "los 60 codones, sin bucle"
    }
  };

  const nameOf = (c) => (l) => (l === GC.STOP ? c.stop : AA3[l]);

  window.GenomeScenes.register({
    id: "translate", section: "06",
    hl: ["codon", "base", "aa"],
    copy: {en: EN, es: ES},

    controls: [
      {id: "n", type: "range", min: 0, max: N - 1, step: 1,
       fmt: (v, ctx) => (v + 1) + " · " + (ctx ? toRna(GC.codonAt(ctx.seq, v)) : "")},
      {id: "play", type: "play", target: "n", rate: 4},
      {id: "third", type: "select", options: ["same", "A", "C", "G", "U"]}
    ],

    init(ctx) {
      ctx.state.n = 0;
      ctx.state.third = "same";
      ctx.state.prev = {n: 0, third: "same"};
    },

    // A swap belongs to the codon it was made on: move to another and the
    // third base goes back to what the gene says. Both changing at once (a
    // test, a link) is taken as a deliberate pair and left alone.
    sync(ctx) {
      const s = ctx.state;
      s.n = Math.max(0, Math.min(N - 1, s.n));
      const prev = s.prev;
      if (prev && prev.n !== s.n && prev.third === s.third) s.third = "same";
      s.prev = {n: s.n, third: s.third};
      const inp = ctx.control ? ctx.control("third") : null;
      if (inp && inp.value !== s.third) inp.value = s.third;
    },

    arrive(ctx) { ctx.cache.arrive = ctx.now(); ctx.cache.finished = false; },
    // The frame loop paints only while this is true, so the entrance reports
    // one more frame after it ends: that paint is the finished picture, and a
    // stalled frame (a busy tab) can never leave it half-done.
    animates(ctx) {
      const ch = ctx.cache;
      if (K.arrival(ctx, ENTRANCE) >= 1 && ch.arrive !== undefined && !ch.finished) {
        ch.finished = true;
        return true;
      }
      return K.arrival(ctx, ENTRANCE) < 1 ||
        ["u", "sa", "sb", "sc", "len"].some((k) => ch[k] && ch[k].moving);
    },

    pick(ctx, key) {
      if (key.startsWith("cod:") || key.startsWith("res:")) ctx.setControls({n: Number(key.slice(4))});
    },
    tip(ctx, key) {
      if (!key.startsWith("cod:") && !key.startsWith("res:")) return "";
      const m = Number(key.slice(4)), f = facts(ctx);
      const cd = GC.codonAt(ctx.seq, m);
      return ctx.copy.tip(m + 1, toRna(cd), nameOf(ctx.copy)(f.chain[m]));
    },
    seek(ctx, i) { ctx.setControls({n: Math.max(0, Math.min(N - 1, Math.floor(i / 3)))}); },

    draw(ctx) {
      const svg = ctx.svg, c = ctx.copy, s = ctx.state, f = facts(ctx), lit = ctx.hl;
      const nm = nameOf(c), now = ctx.now(), inst = ctx.instant;
      const pr = K.arrival(ctx, ENTRANCE);
      const ph = (a, b) => K.smooth(clamp01((pr - a) / (b - a)));
      const eSlice = ph(0, 0.2), eRow = ph(0.2, 0.4), eCol = ph(0.4, 0.6), eCell = ph(0.6, 0.75);
      const drop = ph(0.75, 1);
      const u = K.chase(ctx.cache, "u", f.n, now, 0.09, inst);
      const sa = K.chase(ctx.cache, "sa", f.cellEdit[0], now, 0.07, inst);
      const sb = K.chase(ctx.cache, "sb", f.cellEdit[1], now, 0.07, inst);
      const sc = K.chase(ctx.cache, "sc", f.cellEdit[2], now, 0.07, inst);
      const len = K.chase(ctx.cache, "len", f.n + (pr >= 1 ? 1 : 0), now, 0.1, inst);
      const editTok = f.silent ? "--gn-hit" : "--gn-miss";
      const baseTok = (l) => K.BASE_TOKEN[l];

      // ---- 1. the mRNA, scrolling through the ribosome.
      K.text(svg, 30, 66, c.mrna, {size: 12.5, colour: "--gn-rna"});
      svg.appendChild(K.el("rect", {
        x: S.cx - 58, y: 70, width: 116, height: 54, rx: 14,
        fill: K.css("--gn-rna"), "fill-opacity": 0.13,
        stroke: K.css(lit === "codon" ? "--gn-hit" : "--gn-rna"), "stroke-width": lit === "codon" ? 3 : 2
      }));
      K.label(svg, S.cx, 66, c.ribosome, {size: 12.5, anchor: "middle", colour: "--gn-rna"});
      for (let m = Math.max(0, Math.floor(u) - 4); m <= Math.min(N - 1, Math.ceil(u) + 4); m++) {
        const d = m - u, k = clamp01((3.8 - Math.abs(d)) / 0.8);
        if (k < 0.05) continue;
        const cx = S.cx + d * S.cp, here = m === f.n;
        const rna = f.mrna.substr(m * 3, 3);
        for (let j = 0; j < 3; j++) {
          let letter = rna[j];
          const swapped = here && j === 2 && f.edited;
          if (swapped) letter = f.editRna[2];
          const w = S.tw * k, x = cx + (j - 1) * S.bp - w / 2;
          K.tile(svg, x, S.ty, w, S.th, k > 0.9 ? letter : "", {
            solid: here, font: 18, pick: "cod:" + m,
            ring: swapped ? editTok : null, token: baseTok(letter)
          });
        }
        if (k > 0.2) {
          const hw = 51 * k;
          svg.appendChild(K.el("polyline", {
            points: (cx - hw).toFixed(1) + ",112 " + (cx - hw).toFixed(1) + ",117 " +
                    (cx + hw).toFixed(1) + ",117 " + (cx + hw).toFixed(1) + ",112",
            fill: "none", stroke: K.css(here ? "--gn-rna" : "--stage-mute"), "stroke-width": 2,
            "stroke-linecap": "round", "stroke-linejoin": "round"
          }));
        }
      }

      // The rows flow down from the codon in the ribosome into the grid.
      svg.appendChild(K.el("polyline", {
        points: "410,124 410,143 180,143 180,156", fill: "none", stroke: K.css("--gn-rna"),
        "stroke-width": 2, "stroke-linejoin": "round"
      }));
      svg.appendChild(K.el("polygon", {points: "174,155 186,155 180,162", fill: K.css("--gn-rna")}));

      // ---- 2a. the codon as three one-hot rows.
      K.label(svg, C.gx, 160, c.oneHead(f.n + 1, f.editRna), {size: 13, colour: lit === "codon" ? "--gn-hit" : "--stage-ink"});
      const rows = GC.oneHot(toDna(f.editRna));
      for (let j = 0; j < 4; j++) {
        K.tile(svg, C.gx + j * C.gc + 3, 165, C.gc - 6, 16, GC.RNA_BASES[j], {
          solid: false, font: 12, token: baseTok(GC.RNA_BASES[j])
        });
      }
      for (let i = 0; i < 3; i++) {
        K.text(svg, 26, C.gy + i * C.gc + C.gc / 2 + 5, "abc"[i], {size: 15, anchor: "middle", colour: "--stage-mute"});
        for (let j = 0; j < 4; j++) {
          const hot = rows[i][j] === 1, tok = baseTok(GC.RNA_BASES[j]);
          svg.appendChild(K.el("rect", {
            x: C.gx + j * C.gc + 1.5, y: C.gy + i * C.gc + 1.5, width: C.gc - 3, height: C.gc - 3, rx: 4,
            fill: K.css(hot ? tok : "--stage-chip"),
            stroke: K.css(hot ? (lit === "base" ? "--stage-ink" : tok) : "--stage-mute"),
            "stroke-width": hot && lit === "base" ? 3 : 1.2, "stroke-opacity": hot ? 1 : 0.5
          }));
          K.text(svg, C.gx + j * C.gc + C.gc / 2, C.gy + i * C.gc + C.gc / 2 + 6, hot ? "1" : "0",
            {size: hot ? 19 : 15, anchor: "middle", weight: 700, colour: hot ? "--stage" : "--stage-mute"});
        }
      }
      K.text(svg, 214, C.gy + 1.5 * C.gc + 8, "→", {size: 24, anchor: "middle", colour: "--stage-mute"});

      // ---- 2b. the code table as four slices: a picks the slice, b the row, c the column.
      const sx = (a) => C.sx + a * ST;
      for (let a = 0; a < 4; a++) {
        const here = a === f.cellEdit[0] && eSlice > 0.5;
        K.label(svg, sx(a) + 2 * C.sc, 158, c.sliceHead(GC.RNA_BASES[a]), {
          size: 13, anchor: "middle", colour: here ? "--stage-ink" : "--stage-mute",
          stroke: here ? "--stage-ink" : null
        });
        for (let k = 0; k < 4; k++) {
          const on = here && k === f.cellEdit[2] && eCol > 0.5;
          K.tile(svg, sx(a) + k * C.sc + 2, 165, C.sc - 4, 16, GC.RNA_BASES[k], {
            solid: on, font: 12, token: baseTok(GC.RNA_BASES[k])
          });
        }
        for (let b = 0; b < 4; b++) {
          if (a === 0) {
            const on = here && b === f.cellEdit[1] && eRow > 0.5;
            K.tile(svg, sx(0) - 24, C.sy + b * C.sc + 3, 20, C.sc - 6, GC.RNA_BASES[b], {
              solid: on, font: 13, token: baseTok(GC.RNA_BASES[b])
            });
          }
          for (let k = 0; k < 4; k++) {
            const r = GC.CODE_T[a][b][k];
            K.tile(svg, sx(a) + k * C.sc + 1, C.sy + b * C.sc + 1, C.sc - 2, C.sc - 2,
              r === 20 ? GC.STOP : GC.AAS[r], {
                solid: here, font: 15, rx: 3, token: tint(r),
                ring: lit === "aa" && r === f.idxEdit ? "--gn-hit" : null
              });
          }
        }
      }
      const ink = "--stage-ink", edge = (o, w) => ({fill: "none", stroke: K.css(ink), "stroke-width": w, "stroke-opacity": o.toFixed(2)});
      const X = sx(sa), Y = C.sy;
      svg.appendChild(K.el("rect", Object.assign({x: X - 4, y: Y - 4, width: 4 * C.sc + 8, height: 4 * C.sc + 8, rx: 5}, edge(eSlice, 2))));
      svg.appendChild(K.el("rect", Object.assign({x: X - 1, y: Y + sb * C.sc - 1, width: 4 * C.sc + 2, height: C.sc + 2, rx: 3}, edge(eRow, 2))));
      svg.appendChild(K.el("rect", Object.assign({x: X + sc * C.sc - 1, y: Y - 1, width: C.sc + 2, height: 4 * C.sc + 2, rx: 3}, edge(eCol, 2))));
      if (f.edited && f.cellEdit[0] === f.cell[0]) {
        svg.appendChild(K.el("rect", {
          x: sx(f.cell[0]) + f.cell[2] * C.sc + 1, y: Y + f.cell[1] * C.sc + 1, width: C.sc - 2, height: C.sc - 2, rx: 3,
          fill: "none", stroke: K.css("--stage-mute"), "stroke-width": 2, "stroke-dasharray": "3 3", "stroke-opacity": eCell.toFixed(2)
        }));
      }
      svg.appendChild(K.el("rect", Object.assign({
        x: X + sc * C.sc - 2, y: Y + sb * C.sc - 2, width: C.sc + 4, height: C.sc + 4, rx: 4
      }, edge(eCell, 3.4))));
      K.text(svg, 728, C.sy + 2 * C.sc + 6, "=", {size: 22, anchor: "middle", colour: "--stage-mute"});

      // ---- 2c. the residue.
      const resX = C.rx + C.rs / 2;
      K.label(svg, resX, 158, c.resHead, {size: 12.5, anchor: "middle", colour: lit === "aa" ? "--gn-hit" : "--stage-mute"});
      const letter = f.aaEdit, tok = tint(f.idxEdit);
      const landed = pr >= 1;
      if (eCell > 0.95) {
        K.tile(svg, C.rx, C.ry, C.rs, C.rs, letter === GC.STOP ? GC.STOP : letter, {
          font: 48, rx: 10, token: tok, ring: lit === "aa" ? "--gn-hit" : (f.edited ? editTok : null)
        });
      } else {
        svg.appendChild(K.el("rect", {
          x: C.rx, y: C.ry, width: C.rs, height: C.rs, rx: 10, fill: "none",
          stroke: K.css("--stage-mute"), "stroke-width": 1.4, "stroke-dasharray": "4 4"
        }));
      }
      if (eCell > 0.95) {
        K.text(svg, resX, C.ry + C.rs + 26, (letter === GC.STOP ? GC.STOP : letter) + " · " + nm(letter),
          {size: 18, anchor: "middle", colour: "--stage-ink"});
      }

      // ---- the arithmetic, in words, and the edit's verdict.
      K.text(svg, 30, 322, c.calcCap, {size: 12.5, colour: "--stage-mute"});
      K.text(svg, 30, 346, c.calc1(f.cellEdit), {size: 15, colour: "--stage-ink"});
      K.text(svg, 30, 370, c.calc2(f.cellEdit, f.aaEdit, nm(f.aaEdit)), {size: 15, colour: "--stage-ink"});
      if (f.edited) {
        K.text(svg, 30, 396, c.editLine(f.rna, f.editRna, nm(f.aa), nm(f.aaEdit), f.silent),
          {size: 15, weight: 700, colour: editTok});
      }

      // ---- 3. the protein so far: sixty slots, filling.
      K.text(svg, P.x, 418, c.chainHead(f.n + 1), {size: 12.5, colour: "--stage-mute"});
      const slot = (m) => [P.x + (m % 30) * P.pitch, P.y + Math.floor(m / 30) * P.rowGap];
      for (let m = 0; m < N; m++) {
        const [x, y] = slot(m);
        const e = K.smooth(clamp01(len - m));
        if (e < 0.02) {
          svg.appendChild(K.el("rect", {
            x: x + 0.6, y: y + 0.6, width: P.w - 1.2, height: P.h - 1.2, rx: 4, fill: "none",
            stroke: K.css("--stage-mute"), "stroke-width": 1, "stroke-opacity": 0.55
          }));
          continue;
        }
        const w = P.w * e, h = P.h * e;
        const l = m === f.n ? f.aaEdit : f.chain[m];
        const newest = m === f.n && e > 0.98;
        const sameAA = lit === "aa" && l === f.aaEdit;
        K.tile(svg, x + (P.w - w) / 2, y + (P.h - h) / 2, w, h, e > 0.9 ? l : "", {
          font: 15, rx: 4, token: tint(l === GC.STOP ? 20 : GC.aaIndex(l)), pick: "res:" + m,
          ring: sameAA ? "--gn-hit" : (newest ? (f.edited ? editTok : "--stage-ink") : (ctx.hover === "res:" + m ? "--stage-ink" : null))
        });
      }
      // The residue falling from the answer into its slot, once, on arrival.
      if (!landed && drop > 0) {
        const [tx, ty] = slot(f.n);
        const x = C.rx + (tx - C.rx) * drop, y = C.ry + (ty - C.ry) * drop;
        const w = C.rs + (P.w - C.rs) * drop, h = C.rs + (P.h - C.rs) * drop;
        K.tile(svg, x, y, w, h, drop > 0.5 ? "" : letter, {font: 48 * (1 - drop) + 15 * drop, rx: 8, token: tok});
      }
    },

    readout(ctx) {
      const f = facts(ctx), c = ctx.copy, nm = nameOf(c), s = ctx.state;
      return {
        html: c.read(f, nm),
        claim: c.claim(f.n + 1, f.rna, nm(f.aa), f.edited, f.editRna, f.silent),
        lens: {a: 3 * f.n, b: 3 * f.n + 3, done: [0, 3 * f.n + 3]},
        data: {
          n: String(f.n), codon: f.rna, aa: f.aa, cell: f.cell.join(","),
          synonyms: String(f.synonyms), cells: String(f.cells),
          third: String(s.third), edited: f.aaEdit, editedcodon: f.editRna,
          editedcell: f.cellEdit.join(","), silent: f.silent ? "1" : "0", wobble: String(f.wobble)
        }
      };
    },

    code(ctx) {
      const f = facts(ctx), np = ctx.copy.np;
      const rows = [['u, v, w = one_hot_rna(mrna[3*n:3*n+3])', np.u]];
      if (f.edited) rows.push(['w = one_hot_rna("' + f.editRna[2] + '")', np.swap]);
      rows.push(['K = np.einsum("a,b,c->abc", u, v, w)', np.k]);
      rows.push(['p = np.einsum("abc,abc->", K, CODE)', np.p]);
      rows.push(["AAS[p]", np.aa(f.aaEdit)]);
      rows.push(['np.einsum("nabc,abc->n", K_all, CODE)', np.all]);
      return K.code(rows);
    }
  });
})();
