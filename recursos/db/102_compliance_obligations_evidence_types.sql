-- =============================================================================
-- 102 · Catálogos maestros: Tipos de Evidencia, Obligaciones y su relación
-- =============================================================================
-- compliance.evidence_types        → catálogo de tipos de evidencia reutilizables
-- compliance.obligations           → catálogo normativo por framework
-- compliance.obligation_evidence_types → correspondencia global obligación ↔ tipo de evidencia
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TIPOS DE EVIDENCIA
-- -----------------------------------------------------------------------------

CREATE TABLE compliance.evidence_types (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT    UNIQUE NOT NULL,          -- Ej: 'EVT-DOC-01', 'EVT-TEC-03'
  name        TEXT    NOT NULL,                 -- Ej: 'Política de IA documentada'
  description TEXT,
  category    TEXT    NOT NULL,                 -- 'documental' | 'técnica' | 'proceso' | 'certificación' | 'registro'
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE compliance.evidence_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catálogo público para lectura autenticada"
  ON compliance.evidence_types
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX idx_evidence_types_category ON compliance.evidence_types (category);

-- -----------------------------------------------------------------------------
-- 2. OBLIGACIONES NORMATIVAS
-- -----------------------------------------------------------------------------

CREATE TABLE compliance.obligations (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT    UNIQUE NOT NULL,          -- Ej: 'AI-ACT-ART9', 'ISO42001-A61'
  framework   TEXT    NOT NULL,                 -- 'AI_ACT' | 'ISO_42001' | 'RGPD' | 'DORA' | 'ENS' | 'MDR'
  article     TEXT    NOT NULL,                 -- Ej: 'Art. 9', 'A.6.1', 'Art. 13(1)'
  title       TEXT    NOT NULL,
  description TEXT,
  scope       TEXT,                             -- 'high_risk' | 'gpai' | 'general' | 'prohibited' (vacío = universal)
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE compliance.obligations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catálogo público para lectura autenticada"
  ON compliance.obligations
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX idx_obligations_framework ON compliance.obligations (framework);
CREATE INDEX idx_obligations_scope     ON compliance.obligations (scope);

-- -----------------------------------------------------------------------------
-- 3. CORRESPONDENCIA GLOBAL OBLIGACIÓN ↔ TIPO DE EVIDENCIA
-- -----------------------------------------------------------------------------

CREATE TABLE compliance.obligation_evidence_types (
  obligation_id     UUID REFERENCES compliance.obligations(id)    ON DELETE CASCADE,
  evidence_type_id  UUID REFERENCES compliance.evidence_types(id) ON DELETE CASCADE,
  requirement_level TEXT NOT NULL DEFAULT 'recommended',          -- 'mandatory' | 'recommended' | 'optional'
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (obligation_id, evidence_type_id)
);

ALTER TABLE compliance.obligation_evidence_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catálogo público para lectura autenticada"
  ON compliance.obligation_evidence_types
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX idx_oet_evidence_type ON compliance.obligation_evidence_types (evidence_type_id);

-- =============================================================================
-- SEED: Tipos de Evidencia
-- =============================================================================

INSERT INTO compliance.evidence_types (code, name, description, category) VALUES
  -- Documentales
  ('EVT-DOC-01', 'Política de IA',                  'Política organizacional que regula el desarrollo y uso de sistemas de IA',                              'documental'),
  ('EVT-DOC-02', 'Documentación técnica del sistema','Descripción del diseño, arquitectura, datos y lógica del sistema de IA',                               'documental'),
  ('EVT-DOC-03', 'Declaración de conformidad UE',   'Declaración formal de conformidad con el Reglamento de IA de la UE',                                    'documental'),
  ('EVT-DOC-04', 'Instrucciones de uso',             'Documentación destinada a los usuarios sobre el uso seguro del sistema',                               'documental'),
  ('EVT-DOC-05', 'Análisis de impacto (DPIA/FRIA)',  'Evaluación de impacto en derechos fundamentales o protección de datos',                                'documental'),
  -- Técnicas
  ('EVT-TEC-01', 'Informe de evaluación de riesgos', 'Análisis formal de los riesgos del sistema de IA con medidas de mitigación',                          'técnica'),
  ('EVT-TEC-02', 'Informe de validación y pruebas',  'Resultados de pruebas de rendimiento, robustez y fiabilidad del sistema',                              'técnica'),
  ('EVT-TEC-03', 'Informe de sesgo y equidad',       'Análisis de sesgos potenciales en los datos y en las salidas del modelo',                              'técnica'),
  ('EVT-TEC-04', 'Registro de monitorización',       'Logs o informes de seguimiento del comportamiento del sistema en producción',                          'técnica'),
  ('EVT-TEC-05', 'Informe de ciberseguridad',        'Evaluación de resiliencia ante ataques y vulnerabilidades del sistema',                                'técnica'),
  -- Proceso
  ('EVT-PRO-01', 'Acta de revisión por dirección',   'Registro formal de revisión del SGAI por parte de la alta dirección',                                  'proceso'),
  ('EVT-PRO-02', 'Registro de formación',            'Evidencia de formación del personal sobre IA responsable y normativa aplicable',                       'proceso'),
  ('EVT-PRO-03', 'Registro de incidentes',           'Registro de incidentes graves o mal funcionamiento del sistema con acciones tomadas',                  'proceso'),
  ('EVT-PRO-04', 'Acta de supervisión humana',       'Evidencia de que existe control humano efectivo sobre las decisiones del sistema',                     'proceso'),
  ('EVT-PRO-05', 'Plan de tratamiento de riesgos',   'Plan de acción para mitigar los riesgos identificados en la evaluación',                               'proceso'),
  -- Certificación
  ('EVT-CER-01', 'Certificado de organismo notificado', 'Certificado emitido por un organismo notificado acreditado según el Reglamento de IA',              'certificación'),
  ('EVT-CER-02', 'Certificación ISO 42001',          'Certificación del sistema de gestión de IA conforme a ISO/IEC 42001',                                  'certificación'),
  ('EVT-CER-03', 'Certificación de calidad de datos','Evidencia de que los datos de entrenamiento cumplen criterios de calidad documentados',                'certificación'),
  -- Registro
  ('EVT-REG-01', 'Registro en base de datos UE',     'Número de registro del sistema en la base de datos pública de la UE prevista en el Reglamento de IA', 'registro'),
  ('EVT-REG-02', 'Registro de versiones del modelo', 'Historial de versiones del modelo con cambios, fechas y responsables',                                 'registro');

-- =============================================================================
-- SEED: Obligaciones (AI Act — sistemas de alto riesgo)
-- =============================================================================

INSERT INTO compliance.obligations (code, framework, article, title, description, scope) VALUES
  ('AI-ACT-ART9',  'AI_ACT', 'Art. 9',     'Sistema de gestión de riesgos',
   'Establecer, implementar, documentar y mantener un sistema de gestión de riesgos para el ciclo de vida del sistema de IA.',
   'high_risk'),
  ('AI-ACT-ART10', 'AI_ACT', 'Art. 10',    'Datos y gobernanza de datos',
   'Los datos de entrenamiento, validación y prueba deben cumplir criterios de calidad, ser pertinentes y libres de sesgos inapropiados.',
   'high_risk'),
  ('AI-ACT-ART11', 'AI_ACT', 'Art. 11',    'Documentación técnica',
   'Elaborar y mantener documentación técnica completa del sistema de IA antes de su puesta en el mercado.',
   'high_risk'),
  ('AI-ACT-ART12', 'AI_ACT', 'Art. 12',    'Registro de eventos (logs)',
   'Los sistemas de IA de alto riesgo deben generar logs automáticos que permitan trazabilidad a lo largo de su ciclo de vida.',
   'high_risk'),
  ('AI-ACT-ART13', 'AI_ACT', 'Art. 13',    'Transparencia e información',
   'Los sistemas de IA deben ser suficientemente transparentes para que los usuarios puedan interpretar las salidas y usarlas apropiadamente.',
   'high_risk'),
  ('AI-ACT-ART14', 'AI_ACT', 'Art. 14',    'Supervisión humana',
   'Los sistemas de IA deben incorporar medidas que permitan supervisión humana efectiva durante su uso.',
   'high_risk'),
  ('AI-ACT-ART15', 'AI_ACT', 'Art. 15',    'Exactitud, robustez y ciberseguridad',
   'Los sistemas de IA deben alcanzar un nivel apropiado de exactitud, robustez y resiliencia frente a errores y ataques.',
   'high_risk'),
  ('AI-ACT-ART16', 'AI_ACT', 'Art. 16',    'Obligaciones de los proveedores',
   'El proveedor debe garantizar conformidad, registrar el sistema, disponer de sistema de calidad y notificar incidentes graves.',
   'high_risk'),
  ('AI-ACT-ART72', 'AI_ACT', 'Art. 72',    'Evaluación de impacto de derechos fundamentales (FRIA)',
   'Antes del despliegue, los desplegadores de sistemas de alto riesgo en ámbitos públicos deben realizar una FRIA.',
   'high_risk');

-- =============================================================================
-- SEED: Obligaciones (ISO/IEC 42001)
-- =============================================================================

INSERT INTO compliance.obligations (code, framework, article, title, description, scope) VALUES
  ('ISO42001-A61', 'ISO_42001', 'A.6.1',  'Objetivos del sistema de gestión de IA',
   'Establecer objetivos medibles para el SGAI alineados con la política de IA de la organización.',
   NULL),
  ('ISO42001-A62', 'ISO_42001', 'A.6.2',  'Evaluación de impacto de la IA',
   'Realizar evaluaciones de impacto de los sistemas de IA sobre individuos, grupos y sociedad.',
   NULL),
  ('ISO42001-A71', 'ISO_42001', 'A.7.1',  'Recursos del SGAI',
   'Determinar y proporcionar los recursos necesarios para el establecimiento y mejora del SGAI.',
   NULL),
  ('ISO42001-A72', 'ISO_42001', 'A.7.2',  'Competencia y formación',
   'Asegurar que el personal que trabaja con sistemas de IA tiene la competencia necesaria y evidenciarla.',
   NULL),
  ('ISO42001-A81', 'ISO_42001', 'A.8.1',  'Planificación y control operacional',
   'Planificar, implementar y controlar los procesos necesarios para cumplir los requisitos del SGAI.',
   NULL),
  ('ISO42001-A82', 'ISO_42001', 'A.8.2',  'Evaluación de riesgos de IA',
   'Realizar evaluaciones de riesgos periódicas de los sistemas de IA con criterios documentados.',
   NULL),
  ('ISO42001-A91', 'ISO_42001', 'A.9.1',  'Seguimiento, medición y análisis',
   'Evaluar el desempeño del SGAI mediante métricas definidas y a intervalos planificados.',
   NULL),
  ('ISO42001-A92', 'ISO_42001', 'A.9.2',  'Auditoría interna',
   'Realizar auditorías internas periódicas para verificar la conformidad del SGAI.',
   NULL),
  ('ISO42001-A93', 'ISO_42001', 'A.9.3',  'Revisión por la dirección',
   'La alta dirección debe revisar el SGAI a intervalos planificados para asegurar su idoneidad y eficacia.',
   NULL),
  ('ISO42001-A101','ISO_42001', 'A.10.1', 'No conformidad y acción correctiva',
   'Gestionar las no conformidades del SGAI con análisis de causa raíz y acciones correctivas documentadas.',
   NULL);

-- =============================================================================
-- SEED: Correspondencias Obligación ↔ Tipo de Evidencia
-- =============================================================================

INSERT INTO compliance.obligation_evidence_types (obligation_id, evidence_type_id, requirement_level, notes)
SELECT o.id, e.id, r.lvl, r.notes
FROM (VALUES
  -- AI Act Art. 9 — Gestión de riesgos
  ('AI-ACT-ART9',  'EVT-TEC-01', 'mandatory',    'El informe de evaluación de riesgos es el eje central del Art. 9'),
  ('AI-ACT-ART9',  'EVT-PRO-05', 'mandatory',    'El plan de tratamiento cierra el ciclo de gestión de riesgos'),
  ('AI-ACT-ART9',  'EVT-DOC-01', 'recommended',  NULL),
  -- AI Act Art. 10 — Datos
  ('AI-ACT-ART10', 'EVT-CER-03', 'mandatory',    'Debe acreditarse la calidad de los datos de entrenamiento'),
  ('AI-ACT-ART10', 'EVT-TEC-03', 'mandatory',    'El análisis de sesgo es parte de la gobernanza de datos'),
  ('AI-ACT-ART10', 'EVT-DOC-02', 'recommended',  'La documentación técnica describe la procedencia y tratamiento de datos'),
  -- AI Act Art. 11 — Documentación técnica
  ('AI-ACT-ART11', 'EVT-DOC-02', 'mandatory',    NULL),
  ('AI-ACT-ART11', 'EVT-TEC-02', 'mandatory',    NULL),
  ('AI-ACT-ART11', 'EVT-REG-02', 'recommended',  NULL),
  -- AI Act Art. 12 — Logging
  ('AI-ACT-ART12', 'EVT-TEC-04', 'mandatory',    'Los logs de monitorización son la evidencia directa del Art. 12'),
  ('AI-ACT-ART12', 'EVT-REG-02', 'recommended',  NULL),
  -- AI Act Art. 13 — Transparencia
  ('AI-ACT-ART13', 'EVT-DOC-04', 'mandatory',    'Las instrucciones de uso son el vehículo de transparencia hacia el usuario'),
  ('AI-ACT-ART13', 'EVT-DOC-02', 'recommended',  NULL),
  -- AI Act Art. 14 — Supervisión humana
  ('AI-ACT-ART14', 'EVT-PRO-04', 'mandatory',    NULL),
  ('AI-ACT-ART14', 'EVT-DOC-04', 'recommended',  NULL),
  -- AI Act Art. 15 — Exactitud y robustez
  ('AI-ACT-ART15', 'EVT-TEC-02', 'mandatory',    NULL),
  ('AI-ACT-ART15', 'EVT-TEC-05', 'mandatory',    NULL),
  ('AI-ACT-ART15', 'EVT-TEC-04', 'recommended',  NULL),
  -- AI Act Art. 16 — Obligaciones del proveedor
  ('AI-ACT-ART16', 'EVT-DOC-03', 'mandatory',    'La declaración de conformidad UE es obligatoria para puesta en mercado'),
  ('AI-ACT-ART16', 'EVT-REG-01', 'mandatory',    'El registro en la base de datos UE es requisito del Art. 71'),
  ('AI-ACT-ART16', 'EVT-PRO-03', 'mandatory',    'Los incidentes graves deben notificarse a la autoridad de vigilancia'),
  ('AI-ACT-ART16', 'EVT-CER-01', 'recommended',  NULL),
  -- AI Act Art. 72 — FRIA
  ('AI-ACT-ART72', 'EVT-DOC-05', 'mandatory',    NULL),
  ('AI-ACT-ART72', 'EVT-TEC-01', 'recommended',  NULL),
  -- ISO 42001 A.6.1
  ('ISO42001-A61', 'EVT-DOC-01', 'mandatory',    NULL),
  ('ISO42001-A61', 'EVT-PRO-01', 'recommended',  NULL),
  -- ISO 42001 A.6.2
  ('ISO42001-A62', 'EVT-DOC-05', 'mandatory',    NULL),
  ('ISO42001-A62', 'EVT-TEC-01', 'recommended',  NULL),
  -- ISO 42001 A.7.2
  ('ISO42001-A72', 'EVT-PRO-02', 'mandatory',    NULL),
  -- ISO 42001 A.8.2
  ('ISO42001-A82', 'EVT-TEC-01', 'mandatory',    NULL),
  ('ISO42001-A82', 'EVT-PRO-05', 'recommended',  NULL),
  -- ISO 42001 A.9.1
  ('ISO42001-A91', 'EVT-TEC-04', 'recommended',  NULL),
  -- ISO 42001 A.9.2
  ('ISO42001-A92', 'EVT-PRO-01', 'mandatory',    NULL),
  -- ISO 42001 A.9.3
  ('ISO42001-A93', 'EVT-PRO-01', 'mandatory',    NULL),
  -- ISO 42001 A.10.1
  ('ISO42001-A101','EVT-PRO-03', 'recommended',  NULL)
) AS r(ocode, ecode, lvl, notes)
JOIN compliance.obligations   o ON o.code = r.ocode
JOIN compliance.evidence_types e ON e.code = r.ecode;
