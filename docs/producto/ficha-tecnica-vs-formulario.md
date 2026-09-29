# Ficha técnica de sistema de IA vs. formulario de alta de Fluxion

Comparación entre la **Ficha Técnica de Sistema de Inteligencia Artificial** de Indra
(`SGIA_INDRA_Ficha_CrowdStrike`, v1.0 de 03/07/2026, elaborada a partir de la EIPD ref.
EIPD0726) y el **formulario de alta de sistemas** de Fluxion
(`apps/web/components/inventory/SystemWizard.jsx`, 7 pasos, y las columnas que persiste
`app/(app)/inventario/nuevo/actions.ts` sobre `fluxion.ai_systems`).

El objetivo es saber qué pediría un cliente como Indra que Fluxion hoy no recoge, y
distinguir tres cosas distintas que se confunden con facilidad:

- **A — Lo recoge el formulario.** Hay un campo y se guarda.
- **B — Lo recoge Fluxion, pero en otro sitio.** No es un hueco del producto: es que ese
  dato no vive en la ficha del sistema sino en otro módulo.
- **C — No lo recoge nadie.** Hueco real. Aquí es donde hay que decidir.

---

## 1. Resumen ejecutivo

De los **14 apartados** de la ficha:

| | Apartados |
|---|---|
| Cubiertos sustancialmente por el formulario | 1, 2, 3, 11 (parcial) |
| Cubiertos por el formulario + otro módulo de Fluxion | 8, 10, 14 |
| Cubiertos sólo parcialmente, con huecos relevantes | 4, 5, 12, 13 |
| Prácticamente no cubiertos | 6, 7, 9 |

**El patrón de la diferencia no es aleatorio.** La ficha de Indra nace de una EIPD: es un
documento **RGPD-first** sobre un sistema **de tercero**. Por eso pregunta por contrato,
DPA, encargado y subencargados, transferencias internacionales, localización de los
servidores, derechos de los interesados y canal de información. El formulario de Fluxion
es **AI-Act-first**: pregunta por nivel de riesgo, prácticas prohibidas del Art. 5, GPAI,
rol en la cadena de valor y tipo de output.

Ninguno de los dos es un superconjunto del otro. La ficha de Indra **no contiene nada** de
clasificación AI Act (ni Anexo III, ni Art. 5, ni GPAI, ni obligaciones por rol); el
formulario de Fluxion **no contiene casi nada** de la relación contractual con el
proveedor. Cada uno es ciego donde el otro mira.

Los tres huecos con más peso, por orden:

1. **La relación con el proveedor no existe como dato** (apartados 4, 7, 13): ni contrato,
   ni DPA, ni fecha, ni referencia, ni subencargados, ni instrucciones de uso del
   proveedor. Esto último es especialmente llamativo porque el **Art. 13 del Reglamento**
   obliga al proveedor a entregar instrucciones de uso, y el responsable del despliegue
   sólo puede cumplir el **Art. 26.1** («utilizarlos con arreglo a las instrucciones de
   uso») si sabe dónde están. Fluxion guarda un `has_tech_doc` sí/no y nada más.
2. **El alojamiento y los datos del sistema son opacos** (apartado 5): no hay modalidad de
   alojamiento, ni región de los servidores, ni bases de datos, ni sistemas con los que se
   interconecta. `intl_data_transfers` es un booleano sin mecanismo: se sabe que los datos
   salen del EEE, no con qué garantía.
3. **Las medidas de seguridad son un hueco completo** (apartado 6): control de acceso,
   cifrado, gestión de vulnerabilidades, certificaciones vigentes del proveedor. Fluxion
   tiene `has_logging` y poco más.

---

## 2. Comparación apartado por apartado

### 1. Identificación del sistema — **A, casi completo**

