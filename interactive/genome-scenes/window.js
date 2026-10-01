// Scene 2: a sliding window makes (W, L, 4) and copies nothing.
// The picture is the whole 180-base sequence as a thin strip with one window
// boxed on it, the one-hot grid of exactly that window underneath, and the
// count that is the point: 161 windows of 20 bases would be 3,220 bases if
// they were copied, and the array holds 180. A window axis is not a time axis
// and not a batch axis -- neighbouring windows share all but one base.
// Flat SVG: a 4-row grid has no depth to give.
// See genome-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const GC = window.GenomeCore, K = window.GenomeKit;

  const L = {
    x: 44, w: 732,
    seqLabY: 76, stripY: 88, stripH: 10,
    trackLabY: 126, trackY: 134, trackH: 8,
    gridLabY: 176, gridStripY: 200, gridStripH: 20, gridY: 224, cellH: 24, maxCell: 26,
    line1Y: 350, line2Y: 374
  };

  // The one place the arithmetic is asked. `at` is clamped here as well as in
  // sync(), so a draw that somehow runs first can never read past the end.
  function facts(ctx) {
    const s = ctx.state, seq = ctx.seq, n = seq.length;
    const width = Math.max(1, Math.min(n, s.width));
    const win = GC.windows(seq, width);
    const at = Math.max(0, Math.min(win.count - 1, s.at));
    const bases = win.at(at);
    return {
      n, width, at, bases, rows: GC.oneHot(bases),
      count: win.count, shape: win.shape,
      copied: win.count * width,        // what copying every window would store
      shared: width - 1                 // bases two neighbouring windows have in common
    };
  }

  const EN = {
    k: "Section 04 · a window is a view",
    h: "161 windows of 20 bases, and not one base copied",
    concept: "A new axis, made by sliding. The window index w is neither time nor a batch: " +
             "window w and window w + 1 overlap by all but one base, so the axis is a " +
             "position in the sequence, seen through a frame.",
    predict: "Before you drag: copied out one by one, 161 windows of 20 bases is 3,220 bases. " +
             "The sequence is 180. How many bases do you think the window array stores?",
    b: "Slide a window of 20 bases along 180 and you get <b>161 windows</b> — " +
       "<b>(161, 20, 4)</b> once each base is one-hot. Copied out, that would be 3,220 bases; " +
       "the array holds 180, because nothing was copied. Each window is the same memory read " +
       "with a different starting point, so the tensor is a view, and a view costs nothing to " +
       "make. Widen the window and there are fewer places to put it, but every one of them " +
       "overlaps its neighbour by all but one base. That overlap is why the window axis " +
       "is not a batch: a batch is made of independent things, and these share almost " +
       "everything. Drag the window along the strip and read its grid below.",
    eqcap: "W[w, ℓ, b] is X read at w + ℓ: the window index w only shifts where ℓ starts, " +
           "so no entry of W is a new number, just an old one seen again.",
    claim: (count, width) =>
      count + " windows of " + width + " bases — and not one base copied.",
    aria: (ctx) => {
      const f = facts(ctx);
      return "The " + f.n + "-base sequence with one window of " + f.width + " bases starting at " +
             "base " + (f.at + 1) + " boxed, that window as a one-hot grid, and the count: " +
             f.count + " windows, none of them copied.";
    },
    seqLab: (n) => "the sequence: " + n + " bases, stored once",
    trackLab: (c) => c + " places a window can start (the tick is this one)",
    gridLab: (w) => "this window: " + w + " bases × 4, one-hot, drawn sideways",
    copyLine: (c, w, total, n, lang) =>
      "copied out: " + c + " × " + w + " = " + K.num(total, 0, lang) + " bases. stored: " + n + ".",
    overlapLine: (s, w) => "Neighbouring windows share " + s + " of their " + w + " bases.",
    controls: {width: "Window width", at: "Where the window starts"},
    options: {},
    read: (f, lang) =>
      "<b>" + f.count + " windows</b> of " + f.width + " bases · " + "shape (" + f.count + ", " +
      f.width + ", 4) · copied out it would be " + K.num(f.copied, 0, lang) +
      " bases, stored " + f.n + " · this one is bases " + (f.at + 1) + "–" + (f.at + f.width),
    np: {
      x: "(180, 4): one row per base",
      w: "a transpose is still a view",
      view: "True: no base was copied"
    }
  };

  const ES = {
    k: "Sección 04 · una ventana es una vista",
    h: "161 ventanas de 20 bases, y ni una base copiada",
    concept: "Un eje nuevo, hecho deslizando. El índice de ventana w no es tiempo ni lote: la " +
             "ventana w y la w + 1 se solapan en todas las bases menos una, así que el eje es " +
             "una posición de la secuencia vista a través de un marco.",
    predict: "Antes de arrastrar: copiadas una a una, 161 ventanas de 20 bases son 3.220 bases. " +
             "La secuencia tiene 180. ¿Cuántas bases crees que guarda el arreglo de ventanas?",
    b: "Desliza una ventana de 20 bases sobre 180 y salen <b>161 ventanas</b> — " +
       "<b>(161, 20, 4)</b> cuando cada base es one-hot. Copiadas, serían 3.220 bases; " +
       "el arreglo guarda 180, porque no se copió nada. Cada ventana es la misma memoria " +
       "leída desde otro punto de partida, así que el tensor es una vista, y una vista no " +
       "cuesta nada de hacer. Ensancha la ventana y hay menos sitios donde ponerla, pero " +
       "cada uno se solapa con su vecino en todas las bases menos una. Por eso el eje de " +
       "ventanas no es un lote: un lote se compone de cosas independientes, y estas " +
       "comparten casi todo. Arrastra la ventana por la tira y lee su rejilla debajo.",
    eqcap: "W[w, ℓ, b] es X leído en w + ℓ: el índice de ventana w solo desplaza dónde " +
           "empieza ℓ, así que ninguna entrada de W es un número nuevo, solo uno viejo otra vez.",
    claim: (count, width) =>
      count + " ventanas de " + width + " bases, y ni una base copiada.",
    aria: (ctx) => {
      const f = facts(ctx);
      return "La secuencia de " + f.n + " bases con una ventana de " + f.width + " bases que " +
             "empieza en la base " + (f.at + 1) + " enmarcada, esa ventana como rejilla " +
             "one-hot, y la cuenta: " + f.count + " ventanas, ninguna copiada.";
    },
    seqLab: (n) => "la secuencia: " + n + " bases, guardada una vez",
    trackLab: (c) => c + " sitios donde puede empezar una ventana (la marca es esta)",
    gridLab: (w) => "esta ventana: " + w + " bases × 4, one-hot, dibujada de lado",
    copyLine: (c, w, total, n, lang) =>
      "copiadas: " + c + " × " + w + " = " + K.num(total, 0, lang) + " bases. guardadas: " + n + ".",
    overlapLine: (s, w) => "Las ventanas vecinas comparten " + s + " de sus " + w + " bases.",
    controls: {width: "Ancho de la ventana", at: "Dónde empieza la ventana"},
    options: {},
    read: (f, lang) =>
      "<b>" + f.count + " ventanas</b> de " + f.width + " bases · forma (" + f.count + ", " +
      f.width + ", 4) · copiadas serían " + K.num(f.copied, 0, lang) +
      " bases, guardadas " + f.n + " · esta va de la base " + (f.at + 1) + " a la " +
      (f.at + f.width),
    np: {
      x: "(180, 4): una fila por base",
      w: "una transpuesta sigue siendo vista",
      view: "True: no se copió ninguna base"
    }
  };

  window.GenomeScenes.register({
    id: "window", section: "04",
    hl: ["win", "pos", "base"],
    copy: {en: EN, es: ES},

    controls: [
      {id: "width", type: "range", min: 4, max: 40, step: 4,
       fmt: (v) => String(v)},
      {id: "at", type: "range", min: 0, max: GC.CDS.length - 4, step: 1,
       fmt: (v, ctx) => (v + 1) + "–" + (v + (ctx ? ctx.state.width : 20))}
    ],

    init(ctx) {
      ctx.state.width = 20;
      ctx.state.at = 40;
    },

    // The start position has to stay inside the sequence whatever the width
    // is. The slider's own ceiling moves with the width too, or the thumb
    // would sit past the end of the range it is allowed to drive.
    sync(ctx) {
      const s = ctx.state, top = ctx.seq.length - s.width;
      if (s.at > top) s.at = top;
      if (s.at < 0) s.at = 0;
      const input = ctx.control ? ctx.control("at") : null;
      if (input) {
        input.max = String(top);
        input.value = String(s.at);
      }
    },

    draw(ctx) {
      const svg = ctx.svg, c = ctx.copy, f = facts(ctx), lit = ctx.hl;
      const span = (i) => i >= f.at && i < f.at + f.width;

      // 1. The whole sequence, once, with the window boxed on it.
      K.label(svg, L.x, L.seqLabY, c.seqLab(f.n), {size: 11, colour: "--stage-mute"});
      const strip = K.seqStrip(svg, ctx.seq, {
        x: L.x, y: L.stripY, w: L.w, h: L.stripH,
        at: (i) => (span(i) || lit === "base" ? null : "--stage-mute"),
        lit: (i) => span(i)
      });
      const bx0 = strip.px(f.at) - strip.cw / 2 - 1.5;
      const bx1 = strip.px(f.at + f.width - 1) + strip.cw / 2 + 1.5;
      svg.appendChild(K.el("rect", {
        x: bx0.toFixed(2), y: L.stripY - 4, width: (bx1 - bx0).toFixed(2), height: L.stripH + 8,
        rx: 3, fill: "none", stroke: K.css("--gn-hit"), "stroke-width": lit === "win" ? 3 : 1.6
      }));

      // 2. How many places a window can start: N of the 180, and the tick.
      K.label(svg, L.x, L.trackLabY, c.trackLab(f.count), {size: 11, colour: "--stage-mute"});
      const per = L.w / f.n;
      svg.appendChild(K.el("rect", {
        x: L.x, y: L.trackY, width: (f.count * per).toFixed(2), height: L.trackH, rx: 2,
        fill: K.css("--gn-hit"), "fill-opacity": lit === "win" ? 0.55 : 0.28,
        stroke: K.css("--gn-hit"), "stroke-width": 1
      }));
      svg.appendChild(K.el("rect", {
        x: (L.x + f.at * per).toFixed(2), y: L.trackY - 4, width: Math.max(per, 3).toFixed(2),
        height: L.trackH + 8, fill: K.css("--stage-ink")
      }));

      // 3. The window's own one-hot grid, bases down and positions across, so
      // a window of 40 is a row of 40 and not a tower of 40.
      K.label(svg, L.x, L.gridLabY, c.gridLab(f.width), {size: 11, colour: "--stage-mute"});
      const cell = Math.min(L.maxCell, (L.w - 22) / f.width);
      const gw = cell * f.width;
      const gx = Math.max(L.x + 22, L.x + (L.w - gw) / 2);
      K.seqStrip(svg, f.bases, {
        x: gx, y: L.gridStripY, size: cell - 1, gap: 1, h: L.gridStripH,
        lit: () => lit === "pos"
      });
      // Transposed: row b is the alphabet, column ℓ is the position.
      const T = [0, 1, 2, 3].map((b) => f.rows.map((r) => r[b]));
      K.numGrid(svg, T, {
        x: gx, y: L.gridY, cellW: cell, cellH: L.cellH, digits: 0,
        at: (i, j) => (T[i][j] ? (lit === "pos" ? "--gn-hit" : "--gb-" + "acgt"[i]) : null)
      });
      for (let b = 0; b < 4; b++) {
        K.label(svg, gx - 8, L.gridY + b * L.cellH + L.cellH / 2, GC.BASES[b], {
          size: 10, anchor: "end", baseline: "middle",
          colour: lit === "base" ? "--gb-" + "acgt"[b] : "--stage-mute"
        });
      }

      // 4. The point, in the units the reader can check.
      K.label(svg, L.x, L.line1Y, c.copyLine(f.count, f.width, f.copied, f.n, ctx.lang),
        {size: 12, colour: "--gn-hit"});
      K.label(svg, L.x, L.line2Y, c.overlapLine(f.shared, f.width), {size: 12});
    },

    readout(ctx) {
      const f = facts(ctx), c = ctx.copy;
      return {
        html: c.read(f, ctx.lang),
        claim: c.claim(f.count, f.width),
        data: {width: String(f.width), at: String(f.at), count: String(f.count),
               shape: f.shape.join("x"), copied: String(f.copied), stored: String(f.n)}
      };
    },

    code(ctx) {
      const f = facts(ctx), np = ctx.copy.np;
      return K.code([
        "from numpy.lib.stride_tricks import sliding_window_view as win",
        ["X = one_hot(seq)", np.x],
        ["W = win(X, " + f.width + ", axis=0).transpose(0, 2, 1)", np.w],
        ["W.shape", "(" + f.shape.join(", ") + ")"],
        ["np.shares_memory(W, X)", np.view]
      ]);
    }
  });
})();
