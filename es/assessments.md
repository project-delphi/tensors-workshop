---
title: "Comprobaciones inicial y final"
lang: es
---

[English](../assessments.md) · [Guía de facilitación](facilitator-guide.md) · [Enseñar este taller](teach.qmd)

Responde individualmente, con frases cortas. No necesitas código.
Las preguntas también están en los cuadernos 00 y 12.

## Entrada · 3 minutos

`X.shape == (20, 8, 8)`.

1. Da dos interpretaciones de sus ejes.
2. Predice `X[:, 3, 4].shape`. Nombra el eje restante en cada interpretación.
3. ¿Qué evidencia distinguiría imágenes independientes de fotogramas de video?

## Salida · 5 minutos

`X.shape == (6, 4, 3, 8, 8)`: plantas, visitas, canales, filas, columnas.

1. Predice `X[:, -1, 1].shape`. Nombra sus ejes.
2. Predice `X.mean(axis=1).shape`. Nombra sus ejes.
3. ¿Qué podría ocultar promediar visitas? Propón una prueba de esa pérdida.
4. Compara con tu respuesta inicial. Nombra una idea corregida y una pregunta pendiente.

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

Puntúa cada dimensión: **0** (ausente/incorrecta), **1** (parcial) o **2**
(correcta y explicada). Puntúa entrada y salida por separado, sobre 6:

| Dimensión | Evidencia de entrada | Evidencia de salida |
|---|---|---|
| Significado | Dos interpretaciones con todos los ejes | Ejes restantes de ambos resultados |
| Forma | Forma de la selección y explicación | Ambas formas de salida y explicación |
| Evidencia | Metadatos que distinguen lote de tiempo | Una pérdida concreta y una prueba que la detecte |

Si significado o forma recibe 0–1, repasa el corte del cuaderno 01.
Si evidencia recibe 0–1, usa la actividad grupal 02. Si las tres reciben 2,
asigna una tarea según sus intereses. La reflexión no se puntúa.
La diferencia de puntuaciones no mide el impacto causal del taller.

</details>
