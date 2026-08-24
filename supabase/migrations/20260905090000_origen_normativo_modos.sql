-- ============================================================================
-- De que norma sale cada modo de fallo
-- ============================================================================
-- El catalogo de 418 modos se construyo leyendo el Reglamento, pero eso no
-- quedo registrado en ninguna parte: `rag_chunk_ids` existe para enlazar cada
-- modo con el texto de la norma y esta vacio en los 418.
--
-- Consecuencia: no se puede decir «esto se evalua porque el Art. 15.4 lo
-- exige», ni separar lo regulatorio de lo que no lo es, ni saber que articulo
-- se ha quedado sin cubrir.
--
-- El mapeo se hace por SUBCATEGORIA, no por modo: son 94 decisiones en lugar de
-- 418, y la subcategoria es justamente la agrupacion tematica que ya usaba el
-- catalogo. Los modos que se salgan de su subcategoria se corrigen despues, uno
-- a uno, con `is_override`.
--
-- Generado desde docs/producto/mapeo-subcategorias.csv. No editar a mano: se
-- corrige el CSV y se regenera.
-- ============================================================================


-- ── El universo al que pertenece cada modo ──────────────────────────────────
--
-- `buena_practica` no es un cajon de sastre: son los modos de IA generativa y
-- agentica que van por delante de la norma. Se siguen evaluando, pero no
-- fingen una exigencia que no existe — que es lo unico de todo esto que podria
-- volverse en contra delante de un auditor.

ALTER TABLE compliance.failure_modes
  ADD COLUMN IF NOT EXISTS origin text;

ALTER TABLE compliance.failure_modes
  DROP CONSTRAINT IF EXISTS chk_failure_modes_origin;

ALTER TABLE compliance.failure_modes
  ADD CONSTRAINT chk_failure_modes_origin CHECK (
    origin IS NULL OR origin IN (
      'ai_act', 'iso_42001', 'iso_27001', 'gdpr',
      'otro_derecho', 'buena_practica', 'negocio'
    )
  );

COMMENT ON COLUMN compliance.failure_modes.origin IS
  'Universo al que pertenece el modo. Regulatorio (ai_act, iso_42001, iso_27001, '
  'gdpr), juridico no regulatorio (otro_derecho), riesgo emergente sin norma '
  '(buena_practica) o riesgo de negocio (negocio).';


-- ── Referencias concretas ───────────────────────────────────────────────────
--
-- Tabla y no columna porque un modo puede colgar de varios articulos. Lo que
-- hay que poder contestarle a un auditor no es «esto es regulatorio», es «esto
-- se evalua porque el Art. 15.4 lo exige».

CREATE TABLE IF NOT EXISTS compliance.failure_mode_norm_refs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  failure_mode_id uuid NOT NULL REFERENCES compliance.failure_modes(id) ON DELETE CASCADE,

  framework       text NOT NULL,
  reference       text NOT NULL,
  is_primary      boolean NOT NULL DEFAULT true,

  -- De donde sale la asignacion. `subcategoria` es la derivada del mapeo;
  -- `manual` es una correccion humana; `ai` queda para cuando un agente
  -- proponga y alguien confirme.
  source          text NOT NULL DEFAULT 'subcategoria'
                    CHECK (source IN ('subcategoria', 'manual', 'ai')),

  -- Las de confianza media o baja necesitan que alguien las mire. Se aplican
  -- igual: mejor una referencia marcada como dudosa que ninguna.
  confidence      text NOT NULL DEFAULT 'alta'
                    CHECK (confidence IN ('alta', 'media', 'baja')),

  is_override     boolean NOT NULL DEFAULT false,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (failure_mode_id, framework, reference)
);

CREATE INDEX IF NOT EXISTS idx_fm_norm_refs_modo
  ON compliance.failure_mode_norm_refs (failure_mode_id);

CREATE INDEX IF NOT EXISTS idx_fm_norm_refs_ref
  ON compliance.failure_mode_norm_refs (framework, reference);

