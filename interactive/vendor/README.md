# Vendored three.js

`three-0.169.0.module.min.js` is the unmodified minified ESM build of three.js
r169, MIT licensed. `three.LICENSE` is its licence text, copied from the r169
tag.

```
source  https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js
sha256  f7cee3c7533449a1505cc12cb5128b89e3d4fd3d7ea62b05f9f5464a217472ee
bytes   687458
fetched 2026-09-17
```

Verify with:

```bash
shasum -a 256 interactive/vendor/three-0.169.0.module.min.js
```

**Why it is committed rather than loaded from a CDN.** Two reasons, and the
second is the one that decided it.

A CDN load is invisible to the browser check. `scripts/check_navigation.cjs`
aborts every off-origin request, deliberately, so a third-party script tag could
never be exercised there — the check would always be measuring the fallback and
reporting a pass. Same-origin, it loads, and the check can assert that it did.

And the previous URL was wrong for eleven days without anything noticing.
`three@0.169.0/build/three.min.js` has not existed since r160, when three.js
dropped its UMD builds; the widget requested it, the request 404'd, the promise
rejected into the designed fallback, and the page told every reader "WebGL
unavailable" about a machine whose WebGL was fine. A file in the repo cannot
404, and `repo.widgets` in `_variables.yml` lists it so `check_links.py` fails
the build if it stops reaching `docs/`.

Upgrading means replacing both files, updating the hash and byte count above,
the import in `three-boot.js`, and the path in `_variables.yml`.

# Vendored three.js addons

The eleven modules under `three-0.169.0/examples/jsm/` are the unmodified
`examples/jsm` files from the same r169 tag, MIT licensed under the same
`three.LICENSE`. The projection & SVD stage
(`../linalg-stage.html`) loads them through `linalg-boot.js`; the reshape
& transpose visualizer does not touch them.

```
source  https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/<path>
fetched 2026-09-18
```

| path | bytes | sha256 |
|---|---|---|
| `postprocessing/EffectComposer.js` | 4651 | `d234e578618fa816955ebdc059c049c577e203e650e33cf22bde3f232c29e669` |
| `postprocessing/MaskPass.js` | 2231 | `328cf7db0da5d9be83ffe39d54b01d5ac1fddf108cc98182ddbb056f5c8b537f` |
| `postprocessing/OutputPass.js` | 2524 | `32f879d2179087676631c799857a885586b3cdd13b9731bd3b13f06428bd58b7` |
| `postprocessing/Pass.js` | 1706 | `b3c6128340eaa37e40a6a2f1b738e894c855239417d50959759b34a2b5e89f92` |
| `postprocessing/RenderPass.js` | 1941 | `6c9b8a539ea16e898f65e4760f14937ef9ea94043bd9842c141e0301f41903e8` |
| `postprocessing/ShaderPass.js` | 1576 | `3b28a1ee27e0eb96c0eab137a1f442ccf127a926904eced2d51e125ec44af781` |
| `postprocessing/UnrealBloomPass.js` | 12410 | `3bd23a1097af75c7002d0ffc21a6c14f45c4dd701dbaf737030dfc61fb7c64d9` |
| `renderers/CSS2DRenderer.js` | 4681 | `e900e58dbc428d8d3211f87f3ff0301e514f6dc563655c710bcda15c96397feb` |
| `shaders/CopyShader.js` | 571 | `4e3346db194db56a596cd074e9bdb39fb5eb52040c333e0d29dc4eb1324d3b1d` |
| `shaders/LuminosityHighPassShader.js` | 1147 | `9f4866f9abb2d96fd83eec46ba4bf2165b22155a7a37ff425c0f60eba18007cb` |
| `shaders/OutputShader.js` | 1490 | `4944cecd49c0d4d1520a4d927bde8a590fd43f041ee913252b9451855a01d0f0` |

Verify with:

```bash
cd interactive/vendor/three-0.169.0/examples/jsm && shasum -a 256 */*.js
```

**Why the upstream directory tree is preserved.** These files import each other
by relative path — `EffectComposer.js` reaches for `./ShaderPass.js`,
`./MaskPass.js` and `../shaders/CopyShader.js` — so `postprocessing/`,
`shaders/` and `renderers/` have to stay siblings or every one of those
imports needs editing. Keeping the whole `three-0.169.0/examples/jsm/` path
also makes the vendored location a literal suffix of the source URL above, so
the provenance is one substitution rather than a mapping to check.