| La ficha pide | Fluxion | |
|---|---|---|
| Nombre del sistema | `name` (paso 1) | A |
| Código / identificador interno | `internal_id` | A |
| Versión del sistema | `version` (semver sugerido) | A |
| Área responsable del sistema | `responsible_team` (paso 6) | A |
| Áreas implicadas en implementación y desarrollo | — | **C** |
| Fecha de elaboración de la ficha | `created_at` implícito; los documentos generados llevan fecha | B |

Fluxion además pide `domain`, `status` y `deployed_at`, que la ficha no tiene.

El único hueco, **«áreas implicadas»**, es menor y de bajo coste: hoy hay un solo equipo
responsable y tres roles nominales (`ai_owner`, `tech_lead`, `executive_sponsor`), pero no
una lista de áreas participantes. En el caso CrowdStrike son tres (Seguridad de la
Información, SOC, CSIRT).

### 2. Objetivos y descripción del sistema — **A**

La ficha separa **objetivos** (para qué existe) de **descripción funcional** (qué hace).
Fluxion separa **descripción para directivos** de **descripción técnica**. Son dos ejes
distintos —finalidad/función frente a audiencia— pero en la práctica el contenido cabe:
los objetivos van en la descripción para directivos y la descripción funcional en la
técnica. No hay hueco material, sí una diferencia de nomenclatura que conviene tener
presente al generar el documento.

### 3. Usos previstos del sistema — **A con un matiz**

| La ficha pide | Fluxion | |
|---|---|---|
| Uso principal | `intended_use` | A |
| Usos secundarios / derivados | — (caben en el mismo texto libre) | **C parcial** |
| Usos excluidos / no previstos | `prohibited_uses` | A |
| Escala de despliegue y nº de usuarios | `usage_scale` + `target_users` | A |

La ficha distingue **uso principal** de **usos secundarios o derivados**, y esa distinción
tiene consecuencias: la propia ficha anota que *«cualquier nuevo uso o funcionalidad del
proveedor debe desencadenar un nuevo ciclo de revisión del riesgo»*. Un campo separado
para usos derivados es lo que permite detectar después que apareció uno nuevo. Con un
único texto libre, eso se pierde.

### 4. Modelo de desarrollo y responsabilidad — **A en el rol, C en el contrato**

| La ficha pide | Fluxion | |
|---|---|---|
| Desarrollado internamente / de tercero | `provider_origin` (interno/proveedor/saas/oss) | A |
| Rol de la compañía (desarrolladora / responsable del despliegue) | `value_chain_roles`, con más precisión que la ficha: 5 roles del Reglamento, no excluyentes | **A, mejor** |
| Nombre del proveedor del sistema | `external_provider` | A |
| **Fecha del contrato suscrito** | — | **C** |
| **Referencia / número de contrato** | — | **C** |
| **DPA suscrito (sí/no, referencia)** | — | **C** |
| **Alcance del contrato**: documentación técnica, SLA, seguridad, privacidad, subproveedores, cambios de modelo, uso de datos, continuidad | — | **C** |

Aquí Fluxion es **mejor que la ficha en el rol** y **peor en todo lo demás**. La ficha
ofrece dos casillas excluyentes (desarrolladora o responsable del despliegue); Fluxion
modela los cinco roles del Reglamento y permite marcar varios, que es lo correcto —
desarrollar algo y usarlo internamente es ser proveedor *y* responsable del despliegue, y
el Art. 25 puede convertir a un responsable del despliegue en proveedor.

Pero el **expediente contractual no existe en Fluxion**. Ni fecha, ni referencia, ni DPA,
ni qué cubre el contrato. Y la lista de materias que la ficha enumera —cambios de modelo,
uso de datos, continuidad, subproveedores— es exactamente lo que el Art. 25.4 exige pactar
por escrito con el proveedor de un componente.

### 5. Alojamiento y bases de datos — **C mayoritariamente**

