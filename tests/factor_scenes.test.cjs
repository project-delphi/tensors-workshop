// Pins the factorisation stage's scene contract (interactive/factor-scenes/*.js)
// without a browser. Mirrors tests/voice_scenes.test.cjs: the browser check
// drives the scenes but never reads their copy, so a scene that shipped
// without a Spanish string, or a control default off its own slider's grid,
// would say nothing in CI without this file.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PAGE = fs.readFileSync(
  path.join(__dirname, '..', 'interactive', 'factor-stage.html'), 'utf8');

// In the order factor-stage.html loads them.
const SCENES = ['tensor', 'unfold', 'hosvd', 'tucker', 'rank1', 'cp', 'budget'];
const REQUIRED_COPY = ['k', 'h', 'concept', 'claim', 'predict', 'b', 'aria'];

const STUB_KIT = {
  css: () => '#000000',
  fmt: (v, d) => String(v),
  el: () => ({appendChild() {}, setAttribute() {}}),
  label: () => {},
  numGrid: () => ({x0: 0, y0: 0, x1: 100, y1: 100, cellW: 10, cellH: 10}),
  bars: () => ({x0: 0, y0: 0, w: 0, h: 0}),
  slabStack: () => ({})
};

function load() {
  const FC = require('../interactive/factor-core.js');
  const scenes = [];
  global.window = {
    FactorScenes: {
      register(scene) {
        for (const k of ['id', 'section', 'copy', 'init', 'draw', 'readout']) {
          if (!(k in scene)) throw new Error('scene ' + (scene.id || '?') + ' lacks ' + k);
        }
        for (const lang of ['en', 'es']) {
          if (!scene.copy[lang]) throw new Error('scene ' + scene.id + ' lacks ' + lang + ' copy');
          if (!scene.copy[lang].aria) throw new Error('scene ' + scene.id + ' lacks ' + lang + ' aria');
        }
        scenes.push(scene);
      },
      list() { return scenes.slice(); }
    },
    FactorCore: FC,
    FactorKit: STUB_KIT
  };
  for (const name of SCENES) {
    delete require.cache[require.resolve(`../interactive/factor-scenes/${name}.js`)];
    require(`../interactive/factor-scenes/${name}.js`);
  }
  return {scenes, FC};
}

// A ctx good enough to run init() without a browser or the fetched tensor:
// the synthetic tensor (the same shape [4, 5, 24] as the real one), and stub
// implementations of everything a scene might touch but never draws with.
function makeCtx(FC, scene) {
  const syn = FC.synthetic();
  const state = {};
  return {
    FC, K: STUB_KIT, lang: 'en', embed: false,
    taxi: syn.T, standIn: false,
    names: {pickup: ['P0', 'P1', 'P2', 'P3'], dropoff: ['D0', 'D1', 'D2', 'D3', 'D4']},
    state, cache: {}, svg: STUB_KIT.el(), stage: null,
    get copy() { return scene.copy.en; },
    colour: () => '#000000', changed() {}, setControls() {}, control: () => null
  };
}

test('every scene registers, in the order the page loads them', () => {
  const {scenes} = load();
  assert.deepEqual(scenes.map((s) => s.id), SCENES);
});

test('every scene carries the same required copy in both languages, with matching key sets', () => {
  const {scenes} = load();
  for (const scene of scenes) {
    for (const lang of ['en', 'es']) {
      for (const key of REQUIRED_COPY) {
        assert.notEqual(scene.copy[lang][key], undefined, `${scene.id}: ${lang} copy is missing ${key}`);
      }
    }
    assert.deepEqual(
      Object.keys(scene.copy.en).sort(),
      Object.keys(scene.copy.es).sort(),
      `${scene.id}: en and es copy keys differ`);
  }
});

test('every control is labelled in both languages, and every select option too', () => {
  const {scenes} = load();
  for (const scene of scenes) {
    for (const lang of ['en', 'es']) {
      const copy = scene.copy[lang];
      for (const spec of scene.controls || []) {
        assert.ok(copy.controls && copy.controls[spec.id], `${scene.id}: ${lang} lacks a label for ${spec.id}`);
        if (spec.type === 'select') {
          for (const o of spec.options) {
            assert.ok(
              copy.options && copy.options[spec.id] && copy.options[spec.id][o],
              `${scene.id}: ${lang} lacks an option label for ${spec.id}=${o}`);
          }
        }
      }
    }
  }
});

