# Dos universos de riesgo

Por qué el riesgo regulatorio y el riesgo de negocio no caben en el mismo FMEA,
y qué hacer al respecto.

**Estado**: análisis con datos medidos. Ninguna decisión aplicada.

---

## 1 · De dónde sale esto

Midiendo por qué el circuito de un sistema resultaba pesado
([circuito.md](circuito.md)) apareció un número que no encajaba: la dimensión
**ROI activa 48 modos de fallo y prioriza cero**. Una dimensión entera que
genera trabajo de activación y ni un solo ítem de evaluación.

No es un fallo de las reglas. Es el motor de prioridad —calibrado con severidad
regulatoria— descartando en silencio una dimensión que no habla su idioma.

## 2 · La intención original es correcta

La idea era: además de los riesgos que derivan de la norma, hay otros que
amenazan la viabilidad de un sistema y también merecen evaluarse. Un riesgo
técnico como «complejidad del sistema» no sale de ningún artículo, pero puede
provocar uno de ROI como «hardware no contemplado en el presupuesto».

Eso está bien pensado, y tiene cobertura normativa: la **ISO/IEC 42001** es una
norma de sistema de gestión, y su evaluación de riesgos mira los objetivos de la
organización, no solo el cumplimiento legal. No es una extensión caprichosa.

## 3 · Lo que no funciona es compartir artefacto

**No comparten escala.** En FMEA la S significa una cosa. La gravedad de
«discriminación a un colectivo protegido» y la de «sobrecoste de
infraestructura» no son conmensurables. En el mismo 1-5, un riesgo
presupuestario puede adelantar a uno de derechos fundamentales.

**No comparten audiencia ni ritmo.** El FMEA regulatorio es evidencia para un
auditor, se conserva diez años (Art. 18) y lo aprueba un comité. El registro de
riesgos de negocio es una conversación con quien paga y se revisa cada
trimestre.

**No comparten consecuencia.** Un riesgo regulatorio sin resolver bloquea la
declaración de conformidad. Uno de ROI sin resolver es una decisión de negocio.
Aplicarles el mismo circuito —plan de tratamiento, aprobación de nivel 3, acta
generada— es proporcionado para uno y excesivo para el otro.

**Y los datos lo confirman.** ROI: 48 activados, 0 priorizados. El modelo ya
está diciendo que esas cosas no van en la misma escala.

## 4 · Lo medido

Catálogo: **418 modos** (llegarán a ~450 con IA agéntica).

Sistema de prueba —evaluador de fraude en tiempo real, alto riesgo:

| Dimensión | Activados | Priorizados |
|---|---|---|
| Seguridad | 74 | 44 |
| Éticas | 45 | 37 |
| Gobernanza | 52 | 15 |
| Técnicas | 50 | 12 |
| Legales Tipo B | 17 | 11 |
| **ROI** | **48** | **0** |
| | **286** | **119** |

Los 119 priorizados caen en **10 familias**, con solapamiento (suman 209
pertenencias, así que un modo pertenece a varias).

## 5 · El ancla que falta

`compliance.failure_modes.rag_chunk_ids` existe para enlazar cada modo con el
texto de la norma del que sale. **Está vacío en los 418.**

Eso significa dos cosas:

1. **La separación no se puede inferir de los datos.** Que un modo no cite la
   norma hoy no dice nada: nadie puso el enlace. Hay que decidirla.
2. **Falta una trazabilidad que vale por sí sola.** Poder decirle a un auditor
   «esto se evalúa porque el artículo 15.4 lo exige» es lo que hace fuerte un
   expediente. Hoy no se puede.

`tipo` no sirve para esto: distingue producto de proceso, que es la
clasificación clásica de FMEA.

## 6 · Propuesta

### 6.1 · Marcar el origen de cada modo

Una columna en `compliance.failure_modes` con la referencia normativa. La regla:
**un modo es regulatorio si se puede citar el artículo del que sale**. Si no hay
artículo, es riesgo de negocio.

⚠️ **No se puede hacer por dimensión.** El artículo 15 exige exactitud, solidez
y ciberseguridad, así que buena parte de los 115 modos técnicos **sí** son
normativos. La marca va por modo.

Para poblarla, 418 modos a mano es una tarde. Pero el corpus de la norma ya está
en el RAG: un agente puede proponer el artículo de cada modo y una persona
confirmar. Es exactamente el patrón de C2 —la IA propone, el humano decide, la
discordancia se registra— aplicado al propio producto.

### 6.2 · Separar el registro de negocio

Los modos sin ancla normativa salen del FMEA y van a un registro propio, con:

- **Escala clásica** de probabilidad e impacto, no S/O/D. Estimar la severidad
  de un sobrecoste con la escala de un daño a personas es forzado, y además
  rellenarlo cuesta menos.
- **Sin comité ni retención de diez años.** No es evidencia regulatoria.
- **Formato reconocible** para quien patrocina el proyecto, que es su audiencia
  real.

### 6.3 · Evaluación por familia en el FMEA regulatorio

Los 119 priorizados caen en 10 familias. Fijar O y D por familia y ajustar
después los que se salgan convierte 119 decisiones en 10 más los ajustes.

**No rebaja el rigor.** Estimar por familia causal y refinar las excepciones es
práctica estándar de FMEA; el Art. 9 exige que la estimación esté documentada y
justificada, no que se haga de una en una. La justificación incluso mejora:
«estos 30 modos comparten causa y control, y por eso comparten O y D» dice más
que treinta justificaciones copiadas.

⚠️ **Falta decidir la regla de solapamiento**: cuando un modo pertenece a dos
familias con valores distintos, lo defendible es que mande el más severo — pero
es una decisión que hay que tomar y dejar escrita, no un detalle de
implementación.

## 7 · Qué NO resuelve esto

Quitar ROI del FMEA **no baja mucho la carga**: priorizaba cero. El recorte de
trabajo real viene de las familias, no de la separación.

La separación se hace por otro motivo: porque mezclar dos escalas incompatibles
produce un artefacto que no sirve bien ni al auditor ni al patrocinador. Es una
cuestión de que cada cosa signifique algo, no de ahorrar clics.

## 8 · Orden sugerido

1. **Decidir la regla de solapamiento** de familias. Barato y desbloquea lo
   siguiente.
2. **Evaluación por familia.** Es donde está el ahorro real: de 119 a 10.
3. **Marcar el origen normativo** de los 418 modos, con ayuda del agente. Aporta
   trazabilidad aunque no se separe nada.
4. **Separar el registro de negocio.** Lo más caro, y lo que menos urge una vez
   hecho lo anterior.
