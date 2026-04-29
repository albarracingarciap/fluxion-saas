-- recursos/db/065_system_failure_mode_evidences.sql
--
-- Tabla puente: vincula evidencias del sistema con modos de fallo activados.
-- Permite responder "¿qué evidencias respaldan este modo de fallo/control?".
--
-- Decisión de diseño: enlazamos a system_failure_modes (activación por sistema),
-- NO a fmea_items (ítem de evaluación concreto). Así el vínculo es persistente
-- entre ciclos de evaluación FMEA y no se pierde al abrir una nueva versión.

CREATE TABLE fluxion.system_failure_mode_evidences (
  system_failure_mode_id  UUID NOT NULL
    REFERENCES fluxion.system_failure_modes(id) ON DELETE CASCADE,
  evidence_id             UUID NOT NULL
    REFERENCES fluxion.system_evidences(id) ON DELETE CASCADE,
  linked_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  linked_by               UUID REFERENCES fluxion.profiles(id) ON DELETE SET NULL,

  PRIMARY KEY (system_failure_mode_id, evidence_id)
);

CREATE INDEX idx_sfme_evidence_id
  ON fluxion.system_failure_mode_evidences(evidence_id);

ALTER TABLE fluxion.system_failure_mode_evidences ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON TABLE fluxion.system_failure_mode_evidences TO authenticated;

-- SELECT: cualquier miembro de la organización
CREATE POLICY "sfme_select"
  ON fluxion.system_failure_mode_evidences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.system_evidences e
      WHERE e.id = fluxion.system_failure_mode_evidences.evidence_id
        AND e.organization_id IN (
          SELECT organization_id FROM fluxion.profiles
          WHERE user_id = auth.uid()
        )
    )
  );

-- INSERT: roles con capacidad de gestión de riesgos
CREATE POLICY "sfme_insert"
  ON fluxion.system_failure_mode_evidences FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fluxion.system_evidences e
      WHERE e.id = fluxion.system_failure_mode_evidences.evidence_id
        AND e.organization_id IN (
          SELECT organization_id FROM fluxion.profiles
          WHERE user_id = auth.uid()
            AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo',
                         'risk_analyst', 'compliance_analyst', 'system_owner')
        )
    )
  );

-- DELETE: mismos roles que INSERT
CREATE POLICY "sfme_delete"
  ON fluxion.system_failure_mode_evidences FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.system_evidences e
      WHERE e.id = fluxion.system_failure_mode_evidences.evidence_id
        AND e.organization_id IN (
          SELECT organization_id FROM fluxion.profiles
          WHERE user_id = auth.uid()
            AND role IN ('org_admin', 'sgai_manager', 'caio', 'dpo',
                         'risk_analyst', 'compliance_analyst', 'system_owner')
        )
    )
  );
