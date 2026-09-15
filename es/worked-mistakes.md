---
title: "Dieciséis errores que vale la pena probar"
lang: es
---

[English](../worked-mistakes.md) · [Guía de facilitación](facilitator-guide.md) · [Enseñar este taller](teach.qmd)

Predice, ejecuta el contraejemplo y corrige la afirmación en una frase.
Estos ejemplos sintéticos aíslan un error; los cuadernos usan datos reales.

Uno por cuaderno, numerados igual. Cada uno es el contraejemplo que ejecuta la
celda de predicción de ese cuaderno, sacado del widget para poder leerlo,
ejecutarlo y discutirlo por separado.

## 00 · Una forma correcta demuestra que los datos están completos

<span data-language-key="00-a-correct-shape-proves-the-data-is-complete"></span>

«La tabla es `(20640, 10)`, exactamente la prometida; se cargó sin problemas».

<details>
<summary>Prueba y corrección</summary>

```python
import numpy as np
table = np.zeros((20640, 10))
table[:207, 4] = np.nan
assert table.shape == (20640, 10)
assert np.isnan(table).sum() == 207
assert not np.isfinite(table).all()
```

La comprobación de forma pasa y aun así faltan 207 valores: las mismas 207
filas cuyo `total_bedrooms` nunca se registró en California housing. Una forma
cuenta posiciones; nunca mira dentro de ellas. Lee `isnan().sum()` junto a
`.shape`.
Transferencia: nombra una columna de los datos de este taller donde pase una
comprobación de forma y falle una de rango.

</details>

## 01 · La forma te dice el rango

<span data-language-key="01-the-shape-tells-you-the-rank"></span>

«Ambas matrices son `(3, 3)`; las dos tienen rango 3».

<details>
<summary>Prueba y corrección</summary>

```python
import numpy as np
full = np.array([[1., 0., 0.], [0., 1., 0.], [0., 0., 1.]])
flat = np.array([[1., 2., 3.], [2., 4., 6.], [3., 6., 9.]])
assert full.shape == flat.shape == (3, 3)
assert full.ndim == flat.ndim == 2
assert np.linalg.matrix_rank(full) == 3
assert np.linalg.matrix_rank(flat) == 1
```

Misma forma, mismo orden, rangos 3 y 1. Cada fila de `flat` es un múltiplo de
la primera. El orden es el número de ejes y se lee en la forma; el rango cuenta
direcciones independientes y hay que calcularlo.
Transferencia: ¿cuál es el mayor rango posible de una matriz `(3, 7)`, y por qué?

</details>

## 02 · La media demuestra que el orden no cambió

<span data-language-key="02-the-mean-proves-the-order-is-unchanged"></span>

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

## 03 · Un NaN significa que el código está roto

<span data-language-key="03-a-nan-means-the-code-is-broken"></span>

«Estandarizar produjo NaN; hay un error en la fórmula».

<details>
<summary>Prueba y corrección</summary>

```python
import numpy as np
D = np.array([[0., 1., 5.], [0., 3., 9.], [0., 2., 7.]])
std = D.std(axis=0)
assert std[0] == 0.0
with np.errstate(invalid="ignore", divide="ignore"):
    Z = (D - D.mean(axis=0)) / std
assert np.isnan(Z[:, 0]).all()
assert np.isfinite(Z[:, 1:]).all()
```

La columna 0 nunca varía, así que la fórmula dividió entre cero; las demás
columnas son finitas. El código es correcto e informó de una propiedad de los
datos. Una característica de varianza cero es un hallazgo, no un error:
descártala o consérvala, pero dilo.
Transferencia: tres píxeles de `load_digits()` son constantes en las 1.797
imágenes. ¿Qué les hace un z-score por píxel?

</details>

## 04 · La forma demuestra que reshape funcionó

<span data-language-key="04-the-shape-proves-reshape-worked"></span>

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

## 05 · El segundo fotograma del array es el segundo del video

