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
