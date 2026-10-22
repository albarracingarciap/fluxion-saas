---
id: NEG-CLASIFICACION
titulo: Clasificación AI Act
tipo: negocio
modulo: clasificacion-ai-act
audiencia: comercial
version: 0.1
fuente:
  - apps/web/lib/ai-act/index.ts
  - apps/web/lib/ai-act/rules.ts
  - apps/web/lib/ai-act/fallback.ts
  - apps/web/lib/ai-act/obligations.ts
  - apps/web/lib/ai-systems/scoring.ts
  - apps/web/app/(app)/inventario/nuevo/actions.ts
  - apps/web/app/(app)/inventario/[id]/editar/actions.ts
  - apps/web/app/api/v1/systems/[systemId]/reconcile/route.ts
  - apps/web/app/(app)/inventario/actions/classification.ts
  - apps/web/app/(app)/inventario/[id]/system-detail-client.tsx
  - apps/web/components/classification/ReconciliationPanel.tsx
  - apps/web/app/api/v1/systems/[systemId]/reclassify-ai/route.ts
  - services/agents/fluxion_agents/routes/classification.py
  - services/agents/fluxion_agents/prompts/classification.py
  - services/agents/fluxion_agents/rag/retriever.py
  - supabase/migrations/20261022090000_ai_act_motor_unico.sql
  - apps/web/lib/preliminary-questionnaire/to-aiact.ts
---

# Clasificación AI Act