| La ficha pide | Fluxion | |
|---|---|---|
| Modalidad de alojamiento (cloud proveedor / cloud propia / on-premise) | Se infiere de `provider_origin = saas`, pero no se pregunta | **C** |
| Proveedor de infraestructura / cloud | `external_provider` sirve si coincide con el del sistema; no si difieren | C parcial |
| **Localización geográfica de los servidores** | — (`geo_scope` es geografía de *despliegue*, no de alojamiento) | **C** |
| ¿Salen datos del EEE? | `intl_data_transfers` (booleano) | A parcial |
| **Mecanismo de transferencia (DPF, SCC, BCR)** | — | **C** |
| Entornos de producción / desarrollo / pruebas | `active_environments` | A |
| **Bases de datos: nombre, descripción** | — | **C** |
| **Localización de las bases de datos** | — | **C** |
| **Titularidad de las bases de datos** | — | **C** |
| **Sistemas corporativos con los que se interconecta** | — | **C** |
| **Tipo de conexión / integración** | — | **C** |

Este es el apartado con más huecos y el más fácil de defender como necesario: es el que
responde *dónde están los datos y con qué se habla el sistema*. Sin él no se puede razonar
sobre transferencias internacionales, ni sobre dependencias, ni sobre el alcance de una
brecha.

`intl_data_transfers` merece una mención aparte: **saber que los datos salen del EEE sin
saber bajo qué garantía es peor que no preguntarlo**, porque da la apariencia de haberlo
cubierto. La ficha de Indra responde «sí» y a continuación nombra tres mecanismos
distintos (DPF, SCCs, BCRs). Fluxion guarda un `true`.

### 6. Requisitos técnicos mínimos de seguridad — **C casi completo**

La ficha pide, para cada requisito, **descripción de aplicación + estado de
implementación**:

| Requisito | Fluxion | |
|---|---|---|
| Control de acceso y autenticación | — | **C** |
| Cifrado de datos (tránsito / reposo) | — | **C** |
| Gestión de logs y auditoría | `has_logging` (sí/no/parcial) | A parcial |
| Gestión de vulnerabilidades y parcheado | — | **C** |
| Detección y gestión de incidentes | Módulo **Incidentes** con plazos del Art. 73; `incident_contact` en la ficha | **B** |
| Cumplimiento de estándares de seguridad (certificaciones del proveedor) | `cert_status` se refiere a la conformidad *del sistema*, no a las certificaciones *del proveedor* | **C** |
| Activo de información del SGSI asociado | — | **C** |
| Marco normativo interno aplicable (políticas, manuales, instrucciones) | — | **C** |

Dos observaciones sobre este apartado.

La primera: la referencia a **políticas internas** (POL-MNF-0117, MAN-MNF-0856…) aparece
en la ficha dos veces — aquí y en los criterios de aceptación del apartado 9. Fluxion no
tiene ningún sitio donde un sistema declare a qué normativa interna está sujeto. Es un
hueco pequeño de implementar y con valor de auditoría alto.

La segunda: Fluxion **sí** tiene el concepto de «estado de implementación» en el catálogo
de controles y en el módulo de GAPs, pero no vinculado a estos requisitos concretos ni al
sistema. Esto es más un problema de conexión que de ausencia.

### 7. Documentación técnica del proveedor — **C casi completo**

| La ficha pide | Fluxion | |
|---|---|---|
| Documentación técnica del proveedor (ubicación / repositorio) | `has_tech_doc` sí/no; el módulo **Evidencias** puede alojar el fichero, pero no hay vínculo estructurado | C parcial |
| **Declaración de conformidad del proveedor** | — | **C** |
| **Condiciones de uso y restricciones impuestas por el proveedor** | — | **C** |
| **Instrucciones de uso facilitadas por el proveedor (Art. 13)** | — | **C** |
| **Responsable de la gestión documental con el proveedor** | — | **C** |