Two of the eleven are here because `EffectComposer.js` imports them whether or
not the widget asks: `MaskPass.js` (for `MaskPass` and `ClearMaskPass`) and,
through it, `Pass.js`. Dropping either breaks the import at runtime, not at
build time.

**Why a bare specifier is resolved rather than rewritten.** Every one of these
files says `import { ... } from 'three'`. A browser resolves a bare specifier
with an import map, a bundler, or nothing — and there is no bundler here. So
`linalg-stage.html` carries a static import map in its `<head>`:

```html
<script type="importmap">
{ "imports": {
    "three": "./vendor/three-0.169.0.module.min.js",
    "three/addons/": "./vendor/three-0.169.0/examples/jsm/"
} }
</script>
```

The alternative — editing `'three'` to a relative path in eleven files — would
make the sha256 column above describe files that are no longer what upstream
ships, which is the one thing this README exists to promise. A boot module that
re-exports the core build does **not** work as a substitute: the addons ask for
`three`, and a bare specifier stays bare however the file next to it is named.

Three properties of that map are load-bearing:

- **It is static and in `<head>`.** A map must be in the document before the
  first module resolves, and there is one per document. It must not be injected
  from `bootGL()` next to the boot script the way the script tag is.
- **It fetches nothing** until a module import actually resolves, so the lazy
  boot still holds: embed mode fetches no three.js at all, and
  `check_navigation.cjs`'s `window.THREE === undefined` assertion there
  stays true.
- **`check_links.py` cannot see it.** `harvest()` parses attributes, and the
  map is element *content*. That is exactly why every file above is listed in
  `repo.widgets` — it is the only thing that notices a vendored module which
  never reached `docs/`.

Upgrading three.js now means both builds: the core file, these eleven, both
hash tables, `three-boot.js`, `linalg-boot.js`, the import map in
`linalg-stage.html`, and all fourteen `repo.widgets` lines.

# Vendored CMU Serif

`cmu-serif/` holds two faces of Computer Modern Unicode Serif as woff2, and
the SIL Open Font License 1.1 they are under, copied unmodified from the npm
package `computer-modern@0.1.3` as jsdelivr serves it. The projection & SVD
stage (`../linalg-stage.html`) uses them for the labels on its stage and
nothing else: the look that stage takes is a Manim frame, and Computer Modern
is most of that look.

```
source  https://cdn.jsdelivr.net/npm/computer-modern@0.1.3/<path>
fetched 2026-09-19
```

| path | vendored as | bytes | sha256 |
|---|---|---|---|
| `fonts/cmu-serif-500-roman.woff2` | `cmu-serif/cmu-serif-500-roman.woff2` | 222840 | `1b875e541dc5c517cd11d244710d8639addbe91a0bb1ba55e7c4593225c7a970` |
| `fonts/cmu-serif-500-italic.woff2` | `cmu-serif/cmu-serif-500-italic.woff2` | 170068 | `dff13cb212b960c65ba36d0085863a2f2fb056aae7f859e37f07abeb82a71c25` |
| `OFL.txt` | `cmu-serif/OFL.txt` | 4820 | `73273dffdefe2e5f1e138084d4a4b65b1c50df2ab0179f78484f31beefe30d84` |

Verify with:

```bash
cd interactive/vendor/cmu-serif && shasum -a 256 *
```

**Why vendored and not a CDN stylesheet.** The same reason three.js is:
`check_navigation.cjs` aborts every off-origin request, so a font from a CDN
would load on a reader's machine and test as Times on the runner, and nothing
would say so. The two woff2 files are in `repo.widgets` because a `@font-face`
`url()` is CSS content, which the link harvest does not read.

# The voice recording

`voice.wav` is the recording the voice tensor stage factors, reproduced
unmodified. It is CC0, "Short voice sample, by Bart Massey", from the sample
set Portland State University's *Computers, Sound and Music* course uses; the
upstream README licenses the set CC0 unless a file says otherwise, and this
file does not.

```
source  https://raw.githubusercontent.com/pdx-cs-sound/wavs/
        ed5ebcbbbc2d11f0adddc9b50b78d581c29f738c/voice.wav
sha256  2c4b4d9d5f90715fdbf599869a465d521638f40ca978b186df96f1543a4d67dc
bytes   475180
format  PCM, mono, 48000 Hz, 16-bit, 237568 samples, 4.949 s
fetched 2026-09-20
```

Verify with:

```bash
shasum -a 256 interactive/vendor/voice.wav
```

