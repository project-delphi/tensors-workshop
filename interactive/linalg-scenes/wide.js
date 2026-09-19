// Step 2: a wide matrix has too many answers. Two equations in three unknowns
// are two planes; their intersection is a whole line of solutions. The
// smallest of them is where a sphere growing from the origin first grazes
// the line -- the pseudoinverse's answer -- and ridge trades a little of the
// equation for a little less length, sliding off the line toward the origin.
// See linalg-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const LC = window.LinalgCore, K = window.LinalgKit;

  const A = [[1, 2, 1], [2, -1, 1]];
  const b = [3, 1];
  const XP = LC.mulVec(LC.pinv(A), b);        // the minimum-norm solution, computed
  const XPN = LC.norm(XP);
  const N = LC.nullspace(A)[0];               // the direction of the line of solutions
  // A point on row i's plane closest to the origin, and two directions in it.
  const planes = A.map((a, i) => {
    const an = LC.norm(a);
    const nrm = LC.scale(a, 1 / an);
    let u = cross(nrm, Math.abs(nrm[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
    u = LC.scale(u, 1 / LC.norm(u));
    const v = cross(nrm, u);
    return {n: nrm, u: u, v: v, at: XP};      // XP lies on both planes: A XP = b
  });
  function cross(a, c) {
    return [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
  }
  const EXT = 2.0;
  // Each plane as a ruled sheet about the point both share, so the rulings
  // of the two cross exactly on the line of solutions.
  const sheet = (p) => ({at: p.at, u: p.u, v: p.v, a: [-EXT, EXT], b: [-EXT, EXT], step: 0.5});
  const lineEnds = () => [LC.add(XP, LC.scale(N, -3.2)), LC.add(XP, LC.scale(N, 3.2))];

  const lambdaOf = (v) => (v === 0 ? 0 : Math.pow(10, (v / 100) * 3 - 2));
  const solve = (lambda) => {
    const xl = LC.ridge(A, b, lambda);
    // The foot of x_lambda on the line of solutions.
    const foot = LC.add(XP, LC.scale(N, LC.dot(LC.sub(xl, XP), N)));
    return {xl: xl, foot: foot, resid: LC.norm(LC.sub(LC.mulVec(A, xl), b))};
  };
  const grazing = (r) => Math.abs(r - XPN) < 0.01;
  const TWEEN_MS = 350;
  const R0 = 0.6;
  const shown = (ctx) => {
    const now = ctx.now();
    return {r: LC.tweenAt(ctx.state.rtw, now).value, lambda: LC.tweenAt(ctx.state.ltw, now).value};
  };
  const fmtL = (l) => (l === 0 ? "0" : l.toPrecision(2));

  const EN = {
    k: "Pseudoinverse · section 07",
    h: "The pseudoinverse picks the shortest of many solutions",
    claim: "A⁺b: the shortest x with A x = b",
    concept: 'When A has more columns than rows, A x = b has infinitely many solutions. The pseudoinverse returns one of them: x⁺ = A⁺b, the solution with the smallest Euclidean norm ‖x‖₂. <span class="cite">Deep Learning §2.9</span>',
    predict: "Before you slide: as ridge's λ grows, does the answer get longer or shorter? And does it still satisfy A x = b exactly?",
    b: "<p>On the stage: <b>A</b> is 2 × 3, so A x = b is two equations in three unknowns. Each equation is satisfied by one glass plane of points, and the two planes cross in the bright line: every point on it solves both equations. The difficulty is not that there is no answer but that there are infinitely many.</p><p>The sphere grows from the origin. The first point of the line it touches is the solution nearest the origin, x⁺ = A⁺b, which is what NumPy's <code>lstsq</code> returns for a wide matrix. The second slider is <b>ridge</b> regression: its penalty λ pulls the answer toward the origin, shorter than x⁺, but off the line, so A x = b is no longer exact.</p>",
    matTitle: "A, a 2 by 3 matrix: two equations in three unknowns",
    controls: {sphere: "Grow the sphere", lam: "Ridge: λ"},
    fmtR: (v) => `r = ${(v / 100).toFixed(2)}`,
    fmtL: (v) => `λ = ${fmtL(lambdaOf(v))}`,
    readout: (r, lambda, sol) =>
      `Every point on the bright line solves A x = b. The shortest is x⁺ = <code>[${XP.map((v) => v.toFixed(3)).join(", ")}]</code>, with ‖x⁺‖ = <b>${XPN.toFixed(3)}</b>` +
      (grazing(r) ? ", and the sphere is just touching it: no shorter vector solves the equation. " :
        (r < XPN ? `; the sphere (r = ${r.toFixed(2)}) has not reached the line yet, so no solution is this short. ` : `; the sphere (r = ${r.toFixed(2)}) cuts the line in two points, and both are longer than x⁺. `)) +
      (lambda > 0
        ? `Ridge at λ = ${fmtL(lambda)} answers x_λ = <code>[${sol.xl.map((v) => v.toFixed(3)).join(", ")}]</code>: shorter, ‖x_λ‖ = <b>${LC.norm(sol.xl).toFixed(3)}</b>, but off the line, since ‖A x_λ − b‖ = ${sol.resid.toFixed(3)} is no longer zero.`
        : "At λ = 0 ridge is the pseudoinverse: exact, and the shortest exact answer there is."),
    note: (r, lambda) => grazing(r)
      ? "The sphere grazes the line at x⁺: no shorter vector solves A x = b."
      : (lambda > 0 ? "Ridge has left the line: shorter, and no longer exact." : "Every point on the bright line solves A x = b."),
    aria: "Two glass planes crossing in a bright line, a wire sphere growing from the origin toward the line, and an arrow to the point where they touch."
  };
  const ES = {
    k: "Pseudoinversa · sección 07",
    h: "La pseudoinversa elige la más corta de muchas soluciones",
    claim: "A⁺b: el x más corto con A x = b",
    concept: 'Cuando A tiene más columnas que filas, A x = b tiene infinitas soluciones. La pseudoinversa devuelve una de ellas: x⁺ = A⁺b, la solución de menor norma euclídea ‖x‖₂. <span class="cite">Deep Learning §2.9</span>',
    predict: "Antes de deslizar: cuando crece la λ de ridge, ¿la respuesta se alarga o se acorta? ¿Y sigue cumpliendo A x = b exactamente?",
    b: "<p>En el escenario: <b>A</b> es 2 × 3, así que A x = b son dos ecuaciones con tres incógnitas. Cada ecuación la cumple un plano de vidrio de puntos, y los dos planos se cruzan en la recta brillante: cada punto de ella resuelve las dos ecuaciones. La dificultad no es que no haya respuesta, sino que hay infinitas.</p><p>La esfera crece desde el origen. El primer punto de la recta que toca es la solución más cercana al origen, x⁺ = A⁺b, que es lo que devuelve <code>lstsq</code> de NumPy para una matriz ancha. El segundo deslizador es la regresión <b>ridge</b>: su penalización λ tira de la respuesta hacia el origen, más corta que x⁺, pero fuera de la recta, así que A x = b ya no es exacto.</p>",
    matTitle: "A, una matriz de 2 por 3: dos ecuaciones con tres incógnitas",
    controls: {sphere: "Haz crecer la esfera", lam: "Ridge: λ"},
    fmtR: (v) => `r = ${(v / 100).toFixed(2)}`,
    fmtL: (v) => `λ = ${fmtL(lambdaOf(v))}`,
    readout: (r, lambda, sol) =>
      `Cada punto de la recta brillante resuelve A x = b. El más corto es x⁺ = <code>[${XP.map((v) => v.toFixed(3)).join(", ")}]</code>, con ‖x⁺‖ = <b>${XPN.toFixed(3)}</b>` +
      (grazing(r) ? ", y la esfera lo está tocando justo: ningún vector más corto resuelve la ecuación. " :
        (r < XPN ? `; la esfera (r = ${r.toFixed(2)}) todavía no llega a la recta, así que ninguna solución es tan corta. ` : `; la esfera (r = ${r.toFixed(2)}) corta la recta en dos puntos, y ambos son más largos que x⁺. `)) +
      (lambda > 0
        ? `Ridge con λ = ${fmtL(lambda)} responde x_λ = <code>[${sol.xl.map((v) => v.toFixed(3)).join(", ")}]</code>: más corto, ‖x_λ‖ = <b>${LC.norm(sol.xl).toFixed(3)}</b>, pero fuera de la recta, porque ‖A x_λ − b‖ = ${sol.resid.toFixed(3)} ya no es cero.`
        : "Con λ = 0 ridge es la pseudoinversa: exacta, y la respuesta exacta más corta que existe."),
    note: (r, lambda) => grazing(r)
      ? "La esfera roza la recta en x⁺: ningún vector más corto resuelve A x = b."
      : (lambda > 0 ? "Ridge ha dejado la recta: más corta, y ya no exacta." : "Cada punto de la recta brillante resuelve A x = b."),
    aria: "Dos planos de vidrio que se cruzan en una recta brillante, una esfera de alambre que crece desde el origen hacia la recta, y una flecha al punto donde se tocan."
  };

  window.LinalgScenes.register({
    id: "wide", step: "2", section: "step-2",
    copy: {en: EN, es: ES},
    pose: {
      target: XP, content: 3.0, fov: 42,
      home: LC.orbitView(0.65, 0.32),
      limits: {elMin: -0.6, elMax: 1.2}
    },

    presets: [
      {en: "Touch the shortest solution", es: "Tocar la solución más corta", values: () => ({sphere: Math.round(XPN * 100), lam: 0})},
      {en: "Try ridge: λ = 1", es: "Probar ridge: λ = 1", values: () => ({lam: 200 / 3})}
    ],

    init(ctx) {
      const s = ctx.state;
      s.r = R0;
      s.lambda = 0;
      s.rtw = LC.tweenStart(R0, R0, 0, 0);
      s.ltw = LC.tweenStart(0, 0, 0, 0);
      K.drawMatrixSvg(ctx.$("mat-2"), A, "2 × 3", 0);
      ctx.$("sphere").max = String(Math.round(XPN * 140));
      ctx.bindSlider("sphere", {
        token: "--v-y", format: ctx.T.fmtR,
        lit: () => ctx.gl && ctx.gl.arrows.xp,
        onInput: (v) => {
          s.r = v / 100;
          s.rtw = LC.retarget(s.rtw, s.r, ctx.now(), ctx.instant ? 0 : TWEEN_MS);
        }
      });
      ctx.bindSlider("lam", {
        token: "--v-out", format: ctx.T.fmtL,
        lit: () => ctx.gl && ctx.gl.arrows.xl,
        onInput: (v) => {
          s.lambda = lambdaOf(v);
          s.ltw = LC.retarget(s.ltw, s.lambda, ctx.now(), ctx.instant ? 0 : TWEEN_MS);
        }
      });
    },

    // The entrance: the sphere grows from nothing to where the slider left it.
    arrive(ctx) {
      ctx.state.rtw = LC.tweenStart(0, ctx.state.r, ctx.now(), 1000);
    },

    build(ctx) {
      const THREE = ctx.THREE;
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(ctx.stageColour(), 0.03);
      K.light(scene);
      scene.add(K.makeAxes(3));

      scene.add(K.makeGridPlane(sheet(planes[0]), K.glass("--v-basis", {opacity: 0.32}), "--v-basis"));
      scene.add(K.makeGridPlane(sheet(planes[1]), K.glass("--v-yhat", {opacity: 0.32}), "--v-yhat"));
      const ends = lineEnds();
      scene.add(K.makeTube(ends[0], ends[1], "--stage-ink", 0.022));

      const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18),
        new THREE.MeshBasicMaterial({color: K.colour("--stage-mute"), wireframe: true,
                                     transparent: true, opacity: 0.35}));
      scene.add(sphere);
      // The point of contact: a disc that lights when the sphere arrives.
      const touch = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10),
        new THREE.MeshStandardMaterial({color: K.colour("--v-y"), emissive: K.colour("--v-y"), emissiveIntensity: 0.9}));
      touch.position.copy(K.vec(XP));
      touch.userData.mat = touch.material;
      scene.add(touch);

      const arrows = {
        xp: K.makeArrow(XP, XPN, "--v-y", 0.05),
        xl: K.makeArrow(XP, XPN, "--v-out", 0.05)
      };
      for (const k in arrows) scene.add(arrows[k]);
      const drop = K.makeLine([XP, XP], "--v-res", {dashed: true, dash: 0.12, gap: 0.08});
      scene.add(drop);
      const labels = {
        xp: K.makeMatrixLabel(XP, "--v-y", "x⁺", 3),
        xl: K.makeMatrixLabel(XP, "--v-out", "x_λ", 3)
      };
      for (const k in labels) scene.add(labels[k]);
      labels.xp.position.copy(K.vec(LC.add(XP, LC.scale(N, 0.55))));

      const cam = new THREE.PerspectiveCamera(this.pose.fov, 1.4, 0.1, 300);
      const gl = {scene, cam, sphere, touch, arrows, drop, labels, composer: true};
      ctx.gl = gl;
      return gl;
    },

    render(ctx, gl) {
      const s = shown(ctx);
      const sol = solve(s.lambda);
      gl.sphere.scale.setScalar(Math.max(1e-3, s.r));
      gl.sphere.material.opacity = grazing(s.r) ? 0.7 : 0.35;
      K.lit(gl.arrows.xp, grazing(s.r));
      K.lit(gl.touch, grazing(s.r));
      gl.touch.scale.setScalar(grazing(s.r) ? 1.8 : 1);
      const ridge = s.lambda > 1e-9;
      gl.arrows.xl.visible = ridge;
      gl.labels.xl.visible = ridge;
      gl.drop.visible = ridge;
      if (ridge) {
        K.setArrow(gl.arrows.xl, sol.xl, LC.norm(sol.xl));
        K.setLine(gl.drop, [sol.xl, sol.foot]);
        gl.labels.xl.position.copy(K.vec(LC.add(sol.xl, LC.scale(N, -0.55))));
        gl.labels.xl.set(sol.xl);
      }
    },

    flat(ctx) {
      const flat = ctx.flat;
      const S = 62 / (ctx.shownView().dolly || 1), CX = 400, CY = 285;
      const B = ctx.viewBasis();
      const P = (p) => K.iso(p, S, CX, CY, B);
      const s = ctx.state;
      const sol = solve(s.lambda);

      const ax = K.flatAxes(P, 3);
      flat.appendChild(ax.group);
      flat.appendChild(K.gridPlane2(P, sheet(planes[0]), "--v-basis", {fill: "--v-basis"}));
      flat.appendChild(K.gridPlane2(P, sheet(planes[1]), "--v-yhat", {fill: "--v-yhat"}));
      const ends = lineEnds();
      flat.appendChild(K.line2(P(ends[0]), P(ends[1]), "--stage-ink", 3));
      const O = P([0, 0, 0]);
      flat.appendChild(K.el("circle", {cx: O[0], cy: O[1], r: s.r * S, fill: "none",
        stroke: K.css("--stage-mute"), "stroke-width": grazing(s.r) ? 2.2 : 1.2,
        "stroke-opacity": grazing(s.r) ? 0.9 : 0.5}));
      flat.appendChild(K.arrow2(O, P(XP), "--v-y", grazing(s.r) ? 4.5 : 3));
      const labels = ax.labels.concat([{at: P(LC.add(XP, LC.scale(N, 0.55))), matrix: {values: XP, caption: "x⁺", digits: 3}, colour: "--v-y"}]);
      if (s.lambda > 0) {
        flat.appendChild(K.arrow2(O, P(sol.xl), "--v-out", 3));
        flat.appendChild(K.line2(P(sol.xl), P(sol.foot), "--v-res", 1.6, {dashed: true}));
        labels.push({at: P(LC.add(sol.xl, LC.scale(N, -0.55))), matrix: {values: sol.xl, caption: "x_λ", digits: 3}, colour: "--v-out"});
      }
      ctx.place(labels);
    },

    readout(ctx) {
      const s = ctx.state;
      const sol = solve(s.lambda);
      return {
        html: ctx.T.readout(s.r, s.lambda, sol),
        note: ctx.T.note(s.r, s.lambda),
        data: {
          minnorm: XPN.toFixed(3),
          grazing: grazing(s.r) ? "1" : "0",
          ridgenorm: LC.norm(sol.xl).toFixed(3),
          resid: sol.resid.toFixed(3)
        }
      };
    }
  });
})();
