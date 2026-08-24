# Plan de acción · riesgo y obligaciones

Qué hacer, en qué orden y por qué. Junta lo que salió disperso en
[circuito.md](circuito.md), [dos-universos-de-riesgo.md](dos-universos-de-riesgo.md),
[mapeo-subcategorias.csv](mapeo-subcategorias.csv) y
[obligaciones-ai-act.csv](obligaciones-ai-act.csv).

**Nada de esto está aplicado.** Todo lo commiteado hasta ahora son documentos y
análisis: no se ha tocado ni una línea de código ni una fila de la base.

---

## De dónde venimos

El circuito de evaluar un sistema resultaba pesado. Al medirlo salió que un
sistema activa **286 modos de fallo**, de los que **119 hay que evaluar a mano**:
unas seis horas de trabajo experto. Buscando por qué, aparecieron tres cosas más
que no buscábamos:

1. Una dimensión entera (**ROI**, 53 modos) que no es riesgo regulatorio y
   ensucia la escala del FMEA.
2. El catálogo **no registra de qué artículo sale cada modo**, aunque se
   construyó leyendo la norma.
3. El inventario de obligaciones tiene **19 entradas**, así que no hay contra
   qué medir si falta algo.

---

## Decisiones tomadas

**D1 · Solapamiento de familias** → manda el **valor más severo**. Ante dos
estimaciones, en gestión de riesgos se toma la peor.

**D2 · Mapeo de subcategorías** → aceptado. Quedan por revisar las 15 marcadas
con confianza media o baja en `mapeo-subcategorias.csv`.

**D3 · Inventario de obligaciones** → aceptado, **sin borrar ninguno**.

⚠️ *Aquí me equivoqué al recomendar.* Dije que los de prioridad baja
—importadores, distribuidores, representantes autorizados— probablemente no
aplicarían «a tus clientes». Eso era una suposición sobre el segmento, y además
mal planteada: **el Reglamento reparte obligaciones por ROL en la cadena de
valor, no por sector**. Un banco, un hospital y una aseguradora pueden ser
proveedor, responsable del despliegue, importador o las tres cosas según qué
hagan con cada sistema.

Y el **Art. 25** convierte a un responsable del despliegue **en proveedor** si le
pone su marca al sistema, lo modifica sustancialmente o le cambia la finalidad.
Un cliente puede cambiar de rol sin darse cuenta.

El catálogo describe la norma, no al cliente: recoge todos los roles y el
filtrado se hace en ejecución. «Prioridad baja» es orden de implementación, no
criterio de inclusión.

**D4 · «Buena práctica» como categoría propia** → sí. Son 78 modos de generativa
y agéntica que van por delante de la norma: se siguen evaluando, pero no fingen
una exigencia que no existe.

## Lo que apareció al revisar D3

**El rol no se puede declarar.** El único campo parecido es
`ai_systems.provider_origin` —`interno`, `proveedor`, `saas`, `oss`— pero eso
dice de dónde viene el sistema, no qué papel juega la organización frente a la
norma. Se parecen y no son lo mismo: puedes usar un sistema `saas` y ser
proveedor a efectos del Reglamento si le pones tu marca.

Hace falta declarar el rol **por sistema** —no por organización, porque varía— y
que las obligaciones lleven a qué rol aplican. Sin eso, el inventario ampliado
enseñaría a un responsable del despliegue obligaciones de importador.

Va como **paso 1 bis**.

---

## Los pasos

### Paso 0 · Corregir la confusión entre el Art. 27 y el Art. 72

**Qué**: la fila `AI-ACT-ART72` **es** el artículo 27: su título y su
descripción hablan de la FRIA («antes del despliegue, los desplegadores…»). Lo
equivocado es el código y el número. Se renumera a `AI-ACT-ART27` / `Art. 27`, y
se añade el 72 de verdad —vigilancia poscomercialización—, que hoy no existe
porque su código estaba ocupado.

**Por qué**: es la única cosa de toda la lista que hoy **afirma algo falso sobre
la norma**.

