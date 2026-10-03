// AlphaTensor, from a rule to a game (sections 06/11, deep dive 20): twelve
// scenes in three parts on the 4 x 4 x 4 matrix multiplication tensor, five in
// three.js (cube, bigger, block, strassen, game) with SVG twins. It fetches
// nothing: the tensor is built from the rule in alphatensor-core.js, and
// every number asserted here is one that core computes and its own test pins.
const assert = require('node:assert/strict');

const en = 'AlphaTensor: from a rule to a game';
const es = 'AlphaTensor: de una regla a un juego';

const SCENES = ['rule', 'cube', 'read', 'bigger', 'block', 'strassen', 'run', 'recurse',
  'game', 'space', 'greedy', 'learn'];
const GL_SCENES = ['cube', 'bigger', 'block', 'strassen', 'game'];
// A key only that scene publishes, to wait on once `data-scene` has flipped.
const OWN_KEY = {rule: 'product', cube: 'ones', read: 'alive', bigger: 'share', block: 'damage',
  strassen: 'hollow', run: 'ops', recurse: 'saved', game: 'won', space: 'digits', greedy: 'raise',
  learn: 'exponent'};
// One key that shows the twin drew with the model's numbers.
const TWIN_KEY = {cube: 'cell', bigger: 'ones', block: 'cells', strassen: 'off', game: 'left'};

