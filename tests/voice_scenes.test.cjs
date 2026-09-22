// Pins the voice stage's scene contract (interactive/voice-scenes/*.js) without
// a browser. The browser check drives the scenes but never reads their copy,
// and `check_teaching_materials.py` only pairs markers in .qmd and .md — so a
// scene that shipped without a Spanish `predict` rendered the literal word
// "undefined" in the predict-first slot for every Spanish reader, and nothing
// in CI said a word. This file is that word.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PAGE = fs.readFileSync(
  path.join(__dirname, '..', 'interactive', 'voice-stage.html'), 'utf8');

// In the order voice-stage.html loads them.
const SCENES = ['sample', 'quantize', 'array', 'frame', 'spectrum', 'window',
                 'scramble', 'lowrank', 'nmf', 'batch'];
// Every string the frame writes into the page, in both languages (see
// voice-stage.html's fillText() and changed(), and "What the copy says" in
// voice-scenes/README.md).
const REQUIRED_COPY = ['tab', 'k', 'h', 'claim', 'concept', 'b', 'predict', 'aria', 'np'];

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

// -------------------------------------------------- the display equations
// The <math> is static in the page and the caption under it is the scene's,
// so the two can drift apart in either direction and the page says nothing:
// fillText()'s `if (cap)` writes a caption only where an element exists, and
// an element with no copy is simply left empty. This is the pairing.

test('a scene writes an eqcap caption exactly where the page has one', () => {
  const withCopy = load().filter(s => s.copy.en.eqcap !== undefined).map(s => s.id);
  const withElement = SCENES.filter(id => PAGE.includes(`id="eqcap-${id}"`));
  assert.deepEqual(withCopy, withElement,
    'a caption with no element in the page, or an element with no caption');
  // Five of them, and both languages carry every one.
  assert.deepEqual(withElement, ['array', 'frame', 'spectrum', 'window', 'batch']);
  for (const scene of load()) {
    if (scene.copy.en.eqcap === undefined) continue;
    for (const lang of ['en', 'es']) {
      assert.ok(typeof scene.copy[lang].eqcap === 'string' && scene.copy[lang].eqcap.length > 40,
        `${scene.id}: ${lang} eqcap is missing or a stub`);
    }
  }
  // Every caption sits inside an .eq block that names it, which is what
  // makes the scroller a labelled region for a screen reader.
  for (const id of withElement) {
    assert.ok(PAGE.includes(`aria-labelledby="eqcap-${id}"`), `${id}: the scroller is unlabelled`);
  }
});

// ------------------------------------------------------- the NumPy blocks
// The <pre> is static in the page and the lines are the scene's, so the two
// can drift apart in either direction and the page says nothing: fillText()
// hides a block whose scene has no code(), and changed() writes into a block
// that may not be there. This is the pairing, the same shape as the eqcap one.

test('every scene has a code() and a <pre> for it to write into', () => {
  const withCode = load().filter(s => typeof s.code === 'function').map(s => s.id);
  const withElement = SCENES.filter(id => PAGE.includes(`id="np-${id}"`));
  assert.deepEqual(withCode, withElement,
    'a code() with no <pre> in the page, or a <pre> with no code()');
  // All ten: every picture on this page is of an array operation, so there is
  // no scene where the NumPy for it would be a stretch.
  assert.deepEqual(withElement, SCENES);
  // The label over each block is the frame's, and it needs an element too --
  // an unlabelled scrollable region is an axe failure, not a cosmetic one.
  for (const id of withElement) {
    assert.ok(PAGE.includes(`id="nplab-${id}"`), `${id}: the block is unlabelled`);
    assert.ok(PAGE.includes(`aria-labelledby="nplab-${id}"`), `${id}: the <pre> names no label`);
  }
});

test('code() returns real lines in both languages, at the opening controls', () => {
  for (const scene of load()) {
    for (const lang of ['en', 'es']) {
      const ctx = makeCtx(scene, lang);
      scene.init(ctx);
      if (scene.sync) scene.sync(ctx);
      const lines = scene.code(ctx);
      assert.ok(Array.isArray(lines) && lines.length > 0,
        `${scene.id}: ${lang} code() is empty`);
      for (const line of lines) {
        assert.equal(typeof line, 'string', `${scene.id}: ${lang} code() line is not a string`);
        assert.ok(!/undefined|NaN|\[object/.test(line),
          `${scene.id}: ${lang} code() line reads "${line}"`);
      }
      // A block wider than this scrolls, which is allowed -- `contain:
      // inline-size` is on the <pre> -- but a line far past the column is a
      // line nobody reads. The hop scene's sliding_window_view is the widest
      // thing here and the ceiling is set just above it.
      const widest = Math.max(...lines.map(l => l.length));
      assert.ok(widest <= 82, `${scene.id}: ${lang} code() is ${widest} chars wide`);
    }
  }
});

test('no code line carries a data-hl, which the page-wide token grep would read', () => {
  // The token test below greps the whole page text. A code block is written
  // into the page at runtime rather than served in it, so it could not trip
  // that grep today -- but a line containing the attribute would be a trap
  // waiting for the first person who serves one statically.
  for (const scene of load()) {
    for (const lang of ['en', 'es']) {
      const ctx = makeCtx(scene, lang);
      scene.init(ctx);
      if (scene.sync) scene.sync(ctx);
      for (const line of scene.code(ctx)) {
        assert.ok(!line.includes('data-hl'), `${scene.id}: ${lang} code() writes a data-hl`);
      }
    }
  }
});

test('the equations name six axes, and no more', () => {
  // Every [data-hl] token is an axis a scene bands in draw(). A seventh that
  // no scene answers to is a dashed underline that does nothing when it is
  // pointed at, which is worse than no affordance at all.
  const tokens = [...PAGE.matchAll(/data-hl="([a-z]+)"/g)].map(m => m[1]);
  assert.deepEqual([...new Set(tokens)].sort(),
    ['batch', 'chan', 'freq', 'hop', 'samp', 'time']);
  // And k is the rank on three other scenes, so it is never an index here.
  assert.ok(!tokens.includes('rank'));
});
