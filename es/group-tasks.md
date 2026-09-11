---
title: "Actividades y preguntas para grupos"
lang: es
---

Actividades breves y abiertas para usar durante o después de los cuadernos.
[English](../group-tasks.md) · [Enseñar este taller](teach.qmd)

## Cómo usarlas

<span data-language-key="how-to-use-these"></span>

Forma grupos de 3–4. Elijan quién presenta, quién toma notas y quién cuestiona
los supuestos. Una cuarta persona puede ejecutar comprobaciones breves.
Cambien los roles. Pueden hablar en español o en inglés.

Elige algunas actividades. Sustituye un espacio de discusión o úsalas después
del taller; no son requisitos adicionales para cada cuaderno.

Para una actividad de 6 minutos: 1 para pensar a solas, 4 para discutir y 1 para
compartir. Para una de 8 minutos, dedica 6 a la discusión. Ejecuta la preparación
antes de empezar. Reutiliza resultados; basta un dibujo o pseudocódigo.

Cada grupo comparte: **nuestra elección → nuestra evidencia → qué nos haría
cambiar de opinión**. Se admiten decisiones distintas. Aclaren sus supuestos.
Publiquen esas tres líneas en Discord. Invita a un grupo a explicar su elección.

Para empezar: [significado de los ejes](#axis-meaning),
[errores silenciosos](#silent-bugs) y [compresión](#compression).

## 00 · ¿Confiarías en estos datos?

<span data-language-key="00-would-you-trust-this-dataset"></span>

**Cuándo:** Después de las comprobaciones de datos del
[cuaderno 00](../notebooks/00-setup-and-data.ipynb).
**Tiempo:** 6 minutos.

Elijan un conjunto de datos cargado. Decidan si está listo para un análisis
concreto. Primero acuerden cuál será ese análisis.

- ¿Qué representa una observación?
- ¿Qué defecto afectaría más al análisis? ¿Cuál podría no importar?
- ¿Qué comprobarían además de que el archivo cargue y su forma parezca correcta?

**Compartan:** Tres comprobaciones para aceptar los datos. Señalen un resultado
del cuaderno y una pregunta que este no puede responder.

## 01 · Diseña un tensor que otra persona entienda

<span data-language-key="01-design-a-tensor-someone-else-can-read"></span>

**Cuándo:** Después de leer formas como frases en el
[cuaderno 01](../notebooks/01-what-a-tensor-is.ipynb).
**Tiempo:** 6 minutos.

Diseñen un tensor para fotografías repetidas de las mismas plantas. Decidan
cuántas plantas, visitas y canales de imagen conservar.

- ¿Qué ejes necesitan? ¿Qué significa cada índice?
- ¿Qué podría revelar un corte o una fibra?
- ¿Qué podría malinterpretarse si entregaran solo la forma?

**Compartan:** Una forma con etiquetas, una selección útil y una frase que
explique su resultado. Pidan a otro grupo que lo interprete sin más ayuda.

<a id="axis-meaning"></a>

## 02 · Misma forma, distintas reglas

<span data-language-key="02-same-shape-different-rules"></span>

**Cuándo:** Después de comparar reorganizaciones en el
[cuaderno 02](../notebooks/02-thinking-in-n-dimensions.ipynb).
**Tiempo:** 6 minutos.

Dos arrays tienen forma `(20, 8, 8)`. Uno contiene imágenes independientes de
dígitos; el otro, fotogramas consecutivos. Propongan una operación razonable
para una tarea pero engañosa para la otra.

- ¿Qué ocurre al mezclar o promediar el primer eje?
- ¿Para qué pregunta serviría promediar? ¿Qué pregunta impediría responder?
- ¿Qué metadatos deben acompañar al array?

**Compartan:** Dos interpretaciones de la misma operación. Incluyan una
condición que cambiaría su recomendación.

## 03 · ¿Qué debería significar «normal»?

<span data-language-key="03-what-should-normal-mean"></span>

**Cuándo:** Después de estandarizar en el
[cuaderno 03](../notebooks/03-indexing-and-broadcasting.ipynb).
**Tiempo:** 8 minutos.

Quieren comparar dígitos manuscritos. Decidan si estandarizar cada imagen por
separado o cada posición de píxel entre imágenes.

- ¿Qué variación elimina cada opción? ¿Cuál conserva?
- ¿Cuándo sería útil conservar el brillo total?
- ¿Qué harán con un píxel de varianza cero?

**Compartan:** Su regla, los ejes usados para calcular sus estadísticas y un
caso en que sería una mala elección. Usen una gráfica del cuaderno o un dibujo.

<a id="silent-bugs"></a>

## 04 · Una prueba que detecte el error

<span data-language-key="04-a-test-that-catches-the-bug"></span>

**Cuándo:** Después del ejercicio sobre código que funciona pero está mal en el
[cuaderno 04](../notebooks/04-reshape-and-transpose.ipynb).
**Tiempo:** 6 minutos.

Alguien convierte imágenes NHWC a NCHW con `reshape`. La salida tiene la forma
pedida. Diseñen una revisión que compruebe si se conservó el significado de los
píxeles.

- ¿Qué error podría escapar a una comprobación de forma?
- ¿Qué píxel o canal seguirían durante la conversión?
- ¿Qué prueba funcionaría aunque dos ejes tuvieran el mismo tamaño?

**Compartan:** Una prueba en código o pseudocódigo y una comprobación visual.
Expliquen qué detecta cada una. Pruébenlas con ambas conversiones del cuaderno.

## 05 · Conserva el evento dentro del presupuesto

<span data-language-key="05-keep-the-event-fit-the-budget"></span>

**Cuándo:** Durante «¿padding o muestreo?» en el
[cuaderno 05](../notebooks/05-video-pipeline-design.ipynb). Úsala como alternativa
a su discusión en grupo.
**Tiempo:** 8 minutos.

Diseñen un proceso para agrupar clips de distintas duraciones. Buscan detectar
un evento breve. Pueden guardar como máximo 16 fotogramas por clip.

- ¿Muestrearían, recortarían, rellenarían o combinarían métodos? ¿Por qué?
- ¿Qué pasa si el evento ocurre entre los fotogramas seleccionados?
- ¿Cómo distinguiría el modelo el relleno de un fotograma oscuro medido?

**Compartan:** Un esquema desde la entrada hasta el lote, con ejes y una máscara
si hace falta. Nombren un posible fallo y cómo detectarlo.

## 06 · ¿Qué hace similares a dos dígitos?

<span data-language-key="06-what-counts-as-a-similar-digit"></span>

**Cuándo:** Después del explorador de búsqueda en el
[cuaderno 06](../notebooks/06-contraction-with-einsum.ipynb).
**Tiempo:** 6 minutos.

Elijan un dígito de consulta. Definan un objetivo y decidan si el producto punto
sin normalizar o la similitud coseno ofrece vecinos más útiles.

- ¿«Similar» significa misma etiqueta, trazos parecidos o cantidad de tinta?
- ¿Dónde difieren las dos listas? ¿Qué podría explicarlo?
- ¿Cómo evaluarían su elección más allá de esta consulta?

**Compartan:** El objetivo, dos ejemplos recuperados y una evaluación propuesta.
Expliquen qué representa el índice sumado en `id,jd->ij`.

## 07 · Mismas predicciones, distintos coeficientes

<span data-language-key="07-same-predictions-different-coefficients"></span>

**Cuándo:** Después del ejercicio de sistemas singulares en el
[cuaderno 07](../notebooks/07-inverses-and-pseudoinverse.ipynb).
**Tiempo:** 8 minutos.

Alguien duplica una columna de variables. Dos vectores de coeficientes producen
ahora las mismas predicciones. Decidan qué conclusiones pueden sostener.

- ¿Un residuo pequeño basta para elegir los coeficientes más fiables?
- ¿Qué elige la pseudoinversa si varias soluciones ajustan igual de bien?
- ¿Qué información adicional ayudaría a interpretar cada coeficiente?

**Compartan:** Un mensaje breve: qué permite afirmar el ajuste, qué no demuestra
y qué comprobarían después.

## 08 · Una buena predicción no basta

<span data-language-key="08-one-good-prediction-is-not-enough"></span>

**Cuándo:** Después del pronóstico recursivo en el
[cuaderno 08](../notebooks/08-recursion-with-matrices.ipynb).
**Tiempo:** 6 minutos.

El pronóstico funciona bien para el mes siguiente. Quieren reutilizarlo de
forma recursiva durante un año. Diseñen una prueba antes de aprobar el cambio.

- ¿Qué cambia cuando el modelo recibe sus propias predicciones?
- ¿Cómo podría crecer o reducirse un error pequeño con cada actualización?
- ¿Qué horizonte y modelo de referencia usarían para evaluar?

**Compartan:** Un plan de evaluación y un criterio para detener el uso. Apoyen
una preocupación con el pronóstico de pasajeros o el explorador de estados.

## 09 · Defiende una factorización

<span data-language-key="09-defend-a-factorization"></span>

**Cuándo:** Después del selector de método en el
[cuaderno 09](../notebooks/09-matrix-factorizations.ipynb).
**Tiempo:** 8 minutos.

Elijan una tarea: ajustar una matriz alta una vez; resolver el mismo sistema
cuadrado muchas veces; o comprimir una imagen con almacenamiento limitado.
Recomienden un método y compárenlo con una alternativa razonable.

- ¿Qué propiedad de la matriz deben comprobar primero?
- ¿Qué importa más: estabilidad, tiempo, almacenamiento o factores interpretables?
- ¿Qué dato nuevo les haría cambiar de método?

**Compartan:** Una recomendación con una condición y una medida. Otro grupo
aporta el dato nuevo; revisen su respuesta si hace falta.

<a id="compression"></a>

## 10 · ¿Qué debe conservar la compresión?

<span data-language-key="10-what-must-compression-preserve"></span>

**Cuándo:** Después del explorador de rango en el
[cuaderno 10](../notebooks/10-tucker-decomposition.ipynb).
**Tiempo:** 8 minutos.

Dos personas usan el tensor de taxis. Una estudia el patrón diario general;
la otra, una ruta concreta de origen a destino en su hora más concurrida.
Propongan una compresión para cada una.

- ¿Servirían los mismos rangos por modo de Tucker?
- ¿Podría un error global pequeño ocultar un error grande en esa ruta?
- ¿Qué gráfica o error local revisarían antes de aceptar el resultado?

**Compartan:** Dos propuestas de rango, o una común con una justificación.
Usen un resultado del cuaderno y propongan una comprobación adicional.

## 11 · ¿Es justa esta comparación?

<span data-language-key="11-is-this-comparison-fair"></span>

**Cuándo:** Después de comparar presupuestos similares en el
[cuaderno 11](../notebooks/11-tensor-factorizations.ipynb).
**Tiempo:** 8 minutos.

Un informe declara que CP supera a Tucker porque obtuvo menor error con
«rango 3». Diseñen una comparación que permita recomendar un método útil.

- ¿Qué significa rango 3 en cada modelo? ¿Qué se almacenó realmente?
- ¿Qué presupuesto igualarían: parámetros, bytes o tiempo?
- Además del error de reconstrucción, ¿qué resultado importa para la tarea?

**Compartan:** Un plan con tres medidas. Nombren qué mantendrán fijo y una
incertidumbre que seguiría pendiente tras ejecutar la comparación.

## 12 · Trae un problema de tu campo

<span data-language-key="12-bring-a-problem-from-your-field"></span>

**Cuándo:** Durante la discusión final del
[cuaderno 12](../notebooks/12-wrap-up-and-take-homes.ipynb).
**Tiempo:** 5 minutos: 1 para pensar, 3 para discutir y 1 para compartir.

Elijan un problema real que interese a alguien del grupo. Dibujen cómo podrían
ayudar los tensores. Hoy no necesitan los datos.

- ¿Qué significaría cada eje? ¿Qué sería una observación?
- ¿Qué operación del taller ayudaría a responder su pregunta?
- ¿Qué sería un resultado satisfactorio? ¿Qué supuesto podría fallar?

**Compartan:** Una forma con etiquetas, una operación propuesta y el primer
experimento. Cada persona añade algo que todavía necesita comprender.

## 13 · ¿Confiarías en la imagen más nítida?

<span data-language-key="13-would-you-trust-the-sharper-image"></span>

**Cuándo:** Después de la deconvolución en el
[cuaderno 13](../notebooks/13-convolution-and-deconvolution.ipynb).
Solo como actividad posterior.
**Tiempo:** 8 minutos.

Dos restauraciones de la imagen difieren. Una parece más nítida; la otra tiene
menor error respecto al original conocido. Decidan cómo evaluarlas.

- ¿Qué artefactos podrían parecer detalles recuperados?
- ¿Cómo afectan el ruido, el kernel supuesto y los bordes de la imagen?
- ¿Qué podrían comprobar con una imagen nueva sin un original limpio?

**Compartan:** Una lista de criterios de aceptación. Separen las pruebas que
necesitan una referencia limpia de las que no. Digan qué no puede demostrar
ninguna de ellas.

## Preguntas para facilitar la discusión

<span data-language-key="facilitator-prompts"></span>

Usa una cuando un grupo se atasque:

- «¿Qué están suponiendo?»
- «Muestren un caso en que esa elección falle».
- «¿Qué resultado respalda esa afirmación?»
- «¿Qué haría que ambos grupos tuvieran razón?»
- «¿Cuál es el experimento más pequeño que resolvería el desacuerdo?»

Busca significado de los ejes, evidencia y decisiones justificadas. Puede haber
varios diseños válidos; comprueba las afirmaciones matemáticas por separado.
Cierra con una distinción útil y una pregunta abierta. Deja las investigaciones
largas para después.
