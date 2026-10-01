// Scene 7: the fold is a tensor too. The whole protein the gene encodes --
// Cas12a, 1,300 residues, as AlphaFold predicts it -- drawn as one point per
// residue, with the 60 residues this page's 180 bases spell lit up in it.
// A structure is the plainest tensor on the page: (N, 3). Under it is the
// grid a structure predictor actually reasons about, every distance between
// one of our 60 and one of the 1,300, which is one broadcast:
// X[:, None, :] - Y[None, :, :]. The band at the grid's left edge is each
// residue's own neighbours along the chain; everything lit to the right of
// it is the fold -- residues a thousand positions apart, side by side.
// Drawn in three.js with an SVG twin; the grid is the frame's inset (hud),
// one drawing for both surfaces. The coordinates are the generated literal
// in genome-fold.js. See genome-scenes/README.md for the contract and the
// ledger.
(function () {
  "use strict";
  const GC = window.GenomeCore, K = window.GenomeKit, F = window.GenomeFold;

  const OURS = 60;             // the residues the stage's 180 bases spell
  const SCALE = 0.06;          // world units per angstrom: the protein is ~7 across
  const FAR = 100;             // "far down the chain", for the count the readout quotes
  const R = {rest: 0.022, ours: 0.055, bead: 0.11, near: 0.09, link: 0.014};
  const DIM = 0.5, NORM = 0.9, LIT = 1.7;
  const ENTRANCE = 2200;       // ms for the chain to draw itself, start to end
  const MAX_NEAR = 96;         // more than any residue has within the widest cutoff

  // Everything that does not depend on a control, once: the points, the
  // grid of distances, the world positions and the frame.
  function model(ctx) {
    if (ctx.cache.model) return ctx.cache.model;
    const Y = GC.points(F.ca), X = Y.slice(0, OURS);
    const D = GC.pairDistances(X, Y);
    const centre = [0, 1, 2].map((k) => GC.mean(Y.map((p) => p[k])));
    const W = Y.map((p) => [(p[0] - centre[0]) * SCALE, (p[1] - centre[1]) * SCALE, (p[2] - centre[2]) * SCALE]);
    // The frame fits a camera to the corners of a box. A protein is nearer
    // a ball than a box, so the box handed over is the cube whose corners
    // lie on the ball that holds every residue: it frames the molecule as
    // large as it can be while it turns, where the residues' own bounding
    // box would leave a third of the stage empty.
    const reach = Math.max(...W.map((p) => Math.hypot(p[0], p[1], p[2]))) + 0.2;
    // ...less a little: one residue in twenty lies in the outer eighth of
    // that ball, loops that can brush the frame's edge as the molecule turns,
    // and framing to them would shrink everything else.
    const h = reach * 0.88 / Math.sqrt(3);
    const bond = GC.mean(GC.bondLengths(Y));
    return (ctx.cache.model = {Y, X, D, W, reach, bounds: {min: [-h, -h, -h], max: [h, h, h]}, bond, summary: {}});
  }

  // What the controls say, from the core: the residues close to the picked
  // one, its farthest partner along the chain, and the grid's own tally.
  function facts(ctx) {
    const s = ctx.state, m = model(ctx);
    const near = GC.closeTo(m.D, s.pick, s.cutoff);
    const far = GC.farthestPartner(m.D, s.pick, s.cutoff);
    const sum = m.summary[s.cutoff] || (m.summary[s.cutoff] = GC.foldSummary(m.D, s.cutoff, FAR));
    return {near, far, sum, letter: F.seq[s.pick], plddt: F.plddt[s.pick], bond: m.bond};
  }

  // The dynamic half of the picture: our 60 beads, the picked residue's
  // close ones and the lines to them, and the labels.
  function compose(ctx) {
    const s = ctx.state, c = ctx.copy, m = model(ctx), f = facts(ctx), hl = ctx.hl;
    const hov = ctx.hover && /^(res|row):/.test(ctx.hover) ? Number(ctx.hover.split(":")[1]) : -1;
    const drawn = Math.round(K.arrival(ctx, ENTRANCE) * (F.seq.length - 1));
    const settled = drawn >= F.seq.length - 1;
    const beads = [], links = [];
    for (let i = 0; i < OURS; i++) {
      if (i > drawn) break;
      const pick = i === s.pick;
      beads.push({
        c: m.W[i], r: R.bead * (pick ? 1.7 : (i === hov ? 1.35 : 1)),
        token: K.residueTint(GC.aaIndex(F.seq[i])),
        k: pick ? LIT : (hl === "aa" ? DIM : NORM), alpha: 1, pick: "res:" + i
      });
    }
    if (settled) {
      for (const j of f.near) {
        if (j >= OURS) beads.push({c: m.W[j], r: R.near, token: "--gn-hit", k: 1.1, alpha: 1});
        links.push({a: m.W[s.pick], b: m.W[j], r: R.link, token: "--gn-hit", k: 1.1, alpha: 0.95});
      }
    }
    const at = m.W[s.pick];
    const labels = [];
    if (settled) {
      labels.push({
        text: hl === "prop" ? c.xyz(m.Y[s.pick], ctx.lang) : c.bead(s.pick + 1, f.letter),
        pos: [at[0], at[1] + 0.34, at[2]], cls: "aa", lit: true, size: 13
      });
      if (f.far && f.far.apart > 4) {
        const p = m.W[f.far.j];
        labels.push({text: c.partner(K.num(f.far.j + 1, 0, ctx.lang)), pos: [p[0], p[1] - 0.3, p[2]], cls: "hit", lit: true});
      }
      labels.push({text: c.end, pos: m.W[F.seq.length - 1], cls: "mute"});
    }
    return {beads, links, labels, drawn, m};
  }

  // The backbone as segments: thin and grey for the 1,240 residues the page
  // does not follow, thick and lavender for the 60 it does.
  function backbone(ctx, drawn) {
    const m = model(ctx), hl = ctx.hl, out = [];
    for (let j = 0; j < Math.min(drawn, F.seq.length - 1); j++) {
      const ours = j < OURS - 1;
      out.push({
        a: m.W[j], b: m.W[j + 1], r: ours ? R.ours : R.rest,
        token: ours ? "--gn-aa" : "--stage-mute",
        k: ours ? (hl === "aa" ? DIM : NORM) : (hl === "aa" ? 1.3 : 0.8),
        alpha: ours ? 1 : (hl === "aa" ? 0.95 : 0.7)
      });
    }
    return out;
  }

  const EN = {
    tab: "fold",
    k: "Section 03 · the fold",
    h: "A fold is a (1300, 3) array, and 78,000 of its distances are one broadcast",
    predict: "Before you pick a residue: neighbours along the chain sit about 3.8 Å apart (an " +
             "ångström is a tenth of a nanometre). Take the residues lying within 8 Å of one of " +
             "these 60. Is the farthest of them tens of positions down the chain, hundreds, or " +
             "more than a thousand?",
    concept: "A structure is the plainest tensor on this page: one row per residue, three " +
             "coordinates. Subtract every row of one array from every row of another by " +
             "broadcasting, and the grid of all their distances falls out without a loop.",
    b: "This is Cas12a, the protein the whole gene encodes, as AlphaFold predicts it: 1,300 " +
       "residues, one point each, the alpha-carbon at each residue's centre. The bright " +
       "stretch is the 60 that our 180 bases spell. The strip under it is every distance " +
       "between one of those 60 and one of the 1,300, lit where two residues are close. The " +
       "band at its left edge is each residue's own neighbours along the chain; <b>lit cells " +
       "beyond it are residues the chain has folded back to touch</b>. Pick a residue or " +
       "sweep the strip. It is a prediction, not a measurement, and the model " +
       "reports how sure it is of every residue.",
    eqcap: "X holds our 60 residues and Y all 1,300, three coordinates each. Only the " +
           "coordinate d is summed away; i and j both survive, one distance for every pair.",
    claim: (n, letter, near, cutoff, apart) =>
      "residue " + n + " (" + letter + "): " + near + " within " + cutoff + " Å, farthest " + apart + " away",
    bead: (n, letter) => "residue " + n + " · " + letter,
    partner: (n) => "residue " + n,
    xyz: (p, lang) => "[" + p.map((v) => K.num(v, 1, lang)).join(lang === "es" ? "; " : ", ") + "] Å",
    end: "residue 1,300",
    strip: (cutoff, rows) => "D < " + cutoff + " Å, lit · one row for each of our " + rows,
    axis: (n) => "one column a residue, 1 to " + n + " →",
    caption: (model, plddt) => "AlphaFold " + model + " · confidence here (pLDDT) " + plddt + " of 100",
    read: (n, letter, near, cutoff, far, apart, d, pairs, total, rows, bond, gi, gj, ga) =>
      "<b>Residue " + n + "</b> (" + letter + ") has <b>" + near + " residues</b> within " + cutoff + " Å. " +
      (far
        ? "The farthest along the chain is residue " + far + ": <b>" + apart + " positions away</b>, " + d + " Å apart. "
        : "None of them is more than " + apart + " positions away: here the chain touches only itself. ") +
      (ga ? "The farthest reach of all is residue " + gi + " to residue " + gj + ", " + ga +
            " positions apart. " : "") +
      "Over all 60 rows, " + pairs + " of the " + total + " distances are under " + cutoff + " Å, and " +
      rows + " rows reach more than 100 positions down the chain. Neighbours along it are about " +
      bond + " Å apart.",
    tip: (n, letter, plddt) => "residue " + n + " · " + letter + " · pLDDT " + plddt,
    aria: (ctx) => {
      const s = ctx.state, f = facts(ctx);
      return "The predicted structure of Cas12a, 1,300 residues as one chain of points, with the " +
             "first 60 lit. Residue " + (s.pick + 1) + " is picked; " + f.near.length +
             " residues lie within " + s.cutoff + " angstroms of it. Below, a 60 by 1,300 grid of " +
             "distances with the close pairs lit.";
    },
    controls: {pick: "Which residue", cutoff: "Close means under", play: "▶ Walk the chain"},
    options: {},
    np: {
      y: "(1300, 3): one point a residue",
      x: "(60, 3): the 60 we follow",
      diff: "(60, 1300, 3): no loop",
      d: "(60, 1300): every distance",
      pairs: (n, cutoff) => n + " cells < " + cutoff + " Å, self excluded",
      cell: (d, apart) => d + " Å, " + apart + " apart in the chain"
    }
  };

  const ES = {
    tab: "pliegue",
    k: "Sección 03 · el pliegue",
    h: "Un pliegue es un arreglo (1300, 3), y 78.000 de sus distancias son un solo broadcast",
    predict: "Antes de elegir un residuo: los vecinos a lo largo de la cadena están a unos 3,8 Å " +
             "(un ångström es una décima de nanómetro). Toma los residuos que quedan a menos de " +
             "8 Å de alguno de estos 60. ¿El más lejano está a decenas de posiciones en la " +
             "cadena, a cientos, o a más de mil?",
    concept: "Una estructura es el tensor más sencillo de esta página: una fila por residuo, " +
             "tres coordenadas. Resta cada fila de un arreglo de cada fila de otro mediante " +
             "broadcasting y la rejilla de todas sus distancias sale sin un solo bucle.",
    b: "Esta es Cas12a, la proteína que codifica el gen entero, tal como la predice AlphaFold: " +
       "1.300 residuos, un punto cada uno, el carbono alfa en el centro de cada residuo. El " +
       "tramo brillante son los 60 que deletrean nuestras 180 bases. La franja de abajo es " +
       "cada distancia entre uno de esos 60 y uno de los 1.300, iluminada donde dos residuos " +
       "están cerca. La banda de su borde izquierdo son los vecinos de cada residuo a lo largo " +
       "de la cadena; <b>las celdas iluminadas más allá son residuos con los que la cadena se " +
       "ha plegado para tocarse</b>. Elige un residuo o recorre la franja. Es " +
       "una predicción, no una medición, y el modelo dice cuánto confía en cada residuo.",
    eqcap: "X contiene nuestros 60 residuos e Y los 1.300, con tres coordenadas cada uno. Solo " +
           "la coordenada d se suma; i y j sobreviven, una distancia por cada par.",
    claim: (n, letter, near, cutoff, apart) =>
      "residuo " + n + " (" + letter + "): " + near + " a < " + cutoff + " Å, el más lejano a " + apart,
    bead: (n, letter) => "residuo " + n + " · " + letter,
    partner: (n) => "residuo " + n,
    xyz: (p, lang) => "[" + p.map((v) => K.num(v, 1, lang)).join(lang === "es" ? "; " : ", ") + "] Å",
    end: "residuo 1.300",
    strip: (cutoff, rows) => "D < " + cutoff + " Å, iluminado · una fila por cada uno de los " + rows,
    axis: (n) => "una columna por residuo, del 1 al " + n + " →",
    caption: (model, plddt) => "AlphaFold " + model + " · confianza aquí (pLDDT) " + plddt + " de 100",
    read: (n, letter, near, cutoff, far, apart, d, pairs, total, rows, bond, gi, gj, ga) =>
      "<b>El residuo " + n + "</b> (" + letter + ") tiene <b>" + near + " residuos</b> a menos de " + cutoff + " Å. " +
      (far
        ? "El más lejano en la cadena es el residuo " + far + ": <b>a " + apart + " posiciones</b> y a " + d + " Å. "
        : "Ninguno está a más de " + apart + " posiciones: aquí la cadena solo se toca a sí misma. ") +
      (ga ? "El alcance más lejano de todos va del residuo " + gi + " al residuo " + gj + ", a " + ga +
            " posiciones. " : "") +
      "En las 60 filas, " + pairs + " de las " + total + " distancias quedan por debajo de " + cutoff + " Å, y " +
      rows + " filas alcanzan más de 100 posiciones cadena abajo. Los vecinos a lo largo de ella están " +
      "a unos " + bond + " Å.",
    tip: (n, letter, plddt) => "residuo " + n + " · " + letter + " · pLDDT " + plddt,
    aria: (ctx) => {
      const s = ctx.state, f = facts(ctx);
      return "La estructura predicha de Cas12a, 1.300 residuos como una cadena de puntos, con los " +
             "primeros 60 iluminados. El residuo " + (s.pick + 1) + " está seleccionado; " + f.near.length +
             " residuos quedan a menos de " + s.cutoff + " angstroms de él. Debajo, una rejilla de 60 " +
             "por 1.300 distancias con los pares cercanos iluminados.";
    },
    controls: {pick: "Qué residuo", cutoff: "Cerca significa menos de", play: "▶ Recorrer la cadena"},
    options: {},
    np: {
      y: "(1300, 3): un punto por residuo",
      x: "(60, 3): los 60 que seguimos",
      diff: "(60, 1300, 3): sin bucle",
      d: "(60, 1300): cada distancia",
      pairs: (n, cutoff) => n + " celdas < " + cutoff + " Å, sin la propia",
      cell: (d, apart) => d + " Å, a " + apart + " en la cadena"
    }
  };

  window.GenomeScenes.register({
    id: "fold", section: "03", gl: true,
    part: {en: "The fold is a tensor too", es: "El pliegue también es un tensor"},
    hl: ["codon", "aa", "prop"],
    copy: {en: EN, es: ES},

    // The whole molecule turns freely; the grid of distances keeps the bottom
    // of the stage, and the camera frames the protein in what is left.
    pose: {fov: 30, home: {az: -0.58, el: 0.16}, margin: 1.02, inset: {bottom: 0.33},
           limits: {azMin: -3.1, azMax: 3.1, elMin: -1.1, elMax: 1.1, dollyMin: 0.3, dollyMax: 1.6}},

    controls: [
      {id: "pick", type: "range", min: 0, max: OURS - 1, step: 1, fmt: (v) => (v + 1) + " · " + F.seq[v]},
      {id: "cutoff", type: "range", min: 5, max: 12, step: 1, fmt: (v) => v + " Å"},
      {id: "play", type: "play", target: "pick", rate: 6}
    ],

    init(ctx) {
      ctx.state.pick = 9;
      ctx.state.cutoff = 8;
    },

    arrive(ctx) { ctx.cache.arrive = ctx.now(); },
    animates(ctx) { return K.arrival(ctx, ENTRANCE) < 1; },
    bounds(ctx) { return model(ctx).bounds; },

    pick(ctx, key) {
      if (/^(res|row):/.test(key)) ctx.setControls({pick: Number(key.split(":")[1])});
    },
    tip(ctx, key) {
      if (!/^(res|row):/.test(key)) return "";
      const i = Number(key.split(":")[1]);
      return ctx.copy.tip(i + 1, F.seq[i], Math.round(F.plddt[i]));
    },
    // The ribbon: three bases a residue.
    seek(ctx, i) { ctx.setControls({pick: Math.min(OURS - 1, Math.floor(i / 3))}); },

    build(ctx) {
      const THREE = ctx.THREE;
      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(K.colour("--stage"), 1, 100);
      K.light(scene);
      const chain = K.segments(F.seq.length - 1);
      const sph = K.spheres(OURS + MAX_NEAR, 0.14);
      const link = K.segments(MAX_NEAR);
      scene.add(chain.mesh, sph.mesh, sph.hit, link.mesh);
      const keys = [];
      return {
        scene, chain, sph, link, keys, sig: "", labels: K.labelPool(scene), col: K.palette(),
        cam: new THREE.PerspectiveCamera(this.pose.fov, ctx.aspect, 0.1, 500),
        pick: [{mesh: sph.hit, key: (id) => keys[id] || null}]
      };
    },

    render(ctx, gl) {
      const p = compose(ctx);
      // 1,300 residues in one tangle read as depth only if the far ones
      // fade. The fog is the stage's own black, from just in front of the
      // molecule to well behind it, wherever the camera has been dollied to.
      const eye = gl.cam.position.length();
      gl.scene.fog.near = Math.max(0.1, eye - p.m.reach * 0.9);
      gl.scene.fog.far = eye + p.m.reach * 2.4;
      // The backbone is 1,299 segments that never move: placed when the
      // highlight changes, and otherwise only counted in as it draws.
      const sig = String(ctx.hl);
      if (gl.sig !== sig) {
        gl.sig = sig;
        backbone(ctx, F.seq.length).forEach((g, n) => gl.chain.set(n, g.a, g.b, g.r, gl.col(g.token, g.k)));
        gl.chain.commit();
      }
      gl.chain.count(p.drawn);
      gl.keys.length = 0;
      p.beads.forEach((b, n) => {
        gl.sph.set(n, b.c, b.r, gl.col(b.token, b.k));
        gl.keys[n] = b.pick || null;
      });
      gl.sph.count(p.beads.length);
      gl.sph.commit();
      p.links.forEach((g, n) => gl.link.set(n, g.a, g.b, g.r, gl.col(g.token, g.k)));
      gl.link.count(p.links.length);
      gl.link.commit();
      gl.labels.sync(p.labels);
    },

    // The twin: the same points through the same orbit, fitted to the part
    // of the board the grid leaves free.
    draw(ctx) {
      const p = compose(ctx);
      // Fitted to the residues themselves, not to the frame's box.
      const P = ctx.projector(p.m.W, ctx.box());
      const B = ctx.basis();
      K.segments2(ctx.svg, backbone(ctx, p.drawn), B, P, {floor: 0.7});
      K.segments2(ctx.svg, p.links, B, P);
      K.spheres2(ctx.svg, p.beads, B, P);
      K.labels2(ctx.svg, p.labels, P);
    },

    // The inset: the (60, 1300) grid of distances, lit where D is under the
    // cutoff. Lavender is a residue's own neighbours along the chain; teal
    // is the fold.
    hud(ctx, svg) {
      const s = ctx.state, c = ctx.copy, m = model(ctx), f = facts(ctx), lit = ctx.hl;
      const board = ctx.board(), n = F.seq.length;
      // The strip stops short of the stage's bottom edge: the caption and, on
      // a browser without WebGL, the note about it live there.
      const x0 = 30, x1 = board.w - 30, y1 = board.h - 62, rowH = 1.35;
      const y0 = y1 - OURS * rowH, cw = (x1 - x0) / n;
      const hov = ctx.hover && /^(res|row):/.test(ctx.hover) ? Number(ctx.hover.split(":")[1]) : -1;
      svg.appendChild(K.el("rect", {
        x: x0 - 8, y: y0 - 26, width: x1 - x0 + 16, height: y1 - y0 + 34, rx: 6,
        fill: K.css("--stage-chip"), "fill-opacity": 0.86
      }));
      K.text(svg, x0, y0 - 9, c.strip(s.cutoff, OURS),
        {size: 12, colour: lit === "codon" || lit === "aa" ? "--stage-ink" : "--stage-mute"});
      svg.appendChild(K.el("rect", {
        x: x0, y: y0, width: x1 - x0, height: y1 - y0, fill: "none",
        stroke: K.css("--stage-mute"), "stroke-width": 0.8, "stroke-opacity": 0.7
      }));
      const band = (i, token, opacity) => svg.appendChild(K.el("rect", {
        x: x0, y: (y0 + i * rowH - 0.6).toFixed(2), width: x1 - x0, height: rowH + 1.2,
        fill: K.css(token), "fill-opacity": opacity
      }));
      if (hov >= 0 && hov !== s.pick) band(hov, "--stage-ink", 0.14);
      band(s.pick, "--stage-ink", 0.26);
      // The lit cells depend on the cutoff and the board, not on the pointer:
      // up to 1,700 rects, so they are built once for each and re-attached,
      // or a pointer run down the strip would rebuild the grid sixty times.
      const near = K.css("--gn-aa"), fold = K.css("--gn-hit");
      const sig = s.cutoff + "|" + board.h;
      let cells = ctx.cache.cells;
      if (!cells || cells.sig !== sig) {
        const g = K.el("g", {});
        for (let i = 0; i < OURS; i++) {
          const row = m.D[i];
          for (let j = 0; j < n; j++) {
            if (j === i || row[j] >= s.cutoff) continue;
            const local = Math.abs(j - i) <= 4;
            const w = local ? Math.max(cw, 1.1) : 2.4;
            g.appendChild(K.el("rect", {
              x: (x0 + (j + 0.5) * cw - w / 2).toFixed(2), y: (y0 + i * rowH).toFixed(2),
              width: w, height: rowH + 0.15, fill: local ? near : fold
            }));
          }
        }
        cells = ctx.cache.cells = {sig, g};
      }
      svg.appendChild(cells.g);
      if (f.far && f.far.apart > 4) {
        svg.appendChild(K.el("circle", {
          cx: (x0 + (f.far.j + 0.5) * cw).toFixed(2), cy: (y0 + (s.pick + 0.5) * rowH).toFixed(2), r: 6,
          fill: "none", stroke: fold, "stroke-width": 1.6
        }));
      }
      K.text(svg, x1, y0 - 9, c.axis(K.num(n, 0, ctx.lang)), {size: 12, anchor: "end", colour: "--stage-mute"});
      // One row to point at per residue: thin, but a pointer run down the
      // strip scrubs through them.
      for (let i = 0; i < OURS; i++) {
        svg.appendChild(K.el("rect", {
          x: x0, y: (y0 + i * rowH).toFixed(2), width: x1 - x0, height: rowH,
          fill: "transparent", "data-pick": "row:" + i
        }));
      }
    },

    readout(ctx) {
      const s = ctx.state, c = ctx.copy, f = facts(ctx), lang = ctx.lang;
      const far = f.far || {j: s.pick, apart: 0, d: 0};
      const num = (v) => K.num(v, 0, lang);
      return {
        html: c.read(s.pick + 1, f.letter, f.near.length, s.cutoff, far.apart > 4 ? num(far.j + 1) : "", num(far.apart),
          K.num(far.d, 1, lang), num(f.sum.pairs), num(OURS * F.seq.length), f.sum.rows, K.num(f.bond, 1, lang),
          ...(f.sum.farthest ? [f.sum.farthest.i + 1, f.sum.farthest.j + 1, f.sum.farthest.apart].map(num) : [])),
        claim: c.claim(s.pick + 1, f.letter, f.near.length, s.cutoff, num(far.apart)),
        caption: c.caption(F.model, Math.round(f.plddt)),
        lens: {a: 3 * s.pick, b: 3 * s.pick + 3},
        data: {
          pick: String(s.pick), aa: f.letter, cutoff: String(s.cutoff), near: String(f.near.length),
          far: String(far.j + 1), apart: String(far.apart), fardist: far.d.toFixed(1),
          pairs: String(f.sum.pairs), rows: String(f.sum.rows), reach: String(f.sum.farthest.apart),
          shape: OURS + "," + F.seq.length, residues: String(F.seq.length),
          bond: f.bond.toFixed(2), plddt: String(Math.round(f.plddt))
        }
      };
    },

    code(ctx) {
      const s = ctx.state, np = ctx.copy.np, f = facts(ctx), lang = ctx.lang;
      const far = f.far || {j: s.pick, apart: 0, d: 0};
      return K.code([
        ["Y = fold.reshape(1300, 3)", np.y],
        ["X = Y[:60]", np.x],
        ["diff = X[:, None, :] - Y[None, :, :]", np.diff],
        ["D = np.sqrt((diff ** 2).sum(-1))", np.d],
        ["(D < " + s.cutoff + ").sum() - 60", np.pairs(f.sum.pairs, s.cutoff)],
        ["D[" + s.pick + ", " + far.j + "]", np.cell(K.num(far.d, 1, lang), far.apart)]
      ]);
    }
  });
})();
