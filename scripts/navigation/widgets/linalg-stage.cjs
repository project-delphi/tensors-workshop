// The projection & SVD stage (sections 07/09). Two things here that no
// other widget can check: that the vendored *addons* arrived -- a bloom pass
// that never reached docs/ would drop the reader into the flat renderer and
// let this check pass, which is the eleven-day 404 all over again -- and
// that A v = sigma u holds through the real render path, read off the stage
// as numbers rather than looked for in pixels.
const assert = require('node:assert/strict');

const en = 'Projection and the SVD';
const es = 'Proyección y la SVD';

// Next and #<name> both scroll a step into view, and the step machine
// (watchSteps' IntersectionObserver) follows the scroll: for as long
// as that scroll animates, dataset.step is whatever section is
// crossing the viewport's middle, not necessarily the one scrolled to.
// Poll for it holding still at the wanted id, rather than sleeping a
// guessed length of the scroll and reading once.
async function waitStepSettled(page, id, where, timeout = 5000) {
  await page.waitForFunction((id) => {
    if (window.__stepSince === undefined || window.__stepAt !== id) {
      window.__stepAt = id;
      window.__stepSince = performance.now();
    }
    const cur = document.querySelector('#stage').dataset.step;
    if (cur !== id) { window.__stepAt = null; return false; }
    return performance.now() - window.__stepSince > 150;
  }, id, {timeout})
    .catch(() => assert.fail(`${where}: the stage did not settle on step ${id}`));
}

