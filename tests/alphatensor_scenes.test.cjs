// Pins the AlphaTensor stage's scene contract
// (interactive/alphatensor-scenes/*.js) without a browser. Forked from
// tests/genome_scenes.test.cjs: the browser check drives the scenes but never
// reads their copy, so a scene that shipped without a Spanish string, a
// control default off its own slider's grid, or a NumPy line too long for its
// column would say nothing in CI without this file.
//
// The kit is the real one, given a DOM small enough to fit here -- elements
// that remember their attributes and children -- so every scene's draw() runs
// the code the page runs and every attribute it writes is checked for NaN. An
// SVG polygon with a NaN in its points is not an error anywhere; it is simply
// not drawn, and the readout goes on quoting numbers for a picture that is
// not there.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', 'interactive');
const PAGE = fs.readFileSync(path.join(ROOT, 'alphatensor-stage.html'), 'utf8');

// In the order alphatensor-stage.html loads them.
const SCENES = ['rule', 'cube', 'read', 'bigger', 'block', 'strassen', 'run', 'recurse',
  'game', 'space', 'greedy', 'learn'];
const GL_SCENES = ['cube', 'bigger', 'block', 'strassen', 'game'];
const REQUIRED_COPY = ['tab', 'k', 'h', 'concept', 'claim', 'predict', 'b', 'aria', 'eqcap', 'np'];
// The closed set the page's <math> may point at: the cube's three axes and
// the index that runs over blocks. A fifth token here without a letter
// carrying it is a scene lighting something nothing can hover.
const HL_TOKENS = ['a', 'b', 'c', 'r'];
// Written by the frame, never by a readout: a scene that returns one of these
// would have it overwritten on the next frame, silently.
const FRAME_KEYS = ['cam', 'easing', 'gl', 'grab', 'hl', 'hover', 'paused',
  'playing', 'ready', 'scene', 'stripcount', 'stripmode', 'stripoff', 'tensorshape', 'turns'];
// The three pictures that are about a count rather than about the 2 x 2
// cube's cells: a press on the strip has nowhere to send them.
const NO_SEEK = ['recurse', 'space', 'learn'];
const BOX = [40, 58, 780, 470];
// The repo's ceiling for a NumPy line is 82. This stage's prose column is the
// narrow one of the two, so its own is 74: what fits beside the stage without
// the block scrolling sideways and hiding the comments.
const NP_WIDTH = 74;
// The flat board. A flat scene lays itself out on it, and nothing it draws
// may be placed outside it: SVG neither clips nor reports such a child.
const BOARD = {w: 820, h: 500};
// The smallest type a scene may draw, in board units. Under it a thing is
// drawn as colour, not as a letter nobody can read.
const TYPE_FLOOR = 11;
// ALPHATENSOR_SCENE=read runs the per-scene tests for that scene alone, and
// loads only the scene files that exist -- for writing one scene before the
// others are there. Without it every one of the twelve is required.
const ONLY = process.env.ALPHATENSOR_SCENE;
const each = (list) => (ONLY ? list.filter((s) => s.id === ONLY) : list);

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
function count(node) { let n = 0; walk(node, () => n++); return n; }

function load() {
  global.document = {
    createElementNS: (ns, tag) => fakeElement(tag),
    createElement: (tag) => Object.assign(fakeElement(tag), {className: ''}),
    documentElement: {}
  };
  global.getComputedStyle = () => ({getPropertyValue: () => '#123456'});
  const LC = require('../interactive/linalg-core.js');
  global.LinalgCore = LC;
  // The core is deliberately not reloaded: its survey of the 128,000 moves is
  // remembered per position, and that memory is what keeps this file fast.
  const AC = require('../interactive/alphatensor-core.js');
  global.AlphaTensorCore = AC;
  delete require.cache[require.resolve('../interactive/alphatensor-kit.js')];
  const K = require('../interactive/alphatensor-kit.js');
  const scenes = [];
  global.window = {
    AlphaTensorScenes: {
      register(scene) { K.AlphaTensorScenes.register(scene); scenes.push(scene); },
      list() { return scenes.slice(); }
    },
    AlphaTensorCore: AC, AlphaTensorKit: K, LinalgCore: LC
  };
  for (const name of SCENES) {
    const file = path.join(ROOT, 'alphatensor-scenes', name + '.js');
    if (ONLY && !fs.existsSync(file)) continue;
    delete require.cache[require.resolve(file)];
    require(file);
  }
  return {scenes, AC, K, LC};
}