test("every slider's default sits on its own min/step grid", () => {
  const {scenes, FC} = load();
  for (const scene of scenes) {
    const ctx = makeCtx(FC, scene);
    scene.init(ctx);
    for (const spec of scene.controls || []) {
      if (spec.type === 'select') continue;
      const v = ctx.state[spec.id];
      const steps = (v - spec.min) / (spec.step || 1);
      assert.ok(Number.isInteger(Math.round(steps * 1e6) / 1e6),
        `${scene.id}: default ${spec.id}=${v} is not reachable from min ${spec.min} by whole steps of ${spec.step}`);
    }
  }
});

test('init(), sync(), draw() and readout() all run without throwing, on the synthetic tensor', () => {
  const {scenes, FC} = load();
  for (const scene of scenes) {
    const ctx = makeCtx(FC, scene);
    scene.init(ctx);
    if (scene.sync) scene.sync(ctx);
    assert.doesNotThrow(() => scene.draw(ctx), `${scene.id}: draw() threw`);
    const r = scene.readout(ctx);
    assert.ok(r && typeof r === 'object', `${scene.id}: readout() did not return an object`);
  }
});

test('every registered scene has a section and an anchor span in the page', () => {
  const {scenes} = load();
  for (const scene of scenes) {
    assert.ok(PAGE.includes(`id="step-${scene.id}"`), `no <section id="step-${scene.id}"> in factor-stage.html`);
    assert.ok(PAGE.includes(`class="anchor" id="${scene.id}"`),
      `no <span class="anchor" id="${scene.id}"> in factor-stage.html`);
  }
});

test('the registry refuses a scene missing a required key', () => {
  const {FC} = load();
  const fakeWindow = {
    FactorScenes: {
      register(scene) {
        for (const k of ['id', 'section', 'copy', 'init', 'draw', 'readout']) {
          if (!(k in scene)) throw new Error('scene lacks ' + k);
        }
      }
    }
  };
  assert.throws(() => fakeWindow.FactorScenes.register({id: 'x', section: '10', copy: {en: {}, es: {}}, init() {}}));
});

test("hosvd's rank slider max is exactly what hosvdBases allows for each mode", () => {
  const raw = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'interactive', 'data', 'taxi.json'), 'utf8'));
  const FC = require('../interactive/factor-core.js');
  const taxi = FC.tensor(raw.data, raw.shape);
  const bases = FC.hosvdBases(taxi);
  const rmax = bases.map((b) => b.U[0].length);
  assert.deepEqual(rmax, [4, 5, 20]);
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'interactive', 'factor-scenes', 'hosvd.js'), 'utf8');
  assert.match(src, /RMAX_LABEL = \[4, 5, 20\]/);
});

test('nothing drawn on the stage is a hardcoded English string', () => {
  // The stage is not chrome. A label passed to K.label or K.numGrid as a
  // literal renders the same in both languages, and nothing else here would
  // say so: the copy-parity test above only compares the keys a scene
  // declares, and a string that never enters `copy` has no key to compare.
  // Four of these shipped on the tucker scene and three on cp, so the
  // Spanish stage read "core G (mode-2 unfolding)", "A (pickup)",
  // "B (dropoff)" and "C, column 0 (hour)" under a Spanish heading.
  //
  // A word made of digits, punctuation or a single letter is fine -- axis
  // numbers, "R", "k", a shape like "(4, 5, 24)" are the same in both
  // languages, which is why the stages draw those directly.
  const LABEL = /(?:K\.label\s*\(\s*svg\s*,[^,]+,[^,]+,|title:\s*)\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g;
  const WORDY = /[A-Za-z]{2,}/;
  const offences = [];
  for (const id of SCENES) {
    const file = path.join(__dirname, '..', 'interactive', 'factor-scenes', `${id}.js`);
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(LABEL)) {
      const text = m[2];
      // A template literal that only interpolates is not prose.
      if (!WORDY.test(text.replace(/\$\{[^}]*\}/g, ''))) continue;
      offences.push(`${id}.js: ${JSON.stringify(text)}`);
    }
  }
  assert.deepEqual(offences, [],
    'a literal drawn on the stage — route it through copy.en/copy.es instead');
});