async function drive(ctx, page, where, lang) {
  const {origin, prefix} = ctx;
  // Wait on the *modules*, not on a context. Whether a headless runner
  // gives us WebGL is not something to hang CI on -- that is the same
  // call the visualizer makes -- and the modules landing is the thing
  // actually at risk here: an addon missing from docs/ drops the reader
  // into the flat renderer, and nothing else would notice.
  await page.waitForFunction(() => window.THREE_ADDONS !== undefined,
    null, {timeout: 12000})
    .catch(() => assert.fail(`${where}: the vendored three.js addons never loaded`));
  assert.equal(await page.evaluate(() => window.THREE.REVISION), '169',
    `${where}: vendored three.js did not load`);
  for (const name of ['EffectComposer', 'RenderPass', 'UnrealBloomPass',
                      'OutputPass', 'CSS2DRenderer']) {
    assert.equal(await page.evaluate(
      n => typeof window.THREE_ADDONS[n], name), 'function',
      `${where}: vendored addon ${name} did not load`);
  }
  // The render mode is advisory: on a runner with a context this says
  // step 1 went through the bloom composer, and on one without it says
  // the designed fallback took over. Either is a pass; only a
  // *contradiction* is not.
  const mode1 = await page.evaluate(() =>
    document.querySelector('#stage').dataset.gl);
  assert(mode1 === 'composer' || mode1 === 'none',
    `${where}: step 1 rendered as '${mode1}', expected the composer or the flat fallback`);
  if (mode1 === 'none') console.log(`  (${where}: no WebGL here, exercising the flat renderer)`);

  // Step 1: sliding y off the plane moves the residual and leaves beta
  // alone, which is the step's whole claim. Read off data-*, which the
  // readout writes from the slider's target rather than from the eased
  // picture, so the assertion does not wait on a tween.
  const data1 = () => page.evaluate(() => ({...document.querySelector('#stage').dataset}));
  const before = (await data1()).beta;
  assert(before && before.split(',').length === 2, `${where}: step 1 should stamp beta`);
  await page.locator('#tilt').fill('0');
  assert.equal((await data1()).rnorm, '0.0000',
    `${where}: y on the plane should leave no residual`);
  await page.locator('#tilt').fill('400');
  assert.notEqual((await data1()).rnorm, '0.0000',
    `${where}: sliding y off the plane should give it a residual`);
  assert.equal((await data1()).beta, before,
    `${where}: beta must not move when y slides along the residual`);

  // The step machine, by button and by scroll. Eight steps, so Next is
  // pressed until the stage says 8: each press scrolls a section into
  // view and the machine follows the scroll, so a press mid-glide can
  // land on the section the viewport is crossing rather than the next.
  for (let i = 0; i < 14; i++) {
    if (await page.evaluate(() => document.querySelector('#stage').dataset.step) === '8') break;
    await page.locator('#next').click();
    await page.waitForTimeout(350);
  }
  await page.waitForFunction(() =>
    document.querySelector('#stage').dataset.step === '8',
    null, {timeout: 5000})
    .catch(() => assert.fail(`${where}: Next did not reach the last step`));
  // Next scrolls the step into view, and the step machine follows the
  // scroll: for as long as that animation runs the stage is whatever
  // section the viewport's middle is crossing, which is a projection
  // step on the way past. Poll for it holding at 8, rather than
  // sleeping a guess at how long the scroll takes.
  await waitStepSettled(page, '8', where);
  assert.equal(await page.evaluate(() =>
    document.querySelector('#stage').dataset.step), '8',
    `${where}: the stage did not settle on step 8`);
  // #step-8 in the URL opens on that step.
  await page.goto(
    `${origin}${prefix}interactive/linalg-stage.html?lang=${lang}#step-8`);
  await page.waitForFunction(() =>
    document.querySelector('#stage').dataset.step === '8',
    null, {timeout: 8000})
    .catch(() => assert.fail(`${where}: #step-8 did not open on that step`));

  // The scene's own name opens it too: that is what the notebooks link
  // to, because it survives a reorder and a number does not.
  await page.goto(
    `${origin}${prefix}interactive/linalg-stage.html?lang=${lang}#portal`);
  await page.waitForFunction(() =>
    document.querySelector('#stage').dataset.step === '4',
    null, {timeout: 8000})
    .catch(() => assert.fail(`${where}: #portal did not open the SVD portal`));
  // The name is followed by a smooth scroll to the section, and the
  // step machine follows the scroll: on the way it may cross a step
  // that renders through the composer. Poll for it holding at 4
  // rather than sleeping a guess at how long the scroll takes.
  await waitStepSettled(page, '4', where);
  const mode4 = await page.evaluate(() =>
    document.querySelector('#stage').dataset.gl);
  assert(mode4 === 'direct' || mode4 === 'none',
    `${where}: the SVD portal renders two viewports, so it must not go through the composer; got '${mode4}'`);

  // A v = sigma u. Scrub x onto the first right singular vector and the
  // length of A x must be sigma_1 exactly.
  const deg = await page.evaluate(() => {
    const V = window.LinalgCore.svd([[3, 1.2], [0.4, 1]]).V;
    return Math.round(Math.atan2(V[1][0], V[0][0]) * 180 / Math.PI + 360) % 360;
  });
  await page.locator('#scrub').fill(String(deg));
  await page.waitForFunction(() => document.querySelector('#stage').dataset.aligned === '0',
    null, {timeout: 3000}).catch(() => {});
  const d = await page.evaluate(() => ({...document.querySelector('#stage').dataset}));
  assert.equal(d.aligned, '0', `${where}: x on v1 should register as aligned`);
  assert.equal(d.step, '4', `${where}: the portal is step 4`);
  // Compared with a tolerance rather than as strings: the scrub angle is
  // rounded to whole degrees, so |A x| lands near sigma_1 but not on it,
  // and string equality would flake for any matrix whose sigma_1 sat
  // close to a rounding boundary.
  const gap = Math.abs(Number(d.av) - Number(d.sigma.split(',')[0]));
  assert(gap < 5e-3,
    `${where}: |A v1| is ${d.av}, sigma_1 is ${d.sigma.split(',')[0]} (gap ${gap})`);

  // The remaining steps, each driven through its own controls and read off the
  // stage as numbers -- computed in-page through LinalgCore where a
  // reference value is needed, so the assertion is independent of the
  // page's own state. Every one of these is a claim the step makes in
  // prose; a wrong number here is a wrong claim on screen.
  const open = async (n) => {
    await page.goto(
      `${origin}${prefix}interactive/linalg-stage.html?lang=${lang}#step-${n}`);
    await page.waitForFunction((n) =>
      document.querySelector('#stage').dataset.step === String(n), n, {timeout: 8000})
      .catch(() => assert.fail(`${where}: #step-${n} did not open on that step`));
    await waitStepSettled(page, String(n), where);
  };
  const data = () => page.evaluate(() => ({...document.querySelector('#stage').dataset}));
  // A control's own oninput writes the readout synchronously (see
  // linalg-kit.js's bindSlider), so there is no tween to wait out --
  // but `settle` still polls the value the next assertion needs,
  // rather than trusting that write ordering forever, and a ceiling
  // bounds the poll rather than a guessed sleep standing in for it.
  const settle = (pick) => pick
    ? page.waitForFunction(pick, null, {timeout: 4000}).catch(() => {})
    : page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  assert.equal(await page.locator('section.step').count(), 8, `${where}: eight steps`);
  assert.equal(await page.locator('#step-road').count(), 0,
    `${where}: the roadmap card should be gone now the steps exist`);
  // The bar shows one mark per step, and a mark is a way to jump.
  assert.equal(await page.locator('#dots .dot').count(), 8, `${where}: eight step marks`);
  await page.locator('#dots .dot').nth(3).click();
  await page.waitForFunction(() =>
    document.querySelector('#stage').dataset.step === '4', null, {timeout: 5000})
    .catch(() => assert.fail(`${where}: the fourth mark should open step 4`));
  assert.equal(await page.locator('#dots .dot[aria-current="step"]').count(), 1,
    `${where}: exactly one mark is current`);

  // Step 2: the sphere grazes the line at exactly the pseudoinverse's
  // norm, and ridge's answer is shorter than that.
  await open(2);
  const minnorm = await page.evaluate(() => {
    const LC = window.LinalgCore;
    return LC.norm(LC.mulVec(LC.pinv([[1, 2, 1], [2, -1, 1]]), [3, 1]));
  });
  await page.locator('#sphere').fill(String(Math.round(minnorm * 100)));
  await settle(() => document.querySelector('#stage').dataset.grazing === '1');
  let sd = await data();
  assert.equal(sd.grazing, '1', `${where}: the sphere at |x+| = ${minnorm} should graze the line`);
  assert(Math.abs(Number(sd.minnorm) - minnorm) < 2e-3, `${where}: |x+| is ${sd.minnorm}, expected ${minnorm}`);
  await page.locator('#lam').fill('70');
  await settle(() => {
    const s = document.querySelector('#stage').dataset;
    return Number(s.ridgenorm) < Number(s.minnorm);
  });
  sd = await data();
  assert(Number(sd.ridgenorm) < Number(sd.minnorm),
    `${where}: ridge (${sd.ridgenorm}) should be shorter than the min-norm solution (${sd.minnorm})`);
  assert(Number(sd.resid) > 0, `${where}: and no longer exact`);

  // Step 5: kappa is read off the assembled matrix and equals the
  // slider ratio; the third slider at its floor pushes it past 100.
  await open(5);
  await page.locator('#s3').fill('1');
  await settle(() => Number(document.querySelector('#stage').dataset.kappa) > 100);
  sd = await data();
  const sig = sd.sigma.split(',').map(Number);
  assert(Math.abs(Number(sd.kappa) - sig[0] / sig[2]) < 1e-2 * Number(sd.kappa),
    `${where}: kappa ${sd.kappa} should be sigma_1 / sigma_3 = ${sig[0] / sig[2]}`);
  assert(Number(sd.kappa) > 100, `${where}: kappa ${sd.kappa} should pass 100 at the floor`);

  // Step 3: the determinant reaches exactly zero and the rank drops.
  await open(3);
  sd = await data();
  assert.equal(sd.rank, '3', `${where}: the house starts full rank`);
  await page.locator('#flatten').fill('100');
  await settle(() => document.querySelector('#stage').dataset.rank === '2');
  sd = await data();
  assert.equal(sd.det, '0.000', `${where}: det should reach zero, got ${sd.det}`);
  assert.equal(sd.rank, '2', `${where}: rank should drop to 2, got ${sd.rank}`);

  // Step 6: aim the test vector along the first eigenvector, computed
  // in-page, and the stage must report it aligned with x and M x
  // nearly parallel. Whole-degree sliders, so a few degrees of slack.
  await open(6);
  const aim = await page.evaluate(() => {
    const v = window.LinalgCore.eig3([[2.0, 1.0, 0.3], [0.2, 0.6, 0.2], [0.4, 0.3, 1.3]])[0].v;
    return [Math.round((Math.atan2(v[2], v[0]) * 180 / Math.PI + 360) % 360),
            Math.round(Math.asin(v[1]) * 180 / Math.PI)];
  });
  await page.locator('#taz').fill(String(aim[0]));
  await page.locator('#tel').fill(String(aim[1]));
  await settle(() => document.querySelector('#stage').dataset.aligned === '0');
  sd = await data();
  assert.equal(sd.aligned, '0', `${where}: x on the first eigenvector should register as aligned`);
  assert(Number(sd.angle) < 4, `${where}: x and M x should be nearly parallel there, got ${sd.angle} degrees`);
  assert.equal(sd.eigen.split(',').length, 3, `${where}: three eigenvalues`);

  // Step 7: orthogonal columns are perfectly conditioned; half a degree
  // apart, kappa passes 100 and beta swings out and back.
  await open(7);
  sd = await data();
  assert(Math.abs(Number(sd.kappa) - 1) < 1e-2, `${where}: at 90 degrees kappa should be 1, got ${sd.kappa}`);
  await page.locator('#angle').fill('100');
  await settle(() => Number(document.querySelector('#stage').dataset.kappa) > 100);
  sd = await data();
  assert(Number(sd.kappa) > 100, `${where}: at half a degree kappa should pass 100, got ${sd.kappa}`);
  await page.locator('#noise').click();
  await settle(() => document.querySelector('#stage').dataset.perturbation === '0.02');
  sd = await data();
  assert.equal(sd.perturbation, '0.02', `${where}: the nudge must be exactly 2%`);
  assert(Number(sd.betaChange) > 100, `${where}: nearly parallel columns amplify a 2% target change`);
  const b6 = sd.beta.split(',').map(Number);
  assert(Math.abs(b6[0]) > 1 && b6[0] * b6[1] < 0,
    `${where}: beta should be large with opposite signs, got ${sd.beta}`);

  // Step 8: at 10⁻⁵ degrees apart the float32 columns are distinct and
  // kappa is finite; at a millionth they round to one vector, kappa is
  // Infinity, and the fault overlay is up. Back at 10⁻⁵ degrees it is down.
  await open(8);
  sd = await data();
  assert.equal(sd.f32, 'distinct', `${where}: 10⁻⁵ degrees apart is two float32 columns`);
  assert(isFinite(Number(sd.kappa)), `${where}: and a finite kappa, got ${sd.kappa}`);
  assert(await page.locator('#fault').isHidden(), `${where}: no fault yet`);
  await page.locator('#angle7').fill('100');
  await settle(() => document.querySelector('#stage').dataset.f32 === 'collapsed');
  sd = await data();
  assert.equal(sd.f32, 'collapsed', `${where}: a millionth of a degree should round both columns together`);
  assert.equal(sd.kappa, 'Infinity', `${where}: kappa should be Infinity, got ${sd.kappa}`);
  assert(await page.locator('#fault').isVisible(), `${where}: the fault overlay should show`);
  await page.locator('#angle7').fill('0');
  await settle(() => document.querySelector('#stage').dataset.f32 === 'distinct');
  assert(await page.locator('#fault').isHidden(), `${where}: and go when the columns part`);

  // The camera. Read off the stage as numbers rather than looked for in
  // pixels -- the same trade dataset.sigma makes for the singular values
  // -- and asserted whichever renderer is live, because the flat path
  // takes its screen basis from the same two angles the GL camera does.
  const stage = page.locator('#stage');
  const cam = () => stage.evaluate(e => e.dataset.cam);
  await page.goto(
    `${origin}${prefix}interactive/linalg-stage.html?lang=${lang}`);
  await page.waitForFunction(() =>
    document.querySelector('#stage').dataset.cam !== undefined,
    null, {timeout: 8000});
  const stageBox = await page.locator('#stage').boundingBox();
  const midX = stageBox.x + stageBox.width / 2;
  const midY = stageBox.y + stageBox.height / 2;
  // The pose Home has to restore, worked out the way the widget works it
  // out -- from step 1's camera through linalg-core -- rather than
  // sampled off the stage, which by now may be anywhere the idle drift
  // has taken it. Same trade as the matrix below: the numbers are typed
  // here so the assertion is independent of the page's own state.
  const homeCam = await page.evaluate(() => {
    const h = window.LinalgScenes.list()[0].pose.home;
    return `${h.az.toFixed(2)},${h.el.toFixed(2)},1.00`;
  });
  // Under the pointer the drift stands down, so what moves from here on
  // is the reader moving it. Poll `data-paused`, which a pointermove over
  // the stage sets, rather than sleeping a guess at when it lands.
  await page.mouse.move(midX, midY);
  await page.waitForFunction(() => document.querySelector('#stage').dataset.paused === 'true',
    null, {timeout: 3000})
    .catch(() => assert.fail(`${where}: hovering the stage should pause the drift`));
  const restingCam = await cam();
  await page.mouse.down();
  await page.mouse.move(midX + 120, midY + 40, {steps: 8});
  await page.mouse.up();
  const draggedCam = await cam();
  assert(draggedCam !== restingCam,
    `${where}: a drag should turn the stage (${restingCam} -> ${draggedCam})`);
  await page.locator('#stage').click({position: {x: 24, y: 24}});
  await page.keyboard.press('ArrowLeft');
  assert(await cam() !== draggedCam,
    `${where}: the arrow keys should turn the stage`);
  await page.keyboard.press('Home');
  assert.equal(await cam(), homeCam,
    `${where}: Home should put the camera back where it started`);
  // The zoom buttons drive the same dolly the + and - keys do, and
  // the dolly is the third number in the stamp. Clicked from the page
  // rather than by the pointer: a pointer click would scroll the bar
  // into view, and the step a reader is on *is* the scroll position,
  // so the buttons would act on whichever step the scroll landed on.
  const dollyOf = c => Number(c.split(',')[2]);
  const press = id => page.evaluate(id => document.getElementById(id).click(), id);
  // Polled, then asserted: on a runner busy with the other shards'
  // browsers the stamp can read another step's view for a frame (a late
  // scroll-follow callback, or three.js finishing its boot), and a read
  // taken once then fails a zoom that did happen. The assertion after
  // each poll still carries the message.
  const dollyTo = (want) => page.waitForFunction((want) => {
    const d = Number(document.querySelector('#stage').dataset.cam.split(',')[2]);
    return want === 'in' ? d < 1 : want === 'out' ? d > 1 : d === 1;
  }, want, {timeout: 5000}).catch(() => {});
  const camIs = (want) => page.waitForFunction((want) =>
    document.querySelector('#stage').dataset.cam === want, want, {timeout: 5000})
    .catch(() => {});
  await press('zoom-in');
  await dollyTo('in');
  assert(dollyOf(await cam()) < 1,
    `${where}: Zoom in should bring the camera closer (${await cam()})`);
  await press('zoom-out');
  await press('zoom-out');
  await dollyTo('out');
  assert(dollyOf(await cam()) > 1,
    `${where}: Zoom out should move the camera away (${await cam()})`);
  await press('home');
  await camIs(homeCam);
  assert.equal(await cam(), homeCam,
    `${where}: the Home button should also reset the zoom`);

  // Under reduced motion there is no entrance to play, no glide into a
  // step and no drift: the camera holds still from the first frame.
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto(
    `${origin}${prefix}interactive/linalg-stage.html?lang=${lang}#step-4`);
  await page.waitForFunction(() =>
    document.querySelector('#stage').dataset.cam !== undefined,
    null, {timeout: 8000});
  const stillCam = await cam();
  await page.waitForTimeout(400);
  assert.equal(await cam(), stillCam,
    `${where}: under reduced motion the camera must not move on its own`);
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.goto(
    `${origin}${prefix}interactive/linalg-stage.html?lang=${lang}`);
  await page.waitForFunction(() =>
    document.querySelector('#stage').dataset.cam !== undefined,
    null, {timeout: 8000});

  // Plain wheel zoom belongs to the frame; the page still scrolls
  // beside it, and modified wheel remains the browser's own zoom.
  await page.mouse.move(midX, midY);
  const scrolledFrom = await page.evaluate(() => scrollY);
  const beforeWheel = dollyOf(await cam());
  await page.mouse.wheel(0, 240);
  // Chrome on Linux animates a wheel scroll and eases the dolly over
  // frames the runner draws slowly, so poll for each outcome rather
  // than sleeping a fixed time and reading once.
  await page.waitForFunction(before =>
    Number(document.querySelector('#stage').dataset.cam.split(',')[2]) > before,
    beforeWheel, {timeout: 5000})
    .catch(() => assert.fail(`${where}: wheel out must zoom out`));
  assert.equal(await page.evaluate(() => scrollY), scrolledFrom,
    `${where}: wheel zoom must hold the current step`);
  await page.mouse.move(15, 100);
  await page.mouse.wheel(0, 400);
  await page.waitForFunction(from => scrollY > from, scrolledFrom, {timeout: 5000})
    .catch(() => assert.fail(`${where}: scrolling beside the stage must navigate the page`));

  // Every frame keeps a user dolly, and reset restores both example
  // controls and framing. Presets must leave their sliders in sync.
  for (let n = 1; n <= 8; n++) {
    await open(n);
    await press('home');
    await press('zoom-in');
    await dollyTo('in');
    assert(dollyOf(await cam()) < 1, `${where}: step ${n} zooms in`);
    await press('zoom-out'); await press('zoom-out');
    await dollyTo('out');
    assert(dollyOf(await cam()) > 1, `${where}: step ${n} zooms out`);
    // The step's controls live in the dock under the stage on a wide
    // screen (step-dock.js), not in the step's own section.
    const input = page.locator(`.dock-panel[data-step="step-${n}"] input[type=range]`).first();
    await input.fill(await input.getAttribute('max'));
    await press('reset');
    await dollyTo('home');
    assert.equal(dollyOf(await cam()), 1, `${where}: step ${n} reset restores framing`);
    assert(await input.evaluate(e => e.value === e.defaultValue),
      `${where}: step ${n} reset restores the experiment`);
    if (n <= 6) {
      const presets = page.locator(`.dock-panel[data-step="step-${n}"] .presets button`);
      for (let j = 0; j < await presets.count(); j++) {
        await presets.nth(j).evaluate(e => e.click());
        assert(await page.locator(`#read-${n}`).innerText(), `${where}: preset has a readout`);
      }
    }
  }

  // The idle drift: the stage turns while nobody is pointing at it, and
  // is the reader's the moment they are. One language only -- it costs
  // real seconds and there is no copy in it -- and only where there is a
  // context to drift in, since the flat fallback draws when it is told
  // to rather than every frame. Polled rather than slept on, so a slow
  // runner makes this take longer and not fail.
  if (lang === 'en') {
    await page.goto(
      `${origin}${prefix}interactive/linalg-stage.html?lang=${lang}`);
    // dataset.gl reads "none" from the very first flat draw, whichever
    // way bootGL eventually decides, so that alone is not the decision.
    // Poll for the decision itself: gl becoming a WebGL mode, or
    // #glnote coming up to say there is none.
    await page.waitForFunction(() =>
      document.querySelector('#stage').dataset.gl !== 'none' ||
      !document.getElementById('glnote').hidden,
      null, {timeout: 8000});
    if (await stage.evaluate(e => e.dataset.gl) === 'none') {
      console.log(`  (${where}: no WebGL here, so there is nothing to drift)`);
    } else {
      const moves = async (ms) => {
        const first = await cam();
        const until = Date.now() + ms;
        while (Date.now() < until) {
          await page.waitForTimeout(80);
          if (await cam() !== first) return true;
        }
        return false;
      };
      await page.mouse.move(2, 2);
      assert(await moves(5000), `${where}: the stage should drift while idle`);
      await page.mouse.move(midX, midY);
      await page.waitForTimeout(200);
      assert(!await moves(900), `${where}: the drift must stop under the pointer`);
      await page.mouse.move(2, 2);
      assert(await moves(6000),
        `${where}: the drift should come back once the pointer leaves`);
      // Freeze a geometry tween too, not only the camera. The CSS2D
      // vector labels follow the rendered arrow tips in this scene.
      await page.locator('#tilt').fill('0');
      await page.waitForTimeout(500);
      await page.locator('#tilt').fill('600');
      await page.waitForTimeout(50);
      // Filling the slider scrolled it into view, and the stage is
      // sticky, so it is no longer where it was measured at load: hover
      // its centre as it is now, not `midY`, which the site nav above
      // the header pushed to just under the stuck frame.
      const stuck = await stage.boundingBox();
      await page.mouse.move(stuck.x + stuck.width / 2, stuck.y + stuck.height / 2);
      await page.waitForTimeout(50);
      const geometry = () => stage.locator('.mat-lab').evaluateAll(nodes =>
        nodes.map(e => [e.textContent, e.style.transform]));
      // Polled the way moves() polls the camera, rather than slept on
      // a guessed length: a slow runner then takes longer, not fails.
      const geometryMoves = async (ms) => {
        const first = JSON.stringify(await geometry());
        const until = Date.now() + ms;
        while (Date.now() < until) {
          await page.waitForTimeout(80);
          if (JSON.stringify(await geometry()) !== first) return true;
        }
        return false;
      };
      const held = await geometry();
      assert.equal(held.length, 2, `${where}: both vector labels must be present`);
      await page.waitForTimeout(350);
      assert.deepEqual(await geometry(), held, `${where}: hover must freeze geometry as well as drift`);
      await page.mouse.move(2, 2);
      assert(await geometryMoves(900), `${where}: geometry resumes on pointer leave`);
      await press('motion');
      await page.waitForTimeout(50);
      const paused = await geometry();
      await page.waitForTimeout(250);
      assert.deepEqual(await geometry(), paused, `${where}: manual pause holds the view`);
      await press('motion');

    }
  }
}

