// Step 8: a fixed-scale close-up of float32 rounding near (1/√2, 1/√2).
// Each square is one rounding cell; hollow circles are true values and
// filled squares are the values actually stored. No perspective auto-zoom.
(function () {
  "use strict";
  const LC = window.LinalgCore, K = window.LinalgKit;
  const Y = [0.9, 0.8, 1.3];
  const TH_MAX = 1e-5, TH_MIN = 1e-6;
  const thetaOf = v => TH_MAX * Math.pow(TH_MIN / TH_MAX, v / 100);
  const ULP = LC.ulp32(Math.SQRT1_2);
  const shownTheta = ctx => thetaOf(LC.tweenAt(ctx.state.vtw, ctx.now()).value);
  function solve(theta) {
    const b = LC.basisAtAngle(theta);
    const r1 = LC.f32(b.x1), r2 = LC.f32(b.x2);
    const X32 = r1.map((v, i) => [v, r2[i]]);
    const Xt = LC.transpose(X32);
    const G = LC.mul(Xt, X32);
    const S = LC.svd(X32).S;
    const same = r1.every((v, i) => v === r2[i]);
    // In the local frame: ulps from the rounded tip of x_1.
    const loc = (p) => LC.scale(LC.sub(p, r1), 1 / ULP);
    return {
      b: b, r1: r1, r2: r2, same: same,
      sigma: S, kappa32: LC.cond(X32), kappa64: LC.cond(b.X),
      detG: G[0][0] * G[1][1] - G[0][1] * G[1][0],
      betaNaive: LC.cramer2(G, LC.mulVec(Xt, Y)),
      betaQR: LC.lstsqQR(X32, Y), rank: LC.rank(X32),
      apart: LC.norm(LC.sub(b.x2, b.x1)) / ULP,      // true distance, in ulps
      stored: LC.norm(LC.sub(r2, r1)) / ULP,         // stored distance, in ulps
      loc: loc, t1: loc(r1), t2: loc(r2), d1: loc(b.x1), d2: loc(b.x2),
      dir1: LC.scale(b.x1, 1 / LC.norm(b.x1)), dir2: LC.scale(b.x2, 1 / LC.norm(b.x2))
    };
  }
  const fmtTh = th => th.toExponential(2) + '°';
  const EN = {
    k: 'Rounding · section 09', h: 'Two columns that differ only past the seventh digit are stored as one column',
    claim: 'Distinct inputs → identical stored columns',
    concept: 'A computer represents real numbers with a finite number of bits, so every value is <b>rounded</b> to the nearest one the format can store. Two columns whose difference is smaller than that spacing are stored as the same column: the stored matrix is exactly dependent, its rank drops, and nothing computed afterwards can tell the two apart. <span class="cite">Deep Learning §4.1</span>',
    predict: 'Before you slide: a float32 keeps about 7 digits, so near 0.7 it can only store values 6 × 10⁻⁸ apart, and the two tips start about 3 of those units apart. How far must the angle close before both columns are stored as the same numbers, and does float64 give up at the same angle?',
    b: '<p>The previous picture closed the angle to 0.5° and the fit was still exact, only unstable. This one closes it another ten-thousand-fold, to a millionth of a degree, and a different failure arrives: the computer can no longer write the two columns down as different numbers. A <b>float32</b>, the default in most deep-learning code, keeps about 7 significant digits. Near 0.7 the values it can store are 6 × 10⁻⁸ apart, and every true value is rounded to the nearest one; that spacing is one <b>ulp</b>, a unit in the last place. A float64 keeps about 16 digits, so its spacing is 5 × 10⁸ times finer.</p><p>On the stage: the tips of x₁ and x₂ magnified until one grid cell is one ulp, showing the first and third coordinates (the middle one is 0). <b>Hollow circles</b> are the true tips, <b>filled squares</b> are what float32 actually stores, at the centre of each cell, and the connector is the rounding. Close the angle until both circles fall into one cell. The two stored columns are then identical, bit for bit: the stored matrix has rank 1, its second singular value is exactly 0, κ is infinite, and XᵀX has no inverse, so the normal equations divide by zero. At the same angle float64 still stores two different columns, with κ near 10⁸: still terrible, but not gone. Ill-conditioning belongs to the problem; whether it turns into lost rank belongs to the number format.</p>',
    controls: {angle7: 'Close the angle · 10⁻⁵° → 10⁻⁶°'},
    buttons: {distinct: 'Separate stored values', merged: 'Same stored value'},
    fmt: v => `θ = ${fmtTh(thetaOf(v))}`,
    note: '○ True position · ■ stored float32 value · connectors show rounding',
    aria: 'A grid of rounding cells in a close-up of the first and third coordinates. Hollow green and yellow circles mark the true columns; filled squares mark their float32 copies. Connectors show rounding. When both circles enter one cell, their stored squares coincide and turn pink.',
    scale: 'Fixed scale: 1 grid spacing = 1 ulp ≈ 5.96 × 10⁻⁸. Middle coordinate = 0.',
    stored: 'Stored', trueGap: 'True separation', storedGap: 'Stored separation',
    fault: 'Identical stored columns → rank 1\nσ₂ = 0 · κ = ∞ · no inverse of XᵀX',
    readout: (th,s) => `At θ = ${fmtTh(th)}, the true tips are <b>${s.apart.toFixed(3)} ulp</b> apart and the stored tips <b>${s.stored.toFixed(3)} ulp</b> apart. ` + (s.same
      ? `Both stored columns are <code>[${s.r1.map(v=>v.toFixed(8)).join(', ')}]</code>: the stored matrix has rank ${s.rank}, σ₂ = 0 and κ = ∞, and the normal-equation inverse does not exist. A least-squares solver built on the SVD still returns a minimum-norm answer for this rank-1 matrix; what it cannot do is recover the distinction the rounding threw away.`
      : `The stored columns are still distinct (rank ${s.rank}), with κ(float32) = ${s.kappa32.toExponential(2)}: already very sensitive. Keep closing the angle and watch the squares merge.`) + ` Float64 still sees two columns, with κ = ${s.kappa64.toExponential(2)}.`
  };
  const ES = {
    k: 'Redondeo · sección 09', h: 'Dos columnas que solo difieren más allá del séptimo dígito se guardan como una sola',
    claim: 'Entradas distintas → columnas guardadas idénticas',
    concept: 'Un ordenador representa los números reales con un número finito de bits, así que cada valor se <b>redondea</b> al más cercano que el formato puede guardar. Dos columnas cuya diferencia es menor que esa separación se guardan como la misma columna: la matriz guardada es exactamente dependiente, su rango baja, y nada de lo que se calcule después puede distinguirlas. <span class="cite">Deep Learning §4.1</span>',
    predict: 'Antes de deslizar: un float32 conserva unos 7 dígitos, así que cerca de 0.7 solo puede guardar valores separados 6 × 10⁻⁸, y las dos puntas empiezan a unas 3 de esas unidades. ¿Cuánto tiene que cerrarse el ángulo para que las dos columnas se guarden con los mismos números? ¿Y float64 se rinde con el mismo ángulo?',
    b: '<p>La imagen anterior cerró el ángulo hasta 0.5° y el ajuste seguía siendo exacto, solo inestable. Esta lo cierra otras diez mil veces, hasta una millonésima de grado, y llega un fallo distinto: el ordenador ya no puede escribir las dos columnas como números distintos. Un <b>float32</b>, el formato por defecto en casi todo el código de aprendizaje profundo, conserva unos 7 dígitos significativos. Cerca de 0.7 los valores que puede guardar están a 6 × 10⁻⁸ unos de otros, y cada valor verdadero se redondea al más cercano; esa separación es un <b>ulp</b>, una unidad en el último lugar. Un float64 conserva unos 16 dígitos, así que su separación es 5 × 10⁸ veces más fina.</p><p>En el escenario: las puntas de x₁ y x₂ ampliadas hasta que una celda de la cuadrícula es un ulp, mostrando la primera y la tercera coordenada (la central es 0). Los <b>círculos huecos</b> son las puntas verdaderas, los <b>cuadrados rellenos</b> son lo que float32 guarda de verdad, en el centro de cada celda, y el conector es el redondeo. Cierra el ángulo hasta que los dos círculos caigan en una misma celda. Las dos columnas guardadas son entonces idénticas, bit a bit: la matriz guardada tiene rango 1, su segundo valor singular es exactamente 0, κ es infinito, y XᵀX no tiene inversa, así que las ecuaciones normales dividen por cero. Con el mismo ángulo float64 todavía guarda dos columnas distintas, con κ cerca de 10⁸: sigue siendo terrible, pero no ha desaparecido. El mal condicionamiento pertenece al problema; que se convierta en pérdida de rango pertenece al formato numérico.</p>',
    controls: {angle7: 'Cierra el ángulo · 10⁻⁵° → 10⁻⁶°'},
    buttons: {distinct: 'Valores guardados distintos', merged: 'Mismo valor guardado'},
    fmt: EN.fmt, note: '○ Posición verdadera · ■ valor float32 · conectores de redondeo',
    aria: 'Una cuadrícula de celdas de redondeo muestra la primera y la tercera coordenada. Los círculos huecos verde y amarillo marcan las columnas verdaderas; los cuadrados rellenos marcan sus copias float32. Los conectores muestran el redondeo. Cuando ambos círculos entran en la misma celda, sus cuadrados coinciden y se vuelven rosas.',
    scale: 'Escala fija: 1 paso = 1 ulp ≈ 5.96 × 10⁻⁸. Coordenada central = 0.',
    stored: 'Guardado', trueGap: 'Separación verdadera', storedGap: 'Separación guardada',
    fault: 'Columnas guardadas idénticas → rango 1\nσ₂ = 0 · κ = ∞ · XᵀX no tiene inversa',
    readout: (th,s) => `Con θ = ${fmtTh(th)}, las puntas verdaderas están a <b>${s.apart.toFixed(3)} ulp</b> y las guardadas a <b>${s.stored.toFixed(3)} ulp</b>. ` + (s.same
      ? `Ambas columnas guardadas son <code>[${s.r1.map(v=>v.toFixed(8)).join(', ')}]</code>: la matriz guardada tiene rango ${s.rank}, σ₂ = 0 y κ = ∞, y la inversa de las ecuaciones normales no existe. Un solucionador de mínimos cuadrados basado en la SVD aún devuelve una respuesta de norma mínima para esta matriz de rango 1; lo que no puede hacer es recuperar la distinción que el redondeo tiró.`
      : `Las columnas guardadas siguen siendo distintas (rango ${s.rank}), con κ(float32) = ${s.kappa32.toExponential(2)}: ya muy sensible. Sigue cerrando el ángulo y observa cómo se unen los cuadrados.`) + ` Float64 todavía ve dos columnas, con κ = ${s.kappa64.toExponential(2)}.`
  };
  const xy = p => [p[0], p[2], 0];
  const cell = p => [[p[0]-.5,p[1]-.5,-.02],[p[0]+.5,p[1]-.5,-.02],[p[0]+.5,p[1]+.5,-.02],[p[0]-.5,p[1]+.5,-.02]];
  const GRID = [];
  for (let i=-3.5; i<=3.5; i++) GRID.push([[i,-3.5,0],[i,3.5,0]],[[-3.5,i,0],[3.5,i,0]]);
  window.LinalgScenes.register({
    id:'precision', step:'8', section:'step-8', copy:{en:EN,es:ES},
    pose:{target:[0,0.3,0],content:4.8,fov:40,home:LC.orbitView(0,0),
      limits:{azMin:-0.45,azMax:0.45,elMin:-0.45,elMax:0.45}},
    init(ctx) {
      const s=ctx.state; s.theta=TH_MAX; s.vtw=LC.tweenStart(0,0,0,0);
      ctx.bindSlider('angle7',{token:'--v-y',format:ctx.T.fmt,lit:()=>ctx.gl && ctx.gl.links[1],
        onInput(v) {s.theta=thetaOf(v);s.vtw=LC.retarget(s.vtw,v,ctx.now(),ctx.instant?0:1000);}});
      for(const [id,v] of [['distinct',0],['merged',100]]) ctx.$(id).addEventListener('click',()=>{
        ctx.$('angle7').value=String(v);ctx.$('angle7').dispatchEvent(new Event('input',{bubbles:true}));
      });
    },
    build(ctx) {
      const T=ctx.THREE, scene=new T.Scene(); K.light(scene);
      const grid=K.makeTubes(GRID,'--stage-mute',0.009); scene.add(grid);
      for(let x=-3;x<=3;x++) for(let y=-3;y<=3;y++) {
        const dot=new T.Mesh(new T.CircleGeometry(0.025,10),new T.MeshBasicMaterial({color:K.colour('--stage-mute')}));dot.position.set(x,y,.01);scene.add(dot);
      }
      const trueDots=[], stored=[], links=[], cells=[];
      for(const token of ['--v-basis','--v-y']) {
        const mat=new T.MeshBasicMaterial({color:K.colour(token),side:T.DoubleSide});
        const ring=new T.Mesh(new T.RingGeometry(.075,.115,24),mat);
        const square=new T.Mesh(new T.PlaneGeometry(.16,.16),mat.clone());
        const link=K.makeTube([0,0,0],[1,0,0],token,.027);
        const region=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({color:K.colour(token),transparent:true,opacity:.13,depthWrite:false,side:T.DoubleSide}));
        scene.add(ring,square,link,region);trueDots.push(ring);stored.push(square);links.push(link);cells.push(region);
      }
      const labels=[K.makeLabel('x₁','--v-basis'),K.makeLabel('x₂','--v-y')];scene.add(...labels);
      const cam=new T.PerspectiveCamera(40,1,.05,300);
      ctx.gl={scene,cam,trueDots,stored,links,cells,labels,composer:true};return ctx.gl;
    },
    render(ctx,gl) {
      const sol=solve(shownTheta(ctx)*Math.PI/180);
      [sol.d1,sol.d2].forEach((p,i)=>{
        const a=xy(p),b=xy(i?sol.t2:sol.t1);
        gl.trueDots[i].position.set(a[0],a[1],.08);
        gl.stored[i].position.set(b[0],b[1],.1);
        gl.cells[i].position.set(b[0],b[1],-.03);
        K.setTube(gl.links[i],[a[0],a[1],.03],[b[0],b[1],.03]);
        gl.labels[i].position.set(a[0]+(i?-.6:.6),a[1]+(i?.55:-.55),.1);
        gl.stored[i].material.color.copy(K.colour(sol.same?'--v-res':i?'--v-y':'--v-basis'));
      });
    },
    flat(ctx) {
      const sol=solve(ctx.state.theta*Math.PI/180);
      const P=p=>K.iso(p,55/ctx.shownView().dolly,400,255,ctx.viewBasis());
      const flat=ctx.flat;
      [sol.t1,sol.t2].forEach((p,i)=>flat.appendChild(K.poly2(cell(xy(p)).map(P),i?'--v-y':'--v-basis',{fill:i?'--v-y':'--v-basis',fillOpacity:.13,opacity:0})));
      flat.appendChild(K.lines2(P,GRID,'--stage-mute',1.2));
      for(let x=-3;x<=3;x++) for(let y=-3;y<=3;y++) {const q=P([x,y,0]);flat.appendChild(K.el('circle',{cx:q[0],cy:q[1],r:1.5,fill:K.css('--stage-mute')}));}
      const labels=[];
      [sol.d1,sol.d2].forEach((p,i)=>{
        const a=xy(p),b=xy(i?sol.t2:sol.t1),q=P(a),r=P(b),token=i?'--v-y':'--v-basis';
        flat.appendChild(K.line2(q,r,token,3));
        flat.appendChild(K.el('circle',{cx:q[0],cy:q[1],r:6,fill:K.css('--stage'),'stroke':K.css(token),'stroke-width':2.5}));
        flat.appendChild(K.el('rect',{x:r[0]-4.5,y:r[1]-4.5,width:9,height:9,fill:K.css(sol.same?'--v-res':token)}));
        labels.push({at:P([a[0]+(i?-.6:.6),a[1]+(i?.55:-.55),0]),text:i?'x₂':'x₁',colour:token});
      });
      ctx.place(labels);
    },
    readout(ctx) {
      const th=ctx.state.theta,sol=solve(th*Math.PI/180);
      return {html:ctx.T.readout(th,sol),note:ctx.T.note,fault:sol.same?ctx.T.fault:null,
        comparison:`<div>${ctx.T.scale}</div><div>${ctx.T.trueGap}: ${sol.apart.toFixed(3)} ulp → ${ctx.T.storedGap}: ${sol.stored.toFixed(3)} ulp</div>`,
        data:{f32:sol.same?'collapsed':'distinct',kappa:isFinite(sol.kappa32)?sol.kappa32.toExponential(2):'Infinity',theta:th.toExponential(2)}};
    }
  });
})();
