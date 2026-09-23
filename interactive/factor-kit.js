// The Tucker & CP stage's drawing kit and its scene registry. Everything here
// turns numbers factor-core.js computed into pictures on one stage; nothing
// here computes a number a readout quotes. That split is the same one
// linalg-kit.js keeps against linalg-core.js, for the same reason: the
// arithmetic is the lesson and `npm test` pins it, while the drawing is what
// the browser check and a screenshot catch.
//
// Two surfaces. Four scenes draw in three.js -- a cube of voxels, the cube
// laying itself flat, the Tucker core with its three factor plates, a rank-1
// term filling the cube -- because depth is what those pictures are of. Each
// of them also draws an SVG twin from the same numbers, projected through the
// same orbit, which is what the hero embed, a reader without WebGL and the
// browser check's layout measurement all see. The other four scenes are SVG
// only: a scree, term cards, an error curve and a scatter are flat pictures.
// Every label, on either surface, is real text on an opaque chip, so axe can
// measure it.
//
// A plain script, not a module, so the page works from file://. The pure
// helpers (the unfold morph, the projection) are exported through
// module.exports as well, and tests/factor_scenes.test.cjs pins them.
(function (root) {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const LC = root.LinalgCore ||
    (typeof require !== "undefined" ? require("./linalg-core.js") : null);
  const FC = root.FactorCore ||
    (typeof require !== "undefined" ? require("./factor-core.js") : null);

  // ------------------------------------------------------------- registry
  // One file per scene, loaded in order by plain <script src> lines. The
  // page reads the registry back in that order, so a new scene is: one file
  // here, one <script src> line, one <section class="step"> in the page, and
  // one repo.widgets line.
  const scenes = [];
  const REQUIRED = ["id", "section", "copy", "init", "draw", "readout", "code"];
  // A three.js scene draws its twin in draw() and its picture in render();
  // pose is how the frame's orbit camera frames it.
  const GL_REQUIRED = ["pose", "build", "render", "bounds"];

  const FactorScenes = {
    register(scene) {
      for (const k of REQUIRED) {
        if (!(k in scene)) throw new Error("scene " + (scene.id || "?") + " lacks " + k);
      }
      if (scene.gl) {
        for (const k of GL_REQUIRED) {
          if (!(k in scene)) throw new Error("scene " + scene.id + " is gl but lacks " + k);
        }
      }
      for (const lang of ["en", "es"]) {
        if (!scene.copy[lang]) throw new Error("scene " + scene.id + " lacks " + lang + " copy");
        if (!scene.copy[lang].aria) throw new Error("scene " + scene.id + " lacks " + lang + " aria");
      }
      scenes.push(scene);
    },
    list() { return scenes.slice(); }
  };

  // --------------------------------------------------------------- colour
  const css = (name) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // The three axes, in one order everywhere on the stage: pickup, dropoff,
  // hour. A fibre, a factor plate, a bar row and a pointed-at letter in an
  // equation all take their axis's colour from here.
  const AXIS = ["--fa-m0", "--fa-m1", "--fa-m2"];
  const AXIS_CLS = ["m0", "m1", "m2"];
  const HL_AXIS = {pickup: 0, dropoff: 1, hour: 2};
  const HL_NAME = ["pickup", "dropoff", "hour"];

  // --------------------------------------------------------------- numbers
  // Fixed digits, a real minus, and "-0.000" never shown -- a bracket that
  // reads "-0.000" beside one that reads "0.000" claims a difference the
  // arithmetic does not have.
  function fmt(v, digits) {
    const d = digits === undefined ? 2 : digits;
    if (!isFinite(v)) return Number.isNaN(v) ? "NaN" : (v > 0 ? "∞" : "−∞");
    let s = Math.abs(v).toFixed(d);
    if (Number(s) === 0) return s;
    return (v < 0 ? "−" : "") + s;
  }

  // Superscript and subscript digits, for a shape written as ℝ²⁴ˣ²⁰ and a
  // mode written as T₍₂₎. The unfold scene's claim once printed ℝ24ˣ20,
  // because only the × had been raised.
  const SUP = {0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹"};
  const SUBS = {0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉"};
  const sup = (s) => String(s).replace(/[0-9]/g, (d) => SUP[d]).replace(/x/g, "ˣ");
  const sub = (s) => String(s).replace(/[0-9]/g, (d) => SUBS[d]);
  const shapeSup = (dims) => dims.map((d) => sup(d)).join("ˣ");
  const mode = (m) => "₍" + sub(m) + "₎";

  // The NumPy under a picture, one row per line: a bare string, or a
  // [code, comment] pair. The code is the same in both languages --
  // identifiers are English everywhere in this repo -- and only the comments
  // come from the scene's `np` copy. The hashes are aligned after the numbers
  // are interpolated, so a slider moving 3 to 20 moves the column with it.
  function code(rows) {
    let width = 0;
    for (const r of rows) {
      if (Array.isArray(r) && r[1]) width = Math.max(width, r[0].length);
    }
    return rows.map((r) => {
      if (!Array.isArray(r)) return r;
      if (!r[1]) return r[0];
      return r[0] + " ".repeat(width - r[0].length + 2) + "# " + r[1];
    });
  }

  // A number for prose, in the page's language: a thousands separator on the
  // integer part only (1,096.8 / 1.096,8), never inside an index bracket --
  // that is idx()'s job, and it has none.
  function num(v, digits, lang) {
    const neg = v < 0;
    const [int, frac] = Math.abs(v).toFixed(digits === undefined ? 0 : digits).split(".");
    const sep = lang === "es" ? "." : ",", dec = lang === "es" ? "," : ".";
    const grouped = int.replace(/\B(?=(\d{3})+$)/g, sep);
    return (neg ? "−" : "") + grouped + (frac ? dec + frac : "");
  }
  const pct = (x, digits, lang) => num(x * 100, digits === undefined ? 1 : digits, lang);

  // A tensor slice as NumPy would print a list: "[2, 2, 18]", no thousands
  // separator ever -- "T[1,234]" reads as a two-index address.
  const idx = (a) => "[" + a.join(", ") + "]";

  // ------------------------------------------------------------------- svg
  function el(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // A label on an opaque chip, the same affordance every other stage's
  // canvas labels use -- axe cannot resolve contrast against a picture
  // behind translucent text, and reports "incomplete" instead of pass or
  // fail, so every label here sits on a solid rect measured against it.
  function label(parent, x, y, text, opts) {
    const o = opts || {};
    const size = o.size || 12;
    const pad = o.pad === undefined ? 3 : o.pad;
    const g = el("g", {});
    const t = el("text", {
      x: x, y: y, "font-size": size, "font-family": "var(--mono)",
      "font-weight": o.weight || 600, fill: css(o.colour || "--stage-ink"),
      "text-anchor": o.anchor || "start", "dominant-baseline": o.baseline || "auto"
    }, text);
    const box = {w: text.length * size * 0.62 + pad * 2, h: size + pad * 1.4};
    const ax = o.anchor === "middle" ? x - box.w / 2 : o.anchor === "end" ? x - box.w + pad : x - pad;
    const ay = (o.baseline === "middle" ? y - box.h / 2 : y - size) - pad * 0.2;
    const rect = el("rect", {
      x: ax, y: ay, width: box.w, height: box.h, rx: 3,
      fill: css("--stage-chip")
    });
    if (o.stroke) {
      rect.setAttribute("stroke", css(o.stroke));
      rect.setAttribute("stroke-width", 1.2);
    }
    g.appendChild(rect);
    g.appendChild(t);
    if (o.pick) g.setAttribute("data-pick", o.pick);
    parent.appendChild(g);
    return g;
  }

  // A grid of numbers -- a matrix, a slice, an unfolding -- with the two
  // bracket strokes real strokes rather than glyphs, so it scales cleanly.
  // `opts.at(i, j)` -> the cell's colour token or null; `opts.digits`
  // defaults to 0 (every count on this stage is an integer). Returns
  // {x0, y0, x1, y1, cellW, cellH} so a caller can address a cell later.
  //
  // A grid a slider can grow is given a box, `opts.maxW` and `opts.maxH`,
  // and the cell shrinks to fit it: SVG neither clips a child laid out past
  // the viewBox nor reports one, it just never paints it. Below the size at
  // which a number is still a number the grid stops printing them and shades
  // each cell by |value| instead (`heat` in the return says which).
  const TEXT_FLOOR = 6.5;
  function numGrid(parent, M, opts) {
    const o = opts || {};
    const rows = M.length, cols = M[0].length;
    const digits = o.digits === undefined ? 0 : o.digits;
    let cellW = o.cellW || (28 + digits * 7);
    let cellH = o.cellH || 20;
    if (o.maxW) cellW = Math.min(cellW, o.maxW / cols);
    if (o.maxH) cellH = Math.min(cellH, o.maxH / rows);
    let wide = 1;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) wide = Math.max(wide, fmt(M[i][j], digits).length);
    }
    const fontSize = Math.min(11.5, cellH * 0.72, (cellW - 4) / (0.62 * wide));
    const heat = fontSize < TEXT_FLOOR;
    let peak = 0;
    if (heat) {
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) peak = Math.max(peak, Math.abs(M[i][j]));
      }
    }
    const x0 = o.x || 0, y0 = o.y || 0;
    const g = el("g", {});
    g.appendChild(el("path", {
      d: `M ${x0 + 6} ${y0} L ${x0} ${y0} L ${x0} ${y0 + rows * cellH} L ${x0 + 6} ${y0 + rows * cellH}`,
      fill: "none", stroke: css("--stage-mute"), "stroke-width": 1.4
    }));
    const xEnd = x0 + cols * cellW;
    g.appendChild(el("path", {
      d: `M ${xEnd - 6} ${y0} L ${xEnd} ${y0} L ${xEnd} ${y0 + rows * cellH} L ${xEnd - 6} ${y0 + rows * cellH}`,
      fill: "none", stroke: css("--stage-mute"), "stroke-width": 1.4
    }));
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const cx = x0 + j * cellW + cellW / 2, cy = y0 + i * cellH + cellH / 2;
        const tok = o.at ? o.at(i, j) : null;
        if (heat) {
          g.appendChild(el("rect", {
            x: x0 + j * cellW, y: y0 + i * cellH,
            width: Math.max(cellW - 0.6, 0.6), height: Math.max(cellH - 0.6, 0.6),
            fill: css(tok || o.heatToken || "--fa-core"),
            "fill-opacity": peak ? 0.12 + 0.78 * Math.pow(Math.abs(M[i][j]) / peak, 0.4) : 0.12
          }));
          continue;
        }
        if (tok) {
          g.appendChild(el("rect", {
            x: x0 + j * cellW + 1, y: y0 + i * cellH + 1, width: cellW - 2, height: cellH - 2,
            fill: css(tok), "fill-opacity": 0.28, rx: 2
          }));
        }
        g.appendChild(el("text", {
          x: cx, y: cy + fontSize * 0.35, "text-anchor": "middle", "font-family": "var(--mono)",
          "font-size": fontSize, fill: css(tok ? "--stage-ink" : "--stage-mute")
        }, fmt(M[i][j], digits)));
      }
    }
    if (o.title) label(parent, x0, y0 - 8, o.title, {size: 12, anchor: "start", baseline: "middle"});
    parent.appendChild(g);
    return {x0, y0, x1: xEnd, y1: y0 + rows * cellH, cellW, cellH, heat};
  }

  // A signed heat grid: the colour says the sign, the strength says the size
  // (square-root, so a factor whose first column is 1.00 and whose second is
  // 0.05 still shows the second). Used where a matrix is a picture rather
  // than a table -- ALS's three factors mid-fit, an unfolding and what a rank
  // misses of it. `opts.peak` shares one scale across several grids.
  function heat(parent, M, opts) {
    const o = opts || {};
    const rows = M.length, cols = M[0].length;
    const cw = o.w / cols, ch = o.h / rows;
    let peak = o.peak || 0;
    if (!peak) {
      for (const row of M) for (const v of row) peak = Math.max(peak, Math.abs(v));
    }
    const g = el("g", {});
    g.appendChild(el("rect", {
      x: o.x, y: o.y, width: o.w, height: o.h, fill: "none",
      stroke: css(o.outline || "--stage-mute"), "stroke-width": o.outline ? 2 : 0.8
    }));
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const v = M[i][j];
        const a = peak ? Math.sqrt(Math.min(1, Math.abs(v) / peak)) : 0;
        if (a < 0.02) continue;
        const tok = (o.at && o.at(i, j)) || (v >= 0 ? (o.pos || "--fa-core") : (o.neg || "--fa-err"));
        g.appendChild(el("rect", {
          x: o.x + j * cw, y: o.y + i * ch,
          width: Math.max(cw - (cw > 3 ? 0.5 : 0), 0.4), height: Math.max(ch - (ch > 3 ? 0.5 : 0), 0.4),
          fill: css(tok), "fill-opacity": 0.1 + 0.9 * a
        }));
      }
    }
    parent.appendChild(g);
    return {x0: o.x, y0: o.y, x1: o.x + o.w, y1: o.y + o.h, cw, ch, peak};
  }

  // A bar chart, values against a shared zero. Signed values draw both ways
  // from a zero line inside the box (`opts.signed`), never off the bottom of
  // it: a bar drawn downwards from a zero at the floor leaves the stage, and
  // SVG neither clips it nor says so. `opts.at(i)` colours one bar;
  // `opts.lit(i)` brightens it; `opts.pick(i)` makes it clickable.
  function bars(parent, values, opts) {
    const o = opts || {};
    const x0 = o.x || 0, y0 = o.y || 0, w = o.w || 240, h = o.h || 80;
    const n = values.length;
    const gap = o.gap === undefined ? 1.5 : o.gap;
    const bw = (w - gap * (n - 1)) / n;
    const max = o.max === undefined ? Math.max(1e-9, ...values.map((v) => Math.abs(v))) : o.max;
    const signed = !!o.signed;
    const zero = signed ? y0 + h / 2 : y0 + h;
    const span = signed ? h / 2 : h;
    const g = el("g", {});
    g.appendChild(el("line", {
      x1: x0, y1: zero, x2: x0 + w, y2: zero, stroke: css("--stage-mute"), "stroke-width": 1
    }));
    values.forEach((v, i) => {
      const clampV = signed ? Math.max(-max, Math.min(max, v)) : Math.max(0, Math.min(max, v));
      const bh = Math.max(0.5, (Math.abs(clampV) / max) * span);
      const bx = x0 + i * (bw + gap);
      const tok = o.at ? o.at(i) : "--fa-r";
      const lit = o.lit ? o.lit(i) : false;
      const r = el("rect", {
        x: bx - (lit ? 0.6 : 0), y: clampV >= 0 ? zero - bh : zero,
        width: bw + (lit ? 1.2 : 0), height: bh,
        fill: css(tok), "fill-opacity": lit ? 1 : (o.alpha || 0.75)
      });
      if (o.pick) {
        // The hit target is the whole column, not the bar: a short bar is the
        // one a reader most wants to click.
        const hit = el("rect", {
          x: bx, y: y0, width: bw + gap, height: h, fill: "transparent", "data-pick": o.pick(i)
        });
        g.appendChild(hit);
      }
      g.appendChild(r);
    });
    parent.appendChild(g);
    return {x0, y0, w, h, bw, gap, max, zero, px: (i) => x0 + i * (bw + gap) + bw / 2};
  }

  // A line over evenly spaced samples -- the hour factor's columns, the day's
  // trips, ALS's error by solve. `opts.min`/`opts.max` fix the vertical
  // scale so several curves can share it; `opts.log` plots log10.
  function curve(parent, values, opts) {
    const o = opts || {};
    const n = values.length;
    const f = (v) => (o.log ? Math.log10(Math.max(v, o.floor || 1e-9)) : v);
    let lo = o.min === undefined ? Infinity : f(o.min);
    let hi = o.max === undefined ? -Infinity : f(o.max);
    if (o.min === undefined || o.max === undefined) {
      for (const v of values) {
        if (o.min === undefined) lo = Math.min(lo, f(v));
        if (o.max === undefined) hi = Math.max(hi, f(v));
      }
    }
    if (hi - lo < 1e-12) { hi = lo + 1; }
    const px = (i) => o.x + (n > 1 ? (i / (n - 1)) * o.w : o.w / 2);
    const py = (v) => o.y + o.h - ((f(v) - lo) / (hi - lo)) * o.h;
    const pts = values.map((v, i) => px(i).toFixed(2) + "," + py(v).toFixed(2)).join(" ");
    const line = el("polyline", {
      points: pts, fill: "none", stroke: css(o.token || "--fa-t"),
      "stroke-width": o.width || 2, "stroke-opacity": o.opacity === undefined ? 1 : o.opacity,
      "stroke-linejoin": "round"
    });
    if (o.dash) line.setAttribute("stroke-dasharray", o.dash);
    parent.appendChild(line);
    if (o.dots) {
      values.forEach((v, i) => {
        if (o.dots !== true && !o.dots(i)) return;
        parent.appendChild(el("circle", {cx: px(i), cy: py(v), r: o.dotR || 2.6, fill: css(o.dotToken ? o.dotToken(i) : (o.token || "--fa-t"))}));
      });
    }
    return {px, py, lo, hi};
  }

  // ------------------------------------------------------ the cube in space
  //
  // One world frame for every three.js scene: x is hour, y is pickup (row 0
  // at the top, the way a matrix is read), z is dropoff. A cell is one unit;
  // the cube is centred on the origin.
  function cubePos(ix, shape) {
    const [I, J, Kk] = shape;
    return [ix[2] - (Kk - 1) / 2, (I - 1) / 2 - ix[0], ix[1] - (J - 1) / 2];
  }

  // A voxel whose *volume* is its count: side = cbrt(count / peak). A side
  // proportional to the count would make the one route that holds 76% of the
  // trips look 76% of the picture by width and far more by area, which is
  // the lie this rules out. `floor` keeps a zero visible as a ghost.
  const VOX = 0.92;
  const side = (v, peak, floor) => {
    const s = peak > 0 ? VOX * Math.cbrt(Math.max(0, v) / peak) : 0;
    return Math.max(s, floor || 0);
  };

  const smooth = (t) => {
    const u = Math.max(0, Math.min(1, t));
    return u * u * (3 - 2 * u);
  };

  // Rodrigues: p turned by `angle` about the unit vector `axis`.
  function rotate(p, axis, angle) {
    if (!angle) return p.slice();
    const [ux, uy, uz] = axis;
    const c = Math.cos(angle), s = Math.sin(angle), d = (1 - c) * (ux * p[0] + uy * p[1] + uz * p[2]);
    return [
      p[0] * c + (uy * p[2] - uz * p[1]) * s + ux * d,
      p[1] * c + (uz * p[0] - ux * p[2]) * s + uy * d,
      p[2] * c + (ux * p[1] - uy * p[0]) * s + uz * d
    ];
  }

  // How the cube lies down along each mode. First it turns so the chosen
  // axis runs down the page (mode 0: nothing to turn; mode 1: a quarter turn
  // about x; mode 2: a third of a turn about the (-1, 1, -1) diagonal, which
  // carries hour onto -y, dropoff onto x and pickup into depth). Then the
  // slabs at each depth are dealt sideways to their block of columns, and
  // last they are pressed flat. Dealing before pressing is what keeps two
  // voxels from ever passing through each other: while the slabs slide they
  // are still at different depths, and by the time they are pressed they no
  // longer overlap sideways.
  const R3 = 1 / Math.sqrt(3);
  const TURN = [
    {axis: [1, 0, 0], angle: 0},
    {axis: [1, 0, 0], angle: Math.PI / 2},
    {axis: [-R3, R3, -R3], angle: 2 * Math.PI / 3}
  ];
  const PHASE = {turn: 0.3, deal: 0.75};

  // Where T[ix] sits once the cube is laid flat: its unfolding address, a
  // matrix centred on the origin, rows down, in the z = 0 plane.
  function unfoldEnd(ix, shape, m) {
    const p = FC.unfoldIndex(ix, shape, m);
    return [p.col - (p.cols - 1) / 2, (p.rows - 1) / 2 - p.row, 0];
  }

  // The voxel's position `t` of the way from cube (0) to matrix (1).
  function unfoldPose(ix, shape, m, t) {
    const turn = TURN[m];
    const rotT = smooth(t / PHASE.turn);
    const start = cubePos(ix, shape);
    const turned = rotate(start, turn.axis, turn.angle);
    const now = rotT < 1 ? rotate(start, turn.axis, turn.angle * rotT) : turned;
    if (t <= PHASE.turn) return now;
    const end = unfoldEnd(ix, shape, m);
    const shift = end[0] - turned[0];
    // Slabs leave one after another, so the deal reads as a hand of cards
    // rather than one block splitting. The depth is rounded because the
    // third-of-a-turn for mode 2 leaves float noise on it.
    const depth = Math.round(turned[2] * 2) / 2;
    const n = depthCount(shape, m);
    const order = depth + (n - 1) / 2;
    const lag = n > 1 ? 0.35 / (n - 1) : 0;
    const u = (t - PHASE.turn) / (PHASE.deal - PHASE.turn);
    const e = smooth((u - lag * order) / (1 - lag * (n - 1)));
    const press = smooth((t - PHASE.deal) / (1 - PHASE.deal));
    return [turned[0] + shift * e, turned[1], turned[2] * (1 - press)];
  }

  // How each voxel is itself turned at `t`: with the cube while it turns, so
  // the lattice turns rigidly and no two boxes cross; after that the turn is
  // a whole number of quarter turns of a cube, which is an axis-aligned cube
  // again, and nothing needs turning.
  function unfoldTurn(m, t) {
    if (t >= PHASE.turn) return null;
    const a = TURN[m].angle * smooth(t / PHASE.turn);
    return a ? {axis: TURN[m].axis, angle: a} : null;
  }

  // How many slabs lie at different depths once the cube has turned for this
  // mode: the size of whichever axis is neither the rows nor hour's columns.
  function depthCount(shape, m) {
    return m === 0 ? shape[1] : shape[0];
  }

  // ------------------------------------------------------- the flat twin
  //
  // Orthographic, from the same orbit the GL camera takes. What the twin
  // loses is the foreshortening, not the view: a reader who drags the flat
  // picture turns it exactly as they would turn the three.js one.
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const unit = (a) => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };

  function viewBasis(view, target) {
    const fwd = LC.orbitDir(view);
    let right = cross(LC.UP, fwd);
    if (Math.hypot(right[0], right[1], right[2]) < 1e-6) right = [1, 0, 0];
    right = unit(right);
    return {right, up: cross(fwd, right), fwd, target: target || [0, 0, 0]};
  }

  // A projection that fits `points` (world) inside `box` = [x0, y0, x1, y1]
  // of the 820 x 420 viewBox, whatever the orbit. Every picture a slider can
  // grow and a drag can turn is fitted this way rather than placed, so the
  // twin is inside the viewBox at every slider corner and every angle by
  // construction -- the property check_navigation.cjs measures.
  function projector(points, B, box) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of points) {
      const d = [p[0] - B.target[0], p[1] - B.target[1], p[2] - B.target[2]];
      const u = dot3(d, B.right), v = dot3(d, B.up);
      x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v);
    }
    const bw = box[2] - box[0], bh = box[3] - box[1];
    const s = Math.min(bw / Math.max(1e-6, x1 - x0), bh / Math.max(1e-6, y1 - y0));
    const cx = (box[0] + box[2]) / 2 - ((x0 + x1) / 2) * s;
    const cy = (box[1] + box[3]) / 2 + ((y0 + y1) / 2) * s;
    const P = (p) => {
      const d = [p[0] - B.target[0], p[1] - B.target[1], p[2] - B.target[2]];
      return [cx + dot3(d, B.right) * s, cy - dot3(d, B.up) * s];
    };
    P.s = s;
    P.depth = (p) => dot3([p[0] - B.target[0], p[1] - B.target[1], p[2] - B.target[2]], B.fwd);
    return P;
  }

  // The eight corners of an axis-aligned box, for projector().
  function corners(min, max) {
    const out = [];
    for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) out.push([x, y, z]);
    return out;
  }

  // Boxes, painted far to near. For disjoint axis-aligned boxes under an
  // orthographic view that order is exact, so no box is ever drawn over one
  // in front of it. Each box shows its three camera-facing faces, shaded so
  // the top reads brightest -- the same light the three.js scenes use.
  // An item is {c: [x, y, z], s: [sx, sy, sz] | number, token, alpha, pick,
  // stroke}.
  const SHADE = [0.74, 1, 0.56];   // x-, y- and z-facing faces
  const EYE = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  function boxes2(parent, items, B, P, opts) {
    const o = opts || {};
    // Every box may share one turn (the unfold's first phase); its three axes
    // are then the turned ones, and which faces face the camera follows them.
    const axes = o.turn ? EYE.map((e) => rotate(e, o.turn.axis, o.turn.angle)) : EYE;
    const facing = axes.map((a) => dot3(a, B.fwd));
    const order = items.map((it, n) => ({it, n, d: dot3([it.c[0] - B.target[0], it.c[1] - B.target[1], it.c[2] - B.target[2]], B.fwd)}));
    order.sort((a, b) => a.d - b.d || a.n - b.n);
    const g = el("g", {});
    const colours = {};
    for (const {it} of order) {
      const s = Array.isArray(it.s) ? it.s : [it.s, it.s, it.s];
      if (s[0] <= 0.001 && s[1] <= 0.001 && s[2] <= 0.001) continue;
      const h = [s[0] / 2, s[1] / 2, s[2] / 2];
      const fill = colours[it.token] || (colours[it.token] = css(it.token));
      const box = el("g", it.pick ? {"data-pick": it.pick} : {});
      for (let ax = 0; ax < 3; ax++) {
        if (Math.abs(facing[ax]) < 1e-6) continue;
        const sg = facing[ax] > 0 ? 1 : -1;
        const a1 = (ax + 1) % 3, a2 = (ax + 2) % 3;
        const quad = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => {
          const p = it.c.slice();
          for (let q = 0; q < 3; q++) {
            p[q] += sg * h[ax] * axes[ax][q] + u * h[a1] * axes[a1][q] + v * h[a2] * axes[a2][q];
          }
          return P(p);
        });
        box.appendChild(el("polygon", {
          points: quad.map((q) => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" "),
          fill, "fill-opacity": ((it.alpha === undefined ? 1 : it.alpha) * SHADE[ax]).toFixed(3),
          stroke: it.stroke ? css(it.stroke) : "none", "stroke-width": it.stroke ? 1 : 0
        }));
      }
      g.appendChild(box);
    }
    parent.appendChild(g);
    return g;
  }

  // The twelve edges of a box, as one path: a fibre's or a slice's frame.
  function edges2(parent, min, max, P, token, opts) {
    const o = opts || {};
    const c = corners(min, max).map(P);
    const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const d = E.map(([a, b]) => `M${c[a][0].toFixed(1)} ${c[a][1].toFixed(1)}L${c[b][0].toFixed(1)} ${c[b][1].toFixed(1)}`).join("");
    const p = el("path", {d, fill: "none", stroke: css(token), "stroke-width": o.width || 1.6,
                          "stroke-opacity": o.opacity === undefined ? 0.95 : o.opacity});
    if (o.dash) p.setAttribute("stroke-dasharray", o.dash);
    parent.appendChild(p);
    return p;
  }

  // ------------------------------------------------------------- three.js
  const T3 = () => root.THREE;
  // A CSS colour token as a three.js colour, `k` times as bright. The data
  // voxels are drawn below the bloom pass's threshold on purpose, so only
  // what the reader has picked out glows.
  const colour = (token, k) => {
    const c = new (T3().Color)(css(token));
    return k === undefined ? c : c.multiplyScalar(k);
  };

  function light(scene) {
    const THREE = T3();
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(6, 12, 9);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.45);
    fill.position.set(-8, -3, -6);
    scene.add(fill);
  }

  // n boxes in one draw call, and an invisible twin of them that is never
  // smaller than 0.6 of a cell, so a voxel holding one trip -- a sixth of a
  // cell across -- can still be pointed at. Raycasting reads layers, not
  // `visible`, so the invisible material is still hit.
  function voxels(n) {
    const THREE = T3();
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({roughness: 0.62, metalness: 0}), n);
    const hit = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({visible: false}), n);
    // The whole set moves in the unfold, and an InstancedMesh's bounding
    // sphere is computed once, while null: a 120-wide strip judged by the
    // cube's sphere is culled, or unpickable, for no visible reason. commit()
    // recomputes it; culling is off regardless, it saves nothing at 480.
    mesh.frustumCulled = false;
    hit.frustumCulled = false;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const ax3 = new THREE.Vector3();
    const white = new THREE.Color(1, 1, 1);
    // instanceColor has to exist before the first render, or the material is
    // compiled without it and every voxel draws white until it is rebuilt.
    for (let i = 0; i < n; i++) mesh.setColorAt(i, white);
    return {
      mesh, hit, n,
      set(i, pos, size, col, turn) {
        const sz = Array.isArray(size) ? size : [size, size, size];
        p.set(pos[0], pos[1], pos[2]);
        if (turn) q.setFromAxisAngle(ax3.set(turn.axis[0], turn.axis[1], turn.axis[2]), turn.angle);
        else q.identity();
        s.set(Math.max(sz[0], 1e-4), Math.max(sz[1], 1e-4), Math.max(sz[2], 1e-4));
        m4.compose(p, q, s);
        mesh.setMatrixAt(i, m4);
        s.set(Math.max(sz[0], 0.6), Math.max(sz[1], 0.6), Math.max(sz[2], 0.6));
        m4.compose(p, q, s);
        hit.setMatrixAt(i, m4);
        mesh.setColorAt(i, col);
      },
      // Draw only the first `m` instances: a scene whose piece count moves
      // with a slider (the Tucker diagram) sizes the mesh for its largest.
      count(m) { mesh.count = Math.min(n, m); hit.count = Math.min(n, m); },
      commit() {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        hit.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        hit.computeBoundingSphere();
      }
    };
  }

  // A glowing box: the picked cell, the core entry being read. Emissive, so
  // the bloom pass finds it and nothing else.
  function glowBox(token, intensity) {
    const THREE = T3();
    const c = colour(token);
    return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({color: c, emissive: c, emissiveIntensity: intensity === undefined ? 0.9 : intensity, roughness: 0.4}));
  }

  // The edges of a unit box, placed and stretched by setBox(): a fibre's
  // frame, a slice's, the original tensor's outline behind its rebuild.
  function frameBox(token, opacity) {
    const THREE = T3();
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    const mat = new THREE.LineBasicMaterial({color: colour(token), transparent: true, opacity: opacity === undefined ? 0.95 : opacity});
    const obj = new THREE.LineSegments(geo, mat);
    obj.frustumCulled = false;
    return obj;
  }
  function setBox(obj, min, max) {
    obj.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
    obj.scale.set(Math.max(1e-3, max[0] - min[0]), Math.max(1e-3, max[1] - min[1]), Math.max(1e-3, max[2] - min[2]));
  }

  // A CSS2D label on the stage's opaque chip. `cls` picks an axis colour
  // (m0, m1, m2), or mute, or sig for the picked cell.
  function label2d(text, cls) {
    const AD = root.THREE_ADDONS;
    const d = document.createElement("div");
    d.className = "lab" + (cls ? " " + cls : "");
    d.textContent = text;
    return new AD.CSS2DObject(d);
  }
  function setLabel(obj, text, pos, cls) {
    if (obj.element.textContent !== text) obj.element.textContent = text;
    if (cls !== undefined) {
      const want = "lab" + (cls ? " " + cls : "");
      if (obj.element.className !== want) obj.element.className = want;
    }
    if (pos) obj.position.set(pos[0], pos[1], pos[2]);
  }

  // A label list both surfaces draw from: {text, pos: [x, y, z], cls, lit,
  // size, anchor}. `cls` is an axis (m0, m1, m2), sig, core, err or mute --
  // the same classes the CSS2D chips take, mapped here to the SVG's tokens.
  const CLS_TOKEN = {m0: "--fa-m0", m1: "--fa-m1", m2: "--fa-m2", sig: "--fa-t", core: "--fa-core",
                     err: "--fa-err", mute: "--stage-mute", "": "--stage-ink"};
  function labels2(parent, list, P) {
    for (const L of list) {
      const [x, y] = P(L.pos);
      const tok = CLS_TOKEN[L.cls || ""];
      label(parent, x, y, L.text, {
        size: L.size || 11, anchor: L.anchor || "middle", baseline: "middle",
        colour: tok, stroke: L.lit ? tok : undefined, pick: L.pick
      });
    }
  }
  // The same list as CSS2D chips, pooled: created once, then moved, hidden
  // and re-worded in place, because a label rebuilt per frame is a DOM node
  // churned sixty times a second.
  function labelPool(scene3) {
    const pool = [];
    return {
      sync(list) {
        while (pool.length < list.length) {
          const o = label2d("", "");
          scene3.add(o);
          pool.push(o);
        }
        pool.forEach((o, n) => {
          const L = list[n];
          if (!L) { o.visible = false; return; }
          o.visible = true;
          setLabel(o, L.text, L.pos, (L.cls || "") + (L.lit ? " lit" : "") + (L.size > 12 ? " big" : ""));
        });
      }
    };
  }

  // One cached three.js colour per token and brightness, so a render that
  // recolours 480 voxels allocates nothing.
  function palette() {
    const cache = {};
    return (token, k) => {
      const key = token + "|" + k;
      return cache[key] || (cache[key] = colour(token, k));
    };
  }

  // ----------------------------------------------------------- easing
  //
  // A stretch of numbers -- every voxel's position and size -- easing from
  // wherever it is to wherever the controls now say. The readout is never
  // written from this: it is what the picture shows while it moves, and the
  // truth is always ctx.state. `sig` names the target, so nothing is rebuilt
  // or compared per frame unless the controls changed.
  function ease(store, name, sig, build, now, ms) {
    let s = store[name];
    if (!s || s.sig === undefined) {
      const to = Float64Array.from(build());
      s = store[name] = {sig, from: to, to, t0: now, ms: 0, cur: Float64Array.from(to), done: true};
      return s;
    }
    if (s.sig !== sig) {
      const to = Float64Array.from(build());
      const from = s.cur.length === to.length ? Float64Array.from(s.cur) : Float64Array.from(to);
      Object.assign(s, {sig, from, to, t0: now, ms: ms || 0, done: false});
    }
    const u = s.ms ? Math.min(1, (now - s.t0) / s.ms) : 1;
    const e = LC.easeInOutCubic(u);
    if (s.cur.length !== s.to.length) s.cur = new Float64Array(s.to.length);
    for (let i = 0; i < s.to.length; i++) s.cur[i] = s.from[i] + (s.to[i] - s.from[i]) * e;
    s.done = u >= 1;
    return s;
  }

  // Pieces that ease by identity. Every item carries a `key` -- "G:0,0,0",
  // "A:2,1", "cell:306" -- and its position and size follow their targets
  // with a time constant `tau` (seconds), from wherever they were: a rank
  // slider moved mid-move is simply a new target, and nothing restarts. An
  // item that appears grows from nothing where it stands; one that goes away
  // shrinks where it stood and is dropped once it is gone. The first call
  // shows everything at full size, so a scene opens drawn rather than
  // growing. `store.moving` says whether anything is still on its way, which
  // is what a scene's animates() reports.
  function follow(store, items, now, tau, instant) {
    const dt = store.t === undefined ? 0 : Math.min(0.1, Math.max(0, (now - store.t) / 1000));
    const fresh = store.t === undefined;
    store.t = now;
    const k = instant ? 1 : 1 - Math.exp(-dt / (tau || 0.18));
    if (!store.map) store.map = new Map();
    const seen = new Set();
    const out = [];
    let moving = false;
    const three = (v) => (Array.isArray(v) ? v : [v, v, v]);
    for (const it of items) {
      seen.add(it.key);
      const s = three(it.s);
      let cur = store.map.get(it.key);
      if (!cur) {
        cur = {c: it.c.slice(), s: fresh || instant ? s.slice() : [0, 0, 0]};
        store.map.set(it.key, cur);
      }
      cur.item = it;
      for (let q = 0; q < 3; q++) {
        cur.c[q] += (it.c[q] - cur.c[q]) * k;
        cur.s[q] += (s[q] - cur.s[q]) * k;
        if (Math.abs(it.c[q] - cur.c[q]) > 1e-3 || Math.abs(s[q] - cur.s[q]) > 1e-3) moving = true;
      }
      out.push(Object.assign({}, it, {c: cur.c.slice(), s: cur.s.slice()}));
    }
    for (const [key, cur] of store.map) {
      if (seen.has(key)) continue;
      for (let q = 0; q < 3; q++) cur.s[q] -= cur.s[q] * k;
      if (instant || Math.max(cur.s[0], cur.s[1], cur.s[2]) < 2e-3) { store.map.delete(key); continue; }
      moving = true;
      out.push(Object.assign({}, cur.item, {c: cur.c.slice(), s: cur.s.slice(), pick: undefined}));
    }
    store.moving = moving;
    return out;
  }

  const FactorKit = {
    FactorScenes, css, AXIS, AXIS_CLS, HL_AXIS, HL_NAME, fmt, num, pct, sup, sub, shapeSup, mode, code, idx,
    el, label, numGrid, heat, bars, curve,
    cubePos, side, smooth, rotate, TURN, PHASE, unfoldEnd, unfoldPose, unfoldTurn, depthCount,
    viewBasis, projector, corners, boxes2, edges2,
    colour, light, voxels, glowBox, frameBox, setBox, label2d, setLabel, labels2, labelPool, palette, CLS_TOKEN, ease, follow
  };
  if (typeof module !== "undefined" && module.exports) module.exports = FactorKit;
  else { root.FactorKit = FactorKit; root.FactorScenes = FactorScenes; }
})(typeof window !== "undefined" ? window : globalThis);
