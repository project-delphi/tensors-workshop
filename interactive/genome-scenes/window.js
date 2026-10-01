// Scene 2: a sliding window makes (W, L, 4) and copies nothing.
// Three bands on an 820 x 500 board. On top, the picked window: its bases as
// big tiles. In the middle, the whole window array as an image -- window index
// across, position inside the window down, each cell the colour of the base it
// holds -- which, because W[w, l] = X[w + l], comes out as diagonal stripes:
// the proof that every entry is an old number seen again. One stored base is
// traced along its anti-diagonal through every window that holds it. At the
// bottom, the two sizes at true proportion: what copying every window would
// store, against what is stored. The ribbon under the stage already shows
// the 180 bases, so no strip is drawn here; the scene returns the lens.
// A window axis is not a batch axis: neighbours share all but one base.
// Flat SVG. See genome-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const GC = window.GenomeCore, K = window.GenomeKit;

  const X0 = 40, XW = 740;            // the board's working width: 40 .. 780
  const TILE = {y: 78, h: 32, pitch: 37};
  const IMG = {x: 80, w: 700, y: 138, maxH: 214, maxCh: 28};
  const BAR = {long: {y: 426, h: 20}, short: {y: 458, h: 20}};
  const ENTRANCE = 1500;              // ms for the array to fill in

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // The one place the arithmetic is asked. `at` is clamped here as well as in
  // sync(), so a draw that somehow runs first can never read past the end.
  function facts(ctx) {
    const s = ctx.state, seq = ctx.seq, n = seq.length;
    const width = clamp(s.width, 1, n);
    const win = GC.windows(seq, width);
    const at = clamp(Math.round(s.at), 0, win.count - 1);
    return {
      n, width, at, seq, bases: win.at(at),
      count: win.count, shape: win.shape,
      copied: win.count * width,         // what copying every window would store
      seen: GC.appearances(n, width, at) // windows holding the picked window's first base
    };
  }

  // The base the picture traces: the one under the pointer, else the picked
  // window's first. Hover repaints this and never touches the readout.
  function traced(ctx, f) {
    const h = ctx.hover;
    if (h && h.startsWith("cell:")) {
      const [w, l] = h.slice(5).split(":").map(Number);
      if (w >= 0 && w < f.count && l >= 0 && l < f.width) return w + l;
    }
    return f.at;
  }

  const EN = {
    tab: "windows",
    k: "Section 04 · a window is a view",
    h: "161 windows of 20 bases are one array, seen through a sliding frame",
    concept: "A new axis, made by sliding. The window index w is neither time nor a batch: " +
             "window w and window w + 1 overlap by all but one base, so the axis is a " +
             "position in the sequence, seen through a frame.",
    predict: "Before you drag: copied out one by one, 161 windows of 20 bases would be 3,220 " +
             "bases. How many does the window array actually store, and in how many windows " +
             "does a single base appear?",
    b: "The top row is one window, base by base. Below it is every window at once: the window " +
       "index across, the position inside the window down, each cell the colour of the base " +
       "it holds. Look at the stripes. Slide the window or press play and watch the bright " +
       "column cross them; point at any cell to trace that stored base through every window " +
       "that contains it. The two bars at the bottom are drawn to the same scale.",
    eqcap: "W[w, ℓ, b] is X read at w + ℓ: the window index w only shifts where ℓ starts, " +
           "so no entry of W is a new number, just an old one seen again.",
    claim: (count, width, copied, n, lang) =>
      count + " windows × " + width + " = " + K.num(copied, 0, lang) + " bases on screen, " + n + " stored",
    aria: (ctx) => {
      const f = facts(ctx);
      return "The window array as an image: " + f.count + " windows across, " + f.width +
             " positions down, each cell coloured by its base, which makes diagonal stripes. " +
             "The window starting at base " + (f.at + 1) + " is picked and shown as " + f.width +
             " tiles above; one stored base is traced through the " + f.seen + " windows that " +
             "hold it. Below, two bars to scale: " + f.copied + " bases if copied, " + f.n +
             " stored.";
    },
    winLab: (w, a, b) => "window " + w + " · bases " + a + "–" + b,
    imgLab: "across: window w · down: position ℓ · colour: X[w + ℓ]",
    traceLab: (n, i, letter) => (i === null ? "" : "base " + i + " (" + letter + "): ") +
      "one stored base, seen in " + n + (n === 1 ? " window" : " windows"),
    copiedLab: (c, w, total, lang) =>
      "copied out: " + c + " × " + w + " = " + K.num(total, 0, lang) + " bases",
    storedLab: (n, ratio, lang) =>
      "stored: " + n + " bases · " + K.num(ratio, 1, lang) + " times fewer",
    tip: (w, l, letter, i) =>
      "window " + w + " · position " + l + " · base " + letter + " (stored base " + i + ")",
    controls: {width: "Window width", at: "Where the window starts", play: "▶ Slide"},
    options: {},
    read: (f, lang) =>
      "<b>" + f.count + " windows</b> of " + f.width + " bases · shape (" + f.count + ", " +
      f.width + ", 4) · copied out it would be " + K.num(f.copied, 0, lang) +
      " bases, stored " + f.n + " · this window is bases " + (f.at + 1) + "–" + (f.at + f.width) +
      ", and its first base is seen in <b>" + f.seen + "</b> of the " + f.count + " windows",
    np: {
      x: "(180, 4): one row per base",
      v: (c, w) => "(" + c + ", 4, " + w + "): window axis first",
      w: (c, w) => "(" + c + ", " + w + ", 4), still a view",
      view: "True: no base was copied",
      ro: "False: each number is in many windows"
    }
  };

  const ES = {
    tab: "ventanas",
    k: "Sección 04 · una ventana es una vista",
    h: "161 ventanas de 20 bases son un solo arreglo, visto por un marco que se desliza",
    concept: "Un eje nuevo, hecho deslizando. El índice de ventana w no es tiempo ni lote: la " +
             "ventana w y la w + 1 se solapan en todas las bases menos una, así que el eje es " +
             "una posición de la secuencia vista a través de un marco.",
    predict: "Antes de arrastrar: copiadas una a una, 161 ventanas de 20 bases serían 3.220 " +
             "bases. ¿Cuántas guarda en realidad el arreglo de ventanas, y en cuántas ventanas " +
             "aparece una sola base?",
    b: "La fila de arriba es una ventana, base a base. Debajo están todas las ventanas a la vez: " +
       "el índice de ventana a lo ancho, la posición dentro de la ventana hacia abajo, cada " +
       "celda del color de la base que guarda. Mira las rayas. Desliza la ventana o pulsa " +
       "reproducir y verás la columna brillante cruzarlas; señala cualquier celda para seguir " +
       "esa base guardada por todas las ventanas que la contienen. Las dos barras de abajo " +
       "van a la misma escala.",
    eqcap: "W[w, ℓ, b] es X leído en w + ℓ: el índice de ventana w solo desplaza dónde " +
           "empieza ℓ, así que ninguna entrada de W es un número nuevo, solo uno viejo otra vez.",
    claim: (count, width, copied, n, lang) =>
      count + " ventanas × " + width + " = " + K.num(copied, 0, lang) + " bases en pantalla, " + n + " guardadas",
    aria: (ctx) => {
      const f = facts(ctx);
      return "El arreglo de ventanas como imagen: " + f.count + " ventanas a lo ancho, " + f.width +
             " posiciones hacia abajo, cada celda del color de su base, lo que dibuja rayas " +
             "diagonales. La ventana que empieza en la base " + (f.at + 1) + " está elegida y se " +
             "muestra arriba como " + f.width + " fichas; una base guardada se sigue por las " +
             f.seen + " ventanas que la contienen. Abajo, dos barras a escala: " + f.copied +
             " bases si se copiara, " + f.n + " guardadas.";
    },
    winLab: (w, a, b) => "ventana " + w + " · bases " + a + "–" + b,
    imgLab: "a lo ancho: ventana w · hacia abajo: posición ℓ · color: X[w + ℓ]",
    traceLab: (n, i, letter) => (i === null ? "" : "base " + i + " (" + letter + "): ") +
      "una base guardada, vista en " + n + (n === 1 ? " ventana" : " ventanas"),
    copiedLab: (c, w, total, lang) =>
      "copiadas: " + c + " × " + w + " = " + K.num(total, 0, lang) + " bases",
    storedLab: (n, ratio, lang) =>
      "guardadas: " + n + " bases · " + K.num(ratio, 1, lang) + " veces menos",
    tip: (w, l, letter, i) =>
      "ventana " + w + " · posición " + l + " · base " + letter + " (base guardada " + i + ")",
    controls: {width: "Ancho de la ventana", at: "Dónde empieza la ventana", play: "▶ Deslizar"},
    options: {},
    read: (f, lang) =>
      "<b>" + f.count + " ventanas</b> de " + f.width + " bases · forma (" + f.count + ", " +
      f.width + ", 4) · copiadas serían " + K.num(f.copied, 0, lang) +
      " bases, guardadas " + f.n + " · esta ventana va de la base " + (f.at + 1) + " a la " +
      (f.at + f.width) + ", y su primera base se ve en <b>" + f.seen + "</b> de las " +
      f.count + " ventanas",
    np: {
      x: "(180, 4): una fila por base",
      v: (c, w) => "(" + c + ", 4, " + w + "): eje de ventanas primero",
      w: (c, w) => "(" + c + ", " + w + ", 4), sigue siendo vista",
      view: "True: no se copió ninguna base",
      ro: "False: cada número está en muchas ventanas"
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
       fmt: (v, ctx) => (v + 1) + "–" + (v + (ctx ? ctx.state.width : 20))},
      {id: "play", type: "play", target: "at", rate: 40}
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

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) { return K.arrival(ctx, ENTRANCE) < 1; },

    pick(ctx, key) {
      if (!key.startsWith("cell:")) return;
      const w = Number(key.split(":")[1]);
      if (Number.isFinite(w)) ctx.setControls({at: w});
    },
    tip(ctx, key) {
      if (!key.startsWith("cell:")) return "";
      const [w, l] = key.slice(5).split(":").map(Number), f = facts(ctx);
      return ctx.copy.tip(w + 1, l + 1, f.seq[w + l], w + l + 1);
    },
    // The ribbon under the stage: a press on the gene centres the window there.
    seek(ctx, i) {
      const w = ctx.state.width;
      ctx.setControls({at: clamp(Math.round(i - w / 2), 0, ctx.seq.length - w)});
    },

    draw(ctx) {
      const svg = ctx.svg, c = ctx.copy, f = facts(ctx), lit = ctx.hl;
      const p = K.smooth(K.arrival(ctx, ENTRANCE));

      // ---- band 1: the picked window, as tiles.
      const pitch = Math.min(TILE.pitch, XW / f.width);
      const tw = pitch - 3;
      K.label(svg, X0, 68, c.winLab(f.at + 1, f.at + 1, f.at + f.width),
        {size: 13, colour: lit === "win" ? "--gn-hit" : "--stage-ink"});
      const ti = traced(ctx, f);
      for (let l = 0; l < f.width; l++) {
        const ring = lit === "pos" || (ti - f.at === l) ? "--stage-ink" : null;
        K.tile(svg, X0 + l * pitch, TILE.y, tw, TILE.h, f.bases[l], {font: 16, ring});
      }

      // ---- band 2: the whole window array, one cell per entry.
      const ch = Math.min(IMG.maxCh, IMG.maxH / f.width);
      const cw = IMG.w / f.count;
      const imgH = ch * f.width, imgY = IMG.y + (IMG.maxH - imgH) / 2, imgB = imgY + imgH;
      const colX = (w) => IMG.x + w * cw;
      const shown = Math.ceil(p * f.count);

      // The guide: this window's tile row, and the column it is in the image.
      const rowL = X0, rowR = X0 + f.width * pitch - 3;
      const ink = K.css(lit === "win" ? "--gn-hit" : "--stage-mute");
      for (const [x1, x2] of [[rowL, colX(f.at)], [rowR, colX(f.at + 1)]]) {
        svg.appendChild(K.el("line", {
          x1: x1.toFixed(1), y1: TILE.y + TILE.h + 2, x2: x2.toFixed(1), y2: imgY - 2,
          stroke: ink, "stroke-width": 1.4
        }));
      }

      for (let w = 0; w < shown; w++) {
        const here = w === f.at;
        for (let l = 0; l < f.width; l++) {
          const r = K.el("rect", {
            x: colX(w).toFixed(2), y: (imgY + l * ch).toFixed(2),
            width: (cw + 0.35).toFixed(2), height: (ch + 0.35).toFixed(2),
            fill: K.css(K.BASE_TOKEN[f.seq[w + l]]),
            "fill-opacity": here ? 1 : 0.62,
            "data-pick": "cell:" + w + ":" + l
          });
          svg.appendChild(r);
        }
      }
      // The picked column, outlined so it reads against the stripes.
      svg.appendChild(K.el("rect", {
        x: (colX(f.at) - 1).toFixed(2), y: imgY - 1, width: (cw + 2).toFixed(2), height: (imgH + 2).toFixed(2),
        fill: "none", stroke: K.css(lit === "win" ? "--gn-hit" : "--stage-ink"),
        "stroke-width": lit === "win" ? 2.6 : 1.6, "pointer-events": "none"
      }));
      // The front of the entrance, a bright seam sweeping right.
      if (p < 1 && shown < f.count) {
        svg.appendChild(K.el("rect", {
          x: colX(shown).toFixed(2), y: imgY, width: 2, height: imgH.toFixed(2),
          fill: K.css("--stage-ink")
        }));
      }

      // One stored base, traced along its anti-diagonal: cells (w, i - w).
      const lo = Math.max(0, ti - f.width + 1), hi = Math.min(ti, f.count - 1);
      const pts = [];
      for (let w = lo; w <= hi; w++) {
        if (w >= shown) break;
        pts.push((colX(w) + cw / 2).toFixed(2) + "," + (imgY + (ti - w + 0.5) * ch).toFixed(2));
      }
      if (pts.length > 1) {
        for (const [tok, sw] of [["--stage", lit === "base" ? 6.5 : 5], ["--stage-ink", lit === "base" ? 3.2 : 2]]) {
          svg.appendChild(K.el("polyline", {
            points: pts.join(" "), fill: "none", stroke: K.css(tok), "stroke-width": sw,
            "stroke-linecap": "round", "stroke-linejoin": "round", "pointer-events": "none"
          }));
        }
      }
      for (const q of pts.length === 1 ? pts : []) {
        const [x, y] = q.split(",").map(Number);
        svg.appendChild(K.el("circle", {cx: x, cy: y, r: 3.5, fill: K.css("--stage-ink"), "pointer-events": "none"}));
      }

      // Axes and what they mean.
      K.label(svg, IMG.x - 6, imgY + 6, "ℓ = 1", {size: 12, anchor: "end", baseline: "middle", colour: "--stage-mute"});
      K.label(svg, IMG.x - 6, imgB - 6, "ℓ = " + f.width, {size: 12, anchor: "end", baseline: "middle", colour: "--stage-mute"});
      K.label(svg, IMG.x, imgB + 18, "w = 1", {size: 12, colour: "--stage-mute"});
      K.label(svg, IMG.x + IMG.w, imgB + 18, "w = " + f.count, {size: 12, anchor: "end", colour: "--stage-mute"});
      K.label(svg, IMG.x + IMG.w / 2, imgB + 18, c.imgLab, {size: 12, anchor: "middle"});
      const letter = f.seq[ti];
      K.label(svg, IMG.x, 396,
        c.traceLab(GC.appearances(f.n, f.width, ti), ctx.hover && ti !== f.at ? ti + 1 : null, letter),
        {size: 13, colour: "--stage-ink", stroke: "--stage-ink"});

      // ---- band 3: the two sizes, to scale.
      const grow = Math.max(0.0001, p);
      K.label(svg, X0, 420, c.copiedLab(f.count, f.width, f.copied, ctx.lang), {size: 13, colour: "--stage-ink"});
      svg.appendChild(K.el("rect", {
        x: X0, y: BAR.long.y, width: (XW * grow).toFixed(2), height: BAR.long.h, rx: 3,
        fill: K.css("--stage-mute")
      }));
      // The picked window's share of the copy, and of the stored bases.
      const unit = XW / f.copied;
      svg.appendChild(K.el("rect", {
        x: (X0 + f.at * f.width * unit).toFixed(2), y: BAR.long.y - 3, width: Math.max(2, f.width * unit).toFixed(2),
        height: BAR.long.h + 6, fill: K.css("--stage-ink")
      }));
      const sw = XW * f.n / f.copied;
      svg.appendChild(K.el("rect", {
        x: X0, y: BAR.short.y, width: sw.toFixed(2), height: BAR.short.h, rx: 3,
        fill: K.css("--gn-hit")
      }));
      svg.appendChild(K.el("rect", {
        x: (X0 + f.at * sw / f.n).toFixed(2), y: BAR.short.y - 3, width: Math.max(2, f.width * sw / f.n).toFixed(2),
        height: BAR.short.h + 6, fill: K.css("--stage-ink")
      }));
      K.label(svg, X0 + sw + 12, BAR.short.y + 15, c.storedLab(f.n, f.copied / f.n, ctx.lang),
        {size: 13, colour: "--gn-hit"});
    },

    readout(ctx) {
      const f = facts(ctx), c = ctx.copy;
      return {
        html: c.read(f, ctx.lang),
        claim: c.claim(f.count, f.width, f.copied, f.n, ctx.lang),
        lens: {a: f.at, b: f.at + f.width},
        data: {width: String(f.width), at: String(f.at), count: String(f.count),
               shape: f.shape.join(","), copied: String(f.copied), stored: String(f.n),
               seen: String(f.seen)}
      };
    },

    code(ctx) {
      const f = facts(ctx), np = ctx.copy.np;
      return K.code([
        "from numpy.lib.stride_tricks import sliding_window_view as win",
        ["X = one_hot(seq)", np.x],
        ["V = win(X, " + f.width + ", axis=0)", np.v(f.count, f.width)],
        ["W = V.transpose(0, 2, 1)", np.w(f.count, f.width)],
        ["np.shares_memory(W, X)", np.view],
        ["W.flags.writeable", np.ro]
      ]);
    }
  });
})();
