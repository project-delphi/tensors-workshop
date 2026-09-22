// The Tucker & CP stage's drawing kit and its scene registry. Everything here
// turns numbers factor-core.js computed into SVG on one stage; nothing here
// computes a number a readout quotes. That split is the same one
// linalg-kit.js keeps against linalg-core.js, for the same reason: the
// arithmetic is the lesson and `npm test` pins it, while the drawing is what
// the browser check and a screenshot catch.
//
// No three.js here -- every picture on this stage is SVG with real <text>,
// so axe can measure it. A plain script, not a module, so the page works
// from file://.
(function (root) {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";

  // ------------------------------------------------------------- registry
  // One file per scene, loaded in order by plain <script src> lines. The
  // page reads the registry back in that order, so a new scene is: one file
  // here, one <script src> line, one <section class="step"> in the page, and
  // one repo.widgets line.
  const scenes = [];
  const REQUIRED = ["id", "section", "copy", "init", "draw", "readout"];

  const FactorScenes = {
    register(scene) {
      for (const k of REQUIRED) {
        if (!(k in scene)) throw new Error("scene " + (scene.id || "?") + " lacks " + k);
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
    parent.appendChild(t);
    const box = {w: text.length * size * 0.62 + pad * 2, h: size + pad * 1.4};
    const ax = o.anchor === "middle" ? x - box.w / 2 : o.anchor === "end" ? x - box.w + pad : x - pad;
    const ay = (o.baseline === "middle" ? y - box.h / 2 : y - size) - pad * 0.2;
    const rect = el("rect", {
      x: ax, y: ay, width: box.w, height: box.h, rx: 3,
      fill: css("--stage-chip")
    });
    g.appendChild(rect);
    g.appendChild(t);
    parent.appendChild(g);
    return g;
  }

  // A grid of numbers -- a matrix, a slice, an unfolding -- with the two
  // bracket strokes real strokes rather than glyphs, so it scales cleanly.
  // `opts.at(i, j)` -> the cell's colour token or null; `opts.digits`
  // defaults to 0 (every count on this stage is an integer). Returns
  // {x0, y0, x1, y1, cellW, cellH} so a caller can address a cell later
  // (the hour bars sit under column 0 of a factor grid, say).
  //
  // Every grid on this stage is sized by a slider -- a core is r2 x r0*r1,
  // a factor is 24 x r -- and a grid laid out past the viewBox is not
  // clipped and not reported, it is simply not drawn. So `opts.maxW` and
  // `opts.maxH` are the box the grid must stay inside, and the cell shrinks
  // to fit it. Below the size at which a number is still a number, the grid
  // stops printing them and shades each cell by |value| instead: a 20 x 20
  // core is not a table anyone reads, and drawing it as one at 5px would be
  // a picture that only looks like information. TEXT_FLOOR is where that
  // switch happens, and `heat` in the return says which one was drawn.
  const TEXT_FLOOR = 6.5;
  function numGrid(parent, M, opts) {
    const o = opts || {};
    const rows = M.length, cols = M[0].length;
    const digits = o.digits === undefined ? 0 : o.digits;
    let cellW = o.cellW || (28 + digits * 7);
    let cellH = o.cellH || 20;
    if (o.maxW) cellW = Math.min(cellW, o.maxW / cols);
    if (o.maxH) cellH = Math.min(cellH, o.maxH / rows);
    // The widest string the grid will actually print, so a narrow cell
    // shrinks the type rather than letting two numbers run together.
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
            // A HOSVD core puts almost all of itself in one corner entry, so
            // a linear ramp off that peak would leave every other cell at
            // the floor and draw an empty box. The 0.4 power is what makes
            // the corner's concentration visible as a shape.
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

  // A bar chart, values against a shared zero, positive up. `opts.at(i)`
  // colours one bar; `opts.lit(i)` widens it a touch to mark the hovered or
  // selected one.
  function bars(parent, values, opts) {
    const o = opts || {};
    const x0 = o.x || 0, y0 = o.y || 0, w = o.w || 240, h = o.h || 80;
    const n = values.length;
    const gap = o.gap === undefined ? 1.5 : o.gap;
    const bw = (w - gap * (n - 1)) / n;
    const max = o.max === undefined ? Math.max(1e-9, ...values.map((v) => Math.abs(v))) : o.max;
    const g = el("g", {});
    g.appendChild(el("line", {
      x1: x0, y1: y0 + h, x2: x0 + w, y2: y0 + h, stroke: css("--stage-mute"), "stroke-width": 1
    }));
    values.forEach((v, i) => {
      const bh = Math.max(0.5, (Math.abs(v) / max) * h);
      const bx = x0 + i * (bw + gap);
      const tok = o.at ? o.at(i) : "--fa-r";
      const lit = o.lit ? o.lit(i) : false;
      g.appendChild(el("rect", {
        x: bx - (lit ? 0.6 : 0), y: v >= 0 ? y0 + h - bh : y0 + h,
        width: bw + (lit ? 1.2 : 0), height: bh,
        fill: css(tok), "fill-opacity": lit ? 1 : 0.75
      }));
    });
    parent.appendChild(g);
    return {x0, y0, w, h, bw, gap, max};
  }

  // An isometric stack of `n` thin cards, one per slice along a third axis
  // (the tensor scene's 24 hours). `lit` raises and brightens one card so the
  // slice on the number grid has a picture beside it.
  function slabStack(parent, n, lit, opts) {
    const o = opts || {};
    const x0 = o.x || 0, y0 = o.y || 0, w = o.w || 90, h = o.h || 46;
    const dx = o.dx === undefined ? 3.2 : o.dx, dy = o.dy === undefined ? 2.0 : o.dy;
    const g = el("g", {});
    for (let i = 0; i < n; i++) {
      const raise = i === lit ? -7 : 0;
      const ox = x0 + i * dx, oy = y0 - i * dy + raise;
      const pts = [
        [ox, oy], [ox + w, oy], [ox + w * 0.86, oy + h * 0.4], [ox - w * 0.14, oy + h * 0.4]
      ].map((p) => p.join(",")).join(" ");
      g.appendChild(el("polygon", {
        points: pts, fill: css(i === lit ? "--fa-t" : "--stage-mute"),
        "fill-opacity": i === lit ? 0.85 : 0.14 + 0.1 * (i / n),
        stroke: css(i === lit ? "--fa-t" : "--stage-mute"),
        "stroke-opacity": i === lit ? 1 : 0.3, "stroke-width": i === lit ? 1.4 : 0.6
      }));
    }
    parent.appendChild(g);
    return {x0, y0, w, h, dx, dy};
  }

  const FactorKit = {FactorScenes, css, fmt, el, label, numGrid, bars, slabStack};
  if (typeof module !== "undefined" && module.exports) module.exports = FactorKit;
  else { root.FactorKit = FactorKit; root.FactorScenes = FactorScenes; }
})(typeof window !== "undefined" ? window : this);
