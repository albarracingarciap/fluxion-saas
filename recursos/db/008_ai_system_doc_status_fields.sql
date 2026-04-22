ALTER TABLE fluxion.ai_systems
  ALTER COLUMN dpia_completed DROP DEFAULT,
  ALTER COLUMN has_logging DROP DEFAULT,
  ALTER COLUMN has_human_oversight DROP DEFAULT,
  ALTER COLUMN has_risk_assessment DROP DEFAULT;

ALTER TABLE fluxion.ai_systems
  ALTER COLUMN dpia_completed TYPE fluxion.doc_status
    USING (
      CASE
        WHEN dpia_completed IS TRUE THEN 'si'::fluxion.doc_status
        WHEN dpia_completed IS FALSE THEN 'no'::fluxion.doc_status
        ELSE NULL
      END
    ),
  ALTER COLUMN has_logging TYPE fluxion.doc_status
    USING (
      CASE
        WHEN has_logging IS TRUE THEN 'si'::fluxion.doc_status
        WHEN has_logging IS FALSE THEN 'no'::fluxion.doc_status
        ELSE NULL
      END
    ),
  ALTER COLUMN has_human_oversight TYPE fluxion.doc_status
    USING (
      CASE
        WHEN has_human_oversight IS TRUE THEN 'si'::fluxion.doc_status
        WHEN has_human_oversight IS FALSE THEN 'no'::fluxion.doc_status
        ELSE NULL
      END
    ),
  ALTER COLUMN has_risk_assessment TYPE fluxion.doc_status
    USING (
      CASE
        WHEN has_risk_assessment IS TRUE THEN 'si'::fluxion.doc_status
        WHEN has_risk_assessment IS FALSE THEN 'no'::fluxion.doc_status
        ELSE NULL
      END
    );

COMMENT ON COLUMN fluxion.ai_systems.dpia_completed IS 'RGPD Art. 35 — Estado de la DPIA: si, proceso o no.';
COMMENT ON COLUMN fluxion.ai_systems.has_logging IS 'AI Act Art. 12 — Estado del logging: si, parcial o no.';
COMMENT ON COLUMN fluxion.ai_systems.has_human_oversight IS 'AI Act Art. 14 — Estado de supervisión humana: si, parcial o no.';
COMMENT ON COLUMN fluxion.ai_systems.has_risk_assessment IS 'AI Act Art. 9 + ISO 42001 §6.1 — Estado de la evaluación de riesgos: si, proceso o no.';
