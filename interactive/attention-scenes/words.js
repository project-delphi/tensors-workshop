// Scene 1: a model does not read a sentence, it reads a sequence -- and the
// tokenizer decides how long that sequence is. "I know you know" is four
// words or fifteen characters; S is a consequence of the split, not a fact
// about the sentence. The rest of the stage uses the word split.
(function () {
  "use strict";

  const shown = (t) => (t === " " ? "␣" : t);

  function draw(ctx) {
    const K = ctx.K, svg = ctx.svg, s = ctx.state, AC = ctx.AC;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const root = K.el("g", {transform: "translate(0,44)"});
    svg.appendChild(root);
    const tokens = AC.tokenize(AC.SENTENCE, s.split);
    const words = s.split === "words";
    const lit = ctx.colour("--at-w");

    root.appendChild(K.text(320, 34, "“" + AC.SENTENCE + "”",
      {size: 26, fill: ctx.colour("--stage-ink"), mono: false}));
    root.appendChild(K.arrow(320, 60, 320, 112, {colour: ctx.colour("--stage-mute")}));
    root.appendChild(K.text(332, 86, words ? "sentence.split()" : "list(sentence)",
      {size: 12, anchor: "start", fill: ctx.colour("--stage-mute")}));

    const w = words ? 110 : 34, gap = words ? 16 : 4;
    const total = tokens.length * w + (tokens.length - 1) * gap;
    const row = K.chips({
      x: (640 - total) / 2, y: 128, w: w, h: 44, gap: gap,
      items: tokens.map(shown), size: words ? 17 : 14,
      // The same word twice is the same token twice: what the ids scene
      // turns into the same integer and the embed scene into the same row.
      mark: (i) => words && tokens[i] === "know", colourOf: () => lit
    });
    root.appendChild(row.g);

    root.appendChild(K.text(320, 236, "S = " + tokens.length,
      {size: 22, fill: ctx.colour("--at-w")}));
    root.appendChild(K.text(320, 270,
      words ? "4 tokens, one per word" : "15 tokens, one per character, spaces included",
      {size: 12, fill: ctx.colour("--stage-mute"), mono: false}));
  }

  window.AttentionScenes.register({
    id: "words",
    section: "B",
    part: {en: "From words to numbers", es: "De las palabras a los números"},

    controls: [{id: "split", type: "select", options: ["words", "chars"]}],

    init(ctx) { Object.assign(ctx.state, {split: "words"}); },
    draw,

    readout(ctx) {
      const AC = ctx.AC, s = ctx.state;
      const tokens = AC.tokenize(AC.SENTENCE, s.split);
      return {
        html: ctx.copy.readout(s.split, tokens.length),
        claim: "S = " + tokens.length + " tokens",
        data: {split: s.split, s: tokens.length, tokens: tokens.join("|")}
      };
    },

    shape(ctx) {
      return "[" + ctx.AC.tokenize(ctx.AC.SENTENCE, ctx.state.split).length + "]";
    },

    code(ctx) {
      const AC = ctx.AC, s = ctx.state, c = ctx.copy.np;
      const tokens = AC.tokenize(AC.SENTENCE, s.split);
      const list = s.split === "words"
        ? "tokens = sentence.split()" : "tokens = list(sentence)";
      return ctx.K.code([
        'sentence = "' + AC.SENTENCE + '"',
        [list, c.split(s.split)],
        ["len(tokens)", String(tokens.length)]
      ]);
    },

    copy: {
      en: {
        tab: "Words",
        k: "A sentence is a sequence · Appendix B",
        h: "A model reads a sequence of tokens, not a sentence",
        claim: "S = 4 tokens",
        concept: "Before any arithmetic, text has to become a list of pieces, called tokens. The " +
                 "rule that cuts it up is the tokenizer, and it is a choice: split on spaces and " +
                 "“I know you know” is four tokens, split into characters and it is fifteen. " +
                 "The sequence length S that every later picture is built around comes from that " +
                 "choice, not from the sentence.",
        b: "<p>Switch the split to characters. The sentence is the same, but the sequence is almost " +
           "four times longer, and so is every matrix after it. Attention compares every token " +
           "with every other, so its score matrix is S × S, which is 16 cells for words and 225 " +
           "for characters. Real models sit in between, splitting text into common word " +
           "pieces.</p>",
        predict: "“know” appears twice. After splitting into words, is it one token or two?",
        controls: {split: "Split into"},
        options: {split: {words: "words (split on spaces)", chars: "characters"}},
        np: {
          split: (m) => m === "words" ? "['I', 'know', 'you', 'know']" : "every character, ' ' too"
        },
        readout: (split, n) =>
          "S = <b>" + n + "</b>. " + (split === "words"
            ? "“know” is two tokens, at positions 1 and 3: the same word in two places."
            : "The same sentence, split finer, gives a sequence almost four times as long."),
        aria: (ctx) => "The sentence “" + ctx.AC.SENTENCE + "” split into " +
          ctx.AC.tokenize(ctx.AC.SENTENCE, ctx.state.split).length + " tokens, drawn as a row of boxes."
      },
      es: {
        tab: "Palabras",
        k: "Una frase es una secuencia · Apéndice B",
        h: "Un modelo lee una secuencia de tokens, no una frase",
        claim: "S = 4 tokens",
        concept: "Antes de cualquier aritmética, el texto tiene que convertirse en una lista de " +
                 "piezas, llamadas tokens. La regla que lo corta es el tokenizador, y es una " +
                 "elección: si se corta por espacios, “I know you know” son cuatro tokens, y " +
                 "si se corta en caracteres, quince. La longitud de secuencia S sobre la que se " +
                 "construye cada imagen posterior sale de esa elección, no de la frase.",
        b: "<p>Cambia el corte a caracteres. La frase es la misma, pero la secuencia es casi " +
           "cuatro veces más larga, y también cada matriz que viene después. La atención compara " +
           "cada token con todos los demás, así que su matriz de puntuaciones es S × S: 16 celdas " +
           "con palabras y 225 con caracteres. Los modelos reales quedan en medio, cortando el " +
           "texto en fragmentos de palabra frecuentes.</p>",
        predict: "“know” aparece dos veces. Al cortar en palabras, ¿es un token o dos?",
        controls: {split: "Cortar en"},
        options: {split: {words: "palabras (por espacios)", chars: "caracteres"}},
        np: {
          split: (m) => m === "words" ? "['I', 'know', 'you', 'know']" : "cada carácter, ' ' incluido"
        },
        readout: (split, n) =>
          "S = <b>" + n + "</b>. " + (split === "words"
            ? "“know” son dos tokens, en las posiciones 1 y 3: la misma palabra en dos sitios."
            : "La misma frase, cortada más fino, da una secuencia casi cuatro veces más larga."),
        aria: (ctx) => "La frase “" + ctx.AC.SENTENCE + "” cortada en " +
          ctx.AC.tokenize(ctx.AC.SENTENCE, ctx.state.split).length + " tokens, dibujados como una " +
          "fila de cajas."
      }
    }
  });
})();
