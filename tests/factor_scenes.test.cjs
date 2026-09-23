// Pins the factorisation stage's scene contract (interactive/factor-scenes/*.js)
// without a browser. Mirrors tests/voice_scenes.test.cjs: the browser check
// drives the scenes but never reads their copy, so a scene that shipped
// without a Spanish string, a control default off its own slider's grid, or
// a NumPy line past 82 characters would say nothing in CI without this file.
//
// Unlike the voice test, the kit here is the real one. It is given a DOM
// small enough to fit in this file -- elements that remember their
// attributes and children -- so every scene's draw() runs the code the page
// runs, and every attribute it writes is checked for NaN: an SVG polygon
// with a NaN in its points is not an error anywhere, it is just not there.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', 'interactive');
const PAGE = fs.readFileSync(path.join(ROOT, 'factor-stage.html'), 'utf8');

// In the order factor-stage.html loads them.
const SCENES = ['tensor', 'unfold', 'hosvd', 'tucker', 'rank1', 'cp', 'als', 'budget'];
const GL_SCENES = ['tensor', 'unfold', 'tucker', 'rank1'];
const REQUIRED_COPY = ['k', 'h', 'concept', 'claim', 'predict', 'b', 'aria', 'eqcap', 'np'];
const HL_TOKENS = ['core', 'dropoff', 'hour', 'pickup', 'rank'];

// ------------------------------------------------------------ a tiny DOM
function fakeElement(tag) {
  return {
    tag, attrs: {}, children: [], textContent: '',
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    appendChild(c) { this.children.push(c); return c; }
  };
}
function walk(node, visit) {
  visit(node);
  for (const c of node.children || []) walk(c, visit);
}

function load() {
  global.document = {createElementNS: (ns, tag) => fakeElement(tag), documentElement: {}};
  global.getComputedStyle = () => ({getPropertyValue: () => '#123456'});
  const LC = require('../interactive/linalg-core.js');
  global.LinalgCore = LC;
  const FC = require('../interactive/factor-core.js');
  global.FactorCore = FC;
  delete require.cache[require.resolve('../interactive/factor-kit.js')];
  const K = require('../interactive/factor-kit.js');
  const scenes = [];
  global.window = {
    FactorScenes: {
      register(scene) { K.FactorScenes.register(scene); scenes.push(scene); },
      list() { return scenes.slice(); }
    },
    FactorCore: FC, FactorKit: K, LinalgCore: LC
  };
  for (const name of SCENES) {
    delete require.cache[require.resolve(`../interactive/factor-scenes/${name}.js`)];
    require(`../interactive/factor-scenes/${name}.js`);
  }
  return {scenes, FC, K, LC};
}

const RAW = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'taxi.json'), 'utf8'));
const SHORT = {Bronx: 'Bx', Brooklyn: 'Bk', Manhattan: 'Mn', Queens: 'Qn', 'Staten Island': 'SI'};

// A ctx good enough to run a scene without a browser: the real tensor, the
// real kit, the page's own projection from the home view, and a clock that
// does not move -- `instant`, so every eased picture is at its target.
function makeCtx(env, scene, lang) {
  const {FC, K, LC} = env;
  const taxi = FC.tensor(RAW.data, RAW.shape);
  const svg = fakeElement('svg');
  const home = () => LC.orbitView(scene.pose.home.az, scene.pose.home.el);
  const ctx = {
    FC, K, LC, lang: lang || 'en', embed: false, reduceMotion: true,
    taxi, standIn: false,
    names: {pickup: RAW.pickup, dropoff: RAW.dropoff,
            pickupShort: RAW.pickup.map((n) => SHORT[n]), dropoffShort: RAW.dropoff.map((n) => SHORT[n])},
    state: {}, cache: {}, svg, stage: null,
    get copy() { return scene.copy[lang || 'en']; },
    colour: () => '#123456', hl: null, hover: null,
    now: () => 1000, instant: true,
    changed() {}, setControls(vals) { Object.assign(ctx.state, vals); }, control: () => null,
    aspect: 1.6
  };
  if (scene.gl) {
    const view = () => (scene.framing ? scene.framing(ctx, home()) : home());
    ctx.basis = () => K.viewBasis(view(), scene.pose.target || [0, 0, 0]);
    ctx.projector = (points, box) => K.projector(points, ctx.basis(), box);
  }
  return ctx;
}

