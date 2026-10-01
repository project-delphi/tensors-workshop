// Scene 7: the search is one einsum. The gene's one-hot grid (four rows A C G T,
// one column per base -- the same upright grid the first scene drew under its
// helix) with the guide's own 4 x 20 grid hovering a little in front of the
// window it is laid over. Where the guide's 1 sits on the sequence's 1 the pair
// is joined and lit teal; where they miss it is rose and the join slants across
// rows. The dot product is literally the count of joins that stand straight.
// Under the grid, the scores as a skyline: one bar per window start in view,
// aligned to its column, the current one lit and numbered, a line at a perfect
// 20. Drawn in three.js, with an SVG twin from the same model.
// See genome-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const GC = window.GenomeCore, K = window.GenomeKit;

  const W = 20;                // the guide's length, and the window's
  const GUIDE_AT = 40;         // the window the guide is cut from
  const SHOW = 48;             // columns on screen, out of 180
  const CP = 0.3;              // column pitch, world units
  const LY = 0.95;             // row pitch
  const SPAN = (SHOW - 1) * CP;
  const GRID_BOTTOM = -4 * LY;
  const BAR_TOP = -4.7, BARH = 3.0, BASE_Y = BAR_TOP - BARH;   // the 20 line, the skyline's height, its floor
  const Z_GUIDE = 0.55;        // the guide hovers this far in front of the sequence
  const TAU = 0.2, TAU_SLIDE = 0.12;
  const ENTRANCE = 1800;
  const NORM = 0.8, LIT = 1.7;
  const LAST = GC.CDS.length - W;     // the last window start: 160
  const rowY = (j) => -(j + 0.5) * LY;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // The same at every setting, so the camera does not move when a slider does:
  // the grid, the skyline, the row letters on the left, the 20 on the right,
  // headroom for the chips over the guide and footroom for the caption.
  const BOUNDS = {min: [-1.5, BASE_Y - 0.85, -0.3], max: [SPAN + 1.3, 1.5, Z_GUIDE + 0.3]};

  // Where the stretch on screen starts: the window sits a third of the way in
  // where it can, and the stretch stops at either end of the sequence.
  const startOf = (at, len) => Math.max(0, Math.min(at - W, len - SHOW));

  // One place for every number the picture and the readout share. The
  // scores are the core's einsum; what is added here is only counting them.
  function facts(ctx) {
    const s = ctx.state, seq = ctx.seq;
    let f = ctx.cache.facts;
    if (!f || f.m !== s.mismatch) {
      const win = GC.windows(seq, W);
      const guide = GC.mutate(win.at(GUIDE_AT), s.mismatch);
      const scores = GC.matchScores(guide, seq);
      const top = GC.topMatches(scores, 2);
      // The gap between the best window and the next is this scene's claim,
      // so the core owns it and the core's test pins it: 20 against 12.
      const spread = GC.scoreSpread(scores);
      const perfect = scores.filter((v) => v === W).length;
      f = ctx.cache.facts = {m: s.mismatch, win, guide, scores, top, perfect, mean: GC.meanScore(scores),
                             nbest: spread.count, runnerUp: spread.runnerUp};
    }
    return f;
  }

  // What the claim says of the window on the stage.
  function kindOf(f, at) {
    const score = f.scores[at];
    if (score === W) return f.perfect === 1 ? "only" : "perfect";
    if (score === f.top[0].score) return f.nbest === 1 ? "best" : "tied";
    return "other";
  }

  // The two numbers that move the picture, eased: where the stretch starts and
  // where the window is, both in bases. Everything drawn is a function of
  // these, so what a hit or a miss is coloured against is always what sits
  // under the guide on screen. The entrance carries the window from the left
  // end of the stretch to where the controls say, and hands over.
  function motion(ctx) {
    const s = ctx.state, c = ctx.cache, t = ctx.now();
    const ch = c.ch || (c.ch = {});
    const s0t = startOf(s.at, ctx.seq.length);
    const s0 = K.chase(ch, "s0", s0t, t, TAU_SLIDE, ctx.instant);
    let w = K.chase(ch, "w", s.at, t, TAU_SLIDE, ctx.instant);
    const p = K.arrival(ctx, ENTRANCE);
    if (p < 1) {
      w = s0t + (s.at - s0t) * K.smooth(p);
      ch.w.v = w;
      ch.w.moving = true;
    }
    return {s0, w, wi: clamp(Math.round(w), 0, LAST), p};
  }

  // Everything that eases by piece, keyed so a slider moved mid-move is a new
  // target: the sequence's cells and the skyline's bars at absolute columns,
  // the guide's cells in the guide's own frame (the slide is added later).
  function target(ctx, mo) {
    const seq = ctx.seq, f = facts(ctx);
    const items = [];
    const lo = Math.max(0, Math.floor(mo.s0) - 2), hi = Math.min(seq.length - 1, Math.ceil(mo.s0) + SHOW + 1);
    // Columns at either end of the stretch thin out rather than stop dead.
    const edge = (w) => clamp(Math.min(w - mo.s0, mo.s0 + SHOW - 1 - w) / 1.0 + 1, 0, 1);
    for (let w = lo; w <= hi; w++) {
      const e = edge(w), hot = GC.BASES.indexOf(seq[w]);
      if (e <= 0) continue;
      for (let j = 0; j < 4; j++) {
        items.push({
          key: "c:" + w + ":" + j, kind: "cell", w, j, one: j === hot,
          c: [w * CP, rowY(j), 0],
          s: [CP * 0.86 * e, LY * 0.84 * e, (j === hot ? 0.2 : 0.1) * e], pick: "s:" + w
        });
      }
    }
    for (let w = lo; w <= Math.min(LAST, hi); w++) {
      const e = edge(w);
      if (e <= 0) continue;
      // The bar for a window rises as the guide passes its column.
      const rise = mo.p < 1 ? K.smooth(clamp((mo.w - w) / 3 + 1, 0, 1)) : 1;
      const h = Math.max(0.001, (f.scores[w] / W) * BARH * rise * e);
      items.push({key: "b:" + w, kind: "bar", w, c: [w * CP, BASE_Y + h / 2, 0], s: [CP * 0.74 * e, h, 0.2], pick: "b:" + w});
    }
    // The guide's grid: four rows by twenty columns, its 1 in each column
    // full size and the other three standing back as small pips so the
    // sequence's own 1 still shows through behind it.
    for (let l = 0; l < W; l++) {
      const hot = GC.BASES.indexOf(f.guide[l]);
      for (let j = 0; j < 4; j++) {
        items.push({
          key: "g:" + l + ":" + j, kind: "guide", l, j, one: j === hot,
          c: [l * CP, rowY(j), Z_GUIDE],
          s: j === hot ? [CP * 0.66, LY * 0.66, 0.16] : [CP * 0.22, LY * 0.2, 0.05]
        });
      }
    }
    return items;
  }

  function shown(ctx) {
    const c = ctx.cache, t = ctx.now();
    const key = JSON.stringify(ctx.state) + "|" + ctx.hl + "|" + ctx.hover;
    if (c.memo && c.memo.key === key && t - c.memo.t < 4) return c.memo.m;
    const mo = motion(ctx);
    c.ease = c.ease || {};
    const out = K.follow(c.ease, target(ctx, mo), t, TAU, ctx.instant);
    const m = compose(ctx, mo, out);
    c.memo = {key, t, m};
    return m;
  }

  // From eased pieces to cells, joins, the skyline's rules and the labels.
  function compose(ctx, mo, out) {
    const hl = ctx.hl, seq = ctx.seq, f = facts(ctx), c = ctx.copy;
    const hov = ctx.hover && ctx.hover.startsWith("b:") ? Number(ctx.hover.slice(2)) : -1;
    const x0 = mo.s0 * CP, slide = (mo.w - mo.s0) * CP;
    const wi = mo.wi;
    const cells = [], segs = [];
    let topOfHere = BASE_Y + 0.001;
    const guideOne = [];
    for (const it of out) {
      if (it.kind === "cell") {
        const inWin = it.w >= wi && it.w < wi + W;
        const bright = hl === "base" ? 1.15 : (hl === "pos" ? 1.3 : null);
        cells.push({
          c: [it.c[0] - x0, it.c[1], it.c[2]], s: it.s, pick: it.pick,
          token: it.one ? K.BASE_TOKEN[seq[it.w]] : "--stage-mute",
          k: it.one ? (bright || (inWin ? 1.0 : 0.62)) : (inWin ? 0.3 : 0.15),
          alpha: it.one ? (inWin || bright ? 1 : 0.8) : (inWin ? 0.45 : 0.28)
        });
      } else if (it.kind === "bar") {
        const cur = it.w === wi, perfect = f.scores[it.w] === W;
        if (cur) topOfHere = it.c[1] + it.s[1] / 2;
        cells.push({
          c: [it.c[0] - x0, it.c[1], it.c[2]], s: it.s, pick: it.pick,
          token: cur || perfect ? "--gn-hit" : "--gn-core",
          k: cur ? LIT : (perfect ? 1.1 : (hl === "win" || it.w === hov ? 1.0 : 0.62)),
          alpha: cur ? 1 : (hl === "win" || it.w === hov ? 0.95 : 0.78)
        });
      } else {
        const x = it.c[0] + slide;
        const hit = seq[wi + it.l] === f.guide[it.l];
        if (it.one) guideOne[it.l] = {x, y: it.c[1], hit, g: it.s[0] / (CP * 0.66)};
        cells.push({
          c: [x, it.c[1], it.c[2]], s: it.s,
          token: !it.one ? "--stage-mute" : (hl === "base" ? K.BASE_TOKEN[f.guide[it.l]] : (hit ? "--gn-hit" : "--gn-miss")),
          k: !it.one ? 0.7 : (hl === "guide" ? 1.7 : 1.25), alpha: 1
        });
      }
    }
    // One join per guide column, from its 1 to the 1 of the sequence under it:
    // straight where they agree, slanting across rows where they do not.
    for (let l = 0; l < W; l++) {
      const g = guideOne[l], b = seq[wi + l];
      if (!g || !b) continue;
      const hot = GC.BASES.indexOf(b), sx = (wi + l) * CP - x0;
      segs.push({
        a: [g.x, g.y, Z_GUIDE], b: [sx, rowY(hot), 0.1], r: 0.026 * Math.min(1, g.g),
        token: g.hit ? "--gn-hit" : "--gn-miss", k: 1.3, alpha: hl === "pos" || hl === "guide" ? 1 : 0.85
      });
    }
    // The skyline's floor and the line a perfect score reaches.
    segs.push({a: [0, BASE_Y, 0], b: [SPAN, BASE_Y, 0], r: 0.012, token: "--stage-mute", k: NORM, alpha: 0.7});
    segs.push({a: [0, BAR_TOP, 0], b: [SPAN, BAR_TOP, 0], r: 0.01, token: "--stage-mute", k: NORM, alpha: 0.7});

    const mid = slide + (W - 1) / 2 * CP;
    const labels = [
      {text: c.rows.guide, pos: [mid, 0.62, Z_GUIDE], cls: "hit", lit: hl === "guide", size: 13},
      {text: c.win(wi), pos: [mid, GRID_BOTTOM - 0.42, Z_GUIDE], cls: "hit", lit: true, size: 13},
      {text: String(f.scores[wi]), pos: [(wi * CP - x0), topOfHere + 0.46, 0], cls: "hit", lit: true, size: 13},
      {text: String(W), pos: [SPAN + 0.6, BAR_TOP, 0], cls: "mute"},
      {text: c.rows.score, pos: [SPAN - 1.0, BASE_Y - 0.45, 0], cls: "mute", lit: hl === "win"}
    ];
    for (let j = 0; j < 4; j++) {
      labels.push({text: GC.BASES[j], pos: [-0.85, rowY(j), 0], cls: K.BASE_CLS[GC.BASES[j]]});
    }
    // The window's frame, round its twenty columns of both grids.
    const frame = {
      min: [slide - CP / 2, GRID_BOTTOM, -0.14], max: [slide + (W - 1) * CP + CP / 2, 0, Z_GUIDE + 0.16]
    };
    return {cells, segs, labels, frame, bounds: BOUNDS};
  }

  const EN = {
    tab: "search",
    k: "Section 06 · the search",
    h: "One einsum scores all 161 windows, and only one scores 20",
    concept: "Lay the guide's one-hot grid over a window's one-hot grid and the sum counts the " +
             "cells where both have their 1: how many bases agree. Do that for every window at " +
             "once and it is one einsum, a score for each of the 161 windows.",
    predict: "Before you slide: two random 20-base stretches agree at about 5 places, one in four. " +
             "Will the best wrong window score nearer 5 or nearer 15?",
    b: "Behind is the gene's one-hot grid; over a window hovers the guide's own. Where its 1 sits " +
       "on the sequence's 1 the pair is joined in teal, where it misses, in rose. The bars score " +
       "the windows in view. A guide is what Cas12a, the protein this very gene encodes, carries: " +
       "20 bases, matched against DNA. This one is cut from window 41 of this same gene, so a perfect " +
       "match exists by construction. Slide the window, press play, add mismatches. The arithmetic, " +
       "not a design tool.",
    eqcap: "s holds one score for each window w. W[w, ℓ, b] is one-hot base b at position ℓ of " +
           "window w, and q is the guide. The product is 1 only where both name the same base.",
    win: (at) => "window " + (at + 1),
    rows: {guide: "guide q", score: "score s"},
    claim: (at, score, kind, perfect, best, bestAt) =>
      "window " + (at + 1) + ": " + score + " of " + W + " — " + {
        only: "the only perfect one",
        perfect: "one of " + perfect + " perfect",
        best: "the best window",
        tied: "tied for best",
        other: "the best is " + best + " at " + (bestAt + 1)
      }[kind],
    caption: (at, score) => "s[" + at + "] = " + score + " of " + W + " · " + SHOW + " of 180 bases shown",
    read: (at, score, m, perfect, top, mean) =>
      "<b>Window " + (at + 1) + "</b> (bases " + (at + 1) + "–" + (at + W) + ") scores <b>" + score + " of " + W + "</b>. " +
      (m === 0 ? "The guide is exactly its own window. " : m + (m === 1 ? " base has" : " bases have") +
                 " been changed in the guide, and each costs window " + (GUIDE_AT + 1) + " exactly one point. ") +
      (perfect === 0
        ? "No window scores " + W + " now; the best is " + top[0].score + ", at window " + (top[0].at + 1) + ". "
        : perfect === 1
          ? "Exactly one window scores " + W + ", window " + (top[0].at + 1) + "; the best wrong one scores <b>" + top[1].score + "</b>. "
          : perfect + " windows score " + W + ". ") +
      "An average window, over all 161, scores <b>" + mean + "</b>: that is chance.",
    tip: (w, score) => "window " + (w + 1) + " · " + score + " of " + W,
    aria: (ctx) => {
      const s = ctx.state, f = facts(ctx);
      return "The sequence as a grid of four rows, one per base, and the guide's own grid of " + W +
             " columns hovering over window " + (s.at + 1) + ", joined in teal where they agree and rose where " +
             "they do not, with a bar of match scores for every window below. Window " + (s.at + 1) + " scores " +
             f.scores[s.at] + " of " + W + " with " + s.mismatch + " mismatches walked into the guide.";
    },
    controls: {at: "Where the window is", mismatch: "Mismatches in the guide", play: "▶ Slide the guide"},
    options: {},
    np: {
      w: "a view, not a copy",
      guide: (m) => m === 0 ? "W[" + GUIDE_AT + "], unchanged" : "W[" + GUIDE_AT + "], " + m + " changed",
      s: "matches in every window",
      at: (score) => score + " of " + W + " here",
      best: "the top score, and where",
      mean: (v) => v + ": the chance level"
    }
  };

  const ES = {
    tab: "buscar",
    k: "Sección 06 · la búsqueda",
    h: "Un solo einsum puntúa las 161 ventanas, y solo una saca 20",
    concept: "Coloca la rejilla one-hot de la guía sobre la de una ventana y la suma cuenta las " +
             "celdas donde ambas tienen su 1: cuántas bases coinciden. Hazlo para todas las " +
             "ventanas a la vez y es un solo einsum, una puntuación para cada una de las 161.",
    predict: "Antes de deslizar: dos tramos al azar de 20 bases coinciden en unos 5 sitios, uno de " +
             "cada cuatro. ¿La mejor ventana equivocada sacará algo más cerca de 5 o de 15?",
    b: "Detrás está la rejilla one-hot del gen; sobre una ventana flota la de la guía. Donde su 1 " +
       "cae sobre el 1 de la secuencia, el par se une en turquesa; donde falla, en rosa. Las barras " +
       "puntúan las ventanas a la vista. Una guía es lo que lleva Cas12a, la proteína que codifica " +
       "este mismo gen: 20 bases que se buscan en el ADN. Esta está cortada de la ventana 41 de este " +
       "mismo gen, así que existe una coincidencia perfecta por construcción. Desliza la ventana, " +
       "pulsa reproducir, añade cambios. La aritmética, no una herramienta de diseño.",
    eqcap: "s guarda una puntuación por cada ventana w. W[w, ℓ, b] es la base one-hot b en la " +
           "posición ℓ de la ventana w, y q es la guía. El producto vale 1 solo donde ambas nombran la misma base.",
    win: (at) => "ventana " + (at + 1),
    rows: {guide: "guía q", score: "puntos s"},
    claim: (at, score, kind, perfect, best, bestAt) =>
      "ventana " + (at + 1) + ": " + score + " de " + W + " — " + {
        only: "la única perfecta",
        perfect: "una de " + perfect + " perfectas",
        best: "la mejor ventana",
        tied: "empatada como mejor",
        other: "la mejor es " + best + " en " + (bestAt + 1)
      }[kind],
    caption: (at, score) => "s[" + at + "] = " + score + " de " + W + " · " + SHOW + " de 180 bases a la vista",
    read: (at, score, m, perfect, top, mean) =>
      "<b>La ventana " + (at + 1) + "</b> (bases " + (at + 1) + "–" + (at + W) + ") puntúa <b>" + score + " de " + W + "</b>. " +
      (m === 0 ? "La guía es exactamente su propia ventana. " : "Se " + (m === 1 ? "ha cambiado " + m + " base" : "han cambiado " + m + " bases") +
                 " en la guía, y cada una cuesta a la ventana " + (GUIDE_AT + 1) + " exactamente un punto. ") +
      (perfect === 0
        ? "Ninguna ventana puntúa " + W + " ahora; la mejor es " + top[0].score + ", en la ventana " + (top[0].at + 1) + ". "
        : perfect === 1
          ? "Exactamente una ventana puntúa " + W + ", la " + (top[0].at + 1) + "; la mejor equivocada puntúa <b>" + top[1].score + "</b>. "
          : perfect + " ventanas puntúan " + W + ". ") +
      "Una ventana media, de las 161, puntúa <b>" + mean + "</b>: eso es el azar.",
    tip: (w, score) => "ventana " + (w + 1) + " · " + score + " de " + W,
    aria: (ctx) => {
      const s = ctx.state, f = facts(ctx);
      return "La secuencia como una rejilla de cuatro filas, una por base, y la rejilla propia de la guía, de " + W +
             " columnas, flotando sobre la ventana " + (s.at + 1) + ", unidas en turquesa donde coinciden y en rosa " +
             "donde no, con una barra de puntuaciones para cada ventana debajo. La ventana " + (s.at + 1) + " puntúa " +
             f.scores[s.at] + " de " + W + " con " + s.mismatch + " cambios en la guía.";
    },
    controls: {at: "Dónde está la ventana", mismatch: "Cambios en la guía", play: "▶ Deslizar la guía"},
    options: {},
    np: {
      w: "una vista, no una copia",
      guide: (m) => m === 0 ? "W[" + GUIDE_AT + "], sin cambios" : "W[" + GUIDE_AT + "], " + m + " cambiadas",
      s: "aciertos en cada ventana",
      at: (score) => score + " de " + W + " aquí",
      best: "la mejor puntuación y dónde",
      mean: (v) => v + ": el nivel del azar"
    }
  };

  window.GenomeScenes.register({
    id: "search", section: "06", gl: true,
    part: {en: "The search is one einsum", es: "La búsqueda es un solo einsum"},
    hl: ["win", "pos", "base", "guide"],
    copy: {en: EN, es: ES},

    // Nearly square-on, so the grids read as the matrices they are; the guide
    // hovers in front of the window, which a little turn makes plain.
    pose: {fov: 30, home: {az: -0.28, el: 0.26}, margin: 1.04,
           limits: {azMin: -0.8, azMax: 0.8, elMin: -0.2, elMax: 0.9, dollyMin: 0.5, dollyMax: 1.8}},

    controls: [
      {id: "at", type: "range", min: 0, max: LAST, step: 1, fmt: (v) => (v + 1) + "–" + (v + W)},
      {id: "mismatch", type: "range", min: 0, max: W, step: 1, fmt: (v) => String(v)},
      {id: "play", type: "play", target: "at", rate: 30}
    ],

    init(ctx) {
      ctx.state.at = GUIDE_AT;
      ctx.state.mismatch = 0;
    },

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) {
      const ch = ctx.cache.ch || {};
      return K.arrival(ctx, ENTRANCE) < 1 || !!(ch.s0 && ch.s0.moving) || !!(ch.w && ch.w.moving) ||
             !!(ctx.cache.ease && ctx.cache.ease.moving);
    },
    bounds() { return BOUNDS; },

    pick(ctx, key) {
      if (key.startsWith("s:") || key.startsWith("b:")) ctx.setControls({at: Math.min(Number(key.slice(2)), LAST)});
    },
    tip(ctx, key) {
      if (!key.startsWith("s:") && !key.startsWith("b:")) return "";
      const w = Math.min(Number(key.slice(2)), LAST);
      return ctx.copy.tip(w, facts(ctx).scores[w]);
    },
    // The ribbon under the stage: a press on the gene puts the window there.
    seek(ctx, i) { ctx.setControls({at: clamp(i, 0, LAST)}); },

    build(ctx) {
      const THREE = ctx.THREE;
      const scene = new THREE.Scene();
      K.light(scene);
      // Two stretches of sequence cells (one leaving as one arrives), the
      // bars, and the guide's eighty.
      const vox = K.voxels(2 * (SHOW + 6) * 4 + 2 * (SHOW + 6) + 4 * W + 40);
      scene.add(vox.mesh, vox.hit);
      const seg = K.segments(W + 8);
      scene.add(seg.mesh);
      const frame = K.frameBox("--gn-hit", 0.95);
      scene.add(frame);
      const keys = [];
      return {
        scene, vox, seg, frame, keys, labels: K.labelPool(scene), col: K.palette(),
        cam: new THREE.PerspectiveCamera(this.pose.fov, ctx.aspect, 0.1, 500),
        pick: [{mesh: vox.hit, key: (id) => keys[id] || null}]
      };
    },

    render(ctx, gl) {
      const m = shown(ctx);
      gl.keys.length = 0;
      const cells = m.cells.slice(0, gl.vox.n);
      cells.forEach((v, n) => {
        gl.vox.set(n, v.c, v.s, gl.col(v.token, v.k));
        gl.keys[n] = v.pick || null;
      });
      gl.vox.count(cells.length);
      gl.vox.commit();
      m.segs.forEach((g, n) => gl.seg.set(n, g.a, g.b, g.r, gl.col(g.token, g.k)));
      gl.seg.count(m.segs.length);
      gl.seg.commit();
      K.setBox(gl.frame, m.frame.min, m.frame.max);
      gl.labels.sync(m.labels);
    },

    // The twin: the same model, through the same orbit, fitted to the board.
    draw(ctx) {
      const m = shown(ctx), b = m.bounds;
      const P = ctx.projector(K.corners(b.min, b.max), ctx.box());
      const B = ctx.basis();
      K.boxes2(ctx.svg, m.cells, B, P);
      K.edges2(ctx.svg, m.frame.min, m.frame.max, P, "--gn-hit");
      K.segments2(ctx.svg, m.segs, B, P);
      K.labels2(ctx.svg, m.labels, P);
    },

    readout(ctx) {
      const s = ctx.state, c = ctx.copy, f = facts(ctx);
      const score = f.scores[s.at], kind = kindOf(f, s.at);
      const mean = K.num(f.mean, 1, ctx.lang);
      return {
        html: c.read(s.at, score, s.mismatch, f.perfect, f.top, mean),
        claim: c.claim(s.at, score, kind, f.perfect, f.top[0].score, f.top[0].at),
        caption: c.caption(s.at, score),
        lens: {a: s.at, b: s.at + W, done: [GUIDE_AT, GUIDE_AT + W]},
        data: {
          at: String(s.at), mismatch: String(s.mismatch), score: String(score), kind,
          best: String(f.top[0].score), bestat: String(f.top[0].at), perfect: String(f.perfect),
          runnerup: String(f.top[1].score), windows: String(f.win.count),
          shape: f.win.shape.join(","), mean: f.mean.toFixed(1)
        }
      };
    },

    code(ctx) {
      const s = ctx.state, np = ctx.copy.np, f = facts(ctx);
      const n = f.win.count;
      return K.code([
        ["W = windows(X, " + W + ")", "(" + n + ", " + W + ", 4): " + np.w],
        ["q = one_hot(guide)", "(" + W + ", 4): " + np.guide(s.mismatch)],
        ['s = np.einsum("wlb,lb->w", W, q)', "(" + n + ",): " + np.s],
        ["s[" + s.at + "]", np.at(f.scores[s.at])],
        ["s.max(), s.argmax()", f.top[0].score + ", " + f.top[0].at + ": " + np.best],
        ["s.mean()", np.mean(f.mean.toFixed(1))]
      ]);
    }
  });
})();
