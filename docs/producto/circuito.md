# El circuito de un sistema de IA

De dar de alta un sistema a tener un plan aprobado. Escrito leyendo el código,
no de memoria.

Sirve para dos cosas: decidir qué se le enseña a alguien que entra por primera
vez, y juzgar si el recorrido es más largo de lo que necesita ser.

**Estado**: mapa hecho. Sin decisiones tomadas ni cambios aplicados.

---

## 1 · El recorrido real

Ocho etapas. Entre paréntesis, dónde está el portón que impide seguir.

| # | Etapa | Pantalla | ¿Bloquea? |
|---|---|---|---|
| 1 | Registrar el sistema | `/inventario/nuevo` | — |
| 2 | Clasificarlo (AI Act) | `/inventario/[id]/clasificacion` | — |
| 3 | Activar modos de fallo | ficha del sistema | **Sí** → sin ellos, FMEA no arranca |
| 4 | Evaluar cada modo | `/fmea/[id]/evaluar` | Parcial → los ítems admiten `skipped` |
| 5 | Plan de tratamiento | `/fmea/[id]/plan` | — |
| 6 | Enviar a aprobación | mismo sitio | Acciones incompletas lo impiden |
| 7 | Decidir | `/aprobaciones` | Solo si hay política aplicable |
| 8 | Expediente y evidencias | `/inventario/[id]/expediente/…` | — |

### Lo que resultó no ser como pensábamos

**Los modos de fallo no se eligen a mano.** `system_failure_modes.activation_source`
admite `rule`, `ai` y `manual`, y el valor por defecto es `rule`: los activa un
motor determinista a partir de las características del sistema. Lo manual es la
excepción, no el camino.

**No hay que resolverlos todos.** Los ítems de evaluación tienen estado
`pending | evaluated | skipped`. Saltarse uno es una opción contemplada, no un
atajo.

**El único portón duro es el 3.** `getOrCreateEvaluation` devuelve
`missingFailureModes` y la pantalla del FMEA se niega a continuar. Los demás
pasos se pueden recorrer con el trabajo a medias.

Esto cambia el diagnóstico: la sensación de circuito pesado no viene de que el
producto obligue a completar el abanico. Viene de que **no dice que no haga
falta**.

## 2 · Qué es obligatorio y qué es elección nuestra

**Obligado por el Art. 9** — identificar riesgos, estimarlos, adoptar medidas y
que alguien juzgue aceptable el residual. Cuatro etapas. Ninguna se puede
saltar sin dejar de cumplir.

**Elección nuestra** — que la identificación y la estimación se hagan con FMEA.
El Reglamento no lo menciona. Es un método de ingeniería de seguridad, riguroso
y defendible, y produce evidencia mucho mejor que una lista de riesgos escrita a
mano. Pero es una decisión de producto, y arrastra el abanico de modos de fallo.

**Elección nuestra también** — las aprobaciones (C3). Añaden una etapa, y solo
cuando hay política. Proporcionado.

## 3 · Dónde está la complejidad

No en el número de etapas. Ocho pasos para un expediente regulatorio completo no
es mucho: cualquier ISO tiene más.

Está en **el paso 4**, y por tres motivos distintos:

1. **No se sabe cuántos son hasta que llegas.** El motor activa los modos que
   correspondan al sistema. Nadie te avisa antes de si van a ser ocho o cuarenta.
2. **No se sabe cuáles importan.** Existe una priorización por zona
   (`cached_zone`, `priority_status`), pero el recorrido no la usa para ordenar
   el trabajo: se evalúa la lista.
3. **No se sabe que se puede parar.** `skipped` existe en la base y no está
   claro en la interfaz que sea una salida legítima.

Los tres son de **información**, no de estructura. Y eso es una buena noticia:
se arreglan enseñando lo que ya hay, no rehaciendo el circuito.

## 4 · Qué medir antes de decidir

Con números, no con sensación.

```sql
-- Cuántos modos activa el motor por sistema
SELECT s.name,
       count(*) FILTER (WHERE m.activation_source = 'rule')   AS por_regla,
       count(*) FILTER (WHERE m.activation_source = 'ai')     AS por_agente,
       count(*) FILTER (WHERE m.activation_source = 'manual') AS a_mano,
       count(*) AS total
  FROM fluxion.system_failure_modes m
  JOIN fluxion.ai_systems s ON s.id = m.ai_system_id
 GROUP BY s.name ORDER BY total DESC;

-- Cuántos de ellos son de zona crítica
SELECT priority_status, count(*)
  FROM fluxion.system_failure_modes GROUP BY priority_status;

-- Cuántos ítems quedan sin evaluar en las evaluaciones vivas
SELECT e.id, e.state, count(*) FILTER (WHERE i.item_status = 'pending') AS pendientes,
       count(*) AS total
  FROM fluxion.fmea_evaluations e
  JOIN fluxion.fmea_items i ON i.evaluation_id = e.id
 GROUP BY e.id, e.state;
```

La pregunta que responden: **¿cuántos modos hay que mirar de verdad para llegar
a un plan defendible?** Si de cuarenta activados solo seis son de zona crítica,
el problema es de presentación. Si son treinta y ocho, es de método.

## 5 · Candidatos a reducir

Ordenados por relación entre lo que arreglan y lo que cuestan. **Ninguno
decidido.**

**A · Decir cuántos son y cuáles importan, antes de empezar.** Al entrar en la
evaluación: «40 modos activados, 6 en zona crítica». Ordenar por prioridad en
vez de por orden de activación. Barato, y ataca los motivos 1 y 2.

**B · Hacer visible que `skipped` es una salida.** Con su motivo, que además es
evidencia: un modo descartado con justificación vale más que uno evaluado a la
ligera. Barato, ataca el motivo 3.

**C · Plan parcial sobre los modos críticos.** Hoy el plan se hace sobre la
evaluación entera. Permitir cerrar uno que cubra la zona crítica y dejar el
resto abierto está más cerca del Art. 9 que esperar a tenerlo todo puntuado:
tratar primero lo peor es lo que pide una gestión de riesgos. Más caro y toca
el modelo de datos.

**D · Evaluación por lotes** para modos que comparten medida. El más caro y el
que menos evidencia tengo de que haga falta. No antes de tener los números del
apartado 4.

## 6 · Lo que este mapa no cubre

- **El primer minuto.** La guía del dashboard es texto fijo de tres pasos por
  foco, sin relación con el estado real de la organización. Dice «clasifícalo
  según el AI Act» y no menciona modos de fallo, FMEA ni plan. Un usuario nuevo
  no puede saber por dónde sigue.
- **Cuántos clics** son de verdad cada etapa. Hace falta recorrerlo con un
  cronómetro, no leerlo.
- **Qué pasa cuando algo se queda a medias.** No he comprobado si el producto
  sabe decir «tienes una evaluación abierta desde hace tres semanas».