// Every value a control can take, or both ends of each when the whole grid
// would be too many -- the widest line is usually at a corner. A play
// button is not a value.
function settings(scene) {
  const axes = (scene.controls || []).filter((spec) => spec.type !== 'play').map((spec) => spec.type === 'select'
    ? spec.options.map((o) => [spec.id, o])
    : Array.from({length: Math.round((spec.max - spec.min) / (spec.step || 1)) + 1},
        (_, i) => [spec.id, spec.min + i * (spec.step || 1)]));
  const size = axes.reduce((n, a) => n * a.length, 1);
  const pick = size > 400 ? axes.map((a) => [a[0], a[a.length - 1]]) : axes;
  let out = [{}];
  for (const a of pick) out = out.flatMap((o) => a.map(([k, v]) => ({...o, [k]: v})));
  return out;
}

test('every scene registers, in the order the page loads them', () => {
  const {scenes} = load();
  assert.deepEqual(scenes.map((s) => s.id), SCENES);
  for (const id of SCENES) assert.ok(PAGE.includes(`src="factor-scenes/${id}.js"`), `${id}: no <script src>`);
});

test('every scene carries the same required copy in both languages, with matching key sets', () => {
  const {scenes} = load();
  for (const scene of scenes) {
    for (const lang of ['en', 'es']) {
      for (const key of REQUIRED_COPY) {
        assert.notEqual(scene.copy[lang][key], undefined, `${scene.id}: ${lang} copy is missing ${key}`);
      }
    }
    assert.deepEqual(Object.keys(scene.copy.en).sort(), Object.keys(scene.copy.es).sort(),
      `${scene.id}: en and es copy keys differ`);
    assert.deepEqual(Object.keys(scene.copy.en.np).sort(), Object.keys(scene.copy.es.np).sort(),
      `${scene.id}: en and es NumPy comments differ`);
  }
});

test('every control is labelled in both languages, and every select option too', () => {
  const env = load();
  for (const scene of env.scenes) {
    for (const lang of ['en', 'es']) {
      const copy = scene.copy[lang];
      const ctx = makeCtx(env, scene, lang);
      scene.init(ctx);
      for (const spec of scene.controls || []) {
        assert.ok(copy.controls && copy.controls[spec.id], `${scene.id}: ${lang} lacks a label for ${spec.id}`);
        if (spec.type !== 'select') continue;
        const opts = spec.available ? spec.available(ctx) : spec.options;
        for (const o of opts) {
          const table = copy.options && copy.options[spec.id];
          const label = typeof table === 'function' ? table(o, ctx) : table && table[o];
          assert.ok(label, `${scene.id}: ${lang} lacks an option label for ${spec.id}=${o}`);
        }
      }
    }
  }
});

test("every slider's default sits on its own min/step grid, and a play button walks a real slider", () => {
  const env = load();
  for (const scene of env.scenes) {
    const ctx = makeCtx(env, scene);
    scene.init(ctx);
    for (const spec of scene.controls || []) {
      if (spec.type === 'select') continue;
      if (spec.type === 'play') {
        const target = scene.controls.find((c) => c.id === spec.target);
        assert.ok(target && target.type === 'range', `${scene.id}: ${spec.id} walks no slider`);
        continue;
      }
      const v = ctx.state[spec.id];
      const steps = (v - spec.min) / (spec.step || 1);
      assert.ok(Number.isInteger(Math.round(steps * 1e6) / 1e6),
        `${scene.id}: default ${spec.id}=${v} is not reachable from min ${spec.min} by whole steps of ${spec.step}`);
    }
  }
});

