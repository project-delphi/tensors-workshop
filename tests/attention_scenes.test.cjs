// Pins the attention stage's scene contract (interactive/attention-scenes/*.js)
// without a browser, the way tests/voice_scenes.test.cjs pins the audio
// stage's. The browser check drives the scenes but never reads their copy.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PAGE = fs.readFileSync(
  path.join(__dirname, '..', 'interactive', 'attention-stage.html'), 'utf8');

// In the order attention-stage.html loads them.
const SCENES = ['words', 'ids', 'embed', 'project', 'scores', 'scale', 'softmax', 'output',
                'heads', 'batch'];
const REQUIRED_COPY = ['tab', 'k', 'h', 'claim', 'concept', 'b', 'predict', 'aria'];

function makeCtx(scene) {
  const AC = require('../interactive/attention-core.js');
  const LC = require('../interactive/linalg-core.js');
  const kit = require('../interactive/attention-kit.js');
  const state = {};
  return {
    AC, LC, K: kit, lang: 'en', embed: false, reduceMotion: false,
    state, cache: {}, stage: null, svg: null, W: 640, H: 400,
    get copy() { return scene.copy.en; },
    get hl() { return null; },
    colour: () => '#000000', changed() {}, setControls() {},
    control: () => null
  };
}

function load() {
  // attention-kit.js closes over its own `scenes` array; clearing only the
  // scene files and not this one re-requires the same module instance, so
  // register() keeps appending to the array that survived the last call.
  delete require.cache[require.resolve('../interactive/attention-kit.js')];
  const kit = require('../interactive/attention-kit.js');
  global.window = {AttentionScenes: kit.AttentionScenes};
  for (const name of SCENES) {
    delete require.cache[require.resolve(`../interactive/attention-scenes/${name}.js`)];
    require(`../interactive/attention-scenes/${name}.js`);
  }
  return kit.AttentionScenes.list();
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
  for (const scene of load()) {
    const ctx = makeCtx(scene);
    scene.init(ctx);
    for (const spec of scene.controls || []) {
      if (spec.type === 'select') continue;
      const step = spec.step || 1;
      assert.equal((spec.max - spec.min) % step, 0,
        `${scene.id}: ${spec.id} range is not a whole number of steps`);
      const initial = ctx.state[spec.id];
      assert.notEqual(initial, undefined, `${scene.id}: ${spec.id} has no opening value`);
      assert.ok(initial >= spec.min && initial <= spec.max,
        `${scene.id}: ${spec.id} opens at ${initial}, outside [${spec.min}, ${spec.max}]`);
      assert.equal((initial - spec.min) % step, 0,
        `${scene.id}: ${spec.id} opens on ${initial}, off its own min/step grid`);
    }
  }
});

// The frame builds a `.val` span beside every control's label and fills it
// from that control's own `fmt`. With no `fmt` it fills the span with the
// empty string -- so the slider renders, drags, redraws the stage, and
// never says what it is set to. Six of the seven scenes shipped that way:
// a labelled, styled, empty span next to every slider on the page.
test('every slider says what it is set to', () => {
  for (const scene of load()) {
    const ctx = makeCtx(scene);
    scene.init(ctx);
    for (const spec of scene.controls || []) {
      if (spec.type === 'select') continue;
      assert.equal(typeof spec.fmt, 'function',
        `${scene.id}: ${spec.id} is a slider with no fmt, so its value never reaches its label`);
      const shown = spec.fmt(ctx.state[spec.id], ctx);
      assert.ok(typeof shown === 'string' && shown.length,
        `${scene.id}: ${spec.id}'s fmt writes nothing at its opening value`);
    }
  }
});

test('the registry refuses a scene missing its aria copy', () => {
  const kit = require('../interactive/attention-kit.js');
  const base = {
    id: 'probe', section: '00', init() {}, draw() {}, readout() { return {}; },
    copy: {
      en: {tab: 'a', k: 'a', h: 'a', claim: 'a', concept: 'a', b: 'a', predict: 'a', aria: () => ''},
      es: {tab: 'a', k: 'a', h: 'a', claim: 'a', concept: 'a', b: 'a', predict: 'a'}
    }
  };
  assert.throws(() => kit.AttentionScenes.register(base), /probe lacks es aria/);
});

// Every scene has a section and an anchor span in the page -- the silent
// hole voice-scenes/README.md warns about: missing this and the scene boots
// fine but the notebooks and handbooks' link to it never resolves.
test('every scene has a section and an anchor span in the page', () => {
  for (const id of SCENES) {
    assert.ok(PAGE.includes(`id="step-${id}"`), `${id}: no section in the page`);
    assert.ok(PAGE.includes(`class="anchor" id="${id}"`), `${id}: no anchor span in the page`);
  }
});