COMMENT ON TABLE compliance.failure_mode_norm_refs IS
  'De que articulo sale cada modo de fallo. Poblada desde el mapeo por '
  'subcategoria; las correcciones por modo van con is_override = true.';


-- ── Poblado: universo ───────────────────────────────────────────────────────

WITH mapeo(dimension_id, subcategoria, marco, confianza) AS (
  VALUES
    ('etica', 'Gobernanza y supervisión ética', 'iso_42001', 'media'),
    ('etica', 'Beneficencia y bien común', 'buena_practica', 'alta'),
    ('etica', 'Mandato y autorización en sistemas agénticos', 'buena_practica', 'alta'),
    ('etica', 'Diseño y desarrollo ético', 'iso_42001', 'media'),
    ('etica', 'Integridad creativa y derechos de autoría', 'otro_derecho', 'alta'),
    ('etica', 'No maleficencia', 'buena_practica', 'alta'),
    ('etica', 'Participación de partes interesadas', 'ai_act', 'baja'),
    ('etica', 'Equidad y no discriminación', 'ai_act', 'alta'),
    ('etica', 'Privacidad y protección de datos — perspectiva ética', 'gdpr', 'alta'),
    ('etica', 'Responsabilidad y rendición de cuentas', 'ai_act', 'alta'),
    ('etica', 'Transparencia de procesos', 'ai_act', 'alta'),
    ('etica', 'Evaluación de impacto ético — ISO 42001 A.5', 'iso_42001', 'alta'),
    ('etica', 'Transparencia y explicabilidad — perspectiva del derecho a explicación', 'ai_act', 'alta'),
    ('etica', 'Autonomía y respeto a derechos humanos', 'buena_practica', 'media'),
    ('etica', 'Sostenibilidad y responsabilidad social', 'buena_practica', 'alta'),
    ('etica', 'Veracidad e identidad del contenido generado', 'ai_act', 'alta'),
    ('gobernanza', 'Políticas y estándares', 'iso_42001', 'alta'),
    ('gobernanza', 'Rendición de cuentas', 'ai_act', 'alta'),
    ('gobernanza', 'Comunicación regulatoria y corporativa', 'ai_act', 'media'),
    ('gobernanza', 'Gestión de cambio', 'ai_act', 'alta'),
    ('gobernanza', 'Capacitación y competencia', 'ai_act', 'alta'),
    ('gobernanza', 'Estructura de gobernanza', 'iso_42001', 'alta'),
    ('gobernanza', 'Gobernanza de modelos fundacionales externos', 'ai_act', 'alta'),
    ('gobernanza', 'Gestión del ciclo de vida', 'iso_42001', 'alta'),
    ('gobernanza', 'Monitorización y auditoría', 'ai_act', 'alta'),
    ('gobernanza', 'Supervisión humana', 'ai_act', 'alta'),
    ('gobernanza', 'Gestión de riesgos embebida', 'ai_act', 'alta'),
    ('gobernanza', 'Trazabilidad', 'ai_act', 'alta'),
    ('gobernanza', 'Transparencia en gobernanza', 'iso_42001', 'media'),
    ('gobernanza', 'Gestión de proveedores', 'ai_act', 'media'),
    ('gobernanza', 'Calidad de gobierno del sistema', 'ai_act', 'alta'),
    ('legal_b', 'Due diligence — controles de proceso', 'otro_derecho', 'alta'),
    ('legal_b', '★  Responsabilidad por contenido generado', 'otro_derecho', 'alta'),
    ('legal_b', 'Discriminación — riesgo de litigio activo', 'otro_derecho', 'alta'),
    ('legal_b', 'Responsabilidad por productos y decisiones', 'otro_derecho', 'alta'),
    ('legal_b', 'Jurisdicción', 'otro_derecho', 'alta'),
    ('legal_b', 'Contratación — representación y garantías', 'otro_derecho', 'alta'),
    ('legal_b', 'Propiedad intelectual', 'otro_derecho', 'alta'),
    ('legal_b', 'Responsabilidad agéntica', 'buena_practica', 'alta'),
    ('legal_b', 'Gestión de incidentes legales', 'otro_derecho', 'alta'),
    ('roi', 'Diferenciación competitiva', 'negocio', 'alta'),
    ('roi', 'Estimación de costes', 'negocio', 'alta'),
    ('roi', 'Tiempo al valor', 'negocio', 'alta'),
    ('roi', 'Adopción de usuarios', 'negocio', 'alta'),
    ('roi', 'Decisiones de inversión', 'negocio', 'alta'),
    ('roi', 'Gestión de proyectos', 'negocio', 'alta'),
    ('roi', 'Capacidades organizacionales', 'negocio', 'alta'),
    ('roi', 'Gobernanza de costes en ejecución', 'negocio', 'alta'),
    ('roi', 'Alineación estratégica', 'negocio', 'alta'),
    ('roi', 'Adaptabilidad al mercado', 'negocio', 'alta'),
    ('roi', 'Cuantificación de beneficios', 'negocio', 'alta'),
    ('roi', 'Eficacia del modelo', 'negocio', 'media'),
    ('roi', 'Costes operativos', 'negocio', 'alta'),
    ('roi', 'Escalabilidad del negocio', 'negocio', 'alta'),
    ('seguridad', 'Privacidad y fuga de información', 'ai_act', 'alta'),
    ('seguridad', 'Evaluación de seguridad', 'ai_act', 'alta'),
    ('seguridad', 'Envenenamiento de datos', 'ai_act', 'alta'),
    ('seguridad', 'Gestión de secretos', 'iso_27001', 'alta'),
    ('seguridad', 'Gestión de actualizaciones', 'ai_act', 'alta'),
    ('seguridad', 'Ataques adversariales', 'ai_act', 'alta'),
    ('seguridad', 'Seguridad en el ciclo de vida', 'iso_42001', 'alta'),
    ('seguridad', 'Ataques de inyección contextual (IA generativa)', 'buena_practica', 'alta'),
    ('seguridad', 'Respuesta a incidentes', 'ai_act', 'alta'),
    ('seguridad', 'Seguridad del entorno de ejecución agéntico (sistemas agénticos)', 'buena_practica', 'alta'),
    ('seguridad', 'Monitorización de seguridad', 'ai_act', 'alta'),
    ('seguridad', 'Elusión de controles', 'ai_act', 'alta'),
    ('seguridad', 'Control de acceso', 'iso_27001', 'alta'),
    ('seguridad', 'Compromiso del perímetro agéntico (sistemas agénticos)', 'buena_practica', 'alta'),
    ('seguridad', 'Ataques de infraestructura', 'iso_27001', 'alta'),
    ('seguridad', 'Integridad de la base de conocimiento (IA generativa)', 'ai_act', 'baja'),
    ('seguridad', 'Manipulación del modelo', 'ai_act', 'alta'),
    ('seguridad', 'Riesgos de confidencialidad', 'ai_act', 'alta'),
    ('tecnica', 'Despliegue', 'buena_practica', 'media'),
    ('tecnica', 'Coordinación multi-agente', 'buena_practica', 'alta'),
    ('tecnica', 'Dependencias', 'buena_practica', 'media'),
    ('tecnica', 'Rendimiento del modelo', 'ai_act', 'alta'),
    ('tecnica', 'Fiabilidad de outputs', 'ai_act', 'alta'),
    ('tecnica', 'Escalabilidad', 'negocio', 'media'),
    ('tecnica', 'Control del contexto', 'buena_practica', 'alta'),
    ('tecnica', 'Evaluación', 'ai_act', 'alta'),
    ('tecnica', 'Actualizaciones', 'ai_act', 'alta'),
    ('tecnica', 'Calidad de datos', 'ai_act', 'alta'),
    ('tecnica', 'Interpretabilidad', 'ai_act', 'alta'),
    ('tecnica', 'Complejidad computacional', 'negocio', 'alta'),
    ('tecnica', 'Calidad en sistemas RAG', 'buena_practica', 'alta'),
    ('tecnica', 'Contención y límites', 'buena_practica', 'alta'),
    ('tecnica', 'Desarrollo', 'iso_42001', 'media'),
    ('tecnica', 'Gestión de herramientas', 'buena_practica', 'alta'),
    ('tecnica', 'Latencia', 'negocio', 'media'),
    ('tecnica', 'Control de acciones', 'buena_practica', 'alta'),
    ('tecnica', 'Documentación', 'ai_act', 'alta'),
    ('tecnica', 'Robustez', 'ai_act', 'alta'),
    ('tecnica', 'Manipulación de entrada', 'ai_act', 'media'),
    ('tecnica', 'Monitorización', 'ai_act', 'alta')
)
UPDATE compliance.failure_modes fm
   SET origin = m.marco
  FROM mapeo m
 WHERE fm.dimension_id = m.dimension_id
   AND fm.subcategoria = m.subcategoria
   AND fm.origin IS DISTINCT FROM m.marco;