// Deliberately lose the GL module: all eight flat scenes must retain their
// controls, finite geometry, zoom and teaching data.
async function fallback(ctx, page, where, lang) {
  const {origin, prefix, audit} = ctx;
  await page.route('**/vendor/linalg-boot.js', route => route.abort());
  await page.emulateMedia({reducedMotion: 'reduce'});
  for (let n = 1; n <= 8; n++) {
    await page.goto(`${origin}${prefix}interactive/linalg-stage.html?lang=${lang}&fallback-check=1#step-${n}`);
    await page.waitForFunction(n => document.querySelector('#stage').dataset.step === String(n), n);
    await page.waitForFunction(() => !document.querySelector('#glnote').hidden);
    assert.equal(await page.locator('#stage').getAttribute('data-gl'), 'none');
    const svg = page.locator('#flat');
    const beforeZoom = await svg.innerHTML();
    assert(!/NaN|Infinity/.test(beforeZoom), `${where}: flat step ${n} has finite geometry`);
    await page.locator('#zoom-in').evaluate(e => e.click());
    assert.notEqual(await svg.innerHTML(), beforeZoom, `${where}: flat step ${n} actually zooms`);
    await page.locator('#reset').evaluate(e => e.click());
    if (n === 1) assert((await page.locator('#labels').innerText()).includes('O (0, 0, 0)'));
    if (n === 2 || n === 3) assert(await svg.locator('line').count() > 30, `${where}: step ${n} has grid rulings`);
    if (n === 7) {
      await page.locator('#noise').evaluate(e => e.click());
      await page.locator('#parallel').evaluate(e => e.click());
      assert(Number(await page.locator('#stage').getAttribute('data-beta-change')) > 100);
    }
    if (n === 8) {
      await page.locator('#merged').evaluate(e => e.click());
      assert.equal(await page.locator('#stage').getAttribute('data-f32'), 'collapsed');
    }
    if ([1, 7, 8].includes(n)) await audit(`${where} flat step ${n}`);
  }
  await page.unroute('**/vendor/linalg-boot.js');
  await page.emulateMedia({reducedMotion: 'no-preference'});
}

// Its embed mode is the portal's still frame -- no scroller, no three.js --
// which is a hero tab.
async function embed(ctx, page, where) {
  await page.waitForFunction(() => document.querySelector('#flat').childElementCount > 0);
  assert.equal(await page.locator('#stage').getAttribute('data-gl'), 'none');
  assert.equal(await page.locator('#stage').getAttribute('data-scene'), 'portal',
    `${where} embed: the hero gets the SVD portal`);
  assert(await page.locator('.steps').isHidden(), `${where} embed: scroller shown`);
  assert.equal(await page.evaluate(() => window.THREE), undefined,
    `${where} embed: three.js must not be fetched on the front door`);
}

module.exports = {en, es, drive, fallback, embed, waitStepSettled};