// A ctx good enough to run a scene without a browser: the real core, the
// real kit, the page's own projection from the home view, and a clock that
// does not move -- `instant`, so every eased picture is at its target.
function makeCtx(env, scene, lang) {
  const {AC, K, LC} = env;
  const svg = fakeElement('svg');
  const home = () => LC.orbitView(scene.pose.home.az, scene.pose.home.el);
  const ctx = {
    AC, K, LC, lang: lang || 'en', embed: false, reduceMotion: true,
    state: {}, cache: {}, svg, stage: null,
    get copy() { return scene.copy[lang || 'en']; },
    colour: () => '#123456', hl: null, hover: null,
    now: () => 1000, instant: true,
    changed() {},
    setControls(vals) { Object.assign(ctx.state, vals); if (scene.sync) scene.sync(ctx); },
    control: () => null,
    aspect: 1.6, board: () => ({...BOARD})
  };
  if (scene.gl) {
    const view = () => (scene.framing ? scene.framing(ctx, home()) : home());
    ctx.basis = () => K.viewBasis(view(), scene.pose.target || [0, 0, 0]);
    ctx.projector = (points, box) => K.projector(points, ctx.basis(), box);
    ctx.box = () => BOX.slice();
  }
  return ctx;
}

// Every value a control can take, or both ends of each when the whole grid
// would be too many -- the widest line is usually at a corner. Buttons are
// actions rather than values; the test that presses them is further down.
function settings(scene) {
  const axes = (scene.controls || []).filter((spec) => spec.type !== 'play' && spec.type !== 'button')
    .map((spec) => spec.type === 'select'
      ? spec.options.map((o) => [spec.id, o])
      : Array.from({length: Math.round((spec.max - spec.min) / (spec.step || 1)) + 1},
          (_, i) => [spec.id, spec.min + i * (spec.step || 1)]));
  const size = axes.reduce((n, a) => n * a.length, 1);
  const pick = size > 400 ? axes.map((a) => [a[0], a[a.length - 1]]) : axes;
  let out = [{}];
  for (const a of pick) out = out.flatMap((o) => a.map(([k, v]) => ({...o, [k]: v})));
  return out;
}

function show(scene, ctx) {
  if (scene.sync) scene.sync(ctx);
  ctx.svg.children.length = 0;
  scene.draw(ctx);
  return {ctx, readout: scene.readout(ctx), lines: scene.code(ctx)};
}
function run(env, scene, lang, vals) {
  const ctx = makeCtx(env, scene, lang);
  scene.init(ctx);
  Object.assign(ctx.state, vals);
  return show(scene, ctx);
}

const BAD = /NaN|undefined|Infinity/;

