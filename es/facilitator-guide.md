---
title: "Guía de facilitación"
lang: es
---

[English](../facilitator-guide.md) · [Enseñar este taller](teach.qmd) · [Hoja del día](day-sheet.md)

Mantén la **agenda de 210 minutos**. Estas actividades sustituyen tiempo de
práctica o discusión; no alargan el taller. El cuaderno 13 queda para después.

## Antes del taller

<span data-language-key="before-the-session"></span>

- Ejecuta el cuaderno 00 antes de clase. Prueba cada cuaderno elegido en una sesión nueva.
- En los cuadernos 01–11, sigue el bloque esencial continuo de arriba abajo: recuerda, ejemplo, intento, retroalimentación, comprobación. Detente en **Fin de la ruta esencial**. Después sigue **Explora después**.
- Forma grupos de 3–4: relator, portavoz, crítico y, si hay una cuarta persona, programador.
- Ten una sesión funcionando para demostrar si falla una descarga.

Los encabezados **Practica hoy** y **Explora después** coinciden en cuadernos, diapositivas y manual. En el cuaderno 07, las identidades de Moore–Penrose y vivienda quedan para después; el ejemplo esencial solo necesita NumPy. En el 11, la comparación en vivo usa taxis, CP y Tucker; Tensor Train, t-SVD y la descarga de video son extensiones. Las discusiones grupales elegidas ya están dentro del bloque esencial; no las repitas desde otra página. Las comprobaciones sustituyen parte de explicar/comprobar dentro del tiempo indicado.

## Ritmo de trabajo

<span data-language-key="live-rhythm"></span>

**Predice → Ejecuta → Explica → Comprueba.** Pide una predicción escrita antes de
ejecutar. Después, un resultado y una explicación revisada. Rota los roles.
Abre las soluciones después de un intento. Ejecuta las celdas gráficas elegidas;
el código plegado también necesita ejecutarse.

Dedica unos 30 segundos a la pregunta inicial de recuperación dentro de cada
bloque. Después de cada pausa, en 05, 07 y 10, esa pregunta es la diapositiva
**¿Mito o hecho?** de la presentación, y dura un minuto: tres afirmaciones del
tramo anterior a la pausa, una votación a mano alzada en cada una, un
contraejemplo para un mito y la revelación. Los momentos de proyector también son de predicción primero: pregunta
a la sala qué va a pasar antes de pulsar nada, y recoge una respuesta antes de
revelar el resultado. Cada uno cabe dentro del tiempo de modelado del bloque,
así que sustituye la explicación en vez de sumarse a ella. Primero intentan
resolver; si se atascan, abren la Pista 1 y luego la Pista 2 solo si hace falta. Si hay una función de comprobación, ejecuten su
definición y llámenla con sus propios resultados antes de revelar la solución.
Superar las comprobaciones numéricas todavía exige explicar los ejes y el resultado.

## Guion

<span data-language-key="run-sheet"></span>

Sigue la [agenda del taller](tensors_workshop_plan_with_quizzes.md).
Conserva cuestionarios y pausas. Distribuye así cada bloque:

