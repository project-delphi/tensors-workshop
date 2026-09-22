// Scene 10: the rank-4 tensor a model is actually handed.
//
// Every picture before this one is of a single recording. A model is never
// handed one: it is handed a batch, and the batch axis is the one that has
// nothing to do with the sound. Section 02 is where the workshop asks what
// every axis counts and why a batch axis is not the same thing as a time
// axis, and this is that question with three real recordings in it.
//
// The three built-ins are all exactly the same length, so they stack without
// argument: (3, 1, 513, 465). Drop a file of your own and they stop being the
// same length, which is the only reason a real loader has a crop at all --
// the ragged case is the lesson, and it is drawn rather than described.
//
// Nothing here needs banding the way lowrank.js does. Three transforms of a
// five-second recording is about 50 ms of arithmetic; the wait is the two
// fetches, which is why the scene has a phase at all.
(function () {
  "use strict";

  const N = 1024, HOP = 512;
  const BUILTIN = ["voice", "beat", "tone"];
  const TONE_HZ = 440;

  // Keyed by recording name and kept in module scope on purpose: resignal()
  // empties ctx.state and ctx.cache on every change of recording, and a
  // decode plus a transform is not work to repeat because the reader pressed
  // the picker.
  const CACHE = new Map();
  let pending = null;

  function analyse(ctx, name, samples) {
    const st = ctx.AC.stft(samples, N, HOP, "hann");
    const mag = ctx.AC.magnitude(st.Z, st.F, st.T);
    return {
      name: name,
      samples: samples,
      F: st.F,
      T: st.T,
      img: ctx.K.spectrogramImage(mag, st.F, st.T, {floorDb: -70})
    };
  }

  function fetchOne(ctx, name, toneLength) {
    if (CACHE.has(name)) return Promise.resolve(CACHE.get(name));
    if (name === "tone") {
      const e = analyse(ctx, name, ctx.AC.tone(toneLength, ctx.rate, TONE_HZ));
      CACHE.set(name, e);
      return Promise.resolve(e);
    }
    return fetch("vendor/" + name + ".wav")
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then((b) => ctx.AC.decodeWav(new Uint8Array(b)))
      .then((w) => {
        const e = analyse(ctx, name, w.samples);
        CACHE.set(name, e);
        return e;
      });
  }

  // The reader's own clip is never cached by name: it changes under us, so it
  // is recomputed whenever its length does.
  function ownClip(ctx) {
    if (ctx.source !== "file") return null;
    const s = ctx.state;
    if (s.own && s.own.samples.length === ctx.signal.length) return s.own;
    s.own = analyse(ctx, "file", ctx.signal);
    return s.own;
  }

  // Everything the picture is of, in batch order.
  function examples(ctx) {
    const built = BUILTIN.map((n) => CACHE.get(n)).filter(Boolean);
    const own = ownClip(ctx);
    return own ? built.concat([own]) : built;
  }

  function load(ctx) {
    // `failed` is the third guard and not an optional one: sync() is called
    // from paint(), paint() is the end of changed(), and the catch below
    // calls changed() -- so without this a single 404 refetches forever, for
    // as long as the reader stays on this section. lowrank.js keeps the same
    // guard on its own phase.
    if (ctx.embed || pending || ctx.state.failed) return;
    if (BUILTIN.every((n) => CACHE.has(n))) return;
    // voice first, because its length is what the synthesised tone is cut to:
    // the three are the same shape because they are the same length, and that
    // is a fact to derive rather than to type.
    pending = fetchOne(ctx, "voice")
      .then((v) => fetchOne(ctx, "beat").then(() => fetchOne(ctx, "tone", v.samples.length)))
      .then(() => { pending = null; ctx.changed(); })
      .catch(() => { pending = null; ctx.state.failed = true; ctx.changed(); });
  }

  window.VoiceScenes.register({
    id: "batch",
    section: "02",
    part: {en: "What a model is handed", es: "Lo que recibe un modelo"},
    posControl: "crop",

    controls: [
      {id: "lit", type: "select", options: ["voice", "beat", "tone", "file"],
       available: (ctx) => ctx.source === "file" ? BUILTIN.concat(["file"]) : BUILTIN.slice()},
      {id: "crop", type: "range", min: 32, max: 465, step: 1,
       fmt: (v) => "T = " + v}
    ],

    init(ctx) {
      ctx.state.lit = BUILTIN.indexOf(ctx.source) >= 0 ? ctx.source : "voice";
      ctx.state.crop = 465;
      ctx.state.own = null;
      ctx.state.failed = false;
    },

    reset(ctx) {
      ctx.state.lit = "voice";
      ctx.state.crop = 465;
    },

    arrive(ctx) { load(ctx); },
    sync(ctx) { load(ctx); },

    // The samples the crop keeps, banded on the whole-recording strip.
    region(ctx) {
      const keep = Math.min(ctx.signal.length, ctx.state.crop * HOP);
      return {i0: 0, i1: keep};
    },

    // The one scene whose lesson is that the shape may not exist. When the
    // crop is longer than the shortest example there is no rank-4 tensor to
    // name, and a badge naming one would contradict the readout under it.
    shape(ctx) {
      const ex = examples(ctx);
      if (!ex.length) return "";
      const shortest = ex.reduce((m, e) => Math.min(m, e.T), Infinity);
      if (ctx.state.crop > shortest) return "";
      return "[" + ex.length + ", 1, " + ex[0].F + ", " + ctx.state.crop + "]";
    },

    draw(ctx) {
      const g = ctx.g, K = ctx.K, W = ctx.W, H = ctx.H;
      const ex = examples(ctx);
      if (!ex.length) {
        K.label(g, ctx.state.failed ? ctx.copy.failed : ctx.copy.loading,
                16, H / 2, ctx.colour("--stage-mute"), {size: 13});
        return;
      }

      const L = 130, R = 96, TOP = 30, BOT = 34;
      const widest = ex.reduce((m, e) => Math.max(m, e.T), 1);
      const spanW = Math.max(40, W - L - R);
      const gap = 9;
      const rowH = Math.max(12, (H - TOP - BOT - gap * (ex.length - 1)) / ex.length);
      const crop = ctx.state.crop;
      const lit = ctx.hl;

      ex.forEach((e, i) => {
        const y = TOP + i * (rowH + gap);
        const w = spanW * (e.T / widest);
        K.blit(g, e.img, ctx.cache, L, y, w, rowH);

        const isLit = e.name === ctx.state.lit;
        g.strokeStyle = isLit ? ctx.colour("--v-comp") : ctx.colour("--v-axis");
        g.lineWidth = isLit ? 2 : 1;
        g.strokeRect(L + 0.5, y + 0.5, w - 1, rowH - 1);

        // What the crop throws away, shaded rather than cut, so the reader can
        // see the columns leaving.
        if (crop < e.T) {
          const cx = L + spanW * (crop / widest);
          g.fillStyle = "rgba(0, 0, 0, 0.62)";
          g.fillRect(cx, y, L + w - cx, rowH);
          g.strokeStyle = ctx.colour("--v-comp");
          g.lineWidth = 1.5;
          g.beginPath(); g.moveTo(cx, y); g.lineTo(cx, y + rowH); g.stroke();
        }

        // Right-aligned against the F bracket, so a long name grows towards
        // the B bracket rather than off the left edge of the stage.
        K.label(g, ctx.copy.names[e.name] || e.name, L - 16, y + rowH / 2,
                isLit ? ctx.colour("--v-comp") : ctx.colour("--stage-mute"),
                {size: 11, right: true});
        // Every slab's own shape, which is the whole of why they do or do not
        // stack -- the ragged one is the only one that differs.
        K.label(g, "(1, " + e.F + ", " + Math.min(crop, e.T) + ")", W - 4, y + rowH / 2,
                e.T < crop ? ctx.colour("--v-res") : ctx.colour("--stage-mute"),
                {size: 11, mono: true, right: true});
      });

      const stackTop = TOP, stackBot = TOP + ex.length * rowH + (ex.length - 1) * gap;
      // One bracket per axis of the equation above, lit when the reader points
      // at that letter. Faint the rest of the time, because the picture is the
      // slabs and not the furniture.
      // B's label goes under its bracket, left-aligned: right-aligned at
      // x = 12 the chip starts off the left edge of the canvas.
      axis(ctx, g, K, "batch", lit, {x: 12, y0: stackTop, y1: stackBot},
           "B = " + ex.length, true, {x: 8, y: stackBot + 10});
      // F's goes at the top of its bracket, not the middle, which is the
      // baseline the first row's name is already on.
      axis(ctx, g, K, "freq", lit, {x: L - 9, y0: stackTop, y1: stackTop + rowH},
           "F = " + ex[0].F, true, {x: L - 11, y: stackTop + 6, right: true});
      axis(ctx, g, K, "time", lit,
           {y: stackBot + 12, x0: L, x1: L + spanW * (Math.min(crop, widest) / widest)},
           "T = " + crop, false);
      if (lit === "chan") {
        K.label(g, ctx.copy.mono, L + 6, stackTop + rowH / 2,
                ctx.colour("--v-comp"), {size: 12});
      }
    },

    readout(ctx) {
      const ex = examples(ctx);
      if (!ex.length) {
        return {html: ctx.state.failed ? ctx.copy.failed : ctx.copy.loading,
                data: {phase: ctx.state.failed ? "failed" : "loading"}};
      }
      const crop = ctx.state.crop;
      const shortest = ex.reduce((m, e) => Math.min(m, e.T), Infinity);
      const ragged = ex.some((e) => e.T !== ex[0].T);
      const fits = crop <= shortest;
      return {
        html: ctx.copy.readout(ex.length, ex[0].F, crop, ragged, fits, shortest,
                               ex.map((e) => e.T)),
        data: {
          phase: "ready",
          b: ex.length,
          c: 1,
          f: ex[0].F,
          t: crop,
          shape: ex.length + ",1," + ex[0].F + "," + crop,
          lit: ctx.state.lit,
          ragged: ragged ? "1" : "0",
          fits: fits ? "1" : "0",
          crop: crop
        }
      };
    },

    copy: {
      en: {
        tab: "The batch",
        k: "What every axis counts · section 02",
        h: "A model is handed a stack, not a recording",
        claim: "batch.shape = (B, 1, F, T)",
        concept: "A batch axis counts examples. It is the one axis with no physical meaning at " +
                 "all — nothing about the sound changes when an example moves from position 0 to " +
                 "position 2 — which is exactly why it has to be first, and separate.",
        b: "<p>Three recordings, each already a frequency-by-time matrix, stacked into one array. " +
           "They stack because they are the same length: the shape tag on every row reads " +
           "<code>(1, 513, 465)</code>, so the whole thing is <code>(3, 1, 513, 465)</code> and a " +
           "model can take it in one call.</p>" +
           "<p>Now drop a file of your own on the picker. It is almost certainly not 4.95 seconds " +
           "long, its row comes out short, and its tag turns red — four arrays of different shapes " +
           "are not a tensor. Pull the crop down to the shortest of them and the tag goes quiet " +
           "again. That is all a real data loader is doing when it crops.</p>",
        eqcap: "B counts examples, C counts channels, F counts frequency bins and T counts frames. " +
               "Point at any of them to see which extent of the picture it measures. C is 1 here " +
               "because these recordings are mono; a stereo file would make it 2.",
        predict: "Before you touch the crop: which of the four numbers changes when you drag it?",
        controls: {lit: "Which example", crop: "Crop every example to"},
        options: {lit: {voice: "voice", beat: "beat", tone: "440 Hz tone", file: "your file"}},
        names: {voice: "voice", beat: "beat", tone: "440 Hz tone", file: "your file"},
        mono: "C = 1, mono",
        loading: "Transforming all three recordings…",
        failed: "The other recordings could not be fetched, so there is nothing to stack.",
        readout: (B, F, crop, ragged, fits, shortest, ts) => {
          const head = "<span class=\"shape\">(" + B + ", 1, " + F + ", " + crop + ")</span>: " +
                       "<b>" + B + "</b> examples, one channel each, " + F + " frequency bins, " +
                       crop + " frames. ";
          if (!ragged) {
            return head + "All " + B + " are " + ts[0] + " frames long, so they stack with nothing " +
                   "thrown away and nothing padded.";
          }
          if (fits) {
            return head + "The examples are " + ts.join(", ") + " frames long — different lengths — " +
                   "but the crop is down to " + crop + ", which every one of them has, so they " +
                   "stack.";
          }
          return head + "<span class=\"fault\">These do not stack.</span> The examples are " +
                 ts.join(", ") + " frames long, and the crop is " + crop + ", which the shortest " +
                 "does not have. Crop to " + shortest + " or pad the short one; a loader has to do " +
                 "one or the other.";
        },
        aria: (ctx) => {
          const ex = examples(ctx);
          if (!ex.length) return ctx.copy.loading;
          return ex.length + " spectrograms stacked in a column, " +
                 ex.map((e) => (ctx.copy.names[e.name] || e.name) + " at " + e.T + " frames").join(", ") +
                 ", cropped to " + ctx.state.crop + " frames, making a " + ex.length + " by 1 by " +
                 ex[0].F + " by " + ctx.state.crop + " tensor.";
        }
      },
      es: {
        tab: "El lote",
        k: "Qué cuenta cada eje · sección 02",
        h: "A un modelo se le entrega una pila, no una grabación",
        claim: "batch.shape = (B, 1, F, T)",
        concept: "Un eje de lote cuenta ejemplos. Es el único eje sin ningún significado físico " +
                 "—nada del sonido cambia porque un ejemplo pase de la posición 0 a la 2—, y por " +
                 "eso mismo tiene que ir primero y aparte.",
        b: "<p>Tres grabaciones, cada una ya una matriz de frecuencia por tiempo, apiladas en un " +
           "solo arreglo. Se apilan porque miden lo mismo: la etiqueta de forma de cada fila dice " +
           "<code>(1, 513, 465)</code>, así que el conjunto es <code>(3, 1, 513, 465)</code> y un " +
           "modelo puede tomarlo de una vez.</p>" +
           "<p>Ahora suelta un archivo tuyo en el selector. Casi seguro no dura 4,95 segundos, su " +
           "fila sale corta y su etiqueta se pone roja: cuatro arreglos de formas distintas no son " +
           "un tensor. Baja el recorte hasta el más corto y la etiqueta se calma. Eso es todo lo " +
           "que hace un cargador de datos real cuando recorta.</p>",
        eqcap: "B cuenta ejemplos, C cuenta canales, F cuenta bins de frecuencia y T cuenta " +
               "tramas. Señala cualquiera para ver qué extensión de la imagen mide. Aquí C es 1 " +
               "porque estas grabaciones son mono; un archivo estéreo lo haría 2.",
        predict: "Antes de tocar el recorte: ¿cuál de los cuatro números cambia al arrastrarlo?",
        controls: {lit: "Qué ejemplo", crop: "Recortar cada ejemplo a"},
        options: {lit: {voice: "voz", beat: "ritmo", tone: "tono de 440 Hz", file: "tu archivo"}},
        names: {voice: "voz", beat: "ritmo", tone: "tono de 440 Hz", file: "tu archivo"},
        mono: "C = 1, mono",
        loading: "Transformando las tres grabaciones…",
        failed: "No se pudieron descargar las otras grabaciones, así que no hay nada que apilar.",
        readout: (B, F, crop, ragged, fits, shortest, ts) => {
          const head = "<span class=\"shape\">(" + B + ", 1, " + F + ", " + crop + ")</span>: " +
                       "<b>" + B + "</b> ejemplos, un canal cada uno, " + F + " bins de frecuencia, " +
                       crop + " tramas. ";
          if (!ragged) {
            return head + "Los " + B + " miden " + ts[0] + " tramas, así que se apilan sin tirar " +
                   "nada ni rellenar nada.";
          }
          if (fits) {
            return head + "Los ejemplos miden " + ts.join(", ") + " tramas —longitudes distintas—, " +
                   "pero el recorte ha bajado a " + crop + ", que todos tienen, así que se apilan.";
          }
          return head + "<span class=\"fault\">Estos no se apilan.</span> Los ejemplos miden " +
                 ts.join(", ") + " tramas, y el recorte es " + crop + ", que el más corto no " +
                 "alcanza. Recorta a " + shortest + " o rellena el corto; un cargador tiene que " +
                 "hacer una de las dos cosas.";
        },
        aria: (ctx) => {
          const ex = examples(ctx);
          if (!ex.length) return ctx.copy.loading;
          return ex.length + " espectrogramas apilados en columna, " +
                 ex.map((e) => (ctx.copy.names[e.name] || e.name) + " con " + e.T + " tramas").join(", ") +
                 ", recortados a " + ctx.state.crop + " tramas, formando un tensor de " + ex.length +
                 " por 1 por " + ex[0].F + " por " + ctx.state.crop + ".";
        }
      }
    }
  });

  // A bracket for one axis of the equation, lit when the reader points at that
  // letter in the section above. Vertical or horizontal, same idea.
  function axis(ctx, g, K, token, lit, box, text, vertical, lab) {
    const on = lit === token;
    const col = on ? ctx.colour("--v-comp") : ctx.colour("--stage-mute");
    g.strokeStyle = col;
    g.lineWidth = on ? 2.5 : 1;
    g.beginPath();
    if (vertical) {
      g.moveTo(box.x + 5, box.y0); g.lineTo(box.x, box.y0);
      g.lineTo(box.x, box.y1); g.lineTo(box.x + 5, box.y1);
    } else {
      g.moveTo(box.x0, box.y - 5); g.lineTo(box.x0, box.y);
      g.lineTo(box.x1, box.y); g.lineTo(box.x1, box.y - 5);
    }
    g.stroke();
    if (!on) return;
    if (lab) K.label(g, text, lab.x, lab.y, col, {size: 11, right: !!lab.right});
    else if (vertical) K.label(g, text, box.x - 2, (box.y0 + box.y1) / 2, col, {size: 11, right: true});
    else K.label(g, text, (box.x0 + box.x1) / 2, box.y + 4, col, {size: 11});
  }
})();
