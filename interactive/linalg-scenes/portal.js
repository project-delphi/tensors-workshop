// Step 4: the SVD portal, and the definition every later step leans on.
// Input space on the left with the unit circle and the right singular
// vectors; output space on the right with its image, the ellipse, and the
// left singular vectors. Scrub x around the circle and A x travels the
// ellipse; on v_i it lands on sigma_i u_i, which is the SVD.
// See linalg-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const LC = window.LinalgCore, K = window.LinalgKit;

  // Singular values 3.32 and 0.76, far enough apart that the image of the
  // circle is unmistakably an ellipse.
  const A = [[3, 1.2], [0.4, 1]];
  const ELL = LC.ellipse(A);
  const TWEEN_MS = 280;
  const RING_N = 200;
  const TRAIL = 36;
  // Each pane's plane: the whole space, ruled every unit, a hair behind z = 0.
  const SPACE = {at: [0, 0, -0.01], u: [1, 0, 0], v: [0, 1, 0], a: [-4, 4], b: [-4, 4]};
  // The circle, and its image, at 201 points; `morph` is how far the output
  // has got from the circle toward the ellipse -- the entrance.
  const ringPt = (t) => [Math.cos(t), Math.sin(t)];
  const imagePt = (t, m) => {
    const x = ringPt(t), ax = LC.mulVec(A, x);
    return [x[0] + (ax[0] - x[0]) * m, x[1] + (ax[1] - x[1]) * m];
  };
  const shown = (ctx) => {
    const now = ctx.now();
    return {theta: LC.tweenAt(ctx.state.thtw, now).value, morph: LC.tweenAt(ctx.state.mtw, now).value};
  };
  const xOf = (theta) => [Math.cos(theta), Math.sin(theta)];
  const deg = (v) => `θ = ${Math.round(v)}°`;

  const EN = {
    k: "SVD · section 09",
    h: "The SVD: a matrix turns a circle into an ellipse",
    claim: "A vᵢ = σᵢ uᵢ",
    concept: 'Every real matrix factors as A = U Σ Vᵀ. The diagonal entries of Σ are the <b>singular values</b> of A; the columns of U are its <b>left-singular vectors</b> and the columns of V its <b>right-singular vectors</b>. Geometrically, A sends the unit circle to an ellipse whose semi-axes are the singular values. <span class="cite">Deep Learning §2.8</span>',
    predict: "Before you scrub: which points of the circle land on the ellipse's two axes, and how are those points placed relative to each other on the circle?",
    b: "<p>On the stage: the unit circle on the left, every input x of length 1, and on the right what A does to each of them. The circle comes out an <b>ellipse</b>. Its long semi-axis has length σ₁ and its short one σ₂, the singular values of A, and they point along u₁ and u₂, the left-singular vectors.</p><p>Scrub x round the circle and follow A x. Two inputs, v₁ and v₂, land exactly on the ellipse's axes, and they are perpendicular on the circle: these are the right-singular vectors, and A vᵢ = σᵢ uᵢ is the SVD read off the picture. A sends v₁ to σ₁u₁, v₂ to σ₂u₂, and every other input to a mix of the two. The ratio σ₁ ⁄ σ₂ is how unevenly A stretches, which the next picture names the condition number. Keeping only σ₁u₁v₁ᵀ gives the best rank-1 approximation of A, where notebook 09's rank explorer starts.</p>",
    matTitle: "A, a 2 by 2 matrix",
    controls: {scrub: "Scrub x around the unit circle"},
    fmt: deg,
    readout: (th, ax, hit, s) =>
      (hit >= 0
        ? `x is on v${K.SUB[hit]}, so A x = σ${K.SUB[hit]} u${K.SUB[hit]} exactly: ‖A x‖ = <b>${LC.norm(ax).toFixed(4)}</b> = σ${K.SUB[hit]}. `
        : `x = <code>[${Math.cos(th).toFixed(3)}, ${Math.sin(th).toFixed(3)}]</code> lands at A x = <code>[${ax[0].toFixed(3)}, ${ax[1].toFixed(3)}]</code>, ‖A x‖ = <b>${LC.norm(ax).toFixed(3)}</b>, somewhere between σ₂ and σ₁, as every ‖A x‖ must be. `) +
      `σ = <code>[${s[0].toFixed(3)}, ${s[1].toFixed(3)}]</code>: A stretches its best direction ${(s[0] / s[1]).toFixed(2)} times more than its worst. That ratio, κ = σ₁ ⁄ σ₂ = ${(s[0] / s[1]).toFixed(2)}, is the condition number.`,
    note: (hit) => hit >= 0
      ? `x is on v${K.SUB[hit]}: A x is exactly σ${K.SUB[hit]} u${K.SUB[hit]}.`
      : "Input space on the left, output space on the right.",
    aria: "Two panes. On the left a unit circle with two singular vectors; on the right the ellipse it maps to, with its semi-axes.",
    labIn: "input space", labOut: "output space"
  };
  const ES = {
    k: "SVD · sección 09",
    h: "La SVD: una matriz convierte una circunferencia en una elipse",
    claim: "A vᵢ = σᵢ uᵢ",
    concept: 'Toda matriz real se factoriza como A = U Σ Vᵀ. Las entradas diagonales de Σ son los <b>valores singulares</b> de A; las columnas de U son sus <b>vectores singulares izquierdos</b> y las columnas de V sus <b>vectores singulares derechos</b>. Geométricamente, A lleva la circunferencia unidad a una elipse cuyos semiejes son los valores singulares. <span class="cite">Deep Learning §2.8</span>',
    predict: "Antes de recorrer: ¿qué puntos de la circunferencia caen sobre los dos ejes de la elipse, y cómo están colocados esos puntos entre sí en la circunferencia?",
    b: "<p>En el escenario: la circunferencia unidad a la izquierda, cada entrada x de longitud 1, y a la derecha lo que A hace con cada una. La circunferencia sale convertida en una <b>elipse</b>. Su semieje largo mide σ₁ y el corto σ₂, los valores singulares de A, y apuntan según u₁ y u₂, los vectores singulares izquierdos.</p><p>Recorre x por la circunferencia y sigue A x. Dos entradas, v₁ y v₂, caen exactamente sobre los ejes de la elipse, y en la circunferencia son perpendiculares: son los vectores singulares derechos, y A vᵢ = σᵢ uᵢ es la SVD leída en la imagen. A lleva v₁ a σ₁u₁, v₂ a σ₂u₂, y cualquier otra entrada a una mezcla de las dos. El cociente σ₁ ⁄ σ₂ es cuán desigualmente estira A, y la siguiente imagen lo llama número de condición. Quedarse solo con σ₁u₁v₁ᵀ da la mejor aproximación de rango 1 de A, donde empieza el explorador de rango del cuaderno 09.</p>",
    matTitle: "A, una matriz de 2 por 2",
    controls: {scrub: "Recorre x por la circunferencia unidad"},
    fmt: deg,
    readout: (th, ax, hit, s) =>
      (hit >= 0
        ? `x está sobre v${K.SUB[hit]}, así que A x = σ${K.SUB[hit]} u${K.SUB[hit]} exactamente: ‖A x‖ = <b>${LC.norm(ax).toFixed(4)}</b> = σ${K.SUB[hit]}. `
        : `x = <code>[${Math.cos(th).toFixed(3)}, ${Math.sin(th).toFixed(3)}]</code> cae en A x = <code>[${ax[0].toFixed(3)}, ${ax[1].toFixed(3)}]</code>, ‖A x‖ = <b>${LC.norm(ax).toFixed(3)}</b>, en algún punto entre σ₂ y σ₁, como todo ‖A x‖ debe estar. `) +
      `σ = <code>[${s[0].toFixed(3)}, ${s[1].toFixed(3)}]</code>: A estira su mejor dirección ${(s[0] / s[1]).toFixed(2)} veces más que la peor. Ese cociente, κ = σ₁ ⁄ σ₂ = ${(s[0] / s[1]).toFixed(2)}, es el número de condición.`,
    note: (hit) => hit >= 0
      ? `x está sobre v${K.SUB[hit]}, así que A x es exactamente σ${K.SUB[hit]} u${K.SUB[hit]}.`
      : "Espacio de entrada a la izquierda, espacio de salida a la derecha.",
    aria: "Dos paneles. A la izquierda una circunferencia unidad con dos vectores singulares; a la derecha la elipse a la que se transforma, con sus semiejes.",
    labIn: "espacio de entrada", labOut: "espacio de salida"
  };

  window.LinalgScenes.register({
    id: "portal", step: "4", section: "step-4",
    part: {en: "What the SVD says", es: "Lo que dice la SVD"},
    copy: {en: EN, es: ES},
    panes: 2,
    pose: {
      target: [0, 0, 0], content: ELL.S[0] * 1.12, fov: 35,
      // Tipped a little off the plan view -- around its vertical axis and
      // again around its horizontal one -- so the plane recedes and the arrows
      // have somewhere to stand. Small angles, because the foreshortening
      // they cost is about 4% and the unit circle has to keep reading as a
      // circle in a step whose whole subject is an ellipse.
      home: LC.orbitView(-0.3, 0.26),
      radius: ELL.S[0] * 4,
      // Two planes, so a card to be tipped rather than a globe to be spun:
      // the far side of a plane is the same picture mirrored with every
      // label on it backwards.
      limits: {azMin: -0.75, azMax: 0.75, elMin: -0.5, elMax: 0.7}
    },

    presets: [0, 1].map(i => ({
      en: "Align x with v" + K.SUB[i], es: "Alinear x con v" + K.SUB[i],
      values: () => { const v = LC.col(ELL.V, i); return {scrub: (Math.atan2(v[1], v[0]) * 180 / Math.PI + 360) % 360}; }
    })),

    init(ctx) {
      const s = ctx.state;
      s.theta = 20 * Math.PI / 180;
      s.thtw = LC.tweenStart(s.theta, s.theta, 0, 0);
      s.mtw = LC.tweenStart(1, 1, 0, 0);
      s.trailIn = []; s.trailOut = [];
      K.drawMatrixSvg(ctx.$("mat-4"), A, "2 × 2", 1);
      ctx.bindSlider("scrub", {
        token: "--v-y", format: ctx.T.fmt,
        lit: () => ctx.gl && [ctx.gl.arrows.x, ctx.gl.arrows.ax],
        onInput: (v) => {
          s.theta = v * Math.PI / 180;
          // Unwrapped: from 350 degrees to 10 is a short turn forward, not a
          // sweep back through the whole circle.
          const here = LC.tweenAt(s.thtw, ctx.now()).value;
          let to = s.theta;
          while (to - here > Math.PI) to -= 2 * Math.PI;
          while (here - to > Math.PI) to += 2 * Math.PI;
          s.thtw = LC.retarget(s.thtw, to, ctx.now(), ctx.instant ? 0 : TWEEN_MS);
          // The flat path keeps its own trail, drawn from the target.
          s.trailIn.push(xOf(s.theta)); s.trailOut.push(LC.mulVec(A, xOf(s.theta)));
          if (s.trailIn.length > TRAIL) { s.trailIn.shift(); s.trailOut.shift(); }
        }
      });
    },

    // The entrance: the output pane is a circle that inflates into the ellipse.
    arrive(ctx) {
      ctx.state.mtw = LC.tweenStart(0, 1, ctx.now(), 1300);
      if (ctx.gl) { K.clearTrail(ctx.gl.trails.x); K.clearTrail(ctx.gl.trails.ax); }
    },

    build(ctx) {
      const THREE = ctx.THREE;
      const mk = () => {
        const s = new THREE.Scene();
        s.add(new THREE.AmbientLight(0xffffff, 0.9));
        const d = new THREE.DirectionalLight(0xffffff, 1.1);
        d.position.set(2, 4, 6);
        s.add(d);
        s.add(K.makeAxes(4.2, {planar: true}));
        // The space itself, ruled every unit, a hair behind the disc and the
        // arrows so nothing on the plane fights it for the pixel.
        s.add(K.makeGridPlane(SPACE,
          new THREE.MeshBasicMaterial({color: K.colour("--stage-mute"), transparent: true,
                                       opacity: 0.04, side: THREE.DoubleSide, depthWrite: false}),
          "--stage-mute", {lineOpacity: 0.2}));
        return s;
      };
      const inp = mk(), out = mk();

      const ringMat = () => new THREE.MeshBasicMaterial({color: K.colour("--stage-ink"), side: THREE.DoubleSide});
      inp.add(new THREE.Mesh(new THREE.RingGeometry(0.985, 1.015, 128), ringMat()));

      // Filled, and filled the same colour on both sides: the ratio of the two
      // areas is |det A| = sigma_1 sigma_2, which the readout states as a pair
      // of numbers and the picture would otherwise never show.
      const fillMat = () => new THREE.MeshBasicMaterial({
        color: K.colour("--stage-ink"), transparent: true, opacity: 0.12,
        side: THREE.DoubleSide, depthWrite: false
      });
      inp.add(new THREE.Mesh(new THREE.CircleGeometry(1, 128), fillMat()));

      // The image of the unit circle, rebuilt while it inflates and then left
      // alone: an outline that can move, and a fill made once per shape.
      const outline = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(Array.from({length: RING_N + 1}, () => new THREE.Vector3())),
        new THREE.LineBasicMaterial({color: K.colour("--stage-ink")}));
      out.add(outline);
      const fill = new THREE.Mesh(new THREE.BufferGeometry(), fillMat());
      out.add(fill);

      const arrows = {
        v1: K.makeArrow(LC.col(ELL.V, 0), 1, "--v-basis", 0.03),
        v2: K.makeArrow(LC.col(ELL.V, 1), 1, "--v-basis", 0.03),
        u1: K.makeArrow(ELL.axes[0].axis, ELL.S[0], "--v-yhat", 0.03),
        u2: K.makeArrow(ELL.axes[1].axis, ELL.S[1], "--v-yhat", 0.03),
        x: K.makeArrow([1, 0, 0], 1, "--v-y", 0.042),
        ax: K.makeArrow([1, 0, 0], 1, "--v-out", 0.042)
      };
      const side = {v1: inp, v2: inp, x: inp, u1: out, u2: out, ax: out};
      for (const k in arrows) side[k].add(arrows[k]);
      const trails = {x: K.makeTrail(TRAIL, "--v-y"), ax: K.makeTrail(TRAIL, "--v-out")};
      inp.add(trails.x); out.add(trails.ax);
      const tip = (token) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10),
          new THREE.MeshStandardMaterial({color: K.colour(token), emissive: K.colour(token), emissiveIntensity: 1.4}));
        m.userData.mat = m.material;
        return m;
      };
      const tips = {x: tip("--v-y"), ax: tip("--v-out")};
      inp.add(tips.x); out.add(tips.ax);

      const labels = {
        v1: K.makeLabel("v" + K.SUB[0], "--v-basis"), v2: K.makeLabel("v" + K.SUB[1], "--v-basis"),
        u1: K.makeLabel("σ" + K.SUB[0] + "u" + K.SUB[0], "--v-yhat"),
        u2: K.makeLabel("σ" + K.SUB[1] + "u" + K.SUB[1], "--v-yhat"),
        x: K.makeMatrixLabel([1, 0], "--v-y", "x"),
        ax: K.makeMatrixLabel([1, 0], "--v-out", "A x")
      };
      for (const k in labels) side[k].add(labels[k]);
      labels.v1.position.copy(K.vec(LC.scale(LC.col(ELL.V, 0), 1.18)));
      labels.v2.position.copy(K.vec(LC.scale(LC.col(ELL.V, 1), 1.18)));

      // Both panes take the same pose: one plane seen from one place, which is
      // what lets a reader turn the portal without A v = sigma u coming apart.
      const camIn = new THREE.PerspectiveCamera(this.pose.fov, 1, 0.1, 200);
      const camOut = new THREE.PerspectiveCamera(this.pose.fov, 1, 0.1, 200);
      const gl = {panes: [{scene: inp, cam: camIn}, {scene: out, cam: camOut}],
                  arrows, trails, tips, labels, outline, fill, morphAt: -1, composer: false};
      ctx.gl = gl;
      return gl;
    },

    render(ctx, gl) {
      const THREE = ctx.THREE;
      const sh = shown(ctx);
      const m = sh.morph;
      if (m !== gl.morphAt) {
        gl.morphAt = m;
        const pos = gl.outline.geometry.attributes.position;
        const pts2 = [];
        for (let i = 0; i <= RING_N; i++) {
          const p = imagePt((i / RING_N) * Math.PI * 2, m);
          pos.setXYZ(i, p[0], p[1], 0);
          if (i < RING_N) pts2.push(new THREE.Vector2(p[0], p[1]));
        }
        pos.needsUpdate = true;
        gl.fill.geometry.dispose();
        gl.fill.geometry = new THREE.ShapeGeometry(new THREE.Shape(pts2));
        [0, 1].forEach((j) => {
          const len = 1 + (ELL.S[j] - 1) * m;
          K.setArrow(gl.arrows["u" + (j + 1)], ELL.axes[j].axis, len);
          gl.labels["u" + (j + 1)].position.copy(K.vec(LC.scale(ELL.axes[j].u, len + 0.22)));
        });
      }
      const x = xOf(sh.theta);
      const axFull = LC.mulVec(A, x);
      const ax = [x[0] + (axFull[0] - x[0]) * m, x[1] + (axFull[1] - x[1]) * m];
      // ELL already holds the decomposition; recomputing it per frame would be
      // an SVD sixty times a second for a picture that is not moving.
      const hit = LC.alignedWithAxes(ELL.axes, x);
      K.setArrow(gl.arrows.x, x, 1);
      K.setArrow(gl.arrows.ax, ax, LC.norm(ax));
      gl.tips.x.position.copy(K.vec(x));
      gl.tips.ax.position.copy(K.vec(ax));
      if (m >= 1) { K.pushTrail(gl.trails.x, x); K.pushTrail(gl.trails.ax, ax); }
      gl.labels.x.position.copy(K.vec(LC.scale(x, 1.3)));
      gl.labels.x.set(x);
      gl.labels.ax.position.copy(K.vec(LC.add(ax, [0, ax[1] >= 0 ? 0.5 : -0.5, 0])));
      gl.labels.ax.set(ax);
      // Aligned: brighten the pair the reader has found, so the identity is
      // pointed at rather than left to be noticed.
      [0, 1].forEach((j) => {
        K.lit(gl.arrows["v" + (j + 1)], hit === j);
        K.lit(gl.arrows["u" + (j + 1)], hit === j);
      });
      K.lit(gl.tips.x, hit >= 0); K.lit(gl.tips.ax, hit >= 0);
      gl.tips.x.scale.setScalar(hit >= 0 ? 1.7 : 1);
      gl.tips.ax.scale.setScalar(hit >= 0 ? 1.7 : 1);
    },

    flat(ctx) {
      const flat = ctx.flat;
      // The GL path scissors each viewport, so its furniture stops at the
      // divider. The SVG has no scissor, so it needs one.
      const clip = K.el("defs", {});
      [["clip-in", 0], ["clip-out", 400]].forEach(([id, x]) => {
        const cp = K.el("clipPath", {id: id});
        cp.appendChild(K.el("rect", {x: x, y: 0, width: 400, height: 560}));
        clip.appendChild(cp);
      });
      flat.appendChild(clip);
      const S = 58 / (ctx.shownView().dolly || 1);   // one scale for both
      const L = [200, 280], R = [600, 280];
      const B = ctx.viewBasis();
      const toL = (v) => K.iso(v, S, L[0], L[1], B);
      const toR = (v) => K.iso(v, S, R[0], R[1], B);

      const ring = (to, r) => {
        const pts = [];
        for (let i = 0; i <= 64; i++) {
          const t = (i / 64) * Math.PI * 2;
          pts.push(to([Math.cos(t) * r, Math.sin(t) * r]));
        }
        return pts;
      };

      const labels = [];
      [[toL, "clip-in"], [toR, "clip-out"]].forEach(([to, clipId]) => {
        const grid = K.gridPlane2(to, SPACE, "--stage-mute",
          {fill: "--stage-mute", fillOpacity: 0.04, opacity: 0.25, lineOpacity: 0.2});
        grid.setAttribute("clip-path", "url(#" + clipId + ")");
        flat.appendChild(grid);
        const ax = K.flatAxes(to, 4.2, {planar: true});
        ax.group.setAttribute("clip-path", "url(#" + clipId + ")");
        flat.appendChild(ax.group);
        labels.push(...ax.labels);
      });
      flat.appendChild(K.line2([400, 60], [400, 500], "--stage-mute", 1, {opacity: 0.25}));

      flat.appendChild(K.poly2(ring(toL, 1), "--stage-ink", {fill: "--stage-ink", fillOpacity: 0.12, width: 2, opacity: 1}));
      const pts = [];
      for (let i = 0; i <= 120; i++) pts.push(toR(imagePt((i / 120) * Math.PI * 2, 1)));
      flat.appendChild(K.poly2(pts, "--stage-ink", {fill: "--stage-ink", fillOpacity: 0.12, width: 2, opacity: 1}));

      const s = ctx.state;
      const x = xOf(s.theta);
      const hit = LC.alignedWithAxes(ELL.axes, x);
      if (s.trailIn.length > 1) {
        flat.appendChild(K.trail2(toL, s.trailIn, "--v-y", 2.5));
        flat.appendChild(K.trail2(toR, s.trailOut, "--v-out", 2.5));
      }
      ELL.axes.forEach((ax, j) => {
        const w = hit === j ? 4 : 2.5;
        flat.appendChild(K.arrow2(toL([0, 0]), toL(ax.v), "--v-basis", w));
        flat.appendChild(K.arrow2(toR([0, 0]), toR(ax.axis), "--v-yhat", w));
        labels.push({at: toL(LC.scale(ax.v, 1.18)), text: "v" + K.SUB[j], colour: "--v-basis"});
        labels.push({at: toR(LC.scale(ax.u, ax.sigma + 0.22)), text: "σ" + K.SUB[j] + "u" + K.SUB[j], colour: "--v-yhat"});
      });

      const ax = LC.mulVec(A, x);
      flat.appendChild(K.arrow2(toL([0, 0]), toL(x), "--v-y", 3.5));
      flat.appendChild(K.arrow2(toR([0, 0]), toR(ax), "--v-out", 3.5));
      labels.push({at: toL(LC.scale(x, 1.3)), matrix: {values: x, caption: "x"}, colour: "--v-y"});
      labels.push({at: toR(LC.add(ax, [0, ax[1] >= 0 ? 0.5 : -0.5, 0])), matrix: {values: ax, caption: "A x"}, colour: "--v-out"});
      labels.push({at: [L[0], 470], text: ctx.T.labIn, colour: "--stage-mute"});
      labels.push({at: [R[0], 470], text: ctx.T.labOut, colour: "--stage-mute"});
      ctx.place(labels);
    },

    readout(ctx) {
      const x = xOf(ctx.state.theta);
      const ax = LC.mulVec(A, x);
      const hit = LC.alignedWithAxes(ELL.axes, x);
      return {
        html: ctx.T.readout(ctx.state.theta, ax, hit, ELL.S),
        note: ctx.T.note(hit),
        // Data attributes so the browser check can assert A v = sigma u
        // through the real render path, as numbers rather than as pixels.
        data: {
          sigma: ELL.S.map((s) => s.toFixed(3)).join(","),
          av: LC.norm(ax).toFixed(3),
          aligned: String(hit)
        }
      };
    }
  });
})();