test('init(), draw(), readout() and code() run in both languages, and draw no NaN', () => {
  const env = load();
  for (const scene of env.scenes) {
    for (const lang of ['en', 'es']) {
      for (const vals of settings(scene).filter((_, i, all) => i === 0 || i === all.length - 1)) {
        const ctx = makeCtx(env, scene, lang);
        scene.init(ctx);
        Object.assign(ctx.state, vals);
        if (scene.sync) scene.sync(ctx);
        assert.doesNotThrow(() => scene.draw(ctx), `${scene.id} ${lang}: draw() threw at ${JSON.stringify(vals)}`);
        let nodes = 0;
        walk(ctx.svg, (n) => {
          nodes++;
          for (const [k, v] of Object.entries(n.attrs || {})) {
            assert.ok(!/NaN|undefined|Infinity/.test(v), `${scene.id} ${lang}: ${n.tag} ${k}="${v}" at ${JSON.stringify(vals)}`);
          }
          assert.ok(!/NaN|undefined/.test(n.textContent || ''), `${scene.id} ${lang}: text "${n.textContent}"`);
        });
        assert.ok(nodes > 20, `${scene.id} ${lang}: draw() drew almost nothing`);
        const r = scene.readout(ctx);
        assert.ok(r && r.html && r.data, `${scene.id}: readout() returned no html or data`);
        assert.ok(!/NaN|undefined/.test(r.html), `${scene.id} ${lang}: readout reads ${r.html}`);
        for (const k of Object.keys(r.data)) assert.equal(k, k.toLowerCase(), `${scene.id}: data key ${k} is not lowercase`);
        for (const k of ['gl', 'cam', 'hl', 'hover', 'playing', 'paused', 'ready']) {
          assert.ok(!(k in r.data), `${scene.id}: readout writes the frame's own data-${k}`);
        }
      }
    }
  }
});

test('every registered scene has a section, an anchor, an equation and a NumPy block', () => {
  const {scenes} = load();
  for (const scene of scenes) {
    const id = scene.id;
    assert.ok(PAGE.includes(`id="step-${id}"`), `no <section id="step-${id}">`);
    assert.ok(PAGE.includes(`class="anchor" id="${id}"`), `no <span class="anchor" id="${id}">`);
    assert.ok(PAGE.includes(`id="eqcap-${id}"`), `${id}: no equation caption in the page`);
    assert.ok(PAGE.includes(`aria-labelledby="eqcap-${id}"`), `${id}: the equation scroller is unlabelled`);
    assert.ok(PAGE.includes(`id="np-${id}"`), `${id}: no NumPy block`);
    assert.ok(PAGE.includes(`id="nplab-${id}"`) && PAGE.includes(`aria-labelledby="nplab-${id}"`),
      `${id}: the NumPy block is unlabelled`);
    for (const lang of ['en', 'es']) {
      assert.ok(typeof scene.copy[lang].eqcap === 'string' && scene.copy[lang].eqcap.length > 40,
        `${id}: ${lang} eqcap is missing or a stub`);
    }
  }
});