// What every picture owes, whatever state it is in.
function checkShown(env, scene, where, {ctx, readout, lines}) {
  // Nothing drawn may carry a number that is not one.
  walk(ctx.svg, (node) => {
    for (const [k, v] of Object.entries(node.attrs || {})) {
      assert.ok(!BAD.test(v), `${where}: <${node.tag} ${k}="${v}"> is not a number`);
    }
    if (node.tag === 'text') {
      assert.ok(Number(node.attrs['font-size']) >= TYPE_FLOOR,
        `${where}: "${node.textContent}" is set at ${node.attrs['font-size']}, under the ${TYPE_FLOOR}-unit floor`);
      assert.ok(!BAD.test(String(node.textContent)), `${where}: drew "${node.textContent}"`);
    }
  });
  assert.ok(count(ctx.svg) > 20, `${where}: drew only ${count(ctx.svg)} nodes`);

  // The readout is what the browser check reads.
  assert.ok(readout && readout.data, `${where}: no readout data`);
  for (const [k, v] of Object.entries(readout.data)) {
    assert.equal(k, k.toLowerCase(), `${where}: data key ${k} is not lowercase`);
    assert.equal(typeof v, 'string', `${where}: data.${k} is not a string`);
    assert.ok(!FRAME_KEYS.includes(k), `${where}: data.${k} is the frame's to write`);
    assert.ok(!BAD.test(v), `${where}: data.${k} = ${v}`);
  }
  assert.ok(readout.claim && String(readout.claim).length > 3, `${where}: no claim`);
  assert.ok(!BAD.test(String(readout.claim)), `${where}: claim ${readout.claim}`);
  assert.ok(readout.html && !BAD.test(String(readout.html)), `${where}: html ${readout.html}`);
  if (readout.caption) assert.ok(!BAD.test(String(readout.caption)), `${where}: caption ${readout.caption}`);

  // The NumPy block is measured live in the browser check; measure it here
  // too, so a long line fails in a second rather than in CI.
  assert.ok(lines.length >= 2, `${where}: a NumPy block of ${lines.length} line`);
  for (const line of lines) {
    assert.ok(line.length <= NP_WIDTH, `${where}: NumPy line is ${line.length} chars: ${line}`);
    assert.ok(!BAD.test(line), `${where}: NumPy line ${line}`);
  }

  // The strip: which blocks are in play, and how many multiplications or
  // moves the picture has spent. The frame works the 64 cells out from the
  // blocks, so a block has to be three vectors of four whole numbers.
  const strip = readout.strip;
  assert.ok(strip, `${where}: no strip`);
  assert.ok(['built', 'owed'].includes(strip.mode), `${where}: strip.mode ${strip.mode}`);
  assert.ok(Array.isArray(strip.terms), `${where}: strip.terms is not a list of blocks`);
  for (const t of strip.terms) {
    for (const q of ['u', 'v', 'w']) {
      assert.ok(Array.isArray(t[q]) && t[q].length === 4 && t[q].every(Number.isInteger),
        `${where}: strip block ${q} = ${JSON.stringify(t[q])}`);
    }
  }
  assert.ok(Number.isInteger(strip.count) && strip.count >= 0, `${where}: strip.count ${strip.count}`);
  for (const i of strip.lit || []) {
    assert.ok(Number.isInteger(i) && i >= 0 && i < 64, `${where}: strip.lit ${i} is not a cell`);
  }
  if (strip.tray !== undefined && strip.tray !== null) {
    assert.ok([0, 1, 2, 3].includes(strip.tray), `${where}: strip.tray ${strip.tray}`);
  }
  // The frame draws it with the same arithmetic the page uses.
  const P = env.AC.play(env.AC.tensor(2), strip.terms);
  assert.equal(P.trail.length, strip.terms.length + 1, `${where}: the strip's blocks do not play`);
}

test('every scene registers, in the order the page loads them', {skip: !!ONLY}, () => {
  const {scenes} = load();
  assert.deepEqual(scenes.map((s) => s.id), SCENES);
  const order = [...PAGE.matchAll(/src="alphatensor-scenes\/([a-z]+)\.js"/g)].map((m) => m[1]);
  assert.deepEqual(order, SCENES, 'the page loads the scenes in another order');
  for (const id of SCENES) {
    assert.ok(PAGE.includes(`id="step-${id}"`), `${id}: no section`);
    assert.ok(PAGE.includes(`<span class="anchor" id="${id}">`), `${id}: no anchor`);
    for (const p of ['eqcap-', 'np-', 'nplab-', 'k-', 'h-', 'con-', 'body-', 'pr-', 'ctl-', 'read-']) {
      assert.ok(PAGE.includes(`id="${p}${id}"`), `${id}: no ${p}${id}`);
    }
  }
});

test('three parts, and each opens where the argument turns', {skip: !!ONLY}, () => {
  const {scenes} = load();
  assert.deepEqual(scenes.filter((s) => s.part).map((s) => s.id), ['rule', 'block', 'game']);
  for (const s of scenes.filter((q) => q.part)) {
    assert.ok(s.part.en && s.part.es && s.part.en !== s.part.es, `${s.id}: part needs both languages`);
  }
});

test('every scene carries the required copy in both languages, with matching key sets', () => {
  const {scenes} = load();
  for (const scene of each(scenes)) {
    for (const lang of ['en', 'es']) {
      for (const key of REQUIRED_COPY) {
        assert.notEqual(scene.copy[lang][key], undefined, `${scene.id}: ${lang} copy lacks ${key}`);
      }
      assert.ok(String(scene.copy[lang].eqcap).length > 40,
        `${scene.id}: ${lang} eqcap is too short to say anything`);
      // A prediction is a question; a heading that answers it has spent it.
      assert.ok(/\?\s*$/.test(scene.copy[lang].predict), `${scene.id}: ${lang} predict is not a question`);
    }
    assert.deepEqual(Object.keys(scene.copy.en).sort(), Object.keys(scene.copy.es).sort(),
      `${scene.id}: en and es copy keys differ`);
    assert.deepEqual(Object.keys(scene.copy.en.np).sort(), Object.keys(scene.copy.es.np).sort(),
      `${scene.id}: en and es NumPy comments differ`);
  }
});

