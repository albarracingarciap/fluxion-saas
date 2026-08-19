-- ─────────────────────────────────────────────────────────────────────────────
-- C1 · Plantillas de documentación regulatoria
--
-- La estructura canónica de un documento, versionada. Empieza con el Anexo IV
-- del Reglamento (UE) 2024/1689 (documentación técnica del art. 11.1).
--
-- Por qué esto es el producto y no un formulario más: si el expediente se
-- organiza por los epígrafes del Anexo IV en vez de por las pantallas de la
-- aplicación, los huecos se vuelven citables. "Falta el punto 2(g)" es una
-- frase que un auditor entiende y que se puede corregir; "falta rellenar la
-- pestaña de validación" no.
--
-- FUENTE VERIFICADA: texto oficial vía el AI Act Service Desk de la Comisión
-- Europea (ai-act-service-desk.ec.europa.eu), no vía el corpus RAG. El corpus
-- ya nos dio mal los plazos del art. 73 y sus section_ref no son números de
-- apartado.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.document_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL = plantilla de catálogo, propiedad de Fluxion, visible para todas las
  -- organizaciones. Con valor = adaptación de un cliente.
  organization_id uuid REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  key             text NOT NULL CHECK (key IN ('annex_iv', 'model_card', 'fria', 'dpia')),
  version         integer NOT NULL DEFAULT 1,
  title           text NOT NULL,
  description     text,
  framework       text NOT NULL CHECK (framework IN ('ai_act', 'gdpr', 'iso42001')),

  -- [{ ref, title, guidance, required, source, kind }]
  --   ref      'IV.2.g'  — la referencia legal, que es lo que cita el auditor
  --   source   'derived:system' | 'derived:fmea' | 'derived:history' | 'manual'
  --   kind     'heading' (epígrafe con subapartados) | 'field'
  --   required false en los apartados que el propio texto condiciona con
  --            "where applicable" / "where relevant"
  sections        jsonb NOT NULL DEFAULT '[]'::jsonb,

  validity_months integer NOT NULL DEFAULT 12,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Una plantilla publicada no se edita: se sube de versión. Igual que las
-- migraciones, y por el mismo motivo — un documento generado tiene que poder
-- decir con qué estructura se generó.
CREATE UNIQUE INDEX IF NOT EXISTS uq_document_templates_version
  ON fluxion.document_templates (
    COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid),
    key,
    version
  );

COMMENT ON TABLE fluxion.document_templates IS
  'Estructura canónica de los documentos regulatorios, versionada. organization_id NULL = catálogo de Fluxion.';

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.document_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_templates_select ON fluxion.document_templates;
CREATE POLICY document_templates_select ON fluxion.document_templates
  FOR SELECT USING (
    organization_id IS NULL
    OR organization_id IN (
      SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
    )
  );

-- Sobre el catálogo no escribe nadie desde la aplicación: solo service_role.
DROP POLICY IF EXISTS document_templates_insert ON fluxion.document_templates;
CREATE POLICY document_templates_insert ON fluxion.document_templates
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS document_templates_update ON fluxion.document_templates;
CREATE POLICY document_templates_update ON fluxion.document_templates
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE ON fluxion.document_templates TO authenticated;
GRANT ALL ON fluxion.document_templates TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Semilla: Anexo IV · Documentación técnica (art. 11.1)
--
-- Los enunciados son traducción del texto oficial. `required = false` marca los
-- apartados que el propio Reglamento condiciona con "where applicable" o
-- "where relevant": si un sistema es software puro, exigirle fotografías del
-- producto (1.f) no es rigor, es ruido que entierra los huecos de verdad.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO fluxion.document_templates
  (organization_id, key, version, title, description, framework, validity_months, sections)
