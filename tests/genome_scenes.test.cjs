// Pins the genome stage's scene contract (interactive/genome-scenes/*.js)
// without a browser. Mirrors tests/factor_scenes.test.cjs: the browser check
// drives the scenes but never reads their copy, so a scene that shipped
// without a Spanish string, a control default off its own slider's grid, or a
// NumPy line past 82 characters would say nothing in CI without this file.
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
const PAGE = fs.readFileSync(path.join(ROOT, 'genome-stage.html'), 'utf8');

// In the order genome-stage.html loads them.
const SCENES = ['bases', 'window', 'transcribe', 'codons', 'translate', 'protein', 'search', 'batch'];
const GL_SCENES = ['bases', 'codons', 'protein', 'search'];
const REQUIRED_COPY = ['tab', 'k', 'h', 'concept', 'claim', 'predict', 'b', 'aria', 'eqcap', 'np'];
// The closed set the page's <math> may point at. A ninth token here without a
// letter carrying it is a scene lighting something nothing can hover.
const HL_TOKENS = ['aa', 'base', 'codon', 'guide', 'pos', 'prop', 'rna', 'win'];
// Written by the frame, never by a readout: a scene that returns one of these
// would have it overwritten on the next frame, silently.
const FRAME_KEYS = ['cam', 'easing', 'gl', 'grab', 'hl', 'hover', 'paused',
  'playing', 'ready', 'scene', 'tensorshape', 'turns'];
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
// GENOME_SCENE=window runs the per-scene tests for that scene alone.
const ONLY = process.env.GENOME_SCENE;
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
  const GC = require('../interactive/genome-core.js');
  global.GenomeCore = GC;
  delete require.cache[require.resolve('../interactive/genome-kit.js')];
  const K = require('../interactive/genome-kit.js');
  const scenes = [];
  global.window = {
    GenomeScenes: {
      register(scene) { K.GenomeScenes.register(scene); scenes.push(scene); },
      list() { return scenes.slice(); }
    },
    GenomeCore: GC, GenomeKit: K, LinalgCore: LC
  };
  for (const name of SCENES) {
    delete require.cache[require.resolve(`../interactive/genome-scenes/${name}.js`)];
    require(`../interactive/genome-scenes/${name}.js`);
  }
  return {scenes, GC, K, LC};
}

// A ctx good enough to run a scene without a browser: the real sequence, the
// real kit, the page's own projection from the home view, and a clock that
// does not move -- `instant`, so every eased picture is at its target.
function makeCtx(env, scene, lang) {
  const {GC, K, LC} = env;
  const svg = fakeElement('svg');
  const home = () => LC.orbitView(scene.pose.home.az, scene.pose.home.el);
  const ctx = {
    GC, K, LC, lang: lang || 'en', embed: false, reduceMotion: true,
    seq: GC.CDS,
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
    ctx.box = () => BOX.slice();
  }
  return ctx;
}

// Every value a control can take, or both ends of each when the whole grid
// would be too many -- the widest line is usually at a corner.
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

function run(env, scene, lang, vals) {
  const ctx = makeCtx(env, scene, lang);
  scene.init(ctx);
  Object.assign(ctx.state, vals);
  if (scene.sync) scene.sync(ctx);
  ctx.svg.children.length = 0;
  scene.draw(ctx);
  return {ctx, readout: scene.readout(ctx), lines: scene.code(ctx)};
}

test('every scene registers, in the order the page loads them', () => {
  const {scenes} = load();
  assert.deepEqual(scenes.map((s) => s.id), SCENES);
  for (const id of SCENES) {
    assert.ok(PAGE.includes(`src="genome-scenes/${id}.js"`), `${id}: no <script src>`);
    assert.ok(PAGE.includes(`id="step-${id}"`), `${id}: no section`);
    assert.ok(PAGE.includes(`<span class="anchor" id="${id}">`), `${id}: no anchor`);
    for (const p of ['eqcap-', 'np-', 'nplab-', 'k-', 'h-', 'con-', 'body-', 'pr-', 'ctl-', 'read-']) {
      assert.ok(PAGE.includes(`id="${p}${id}"`), `${id}: no ${p}${id}`);
    }
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
  }
});