test('every control is labelled in both languages, and every select option too', () => {
  const {scenes} = load();
  for (const scene of each(scenes)) {
    for (const lang of ['en', 'es']) {
      const copy = scene.copy[lang];
      for (const spec of scene.controls || []) {
        assert.ok(copy.controls && copy.controls[spec.id],
          `${scene.id}: ${lang} has no label for control ${spec.id}`);
        if (spec.type !== 'select') continue;
        // The page reads copy.options[control][value] -- a flat table looks
        // right and silently falls back to the raw value.
        const table = copy.options && copy.options[spec.id];
        assert.ok(table, `${scene.id}: ${lang} options are not keyed by control ${spec.id}`);
        for (const o of spec.options) {
          assert.ok(typeof table === 'function' || table[o],
            `${scene.id}: ${lang} has no label for ${spec.id} = ${o}`);
        }
      }
    }
    if ((scene.controls || []).some((spec) => spec.type === 'button')) {
      assert.equal(typeof scene.press, 'function', `${scene.id}: has buttons and no press()`);
    }
  }
});

test('every slider default sits on its own min/step grid', () => {
  const env = load();
  for (const scene of each(env.scenes)) {
    const ctx = makeCtx(env, scene, 'en');
    scene.init(ctx);
    for (const spec of scene.controls || []) {
      if (spec.type !== 'range') continue;
      const v = ctx.state[spec.id];
      assert.equal(typeof v, 'number', `${scene.id}: ${spec.id} has no numeric default`);
      assert.ok(v >= spec.min && v <= spec.max, `${scene.id}: ${spec.id} default ${v} out of range`);
      const steps = (v - spec.min) / (spec.step || 1);
      assert.ok(Math.abs(steps - Math.round(steps)) < 1e-9,
        `${scene.id}: ${spec.id} default ${v} is off its own grid, so Chrome will snap it`);
    }
  }
});

test('the page points only at tokens its scenes light', () => {
  const {scenes} = load();
  const onPage = [...new Set([...PAGE.matchAll(/data-hl="([a-z]+)"/g)].map((m) => m[1]))].sort();
  assert.deepEqual(onPage, HL_TOKENS, 'the page uses a token outside the closed set');
  for (const scene of each(scenes)) {
    const section = PAGE.slice(PAGE.indexOf(`id="step-${scene.id}"`),
      PAGE.indexOf('</section>', PAGE.indexOf(`id="step-${scene.id}"`)));
    const used = [...new Set([...section.matchAll(/data-hl="([a-z]+)"/g)].map((m) => m[1]))].sort();
    assert.deepEqual((scene.hl || []).slice().sort(), used,
      `${scene.id}: hl must list exactly the tokens its own equation carries`);
  }
});

test('the three.js scenes declare everything the frame needs to place a camera', () => {
  const {scenes} = load();
  for (const scene of each(scenes)) {
    if (!GL_SCENES.includes(scene.id)) {
      assert.ok(!scene.gl, `${scene.id}: flat scene claims gl`);
      continue;
    }
    assert.ok(scene.gl, `${scene.id}: should draw in three.js`);
    for (const k of ['pose', 'build', 'render', 'bounds', 'draw']) {
      assert.ok(scene[k], `${scene.id}: gl scene lacks ${k}`);
    }
    for (const k of ['azMin', 'azMax', 'elMin', 'elMax', 'dollyMin', 'dollyMax']) {
      assert.equal(typeof scene.pose.limits[k], 'number', `${scene.id}: pose.limits.${k}`);
    }
  }
});

test('draw, readout, code and the strip survive every control setting in both languages', () => {
  const env = load();
  for (const scene of each(env.scenes)) {
    for (const lang of ['en', 'es']) {
      for (const vals of settings(scene)) {
        checkShown(env, scene, `${scene.id} ${lang} ${JSON.stringify(vals)}`, run(env, scene, lang, vals));
      }
    }
  }
});

