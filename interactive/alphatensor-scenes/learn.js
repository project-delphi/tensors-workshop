// Scene 12: the record board, and what a rank-R split of 3 x 3 would buy.
// The game's score is a count of moves, and so are the records, so the top of
// the board is the records as counts of blocks on one shared scale: 2 x 2 is
// proved at 7, 3 x 3 is known only to lie between 19 and 23, 4 x 4 is 49 from
// Strassen applied twice, and AlphaTensor's two reported results are the
// arrows that fall from 49 to 47 (mod 2) and from 80 to 76. The bottom is the
// exponent line: each block fewer lowers n^(log_n R), and Strassen's 2.807 is
// the bar a 3 x 3 split has to clear. Nothing here runs a network; the records
// are quoted from the papers (see the README's table). Flat: SVG only, and it
// has no seek because it is about a count, not about the cube's cells.
// See alphatensor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const AC = window.AlphaTensorCore, K = window.AlphaTensorKit;

  const RECS = AC.RECORDS;
  const IDS = RECS.map((r) => r.id);
  const REC3 = RECS.find((r) => r.id === "3x3");
  const LOW = REC3.lower, HIGH = REC3.upper;
  const SCHOOL = 27;                               // 3^3, the schoolbook rule
  // The largest R whose exponent is still below Strassen's: computed, not typed.
  const NEED = (() => { let R = 2; while (AC.exponent(3, R + 1) < AC.OMEGA) R++; return R; })();

  // The record board: one shared scale of blocks, 0 .. 80.
  const BX0 = 236, BPER = 6.6, RY0 = 100, RH = 40;
  const bx = (v) => BX0 + v * BPER;
  const ry = (i) => RY0 + i * RH;
  // The exponent line: 2.6 .. 3.0.
  const EX0 = 60, EX1 = 760, E0 = 2.6, E1 = 3.0, EY = 386;
  const ex = (e) => EX0 + (e - E0) / (E1 - E0) * (EX1 - EX0);
  const ENTRANCE = 3400, ROW_MS = 380, SLIDE_AT = 2150, SLIDE_MS = 1000;

  const expOf = (r) => AC.exponent(3, r);
  const e3 = (r) => K.fmt(expOf(r), 3);
  const rec = (ctx) => RECS.find((r) => r.id === ctx.state.row);
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  // Diagonal hatching clipped to a rectangle: the stretch nobody knows.
  function hatch(parent, x, y, w, h, colour) {
    for (let d = -h + 5; d < w; d += 6) {
      const xa = Math.max(0, d), xb = Math.min(w, d + h);
      const ya = h - (xa - d), yb = h - (xb - d);
      parent.appendChild(K.el("line", {x1: x + xa, y1: y + ya, x2: x + xb, y2: y + yb,
        stroke: K.css(colour), "stroke-width": 1.6}));
    }
  }

  function rowSentence(c, r) {
    if (r.id === "2x2") return c.s2x2(r.upper);
    if (r.id === "3x3") return c.s3x3(r.lower, r.upper);
    if (r.id === "4x4") return c.s4x4(r.upper);
    if (r.id === "4x4mod2") return c.s4x4mod2(r.upper, r.before);
    return c.s4x5(r.upper, r.before);
  }

  const EN = {
    tab: "learn",
    k: "Section 11 · the records",
    h: "The records are counts of blocks, and for 3 × 3 the count is still open",
    predict: "Laderman's 23-block way of multiplying 3 × 3 matrices has stood since 1976, and the best proof " +
             "says no way has fewer than 19. How few blocks would it take to beat Strassen's exponent: 22, 21 or 20?",
    concept: "The game's score is a count of moves, and so are the records: the fewest blocks anyone has found " +
             "for a size. Each block fewer lowers the exponent of the whole method, because the split is applied " +
             "to blocks, over and over. Below 19 blocks there is nothing to find for 3 × 3; between 19 and 23 " +
             "nobody knows.",
    b: "<b>Pick a row</b> of the board, or choose a size, and slide <b>the number of blocks</b> to see what a " +
       "split of 3 × 3 into that many blocks would cost. AlphaTensor is a network that ranks moves and " +
       "estimates how many are left, plus a tree search that looks ahead along the moves the network rates " +
       "highly, trained partly on made-up tensors whose answers are known. <b>Nothing here runs it.</b> Its two " +
       "counts are quoted as <b>reported</b> in the paper, and the 47 holds only in arithmetic mod 2. The " +
       "exponent counts multiplications only, not the extra additions.",
    eqcap: "What a split into R blocks buys: apply it k times to blocks and an n^k × n^k product costs R^k " +
           "multiplications, which is (n^k) raised to log base n of R. R is the number of blocks, the thing " +
           "the records count.",
    claim: (r, e, beats) => r + " blocks → " + e + (beats ? " · beats Strassen's " : " · not under Strassen's ") +
                            K.fmt(AC.OMEGA, 3),
    board: "blocks needed (fewest known)",
    unit: "blocks",
    sizes: {"2x2": "2 × 2", "3x3": "3 × 3", "4x4": "4 × 4", "4x4mod2": "4 × 4, arithmetic mod 2", "4x5": "4 × 5 by 5 × 5"},
    short: {"2x2": "2 × 2", "3x3": "3 × 3", "4x4": "4 × 4", "4x4mod2": "4 × 4, mod 2", "4x5": "4 × 5 by 5 × 5"},
    proved: "7: proved (Winograd, 1971)",
    gap1: "19 proved, 23 found (1976)", gap2: "nobody knows between",
    twice: "49: Strassen applied twice",
    at47: "AlphaTensor reported 47", at76: "AlphaTensor reported 76",
    was: (v) => "was " + v,
    expTitle: "What a split of 3 × 3 into R blocks costs: n^(log₃ R)",
    floor: "proved floor", impossible: "proved impossible",
    school: "schoolbook, 27 blocks", strassen: "Strassen",
    mark: (r, e) => "R = " + r + " → " + e,
    win: "would beat Strassen", lose: "would not beat Strassen", tie: "the schoolbook rule",
    beatsZone: "beats Strassen", losesZone: "does not",
    s2x2: (u) => "2 × 2: " + u + " blocks, proved the fewest (Winograd, 1971).",
    s3x3: (l, u) => "3 × 3: at least " + l + " blocks (Bläser, 2003), at most " + u + " (Laderman, 1976), and nobody knows which.",
    s4x4: (u) => "4 × 4: Strassen applied twice gives " + u + ".",
    s4x4mod2: (u, b) => "4 × 4 in arithmetic mod 2: AlphaTensor reported " + u + ", where Strassen applied twice gives " + b + ".",
    s4x5: (u, b) => "4 × 5 by 5 × 5: AlphaTensor reported " + u + ", where the best known was " + b + ".",
    read: (need, r, e, beats, om, tie, row, next) =>
      "<b>" + need + ".</b> " + (tie ? "27 blocks is the schoolbook rule itself, exponent 3. "
        : "A split of 3 × 3 into " + r + " blocks costs n^" + e + ", " + (beats
          ? "which beats Strassen's " + om + ". " : "which does not beat Strassen's " + om + ". ")) +
      "Beating it takes " + need + " blocks or fewer; " + (need + 1) + " comes to " + next + ", still behind. " + row,
    aria: (ctx) => "A board of the fewest blocks known per size on one scale from 0 to 80: " +
      RECS.map((r) => EN.short[r.id] + " " + r.upper).join(", ") + ", with 3 × 3 only known to lie between " +
      LOW + " and " + HIGH + ". Under it an exponent line from 2.6 to 3.0 where " + ctx.state.r + " blocks cost " +
      e3(ctx.state.r) + " against Strassen's 2.807.",
    controls: {row: "Which size", r: "Blocks in a split of 3 × 3", play: "▶ Walk from 19 to 27"},
    options: {row: {"2x2": "2 × 2", "3x3": "3 × 3", "4x4": "4 × 4", "4x4mod2": "4 × 4, arithmetic mod 2", "4x5": "4 × 5 by 5 × 5"}},
    np: {cost: (r) => "what " + r + " blocks cost", strassen: "Strassen",
         win: (n) => "so " + n + " blocks would win"}
  };

  const ES = {
    tab: "récords",
    k: "Sección 11 · los récords",
    h: "Los récords son conteos de bloques, y para 3 × 3 el conteo sigue abierto",
    predict: "La forma de Laderman de multiplicar matrices de 3 × 3 con 23 bloques se mantiene desde 1976, y la " +
             "mejor demostración dice que ninguna usa menos de 19. ¿Cuántos bloques bastarían para superar el " +
             "exponente de Strassen: 22, 21 o 20?",
    concept: "La puntuación del juego es un conteo de jugadas, y los récords también: la menor cantidad de " +
             "bloques que alguien ha encontrado para un tamaño. Cada bloque de menos baja el exponente de todo " +
             "el método, porque la división se aplica a bloques, una y otra vez. Por debajo de 19 bloques no hay " +
             "nada que encontrar para 3 × 3; entre 19 y 23 nadie lo sabe.",
    b: "<b>Elige una fila</b> del tablero, o un tamaño, y desliza <b>el número de bloques</b> para ver cuánto " +
       "costaría dividir 3 × 3 en tantos bloques. AlphaTensor es una red que ordena jugadas y estima cuántas " +
       "quedan, más una búsqueda en árbol que mira hacia adelante por las jugadas que la red valora, entrenada " +
       "en parte con tensores inventados cuya respuesta se conoce. <b>Aquí no corre nada de eso.</b> Sus dos " +
       "cifras se citan como <b>reportadas</b> en el artículo, y el 47 vale solo en aritmética módulo 2. El " +
       "exponente cuenta solo multiplicaciones, no las sumas de más.",
    eqcap: "Lo que compra una división en R bloques: aplícala k veces a bloques y un producto de n^k × n^k " +
           "cuesta R^k multiplicaciones, es decir, (n^k) elevado al logaritmo en base n de R. R es el número " +
           "de bloques, lo que cuentan los récords.",
    claim: (r, e, beats) => r + " bloques → " + e + (beats ? " · supera el " : " · no baja del ") +
                            K.fmt(AC.OMEGA, 3).replace(".", ",") + " de Strassen",
    board: "bloques necesarios (el mínimo conocido)",
    unit: "bloques",
    sizes: {"2x2": "2 × 2", "3x3": "3 × 3", "4x4": "4 × 4", "4x4mod2": "4 × 4, aritmética mod 2", "4x5": "4 × 5 por 5 × 5"},
    short: {"2x2": "2 × 2", "3x3": "3 × 3", "4x4": "4 × 4", "4x4mod2": "4 × 4, mod 2", "4x5": "4 × 5 por 5 × 5"},
    proved: "7: demostrado (Winograd, 1971)",
    gap1: "19 demostrado, 23 hallado (1976)", gap2: "nadie sabe qué hay entre medias",
    twice: "49: Strassen aplicado dos veces",
    at47: "AlphaTensor reportó 47", at76: "AlphaTensor reportó 76",
    was: (v) => "antes " + v,
    expTitle: "Lo que cuesta dividir 3 × 3 en R bloques: n^(log₃ R)",
    floor: "mínimo demostrado", impossible: "demostrado imposible",
    school: "regla escolar, 27 bloques", strassen: "Strassen",
    mark: (r, e) => "R = " + r + " → " + e,
    win: "superaría a Strassen", lose: "no superaría a Strassen", tie: "la regla escolar",
    beatsZone: "supera a Strassen", losesZone: "no",
    s2x2: (u) => "2 × 2: " + u + " bloques, demostrado que son el mínimo (Winograd, 1971).",
    s3x3: (l, u) => "3 × 3: al menos " + l + " bloques (Bläser, 2003), a lo sumo " + u + " (Laderman, 1976), y nadie sabe cuál.",
    s4x4: (u) => "4 × 4: Strassen aplicado dos veces da " + u + ".",
    s4x4mod2: (u, b) => "4 × 4 en aritmética módulo 2: AlphaTensor reportó " + u + ", donde Strassen aplicado dos veces da " + b + ".",
    s4x5: (u, b) => "4 × 5 por 5 × 5: AlphaTensor reportó " + u + ", donde lo mejor conocido era " + b + ".",
    read: (need, r, e, beats, om, tie, row, next) =>
      "<b>" + need + ".</b> " + (tie ? "27 bloques es la propia regla escolar, exponente 3. "
        : "Dividir 3 × 3 en " + r + " bloques cuesta n^" + e + ", " + (beats
          ? "que supera el " + om + " de Strassen. " : "que no supera el " + om + " de Strassen. ")) +
      "Superarlo exige " + need + " bloques o menos; con " + (need + 1) + " sale " + next + ", todavía detrás. " + row,
    aria: (ctx) => "Un tablero con la menor cantidad de bloques conocida por tamaño, en una escala de 0 a 80: " +
      RECS.map((r) => ES.short[r.id] + " " + r.upper).join(", ") + ", y 3 × 3 solo acotado entre " +
      LOW + " y " + HIGH + ". Debajo, una recta de exponentes de 2,6 a 3,0 donde " + ctx.state.r +
      " bloques cuestan " + e3(ctx.state.r) + " frente a los 2,807 de Strassen.",
    controls: {row: "Qué tamaño", r: "Bloques en una división de 3 × 3", play: "▶ Recorrer de 19 a 27"},
    options: {row: {"2x2": "2 × 2", "3x3": "3 × 3", "4x4": "4 × 4", "4x4mod2": "4 × 4, aritmética mod 2", "4x5": "4 × 5 por 5 × 5"}},
    np: {cost: (r) => "lo que cuestan " + r + " bloques", strassen: "Strassen",
         win: (n) => "así que " + n + " bloques ganarían"}
  };

  // Spanish prints a decimal comma on the stage; the data-* stay with the point.
  const dec = (ctx, s) => (ctx.lang === "es" ? s.replace(".", ",") : s);

  window.AlphaTensorScenes.register({
    id: "learn", section: "11",
    hl: ["r"],
    copy: {en: EN, es: ES},

    controls: [
      {id: "row", type: "select", options: IDS},
      {id: "r", type: "range", min: 19, max: 27, step: 1, fmt: (v, ctx) => v + " " + ctx.copy.unit},
      {id: "play", type: "play", target: "r", rate: 1.1}
    ],

    init(ctx) { ctx.state.row = "3x3"; ctx.state.r = 23; },
    sync(ctx) {
      if (IDS.indexOf(ctx.state.row) < 0) ctx.state.row = "3x3";
      ctx.state.r = Math.max(19, Math.min(27, Math.round(ctx.state.r)));
    },

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) {
      return K.arrival(ctx, ENTRANCE) < 1 || !!(ctx.cache.pos && ctx.cache.pos.moving);
    },

    pick(ctx, key) {
      const [kind, v] = key.split(":");
      if (kind === "row" && IDS.indexOf(v) >= 0) ctx.setControls({row: v});
      else if (kind === "r") ctx.setControls({r: Number(v)});
    },
    tip(ctx, key) {
      const [kind, v] = key.split(":");
      if (kind === "row") return ctx.copy.sizes[v];
      if (kind === "r") return ctx.copy.mark(v, dec(ctx, e3(Number(v))));
      return "";
    },

    draw(ctx) {
      const svg = ctx.svg, c = ctx.copy, r = ctx.state.r, lit = ctx.hl === "r";
      const elapsed = K.arrival(ctx, ENTRANCE) * ENTRANCE;
      const T = (s) => dec(ctx, s);

      // ---- the record board
      K.text(svg, BX0, 66, c.board, {size: 12.5, colour: "--stage-mute", sans: true});
      for (let v = 0; v <= 80; v += 20) {
        svg.appendChild(K.el("line", {x1: bx(v), y1: 76, x2: bx(v), y2: ry(RECS.length - 1) + 22,
          stroke: K.css("--stage-mute"), "stroke-opacity": 0.25, "stroke-width": 1}));
        K.text(svg, bx(v), 84, String(v), {size: 12, anchor: "middle", colour: "--stage-mute"});
      }
      RECS.forEach((rc, i) => {
        if (elapsed < i * ROW_MS) return;
        const y = ry(i) + 14, on = rc.id === ctx.state.row;
        const g = K.el("g", {"data-pick": "row:" + rc.id});
        g.appendChild(K.el("rect", {x: 12, y: y - 18, width: 796, height: RH - 4, rx: 8,
          fill: on ? K.css("--stage-ink") : "transparent", "fill-opacity": on ? 0.1 : 1,
          stroke: on ? K.css("--stage-ink") : "none", "stroke-width": 1.5}));
        K.text(g, 24, y + 5, c.short[rc.id], {size: 14, weight: on ? 800 : 600, colour: "--stage-ink"});
        const mark = (v, fill, colour) => g.appendChild(K.el("circle", {cx: bx(v), cy: y, r: 6.5,
          fill: fill ? K.css(colour) : "none", stroke: K.css(colour), "stroke-width": 2.2}));
        const say = (x, s, anchor, dy, colour, size) =>
          K.text(g, x, y + (dy === undefined ? 5 : dy), s, {size: size || 13, anchor: anchor || "start", colour: colour || "--stage-ink", weight: 600});
        if (rc.id === "2x2") {
          mark(7, true, "--stage-ink");
          say(bx(7) + 16, c.proved);
        } else if (rc.id === "3x3") {
          const x0 = bx(rc.lower), x1 = bx(rc.upper);
          g.appendChild(K.el("rect", {x: x0, y: y - 8, width: x1 - x0, height: 16, fill: "none",
            stroke: K.css("--at-bad"), "stroke-dasharray": "3 3", "stroke-width": 1.5}));
          hatch(g, x0, y - 8, x1 - x0, 16, "--at-bad");
          g.appendChild(K.el("line", {x1: x0, y1: y - 12, x2: x0, y2: y + 12, stroke: K.css("--stage-ink"), "stroke-width": 4}));
          mark(rc.upper, true, "--stage-ink");
          say(x1 + 16, c.gap1, "start", -2, "--stage-ink", 12.5);
          say(x1 + 16, c.gap2, "start", 12, "--at-bad", 12.5);
        } else if (rc.id === "4x4") {
          mark(rc.upper, true, "--stage-ink");
          say(bx(rc.upper) + 16, c.twice, "start", 5, "--stage-ink", 12.5);
        } else {
          const toward = rc.upper, from = rc.before;
          g.appendChild(K.el("line", {x1: bx(from) - 7, y1: y, x2: bx(toward) + 9, y2: y,
            stroke: K.css("--at-good"), "stroke-width": 2.6}));
          g.appendChild(K.el("path", {d: "M " + (bx(toward) + 12) + " " + y + " l 8 -6 l 0 12 z", fill: K.css("--at-good")}));
          mark(from, false, "--stage-mute");
          mark(toward, true, "--at-good");
          if (rc.id === "4x4mod2") {
            say(bx(from) + 16, c.at47, "start", -2, "--at-good", 12.5);
            say(bx(from) + 16, c.was(from), "start", 12, "--stage-mute", 12);
          } else {
            say(bx(toward) - 16, c.at76, "end", -2, "--at-good", 12.5);
            say(bx(toward) - 16, c.was(from), "end", 12, "--stage-mute", 12);
          }
        }
        svg.appendChild(g);
      });

      // ---- the exponent line
      const ya = 292;
      svg.appendChild(K.el("line", {x1: 12, y1: ya, x2: 808, y2: ya, stroke: K.css("--stage-mute"), "stroke-opacity": 0.35}));
      K.text(svg, 24, ya + 22, c.expTitle, {size: 14, weight: 700, sans: true});
      const eF = expOf(LOW), eS = AC.OMEGA;
      // proved impossible, then would beat, then would not
      hatch(svg, EX0, EY - 7, ex(eF) - EX0, 14, "--stage-mute");
      svg.appendChild(K.el("rect", {x: ex(eF), y: EY - 5, width: ex(eS) - ex(eF), height: 10, fill: K.css("--at-good")}));
      svg.appendChild(K.el("rect", {x: ex(eS), y: EY - 5, width: EX1 - ex(eS), height: 10, fill: K.css("--at-bad")}));
      svg.appendChild(K.el("line", {x1: ex(eF), y1: EY - 24, x2: ex(eF), y2: EY + 20, stroke: K.css("--stage-ink"), "stroke-width": 5}));
      K.text(svg, EX0 + (ex(eF) - EX0) / 2, EY + 28, c.impossible, {size: 12, anchor: "middle", colour: "--stage-mute"});
      K.text(svg, ex(eF) + 8, EY - 30, c.floor + " · " + T(e3(LOW)), {size: 12.5, colour: "--stage-ink"});
      // Strassen
      svg.appendChild(K.el("line", {x1: ex(eS), y1: EY - 30, x2: ex(eS), y2: EY + 14, stroke: K.css("--stage-ink"), "stroke-width": 2.5}));
      K.text(svg, ex(eS) + 8, EY - 42, c.strassen + " · " + T(K.fmt(eS, 3)), {size: 14, weight: 800});
      K.text(svg, (ex(eF) + ex(eS)) / 2 + 20, EY + 28, c.beatsZone, {size: 12.5, anchor: "middle", colour: "--at-good", weight: 700});
      K.text(svg, (ex(eS) + EX1) / 2 + 10, EY + 28, c.losesZone, {size: 12.5, anchor: "middle", colour: "--at-bad", weight: 700});
      // schoolbook
      K.text(svg, EX1, EY - 58, c.school + " · 3", {size: 12.5, anchor: "end"});
      svg.appendChild(K.el("line", {x1: EX1, y1: EY - 52, x2: EX1, y2: EY + 14, stroke: K.css("--stage-ink"), "stroke-width": 2.5}));
      // one tick per block count, pickable
      for (let R = LOW; R <= SCHOOL; R++) {
        const g = K.el("g", {"data-pick": "r:" + R});
        g.appendChild(K.el("rect", {x: ex(expOf(R)) - 15, y: EY + 38, width: 30, height: 24, fill: "transparent"}));
        K.text(g, ex(expOf(R)), EY + 56, String(R), {size: 12, anchor: "middle", colour: R === r ? "--stage-ink" : "--stage-mute", weight: R === r ? 800 : 600});
        svg.appendChild(g);
      }
      // the slider's mark, sliding in at the end of the entrance
      const tx = ex(expOf(r));
      const pos = K.chase(ctx.cache, "pos", tx, ctx.now(), 0.16, ctx.instant);
      let px = pos;
      if (elapsed < SLIDE_AT + SLIDE_MS) {
        const s = Math.max(0, Math.min(1, (elapsed - SLIDE_AT) / SLIDE_MS));
        px = ex(E1) + (tx - ex(E1)) * ease(s);
      }
      const beats = expOf(r) < AC.OMEGA, tie = r === SCHOOL;
      const mc = beats ? "--at-good" : "--at-bad";
      svg.appendChild(K.el("circle", {cx: px, cy: EY, r: lit ? 13 : 9, fill: K.css("--stage-ink"),
        stroke: K.css(mc), "stroke-width": lit ? 5 : 3.5}));
      const lx = Math.max(130, Math.min(690, px));
      K.text(svg, lx, EY + 82, T(c.mark(r, e3(r))), {size: 17, anchor: "middle", weight: 800});
      K.text(svg, lx, EY + 100, tie ? c.tie : (beats ? c.win : c.lose), {size: 13, anchor: "middle", colour: mc, weight: 700});
    },

    readout(ctx) {
      const c = ctx.copy, r = ctx.state.r, rc = rec(ctx);
      const beats = expOf(r) < AC.OMEGA;
      const om = dec(ctx, K.fmt(AC.OMEGA, 3));
      return {
        html: c.read(NEED, r, dec(ctx, e3(r)), beats, om, r === SCHOOL, rowSentence(c, rc), dec(ctx, e3(NEED + 1))),
        claim: c.claim(r, dec(ctx, e3(r)), beats),
        strip: {mode: "built", terms: AC.blocksOf(AC.STRASSEN), count: 7},
        data: {
          exponent: e3(r), r: String(r), beats: beats ? "1" : "0", need: String(NEED),
          omega: K.fmt(AC.OMEGA, 3), row: rc.id, lower: String(REC3.lower), upper: String(REC3.upper),
          rowupper: String(rc.upper), rowbefore: rc.before === undefined ? "" : String(rc.before)
        }
      };
    },

    code(ctx) {
      const np = ctx.copy.np, r = ctx.state.r;
      return K.code([
        ["np.log(" + r + ") / np.log(3)", e3(r) + ": " + np.cost(r)],
        ["np.log2(7)", K.fmt(AC.OMEGA, 3) + ": " + np.strassen],
        ["3 ** np.log2(7)", K.fmt(Math.pow(3, AC.OMEGA), 1) + ": " + np.win(NEED)]
      ]);
    }
  });
})();
