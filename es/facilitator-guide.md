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
bloque. Primero intentan resolver; si se atascan, abren la Pista 1 y luego la
Pista 2 solo si hace falta. Si hay una función de comprobación, ejecuten su
definición y llámenla con sus propios resultados antes de revelar la solución.
Superar las comprobaciones numéricas todavía exige explicar los ejes y el resultado.

## Guion

<span data-language-key="run-sheet"></span>

Sigue la [agenda del taller](tensors_workshop_plan_with_quizzes.md).
Conserva cuestionarios y pausas. Distribuye así cada bloque:

| Cuaderno | Uso del tiempo |
|---|---|
| 00 · 5 min | Diagnóstico inicial 3; bienvenida y comprobación técnica 2. La preparación era previa. |
| 01 · 20 min | Modelar una forma 4; Ejercicio 1 y revisión en pareja 16. |
| 02 · 20 min | Clave de ejes y Ejercicio 2: 14; actividad grupal 02: 6. |
| 03 · 15 min | Modelar indexación 3; Ejercicio 3 y comprobación 11; comprobación individual de broadcasting 1. |
| 04 · 15 min | Ejercicio 1: 9; actividad grupal 04: 6. |
| 05 · 15 min | Ejercicio 1: 7; actividad grupal 05: 8. |
| 06 · 15 min | Modelar una contracción 4; Ejercicio 1 y comprobación 10; comprobación individual de contracción 1. |
| 07 · 15 min | Modelar columnas duplicadas 3; comparar coeficientes y normas 9; explicar qué sigue sin identificarse y comprobar 3. |
| 08 · 10 min | Modelar una actualización 3; Ejercicio 1 y comprobación 7. |
| 09 · 15 min | Ejercicio 1: 9; error sobre residuos: 3; puente obligatorio de SVD a Tucker: 3. Sin barridos de tiempos. |
| 10 · 15 min | Explicar núcleo y factores 4; explorador de rangos 8; defender una elección 3. |
| 11 · 15 min | Ejercicio 1 en parejas: 7; actividad grupal 11: 8. Sin barridos de modelos. |
| 12 · 5 min | Comprobación individual de salida. Asignar tareas después de recogerla. |

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
