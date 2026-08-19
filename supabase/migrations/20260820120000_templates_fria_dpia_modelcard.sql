-- ─────────────────────────────────────────────────────────────────────────────
-- C1 · Catálogo: FRIA, DPIA y ficha de modelo
--
-- FUENTES VERIFICADAS contra el texto oficial, no contra el corpus RAG:
--   · FRIA        — art. 27 del Reglamento (UE) 2024/1689, vía el AI Act
--                   Service Desk de la Comisión Europea
--   · Ficha       — anexo XII del mismo Reglamento (información de
--                   transparencia del art. 53.1.b)
--   · DPIA        — art. 35, apartados 2, 3 y 7 del RGPD
--
-- La ficha de modelo se ancla en el anexo XII en vez de inventarse una
-- estructura: existe un listado legal de qué información debe entregar quien
-- provee un modelo de uso general a quien lo integra, y es exactamente para lo
-- que sirve una ficha de modelo. Aplica a sistemas marcados como GPAI.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── FRIA · art. 27 ───────────────────────────────────────────────────────────

INSERT INTO fluxion.document_templates
  (organization_id, key, version, title, description, framework, validity_months, sections)
VALUES (
  NULL, 'fria', 1,
  'Evaluación de impacto sobre los derechos fundamentales (FRIA)',
  'Obligatoria antes del despliegue para organismos públicos, entidades privadas que prestan servicios públicos y quienes despliegan sistemas del anexo III, puntos 5(b) y 5(c) — solvencia crediticia y seguros de vida y salud.',
  'ai_act', 12,
  $json$[
  {"ref":"27","kind":"heading","required":true,"source":"manual",
   "title":"Evaluación de impacto sobre los derechos fundamentales",
   "guidance":"Artículo 27. Se realiza ANTES de desplegar el sistema."},

  {"ref":"27.0","kind":"field","required":true,"source":"manual",
   "title":"Motivo de la obligación",
   "guidance":"Por qué esta organización está obligada: organismo de derecho público, entidad privada que presta servicios públicos, o despliegue de un sistema del anexo III puntos 5(b) o 5(c). Si no concurre ninguno, la FRIA no es exigible."},
  {"ref":"27.1.a","kind":"field","required":true,"source":"derived:system",
   "title":"Procesos en los que se usará el sistema",
   "guidance":"Descripción de los procesos del responsable del despliegue en los que se usará el sistema, conforme a su finalidad prevista."},
  {"ref":"27.1.b","kind":"field","required":true,"source":"manual",
   "title":"Periodo y frecuencia de uso",
   "guidance":"Durante cuánto tiempo y con qué frecuencia está previsto usar el sistema."},
  {"ref":"27.1.c","kind":"field","required":true,"source":"derived:system",
   "title":"Personas y grupos afectados",
   "guidance":"Categorías de personas físicas y grupos que probablemente se vean afectados por su uso en este contexto concreto."},
  {"ref":"27.1.d","kind":"field","required":true,"source":"derived:fmea",
   "title":"Riesgos específicos de perjuicio",
   "guidance":"Riesgos que probablemente afecten a las categorías identificadas en el apartado (c), teniendo en cuenta la información facilitada por el proveedor conforme al artículo 13."},
  {"ref":"27.1.e","kind":"field","required":true,"source":"derived:system",
   "title":"Medidas de vigilancia humana",
   "guidance":"Cómo se aplican, de acuerdo con las instrucciones de uso."},
  {"ref":"27.1.f","kind":"field","required":true,"source":"derived:system",
   "title":"Medidas si los riesgos se materializan",
   "guidance":"Incluidos los mecanismos de gobernanza interna y de reclamación."},

  {"ref":"27.2","kind":"field","required":true,"source":"manual",
   "title":"Vigencia y actualización",
   "guidance":"La evaluación vale para usos similares posteriores; hay que actualizarla cuando cambie alguno de los elementos anteriores. Deja constancia de cuándo se revisará."},
  {"ref":"27.3","kind":"field","required":true,"source":"manual",
   "title":"Notificación a la autoridad de vigilancia del mercado",
   "guidance":"Una vez realizada, se notifica a la autoridad con la plantilla del cuestionario. Anota fecha y referencia de la notificación."},
  {"ref":"27.4","kind":"field","required":false,"source":"derived:system",
   "title":"Relación con la evaluación de impacto de protección de datos",
   "guidance":"La FRIA complementa a la DPIA del artículo 35 del RGPD; no la sustituye. Cuando proceda, indica la DPIA con la que se relaciona."}
]$json$::jsonb
)
ON CONFLICT DO NOTHING;

-- ── DPIA · art. 35 RGPD ──────────────────────────────────────────────────────

INSERT INTO fluxion.document_templates
  (organization_id, key, version, title, description, framework, validity_months, sections)
