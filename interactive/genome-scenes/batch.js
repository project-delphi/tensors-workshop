// Scene 8: a batch is one more index in the same einsum, and the last scene
// of the page. The picture is the whole operation in one frame: each guide as
// the row of bases it is (the ones changed from guide 1 ringed), beside the
// row of 161 scores it earns, one per window; under them the selected row as
// the bar profile the search scene drew; under that the einsum itself, with
// the letters it sums away marked apart from the two it keeps. The guides are
// independent of one another, which is what makes g a batch axis -- unlike the
// window axis, whose neighbours overlap by 19 of their 20 bases.
// Flat SVG. See genome-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const GC = window.GenomeCore, K = window.GenomeKit;

  // The first guide is the window that starts at base 41 (index 40): the only
  // one of the 161 that the core scores a full 20 against.
  const SOURCE = 40, WIDTH = 20;
  const ENTRANCE = 1400, BORN = 450;
  // The frame repaints only while animates() is true, so it has to stay true
  // one beat past the end or the last paint is a frame short of finished.
  const SETTLE = 120;
  // The 820 x 500 board. The tiles sit left, the grid right, and the profile
  // under the grid shares its x axis, so a column of the grid is a bar below.
  const X = {lab: 8, tile0: 38, pitch: 14.4, tw: 13.9, g0: 336, gw: 398, end: 740};
  const Y = {head: 66, top: 78, area: 204, cap: 298, bar0: 332, barH: 66, tick: 416,
             chip: 323, ein: 452, foot: 486};
  const PITCH_E = 11.4, EIN_X = 38, EIN_FONT = 19;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  function facts(ctx) {
    const s = ctx.state;
    const G = Math.max(1, Math.min(6, s.guides));
    const step = Math.max(0, Math.min(6, s.mismatch));
    const first = GC.windows(ctx.seq, WIDTH).at(SOURCE);
    const off = [], guides = [];
    for (let g = 0; g < G; g++) {
      off.push(Math.min(g * step, WIDTH));                 // a guide cannot miss more than it is long
      guides.push(GC.mutate(first, off[g]));
    }
    const S = GC.batchScores(guides, ctx.seq);
    const best = S.map((row) => GC.topMatches(row, 1)[0]);   // {at, score}, per row
    const W = S[0].length;
    const row = Math.max(0, Math.min(G - 1, s.row | 0));
    const col = s.col >= 0 ? Math.min(W - 1, s.col | 0) : -1;
    return {
      G, step, guides, off, S, best, W, total: G * W, row, col,
      exact: S.map((r) => r[SOURCE]),                        // the exact window's column
      column: col >= 0 ? S.map((r) => r[col]) : []
    };
  }

  // The row the profile reads out: the one under the pointer, else the
  // selected one. Hover repaints; it never reaches the readout.
  function rowOf(ctx, f) {
    const h = ctx.hover;
    if (h) {
      const m = /^(?:cell|row):(\d+)/.exec(h);
      if (m && Number(m[1]) < f.G) return Number(m[1]);
    }
    return f.row;
  }

  const EN = {
    tab: "batch",
    k: "Section 02 · a batch",
    h: "A batch is one more index: every guide gets its own row of window scores",
    predict: "Before you drag: the einsum is \"glb,wlb->gw\". Which letters are summed away, " +
             "and what shape is left for three guides?",
    concept: "g is one more index that nothing sums over, so it survives into the result: one " +
             "row per guide. The guides are independent of each other, which is what makes g a " +
             "batch axis; the window axis w survives too, but its neighbours overlap.",
    b: "Each guide is a row of bases on the left, with the bases changed from guide 1 ringed. " +
       "Beside it is the row of scores it earns against every window, brighter for a better " +
       "match, with its best window marked; the bars underneath read the selected row out as " +
       "the skyline from the search. Add guides, walk them further away, and click a cell to " +
       "pick a row and a window. A stretch of a gene became a grid: a window was a view, " +
       "the fold's distances a broadcast, and transcription, translation, the embedding and " +
       "the search each one multiplication on that grid.",
    eqcap: "The same contraction as the search: ℓ and b are summed away, while g and w are " +
           "kept, so every guide earns its own row of scores, one per window.",
    claim: (G, W, total) =>
      G + (G === 1 ? " guide" : " guides") + " × " + W + " windows = " + total +
      " scores, one einsum",
    aria: (ctx) => {
      const f = facts(ctx);
      return "Each of " + f.G + " guides as a row of " + WIDTH + " bases beside its row of " +
             f.W + " window scores, " + f.total + " scores in all, with each row's best " +
             "window marked. Below, the selected row as a bar profile and the einsum " +
             "glb,wlb->gw. The exact window scores " + f.exact.join(", ") +
             " from the first guide to the last.";
    },
    hQ: (G) => "guides  Q (" + G + ", " + WIDTH + ", 4)",
    hS: (G, W) => "scores  S (" + G + ", " + W + ")",
    legQ: WIDTH + " positions",
    capW: (W) => "w: " + W + " windows",
    rowEnd: (score, at) => score + "/" + WIDTH + " w" + (at + 1),
    cardRow: (g, k) => "g = " + g + " · " + k + (k === 1 ? " mismatch" : " mismatches") + " from g = 1",
    cardBest: (at) => ["best score", "at window " + at],
    hint: "click a cell or a bar",
    tag: (score, at) => score + " · w" + (at + 1),
    kept: "kept: they index S",
    summed: "summed away",
    foot: "the search's einsum, with one more letter in front: g",
    tip: (g, w, score) => "guide " + g + " · window " + w + " · " + score + " of " + WIDTH,
    controls: {guides: "How many guides", mismatch: "Mismatches per step", play: "▶ Add guides"},
    options: {},
    read: (f) =>
      "<b>" + f.G + (f.G === 1 ? " guide" : " guides") + " × " + f.W + " windows = " + f.total +
      " scores</b>: the einsum sums ℓ and b away and keeps g and w, so the result is shape (" +
      f.G + ", " + f.W + ") · each guide is " + f.step + " mismatches further from the first · " +
      "the exact window scores " + f.exact.join(", ") + " · row g = " + (f.row + 1) + " peaks at " +
      f.best[f.row].score + " of " + WIDTH + ", window " + (f.best[f.row].at + 1),
    np: {
      q: "one guide per row",
      w: "as before",
      s: "one more index",
      b: "best window per row",
      col: (list, at) => "window " + at + ": " + list.join(" ")
    }
  };

  const ES = {
    tab: "lote",
    k: "Sección 02 · un lote",
    h: "Un lote es un índice más: cada guía recibe su propia fila de puntuaciones",
    predict: "Antes de arrastrar: el einsum es \"glb,wlb->gw\". ¿Qué letras se suman y se " +
             "van, y qué forma queda con tres guías?",
    concept: "g es un índice más que ninguna suma recorre, así que sobrevive en el resultado: una " +
             "fila por guía. Las guías son independientes entre sí, y eso es lo que hace de g un " +
             "eje de lote; el eje de ventanas w también sobrevive, pero sus vecinas se solapan.",
    b: "Cada guía es una fila de bases a la izquierda, con las bases cambiadas respecto a la " +
       "guía 1 rodeadas. A su lado va la fila de puntuaciones que obtiene contra cada ventana, " +
       "más brillante cuanto mejor coincide, con su mejor ventana marcada; las barras de abajo " +
       "muestran la fila elegida como el perfil de la búsqueda. Añade guías, aléjalas más y " +
       "pulsa una celda para elegir una fila y una ventana. Un tramo de un gen se volvió una rejilla: una ventana era " +
       "una vista, las distancias del pliegue un broadcast, y la transcripción, la traducción, " +
       "el embedding y la búsqueda, cada una una multiplicación sobre esa rejilla.",
    eqcap: "La misma contracción de la búsqueda: ℓ y b se suman y desaparecen, mientras g y w " +
           "se conservan, así que cada guía obtiene su propia fila de puntuaciones.",
    claim: (G, W, total) =>
      G + (G === 1 ? " guía" : " guías") + " × " + W + " ventanas = " + total +
      " puntuaciones, un einsum",
    aria: (ctx) => {
      const f = facts(ctx);
      return "Cada una de las " + f.G + " guías como una fila de " + WIDTH + " bases junto a su " +
             "fila de " + f.W + " puntuaciones por ventana, " + f.total + " en total, con la " +
             "mejor ventana de cada fila marcada. Debajo, la fila elegida como perfil de barras " +
             "y el einsum glb,wlb->gw. La ventana exacta puntúa " + f.exact.join(", ") +
             " de la primera guía a la última.";
    },
    hQ: (G) => "guías  Q (" + G + ", " + WIDTH + ", 4)",
    hS: (G, W) => "puntuaciones  S (" + G + ", " + W + ")",
    legQ: WIDTH + " posiciones",
    capW: (W) => "w: " + W + " ventanas",
    rowEnd: (score, at) => score + "/" + WIDTH + " w" + (at + 1),
    cardRow: (g, k) => "g = " + g + " · " + k + (k === 1 ? " cambio" : " cambios") + " desde g = 1",
    cardBest: (at) => ["mejor puntuación", "en la ventana " + at],
    hint: "pulsa una celda o barra",
    tag: (score, at) => score + " · w" + (at + 1),
    kept: "se conservan: indexan S",
    summed: "se suman y se van",
    foot: "el einsum de la búsqueda, con una letra más por delante: g",
    tip: (g, w, score) => "guía " + g + " · ventana " + w + " · " + score + " de " + WIDTH,
    controls: {guides: "Cuántas guías", mismatch: "Cambios por paso", play: "▶ Añadir guías"},
    options: {},
    read: (f) =>
      "<b>" + f.G + (f.G === 1 ? " guía" : " guías") + " × " + f.W + " ventanas = " + f.total +
      " puntuaciones</b>: el einsum suma ℓ y b y conserva g y w, así que el resultado tiene " +
      "forma (" + f.G + ", " + f.W + ") · cada guía está " + f.step + " cambios más lejos de la " +
      "primera · la ventana exacta puntúa " + f.exact.join(", ") + " · la fila g = " + (f.row + 1) +
      " llega a " + f.best[f.row].score + " de " + WIDTH + ", ventana " + (f.best[f.row].at + 1),
    np: {
      q: "una guía por fila",
      w: "como antes",
      s: "un índice más",
      b: "mejor ventana por fila",
      col: (list, at) => "ventana " + at + ": " + list.join(" ")
    }
  };

  // The einsum as drawn: each character of `S = einsum("glb,wlb->gw", Q, W)`
  // with the axis it names, if it is one. g and w survive into S; l and b are
  // summed away.
  const EIN = 'S = einsum("glb,wlb->gw", Q, W)';
  const AXIS = {g: "guide", w: "win", l: "pos", b: "base"};
  const KEPT = {g: true, w: true};
  const EIN_SPAN = [12, 23];     // the characters that are the subscripts

  window.GenomeScenes.register({
    id: "batch", section: "02",
    hl: ["guide", "win", "pos", "base"],
    copy: {en: EN, es: ES},

    controls: [
      {id: "guides", type: "range", min: 1, max: 6, step: 1, fmt: (v) => String(v)},
      {id: "mismatch", type: "range", min: 0, max: 6, step: 1, fmt: (v) => String(v)},
      {id: "play", type: "play", target: "guides", rate: 1.4}
    ],

    init(ctx) {
      ctx.state.guides = 3;
      ctx.state.mismatch = 2;
      ctx.state.row = 0;
      ctx.state.col = -1;
    },
    sync(ctx) {
      const s = ctx.state;
      s.row = Math.max(0, Math.min(s.guides - 1, s.row | 0));
    },

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) {
      const c = ctx.cache;
      if (K.arrival(ctx, ENTRANCE + SETTLE) < 1 || (c.rh && c.rh.moving)) return true;
      const n = ctx.state.guides, now = ctx.now();
      for (let i = 0; i < n; i++) if (c.born && c.born[i] > now - BORN - SETTLE) return true;
      return false;
    },

    pick(ctx, key) {
      const s = ctx.state, f = facts(ctx);
      let m = /^cell:(\d+):(\d+)$/.exec(key);
      if (m) {
        const g = Number(m[1]), w = Number(m[2]);
        ctx.setControls({row: g, col: g === f.row && w === f.col ? -1 : w});
        return;
      }
      m = /^row:(\d+)$/.exec(key);
      if (m) { ctx.setControls({row: Number(m[1])}); return; }
      m = /^bar:(\d+)$/.exec(key);
      if (m) ctx.setControls({col: Number(m[1]) === s.col ? -1 : Number(m[1])});
    },
    tip(ctx, key) {
      const m = /^cell:(\d+):(\d+)$/.exec(key);
      if (!m) return "";
      const f = facts(ctx), g = Number(m[1]), w = Number(m[2]);
      return g < f.G ? ctx.copy.tip(g + 1, w + 1, f.S[g][w]) : "";
    },
    // A press on the ribbon picks the window that starts there.
    seek(ctx, i) {
      ctx.setControls({col: Math.max(0, Math.min(160, Math.floor(i)))});
    },

    draw(ctx) {
      const svg = ctx.svg, c = ctx.copy, f = facts(ctx), lit = ctx.hl, cache = ctx.cache;
      const now = ctx.now(), G = f.G, W = f.W;
      const cw = X.gw / W;
      const sel = rowOf(ctx, f);
      const p = K.arrival(ctx, ENTRANCE);

      // Row height eases when the number of guides changes; any overflow while
      // it does is clipped to the block rather than left to land on the profile.
      const rh = K.chase(cache, "rh", Math.min(90, Y.area / G), now, 0.12, ctx.instant);
      // A row that has just been added sweeps in; the first draw's rows are old.
      if (!cache.born) { cache.born = {}; for (let i = 0; i < G; i++) cache.born[i] = -1e9; }
      for (let i = 0; i < 6; i++) {
        if (i >= G) delete cache.born[i];
        else if (cache.born[i] === undefined) cache.born[i] = ctx.instant ? -1e9 : now;
      }
      const d = G === 1 ? 1 : 0.45;
      const frac = (i) => Math.min(
        clamp01((p - i * (1 - d) / Math.max(1, G - 1)) / d + 1e-6),
        ctx.instant ? 1 : clamp01((now - cache.born[i]) / BORN));

      const clip = K.el("clipPath", {id: "gb-top"});
      clip.appendChild(K.el("rect", {x: 0, y: Y.top - 6, width: 820, height: Y.cap - Y.top - 2}));
      svg.appendChild(clip);
      const top = K.el("g", {"clip-path": "url(#gb-top)"});
      svg.appendChild(top);

      // ---- headers
      K.text(svg, X.tile0, Y.head, c.hQ(G), {size: 12.5, colour: lit === "guide" ? "--gn-hit" : "--stage-ink"});
      K.text(svg, X.g0, Y.head, c.hS(G, W), {size: 12.5, colour: "--gn-core"});

      // ---- the rows: guide as tiles, scores as cells, best marked
      const th = Math.min(30, rh - 6);
      for (let g = 0; g < G; g++) {
        const y = Y.top + g * rh, r = frac(g);
        if (r <= 0) continue;
        const isSel = g === sel;
        K.label(top, X.lab, y + rh / 2, "g=" + (g + 1), {
          size: 12, baseline: "middle", pick: "row:" + g, pad: 2,
          colour: lit === "guide" ? "--gn-hit" : (isSel ? "--stage-ink" : "--stage-mute")
        });
        for (let l = 0; l < WIDTH; l++) {
          const base = f.guides[g][l];
          const changed = base !== f.guides[0][l];
          K.tile(top, X.tile0 + l * X.pitch, y + (rh - th) / 2, X.tw, th,
            th >= 14.2 ? base : "", {ring: changed ? "--gn-miss" : null, pick: "row:" + g, font: 11.3});
        }
        // the scores, swept in left to right, all rows on one scale of 0..20
        const reach = Math.ceil(r * W);
        for (let w = 0; w < reach; w++) {
          const v = f.S[g][w], isBest = w === f.best[g].at;
          top.appendChild(K.el("rect", {
            x: (X.g0 + w * cw).toFixed(2), y: (y + 0.75).toFixed(2),
            width: (cw + 0.15).toFixed(2), height: Math.max(0.6, rh - 1.5).toFixed(2),
            fill: K.css(isBest ? "--gn-hit" : "--gn-core"),
            "fill-opacity": (isBest ? 1 : 0.1 + 0.9 * Math.pow(v / WIDTH, 2.2)).toFixed(3),
            "data-pick": "cell:" + g + ":" + w
          }));
        }
        if (r < 1) {
          const x = X.g0 + r * X.gw;
          top.appendChild(K.el("line", {x1: x.toFixed(2), y1: (y + 0.75).toFixed(2), x2: x.toFixed(2),
            y2: (y + rh - 0.75).toFixed(2), stroke: K.css("--stage-ink"), "stroke-width": 1.6}));
        } else {
          const b = f.best[g];
          top.appendChild(K.el("rect", {
            x: (X.g0 + b.at * cw - 2.2).toFixed(2), y: (y + 0.5).toFixed(2), width: (cw + 4.4).toFixed(2),
            height: Math.max(0.6, rh - 1).toFixed(2), rx: 1.5, fill: "none", stroke: K.css("--stage-ink"),
            "stroke-width": lit === "win" ? 2.6 : 1.5
          }));
          K.label(top, X.end, y + rh / 2, c.rowEnd(b.score, b.at), {
            size: 12, baseline: "middle", pad: 2, pick: "row:" + g,
            colour: lit === "guide" || b.score === WIDTH ? "--gn-hit" : "--stage-ink"
          });
        }
        if (isSel) {
          top.appendChild(K.el("rect", {
            x: 5, y: (y + 0.5).toFixed(2), width: 810, height: Math.max(0.6, rh - 1).toFixed(2), rx: 4,
            fill: "none", stroke: K.css("--stage-ink"), "stroke-width": 1.2, "stroke-opacity": 0.9,
            "pointer-events": "none"
          }));
        }
      }
      // the picked window: a column through every row
      if (f.col >= 0) {
        top.appendChild(K.el("rect", {
          x: (X.g0 + f.col * cw - 1.4).toFixed(2), y: Y.top - 2, width: (cw + 2.8).toFixed(2),
          height: (G * rh + 4).toFixed(2), fill: "none", stroke: K.css("--stage-ink"),
          "stroke-width": 1.4, "stroke-dasharray": "3 2", "pointer-events": "none"
        }));
      }
      // the hovered cell
      const hm = ctx.hover && /^cell:(\d+):(\d+)$/.exec(ctx.hover);
      if (hm && Number(hm[1]) < G) {
        top.appendChild(K.el("rect", {
          x: (X.g0 + Number(hm[2]) * cw - 1.6).toFixed(2), y: (Y.top + Number(hm[1]) * rh).toFixed(2),
          width: (cw + 3.2).toFixed(2), height: Math.max(0.6, rh).toFixed(2), fill: "none",
          stroke: K.css("--stage-ink"), "stroke-width": 1.6, "pointer-events": "none"
        }));
      }

      // ---- what the two blocks are: positions, alphabet, windows
      K.text(svg, X.tile0, Y.cap, "ℓ: " + c.legQ, {size: 12, colour: lit === "pos" ? "--gn-core" : "--stage-mute"});
      K.text(svg, 168, Y.cap, "b:", {size: 12, colour: lit === "base" ? "--gn-core" : "--stage-mute"});
      GC.BASES.split("").forEach((b, i) => {
        K.tile(svg, 184 + i * 17, Y.cap - 13, 15, 16, b, {solid: lit === "base", font: 11.5});
      });
      K.text(svg, X.g0, Y.cap, c.capW(W), {size: 12, colour: lit === "win" ? "--gn-hit" : "--stage-mute"});

      // ---- the selected row, read out as the previous scene's skyline
      const pr = frac(sel);
      const bestSel = f.best[sel];
      const vals = f.S[sel].map((v, w) => (w < Math.ceil(pr * W) ? v : 0));
      K.bars(svg, vals, {
        x: X.g0, y: Y.bar0, w: X.gw, h: Y.barH, max: WIDTH, gap: 0, alpha: 0.7,
        at: (w) => (w === bestSel.at ? "--gn-hit" : w === f.col ? "--stage-ink" : "--gn-core"),
        lit: (w) => w === bestSel.at || w === f.col,
        pick: (w) => "bar:" + w
      });
      svg.appendChild(K.el("line", {
        x1: X.g0, y1: Y.bar0, x2: X.g0 + X.gw, y2: Y.bar0, stroke: K.css("--gn-hit"),
        "stroke-width": 1.2, "stroke-dasharray": "5 4", "pointer-events": "none"
      }));
      K.text(svg, X.end, Y.bar0 + 4, String(WIDTH), {size: 12, colour: "--gn-hit"});
      K.text(svg, X.end, Y.bar0 + Y.barH, "0", {size: 12, colour: "--stage-mute"});
      K.text(svg, X.g0, Y.tick, "w = 1", {size: 12, colour: "--stage-mute"});
      K.text(svg, X.g0 + X.gw, Y.tick, "w = " + W, {size: 12, anchor: "end", colour: "--stage-mute"});
      if (pr >= 1) {
        const bx = Math.max(X.g0 + 34, Math.min(X.g0 + X.gw - 34, X.g0 + (bestSel.at + 0.5) * cw));
        K.label(svg, bx, Y.chip, c.tag(bestSel.score, bestSel.at), {
          size: 12, anchor: "middle", baseline: "middle", pad: 2, colour: "--gn-hit"
        });
      }

      // ---- the card on the left of the profile
      K.text(svg, X.tile0, 338, c.cardRow(sel + 1, f.off[sel]), {size: 12, colour: "--stage-mute"});
      K.text(svg, X.tile0, 378, bestSel.score + "/" + WIDTH,
        {size: 34, weight: 700, colour: "--gn-hit", sans: true});
      c.cardBest(bestSel.at + 1).forEach((line, n) => {
        K.text(svg, 150, 366 + n * 17, line, {size: 12.5, colour: "--stage-mute"});
      });
      if (f.col >= 0) {
        K.text(svg, X.tile0, 408, "S[:, " + (f.col + 1) + "] = " + f.column.join(", "), {size: 12.5, colour: "--stage-ink"});
      } else {
        K.text(svg, X.tile0, 408, c.hint, {size: 12, colour: "--stage-mute"});
      }

      // ---- the einsum, with what it sums and what it keeps
      for (let i = 0; i < EIN.length; i++) {
        const ch = EIN[i];
        const inSub = i >= EIN_SPAN[0] && i < EIN_SPAN[1];
        const ax = inSub ? AXIS[ch] : null;
        const x = EIN_X + i * PITCH_E;
        const colour = ax ? (KEPT[ch] ? "--gn-hit" : "--gn-core") : (inSub ? "--stage-mute" : "--stage-ink");
        if (ax && lit === ax) {
          svg.appendChild(K.el("rect", {
            x: (x - 1.5).toFixed(1), y: Y.ein - 18, width: (PITCH_E + 1).toFixed(1), height: 27, rx: 3,
            fill: K.css("--stage-chip"), stroke: K.css(colour), "stroke-width": 1.6
          }));
        }
        if (ch !== " ") K.text(svg, x, Y.ein, ch, {size: EIN_FONT, colour, weight: ax ? 800 : 600});
        if (ax) {
          svg.appendChild(K.el("line", {
            x1: (x + 0.5).toFixed(1), y1: Y.ein + 7, x2: (x + PITCH_E - 1).toFixed(1), y2: Y.ein + 7,
            stroke: K.css(colour), "stroke-width": KEPT[ch] ? 2.6 : 1.4,
            "stroke-dasharray": KEPT[ch] ? "0" : "2 2"
          }));
        }
      }
      K.text(svg, 420, Y.ein - 8, "g  w", {size: 15, weight: 800, colour: "--gn-hit"});
      K.text(svg, 480, Y.ein - 8, c.kept, {size: 12.5, colour: "--stage-ink"});
      K.text(svg, 420, Y.ein + 14, "ℓ  b", {size: 15, weight: 800, colour: "--gn-core"});
      K.text(svg, 480, Y.ein + 14, c.summed, {size: 12.5, colour: "--stage-ink"});
      K.text(svg, X.tile0, Y.foot, c.foot, {size: 12.5, colour: "--stage-mute"});
    },

    readout(ctx) {
      const f = facts(ctx), c = ctx.copy, b = f.best[f.row];
      const a = f.col >= 0 ? f.col : b.at;
      return {
        html: c.read(f),
        claim: c.claim(f.G, f.W, f.total),
        lens: {a: a, b: a + WIDTH},
        data: {guides: String(f.G), mismatch: String(f.step), windows: String(f.W),
               scores: String(f.total), shape: f.G + "," + f.W,
               exact: f.exact.join(","), best: f.best.map((x) => x.score).join(","),
               row: String(f.row + 1), pick: f.col >= 0 ? String(f.col + 1) : ""}
      };
    },

    code(ctx) {
      const f = facts(ctx), np = ctx.copy.np;
      return K.code([
        ["Q = one_hot_batch(guides)", "(" + f.G + ", " + WIDTH + ", 4): " + np.q],
        ["W = win(X, " + WIDTH + ", axis=0).transpose(0, 2, 1)",
         "(" + f.W + ", " + WIDTH + ", 4), " + np.w],
        ['S = np.einsum("glb,wlb->gw", Q, W)', "(" + f.G + ", " + f.W + "): " + np.s],
        ["S.argmax(axis=1)", np.b],
        ["S[:, " + SOURCE + "]", np.col(f.exact, SOURCE + 1)]
      ]);
    }
  });
})();
