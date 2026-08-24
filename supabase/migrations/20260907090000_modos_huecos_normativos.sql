-- ============================================================================
-- Modos de fallo para los huecos normativos
-- ============================================================================
-- La vista de cobertura dejo ver ocho articulos exigibles sin ningun modo de
-- fallo detras. No todos los ceros eran huecos —el Art. 47, declaracion UE de
-- conformidad, es un tramite documental que no puede «fallar» como riesgo— pero
-- estos ocho si lo eran:
--
--   Art. 5   practicas prohibidas       Art. 49  registro en la UE
--   Art. 6   clasificacion              Art. 18  conservacion 10 anos
--   Art. 4   alfabetizacion             Art. 19  conservacion de logs
--   Art. 20  medidas correctivas        Art. 21  cooperacion con autoridades
--
-- El mas grave era el Art. 5: desplegar una practica prohibida es el peor
-- resultado posible y el catalogo no lo contemplaba. El circuito no sabia decir
-- «esto no se mitiga, no se despliega».
--
-- ── Escalas ────────────────────────────────────────────────────────────────
--
-- `w_calculated` y `s_default` NO se escriben a mano: se calculan con las
-- formulas del catalogo, verificadas contra las 418 filas existentes sin una
-- sola desviacion:
--
--   w_calculated = 1 + (r+i+d+e) / 12
--   s_default    = round(2 + (r+i+d+e) * 7 / 12)
--
-- Consecuencia util: para el motor de prioridad **solo cuenta la suma**, no el
-- reparto entre las cuatro letras. Lo que hay que revisar de estos 18 es el
-- s_default resultante —una cifra por modo—, no las setenta y dos letras.
--
-- ── Dos cambios sobre la propuesta original ────────────────────────────────
--
-- 1. «Perdida de reproducibilidad tecnica a 10 anos» se reformula. El Art. 18
--    exige conservar la DOCUMENTACION —la tecnica del Art. 11, la del sistema
--    de calidad del Art. 17, las decisiones de los organismos notificados y la
--    declaracion del Art. 47—, no los pesos, los datasets ni los pipelines. Tal
--    como estaba, el modo afirmaba una obligacion que el articulo no crea, y un
--    expediente que promete de mas pierde credibilidad. La perdida de artefactos
--    sigue siendo un riesgo real: queda dentro del modo como consecuencia, no
--    como exigencia normativa.
--
-- 2. «Fallo de escalado y notificacion de incidentes graves» se ancla en el
--    Art. 73, no en el 20/21. Es donde vive la obligacion.
--    ⚠️ El Art. 73 ya tiene 11 modos: revisar si este duplica alguno.
-- ============================================================================

