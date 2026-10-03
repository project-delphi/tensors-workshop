// Scene 9: TensorGame, played on the 2 x 2 cube. Move the blocks to the other
// side of the equation -- T - u1 o v1 o w1 - ... - uR o vR o wR = 0 -- and
// finding an algorithm is a game for one player: start with the cube,
// subtract one block a move, reach all zeros in as few moves as you can. A
// game won in R moves is an algorithm with R multiplications. The cube shows
// what is still owed: a cleared cell goes hollow, a cell pushed below zero
// turns amber and says so, and the translucent cells are the move a reader
// has set up but not yet played. Beside it, on the stage's inset, are that
// move's three lists of weights (press one to cycle it), the count it would
// leave, and the count after every move so far.
//
// Six buttons play. The schoolbook rule's next move wins in eight, one ringed
// cell a press. Strassen's wins in seven, and his first takes the count up,
// from 8 to 12. The greedy move is the one of all 128,000 that leaves the
// fewest nonzero cells -- after Strassen's first it takes that move back.
//
// Two rules come from the review of the blog's own widget. A scripted move
// counts as played by its net effect, so one that greedy took back is due
// again; and every move button stops once the cube is empty. Playing a move
// also empties the lists, so the ghosts never show a block already
// subtracted. The greedy scan costs about 40 ms a position and the core
// remembers it; it is asked for in press() and nowhere else.
// Drawn in three.js, with an SVG twin from the same model.
// See alphatensor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const AC = window.AlphaTensorCore, K = window.AlphaTensorKit;

  const N = 2, T = AC.tensor(N);
  const SCRIPTS = {school: AC.schoolbook(N), strassen: AC.STRASSEN};
  const LIMIT = 16;                            // a game that runs past this is stopped
  const BEST = AC.RECORDS.find((r) => r.id === "2x2").upper;   // 7: Strassen, and Winograd's proof
  const CHOICES = AC.moves(N * N).count;       // 128,000 distinct blocks with weights -1, 0, 1
  const TAU = 0.16, ENTRANCE = 1200, LAND = 420, DROP = 0.9;
  const SHELL = K.CELL + 0.3;                  // a ghost over a filled cell wraps it, ring and all
  const SLOTS = 9;                             // the start and eight moves, before the bars narrow
  const AN = AC.names("a", N), BN = AC.names("b", N), CN = AC.names("c", N);
  const NAMES = {u: AN, v: BN, w: CN};
  const one = (i) => [0, 1, 2, 3].map((k) => (k === i ? 1 : 0));
  const signed = (d) => (d > 0 ? "+" + d : d < 0 ? "−" + -d : "±0");
  // The sum, moved across the equals sign. A term never breaks across a line.
  const EQUATION = "T − u₁ ∘ v₁ ∘ w₁ − … − u<sub>R</sub> ∘ v<sub>R</sub> ∘ w<sub>R</sub> = 0"
    .replace(/ ∘ /g, "\u00a0∘\u00a0");
  const cellsOf = (X) => { const out = []; X.forEach((x, i) => { if (x) out.push(i); }); return out; };

  // The first block of a script that is due. A block counts as played by its
  // net effect: one that was later taken back (its negative subtracted, which
  // is what greedy does to Strassen's first) is due again. -1 when none is.
  function nextOf(moves, F) {
    const played = moves.map((m) => AC.rankOne(m.u, m.v, m.w));
    for (let r = 0; r < F.U.length; r++) {
      const X = AC.rankOne(F.U[r], F.V[r], F.W[r]), back = X.map((x) => -x || 0);
      let net = 0;
      played.forEach((p) => { if (AC.equal(p, X)) net++; else if (AC.equal(p, back)) net--; });
      if (net <= 0) return r;
    }
    return -1;
  }

  // Everything the picture and the readout need, from the moves played and
  // the three lists of the move being set up.
  function facts(ctx) {
    const s = ctx.state, moves = s.moves || [], n = moves.length;
    const u = AC.weightAt(s.u), v = AC.weightAt(s.v), w = AC.weightAt(s.w);
    const P = AC.play(T, moves), left = P.trail[n];
    const won = left === 0, stopped = !won && n >= LIMIT;
    const empty = !AC.nnz(u) || !AC.nnz(v) || !AC.nnz(w);
    const X = empty ? null : AC.rankOne(u, v, w);
    const after = X ? AC.nnz(AC.subtract(P.owed, X)) : null;
    const last = n ? moves[n - 1] : null, before = n > 1 ? moves[n - 2] : null;
    const lastX = last ? AC.rankOne(last.u, last.v, last.w) : null;
    return {
      moves, n, u, v, w, P, left, won, stopped, over: won || stopped, empty, X, after,
      delta: after === null ? null : after - left, cells: X ? AC.nnz(X) : 0,
      last, lastX, lastCells: lastX ? AC.nnz(lastX) : 0, was: n ? P.trail[n - 1] : left,
      // How many of the moves played left fewer nonzero cells than the move before.
      lowered: P.trail.filter((x, i) => i && x < P.trail[i - 1]).length,
      // The last move is the one before it with its sign flipped.
      back: !!(before && AC.isZero(AC.add(lastX, AC.rankOne(before.u, before.v, before.w)))),
      sig: [s.u, s.v, s.w].join(",") + "|" +
           moves.map((m) => [AC.weightIndex(m.u), AC.weightIndex(m.v), AC.weightIndex(m.w)].join(".")).join("/")
    };
  }

  // A move as the multiplication it is: "(a₁₁ + a₂₂)(b₁₁ + b₂₂) → +c₁₁ +c₂₂".
  function spelled(m) {
    const into = m.w.map((x, c) => (x ? (x > 0 ? "+" : "−") + CN[c] : "")).filter(Boolean).join(" ");
    return "(" + AC.combo(m.u, AN) + ")(" + AC.combo(m.v, BN) + ") → " + into;
  }

  // The model both surfaces draw: what is still owed, eased by piece.
  function shown(ctx) {
    const c = ctx.cache, t = ctx.now(), f = facts(ctx);
    const key = f.sig + "|" + ctx.hl;
    if (c.memo && c.memo.key === key && t - c.memo.t < 4) return c.memo.m;
    const touched = f.lastX ? f.lastX.map((x) => (x ? 1 : 0)) : null;
    const point = ctx.hl === "r" && !!touched;
    const m = K.cubeModel({n: N, values: f.P.owed, ever: f.P.everOwed, rings: T, slice: null,
                           preview: f.over ? null : f.X, lit: point ? touched : null},
                          {zeros: "cells", hl: ctx.hl, nameSize: 11});
    // A ghost the size the kit gives it sits inside a filled cell, where
    // three.js cannot show it; over one it is a shell round the cell instead.
    m.ghosts.forEach((g) => { if (f.P.owed[g.idx]) g.s = SHELL; });
    // The cells the last move left something in stand a little proud.
    if (touched && !point) m.items.forEach((it) => { if (it.v && touched[it.idx]) { it.s *= 1.14; it.k = 1.5; } });
    // A hollow cell is an outline, which neither surface can point at or
    // light. A piece too small to see makes it pickable in three.js (the hit
    // twin is never under 0.6 of a cell), and it is the bead that lights when
    // the equation's t is pointed at and the last move cleared this cell.
    m.hollows.forEach((h) => {
      const on = point && touched[h.idx];
      m.items.push({key: "h:" + h.key, c: h.c, s: on ? 0.3 : 0.0005, token: on ? "--stage-ink" : "--stage-mute",
                    k: on ? 1.2 : 0.85, alpha: 1, pick: h.pick, v: 0, idx: h.idx, dot: true});
    });
    // The entrance: the 1s of the rule drop into their rings, tray by tray.
    const at = K.arrival(ctx, ENTRANCE);
    if (at < 1) {
      const live = m.items.filter((it) => it.v).length;
      const gap = live > 1 ? Math.min(110, (ENTRANCE - LAND - 10) / (live - 1)) : 0;
      let i = 0;
      m.items.forEach((it) => {
        if (!it.v) return;
        const g = K.smooth((at * ENTRANCE - i * gap) / LAND);
        i++;
        it.s *= g;
        it.c = [it.c[0], it.c[1] + (1 - g) * DROP, it.c[2]];
      });
    }
    c.ease = c.ease || {};
    m.items = K.follow(c.ease, m.items, t, TAU, ctx.instant);
    c.memo = {key, t, m};
    return m;
  }

  const EN = (() => {
    const cells = (k) => k + (k === 1 ? " cell" : " cells");
    const moves = (n) => n + (n === 1 ? " move" : " moves");
    // A game is stopped at LIMIT moves, so a count of them is never past sixteen.
    const WORDS = ["none", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
                   "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen"];
    const word = (n) => WORDS[n] || String(n);
    // "four of the seven moves lowered it", read off the trail of a game that was won.
    const lowered = (f) => (f.lowered === f.n ? "all " + word(f.n) + " moves lowered it"
      : word(f.lowered) + " of the " + word(f.n) + " moves lowered it");
    const who = (m) => (m.by === "school" ? "The schoolbook rule's move " + (m.r + 1) + " of " + SCRIPTS.school.U.length
      : m.by === "strassen" ? "Strassen's move " + (m.r + 1) + " of " + SCRIPTS.strassen.U.length
      : m.by === "greedy" ? "The greedy move" : "Your block");
    return {
      tab: "game",
      k: "Section 11 · the game",
      h: "Finding an algorithm is the same job as emptying the cube",
      predict: "Every move costs one, whether it helps or not. Strassen's seven blocks, played as seven " +
               "moves, win the game. How many of the seven leave fewer nonzero cells than the move before: " +
               "all seven, four, or one?",
      concept: "Move the blocks to the other side of the equation: " + EQUATION + ". Start with the " +
               "cube, take away one block a move, and try to be left with zeros in as few moves as " +
               "possible. The AlphaTensor paper calls this TensorGame: one player, a reward of −1 for every " +
               "move, and a game won in R moves is an algorithm with R multiplications.",
      b: "A move is three lists of weights, and it subtracts their block from what is left of the cube. " +
         "The weights are −1, 0 and +1, which makes " + K.num(CHOICES, 0, "en") + " different blocks: the " +
         "next picture counts them, and the one after it tries every one. A cell that is cleared goes " +
         "hollow; a cell pushed below zero turns amber and says −1. <b>Three games to try.</b> Press " +
         "<b>Schoolbook's next move</b> until the cube is empty. " +
         "<b>Start over</b> and do the same with <b>Strassen's next move</b>, watching the count on the " +
         "right. Start over once more, play Strassen's first move, and ask for the <b>greedy move</b>: of " +
         "all " + K.num(CHOICES, 0, "en") + " moves, the one that leaves the fewest nonzero cells. To build " +
         "a move yourself, press the weights on the right to cycle them 0, +1, −1, or press a cell of the " +
         "cube; the translucent cells are the block it would subtract.",
      eqcap: "S is what is left of the cube. It starts as T, and move t subtracts one block, three lists " +
             "of weights multiplied out, from what move t − 1 left. The game is won when S is all zeros, " +
             "and the number of moves it took is the number of multiplications. Point at t to light the " +
             "cells the last move touched.",
      head: "your move: three lists of weights",
      after: (after, change) => "after this move: " + after + " (" + change + ")",
      needs: "set a weight in each list",
      hudWon: (n) => "won in " + moves(n),
      hudStop: (n) => "stopped: " + moves(n),
      played: (n) => "moves played: " + n + " · reward " + (n ? "−" + n : "0"),
      trail: "cells left, after each move",
      claim: (f) => (f.won ? "won in " + moves(f.n) : f.stopped ? "stopped at " + moves(f.n) : moves(f.n)) +
        " · " + cells(f.left) + " left" + (f.over || f.after === null ? "" : " · next would leave " + f.after),
      capStart: "the aim: 0 cells left · every move costs 1",
      capMove: (n, what, was, left) => "move " + n + " · " + what + " · " + was + " → " + left,
      covers: (k) => "covers " + cells(k),
      capWon: (n) => "won in " + moves(n) + ": " + n + " multiplications",
      capStop: (n, left) => "stopped after " + moves(n) + ": " + cells(left) + " left",
      read: (f) => {
        const trail = f.P.trail.join(", ");
        if (f.won) {
          return "<b>Won in " + moves(f.n) + "</b>: an algorithm with " + f.n + " multiplications. The count " +
            "went " + trail + ": <b>" + lowered(f) + "</b>." +
            (f.n === BEST ? " That is the fewest possible for 2 × 2 matrices (Winograd, 1971)."
              : f.n === SCRIPTS.school.U.length ? " That matches the schoolbook rule; it can be done in " + BEST + "."
              : " It can be done in " + BEST + ".");
        }
        if (f.stopped) {
          return "<b>Stopped after " + moves(f.n) + "</b> with " + cells(f.left) + " left: a game that runs " +
            "past a set number of moves is stopped, and here the limit is " + LIMIT + ". Take a move back, " +
            "or start over.";
        }
        const next = f.empty
          ? "Set up a move on the right, or press a cell of the cube."
          : "The translucent block is the move set up on the right: it covers " + cells(f.cells) +
            " and would leave <b>" + f.after + " (" + signed(f.delta) + ")</b>.";
        if (!f.n) {
          return "<b>" + cells(f.left) + " left, no moves yet.</b> A move subtracts one block and costs 1, " +
            "whatever it does. " + next + " Try the schoolbook rule's moves, then Strassen's, then " +
            "Strassen's first followed by the greedy move.";
        }
        const moved = f.left - f.was;
        return "<b>" + cells(f.left) + " left</b> after " + moves(f.n) + ". " +
          (moved > 0 ? "<b>Up, not down.</b> " : "") + who(f.last) + " covered " + cells(f.lastCells) +
          (moved ? " and took the count from " + f.was + " to " + f.left + "." : " and left the count at " + f.left + ".") +
          (f.back ? (f.last.by === "greedy"
            ? " It is the move before it with its sign flipped: of all " + K.num(CHOICES, 0, "en") +
              " moves, the one that looks best is to take that move back."
            : " It is the move before it with its sign flipped, so the two cancel.") : "") +
          " " + next;
      },
      tip: (a, b, c, v) => "(" + a + ", " + b + ", " + c + ") holds " + v + " · press to aim a move here",
      tipW: "press to cycle 0 → +1 → −1",
      aria: (ctx) => {
        const f = facts(ctx);
        return "The multiplication cube as four stacked trays of sixteen cells, showing what is left after " +
               moves(f.n) + ": " + cells(f.left) + " are not zero. A ring marks each of the eight cells the " +
               "rule fills. " +
               (f.won ? "The cube is empty and the game is won. "
                 : f.empty || f.over ? ""
                 : "A translucent block shows the move being set up, which would leave " + f.after + ". ") +
               "Beside it, the three lists of weights of that move, and a bar for the count after each move.";
      },
      controls: {u: "u, over A", v: "v, over B", w: "w, over C", school: "Schoolbook's next move",
                 strassen: "Strassen's next move", greedy: "Greedy move", subtract: "Subtract this block",
                 undo: "Undo", restart: "Start over"},
      np: {
        start: "the game starts from the cube",
        played: (n) => moves(n) + " played",
        one: "one move: subtract a block",
        left: (k) => (k ? cells(k) + " left" : "0 cells left: won"),
        reward: (n) => (n ? "-" + n : "0") + ": the reward, -1 a move"
      }
    };
  })();

  const ES = (() => {
    const cells = (k) => k + (k === 1 ? " celda" : " celdas");
    const moves = (n) => n + (n === 1 ? " jugada" : " jugadas");
    const remain = (k) => (k === 1 ? "queda 1 celda" : "quedan " + k + " celdas");
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const WORDS = ["ninguna", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez",
                   "once", "doce", "trece", "catorce", "quince", "dieciséis"];
    const word = (n) => WORDS[n] || String(n);
    const lowered = (f) => (f.lowered === f.n ? "las " + word(f.n) + " jugadas la bajaron"
      : f.lowered === 1 ? "una de las " + word(f.n) + " jugadas la bajó"
      : word(f.lowered) + " de las " + word(f.n) + " jugadas la bajaron");
    const who = (m) => (m.by === "school" ? "La jugada " + (m.r + 1) + " de " + SCRIPTS.school.U.length + " de la regla escolar"
      : m.by === "strassen" ? "La jugada " + (m.r + 1) + " de " + SCRIPTS.strassen.U.length + " de Strassen"
      : m.by === "greedy" ? "La jugada voraz" : "Tu bloque");
    return {
      tab: "juego",
      k: "Sección 11 · el juego",
      h: "Encontrar un algoritmo es el mismo trabajo que vaciar el cubo",
      predict: "Cada jugada cuesta uno, ayude o no. Los siete bloques de Strassen, jugados como siete " +
               "jugadas, ganan la partida. ¿Cuántas de las siete dejan menos celdas distintas de cero que " +
               "la jugada anterior: las siete, cuatro o una?",
      concept: "Pasa los bloques al otro lado de la ecuación: " + EQUATION + ". Empieza con el cubo, " +
               "quita un bloque por jugada e intenta quedarte con ceros en las menos jugadas posibles. El " +
               "artículo de AlphaTensor lo llama TensorGame: un solo jugador, una recompensa de −1 por cada " +
               "jugada, y una partida ganada en R jugadas es un algoritmo con R multiplicaciones.",
      b: "Una jugada son tres listas de pesos, y resta su bloque de lo que queda del cubo. Los pesos son " +
         "−1, 0 y +1, lo que da " + K.num(CHOICES, 0, "es") + " bloques distintos: la imagen siguiente los " +
         "cuenta, y la que viene después los prueba todos. Una celda que se vacía queda hueca; una celda " +
         "que baja de cero se vuelve ámbar y dice −1. " +
         "<b>Tres partidas para probar.</b> Pulsa <b>Jugada escolar</b>, la siguiente de la regla " +
         "escolar, hasta vaciar el cubo. <b>Empieza de nuevo</b> y haz lo mismo con <b>Jugada de " +
         "Strassen</b>, mirando la cuenta de la derecha. Empieza de nuevo otra vez, juega la primera de " +
         "Strassen y pide la <b>jugada voraz</b>: de las " + K.num(CHOICES, 0, "es") + " jugadas, la que " +
         "deja menos celdas distintas de cero. Para armar una jugada a mano, pulsa los pesos de la derecha " +
         "para recorrer 0, +1, −1, o pulsa una celda del cubo; las celdas translúcidas son el bloque que " +
         "restaría.",
      eqcap: "S es lo que queda del cubo. Empieza siendo T, y la jugada t resta un bloque, tres listas de " +
             "pesos multiplicadas, de lo que dejó la jugada t − 1. La partida se gana cuando S es todo " +
             "ceros, y el número de jugadas que hizo falta es el número de multiplicaciones. Señala la t " +
             "para encender las celdas que tocó la última jugada.",
      head: "tu jugada: tres listas de pesos",
      after: (after, change) => "tras esta jugada: " + after + " (" + change + ")",
      needs: "pon un peso en cada lista",
      hudWon: (n) => "ganado en " + moves(n),
      hudStop: (n) => "detenido: " + moves(n),
      played: (n) => "jugadas hechas: " + n + " · recompensa " + (n ? "−" + n : "0"),
      trail: "celdas que quedan, tras cada jugada",
      claim: (f) => (f.won ? "ganado en " + moves(f.n) : f.stopped ? "detenido en " + moves(f.n) : moves(f.n)) +
        " · " + remain(f.left) + (f.over || f.after === null ? "" : " · esta dejaría " + f.after),
      capStart: "el objetivo: 0 celdas · cada jugada cuesta 1",
      capMove: (n, what, was, left) => "jugada " + n + " · " + what + " · " + was + " → " + left,
      covers: (k) => "cubre " + cells(k),
      capWon: (n) => "ganado en " + moves(n) + ": " + n + " multiplicaciones",
      capStop: (n, left) => "detenido tras " + moves(n) + ": " + remain(left),
      read: (f) => {
        const trail = f.P.trail.join(", ");
        if (f.won) {
          return "<b>Partida ganada en " + moves(f.n) + "</b>: un algoritmo con " + f.n + " multiplicaciones. " +
            "La cuenta fue " + trail + ": <b>" + lowered(f) + "</b>." +
            (f.n === BEST ? " Es lo mínimo posible para matrices de 2 × 2 (Winograd, 1971)."
              : f.n === SCRIPTS.school.U.length ? " Iguala a la regla escolar; se puede en " + BEST + "."
              : " Se puede en " + BEST + ".");
        }
        if (f.stopped) {
          return "<b>Partida detenida tras " + moves(f.n) + "</b>, y " + remain(f.left) + ": una partida que " +
            "pasa de un número fijado de jugadas se detiene, y aquí el límite es " + LIMIT + ". Deshaz una " +
            "jugada, o empieza de nuevo.";
        }
        const next = f.empty
          ? "Arma una jugada a la derecha, o pulsa una celda del cubo."
          : "El bloque translúcido es la jugada armada a la derecha: cubre " + cells(f.cells) +
            " y dejaría <b>" + f.after + " (" + signed(f.delta) + ")</b>.";
        if (!f.n) {
          return "<b>" + cap(remain(f.left)) + ", ninguna jugada todavía.</b> Una jugada resta un bloque y " +
            "cuesta 1, haga lo que haga. " + next + " Prueba las jugadas escolares, luego las de Strassen, y " +
            "luego la primera de Strassen seguida de la voraz.";
        }
        const moved = f.left - f.was;
        return "<b>" + cap(remain(f.left)) + "</b> tras " + moves(f.n) + ". " +
          (moved > 0 ? "<b>Sube, no baja.</b> " : "") + who(f.last) + " cubrió " + cells(f.lastCells) +
          (moved ? " y llevó la cuenta de " + f.was + " a " + f.left + "." : " y dejó la cuenta en " + f.left + ".") +
          (f.back ? (f.last.by === "greedy"
            ? " Es la jugada anterior con el signo cambiado: de las " + K.num(CHOICES, 0, "es") +
              " jugadas, la que parece mejor es deshacer la anterior."
            : " Es la jugada anterior con el signo cambiado, así que las dos se cancelan.") : "") +
          " " + next;
      },
      tip: (a, b, c, v) => "(" + a + ", " + b + ", " + c + ") vale " + v + " · pulsa para apuntar aquí una jugada",
      tipW: "pulsa para recorrer 0 → +1 → −1",
      aria: (ctx) => {
        const f = facts(ctx);
        return "El cubo de la multiplicación como cuatro bandejas apiladas de dieciséis celdas, mostrando lo " +
               "que queda tras " + moves(f.n) + ": " + cells(f.left) + " distintas de cero. Un anillo marca " +
               "cada una de las ocho celdas que la regla llena. " +
               (f.won ? "El cubo está vacío y la partida está ganada. "
                 : f.empty || f.over ? ""
                 : "Un bloque translúcido muestra la jugada que se está armando, que dejaría " + f.after + ". ") +
               "Al lado, las tres listas de pesos de esa jugada y una barra con la cuenta tras cada jugada.";
      },
      controls: {u: "u, sobre A", v: "v, sobre B", w: "w, sobre C", school: "Jugada escolar",
                 strassen: "Jugada de Strassen", greedy: "Jugada voraz", subtract: "Restar este bloque",
                 undo: "Deshacer", restart: "Empezar de nuevo"},
      np: {
        start: "el juego empieza en el cubo",
        played: (n) => moves(n) + (n === 1 ? " hecha" : " hechas"),
        one: "una jugada: resta un bloque",
        left: (k) => (k ? remain(k) : "0 celdas: ganado"),
        reward: (n) => (n ? "-" + n : "0") + ": la recompensa"
      }
    };
  })();

  const widx = (name) => ({id: name, type: "range", min: 0, max: AC.WEIGHTS - 1, step: 1,
    fmt: (v) => AC.combo(AC.weightAt(Number(v)), NAMES[name])});
  // A move button is live while the game is: not once the cube is empty, and
  // not once the limit has stopped it.
  const playable = (also) => (ctx) => { const f = facts(ctx); return !f.over && (!also || also(f)); };

  function aim(ctx, p) {
    ctx.setControls({u: AC.weightIndex(p.u), v: AC.weightIndex(p.v), w: AC.weightIndex(p.w)});
  }
  // Subtract a block. The lists are emptied with it, so the ghosts never show
  // a block that has already gone.
  function play(ctx, m) {
    const s = ctx.state;
    s.moves = (s.moves || []).concat([{u: m.u.slice(), v: m.v.slice(), w: m.w.slice(), by: m.by, r: m.r}]);
    aim(ctx, {u: [0, 0, 0, 0], v: [0, 0, 0, 0], w: [0, 0, 0, 0]});
  }
  function opening(ctx) {
    ctx.state.moves = [];
    ctx.state.u = ctx.state.v = ctx.state.w = AC.weightIndex(one(0));
  }

  window.AlphaTensorScenes.register({
    id: "game", section: "11", gl: true,
    part: {en: "The game", es: "El juego"},
    hl: ["r"],
    copy: {en: EN, es: ES},

    pose: {fov: 30, home: {az: -0.5, el: 0.42}, margin: 1.02, inset: {right: 0.38},
           limits: {azMin: -1.15, azMax: 0.15, elMin: 0.18, elMax: 0.8, dollyMin: 0.5, dollyMax: 1.8}},

    controls: [
      widx("u"), widx("v"), widx("w"),
      {id: "school", type: "button", enabled: playable((f) => nextOf(f.moves, SCRIPTS.school) >= 0)},
      {id: "strassen", type: "button", enabled: playable((f) => nextOf(f.moves, SCRIPTS.strassen) >= 0)},
      {id: "greedy", type: "button", enabled: playable()},
      {id: "subtract", type: "button", enabled: playable((f) => !f.empty)},
      {id: "undo", type: "button", enabled: (ctx) => facts(ctx).n > 0},
      {id: "restart", type: "button", enabled: (ctx) => facts(ctx).n > 0}
    ],

    // No moves, and the move set up is the single cell a11 · b11 -> c11: the
    // preview reads 7 (-1), which is what a move that helps looks like.
    init(ctx) { opening(ctx); },

    press(ctx, id) {
      const s = ctx.state, f = facts(ctx);
      if (id === "restart") { s.moves = []; aim(ctx, {u: one(0), v: one(0), w: one(0)}); return; }
      if (id === "undo") { s.moves = f.moves.slice(0, -1); return; }
      if (f.over) return;
      if (id === "school" || id === "strassen") {
        const F = SCRIPTS[id], r = nextOf(f.moves, F);
        if (r >= 0) play(ctx, {u: F.U[r], v: F.V[r], w: F.W[r], by: id, r});
      } else if (id === "greedy") {
        // All 128,000 moves from this position, once; the core remembers it.
        const best = AC.survey(f.P.owed, N * N).best;
        play(ctx, {u: best.u, v: best.v, w: best.w, by: "greedy"});
      } else if (id === "subtract" && !f.empty) {
        play(ctx, {u: f.u, v: f.v, w: f.w, by: "hand"});
      }
    },

    // A fresh store, so the cells start from nothing rather than shrinking
    // from the twin's picture before they grow.
    arrive(ctx) { ctx.cache.arrive = ctx.now(); ctx.cache.ease = null; ctx.cache.memo = null; },
    animates(ctx) {
      return K.arrival(ctx, ENTRANCE) < 1 || !!(ctx.cache.ease && ctx.cache.ease.moving);
    },
    bounds() { return K.cubeBounds(N); },

    pick(ctx, key) {
      if (key.startsWith("w:")) {
        const [, name, i] = key.split(":");
        if (!NAMES[name]) return;
        const vec = AC.weightAt(ctx.state[name]).slice(), x = vec[Number(i)];
        vec[Number(i)] = x === 0 ? 1 : x === 1 ? -1 : 0;
        ctx.setControls({[name]: AC.weightIndex(vec)});
        return;
      }
      if (!key.startsWith("x:")) return;
      const [a, b, c] = key.slice(2).split(",").map(Number);
      this.seek(ctx, AC.cell(4, a, b, c));
    },
    tip(ctx, key) {
      if (key.startsWith("w:")) return ctx.copy.tipW;
      if (!key.startsWith("x:")) return "";
      const [a, b, c] = key.slice(2).split(",").map(Number);
      return ctx.copy.tip(AN[a], BN[b], CN[c], K.fmt(facts(ctx).P.owed[AC.cell(4, a, b, c)], 0));
    },
    // A cell of the cube or of the strip: set up the move that covers that
    // cell alone.
    seek(ctx, idx) {
      const q = AC.uncell(4, idx);
      aim(ctx, {u: one(q.a), v: one(q.b), w: one(q.c)});
    },

    // Twice the cells: a piece on its way out is still drawn while the one
    // replacing it grows, and every hollow cell carries a bead.
    build(ctx) {
      return K.cubeBuild(ctx, this.pose, {cells: 192, ghosts: 64, hollows: 64, rings: 8, trays: 4, lines: 8});
    },
    render(ctx, gl) { K.cubeRender(gl, shown(ctx)); },

    // The twin: the same model, through the same orbit, fitted to the board.
    draw(ctx) {
      const m = shown(ctx), b = K.cubeBounds(N);
      K.cubeDraw(ctx.svg, m, ctx.basis(), ctx.projector(K.corners(b.min, b.max), ctx.box()));
    },

    // The inset: the move being set up, what it would leave, and the count
    // after every move so far.
    hud(ctx, svg) {
      const c = ctx.copy, f = facts(ctx), b = ctx.board();
      const x0 = b.w * 0.655, w = b.w - x0 - 22;
      let y = 62;
      K.text(svg, x0, y, c.head, {size: 13, weight: 700, sans: true});
      const wt = K.weights2(svg, {u: f.u, v: f.v, w: f.w}, {x: x0, y: y + 10, w, rowH: 40});
      y = wt.y1 + 28;
      if (f.won) K.text(svg, x0, y, c.hudWon(f.n), {size: 15, weight: 700, sans: true, colour: "--at-good"});
      else if (f.stopped) K.text(svg, x0, y, c.hudStop(f.n), {size: 15, weight: 700, sans: true, colour: "--at-bad"});
      else if (f.empty) K.text(svg, x0, y, c.needs, {size: 13, colour: "--stage-mute", sans: true});
      else {
        K.text(svg, x0, y, c.after(f.after, signed(f.delta)),
               {size: 15, weight: 700, sans: true, colour: f.delta < 0 ? "--at-good" : f.delta > 0 ? "--at-bad" : "--stage-ink"});
      }
      y += 36;
      K.text(svg, x0, y, c.played(f.n), {size: 13, weight: 700, sans: true});
      y += 19;
      K.text(svg, x0, y, c.trail, {size: 11.5, colour: "--stage-mute", sans: true});
      // One bar for the start and one per move. Nine slots are laid out
      // before any is played, so the bars keep their width through a game of
      // eight and only narrow past it.
      const trail = f.P.trail, slots = Math.max(SLOTS, trail.length), top = Math.max(12, ...trail);
      const h = Math.max(44, Math.min(92, b.h - y - 122));
      const bars = K.bars(svg, trail.concat(new Array(slots - trail.length).fill(0)), {
        x: x0, y: y + 28, w, h, max: top, gap: slots > SLOTS ? 3 : 5,
        at: (i) => (i >= trail.length ? "--stage-mute" : trail[i] > trail[0] ? "--at-bad" : "--at-good"),
        lit: (i) => i === f.n, alpha: 0.6
      });
      trail.forEach((v, i) => {
        K.text(svg, bars.px(i), bars.zero - (v / top) * bars.h - 6, String(v),
               {size: 11.5, anchor: "middle", colour: i === f.n ? "--stage-ink" : "--stage-mute", weight: i === f.n ? 700 : 500});
      });
      // Under each slot, which move it is: 0 is the cube before any. Past
      // nine slots two-digit numbers would touch, so every second one is
      // named, counting back from the move just played.
      for (let i = 0; i < slots; i++) {
        if (slots > SLOTS && (f.n - i) % 2) continue;
        K.text(svg, bars.px(i), bars.zero + 15, String(i),
               {size: 11, anchor: "middle", colour: i === f.n ? "--stage-ink" : "--stage-mute", weight: i === f.n ? 700 : 500});
      }
      // Pointing at the equation's t frames the bar the last move made.
      if (ctx.hl === "r" && f.n) {
        svg.appendChild(K.el("rect", {x: (bars.px(f.n) - bars.bw / 2 - 2).toFixed(1), y: bars.y0 - 20,
                                      width: (bars.bw + 4).toFixed(1), height: bars.h + 22, rx: 3, fill: "none",
                                      stroke: K.css("--stage-ink"), "stroke-width": 1.4}));
      }
    },

    readout(ctx) {
      const c = ctx.copy, f = facts(ctx);
      const what = f.last ? spelled(f.last) : "";
      return {
        html: c.read(f),
        claim: c.claim(f),
        caption: f.won ? c.capWon(f.n) : f.stopped ? c.capStop(f.n, f.left)
          : f.n ? c.capMove(f.n, what.length <= 46 ? what : c.covers(f.lastCells), f.was, f.left) : c.capStart,
        strip: {mode: "owed", terms: f.moves, count: f.n, lit: f.X ? cellsOf(f.X) : []},
        data: {
          won: f.won ? "1" : "0", stopped: f.stopped ? "1" : "0", moves: String(f.n), left: String(f.left),
          trail: f.P.trail.join(","),
          after: f.after === null ? "" : String(f.after),
          delta: f.delta === null ? "" : (f.delta > 0 ? "+" : "") + f.delta,
          u: f.u.join(","), v: f.v.join(","), w: f.w.join(","), shape: "4,4,4"
        }
      };
    },

    code(ctx) {
      const np = ctx.copy.np, f = facts(ctx);
      return K.code([
        ["S = T.copy()", np.start],
        ["for u, v, w in moves:", np.played(f.n)],
        ['    S -= np.einsum("a,b,c->abc", u, v, w)', np.one],
        ["np.count_nonzero(S)", np.left(f.left)],
        ["-len(moves)", np.reward(f.n)]
      ]);
    }
  });
})();
