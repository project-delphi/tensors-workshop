// Scene 10: the games are too many to try. A move fills three vectors of n^2
// entries, each entry one of f values, so f^(3 n^2) choices at one move, and a
// game is a sequence of moves, so the counts multiply. The picture is a ladder
// on a log scale: Go's 361 choices a move, one move of this game, the games of
// this depth (with their digit count in large type), and the years it would
// take to write them down at a billion a second. The axis re-fits to the
// largest rung as the controls move, and says so with its own ticks: it is
// honest about being a scale of powers of ten, so a bar of 1,644 digits and a
// bar of 3 digits share a board. Beside it, for the 2 x 2 game, the chain that
// cuts 3^12 down to 128,000 blocks, which is where the next scene starts. The
// entrance climbs the rungs smallest first. Flat: SVG only. This scene is
// about a count, not about the cube's cells, so it has no seek.
// See alphatensor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const AC = window.AlphaTensorCore, K = window.AlphaTensorKit;

  const GO = 361, PER_SECOND = 1e9, ENTRANCE = 2800;
  const X0 = 24, W = 540;                       // the ladder's bars
  const ROW = [52, 152, 252];                   // the three rungs with bars
  const YEARS_Y = 408;
  const SEC_PER_YEAR = 365.25 * 24 * 3600;

  // Digits of a whole number, grouped for the page's language.
  function group(s, lang) {
    return s.replace(/\B(?=(\d{3})+$)/g, lang === "es" ? "." : ",");
  }
  // "3.6 × 10³³" from a log10.
  function sciStr(lg, lang) {
    const s = AC.sci(lg);
    return K.num(s.mant, 1, lang) + " × 10" + K.sup(s.exp);
  }
  // A count written out when it is 20 digits or fewer, else in powers of ten.
  function bigStr(f, e, lg, lang) {
    return AC.digits(lg) <= 20 ? group(AC.powString(f, e), lang) : sciStr(lg, lang);
  }
  // Time to write 10^lg things at a billion a second, in words.
  function timeStr(lg, lang, c) {
    const ly = AC.log10Years(lg, PER_SECOND);
    if (ly >= 0) {
      if (ly < 3) return K.num(Math.pow(10, ly), ly < 1 ? 1 : 0, lang) + " " + c.years;
      return sciStr(ly, lang) + " " + c.years;
    }
    const secs = Math.pow(10, ly) * SEC_PER_YEAR;
    if (secs < 1) return c.underSecond;
    return K.num(secs, secs < 10 ? 1 : 0, lang) + " " + c.seconds;
  }

  // Everything the picture and the readout need, from the three controls.
  function facts(ctx) {
    const n = ctx.state.n, f = Number(ctx.state.f), d = ctx.state.depth;
    const e = 3 * n * n, lgMove = AC.log10Moves(n, f), lgGames = AC.log10Games(n, f, d);
    return {n, f, d, e, lgMove, lgGames,
            moveStr: bigStr(f, e, lgMove, ctx.lang), gamesStr: bigStr(f, e * d, lgGames, ctx.lang),
            digits: AC.digits(lgGames), years: AC.log10Years(lgGames, PER_SECOND)};
  }

  const EN = {
    tab: "space",
    k: "Section 11 · too many games",
    h: "The number of games leaves the page",
    predict: "A Go player chooses among at most 361 points. One move of the 2 × 2 game fills three vectors " +
             "of four entries, each entry one of five values. More choices than Go, or fewer?",
    concept: "A move is three vectors of n² entries, so with f allowed values there are f^(3n²) ways to " +
             "fill one in. A game strings moves together, so its count is that number to the power of the " +
             "moves played. Nobody tries them all.",
    b: "The ladder is a scale of powers of ten: each tick is ten times the one before. Choose the " +
       "<b>matrix size</b>, the <b>coefficients</b> and the <b>moves in a game</b>, and the top of the " +
       "ladder moves to fit. Set 4 × 4 and 49 moves for the largest number this page will write. The " +
       "panel on the right cuts the 2 × 2 game down as far as it goes, to the 128,000 blocks the next " +
       "scene looks at.",
    eqcap: "One move fills three vectors of n² entries, each entry one of f values, so it has f^(3n²) " +
           "choices. A game of R moves multiplies that number by itself R times. R is the depth rung " +
           "on the ladder.",
    claim: (one, d, dg) => d + (d === 1 ? " move" : " moves") + " · " + dg + " digits",
    go: "Go: points on the board",
    goTag: "at most",
    move: (e, f, n) => "One move here: " + e + " entries (3 × " + n + "²), each one of " + f + " values",
    games: (d) => "A game of " + d + (d === 1 ? " move" : " moves") + ": that count, " + (d === 1 ? "once" : d + " times over"),
    digitsWord: "digits",
    digitWord: "digit",
    time: "At a billion games a second, writing them all down takes",
    years: "years",
    seconds: "seconds",
    underSecond: "under a second",
    scale: "log scale: each tick is ten times the last",
    chainTitle: "Cut the 2 × 2 game down",
    chainSub: "to −1, 0, 1",
    triples: "every triple",
    noZero: "no zero vector",
    left: "triples left",
    blocks: "blocks",
    noSign: "sign duplicates gone",
    sets: "sets of seven blocks",
    read: (one, dg, gs, digs, tm) =>
      "<b>Far more: " + one + "</b> choices at one move, against at most 361 in Go. A game of " + dg +
      " is one of " + gs + " sequences, a number with " + digs + " digits. At a billion games a second " +
      "that is " + tm + ".",
    aria: (ctx) => {
      const f = facts(ctx);
      return "A ladder on a log scale. Go has 361 choices a move. One move of the " + f.n + " by " + f.n +
             " game with " + f.f + " coefficients has " + f.moveStr + ". A game of " + f.d + " moves has " +
             f.gamesStr + " sequences, a number with " + f.digits + " digits. Beside it, the 2 by 2 game " +
             "cut down: 3 to the 12 is 531,441, 80 cubed is 512,000, and 128,000 blocks.";
    },
    controls: {n: "Matrix size", f: "Coefficients", depth: "Moves in a game", play: "▶ Add moves"},
    options: {f: {"3": "−1, 0, 1", "5": "−2 … 2"}},
    np: {
      one: (v) => v + " choices at one move",
      games: (d, k) => d + (d === 1 ? " digit" : " digits") + ": every " + k + "-move game",
      chain: "531441, 512000, 128000"
    }
  };

  const ES = {
    tab: "espacio",
    k: "Sección 11 · demasiadas partidas",
    h: "El número de partidas se sale de la página",
    predict: "Un jugador de Go elige entre 361 puntos como máximo. Una jugada del juego de 2 × 2 llena " +
             "tres vectores de cuatro entradas, cada entrada con uno de cinco valores. ¿Más opciones " +
             "que en el Go, o menos?",
    concept: "Una jugada son tres vectores de n² entradas, así que con f valores permitidos hay f^(3n²) " +
             "formas de llenar una. Una partida encadena jugadas, así que su cuenta es ese número elevado " +
             "al número de jugadas. Nadie las prueba todas.",
    b: "La escalera es una escala de potencias de diez: cada marca vale diez veces la anterior. Elige el " +
       "<b>tamaño de la matriz</b>, los <b>coeficientes</b> y las <b>jugadas de una partida</b>, y la " +
       "parte alta de la escalera se ajusta. Con 4 × 4 y 49 jugadas sale el número más grande que esta " +
       "página escribe. El panel de la derecha recorta el juego de 2 × 2 todo lo posible, hasta los " +
       "128.000 bloques que mira la escena siguiente.",
    eqcap: "Una jugada llena tres vectores de n² entradas, cada una con uno de f valores, así que tiene " +
           "f^(3n²) opciones. Una partida de R jugadas multiplica ese número por sí mismo R veces. R es " +
           "el peldaño de la profundidad en la escalera.",
    claim: (one, d, dg) => d + (d === 1 ? " jugada" : " jugadas") + " · " + dg + " cifras",
    go: "Go: puntos del tablero",
    goTag: "como máximo",
    move: (e, f, n) => "Una jugada aquí: " + e + " entradas (3 × " + n + "²), cada una con " + f + " valores",
    games: (d) => "Una partida de " + d + (d === 1 ? " jugada" : " jugadas") + ": esa cuenta, " + (d === 1 ? "una vez" : d + " veces"),
    digitsWord: "cifras",
    digitWord: "cifra",
    time: "A mil millones de partidas por segundo, escribirlas todas lleva",
    years: "años",
    seconds: "segundos",
    underSecond: "menos de un segundo",
    scale: "escala log: cada marca vale diez veces la anterior",
    chainTitle: "El juego de 2 × 2 recortado",
    chainSub: "a −1, 0, 1",
    triples: "todas las ternas",
    noZero: "sin vector nulo",
    left: "ternas que quedan",
    blocks: "bloques",
    noSign: "sin duplicados de signo",
    sets: "conjuntos de siete bloques",
    read: (one, dg, gs, digs, tm) =>
      "<b>Muchísimas más: " + one + "</b> opciones en una jugada, frente a 361 como máximo en el Go. Una " +
      "partida de " + dg + " es una entre " + gs + " secuencias, un número de " + digs + " cifras. A mil " +
      "millones de partidas por segundo, eso son " + tm + ".",
    aria: (ctx) => {
      const f = facts(ctx);
      return "Una escalera en escala logarítmica. El Go tiene 361 opciones por jugada. Una jugada del juego " +
             "de " + f.n + " por " + f.n + " con " + f.f + " coeficientes tiene " + f.moveStr + ". Una " +
             "partida de " + f.d + " jugadas tiene " + f.gamesStr + " secuencias, un número de " + f.digits +
             " cifras. A su lado, el juego de 2 por 2 recortado: 3 a la 12 es 531.441, 80 al cubo es " +
             "512.000, y 128.000 bloques.";
    },
    controls: {n: "Tamaño de la matriz", f: "Coeficientes", depth: "Jugadas de una partida", play: "▶ Añadir jugadas"},
    options: {f: {"3": "−1, 0, 1", "5": "−2 … 2"}},
    np: {
      one: (v) => v + " opciones en una jugada",
      games: (d, k) => d + (d === 1 ? " cifra" : " cifras") + ": partida de " + k + " jugadas",
      chain: "531441, 512000, 128000"
    }
  };

  // Ticks for a log axis that runs 0 .. top: at most six steps.
  function tickStep(top) {
    for (const s of [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000]) if (top / s <= 6) return s;
    return 5000;
  }

  window.AlphaTensorScenes.register({
    id: "space", section: "11",
    hl: ["r"],
    copy: {en: EN, es: ES},

    controls: [
      {id: "n", type: "range", min: 2, max: 4, step: 1, fmt: (v) => v + " × " + v},
      {id: "f", type: "select", options: ["3", "5"]},
      {id: "depth", type: "range", min: 1, max: 49, step: 1,
       fmt: (v, ctx) => v + (ctx.lang === "es" ? (v === 1 ? " jugada" : " jugadas") : (v === 1 ? " move" : " moves"))},
      {id: "play", type: "play", target: "depth", rate: 8}
    ],

    init(ctx) { ctx.state.n = 2; ctx.state.f = "5"; ctx.state.depth = 7; },

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) {
      const a = ctx.cache.axis;
      return K.arrival(ctx, ENTRANCE) < 1 || !!(a && a.moving);
    },

    draw(ctx) {
      const svg = ctx.svg, c = ctx.copy, lang = ctx.lang, s = facts(ctx);
      const t = K.arrival(ctx, ENTRANCE);
      // The axis tops out at the largest rung and eases there.
      const topTarget = Math.max(s.lgGames, 3);
      const top = K.chase(ctx.cache, "axis", topTarget, ctx.now(), 0.16, ctx.instant);
      const X = (lg) => X0 + W * Math.min(1, lg / top);
      // A rung is shown from its turn in the entrance; its bar grows over the next stretch.
      const shown = (i) => t >= i * 0.13;
      const grow = (i) => K.smooth(Math.max(0, Math.min(1, (t - i * 0.13) / 0.22)));

      // Gridlines and tick labels first, so the bars sit over them.
      const step = tickStep(top), gridBottom = ROW[2] + 96;
      for (let k = 0; k * step <= top + 1e-9; k++) {
        const x = X(k * step);
        svg.appendChild(K.el("line", {x1: x, x2: x, y1: ROW[0] - 4, y2: gridBottom, stroke: K.css("--stage-mute"),
                                      "stroke-opacity": 0.28, "stroke-width": 1}));
        K.text(svg, x, gridBottom + 16, k === 0 ? "1" : "10" + K.sup(k * step),
               {size: 11, anchor: k === 0 ? "start" : "middle", colour: "--stage-mute"});
      }
      K.text(svg, X0 + W, gridBottom + 34, c.scale, {size: 11, anchor: "end", colour: "--stage-mute", sans: true});

      const rung = (i, label, value, lg, tok, tag) => {
        const y0 = ROW[i];
        if (!shown(i)) return;
        K.text(svg, X0, y0 + 14, label, {size: 13, colour: "--stage-mute", sans: true});
        K.text(svg, X0, y0 + 50, value, {size: 24, weight: 700});
        if (tag) K.text(svg, X0 + W, y0 + 50, tag.str, {size: tag.size || 20, anchor: "end", colour: tag.colour || "--stage-mute", weight: 700});
        svg.appendChild(K.el("rect", {x: X0, y: y0 + 62, width: W, height: 14, rx: 3, fill: "transparent",
                                      stroke: K.css("--stage-mute"), "stroke-opacity": 0.35, "stroke-width": 1}));
        const w = Math.max(3, (X(lg) - X0) * grow(i));
        svg.appendChild(K.el("rect", {x: X0, y: y0 + 62, width: w, height: 14, rx: 3, fill: K.css(tok)}));
      };

      rung(0, c.go, String(GO), Math.log10(GO), "--at-good", {str: c.goTag, size: 14});
      rung(1, c.move(s.e, s.f, s.n), s.moveStr, s.lgMove, "--at-b",
           {str: s.f + K.sup(s.e), size: 20});
      rung(2, c.games(s.d), s.gamesStr, s.lgGames, "--at-bad",
           {str: K.num(s.digits, 0, lang) + " " + (s.digits === 1 ? c.digitWord : c.digitsWord), size: 26, colour: "--stage-ink"});
      // Pointing at R lights the depth rung.
      if (ctx.hl === "r") {
        svg.appendChild(K.el("rect", {x: X0 - 8, y: ROW[2] - 6, width: W + 16, height: 94, rx: 8, fill: "none",
                                      stroke: K.css("--stage-ink"), "stroke-width": 2.2, "stroke-dasharray": "6 4"}));
        K.text(svg, X0 + W, ROW[2] + 14, "R = " + s.d, {size: 14, anchor: "end", weight: 700});
      }

      if (shown(3)) {
        K.text(svg, X0, YEARS_Y + 14, c.time, {size: 13, colour: "--stage-mute", sans: true});
        K.text(svg, X0, YEARS_Y + 50, timeStr(s.lgGames, lang, c), {size: 24, weight: 700, colour: "--at-bad"});
      }

      // The chain, for the 2 x 2 game cut down to -1, 0, 1.
      const px = 592, pw = 212, cx = px + pw / 2;
      if (t >= 0.5) {
        svg.appendChild(K.el("rect", {x: px, y: 52, width: pw, height: 424, rx: 10, fill: "none",
                                      stroke: K.css("--stage-mute"), "stroke-opacity": 0.45, "stroke-width": 1.2}));
        K.text(svg, cx, 76, c.chainTitle, {size: 14, anchor: "middle", weight: 700, sans: true});
        K.text(svg, cx, 94, c.chainSub, {size: 14, anchor: "middle", weight: 700, colour: "--stage-mute", sans: true});
      }
      const blocks = AC.moves(4).count;
      const link = (j, y, big, small) => {
        if (t < 0.55 + j * 0.1) return;
        K.text(svg, cx, y, big, {size: 20, anchor: "middle", weight: 700});
        K.text(svg, cx, y + 19, small, {size: 12, anchor: "middle", colour: "--stage-mute", sans: true});
      };
      const arrow = (j, y, note) => {
        if (t < 0.55 + j * 0.1) return;
        K.text(svg, px + 30, y, "↓", {size: 20, anchor: "middle", colour: "--at-good", weight: 700});
        K.text(svg, px + 48, y - 2, note, {size: 12, colour: "--at-good", sans: true});
      };
      link(0, 134, "3" + K.sup(12) + " = " + K.num(Number(AC.powString(3, 12)), 0, lang), c.triples);
      arrow(1, 190, c.noZero);
      link(1, 226, "80" + K.sup(3) + " = " + K.num(Number(AC.powString(80, 3)), 0, lang), c.left);
      arrow(2, 282, c.noSign);
      link(2, 318, K.num(blocks, 0, lang), c.blocks);
      if (t >= 0.55 + 3 * 0.1) {
        svg.appendChild(K.el("line", {x1: px + 18, x2: px + pw - 18, y1: 372, y2: 372, stroke: K.css("--stage-mute"),
                                      "stroke-opacity": 0.45, "stroke-width": 1}));
        K.text(svg, cx, 404, "≈ " + sciStr(AC.log10Choose(blocks, 7), lang), {size: 22, anchor: "middle", weight: 700, colour: "--at-bad"});
        K.text(svg, cx, 424, c.sets, {size: 12, anchor: "middle", colour: "--stage-mute", sans: true});
      }
    },

    readout(ctx) {
      const c = ctx.copy, lang = ctx.lang, s = facts(ctx);
      const depthWord = s.d + (lang === "es" ? (s.d === 1 ? " jugada" : " jugadas") : (s.d === 1 ? " move" : " moves"));
      const one = AC.digits(s.lgMove) <= 20 ? AC.powString(s.f, s.e) : null;
      const sc = AC.sci(s.lgMove);
      return {
        html: c.read(s.moveStr, depthWord, s.gamesStr, K.num(s.digits, 0, lang), timeStr(s.lgGames, lang, c)),
        claim: c.claim(s.moveStr, s.d, K.num(s.digits, 0, lang)),
        strip: {mode: "owed", terms: [], count: 0},
        data: {
          digits: String(s.digits), n: String(s.n), f: String(s.f), depth: String(s.d),
          onemove: one !== null ? one : sc.mant.toFixed(1) + "e" + sc.exp,
          log10: s.lgGames.toFixed(2), years: s.years.toFixed(1),
          blocks: String(AC.moves(4).count)
        }
      };
    },

    code(ctx) {
      const np = ctx.copy.np, s = facts(ctx), lang = ctx.lang;
      const one = AC.digits(s.lgMove) <= 12 ? group(AC.powString(s.f, s.e), lang) : sciStr(s.lgMove, lang);
      return K.code([
        [s.f + " ** (3 * " + s.n + "**2)", np.one(one)],
        ["len(str(" + s.f + " ** (3 * " + s.n + "**2 * " + s.d + ")))", np.games(K.num(s.digits, 0, lang), s.d)],
        ["3**12, 80**3, 80**3 // 4", np.chain]
      ]);
    }
  });
})();
