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

Tres actividades son juegos con puntuación: la caza del error en 04 y el golf de
compresión en 10 y 11. En ellas, la línea que se comparte incluye la
puntuación, y quien facilita lleva la clasificación en la pizarra o en el chat.

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

## 04 · Caza del error: ¿qué línea desordenó al astronauta?

<span data-language-key="04-a-test-that-catches-the-bug"></span>

**Cuándo:** Después del Ejercicio 1 del
[cuaderno 04](../notebooks/04-reshape-and-transpose.ipynb), en la celda de la caza del error.
**Tiempo:** 6 minutos: 2 para emparejar, 3 para escribir una prueba y 1 para compartir.

Cuatro líneas pasan al astronauta de HWC a CHW. Las cuatro dan forma
`(3, 512, 512)` y ninguna da error. El cuaderno dibuja los cuatro resultados uno
al lado del otro, de la A a la D. Solo uno es correcto.

- Ronda 1: emparejen cada imagen con su línea. Una es ruido, otra es azul y otra
  está tumbada de lado.
- Ronda 2: reescriban `looks_right(chw)` hasta que `score_test` indique 3 de 3
  errores detectados y ninguna falsa alarma. Empieza como una comprobación de
  forma, que no detecta ninguno.
- ¿Qué error supera una prueba que mira un canal entero de una vez, y por qué?

**Compartan:** Nuestros emparejamientos → nuestra prueba y su puntuación → el
error que dejó pasar una prueba más débil.

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

## 10 · Golf de compresión, hoyo 1

<span data-language-key="10-what-must-compression-preserve"></span>

**Cuándo:** En el explorador de rango del
[cuaderno 10](../notebooks/10-tucker-decomposition.ipynb).
**Tiempo:** 8 minutos.

Guarden el tensor de taxis en el menor número de números posible con un error
relativo por debajo del 7%. El explorador empieza en rangos (2, 2, 3): 102
números en lugar de 480, con un 6,7%. Imprime la puntuación bajo los mapas de
calor. Gana quien guarde menos.

- ¿Cuál de los tres rangos pueden recortar más antes de que el error pase del 7%?
- Su entrada puntúa el tensor entero. ¿Podría fallar mucho en una ruta a su hora
  más concurrida? Compruébenlo en el mapa de error del explorador.
- ¿Qué elegiría alguien a quien solo le importa esa ruta?

**Compartan:** Nuestra entrada (rangos · números · error) → el rango que más
recortamos y por qué aguantó → quién rechazaría nuestra entrada.

## 11 · Golf de compresión, hoyo 2

<span data-language-key="11-is-this-comparison-fair"></span>

**Cuándo:** Después del Ejercicio 1 del
[cuaderno 11](../notebooks/11-tensor-factorizations.ipynb), en la celda de golf.
**Tiempo:** 8 minutos: 5 para jugar y 3 para la clasificación.

El hoyo 1 fue Tucker solo, bajo el 7%, y la mejor entrada guardó 60 números.
Ahora CP también está en la bolsa y la barra es del 2%. `golf("cp", 4)` o
`golf("tucker", (4, 4, 3))` ajusta un modelo e imprime su línea de puntuación.
Gana quien guarde menos números por debajo del 2%.

- ¿Qué modelo probaron primero y por qué?
- El Ejercicio 1 fijó el presupuesto y comparó errores. Este hoyo fija el error y
  compara presupuestos. ¿Gana el mismo modelo?
- Un informe dice que CP supera a Tucker con «rango 3». ¿Qué mantuvo fijo?

**Compartan:** Nuestra entrada → la mejor entrada del otro modelo → la barra con
la que ganaría el otro modelo.

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

## 14 · ¿Qué pico publicarías?

<span data-language-key="14-which-peak-would-you-publish"></span>

**Cuándo:** Después del factor de ensayos en el
[cuaderno 14](../notebooks/14-cp-factorization.ipynb).
Solo como actividad posterior.
**Tiempo:** 8 minutos.

Un ajuste CP no negativo de rango 3 les entrega tres componentes, cada una con
un perfil de neuronas, un curso temporal y un peso por ensayo. Una es plana
para los cuatro objetivos; dos son selectivas. Decidan qué afirmarían en el pie
de una figura.

- ¿Qué les permite decir un pico en el perfil temporal, y qué no?
- Dos componentes tienen pesos distintos. ¿Qué se está comparando exactamente?
- Un colega repite el ajuste con otra semilla y obtiene las componentes en otro
  orden. ¿Qué se rompe y qué no?

**Compartan:** Un pie de figura que publicarían y otro que rechazarían, con la
razón. Nombren la comprobación que los separa.

## 15 · ¿Es la ciudad o es el formulario?

<span data-language-key="15-is-it-the-city-or-the-form"></span>

**Cuándo:** Después de la componente de medianoche y mediodía en el
[cuaderno 15](../notebooks/15-generalized-cp.ipynb).
Solo como actividad posterior.
**Tiempo:** 10 minutos.

Un ajuste GCP-Poisson gasta un tercio de su presupuesto de rango 3 en una
componente que se dispara exactamente a las 00:00 y las 12:00. Decidan qué
hacer con ella.

- ¿Qué tendría que ser cierto del *proceso de registro* para que una componente
  se vea así? Nombren otro conjunto de datos donde pudiera pasar lo mismo.
- Tirar esas denuncias, enmascarar esas celdas y dejarlas tal cual son tres
  decisiones distintas. ¿A quién perjudica cada una?
- ¿Se lo habría mostrado un ajuste gaussiano del mismo tensor? ¿Por qué?

**Compartan:** Su decisión y la frase que pondrían en la sección de métodos
para declararla. Digan qué necesitaría un lector para estar en desacuerdo.

## 16 · ¿Qué sombra pertenece al mapa?

<span data-language-key="16-which-shadow-belongs-on-the-map"></span>

**Cuándo:** Después de las tablas comparativas del
[cuaderno 16](../notebooks/16-pca-from-tensors.ipynb). Solo como actividad posterior.
**Tiempo:** 10 minutos.

Su clasificador de cobertura terrestre dispone de doce puntuaciones por
muestra. Comparen PCA denso y multilineal para un estudio con otra escena.

- ¿Qué tabla respalda clasificación y cuál respalda agrupamiento?
- ¿Qué ahorra la representación tensorial y qué restringe?
- ¿Cómo puede el solapamiento de parches hacer optimista la evaluación?

**Compartan:** Una recomendación con un resultado medido, la forma de las
puntuaciones y un plan para reservar otra escena. Expliquen qué no demuestra
la sombra de la caverna.

## 17 · ¿La forma correcta contiene los tokens correctos?

<span data-language-key="17-head-identity"></span>

**Cuándo:** Después de las pruebas del [Cuaderno 17](../notebooks/17-multi-head-attention.ipynb). Solo seguimiento.
**Tiempo:** 8 minutos.

Comparen reshape directo con reshape seguido de transpose. Sigan las
características de un token y expliquen por qué comprobar solo la forma no basta.

**Compartan:** Un valor incorrecto, sus cuatro índices y la permutación correcta.

## 18 · ¿Qué conservó el umbral de energía?

<span data-language-key="18-energy-and-storage"></span>

**Cuándo:** Después de la galería del [Cuaderno 18](../notebooks/18-feature-compression.ipynb). Solo seguimiento.
**Tiempo:** 8 minutos.

Elijan un rango usando la imagen, la curva de energía y el coste de los factores.
Expliquen por qué conservar el 95% de energía puede borrar un detalle importante.

**Compartan:** El rango, la energía retenida, el número de factores escalares y una limitación.

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