| Cuaderno | Uso del tiempo | En pantalla |
|---|---|---|
| 00 · 5 min | Apertura en frío 1½; diagnóstico inicial 3; comprobación técnica y bienvenida ½. La preparación era previa. | <a href="../interactive/voice-stage.html?lang=es#scramble">Una voz, transpuesta</a>: reprodúcela tal cual y luego transpuesta. Pregunta por qué los mismos números ahora suenan a ruido; no respondas todavía. Con sonido. |
| 01 · 20 min | Modelar una forma 4; Ejercicio 1 y revisión en pareja 16. | — |
| 02 · 20 min | Predicción inicial 2; clave de ejes y Ejercicio 2: 12; [actividad de significado de ejes](group-tasks.md#axis-meaning): 6. | — |
| 03 · 15 min | Modelar broadcasting 3; Ejercicio 3 y comprobación 11; comprobación individual de broadcasting 1. | <a href="../interactive/broadcasting-simulator.html?lang=es">Simulador de broadcasting</a>, dentro del modelado 3: la sala predice la forma del resultado y luego un desajuste que da error. |
| 04 · 15 min | Predicción inicial y el proyector 2; Ejercicio 1: 7; [caza del error](group-tasks.md#silent-bugs) 6: emparejar 2, prueba y puntuación 3, compartir 1. | <a href="../interactive/image-tensor.html?lang=es#reshape">Reshape de una foto</a>: el error de la apertura en frío, sobre una imagen. Nómbralo como ese error. |
| 05 · 15 min | Mito o hecho 1; predicción inicial 2, que es el paso de predicción del Ejercicio 1; Ejercicio 1: 4; actividad grupal 05: 8. | — |
| 06 · 15 min | Modelar una contracción 4; Ejercicio 1 y comprobación 10; comprobación individual de contracción 1. | — |
| 07 · 15 min | Mito o hecho 1; modelar columnas duplicadas 3; comparar coeficientes y normas 8; explicar qué sigue sin identificarse y comprobar 3. | <a href="../interactive/linalg-stage.html?lang=es#collinear">Columnas colineales</a>, dentro del modelado 3. |
| 08 · 10 min | Modelar una actualización 3; Ejercicio 1 y comprobación 7. | — |
| 09 · 15 min | Ejercicio 1: 9; error sobre residuos: 3; puente obligatorio de SVD a Tucker: 3. Sin barridos de tiempos. | — |
| 10 · 15 min | Mito o hecho 1; explicar núcleo y factores 3; [golf de compresión, hoyo 1](group-tasks.md#compression) en el explorador de rangos 8; clasificación y defensa del ganador 3. | <a href="../interactive/factor-stage.html?lang=es#tucker">Tucker en el tensor de taxis</a>, dentro de los últimos 3, después del golf: ponlo en los rangos ganadores, normalmente (3, 3, 1). Su único patrón horario tiene el pico en la hora 18, la que imprimió el cuaderno. Nunca antes del golf. |
| 11 · 15 min | Ejercicio 1 en parejas: 7; golf de compresión, hoyo 2: 5; clasificación y la escena 3. Sin barridos de modelos. | <a href="../interactive/factor-stage.html?lang=es#budget">Mismo presupuesto, CP y Tucker</a>, durante la clasificación: los dos hoyos en una sola imagen. No antes del ejercicio en parejas, al que daría la respuesta. |
| 12 · 5 min | Comprobación individual de salida. Asignar tareas después de recogerla. | Justo antes, en la diapositiva de "una sola idea": vuelve a reproducir la voz transpuesta 30 segundos y deja que la sala nombre el error. |

Busca las [actividades grupales](group-tasks.md) por número de cuaderno.
Usa las preguntas escritas; los exploradores opcionales no son requisitos.
Para la actividad 04, usa el ejemplo pequeño de [reshape](worked-mistakes.md) si hace falta.
Cada bloque incluye la puesta en común. Habla un grupo; los demás entregan:
**elección → evidencia → qué nos haría cambiar de opinión**.

Los tres juegos llevan puntuación. En la caza del error, ejecuta la celda de la
clave solo después de la ronda 2. En el golf, cada equipo publica una línea
(rangos · números · error) en el chat o la dice en voz alta; ordena la
clasificación por números almacenados y pregunta al equipo en cabeza cómo llegó
ahí. El par del hoyo 1 es Tucker (3, 3, 1), 60 números con un 4,69%; (2, 2, 1),
(3, 2, 1) y (2, 3, 1) fallan por menos de 0,15 puntos. El par del hoyo 2 es CP de
rango 6, 198 números con un 1,76%, frente a lo mejor de Tucker, (4, 4, 5) con
236. Pon los dos ganadores uno al lado del otro: Tucker gana con el 7% y CP gana
con el 2%, lo que responde a «¿qué modelo es mejor?» antes de que nadie lo
pregunte.

En el cuaderno 11, los ajustes CP y Tucker ya están en la celda TAREA; primero
predicen el almacenamiento y luego la ejecutan. Reserva los siete minutos en
pareja para revisar los rangos sugeridos, contar parámetros, calcular ambos errores
relativos e interpretar la diferencia; ejecuta las instalaciones durante la
preparación. Si el ajuste tarda mucho, demuestra la
solución incluida después del intento. Conserva los ocho minutos de golf. Anota tiempos reales de finalización y uso de pistas para comprobar
si esta distribución funciona con el grupo.

## Si vas con retraso

<span data-language-key="if-behind"></span>

Decide los recortes según el reloj, no sobre la marcha. En cada punto de
control, compara la hora con el inicio previsto y aplica el recorte de esa
fila. Los minutos cuentan desde el inicio de la sesión; antes de empezar,
anota al margen las horas reales. Ningún recorte toca la ruta esencial, los
puntos de control ni la respuesta a la pregunta de la sección; lo que se va es
la puesta en común, una segunda ronda o una votación.

| Comprueba en | Deberías empezar | Si llevas | Recorte, y lo que ahorra |
|---|---|---|---|
| +0:39 | actividad de significado de ejes de 02 | 5+ min de retraso | Un grupo informa y los demás omiten la puesta en común (−3). |
| +1:00 | 04 | 5+ min de retraso | Solo la ronda 1 de la caza del error: emparejar y ejecutar la clave; se omite la reescritura de la ronda 2 (−3). |
| +1:15 | Kahoot 1 | hasta 5 min de retraso | Hazlo. El Kahoot 2 pasa a ser el recorte previsto. |
| | | 6–10 min de retraso | Hazlo, y elimina ya el Kahoot 2, para no decidirlo en +2:15 (−5). |
| | | más de 10 min | Elimina también el Kahoot 1 (−5). Haz la pausa de todos modos. |
| +1:25 | 05 | 5+ min de retraso | Mito o hecho pasa a ser la pregunta de recuperación de 30 segundos (−½). Actividad 05: informa un grupo (−4). |
| +2:00 | 07 | 5+ min de retraso | Mito o hecho pasa a ser la pregunta de recuperación (−½). Elimina el Kahoot 2 si sigue en pie (−5). |
| +2:30 | 09 | 5+ min de retraso | Omite el error sobre residuos; conserva el puente de SVD a Tucker, que la sección 10 necesita (−3). |
| +2:50 | 10 | cualquiera | Si vas tarde, Mito o hecho pasa a ser la pregunta de recuperación (−½). **Conserva enteros el golf y la escena de Tucker.** |
| +3:10 | 11 | 5+ min de retraso | Hoyo 2 como demostración: muestra CP de rango 6 con 198 números frente a los 236 de Tucker, y luego la escena (−3). |
| | | más de 10 min | Ejercicio en parejas: tres minutos de intento y luego demuestra la solución incluida (−4). |
| +3:25 | 12 | cualquiera | Para donde estés y haz la comprobación final. |

**Nunca recortes:** las pausas, la sección 10, el Kahoot 3 ni la comprobación
final. La comprobación final es el único registro de lo que cambió la sesión,
y la siguiente edición se planifica a partir de ella. El Kahoot 3 comprueba si
Tucker caló mientras el resultado de los taxis sigue en pantalla.

En conjunto, estos recortes recuperan unos 30 minutos, que es más o menos lo
que se espera que se desvíe una primera edición: los Kahoot, Mito o hecho y
las rondas de golf suelen pasarse un minuto o dos cada uno. Anota qué recortes
hiciste y a qué hora; es la línea más útil del
[formulario de valoración](workshop-feedback.md).

## Comprobaciones inicial y final

<span data-language-key="entry-and-exit-checks"></span>

Usa las preguntas de los cuadernos 00 y 12. La [clave de evaluación](assessments.md)
incluye puntuación y próximos pasos. Recoge respuestas individuales.
Compara cada dimensión del razonamiento; no es una prueba de aprendizaje validada.
Mantén los cinco minutos de salida: tres para ejes y evidencia, dos para la
pregunta de transferencia sobre Tucker. Registra la transferencia aparte porque
no tiene equivalente inicial; úsala para planear el repaso del cuaderno 10.

Recoge las comprobaciones de un minuto de los cuadernos 03 y 06 antes de
revelar las respuestas. Usa las [claves de sección](assessments.md#in-section-checkpoints)
para decidir si hay que repasar la regla de ejes. Regístralas aparte de las
puntuaciones inicial y final, dentro de los bloques existentes.

## Análisis de errores

<span data-language-key="wrong-answer-clinic"></span>

Usa los [errores resueltos](worked-mistakes.md) dentro de los bloques
anteriores. Hay uno por cuaderno; los cuatro que encajan en un bloque de grupo
son orden de ejes en 02, reshape en 04, residuos en 09 y presupuestos en 11.
Muestra la afirmación. Pide un contraejemplo. Revela la corrección al final.

Las tres rondas de **¿Mito o hecho?** después de las pausas son esas mismas
entradas en formato rápido: 02–04 antes de la sección 05, 05–06 antes de la 07
y 07–09 antes de la 10. Cada ronda mezcla mitos con afirmaciones ciertas, así
que la votación nunca regala la respuesta.

Si la mitad del grupo repite un error, modela el ejemplo pequeño y pide otra
predicción. Omite una demostración opcional, no la pausa ni la comprobación final.
Quienes terminen pronto pueden diseñar un contraejemplo.

## Después del taller

<span data-language-key="after-the-session"></span>

Ofrece el [formulario de opinión](workshop-feedback.md) de dos minutos.
Anota el commit, los tiempos reales en la [franja de tiempos de la hoja del
día](day-sheet.md#franja-de-tiempos), los errores frecuentes y un cambio para
la próxima sesión.
Antes de publicarlo, usa la [lista de publicación](https://github.com/project-delphi/tensors-workshop/blob/main/RELEASE_CHECKLIST.md).