**Why this recording and not a shorter or lighter one.** It is the file
Appendix E already uses. The handbook's take-home downloads it from the URL
above and refuses it unless the SHA-256 matches, and publishes a table of
signal-to-noise ratios computed from it; the stage recomputes that table in the
browser. One recording with one hash means the notebook and the widget cannot
drift into quoting different numbers for the same experiment, and
`tests/audio_core.test.cjs` fails if they ever do. A shorter clip would be a
smaller download and a different `(513, 465)`, so every number in the handbook
would have to be re-executed to match it.

**Why it is committed rather than fetched at run time.** The same reason
three.js and the serif are: `check_navigation.cjs` aborts every off-origin
request, so a recording pulled from GitHub would test as a silent failure on
the runner. It is in `repo.widgets` because nothing else would notice it
failing to reach `docs/`.

**Why the noise is not shipped with it.** Appendix E adds the noise
deliberately, because only a known clean reference makes SNR measurable at all.
`audio-core.js` generates it from a seeded generator, so the widget's noise is
reproducible without another half-megabyte in the repo. That generator is not
numpy's, so the draw is not the notebook's draw; across seeds the peak of the
curve moves by about 0.04 dB, which is why the stage reports it to one decimal
and the test allows 0.05.

**`*.wav binary` in `.gitattributes` is load-bearing.** The repo sets
`* text=auto eol=lf` to keep CRLF out of the index. A WAV file that some clone
decided was text would have its bytes rewritten, the SHA-256 above would stop
matching, and the stage would play noise.

# The reggaeton beat

`beat.wav` is the second recording the voice tensor stage offers, so the
sampling and quantization scenes have transients to thin out and crunch. It is
c0mp0s3r's *Reggaeton groove (105 bpm - 4 bars).wav* on Freesound, licensed
**Creative Commons 0**, cut to the voice's exact length and format.

```
page     https://freesound.org/people/c0mp0s3r/sounds/177422/
author   c0mp0s3r (Freesound)
licence  CC0 1.0 -- https://creativecommons.org/publicdomain/zero/1.0/
source   https://cdn.freesound.org/previews/177/177422_2326737-hq.mp3
         (Freesound's public HQ preview of the sound: MP3, 44.1 kHz, stereo,
         9.143 s; the original 16-bit WAV is served only to a logged-in
         account, and the preview is what could be fetched and hashed here)
sha256   959c1cb3b0a1dc31170052c128e7e7725694134f40695d62b75f4f4b89102261  (the preview, as fetched)
fetched  2026-09-20

vendored as  beat.wav
sha256       016a2855af17adee393d8bdb6c902d27ec9a742b60061662d638f055d3c6c5ad
bytes        475180
format       PCM, mono, 48000 Hz, 16-bit, 237568 samples, 4.949 s
```

Made from the preview with ffmpeg 8.1.2, once, by hand:

```bash
ffmpeg -i 177422_2326737-hq.mp3 \
  -af "aformat=channel_layouts=mono,aresample=48000,atrim=end_sample=237568" \
  -sample_fmt s16 -c:a pcm_s16le -fflags +bitexact -flags:a +bitexact -map_metadata -1 \
  interactive/vendor/beat.wav
```

Verify with:

```bash
shasum -a 256 interactive/vendor/beat.wav
```

**Why exactly 237 568 samples.** That is `voice.wav`'s length, and the reshape
scene's matrix is square only at that length (464 x 512 hops, see the scene).
Cutting the beat to the same count means every shape on every scene -- the
(513, 465) spectrogram, the (513, 513) square, the `(237568,)` array -- is the
same whichever recording is on the stage, and the readouts never carry a second
set of numbers. The trim is the first 4.949 s of the loop, a little over two of
its four bars.

**Why the preview and not the original.** Freesound serves the original file
only to an account, and the vendoring rule here is that the source line names
what was actually fetched and hashed. The preview is a 185 kbit/s MP3 of the
same recording, and the stage rounds it to 16 bits and thins it to 3 kHz
anyway -- the encoding is far below what either scene shows. Swapping in the
original is welcome: download it, run the same ffmpeg line, and replace the
`source`, `sha256` and `bytes` lines above with the new ones.

**Why nothing commercial, however short.** A clip of a released record is a
copyright question on a public repository and a public site, and it does not
matter that a sampling lesson needs only three seconds of it. The stage's drop
zone is where such a file goes: decoded in the page, kept in the tab, never
committed. The `*.wav binary` line in `.gitattributes` covers this file as it
covers `voice.wav`.