VALUES (
  NULL,
  'annex_iv',
  1,
  'Documentación técnica · Anexo IV',
  'Expediente técnico exigido por el artículo 11.1 del Reglamento (UE) 2024/1689 a los sistemas de IA de alto riesgo.',
  'ai_act',
  12,
  $json$[
  {"ref":"IV.1","kind":"heading","required":true,"source":"manual",
   "title":"Descripción general del sistema de IA",
   "guidance":"Qué es el sistema, para qué sirve y en qué forma se comercializa."},

  {"ref":"IV.1.a","kind":"field","required":true,"source":"derived:system",
   "title":"Finalidad prevista, proveedor y versión",
   "guidance":"Finalidad prevista, nombre del proveedor y versión del sistema, indicando su relación con versiones anteriores."},
  {"ref":"IV.1.b","kind":"field","required":false,"source":"derived:system",
   "title":"Interacción con otro hardware o software",
   "guidance":"Cómo interactúa el sistema con hardware o software que no forma parte de él, incluidos otros sistemas de IA. Cuando proceda."},
  {"ref":"IV.1.c","kind":"field","required":true,"source":"derived:system",
   "title":"Versiones de software o firmware",
   "guidance":"Versiones pertinentes y requisitos relativos a las actualizaciones."},
  {"ref":"IV.1.d","kind":"field","required":true,"source":"manual",
   "title":"Formas de comercialización",
   "guidance":"Todas las formas en que el sistema se introduce en el mercado o se pone en servicio: paquetes embebidos en hardware, descargas, API."},
  {"ref":"IV.1.e","kind":"field","required":true,"source":"manual",
   "title":"Hardware sobre el que se ejecuta",
   "guidance":"Descripción del hardware en el que está previsto que funcione el sistema."},
  {"ref":"IV.1.f","kind":"field","required":false,"source":"manual",
   "title":"Fotografías o ilustraciones del producto",
   "guidance":"Cuando el sistema es un componente de productos: características externas, marcado y disposición interna. No aplica a software puro."},
  {"ref":"IV.1.g","kind":"field","required":true,"source":"manual",
   "title":"Descripción básica de la interfaz de usuario",
   "guidance":"Interfaz facilitada al responsable del despliegue."},
  {"ref":"IV.1.h","kind":"field","required":false,"source":"manual",
   "title":"Instrucciones de uso para el responsable del despliegue",
   "guidance":"Instrucciones de uso y descripción básica de la interfaz. Cuando proceda. El texto oficial repite aquí la interfaz del apartado (g); se conserva la duplicidad para que la referencia coincida con el Reglamento."},

  {"ref":"IV.2","kind":"heading","required":true,"source":"manual",
   "title":"Descripción detallada de los elementos y del proceso de desarrollo",
   "guidance":"Cómo se construyó el sistema y con qué decisiones de diseño."},

  {"ref":"IV.2.a","kind":"field","required":true,"source":"derived:system",
   "title":"Métodos y fases de desarrollo",
   "guidance":"Incluido el recurso a sistemas o herramientas preentrenados de terceros y cómo se usaron, integraron o modificaron."},
  {"ref":"IV.2.b","kind":"field","required":true,"source":"derived:system",
   "title":"Especificaciones de diseño",
   "guidance":"Lógica general y algoritmos; decisiones clave de diseño con su justificación y supuestos, incluidos los relativos a las personas sobre las que se usará; qué optimiza el sistema; salida esperada y su calidad; compromisos adoptados frente a los requisitos del capítulo III, sección 2."},
  {"ref":"IV.2.c","kind":"field","required":true,"source":"manual",
   "title":"Arquitectura y recursos computacionales",
   "guidance":"Cómo se articulan los componentes de software y recursos usados para desarrollar, entrenar, probar y validar."},
  {"ref":"IV.2.d","kind":"field","required":false,"source":"derived:system",
   "title":"Requisitos de datos y conjuntos de entrenamiento",
   "guidance":"Procedencia, alcance y características principales; obtención y selección; procedimientos de etiquetado y limpieza. Cuando proceda."},
  {"ref":"IV.2.e","kind":"field","required":true,"source":"derived:system",
   "title":"Medidas de vigilancia humana (art. 14)",
   "guidance":"Incluida la valoración de las medidas técnicas que facilitan la interpretación de los resultados, conforme al art. 13.3.d."},
  {"ref":"IV.2.f","kind":"field","required":false,"source":"manual",
   "title":"Cambios predeterminados del sistema y su rendimiento",
   "guidance":"Con las soluciones técnicas que garantizan el cumplimiento continuo. Cuando proceda."},
  {"ref":"IV.2.g","kind":"field","required":true,"source":"derived:system",
   "title":"Procedimientos de validación y prueba",
   "guidance":"Datos de validación y prueba; métricas de precisión, solidez y de posibles impactos discriminatorios; registros e informes de prueba fechados y firmados."},
  {"ref":"IV.2.h","kind":"field","required":true,"source":"manual",
   "title":"Medidas de ciberseguridad",
   "guidance":"Medidas implantadas."},

  {"ref":"IV.3","kind":"field","required":true,"source":"derived:fmea",
   "title":"Seguimiento, funcionamiento y control",
   "guidance":"Capacidades y limitaciones de rendimiento, incluida la precisión para personas o grupos concretos; resultados no deseados previsibles y fuentes de riesgo para la salud, la seguridad, los derechos fundamentales y la discriminación; medidas de vigilancia humana; especificaciones sobre los datos de entrada."},

  {"ref":"IV.4","kind":"field","required":true,"source":"manual",
   "title":"Idoneidad de las métricas de rendimiento",
   "guidance":"Por qué las métricas elegidas son las adecuadas para este sistema."},

  {"ref":"IV.5","kind":"field","required":true,"source":"derived:fmea",
   "title":"Sistema de gestión de riesgos (art. 9)",
   "guidance":"Descripción detallada. Se alimenta del análisis FMEA y del plan de tratamiento."},

  {"ref":"IV.6","kind":"field","required":true,"source":"derived:history",
   "title":"Cambios relevantes a lo largo del ciclo de vida",
   "guidance":"Cambios introducidos por el proveedor. Se alimenta del historial del sistema."},

  {"ref":"IV.7","kind":"field","required":true,"source":"manual",
   "title":"Normas armonizadas aplicadas",
   "guidance":"Lista de normas aplicadas total o parcialmente cuyas referencias se hayan publicado en el DOUE. Si no se han aplicado, descripción detallada de las soluciones adoptadas y lista de otras normas y especificaciones técnicas."},

  {"ref":"IV.8","kind":"field","required":true,"source":"manual",
   "title":"Copia de la declaración UE de conformidad (art. 47)",
   "guidance":"Adjuntar el documento firmado."},

  {"ref":"IV.9","kind":"field","required":true,"source":"manual",
   "title":"Sistema de vigilancia poscomercialización (art. 72)",
   "guidance":"Descripción del sistema de evaluación del rendimiento tras la comercialización, incluido el plan de vigilancia del art. 72.3."}
]$json$::jsonb
)
ON CONFLICT DO NOTHING;
