// Pins the voice stage's scene contract (interactive/voice-scenes/*.js) without
// a browser. The browser check drives the scenes but never reads their copy,
// and `check_teaching_materials.py` only pairs markers in .qmd and .md — so a
// scene that shipped without a Spanish `predict` rendered the literal word
// "undefined" in the predict-first slot for every Spanish reader, and nothing
// in CI said a word. This file is that word.
const test = require('node:test');
const assert = require('node:assert/strict');

// In the order voice-stage.html loads them.
const SCENES = ['sample', 'quantize', 'array', 'frame', 'spectrum', 'window',
                 'scramble', 'lowrank', 'nmf'];
// Every string the frame writes into the page, in both languages (see
// voice-stage.html's fillText() and changed(), and "What the copy says" in
// voice-scenes/README.md).
const REQUIRED_COPY = ['tab', 'k', 'h', 'claim', 'concept', 'b', 'predict', 'aria'];

// A ctx good enough to run a scene's init() without a browser: a real signal
// (a full-length tone, the shape every built-in recording actually has) and
// stub implementations of everything init() might touch but never draws
// with. No scene's init() reaches the canvas or three.js -- that is build()
// and draw()'s job -- so this is enough to read back the state a slider
// opens on.
function makeCtx(scene) {
  const AC = require('../interactive/audio-core.js');
  const LC = require('../interactive/linalg-core.js');
  const kit = require('../interactive/voice-kit.js');
  const RATE = 48000, SAMPLES = 237568;
  const state = {};
  return {
    AC, LC, K: kit, lang: 'en', embed: false, reduceMotion: false,
    rate: RATE, state, cache: {}, stage: null, canvas: null, g: null,
    W: 800, H: 400, aspect: 2,
    get copy() { return scene.copy.en; },
    signal: AC.tone(SAMPLES, RATE, 440), standIn: false, source: 'test',
    colour: () => '#000000', now: () => 0, instant: true,
    play() {}, stop() {}, head: () => -1, changed() {}, setControls() {},
    control: () => null, THREE: null, AD: null, glReady: false, gl: null,
    shownView: () => null, label: () => {}
  };
}

function load() {
  // voice-kit.js closes over its own `scenes` array; clearing only the scene
  // files and not this one re-requires the same module instance, so
  // register() keeps appending to the array that survived from the last
  // call -- three calls in one process read back 9, then 18, then 27 ids.
  delete require.cache[require.resolve('../interactive/voice-kit.js')];
  const kit = require('../interactive/voice-kit.js');
  global.window = {VoiceScenes: kit.VoiceScenes};
  for (const name of SCENES) {
    delete require.cache[require.resolve(`../interactive/voice-scenes/${name}.js`)];
    require(`../interactive/voice-scenes/${name}.js`);
  }
  return kit.VoiceScenes.list();
}

test('every scene registers, in the order the page loads them', () => {
  const scenes = load();
  assert.deepEqual(scenes.map(s => s.id), SCENES);
});

test('every scene carries the same copy keys in both languages', () => {
  for (const scene of load()) {
    for (const lang of ['en', 'es']) {
      for (const key of REQUIRED_COPY) {
        assert.notEqual(scene.copy[lang][key], undefined,
          `${scene.id}: ${lang} copy is missing ${key}`);
      }
    }
    assert.deepEqual(
      Object.keys(scene.copy.en).sort(),
      Object.keys(scene.copy.es).sort(),
      `${scene.id}: en and es copy keys differ`);
  }
});

test('every control a scene declares is labelled in both languages', () => {
  for (const scene of load()) {
    for (const spec of scene.controls || []) {
      for (const lang of ['en', 'es']) {
        const copy = scene.copy[lang];
        assert.notEqual(copy.controls && copy.controls[spec.id], undefined,
          `${scene.id}: ${lang} has no label for control ${spec.id}`);
        if (spec.type === 'select') {
          for (const option of spec.options) {
            assert.notEqual(copy.options && copy.options[spec.id] && copy.options[spec.id][option],
              undefined, `${scene.id}: ${lang} has no label for ${spec.id}=${option}`);
          }
        }
      }
    }
  }
});

test('a slider opens on a value its own min/step grid contains', () => {
  // A range input snaps a value that is off the grid, which silently seeds the
  // scene from a number nobody chose. Checking the spec alone (min, max,
  // step form a whole grid) never read the value init() actually seeds --
  // this runs init() and checks the opening value sits on that grid too.
  for (const scene of load()) {
    const ctx = makeCtx(scene);
    scene.init(ctx);
    for (const spec of scene.controls || []) {
      if (spec.type === 'select') continue;
      const step = spec.step || 1;
      assert.equal((spec.max - spec.min) % step, 0,
        `${scene.id}: ${spec.id} range is not a whole number of steps`);
      const initial = ctx.state[spec.id];
      assert.notEqual(initial, undefined,
        `${scene.id}: ${spec.id} has no opening value`);
      assert.ok(initial >= spec.min && initial <= spec.max,
        `${scene.id}: ${spec.id} opens at ${initial}, outside [${spec.min}, ${spec.max}]`);
      assert.equal((initial - spec.min) % step, 0,
        `${scene.id}: ${spec.id} opens on ${initial}, off its own min/step grid`);
    }
  }
});

test('the registry refuses a scene missing its aria copy', () => {
  // voice-kit.js's own register() enforces only this much at runtime (id,
  // section, copy, init, draw, readout, and aria in both languages); the
  // fuller contract -- tab/k/h/claim/concept/b/predict, matching across
  // languages -- is what the two tests above check statically, over every
  // registered scene, since that is the gap nothing else in CI closes.
  const kit = require('../interactive/voice-kit.js');
  const base = {
    id: 'probe', section: '00', init() {}, draw() {}, readout() { return {}; },
    copy: {
      en: {tab: 'a', k: 'a', h: 'a', claim: 'a', concept: 'a', b: 'a', predict: 'a', aria: () => ''},
      es: {tab: 'a', k: 'a', h: 'a', claim: 'a', concept: 'a', b: 'a', predict: 'a'}
    }
  };
  assert.throws(() => kit.VoiceScenes.register(base), /probe lacks es aria/);
});