La [clasificación AI Act](../glosario.md#clasificación-ai-act) determina el
[nivel de riesgo AI Act](../glosario.md#nivel-de-riesgo-ai-act) de cada
[sistema de IA](../glosario.md#sistema-de-ia) y, con él, las [obligaciones](../glosario.md#obligación)
que le aplican. Fluxion la propone a partir de los datos del inventario y una persona concilia cualquier cambio.

## Propósito

Encuadrar cada sistema en una categoría del Reglamento con una justificación trazable, y mantener la
clasificación al día cuando el sistema cambia. Forma parte del [Core](../glosario.md#core).

## Problema que resuelve

Clasificar un sistema exige recorrer las prácticas prohibidas, los supuestos de alto riesgo del
Anexo III y las obligaciones de transparencia, y documentar por qué se llega a una conclusión. Hacerlo a
mano es lento, poco homogéneo entre equipos y difícil de mantener cuando el sistema evoluciona. Fluxion
aporta:

- **Propuesta inmediata:** al dar de alta un sistema se obtiene una primera clasificación por reglas.
- **Un único criterio:** el alta, la edición, la revisión manual y la pantalla de clasificación aplican
  las mismas reglas, de modo que un sistema no recibe conclusiones distintas según dónde se mire. Cada
  resultado guarda su fundamento, los avisos sobre datos que faltan o se contradicen y la versión de las
  reglas con que se calculó.
- **Análisis asistido por IA:** el [Asistente de clasificación AI Act](../glosario.md#asistente-de-clasificación-ai-act)
  analiza el sistema con el texto del Reglamento y las guías de las autoridades, y señala cuándo su
  conclusión no coincide con la de las reglas.
- **Decisión humana:** ningún cambio de clasificación se aplica hasta que una persona concilia sus
  efectos sobre las obligaciones.
- **Versiones:** cada clasificación queda registrada con su método, su fecha y su autor. Si una
  reclasificación cambia las obligaciones, la organización decide qué hacer con cada una antes de que
  se aplique.

## Roles

| Rol | Responsabilidad |
|---|---|
| Analista de cumplimiento | Lanza la clasificación con IA o la revisión manual y concilia las obligaciones tras una reclasificación |
| Responsable del sistema | Mantiene los datos del sistema de los que depende la clasificación |
| Responsable del SGAI | Supervisa la clasificación de la cartera de sistemas |
| Directivo, Auditor, Lector | Consultan la clasificación y su historial |

> **Pendiente de definir.** Qué roles pueden reclasificar y conciliar. Hoy lo puede
> hacer cualquier miembro de la organización.

## Flujo de trabajo

```mermaid
flowchart TD
  A[Alta del sistema] --> B[Clasificación inicial<br/>por reglas]
  B --> C[Ficha del sistema]
  C --> D{¿Reclasificar?}
  D -->|Clasificar con IA| E[Propuesta del asistente<br/>con base normativa]
  D -->|Revisión manual| F[Factores ajustados<br/>por una persona]
  D -->|Edición de los datos| G[Reclasificación<br/>propuesta]
  E --> H{¿Cambian el nivel o<br/>las obligaciones?}
  F --> H
  G --> H
  H -->|No| I[Se mantiene la clasificación]
  H -->|Sí| J[Conciliación de obligaciones<br/>por una persona] --> K[Nueva versión vigente]
```

1. **Clasificación inicial.** Al dar de alta el sistema, el motor de clasificación de Fluxion lo
   clasifica. Primero comprueba si el sistema está dentro del [ámbito del AI Act](../glosario.md#ámbito-del-ai-act): si no es un sistema de IA
   o está excluido (por ejemplo, por uso exclusivamente militar o de investigación), el resultado es «No
   es un sistema de IA» o «Fuera del ámbito», sin nivel de riesgo. Dentro del ámbito, aplica un orden
   fijo:
   - si presenta una práctica prohibida, es «Práctica prohibida»;
   - si encaja en un supuesto de alto riesgo (Anexo I o Anexo III, por ejemplo, biometría, empleo o
     servicios esenciales), «Alto riesgo»;
   - si tiene obligaciones de transparencia, «Riesgo limitado»;
   - en el resto de casos, «Riesgo mínimo».

   Si faltan datos para decidir, figura como «Pendiente de clasificar». Con la clasificación se generan
   las obligaciones sugeridas, según el nivel de riesgo y el papel de la organización en la cadena de
   valor.

   El motor trabaja con los **supuestos del AI Act** de cada sistema (exclusiones, prácticas
   prohibidas, anexos, excepciones y transparencia). Cuando un sistema no los tiene, hace una
   **clasificación aproximada** a partir del sector de aplicación y del tipo de resultado, y la marca con
   un aviso para que se revise.

   El [cuestionario preliminar](../glosario.md#cuestionario-preliminar) ya recoge los supuestos del AI
   Act y propone con ellos una clasificación preliminar, que se guarda al completarlo.

   > **Pendiente de implementar.** Llevar los supuestos del cuestionario preliminar al alta del sistema y
   > recogerlos en el propio alta. Hasta entonces, las clasificaciones de los sistemas son aproximadas.
2. **Clasificación con IA.** Desde la ficha se puede pedir una clasificación al asistente. Este sigue
   el árbol de decisión del AI Act:
   - prácticas prohibidas (Art. 5);
   - modelo de uso general (Art. 51 a 55);
   - alto riesgo (Art. 6, Anexos II y III);
   - transparencia (Art. 50);
   - papel de proveedor o responsable del despliegue.

   Se apoya en el [corpus normativo](../glosario.md#corpus-normativo) y usa el resultado del motor de
   clasificación como referencia: si sus conclusiones no coinciden, lo indica en la explicación. Si la clasificación
   propuesta es la misma que la vigente, Fluxion lo comunica y no cambia nada.
3. **Revisión manual.** Una persona puede ajustar los factores que determinan la clasificación (dominio,
   tipo de resultado, si afecta a personas, biometría, infraestructura crítica, modelo de uso general…).
   Antes de guardar ve la clasificación resultante y sus obligaciones.
4. **[Reclasificación](../glosario.md#reclasificación).** La clasificación con IA, la revisión manual y
   la edición de los datos del sistema, si cambian el nivel de riesgo o el conjunto de obligaciones,
   crean una reclasificación pendiente. Editar los datos del sistema nunca cambia la clasificación por sí
   solo: la propone y queda constancia en el historial del sistema. Solo puede haber una reclasificación
   pendiente por sistema, y se puede cancelar.
5. **Conciliación de obligaciones.** Si la nueva clasificación cambia el conjunto de obligaciones,
   Fluxion muestra la diferencia y pide una decisión:
   - **Obligaciones nuevas:** se aceptan o se excluyen.
   - **Obligaciones que desaparecen y ya tenían trabajo** (en curso o resueltas): se conservan activas
     o se archivan con una nota.
   - **Obligaciones que desaparecen sin trabajo:** se archivan automáticamente.
   - **Obligaciones que no cambian:** se conservan.

   Al terminar, la nueva clasificación pasa a ser la vigente, con su nivel, su fundamento y su
   explicación; la anterior queda en el histórico y el historial del sistema registra la conciliación.

Un sistema clasificado como «Práctica prohibida» no puede desplegarse en la UE: Fluxion lo indica como
retirada o rediseño obligatorio.

**Modelos de IA de uso general.** No son un nivel de riesgo, sino una
[categoría aparte](../glosario.md#categoría-gpai): un sistema basado en un modelo de uso general se
clasifica por lo que hace. Si la organización es proveedora de un modelo de uso general, se le suman las
obligaciones de proveedor de modelo (Art. 53, y Art. 55 si el modelo tiene riesgo sistémico).

> **Pendiente de implementar.** Los sistemas que ya figuraban con el nivel «Modelo de IA de uso general»
> se trasladarán a la categoría aparte y quedarán «Pendiente de clasificar».

**Sistemas clasificados antes del motor actual.** No se reclasifican de forma automática: muestran el
aviso «Pendiente de revisar con el motor nuevo» hasta que una persona revisa su clasificación y concilia
el resultado.

## Relación normativa

| Norma | Referencia | Qué cubre la clasificación |
|---|---|---|
| AI Act | Art. 2 y Art. 3.1 | Ámbito de aplicación: exclusiones y definición de sistema de IA |
| AI Act | Art. 5 | Detección de prácticas prohibidas |
| AI Act | Art. 6, Anexo I y Anexo III | Determinación del alto riesgo, por ámbito de uso o como componente de seguridad de un producto regulado, y excepción del Art. 6.3 |
| AI Act | Art. 50 | Obligaciones de transparencia (riesgo limitado) |
| AI Act | Art. 3.63 y Art. 51 a 55 | Modelos de IA de uso general y riesgo sistémico |
| AI Act | Art. 3.3, 3.4 y 25 | Papel de proveedor o responsable del despliegue |

> TODO: confirmar si la propuesta comercial debe mencionar que el resultado es una propuesta de apoyo
> y no un dictamen jurídico. El código siempre exige que una persona concilie los cambios, pero no muestra ningún aviso
> legal.

## Módulos relacionados

- **[Inventario de sistemas de IA](inventario.md):** aporta los datos de entrada.
- **[Obligaciones](obligaciones.md):** se generan y concilian a partir de la clasificación.
- **[Análisis de modos de fallo (FMEA)](analisis-modos-de-fallo.md):** el nivel de riesgo fija el
  [suelo AI Act](../glosario.md#suelo-ai-act) de la zona de riesgo.
- **Informes del sistema:** la ficha para el registro UE solo aplica a sistemas de alto riesgo.
- **Vistas:** [Ficha del sistema](../funcional/ficha-sistema.md). **Técnico:** [Servicio de agentes](../tecnica/servicio-agentes.md),
  [RAG y corpus normativo](../tecnica/rag.md).
