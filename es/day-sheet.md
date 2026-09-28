---
title: "Hoja del día"
subtitle: "Una página para la sala"
lang: es
---

::: {.day-sheet-intro}

[English](../day-sheet.md) · [Enseñar este taller](teach.qmd)

Todo en esta página viene de la
[guía de facilitación](facilitator-guide.md), la
[agenda](tensors_workshop_plan_with_quizzes.md#agenda), [Kahoot](kahoot.qmd)
y las [preguntas frecuentes](faq.qmd#colab-access) — nada aquí es nuevo.
Imprímela, o déjala abierta en una segunda pantalla.

:::

::: {.day-sheet}

## Pestañas para abrir, en orden

<span data-language-key="tabs-to-open-in-order"></span>

1. [Diapositivas](../slides/es/index.qmd)
2. [Apertura en frío del escenario de audio](../interactive/voice-stage.html?lang=es#scramble) (con sonido)
3. [kahoot.it](https://kahoot.it)
4. [Simulador de broadcasting](../interactive/broadcasting-simulator.html?lang=es)
5. [Reshape de una foto](../interactive/image-tensor.html?lang=es#reshape)
6. [Columnas colineales](../interactive/linalg-stage.html?lang=es#collinear)
7. [Tucker en el tensor de taxis](../interactive/factor-stage.html?lang=es#tucker)
8. [Mismo presupuesto, CP y Tucker](../interactive/factor-stage.html?lang=es#budget)
9. [Cuaderno 00]({{< var repo.colab_base >}}/00-setup-and-data.ipynb) en Colab

## Franja de reloj

<span data-language-key="clock-strip"></span>

Decide los recortes según el reloj, no sobre la marcha. Detalle completo en
[Si vas con retraso](facilitator-guide.md#si-vas-con-retraso).

| Comprueba en | Deberías empezar | Si vas con retraso |
|------|---------|----------------------------------------------|
| +0:45 | 03 | Un grupo informa la actividad de ejes de 02; se omite el resto (−3). |
| +1:00 | 04 | Solo la ronda 1 de la caza del error; se omite la reescritura de la ronda 2 (−3). |
| +1:15 | Kahoot 1 | Hazlo. 6–10 min de retraso: elimina ya el Kahoot 2. 10+: elimina también el Kahoot 1. |
| +1:25 | 05 | Mito o hecho → pregunta de recuperación (−1); un grupo informa (−4). |
| +2:00 | 07 | Mito o hecho → pregunta de recuperación (−1); elimina el Kahoot 2 si sigue en pie (−5). |
| +2:30 | 09 | Omite el error sobre residuos; conserva el puente de SVD a Tucker (−3). |
| +2:50 | 10 | Conserva enteros el golf y la escena de Tucker, diga lo que diga el reloj. |
| +3:10 | 11 | Hoyo 2 como demostración (−3); 10+ de retraso: 3 min de intento y luego demuestra (−4). |
| +3:25 | 12 | Para donde estés y haz la comprobación final. |

**Nunca recortes:** las pausas, la sección 10, el Kahoot 3, la comprobación final.

## PIN de Kahoot

<span data-language-key="kahoot-pins"></span>

Anota cada PIN cuando aparezca en pantalla — Kahoot lo genera en el momento de
lanzar la partida. Consulta [Kahoot](kahoot.qmd) para los enlaces de acceso y
los archivos de importación.

| Cuestionario | PIN |
|---|---|
| Kahoot 1 — después de la sección 04 | _______ |
| Kahoot 2 — después de la sección 07 | _______ |
| Kahoot 3 — después de la sección 10 | _______ |

## Si falla Colab o el Wi-Fi

<span data-language-key="if-colab-or-wi-fi-fails"></span>

- [Ten una sesión funcionando](facilitator-guide.md#antes-del-taller) y
  demuestra en el proyector si falla una descarga.
- Quien no tenga Colab funcionando [se empareja con alguien de al
  lado](faq.qmd#colab-access); las herramientas interactivas funcionan en
  cualquier navegador y no necesitan cuenta.
- Cada descarga de los cuadernos recurre a la copia propia del taller de ese
  conjunto de datos, y muestra un mensaje bilingüe si fallan tanto la fuente
  original como la copia.

:::

::: {.day-sheet-strip}

## Franja de tiempos

<span data-language-key="timing-strip"></span>

Complétala mientras avanza la sesión; es lo que pide el
[formulario de opinión](workshop-feedback.md) y la [guía de
facilitación](facilitator-guide.md#después-del-taller). Los valores previstos
vienen de la [agenda](tensors_workshop_plan_with_quizzes.md#agenda).

<!-- Maintainers: the Kahoot and break start times below are copied by hand
from the agenda. The section rows read `start` and `minutes` from
_variables.yml; re-check the others if a section's minutes change. -->

| Segmento | Inicio previsto | Min previstos | Inicio real | Fin real | Recorte aplicado | Notas |
|---|---|---|---|---|---|---|
| 00 · {{< var sections.s00.title_es >}} | {{< var sections.s00.start >}} | {{< var sections.s00.minutes >}} | | | | |
| 01 · {{< var sections.s01.title_es >}} | {{< var sections.s01.start >}} | {{< var sections.s01.minutes >}} | | | | |
| 02 · {{< var sections.s02.title_es >}} | {{< var sections.s02.start >}} | {{< var sections.s02.minutes >}} | | | | |
| 03 · {{< var sections.s03.title_es >}} | {{< var sections.s03.start >}} | {{< var sections.s03.minutes >}} | | | | |
| 04 · {{< var sections.s04.title_es >}} | {{< var sections.s04.start >}} | {{< var sections.s04.minutes >}} | | | | |
| Kahoot 1 | +01:15 | {{< var schedule.quiz_minutes >}} | | | | |
| Pausa | +01:20 | {{< var schedule.break_minutes >}} | | | | |
| 05 · {{< var sections.s05.title_es >}} | {{< var sections.s05.start >}} | {{< var sections.s05.minutes >}} | | | | |
| 06 · {{< var sections.s06.title_es >}} | {{< var sections.s06.start >}} | {{< var sections.s06.minutes >}} | | | | |
| Pausa | +01:55 | {{< var schedule.break_minutes >}} | | | | |
| 07 · {{< var sections.s07.title_es >}} | {{< var sections.s07.start >}} | {{< var sections.s07.minutes >}} | | | | |
| Kahoot 2 | +02:15 | {{< var schedule.quiz_minutes >}} | | | | |
| 08 · {{< var sections.s08.title_es >}} | {{< var sections.s08.start >}} | {{< var sections.s08.minutes >}} | | | | |
| 09 · {{< var sections.s09.title_es >}} | {{< var sections.s09.start >}} | {{< var sections.s09.minutes >}} | | | | |
| Pausa | +02:45 | {{< var schedule.break_minutes >}} | | | | |
| 10 · {{< var sections.s10.title_es >}} | {{< var sections.s10.start >}} | {{< var sections.s10.minutes >}} | | | | |
| Kahoot 3 | +03:05 | {{< var schedule.quiz_minutes >}} | | | | |
| 11 · {{< var sections.s11.title_es >}} | {{< var sections.s11.start >}} | {{< var sections.s11.minutes >}} | | | | |
| 12 · {{< var sections.s12.title_es >}} | {{< var sections.s12.start >}} | {{< var sections.s12.minutes >}} | | | | |

:::