Ya señalado en el resumen: este es el hueco con mayor consecuencia normativa. El Art. 26.1
obliga al responsable del despliegue a usar el sistema conforme a las instrucciones de uso.
Fluxion pregunta si hay documentación técnica y no pregunta dónde está ni qué dice.

### 8. Verificación y validación — **A + B, Fluxion va más lejos**

| La ficha pide | Fluxion | |
|---|---|---|
| Medidas de verificación y validación definidas | `has_risk_assessment`, `dpia_completed`, `residual_risk`, `mitigation_notes` | A |
| Análisis de riesgos inherentes y residuales con valores | Módulos **FMEA** (418+ modos de fallo, RPN, riesgo residual), **AISIA**, **Riesgos de negocio** | **B, mucho más completo** |
| Verificación de certificaciones del proveedor | — | C (ver apartado 6) |
| **Responsable de la verificación** | — | **C** |
| **Responsable de la validación** | — | **C** |
| **Referencia al procedimiento / protocolo aplicable** | — | **C** |

Este apartado es el mejor argumento de Fluxion frente a la ficha: donde Indra escribe
*«riesgo acumulado MEDIO 3,55 / residual BAJO 2,55»* como dos números en una celda,
Fluxion tiene la evaluación que los produce, trazable modo a modo, con su histórico y su
propagación.

Lo que falta son **las personas**: quién verifica y quién valida. Fluxion tiene `ai_owner`,
`tech_lead`, `executive_sponsor` y `dpo_involved`, que no son lo mismo.

### 9. Medidas para el despliegue — **C, con una parte fuerte en B**

| La ficha pide | Fluxion | |
|---|---|---|
| Medidas adoptadas para el despliegue | — | **C** |
| **Plan de despliegue (referencia documental)** | — | **C** |
| **Responsable del despliegue** | — | **C** |
| Responsable de la validación previa al despliegue | Módulo **Aprobaciones (C3)**: circuito con pasos, decisores, delegaciones y **acta generada**, inmutable | **B, muy superior** |
| **Criterios de aceptación para el despliegue** | — | **C** |

La «validación previa al despliegue» con firma es literalmente lo que el módulo de
aprobaciones hace, con la diferencia de que el acta se genera desde los datos en lugar de
redactarse a mano. Pero **no está conectada al sistema como un hito de despliegue**: hoy la
aprobación cuelga de un objeto (una evaluación, un plan de tratamiento), no de «este
sistema puede desplegarse».

Los **criterios de aceptación** merecen una nota: en la ficha de Indra son verificables
(«riesgo residual en nivel BAJO, valor ≤ 2,55», «DPA formalizado»). Fluxion tiene los
números para comprobar el primero automáticamente y no tiene dónde escribir el umbral.

### 10. Seguimiento, rendimiento, soporte y actualizaciones — **A + B con huecos**

| La ficha pide | Fluxion | |
|---|---|---|
| Medidas de seguimiento y monitorización del rendimiento | Módulo **Observabilidad** + `mlops_integration` | B |
| Procedimiento ante fallos, incidentes o comportamientos inesperados | Módulo **Incidentes** (Art. 73) | B |
| **Proceso de reparaciones y correcciones** | — | **C** |
| **Proceso de actualizaciones y nuevas versiones** | — | **C** |
| Soporte técnico (responsable / proveedor) | `has_sla` **booleano**; no hay niveles ni proveedor de soporte | C parcial |
| Responsable del seguimiento operativo | `ai_owner` se le aproxima | A parcial |
| Periodicidad de revisión, última revisión, próxima | `review_frequency`, `last_review_date`, `next_audit_date` | **A, mejor que la ficha** |

`has_sla` es el mismo problema que `intl_data_transfers`: un booleano donde hace falta un
dato. Saber que *hay* SLA sin saber cuál no permite verificar nada.

El **proceso de actualizaciones** es el hueco de fondo de este apartado, y es el mismo que
la propia ficha señala como disparador de revisión: si el proveedor cambia el modelo, hay
que reevaluar. Fluxion no tiene dónde registrar cómo se entera de ese cambio.

