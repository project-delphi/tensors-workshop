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
