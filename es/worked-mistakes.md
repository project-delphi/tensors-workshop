# Cuatro errores que vale la pena probar

[English](../worked-mistakes.md) · [Guía de facilitación](facilitator-guide.md)

Predice, ejecuta el contraejemplo y corrige la afirmación en una frase.
Estos ejemplos sintéticos aíslan un error; los cuadernos usan datos reales.

## 02 · La media demuestra que el orden no cambió

«La media es idéntica después de barajar; no se perdió información».

<details>
<summary>Prueba y corrección</summary>

```python
import numpy as np
frames = np.array([0., 1., 2., 3.])
shuffled = frames[[0, 3, 1, 2]]
assert frames.mean() == shuffled.mean()
assert not np.array_equal(np.diff(frames), np.diff(shuffled))
```

Ambas medias son 1.5. Los cambios son `[1, 1, 1]` frente a `[3, -2, 1]`.
La media no establece la cronología. Comprueba marcas de tiempo o índices originales.
Transferencia: ¿cuándo puedes barajar imágenes independientes y sus etiquetas?

</details>

## 04 · La forma demuestra que reshape funcionó

«Ambos resultados tienen forma `(3, 2, 2)`; ambos son imágenes CHW válidas».

<details>
<summary>Prueba y corrección</summary>

```python
import numpy as np
hwc = np.arange(12).reshape(2, 2, 3)
right = hwc.transpose(2, 0, 1)
wrong = hwc.reshape(3, 2, 2)
assert right.shape == wrong.shape
assert right[1, 0, 0] == hwc[0, 0, 1] == 1
assert wrong[1, 0, 0] == 4
assert np.array_equal(right.transpose(1, 2, 0), hwc)
```

La forma coincide; un valor de canal no. Usa transpose para reordenar ejes.
Transferencia: escribe una comprobación de coordenadas para NHWC → NCHW.

</details>

## 09 · Un residuo pequeño demuestra coeficientes fiables

«Ambos ajustes son casi exactos; sus coeficientes deben coincidir».

<details>
<summary>Prueba y corrección</summary>

```python
import numpy as np
X = np.array([[1., 1.], [1., 1.000001]])
a, b = np.array([1., 1.]), np.array([2., 0.])
y = X @ a
assert np.linalg.norm(X @ a - y) == 0
assert np.isclose(np.linalg.norm(X @ b - y), 1e-6)
assert np.isclose(np.linalg.norm(a - b), np.sqrt(2))
```

Los coeficientes difieren aproximadamente 1.414; las predicciones, solo 0.000001.
Las columnas casi dependientes lo permiten. Revisa condicionamiento y sensibilidad
de coeficientes, además del ajuste. QR evita formar `X.T @ X`; no elimina la
sensibilidad del problema.
Transferencia: ¿qué pasa si un pequeño error de medición cambia `y`?

</details>

## 11 · Rangos iguales implican presupuestos iguales

«CP de rango 3 y Tucker con rangos `(3, 3, 3)` ocupan lo mismo».

<details>
<summary>Prueba y corrección</summary>

```python
shape = (4, 4, 24)
cp = 3 * sum(shape)
tucker = 3**3 + 3 * sum(shape)
assert (cp, tucker) == (96, 123)
```

Tucker también guarda un núcleo: aquí son 27 valores más. Esta convención de CP
absorbe los pesos en un factor; cuenta 3 valores adicionales si se guardan aparte.
Iguala los parámetros almacenados y compara el error sobre los mismos datos.
Transferencia: si los presupuestos no coinciden exactamente, ¿cómo informarías la diferencia?

</details>
