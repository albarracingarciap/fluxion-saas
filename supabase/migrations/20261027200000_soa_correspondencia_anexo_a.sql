-- ============================================================================
-- Declaración de Aplicabilidad: correspondencia plantilla de control → Anexo A (B17e2)
-- ============================================================================
--   F-11 (GAP-29): un control implantado en el plan de tratamiento de un
--   sistema, con evidencia válida, propone como «Implantado» el control
--   equivalente del Anexo A de la ISO/IEC 42001 en la Declaración. La propuesta
--   no cambia nada sola: se acepta en la Declaración.
--
--   `compliance.control_template_soa_controls`: qué controles del Anexo A cubre
--   cada plantilla de control. Una plantilla puede cubrir varios. La mantiene
--   el administrador de la plataforma en Datos › Plantilla ↔ Anexo A.
--
--   Correspondencia inicial aprobada por el responsable (2026-10-27):
--   docs/producto/correspondencia-controles-anexo-a.md. Se hizo por el
--   contenido de cada plantilla, no por sus etiquetas «ISO A.x», que siguen
--   otra numeración. 47 plantillas tienen correspondencia; las de seguridad de
--   la información (ISO/IEC 27001), costes y cláusulas del sistema de gestión,
--   no.
--
-- Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance.control_template_soa_controls (
  template_id      uuid NOT NULL REFERENCES compliance.control_templates(id) ON DELETE CASCADE,
  -- Código del control del Anexo A (lib/templates/iso42001-catalog.ts).
  soa_control_code text NOT NULL CHECK (soa_control_code IN (
    'A.2.2', 'A.2.3', 'A.2.4', 'A.3.2', 'A.3.3', 'A.4.2', 'A.4.3', 'A.4.4', 'A.4.5', 'A.4.6',
    'A.5.2', 'A.5.3', 'A.5.4', 'A.5.5', 'A.6.1.2', 'A.6.1.3', 'A.6.2.2', 'A.6.2.3', 'A.6.2.4',
    'A.6.2.5', 'A.6.2.6', 'A.6.2.7', 'A.6.2.8', 'A.7.2', 'A.7.3', 'A.7.4', 'A.7.5', 'A.7.6',
    'A.8.2', 'A.8.3', 'A.8.4', 'A.8.5', 'A.9.2', 'A.9.3', 'A.9.4', 'A.10.2', 'A.10.3', 'A.10.4'
  )),
  -- alta: la plantilla es esencialmente el control; media: lo cubre en parte.
  confidence       text NOT NULL DEFAULT 'media' CHECK (confidence IN ('alta', 'media')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (template_id, soa_control_code)
);

CREATE INDEX IF NOT EXISTS idx_control_template_soa_controls_code
  ON compliance.control_template_soa_controls (soa_control_code);

COMMENT ON TABLE compliance.control_template_soa_controls IS
  'Controles del Anexo A de la ISO/IEC 42001 que cubre cada plantilla de control: alimenta las propuestas de la Declaración de Aplicabilidad (B17e2).';

ALTER TABLE compliance.control_template_soa_controls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catálogo público para lectura autenticada" ON compliance.control_template_soa_controls;
CREATE POLICY "catálogo público para lectura autenticada" ON compliance.control_template_soa_controls
  FOR SELECT USING (auth.role() = 'authenticated');

-- Las escrituras van con service role desde Datos, tras comprobar que es el
-- administrador de la plataforma.
GRANT SELECT ON compliance.control_template_soa_controls TO authenticated;
GRANT ALL ON compliance.control_template_soa_controls TO service_role;

INSERT INTO compliance.control_template_soa_controls (template_id, soa_control_code, confidence)
SELECT t.id, v.soa_control_code, v.confidence
  FROM (VALUES
    ('CTL-001', 'A.6.2.6', 'alta'),
    ('CTL-002', 'A.6.2.4', 'media'),
    ('CTL-002', 'A.5.4', 'media'),
    ('CTL-003', 'A.7.4', 'alta'),
    ('CTL-004', 'A.6.2.6', 'alta'),
    ('CTL-005', 'A.6.2.4', 'media'),
    ('CTL-006', 'A.6.2.3', 'media'),
    ('CTL-006', 'A.6.2.8', 'media'),
    ('CTL-007', 'A.6.2.4', 'alta'),
    ('CTL-008', 'A.8.2', 'media'),
    ('CTL-009', 'A.10.3', 'alta'),
    ('CTL-010', 'A.6.2.5', 'alta'),
    ('CTL-011', 'A.6.2.6', 'media'),
    ('CTL-012', 'A.6.2.2', 'media'),
    ('CTL-013', 'A.6.1.3', 'media'),
    ('CTL-014', 'A.6.2.7', 'alta'),
    ('CTL-016', 'A.6.2.6', 'media'),
    ('CTL-017', 'A.7.4', 'media'),
    ('CTL-018', 'A.6.2.4', 'media'),
    ('CTL-021', 'A.8.4', 'alta'),
    ('CTL-023', 'A.6.2.4', 'media'),
    ('CTL-024', 'A.5.2', 'alta'),
    ('CTL-024', 'A.5.3', 'alta'),
    ('CTL-025', 'A.8.5', 'media'),
    ('CTL-026', 'A.9.2', 'media'),
    ('CTL-027', 'A.7.4', 'media'),
    ('CTL-027', 'A.5.4', 'media'),
    ('CTL-028', 'A.8.2', 'alta'),
    ('CTL-029', 'A.7.5', 'media'),
    ('CTL-030', 'A.5.5', 'media'),
    ('CTL-031', 'A.9.4', 'alta'),
    ('CTL-031', 'A.9.3', 'alta'),
    ('CTL-032', 'A.3.2', 'alta'),
    ('CTL-033', 'A.2.2', 'alta'),
    ('CTL-033', 'A.2.4', 'alta'),
    ('CTL-034', 'A.6.1.3', 'alta'),
    ('CTL-035', 'A.6.2.8', 'alta'),
    ('CTL-036', 'A.10.3', 'alta'),
    ('CTL-037', 'A.4.6', 'alta'),
    ('CTL-038', 'A.8.3', 'media'),
    ('CTL-038', 'A.8.4', 'media'),
    ('CTL-039', 'A.9.2', 'media'),
    ('CTL-043', 'A.6.2.6', 'media'),
    ('CTL-045', 'A.5.2', 'media'),
    ('CTL-046', 'A.10.3', 'media'),
    ('CTL-046', 'A.10.4', 'media'),
    ('CTL-047', 'A.5.4', 'media'),
    ('CTL-049', 'A.4.3', 'media'),
    ('CTL-051', 'A.5.4', 'media'),
    ('CTL-054', 'A.8.4', 'alta'),
    ('CTL-055', 'A.4.2', 'media'),
    ('CTL-056', 'A.6.2.4', 'alta'),
    ('CTL-057', 'A.6.1.3', 'alta'),
    ('CTL-057', 'A.6.1.2', 'alta'),
    ('CTL-058', 'A.6.1.2', 'media'),
    ('CTL-059', 'A.8.2', 'media')
  ) AS v(template_code, soa_control_code, confidence)
  JOIN compliance.control_templates t ON t.code = v.template_code
ON CONFLICT (template_id, soa_control_code) DO NOTHING;
