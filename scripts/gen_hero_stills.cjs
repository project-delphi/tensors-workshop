#!/usr/bin/env node
// Draws the homepage hero's stills: one picture per widget per language,
// `images/hero-<widget>-<lang>.webp`, each a screenshot of that widget's own
// embed mode (`?embed=1&theme=navy`) -- the same frame the hero used to load
// live in an iframe. The hero now shows the picture and links it to the full
// widget, so the front door fetches no widget code at all.
//
// Rerun it when a widget's embed changes; nothing in CI will tell you a still
// is stale, the same as every other image generator here.
//
//   npm run gen:hero            # every widget, both languages
//   node scripts/gen_hero_stills.cjs voice-stage
//
// Served from the repo over http, because the widgets fetch their data and a
// file:// page may not. Reduced motion is on, so no entrance or idle drift is
// half-way through when the shutter goes. WebP is encoded by Chromium itself
// (canvas.toDataURL), which keeps this free of an image library.

const fs = require('fs');
const http = require('http');
const path = require('path');
const {chromium} = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'images');
// The hero column's aspect ratio (homepage.scss, .hero-still), at 2x.
const VIEW = {width: 600, height: 480};
const SCALE = 2;
const QUALITY = 0.86;

// What each embed publishes once its picture is final. The same signals
// check_navigation.cjs waits on for the embeds.
const WIDGETS = {
  'image-tensor': () => document.querySelector('#stage').dataset.photos === '3',
  'broadcasting-simulator': () => !!document.querySelector('#embedcap b'),
  'linalg-stage': () => document.querySelector('#flat').childElementCount > 0,
  'voice-stage': () => document.querySelector('#stage').dataset.ready === '1',
  'attention-stage': () => document.getElementById('stage').dataset.ready === '1',
  'factor-stage': () => document.getElementById('stage').dataset.ready === '1',
};

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml',
};

function serve() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {'content-type': TYPES[path.extname(file)] || 'application/octet-stream'});
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok(server)));
}

(async () => {
  const only = process.argv.slice(2);
  const names = only.length ? only : Object.keys(WIDGETS);
  for (const n of names) if (!WIDGETS[n]) throw new Error(`unknown widget ${n}`);

  const server = await serve();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEW, deviceScaleFactor: SCALE, reducedMotion: 'reduce', colorScheme: 'dark'});
  const page = await context.newPage();
  const encoder = await context.newPage();
  try {
    for (const name of names) {
      for (const lang of ['en', 'es']) {
        await page.goto(`${origin}/interactive/${name}.html?lang=${lang}&embed=1&theme=navy`);
        await page.waitForFunction(WIDGETS[name], null, {timeout: 30000});
        await page.evaluate(() => document.fonts.ready);
        // Reduced motion skips the tweens, but a scene still draws on the
        // next frame or two after it says it is ready.
        await page.waitForTimeout(600);
        const png = await page.screenshot({type: 'png'});
        const webp = await encoder.evaluate(async ([b64, q]) => {
          const img = new Image();
          img.src = `data:image/png;base64,${b64}`;
          await img.decode();
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
          return c.toDataURL('image/webp', q).split(',')[1];
        }, [png.toString('base64'), QUALITY]);
        const out = path.join(OUT, `hero-${name}-${lang}.webp`);
        fs.writeFileSync(out, Buffer.from(webp, 'base64'));
        console.log(`${path.relative(ROOT, out)}  ${Math.round(fs.statSync(out).size / 1024)} kB`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
