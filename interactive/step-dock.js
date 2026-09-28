/* The step dock: the controls of whichever step is on screen, under the stage
   they change.

   The four scrollers write each step as prose, then a predict-first question,
   then the step's sliders and readout. On a wide screen that put the sliders
   at the bottom of a column of text, a screen away from the picture they
   drive, so moving one meant reading one place and looking at another. The
   dock takes those nodes out of every step once, parks them in one panel per
   step inside the sticky column, and shows the panel of the step in view.
   The question stays in the prose, where it is read before anything is
   touched.

   The nodes are moved, never copied, so every id, every listener a scene
   attached and every `data-*` a check reads stay exactly as they were. Below
   the page's stacking width the sticky column already holds most of the
   screen, so there the nodes go back to their steps, in their own order,
   and the dock is hidden.

   Not arithmetic, so not a core: a plain script each scroller loads before
   its own, like the chrome it sits in. */
(function () {
  "use strict";

  const el = (x) => (typeof x === "string" ? document.getElementById(x) : x);

  // dock:     the element inside .stagewrap that holds the panels.
  // steps:    the step sections (elements or ids), in page order.
  // selector: which *direct* children of a step move -- its controls and
  //           its readout.
  // wide:     the media query under which the dock is used.
  function mount(dock, steps, selector, wide) {
    dock = el(dock);
    const entries = [];
    for (const s of steps) {
      const section = el(s);
      const moving = [...section.children].filter((c) => c.matches(selector));
      if (!moving.length) continue;
      const panel = document.createElement("div");
      panel.className = "dock-panel";
      panel.dataset.step = section.id;
      // Named by the step's own heading, so a screen reader arriving in the
      // dock hears which step these controls belong to.
      panel.setAttribute("role", "group");
      const heading = section.querySelector("h2[id]");
      if (heading) panel.setAttribute("aria-labelledby", heading.id);
      panel.hidden = true;
      // The step's heading over its controls: its text is filled in by the
      // page's copy after this runs, so show() copies it across.
      const title = document.createElement("p");
      title.className = "dock-title";
      title.setAttribute("aria-hidden", "true");
      panel.appendChild(title);
      dock.appendChild(panel);
      // Where each node goes back to: the marker stays in the step.
      const marks = moving.map((node) => {
        const mark = document.createComment("dock");
        node.before(mark);
        return mark;
      });
      entries.push({section, panel, title, heading, moving, marks});
    }
    let current = null;
    let docked = false;
    const query = matchMedia(wide);

    function place() {
      const want = query.matches;
      if (want === docked) return;
      docked = want;
      for (const e of entries) {
        if (want) e.panel.append(...e.moving);
        else e.moving.forEach((node, i) => e.marks[i].after(node));
      }
      document.documentElement.classList.toggle("docked", want);
      show(current);
    }

    function show(section) {
      const was = current;
      current = section ? el(section) : null;
      let any = false;
      for (const e of entries) {
        const on = docked && e.section === current;
        e.panel.hidden = !on;
        if (on && e.heading) e.title.textContent = e.heading.textContent;
        any = any || on;
      }
      dock.hidden = !any;
      // A long panel scrolled to its end must not open the next step there.
      if (any && current !== was) dock.scrollTop = 0;
    }

    // The element that holds a step's controls right now: its dock panel on
    // a wide screen, the step itself otherwise.
    function controlsOf(section) {
      const s = el(section);
      const e = entries.find((x) => x.section === s);
      return e && docked ? e.panel : s;
    }

    query.addEventListener("change", place);
    place();
    return {show, controlsOf};
  }

  window.StepDock = {mount};
})();