test('every button can be pressed, from the opening state and again after', () => {
  const env = load();
  for (const scene of each(env.scenes)) {
    const buttons = (scene.controls || []).filter((spec) => spec.type === 'button');
    for (const first of buttons) {
      for (const second of buttons) {
        const ctx = makeCtx(env, scene, 'en');
        scene.init(ctx);
        show(scene, ctx);
        for (const b of [first, second]) {
          if (b.enabled && !b.enabled(ctx)) continue;
          scene.press(ctx, b.id);
          checkShown(env, scene, `${scene.id} after ${first.id} then ${second.id}`, show(scene, ctx));
        }
      }
    }
  }
});

test('a claim is rebuilt from the controls, not left as a static string', () => {
  const env = load();
  for (const scene of each(env.scenes)) {
    const all = settings(scene);
    assert.ok(all.length >= 2, `${scene.id}: a picture with nothing to change is a figure, not a scene`);
    const seen = new Set(all.map((v) => String(run(env, scene, 'en', v).readout.claim)));
    assert.ok(seen.size > 1,
      `${scene.id}: its claim card says the same thing at every setting, so it is decoration`);
  }
});

test('the flat twin stays inside the box at every orbit limit', () => {
  const env = load();
  for (const scene of each(env.scenes)) {
    if (!scene.gl) continue;
    const lim = scene.pose.limits;
    for (const az of [lim.azMin, 0, lim.azMax]) {
      for (const el of [lim.elMin, 0, lim.elMax]) {
        const ctx = makeCtx(env, scene, 'en');
        scene.init(ctx);
        if (scene.sync) scene.sync(ctx);
        ctx.basis = () => env.K.viewBasis(env.LC.orbitView(az, el), scene.pose.target || [0, 0, 0]);
        ctx.projector = (points, box) => env.K.projector(points, ctx.basis(), box);
        ctx.svg.children.length = 0;
        scene.draw(ctx);
        const b = scene.bounds(ctx);
        for (const q of [0, 1, 2]) {
          assert.ok(Number.isFinite(b.min[q]) && Number.isFinite(b.max[q]),
            `${scene.id}: bounds are not finite at az ${az} el ${el}`);
          assert.ok(b.max[q] >= b.min[q], `${scene.id}: inverted bounds at az ${az} el ${el}`);
        }
        // Everything the twin drew is inside the box it was fitted to: a
        // label placed outside the scene's own bounds is how one escapes.
        walk(ctx.svg, (node) => {
          if (node.tag !== 'text' && node.tag !== 'circle') return;
          const x = Number(node.attrs.x === undefined ? node.attrs.cx : node.attrs.x);
          const y = Number(node.attrs.y === undefined ? node.attrs.cy : node.attrs.y);
          assert.ok(x >= BOX[0] - 30 && x <= BOX[2] + 30 && y >= BOX[1] - 20 && y <= BOX[3] + 20,
            `${scene.id}: at az ${az} el ${el} the twin drew <${node.tag}> at ${x.toFixed(0)}, ${y.toFixed(0)}`);
        });
      }
    }
  }
});

test('no scene draws a hard-coded English string', () => {
  const env = load();
  // Words that would mean the copy table was bypassed. Only words Spanish
  // spells differently: entry names (a₁₂), products (m₃), numbers, shapes and
  // NumPy identifiers are all legitimately literal.
  const ENGLISH = /\b(the|and|with|from|each|block|blocks|cell|cells|move|moves|added|left|differ|multiplications|additions)\b/i;
  for (const scene of each(env.scenes)) {
    const {ctx} = run(env, scene, 'es', {});
    const seen = [ctx.svg];
    if (scene.hud) { const hud = fakeElement('svg'); scene.hud(ctx, hud); seen.push(hud); }
    for (const root of seen) {
      walk(root, (node) => {
        const t = String(node.textContent || '');
        if (t.length < 4) return;
        assert.ok(!ENGLISH.test(t),
          `${scene.id}: drew "${t}" while the page is in Spanish, so it bypassed the copy table`);
      });
    }
  }
});

