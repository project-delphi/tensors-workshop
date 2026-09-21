// Scene 8: Appendix E, drawn.
//
// The take-home adds noise to a real voice at a known 5 dB, cuts the result
// into a (513, 465) matrix, truncates that matrix's SVD, and inverts it. The
// curve that comes back is the whole lesson and it is not monotonic: at rank 2
// the "denoiser" lands *below* the noise it started from, at rank 40 it peaks,
// and at full rank it is the noisy input again, exactly. Optimal on the
// Frobenius norm is not optimal on the thing you care about.
//
// Everything here is measured, not quoted. The factorisation runs in the
// browser when the reader reaches this picture and each rung of the ladder is
// evaluated in turn, so the curve draws itself point by point -- section 09's
// question is what a factorisation *costs*, and this is the one place in the
// workshop where the reader waits for one.
(function () {
  "use strict";

  const N = 1024, HOP = 512, TARGET_DB = 5, SEED = 42;
  // The ladder this scene would like to show. A recording short enough that
  // the sketch's own width `l` (audio-core's `leftSubspaceSteps`) falls below
  // a rung means that rung's rank does not exist -- `projectRank` and
  // `retained` both throw above `l` -- so every place that reads the ladder
  // reads it off `ctx.state.ladder`, filtered to what this recording's `l`
  // actually has. A recording so short that even the smallest rung is out of
  // reach leaves `ladder` empty: the picture still stands, showing only the
  // full, undiscarded reconstruction.
  const FULL_LADDER = [2, 5, 10, 20, 40, 80, 160];
  const BUDGET_MS = 8;                     // work per frame, so the page stays alive

  // A kept clip is clamped into a Float32 AudioBuffer channel on its way to
  // the speakers, so Float64 here is eight bytes buying nothing. Every number
  // the scene prints -- the SNR of each rung, the energy retained -- is
  // measured off the Float64 array first, above; only the copy that is kept
  // is narrowed.
  const f32 = (a) => Float32Array.from(a);

  // The ladder for one recording: FULL_LADDER cut down to the rungs `l`
  // components actually reach. Computed from the shape alone (no transform
  // run yet) so init() can seed a legal default before work() ever starts.
  function ladderFor(ctx) {
    const {T} = ctx.AC.stftShape(ctx.signal.length, N, HOP);
    const l = Math.min(ctx.AC.SKETCH, T);
    return {l, ladder: FULL_LADDER.filter((k) => k <= l)};
  }

  // One generator for the whole job: build the noisy signal, factor it, then
  // measure every rung. `leftSubspaceSteps` hands back its own bands, so the
  // page keeps drawing all the way through the factorisation; measuring a
  // rung is a handful of milliseconds even at k = 160 (audio_core.test.cjs
  // times it), so each rung is one step rather than a further band split.
  function* work(ctx, s) {
    const AC = ctx.AC;
    s.phase = "transform";
    yield;
    s.clean = ctx.signal;
    // A local: the noise is added once and never looked at again, and at this
    // length keeping it would cost 1.9 MB for nothing.
    const noise = AC.noiseAtSnr(s.clean, TARGET_DB, SEED);
    s.noisy = new Float64Array(s.clean.length);
    for (let i = 0; i < s.clean.length; i++) s.noisy[i] = s.clean[i] + noise[i];
    s.noisyDb = AC.snrDb(s.clean, s.noisy);
    yield;
    s.stft = AC.stft(s.noisy, N, HOP, "hann");
    s.total = AC.frobSq(s.stft.Z);
    // Drawn now, not kept as numbers. A magnitude's only destination is
    // `spectrogramImage`, which quantizes it to a 256-entry ramp, so the
    // matrix of doubles behind the picture is 1.9 MB that can never be seen
    // again once the picture exists.
    s.noisyImg = ctx.K.spectrogramImage(
      AC.magnitude(s.stft.Z, s.stft.F, s.stft.T), s.stft.F, s.stft.T, {floorDb: -70});
    yield;

    s.phase = "factorising";
    const sub = yield* AC.leftSubspaceSteps(s.stft.Z, s.stft.F, s.stft.T);
    s.U = sub.U; s.sigma = sub.sigma; s.l = sub.l;
    // Re-derived from the sketch that actually ran, not trusted from the
    // shape-only estimate init() seeded the slider from: same formula, same
    // T, so it agrees, but this is the one that measures below rests on.
    s.ladder = FULL_LADDER.filter((k) => k <= s.l);

    s.phase = "measuring";
    for (const k of s.ladder) {
      const Zk = AC.projectRank(s.stft.Z, s.U, s.stft.F, s.stft.T, s.l, k);
      const rec = AC.istft(Zk, s.stft.F, s.stft.T, N, HOP, "hann", s.clean.length);
      s.snr[k] = AC.snrDb(s.clean, rec);
      s.kept[k] = AC.retained(s.sigma, k, s.total);
      // Kept, not thrown away. The reader lands on one of these ranks the
      // moment the scene is ready, and recomputing the projection and the
      // inverse transform inside draw() froze the page for a moment a rung.
      // What is kept is the finished picture and the finished sound -- the
      // rung is drawn here, on the frame that measured it, rather than on the
      // first frame that shows it. Neither `Zk` nor its magnitude outlives
      // this iteration: draw() reads an image and audio() reads samples, and
      // nothing downstream can ask either of them a question again.
      s.recon[k] = {
        audio: f32(rec),
        img: ctx.K.spectrogramImage(AC.magnitude(Zk, s.stft.F, s.stft.T),
                                    s.stft.F, s.stft.T, {floorDb: -70})
      };
      s.curve.push(k);
      yield;
    }
    // Full rank discards nothing, so it needs no factorisation at all: invert
    // the matrix itself and measure what comes back. It lands on the noisy
    // input because it *is* the noisy input.
    const full = AC.istft(s.stft.Z, s.stft.F, s.stft.T, N, HOP, "hann", s.clean.length);
    s.snr.full = AC.snrDb(s.clean, full);
    s.kept.full = 1;
    // The same picture object, not a copy of it: full rank discards nothing,
    // so its magnitude is the noisy magnitude, and drawing it twice would
    // produce two identical 0.95 MB images. Both readers only ever blit it.
    s.recon.full = {audio: f32(full), img: s.noisyImg};
    s.curve.push("full");
    s.phase = "ready";
    // A recording too short for even the smallest rung leaves the ladder
    // empty: nothing was truncated, so there is no peak to name, and the
    // scene shows the full reconstruction alone rather than guessing one.
    s.best = s.ladder.length
      ? s.ladder.reduce((a, b) => (s.snr[b] > s.snr[a] ? b : a))
      : null;
  }

  const rungs = (ctx) => (ctx.state.ladder || []).concat(["full"]);
  const rungAt = (ctx) => rungs(ctx)[Math.min(rungs(ctx).length - 1, ctx.state.rung)];

  // A lookup, never a computation: every rung was built and kept while the
  // curve was being measured, and draw() runs on the frame clock.
  const reconstruct = (ctx) => ctx.state.recon[rungAt(ctx)];

  window.VoiceScenes.register({
    id: "lowrank",
    section: "09",
    part: {en: "What factoring it costs", es: "Lo que cuesta factorizarla"},

    controls: [
      // max stays the full ladder's length: a slider position past this
      // recording's own ladder clamps in rungAt() and in fmt() together, off
      // the same array, so the label a reader drags to and the rung the
      // scene actually shows never disagree -- never a slider that says
      // "k = 40" over a picture built from a rung that does not exist.
      {id: "rung", type: "range", min: 0, max: FULL_LADDER.length, step: 1,
       fmt: (v, ctx) => {
         const list = rungs(ctx);
         const k = list[Math.min(list.length - 1, v)];
         return k === "full" ? ctx.copy.fullRank : "k = " + k;
       }},
      {id: "hear", type: "select", options: ["rank", "noisy", "clean"]}
    ],

    init(ctx) {
      const {l, ladder} = ladderFor(ctx);
      Object.assign(ctx.state, {
        // A default that sits past a short ladder's last index clamps in
        // rungAt(), same as a drag past it would -- so this is always legal,
        // never off the grid init() seeded it from.
        rung: Math.min(4, ladder.length), hear: "rank", phase: "transform",
        snr: {}, kept: {}, curve: [], recon: {}, best: null, l, ladder
      });
      ctx.state.job = work(ctx, ctx.state);
    },

    reset(ctx) {
      ctx.state.rung = Math.min(4, (ctx.state.ladder || []).length);
      ctx.state.hear = "rank";
    },

    busy(ctx) { return ctx.state.phase !== "ready" && ctx.state.phase !== "failed"; },
    region(ctx) { return {i0: 0, i1: ctx.signal.length}; },
    animates(ctx) { return ctx.head() >= 0; },

    playLabel(ctx) {
      const s = ctx.state;
      if (s.phase !== "ready") return "";
      if (s.hear === "clean") return ctx.copy.hearNames.clean;
      if (s.hear === "noisy") return ctx.copy.hearNames.noisy;
      return ctx.copy.hearNames.rank(rungAt(ctx), ctx);
    },

    sync(ctx) {
      const s = ctx.state;
      if (s.phase === "ready" || s.phase === "failed" || !s.job) return;
      const until = performance.now() + BUDGET_MS;
      // `sync()` runs inside the frame's own rAF loop (voice-stage.html's
      // frame() calls it through changed() and paint(), and schedules the
      // next frame after both) -- an exception out of this generator with no
      // try here does not stop at this scene, it stops the page's whole
      // clock, because nothing after the throw ever reaches the reschedule.
      // `AC.noiseAtSnr` throws on digital silence (a dropped file that
      // decodes to all zero) and `leftSubspaceSteps` throws if the sketch's
      // Gram matrix fails to diagonalise, so this is caught at the loop, not
      // at either call site.
      try {
        let step = s.job.next();
        while (!step.done && performance.now() < until) step = s.job.next();
        if (step.done) s.job = null;
      } catch (err) {
        s.job = null;
        s.phase = "failed";
        s.error = (err && err.message) || String(err);
      }
    },

    draw(ctx) {
      const g = ctx.g, K = ctx.K, W = ctx.W, H = ctx.H, s = ctx.state;
      const L = 48, R = 14, TOP = 30, BOT = 26;
      const gap = 18;
      const colW = Math.max(60, (W - L - R - gap) / 2);
      const plotH = Math.max(50, H - TOP - BOT);

      if (s.phase === "failed") {
        K.label(g, ctx.copy.failedLabel, L, TOP, ctx.colour("--stage-mute"), {size: 12});
        return;
      }

      if (s.phase === "transform") {
        K.label(g, ctx.copy.working[s.phase], L, TOP, ctx.colour("--stage-mute"), {size: 12});
        return;
      }

      // Left: the spectrogram at this rank, or the noisy one until there is
      // one. Both were drawn in work(), so this is a blit and nothing else --
      // a rung the reader has never landed on before costs the same frame as
      // one they are dragging back to. `built` is undefined for a rung the
      // measuring loop has not reached yet, which is the noisy picture too.
      const ready = s.phase === "ready" || s.phase === "measuring";
      const built = ready ? reconstruct(ctx) : null;
      const img = built ? built.img : s.noisyImg;
      if (img) K.blit(g, img, ctx.cache, L, TOP, colW, plotH);
      // Right-aligned, like every top-row label on this stage: the claim card
      // is an HTML element pinned to the stage's top left, and anything drawn
      // at the left margin lands underneath it.
      K.label(g, built ? ctx.copy.rankLabel(rungAt(ctx), ctx) : ctx.copy.noisyLabel,
              L + colW, TOP - 18, ctx.colour("--v-out"), {size: 11, mono: true, right: true});

      // Right: the singular values while it factors, then the curve.
      const cx = L + colW + gap;
      if (s.phase === "factorising" || !s.curve.length) {
        K.label(g, ctx.copy.working[s.phase], cx, TOP - 18, ctx.colour("--stage-mute"), {size: 11});
        if (s.sigma) {
          const n = Math.min(s.sigma.length, 240);
          const top = s.sigma[0] || 1;
          g.fillStyle = ctx.colour("--v-axis");
          for (let i = 0; i < n; i++) {
            const h = Math.max(1, (s.sigma[i] / top) * plotH);
            g.fillRect(cx + (i / n) * colW, TOP + plotH - h, Math.max(1, colW / n), h);
          }
          K.label(g, ctx.copy.spectrum, cx, TOP + 4, ctx.colour("--stage-mute"), {size: 10});
        }
        return;
      }

      // The curve: signal-to-noise against rank, with the noisy input as the
      // line the whole scene is measured against.
      const pts = s.curve.map((k, i) => ({k, i, db: s.snr[k]}));
      const all = pts.map((p) => p.db).concat([s.noisyDb]);
      const lo = Math.min.apply(null, all) - 0.6, hi = Math.max.apply(null, all) + 0.6;
      const X = (i) => cx + (i / (Math.max(1, rungs(ctx).length - 1))) * colW;
      const Y = (db) => TOP + plotH - ((db - lo) / (hi - lo)) * plotH;

      g.strokeStyle = ctx.colour("--v-res");
      g.setLineDash([4, 4]); g.lineWidth = 1;
      g.beginPath(); g.moveTo(cx, Y(s.noisyDb)); g.lineTo(cx + colW, Y(s.noisyDb)); g.stroke();
      g.setLineDash([]);
      K.label(g, ctx.copy.noisyLine(s.noisyDb.toFixed(2)), cx + colW, Y(s.noisyDb) - 16,
              ctx.colour("--v-res"), {size: 10, right: true});

      g.strokeStyle = ctx.colour("--v-axis");
      g.lineWidth = 2;
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(X(p.i), Y(p.db)) : g.moveTo(X(p.i), Y(p.db))));
      g.stroke();

      pts.forEach((p) => {
        const here = p.k === rungAt(ctx);
        const peak = p.k === s.best;
        g.fillStyle = here ? ctx.colour("--v-sig")
          : peak ? ctx.colour("--v-out") : ctx.colour("--stage-mute");
        g.beginPath(); g.arc(X(p.i), Y(p.db), here ? 5 : 3, 0, Math.PI * 2); g.fill();
        if (here || peak) {
          K.label(g, p.db.toFixed(2), X(p.i), Y(p.db) - 20,
                  here ? ctx.colour("--v-sig") : ctx.colour("--v-out"), {size: 10, mono: true});
        }
      });
      pts.forEach((p) => {
        K.label(g, p.k === "full" ? ctx.copy.fullShort : String(p.k),
                X(p.i) - 6, TOP + plotH + 4, ctx.colour("--stage-mute"), {size: 10});
      });
      K.label(g, ctx.copy.axisSnr, cx, TOP - 18, ctx.colour("--stage-mute"), {size: 10});
    },

    audio(ctx) {
      const s = ctx.state;
      if (s.phase !== "ready") return null;
      if (s.hear === "clean") return {samples: s.clean, what: ctx.copy.hearNames.clean};
      if (s.hear === "noisy") return {samples: s.noisy, what: ctx.copy.hearNames.noisy};
      const built = reconstruct(ctx);
      if (!built) return null;
      return {samples: built.audio, what: ctx.copy.hearNames.rank(rungAt(ctx), ctx)};
    },

    readout(ctx) {
      const s = ctx.state;
      if (s.phase === "failed") {
        return {
          html: ctx.copy.failed(s.error),
          data: {phase: "failed", shape: s.stft ? s.stft.F + "," + s.stft.T : "", k: "", snr: ""}
        };
      }
      if (s.phase !== "ready") {
        return {
          html: ctx.copy.workingReadout(s.phase, s.curve.length, s.ladder.length,
                                         s.stft ? s.stft.F : null, s.stft ? s.stft.T : null),
          data: {phase: s.phase, shape: s.stft ? s.stft.F + "," + s.stft.T : "", k: "", snr: ""}
        };
      }
      const k = rungAt(ctx);
      const db = s.snr[k], kept = s.kept[k];
      return {
        html: ctx.copy.readout(k, db, kept, s.noisyDb, s.best, s.snr[s.best], ctx),
        data: {
          phase: "ready",
          shape: s.stft.F + "," + s.stft.T,
          k: k === "full" ? s.stft.T : k,
          snr: db.toFixed(2),
          retained: (kept * 100).toFixed(1),
          noisy: s.noisyDb.toFixed(2),
          best: s.best
        }
      };
    },

    copy: {
      en: {
        tab: "Low rank",
        k: "Truncated SVD · section 09",
        h: "The best rank is in the middle, and both ends fail",
        claim: "Z ≈ U_k Σ_k V_kᵀ",
        concept: "The truncated SVD is the best rank-k approximation there is, by Eckart–Young. " +
                 "This is where that stops being enough: it is optimal on ‖Z − Z_k‖, and what " +
                 "you care about is how much of the voice survives, which is a different question.",
        b: "Noise was added to the recording at a measured 5 dB, and the matrix of the result is " +
           "being factored in your browser right now — that wait is the cost section 09 keeps " +
           "asking about. Then drag the rank and listen. Watch what happens at the two ends of " +
           "the curve, and notice that neither end is a bug.",
        predict: "Before you drag: more components means a closer approximation. Should more always sound better?",
        fullRank: "every component", fullShort: "all",
        spectrum: "singular values",
        axisSnr: "signal-to-noise against rank",
        noisyLabel: "the noisy input",
        rankLabel: (k, ctx) => (k === "full" ? "every component" : "rank " + k),
        noisyLine: (db) => "the noisy input, " + db + " dB",
        working: {transform: "adding noise and transforming…",
                  factorising: "factorising…", measuring: "measuring each rank…",
                  ready: ""},
        failedLabel: "the factorisation failed",
        failed: (err) => "This recording could not be factored: <b>" + err +
                 "</b>. Try a different recording — the rest of the stage still works.",
        workingReadout: (phase, done, total, F, T) => {
          if (phase === "factorising") {
            return "Factorising a <b>" + F + " × " + T + "</b> matrix, in the browser. This is the " +
                   "wait that section 09's question is about — a factorisation is not free, and you " +
                   "are paying for this one now.";
          }
          if (phase === "measuring") {
            return "Rebuilding and measuring each rank in turn — <b>" + done + "</b> of <b>" +
                   total + "</b> so far. Every point on the curve is an inverse transform and a " +
                   "signal-to-noise ratio, not a stored answer.";
          }
          return "Adding noise to the recording at a measured 5 dB, then transforming it.";
        },
        hearNames: {
          clean: "the original recording", noisy: "the noisy input",
          rank: (k, ctx) => (k === "full" ? "every component" : "rank " + k)
        },
        controls: {rung: "Rank kept", hear: "Play"},
        options: {hear: {rank: "the rank above", noisy: "the noisy input", clean: "the original"}},
        readout: (k, db, kept, noisy, best, bestDb, ctx) => {
          const pct = (kept * 100).toFixed(1);
          const head = k === "full"
            ? "Keeping <b>every</b> component throws nothing away, so this is <b>" +
              db.toFixed(2) + " dB</b> — "
            : "Rank <b>" + k + "</b> keeps <b>" + pct + "%</b> of the matrix's energy and measures <b>" +
              db.toFixed(2) + " dB</b> — ";
          if (k === "full") {
            return head + "<span class=\"fault\">exactly the noisy input you started from</span>. " +
                   "U Σ Vᵀ reconstructs Z, the inverse transform undoes the forward one, and you " +
                   "get your noise back. Nothing was discarded, so nothing was denoised.";
          }
          if (db < noisy) {
            return head + "<span class=\"fault\">worse than the " + noisy.toFixed(2) +
                   " dB you started from</span>. This approximation is so aggressive that it is " +
                   "throwing away voice along with noise: a denoiser that made things worse.";
          }
          const lead = db >= bestDb - 1e-9
            ? "the best on the ladder, <b>+" + (db - noisy).toFixed(2) + " dB</b> over the noisy input, "
            : "<b>+" + (db - noisy).toFixed(2) + " dB</b> over the noisy input, but past the peak at rank " +
              best + "; ";
          return head + lead + "from " + (k === best ? pct + "% of the energy on " : "") +
                 "a small fraction of the ranks. The useful region is the middle, and it has to be " +
                 "measured rather than assumed.";
        },
        aria: (ctx) => {
          const s = ctx.state;
          if (s.phase === "failed") return "The factorisation failed on this recording.";
          if (s.phase !== "ready") return "A spectrogram being factorised.";
          const k = rungAt(ctx);
          const peak = s.best === null ? "" : ", and the curve peaks at rank " + s.best;
          return "A spectrogram rebuilt from " + (k === "full" ? "every component" : "rank " + k) +
                 ", beside a curve of signal-to-noise against rank. This rank measures " +
                 s.snr[k].toFixed(2) + " decibels against the noisy input's " +
                 s.noisyDb.toFixed(2) + peak + ".";
        }
      },
      es: {
        tab: "Rango bajo",
        k: "SVD truncada · sección 09",
        h: "El mejor rango está en el medio, y ambos extremos fallan",
        claim: "Z ≈ U_k Σ_k V_kᵀ",
        concept: "La SVD truncada es la mejor aproximación de rango k que existe, por " +
                 "Eckart–Young. Aquí es donde eso deja de bastar: es óptima sobre ‖Z − Z_k‖, y lo " +
                 "que te importa es cuánta voz sobrevive, que es otra pregunta.",
        b: "Se añadió ruido a la grabación a 5 dB medidos, y la matriz del resultado se está " +
           "factorizando en tu navegador ahora mismo: esa espera es el coste por el que la sección " +
           "09 no deja de preguntar. Después arrastra el rango y escucha. Observa qué pasa en los " +
           "dos extremos de la curva, y fíjate en que ninguno es un error.",
        predict: "Antes de arrastrar: más componentes significa una aproximación más cercana. ¿Debería sonar siempre mejor cuantas más haya?",
        fullRank: "todas las componentes", fullShort: "todas",
        spectrum: "valores singulares",
        axisSnr: "señal-ruido frente al rango",
        noisyLabel: "la entrada con ruido",
        rankLabel: (k, ctx) => (k === "full" ? "todas las componentes" : "rango " + k),
        noisyLine: (db) => "la entrada con ruido, " + db + " dB",
        working: {transform: "añadiendo ruido y transformando…",
                  factorising: "factorizando…", measuring: "midiendo cada rango…",
                  ready: ""},
        failedLabel: "la factorización falló",
        failed: (err) => "Esta grabación no se pudo factorizar: <b>" + err +
                 "</b>. Prueba con otra grabación: el resto de la etapa sigue funcionando.",
        workingReadout: (phase, done, total, F, T) => {
          if (phase === "factorising") {
            return "Factorizando una matriz de <b>" + F + " × " + T + "</b>, en el navegador. Esta " +
                   "es la espera de la que trata la pregunta de la sección 09: una factorización no " +
                   "es gratis, y estás pagando esta ahora.";
          }
          if (phase === "measuring") {
            return "Reconstruyendo y midiendo cada rango por turno: <b>" + done + "</b> de <b>" +
                   total + "</b> hasta ahora. Cada punto de la curva es una transformada inversa y " +
                   "una relación señal-ruido, no una respuesta guardada.";
          }
          return "Añadiendo ruido a la grabación a 5 dB medidos, y después transformándola.";
        },
        hearNames: {
          clean: "la grabación original", noisy: "la entrada con ruido",
          rank: (k, ctx) => (k === "full" ? "todas las componentes" : "rango " + k)
        },
        controls: {rung: "Rango conservado", hear: "Reproducir"},
        options: {hear: {rank: "el rango de arriba", noisy: "la entrada con ruido", clean: "el original"}},
        readout: (k, db, kept, noisy, best, bestDb, ctx) => {
          const pct = (kept * 100).toFixed(1);
          const head = k === "full"
            ? "Conservar <b>todas</b> las componentes no descarta nada, así que esto da <b>" +
              db.toFixed(2) + " dB</b>: "
            : "El rango <b>" + k + "</b> conserva el <b>" + pct + "%</b> de la energía de la matriz " +
              "y mide <b>" + db.toFixed(2) + " dB</b>: ";
          if (k === "full") {
            return head + "<span class=\"fault\">exactamente la entrada con ruido de la que " +
                   "partiste</span>. U Σ Vᵀ reconstruye Z, la transformada inversa deshace la " +
                   "directa, y recuperas tu ruido. No se descartó nada, así que no se limpió nada.";
          }
          if (db < noisy) {
            return head + "<span class=\"fault\">peor que los " + noisy.toFixed(2) +
                   " dB de los que partiste</span>. Esta aproximación es tan agresiva que descarta " +
                   "voz junto con el ruido: un limpiador que empeoró las cosas.";
          }
          const lead = db >= bestDb - 1e-9
            ? "el mejor de la escalera, <b>+" + (db - noisy).toFixed(2) + " dB</b> sobre la entrada con ruido, "
            : "<b>+" + (db - noisy).toFixed(2) + " dB</b> sobre la entrada con ruido, pero pasado el " +
              "máximo del rango " + best + "; ";
          return head + lead + "a partir de una fracción pequeña de los rangos. La región útil está " +
                 "en el medio, y hay que medirla en lugar de suponerla.";
        },
        aria: (ctx) => {
          const s = ctx.state;
          if (s.phase === "failed") return "La factorización de esta grabación falló.";
          if (s.phase !== "ready") return "Un espectrograma factorizándose.";
          const k = rungAt(ctx);
          const peak = s.best === null ? "" :
            ", y la curva alcanza su máximo en el rango " + s.best;
          return "Un espectrograma reconstruido desde " +
                 (k === "full" ? "todas las componentes" : "el rango " + k) +
                 ", junto a una curva de señal-ruido frente al rango. Este rango mide " +
                 s.snr[k].toFixed(2) + " decibelios frente a los " + s.noisyDb.toFixed(2) +
                 " de la entrada con ruido" + peak + ".";
        }
      }
    }
  });
})();