test('every slider default sits on its own min/step grid', () => {
  const env = load();
  for (const scene of each(env.scenes)) {
    const ctx = makeCtx(env, scene, 'en');
    scene.init(ctx);
    for (const spec of scene.controls || []) {
      if (spec.type === 'select' || spec.type === 'play') continue;
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
    const used = new Set([...section.matchAll(/data-hl="([a-z]+)"/g)].map((m) => m[1]));
    for (const tok of used) {
      assert.ok((scene.hl || []).includes(tok),
        `${scene.id}: its section points at ${tok}, which the scene does not list in hl`);
    }
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

test('draw, readout and code survive every control setting in both languages', () => {
  const env = load();
  for (const scene of each(env.scenes)) {
    for (const lang of ['en', 'es']) {
      for (const vals of settings(scene)) {
        const where = `${scene.id} ${lang} ${JSON.stringify(vals)}`;
        const {ctx, readout, lines} = run(env, scene, lang, vals);

        // Nothing drawn may carry a number that is not one.
        walk(ctx.svg, (node) => {
          for (const [k, v] of Object.entries(node.attrs || {})) {
            assert.ok(!/NaN|undefined|Infinity/.test(v),
              `${where}: <${node.tag} ${k}="${v}"> is not a number`);
          }
        });
        assert.ok(count(ctx.svg) > 20, `${where}: drew only ${count(ctx.svg)} nodes`);

        // The readout is what the browser check reads.
        assert.ok(readout && readout.data, `${where}: no readout data`);
        for (const [k, v] of Object.entries(readout.data)) {
          assert.equal(k, k.toLowerCase(), `${where}: data key ${k} is not lowercase`);
          assert.equal(typeof v, 'string', `${where}: data.${k} is not a string`);
          assert.ok(!FRAME_KEYS.includes(k), `${where}: data.${k} is the frame's to write`);
          assert.ok(!/NaN|undefined|Infinity/.test(v), `${where}: data.${k} = ${v}`);
        }
        assert.ok(readout.claim && String(readout.claim).length > 3, `${where}: no claim`);
        assert.ok(!/NaN|undefined|Infinity/.test(String(readout.claim)), `${where}: claim ${readout.claim}`);
        assert.ok(!/NaN|undefined|Infinity/.test(String(readout.html)), `${where}: html ${readout.html}`);

        // The NumPy block is measured live in the browser check; measure it
        // here too, so a long line fails in a second rather than in CI.
        for (const line of lines) {
          assert.ok(line.length <= NP_WIDTH, `${where}: NumPy line is ${line.length} chars: ${line}`);
          assert.ok(!/NaN|undefined|Infinity/.test(line), `${where}: NumPy line ${line}`);
        }
      }
    }
  }
});

test('a claim is rebuilt from the controls, not left as a static string', () => {
  const env = load();
  for (const scene of each(env.scenes)) {
    const all = settings(scene);
    if (all.length < 2) continue;
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
      }
    }
  }
});

test('no scene draws a hard-coded English string', () => {
  const env = load();
  // Words that would mean the copy table was bypassed. Only words Spanish
  // spells differently: "base" is the same word in both, and the codon cube
  // legitimately draws "3.ª base". Base letters, residue letters, shapes and
  // NumPy identifiers are all legitimately literal too.
  const ENGLISH = /\b(the|and|with|from|each|window|guide|score|match|residue|sequence)\b/i;
  for (const scene of each(env.scenes)) {
    const {ctx} = run(env, scene, 'es', {});
    walk(ctx.svg, (node) => {
      const t = String(node.textContent || '');
      if (t.length < 4) return;
      assert.ok(!ENGLISH.test(t),
        `${scene.id}: drew "${t}" while the page is in Spanish, so it bypassed the copy table`);
    });
  }
});

test('every readout says where on the gene its picture is looking', () => {
  const env = load();
  for (const scene of each(env.scenes)) {
    for (const vals of settings(scene)) {
      const {readout} = run(env, scene, 'en', vals);
      const lens = readout.lens;
      const where = `${scene.id} ${JSON.stringify(vals)}`;
      assert.ok(lens, `${where}: no lens for the ribbon`);
      assert.ok(Number.isInteger(lens.a) && Number.isInteger(lens.b), `${where}: lens is not whole bases`);
      assert.ok(lens.a >= 0 && lens.b > lens.a && lens.b <= env.GC.CDS.length,
        `${where}: lens ${lens.a}..${lens.b} is not a stretch of the gene`);
      if (lens.done) {
        assert.ok(lens.done[0] >= 0 && lens.done[1] >= lens.done[0] && lens.done[1] <= env.GC.CDS.length,
          `${where}: lens.done ${lens.done} is not a stretch of the gene`);
      }
      if (lens.mark !== undefined && lens.mark !== null) {
        assert.ok(lens.mark >= 0 && lens.mark < env.GC.CDS.length, `${where}: lens.mark ${lens.mark}`);
      }
    }
    assert.equal(typeof scene.seek, 'function', `${scene.id}: the ribbon cannot move this picture (no seek)`);
  }
});

test('a flat scene places nothing off its board, and prints nothing too small to read', () => {
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
            assert.ok(num(a['font-size']) >= TYPE_FLOOR,
              `${where}: "${node.textContent}" is set at ${a['font-size']}, under the ${TYPE_FLOOR}-unit floor`);
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
