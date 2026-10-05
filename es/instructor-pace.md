---
title: "Guía de ritmo para docentes"
subtitle: "Primera sesión · tiempos y decisiones en una página"
lang: es
toc: false
---

::: {.day-sheet-intro}

[English](../instructor-pace.md) · [Kit docente](teach.qmd) · [Guía completa de facilitación](facilitator-guide.md)

Imprime esta página o mantenla junto a las diapositivas. Los tiempos y las indicaciones siguen la agenda y la guía de facilitación del taller.

:::

::: {.day-sheet .pace-guide}

**Inicio: ______ · Fin: ______ · {{< var workshop.minutes >}} minutos, con cuestionarios, estudios a fondo y pausas; el almuerzo va aparte.** Los tiempos son minutos de sesión: el reloj se detiene en el almuerzo. Usa un temporizador para cada tramo.

## Antes de que llegue el grupo {#before}

Abre las [diapositivas](../slides/es/index.qmd), los [cuadernos](notebooks.qmd), [Kahoot](kahoot.qmd) y las [demostraciones de la hoja del día](day-sheet.md). Prueba el sonido y prepara un entorno de Colab que funcione. La preparación es trabajo previo; empareja a quien siga bloqueado en lugar de depurar ante todo el grupo.

## Sigue este reloj {#clock}

| Inicio | Tramo | Indicación / punto de cierre |
|---|-------|----------------------|
| {{< var sections.s00.start >}} | 00 · Bienvenida | Voz inicial 1½ min; evaluación individual de entrada 3; bienvenida/entorno ½. |
| {{< var sections.s01.start >}} | 01 · Tensores | Modela una forma 4 min; ejercicio y revisión en parejas 16. Repasa brevemente las diapositivas de computación. |
| {{< var sections.s02.start >}} | 02 · Ejes | Predicción 2; clave de ejes y ejercicio 12; tarea sobre significado de ejes 6. |
| {{< var sections.s03.start >}} | 03 · Broadcasting | Modelo/simulador 3; ejercicio y retroalimentación 14; un grupo comparte 2; comprobación 1. |
| {{< var sections.s04.start >}} | 04 · Reshape | Predicción/foto 2; ejercicio 10; caza de errores 6; nombrar el error de la voz 2. |
| {{< var sections.s04.end >}} | Kahoot 1 + pausa | Cuestionario {{< var schedule.quiz_minutes >}} min; pausa {{< var schedule.break_minutes >}}. Anuncia la hora de regreso. |
| {{< var sections.s05.start >}} | 05 · Vídeo | Mito o realidad 1; predicción 2; ejercicio 4; diseño en grupo 8. |
| {{< var sections.s06.start >}} | 06 · Contracción | Modelo 4; ejercicio y retroalimentación 13; una pareja comparte 2; comprobación 1. |
| {{< var sections.s06.end >}} | Pausa | {{< var schedule.break_minutes >}} min. Retoma a tiempo. |
| {{< var schedule.labs.x17.start >}} | 17 · Atención (a fondo) | Preparación 4; `split_heads` y pruebas 12; predicción 5; explicación 4. Luego **almuerzo**: reloj detenido. |
| {{< var sections.s07.start >}} | 07 · Pseudoinversa | Tras el almuerzo. Mito o realidad 1; columnas duplicadas 3; comparación 11; explicar/comprobar 5. |
| {{< var sections.s07.end >}} | Kahoot 2 | {{< var schedule.quiz_minutes >}} min. Primer cuestionario que se recorta si hay retraso. |
| {{< var sections.s08.start >}} | 08 · Recursión | Modela una actualización 3; ejercicio y comprobación 7. |
| {{< var sections.s09.start >}} | 09 · SVD | Ejercicio 12; error de residuos 4; puente SVD–Tucker 4. Conserva el puente. |
| {{< var sections.s09.end >}} | Pausa | {{< var schedule.break_minutes >}} min. Retoma a tiempo. |
| {{< var schedule.labs.x13.start >}} | 13 · Convolución (a fondo) | Predicción 4; ejercicio 1: 13; demostración de deconvolución 6; nombrar la idea 2. |
| {{< var sections.s10.start >}} | 10 · Tucker | Mito o realidad 1; núcleo/factores 5; golf 8; defensa del ganador + escena 6. |
| {{< var sections.s10.end >}} | Kahoot 3 | {{< var schedule.quiz_minutes >}} min. Protege esta comprobación de Tucker. |
| {{< var sections.s11.start >}} | 11 · CP y Tucker | Ejercicio en parejas 10; golf 5; clasificación + escena 5. Sin barridos de modelos. |
| {{< var sections.s11.end >}} | Pausa | {{< var schedule.break_minutes >}} min. Ejecuta ahora la preparación del cuaderno 14. |
| {{< var schedule.labs.x14.start >}} | 14 · CP (a fondo) | Predicción 3; ejercicio de rango 1: 12; explicar `lam` y comprobar 5. |
| {{< var schedule.labs.x20.start >}} | 20 · AlphaTensor (a fondo) | Predicción 4; ejercicio 1: 10; una partida en el escenario 6. |
| {{< var sections.s12.start >}} | 12 · Salida | Deja de explicar. Evaluación individual: ejes/evidencia 3; transferencia de Tucker 2. |
| {{< var sections.s12.end >}} | Cierre | Recoge las respuestas; después, indica el trabajo para casa. |

## Ritmo y recortes {#rescue}

**Predecir → Ejecutar → Explicar → Comprobar.** Sigue el bloque esencial de cada cuaderno; termina en **Core complete**. Escucha a un grupo y continúa. Avisa dos minutos antes del final de cada ejercicio. Deja para después las preguntas que necesiten una ampliación.

- **5 minutos de retraso:** acorta las puestas en común; en 04, solo la primera ronda de caza de errores; en 09, omite el error de residuos. Conserva las comprobaciones.
- **Más de 10 minutos de retraso en Kahoot 1:** elimínalo; mantén la pausa. El almuerzo absorbe la mañana. Con retraso por la tarde: elimina Kahoot 2.
- **Con retraso en un estudio a fondo:** predicción y, después, demuestra su ejercicio. Se acorta, nunca se salta.
- **Todavía con retraso en 11:** demuestra el segundo hoyo de golf; con 10+ minutos, da tres minutos para intentarlo en parejas y muestra la solución incluida.
- **Protege:** pausas, sección 10, Kahoot 3 y evaluación de salida a {{< var sections.s12.start >}}. Muestra la escena de Tucker después del golf. Deja las ampliaciones para casa.

**Si falla la tecnología:** forma parejas con alguien que tenga un entorno funcional o usa el tuyo en el proyector. Anota tiempos reales y recortes en la [hoja del día](day-sheet.md).

:::
