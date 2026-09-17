// Bridges the vendored ESM three.js to the widget's classic script.
//
// three.js deleted its UMD builds at r160, so there is no `three.min.js` to
// drop in a plain <script> any more -- the widget shipped pointing at one and
// the URL was a 404, which is why every visitor got the canvas fallback and a
// message blaming their WebGL. The build is now a module, vendored beside this
// file, and this is the two-line adapter: import it, hang it on `window`, say
// so. The page's own script is classic, and waits for that event.
//
// Modules are deferred, so this always runs after the page script has bound
// its listener. If the import fails -- an offline file:// open, a blocked
// request -- nothing dispatches, and the page's timeout falls back to the
// isometric canvas on its own.
import * as THREE from "./three-0.169.0.module.min.js";

window.THREE = THREE;
window.dispatchEvent(new Event("three-ready"));
