// Scene 2: each token becomes an integer, its row number in a fixed
// vocabulary. The integer is a name, not a quantity: id 4 is not "more"
// than id 1, and nothing downstream ever adds two ids. The repeated "know"
// becomes the repeated id 1, which is IDS = [3, 1, 4, 1] exactly.
(function () {
  "use strict";

  function draw(ctx) {
    const K = ctx.K, svg = ctx.svg, s = ctx.state, AC = ctx.AC;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const root = K.el("g", {transform: "translate(0,44)"});
    svg.appendChild(root);
    const tokens = AC.tokenize(AC.SENTENCE, "words");
    const ids = AC.encode(tokens, AC.VOCAB);
    const lit = ctx.colour("--at-w"), mute = ctx.colour("--stage-mute");
    const active = ids[s.token];

    const words = K.chips({
      x: 90, y: 20, w: 100, h: 40, gap: 20, items: tokens,
      mark: (i) => i === s.token, colourOf: () => lit
    });
    root.appendChild(words.g);

    // Row names down the left margin, clear of the arrows that cross the
    // middle of the picture.
    root.appendChild(K.text(20, 40, "tokens", {size: 12, anchor: "start", fill: mute}));
    root.appendChild(K.text(20, 155, "vocab", {size: 12, anchor: "start", fill: mute}));
    const vocab = K.chips({
      x: 60, y: 136, w: 80, h: 38, gap: 8, items: AC.VOCAB, index: false, size: 14,
      mark: (i) => i === active, colourOf: () => lit
    });
    root.appendChild(vocab.g);
    AC.VOCAB.forEach((_, i) => {
      root.appendChild(K.text(vocab.centres[i].x, 188, "id " + i,
        {size: 11, fill: i === active ? lit : mute}));
    });

    root.appendChild(K.text(20, 270, "ids", {size: 12, anchor: "start", fill: mute}));
    const out = K.chips({
      x: 90, y: 250, w: 100, h: 40, gap: 20, items: ids.map(String),
      mark: (i) => ids[i] === active, colourOf: () => lit
    });
    root.appendChild(out.g);

    tokens.forEach((_, i) => {
      const on = i === s.token;
      const opts = {colour: on ? lit : mute, width: on ? 2 : 1, dash: on ? "" : "3,3",
                    opacity: on ? 0.95 : 0.5};
      const v = vocab.centres[ids[i]];
      root.appendChild(K.arrow(words.centres[i].x, 62, v.x, 134, opts));
      root.appendChild(K.arrow(v.x, 198, out.centres[i].x, 248, opts));
    });
  }

  window.AttentionScenes.register({
    id: "ids",
    section: "B",

    controls: [
      {id: "token", type: "range", min: 0, max: 3, step: 1, fmt: (v) => String(v)}
    ],

    init(ctx) { Object.assign(ctx.state, {token: 1}); },
    draw,

    readout(ctx) {
      const AC = ctx.AC, s = ctx.state;
      const tokens = AC.tokenize(AC.SENTENCE, "words");
      const ids = AC.encode(tokens, AC.VOCAB);
      const also = ids.map((v, i) => i).filter((i) => i !== s.token && ids[i] === ids[s.token]);
      return {
        html: ctx.copy.readout(s.token, tokens[s.token], ids[s.token], also),
        data: {ids: ids.join(","), vocab: AC.VOCAB.length, token: s.token, id: ids[s.token],
               shape: String(ids.length)}
      };
    },

    code(ctx) {
      const AC = ctx.AC, s = ctx.state, c = ctx.copy.np;
      const ids = AC.encode(AC.tokenize(AC.SENTENCE, "words"), AC.VOCAB);
      return ctx.K.code([
        "vocab = {" + AC.VOCAB.map((w, i) => '"' + w + '": ' + i).join(", ") + "}",
        "token_ids = np.array([vocab[w] for w in tokens])",
        ["token_ids", "[" + ids.join(" ") + "]"],
        ["token_ids[" + s.token + "]", c.id(ids[s.token])]
      ]);
    },

    copy: {
      en: {
        tab: "Ids",
        k: "Coding the tokens · Appendix B",
        h: "Every token becomes an integer: its row in a vocabulary",
        claim: "token_ids = [3, 1, 4, 1]",
        concept: "A vocabulary is a fixed list of every token the model knows, and a token's id is " +
                 "just its position in that list. The id is a <em>name</em>, not a quantity: " +
                 "“you” is 4 and “know” is 1, but nothing about “you” is four times " +
                 "“know”, and no later step ever adds or averages two ids. Its one job is to " +
                 "say which row of a table to fetch next.",
        b: "<p>Move the token slider. Each word looks itself up in the six-word vocabulary and " +
           "comes out as that entry's id. Both copies of “know” land on id 1, so the " +
           "sentence becomes [3, 1, 4, 1]. A real vocabulary holds tens of thousands of entries, " +
           "but the lookup is the same.</p>",
        predict: "Could you do arithmetic on these ids, say average “I” (3) and “you” (4) " +
                 "to get 3.5? What would it mean?",
        controls: {token: "Token (position)"},
        np: {id: (id) => "= " + id + ", a row number, not an amount"},
        readout: (i, word, id, also) =>
          "Position " + i + ", “" + word + "”, is entry <b>" + id + "</b> of the vocabulary" +
          (also.length ? ", the same id as position " + also.join(", ") + "." : "."),
        aria: (ctx) => "Four word boxes with arrows into a six-entry vocabulary, and from there " +
                        "into the four token ids 3, 1, 4, 1; position " + ctx.state.token + " is lit."
      },
      es: {
        tab: "Ids",
        k: "Codificar los tokens · Apéndice B",
        h: "Cada token se convierte en un entero: su fila en un vocabulario",
        claim: "token_ids = [3, 1, 4, 1]",
        concept: "Un vocabulario es una lista fija de todos los tokens que conoce el modelo, y el " +
                 "id de un token es solo su posición en esa lista. El id es un <em>nombre</em>, no " +
                 "una cantidad: “you” es 4 y “know” es 1, pero nada de “you” es cuatro " +
                 "veces “know”, y ningún paso posterior suma ni promedia dos ids. Su único " +
                 "trabajo es decir qué fila de una tabla hay que buscar después.",
        b: "<p>Mueve el deslizador de token. Cada palabra se busca en el vocabulario de seis " +
           "palabras y sale como el id de esa entrada. Las dos copias de “know” caen en el " +
           "id 1, así que la frase se convierte en [3, 1, 4, 1]. Un vocabulario real tiene " +
           "decenas de miles de entradas, pero la búsqueda es la misma.</p>",
        predict: "¿Podrías hacer aritmética con estos ids, por ejemplo promediar “I” (3) y " +
                 "“you” (4) para obtener 3.5? ¿Qué significaría?",
        controls: {token: "Token (posición)"},
        np: {id: (id) => "= " + id + ", un número de fila, no una cantidad"},
        readout: (i, word, id, also) =>
          "La posición " + i + ", “" + word + "”, es la entrada <b>" + id + "</b> del " +
          "vocabulario" + (also.length ? ", el mismo id que la posición " + also.join(", ") + "." : "."),
        aria: (ctx) => "Cuatro cajas de palabras con flechas hacia un vocabulario de seis entradas, " +
                        "y de ahí a los cuatro ids 3, 1, 4, 1; la posición " + ctx.state.token +
                        " está iluminada."
      }
    }
  });
})();
