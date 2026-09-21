// Scene 9: the factorisation that gives up being best.
//
// Section 09 puts six factorisations side by side and asks what each one
// costs. NMF is the one that answers "optimality": it minimises the same
// Frobenius norm the truncated SVD does, but under W, H >= 0, and a
// constrained minimum cannot beat an unconstrained one. It is chosen anyway,
// because non-negative parts add up the way a spectrogram does -- so the
// components come out as things you can name, and here, as things you can
// play.
//
// The price is on screen as a number: the same rank, both errors, measured on
// the same matrix. The SVD's side comes from the singular values of V, since
// the best rank-k error is the tail of the spectrum.
(function () {
  "use strict";

  const N = 1024, HOP = 512;
  const ITERS = 150;
  const BUDGET_MS = 8;
  const TOKENS = ["--v-sig", "--v-out", "--v-axis", "--v-res"];

  function* work(ctx, s) {
    const AC = ctx.AC;
    s.phase = "transform";
    yield;
    s.stft = AC.stft(ctx.signal, N, HOP, "hann");
    s.V = AC.magnitude(s.stft.Z, s.stft.F, s.stft.T);
    let tot = 0;
    for (let i = 0; i < s.V.length; i++) tot += s.V[i] * s.V[i];
    s.vnorm = Math.sqrt(tot);
    yield;

    // The comparison the scene exists to make. Only the first few singular
    // values are needed, so this sketch is small and quick -- nothing like
    // the full factorisation the low-rank scene pays for.
    s.phase = "svd";
    const Vc = AC.cplx(s.V.length);
    Vc.re.set(s.V);
    // Wider than the four components the scene ever shows. The singular values
    // of a sketch are Rayleigh quotients and so come in low, which pushes the
    // tail -- and therefore the SVD's error -- up; that is the direction that
    // could make the printed gap read as zero or negative while the copy says
    // it cannot be. At this width it agrees with a much wider sketch to the
    // two decimals the readout shows.
    const sub = yield* AC.leftSubspaceSteps(Vc, s.stft.F, s.stft.T, {sketch: 48, power: 6});
    s.sigma = sub.sigma;
    s.phase = "fitting";
    restart(ctx, s);
  }

  function restart(ctx, s) {
    // A solo that names a component this rank does not have blanks both panels,
    // makes the play button do nothing, and leaves the readout claiming the
    // reader is hearing something that cannot be produced. Lowering k while
    // soloing the top component landed in exactly that state.
    if (s.solo !== "all" && Number(s.solo) > s.k) s.solo = String(s.k);
    s.nmf = ctx.AC.nmfInit(s.V, s.stft.F, s.stft.T, s.k, 7);
    s.err = null;
    s.masks = {};
    s.phase = "fitting";
  }

  // The error the truncated SVD would leave at this rank: the tail of the
  // spectrum, relative to the matrix's own norm.
  function svdError(s, k) {
    let kept = 0;
    for (let i = 0; i < k && i < s.sigma.length; i++) kept += s.sigma[i] * s.sigma[i];
    const tail = Math.max(0, s.vnorm * s.vnorm - kept);
    return Math.sqrt(tail) / s.vnorm;
  }

  // One component, heard: its share of each cell of the magnitude, applied to
  // the original complex matrix so the phase comes back with it. Splitting a
  // spectrogram this way is a soft mask, and the shares sum to one, so the
  // components add up to the recording.
  function componentAudio(ctx, s, c) {
    if (s.masks[s.k + ":" + c]) return s.masks[s.k + ":" + c];
    const {W, H} = s.nmf, F = s.stft.F, T = s.stft.T, k = s.k;
    const Z = ctx.AC.cplx(F * T);
    for (let f = 0; f < F; f++) {
      for (let t = 0; t < T; t++) {
        let all = 0, mine = 0;
        for (let j = 0; j < k; j++) {
          const v = W[f * k + j] * H[j * T + t];
          all += v;
          if (j === c) mine = v;
        }
        const share = all > 1e-12 ? mine / all : 0;
        Z.re[f * T + t] = s.stft.Z.re[f * T + t] * share;
        Z.im[f * T + t] = s.stft.Z.im[f * T + t] * share;
      }
    }
    s.masks[s.k + ":" + c] =
      ctx.AC.istft(Z, F, T, N, HOP, "hann", ctx.signal.length);
    return s.masks[s.k + ":" + c];
  }

  window.VoiceScenes.register({
    id: "nmf",
    section: "09",

    controls: [
      {id: "k", type: "range", min: 2, max: 4, step: 1, fmt: (v) => "k = " + v},
      {id: "solo", type: "select", options: ["all", "1", "2", "3", "4"],
       // Only the components this rank actually has.
       available: (ctx) => ["all"].concat(
         Array.from({length: ctx.state.k}, (_, i) => String(i + 1)))}
    ],

    init(ctx) {
      Object.assign(ctx.state, {k: 3, solo: "all", phase: "transform", err: null, masks: {}});
      ctx.state.job = work(ctx, ctx.state);
    },

    reset(ctx) {
      ctx.state.k = 3;
      ctx.state.solo = "all";
      if (ctx.state.V) restart(ctx, ctx.state);
    },

    busy(ctx) { return ctx.state.phase !== "ready"; },
    region(ctx) { return {i0: 0, i1: ctx.signal.length}; },
    animates(ctx) { return ctx.head() >= 0; },

    playLabel(ctx) {
      const s = ctx.state;
      if (s.phase !== "ready") return "";
      if (s.solo === "all") return ctx.copy.hearAll;
      const c = Number(s.solo) - 1;
      if (c >= s.k) return "";
      return ctx.copy.hearOne(c + 1);
    },

    sync(ctx) {
      const s = ctx.state;
      if (s.V && s.nmf && s.nmf.k !== s.k) restart(ctx, s);
      const until = performance.now() + BUDGET_MS;
      if (s.job) {
        let step = s.job.next();
        while (!step.done && performance.now() < until) step = s.job.next();
        if (step.done) s.job = null;
        return;
      }
      if (s.phase !== "fitting") return;
      let moved = false;
      while (s.nmf.iter < ITERS && performance.now() < until) {
        ctx.AC.nmfStep(s.V, s.nmf, 2);
        moved = true;
      }
      // Measuring the error is itself a full pass over F x T x k, and sync()
      // runs twice on the frames that rewrite the readout. Paying for it when
      // the fit did not advance roughly doubled the time to converge.
      if (moved) s.err = ctx.AC.nmfError(s.V, s.nmf) / s.vnorm;
      if (s.nmf.iter >= ITERS) s.phase = "ready";
    },

    draw(ctx) {
      const g = ctx.g, K = ctx.K, W = ctx.W, H = ctx.H, s = ctx.state;
      const L = 44, R = 14, TOP = 30, BOT = 26, gap = 16;
      if (!s.V) {
        K.label(g, ctx.copy.working[s.phase], L, TOP, ctx.colour("--stage-mute"), {size: 12});
        return;
      }
      const colW = Math.max(60, (W - L - R - gap) * 0.5);
      const plotH = Math.max(50, H - TOP - BOT);

      if (!s.img) s.img = K.spectrogramImage(s.V, s.stft.F, s.stft.T, {floorDb: -70});
      K.blit(g, s.img, ctx.cache, L, TOP, colW, plotH);
      K.label(g, ctx.copy.vLabel, L + colW, TOP - 18, ctx.colour("--stage-mute"),
              {size: 11, mono: true, right: true});

      if (!s.nmf) return;
      const cx = L + colW + gap, half = (plotH - 18) / 2;
      const {W: Wm, H: Hm} = s.nmf, F = s.stft.F, T = s.stft.T, k = s.k;
      const solo = s.solo === "all" ? -1 : Number(s.solo) - 1;

      // W: each component's frequency signature, frequency across.
      let wmax = 1e-12;
      for (let i = 0; i < Wm.length; i++) if (Wm[i] > wmax) wmax = Wm[i];
      // Log frequency. A voice lives in the bottom sixth of a 24 kHz linear
      // axis, so a linear W is five sixths empty and the formants pile into
      // the left margin where nothing about them can be read.
      const lo = Math.log(1), hi = Math.log(F - 1);
      const fx = (f) => cx + ((Math.log(Math.max(1, f)) - lo) / (hi - lo)) * colW;
      for (let c = 0; c < k; c++) {
        if (solo >= 0 && c !== solo) continue;
        g.strokeStyle = ctx.colour(TOKENS[c % TOKENS.length]);
        g.lineWidth = solo === c ? 2 : 1.4;
        g.beginPath();
        for (let f = 1; f < F; f++) {
          const y = TOP + half - (Wm[f * k + c] / wmax) * half;
          f > 1 ? g.lineTo(fx(f), y) : g.moveTo(fx(f), y);
        }
        g.stroke();
      }
      // Decade marks, so "log" is visible rather than merely true.
      for (const hz of [100, 1000, 10000]) {
        const f = hz * (F - 1) / (ctx.rate / 2);
        if (f < 1 || f > F - 1) continue;
        K.label(g, hz >= 1000 ? (hz / 1000) + "k" : String(hz),
                fx(f), TOP + half - 12, ctx.colour("--stage-mute"), {size: 9});
      }
      K.label(g, ctx.copy.wLabel, cx, TOP - 18, ctx.colour("--stage-mute"), {size: 10});

      // H: when each one is switched on, time across.
      let hmax = 1e-12;
      for (let i = 0; i < Hm.length; i++) if (Hm[i] > hmax) hmax = Hm[i];
      const hy = TOP + half + 18;
      for (let c = 0; c < k; c++) {
        if (solo >= 0 && c !== solo) continue;
        g.strokeStyle = ctx.colour(TOKENS[c % TOKENS.length]);
        g.lineWidth = solo === c ? 2 : 1.4;
        g.beginPath();
        for (let t = 0; t < T; t++) {
          const x = cx + (t / (T - 1)) * colW;
          const y = hy + half - (Hm[c * T + t] / hmax) * half;
          t ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
      }
      K.label(g, ctx.copy.hLabel, cx, hy - 14, ctx.colour("--stage-mute"), {size: 10});

      if (s.phase === "fitting") {
        K.label(g, ctx.copy.iterating(s.nmf.iter, ITERS), cx + colW, TOP - 18,
                ctx.colour("--stage-mute"), {size: 10, right: true});
      }
    },

    audio(ctx) {
      const s = ctx.state;
      if (s.phase !== "ready") return null;
      if (s.solo === "all") return {samples: ctx.signal, what: ctx.copy.hearAll};
      const c = Number(s.solo) - 1;
      if (c >= s.k) return null;
      return {samples: componentAudio(ctx, s, c), what: ctx.copy.hearOne(c + 1)};
    },

    readout(ctx) {
      const s = ctx.state;
      if (!s.V || !s.nmf || s.err === null) {
        return {html: ctx.copy.workingReadout(s.phase),
                data: {phase: s.phase, k: s.k || "", iter: 0}};
      }
      const nmfErr = s.err, svdErr = svdError(s, s.k);
      return {
        html: ctx.copy.readout(s.k, nmfErr, svdErr, s.solo, s.nmf.iter, ITERS, ctx),
        data: {
          phase: s.phase,
          shape: s.stft.F + "," + s.stft.T,
          k: s.k,
          iter: s.nmf.iter,
          nmferr: (nmfErr * 100).toFixed(1),
          svderr: (svdErr * 100).toFixed(1),
          solo: s.solo
        }
      };
    },

    copy: {
      en: {
        tab: "Parts you can name",
        k: "NMF · section 09",
        h: "Giving up the best error to get parts you can name",
        claim: "V ≈ W H,  W, H ≥ 0",
        concept: "NMF minimises the same ‖V − WH‖ the truncated SVD does, but with every entry of " +
                 "both factors held at or above zero. A constrained minimum cannot beat an " +
                 "unconstrained one, so it must be worse on error. It is chosen anyway.",
        b: "W is each component's frequency signature and H is when that component is switched " +
           "on; the spectrogram on the left is what they multiply back to. Solo one and play it. " +
           "The reason to pay the error below is in what you hear: non-negative parts add up the " +
           "way sound does, so a component is a thing rather than a direction.",
        predict: "Before you solo one: the SVD is provably the better approximation. What could NMF have that it does not?",
        vLabel: "V — the magnitude spectrogram",
        wLabel: "W — frequency signatures (log Hz)",
        hLabel: "H — when each one is on",
        iterating: (i, n) => "fitting, " + i + " of " + n,
        working: {transform: "transforming…", svd: "measuring the best possible error…",
                  fitting: "fitting…", ready: ""},
        workingReadout: (phase) =>
          phase === "svd"
            ? "Measuring what the truncated SVD would leave at each rank, so there is something to " +
              "compare against."
            : "Transforming the recording, then fitting W and H by multiplicative updates.",
        hearAll: "the whole recording",
        hearOne: (n) => "component " + n + " on its own",
        controls: {k: "Components", solo: "Solo"},
        options: {solo: {all: "all of them", 1: "component 1", 2: "component 2",
                         3: "component 3", 4: "component 4"}},
        readout: (k, nmfErr, svdErr, solo, iter, total, ctx) => {
          const n = (x) => (x * 100).toFixed(1);
          const gapPts = (nmfErr - svdErr) * 100;
          // The SVD's own side of this comparison is a sketch (see the note
          // above `work()`), and a sketch's singular values come in low --
          // which can push the measured gap to zero or, on a fine rank, just
          // under it. Eckart–Young's guarantee is exact regardless, so the
          // copy says so instead of printing "worse by −0.1 points".
          const gapText = gapPts > 0.05
            ? "worse by " + gapPts.toFixed(1) + " points, and it has to be"
            : "measuring about the same here — the sketch on the SVD's side is an estimate, and " +
              "Eckart–Young's guarantee holds exactly even where this reading does not show it";
          const base = "At <b>k = " + k + "</b>, NMF leaves <b>" + n(nmfErr) +
            "%</b> relative error where the truncated SVD leaves <b>" + n(svdErr) +
            "%</b> — " + gapText + ": " +
            "Eckart–Young says nothing of rank " + k + " beats the SVD, and W, H ≥ 0 is a " +
            "constraint the SVD does not carry. That gap is the whole price, and it is a " +
            "fraction of a percentage point. ";
          return base + (solo === "all"
            ? "Solo a component and play it to hear what that error bought."
            : "What you are hearing is component " + solo + " alone — a part of the recording " +
              "with a name, which is not something a singular vector has.");
        },
        aria: (ctx) => {
          const s = ctx.state;
          if (!s.nmf || s.err === null) return "A spectrogram being factorised into non-negative parts.";
          return "A magnitude spectrogram beside " + s.k + " frequency signatures and their " +
                 "activations over time. At rank " + s.k + " this factorisation leaves " +
                 (s.err * 100).toFixed(1) + " percent relative error against the truncated SVD's " +
                 (svdError(s, s.k) * 100).toFixed(1) + " percent.";
        }
      },
      es: {
        tab: "Partes con nombre",
        k: "NMF · sección 09",
        h: "Renunciar al mejor error para obtener partes con nombre",
        claim: "V ≈ W H,  W, H ≥ 0",
        concept: "NMF minimiza el mismo ‖V − WH‖ que la SVD truncada, pero con todas las entradas " +
                 "de ambos factores en cero o por encima. Un mínimo con restricciones no puede " +
                 "superar a uno sin ellas, así que tiene que ser peor en error. Se elige igualmente.",
        b: "W es la firma en frecuencia de cada componente y H es cuándo se enciende esa " +
           "componente; el espectrograma de la izquierda es lo que su producto reconstruye. Aísla " +
           "una y reprodúcela. La razón para pagar el error de abajo está en lo que oyes: las " +
           "partes no negativas se suman como se suma el sonido, así que una componente es una " +
           "cosa y no una dirección.",
        predict: "Antes de aislar una: la SVD es demostrablemente la mejor aproximación. ¿Qué podría tener NMF que ella no tiene?",
        vLabel: "V — el espectrograma de magnitud",
        wLabel: "W — firmas en frecuencia (Hz log)",
        hLabel: "H — cuándo se enciende cada una",
        iterating: (i, n) => "ajustando, " + i + " de " + n,
        working: {transform: "transformando…", svd: "midiendo el mejor error posible…",
                  fitting: "ajustando…", ready: ""},
        workingReadout: (phase) =>
          phase === "svd"
            ? "Midiendo qué dejaría la SVD truncada en cada rango, para tener con qué comparar."
            : "Transformando la grabación, y después ajustando W y H con actualizaciones multiplicativas.",
        hearAll: "la grabación completa",
        hearOne: (n) => "la componente " + n + " sola",
        controls: {k: "Componentes", solo: "Aislar"},
        options: {solo: {all: "todas", 1: "componente 1", 2: "componente 2",
                         3: "componente 3", 4: "componente 4"}},
        readout: (k, nmfErr, svdErr, solo, iter, total, ctx) => {
          const n = (x) => (x * 100).toFixed(1);
          const gapPts = (nmfErr - svdErr) * 100;
          const gapText = gapPts > 0.05
            ? "peor por " + gapPts.toFixed(1) + " puntos, y tiene que serlo"
            : "midiendo casi lo mismo aquí: el boceto del lado de la SVD es una estimación, y la " +
              "garantía de Eckart–Young se cumple exactamente aunque esta lectura no lo muestre";
          const base = "Con <b>k = " + k + "</b>, NMF deja un <b>" + n(nmfErr) +
            "%</b> de error relativo donde la SVD truncada deja un <b>" + n(svdErr) +
            "%</b>: " + gapText + ". Eckart–Young dice que nada de " +
            "rango " + k + " supera a la SVD, y W, H ≥ 0 es una restricción que la SVD no lleva. " +
            "Esa diferencia es todo el precio, y es una fracción de un punto porcentual. ";
          return base + (solo === "all"
            ? "Aísla una componente y reprodúcela para oír qué compró ese error."
            : "Lo que oyes es la componente " + solo + " sola: una parte de la grabación con un " +
              "nombre, que no es algo que tenga un vector singular.");
        },
        aria: (ctx) => {
          const s = ctx.state;
          if (!s.nmf || s.err === null) return "Un espectrograma factorizándose en partes no negativas.";
          return "Un espectrograma de magnitud junto a " + s.k + " firmas en frecuencia y sus " +
                 "activaciones en el tiempo. Con rango " + s.k + " esta factorización deja un " +
                 (s.err * 100).toFixed(1) + " por ciento de error relativo frente al " +
                 (svdError(s, s.k) * 100).toFixed(1) + " por ciento de la SVD truncada.";
        }
      }
    }
  });
})();
