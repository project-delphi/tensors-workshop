// The AlphaTensor stage's drawing kit and its scene registry. Everything here
// turns numbers alphatensor-core.js computed into pictures on one stage;
// nothing here computes a number a readout quotes. That split is the one
// genome-kit.js keeps against genome-core.js, which this file was forked
// from, for the same reason: the arithmetic is the lesson and `npm test` pins
// it, while the drawing is what the browser check and a screenshot catch.
//
// Two surfaces. The scenes where depth is the picture -- the multiplication
// cube as a stack of trays, a block lighting eight of its cells, a game
// emptying it -- draw in three.js; each of them also draws an SVG twin from
// the same numbers, projected through the same orbit, which is what the hero
// embed, a reader without WebGL and the browser check's layout measurement
// all see. The flat scenes (the eight products, a run on numbers, a census of
// moves) are SVG only. Every label, on either surface, is real text on an
// opaque chip, so axe can measure it.
//
// One picture is shared by every scene that shows the cube, so it lives here
// rather than in six scene files: cubeModel() says what to draw for a state,
// cubeBuild()/cubeRender() draw it in three.js and cubeDraw() draws the twin.
//
// A plain script, not a module, so the page works from file://. The pure
// helpers (the cube's geometry, the projection) are exported through
// module.exports as well, so the node test can pin them.
(function (root) {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const LC = root.LinalgCore ||
    (typeof require !== "undefined" ? require("./linalg-core.js") : null);
  // The kit draws what the core computed and never calls into it for a number
  // a readout quotes: all it takes from the core is an entry's name (a₁₂),
  // for the cube's labels. Resolving it here also fails loudly at load -- in
  // the browser the only thing that orders these files is the page's own
  // <script src> lines, and a kit that loaded first would otherwise throw
  // somewhere inside the first scene's draw(), a long way from the line that
  // is actually wrong.
  const AC = root.AlphaTensorCore ||
    (typeof require !== "undefined" ? require("./alphatensor-core.js") : null);
  if (!AC) throw new Error("alphatensor-kit.js: load alphatensor-core.js first");

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

  const AlphaTensorScenes = {
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
  // A custom property, or a colour that is already one, so a scene that
  // computes a colour can hand it to the same helpers that take tokens.
  const css = (name) => {
    if (!name || name[0] !== "-") return name;
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };

  // The roles this stage's pictures use, as the page's own custom properties
  // (`--at-*`, measured against the stage chip); the kit only names them. The
  // same short class names go on a CSS2D chip and pick the SVG twin's token,
  // so a scene hands one label list to both surfaces. `a`, `b` and `c` are the
  // cube's three axes -- an entry of A, of B, of C -- and are also the tokens
  // the display equations' letters carry.
  const CLS_TOKEN = {
    a: "--at-a", b: "--at-b", c: "--at-c", pos: "--at-pos", neg: "--at-neg",
    good: "--at-good", bad: "--at-bad", mute: "--stage-mute", "": "--stage-ink"
  };

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
    const fontSize = Math.min(o.font || 11.5, cellH * 0.72, (cellW - 4) / (0.62 * wide));
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
            fill: css(tok || o.heatToken || "--at-pos"),
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
  // (square-root, so a weight of 1.00 beside one of 0.05 still shows the
  // second). Used where a matrix is a picture rather
  // than a table -- a weight matrix, an attention map and what a mask
  // hides of it. `opts.peak` shares one scale across several grids.
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
        const tok = (o.at && o.at(i, j)) || (v >= 0 ? (o.pos || "--at-pos") : (o.neg || "--at-neg"));
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
      const tok = o.at ? o.at(i) : "--at-pos";
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

  // A line over evenly spaced samples -- the count of cells left, move by
  // move. `opts.min`/`opts.max` fix the vertical
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
      points: pts, fill: "none", stroke: css(o.token || "--at-good"),
      "stroke-width": o.width || 2, "stroke-opacity": o.opacity === undefined ? 1 : o.opacity,
      "stroke-linejoin": "round"
    });
    if (o.dash) line.setAttribute("stroke-dasharray", o.dash);
    parent.appendChild(line);
    if (o.dots) {
      values.forEach((v, i) => {
        if (o.dots !== true && !o.dots(i)) return;
        parent.appendChild(el("circle", {cx: px(i), cy: py(v), r: o.dotR || 2.6, fill: css(o.dotToken ? o.dotToken(i) : (o.token || "--at-good"))}));
      });
    }
    return {px, py, lo, hi};
  }


  // ------------------------------------------------------- the world frame
  //
  // One world frame for every three.js scene: a cell is one unit, y is up,
  // and the trays of the cube are stacked along it. Units are small -- a few
  // across the whole picture -- and that is the same discipline as the other
  // stages: what the camera holds is what the geometry spans.
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

  // A scene's bounds grown to hold its own labels' anchors, and a little
  // more: what the camera frames and the twin fits has to be everything that
  // is drawn, and a label placed off the cube's corner is drawn too.
  function withLabels(bounds, labels, pad) {
    const p = pad === undefined ? 0.8 : pad;
    const min = bounds.min.slice(), max = bounds.max.slice();
    for (const L of labels) {
      for (let q = 0; q < 3; q++) {
        min[q] = Math.min(min[q], L.pos[q] - p);
        max[q] = Math.max(max[q], L.pos[q] + p);
      }
    }
    return {min, max};
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
  // stroke, dot}.
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
      // A speck -- an empty cell of the cube -- is one circle in the same
      // painter's order, not three faces: there are 702 of them at 3 x 3.
      if (it.dot) {
        const q = P(it.c);
        const dot = el("circle", {
          cx: q[0].toFixed(1), cy: q[1].toFixed(1), r: Math.max(0.7, s[0] * P.s * 0.5).toFixed(2),
          fill, "fill-opacity": (it.alpha === undefined ? 1 : it.alpha).toFixed(3)
        });
        if (it.pick) dot.setAttribute("data-pick", it.pick);
        g.appendChild(dot);
        continue;
      }
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
  // beads are drawn below the bloom pass's threshold on purpose, so only
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
  // smaller than 0.6 of a cell, so a thin slab can still be pointed at.
  // Raycasting reads layers, not `visible`, so the invisible material is still
  // hit. Every cell of the cube is one of these.
  function voxels(n) {
    const THREE = T3();
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({roughness: 0.62, metalness: 0}), n);
    const hit = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({visible: false}), n);
    // An InstancedMesh's bounding sphere is computed once, while null, so a
    // set that moves far from where it was built is culled, or unpickable, for
    // no visible reason. commit() recomputes it; culling is off regardless, it
    // saves nothing at this size.
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

  // n beads in one draw call. The same contract as voxels() -- set / count / commit, a hit twin,
  // culling off, instanceColor seeded before the first render -- with a sphere
  // for the geometry, for a thing with no faces to shade. `floor`
  // is the smallest radius the hit twin takes: a bead shrunk to a speck while
  // it eases away can still be pointed at on the way out.
  function spheres(n, floor) {
    const THREE = T3();
    const geo = new THREE.SphereGeometry(1, 16, 12);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({roughness: 0.42, metalness: 0}), n);
    const hit = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({visible: false}), n);
    // An InstancedMesh's bounding sphere is computed once, while null, so a
    // chain that unwinds out of it is culled for no visible reason. commit()
    // recomputes it; culling is off regardless, it saves nothing at this size.
    mesh.frustumCulled = false;
    hit.frustumCulled = false;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const white = new THREE.Color(1, 1, 1);
    const minHit = floor === undefined ? 0.18 : floor;
    // Without instanceColor existing before the first render the material is
    // compiled without it, and every bead draws white until it is rebuilt.
    for (let i = 0; i < n; i++) mesh.setColorAt(i, white);
    return {
      mesh, hit, n,
      set(i, pos, radius, col) {
        p.set(pos[0], pos[1], pos[2]);
        const r = Math.max(radius, 1e-4);
        m4.compose(p, q, s.set(r, r, r));
        mesh.setMatrixAt(i, m4);
        const h = Math.max(radius, minHit);
        m4.compose(p, q, s.set(h, h, h));
        hit.setMatrixAt(i, m4);
        mesh.setColorAt(i, col);
      },
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

  // n strands in one draw call: each a unit cylinder stretched to span two
  // points: the lines that cut a tray into the blocks of one matrix row. It is instanced cylinders and not a THREE.Line on purpose: three.js
  // frustum-culls a Line by its bounding sphere, as one object, so a long one
  // whose ends run past the frame has a sphere the camera never intersects and
  // the whole line vanishes rather than being clipped to the edge. A mesh with
  // culling off cannot do that, and it has a thickness a Line (always one
  // pixel wide) does not.
  function segments(n) {
    const THREE = T3();
    // Open-ended, since a bond's ends are buried in the beads it joins.
    const geo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({roughness: 0.55, metalness: 0}), n);
    mesh.frustumCulled = false;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const dir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const white = new THREE.Color(1, 1, 1);
    for (let i = 0; i < n; i++) mesh.setColorAt(i, white);
    return {
      mesh, n,
      set(i, from, to, radius, col) {
        dir.set(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
        const len = dir.length();
        // A zero-length span has no direction; any will do, it is scaled away.
        if (len > 1e-9) q.setFromUnitVectors(up, dir.multiplyScalar(1 / len));
        else q.identity();
        p.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2);
        const r = Math.max(radius, 1e-4);
        m4.compose(p, q, s.set(r, Math.max(len, 1e-4), r));
        mesh.setMatrixAt(i, m4);
        mesh.setColorAt(i, col);
      },
      count(m) { mesh.count = Math.min(n, m); },
      commit() {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
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


  // A CSS2D label on the stage's opaque chip. `cls` picks an axis (a, b, c), a
  // value's sign (pos, neg), good or bad, or mute.
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
  // size, anchor}. `cls` is a, b, c, pos, neg, good, bad or mute -- the same
  // classes the CSS2D chips take, mapped here to the SVG tokens.
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
      // Dropped once it is a speck, not once it is nothing: a piece of the
      // last view shrinking where it stood can stand outside this view's
      // frame, and an exponential never quite reaches zero.
      if (instant || Math.max(cur.s[0], cur.s[1], cur.s[2]) < 0.05) { store.map.delete(key); continue; }
      moving = true;
      out.push(Object.assign({}, cur.item, {c: cur.c.slice(), s: cur.s.slice(), pick: undefined}));
    }
    store.moving = moving;
    return out;
  }

  // ------------------------------------------------- the round twins
  //
  // Beads, painted far to near. Spheres are not disjoint and their overlap is
  // not exactly orderable, but under an orthographic view ordering by depth of
  // the centre is what a reader takes for "in front" and is right for every
  // bead a scene places. An item is {c: [x, y, z], r, token,
  // alpha, pick}; the radius is world units times the projection's scale.
  function spheres2(parent, items, B, P, opts) {
    const o = opts || {};
    const order = items.map((it, n) => ({it, n, d: P.depth(it.c)}));
    // Same direction as boxes2: ascending depth, ties by input order.
    order.sort((a, b) => a.d - b.d || a.n - b.n);
    const g = el("g", {});
    const colours = {};
    for (const {it} of order) {
      const [x, y] = P(it.c);
      const fill = colours[it.token] || (colours[it.token] = css(it.token));
      const attrs = {
        cx: x.toFixed(1), cy: y.toFixed(1), r: Math.max(0.5, it.r * P.s).toFixed(2),
        fill, "fill-opacity": it.alpha === undefined ? 1 : it.alpha
      };
      if (o.stroke) { attrs.stroke = css(o.stroke); attrs["stroke-width"] = 0.8; }
      if (it.pick) attrs["data-pick"] = it.pick;
      g.appendChild(el("circle", attrs));
    }
    parent.appendChild(g);
    return g;
  }

  // Strands, painted far to near by their midpoints. The width is the radius through the projection's
  // scale, floored at a hairline so a thin rung never drops out of the picture.
  // An item is {a: [x, y, z], b: [x, y, z], r, token, alpha}.
  function segments2(parent, items, B, P, opts) {
    const o = opts || {};
    const mid = (it) => [(it.a[0] + it.b[0]) / 2, (it.a[1] + it.b[1]) / 2, (it.a[2] + it.b[2]) / 2];
    const order = items.map((it, n) => ({it, n, d: P.depth(mid(it))}));
    order.sort((a, b) => a.d - b.d || a.n - b.n);
    const g = el("g", {});
    const colours = {};
    for (const {it} of order) {
      const [x1, y1] = P(it.a), [x2, y2] = P(it.b);
      const stroke = colours[it.token] || (colours[it.token] = css(it.token));
      g.appendChild(el("line", {
        x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1),
        stroke, "stroke-width": Math.max(o.floor === undefined ? 0.8 : o.floor, 2 * it.r * P.s).toFixed(2),
        "stroke-opacity": it.alpha === undefined ? 1 : it.alpha, "stroke-linecap": "round"
      }));
    }
    parent.appendChild(g);
    return g;
  }

  // Plain text on the stage's own black, for a caption that stands on empty
  // board (a row's name, an axis letter). Anything over a picture takes
  // label() instead: that one brings its own chip.
  function text(parent, x, y, str, opts) {
    const o = opts || {};
    const t = el("text", {
      x: x.toFixed(2), y: y.toFixed(2), "font-size": o.size || 12.5,
      "font-family": o.sans ? "var(--sans)" : "var(--mono)", "font-weight": o.weight || 600,
      fill: css(o.colour || "--stage-ink"), "text-anchor": o.anchor || "start",
      "dominant-baseline": o.baseline || "auto"
    }, str);
    parent.appendChild(t);
    return t;
  }

  // ----------------------------------------------------------- an entrance
  //
  // How far a picture is through its entrance, 0 to 1. A scene's arrive()
  // stamps `ctx.cache.arrive`; until it has, and under reduced motion or the
  // pause button, the picture is simply there. The readout never reads this:
  // it is written from the controls on the first frame, and the entrance is
  // only how the picture gets to what the readout already says.
  function arrival(ctx, ms) {
    const t0 = ctx.cache.arrive;
    if (t0 === undefined || ctx.instant) return 1;
    return Math.max(0, Math.min(1, (ctx.now() - t0) / ms));
  }

  // A number chasing a target with time constant `tau` seconds: a tray
  // lifting clear of the stack, a count gliding to where the slider says. `store[name]` holds it; `store[name + "Moving"]` says whether it
  // has arrived, which is what a scene's animates() reports.
  function chase(store, name, target, now, tau, instant) {
    const s = store[name];
    if (!s || instant) {
      store[name] = {v: target, t: now, moving: false};
      return target;
    }
    const dt = Math.min(0.1, Math.max(0, (now - s.t) / 1000));
    s.t = now;
    s.v += (target - s.v) * (1 - Math.exp(-dt / (tau || 0.18)));
    if (Math.abs(target - s.v) < 0.01) s.v = target;
    s.moving = s.v !== target;
    return s.v;
  }


  // ------------------------------------------------------------- the cube
  //
  // The matrix multiplication tensor as a stack of trays, one per entry of C,
  // so that no cell hides behind another: c11 is the top tray. Inside a tray
  // the rows are the entries of A, running from the back to the front, and
  // the columns are the entries of B, left to right -- a tray seen from in
  // front and above reads like the matrix it is. A cell is one unit; trays
  // are TRAY_GAP apart.
  //
  // Every scene that shows the cube describes it with one state:
  //   {n, values, ever, preview, rings, slice, cell, lit}
  // `values` is the flat tensor to draw. `ever` marks cells that have held
  // something, drawn hollow once they are back at zero. `preview` is a second
  // tensor shown as ghosts over the first (a move not yet played). `rings`
  // is the target, a ring round each of its 1s whether or not the cell is
  // filled. `slice` is the picked tray (an index into C, or null), `cell` the
  // picked {a, b, c}, and `lit` a flat mask of cells to brighten.
  const TRAY_GAP = 1.4, TRAY_LIFT = 0.8, CELL = 0.64;
  const cubeHalf = (n) => (n * n - 1) / 2;
  function cubePos(n, a, b, c, lift) {
    const h = cubeHalf(n);
    return [b - h, (h - c) * TRAY_GAP + (lift ? lift[c] || 0 : 0), a - h];
  }
  // Just wide enough for the trays and the names round them, and the same
  // whatever is picked: the camera and the twin fit this, so nothing refits
  // while a tray lifts clear. A scene that lets a reader pick a tray asks for
  // `lifted`, which leaves room for the stack at its furthest apart.
  function cubeBounds(n, lifted) {
    const h = cubeHalf(n), up = lifted ? TRAY_LIFT : 0;
    return {min: [-h - 1.75, -h * TRAY_GAP - up - 0.75, -h - 0.6],
            max: [h + 1.85, h * TRAY_GAP + up + 0.5, h + 1.65]};
  }

  // How far each tray stands from its place while one is picked: the trays
  // above it rise and the ones under it sink, which opens it to the camera.
  // Eased per tray; `store.liftMoving` is what a scene's animates() reports.
  function trayLift(store, n, slice, now, instant) {
    const N = n * n, out = [];
    let moving = false;
    const none = slice === null || slice === undefined;
    for (let c = 0; c < N; c++) {
      const want = none || c === slice ? 0 : (c < slice ? TRAY_LIFT : -TRAY_LIFT);
      out.push(chase(store, "lift" + c, want, now, 0.14, instant));
      if (store["lift" + c].moving) moving = true;
    }
    store.liftMoving = moving;
    return out;
  }

  // What both surfaces draw for a state, before any easing: the cells (as
  // items K.follow can ease by key), the ghosts, the hollow outlines, the
  // rings, the trays with the lines that cut each into blocks, and the
  // labels. `o.lift` is trayLift()'s array; `o.zeros` is "cells" (a speck per
  // empty cell) or "grid" (none: past 3 x 3 the specks are thousands, and
  // the tray's own lines carry the shape); `o.hl` is the equation letter
  // being pointed at, which brightens that axis's names.
  function cubeModel(st, o) {
    const opt = o || {};
    const n = st.n, N = n * n, h = cubeHalf(n), lift = opt.lift || null;
    const zeros = opt.zeros || (n <= 3 ? "cells" : "grid");
    const picked = st.slice !== null && st.slice !== undefined;
    const side = n <= 3 ? CELL : 0.74;
    const items = [], ghosts = [], hollows = [], rings = [], trays = [], lines = [], labels = [];
    const box = (pos, s) => ({min: pos.map((q) => q - s / 2), max: pos.map((q) => q + s / 2)});
    for (let c = 0; c < N; c++) {
      const dim = picked && c !== st.slice;
      const y = (h - c) * TRAY_GAP + (lift ? lift[c] : 0), floor = y - 0.45, e = h + 0.5;
      trays.push({c, min: [-e, floor, -e], max: [e, floor, e], lit: picked && c === st.slice, dim});
      // The lines between one matrix row's entries and the next's: entry
      // (i, j) is row i * n + j of the tray, so every n-th line is a block.
      for (let q = 1; q < n; q++) {
        const at = q * n - 0.5 - h;
        lines.push({a: [-e, floor, at], b: [e, floor, at], dim});
        lines.push({a: [at, floor, -e], b: [at, floor, e], dim});
      }
      for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
        const idx = (a * N + b) * N + c, v = st.values[idx];
        const pos = [b - h, y, a - h], key = a + "," + b + "," + c;
        const chosen = !!st.cell && st.cell.a === a && st.cell.b === b && st.cell.c === c;
        const lit = chosen || !!(st.lit && st.lit[idx]);
        if (v) {
          items.push({key: "x:" + key, c: pos, s: lit ? side * 1.28 : side,
                      token: v > 0 ? "--at-pos" : "--at-neg", k: lit ? 1.75 : dim ? 0.4 : 0.92,
                      alpha: dim ? 0.45 : 1, pick: "x:" + key, v, idx, lit});
          // The sign is printed, never left to the colour: anything that is
          // not a plain 1 says what it is.
          if (v !== 1 && !dim) labels.push({text: fmt(v, 0), pos: [pos[0], pos[1] + 0.05, pos[2]], cls: v < 0 ? "neg" : "pos", size: 11, value: true});
        } else if (st.ever && st.ever[idx]) {
          hollows.push(Object.assign({key, idx, dim, pick: "x:" + key, c: pos}, box(pos, side)));
        } else if (zeros === "cells") {
          items.push({key: "z:" + key, c: pos, s: lit ? 0.3 : 0.13, token: lit ? "--stage-ink" : "--stage-mute", k: dim ? 0.45 : 0.85,
                      alpha: dim ? 0.3 : 0.6, pick: "x:" + key, v: 0, idx, dot: true, lit});
        }
        if (st.rings && st.rings[idx] && n <= 3) {
          rings.push(Object.assign({key, idx, dim, filled: v === st.rings[idx]}, box(pos, side + 0.2)));
        }
        if (st.preview && st.preview[idx]) {
          ghosts.push({key: "g:" + key, c: pos, s: side * 0.9, token: st.preview[idx] > 0 ? "--at-pos" : "--at-neg",
                       alpha: 0.4, k: 1.1, v: st.preview[idx], idx});
        }
      }
    }
    // Names. Every tray says which entry of C it is; the rows and columns are
    // named once, on the picked tray or else the bottom one. Past 2 x 2 a
    // name per row would be eighteen chips on one edge, so only the ends are.
    const ref = picked ? st.slice : N - 1;
    const yRef = (h - ref) * TRAY_GAP + (lift ? lift[ref] : 0) - 0.45;
    const ends = (q) => n === 2 || q === 0 || q === N - 1;
    for (let c = 0; c < N; c++) {
      if (!(n <= 3 || c === 0 || c === N - 1 || c === st.slice)) continue;
      const y = (h - c) * TRAY_GAP + (lift ? lift[c] : 0);
      labels.push({text: AC.name("c", n, c), pos: [h + 1.25, y - 0.35, h + 0.2], cls: "c",
                   lit: (picked && c === st.slice) || opt.hl === "c", pick: "t:" + c, axis: "c", q: c});
    }
    for (let q = 0; q < N; q++) {
      if (!ends(q)) continue;
      labels.push({text: AC.name("a", n, q), pos: [-h - 1.25, yRef, q - h], cls: "a",
                   lit: opt.hl === "a" || (!!st.cell && st.cell.a === q), axis: "a", q});
      labels.push({text: AC.name("b", n, q), pos: [q - h, yRef, h + 1.3], cls: "b",
                   lit: opt.hl === "b" || (!!st.cell && st.cell.b === q), axis: "b", q});
    }
    return {n, items, ghosts, hollows, rings, trays, lines, labels};
  }

  // The three.js side of the cube: instanced cells with their hit twins,
  // ghosts, and pools of outlines for the hollow cells, the rings and the
  // trays. `max` sizes the pools for the largest state the scene will draw --
  // {cells, ghosts, hollows, rings, trays, lines} -- since a mesh's instance
  // count is fixed when it is made.
  function cubeBuild(ctx, pose, max) {
    const THREE = ctx.THREE;
    const scene = new THREE.Scene();
    light(scene);
    const vox = voxels(max.cells);
    scene.add(vox.mesh, vox.hit);
    const ghost = voxels(max.ghosts || 1);
    ghost.mesh.material.transparent = true;
    ghost.mesh.material.opacity = 0.42;
    ghost.mesh.material.depthWrite = false;
    scene.add(ghost.mesh);
    const lines = segments(Math.max(1, max.lines || 1));
    scene.add(lines.mesh);
    const pool = (count, token, opacity) => {
      const out = [];
      for (let i = 0; i < count; i++) { const f = frameBox(token, opacity); f.visible = false; scene.add(f); out.push(f); }
      return out;
    };
    const keys = [];
    return {
      scene, vox, ghost, lines, keys,
      hollows: pool(max.hollows || 0, "--stage-mute", 0.95),
      rings: pool(max.rings || 0, "--at-pos", 0.95),
      trays: pool(max.trays || 0, "--at-c", 0.5),
      labels: labelPool(scene), col: palette(),
      cam: new THREE.PerspectiveCamera(pose.fov, ctx.aspect, 0.1, 500),
      pick: [{mesh: vox.hit, key: (id) => keys[id] || null}]
    };
  }
  function cubeRender(gl, m) {
    gl.keys.length = 0;
    m.items.forEach((it, i) => {
      if (i >= gl.vox.n) return;
      gl.vox.set(i, it.c, it.s, gl.col(it.token, it.k === undefined ? 1 : it.k));
      gl.keys[i] = it.pick || null;
    });
    gl.vox.count(m.items.length);
    gl.vox.commit();
    m.ghosts.forEach((it, i) => { if (i < gl.ghost.n) gl.ghost.set(i, it.c, it.s, gl.col(it.token, it.k)); });
    gl.ghost.count(m.ghosts.length);
    gl.ghost.commit();
    m.lines.forEach((ln, i) => { if (i < gl.lines.n) gl.lines.set(i, ln.a, ln.b, 0.012, gl.col("--stage-mute", ln.dim ? 0.3 : 0.6)); });
    gl.lines.count(m.lines.length);
    gl.lines.commit();
    const fill = (pool, list, tint) => pool.forEach((f, i) => {
      const it = list[i];
      f.visible = !!it;
      if (!it) return;
      setBox(f, it.min, it.max);
      f.material.opacity = tint(it);
    });
    fill(gl.hollows, m.hollows, (it) => (it.dim ? 0.3 : 0.95));
    fill(gl.rings, m.rings, (it) => (it.dim ? 0.3 : 0.95));
    fill(gl.trays, m.trays, (it) => (it.lit ? 1 : it.dim ? 0.2 : 0.5));
    gl.labels.sync(m.labels);
  }

  // The twin: the same model through the same orbit. Cells and specks share
  // one painter's order; outlines go over them.
  function cubeDraw(parent, m, B, P) {
    m.trays.forEach((t) => edges2(parent, t.min, t.max, P, "--at-c", {opacity: t.lit ? 1 : t.dim ? 0.2 : 0.5, width: t.lit ? 1.8 : 1.1}));
    if (m.lines.length) {
      const d = m.lines.map((ln) => {
        const a = P(ln.a), b = P(ln.b);
        return "M" + a[0].toFixed(1) + " " + a[1].toFixed(1) + "L" + b[0].toFixed(1) + " " + b[1].toFixed(1);
      }).join("");
      parent.appendChild(el("path", {d, fill: "none", stroke: css("--stage-mute"), "stroke-width": 0.8, "stroke-opacity": 0.5}));
    }
    boxes2(parent, m.items, B, P);
    m.hollows.forEach((it) => edges2(parent, it.min, it.max, P, "--stage-mute", {opacity: it.dim ? 0.3 : 0.95, width: 1.1, dash: "3 2"}));
    m.rings.forEach((it) => edges2(parent, it.min, it.max, P, "--at-pos", {opacity: it.dim ? 0.3 : 0.95, width: 1.2}));
    if (m.ghosts.length) boxes2(parent, m.ghosts.map((it) => Object.assign({}, it, {stroke: it.token})), B, P);
    labels2(parent, m.labels, P);
  }

  // The same cube with nothing behind anything: one grid per tray, in a row.
  // This is what the flat scenes draw and what the frame's strip is. `st` is
  // the cube's state; `o` places it -- {x, y, cell, gap, names, values, pick}.
  // A filled cell is a solid square, with its number printed when the cell is
  // big enough to hold eleven-unit text; a hollow one is a dashed outline; a
  // ring marks a 1 of the target. Returns {at(a, b, c) -> [cx, cy], x1, y1}.
  function trays2(parent, st, o) {
    const opt = o || {};
    const n = st.n, N = n * n, S = opt.cell || 26, gap = opt.gap === undefined ? S * 0.9 : opt.gap;
    const x0 = opt.x || 0, y0 = opt.y || 0, G = S * N;
    const picked = st.slice !== null && st.slice !== undefined;
    const numbers = opt.values !== false && S >= 16;
    const g = el("g", {});
    const at = (a, b, c) => [x0 + c * (G + gap) + b * S + S / 2, y0 + a * S + S / 2];
    for (let c = 0; c < N; c++) {
      const gx = x0 + c * (G + gap), dim = picked && c !== st.slice;
      const tg = el("g", dim ? {opacity: 0.4} : {});
      tg.appendChild(el("rect", {x: gx - 1.5, y: y0 - 1.5, width: G + 3, height: G + 3, rx: 3, fill: "none",
                                 stroke: css("--at-c"), "stroke-width": picked && c === st.slice ? 2 : 1,
                                 "stroke-opacity": picked && c === st.slice ? 1 : 0.55}));
      for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
        const idx = (a * N + b) * N + c, v = st.values[idx];
        const x = gx + b * S, y = y0 + a * S, pad = Math.max(0.8, S * 0.07);
        const chosen = !!st.cell && st.cell.a === a && st.cell.b === b && st.cell.c === c;
        const lit = chosen || !!(st.lit && st.lit[idx]);
        const cellG = el("g", opt.pick ? {"data-pick": "x:" + a + "," + b + "," + c} : {});
        cellG.appendChild(el("rect", {
          x: x + pad, y: y + pad, width: S - 2 * pad, height: S - 2 * pad, rx: Math.min(3, S / 6),
          fill: v ? css(v > 0 ? "--at-pos" : "--at-neg") : "transparent",
          stroke: v ? "none" : css("--stage-mute"),
          "stroke-opacity": st.ever && st.ever[idx] ? 0.95 : 0.3,
          "stroke-dasharray": !v && st.ever && st.ever[idx] ? "3 2" : "none", "stroke-width": 1
        }));
        if (st.rings && st.rings[idx]) {
          cellG.appendChild(el("rect", {x: x + 0.6, y: y + 0.6, width: S - 1.2, height: S - 1.2, rx: Math.min(4, S / 5),
                                        fill: "none", stroke: css("--at-pos"), "stroke-width": 1.3}));
        }
        if (st.preview && st.preview[idx]) {
          cellG.appendChild(el("rect", {x: x + pad * 2.2, y: y + pad * 2.2, width: S - 4.4 * pad, height: S - 4.4 * pad, rx: 2,
                                        fill: "none", stroke: css(st.preview[idx] > 0 ? "--at-pos" : "--at-neg"),
                                        "stroke-width": 2, "stroke-dasharray": v ? "4 2" : "none"}));
        }
        if (v && numbers) {
          cellG.appendChild(el("text", {x: x + S / 2, y: y + S / 2 + Math.min(13, S * 0.5) * 0.36, "text-anchor": "middle",
                                        "font-family": "var(--mono)", "font-size": Math.min(13, S * 0.5).toFixed(1),
                                        "font-weight": 700, fill: css("--stage")}, fmt(v, 0)));
        } else if (v < 0) {
          // Too small for a number: the minus is a stroke, so a negative cell
          // is still not told from a positive one by colour alone.
          cellG.appendChild(el("line", {x1: x + S * 0.3, y1: y + S / 2, x2: x + S * 0.7, y2: y + S / 2,
                                        stroke: css("--stage"), "stroke-width": Math.max(1.2, S * 0.14)}));
        }
        if (lit) {
          cellG.appendChild(el("rect", {x: x - 0.5, y: y - 0.5, width: S + 1, height: S + 1, rx: Math.min(4, S / 5),
                                        fill: "none", stroke: css("--stage-ink"), "stroke-width": 2}));
        }
        tg.appendChild(cellG);
      }
      if (opt.names !== false) {
        text(tg, gx + G / 2, y0 - 9, AC.name("c", n, c), {size: opt.nameSize || 12.5, anchor: "middle", colour: "--at-c",
                                                           weight: picked && c === st.slice ? 700 : 600});
      }
      g.appendChild(tg);
    }
    parent.appendChild(g);
    return {at, x1: x0 + N * G + (N - 1) * gap, y1: y0 + G, cell: S, tray: G, gap};
  }

  const AlphaTensorKit = {
    AlphaTensorScenes, css, CLS_TOKEN, fmt, num, pct, sup, sub, shapeSup, code, idx,
    el, label, numGrid, heat, bars, curve, text, arrival, chase,
    smooth, rotate,
    viewBasis, projector, withLabels, corners, boxes2, edges2, spheres2, segments2,
    colour, light, voxels, spheres, segments, glowBox, frameBox, setBox, label2d, setLabel, labels2, labelPool, palette, ease, follow,
    TRAY_GAP, TRAY_LIFT, CELL, cubePos, cubeBounds, trayLift, cubeModel, cubeBuild, cubeRender, cubeDraw, trays2
  };
  if (typeof module !== "undefined" && module.exports) module.exports = AlphaTensorKit;
  else { root.AlphaTensorKit = AlphaTensorKit; root.AlphaTensorScenes = AlphaTensorScenes; }
})(typeof window !== "undefined" ? window : globalThis);