### 11. Gobernanza de datos — **A en el qué, C en el quién**

| La ficha pide | Fluxion | |
|---|---|---|
| **Responsable de la adquisición y selección de datos** | — | **C** |
| **Responsable de la calidad de los datos** | — | **C** |
| **Responsable de la gobernanza de datos** | — | **C** |
| Categorías de datos (ordinarios / especiales / penales / menores / vulnerables) | `data_categories`, `special_categories`, `involves_minors`, `vulnerable_groups` | **A, más granular** |
| Descripción de los datos (texto) | — (sólo categorías cerradas) | C menor |
| Volumen aproximado y nº de sujetos afectados | `data_volume`; **el nº de interesados no se pide** | A parcial |
| Procedencia de los datos | `data_sources` (8 opciones) | A |
| ¿Se usan datos de terceros? | Cubierto por `data_sources` | A |
| Exactitud y actualización | — | **C** |
| Conservación y destrucción | `data_retention` (plazo); **el procedimiento de destrucción no** | A parcial |
| Datos inferidos / generados | — | **C** |

Las **tres responsabilidades sobre datos** son el hueco más repetido de toda la ficha
(aparece también en 7, 8, 9 y 10): la ficha nombra a un responsable por función, Fluxion
nombra a un responsable por sistema. Son modelos distintos y merece la pena decidirlo
explícitamente en vez de ir añadiendo campos de persona uno a uno.

**Datos inferidos o generados** es un hueco propio y no trivial: en un sistema de IA, lo
que el sistema *produce* sobre una persona suele ser más sensible que lo que consume.

### 12. Información a facilitar a los usuarios — **C casi completo**

| La ficha pide | Fluxion | |
|---|---|---|
| Identificación del sistema y finalidad, comunicada al usuario | Los datos existen; **no que se hayan comunicado** | **C** |
| Interacción con tecnología de IA (Art. 50) | `interacts_persons` y la obligación aparece en `v_system_obligations`; no el texto ni el canal | C parcial |
| Capacidades y limitaciones comunicadas | — | **C** |
| Base de legitimación | `legal_bases`, `legal_bases_art9` | A |
| Supervisión humana comunicada | `has_human_oversight`, `oversight_type` | A parcial |
| Derechos de los interesados y canal | — | **C** |
| **Canal / soporte de cada información** (cláusula contractual, buzón, Service Point) | — | **C** |

Aquí hay una diferencia conceptual, no sólo de campos: la ficha documenta **qué se le ha
dicho al usuario y por dónde**. Fluxion documenta **cómo es el sistema**. La obligación de
transparencia del Art. 50 y la del Art. 13 RGPD se cumplen comunicando, no describiendo, y
Fluxion no tiene hoy ningún registro de la comunicación.

### 13. Identificación de terceros proveedores — **C mayoritariamente**

La ficha pide una tabla con cinco columnas por proveedor: **nombre, tipo de servicio, rol,
datos/activos compartidos, referencia contractual**. Incluye a los subencargados.

Fluxion tiene `critical_providers` (lista de proveedores TIC críticos, enfoque DORA) y
`external_provider` (el del modelo). Es una lista de nombres: **sin rol, sin datos
compartidos, sin referencia contractual y sin subencargados**.

El caso CrowdStrike lo ilustra bien: tres filas —CrowdStrike como encargado, sus
subencargados, y Microsoft (Entra ID) como fuente de datos e infraestructura de identidad—
con roles distintos entre sí. Fluxion sólo podría guardar los nombres.

### 14. Firmas, aprobación y control de versiones — **B**

| La ficha pide | Fluxion | |
|---|---|---|
| Firmas de Responsable del Sistema, Responsable de Seguridad, DPO y Responsable de IA | Módulo **Aprobaciones (C3)**: política con pasos por rol, decisiones inmutables con motivo obligatorio, **acta generada** | **B, mejor** |
| Control de versiones (versión, fecha, descripción del cambio, autor) | El motor documental versiona los documentos generados | **B** |

