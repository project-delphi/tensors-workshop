// Scene 1: the taxi tensor itself. One hour's 4x5 slice of real trip counts,
// a stack of 24 such slices with the chosen hour raised, and the three
// fibres through the selected cell -- the picture every later scene reduces.
// See factor-scenes/README.md for the contract this keeps.
(function () {
  "use strict";
  const FC = window.FactorCore, K = window.FactorKit;

  function sliceHour(T, h) {
    const rows = T.shape[0], cols = T.shape[1];
    return Array.from({length: rows}, (_, i) => Array.from({length: cols}, (_, j) => FC.at(T, i, j, h)));
  }

  function busiestHour(T) {
    const H = T.shape[2];
    const per = new Array(H).fill(0);
    for (let i = 0; i < T.shape[0]; i++)
      for (let j = 0; j < T.shape[1]; j++)
        for (let h = 0; h < H; h++) per[h] += FC.at(T, i, j, h);
    let best = 0;
    for (let h = 1; h < H; h++) if (per[h] > per[best]) best = h;
    return best;
  }

  const EN = {
    k: "The taxi tensor · section 10",
    h: "An order-3 tensor is a cube of numbers, addressed by three indices",
    concept: 'A tensor of order 3 is a cube of numbers T[i, j, k]: fix any one index and what is left is a matrix, fix two and what is left is a vector, a fibre through the cube. <span class="cite">Deep Learning §2.1</span>',
    claim: "T[i, j, k] ∈ ℝ⁴ˣ⁵ˣ²⁴,  480 counts",
    predict: "Before you slide: does the busiest hour change if you look at a different pickup and dropoff borough, or is it the same hour everywhere?",
    b: "<p>Every entry is a real trip count: how many rides went from one borough to another in one hour of the day, across 6,383 New York taxi trips. The stage shows one hour as a 4-by-5 grid of counts, and the stack behind it is all 24 hours, the chosen one raised.</p><p>Drag <b>pickup</b> and <b>dropoff</b> to move the highlighted cell; the three bars are the fibres through it -- every hour for this one route, every dropoff for this pickup at this hour, and every pickup for this dropoff at this hour.</p>",
    controls: {hour: "Hour", pickup: "Pickup borough", dropoff: "Dropoff borough"},
    // Drawn on the stage. Every visible string is translated, including the
    // ones inside the picture -- the stage is not chrome, and a literal here
    // renders the same under a Spanish heading.
    axHours: "24 hours",
    axFibreHour: "T[i,:,k] over hour",
    axFibreDropoff: "T[i,j,:] over dropoff",
    axFibrePickup: "T[:,j,k] over pickup",
    readout: (ctx, T, names, h, i, j, cell, busiest) =>
      `At <b>${names.pickup[i]} → ${names.dropoff[j]}</b>, hour <b>${h}</b>: <b>${cell}</b> trips. ` +
      (h === busiest
        ? `Hour ${h} is the busiest hour overall, summed across every route.`
        : `The busiest hour overall, summed across every route, is <b>${busiest}</b>.`),
    aria: (ctx) => {
      const s = ctx.state, names = ctx.names;
      return `A 4 by 5 grid of taxi trip counts for hour ${s.hour}, pickup ${names.pickup[s.pickup]} and dropoff ${names.dropoff[s.dropoff]} highlighted, a stack of 24 such grids behind it with hour ${s.hour} raised, and three bars for the fibres through the highlighted cell.`;
    }
  };
  const ES = {
    k: "El tensor de taxis · sección 10",
    h: "Un tensor de orden 3 es un cubo de números, direccionado por tres índices",
    concept: 'Un tensor de orden 3 es un cubo de números T[i, j, k]: fija un índice y queda una matriz, fija dos y queda un vector, una fibra a través del cubo. <span class="cite">Deep Learning §2.1</span>',
    claim: "T[i, j, k] ∈ ℝ⁴ˣ⁵ˣ²⁴,  480 conteos",
    predict: "Antes de deslizar: ¿cambia la hora más ocupada si miras otro barrio de origen y destino, o es la misma en todas partes?",
    b: "<p>Cada entrada es un conteo real de viajes: cuántos viajes fueron de un barrio a otro en una hora del día, entre 6.383 viajes reales de taxis de Nueva York. El escenario muestra una hora como una cuadrícula de 4 por 5, y la pila detrás es las 24 horas, con la elegida elevada.</p><p>Arrastra <b>origen</b> y <b>destino</b> para mover la celda resaltada; las tres barras son las fibras que pasan por ella: cada hora para esta ruta, cada destino para este origen a esta hora, y cada origen para este destino a esta hora.</p>",
    controls: {hour: "Hora", pickup: "Barrio de origen", dropoff: "Barrio de destino"},
    axHours: "24 horas",
    axFibreHour: "T[i,:,k] por hora",
    axFibreDropoff: "T[i,j,:] por destino",
    axFibrePickup: "T[:,j,k] por origen",
    readout: (ctx, T, names, h, i, j, cell, busiest) =>
      `En <b>${names.pickup[i]} → ${names.dropoff[j]}</b>, hora <b>${h}</b>: <b>${cell}</b> viajes. ` +
      (h === busiest
        ? `La hora ${h} es la más ocupada en total, sumando todas las rutas.`
        : `La hora más ocupada en total, sumando todas las rutas, es la <b>${busiest}</b>.`),
    aria: (ctx) => {
      const s = ctx.state, names = ctx.names;
      return `Una cuadrícula de 4 por 5 de conteos de viajes de taxi para la hora ${s.hour}, con origen ${names.pickup[s.pickup]} y destino ${names.dropoff[s.dropoff]} resaltados, una pila de 24 cuadrículas detrás con la hora ${s.hour} elevada, y tres barras para las fibras que pasan por la celda resaltada.`;
    }
  };

  window.FactorScenes.register({
    id: "tensor", section: "10",
    copy: {en: EN, es: ES},

    controls: [
      {id: "hour", type: "range", min: 0, max: 23, step: 1, fmt: (v) => String(v)},
      {id: "pickup", type: "range", min: 0, max: 3, step: 1, fmt: (v, ctx) => ctx.names.pickup[v]},
      {id: "dropoff", type: "range", min: 0, max: 4, step: 1, fmt: (v, ctx) => ctx.names.dropoff[v]}
    ],

    init(ctx) {
      ctx.state.hour = 18;
      ctx.state.pickup = 2;
      ctx.state.dropoff = 2;
    },

    draw(ctx) {
      const T = ctx.taxi, s = ctx.state;
      const svg = ctx.svg;
      const grid = sliceHour(T, s.hour);
      // Room on the left for the longest row label ("Manhattan" or "Staten
      // Island"), on top for the column labels, which are abbreviated --
      // five borough names at full length do not fit five 44px columns.
      const g = K.numGrid(svg, grid, {
        x: 130, y: 70, digits: 0, cellW: 44,
        at: (i, j) => (i === s.pickup && j === s.dropoff ? "--fa-t" : null),
        title: null
      });
      ctx.names.pickup.forEach((name, i) => {
        K.label(svg, g.x0 - 10, g.y0 + i * g.cellH + g.cellH / 2, name,
          {anchor: "end", baseline: "middle", size: 10.5});
      });
      ctx.names.dropoff.forEach((name, j) => {
        K.label(svg, g.x0 + j * g.cellW + g.cellW / 2, g.y0 - 14, name.slice(0, 4),
          {anchor: "middle", size: 10.5});
      });
      // The stack of 24 hours, one raised.
      K.slabStack(svg, T.shape[2], s.hour, {x: g.x1 + 80, y: g.y1 - 10, w: 90, h: 40});
      K.label(svg, g.x1 + 80, g.y1 + 30, ctx.copy.axHours, {anchor: "start", size: 10.5, colour: "--stage-mute"});

      // The three fibres through the selected cell.
      const fh = FC.fibre(T, 2, s.pickup, s.dropoff);
      const fj = FC.fibre(T, 1, s.pickup, s.hour);
      const fi = FC.fibre(T, 0, s.dropoff, s.hour);
      K.bars(svg, fh, {x: 40, y: g.y1 + 60, w: 260, h: 55, at: (k) => (k === s.hour ? "--fa-t" : "--fa-fac"), lit: (k) => k === s.hour});
      K.label(svg, 40, g.y1 + 48, ctx.copy.axFibreHour, {size: 10.5, colour: "--stage-mute"});
      K.bars(svg, fj, {x: 330, y: g.y1 + 60, w: 130, h: 55, at: (j) => (j === s.dropoff ? "--fa-t" : "--fa-r"), lit: (j) => j === s.dropoff});
      K.label(svg, 330, g.y1 + 48, ctx.copy.axFibreDropoff, {size: 10.5, colour: "--stage-mute"});
      K.bars(svg, fi, {x: 490, y: g.y1 + 60, w: 110, h: 55, at: (i) => (i === s.pickup ? "--fa-t" : "--fa-core"), lit: (i) => i === s.pickup});
      K.label(svg, 490, g.y1 + 48, ctx.copy.axFibrePickup, {size: 10.5, colour: "--stage-mute"});
    },

    readout(ctx) {
      const T = ctx.taxi, s = ctx.state, names = ctx.names;
      const cell = FC.at(T, s.pickup, s.dropoff, s.hour);
      const busiest = busiestHour(T);
      const c = ctx.copy;
      const slice = sliceHour(T, s.hour);
      const nonzero = slice.reduce((a, row) => a + row.filter((v) => v > 0).length, 0);
      return {
        html: c.readout(ctx, T, names, s.hour, s.pickup, s.dropoff, cell, busiest),
        data: {
          standin: ctx.standIn ? "1" : "0",
          shape: T.shape.join(","), order: T.shape.length, entries: T.data.length,
          trips: Math.round(T.data.reduce((a, v) => a + v, 0)),
          cell: Math.round(cell), busiest, hour: s.hour, nonzero
        }
      };
    }
  });
})();
