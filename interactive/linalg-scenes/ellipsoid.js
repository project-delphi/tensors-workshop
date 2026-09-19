// Step 5: the condition number, as a shape. The portal's picture one
// dimension up: the unit sphere goes through A = U diag(sigma) V' and comes
// out an ellipsoid whose semi-axes are sigma_i u_i. The three sigma are on
// sliders; kappa is the longest over the shortest -- read off the assembled
// matrix, not the sliders. See linalg-scenes/README.md for the contract.
(function () {
  "use strict";
  const LC = window.LinalgCore, K = window.LinalgKit;

  // Two fixed rotations, orthonormal by construction: the Q of a QR. Typed
  // seeds, but nothing on screen is read from them -- kappa, det and the
  // axes all come from the A they assemble.
  const U = LC.qr([[1, 0.3, 0.2], [0.2, 1, 0.4], [0.1, 0.5, 1]]).Q;
  const V = LC.qr([[1, -0.2, 0.4], [0.3, 1, 0.1], [-0.2, 0.3, 1]]).Q;
  const assemble = (sig) => LC.mul(U.map((r) => r.map((v, j) => v * sig[j])), LC.transpose(V));
  const SIG0 = [2.0, 1.2, 0.6];

  const TWEEN_MS = 450;
  // The three sigma ease, and A(sigma) is linear in sigma, so the ellipsoid
  // eases along with them, and an interrupted slider retargets from wherever
  // the shape is now.
  const shown = (ctx) => {
    const now = ctx.now();
    return ctx.state.tw.map((t) => LC.tweenAt(t, now).value);
  };
  const setSigma = (ctx, j, v, ms) => {
    const s = ctx.state;
    s.sigma[j] = v;
    s.tw[j] = LC.retarget(s.tw[j], v, ctx.now(), ctx.instant ? 0 : ms);
  };
  const fmtS = () => (v) => (v / 100).toFixed(2);

  const EN = {
    k: "Condition number · section 09",
    h: "A matrix that squashes one direction magnifies errors when you undo it",
    claim: "κ = σ₁ ⁄ σ₃",
    concept: 'The <b>condition number</b> of a matrix is the ratio of its largest singular value to its smallest, κ = σ₁ ⁄ σ₃ here. When κ is large the matrix is <b>poorly conditioned</b>: the solution of A x = b changes rapidly with small changes in b, and inverting A amplifies any error in its input. <span class="cite">Deep Learning §4.2</span>',
    predict: "Before you slide: push σ₃ down to 0.01. If b is off by 0.001 along that squashed direction, how far off is x? And what is left of the ellipsoid?",
    b: "<p>On the stage: the unit sphere, every input of length 1, as a faint wire ghost, and the ellipsoid a 3 × 3 matrix A turns it into. The three sliders are the three stretches. Along one direction A multiplies lengths by σ₁, along a perpendicular one by σ₂, along the third by σ₃, and those are the ellipsoid's three semi-axes. That is everything the SVD says a matrix does: three stretches along three perpendicular directions, with a rotation on either side.</p><p>Solving A x = b runs this backwards: whatever A shrank by σ₃ has to be stretched back by 1 ⁄ σ₃, and any error in b gets the same treatment. Push σ₃ down to 0.01 and an error of 0.001 in b along that axis comes out as 0.1 in x, a hundred times larger, while an error along the long axis hardly grows at all. κ = σ₁ ⁄ σ₃, the ellipsoid's proportion, is the worst case: a relative error in b can grow up to κ times in x, and log₁₀ κ is roughly how many decimal digits the answer loses. At σ₃ = 0 the ellipsoid is a flat disc, det A = σ₁σ₂σ₃ = 0, and the collapse of the determinant picture is back: a whole direction of the input has been thrown away, and no solve can get it back.</p>",
    controls: {s1: "Largest stretch σ₁", s2: "Middle stretch σ₂", s3: "Smallest stretch σ₃"},
    fmt: fmtS,
    readout: (sig, kappa, det) =>
      `σ = <code>[${sig.map((v) => v.toFixed(2)).join(", ")}]</code>. κ = σ₁ ⁄ σ₃ = <b>${kappa.toFixed(2)}</b>: A stretches its best direction ${kappa.toFixed(1)} times more than its worst. An error of 0.001 in b along the short axis comes out as <b>${(0.001 / sig[2]).toFixed(3)}</b> in x, ` +
      (kappa > 100 ? `and a solve can lose about ${LC.digitsLost(kappa).toFixed(1)} of its 16 digits, because the short axis is nearly gone. ` : `and a solve can lose about ${LC.digitsLost(kappa).toFixed(1)} of its 16 digits. `) +
      `The ellipsoid's volume is det A = σ₁σ₂σ₃ = ${det.toFixed(3)} times the sphere's.`,
    note: (kappa) => kappa > 100
      ? "κ > 100: the short axis is nearly gone. Undoing it multiplies error by κ."
      : "The unit sphere through A: three stretches along three perpendicular directions.",
    aria: "A faint wire sphere and, over it, the glass ellipsoid a matrix turns it into, with three arrows from the centre along its semi-axes labelled with the singular values, on three sliders."
  };
  const ES = {
    k: "Número de condición · sección 09",
    h: "Una matriz que aplasta una dirección amplifica los errores al deshacerla",
    claim: "κ = σ₁ ⁄ σ₃",
    concept: 'El <b>número de condición</b> de una matriz es el cociente entre su mayor valor singular y el menor, aquí κ = σ₁ ⁄ σ₃. Cuando κ es grande la matriz está <b>mal condicionada</b>: la solución de A x = b cambia deprisa con cambios pequeños de b, e invertir A amplifica cualquier error de su entrada. <span class="cite">Deep Learning §4.2</span>',
    predict: "Antes de deslizar: baja σ₃ hasta 0.01. Si b tiene un error de 0.001 en esa dirección aplastada, ¿cuánto error tiene x? ¿Y qué queda del elipsoide?",
    b: "<p>En el escenario: la esfera unidad, cada entrada de longitud 1, como un fantasma de alambre tenue, y el elipsoide en que la convierte una matriz A de 3 × 3. Los tres deslizadores son los tres estiramientos. En una dirección A multiplica las longitudes por σ₁, en otra perpendicular por σ₂, en la tercera por σ₃, y esos son los tres semiejes del elipsoide. Eso es todo lo que la SVD dice que hace una matriz: tres estiramientos en tres direcciones perpendiculares, con una rotación a cada lado.</p><p>Resolver A x = b es recorrer esto al revés: lo que A encogió por σ₃ hay que volver a estirarlo por 1 ⁄ σ₃, y cualquier error de b recibe el mismo trato. Baja σ₃ hasta 0.01 y un error de 0.001 en b a lo largo de ese eje sale como 0.1 en x, cien veces mayor, mientras que un error a lo largo del eje largo apenas crece. κ = σ₁ ⁄ σ₃, la proporción del elipsoide, es el peor caso: un error relativo en b puede crecer hasta κ veces en x, y log₁₀ κ es más o menos cuántos dígitos decimales pierde la respuesta. Con σ₃ = 0 el elipsoide es un disco plano, det A = σ₁σ₂σ₃ = 0, y vuelve el colapso de la imagen del determinante: se ha tirado una dirección entera de la entrada, y ninguna resolución la recupera.</p>",
    controls: {s1: "Mayor σ₁", s2: "Intermedio σ₂", s3: "Menor σ₃"},
    fmt: fmtS,
    readout: (sig, kappa, det) =>
      `σ = <code>[${sig.map((v) => v.toFixed(2)).join(", ")}]</code>. κ = σ₁ ⁄ σ₃ = <b>${kappa.toFixed(2)}</b>: A estira su mejor dirección ${kappa.toFixed(1)} veces más que la peor. Un error de 0.001 en b a lo largo del eje corto sale como <b>${(0.001 / sig[2]).toFixed(3)}</b> en x, ` +
      (kappa > 100 ? `y al resolver se pueden perder unos ${LC.digitsLost(kappa).toFixed(1)} de los 16 dígitos, porque el eje corto casi ha desaparecido. ` : `y al resolver se pueden perder unos ${LC.digitsLost(kappa).toFixed(1)} de los 16 dígitos. `) +
      `El volumen del elipsoide es det A = σ₁σ₂σ₃ = ${det.toFixed(3)} veces el de la esfera.`,
    note: (kappa) => kappa > 100
      ? "κ > 100: el eje corto casi ha desaparecido. Deshacerlo multiplica el error por κ."
      : "La esfera unidad a través de A: tres estiramientos en tres direcciones perpendiculares.",
    aria: "Una esfera de alambre tenue y, sobre ella, el elipsoide de vidrio en que una matriz la convierte, con tres flechas desde el centro por sus semiejes, etiquetadas con los valores singulares, en tres deslizadores."
  };

  window.LinalgScenes.register({
    id: "ellipsoid", step: "5", section: "step-5",
    copy: {en: EN, es: ES},
    pose: {
      target: [0, 0, 0], content: 2.6, fov: 40,
      home: LC.orbitView(0.55, 0.36),
      limits: {elMin: -0.5, elMax: 1.25}
    },

    presets: [
      {en: "Equal stretches: sphere", es: "Estiramientos iguales: esfera", values: () => ({s1: 100, s2: 100, s3: 100})},
      {en: "Shrink one direction", es: "Reducir una dirección", values: () => ({s1: 200, s2: 120, s3: 1})}
    ],

    init(ctx) {
      const s = ctx.state;
      s.sigma = SIG0.slice();
      s.tw = s.sigma.map((v) => LC.tweenStart(v, v, 0, 0));
      const controls = [];
      ["s1", "s2", "s3"].forEach((id, j) => {
        controls[j] = ctx.bindSlider(id, {
          token: "--v-yhat", format: ctx.T.fmt(j),
          lit: () => ctx.gl && ctx.gl.arrows[j],
          onInput: (v) => {
            setSigma(ctx, j, v / 100, TWEEN_MS);
            for (let i = j - 1; i >= 0; i--) {
              if (s.sigma[i] < s.sigma[i + 1]) setSigma(ctx, i, s.sigma[i + 1], TWEEN_MS);
            }
            for (let i = j + 1; i < 3; i++) {
              if (s.sigma[i] > s.sigma[i - 1]) setSigma(ctx, i, s.sigma[i - 1], TWEEN_MS);
            }
            controls.forEach((ctl, i) => ctl.set(s.sigma[i] * 100));
          }
        });
      });
    },

    // The entrance: the sphere itself, stretching into the ellipsoid.
    arrive(ctx) {
      const now = ctx.now();
      ctx.state.tw = ctx.state.sigma.map((v) => LC.tweenStart(1, v, now, 1300));
    },

    build(ctx) {
      const THREE = ctx.THREE;
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(ctx.stageColour(), 0.03);
      K.light(scene);
      scene.add(K.makeAxes(2.6));

      scene.add(K.makeWireSphere(1, "--stage-mute", 0.4));
      const body = K.makeEllipsoid("--v-basis", {opacity: 0.28});
      scene.add(body);
      // The ellipsoid's own great circles, so its shape reads through the glass.
      const rings = K.makeWireSphere(1, "--v-basis", 0.55);
      rings.matrixAutoUpdate = false;
      scene.add(rings);

      const arrows = [0, 1, 2].map(() => K.makeArrow([1, 0, 0], 1, "--v-yhat", 0.04));
      arrows.forEach((a) => scene.add(a));
      const labels = [0, 1, 2].map((j) => K.makeLabel("σ" + K.SUB[j] + "u" + K.SUB[j], "--v-yhat"));
      labels.forEach((l) => scene.add(l));

      const cam = new THREE.PerspectiveCamera(this.pose.fov, 1.4, 0.1, 300);
      const gl = {scene, cam, body, rings, arrows, labels, composer: true};
      ctx.gl = gl;
      return gl;
    },

    render(ctx, gl) {
      const sig = shown(ctx);
      const A = assemble(sig);
      K.setEllipsoid(gl.body, A);
      gl.rings.matrix.copy(gl.body.matrix);
      gl.rings.matrixWorldNeedsUpdate = true;
      const kappa = LC.cond(A);
      const red = K.colour("--v-res"), blue = K.colour("--v-yhat");
      [0, 1, 2].forEach((j) => {
        const u = LC.col(U, j);
        K.setArrow(gl.arrows[j], u, sig[j]);
        gl.labels[j].position.copy(K.vec(LC.scale(u, sig[j] + 0.24)));
        gl.labels[j].element.textContent = "σ" + K.SUB[j] + "u" + K.SUB[j] + " = " + sig[j].toFixed(2);
        // The shortest direction turns red once kappa passes 100: the axis
        // a solve would have to divide by.
        const worst = j === 2 && kappa > 100;
        const m = gl.arrows[j].userData.mat;
        m.color.copy(worst ? red : blue);
        m.emissive.copy(worst ? red : blue);
        if (m.emissiveIntensity < 2) m.emissiveIntensity = worst ? 1.8 : 0.9;
        gl.labels[j].element.style.color = K.css(worst ? "--v-res" : "--v-yhat");
      });
    },

    flat(ctx) {
      const flat = ctx.flat;
      const S = 72 / (ctx.shownView().dolly || 1), CX = 400, CY = 280;
      const B = ctx.viewBasis();
      const P = (p) => K.iso(p, S, CX, CY, B);
      // The flat path draws when it is told to, so it draws the target, not
      // the tween's frame.
      const sig = ctx.state.sigma;
      const A = assemble(sig);
      const kappa = LC.cond(A);

      const ax = K.flatAxes(P, 2.6);
      flat.appendChild(ax.group);
      flat.appendChild(K.wireSphere2(P, 1, "--stage-mute", 0.4));
      flat.appendChild(K.ellipsoid2(P, A, "--v-basis"));
      const O = P([0, 0, 0]);
      const labels = ax.labels.slice();
      [0, 1, 2].forEach((j) => {
        const u = LC.col(U, j);
        const worst = j === 2 && kappa > 100;
        flat.appendChild(K.arrow2(O, P(LC.scale(u, sig[j])), worst ? "--v-res" : "--v-yhat", 3));
        labels.push({at: P(LC.scale(u, sig[j] + 0.28)), text: "σ" + K.SUB[j] + "u" + K.SUB[j] + " = " + sig[j].toFixed(2), colour: worst ? "--v-res" : "--v-yhat"});
      });
      ctx.place(labels);
    },

    readout(ctx) {
      const sig = ctx.state.sigma;
      const A = assemble(sig);
      // Read off A, not off the sliders: the picture claims kappa is a
      // property of the matrix drawn, and this is where that claim is tested.
      const kappa = LC.cond(A);
      const det = LC.det3(A);
      const S = LC.svd(A).S;
      return {
        html: ctx.T.readout(S, kappa, det),
        note: ctx.T.note(kappa),
        data: {kappa: kappa.toFixed(3), sigma: S.map((v) => v.toFixed(3)).join(",")}
      };
    }
  });
})();
