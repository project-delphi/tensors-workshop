// The attention stage's scene registry and its SVG drawing kit. Everything
// here turns numbers that attention-core.js computed into elements on one
// inline SVG stage; nothing here computes a number a readout quotes. That
// split is the same one voice-kit.js keeps against audio-core.js, and for
// the same reason: the arithmetic is the lesson and `npm test` pins it,
// while the drawing is what the browser check and a screenshot catch.
//
// Every picture on this stage is SVG with real <text> -- no canvas, no
// three.js -- so axe can measure contrast and a reader can select a number.
// A scene's draw() is called only when something changed (a control, or a
// scene switch), the same rule the audio stage's readout keeps: nothing here
// runs on a per-frame clock, so there is nothing to re-tween.
//
// A plain script, not a module, so the page works from file://.
(function (root) {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";

  // ------------------------------------------------------------- registry
  const scenes = [];
  const REQUIRED = ["id", "section", "copy", "init", "draw", "readout"];

  const AttentionScenes = {
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

  // ------------------------------------------------------------------ SVG
  // One small builder: a tag, an attribute bag, and children (an element, a
  // string that becomes a <text>'s content, or an array of either).
  function el(tag, attrs, children) {
    const node = document.createElementNS(SVGNS, tag);
    for (const k in (attrs || {})) {
      if (attrs[k] === undefined || attrs[k] === null) continue;
      node.setAttribute(k, attrs[k]);
    }
    const kids = children === undefined ? [] : Array.isArray(children) ? children : [children];
    for (const kid of kids) {
      if (kid === undefined || kid === null) continue;
      node.appendChild(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return node;
  }

  function text(x, y, s, opts) {
    const o = opts || {};
    return el("text", Object.assign({
      x: x, y: y, fill: o.fill || css("--stage-ink"),
      "font-family": o.mono !== false ? "var(--mono)" : "var(--sans)",
      "font-size": o.size || 13, "font-weight": o.weight || 600,
      "text-anchor": o.anchor || "middle", "dominant-baseline": o.baseline || "middle"
    }, o.attrs || {}), String(s));
  }

  // An opaque chip behind a label, the same reason the canvas stages give
  // every label one: axe cannot resolve contrast without it, and on this
  // stage a highlighted cell sits behind the number too.
  function chip(x, y, w, h, opts) {
    const o = opts || {};
    return el("rect", Object.assign({
      x: x, y: y, width: w, height: h, rx: o.rx || 3,
      fill: o.fill || css("--stage-chip"), opacity: o.opacity === undefined ? 1 : o.opacity
    }, o.attrs || {}));
  }

  // A rows x cols grid of numbers. `values[i][j]` is the number; `colourOf`
  // and `mark` (a same-shaped boolean or predicate) let a scene band a row,
  // a column or one cell without touching this function. Returns a <g> the
  // caller appends; nothing here is animated per frame.
  function numGrid(opts) {
    const {x, y, cellW, cellH, values, fmt} = opts;
    const g = el("g", {class: "num-grid", "data-grid-id": opts.id || ""});
    const f = fmt || ((v) => (Number.isInteger(v) ? String(v) : v.toFixed(2)));
    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        const cx = x + j * cellW, cy = y + i * cellH;
        const marked = opts.mark ? opts.mark(i, j) : false;
        const colour = opts.colourOf ? opts.colourOf(i, j) : css("--stage-ink");
        // `colourOf` tints the highlight chip behind a marked cell;
        // `textColourOf` tints the digits themselves on every cell (a
        // scene banding whole rows by which token they came from, say),
        // and the two are independent -- a cell can be both.
        const textColour = opts.textColourOf ? opts.textColourOf(i, j)
          : marked ? colour : css("--stage-ink");
        g.appendChild(chip(cx, cy, cellW - 2, cellH - 2, {
          fill: marked ? colour : css("--stage-chip"),
          opacity: marked ? 0.28 : 1, rx: 4
        }));
        g.appendChild(text(cx + (cellW - 2) / 2, cy + (cellH - 2) / 2, f(values[i][j], i, j), {
          fill: textColour, size: opts.size || 13
        }));
      }
    }
    if (opts.rowLabels) {
      opts.rowLabels.forEach((lab, i) => {
        g.appendChild(text(x - 14, y + i * cellH + (cellH - 2) / 2, lab,
          {fill: css("--stage-mute"), anchor: "end", size: 11}));
      });
    }
    if (opts.colLabels) {
      opts.colLabels.forEach((lab, j) => {
        g.appendChild(text(x + j * cellW + (cellW - 2) / 2, y - 10, lab,
          {fill: css("--stage-mute"), size: 11}));
      });
    }
    return g;
  }

  // A row of bars, vertical by default. `values` is a flat array; `hi` picks
  // the tallest magnitude a scene wants the scale fixed to (so a slab of
  // bars does not rescale under a reader's finger), and `mark(i)` colours one.
  function bars(opts) {
    const {x, y, w, h, values} = opts;
    const g = el("g", {class: "bars"});
    const n = values.length;
    const gap = opts.gap === undefined ? 4 : opts.gap;
    const bw = (w - gap * (n - 1)) / n;
    const hi = opts.hi || Math.max(1e-9, ...values.map((v) => Math.abs(v)));
    for (let i = 0; i < n; i++) {
      const v = values[i];
      const bh = Math.max(0, (Math.abs(v) / hi) * h);
      const bx = x + i * (bw + gap);
      const by = v >= 0 ? y - bh : y;
      const colour = opts.colourOf ? opts.colourOf(i) : css("--stage-ink");
      g.appendChild(el("rect", {
        x: bx, y: by, width: bw, height: Math.max(1, bh),
        fill: colour, opacity: opts.mark && !opts.mark(i) ? 0.4 : 1, rx: 2
      }));
      if (opts.labels) {
        g.appendChild(text(bx + bw / 2, y + 12, opts.labels[i],
          {fill: css("--stage-mute"), size: 10}));
      }
    }
    g.appendChild(el("line", {x1: x, y1: y, x2: x + w, y2: y, stroke: css("--stage-mute"), "stroke-width": 1}));
    return g;
  }

  // Arrows from a short list of ids into the rows of a table below them --
  // the tokens scene's picture of a gather: nothing is computed to draw the
  // arrow, it just points at the row the id already names.
  function arrowRow(opts) {
    const {x, y, spacing, ids, targetY, targetRowH, activeIndex} = opts;
    const g = el("g", {class: "arrow-row"});
    ids.forEach((id, i) => {
      const cx = x + i * spacing;
      const active = i === activeIndex;
      const colour = active ? (opts.activeColour || css("--stage-ink")) : css("--stage-mute");
      g.appendChild(text(cx, y, opts.labels ? String(opts.labels[i]) : String(id), {fill: colour, size: 14}));
      const toY = targetY + id * targetRowH + targetRowH / 2;
      g.appendChild(el("line", {
        x1: cx, y1: y + 10, x2: cx, y2: toY - 2,
        stroke: colour, "stroke-width": active ? 2 : 1, "stroke-dasharray": active ? "" : "3,3",
        opacity: active ? 0.95 : 0.55
      }));
    });
    return g;
  }

  const AttentionKit = {AttentionScenes, SVGNS, css, el, text, chip, numGrid, bars, arrowRow};

  if (typeof module !== "undefined" && module.exports) module.exports = AttentionKit;
  else { root.AttentionKit = AttentionKit; root.AttentionScenes = AttentionScenes; }
})(typeof window !== "undefined" ? window : globalThis);