test('every scene shows its NumPy, 82 characters at most, in both languages, at every setting', () => {
  const env = load();
  for (const scene of env.scenes) {
    for (const lang of ['en', 'es']) {
      for (const vals of settings(scene)) {
        const ctx = makeCtx(env, scene, lang);
        scene.init(ctx);
        Object.assign(ctx.state, vals);
        if (scene.sync) scene.sync(ctx);
        const lines = scene.code(ctx);
        assert.ok(lines.length > 0, `${scene.id}: code() is empty`);
        for (const line of lines) {
          assert.equal(typeof line, 'string');
          assert.ok(!/undefined|NaN|\[object/.test(line), `${scene.id} ${lang}: "${line}"`);
          assert.ok(line.length <= 82,
            `${scene.id} ${lang} at ${JSON.stringify(vals)}: ${line.length} characters: ${line}`);
        }
      }
    }
  }
});

test('the lines the page exists to teach appear verbatim, and only NumPy', () => {
  const env = load();
  const all = env.scenes.map((scene) => {
    const ctx = makeCtx(env, scene);
    scene.init(ctx);
    if (scene.sync) scene.sync(ctx);
    return scene.code(ctx).join('\n');
  }).join('\n');
  for (const line of [
    'np.moveaxis(T, 2, 0).reshape(24, -1)',
    'U, s, Vt = np.linalg.svd(X, full_matrices=False)',
    'G = np.einsum("ijk,ia,jb,kc->abc", T, A, B, C)',
    'T_hat = np.einsum("abc,ia,jb,kc->ijk", G, A, B, C)',
    'T_hat = np.einsum("r,ir,jr,kr->ijk", lam, A, B, C)',
    'M = np.einsum("ijk,jr,kr->ir", T, B, C)',
    'A = M @ np.linalg.pinv((B.T @ B) * (C.T @ C))'
  ]) assert.ok(all.includes(line), `missing: ${line}`);
  assert.ok(!/torch|tensorflow|jax|tensorly|\btl\./i.test(all), 'a framework crept into the NumPy');
});

test('the equations name five pieces, and every scene answers to the ones in its section', () => {
  const {scenes} = load();
  const tokens = [...PAGE.matchAll(/data-hl="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(tokens)].sort(), HL_TOKENS);
  for (const scene of scenes) {
    const start = PAGE.indexOf(`id="step-${scene.id}"`);
    const end = PAGE.indexOf('</section>', start);
    const mine = new Set([...PAGE.slice(start, end).matchAll(/data-hl="([a-z]+)"/g)].map((m) => m[1]));
    for (const t of mine) {
      assert.ok((scene.hl || []).includes(t), `${scene.id}: its equation names "${t}" and the scene does not light it`);
    }
  }
});

test('three.js scenes carry a pose, a builder, a renderer, bounds and a flat twin', () => {
  const {scenes} = load();
  assert.deepEqual(scenes.filter((s) => s.gl).map((s) => s.id), GL_SCENES);
  for (const scene of scenes.filter((s) => s.gl)) {
    const P = scene.pose;
    assert.ok(P && P.home && typeof P.home.az === 'number' && typeof P.fov === 'number', `${scene.id}: pose`);
    assert.ok(P.limits && P.limits.elMax > P.limits.elMin, `${scene.id}: limits`);
    for (const k of ['build', 'render', 'bounds', 'draw']) assert.equal(typeof scene[k], 'function', `${scene.id}: ${k}`);
  }
});

test('the registry refuses a scene missing a required key, and a three.js scene with no bounds', () => {
  const {K} = load();
  const copy = {en: {aria: () => ''}, es: {aria: () => ''}};
  assert.throws(() => K.FactorScenes.register({id: 'x', section: '10', copy, init() {}, draw() {}, readout() {}}), /lacks code/);
  assert.throws(() => K.FactorScenes.register({
    id: 'y', section: '10', gl: true, copy, init() {}, draw() {}, readout() {}, code() {},
    pose: {}, build() {}, render() {}
  }), /lacks bounds/);
});

test('four scenes open a part, in reading order', () => {
  const {scenes} = load();
  assert.deepEqual(scenes.filter((s) => s.part).map((s) => s.id), ['tensor', 'hosvd', 'rank1', 'budget']);
});

test("hosvd's rank slider max is exactly what hosvdBases allows for each mode", () => {
  const {FC} = load();
  const taxi = FC.tensor(RAW.data, RAW.shape);
  assert.deepEqual(FC.hosvdBases(taxi).map((b) => b.U[0].length), [4, 5, 20]);
  const src = fs.readFileSync(path.join(ROOT, 'factor-scenes', 'hosvd.js'), 'utf8');
  assert.match(src, /RMAX_LABEL = \[4, 5, 20\]/);
});

// ------------------------------------------------------------ the morph
test('the unfold morph starts at the cube, ends at the unfolding, and no two voxels ever cross', () => {
  const {FC, K} = load();
  const shape = RAW.shape;
  for (const m of [0, 1, 2]) {
    for (let flat = 0; flat < 480; flat++) {
      const ix = FC.multiIndex(flat, shape);
      const a = K.unfoldPose(ix, shape, m, 0), c = K.cubePos(ix, shape);
      const b = K.unfoldPose(ix, shape, m, 1), p = FC.unfoldIndex(ix, shape, m);
      for (let q = 0; q < 3; q++) assert.ok(Math.abs(a[q] - c[q]) < 1e-9, `mode ${m} cell ${flat} does not start on the cube`);
      assert.ok(Math.abs(b[0] - (p.col - (p.cols - 1) / 2)) < 1e-9 && Math.abs(b[1] - ((p.rows - 1) / 2 - p.row)) < 1e-9 &&
        Math.abs(b[2]) < 1e-9, `mode ${m} cell ${flat} does not land on its unfolding address`);
    }
    // Every voxel is at most 0.92 of a cell across. While the cube turns the
    // voxels turn with it, so the test measures in the turned frame; after
    // that they are axis-aligned again.
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const turn = K.unfoldTurn(m, t);
      const P = [];
      for (let flat = 0; flat < 480; flat++) {
        const p = K.unfoldPose(FC.multiIndex(flat, shape), shape, m, t);
        P.push(turn ? K.rotate(p, turn.axis, -turn.angle) : p);
      }
      for (let a = 0; a < 480; a++)
        for (let b = a + 1; b < 480; b++) {
          const d0 = Math.abs(P[a][0] - P[b][0]), d1 = Math.abs(P[a][1] - P[b][1]), d2 = Math.abs(P[a][2] - P[b][2]);
          assert.ok(d0 >= 0.92 || d1 >= 0.92 || d2 >= 0.92, `mode ${m}, t ${t.toFixed(2)}: cells ${a} and ${b} overlap`);
        }
    }
  }
});

test('the flat twin is fitted inside its box at every orbit the limits allow', () => {
  const {K, LC} = load();
  const pts = K.corners([-14, -3, -4], [15, 3, 3]);
  const box = [40, 56, 780, 396];
  for (let az = -1.4; az <= 1.4; az += 0.2)
    for (let el = -0.3; el <= 1.2; el += 0.15) {
      const P = K.projector(pts, K.viewBasis(LC.orbitView(az, el), [0, 0, 0]), box);
      for (const p of pts) {
        const [x, y] = P(p);
        assert.ok(x >= box[0] - 1e-6 && x <= box[2] + 1e-6 && y >= box[1] - 1e-6 && y <= box[3] + 1e-6,
          `az ${az.toFixed(1)} el ${el.toFixed(2)}: (${x.toFixed(1)}, ${y.toFixed(1)}) outside the box`);
      }
    }
});

test('nothing drawn on the stage is a hardcoded English string', () => {
  // The stage is not chrome. A label passed as a literal renders the same in
  // both languages, and nothing else here would say so. A word made of
  // digits, punctuation or a single letter is fine, and so are the two
  // models' names, which are the same in both.
  const LABEL = /(?:K\.label\s*\(\s*svg\s*,[^,]+,[^,]+,|title:\s*|text:\s*|label2d\s*\()\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g;
  const WORDY = /[A-Za-z]{2,}/;
  const NAMES = /\b(CP|Tucker)\b/g;
  const offences = [];
  for (const id of SCENES) {
    const src = fs.readFileSync(path.join(ROOT, 'factor-scenes', `${id}.js`), 'utf8');
    for (const m of src.matchAll(LABEL)) {
      const text = m[2].replace(/\$\{[^}]*\}/g, '').replace(NAMES, '');
      if (!WORDY.test(text)) continue;
      offences.push(`${id}.js: ${JSON.stringify(m[2])}`);
    }
  }
  assert.deepEqual(offences, [], 'a literal drawn on the stage — route it through copy.en/copy.es instead');
});
