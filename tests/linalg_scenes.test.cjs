// Pins the projection & SVD stage's scene contract
// (interactive/linalg-scenes/*.js) without a browser. Mirrors
// tests/voice_scenes.test.cjs and tests/factor_scenes.test.cjs: the browser
// check (scripts/check_navigation.cjs) drives the scenes but never reads
// their copy, so a scene that shipped without a Spanish string, or a control
// default off its own slider's grid, would say nothing in CI without this
// file -- the one stage of the four whose registry had no test of its own.
//
// Unlike the voice and factor kits, linalg-kit.js has no module.exports
// branch: it always attaches LinalgKit/LinalgScenes to `root`, and `root` is
// `window` when one exists. Handing it a bare `{LinalgCore}` object as
// `window` is enough -- the kit and every scene file only reach into
// `window.LinalgCore`/`window.LinalgKit` at call time, never at module load,
// so no DOM is needed to register all eight and read back what they carry.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', 'interactive');
const PAGE = fs.readFileSync(path.join(ROOT, 'linalg-stage.html'), 'utf8');

// In the order linalg-stage.html's <script src> lines load them, which is
// the order of the steps: what least squares draws, then what the SVD says,
// then the two ways the arithmetic fails. See linalg-scenes/README.md.
const SCENES = ['projection', 'wide', 'collapse', 'portal', 'ellipsoid',
                'eigen', 'collinear', 'precision'];
const REQUIRED_COPY = ['k', 'h', 'claim', 'concept', 'predict', 'b', 'aria'];

function load() {
  delete require.cache[require.resolve('../interactive/linalg-core.js')];
  const LC = require('../interactive/linalg-core.js');
  delete require.cache[require.resolve('../interactive/linalg-kit.js')];
  // A bare object standing in for `window`: the kit attaches LinalgKit and
  // LinalgScenes to it as a side effect of being required, and every scene
  // file below reaches through it the same way the page does.
  global.window = {LinalgCore: LC};
  require('../interactive/linalg-kit.js');
  const registered = [];
  const realRegister = window.LinalgScenes.register;
  window.LinalgScenes.register = (scene) => { registered.push(scene); return realRegister(scene); };
  for (const name of SCENES) {
    delete require.cache[require.resolve(`../interactive/linalg-scenes/${name}.js`)];
    require(`../interactive/linalg-scenes/${name}.js`);
  }
  return {scenes: registered, LC, K: window.LinalgKit, Scenes: window.LinalgScenes};
}

test('every scene registers, in the order the page loads them', () => {
  const {scenes} = load();
  assert.deepEqual(scenes.map((s) => s.id), SCENES);
  for (const id of SCENES) {
    assert.ok(PAGE.includes(`src="linalg-scenes/${id}.js"`), `${id}: no <script src>`);
  }
  // Steps count 1..8, and each scene's own id -- never its step number -- is
  // both the URL name (#eigen) and the anchor a link checker can find.
  scenes.forEach((s, i) => {
    assert.equal(s.step, String(i + 1), `${s.id}: step should be ${i + 1}, got ${s.step}`);
    assert.equal(s.section, `step-${i + 1}`);
    assert.ok(PAGE.includes(`id="step-${i + 1}"`), `${s.id}: no <section id="step-${i + 1}">`);
    assert.ok(PAGE.includes(`class="anchor" id="${s.id}"`),
      `${s.id}: no <span class="anchor" id="${s.id}"> -- #${s.id} in a link would 404`);
  });
});

test('every scene carries the required copy in both languages, with matching key sets', () => {
  for (const scene of load().scenes) {
    for (const lang of ['en', 'es']) {
      for (const key of REQUIRED_COPY) {
        assert.notEqual(scene.copy[lang][key], undefined, `${scene.id}: ${lang} copy is missing ${key}`);
        assert.notEqual(scene.copy[lang][key], '', `${scene.id}: ${lang} copy's ${key} is empty`);
      }
    }
    assert.deepEqual(Object.keys(scene.copy.en).sort(), Object.keys(scene.copy.es).sort(),
      `${scene.id}: en and es copy keys differ`);
  }
});

test('every control a scene labels through copy.controls is labelled in both languages', () => {
  for (const scene of load().scenes) {
    for (const lang of ['en', 'es']) {
      const copy = scene.copy[lang];
      for (const id of Object.keys((scene.copy.en || {}).controls || {})) {
        assert.notEqual(copy.controls && copy.controls[id], undefined,
          `${scene.id}: ${lang} has no label for control ${id}`);
      }
    }
  }
});

test('a slider opens on a value its own min/step grid contains', () => {
  // The scene binds a slider that is already in the page (ctx.bindSlider
  // reaches for an existing element rather than creating one), so the
  // source of truth for its default is the static HTML, not a value a
  // browser-driven check would have to seed. A control moved off its own
  // grid is exactly what "the first drag jumps" reports.
  for (const id of SCENES) {
    const start = PAGE.indexOf(`class="anchor" id="${id}"`);
    assert.ok(start >= 0, `${id}: no anchor to scope its section`);
    const sectionStart = PAGE.lastIndexOf('<section', start);
    const sectionEnd = PAGE.indexOf('</section>', start);
    const section = PAGE.slice(sectionStart, sectionEnd);
    const sliders = [...section.matchAll(
      /<input type="range"[^>]*\bid="([^"]+)"[^>]*>/g)].map((m) => m[0]);
    assert.ok(sliders.length > 0, `${id}: no sliders found in its section`);
    for (const tag of sliders) {
      const attr = (name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
      const sliderId = attr('id');
      const step = attr('step');
      if (step === 'any') continue;
      const min = Number(attr('min')), max = Number(attr('max')), value = Number(attr('value'));
      const stepN = Number(step || '1');
      assert.equal((max - min) % stepN, 0,
        `${id}: #${sliderId} range is not a whole number of steps`);
      assert.ok(value >= min && value <= max,
        `${id}: #${sliderId} opens at ${value}, outside [${min}, ${max}]`);
      assert.equal((value - min) % stepN, 0,
        `${id}: #${sliderId} opens on ${value}, off its own min/step grid`);
    }
  }
});

test('three scenes open a part, in reading order', () => {
  const {scenes} = load();
  assert.deepEqual(scenes.filter((s) => s.part).map((s) => s.id),
    ['projection', 'portal', 'collinear']);
  for (const scene of scenes.filter((s) => s.part)) {
    assert.notEqual(scene.part.en, undefined, `${scene.id}: part has no English heading`);
    assert.notEqual(scene.part.es, undefined, `${scene.id}: part has no Spanish heading`);
  }
});

test('every scene carries a pose with a home view and a builder for both render paths', () => {
  for (const scene of load().scenes) {
    const P = scene.pose;
    assert.ok(P && P.home && typeof P.home.az === 'number' && typeof P.home.el === 'number',
      `${scene.id}: pose.home`);
    assert.equal(typeof P.fov, 'number', `${scene.id}: pose.fov`);
    for (const k of ['init', 'build', 'render', 'flat', 'readout']) {
      assert.equal(typeof scene[k], 'function', `${scene.id}: ${k}`);
    }
  }
});

test('the registry refuses a scene missing a required key', () => {
  const {Scenes} = load();
  assert.throws(() => Scenes.register({id: 'x', step: '9', section: 'step-9'}),
    /x lacks pose/);
});
