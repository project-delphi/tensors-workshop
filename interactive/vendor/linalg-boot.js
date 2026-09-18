// Bridges the vendored ESM three.js and its post-processing addons to the
// projection & SVD stage's classic script. Same two-line-adapter job as
// three-boot.js beside it, one level richer: the widget needs the composer,
// the bloom pass and the CSS2D label renderer as well as the core build, so
// two globals go out rather than one, under the same single event.
//
// Every specifier here is *bare* -- `three`, `three/addons/...` -- and is
// resolved by the import map in the widget's <head>, not by this file's
// location. That is deliberate. The addon files are unmodified upstream
// copies whose sha256 the vendor README states, and they say `from 'three'`;
// rewriting that to a relative path in eleven files would make the hashes
// describe something other than what upstream ships. One map resolves all of
// it, and this file uses the same map so there is one resolution story rather
// than two.
//
// Modules are deferred, so this always runs after the page script has bound
// its listener. If an import fails -- an offline file:// open, a vendored file
// that never reached docs/ -- nothing dispatches, and the page's timeout falls
// back to the flat renderer on its own.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

window.THREE = THREE;

// OutputPass belongs last in every chain built from these. Without it the
// composer bypasses renderer.outputColorSpace and renders visibly darker than
// the direct path -- which, on a widget that draws the same scene both ways,
// shows up as the fallback and the GL path disagreeing about colour with
// nothing to explain it.
window.THREE_ADDONS = {
  EffectComposer, RenderPass, UnrealBloomPass, OutputPass,
  CSS2DRenderer, CSS2DObject
};

window.dispatchEvent(new Event("three-ready"));
