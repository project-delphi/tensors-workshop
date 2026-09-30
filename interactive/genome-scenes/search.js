// Scene 7: the search is one einsum. A stretch of the sequence as a row of
// beads, the current window of 20 lit against the rest, the guide above it
// base by base (teal where it matches, rose where it does not), and the match
// score of every window in view as a row of bars below. Drag the window along
// and the bars are the answer to "where does it fit"; walk mismatches into the
// guide and watch the only perfect bar come down, one for each. Drawn in
// three.js, with an SVG twin from the same model.
// See genome-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const GC = window.GenomeCore, K = window.GenomeKit;

  const W = 20;                // the guide's length, and the window's
  const GUIDE_AT = 40;         // the window the guide is cut from
  const SHOW = 60;             // bases on screen, out of 180: 180 beads across the board would be specks
  const SP = 0.3;              // bead spacing
  const GY = 0.9, BASE_Y = -2.6, BARH = 1.6;   // guide row, bar baseline, full-score bar height
  const Z_GUIDE = 0.45, Z_BAR = -0.45;
  const TAU = 0.2;
  const DIM = 0.5, NORM = 0.9, LIT = 1.3;

  // Where the stretch on screen starts: the window sits a third of the way in
  // where it can, and the stretch stops at either end of the sequence.
  const startOf = (at, len) => Math.max(0, Math.min(at - 20, len - SHOW));

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
      f = ctx.cache.facts = {m: s.mismatch, win, guide, scores, top, perfect,
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

  function target(ctx) {
    const s = ctx.state, hl = ctx.hl, seq = ctx.seq, c = ctx.copy, f = facts(ctx);
    const s0 = startOf(s.at, seq.length);
    const here = f.scores[s.at];
    const items = [];
    for (let w = s0; w < s0 + SHOW; w++) {
      const inWin = w >= s.at && w < s.at + W;
      items.push({
        key: "s:" + w, kind: "seq", w, c: [(w - s0) * SP, 0, 0], s: 1,
        token: K.BASE_TOKEN[seq[w]],
        k: inWin ? LIT : (hl === "base" ? NORM : DIM),
        alpha: inWin || hl === "base" ? 1 : 0.5, pick: "s:" + w
      });
    }
    for (let l = 0; l < W; l++) {
      const hit = seq[s.at + l] === f.guide[l];
      const base = hl === "base";
      items.push({
        key: "g:" + l, kind: "guide", l, hit, c: [(s.at - s0 + l) * SP, GY, Z_GUIDE], s: 1,
        token: base ? K.BASE_TOKEN[f.guide[l]] : (hit ? "--gn-hit" : "--gn-miss"),
        k: hit ? NORM : LIT, alpha: 1, big: hl === "guide"
      });
    }
    // A bar for the window that starts under each base that can start one.
    for (let w = s0; w <= s0 + SHOW - W; w++) {
      const h = Math.max(0.001, (f.scores[w] / W) * BARH);
      const cur = w === s.at;
      items.push({
        key: "b:" + w, kind: "bar", w, c: [(w - s0) * SP, BASE_Y + h / 2, Z_BAR],
        s: [SP * 0.7, h, SP * 0.7],
        token: cur || f.scores[w] === W ? "--gn-hit" : "--gn-core",
        k: cur ? LIT : (f.scores[w] === W ? 1 : (hl === "win" ? 0.95 : 0.65)),
        alpha: cur ? 1 : (hl === "win" ? 0.95 : 0.7), pick: "b:" + w
      });
    }
    const labels = [
      {text: c.rows.guide, pos: [-1.35, GY, Z_GUIDE], cls: "mute", lit: hl === "guide"},
      {text: c.rows.seq, pos: [-1.35, 0, 0], cls: "mute", lit: hl === "pos"},
      {text: c.rows.score, pos: [-1.35, BASE_Y + BARH / 2, Z_BAR], cls: "mute", lit: hl === "win"},
      {text: c.win(s.at), pos: [(s.at - s0 + (W - 1) / 2) * SP, GY + 0.55, Z_GUIDE], cls: "hit", lit: true, size: 13},
      {text: String(here), pos: [(s.at - s0) * SP, BASE_Y + Math.max(0.3, (here / W) * BARH) + 0.4, Z_BAR], cls: "hit", lit: true},
      {text: String(W), pos: [(SHOW - W) * SP + 0.7, BASE_Y + BARH, Z_BAR], cls: "mute"}
    ];
    // The frame is the same at every setting: rows, bars and their chips all
    // sit inside it, so the camera does not move when a slider does.
    const bounds = K.withLabels({
      min: [-2.8, BASE_Y - 0.3, -0.9], max: [(SHOW - 1) * SP + 0.9, GY + 0.6, 0.9]
    }, labels);
    return {items, labels, bounds, s0};
  }

  function shown(ctx) {
    const c = ctx.cache, t = ctx.now();
    const key = JSON.stringify(ctx.state) + "|" + ctx.hl + "|" + ctx.hover;
    if (c.memo && c.memo.key === key && t - c.memo.t < 4) return c.memo.m;
    const want = target(ctx);
    c.ease = c.ease || {};
    const out = K.follow(c.ease, want.items, t, TAU, ctx.instant);
    const m = compose(ctx, want, out);
    c.memo = {key, t, m};
    return m;
  }

  // From eased pieces to beads, ties, bars and the two rules.
  function compose(ctx, want, out) {
    const hl = ctx.hl;
    const beads = [], bars = [], segs = [];
    const span = (SHOW - 1) * SP;
    out.forEach((it) => {
      if (it.kind === "bar") { bars.push(it); return; }
      const guide = it.kind === "guide";
      beads.push({
        c: it.c, r: (guide ? 0.12 : 0.11) * it.s[0] * (guide && it.big ? 1.3 : 1),
        token: it.token, k: it.k, alpha: it.alpha, pick: it.pick
      });
      if (guide) {
        const tie = hl === "pos" || hl === "guide";
        segs.push({
          a: [it.c[0], it.c[1] - 0.12, it.c[2]], b: [it.c[0], 0.11, 0], r: 0.012 * it.s[0],
          token: it.hit ? "--gn-hit" : "--gn-miss", k: 0.8, alpha: tie ? 0.95 : 0.5
        });
      }
    });
    // The floor of the bars and the line a perfect score reaches.
    segs.push({a: [0, BASE_Y, Z_BAR], b: [span, BASE_Y, Z_BAR], r: 0.012, token: "--stage-mute", k: 0.8, alpha: 0.6});
    segs.push({a: [0, BASE_Y + BARH, Z_BAR], b: [span, BASE_Y + BARH, Z_BAR], r: 0.008, token: "--stage-mute", k: 0.8, alpha: 0.4});
    return {beads, bars, segs, labels: want.labels, bounds: want.bounds};
  }

  const EN = {
    k: "Section 06 · the search",
    h: "Searching is one contraction, and one window out of 161 is the perfect match",
    concept: "A window is a view of 20 bases; a guide is 20 one-hot rows. Multiply them position " +
             "by position and sum over both the positions and the alphabet, and the answer is " +
             "how many bases agree: a score for every window, from one einsum.",
    predict: "Before you walk the guide off its own window: the guide is cut from window 40, " +
             "so it scores 20 of 20 there. What does the next best window score, and what does " +
             "each mismatch cost?",
    b: "The top row is the guide, 20 bases. The middle row is the sequence, with the current " +
       "window lit. A teal bead is a base where the guide agrees with the window and a rose one " +
       "is where it does not. Below, every window in view has a bar: its score, the number of " +
       "agreeing bases out of 20. The guide was cut from window 40, so there it scores 20 and " +
       "<b>it is the only window that does</b>; the next best scores 12. Raise the mismatch slider " +
       "and the guide changes one base at a time, outside in: each change costs that window " +
       "exactly one point, and the lead over the runner-up shrinks until another window is best. " +
       "The screen shows about 60 of the 180 bases around the window, and the bars are the window " +
       "scores for those; the readout counts all 161.",
    eqcap: "s holds one score for each window w. W[w, ℓ, b] is one-hot base b at position ℓ of " +
           "window w, and q is the guide. The product is 1 only where both name the same base.",
    win: (at) => "window " + at,
    rows: {guide: "guide", seq: "sequence", score: "score"},
    claim: (at, score, kind, perfect, best, bestAt) =>
      "window " + at + ": " + score + " of " + W + " — " + {
        only: "the only perfect one",
        perfect: "one of " + perfect + " perfect",
        best: "the best window",
        tied: "tied for best",
        other: "the best is " + best + " at " + bestAt
      }[kind],
    read: (at, score, m, perfect, top) =>
      "<b>Window " + at + "</b> (bases " + (at + 1) + "–" + (at + W) + ") scores <b>" + score + " of " + W + "</b>. " +
      (m === 0 ? "The guide is exactly its own window. " : m + (m === 1 ? " base has" : " bases have") +
                 " been changed in the guide, and each costs one point. ") +
      (perfect === 0
        ? "No window scores " + W + " now; the best is " + top[0].score + ", at window " + top[0].at + "."
        : perfect === 1
          ? "Exactly one window scores " + W + ", window " + top[0].at + "; the next best scores " + top[1].score + "."
          : perfect + " windows score " + W + "."),
    tip: (w, score) => "window " + w + " · " + score + " of " + W,
    aria: (ctx) => {
      const s = ctx.state, f = facts(ctx);
      return "About 60 bases of the sequence as a row of beads, the guide of " + W + " bases above window " +
             s.at + ", and a bar of match scores for every window below. Window " + s.at + " scores " +
             f.scores[s.at] + " of " + W + " with " + s.mismatch + " mismatches walked into the guide.";
    },
    controls: {at: "Where the window is", mismatch: "Mismatches in the guide"},
    options: {},
    np: {
      w: "a view, not a copy",
      guide: (m) => m === 0 ? "window " + GUIDE_AT + ", unchanged" : "window " + GUIDE_AT + ", " + m + " changed",
      s: "matches in every window",
      at: (score) => score + " of " + W + " here",
      best: "the top score, and where"
    }
  };

  const ES = {
    k: "Sección 06 · la búsqueda",
    h: "Buscar es una contracción, y una ventana de 161 es la coincidencia perfecta",
    concept: "Una ventana es una vista de 20 bases; una guía son 20 filas one-hot. Multiplícalas " +
             "posición por posición y suma sobre las posiciones y el alfabeto a la vez: sale " +
             "cuántas bases coinciden, una puntuación para cada ventana, de un solo einsum.",
    predict: "Antes de alejar la guía de su propia ventana: la guía se cortó de la ventana 40, así " +
             "que allí puntúa 20 de 20. ¿Cuánto puntúa la siguiente mejor ventana, y cuánto cuesta " +
             "cada cambio?",
    b: "La fila de arriba es la guía, de 20 bases. La del medio es la secuencia, con la ventana " +
       "actual iluminada. Una cuenta turquesa es una base donde la guía coincide con la ventana y " +
       "una rosa es donde no. Abajo, cada ventana a la vista tiene una barra: su puntuación, el " +
       "número de bases que coinciden de 20. La guía se cortó de la ventana 40, así que allí " +
       "puntúa 20 y <b>es la única ventana que lo hace</b>; la siguiente mejor puntúa 12. Sube el " +
       "deslizador de cambios y la guía cambia una base cada vez, de fuera hacia dentro: cada " +
       "cambio cuesta a esa ventana exactamente un punto, y la ventaja sobre la segunda se " +
       "acorta hasta que otra ventana es la mejor. La pantalla muestra unas 60 de las 180 bases " +
       "alrededor de la ventana, y las barras son las puntuaciones de esas; la lectura cuenta las 161.",
    eqcap: "s guarda una puntuación por cada ventana w. W[w, ℓ, b] es la base one-hot b en la " +
           "posición ℓ de la ventana w, y q es la guía. El producto vale 1 solo donde ambas nombran la misma base.",
    win: (at) => "ventana " + at,
    rows: {guide: "guía", seq: "secuencia", score: "puntos"},
    claim: (at, score, kind, perfect, best, bestAt) =>
      "ventana " + at + ": " + score + " de " + W + " — " + {
        only: "la única perfecta",
        perfect: "una de " + perfect + " perfectas",
        best: "la mejor ventana",
        tied: "empatada como mejor",
        other: "la mejor es " + best + " en " + bestAt
      }[kind],
    read: (at, score, m, perfect, top) =>
      "<b>La ventana " + at + "</b> (bases " + (at + 1) + "–" + (at + W) + ") puntúa <b>" + score + " de " + W + "</b>. " +
      (m === 0 ? "La guía es exactamente su propia ventana. " : "Se " + (m === 1 ? "ha cambiado " + m + " base" : "han cambiado " + m + " bases") +
                 " en la guía, y cada una cuesta un punto. ") +
      (perfect === 0
        ? "Ninguna ventana puntúa " + W + " ahora; la mejor es " + top[0].score + ", en la ventana " + top[0].at + "."
        : perfect === 1
          ? "Exactamente una ventana puntúa " + W + ", la " + top[0].at + "; la siguiente mejor puntúa " + top[1].score + "."
          : perfect + " ventanas puntúan " + W + "."),
    tip: (w, score) => "ventana " + w + " · " + score + " de " + W,
    aria: (ctx) => {
      const s = ctx.state, f = facts(ctx);
      return "Unas 60 bases de la secuencia como una fila de cuentas, la guía de " + W + " bases sobre la ventana " +
             s.at + ", y abajo una barra de puntuaciones para cada ventana. La ventana " + s.at + " puntúa " +
             f.scores[s.at] + " de " + W + " con " + s.mismatch + " cambios en la guía.";
    },
    controls: {at: "Dónde está la ventana", mismatch: "Cambios en la guía"},
    options: {},
    np: {
      w: "una vista, no una copia",
      guide: (m) => m === 0 ? "ventana " + GUIDE_AT + ", sin cambios" : "ventana " + GUIDE_AT + ", " + m + " cambiadas",
      s: "aciertos en cada ventana",
      at: (score) => score + " de " + W + " aquí",
      best: "la mejor puntuación y dónde"
    }
  };

  window.GenomeScenes.register({
    id: "search", section: "06", gl: true,
    part: {en: "The search is one einsum", es: "La búsqueda es un solo einsum"},
    hl: ["win", "pos", "base", "guide"],
    copy: {en: EN, es: ES},

    // A long flat row: a wide turn shows it edge-on and a tall one from
    // above, neither of which says anything, so the orbit is narrow.
    pose: {fov: 30, home: {az: -0.3, el: 0.28}, margin: 1.06,
           limits: {azMin: -0.8, azMax: 0.8, elMin: -0.2, elMax: 0.9, dollyMin: 0.5, dollyMax: 1.8}},

    controls: [
      {id: "at", type: "range", min: 0, max: GC.CDS.length - W, step: 1, fmt: (v) => String(v)},
      {id: "mismatch", type: "range", min: 0, max: W, step: 1, fmt: (v) => String(v)}
    ],

    init(ctx) {
      ctx.state.at = GUIDE_AT;
      ctx.state.mismatch = 0;
    },

    animates(ctx) { return !!(ctx.cache.ease && ctx.cache.ease.moving); },
    bounds(ctx) { return target(ctx).bounds; },

    pick(ctx, key) {
      const w = Number(key.slice(2));
      if (key.startsWith("s:") || key.startsWith("b:")) ctx.setControls({at: Math.min(w, ctx.seq.length - W)});
    },
    tip(ctx, key) {
      if (!key.startsWith("s:") && !key.startsWith("b:")) return "";
      const w = Math.min(Number(key.slice(2)), ctx.seq.length - W);
      return ctx.copy.tip(w, facts(ctx).scores[w]);
    },

    build(ctx) {
      const THREE = ctx.THREE;
      const scene = new THREE.Scene();
      K.light(scene);
      // 60 in view and up to 60 leaving as the stretch slides, and the guide.
      const sph = K.spheres(2 * SHOW + W + 10);
      scene.add(sph.mesh, sph.hit);
      const bars = K.voxels(2 * (SHOW - W + 1) + 8);
      scene.add(bars.mesh, bars.hit);
      const seg = K.segments(W + 4);
      scene.add(seg.mesh);
      const keys = [], barKeys = [];
      return {
        scene, sph, bars, seg, keys, barKeys, labels: K.labelPool(scene), col: K.palette(),
        cam: new THREE.PerspectiveCamera(this.pose.fov, ctx.aspect, 0.1, 500),
        pick: [{mesh: sph.hit, key: (id) => keys[id] || null},
               {mesh: bars.hit, key: (id) => barKeys[id] || null}]
      };
    },

    render(ctx, gl) {
      const m = shown(ctx);
      gl.keys.length = 0;
      gl.barKeys.length = 0;
      m.beads.forEach((b, n) => {
        gl.sph.set(n, b.c, b.r, gl.col(b.token, b.k));
        gl.keys[n] = b.pick || null;
      });
      gl.sph.count(m.beads.length);
      gl.sph.commit();
      m.bars.forEach((b, n) => {
        gl.bars.set(n, b.c, b.s, gl.col(b.token, b.k));
        gl.barKeys[n] = b.pick || null;
      });
      gl.bars.count(m.bars.length);
      gl.bars.commit();
      m.segs.forEach((g, n) => gl.seg.set(n, g.a, g.b, g.r, gl.col(g.token, g.k)));
      gl.seg.count(m.segs.length);
      gl.seg.commit();
      gl.labels.sync(m.labels);
    },

    // The twin: the same model, through the same orbit, fitted to the board.
    draw(ctx) {
      const m = shown(ctx), b = m.bounds;
      const P = ctx.projector(K.corners(b.min, b.max), ctx.box());
      const B = ctx.basis();
      K.segments2(ctx.svg, m.segs, B, P);
      K.boxes2(ctx.svg, m.bars.map((it) => ({c: it.c, s: it.s, token: it.token, alpha: it.alpha, pick: it.pick})), B, P);
      K.spheres2(ctx.svg, m.beads, B, P);
      K.labels2(ctx.svg, m.labels, P);
    },

    readout(ctx) {
      const s = ctx.state, c = ctx.copy, f = facts(ctx);
      const score = f.scores[s.at], kind = kindOf(f, s.at);
      return {
        html: c.read(s.at, score, s.mismatch, f.perfect, f.top),
        claim: c.claim(s.at, score, kind, f.perfect, f.top[0].score, f.top[0].at),
        data: {
          at: String(s.at), mismatch: String(s.mismatch), score: String(score), kind,
          best: String(f.top[0].score), bestat: String(f.top[0].at), perfect: String(f.perfect),
          runnerup: String(f.top[1].score), windows: String(f.win.count),
          shape: f.win.shape.join(",")
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
        ["s.max(), s.argmax()", f.top[0].score + ", " + f.top[0].at + ": " + np.best]
      ]);
    }
  });
})();