async function drive(ctx, page, where, lang) {
  await page.waitForFunction(() => document.getElementById('stage').dataset.ready === '1',
    null, {timeout: 20000});
  const data = () => page.evaluate(() => ({...document.getElementById('stage').dataset}));
  const stageIs = (key, value) => page.waitForFunction(([k, v]) =>
    document.getElementById('stage').dataset[k] === v, [key, String(value)], {timeout: 10000})
    .catch(() => assert.fail(`${where}: data-${key} never became ${value}`));
  // Polled, never slept on: data-easing is published while geometry eases.
  const settled = () => page.waitForFunction(() =>
    document.getElementById('stage').dataset.easing === '0', null, {timeout: 15000})
    .catch(() => assert.fail(`${where}: the picture never came to rest`));
  const set = async (scene, control, value) => {
    const input = page.locator(`#c-${scene}-${control}`);
    if (await input.evaluate(e => e.tagName) === 'SELECT') await input.selectOption(String(value));
    else await input.fill(String(value));
    return input.inputValue();
  };
  // Fired from the page: a pointer click scrolls its target into view, and
  // the step machine follows the scroll to whichever scene it lands on.
  const press = (scene, id) => page.evaluate(([s, b]) => {
    const el = document.getElementById(`c-${s}-${b}`);
    if (!el) throw new Error(`no button c-${s}-${b}`);
    if (el.disabled) throw new Error(`c-${s}-${b} is disabled`);
    el.click();
  }, [scene, id]);
  const strip = (a, b, c) => page.evaluate((key) => {
    const cell = document.querySelector(`#strip-svg [data-pick="${key}"]`);
    if (!cell) throw new Error(`the strip has no cell ${key}`);
    cell.dispatchEvent(new MouseEvent('click', {bubbles: true}));
  }, `x:${a},${b},${c}`);

  // Nothing clips an SVG child laid out past the viewBox and nothing
  // reports one. On the flat path the board is the SVG's viewBox; on the
  // three.js path the picture is pixels nobody can measure, and what can
  // fall off the stage is its labels, which are HTML chips over it. Both
  // are measured wherever they are showing, through getScreenCTM(): getCTM()
  // lands in viewport pixels and passes a child fifty units off the board.
  const fits = async (what) => {
    const box = await page.evaluate(() => {
      const stage = document.getElementById('stage');
      const r = stage.getBoundingClientRect();
      const off = [];
      for (const lab of stage.querySelectorAll('.lab')) {
        if (lab.style.display === 'none' || lab.closest('[style*="display: none"]')) continue;
        const b = lab.getBoundingClientRect();
        if (!b.width) continue;
        if (b.left < r.left - 2 || b.right > r.right + 2 || b.top < r.top - 2 || b.bottom > r.bottom + 2) {
          off.push(lab.textContent);
        }
      }
      // The inset over a three.js picture is an SVG on its own board, on
      // either surface: how many of its pieces are laid out off that board.
      const inset = document.getElementById('hud');
      let hud = 0;
      if (inset && !inset.hasAttribute('hidden') && inset.getScreenCTM()) {
        const ib = inset.viewBox.baseVal, iinv = inset.getScreenCTM().inverse();
        for (const node of inset.querySelectorAll('*')) {
          if (typeof node.getBBox !== 'function' || !node.getScreenCTM()) continue;
          let b;
          try { b = node.getBBox(); } catch (e) { continue; }
          if (!b.width && !b.height) continue;
          const m = iinv.multiply(node.getScreenCTM());
          for (const [px, py] of [[b.x, b.y], [b.x + b.width, b.y + b.height]]) {
            const x = m.a * px + m.c * py + m.e, y = m.b * px + m.d * py + m.f;
            if (x < -3 || y < -3 || x > ib.width + 3 || y > ib.height + 3) hud++;
          }
        }
      }
      const svg = document.getElementById('draw');
      const shown = svg.getClientRects().length > 0 && getComputedStyle(svg).visibility !== 'hidden'
        && getComputedStyle(svg).display !== 'none';
      if (!shown) return {svg: false, off, hud, gl: stage.dataset.gl};
      const vb = svg.viewBox.baseVal;
      const inv = svg.getScreenCTM() && svg.getScreenCTM().inverse();
      if (!inv) return null;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, n = 0;
      for (const node of svg.querySelectorAll('*')) {
        if (typeof node.getBBox !== 'function' || !node.getScreenCTM()) continue;
        let b;
        try { b = node.getBBox(); } catch (e) { continue; }
        if (!b.width && !b.height) continue;
        n++;
        const m = inv.multiply(node.getScreenCTM());
        for (const [px, py] of [[b.x, b.y], [b.x + b.width, b.y],
                                [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]) {
          const x = m.a * px + m.c * py + m.e, y = m.b * px + m.d * py + m.f;
          x0 = Math.min(x0, x); y0 = Math.min(y0, y);
          x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        }
      }
      return {svg: true, off, hud, x0, y0, x1, y1, w: vb.width, h: vb.height, n,
              nan: /NaN|Infinity/.test(svg.innerHTML)};
    });
    assert(box, `${where}: ${what} drew nothing measurable`);
    assert.deepEqual(box.off, [], `${where}: ${what} puts labels off the stage`);
    assert.equal(box.hud, 0, `${where}: ${what} lays ${box.hud} corner(s) of its inset off the board`);
    if (!box.svg) {
      assert.equal(box.gl, 'composer', `${where}: ${what} shows neither the twin nor three.js`);
      return;
    }
    assert(box.n > 5, `${where}: ${what} drew almost nothing`);
    assert(!box.nan, `${where}: ${what} wrote a NaN into the SVG`);
    assert(box.x0 >= -3 && box.y0 >= -3 && box.x1 <= box.w + 3 && box.y1 <= box.h + 3,
      `${where}: ${what} draws outside its ${box.w}x${box.h} board ` +
      `(x ${box.x0.toFixed(0)}..${box.x1.toFixed(0)}, y ${box.y0.toFixed(0)}..${box.y1.toFixed(0)})`);
  };

  const clean = async (id, what) => {
    const claim = await page.locator('#claim').textContent();
    assert(claim.trim().length > 0, `${where}: #${id} ${what} has an empty claim card`);
    assert(!/undefined|NaN|Infinity/.test(claim), `${where}: #${id} ${what} claim reads "${claim}"`);
    const readout = await page.locator(`#read-${id}`).innerText();
    assert(readout.trim().length > 0, `${where}: #read-${id} ${what} is empty`);
    assert(!/undefined|NaN|Infinity/.test(readout), `${where}: #read-${id} ${what} reads "${readout}"`);
    const cap = await page.locator('#strip-cap').innerText();
    assert(cap.trim().length > 0 && !/undefined|NaN/.test(cap), `${where}: #${id} ${what} strip reads "${cap}"`);
  };

  // A hash scrolls the section into view and the step machine follows the
  // scroll, so `data-scene` can read the destination a frame before the
  // rest of the dataset (the other keys are cleared, not stale). So: wait
  // for the scrolling to stop, then for the scene and a key only it
  // publishes, then for the picture to rest, and only then assert.
  const open = async (id) => {
    await page.evaluate((name) => { location.hash = '#' + name; }, id);
    await page.waitForFunction(() => new Promise(done => {
      const was = window.scrollY;
      setTimeout(() => done(window.scrollY === was), 250);
    }), null, {timeout: 15000});
    await page.waitForFunction(([name, k]) => {
      const ds = document.getElementById('stage').dataset;
      return ds.scene === name && ds[k] !== undefined;
    }, [id, OWN_KEY[id]], {timeout: 15000})
      .catch(() => assert.fail(`${where}: #${id} did not open with its own readout`));
    await settled();
    await fits(id);
    await clean(id, 'at its opening values');
  };

  // Every control that resizes the picture, at both ends of its travel (and
  // every option of a select), measured once the picture has come to rest.
  // The readout is written in the same task as the input event, so there is
  // nothing to wait for but the picture.
  const corners = async (id) => {
    const specs = await page.evaluate((name) => {
      const out = [];
      for (const e of document.querySelectorAll(`[id^="c-${name}-"]`)) {
        if (e.tagName === 'SELECT') out.push({id: e.id, options: [...e.options].map(o => o.value)});
        else if (e.type === 'range') out.push({id: e.id});
      }
      return out;
    }, id);
    assert(specs.length > 0, `${where}: #${id} has no controls`);
    for (const s of specs) {
      const control = s.id.slice(`c-${id}-`.length);
      for (const end of (s.options || ['min', 'max'])) {
        // A range's own max can move with another control (the blocks added
        // with which split), so the ends are read when they are used.
        const v = s.options ? end : await page.locator(`#${s.id}`).getAttribute(end);
        const got = await set(id, control, v);
        await settled();
        await fits(`${id} with ${control} = ${got}`);
        await clean(id, `with ${control} = ${got}`);
      }
    }
  };

  // ---- rule: eight products, each a triple. Flat, and what the page opens on.
  let d = await data();
  assert.equal(d.scene, 'rule', `${where}: the page opens on the rule`);
  await open('rule');
  d = await data();
  assert.equal(d.p, '6');
  assert.deepEqual([d.entrya, d.entryb, d.entryc], ['3', '2', '2'], `${where}: product 6 is a22 * b21 -> c21`);
  assert.equal(d.value, '28');
  assert.equal(d.mults, '8');
  assert.equal(d.adds, '4');
  assert.equal(d.product, '19,22,43,50');
  assert.deepEqual([d.stripmode, d.stripoff, d.stripcount], ['built', '0', '8'],
    `${where}: the strip is the schoolbook's eight, which are the cube`);
  // The strip: a press on a cell moves the picture there. (a21, b11, c21) is product 5.
  await strip(2, 0, 2);
  await stageIs('p', '5');
  assert.equal((await data()).value, '15', `${where}: a21 * b11 = 3 * 5`);
  // The player walks the products, through values the readout is written from.
  await set('rule', 'p', 6);
  await press('rule', 'play');
  await page.waitForFunction(() => {
    const ds = document.getElementById('stage').dataset;
    return ds.playing === '0' && ds.p === '8';
  }, null, {timeout: 20000}).catch(() => assert.fail(`${where}: the eight products never played through`));
  await corners('rule');

  // ---- cube: a 1 at each triple.
  await open('cube');
  await page.waitForFunction(() => window.THREE_ADDONS !== undefined || window.THREE !== undefined,
    null, {timeout: 12000})
    .catch(() => assert.fail(`${where}: the vendored three.js modules never loaded for the AlphaTensor stage`));
  await page.waitForFunction(() => ['composer', 'none'].includes(
    document.getElementById('stage').dataset.gl), null, {timeout: 10000});
  if ((await data()).gl === 'none') console.log(`  (${where}: no WebGL here, exercising the AlphaTensor stage's twins)`);
  d = await data();
  assert.deepEqual([d.ones, d.cells, d.zeros], ['8', '64', '56'], `${where}: eight 1s among 64 cells`);
  assert.equal(d.tray, 'all');
  assert.equal(d.cell, '1,2,0', `${where}: a12 * b21 -> c11 is T[1, 2, 0]`);
  assert.equal(d.trayvalue, '19');
  assert.equal(d.shape, '4,4,4');
  await set('cube', 'tray', '2');
  await stageIs('tray', '2');
  await set('cube', 'p', 6);
  await stageIs('trayvalue', '43');
  assert.equal((await data()).ones, '8');
  await corners('cube');

  // ---- read: the cube does the multiplying; fourteen of sixteen terms vanish.
  await open('read');
  d = await data();
  assert.deepEqual([d.terms, d.alive, d.dead], ['16', '2', '14']);
  assert.equal(d.tray, '0');
  assert.equal(d.value, '19');
  assert.equal(d.mults, '8', `${where}: one multiplication per 1`);
  assert.equal(d.product, '19,22,43,50');
  await set('read', 'tray', 3);
  await stageIs('value', '43');
  await set('read', 'mats', 'second');
  await stageIs('mats', 'second');
  d = await data();
  assert.notEqual(d.product, '19,22,43,50', `${where}: other matrices, another product`);
  assert.deepEqual([d.alive, d.dead, d.mults], ['2', '14', '8'], `${where}: the count does not depend on the numbers`);
  await corners('read');

  // ---- bigger: n^3 ones in an n^2-sided cube.
  await open('bigger');
  d = await data();
  // It opens before its answer: at 2 x 2, with the question about 5 x 5.
  assert.deepEqual([d.n, d.side, d.cells, d.ones, d.share], ['2', '4', '64', '8', '12.5']);
  assert.equal(d.shape, '4,4,4');
  assert.equal(d.stripcount, '8', `${where}: the strip is the 2 x 2 cube, whatever size is above it`);
  for (const [n, cells, ones, share] of [[5, '15625', '125', '0.8'], [3, '729', '27', '3.7'], [4, '4096', '64', '1.6']]) {
    await set('bigger', 'n', n);
    await stageIs('n', n);
    d = await data();
    assert.deepEqual([d.cells, d.ones, d.share], [cells, ones, share], `${where}: ${n} x ${n}`);
  }
  await corners('bigger');

  // ---- block: one multiplication, eight cells, two of them wanted.
  await open('block');
  d = await data();
  assert.deepEqual([d.cells, d.wanted, d.damage, d.mults], ['8', '2', '6', '1']);
  assert.deepEqual([d.u, d.v, d.w], ['1,0,0,1', '1,0,0,1', '1,0,0,1']);
  assert.deepEqual([d.stripmode, d.stripoff], ['built', '12'], `${where}: the first block alone leaves twelve cells off`);
  await press('block', 'm6');
  await stageIs('cells', '4');
  d = await data();
  assert.deepEqual([d.wanted, d.damage, d.u], ['1', '3', '-1,0,1,0'], `${where}: a block with a -1 in it`);
  await press('block', 'cell');
  await stageIs('cells', '1');
  assert.equal((await data()).damage, '0', `${where}: a single cell does no damage`);
  // A press on the strip builds the one-cell block there.
  await strip(3, 3, 3);
  await stageIs('u', '0,0,0,1');
  assert.deepEqual([(await data()).wanted, (await data()).cells], ['1', '1']);
  await press('block', 'm1');
  await stageIs('damage', '6');
  await corners('block');

  // ---- strassen: seven blocks that overshoot and cancel.
  await open('strassen');
  d = await data();
  // It opens before its answer: nothing added, eight cells wrong.
  assert.deepEqual([d.split, d.k, d.blocks, d.off], ['strassen', '0', '7', '8']);
  assert.equal(d.trail, '8,12,12,12,10,8,4,0');
  await set('strassen', 'k', 1);
  await stageIs('off', '12');
  assert.equal((await data()).stripoff, '12', `${where}: the first block takes eight wrong cells up to twelve`);
  await set('strassen', 'k', 5);
  await press('strassen', 'play');
  await page.waitForFunction(() => {
    const ds = document.getElementById('stage').dataset;
    return ds.playing === '0' && ds.k === '7';
  }, null, {timeout: 20000}).catch(() => assert.fail(`${where}: the seven blocks never played through`));
  d = await data();
  assert.deepEqual([d.off, d.touched, d.hollow], ['0', '20', '12'],
    `${where}: twenty cells held something, twelve ended hollow, and the sum is the cube`);
  assert.equal(d.stripoff, '0');
  await set('strassen', 'split', 'school');
  await stageIs('blocks', '8');
  await set('strassen', 'k', 8);
  await stageIs('off', '0');
  d = await data();
  assert.deepEqual([d.touched, d.hollow, d.trail], ['8', '0', '8,7,6,5,4,3,2,1,0'],
    `${where}: the schoolbook rule never cancels anything`);
  await set('strassen', 'split', 'strassen');
  await stageIs('blocks', '7');
  await corners('strassen');

  // ---- run: the same seven, on numbers.
  await open('run');
  d = await data();
  assert.equal(d.m, '65,35,-2,8,24,22,-30');
  assert.equal(d.c, '19,22,43,50');
  assert.deepEqual([d.mults, d.adds, d.ops, d.schoolops], ['7', '18', '25', '12'],
    `${where}: on plain numbers it is a bad trade`);
  assert.equal(d.same, '1');
  await set('run', 'mats', 'third');
  await stageIs('mats', 'third');
  assert.equal((await data()).same, '1', `${where}: the recipe multiplies any two matrices`);
  await set('run', 'mats', 'example');
  await set('run', 'r', 3);
  await stageIs('value', '-2');
  await corners('run');

  // ---- recurse: the saving is in the exponent.
  await open('recurse');
  d = await data();
  // It opens before its answer: one level, one multiplication in eight saved.
  assert.deepEqual([d.k, d.n, d.school, d.strassen], ['1', '2', '8', '7']);
  assert.deepEqual([d.saved, d.omega], ['12.5', '2.807']);
  assert.equal(d.stripcount, '7', `${where}: the strip is the seven blocks, whatever depth is above it`);
  await set('recurse', 'k', 3);
  await stageIs('saved', '33.0');
  await set('recurse', 'k', 10);
  await stageIs('saved', '73.7');
  d = await data();
  assert.deepEqual([d.n, d.school, d.strassen, d.ratio], ['1024', '1073741824', '282475249', '3.80']);
  await corners('recurse');

  // ---- game: subtract blocks until nothing is left.
  await open('game');
  d = await data();
  assert.deepEqual([d.moves, d.left, d.won], ['0', '8', '0']);
  assert.deepEqual([d.after, d.delta], ['7', '-1'], `${where}: a single cell previews seven left`);
  assert.equal(d.stripmode, 'owed', `${where}: from here the strip is what is left to subtract`);
  await press('game', 'strassen');
  await stageIs('left', '12');
  assert.equal((await data()).moves, '1', `${where}: Strassen's first move goes uphill`);
  // The best-looking reply takes the move back.
  await press('game', 'greedy');
  await stageIs('moves', '2');
  await stageIs('left', '8');
  await press('game', 'restart');
  await stageIs('moves', '0');
  for (let move = 1; move <= 7; move++) {
    await press('game', 'strassen');
    await stageIs('moves', move);
  }
  d = await data();
  assert.deepEqual([d.won, d.left, d.trail], ['1', '0', '8,12,12,12,10,8,4,0'], `${where}: a win in seven`);
  assert.deepEqual([d.stripoff, d.stripcount], ['0', '7']);
  assert(await page.locator('#c-game-strassen').isDisabled(), `${where}: a won game takes no more moves`);
  await press('game', 'restart');
  await stageIs('moves', '0');
  for (let move = 1; move <= 8; move++) {
    await press('game', 'school');
    await stageIs('left', 8 - move);
  }
  assert.equal((await data()).won, '1', `${where}: the schoolbook rule wins in eight`);
  await press('game', 'restart');
  await stageIs('moves', '0');
  await corners('game');

  // ---- space: too wide to cover.
  await open('space');
  d = await data();
  assert.deepEqual([d.n, d.f, d.depth], ['2', '5', '7']);
  assert.equal(d.onemove, '244140625', `${where}: 5^12 choices at one move`);
  assert.equal(d.digits, '59');
  assert.equal(d.blocks, '128000');
  await set('space', 'n', 4);
  await set('space', 'depth', 49);
  await stageIs('digits', '1644');
  await set('space', 'f', '3');
  await set('space', 'n', 2);
  await set('space', 'depth', 1);
  await stageIs('onemove', '531441');
  await corners('space');

  // ---- greedy: eight of 128,000 look like progress, and Strassen's is not one.
  await open('greedy');
  d = await data();
  assert.deepEqual([d.total, d.lower, d.same, d.raise, d.maxrise], ['128000', '8', '176', '127816', '56']);
  assert.deepEqual([d.k, d.greedytotal, d.takesback], ['0', '8', '0'], `${where}: greedy plays the schoolbook rule`);
  assert.deepEqual([d.peaklow, d.peakhigh], ['10', '14'], `${where}: every order of the seven goes uphill`);
  await set('greedy', 'k', 1);
  await stageIs('takesback', '1');
  d = await data();
  assert.deepEqual([d.now, d.best, d.greedytotal], ['12', '8', '10'],
    `${where}: after Strassen's first move greedy takes it back, and then needs ten`);
  await set('greedy', 'k', 5);
  await stageIs('greedytotal', '7');
  await corners('greedy');

  // ---- learn: the record board, and what one block fewer would buy.
  await open('learn');
  d = await data();
  assert.deepEqual([d.row, d.r, d.exponent, d.beats], ['3x3', '23', '2.854', '0']);
  assert.deepEqual([d.lower, d.upper, d.need, d.omega], ['19', '23', '21', '2.807']);
  await set('learn', 'r', 21);
  await stageIs('exponent', '2.771');
  assert.equal((await data()).beats, '1', `${where}: 21 blocks would beat Strassen`);
  await set('learn', 'r', 22);
  await stageIs('exponent', '2.814');
  assert.equal((await data()).beats, '0', `${where}: 22 would not`);
  await set('learn', 'row', '4x4mod2');
  await stageIs('rowupper', '47');
  assert.equal((await data()).rowbefore, '49');
  await set('learn', 'row', '4x5');
  await stageIs('rowupper', '76');
  assert.equal((await data()).rowbefore, '80');
  await corners('learn');

  // Every NumPy block, as the drive left it: every scene has been reached.
  for (const id of SCENES) {
    const text = await page.locator(`#np-${id}`).innerText();
    assert(text.trim().length > 0, `${where}: #np-${id} is empty`);
    assert(!/undefined|NaN/.test(text), `${where}: #np-${id} reads "${text}"`);
    assert(!/torch|tensorflow|jax|tensorly/i.test(text), `${where}: #np-${id} is not NumPy`);
    const widest = Math.max(...text.split('\n').map(l => l.length));
    assert(widest <= 82, `${where}: #np-${id} is ${widest} characters wide`);
  }

  // The rail names the twelve pictures and goes to them. Fired from the
  // page: a pointer click scrolls the bar into view and the step machine
  // follows the scroll.
  assert.equal(await page.locator('#rail .stop').count(), SCENES.length, `${where}: one stop per picture on the rail`);
  await page.evaluate(() => document.querySelectorAll('#rail .stop')[2].click());
  await page.waitForFunction(() => new Promise(done => {
    const was = window.scrollY;
    setTimeout(() => done(window.scrollY === was), 250);
  }), null, {timeout: 15000});
  await page.waitForFunction(() => {
    const ds = document.getElementById('stage').dataset;
    return ds.scene === 'read' && ds.alive !== undefined;
  }, null, {timeout: 15000}).catch(() => assert.fail(`${where}: the rail's third stop should open #read`));
  assert.equal(await page.locator('#rail .stop[aria-current="step"]').count(), 1, `${where}: one stop is current`);
  // Three parts, each with its own heading over the scene that opens it.
  assert.equal(await page.locator('.step .part').count(), 3, `${where}: three parts`);
  // The question comes before the answer: in every step the predict-first
  // line is straight after the heading.
  const order = await page.evaluate(() => [...document.querySelectorAll('section.step')]
    .filter(sec => !(sec.querySelector('h2').nextElementSibling || {}).classList?.contains('predict'))
    .map(sec => sec.id));
  assert.deepEqual(order, [], `${where}: the predict-first line is not straight after the heading`);

  // A deep link opens straight on the named scene, by name.
  await page.goto(`${page.url().split('?')[0]}?lang=${lang}&fresh=1#game`);
  await page.waitForFunction(() => document.getElementById('stage').dataset.ready === '1',
    null, {timeout: 20000});
  await page.waitForFunction(() => {
    const ds = document.getElementById('stage').dataset;
    return ds.scene === 'game' && ds.won !== undefined;
  }, null, {timeout: 15000}).catch(() => assert.fail(`${where}: a deep link to #game should open there`));
  // Left at rest: the accessibility pass runs straight after this returns.
  await settled();
}

// Lose the GL module: the five three.js scenes must draw their twin, fitted
// inside its board, and still publish their numbers.
async function fallback(ctx, page, where, lang) {
  const {origin, prefix, audit} = ctx;
  await page.route('**/vendor/linalg-boot.js', route => route.abort());
  await page.emulateMedia({reducedMotion: 'reduce'});
  const measure = () => page.evaluate(() => {
    const svg = document.getElementById('draw');
    const vb = svg.viewBox.baseVal, inv = svg.getScreenCTM().inverse();
    let bad = 0, n = 0;
    for (const node of svg.querySelectorAll('*')) {
      if (typeof node.getBBox !== 'function' || !node.getScreenCTM()) continue;
      let b;
      try { b = node.getBBox(); } catch (e) { continue; }
      if (!b.width && !b.height) continue;
      n++;
      const m = inv.multiply(node.getScreenCTM());
      for (const [px, py] of [[b.x, b.y], [b.x + b.width, b.y + b.height]]) {
        const x = m.a * px + m.c * py + m.e, y = m.b * px + m.d * py + m.f;
        if (x < -3 || y < -3 || x > vb.width + 3 || y > vb.height + 3) bad++;
      }
    }
    return {bad, n, nan: /NaN|Infinity/.test(svg.innerHTML)};
  });
  for (const scene of GL_SCENES) {
    await page.goto(`${origin}${prefix}interactive/alphatensor-stage.html?lang=${lang}&fallback-check=1#${scene}`);
    await page.waitForFunction(() => document.getElementById('stage').dataset.ready === '1', null, {timeout: 20000});
    await page.waitForFunction(([id, k]) => {
      const ds = document.getElementById('stage').dataset;
      return ds.scene === id && ds[k] !== undefined && ds[k] !== '';
    }, [scene, OWN_KEY[scene]], {timeout: 15000})
      .catch(() => assert.fail(`${where}: twin ${scene} never published its keys`));
    await page.waitForFunction(() => !document.getElementById('glnote').hidden, null, {timeout: 10000});
    assert.equal(await page.locator('#stage').getAttribute('data-gl'), 'none');
    assert(await page.locator('#draw').isVisible(), `${where}: twin ${scene} is not on the stage`);
    const d = await page.evaluate(() => ({...document.getElementById('stage').dataset}));
    assert(d[TWIN_KEY[scene]] !== undefined && d[TWIN_KEY[scene]] !== '',
      `${where}: twin ${scene} does not publish data-${TWIN_KEY[scene]}`);
    let m = await measure();
    assert(m.n > 10 && !m.nan && m.bad === 0, `${where}: twin ${scene} at home: ${JSON.stringify(m)}`);
    // The twin turns with the keys, as the three.js picture does, and
    // stays on its board at the far end of the turn.
    const cam = await page.locator('#stage').getAttribute('data-cam');
    await page.locator('#stage').focus();
    for (let n = 0; n < 10; n++) await page.keyboard.press('ArrowLeft');
    for (let n = 0; n < 6; n++) await page.keyboard.press('ArrowUp');
    await page.waitForFunction(was => document.getElementById('stage').dataset.cam !== was, cam, {timeout: 5000})
      .catch(() => assert.fail(`${where}: twin ${scene} did not turn`));
    await page.waitForFunction(() => document.getElementById('stage').dataset.easing === '0', null, {timeout: 15000});
    m = await measure();
    assert(m.bad === 0 && !m.nan, `${where}: twin ${scene} turned off its board: ${JSON.stringify(m)}`);
    // The controls that resize the picture, at both ends.
    const ranges = await page.evaluate((name) => [...document.querySelectorAll(`input[id^="c-${name}-"][type=range]`)]
      .map(e => ({id: e.id})), scene);
    for (const r of ranges) {
      for (const end of ['min', 'max']) {
        const v = await page.locator(`#${r.id}`).getAttribute(end);
        await page.locator(`#${r.id}`).fill(v);
        await page.waitForFunction(() => document.getElementById('stage').dataset.easing === '0', null, {timeout: 15000});
        m = await measure();
        assert(m.bad === 0 && !m.nan, `${where}: twin ${scene} with ${r.id} = ${v}: ${JSON.stringify(m)}`);
      }
    }
    const readout = await page.locator(`#read-${scene}`).innerText();
    assert(!/NaN|Infinity|undefined/.test(readout), `${where}: twin ${scene} readout: ${readout}`);
    await audit(`${where} twin ${scene}`);
  }
  await page.unroute('**/vendor/linalg-boot.js');
  await page.emulateMedia({reducedMotion: 'no-preference'});
}

// The hero gets Strassen's blocks part-added, flat and still. Nothing is
// fetched at all: the cube is built from the rule.
async function embed(ctx, page, where) {
  await page.waitForFunction(() =>
    document.getElementById('stage').dataset.ready === '1', null, {timeout: 20000});
  assert.equal(await page.locator('#stage').getAttribute('data-scene'), 'strassen',
    `${where} embed: the hero gets Strassen's blocks`);
  const d = await page.evaluate(() => ({...document.getElementById('stage').dataset}));
  assert.deepEqual([d.k, d.off], ['3', '12'], `${where} embed: three blocks in, twelve cells off, as its caption says`);
  assert(await page.locator('.steps').isHidden(), `${where} embed: the scroller is shown`);
  assert(await page.locator('#strip').isHidden(), `${where} embed: the strip is shown`);
  assert.equal(await page.evaluate(() => window.THREE), undefined,
    `${where} embed: three.js must not be fetched on the front door`);
  assert.equal(await page.locator('#stage').getAttribute('data-gl'), 'none');
  const cap = await page.locator('#embedcap').innerText();
  assert(cap.trim().length > 0, `${where} embed: the caption is empty`);
  assert.match(cap, /12/, `${where} embed: the caption does not say what the picture shows`);
  assert.equal(await page.locator('#embedcap a').count(), 0, `${where} embed: link in the caption`);
  const fetched = await page.evaluate(() =>
    performance.getEntriesByType('resource')
      .map(e => e.name)
      .filter(n => !/\.(js|css|woff2)(\?|$)/.test(n)));
  assert.equal(fetched.length, 0,
    `${where} embed: fetched something that is not code or CSS: ${fetched.join(', ')}`);
  assert(await page.locator('#draw').isVisible(), `${where} embed: the cube did not draw`);
  assert(await page.locator('#draw *').count() > 20, `${where} embed: the cube drew almost nothing`);
}

module.exports = {en, es, drive, fallback, embed};
