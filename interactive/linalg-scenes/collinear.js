// Step 7: hold the target almost fixed, then compare the coefficients.
// The geometry has a fixed scale; the signed bars have a shared, labelled scale.
(function () {
  "use strict";
  const LC = window.LinalgCore, K = window.LinalgKit;
  const Y0 = [1, 0, 1];
  const DELTA = [-0.02, 0, 0.02]; // Exactly 2% of ||Y0||, perpendicular to x1.
  const thetaOf = (v) => 90 * Math.pow(0.5 / 90, v / 100);
  const GROUND = {at: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1], a: [-0.5, 2], b: [-0.5, 2], step: 0.5};
  function fitAt(theta, y) {
    const b = LC.basisAtAngle(theta * Math.PI / 180);
    return {b, fit: LC.project(b.X, y), base: LC.project(b.X, Y0), kappa: LC.cond(b.X)};
  }
  const EN = {
    k: "Collinearity · section 09", h: "When two predictors say almost the same thing, the fit cannot decide how to split the credit",
    claim: "y = β₁x₁ + β₂x₂",
    concept: 'A set of vectors is <b>linearly dependent</b> if one of them is a linear combination of the others. Two columns at a small angle are nearly dependent, and a matrix with nearly dependent columns has a large condition number: the fitted coefficients then change far more than the data they are fitted to. <span class="cite">Deep Learning §2.4, §4.2</span>',
    predict: "Before you press anything: the button nudges the target y by 2%, the size of a small measurement error. At 90°, about how much do you expect the two coefficients to move? And at 0.5°, when the two columns are nearly the same predictor?",
    b: "<p>On the stage: two predictor columns, <b>x₁</b> green and <b>x₂</b> purple, each of length 1, at an angle θ set by the slider, and the target y in yellow, to be fitted as y = β₁x₁ + β₂x₂. At 90° the two predictors carry independent information. At 0.5° they are nearly the same column: a house's floor area in square feet, and again in square metres with a little noise. Whatever the angle, y = (1, 0, 1) is exactly √2 x₁, so the right answer is always β₁ = √2 and β₂ = 0.</p><p>Press the button: y moves by 2%, and the bars show what the fitted coefficients do. At 90° they move by about 2%, the same as the data. At 0.5° the only way to reach a y that has moved a little sideways is a large positive β₂ cancelled by a large negative β₁, so the same 2% in y becomes over 300% in β. The fitted ŷ still sits on y; what has become unstable is the split between two columns that say almost the same thing, so a coefficient read as “the effect of floor area” means nothing. κ(X), the condition number from the previous picture, is the bound: the relative change in β is at most κ times the relative change in y.</p>",
    controls: {angle: "Column separation · 90° → 0.5°"},
    buttons: {noise: "Add / remove the 2% change", orthogonal: "90°: independent", parallel: "0.5°: nearly parallel"},
    fmt: (v) => `θ = ${thetaOf(v).toFixed(2)}°`,
    note: "Green: x₁ · purple: x₂ · yellow: original y · blue: current y",
    aria: "Green and purple unit columns on a grid, a yellow original target and a blue current target. Signed bars compare the two coefficients on a common scale. Adding a two percent change makes the coefficients change much more when the columns are nearly parallel.",
    readout: (s, f, rel) => s.nudged
      ? `At ${s.theta.toFixed(2)}°, κ(X) = <b>${f.kappa.toFixed(1)}</b>. With the 2% change, β = <code>[${f.fit.beta.map(v => v.toFixed(3)).join(', ')}]</code>: a <b>${rel.toFixed(1)}%</b> change in the coefficients for a 2% change in the target, within the bound κ × 2% = ${(2 * f.kappa).toFixed(0)}%. Both targets are fitted exactly; what has become unstable is how the credit is split between the two columns.`
      : `At ${s.theta.toFixed(2)}°, κ(X) = <b>${f.kappa.toFixed(1)}</b>. Without the change, β = <code>[${f.fit.beta.map(v => v.toFixed(3)).join(', ')}]</code> = (√2, 0): y is exactly √2 x₁ at every angle. Press the button to move the target by 2% and see what κ does to it.`,
    chart: "Coefficients · left of zero = negative; right = positive",
    baseline: "Original: β₁ = √2 ≈ 1.414, β₂ = 0", scale: "Shared range", change: "Target change", betaChange: "Coefficient change"
  };
  const ES = {
    k: "Colinealidad · sección 09", h: "Cuando dos predictores dicen casi lo mismo, el ajuste no sabe cómo repartir el mérito",
    claim: "y = β₁x₁ + β₂x₂",
    concept: 'Un conjunto de vectores es <b>linealmente dependiente</b> si uno de ellos es combinación lineal de los demás. Dos columnas con un ángulo pequeño son casi dependientes, y una matriz con columnas casi dependientes tiene un número de condición grande: los coeficientes ajustados cambian entonces mucho más que los datos a los que se ajustan. <span class="cite">Deep Learning §2.4, §4.2</span>',
    predict: "Antes de pulsar nada: el botón mueve el objetivo y un 2%, el tamaño de un pequeño error de medida. A 90°, ¿cuánto esperas que se muevan los dos coeficientes? ¿Y a 0.5°, cuando las dos columnas son casi el mismo predictor?",
    b: "<p>En el escenario: dos columnas predictoras, <b>x₁</b> verde y <b>x₂</b> morada, cada una de longitud 1, con un ángulo θ que fija el deslizador, y el objetivo y en amarillo, que se ajusta como y = β₁x₁ + β₂x₂. A 90° los dos predictores aportan información independiente. A 0.5° son casi la misma columna: la superficie de una casa en pies cuadrados, y otra vez en metros cuadrados con un poco de ruido. Sea cual sea el ángulo, y = (1, 0, 1) es exactamente √2 x₁, así que la respuesta correcta es siempre β₁ = √2 y β₂ = 0.</p><p>Pulsa el botón: y se mueve un 2%, y las barras muestran qué hacen los coeficientes ajustados. A 90° se mueven más o menos un 2%, igual que los datos. A 0.5° la única forma de llegar a una y que se ha movido un poco hacia el lado es un β₂ grande y positivo cancelado por un β₁ grande y negativo, así que el mismo 2% en y se convierte en más del 300% en β. El ŷ ajustado sigue sobre y; lo que se ha vuelto inestable es el reparto entre dos columnas que dicen casi lo mismo, así que un coeficiente leído como “el efecto de la superficie” no significa nada. κ(X), el número de condición de la imagen anterior, es la cota: el cambio relativo de β es como mucho κ veces el cambio relativo de y.</p>",
    controls: {angle: "Separación de columnas · 90° → 0.5°"},
    buttons: {noise: "Añadir / quitar el cambio del 2%", orthogonal: "90°: independientes", parallel: "0.5°: casi paralelas"},
    fmt: EN.fmt,
    note: "Verde: x₁ · morado: x₂ · amarillo: y original · azul: y actual",
    aria: "Columnas unitarias verde y morada sobre una cuadrícula, un objetivo original amarillo y uno actual azul. Las barras con signo comparan los coeficientes con una escala común. Un cambio del dos por ciento provoca cambios mucho mayores en los coeficientes cuando las columnas son casi paralelas.",
    readout: (s, f, rel) => s.nudged
      ? `A ${s.theta.toFixed(2)}°, κ(X) = <b>${f.kappa.toFixed(1)}</b>. Con el cambio del 2%, β = <code>[${f.fit.beta.map(v => v.toFixed(3)).join(', ')}]</code>: un cambio del <b>${rel.toFixed(1)}%</b> en los coeficientes por un cambio del 2% en el objetivo, dentro de la cota κ × 2% = ${(2 * f.kappa).toFixed(0)}%. Ambos objetivos se ajustan exactamente; lo que se ha vuelto inestable es cómo se reparte el mérito entre las dos columnas.`
      : `A ${s.theta.toFixed(2)}°, κ(X) = <b>${f.kappa.toFixed(1)}</b>. Sin el cambio, β = <code>[${f.fit.beta.map(v => v.toFixed(3)).join(', ')}]</code> = (√2, 0): y es exactamente √2 x₁ con cualquier ángulo. Pulsa el botón para mover el objetivo un 2% y ver qué hace κ con él.`,
    chart: "Coeficientes · a la izquierda de cero = negativo; a la derecha = positivo",
    baseline: "Original: β₁ = √2 ≈ 1.414, β₂ = 0", scale: "Rango común", change: "Cambio del objetivo", betaChange: "Cambio de coeficientes"
  };
  function target(ctx, nudged) {
    const s = ctx.state;
    s.nudged = nudged;
    s.y = nudged ? LC.add(Y0, DELTA) : Y0.slice();
    s.ytw = LC.retargetVec(s.ytw, s.y, ctx.now(), ctx.instant ? 0 : 900);
    ctx.$('noise').setAttribute('aria-pressed', String(nudged));
  }
  const labelsAt = (f, y) => [
    {p: LC.add(f.b.x1, [0.25, 0, -0.18]), text: 'x₁', token: '--v-basis'},
    {p: LC.add(f.b.x2, [-0.25, 0, 0.18]), text: 'x₂', token: '--v-out'},
    {p: [1.35, 0, 1.2], text: `y = (${y[0].toFixed(2)}, 0, ${y[2].toFixed(2)})`, token: '--v-yhat'},
    {p: [-0.25, 0, -0.18], text: 'O', token: '--stage-ink'}
  ];
  window.LinalgScenes.register({
    id: 'collinear', step: '7', section: 'step-7', copy: {en: EN, es: ES},
    part: {en: 'Where the arithmetic fails', es: 'Dónde falla la aritmética'},
    pose: {target: [0.45, 0, 0.65], content: 2, fov: 40,
      home: LC.orbitView(0, 1.15), limits: {elMin: 0.45, elMax: 1.45}},
    init(ctx) {
      const s = ctx.state;
      s.theta = 90; s.nudged = false; s.y = Y0.slice();
      s.thtw = LC.tweenStart(90, 90, 0, 0); s.ytw = LC.tweenVec(Y0, Y0, 0, 0);
      ctx.bindSlider('angle', {token: '--v-out', format: ctx.T.fmt,
        lit: () => ctx.gl && ctx.gl.x2,
        onInput(v) { s.theta = thetaOf(v); s.thtw = LC.retarget(s.thtw, s.theta, ctx.now(), ctx.instant ? 0 : 1000); }});
      ctx.$('noise').addEventListener('click', () => { target(ctx, !s.nudged); ctx.changed(); });
      for (const [id, v] of [['orthogonal', 0], ['parallel', 100]]) ctx.$(id).addEventListener('click', () => {
        ctx.$('angle').value = String(v); ctx.$('angle').dispatchEvent(new Event('input', {bubbles: true}));
      });
    },
    reset(ctx) { target(ctx, false); },
    arrive(ctx) { ctx.state.thtw = LC.tweenStart(45, ctx.state.theta, ctx.now(), 1600); },
    build(ctx) {
      const T = ctx.THREE, scene = new T.Scene(); K.light(scene);
      scene.add(K.makeGridPlane(GROUND, new T.MeshBasicMaterial({color: K.colour('--stage-mute'), transparent: true, opacity: 0.07, side: T.DoubleSide, depthWrite: false}), '--stage-mute'));
      const x1 = K.makeArrow([1,0,0], 1, '--v-basis', 0.025);
      const x2 = K.makeArrow([1,0,0], 1, '--v-out', 0.025);
      const original = K.makeLine([[0,0,0], Y0], '--v-y', {dashed: true, dash: 0.07, gap: 0.06});
      const y = K.makeArrow(Y0, LC.norm(Y0), '--v-yhat', 0.018);
      const dot = new T.Mesh(new T.SphereGeometry(0.035, 14, 10), new T.MeshBasicMaterial({color: K.colour('--v-y')})); dot.position.copy(K.vec(Y0));
      const labels = labelsAt(fitAt(90, Y0), Y0).map(l => K.makeLabel(l.text, l.token));
      scene.add(x1, x2, original, y, dot, ...labels);
      const cam = new T.PerspectiveCamera(40, 1, 0.05, 300);
      ctx.gl = {scene, cam, x1, x2, y, labels, composer: true}; return ctx.gl;
    },
    render(ctx, gl) {
      const theta = LC.tweenAt(ctx.state.thtw, ctx.now()).value;
      const y = LC.tweenVecAt(ctx.state.ytw, ctx.now()).value;
      const f = fitAt(theta, y);
      K.setArrow(gl.x1, f.b.x1, 1); K.setArrow(gl.x2, f.b.x2, 1); K.setArrow(gl.y, y, LC.norm(y));
      labelsAt(f, y).forEach((l,i) => { gl.labels[i].position.copy(K.vec(l.p)); gl.labels[i].element.textContent = l.text; });
    },
    flat(ctx) {
      const f = fitAt(ctx.state.theta, ctx.state.y);
      const P = p => K.iso(p, 135 / ctx.shownView().dolly, 400, 245, ctx.viewBasis());
      const flat = ctx.flat, O = P([0,0,0]);
      flat.appendChild(K.gridPlane2(P, GROUND, '--stage-mute', {fill: '--stage-mute', fillOpacity: 0.07}));
      flat.appendChild(K.line2(O, P(Y0), '--v-y', 3, {dashed: true}));
      flat.appendChild(K.arrow2(O, P(ctx.state.y), '--v-yhat', 3));
      flat.appendChild(K.arrow2(O, P(f.b.x1), '--v-basis', 4));
      flat.appendChild(K.arrow2(O, P(f.b.x2), '--v-out', 4));
      const q = P(Y0); flat.appendChild(K.el('circle', {cx:q[0], cy:q[1], r:4, fill:K.css('--v-y')}));
      ctx.place(labelsAt(f, ctx.state.y).map(l => ({at:P(l.p), text:l.text, colour:l.token})));
    },
    readout(ctx) {
      const s = ctx.state, f = fitAt(s.theta, s.y);
      const rel = 100 * LC.norm(LC.sub(f.fit.beta, f.base.beta)) / LC.norm(f.base.beta);
      const range = Math.max(2, Math.ceil(Math.max(...f.fit.beta.map(Math.abs))));
      const bars = f.fit.beta.map((v,i) => {
        const token = i ? '--v-out' : '--v-basis', width = 50 * Math.abs(v) / range;
        return `<div class="coefficient"><span style="color:var(${token})">β${i ? '₂' : '₁'}</span><span class="coefficient-track"><span class="coefficient-bar" style="background:var(${token});left:${v < 0 ? 50-width : 50}%;width:${width}%"></span></span><span>${v.toFixed(3)}</span></div>`;
      }).join('');
      return {html: ctx.T.readout(s,f,rel), note: ctx.T.note,
        comparison: `<div>${ctx.T.chart}</div>${bars}<div>${ctx.T.scale}: −${range} … 0 … +${range}. ${ctx.T.baseline}</div><div>${ctx.T.change}: ${s.nudged ? 2 : 0}% → ${ctx.T.betaChange}: ${rel.toFixed(1)}%</div>`,
        data: {kappa:f.kappa.toFixed(2), beta:f.fit.beta.map(v => v.toFixed(2)).join(','), theta:s.theta.toFixed(3), perturbation:s.nudged ? '0.02' : '0', betaChange:rel.toFixed(2)}};
    }
  });
})();
