// Step 6: eigenvectors, as the directions a field of arrows keeps. A few
// dozen unit arrows from the origin, each mapped by M(t) = (1 - t) I + t A;
// every frame each one is tested for whether it still points where it
// started, and the ones that do are lit -- found, not listed. A test vector
// the reader aims shows its image beside it, input and output, the way the
// frame this stage's look is taken from draws them. See linalg-scenes/README.md.
(function () {
  "use strict";
  const LC = window.LinalgCore, K = window.LinalgKit;

  // Three real, distinct eigenvalues, none of whose eigenvectors lies on an
  // axis, and off-diagonals large enough that the field visibly shears.
  const A = [[2.0, 1.0, 0.3], [0.2, 0.6, 0.2], [0.4, 0.3, 1.3]];
  const EIG = LC.eig3(A);
  const Mt = (t) => A.map((r, i) => r.map((v, j) => (1 - t) * (i === j ? 1 : 0) + t * v));

  // The field: a Fibonacci sphere of unit directions, sparse enough that the
  // reader's own pair of arrows is the brightest thing on the stage, with the
  // three eigen-directions folded in so the field can actually find them.
  const N = 72;
  const DIRS = [];
  for (let i = 0; i < N - 3; i++) {
    const y = 1 - (2 * i + 1) / (N - 3);
    const r = Math.sqrt(1 - y * y);
    const phi = i * Math.PI * (3 - Math.sqrt(5));
    DIRS.push([r * Math.cos(phi), y, r * Math.sin(phi)]);
  }
  EIG.forEach((e) => DIRS.push(e.v.slice()));
  const KEEP = 0.99995;        // cos of ~0.57 degrees: "still on its own line"
  const ALIGN = 0.99985;       // cos of 1 degree, for the reader's test vector
  const stays = (d, md) => {
    const n = LC.norm(md);
    return n > 1e-9 && Math.abs(LC.dot(d, md)) / n >= KEEP;
  };
  const dirOf = (az, el) => {
    const a = az * Math.PI / 180, e = el * Math.PI / 180;
    return [Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)];
  };
  const angleDeg = (a, b) => {
    const na = LC.norm(a), nb = LC.norm(b);
    if (na < 1e-12 || nb < 1e-12) return 0;
    return Math.acos(Math.max(-1, Math.min(1, LC.dot(a, b) / (na * nb)))) * 180 / Math.PI;
  };
  const TWEEN_MS = 500;
  const shown = (ctx) => {
    const now = ctx.now();
    const x = LC.tweenVecAt(ctx.state.xtw, now).value;
    return {t: LC.tweenAt(ctx.state.tw, now).value, x: LC.scale(x, 1 / (LC.norm(x) || 1))};
  };
  const fmtL = (l) => l.toFixed(2);

  const EN = {
    k: "Eigenvectors · section 08",
    h: "An eigenvector is a direction the matrix stretches but does not turn",
    claim: "M v = λ v",
    concept: 'An <b>eigenvector</b> of a square matrix A is a nonzero vector v such that multiplication by A changes only its scale: A v = λ v. The scalar λ is the <b>eigenvalue</b> belonging to v. A symmetric matrix has perpendicular eigenvectors; a general square matrix need not. <span class="cite">Deep Learning §2.7</span>',
    predict: "Before you slide: of these 72 arrows, how many will still point the way they started once A is fully applied? Then aim x at a lit one and watch the angle between x and M x.",
    b: "<p>On the stage: 72 arrows of length 1, pointing every way from the origin, each drawn where the 3 × 3 matrix A below sends it. Multiply almost any vector by A and it comes out both stretched and turned. A few directions are special: A stretches them and leaves them pointing the same way. An arrow lights up when that happens, tested arrow by arrow on every frame, and for this A exactly three do. Those are its eigenvectors, and the factor each is stretched by, the label beside it, is its eigenvalue λ.</p><p>The first slider applies A gradually. The matrix actually drawn is called M: at the left end M = I, which changes nothing, so every arrow is lit; at the right end M = A, and the lit set has shrunk to the same three. The other two sliders aim a test vector x, in yellow; its image M x is purple. Off an eigenvector the two arrows point different ways. On one they line up, and the readout says by how much A scaled it. Notice that the three lit arrows are not at right angles to each other: A is not symmetric, and only a symmetric matrix has perpendicular eigenvectors, which is why the SVD's perpendicular axes are the tool for a general matrix. The eigenvector with the largest λ matters most in practice: multiply any vector by A again and again and it swings toward that direction. That is power iteration, section 08's way of finding it.</p>",
    matTitle: "A, a 3 by 3 matrix that is not symmetric",
    controls: {blend: "Apply A: from the identity to the full matrix", taz: "Aim x: turn", tel: "Aim x: lift"},
    fmtT: (v) => (v === 100 ? "M = A" : v === 0 ? "M = I" : `${v}% of the way to A`),
    fmtAz: (v) => `${v}°`, fmtEl: (v) => `${v}°`,
    readout: (eig, x, mx, ang, hit, t) =>
      (hit >= 0
        ? `x is on an eigenvector: M x = <code>[${mx.map((v) => v.toFixed(3)).join(", ")}]</code> points the same way, ∠(x, M x) = <b>${ang.toFixed(2)}°</b>, and A only scales it, by λ = <b>${fmtL(eig[hit].lambda)}</b>. `
        : (t < 1 && ang < 1
          ? `x = <code>[${x.map((v) => v.toFixed(3)).join(", ")}]</code> has hardly turned, ∠(x, M x) = <b>${ang.toFixed(2)}°</b>, but only because M is still ${(100 * (1 - t)).toFixed(0)}% identity; x is not an eigenvector of A. `
          : `x = <code>[${x.map((v) => v.toFixed(3)).join(", ")}]</code> is not an eigenvector: M x = <code>[${mx.map((v) => v.toFixed(3)).join(", ")}]</code> has turned, ∠(x, M x) = <b>${ang.toFixed(2)}°</b>. `)) +
      (t < 1 && !(hit < 0 && ang < 1) ? `M is ${(100 * (1 - t)).toFixed(0)}% identity, so the field is only partly warped and more arrows pass the test. ` : "") +
      `A's three eigenvalues, computed: λ = <code>[${eig.map((e) => fmtL(e.lambda)).join(", ")}]</code>; three lit arrows at M = A, and no more. The largest, ${fmtL(Math.max(...eig.map((e) => e.lambda)))}, belongs to the direction power iteration converges to.`,
    note: (hit, eig) => hit >= 0
      ? `x is an eigenvector. A only scales it, by λ = ${fmtL(eig[hit].lambda)}.`
      : "Lit arrows kept their direction. Aim x to find one.",
    aria: "Dozens of thin arrows from the origin, warped by a matrix; the three that kept their direction glow green and are labelled with their scaling factor. A yellow test vector and its purple image are shown with their coordinates in brackets.",
    labIn: "Input", labOut: "Output"
  };
  const ES = {
    k: "Autovectores · sección 08",
    h: "Un autovector es una dirección que la matriz estira pero no gira",
    claim: "M v = λ v",
    concept: 'Un <b>autovector</b> de una matriz cuadrada A es un vector no nulo v tal que multiplicar por A solo cambia su escala: A v = λ v. El escalar λ es el <b>autovalor</b> que le corresponde a v. Una matriz simétrica tiene autovectores perpendiculares; una matriz cuadrada general no tiene por qué. <span class="cite">Deep Learning §2.7</span>',
    predict: "Antes de deslizar: de estas 72 flechas, ¿cuántas seguirán apuntando hacia donde empezaron cuando A esté aplicada del todo? Luego apunta x a una encendida y observa el ángulo entre x y M x.",
    b: "<p>En el escenario: 72 flechas de longitud 1 que apuntan en todas las direcciones desde el origen, cada una dibujada donde la envía la matriz A de 3 × 3 que se muestra debajo. Multiplica casi cualquier vector por A y sale estirado y girado a la vez. Unas pocas direcciones son especiales: A las estira y las deja apuntando hacia el mismo sitio. Una flecha se enciende cuando ocurre eso, comprobado flecha a flecha en cada fotograma, y para esta A lo consiguen exactamente tres. Son sus autovectores, y el factor por el que se estira cada una, la etiqueta que tiene al lado, es su autovalor λ.</p><p>El primer deslizador aplica A poco a poco. La matriz que se dibuja se llama M: en el extremo izquierdo M = I, que no cambia nada, así que todas las flechas están encendidas; en el derecho M = A, y el conjunto encendido se ha reducido a las mismas tres. Los otros dos deslizadores apuntan un vector de prueba x, en amarillo; su imagen M x es morada. Fuera de un autovector las dos flechas apuntan en direcciones distintas. Sobre uno se alinean, y la lectura dice cuánto lo ha escalado A. Fíjate en que las tres flechas encendidas no forman ángulos rectos entre sí: A no es simétrica, y solo una matriz simétrica tiene autovectores perpendiculares, que es por lo que los ejes perpendiculares de la SVD son la herramienta para una matriz general. El autovector del mayor λ es el que más importa en la práctica: multiplica cualquier vector por A una y otra vez y se va inclinando hacia esa dirección. Eso es la iteración de potencias, la manera en que la sección 08 lo encuentra.</p>",
    matTitle: "A, una matriz de 3 por 3 que no es simétrica",
    controls: {blend: "Aplicar A: de la identidad a la matriz completa", taz: "Apuntar x: girar", tel: "Apuntar x: elevar"},
    fmtT: (v) => (v === 100 ? "M = A" : v === 0 ? "M = I" : `${v}% del camino hacia A`),
    fmtAz: (v) => `${v}°`, fmtEl: (v) => `${v}°`,
    readout: (eig, x, mx, ang, hit, t) =>
      (hit >= 0
        ? `x está sobre un autovector: M x = <code>[${mx.map((v) => v.toFixed(3)).join(", ")}]</code> apunta en la misma dirección, ∠(x, M x) = <b>${ang.toFixed(2)}°</b>, y A solo lo escala, por λ = <b>${fmtL(eig[hit].lambda)}</b>. `
        : (t < 1 && ang < 1
          ? `x = <code>[${x.map((v) => v.toFixed(3)).join(", ")}]</code> apenas ha girado, ∠(x, M x) = <b>${ang.toFixed(2)}°</b>, pero solo porque M sigue siendo ${(100 * (1 - t)).toFixed(0)}% identidad; x no es un autovector de A. `
          : `x = <code>[${x.map((v) => v.toFixed(3)).join(", ")}]</code> no es un autovector: M x = <code>[${mx.map((v) => v.toFixed(3)).join(", ")}]</code> ha girado, ∠(x, M x) = <b>${ang.toFixed(2)}°</b>. `)) +
      (t < 1 && !(hit < 0 && ang < 1) ? `M es ${(100 * (1 - t)).toFixed(0)}% identidad, así que el campo solo está deformado en parte y más flechas pasan la prueba. ` : "") +
      `Los tres autovalores de A, calculados: λ = <code>[${eig.map((e) => fmtL(e.lambda)).join(", ")}]</code>; tres flechas encendidas con M = A, y ninguna más. El mayor, ${fmtL(Math.max(...eig.map((e) => e.lambda)))}, pertenece a la dirección a la que converge la iteración de potencias.`,
    note: (hit, eig) => hit >= 0
      ? `x es un autovector. A solo lo escala, por λ = ${fmtL(eig[hit].lambda)}.`
      : "Las flechas encendidas conservaron su dirección. Apunta x para encontrar una.",
    aria: "Decenas de flechas finas desde el origen, deformadas por una matriz; las tres que conservaron su dirección brillan en verde y llevan su factor de escala. Un vector de prueba amarillo y su imagen morada se muestran con sus coordenadas entre corchetes.",
    labIn: "Entrada", labOut: "Salida"
  };

  window.LinalgScenes.register({
    id: "eigen", step: "6", section: "step-6",
    copy: {en: EN, es: ES},
    pose: {
      target: [0, 0, 0], content: 2.6, fov: 40,
      home: LC.orbitView(0.5, 0.45),
      limits: {elMin: -0.6, elMax: 1.25}
    },

    presets: EIG.map((e, i) => ({
      en: "Aim along eigenvector " + (i + 1), es: "Apuntar al autovector " + (i + 1),
      values: () => ({blend: 100, taz: (Math.atan2(e.v[2], e.v[0]) * 180 / Math.PI + 360) % 360, tel: Math.asin(e.v[1]) * 180 / Math.PI})
    })),

    init(ctx) {
      const s = ctx.state;
      s.t = 1; s.az = 40; s.el = 20;
      s.tw = LC.tweenStart(1, 1, 0, 0);
      s.xtw = LC.tweenVec(dirOf(40, 20), dirOf(40, 20), 0, 0);
      K.drawMatrixSvg(ctx.$("mat-6"), A, "3 × 3", 1);
      const aim = () => {
        s.xtw = LC.retargetVec(s.xtw, dirOf(s.az, s.el), ctx.now(), ctx.instant ? 0 : 220);
      };
      ctx.bindSlider("blend", {
        token: "--v-basis", format: ctx.T.fmtT,
        onInput: (v) => {
          s.t = v / 100;
          s.tw = LC.retarget(s.tw, s.t, ctx.now(), ctx.instant ? 0 : TWEEN_MS);
        }
      });
      ctx.bindSlider("taz", {token: "--v-y", format: ctx.T.fmtAz,
        lit: () => ctx.gl && [ctx.gl.arrows.x, ctx.gl.arrows.mx], onInput: (v) => { s.az = v; aim(); }});
      ctx.bindSlider("tel", {token: "--v-y", format: ctx.T.fmtEl,
        lit: () => ctx.gl && [ctx.gl.arrows.x, ctx.gl.arrows.mx], onInput: (v) => { s.el = v; aim(); }});
    },

    // The entrance: the field warps from the identity to A.
    arrive(ctx) {
      ctx.state.tw = LC.tweenStart(0, ctx.state.t, ctx.now(), 1500);
    },

    build(ctx) {
      const THREE = ctx.THREE;
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(ctx.stageColour(), 0.03);
      K.light(scene);
      scene.add(K.makeAxes(3));

      // The field as two instanced meshes -- shafts and heads -- coloured per
      // instance. Unlit material: the lit ones are pushed past 1.0 so the
      // bloom pass finds them, and the rest sit well under its threshold.
      const shaftGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 6);
      shaftGeo.translate(0, 0.5, 0);
      const headGeo = new THREE.ConeGeometry(0.026, 0.1, 8);
      headGeo.translate(0, 0.05, 0);
      const mat = () => new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false});
      const shafts = new THREE.InstancedMesh(shaftGeo, mat(), N);
      const heads = new THREE.InstancedMesh(headGeo, mat(), N);
      scene.add(shafts, heads);

      const eigArrows = EIG.map(() => K.makeArrow([1, 0, 0], 1, "--v-basis", 0.03));
      eigArrows.forEach((a) => scene.add(a));
      const eigLabels = EIG.map((e) => K.makeLabel("λ = " + fmtL(e.lambda), "--v-basis"));
      eigLabels.forEach((l) => scene.add(l));

      const arrows = {x: K.makeArrow([1, 0, 0], 1, "--v-y", 0.045), mx: K.makeArrow([1, 0, 0], 1, "--v-out", 0.045)};
      scene.add(arrows.x, arrows.mx);
      const labels = {
        x: K.makeMatrixLabel([1, 0, 0], "--v-y", ctx.T.labIn),
        mx: K.makeMatrixLabel([1, 0, 0], "--v-out", ctx.T.labOut)
      };
      scene.add(labels.x, labels.mx);

      const cam = new THREE.PerspectiveCamera(this.pose.fov, 1.4, 0.1, 300);
      const gl = {scene, cam, shafts, heads, eigArrows, eigLabels, arrows, labels,
              m4: new THREE.Matrix4(), q: new THREE.Quaternion(), up: new THREE.Vector3(0, 1, 0),
              dim: K.colour("--stage-mute").multiplyScalar(0.55),
              hot: K.colour("--v-basis").multiplyScalar(1.6),
              composer: true};
      ctx.gl = gl;
      return gl;
    },

    render(ctx, gl) {
      const THREE = ctx.THREE;
      const sh = shown(ctx);
      const t = sh.t;
      const M = Mt(t);
      const pos = new THREE.Vector3(), dir = new THREE.Vector3(), scl = new THREE.Vector3();
      let found = 0;
      for (let i = 0; i < N; i++) {
        const d = DIRS[i];
        const md = LC.mulVec(M, d);
        const len = LC.norm(md);
        dir.set(md[0], md[1], md[2]).normalize();
        gl.q.setFromUnitVectors(gl.up, dir);
        pos.set(0, 0, 0);
        scl.set(1, Math.max(1e-4, len - 0.1), 1);
        gl.m4.compose(pos, gl.q, scl);
        gl.shafts.setMatrixAt(i, gl.m4);
        pos.copy(dir).multiplyScalar(len - 0.1);
        scl.set(1, 1, 1);
        gl.m4.compose(pos, gl.q, scl);
        gl.heads.setMatrixAt(i, gl.m4);
        // Tested here, every frame: does it still point where it started?
        const on = stays(d, md);
        if (on) found++;
        const c = on ? gl.hot : gl.dim;
        gl.shafts.setColorAt(i, c);
        gl.heads.setColorAt(i, c);
      }
      gl.shafts.instanceMatrix.needsUpdate = true;
      gl.heads.instanceMatrix.needsUpdate = true;
      gl.shafts.instanceColor.needsUpdate = true;
      gl.heads.instanceColor.needsUpdate = true;

      const x = sh.x;
      const mx = LC.mulVec(M, x);
      const hit = LC.alignedEigen(EIG, x, ALIGN);
      EIG.forEach((e, j) => {
        const lam = (1 - t) + t * e.lambda;
        K.setArrow(gl.eigArrows[j], e.v, Math.abs(lam));
        // A found direction carries its factor; at the identity there is
        // nothing found yet and the labels stay off.
        gl.eigLabels[j].visible = t > 0.6;
        gl.eigArrows[j].visible = t > 0.6;
        gl.eigLabels[j].position.copy(K.vec(LC.add(LC.scale(e.v, Math.abs(lam) + 0.2), [0, 0.12, 0])));
        K.lit(gl.eigArrows[j], hit === j);
      });
      K.setArrow(gl.arrows.x, x, 1);
      K.setArrow(gl.arrows.mx, mx, LC.norm(mx));
      if (hit >= 0) { K.lit(gl.arrows.x, true); K.lit(gl.arrows.mx, true); }
      gl.labels.x.position.copy(K.vec(LC.add(LC.scale(x, 1.0), [0, -0.42, 0])));
      gl.labels.x.set(x);
      gl.labels.mx.position.copy(K.vec(LC.add(mx, [0, 0.42, 0])));
      gl.labels.mx.set(mx);
      void found;
    },

    flat(ctx) {
      const flat = ctx.flat;
      const S = 74 / (ctx.shownView().dolly || 1), CX = 400, CY = 280;
      const B = ctx.viewBasis();
      const P = (p) => K.iso(p, S, CX, CY, B);
      const t = ctx.state.t;
      const M = Mt(t);
      const ax = K.flatAxes(P, 3);
      flat.appendChild(ax.group);
      const O = P([0, 0, 0]);
      const dim = K.el("g", {stroke: K.css("--stage-mute"), "stroke-opacity": "0.4", "stroke-width": "1"});
      const hot = K.el("g", {stroke: K.css("--v-basis"), "stroke-opacity": "1", "stroke-width": "2"});
      DIRS.forEach((d) => {
        const md = LC.mulVec(M, d);
        const q = P(md);
        (stays(d, md) ? hot : dim).appendChild(K.el("line", {x1: O[0], y1: O[1], x2: q[0], y2: q[1]}));
      });
      flat.appendChild(dim); flat.appendChild(hot);
      const x = dirOf(ctx.state.az, ctx.state.el);
      const mx = LC.mulVec(M, x);
      const hit = LC.alignedEigen(EIG, x, ALIGN);
      const labels = ax.labels.slice();
      if (t > 0.6) {
        EIG.forEach((e, j) => {
          const lam = (1 - t) + t * e.lambda;
          flat.appendChild(K.arrow2(O, P(LC.scale(e.v, Math.abs(lam))), "--v-basis", hit === j ? 4 : 2.5));
          labels.push({at: P(LC.add(LC.scale(e.v, Math.abs(lam) + 0.2), [0, 0.12, 0])), text: "λ = " + fmtL(e.lambda), colour: "--v-basis"});
        });
      }
      flat.appendChild(K.arrow2(O, P(x), "--v-y", 3.5));
      flat.appendChild(K.arrow2(O, P(mx), "--v-out", 3.5));
      labels.push({at: P(LC.add(x, [0, -0.42, 0])), matrix: {values: x, caption: ctx.T.labIn}, colour: "--v-y"});
      labels.push({at: P(LC.add(mx, [0, 0.42, 0])), matrix: {values: mx, caption: ctx.T.labOut}, colour: "--v-out"});
      ctx.place(labels);
    },

    readout(ctx) {
      const s = ctx.state;
      const M = Mt(s.t);
      const x = dirOf(s.az, s.el);
      const mx = LC.mulVec(M, x);
      const ang = angleDeg(x, mx);
      const hit = LC.alignedEigen(EIG, x, ALIGN);
      return {
        html: ctx.T.readout(EIG, x, mx, ang, hit, s.t),
        note: ctx.T.note(hit, EIG),
        data: {
          eigen: EIG.map((e) => e.lambda.toFixed(3)).join(","),
          aligned: String(hit),
          angle: ang.toFixed(2)
        }
      };
    }
  });
})();