VALUES (
  NULL, 'dpia', 1,
  'Evaluación de impacto relativa a la protección de datos (DPIA)',
  'Artículo 35 del RGPD. Obligatoria cuando el tratamiento entrañe un alto riesgo para los derechos y libertades de las personas físicas.',
  'gdpr', 12,
  $json$[
  {"ref":"35","kind":"heading","required":true,"source":"manual",
   "title":"Evaluación de impacto relativa a la protección de datos",
   "guidance":"Artículo 35 del RGPD. Se realiza antes del tratamiento."},

  {"ref":"35.3","kind":"field","required":true,"source":"manual",
   "title":"Motivo de la obligación",
   "guidance":"Qué supuesto del artículo 35.3 concurre: (a) evaluación sistemática y exhaustiva de aspectos personales basada en tratamiento automatizado, incluida la elaboración de perfiles, con efectos jurídicos o significativos; (b) tratamiento a gran escala de categorías especiales del art. 9.1 o de datos penales del art. 10; (c) observación sistemática a gran escala de una zona de acceso público."},
  {"ref":"35.2","kind":"field","required":false,"source":"derived:system",
   "title":"Consulta al delegado de protección de datos",
   "guidance":"El responsable recabará el asesoramiento del DPD, si lo hubiera designado."},

  {"ref":"35.7.a","kind":"field","required":true,"source":"derived:system",
   "title":"Descripción sistemática del tratamiento y sus fines",
   "guidance":"Operaciones de tratamiento previstas y finalidades, incluido, cuando proceda, el interés legítimo perseguido por el responsable."},
  {"ref":"35.7.b","kind":"field","required":true,"source":"manual",
   "title":"Necesidad y proporcionalidad",
   "guidance":"Evaluación de la necesidad y la proporcionalidad de las operaciones respecto de su finalidad. Es un juicio, no un dato: no se puede derivar del inventario."},
  {"ref":"35.7.c","kind":"field","required":true,"source":"derived:fmea",
   "title":"Riesgos para los derechos y libertades",
   "guidance":"Evaluación de los riesgos para los derechos y libertades de los interesados."},
  {"ref":"35.7.d","kind":"field","required":true,"source":"derived:system",
   "title":"Medidas para afrontar los riesgos",
   "guidance":"Incluidas garantías, medidas de seguridad y mecanismos para proteger los datos y demostrar la conformidad con el Reglamento, teniendo en cuenta los derechos e intereses legítimos de los interesados."},

  {"ref":"36","kind":"field","required":false,"source":"manual",
   "title":"Consulta previa a la autoridad de control",
   "guidance":"Artículo 36: obligatoria si la evaluación muestra un riesgo alto que el responsable no puede mitigar. Anota fecha y referencia si se ha realizado."}
]$json$::jsonb
)
ON CONFLICT DO NOTHING;

-- ── Ficha de modelo · anexo XII ──────────────────────────────────────────────

INSERT INTO fluxion.document_templates
  (organization_id, key, version, title, description, framework, validity_months, sections)
VALUES (
  NULL, 'model_card', 1,
  'Ficha del modelo · Anexo XII',
  'Información de transparencia que el proveedor de un modelo de IA de uso general facilita a quien lo integra en un sistema (artículo 53.1.b y anexo XII). Aplica a sistemas marcados como GPAI.',
  'ai_act', 12,
  $json$[
  {"ref":"XII.1","kind":"heading","required":true,"source":"manual",
   "title":"Descripción general del modelo de IA de uso general",
   "guidance":"Anexo XII, punto 1."},

  {"ref":"XII.1.a","kind":"field","required":true,"source":"derived:system",
   "title":"Tareas previstas y sistemas en los que puede integrarse",
   "guidance":"Qué tareas está destinado a realizar el modelo y tipo y naturaleza de los sistemas de IA en los que puede integrarse."},
  {"ref":"XII.1.b","kind":"field","required":true,"source":"derived:system",
   "title":"Políticas de uso aceptable",
   "guidance":"Las aplicables al modelo."},
  {"ref":"XII.1.c","kind":"field","required":true,"source":"derived:system",
   "title":"Fecha de publicación y métodos de distribución",
   "guidance":"Cuándo se publicó y cómo se distribuye."},
  {"ref":"XII.1.d","kind":"field","required":false,"source":"derived:system",
   "title":"Interacción con hardware o software externo",
   "guidance":"Cómo interactúa, o puede usarse para interactuar, con hardware o software que no forma parte del modelo. Cuando proceda."},
  {"ref":"XII.1.e","kind":"field","required":false,"source":"derived:system",
   "title":"Versiones de software relacionadas",
   "guidance":"Versiones del software pertinente para el uso del modelo. Cuando proceda."},
  {"ref":"XII.1.f","kind":"field","required":true,"source":"derived:system",
   "title":"Arquitectura y número de parámetros",
   "guidance":"Arquitectura del modelo y número de parámetros."},
  {"ref":"XII.1.g","kind":"field","required":true,"source":"derived:system",
   "title":"Modalidad y formato de entradas y salidas",
   "guidance":"Modalidad (texto, imagen…) y formato de las entradas y las salidas."},
  {"ref":"XII.1.h","kind":"field","required":true,"source":"derived:system",
   "title":"Licencia del modelo",
   "guidance":"Bajo qué licencia se distribuye."},

  {"ref":"XII.2","kind":"heading","required":true,"source":"manual",
   "title":"Elementos del modelo y proceso de desarrollo",
   "guidance":"Anexo XII, punto 2."},

  {"ref":"XII.2.a","kind":"field","required":true,"source":"manual",
   "title":"Medios técnicos para integrar el modelo",
   "guidance":"Instrucciones de uso, infraestructura y herramientas necesarias para integrar el modelo en sistemas de IA."},
  {"ref":"XII.2.b","kind":"field","required":true,"source":"manual",
   "title":"Modalidad, formato y tamaño máximo de entradas y salidas",
   "guidance":"Incluida la longitud de la ventana de contexto y límites equivalentes."},
  {"ref":"XII.2.c","kind":"field","required":false,"source":"derived:system",
   "title":"Datos de entrenamiento, prueba y validación",
   "guidance":"Tipo y procedencia de los datos y metodologías de curación. Cuando proceda."}
]$json$::jsonb
)
ON CONFLICT DO NOTHING;