WITH nuevos(dimension_id, code, name, description, bloque, subcategoria, tipo,
            r, i, d, e, origin, referencia, referencia_2) AS (
  VALUES

  -- ── Art. 5 · Practicas prohibidas ─────────────────────────────────────────
  ('gobernanza', 'GOB-076',
   'Ausencia de compuerta dura de no-despliegue',
   'El pipeline de MLOps carece de un punto de bloqueo estricto que impida el despliegue cuando el caso de uso roza una practica prohibida —inferencia de emociones en el entorno laboral, categorizacion biometrica no permitida—, asumiendo erroneamente que todo riesgo es mitigable.',
   'Cumplimiento regulatorio', 'Practicas prohibidas', 'Proceso',
   3, 3, 3, 3, 'ai_act', 'Art. 5', NULL),

  ('gobernanza', 'GOB-077',
   'Deriva funcional hacia practica prohibida',
   'Un modelo desplegado para un fin legitimo se reconfigura o se integra con nuevas fuentes de datos que habilitan puntuacion social interna o manipulacion conductual, sin pasar por una nueva evaluacion de conformidad.',
   'Cumplimiento regulatorio', 'Practicas prohibidas', 'Proceso',
   3, 3, 3, 2, 'ai_act', 'Art. 5', 'Art. 25'),

  ('gobernanza', 'GOB-078',
   'Anulacion ejecutiva del veto legal',
   'El flujo de gobernanza permite a responsables de producto o de sistemas anular alertas de cumplimiento sin requerir un bloqueo vinculante del equipo juridico antes de pasar a produccion.',
   'Cumplimiento regulatorio', 'Practicas prohibidas', 'Proceso',
   3, 3, 2, 2, 'ai_act', 'Art. 5', 'Art. 17'),

  -- ── Art. 6 · Clasificacion ────────────────────────────────────────────────
  ('gobernanza', 'GOB-079',
   'Falso negativo por interpretacion abusiva de las excepciones',
   'Clasificar el sistema como no de alto riesgo alegando que realiza una tarea preparatoria o puramente procedimental, cuando en la practica determina el resultado de una decision del Anexo III.',
   'Cumplimiento regulatorio', 'Clasificacion de riesgo', 'Proceso',
   3, 3, 2, 2, 'ai_act', 'Art. 6', NULL),

  ('gobernanza', 'GOB-080',
   'Desalineacion de la finalidad prevista',
   'Integrar un modelo calificado como de proposito general o de bajo riesgo en un flujo de alto riesgo —triaje de curriculos, concesion de creditos— sin actualizar la clasificacion del sistema completo.',
   'Cumplimiento regulatorio', 'Clasificacion de riesgo', 'Proceso',
   3, 3, 2, 2, 'ai_act', 'Art. 6', 'Art. 25'),

  ('gobernanza', 'GOB-081',
   'Omision de reclasificacion tras modificacion sustancial',
   'Reentrenar el modelo con nuevos datos, alterar sus umbrales de decision o ampliar el colectivo afectado sin reevaluar si el sistema ha cruzado el umbral hacia el Anexo III ni repetir la evaluacion de la conformidad.',
   'Cumplimiento regulatorio', 'Clasificacion de riesgo', 'Proceso',
   3, 2, 2, 2, 'ai_act', 'Art. 6', 'Art. 43'),

  -- ── Art. 4 · Alfabetizacion ───────────────────────────────────────────────
  ('gobernanza', 'GOB-082',
   'Sesgo de automatizacion por falta de competencia del operador',
   'El personal a cargo de la supervision carece de formacion para interpretar metricas de incertidumbre, explicabilidad o falsos positivos, y valida las salidas del modelo sin criterio propio. Su sintoma medible es una tasa de concordancia cercana al 100 %.',
   'Cumplimiento regulatorio', 'Alfabetizacion en IA', 'Proceso',
   2, 2, 2, 2, 'ai_act', 'Art. 4', 'Art. 14'),

  ('gobernanza', 'GOB-083',
   'Uso fuera de las especificaciones de diseno',
   'Los operadores introducen datos o casos de uso no contemplados en el diseno operativo original, por falta de manuales comprensibles y de formacion practica.',
   'Cumplimiento regulatorio', 'Alfabetizacion en IA', 'Proceso',
   2, 2, 2, 1, 'ai_act', 'Art. 4', 'Art. 26'),

  ('gobernanza', 'GOB-084',
   'Ausencia de registro probatorio de la capacitacion',
   'Incapacidad de acreditar ante la autoridad los planes de formacion continua, las competencias y los perfiles del personal que opera el sistema.',
   'Cumplimiento regulatorio', 'Alfabetizacion en IA', 'Proceso',
   2, 1, 1, 1, 'ai_act', 'Art. 4', NULL),

  -- ── Art. 49 · Registro en la base de datos de la UE ────────────────────────
  ('gobernanza', 'GOB-085',
   'Puesta en servicio previa al registro',
   'Activar comercialmente o poner en servicio el sistema de alto riesgo sin haber completado la inscripcion obligatoria en la base de datos de la UE.',
   'Cumplimiento regulatorio', 'Registro en la UE', 'Proceso',
   2, 2, 2, 1, 'ai_act', 'Art. 49', NULL),

  ('gobernanza', 'GOB-086',
   'Desincronizacion de los metadatos registrales',
   'Modificar versiones del modelo, responsables tecnicos o la finalidad prevista sin actualizar la ficha registral europea dentro del plazo.',
   'Cumplimiento regulatorio', 'Registro en la UE', 'Proceso',
   2, 1, 1, 1, 'ai_act', 'Art. 49', NULL),

  ('gobernanza', 'GOB-087',
   'Incoherencia entre el registro y la documentacion tecnica',
   'Publicar en la plataforma de la UE informacion simplificada o divergente que contradice el expediente tecnico real auditable.',
   'Cumplimiento regulatorio', 'Registro en la UE', 'Proceso',
   2, 2, 1, 1, 'ai_act', 'Art. 49', 'Art. 11'),

  -- ── Art. 18 y 19 · Conservacion ───────────────────────────────────────────
  ('gobernanza', 'GOB-088',
   'Purga prematura de trazas operativas',
   'Politicas automaticas de rotacion de almacenamiento que eliminan los registros de inferencia, entradas y salidas a los treinta o noventa dias por optimizacion de costes, incumpliendo el minimo de seis meses.',
   'Cumplimiento regulatorio', 'Conservacion de documentacion y registros', 'Proceso',
   2, 2, 2, 2, 'ai_act', 'Art. 19', 'Art. 26'),

  ('gobernanza', 'GOB-089',
   'Perdida del expediente tecnico antes de los diez anos',
   'Desaparicion o inaccesibilidad de la documentacion tecnica, la del sistema de calidad, las decisiones de los organismos notificados o la declaracion de conformidad, tras migraciones de infraestructura, cambios de repositorio o quiebra de un proveedor. Arrastra ademas la perdida de los artefactos que la sustentan y con ella la reproducibilidad del sistema.',
   'Cumplimiento regulatorio', 'Conservacion de documentacion y registros', 'Proceso',
   3, 2, 2, 2, 'ai_act', 'Art. 18', 'Art. 11'),

  ('gobernanza', 'GOB-090',
   'Trazabilidad insuficiente en el registro de eventos',
   'Registros que almacenan solo codigos de estado y marcas de tiempo, omitiendo las entradas completas, las salidas generadas, la version exacta del modelo y la identidad de quien superviso.',
   'Cumplimiento regulatorio', 'Conservacion de documentacion y registros', 'Producto',
   2, 2, 2, 2, 'ai_act', 'Art. 12', 'Art. 19'),

  -- ── Art. 20 y 21 · Correctivas y cooperacion ──────────────────────────────
  ('tecnica', 'TEC-116',
   'Ausencia de mecanismo de parada o reversion',
   'Incapacidad tecnica de desconectar, aislar o revertir el sistema en produccion ante una alerta de no conformidad, sin provocar la caida total del servicio de negocio.',
   'Cumplimiento regulatorio', 'Parada y reversion', 'Producto',
   3, 3, 2, 2, 'ai_act', 'Art. 20', 'Art. 14'),

  ('gobernanza', 'GOB-091',
   'Incapacidad de respuesta en plazo ante un requerimiento',
   'Falta de herramientas para empaquetar, exportar y justificar el comportamiento del sistema y sus registros en el formato y la ventana temporal que exige la autoridad de vigilancia.',
   'Cumplimiento regulatorio', 'Respuesta y cooperacion', 'Proceso',
   2, 2, 2, 1, 'ai_act', 'Art. 21', NULL),

  ('gobernanza', 'GOB-092',
   'Fallo de escalado y notificacion de incidentes graves',
   'Ausencia de alertas automatizadas que identifiquen fallos sistematicos o vulneraciones de derechos fundamentales, lo que impide notificarlos en los plazos reglamentarios.',
   'Cumplimiento regulatorio', 'Respuesta y cooperacion', 'Proceso',
   3, 3, 2, 2, 'ai_act', 'Art. 73', 'Art. 20')

),
insertados AS (
  INSERT INTO compliance.failure_modes
    (dimension_id, code, name, description,
     r_value, i_value, d_value, e_value,
     w_calculated, s_default,
     bloque, subcategoria, tipo, origin)
  SELECT n.dimension_id, n.code, n.name, n.description,
         n.r, n.i, n.d, n.e,
         round(1 + (n.r + n.i + n.d + n.e) / 12.0, 2),
         round(2 + (n.r + n.i + n.d + n.e) * 7 / 12.0),
         n.bloque, n.subcategoria, n.tipo, n.origin
    FROM nuevos n
   WHERE NOT EXISTS (
     SELECT 1 FROM compliance.failure_modes fm WHERE fm.code = n.code
   )
  RETURNING id, code
)
INSERT INTO compliance.failure_mode_norm_refs
  (failure_mode_id, framework, reference, is_primary, confidence, source)
SELECT ins.id, 'ai_act', ref.reference, ref.primaria, 'alta', 'manual'
  FROM insertados ins
  JOIN nuevos n ON n.code = ins.code
 CROSS JOIN LATERAL (
   VALUES (n.referencia, true), (n.referencia_2, false)
 ) AS ref(reference, primaria)
 WHERE ref.reference IS NOT NULL
ON CONFLICT (failure_mode_id, framework, reference) DO NOTHING;