Este apartado no es un hueco: es el que Fluxion resuelve mejor que un Word. Una tabla de
firmas en papel no dice quién podía firmar ni qué se firmó; una solicitud de aprobación con
su `policy_snapshot` congelado sí.

---

## 3. Huecos consolidados

### 3.1 — Deberían ser campos del formulario

Agrupados por dónde encajan. Son **21 campos**, y en su mayoría un bloque coherente:

**Nuevo paso «Proveedor y contrato»** (hoy no existe nada de esto):

1. Fecha del contrato con el proveedor
2. Referencia / número de contrato
3. DPA suscrito (sí/no) + referencia
4. Materias cubiertas por el contrato (multi: documentación técnica, SLA, seguridad, privacidad, subproveedores, cambios de modelo, uso de datos, continuidad)
5. Declaración de conformidad del proveedor (sí/no + referencia)
6. Ubicación de la documentación técnica del proveedor
7. Instrucciones de uso del proveedor (ubicación) — **Art. 13 / Art. 26.1**
8. Condiciones de uso y restricciones impuestas por el proveedor
9. Niveles de SLA acordados (sustituye o acompaña al booleano `has_sla`)

**Ampliación del paso «Tecnología»** — alojamiento:

10. Modalidad de alojamiento (cloud proveedor / cloud propia / on-premise / híbrido)
11. Proveedor de infraestructura (distinto del proveedor del sistema)
12. Región de los servidores
13. Mecanismo de transferencia internacional (multi: DPF, SCCs, BCRs, decisión de adecuación, excepciones Art. 49) — condicionado a `intl_data_transfers`
14. Sistemas corporativos con los que se interconecta + tipo de integración

**Ampliación del paso «Datos»**:

15. Bases de datos utilizadas: nombre, localización, titularidad (propia / tercero / compartida)
16. Número de interesados afectados (la ficha lo pide aparte del volumen de registros)
17. Datos inferidos o generados por el sistema
18. Procedimiento de destrucción (no sólo el plazo de retención)

**Ampliación del paso «Gobierno»**:

19. Áreas implicadas en implementación y desarrollo
20. Normativa interna aplicable al sistema (referencias a políticas)
21. Activo del inventario del SGSI asociado

### 3.2 — Decisión de modelo, no de campo

Tres cosas no se arreglan añadiendo campos sueltos:

**a) Responsables por función.** La ficha nombra un responsable distinto en cada apartado:
adquisición de datos, calidad de datos, gobernanza de datos, verificación, validación,
validación previa al despliegue, despliegue, seguimiento operativo, gestión documental con
el proveedor. Son **nueve funciones**. Fluxion tiene cuatro personas fijas por sistema. O
se añaden nueve campos más (mal camino) o se modela una tabla de **roles por sistema** con
un catálogo de funciones. Recomiendo lo segundo.

**b) Requisitos de seguridad con estado.** El apartado 6 es una tabla de *requisito →
aplicación → estado de implementación*. Fluxion ya tiene esa estructura en controles y
GAPs. No hace falta inventar nada: hace falta **conectar un conjunto de controles de
seguridad al sistema** en lugar de crear siete campos nuevos.

**c) Registro de terceros.** El apartado 13 necesita una **tabla**, no una lista de
nombres: proveedor, tipo de servicio, rol (encargado / subencargado / proveedor de
infraestructura / proveedor del modelo), datos compartidos, referencia contractual.
Convierte `critical_providers` de array de texto en entidad propia.

### 3.3 — No deberían estar en el formulario

Para que la lista no crezca por inercia:

