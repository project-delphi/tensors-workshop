---
title: "Guía de facilitación"
lang: es
---

[English](../facilitator-guide.md) · [Enseñar este taller](teach.qmd)

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
bloque. Los momentos de proyector también son de predicción primero: pregunta
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
| 04 · 15 min | Predicción inicial y el proyector 2; Ejercicio 1: 7; [actividad de errores silenciosos](group-tasks.md#silent-bugs): 6. | <a href="../interactive/image-tensor.html?lang=es#reshape">Reshape de una foto</a>: el error de la apertura en frío, sobre una imagen. Nómbralo como ese error. |
| 05 · 15 min | Predicción inicial 2, que es el paso de predicción del Ejercicio 1; Ejercicio 1: 5; actividad grupal 05: 8. | — |
| 06 · 15 min | Modelar una contracción 4; Ejercicio 1 y comprobación 10; comprobación individual de contracción 1. | — |
| 07 · 15 min | Modelar columnas duplicadas 3; comparar coeficientes y normas 9; explicar qué sigue sin identificarse y comprobar 3. | <a href="../interactive/linalg-stage.html?lang=es#collinear">Columnas colineales</a>, dentro del modelado 3. |
| 08 · 10 min | Modelar una actualización 3; Ejercicio 1 y comprobación 7. | — |
| 09 · 15 min | Ejercicio 1: 9; error sobre residuos: 3; puente obligatorio de SVD a Tucker: 3. Sin barridos de tiempos. | — |
| 10 · 15 min | Explicar núcleo y factores 4; explorador de rangos 8; defender una elección 3. | <a href="../interactive/factor-stage.html?lang=es#tucker">Tucker en el tensor de taxis</a>, dentro de defender una elección 3, después del explorador de rangos: su factor de hora tiene el pico en la hora 18, la que imprimió el cuaderno. Nunca antes. |
| 11 · 15 min | Ejercicio 1 en parejas: 7; actividad grupal 11: 8. Sin barridos de modelos. | <a href="../interactive/factor-stage.html?lang=es#budget">Mismo presupuesto, CP y Tucker</a>, en la puesta en común de la actividad grupal 11, como la comparación con el mismo presupuesto que pide la actividad. No antes del ejercicio en parejas, al que daría la respuesta. |
| 12 · 5 min | Comprobación individual de salida. Asignar tareas después de recogerla. | Justo antes, en la diapositiva de "una sola idea": vuelve a reproducir la voz transpuesta 30 segundos y deja que la sala nombre el error. |

Busca las [actividades grupales](group-tasks.md) por número de cuaderno.
Usa las preguntas escritas; los exploradores opcionales no son requisitos.
Para la actividad 04, usa el ejemplo pequeño de [reshape](worked-mistakes.md) si hace falta.
Cada bloque incluye la puesta en común. Habla un grupo; los demás entregan:
**elección → evidencia → qué nos haría cambiar de opinión**.

En el cuaderno 11, primero predicen el almacenamiento y luego usan la pista
opcional de código parcial para completar el ajuste y la comparación. Reserva
los siete minutos en pareja para elegir, comprobar e interpretar; ejecuta las
instalaciones durante la preparación. Si el ajuste tarda mucho, demuestra la
solución incluida después del intento. Conserva los ocho minutos de discusión
grupal. Anota tiempos reales de finalización y uso de pistas para comprobar
si esta distribución funciona con el grupo.

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

Si la mitad del grupo repite un error, modela el ejemplo pequeño y pide otra
predicción. Omite una demostración opcional, no la pausa ni la comprobación final.
Quienes terminen pronto pueden diseñar un contraejemplo.

## Después del taller

<span data-language-key="after-the-session"></span>

Ofrece el [formulario de opinión](workshop-feedback.md) de dos minutos.
Anota el commit, tiempos reales, errores frecuentes y un cambio para la próxima sesión.
Antes de publicarlo, usa la [lista de publicación](https://github.com/project-delphi/tensors-workshop/blob/main/RELEASE_CHECKLIST.md).