test('the strip can move every picture that is about the cube\'s cells', {skip: !!ONLY}, () => {
  const env = load();
  for (const scene of env.scenes) {
    if (NO_SEEK.includes(scene.id)) {
      assert.equal(scene.seek, undefined, `${scene.id}: is on the no-seek list and has a seek`);
      continue;
    }
    assert.equal(typeof scene.seek, 'function', `${scene.id}: the strip cannot move this picture (no seek)`);
    // Every one of the 64 cells may be pressed, whatever it holds.
    for (let idx = 0; idx < 64; idx++) {
      const ctx = makeCtx(env, scene, 'en');
      scene.init(ctx);
      if (scene.sync) scene.sync(ctx);
      scene.seek(ctx, idx);
      checkShown(env, scene, `${scene.id} after seek(${idx})`, show(scene, ctx));
    }
  }
});

test('a flat scene places nothing off its board', () => {
  const env = load();
  const num = (v) => (v === undefined ? null : Number(v));
  for (const scene of each(env.scenes)) {
    if (scene.gl) continue;
    for (const lang of ['en', 'es']) {
      for (const vals of settings(scene)) {
        const where = `${scene.id} ${lang} ${JSON.stringify(vals)}`;
        const {ctx} = run(env, scene, lang, vals);
        walk(ctx.svg, (node) => {
          const a = node.attrs || {};
          const xs = [], ys = [];
          if (node.tag === 'rect') {
            xs.push(num(a.x), num(a.x) + num(a.width)); ys.push(num(a.y), num(a.y) + num(a.height));
          } else if (node.tag === 'text') {
            xs.push(num(a.x)); ys.push(num(a.y));
          } else if (node.tag === 'line') {
            xs.push(num(a.x1), num(a.x2)); ys.push(num(a.y1), num(a.y2));
          } else if (node.tag === 'circle') {
            xs.push(num(a.cx) - num(a.r), num(a.cx) + num(a.r)); ys.push(num(a.cy) - num(a.r), num(a.cy) + num(a.r));
          } else if (node.tag === 'polyline' || node.tag === 'polygon') {
            for (const pt of String(a.points).trim().split(/\s+/)) {
              const [x, y] = pt.split(',').map(Number);
              xs.push(x); ys.push(y);
            }
          }
          for (const x of xs) {
            assert.ok(x >= -1 && x <= BOARD.w + 1, `${where}: <${node.tag}> reaches x = ${x}, off the ${BOARD.w}-wide board`);
          }
          for (const y of ys) {
            assert.ok(y >= -1 && y <= BOARD.h + 1, `${where}: <${node.tag}> reaches y = ${y}, off the ${BOARD.h}-tall board`);
          }
        });
      }
    }
  }
});

test('an inset is drawn on the board, in type that can be read', () => {
  const env = load();
  for (const scene of each(env.scenes)) {
    if (!scene.hud) continue;
    assert.ok(scene.gl, `${scene.id}: an inset is for a three.js scene; a flat one draws on its own board`);
    for (const lang of ['en', 'es']) {
      for (const vals of settings(scene)) {
        const where = `${scene.id} ${lang} ${JSON.stringify(vals)} inset`;
        const {ctx} = run(env, scene, lang, vals);
        const hud = fakeElement('svg');
        scene.hud(ctx, hud);
        assert.ok(count(hud) > 5, `${where}: drew only ${count(hud)} nodes`);
        walk(hud, (node) => {
          const a = node.attrs || {};
          for (const [k, v] of Object.entries(a)) {
            assert.ok(!BAD.test(v), `${where}: <${node.tag} ${k}="${v}"> is not a number`);
          }
          if (node.tag === 'text') {
            assert.ok(Number(a['font-size']) >= TYPE_FLOOR, `${where}: "${node.textContent}" is under the type floor`);
            assert.ok(Number(a.x) >= -1 && Number(a.x) <= BOARD.w + 1 && Number(a.y) >= 0 && Number(a.y) <= BOARD.h + 1,
              `${where}: "${node.textContent}" is written off the board`);
          }
          if (node.tag === 'rect') {
            assert.ok(Number(a.x) >= -1 && Number(a.x) + Number(a.width) <= BOARD.w + 1, `${where}: a rect leaves the board sideways`);
            assert.ok(Number(a.y) >= -1 && Number(a.y) + Number(a.height) <= BOARD.h + 1, `${where}: a rect leaves the board vertically`);
          }
        });
      }
    }
  }
});