<span data-language-key="05-the-array-s-second-frame-is-the-video-s-second-frame"></span>

«`clip` contiene el video, así que `clip[1]` es lo segundo que ocurrió».

<details>
<summary>Prueba y corrección</summary>

```python
import numpy as np
kept = np.arange(0, 720, 45)
assert kept.shape == (16,)
assert kept[0] == 0
assert kept[1] == 45
assert round(100 * len(kept) / 720, 1) == 2.2
```

`clip` conserva un fotograma de cada 45 de los 720, así que la entrada 1 viene
del fotograma 45 y el 97,8% de los instantes grabados no están en el tensor. Un
índice sobre un eje muestreado es una posición del array, no un instante.
Transferencia: ¿qué tendrías que guardar junto a `clip` para responder «¿cuándo
fue `clip[1]`?» en segundos?

</details>

## 06 · Repetir un índice suma toda la matriz

<span data-language-key="06-repeating-an-index-sums-the-whole-matrix"></span>

«A `np.einsum('ii->', A)` no le queda ningún eje; tiene que ser el total».

<details>
<summary>Prueba y corrección</summary>

```python
import numpy as np
A = np.array([[5., 2.], [7., 3.]])
assert np.einsum("ii->", A) == 8.0
assert A.sum() == 17.0
assert np.einsum("ii->", A) != A.sum()
assert np.einsum("ij->", A) == A.sum()
```

8.0 frente a 17.0. Repetir la letra selecciona las posiciones donde ambos
índices coinciden — la diagonal — y solo entonces suma. Con dos letras
distintas, `ij->`, se suma todo. Qué letras se repiten decide qué entra en la
suma, antes de sumar nada.
Transferencia: ¿qué devuelve `np.einsum('ij->i', A)`, y por qué es una suma por
filas?

</details>

## 07 · Que pinv devuelva un resultado demuestra que la matriz era invertible

<span data-language-key="07-an-answer-from-pinv-proves-the-matrix-was-invertible"></span>

«`pinv` devolvió sin protestar; la matriz estaba bien».

<details>
<summary>Prueba y corrección</summary>

```python
import numpy as np
A = np.array([[1., 2., 3.], [4., 5., 6.], [7., 8., 10.]])
A[:, 2] = A[:, 1]
P = np.linalg.pinv(A)
assert np.linalg.matrix_rank(A) == 2
assert np.allclose(A @ P @ A, A)
assert np.allclose(P @ A @ P, P)
assert not np.allclose(P @ A, np.eye(3))
```

`pinv` está definida para cualquier matriz, así que devuelve sin protestar ante
una matriz de rango 2 en una caja 3×3. Las identidades de Moore-Penrose se
cumplen y aun así `P @ A` no es la identidad: la columna duplicada costó una
dirección, y ninguna excepción iba a avisarte. Comprueba el rango.
Transferencia: `np.linalg.inv` tampoco falla aquí: devuelve números finitos
enormes, y `A @ inv(A)` no es la identidad. ¿Qué comprobarías antes de fiarte
de cualquiera de los dos resultados?

</details>

## 08 · Un error pequeño en un paso se mantiene pequeño

<span data-language-key="08-a-small-one-step-error-stays-small"></span>

«El error a un paso es del 1%; el pronóstico a doce pasos se desvía un 1%».

<details>
<summary>Prueba y corrección</summary>

```python
w, err = 1.1, 0.01
grown = err * w ** 12
shrunk = err * 0.9 ** 12
assert round(grown, 4) == 0.0314
assert grown > 3 * err
assert shrunk < err
```

Con `w = 1,1` el error del 1% supera el 3% tras doce pasos; con `w = 0,9` se
apaga. Un pronóstico recursivo consume su propia salida, así que la regla de
actualización se aplica también al error. El error a horizonte depende de los
coeficientes, no solo del error a un paso.
Transferencia: ¿con qué `w` el error a doce pasos ni crece ni se reduce?

