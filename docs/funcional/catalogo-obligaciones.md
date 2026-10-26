---
id: FUN-CAT-OBLIGACIONES
titulo: Catálogo de obligaciones
tipo: funcional
modulo: catalogo-tablas-basicas
audiencia: tecnica
version: 0.2
fuente:
  - apps/web/app/(app)/datos/obligaciones/page.tsx
  - apps/web/app/(app)/datos/obligaciones/actions.ts
  - supabase/migrations/00000000000001_schema.sql
  - supabase/migrations/00000000000005_seed_compliance.sql
  - supabase/migrations/20260904090000_obligaciones_ai_act.sql
  - supabase/migrations/20260911090000_rol_cadena_de_valor.sql
  - supabase/migrations/20261026090000_ai_act_gpai_catalogo.sql
  - apps/web/lib/ai-act/obligations.ts
  - apps/web/lib/ai-act/server.ts
---

# Catálogo de obligaciones

Mantenimiento del catálogo de [obligaciones](../glosario.md#obligación) normativas por marco.

## Propósito

Mantener los artículos y cláusulas que generan obligaciones para los sistemas de IA. La vista dice: «Sirve
como base para mapear qué evidencias son requeridas por cada artículo o cláusula.».

## Acceso y permisos

- **Ruta:** `/datos/obligaciones`
- **Navegación:** tarjeta **Obligaciones** del [Catálogo de tablas básicas](catalogo.md) y menú **Datos ›
  Obligaciones**.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Sí | Crear, editar y eliminar |

> **Pendiente de implementar.** Restringir el mantenimiento al Administrador y tener un catálogo por
> organización. Ver [Catálogo de tablas básicas](catalogo.md#acceso-y-permisos).

## Campos

**Filtro «Framework»:** Todos · AI Act · ISO 42001 · RGPD · DORA · ENS · MDR/IVDR.

**Lista**, ordenada por marco y código, de 50 en 50:

| Columna | Descripción | Origen (`compliance.obligations.`) |
|---|---|---|
| **Código** | Por ejemplo, «AI-ACT-ART9». Único | `code` |
| **Framework** | Marco normativo | `framework` |
| **Artículo** | Por ejemplo, «Art. 9» | `article` |
| **Título** | Con la descripción debajo. Las obligaciones retiradas llevan la marca **Retirada** (texto de ayuda: «No se sugiere a ningún sistema; se conserva para las obligaciones ya registradas.») | `title`, `description`, `retired_at` |
| **Ámbito** | A qué sistemas aplica, con la etiqueta del formulario | `scope` |

Sin resultados: «No se encontraron obligaciones».

**Formulario Nueva / Editar Obligación:**

| Campo | Tipo | Obligatorio | Valores |
|---|---|---|---|
| **Código único** | texto | Sí | Por ejemplo, «AI-ACT-ART9» |
| **Framework** | selección | Sí | AI Act (por defecto) · ISO 42001 · RGPD · DORA · ENS · MDR/IVDR |
| **Artículo / Cláusula** | texto | Sí | Por ejemplo, «Art. 9» |
| **Ámbito** | selección | Sí en el AI Act | Universal (sin ámbito; no se ofrece en el AI Act, donde el valor por defecto es «Todo sistema en el ámbito») · Todo sistema en el ámbito (`all`) · Alto riesgo (`high_risk`) · Transparencia (Art. 50) (`transparency`) · Proveedor de modelo GPAI (`gpai`) |
| **Título** | texto | Sí | Por ejemplo, «Sistema de gestión de riesgos» |
| **Descripción** | texto largo | No | — |

**Cuándo aplica una obligación del AI Act a un sistema.** Las obligaciones sugeridas de cada sistema
salen de este catálogo con las reglas del motor único de clasificación (`suggestObligations`). Solo se
sugieren a sistemas dentro del [ámbito del AI Act](../glosario.md#ámbito-del-ai-act) y con nivel de riesgo;
las obligaciones retiradas no se sugieren.

| Ámbito u obligación | Aplica si el sistema… |
|---|---|
| Práctica prohibida | Solo se sugiere el Art. 5 (`AI-ACT-ART5`), y ninguna otra |
| Todo sistema en el ámbito | Siempre |
| Alto riesgo | Es de alto riesgo, salvo por la vía del Anexo I, Sección B (revisión manual) |
| Transparencia (Art. 50) | Está en el supuesto del apartado del Art. 50 de la obligación (`AI-ACT-ART50-1` a `-4`) y la organización tiene el rol obligado: Proveedor en el 50.1 y el 50.2, Responsable del despliegue en el 50.3 y el 50.4 |
| Proveedor de modelo GPAI | La organización es proveedora de un modelo GPAI ([categoría GPAI](../glosario.md#categoría-gpai)). El Art. 55 solo con riesgo sistémico |
| `AI-ACT-ART27` | Alto riesgo del Anexo III (algún punto distinto del 2), rol Responsable del despliegue, y organismo público o entidad privada que presta servicios públicos, o puntos 5.b o 5.c |
| `AI-ACT-ART6-4` | Excepción del Art. 6.3 válida y rol Proveedor |

Además, la obligación debe corresponder a alguno de los [roles en la cadena de
valor](../glosario.md#rol-en-la-cadena-de-valor) del sistema. Si no tiene roles indicados, aplica a
cualquiera. La vista `compliance.v_system_obligations` aplica las mismas reglas en SQL (ver
[Modelo de datos](../tecnica/modelo-datos.md)).

Desde B13d el catálogo estándar tiene el Art. 50 dividido en cuatro obligaciones (`AI-ACT-ART50-1` a `-4`);
la obligación `AI-ACT-ART50` queda **Retirada**. Tiene también la obligación `AI-ACT-ART6-4` (documentar la
excepción del Art. 6.3 y registrar el sistema).

> TODO: confirmar varias reglas del catálogo.
> - **Roles en la cadena de valor:** no se pueden ver ni editar.
> - **Marcos RGPD, DORA, ENS y MDR/IVDR:** el formulario los ofrece, pero el catálogo estándar no tiene
>   obligaciones de ellos.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Añadir Obligación** / **Editar** › **Guardar** | Todos | Crea o actualiza la obligación | Cambia la cobertura de la obligación por modos de fallo y las obligaciones que se sugieren en las clasificaciones siguientes; no cambia las ya registradas en los sistemas |
| **Retirar** / **Recuperar** | Administración de la plataforma (`profiles.platform_role` = `platform_admin`); el resto no ve el botón | Pide confirmación («¿Retirar la obligación {código}? Dejará de sugerirse a los sistemas; las ya registradas se conservan.» o «¿Recuperar la obligación {código}? Volverá a sugerirse en las próximas clasificaciones.») y fija o borra `retired_at` | Cambia las obligaciones que se sugieren en las clasificaciones siguientes; no cambia las ya registradas |
| **Eliminar** | Todos | Pide confirmación («¿Eliminar la obligación {código}?») y la borra | Elimina también sus relaciones con tipos de evidencia, sin avisar |
| **Volver a Datos** | Todos | Vuelve al [Catálogo de tablas básicas](catalogo.md) | — |

No hay mensaje de confirmación. Los errores se muestran en una ventana del navegador: «Error al guardar:
…» o «Error eliminando: …».

## Validaciones

Código, marco, artículo y título obligatorios. El código no se puede repetir. Una obligación del AI Act
necesita ámbito: el formulario no ofrece «Universal» para el AI Act y, si llega sin ámbito, el servidor
responde «Las obligaciones del AI Act necesitan un ámbito: sin él no se sugieren a ningún sistema.».

## Estados

No aplica. El borrado es definitivo.

## Vistas relacionadas

- [Obligación y evidencia](catalogo-obligacion-evidencia.md).
- [Ficha del sistema](ficha-sistema.md), pestañas Clasificación y Obligaciones.
- Negocio: [Catálogo de tablas básicas](../negocio/catalogo-tablas-basicas.md),
  [Obligaciones](../negocio/obligaciones.md).