- **Medidas adoptadas para el despliegue, plan de despliegue, criterios de aceptación**
  (apartado 9). Esto es el circuito de aprobación, no un campo de la ficha. Lo correcto es
  **un tipo de solicitud de aprobación «autorización de despliegue»** cuya acta contenga
  las tres cosas, con los criterios evaluados contra los datos reales (el riesgo residual
  ya está en el sistema, no hay que copiarlo a mano).
- **Qué se le comunicó al usuario y por qué canal** (apartado 12). Es un registro de
  cumplimiento con fecha, no un atributo del sistema. Encaja como evidencia vinculada a la
  obligación del Art. 50 en `v_system_obligations`, no como campo del alta.
- **Procesos de corrección y de actualización** (apartado 10). Son procedimientos de la
  organización, no de cada sistema. Ficha de organización, con posibilidad de excepción por
  sistema.
- **Firmas.** Ya resuelto y mejor resuelto por C3.

---

## 4. Lo que la ficha no tiene y Fluxion sí

Conviene tenerlo escrito, porque es lo que justifica la herramienta frente al Word:

- **Clasificación AI Act completa**: Art. 5 (prácticas prohibidas), Anexo III, GPAI, riesgo
  limitado del Art. 50, con el motor de clasificación y su justificación.
- **Rol en la cadena de valor** con los cinco roles del Reglamento, no excluyentes, y el
  aviso del Art. 25.
- **Obligaciones derivadas por sistema** (`v_system_obligations`), 36 obligaciones con su
  artículo.
- **Evaluación de riesgos FMEA** sobre catálogo de 418+ modos de fallo anclados a artículo,
  con riesgo inherente y residual calculados, no escritos a mano.
- **Registro de riesgos de negocio** (probabilidad × impacto, exposición, respuesta).
- **Expediente del Anexo IV**, FRIA, DPIA y Model Card generados desde los datos.
- **Incidentes con los plazos del Art. 73**.
- **Registro UE**.
- **Supervisión humana operativa (HITL)**, no sólo declarada.
- **Trazabilidad**: quién cambió qué y cuándo, frente a un «Control de versiones» de una
  fila.

Y una diferencia de naturaleza que vale la pena nombrar: **la ficha de Indra tiene nueve
campos rellenos con `xxxxxxx`** —versión del sistema, fecha del contrato, entorno,
referencias de contrato, nombres de responsables, ubicación de la documentación—. Es un
documento que se dio por terminado sin estarlo, porque nada comprueba que lo esté. Ese es
exactamente el fallo que un formulario con campos obligatorios y estado de completitud
elimina.

---

## 5. Defecto detectado durante la comparación

Al revisar el paso 2 frente al apartado 3 de la ficha (usos principal y secundarios)
apareció un fallo real, no un hueco de diseño:

**El tipo de output es multi-selección en la pantalla y se guarda sólo el primero.**

`SystemWizard.jsx:712` presenta `OUTPUTS` como casillas múltiples y `outputTypes` es un
array. Pero al guardar, `SystemWizard.jsx:1250` hace:

```js
outputType: f.outputTypes?.[0] ?? ""
```

y `ai_systems.output_type` es una columna única. El usuario marca tres tipos de output, ve
tres marcados, guarda, y se almacena uno. **Sin error, sin aviso.** Al reabrir en modo
edición, `SystemWizard.jsx:1187-1190` reconstruye el array a partir del único valor
guardado, así que las otras dos casillas aparecen desmarcadas y el usuario supone que se
equivocó al marcarlas.

El caso CrowdStrike es justamente uno de los que lo sufriría: detección, recomendación y
respuesta automática son tres outputs distintos del mismo sistema.

Además, `output_type` alimenta `classifyAIAct`, de modo que la clasificación se calcula
sobre una descripción incompleta del sistema.

Son dos decisiones posibles: convertir la columna en array —lo correcto, y lo que la
pantalla ya promete— o dejar la columna única y convertir la pantalla en selección simple.
Lo que no puede quedarse es como está.
