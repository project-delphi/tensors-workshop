// The broadcasting simulator (section 03).
const assert = require('node:assert/strict');

const en = 'Broadcasting, step by step';
const es = 'Broadcasting, paso a paso';

async function drive(ctx, page, where) {
  await page.waitForSelector('#draw .cell');
  // The page opens by playing the stretch once (movesOnLoad() checks that it
  // moves). Let it finish, so axe measures the picture at rest rather than a
  // cell mid-transition.
  await page.waitForFunction(() => document.getElementById('stage').dataset.playing === '0',
    null, {timeout: 10000})
    .catch(() => assert.fail(`${where}: the opening stretch never finished`));
}

// The embed's picture is the same opening stretch, at rest.
async function embed(ctx, page) {
  await page.waitForSelector('#draw .cell');
}

module.exports = {en, es, drive, embed};
