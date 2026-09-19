// Step 1: a tall matrix cannot reach every target. The column space of a
// 3 x 2 X is a plane; y is off it; least squares returns the foot of the
// perpendicular. See linalg-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const LC = window.LinalgCore, K = window.LinalgKit;

  // The first three California Housing districts, two predictors, exactly the
  // problem section 07 fits at 20433 x 7. Each column is scaled to unit length
  // so the picture is drawable; that changes the numbers beta is expressed in
  // and nothing about the geometry, which is the whole subject here.
  const X = [[0.6026, 0.5902], [0.6008, 0.3023], [0.5253, 0.7485]];
  const Y = [4.526, 3.585, 3.521];
  const FIT = LC.project(X, Y);            // beta, yhat, residual -- computed, never typed
  const x1 = LC.col(X, 0), x2 = LC.col(X, 1);
  const unit = (v) => LC.scale(v, 1 / LC.norm(v));
  const N = unit(FIT.residual);            // the plane's normal: the residual's direction
  const YH = unit(FIT.yhat);

  // The real gap is 8% of |y-hat|: on real housing data the right angle is
  // the small, important part of the picture, and at true scale it is a
  // smudge. So the step opens with the gap drawn at four times its length --
  // the slider says so, the readout keeps the real number -- and the reader
  // slides it down to 1 to see the fit as it is, and to 0 to put y in the
  // plane. Nothing about beta depends on it, which is the claim.
  const K0 = 4;
  const yAt = (k) => LC.add(FIT.yhat, LC.scale(FIT.residual, k));

  // The camera: side-on to y-hat and to the gap, so the right angle is drawn
  // as a right angle, then lifted 0.6 rad toward the plane's own normal so
  // the plane opens into a surface -- toward world Y would not do, since
  // world Y lies almost in this plane. Computed from the geometry rather
  // than typed as a spherical coordinate; orbitFrom() reads it back as one.
  const AT = LC.add(FIT.yhat, LC.scale(FIT.residual, K0 * 0.45));
  const SIDE = unit(LC.scale([YH[1] * N[2] - YH[2] * N[1], YH[2] * N[0] - YH[0] * N[2], YH[0] * N[1] - YH[1] * N[0]], 1));
  const EL = 0.6, R = 12.5;
  const EYE = LC.add(AT, LC.scale(unit(LC.add(LC.scale(SIDE, Math.cos(EL)), LC.scale(N, Math.sin(EL)))), R));
  const HOME = LC.orbitFrom(AT, EYE);
  // The plane as a rectangle on an orthonormal basis of it (along y-hat, and
  // across), ruled every unit. The two columns are only 21 degrees apart, so
  // the parallelogram *they* span is a needle from every angle and reads as
  // a line rather than as the surface it is.
  const PLANE = {at: [0, 0, 0], u: YH, v: SIDE, a: [-2, 9], b: [-4.5, 4.5]};
  const TWEEN_MS = 450;
  const shownK = (ctx) => LC.tweenAt(ctx.state.ktw, ctx.now()).value;

  const EN = {
    k: "Projection · section 07",
    h: "Least squares is a projection onto the column space",
    claim: "y = ŷ + r,  Xᵀr = 0",
    concept: 'The set of all vectors X β, over every β, is the <b>column space</b> of X: the span of its columns. X β = y has an exact solution only if y lies in that span. When it does not, the pseudoinverse gives the β for which X β is as close as possible to y in Euclidean norm, and that β is the <b>least-squares</b> fit. <span class="cite">Deep Learning §2.4, §2.9</span>',
    predict: "Before you slide: the slider moves y straight away from the plane, along r. Will β change? Will ŷ?",
    b: "<p>On the stage: three housing districts and two predictors, so <b>X</b> is 3 × 2 and the target <b>y</b>, the three prices, is a point in three dimensions. The glass sheet is the column space of X: every vector X β lies on it, whatever β is. y is above the sheet, so no β gives X β = y exactly.</p><p>The fit picks the point of the sheet nearest to y. That point is <b>ŷ</b> = X β, the dashed gap <b>r</b> = y − ŷ is the residual, and the gap meets the sheet at a right angle, which is what Xᵀr = 0 says. Because ŷ is the foot of that perpendicular, moving y straight up or down along r leaves ŷ where it is, and β with it.</p>",
    matTitle: "X, a 3 by 2 matrix of two predictors for three districts",
    controls: {tilt: "Gap between y and the plane"},
    fmt: (v) => (v === 0 ? "y in the plane" : `× ${(v / 100).toFixed(1)} the real gap`),
    readout: (b, rn, k, real, xtr) =>
      (rn < 1e-6
        ? `y is <b>in</b> the plane: X β = y exactly, and the residual is zero. `
        : `y sits <b>${rn.toFixed(3)}</b> off the plane` +
          (Math.abs(k - 1) < 1e-9 ? ", which is the real housing gap. " : ` (${k.toFixed(1)} × the real gap of ${real.toFixed(3)}). `)) +
      `β = <code>[${b[0].toFixed(3)}, ${b[1].toFixed(3)}]</code> did not move, and neither did ŷ: least squares only ever sees y's shadow on the plane, so moving y along r changes nothing it can see. ` +
      `Xᵀr = <code>[${xtr[0].toFixed(3)}, ${xtr[1].toFixed(3)}]</code>, the right angle written as numbers.`,
    note: (rn) => rn < 1e-6
      ? "y lies in the plane. The system has an exact solution."
      : "ŷ is the closest point on the plane to y.",
    aria: "A glass plane through the origin, with the vector y above it, its projection y-hat on it, and a dashed residual joining them at a right angle."
  };
  const ES = {
    k: "Proyección · sección 07",
    h: "Mínimos cuadrados es una proyección sobre el espacio columna",
    claim: "y = ŷ + r,  Xᵀr = 0",
    concept: 'El conjunto de todos los vectores X β, para todo β, es el <b>espacio columna</b> de X: el generado por sus columnas. X β = y tiene solución exacta solo si y está en ese generado. Cuando no lo está, la pseudoinversa da el β para el que X β queda lo más cerca posible de y en norma euclídea, y ese β es el ajuste por <b>mínimos cuadrados</b>. <span class="cite">Deep Learning §2.4, §2.9</span>',
    predict: "Antes de deslizar: el deslizador aleja y del plano en línea recta, a lo largo de r. ¿Cambiará β? ¿Cambiará ŷ?",
    b: "<p>En el escenario: tres distritos de vivienda y dos predictores, así que <b>X</b> es 3 × 2 y el objetivo <b>y</b>, los tres precios, es un punto en tres dimensiones. La lámina de vidrio es el espacio columna de X: todo vector X β está sobre ella, sea cual sea β. y está por encima de la lámina, así que ningún β da X β = y exactamente.</p><p>El ajuste elige el punto de la lámina más cercano a y. Ese punto es <b>ŷ</b> = X β, el hueco discontinuo <b>r</b> = y − ŷ es el residuo, y el hueco toca la lámina en ángulo recto, que es lo que dice Xᵀr = 0. Como ŷ es el pie de esa perpendicular, mover y en línea recta a lo largo de r deja ŷ donde está, y β con él.</p>",
    matTitle: "X, una matriz de 3 por 2 con dos predictores para tres distritos",
    controls: {tilt: "Distancia entre y y el plano"},
    fmt: (v) => (v === 0 ? "y en el plano" : `× ${(v / 100).toFixed(1)} la distancia real`),
    readout: (b, rn, k, real, xtr) =>
      (rn < 1e-6
        ? `y está <b>en</b> el plano: X β = y exactamente, y el residuo es cero. `
        : `y está a <b>${rn.toFixed(3)}</b> del plano` +
          (Math.abs(k - 1) < 1e-9 ? ", que es la distancia real de la vivienda. " : ` (${k.toFixed(1)} × la distancia real de ${real.toFixed(3)}). `)) +
      `β = <code>[${b[0].toFixed(3)}, ${b[1].toFixed(3)}]</code> no se movió, y ŷ tampoco: los mínimos cuadrados solo ven la sombra de y sobre el plano, así que mover y a lo largo de r no cambia nada que puedan ver. ` +
      `Xᵀr = <code>[${xtr[0].toFixed(3)}, ${xtr[1].toFixed(3)}]</code>: el ángulo recto, escrito en números.`,
    note: (rn) => rn < 1e-6
      ? "y está en el plano. El sistema tiene solución exacta."
      : "ŷ es el punto del plano más cercano a y.",
    aria: "Un plano de vidrio que pasa por el origen, con el vector y encima, su proyección ŷ sobre él, y un residuo discontinuo que los une en ángulo recto."
  };

  window.LinalgScenes.register({
    id: "projection", step: "1", section: "step-1",
    part: {en: "What least squares draws", es: "Lo que dibujan los mínimos cuadrados"},
    copy: {en: EN, es: ES},
    pose: {
      target: LC.scale(AT, 0.5), content: 6.3, fov: 45,
      home: LC.orbitView(HOME.az, HOME.el),
      radius: HOME.radius, minRadius: HOME.radius,
      // Down to the floor and no further: from under it the glass plane is
      // edge-on and the axes say nothing.
      limits: {elMin: -0.04, elMax: 1.15}
    },

    presets: [
      {en: "Put y on the plane", es: "Poner y en el plano", values: () => ({tilt: 0})},
      {en: "Original housing data", es: "Datos originales de vivienda", values: () => ({tilt: 100})}
    ],

    init(ctx) {
      const s = ctx.state;
      s.k = K0;
      s.ktw = LC.tweenStart(K0, K0, 0, 0);
      K.drawMatrixSvg(ctx.$("mat-1"), X, "3 × 2");
      ctx.bindSlider("tilt", {
        token: "--v-y", format: ctx.T.fmt,
        lit: () => ctx.gl && [ctx.gl.arrows.y, ctx.gl.res],
        onInput: (v) => {
          s.k = v / 100;
          s.ktw = LC.retarget(s.ktw, s.k, ctx.now(), ctx.instant ? 0 : TWEEN_MS);
        }
      });
    },

    // The entrance: y rises off the plane to where the slider says.
    arrive(ctx) {
      ctx.state.ktw = LC.tweenStart(0, ctx.state.k, ctx.now(), 1100);
    },

    build(ctx) {
      const THREE = ctx.THREE;
      const scene = new THREE.Scene();
      // The far corner recedes into the stage's own black rather than ending
      // on a hard line, which is most of what says the axes lie in depth.
      scene.fog = new THREE.FogExp2(ctx.stageColour(), 0.022);
      K.light(scene);

      scene.add(K.makeGridPlane(PLANE, K.glass("--v-basis"), "--v-basis"));

      scene.add(K.makeAxes(6));
      const origin = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12),
        new THREE.MeshBasicMaterial({color: K.colour("--stage-ink"), depthTest: false}));
      origin.renderOrder = 10;
      scene.add(origin);
      const originLabel = K.makeLabel("O (0, 0, 0)", "--stage-ink");
      originLabel.position.copy(K.vec(LC.scale(YH, -0.85)));
      scene.add(originLabel);

      // The columns as short basis arrows: at their full length they lie
      // along y-hat and hide it.
      const arrows = {
        x1: K.makeArrow(x1, 2.5, "--v-basis", 0.05),
        x2: K.makeArrow(x2, 2.5, "--v-basis", 0.05),
        yhat: K.makeArrow(FIT.yhat, LC.norm(FIT.yhat), "--v-yhat", 0.09),
        y: K.makeArrow(Y, LC.norm(Y), "--v-y", 0.09)
      };
      for (const k in arrows) scene.add(arrows[k]);
      const res = K.makeTube(FIT.yhat, Y, "--v-res", 0.035);
      scene.add(res);
      const mark = K.makeAngleMark(FIT.yhat, LC.scale(YH, -1), N, 0.45, "--v-res");
      scene.add(mark);

      const labels = {
        x1: K.makeLabel("x" + K.SUB[0], "--v-basis"),
        x2: K.makeLabel("x" + K.SUB[1], "--v-basis"),
        r: K.makeLabel("r", "--v-res"),
        yhat: K.makeMatrixLabel(FIT.yhat, "--v-yhat", "ŷ"),
        y: K.makeMatrixLabel(Y, "--v-y", "y")
      };
      for (const k in labels) scene.add(labels[k]);
      labels.x1.position.copy(K.vec(LC.scale(x1, 2.9)));
      labels.x2.position.copy(K.vec(LC.scale(x2, 2.9)));
      // The y-hat bracket hangs under the plane, the y bracket stands above
      // the tip, so the two never sit on one another however small the gap.
      labels.yhat.position.copy(K.vec(LC.add(FIT.yhat, LC.scale(N, -0.9))));

      const cam = new THREE.PerspectiveCamera(this.pose.fov, 1.4, 0.1, 300);
      const gl = {scene, cam, arrows, res, mark, labels, composer: true};
      ctx.gl = gl;
      return gl;
    },

    render(ctx, gl) {
      const k = shownK(ctx);
      const y = yAt(k);
      K.setArrow(gl.arrows.y, y, LC.norm(y));
      K.setTube(gl.res, FIT.yhat, y);
      gl.res.visible = k > 1e-3;
      gl.mark.visible = k > 0.25;
      gl.labels.y.position.copy(K.vec(LC.add(y, LC.scale(N, 0.8))));
      gl.labels.y.set(y);
      gl.labels.r.position.copy(K.vec(LC.add(yAt(k / 2), LC.scale(SIDE, 0.45))));
      gl.labels.r.visible = k > 0.4;
    },

    flat(ctx) {
      const flat = ctx.flat;
      // The dolly is a multiplier on the camera's distance, which for an
      // orthographic projection is a divisor on the scale.
      const S = 50 / (ctx.shownView().dolly || 1), CX = 400, CY = 285;
      const B = ctx.viewBasis();
      const P = (p) => K.iso(p, S, CX, CY, B);

      const ax = K.flatAxes(P, 6);
      flat.appendChild(ax.group);

      const yhat = FIT.yhat;
      const k = ctx.state.k;
      const y = yAt(k);
      flat.appendChild(K.gridPlane2(P, PLANE, "--v-basis", {fill: "--v-basis"}));

      const O = P([0, 0, 0]);
      flat.appendChild(K.arrow2(O, P(LC.scale(x1, 2.5)), "--v-basis", 2.5));
      flat.appendChild(K.arrow2(O, P(LC.scale(x2, 2.5)), "--v-basis", 2.5));
      flat.appendChild(K.arrow2(O, P(yhat), "--v-yhat", 3.5));
      flat.appendChild(K.arrow2(O, P(y), "--v-y", 3.5));
      if (k > 1e-3) {
        flat.appendChild(K.line2(P(yhat), P(y), "--v-res", 3));
        if (k > 0.25) flat.appendChild(K.angleMark2(P, yhat, LC.scale(YH, -1), N, 0.45, "--v-res"));
      }

      flat.appendChild(K.el("circle", {cx: O[0], cy: O[1], r: 5, fill: K.css("--stage-ink")}));
      const labels = ax.labels.concat([
        {at: P(LC.scale(YH, -0.85)), text: "O (0, 0, 0)", colour: "--stage-ink"},
        {at: P(LC.scale(x1, 2.9)), text: "x" + K.SUB[0], colour: "--v-basis"},
        {at: P(LC.scale(x2, 2.9)), text: "x" + K.SUB[1], colour: "--v-basis"},
        {at: P(LC.add(yhat, LC.scale(N, -0.9))), matrix: {values: yhat, caption: "ŷ"}, colour: "--v-yhat"},
        {at: P(LC.add(y, LC.scale(N, 0.8))), matrix: {values: y, caption: "y"}, colour: "--v-y"}
      ]);
      if (k > 0.4) labels.push({at: P(LC.add(yAt(k / 2), LC.scale(SIDE, 0.45))), text: "r", colour: "--v-res"});
      ctx.place(labels);
    },

    readout(ctx) {
      const T = ctx.T;
      const r = LC.scale(FIT.residual, ctx.state.k);
      const rn = LC.norm(r);
      // Computed, not printed: this is the orthogonality the picture claims,
      // and it is the one line that could otherwise keep saying zero after the
      // arithmetic under it had broken.
      const xtr = LC.mulVec(LC.transpose(X), r);
      return {
        html: T.readout(FIT.beta, rn, ctx.state.k, FIT.rnorm, xtr),
        note: T.note(rn),
        data: {rnorm: rn.toFixed(4), beta: FIT.beta.map((v) => v.toFixed(3)).join(",")}
      };
    }
  });
})();