</details>

## 09 · Un residuo pequeño demuestra coeficientes fiables

<span data-language-key="09-a-tiny-residual-proves-reliable-coefficients"></span>

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

## 10 · Rango horario 3 significa que solo sobreviven tres horas

<span data-language-key="10-hour-rank-3-means-only-three-hours-survive"></span>

«Tucker con rango horario 3 conserva tres de las 24 horas y descarta el resto».

<details>
<summary>Prueba y corrección</summary>

```python
import numpy as np
rng = np.random.default_rng(0)
T = rng.random((24, 40))
U, s, Vt = np.linalg.svd(T, full_matrices=False)
U3 = U[:, :3]
assert U3.shape == (24, 3)
recon = U3 @ np.diag(s[:3]) @ Vt[:3]
assert recon.shape == (24, 40)
assert len(np.unique(recon.round(6), axis=0)) == 24
```

La base horaria tiene una fila por hora real y una columna por dirección
aprendida: `U3` es `(24, 3)`, y los 24 perfiles horarios reconstruidos siguen
siendo distintos. El rango 3 compra tres direcciones para describir la
variación en las 24 horas. El rango es un presupuesto, no un subconjunto.
Transferencia: ¿qué haría falta realmente para quitar una hora del tensor?

</details>

## 11 · Rangos iguales implican presupuestos iguales

<span data-language-key="11-equal-ranks-mean-equal-budgets"></span>

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

## 12 · Todos los pesos de atención suman 1

<span data-language-key="12-all-the-attention-weights-sum-to-1"></span>

«El softmax normaliza, así que toda la matriz de pesos suma 1».

<details>
<summary>Prueba y corrección</summary>

```python
import numpy as np
scores = np.array([[2., 1., 0.], [0., 2., 1.]])
rowwise = np.exp(scores) / np.exp(scores).sum(axis=-1, keepdims=True)
whole = np.exp(scores) / np.exp(scores).sum()
assert np.allclose(rowwise.sum(axis=-1), 1.0)
assert np.isclose(rowwise.sum(), 2.0)
assert np.isclose(whole.sum(), 1.0)
assert not np.allclose(rowwise, whole)
```

Cada fila suma 1 y la matriz suma 2: una por consulta. El softmax actúa sobre el
último eje, así que cada fila es su propia distribución sobre las claves.
Normalizar la matriz entera también da 1 y es otra cosa distinta, y por eso el
total general es una mala comprobación.
Transferencia: en un tensor de puntuaciones `(batch, heads, queries, keys)`,
¿sobre qué eje actúa el softmax?

</details>

## 13 · Convolución y correlación son lo mismo

<span data-language-key="13-convolution-and-correlation-are-the-same-thing"></span>

«Deslizar un kernel y multiplicar es convolución, se escriba como se escriba».

<details>
<summary>Prueba y corrección</summary>

```python
import numpy as np
x = np.array([1., 2., 3., 4., 5.])
k = np.array([1., 2., 3.])
corr = np.array([(x[i:i + 3] * k).sum() for i in range(3)])
conv = np.convolve(x, k, mode="valid")
assert not np.allclose(corr, conv)
assert np.allclose(corr, np.convolve(x, k[::-1], mode="valid"))
```

La convolución invierte el kernel antes de deslizarlo, así que con uno
asimétrico ambas difieren. Si lo inviertes tú, la correlación reproduce
exactamente la convolución. Con un kernel simétrico la distinción desaparece, y
por eso suele pasar inadvertida — y por eso las capas de «convolución» del
aprendizaje profundo son correlación.
Transferencia: si se invirtieran los kernels de una capa entrenada, ¿qué
cambiaría?

</details>

## 14 · Reescalar un vector factor reescala la componente

<span data-language-key="14-rescaling-a-factor-vector-rescales-the-component"></span>

«La neurona 12 tiene el mayor peso de este factor, así que manda en la componente».