-- ── Poblado: referencias ────────────────────────────────────────────────────

WITH mapeo(dimension_id, subcategoria, marco, referencia, primaria, confianza, nota) AS (
  VALUES
    ('etica', 'Gobernanza y supervisión ética', 'iso_42001', 'A.2', true, 'media', 'Política y roles de IA. El AI Act lo toca de refilón en el Art. 17.1.m.'),
    ('etica', 'Gobernanza y supervisión ética', 'iso_42001', 'A.3', false, 'media', 'Política y roles de IA. El AI Act lo toca de refilón en el Art. 17.1.m.'),
    ('etica', 'Diseño y desarrollo ético', 'iso_42001', 'A.6', true, 'media', 'Ciclo de vida responsable.'),
    ('etica', 'Integridad creativa y derechos de autoría', 'otro_derecho', 'Propiedad intelectual', true, 'alta', 'También Art. 53.1.c del AI Act si el sistema es GPAI.'),
    ('etica', 'Participación de partes interesadas', 'ai_act', 'Art. 27', true, 'baja', 'La FRIA prevé consulta. Revisar si encaja o es buena práctica.'),
    ('etica', 'Equidad y no discriminación', 'ai_act', 'Art. 10.2.f-g', true, 'alta', 'Sesgo en los datos. Anclaje sólido.'),
    ('etica', 'Privacidad y protección de datos — perspectiva ética', 'gdpr', 'Art. 5, Art. 35', true, 'alta', ''),
    ('etica', 'Responsabilidad y rendición de cuentas', 'ai_act', 'Art. 17.1.m', true, 'alta', 'Marco de rendición de cuentas del SGC.'),
    ('etica', 'Transparencia de procesos', 'ai_act', 'Art. 13', true, 'alta', ''),
    ('etica', 'Evaluación de impacto ético — ISO 42001 A.5', 'iso_42001', 'A.5', true, 'alta', 'El propio nombre ya lleva el ancla.'),
    ('etica', 'Transparencia y explicabilidad — perspectiva del derecho a explicación', 'ai_act', 'Art. 86', true, 'alta', 'Derecho a explicación de decisiones individuales. También RGPD Art. 22.'),
    ('etica', 'Veracidad e identidad del contenido generado', 'ai_act', 'Art. 50', true, 'alta', 'Marcado de contenido generado.'),
    ('gobernanza', 'Políticas y estándares', 'iso_42001', '5.2', true, 'alta', ''),
    ('gobernanza', 'Políticas y estándares', 'iso_42001', 'A.2', false, 'alta', ''),
    ('gobernanza', 'Rendición de cuentas', 'ai_act', 'Art. 17.1.m', true, 'alta', ''),
    ('gobernanza', 'Comunicación regulatoria y corporativa', 'ai_act', 'Art. 73', true, 'media', 'Notificación de incidentes graves. Parte es comunicación corporativa sin artículo.'),
    ('gobernanza', 'Gestión de cambio', 'ai_act', 'Art. 17.1.a', true, 'alta', 'Gestión de modificaciones del sistema.'),
    ('gobernanza', 'Capacitación y competencia', 'ai_act', 'Art. 26.2', true, 'alta', 'Competencia, formación y autoridad. También ISO 7.2.'),
    ('gobernanza', 'Estructura de gobernanza', 'iso_42001', '5.3', true, 'alta', ''),
    ('gobernanza', 'Gobernanza de modelos fundacionales externos', 'ai_act', 'Cap. V (Art. 53-55)', true, 'alta', 'Modelos de propósito general.'),
    ('gobernanza', 'Gestión del ciclo de vida', 'iso_42001', 'A.6', true, 'alta', ''),
    ('gobernanza', 'Monitorización y auditoría', 'ai_act', 'Art. 72', true, 'alta', 'Vigilancia poscomercialización.'),
    ('gobernanza', 'Supervisión humana', 'ai_act', 'Art. 14', true, 'alta', 'Anclaje sólido. Alimenta también el módulo HITL.'),
    ('gobernanza', 'Gestión de riesgos embebida', 'ai_act', 'Art. 9', true, 'alta', ''),
    ('gobernanza', 'Trazabilidad', 'ai_act', 'Art. 12', true, 'alta', 'Registros automáticos.'),
    ('gobernanza', 'Gestión de proveedores', 'ai_act', 'Art. 25', true, 'media', 'Responsabilidades en la cadena de valor. También ISO A.10.'),
    ('gobernanza', 'Calidad de gobierno del sistema', 'ai_act', 'Art. 17', true, 'alta', 'Sistema de gestión de la calidad.'),
    ('legal_b', 'Responsabilidad por productos y decisiones', 'otro_derecho', 'Directiva de responsabilidad por productos', true, 'alta', ''),
    ('seguridad', 'Privacidad y fuga de información', 'ai_act', 'Art. 15.5', true, 'alta', 'Confidentiality attacks. También RGPD.'),
    ('seguridad', 'Evaluación de seguridad', 'ai_act', 'Art. 15', true, 'alta', ''),
    ('seguridad', 'Envenenamiento de datos', 'ai_act', 'Art. 15.5', true, 'alta', '★ El artículo nombra «data poisoning» literalmente.'),
    ('seguridad', 'Gestión de actualizaciones', 'ai_act', 'Art. 15', true, 'alta', ''),
    ('seguridad', 'Gestión de actualizaciones', 'ai_act', 'Art. 72', false, 'alta', ''),
    ('seguridad', 'Ataques adversariales', 'ai_act', 'Art. 15.5', true, 'alta', '★ El artículo nombra «adversarial examples» literalmente.'),
    ('seguridad', 'Seguridad en el ciclo de vida', 'iso_42001', 'A.6', true, 'alta', ''),
    ('seguridad', 'Respuesta a incidentes', 'ai_act', 'Art. 73', true, 'alta', ''),
    ('seguridad', 'Monitorización de seguridad', 'ai_act', 'Art. 72', true, 'alta', ''),
    ('seguridad', 'Elusión de controles', 'ai_act', 'Art. 15.5', true, 'alta', '★ El artículo nombra «model evasion» literalmente.'),
    ('seguridad', 'Integridad de la base de conocimiento (IA generativa)', 'ai_act', 'Art. 10', true, 'baja', 'Gobernanza de datos, pero el RAG no está contemplado. Podría ser buena práctica.'),
    ('seguridad', 'Manipulación del modelo', 'ai_act', 'Art. 15.5', true, 'alta', '★ El artículo nombra «model poisoning» literalmente.'),
    ('seguridad', 'Riesgos de confidencialidad', 'ai_act', 'Art. 15.5', true, 'alta', '★ El artículo nombra «confidentiality attacks» literalmente.'),
    ('tecnica', 'Rendimiento del modelo', 'ai_act', 'Art. 15.1', true, 'alta', 'Exactitud.'),
    ('tecnica', 'Fiabilidad de outputs', 'ai_act', 'Art. 15.1', true, 'alta', ''),
    ('tecnica', 'Evaluación', 'ai_act', 'Art. 17.1.d', true, 'alta', 'Procedimientos de examen, prueba y validación.'),
    ('tecnica', 'Actualizaciones', 'ai_act', 'Art. 17.1.a', true, 'alta', ''),
    ('tecnica', 'Calidad de datos', 'ai_act', 'Art. 10', true, 'alta', 'Gobernanza de datos. Anclaje sólido.'),
    ('tecnica', 'Interpretabilidad', 'ai_act', 'Art. 13', true, 'alta', ''),
    ('tecnica', 'Desarrollo', 'iso_42001', 'A.6', true, 'media', ''),
    ('tecnica', 'Documentación', 'ai_act', 'Art. 11', true, 'alta', ''),
    ('tecnica', 'Documentación', 'ai_act', 'Anexo IV', false, 'alta', ''),
    ('tecnica', 'Robustez', 'ai_act', 'Art. 15.1', true, 'alta', ''),
    ('tecnica', 'Manipulación de entrada', 'ai_act', 'Art. 15.5', true, 'media', 'Solapa con ataques adversariales.'),
    ('tecnica', 'Monitorización', 'ai_act', 'Art. 72', true, 'alta', '')
)
INSERT INTO compliance.failure_mode_norm_refs
  (failure_mode_id, framework, reference, is_primary, confidence, note)
