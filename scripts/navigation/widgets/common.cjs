// Helpers more than one widget's drive* function shares.
const assert = require('node:assert/strict');

// Every widget is moving within a few seconds of opening, with nothing asked
// of the reader: the four stages that drift start drifting, the broadcasting
// simulator plays its stretch, the attention stage draws its first picture
// in. Loaded with the pointer already resting on the stage, because that is
// the case that used to freeze two of them: a resting pointer is not a
// reader reaching for the view, only a moving one is. Two screenshots of the
// stage differing is the definition of "moving" that holds for all six,
// whatever each one draws with; the loop's own interval is the thing under
// test, not a stand-in for a value to poll.
async function movesOnLoad(ctx, file, where) {
  const {page, origin, prefix} = ctx;
  await page.setViewportSize({width: 1440, height: 1000});
  await page.goto(`${origin}${prefix}interactive/${file}.html?lang=en`);
  const box = await page.locator('#stage').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.reload();
  const shot = async () =>
    (await page.locator('#stage').screenshot()).toString('base64');
  const first = await shot();
  let moved = false;
  for (let i = 0; i < 40 && !moved; i++) {
    await page.waitForTimeout(200);
    moved = await shot() !== first;
  }
  assert(moved,
    `${where}: the stage should be moving within 8 s of loading, with the pointer resting on it`);
  await page.mouse.move(2, 2);
}

module.exports = {movesOnLoad};
