// Step 3: a determinant reaching zero. A house of edges stands on the floor
// over its own shadow; A(t) = diag(1, 1 - t, 1) squashes it, and at t = 1 the
// house lies exactly on the shadow. Two points that differed only in height
// now have one image, and no matrix can tell them apart again.
// See linalg-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const LC = window.LinalgCore, K = window.LinalgKit;

  // The house, as edges: a box, a ridged roof, a door.
  const W = 1, D = 0.8, H = 1.4, R = 2.1;
  const box = [[-W, 0, -D], [W, 0, -D], [W, 0, D], [-W, 0, D]];
  const EDGES = [];
  box.forEach((c, i) => {
    const nxt = box[(i + 1) % 4];
    EDGES.push([c, nxt]);                                    // ground
    EDGES.push([[c[0], H, c[2]], [nxt[0], H, nxt[2]]]);      // eaves
    EDGES.push([c, [c[0], H, c[2]]]);                        // corners
    EDGES.push([[c[0], H, c[2]], [Math.sign(c[0]) * W, R, 0]]);   // rafters
  });
  EDGES.push([[-W, R, 0], [W, R, 0]]);                       // the ridge
  EDGES.push([[-0.25, 0, D], [-0.25, 0.7, D]], [[0.25, 0, D], [0.25, 0.7, D]], [[-0.25, 0.7, D], [0.25, 0.7, D]]);   // a door
  const FLOOR = [[-W, 0, -D], [W, 0, -D], [W, 0, D], [-W, 0, D]];
  // The ground under it, ruled every unit like every plane on the stage.
  const GROUND = {at: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1], a: [-3, 3], b: [-3, 3], step: 0.5};

  // Two points on the front wall, one above the other.
  const PA = [0.6, 0.3, D], PB = [0.6, 1.1, D];

  const At = (t) => [[1, 0, 0], [0, 1 - t, 0], [0, 0, 1]];
  const TWEEN_MS = 600;
  const shownT = (ctx) => LC.tweenAt(ctx.state.tw, ctx.now()).value;
  const mapped = (A) => EDGES.map(([a, b]) => [LC.mulVec(A, a), LC.mulVec(A, b)]);

  const EN = {
    k: "Determinant · section 07",
    h: "The determinant is a volume; zero means no inverse",
    claim: "det A → 0:  two inputs, one output, no way back",
    concept: 'The determinant of a square matrix measures how much multiplication by the matrix expands or contracts space. If it is 0, space is contracted completely along at least one direction and loses all its volume; the matrix is then <b>singular</b> and has no inverse. <span class="cite">Deep Learning §2.11, §2.3</span>',
    predict: "Before you slide: when the house is flat, where do p₁ and p₂ go, and could any matrix send them back to where they were?",
    b: "<p>On the stage: a house on the floor, its shadow beneath it, and two marked points p₁ and p₂ on its wall that differ only in height. The slider applies A(t) = diag(1, 1 − t, 1): x and z are unchanged and height is multiplied by 1 − t. The house's volume shrinks by that factor, and that factor is det A(t).</p><p>At t = 1 the house lies flat on its shadow and det A = 0. p₁ and p₂ now sit on the same point. An inverse would have to send that one point back to two different places, and no function can. This is a singular matrix: a direction has been lost, and nothing computed afterwards can bring it back. The condition number picture shows the same collapse as a singular value reaching zero.</p>",
    controls: {flatten: "Flatten the house"},
    fmt: (v) => `t = ${(v / 100).toFixed(2)}`,
    readout: (t, det, rank, a, b) => {
      const gap = LC.norm(LC.sub(a, b));
      return gap < 1e-9
        ? `det A = <b>0.000</b>, rank ${rank}. A p₁ and A p₂ are the same point, <code>[${a.map((v) => v.toFixed(2)).join(", ")}]</code>. Sending it back would mean dividing by 0: there is no A⁻¹.`
        : `det A(t) = <b>${det.toFixed(3)}</b>, rank ${rank}: the house keeps ${(100 * det).toFixed(0)}% of its volume. A p₁ = <code>[${a.map((v) => v.toFixed(2)).join(", ")}]</code> and A p₂ = <code>[${b.map((v) => v.toFixed(2)).join(", ")}]</code> are still ${gap.toFixed(2)} apart, so an inverse can still tell them apart.`;
    },
    note: (det) => det === 0
      ? "det A = 0. Two points, one image. No matrix can send it back."
      : (det < 0.2 ? "Nearly flat: two different points, almost one image." : "The house and its shadow. Volume × det A."),
    aria: "A house drawn as glowing edges standing on a floor, its grey shadow beneath it, flattening onto the shadow as the slider brings the determinant to zero; two marked points on its wall merge into one."
  };
  const ES = {
    k: "Determinante · sección 07",
    h: "El determinante es un volumen; cero significa que no hay inversa",
    claim: "det A → 0:  dos entradas, una salida, sin vuelta atrás",
    concept: 'El determinante de una matriz cuadrada mide cuánto expande o contrae el espacio la multiplicación por la matriz. Si es 0, el espacio se contrae por completo en al menos una dirección y pierde todo su volumen; la matriz es entonces <b>singular</b> y no tiene inversa. <span class="cite">Deep Learning §2.11, §2.3</span>',
    predict: "Antes de deslizar: cuando la casa esté plana, ¿adónde van p₁ y p₂? ¿Podría alguna matriz devolverlos a donde estaban?",
    b: "<p>En el escenario: una casa sobre el suelo, su sombra debajo, y dos puntos marcados p₁ y p₂ en su pared que solo difieren en altura. El deslizador aplica A(t) = diag(1, 1 − t, 1): x y z no cambian y la altura se multiplica por 1 − t. El volumen de la casa se reduce por ese factor, y ese factor es det A(t).</p><p>En t = 1 la casa yace plana sobre su sombra y det A = 0. p₁ y p₂ están ahora en el mismo punto. Una inversa tendría que devolver ese único punto a dos lugares distintos, y ninguna función puede. Esto es una matriz singular: se ha perdido una dirección, y nada que se calcule después puede recuperarla. La imagen del número de condición muestra el mismo colapso como un valor singular que llega a cero.</p>",
    controls: {flatten: "Aplasta la casa"},
    fmt: (v) => `t = ${(v / 100).toFixed(2)}`,
    readout: (t, det, rank, a, b) => {
      const gap = LC.norm(LC.sub(a, b));
      return gap < 1e-9
        ? `det A = <b>0.000</b>, rango ${rank}. A p₁ y A p₂ son el mismo punto, <code>[${a.map((v) => v.toFixed(2)).join(", ")}]</code>. Devolverlo significaría dividir por 0: no hay A⁻¹.`
        : `det A(t) = <b>${det.toFixed(3)}</b>, rango ${rank}: la casa conserva el ${(100 * det).toFixed(0)}% de su volumen. A p₁ = <code>[${a.map((v) => v.toFixed(2)).join(", ")}]</code> y A p₂ = <code>[${b.map((v) => v.toFixed(2)).join(", ")}]</code> siguen a ${gap.toFixed(2)} de distancia, así que una inversa todavía los distingue.`;
    },
    note: (det) => det === 0
      ? "det A = 0. Dos puntos, una imagen. Ninguna matriz puede devolverla."
      : (det < 0.2 ? "Casi plana: dos puntos distintos, casi una imagen." : "La casa y su sombra. Volumen × det A."),
    aria: "Una casa dibujada con aristas brillantes sobre un suelo, su sombra gris debajo, aplastándose sobre la sombra a medida que el deslizador lleva el determinante a cero; dos puntos marcados en su pared se funden en uno."
  };

  window.LinalgScenes.register({
    id: "collapse", step: "3", section: "step-3",
    copy: {en: EN, es: ES},
    pose: {
      target: [0, 0.95, 0], content: 2.9, fov: 40,
      home: LC.orbitView(0.75, 0.3),
      // Not under the floor: from there the shadow is a lid.
      limits: {elMin: 0.03, elMax: 1.25}
    },

    presets: [
      {en: "Original house", es: "Casa original", values: () => ({flatten: 0})},
      {en: "Flatten completely", es: "Aplanar por completo", values: () => ({flatten: 100})}
    ],

    init(ctx) {
      const s = ctx.state;
      s.t = 0;
      s.tw = LC.tweenStart(0, 0, 0, 0);
      ctx.bindSlider("flatten", {
        token: "--v-res", format: ctx.T.fmt,
        lit: () => ctx.gl && ctx.gl.house,
        onInput: (v) => {
          s.t = v / 100;
          s.tw = LC.retarget(s.tw, s.t, ctx.now(), ctx.instant ? 0 : TWEEN_MS);
        }
      });
    },

    // The entrance: the house rises out of its shadow to where the slider says.
    arrive(ctx) {
      ctx.state.tw = LC.tweenStart(1, ctx.state.t, ctx.now(), 1200);
    },

    build(ctx) {
      const THREE = ctx.THREE;
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(ctx.stageColour(), 0.03);
      K.light(scene);
      scene.add(K.makeAxes([3, 2.5, 3]));

      // The floor, faint, and the shadow on it: the house's footprint, which
      // is also exactly where the house ends up.
      scene.add(K.makeGridPlane(GROUND,
        new THREE.MeshBasicMaterial({color: K.colour("--stage-mute"), transparent: true,
                                     opacity: 0.07, side: THREE.DoubleSide, depthWrite: false}),
        "--stage-mute", {lineOpacity: 0.5}));
      const shadow = K.makeQuad(FLOOR.map((p) => [p[0], 0.002, p[2]]),
        new THREE.MeshBasicMaterial({color: K.colour("--stage-mute"), transparent: true,
                                     opacity: 0.35, side: THREE.DoubleSide, depthWrite: false}));
      scene.add(shadow);
      const ridgeShadow = K.makeLine([[-W, 0.003, 0], [W, 0.003, 0]], "--stage-mute", {opacity: 0.6});
      scene.add(ridgeShadow);

      const house = K.makeTubes(EDGES, "--v-y", 0.022);
      scene.add(house);

      // The two marked points, and the tube between them that shrinks to
      // nothing: the length a solve would have to divide by.
      const dot = () => new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10),
        new THREE.MeshStandardMaterial({color: K.colour("--v-out"), emissive: K.colour("--v-out"), emissiveIntensity: 1.4}));
      const dots = [dot(), dot()];
      dots.forEach((d) => scene.add(d));
      const link = K.makeTube(PA, PB, "--v-res", 0.03);
      scene.add(link);
      const labels = [K.makeMatrixLabel(PA, "--v-out", "p₁"), K.makeMatrixLabel(PB, "--v-out", "p₂")];
      labels.forEach((l) => scene.add(l));

      const cam = new THREE.PerspectiveCamera(this.pose.fov, 1.4, 0.1, 300);
      const gl = {scene, cam, house, dots, link, labels, composer: true};
      ctx.gl = gl;
      return gl;
    },

    render(ctx, gl) {
      const t = shownT(ctx);
      const A = At(t);
      K.setTubes(gl.house, mapped(A));
      const a = LC.mulVec(A, PA), b = LC.mulVec(A, PB);
      gl.dots[0].position.copy(K.vec(a));
      gl.dots[1].position.copy(K.vec(b));
      K.setTube(gl.link, a, b);
      gl.link.visible = LC.norm(LC.sub(a, b)) > 1e-3;
      K.lit(gl.link, t > 0.85);
      gl.labels[0].position.copy(K.vec(LC.add(a, [0.75, -0.05, 0.25])));
      gl.labels[1].position.copy(K.vec(LC.add(b, [-0.75, 0.15, 0.25])));
      gl.labels[0].set(a);
      gl.labels[1].set(b);
    },

    flat(ctx) {
      const flat = ctx.flat;
      const S = 66 / (ctx.shownView().dolly || 1), CX = 400, CY = 300;
      const B = ctx.viewBasis();
      const P = (p) => K.iso(p, S, CX, CY, B);
      const A = At(ctx.state.t);
      const ax = K.flatAxes(P, [3, 2.5, 3]);
      flat.appendChild(ax.group);
      flat.appendChild(K.gridPlane2(P, GROUND, "--stage-mute",
        {fill: "--stage-mute", fillOpacity: 0.07, opacity: 0.25, lineOpacity: 0.5}));
      flat.appendChild(K.poly2(FLOOR.map(P), "--stage-mute", {fill: "--stage-mute", fillOpacity: 0.35, opacity: 0.5}));
      flat.appendChild(K.line2(P([-W, 0, 0]), P([W, 0, 0]), "--stage-mute", 1, {opacity: 0.6}));
      flat.appendChild(K.lines2(P, mapped(A), "--v-y", 2.2));
      const a = LC.mulVec(A, PA), b = LC.mulVec(A, PB);
      if (LC.norm(LC.sub(a, b)) > 1e-3) flat.appendChild(K.line2(P(a), P(b), "--v-res", 2.5));
      for (const q of [a, b]) { const s = P(q); flat.appendChild(K.el("circle", {cx: s[0], cy: s[1], r: 4.5, fill: K.css("--v-out")})); }
      ctx.place(ax.labels.concat([
        {at: P(LC.add(a, [0.75, -0.05, 0.25])), matrix: {values: a, caption: "p₁"}, colour: "--v-out"},
        {at: P(LC.add(b, [-0.75, 0.15, 0.25])), matrix: {values: b, caption: "p₂"}, colour: "--v-out"}
      ]));
    },

    readout(ctx) {
      const t = ctx.state.t;
      const A = At(t);
      const det = LC.det3(A);
      const rank = LC.rank(A);
      const a = LC.mulVec(A, PA), b = LC.mulVec(A, PB);
      return {
        html: ctx.T.readout(t, det, rank, a, b),
        note: ctx.T.note(det),
        data: {det: det.toFixed(3), rank: String(rank)}
      };
    }
  });
})();