**Coste**: un `UPDATE` y un `INSERT`. No depende de ninguna decisión.

### Paso 1 · Completar el inventario de obligaciones

**Qué**: añadir a `compliance.obligations` los artículos confirmados en D3.

**Por qué**: es el listón. Sin él, «¿me falta algún modo de fallo?» no tiene
respuesta — que era la pregunta de partida.

**Después**: una consulta dice qué obligaciones no tiene ningún modo detrás. Ahí
sabrás si faltan modos, y cuáles.

**Depende de**: D3.

### Paso 1 bis · Declarar el rol en la cadena de valor

**Qué**: campo de rol por sistema (proveedor, responsable del despliegue,
importador, distribuidor, representante autorizado) y `applies_to_role` en las
obligaciones.

**Por qué**: sin esto, el inventario ampliado enseña a todo el mundo las
obligaciones de todos los roles. Y el Art. 25 hace que el rol pueda cambiar,
así que tiene que ser un dato revisable, no una suposición.

**Depende de**: paso 1.

### Paso 2 · Marcar el origen normativo de los modos

**Qué**: tabla `failure_mode_norm_refs` (modo, marco, artículo, quién lo
confirmó), poblada desde el mapeo por subcategoría, con excepciones por modo.

**Por qué**: dos cosas a la vez. Permite separar lo regulatorio de lo que no lo
es, y —más importante— permite decirle a un auditor **«esto se evalúa porque el
Art. 15.4 lo exige»**. Hoy eso no se puede.

**Coste**: el mapeo ya está hecho a nivel de subcategoría; es un `INSERT`
derivado más los ajustes que marques.

**Depende de**: D2, D4.

### Paso 3 · Sacar el riesgo de negocio del FMEA

**Qué**: los modos marcados como `negocio` (unos 64) dejan de generar ítems de
FMEA.

**Por qué**: no comparten escala con los regulatorios. La gravedad de un
sobrecoste y la de una discriminación no son comparables en el mismo 1-5.

**Aviso honesto**: **esto casi no baja la carga**. ROI ya priorizaba cero. Se
hace para que cada cosa signifique algo, no para ahorrar clics.

**Depende de**: paso 2.

### Paso 4 · Evaluación por familia

**Qué**: fijar O y D por familia —10 en vez de 119— y ajustar individualmente
los que se salgan.

**Por qué**: **aquí está el ahorro real.** De 119 decisiones a 10 más
excepciones.

**Cómo no perder rigor**: cada ítem conserva su O, su D y su S; se registra si
el valor vino de la familia o se ajustó a mano. La justificación mejora: «estos
30 modos comparten causa y control» dice más que 30 textos copiados.

**Depende de**: D1.

**Es el paso más delicado**: toca el núcleo del FMEA, que es la parte más
probada del producto. Se haría **sin quitar la evaluación individual** —
coexisten, y el cambio es reversible.

### Paso 5 · Registro de riesgos de negocio

**Qué**: pantalla propia para los modos de negocio, con probabilidad e impacto
en vez de S/O/D, sin comité y sin retención de diez años.

**Por qué**: para que esos riesgos no se pierdan al salir del FMEA.

**Se puede diferir.** Hasta que exista, los modos de negocio quedan marcados
pero sin pantalla donde trabajarlos.

---

## Resumen

| Paso | Depende de | Efecto |
|---|---|---|
| 0 · Corregir Art. 27 / 72 | — | Deja de mentir sobre la norma |
| 1 · Completar obligaciones | D3 | Permite saber qué falta |
| 1 bis · Declarar el rol | Paso 1 | Cada uno ve lo que le obliga |
| 2 · Marcar el origen | D2, D4 | Trazabilidad y base para separar |
| 3 · Sacar negocio del FMEA | Paso 2 | Coherencia de escala |
| 4 · Evaluación por familia | D1 | **De 119 decisiones a 10** |
| 5 · Registro de negocio | Paso 3 | Cierra el círculo |

Los pasos 0 y 1 se pueden hacer mañana y no rompen nada. El 4 es el que resuelve
el problema que originó todo esto.
