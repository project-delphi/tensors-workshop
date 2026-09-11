---
title: "Comprobaciones inicial y final"
lang: es
---

[English](../assessments.md) · [Guía de facilitación](facilitator-guide.md) · [Enseñar este taller](teach.qmd)

Responde individualmente, con frases cortas. No necesitas código.
Las preguntas también están en los cuadernos 00 y 12.

## Entrada · 3 minutos

<span data-language-key="entry-3-minutes"></span>

`X.shape == (20, 8, 8)`.

1. Da dos interpretaciones de sus ejes.
2. Predice `X[:, 3, 4].shape`. Nombra el eje restante en cada interpretación.
3. ¿Qué evidencia distinguiría imágenes independientes de fotogramas de video?

## Salida · 5 minutos

<span data-language-key="exit-5-minutes"></span>

`X.shape == (6, 4, 3, 8, 8)`: plantas, visitas, canales, filas, columnas.

Dedica unos tres minutos a 1–3 y dos minutos a 4.

1. Predice `X[:, -1, 1].shape`. Nombra sus ejes.
2. Predice `X.mean(axis=1).shape`. Nombra sus ejes.
3. ¿Qué podría ocultar promediar visitas? Propón una prueba de esa pérdida.
4. Un modelo de Tucker comprime el modo de visitas de longitud 4 a rango 2.
   Tras reconstruir, ¿el eje de visitas tiene longitud 2 o 4? Explica por qué
   recuperar la forma no garantiza conservar cada señal breve de enfermedad.

<details>
<summary>Clave y rúbrica · revelar después de recoger respuestas</summary>

Entrada: `(imágenes, filas, columnas)` o `(tiempo, filas, columnas)` son válidas.
La selección tiene forma `(20,)`: un píxel a través de imágenes o del tiempo.
Los registros de adquisición, marcas de tiempo e identificadores establecen
el significado; la forma por sí sola no basta.

Salida: la selección tiene forma `(6, 8, 8)`: plantas, filas, columnas; última
visita y canal 1. La media tiene forma `(6, 3, 8, 8)`: plantas, canales, filas,
columnas. Promediar puede ocultar una señal breve de enfermedad o una tendencia.
Compara la secuencia con su promedio usando un evento conocido o una prueba de
detección. También valen otras pruebas concretas y justificadas.

Transferencia (pregunta 4): el eje de visitas reconstruido tiene longitud **4**.
El factor de visitas tiene forma `(4, 2)` y expande el modo de longitud 2 del
núcleo a cuatro visitas. La compresión puede descartar variación fuera del
subespacio retenido, incluida una señal breve de enfermedad. Recuperar la forma
no recupera todos los valores.

Puntúa cada dimensión: **0** (ausente/incorrecta), **1** (parcial) o **2**
(correcta y explicada). Puntúa las tres dimensiones siguientes por separado
en entrada y salida, cada una sobre 6. Registra la pregunta 4 como una puntuación
de transferencia aparte, sobre 2; no tiene equivalente en la entrada.

| Dimensión | Evidencia de entrada | Evidencia de salida |
|---|---|---|
| Significado | Dos interpretaciones con todos los ejes | Ejes restantes de ambos resultados |
| Forma | Forma de la selección y explicación | Ambas formas de salida y explicación |
| Evidencia | Metadatos que distinguen lote de tiempo | Una pérdida concreta y una prueba que la detecte |

Si significado o forma recibe 0–1, repasa el corte del cuaderno 01.
Si evidencia recibe 0–1, usa la actividad grupal 02.

En transferencia, asigna **0** si la longitud es incorrecta o falta, **1** si
responde 4 con una explicación incompleta, y **2** si responde 4 y explica tanto
la expansión mediante el factor como la posible pérdida de señal. Con 0–1,
repasa las formas del núcleo y los factores en el cuaderno 10. Si las cuatro
dimensiones reciben 2, asigna una tarea según sus intereses.
La diferencia de puntuaciones no mide el impacto causal del taller.

</details>