SELECT fm.id, m.marco, m.referencia, m.primaria, m.confianza, NULLIF(m.nota, '')
  FROM compliance.failure_modes fm
  JOIN mapeo m
    ON fm.dimension_id = m.dimension_id
   AND fm.subcategoria = m.subcategoria
ON CONFLICT (failure_mode_id, framework, reference) DO NOTHING;


-- ── Cobertura: que obligacion no tiene ningun modo detras ───────────────────
--
-- Es la pregunta que originó todo esto y que hasta ahora no tenia respuesta,
-- porque faltaban las dos mitades: el inventario de la norma y el enlace de los
-- modos con ella.
--
-- El emparejamiento es por prefijo con frontera, y en los DOS sentidos:
--
--   · la referencia «Art. 15.5» cubre la obligacion «Art. 15» (mas fina)
--   · la referencia «A.6» cubre la obligacion «A.6.1» (mas gruesa)
--
-- El segundo sentido hace falta porque el mapeo de ISO se hizo a nivel de
-- familia del Anexo A y el catalogo de obligaciones esta a nivel de control.
-- Sin el, las diez obligaciones de ISO saldrian sin cubrir y seria mentira.
--
-- La frontera del punto evita que «Art. 1» se cuele como «Art. 15».
--
-- ⚠️ Un hueco no siempre es un fallo. El Art. 47 —declaracion UE de
-- conformidad— es un tramite documental, no un riesgo que pueda materializarse:
-- que no tenga modos asociados es correcto. La vista senala donde mirar, no
-- dictamina.

CREATE OR REPLACE VIEW compliance.v_obligation_coverage AS
SELECT
  o.code,
  o.framework,
  o.article,
  o.title,
  o.scope,
  count(DISTINCT r.failure_mode_id) AS modos,
  count(DISTINCT r.failure_mode_id) FILTER (WHERE r.confidence <> 'alta') AS modos_por_revisar
FROM compliance.obligations o
LEFT JOIN compliance.failure_mode_norm_refs r
       ON r.framework = lower(o.framework)
      AND (
            r.reference = o.article
         OR r.reference LIKE o.article || '.%'
         OR o.article   LIKE r.reference || '.%'
          )
GROUP BY o.id, o.code, o.framework, o.article, o.title, o.scope;

COMMENT ON VIEW compliance.v_obligation_coverage IS
  'Cuantos modos de fallo respaldan cada obligacion. Cero no significa '
  'necesariamente hueco: hay obligaciones documentales que no generan riesgo.';

GRANT SELECT ON compliance.v_obligation_coverage TO authenticated, service_role;
GRANT SELECT ON compliance.failure_mode_norm_refs TO authenticated;
GRANT ALL    ON compliance.failure_mode_norm_refs TO service_role;