<details>
<summary>Prueba y corrección</summary>

```python
import numpy as np
a = np.array([1., 2.])
b = np.array([3., 4.])
c = np.array([5.])
t1 = np.einsum("i,j,k->ijk", a, b, c)
t2 = np.einsum("i,j,k->ijk", 2 * a, b / 2, c)
assert np.allclose(t1, t2)
assert not np.allclose(2 * a, a)
lam = np.linalg.norm(a) * np.linalg.norm(b) * np.linalg.norm(c)
unit = np.einsum("i,j,k->ijk", a / np.linalg.norm(a), b / np.linalg.norm(b),
                 c / np.linalg.norm(c))
assert np.allclose(t1, lam * unit)
```

Duplica un vector y divide otro por dos: el tensor de rango 1 no se mueve, así
que la magnitud de un vector factor es aritmética, no datos. Solo hay dos cosas
legibles: el perfil de norma 1 — la forma de los picos y valles — y un peso que
guarda todo el tamaño, que es lo que `tensorly` devuelve como `weights`.
Normaliza antes de comparar dos componentes, o antes de nombrar un pico.
Transferencia: dos ejecuciones devuelven las componentes en otro orden. ¿Con
qué hay que emparejarlas antes de compararlas?

</details>

## 15 · Un error de 2 es un error de 2

<span data-language-key="15-an-error-of-2-is-an-error-of-2"></span>

«El modelo falló por 2, así que se equivocó lo mismo en los dos casos».

<details>
<summary>Prueba y corrección</summary>

```python
import numpy as np
def squared(x, m):
    return (x - m) ** 2
def deviance(x, m):
    return 2 * (m - x + x * np.log(x / m))
assert squared(2., 4.) == squared(2000., 2002.)
assert round(deviance(2., 4.), 3) == 1.227
assert round(deviance(2000., 2002.), 3) == 0.002
assert deviance(2., 4.) > 600 * deviance(2000., 2002.)
```

El error cuadrático cobra 4 por ambos fallos, porque supone que el ruido tiene
la misma dispersión en todas partes. La dispersión de un conteo crece con su
media — la varianza de un conteo de Poisson *es* su media —, así que fallar por
2 en una celda que promedia 2 es equivocarse de orden de magnitud, y fallar por
2 en una celda de 2000 es redondear. La desviación de Poisson cobra unas 600
veces más el primero. Elegir la pérdida es elegir qué clase de número crees
tener.
Transferencia: tu tensor tiene un 41% de ceros. ¿Qué pérdida deja al modelo
predecir un conteo negativo, y por qué la otra no necesita una restricción para
impedirlo?

</details>


## 16 · Conservar el 99% de la varianza conserva las etiquetas

<span data-language-key="16-variance-and-labels"></span>

«La sombra conserva casi todo, así que debe bastar para clasificar».

<details>
<summary>Prueba y corrección</summary>

```python
import numpy as np
x = np.linspace(-30, 30, 100)
cloud = np.column_stack([np.repeat(x, 2), np.tile([-1., 1.], len(x))])
centered = cloud - cloud.mean(axis=0)
_, singular_values, axes = np.linalg.svd(centered, full_matrices=False)
shadow = centered @ axes[:1].T
assert singular_values[0]**2 / np.sum(singular_values**2) > .99
assert np.allclose(shadow[::2], shadow[1::2])
assert np.all(cloud[::2, 1] != cloud[1::2, 1])
```

Las etiquetas opuestas comparten la coordenada horizontal. PCA conserva más
del 99% de la varianza y asigna la misma puntuación a cada pareja opuesta.
La pequeña coordenada vertical separa todas las parejas. Elige la
representación mediante validación de entrenamiento para la tarea concreta y
evalúala después con datos reservados.
Transferencia: ¿ayudaría estandarizar este ejemplo y demostraría eso que ayuda
en cualquier conjunto de datos?

</details>
