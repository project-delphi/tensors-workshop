// The drawing kit under the projection & SVD stage: the things every scene
// draws and neither path should draw twice. Arrows, labels, the bracketed
// column vectors, the axes, the glass -- each once for three.js and once for
// the flat SVG, side by side, so the two render paths take their furniture
// from the same place and cannot drift apart.
//
// Drawing, not arithmetic: nothing here is pinned by `npm test`, because
// everything here is visible in a screenshot and the browser check sees it.
// The arithmetic is linalg-core.js. The scenes are linalg-scenes/*.js.
//
// A plain script, like the core, so it works from file://. It reads
// window.THREE lazily, at call time, because the vendored module arrives after
// this file and may never arrive at all -- the flat half of the kit must work
// without it.
(function (root) {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const SUB = ["₁", "₂", "₃"];
  const T3 = () => root.THREE;

  const css = (name) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // A CSS colour token as a three.js colour. The palette lives in the page's
  // CSS and nowhere else; a hex typed in a scene would be a second palette.
  const colour = (token) => new (T3().Color)(css(token));

  const vec = (p) => new (T3().Vector3)(p[0], p[1], p[2] || 0);

  // ─── the numbers on a label ───────────────────────────────────────────────

  // Fixed digits, minus sign as a real minus, and -0.000 never shown: a bracket
  // that reads "-0.000" beside one that reads "0.000" claims a difference the
  // arithmetic does not have.
  function fmt(v, digits) {
    const d = digits === undefined ? 2 : digits;
    if (!isFinite(v)) return Number.isNaN(v) ? "NaN" : (v > 0 ? "∞" : "−∞");
    let s = Math.abs(v).toFixed(d);
    if (Number(s) === 0) return s;
    return (v < 0 ? "−" : "") + s;
  }

  // ─── three.js ─────────────────────────────────────────────────────────────

  // Shaft plus head along +Y, then turned to face `dir`. Emissive, so the
  // bloom pass has something above its threshold to find.
  function makeArrow(dir, len, token, radius) {
    const THREE = T3();
    const g = new THREE.Group();
    const r = radius || 0.07;
    const c = colour(token);
    const mat = new THREE.MeshStandardMaterial({
      color: c, emissive: c, emissiveIntensity: 0.9, roughness: 0.35
    });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 16), mat);
    const head = new THREE.Mesh(new THREE.ConeGeometry(r * 2.6, 1, 20), mat);
    g.add(shaft, head);
    g.userData = {mat: mat, r: r};
    setArrow(g, dir, len);
    return g;
  }

  // One place decides how long the head is and where the shaft stops, so an
  // arrow that changes length cannot drift apart.
  function setArrow(group, dir, len) {
    const THREE = T3();
    const d = vec(dir);
    if (d.lengthSq() === 0 || !(len > 1e-9)) { group.visible = false; return; }
    group.visible = true;
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    const head = Math.min(0.5, len * 0.28);
    const shaft = group.children[0], tip = group.children[1];
    shaft.scale.y = Math.max(1e-4, len - head);
    shaft.position.y = (len - head) / 2;
    tip.scale.y = head;
    tip.position.y = len - head / 2;
  }

  // Lit or not. Everything the reader has found glows harder; the rest sits at
  // the resting intensity the bloom threshold was tuned against.
  function lit(group, on) {
    group.userData.mat.emissiveIntensity = on ? 2.2 : 0.9;
  }

  // A polyline, optionally dashed. Dashes need the line distances recomputed
  // whenever the points move, and this is the one place that remembers to.
  function makeLine(points, token, opts) {
    const THREE = T3();
    const o = opts || {};
    const geo = new THREE.BufferGeometry().setFromPoints(points.map(vec));
    const mat = o.dashed
      ? new THREE.LineDashedMaterial({color: colour(token), dashSize: o.dash || 0.22,
                                      gapSize: o.gap || 0.16, transparent: true,
                                      opacity: o.opacity === undefined ? 1 : o.opacity})
      : new THREE.LineBasicMaterial({color: colour(token), transparent: true,
                                     opacity: o.opacity === undefined ? 1 : o.opacity});
    const line = new THREE.Line(geo, mat);
    if (o.dashed) line.computeLineDistances();
    line.userData.dashed = !!o.dashed;
    return line;
  }

  function setLine(line, points) {
    line.geometry.setFromPoints(points.map(vec));
    if (line.userData.dashed) line.computeLineDistances();
  }

  // A glowing tube rather than a GL line: WebGL draws every line one pixel
  // wide whatever `linewidth` says, and the bloom pass cannot find a pixel.
  function makeTube(a, b, token, radius) {
    const THREE = T3();
    const c = colour(token);
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius || 0.04, radius || 0.04, 1, 12),
      new THREE.MeshStandardMaterial({color: c, emissive: c, emissiveIntensity: 1.6, roughness: 0.4}));
    mesh.userData.mat = mesh.material;
    setTube(mesh, a, b);
    return mesh;
  }

  function setTube(mesh, a, b) {
    const THREE = T3();
    const pa = vec(a), pb = vec(b);
    const d = pb.clone().sub(pa);
    const len = d.length();
    if (len < 1e-9) { mesh.visible = false; return; }
    mesh.visible = true;
    mesh.position.copy(pa).add(pb).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    mesh.scale.set(1, len, 1);
  }

  // Frosted rather than fully transmissive: at transmission 1 with no
  // environment to refract there is nothing on the far side of the glass, and
  // the plane renders as very nearly nothing. This keeps the glass reading and
  // still lets what is behind it through.
  function glass(token, opts) {
    const THREE = T3();
    const o = opts || {};
    return new THREE.MeshPhysicalMaterial({
      color: colour(token), transmission: 0.45, roughness: 0.18, thickness: 0.4,
      transparent: true, opacity: o.opacity === undefined ? 0.42 : o.opacity,
      side: THREE.DoubleSide, metalness: 0, ior: 1.3, depthWrite: false
    });
  }

  // A quad from four corners, as a mesh in the given material.
  function makeQuad(corners, material) {
    const THREE = T3();
    const q = corners;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(
      [].concat(q[0], q[1], q[2], q[0], q[2], q[3]), 3));
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, material);
  }

  // ─── a ruled plane ────────────────────────────────────────────────────────
  //
  // Every plane on the stage is drawn this way: a quad on a basis (u, v)
  // through `at`, ruled every `step` along each direction, so the surface
  // reads as a surface from every angle and the unit is visible on it -- a
  // Manim NumberPlane, which is step 1's look, kept here so the other steps'
  // planes and floors take it rather than each drawing a bare sheet. `spec`
  // is {at, u, v, a: [a0, a1], b: [b0, b1], step}; the rulings start at a0
  // and b0, so a spec whose ranges are whole numbers rules through `at`.

  function planeLines(spec) {
    const at = (a, b) => [
      spec.at[0] + spec.u[0] * a + spec.v[0] * b,
      spec.at[1] + spec.u[1] * a + spec.v[1] * b,
      spec.at[2] + spec.u[2] * a + spec.v[2] * b];
    const [a0, a1] = spec.a, [b0, b1] = spec.b, st = spec.step || 1;
    const corners = [at(a0, b0), at(a1, b0), at(a1, b1), at(a0, b1)];
    const lines = [];
    for (let a = a0; a <= a1 + 1e-9; a += st) lines.push([at(a, b0), at(a, b1)]);
    for (let b = b0; b <= b1 + 1e-9; b += st) lines.push([at(a0, b), at(a1, b)]);
    return {corners: corners, lines: lines};
  }

  // The sheet in `material` (glass, or a faint flat fill for a floor) and its
  // rulings in `lineToken`, as one group. `opts.lineOpacity` defaults to the
  // 0.3 step 1 was tuned at.
  function makeGridPlane(spec, material, lineToken, opts) {
    const THREE = T3();
    const o = opts || {};
    const pl = planeLines(spec);
    const g = new THREE.Group();
    material.polygonOffset = true;
    material.polygonOffsetFactor = 1;
    material.polygonOffsetUnits = 1;
    g.add(makeQuad(pl.corners, material));
    const pts = [];
    for (const [a, b] of pl.lines) pts.push(vec(a), vec(b));
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({color: colour(lineToken), transparent: true,
                                   opacity: o.lineOpacity === undefined ? 0.5 : o.lineOpacity})));
    g.userData = {mat: material};
    return g;
  }

  // The lights every scene shares: a soft ambient and one key from above and
  // to the right, so the glass has a highlight and the arrows have a shaded
  // side. Black ground, so the fill is gentler than it was on navy.
  function light(scene) {
    const THREE = T3();
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(8, 10, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-6, 2, -5);
    scene.add(fill);
  }

  // ─── the axes ─────────────────────────────────────────────────────────────
  //
  // Three thin lines through the origin, a tick every unit, a small cone at
  // *both* ends, and an italic letter past the positive end -- the furniture of
  // a Manim ThreeDAxes, which is the look this stage takes. `planar` draws x
  // and y only, for the portal's two flat spaces. The same numbers drive
  // flatAxes() below, so a reader who loses WebGL loses the shading and keeps
  // the ruler.

  const AXES = {tick: 0.09, cone: 0.11, coneLen: 0.3, opacity: 0.55};

  function makeAxes(extent, opts) {
    const THREE = T3();
    const o = opts || {};
    const g = new THREE.Group();
    const c = colour("--stage-mute");
    const dirs = o.planar ? [[1, 0, 0], [0, 1, 0]] : [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    // The direction each axis's ticks are drawn in: something perpendicular
    // that reads from the stage's usual elevation.
    const across = o.planar ? [[0, 1, 0], [1, 0, 0]] : [[0, 0, 1], [1, 0, 0], [1, 0, 0]];
    const names = o.names || (o.planar ? ["x", "y"] : ["x", "y", "z"]);
    const pts = [];
    const ext = Array.isArray(extent) ? extent : dirs.map(() => extent);
    dirs.forEach((d, i) => {
      const e = ext[i];
      pts.push(vec([-d[0] * e, -d[1] * e, -d[2] * e]), vec([d[0] * e, d[1] * e, d[2] * e]));
      const a = across[i];
      for (let k = -Math.floor(e); k <= Math.floor(e); k++) {
        if (k === 0) continue;
        pts.push(vec([d[0] * k - a[0] * AXES.tick, d[1] * k - a[1] * AXES.tick, d[2] * k - a[2] * AXES.tick]),
                 vec([d[0] * k + a[0] * AXES.tick, d[1] * k + a[1] * AXES.tick, d[2] * k + a[2] * AXES.tick]));
      }
      // A cone at each end, pointing outward.
      for (const sgn of [1, -1]) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(AXES.cone, AXES.coneLen, 14),
          new THREE.MeshBasicMaterial({color: c, transparent: true, opacity: AXES.opacity + 0.2}));
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vec(d).multiplyScalar(sgn));
        cone.position.copy(vec(d)).multiplyScalar(sgn * e);
        g.add(cone);
      }
      const lab = makeLabel(names[i], "--stage-ink");
      lab.position.copy(vec(d)).multiplyScalar(e + 0.45);
      g.add(lab);
    });
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({color: c, transparent: true, opacity: AXES.opacity})));
    return g;
  }

  // ─── labels ───────────────────────────────────────────────────────────────
  //
  // DOM over the stage in both render paths, so axe sees them and one set of
  // contrast rules serves both. The chip is opaque -- black on the black
  // stage, so it reads as no chip at all -- because axe cannot resolve
  // contrast against a see-through background over a <canvas> and reports
  // "incomplete", which is neither a pass nor a check.

  function labelNode(text, token) {
    const d = document.createElement("span");
    d.className = "lab";
    d.textContent = text;
    d.style.color = css(token);
    return d;
  }

  function makeLabel(text, token) {
    return new (root.THREE_ADDONS.CSS2DObject)(labelNode(text, token));
  }

  // A column vector between brackets, the way the screenshot this look is
  // taken from writes "Input" and "Output" beside its arrows. The brackets are
  // CSS borders with corner ticks rather than the ⎡⎢⎣ glyphs, which no two
  // fonts draw at the same height. `caption` sits above the column.
  function matrixNode(values, token, caption, digits) {
    const d = document.createElement("span");
    d.className = "lab mat-lab";
    d.style.color = css(token);
    if (caption) {
      const cap = document.createElement("span");
      cap.className = "mat-cap";
      cap.textContent = caption;
      d.appendChild(cap);
    }
    const box = document.createElement("span");
    box.className = "mat-box";
    const col = document.createElement("span");
    col.className = "mat-col";
    box.appendChild(col);
    d.appendChild(box);
    d._cells = [];
    d._last = null;
    setMatrixNode(d, values, digits);
    return d;
  }

  // Rewrites the cells only when the text changes: this is called sixty times
  // a second by a scene whose vector is moving, and rewriting a DOM node that
  // did not change is how a label flickers.
  function setMatrixNode(node, values, digits) {
    const strs = values.map((v) => fmt(v, digits));
    const key = strs.join("|");
    if (node._last === key) return;
    node._last = key;
    const col = node.querySelector(".mat-col");
    while (node._cells.length < strs.length) {
      const c = document.createElement("span");
      col.appendChild(c);
      node._cells.push(c);
    }
    while (node._cells.length > strs.length) col.removeChild(node._cells.pop());
    strs.forEach((s, i) => { node._cells[i].textContent = s; });
  }

  function makeMatrixLabel(values, token, caption, digits) {
    const node = matrixNode(values, token, caption, digits);
    const obj = new (root.THREE_ADDONS.CSS2DObject)(node);
    obj.set = (v) => setMatrixNode(node, v, digits);
    return obj;
  }

  // ─── the flat path ────────────────────────────────────────────────────────

  function el(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // Orthographic projection of a world point through a screen basis B
  // ({right, up, target}), at scale s, centred on (cx, cy).
  function iso(p, s, cx, cy, B) {
    const q = [p[0], p[1], p[2] || 0];
    const d = [q[0] - B.target[0], q[1] - B.target[1], q[2] - B.target[2]];
    const dt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    return [cx + dt(d, B.right) * s, cy - dt(d, B.up) * s];
  }

  function arrow2(from, to, token, width, dashed) {
    const g = el("g", {});
    const c = css(token);
    const dx = to[0] - from[0], dy = to[1] - from[1];
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const head = Math.min(13, len * 0.3);
    const base = [to[0] - ux * head, to[1] - uy * head];
    const line = el("line", {
      x1: from[0], y1: from[1], x2: base[0], y2: base[1],
      stroke: c, "stroke-width": width, "stroke-linecap": "round"
    });
    if (dashed) line.setAttribute("stroke-dasharray", "7 6");
    g.appendChild(line);
    g.appendChild(el("polygon", {
      points: [
        `${to[0]},${to[1]}`,
        `${base[0] - uy * head * 0.42},${base[1] + ux * head * 0.42}`,
        `${base[0] + uy * head * 0.42},${base[1] - ux * head * 0.42}`
      ].join(" "),
      fill: c
    }));
    return g;
  }

  function line2(a, b, token, width, opts) {
    const o = opts || {};
    const l = el("line", {x1: a[0], y1: a[1], x2: b[0], y2: b[1],
      stroke: css(token), "stroke-width": width, "stroke-linecap": "round",
      "stroke-opacity": o.opacity === undefined ? 1 : o.opacity});
    if (o.dashed) l.setAttribute("stroke-dasharray", "7 6");
    return l;
  }

  function poly2(points, token, opts) {
    const o = opts || {};
    return el(o.open ? "polyline" : "polygon", {
      points: points.map((q) => q.join(",")).join(" "),
      fill: o.fill === undefined ? "none" : css(o.fill),
      "fill-opacity": o.fillOpacity === undefined ? 0.13 : o.fillOpacity,
      stroke: css(token), "stroke-width": o.width || 1.5,
      "stroke-opacity": o.opacity === undefined ? 0.55 : o.opacity
    });
  }

  // The flat twin of makeGridPlane(): the sheet as a filled polygon and its
  // rulings as thin lines, projected through P. `opts` are poly2's, plus
  // lineToken and lineOpacity.
  function gridPlane2(P, spec, token, opts) {
    const o = opts || {};
    const pl = planeLines(spec);
    const g = el("g", {});
    g.appendChild(poly2(pl.corners.map(P), token, o));
    for (const [a, b] of pl.lines) {
      g.appendChild(line2(P(a), P(b), o.lineToken || token, 0.8,
        {opacity: o.lineOpacity === undefined ? 0.5 : o.lineOpacity}));
    }
    return g;
  }

  // The same axes makeAxes() lays down, projected through P. Returns the SVG
  // group to append and the three letters to hand to placeLabels().
  function flatAxes(P, extent, opts) {
    const o = opts || {};
    const g = el("g", {stroke: css("--stage-mute"), "stroke-opacity": String(AXES.opacity),
                       "stroke-width": "1", fill: css("--stage-mute"),
                       "fill-opacity": String(AXES.opacity + 0.2)});
    const dirs = o.planar ? [[1, 0, 0], [0, 1, 0]] : [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const across = o.planar ? [[0, 1, 0], [1, 0, 0]] : [[0, 0, 1], [1, 0, 0], [1, 0, 0]];
    const names = o.names || (o.planar ? ["x", "y"] : ["x", "y", "z"]);
    const ext = Array.isArray(extent) ? extent : dirs.map(() => extent);
    const labels = [];
    const sc = (v, k) => [v[0] * k, v[1] * k, v[2] * k];
    const ad = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    dirs.forEach((d, i) => {
      const e = ext[i];
      const p0 = P(sc(d, -e)), p1 = P(sc(d, e));
      g.appendChild(el("line", {x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1]}));
      const a = across[i];
      for (let k = -Math.floor(e); k <= Math.floor(e); k++) {
        if (k === 0) continue;
        const t0 = P(ad(sc(d, k), sc(a, -AXES.tick))), t1 = P(ad(sc(d, k), sc(a, AXES.tick)));
        g.appendChild(el("line", {x1: t0[0], y1: t0[1], x2: t1[0], y2: t1[1]}));
      }
      for (const sgn of [1, -1]) {
        const tip = P(sc(d, sgn * (e + AXES.coneLen / 2)));
        const base = P(sc(d, sgn * (e - AXES.coneLen / 2)));
        const ux = tip[0] - base[0], uy = tip[1] - base[1];
        const len = Math.hypot(ux, uy) || 1;
        const w = 4.5;
        g.appendChild(el("polygon", {points: [
          `${tip[0]},${tip[1]}`,
          `${base[0] - uy / len * w},${base[1] + ux / len * w}`,
          `${base[0] + uy / len * w},${base[1] - ux / len * w}`].join(" "), stroke: "none"}));
      }
      labels.push({at: P(sc(d, e + 0.45)), text: names[i], colour: "--stage-ink"});
    });
    return {group: g, labels: labels};
  }

  // The labels are DOM over the stage. `list` items are {at: [x, y] in the
  // SVG's viewBox, colour, and either text or matrix: {values, caption,
  // digits}}. The SVG is xMidYMid meet, so the letterboxing is undone here.
  function placeLabels(list, stage, flat, holder) {
    const box = stage.getBoundingClientRect();
    const vb = flat.viewBox.baseVal;
    const s = Math.min(box.width / vb.width, box.height / vb.height);
    const ox = (box.width - vb.width * s) / 2;
    const oy = (box.height - vb.height * s) / 2;
    holder.innerHTML = "";
    for (const l of list) {
      const d = l.matrix
        ? matrixNode(l.matrix.values, l.colour, l.matrix.caption, l.matrix.digits)
        : labelNode(l.text, l.colour);
      d.style.left = (ox + l.at[0] * s) + "px";
      d.style.top = (oy + l.at[1] * s) + "px";
      holder.appendChild(d);
    }
  }

  // ─── a matrix in the prose column ─────────────────────────────────────────
  //
  // Inline SVG rather than a table: brackets as two paths, entries as real
  // <text>, so a 3 x 2 with brackets scales into a narrow card instead of
  // forcing the page wider, axe reads the numbers' contrast honestly, and the
  // <title> the page already put in the SVG carries the matrix to a screen
  // reader in whichever language the page is in.
  function drawMatrixSvg(svg, M, shape, digits) {
    const keep = svg.querySelector("title");
    svg.innerHTML = "";
    if (keep) svg.appendChild(keep);
    const d = digits === undefined ? 4 : digits;
    const rows = M.length, cols = M[0].length;
    const colW = 24 + d * 9.5, rowH = 22;
    const w = 20 + cols * colW, h = 8 + rows * rowH + 8;
    svg.setAttribute("viewBox", `0 0 ${w + 60} ${h}`);
    const put = (tag, attrs, text) => {
      const e = el(tag, attrs, text);
      svg.appendChild(e);
      return e;
    };
    put("path", {d: `M 12 8 L 6 8 L 6 ${h - 8} L 12 ${h - 8}`});
    put("path", {d: `M ${w - 2} 8 L ${w + 4} 8 L ${w + 4} ${h - 8} L ${w - 2} ${h - 8}`});
    M.forEach((row, i) => row.forEach((v, j) => {
      put("text", {x: 20 + j * colW, y: 27 + i * rowH}, fmt(v, d));
    }));
    if (shape) put("text", {x: w + 16, y: h / 2 + 4, "font-style": "italic"}, shape);
  }


  // ─── shapes the redesign added ────────────────────────────────────────────
  //
  // Each once for three.js and once for the SVG, like everything above. The
  // right angle, the ghost sphere, the ellipsoid, a bundle of tubes, a fading
  // trail -- and the one non-drawing helper, bindSlider, which is what ties a
  // control to the thing it moves.

  // The right angle at `corner`, between unit directions a and b: two short
  // tubes rather than a GL line, so the bloom pass can see it. `set` moves it.
  function makeAngleMark(corner, a, b, size, token) {
    const THREE = T3();
    const g = new THREE.Group();
    const t1 = makeTube([0, 0, 0], [0, 0, 1], token, 0.018);
    const t2 = makeTube([0, 0, 0], [0, 0, 1], token, 0.018);
    g.add(t1, t2);
    g.userData = {mat: t1.material, t1: t1, t2: t2};
    setAngleMark(g, corner, a, b, size);
    return g;
  }
  function setAngleMark(g, corner, a, b, size) {
    const ua = unit3(a), ub = unit3(b);
    const pa = [corner[0] + ua[0] * size, corner[1] + ua[1] * size, corner[2] + ua[2] * size];
    const pb = [corner[0] + ub[0] * size, corner[1] + ub[1] * size, corner[2] + ub[2] * size];
    const pc = [pa[0] + ub[0] * size, pa[1] + ub[1] * size, pa[2] + ub[2] * size];
    setTube(g.userData.t1, pa, pc);
    setTube(g.userData.t2, pb, pc);
  }
  function angleMark2(P, corner, a, b, size, token) {
    const ua = unit3(a), ub = unit3(b);
    const pa = [corner[0] + ua[0] * size, corner[1] + ua[1] * size, corner[2] + ua[2] * size];
    const pb = [corner[0] + ub[0] * size, corner[1] + ub[1] * size, corner[2] + ub[2] * size];
    const pc = [pa[0] + ub[0] * size, pa[1] + ub[1] * size, pa[2] + ub[2] * size];
    return poly2([P(pa), P(pc), P(pb)], token, {open: true, width: 1.8, opacity: 1});
  }
  const unit3 = (v) => {
    const n = Math.hypot(v[0], v[1], v[2] || 0) || 1;
    return [v[0] / n, v[1] / n, (v[2] || 0) / n];
  };

  // A ghost sphere: three great circles, faint, for a shape to be compared
  // against. The ellipsoid below is this sphere pushed through A.
  const CIRCLE_N = 96;
  function circlePts(i, j, r) {
    const pts = [];
    for (let k = 0; k <= CIRCLE_N; k++) {
      const t = (k / CIRCLE_N) * Math.PI * 2;
      const p = [0, 0, 0];
      p[i] = Math.cos(t) * r;
      p[j] = Math.sin(t) * r;
      pts.push(p);
    }
    return pts;
  }
  function makeWireSphere(r, token, opacity) {
    const THREE = T3();
    const g = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({color: colour(token), transparent: true,
                                             opacity: opacity === undefined ? 0.35 : opacity});
    for (const [i, j] of [[0, 1], [1, 2], [0, 2]]) {
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(circlePts(i, j, r).map(vec)), mat));
    }
    return g;
  }
  function wireSphere2(P, r, token, opacity) {
    const g = el("g", {});
    for (const [i, j] of [[0, 1], [1, 2], [0, 2]]) {
      g.appendChild(poly2(circlePts(i, j, r).map(P), token,
        {open: true, width: 1, opacity: opacity === undefined ? 0.35 : opacity}));
    }
    return g;
  }

  // The unit sphere through a 3 x 3: a sphere mesh whose matrix *is* A, so
  // the GPU does the map and a slider that eases A eases the shape. Glass,
  // so the axes inside it stay visible.
  function makeEllipsoid(token, opts) {
    const THREE = T3();
    const o = opts || {};
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32),
      glass(token, {opacity: o.opacity === undefined ? 0.3 : o.opacity}));
    mesh.matrixAutoUpdate = false;
    mesh.userData.mat = mesh.material;
    return mesh;
  }
  function setEllipsoid(mesh, A) {
    mesh.matrix.set(A[0][0], A[0][1], A[0][2], 0,
                    A[1][0], A[1][1], A[1][2], 0,
                    A[2][0], A[2][1], A[2][2], 0,
                    0, 0, 0, 1);
    mesh.matrixWorldNeedsUpdate = true;
  }
  // The flat twin: the three great circles of the sphere, each pushed through
  // A -- three ellipses that outline the ellipsoid from any angle.
  function ellipsoid2(P, A, token, opts) {
    const o = opts || {};
    const g = el("g", {});
    const ap = (p) => [A[0][0] * p[0] + A[0][1] * p[1] + A[0][2] * p[2],
                       A[1][0] * p[0] + A[1][1] * p[1] + A[1][2] * p[2],
                       A[2][0] * p[0] + A[2][1] * p[1] + A[2][2] * p[2]];
    for (const [i, j] of [[0, 1], [1, 2], [0, 2]]) {
      g.appendChild(poly2(circlePts(i, j, 1).map((p) => P(ap(p))), token,
        {fill: o.fill === undefined ? token : o.fill, fillOpacity: 0.07, width: 1.6, opacity: 0.85}));
    }
    return g;
  }

  // A bundle of tubes -- the edges of a house, a walk -- that moves as one.
  function makeTubes(segments, token, radius) {
    const THREE = T3();
    const g = new THREE.Group();
    for (const [a, b] of segments) g.add(makeTube(a, b, token, radius));
    g.userData = {mat: g.children.length ? g.children[0].material : null};
    return g;
  }
  function setTubes(g, segments) {
    segments.forEach(([a, b], i) => { if (g.children[i]) setTube(g.children[i], a, b); });
  }
  function lines2(P, segments, token, width, opts) {
    const g = el("g", {});
    for (const [a, b] of segments) g.appendChild(line2(P(a), P(b), token, width, opts));
    return g;
  }

  // A trail: the last n places a point has been, fading toward the stage's
  // black behind it. Vertex colours rather than opacity, because on a black
  // stage a darker colour *is* a fainter one and the bloom pass reads it so.
  function makeTrail(n, token) {
    const THREE = T3();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const cols = new Float32Array(n * 3);
    const c = colour(token);
    for (let i = 0; i < n; i++) {
      const k = Math.pow(i / (n - 1), 1.6);
      cols[3 * i] = c.r * k; cols[3 * i + 1] = c.g * k; cols[3 * i + 2] = c.b * k;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({vertexColors: true}));
    line.userData = {n: n, pts: [], token: token};
    line.visible = false;
    return line;
  }
  function pushTrail(line, p) {
    const d = line.userData;
    const q = [p[0], p[1], p[2] || 0];
    const last = d.pts[d.pts.length - 1];
    if (last && Math.hypot(last[0] - q[0], last[1] - q[1], last[2] - q[2]) < 1e-4) return;
    d.pts.push(q);
    if (d.pts.length > d.n) d.pts.shift();
    const pos = line.geometry.attributes.position;
    // Fewer points than slots: repeat the oldest so the dark end sits still.
    for (let i = 0; i < d.n; i++) {
      const src = d.pts[Math.max(0, i - (d.n - d.pts.length))];
      pos.setXYZ(i, src[0], src[1], src[2]);
    }
    pos.needsUpdate = true;
    line.visible = d.pts.length > 1;
  }
  function clearTrail(line) { line.userData.pts = []; line.visible = false; }
  function trail2(P, pts, token, width) {
    const g = el("g", {});
    const n = pts.length;
    for (let i = 1; i < n; i++) {
      g.appendChild(line2(P(pts[i - 1]), P(pts[i]), token, width || 2.5,
        {opacity: 0.1 + 0.9 * Math.pow(i / (n - 1), 1.6)}));
    }
    return g;
  }

  // ─── a control, tied to the thing it moves ────────────────────────────────
  //
  // Every slider on the page goes through here. The track takes the colour of
  // the vector it moves, the label shows the value as it changes, the object
  // brightens while the reader is dragging and rests again 450 ms after, and
  // the value reaches the scene through `onInput`, which is where the scene
  // retargets its tween. `lit()` is a getter because the GL objects exist only
  // after build(), and may never exist at all on the flat path.
  function bindSlider(ctx, id, opts) {
    const o = opts || {};
    const input = ctx.$(id);
    const label = ctx.$(id + "-label");
    if (!input) return null;
    if (o.token) input.style.accentColor = css(o.token);
    let live = null;
    if (label && o.format) {
      live = document.createElement("span");
      live.className = "live";
      label.appendChild(live);
      live.textContent = o.format(Number(input.value));
    }
    let timer = 0;
    const glow = (on) => {
      if (!o.lit) return;
      const objs = [].concat(o.lit() || []);
      for (const obj of objs) if (obj && obj.userData && obj.userData.mat) lit(obj, on);
    };
    input.addEventListener("input", (e) => {
      const v = Number(e.target.value);
      if (live) live.textContent = o.format(v);
      glow(true);
      clearTimeout(timer);
      timer = setTimeout(() => glow(false), 450);
      if (o.onInput) o.onInput(v);
      ctx.changed();
    });
    // The control's value is the scene's truth from the start: a browser
    // that restores a slider on reload restores the state with it.
    if (o.onInput) o.onInput(Number(input.value));
    return {
      input: input,
      // A scene that moves the slider itself (an arrival, a reset) says so
      // here, so the label agrees with the track.
      set: (v) => { input.value = String(v); if (live) live.textContent = o.format(Number(input.value)); }
    };
  }

  const LinalgKit = {
    drawMatrixSvg,
    SUB, css, colour, vec, fmt,
    makeArrow, setArrow, lit, makeLine, setLine, makeTube, setTube,
    glass, makeQuad, planeLines, makeGridPlane, gridPlane2, light, makeAxes, AXES,
    labelNode, makeLabel, matrixNode, setMatrixNode, makeMatrixLabel,
    el, iso, arrow2, line2, poly2, flatAxes, placeLabels,
    makeAngleMark, setAngleMark, angleMark2,
    makeWireSphere, wireSphere2, makeEllipsoid, setEllipsoid, ellipsoid2,
    makeTubes, setTubes, lines2,
    makeTrail, pushTrail, clearTrail, trail2,
    bindSlider
  };
  root.LinalgKit = LinalgKit;

  // ─── the scene registry ───────────────────────────────────────────────────
  //
  // Each file under linalg-scenes/ registers one scene here as it loads; the
  // page reads them back in that order, which is the order of the steps. A
  // step is therefore one file, one <section> and one <script src> line -- and
  // the contract every scene keeps is written once, in linalg-scenes/README.md,
  // rather than once per scene.
  const scenes = [];
  root.LinalgScenes = {
    register: (scene) => {
      for (const k of ["id", "step", "section", "pose", "copy", "build", "render", "flat", "readout"]) {
        if (!(k in scene)) throw new Error("scene " + (scene.id || "?") + " lacks " + k);
      }
      scenes.push(scene);
      return scene;
    },
    list: () => scenes.slice()
  };
})(typeof window !== "undefined" ? window : globalThis);