// -------------------------------------------------- the display equations
test('a scene writes an eqcap caption exactly where the page has one', () => {
  const withCopy = load().filter(s => s.copy.en.eqcap !== undefined).map(s => s.id);
  const withElement = SCENES.filter(id => PAGE.includes(`id="eqcap-${id}"`));
  assert.deepEqual(withCopy, withElement,
    'a caption with no element in the page, or an element with no caption');
  assert.deepEqual(withElement, ['scores', 'scale', 'softmax', 'output', 'batch']);
  for (const scene of load()) {
    if (scene.copy.en.eqcap === undefined) continue;
    for (const lang of ['en', 'es']) {
      assert.ok(typeof scene.copy[lang].eqcap === 'string' && scene.copy[lang].eqcap.length > 40,
        `${scene.id}: ${lang} eqcap is missing or a stub`);
    }
  }
  for (const id of withElement) {
    assert.ok(PAGE.includes(`aria-labelledby="eqcap-${id}"`), `${id}: the scroller is unlabelled`);
  }
});

test('the equations name five axes, and no more', () => {
  const tokens = [...PAGE.matchAll(/data-hl="([a-z]+)"/g)].map(m => m[1]);
  assert.deepEqual([...new Set(tokens)].sort(),
    ['batch', 'feat', 'head', 'key', 'query']);
});

// ------------------------------------------------------ the NumPy blocks
// Every value a control can take, or both ends of each slider when the
// whole grid would be too many -- the widest line is usually at a corner.
function settings(scene) {
  const axes = (scene.controls || []).map(spec => spec.type === 'select'
    ? spec.options.map(o => [spec.id, o])
    : Array.from({length: (spec.max - spec.min) / (spec.step || 1) + 1},
        (_, i) => [spec.id, spec.min + i * (spec.step || 1)]));
  const size = axes.reduce((n, a) => n * a.length, 1);
  const pick = size > 512 ? axes.map(a => [a[0], a[a.length - 1]]) : axes;
  let out = [{}];
  for (const a of pick) out = out.flatMap(o => a.map(([k, v]) => ({...o, [k]: v})));
  return out;
}

test('every scene shows its NumPy, 82 characters at most, in both languages', () => {
  for (const scene of load()) {
    assert.equal(typeof scene.code, 'function', `${scene.id}: no code()`);
    assert.ok(PAGE.includes(`id="np-${scene.id}"`), `${scene.id}: no NumPy block in the page`);
    for (const lang of ['en', 'es']) {
      for (const vals of settings(scene)) {
        const ctx = makeCtx(scene);
        Object.defineProperty(ctx, 'copy', {get: () => scene.copy[lang]});
        scene.init(ctx);
        Object.assign(ctx.state, vals);
        if (scene.sync) scene.sync(ctx);
        const lines = scene.code(ctx);
        assert.ok(lines.length > 0, `${scene.id}: code() is empty`);
        for (const line of lines) {
          assert.ok(!/undefined|NaN/.test(line), `${scene.id} ${lang}: "${line}"`);
          assert.ok(line.length <= 82,
            `${scene.id} ${lang} at ${JSON.stringify(vals)}: ${line.length} characters: ${line}`);
        }
      }
    }
  }
});

// The five lines the page exists to teach, spelled exactly the way a reader
// would type them.
test('the core NumPy lines appear verbatim', () => {
  const all = load().map(scene => {
    const ctx = makeCtx(scene);
    scene.init(ctx);
    return scene.code(ctx).join('\n');
  }).join('\n');
  for (const line of [
    'embeddings = vocab_matrix[token_ids]',
    'Q = np.dot(embeddings, W_q)',
    'K = np.dot(embeddings, W_k)',
    'V = np.dot(embeddings, W_v)',
    'scores = np.dot(Q, K.T) / np.sqrt(d_k)',
    'attn_weights = np.exp(scores) / np.sum(np.exp(scores), axis=-1, keepdims=True)',
    'output = np.dot(attn_weights, V)'
  ]) assert.ok(all.includes(line), `missing: ${line}`);
  assert.ok(!/torch|tensorflow|jax/i.test(all), 'a framework crept into the NumPy');
});

test('three scenes open a part, in reading order', () => {
  const parts = load().filter(s => s.part).map(s => s.id);
  assert.deepEqual(parts, ['words', 'project', 'heads']);
  for (const scene of load().filter(s => s.part)) {
    assert.ok(scene.part.en && scene.part.es, `${scene.id}: part needs both languages`);
  }
});
