-- ============================================================================
-- Expediente: notificación de la FRIA y presentación del registro UE (B17b)
-- ============================================================================
--   Informe del flujo de trabajo (docs/producto/informe-flujo-trabajo-ia.md):
--     - la FRIA aprobada se notifica a la autoridad de vigilancia del mercado
--       (AI Act, Art. 27.3), y la ficha para el registro UE se presenta en la
--       base de datos de la UE (Art. 49). Las dos cosas pasan fuera de Fluxion
--       y después de aprobar el documento; hasta ahora no quedaba constancia,
--       salvo como texto del apartado 27.3, que además era obligatorio antes de
--       poder enviar la FRIA a aprobación.
--     - `fluxion.document_notifications`: a quién se notificó o dónde se
--       presentó, cuándo, con qué referencia, y quién lo registró. Una fila por
--       notificación de una versión del documento.
--     - FRIA v2: el 27.3 deja de ser obligatorio (se registra después de aprobar,
--       en la notificación) y el 27.1.d cita los riesgos de derechos
--       fundamentales del análisis de riesgos. Los documentos ya creados siguen
--       con la v1.
--
-- Idempotente.
-- ============================================================================

-- ── 1. Notificaciones de documentos ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.document_notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  document_id     uuid NOT NULL REFERENCES fluxion.documents(id) ON DELETE CASCADE,
  -- Autoridad notificada o registro donde se presentó.
  authority       text NOT NULL CHECK (length(btrim(authority)) > 0),
  notified_at     date NOT NULL,
  -- Número de registro, acuse o referencia de la presentación.
  reference       text,
  notes           text,
  created_by      uuid REFERENCES fluxion.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_notifications_document
  ON fluxion.document_notifications (document_id);

COMMENT ON TABLE fluxion.document_notifications IS
  'Notificación de un documento aprobado a una autoridad o presentación en un registro (FRIA, AI Act Art. 27.3; ficha para el registro UE, Art. 49). Solo se registra; Fluxion no envía nada (B17b).';

ALTER TABLE fluxion.document_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_notifications_select ON fluxion.document_notifications;
CREATE POLICY document_notifications_select ON fluxion.document_notifications
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS document_notifications_insert ON fluxion.document_notifications;
CREATE POLICY document_notifications_insert ON fluxion.document_notifications
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
    -- Solo de documentos aprobados de la misma organización.
    AND EXISTS (
      SELECT 1 FROM fluxion.documents d
       WHERE d.id = document_id
         AND d.organization_id = document_notifications.organization_id
         AND d.status = 'approved'
    )
  );

-- Sin UPDATE ni DELETE: es un registro de lo que se hizo.
GRANT SELECT, INSERT ON fluxion.document_notifications TO authenticated;
GRANT ALL ON fluxion.document_notifications TO service_role;


-- ── 2. FRIA v2 ──────────────────────────────────────────────────────────────

INSERT INTO fluxion.document_templates
  (organization_id, key, version, title, description, framework, validity_months, sections, is_active)
SELECT NULL, 'fria', 2, t.title, t.description, t.framework, t.validity_months,
       (SELECT jsonb_agg(
                 CASE e ->> 'ref'
                   WHEN '27.3' THEN e
                     || '{"required": false, "guidance": "Una vez aprobada, la FRIA se notifica a la autoridad de vigilancia del mercado con la plantilla del cuestionario (Art. 27.3). La notificación se registra en el expediente después de aprobar; aquí puedes anotar a qué autoridad y cómo se hará."}'::jsonb
                   WHEN '27.1.d' THEN e
                     || '{"guidance": "Riesgos que probablemente afecten a las categorías del apartado (c), teniendo en cuenta la información facilitada por el proveedor conforme al artículo 13. Sale del análisis de riesgos vigente: los modos de fallo de las dimensiones ética y legal con severidad actual 7 o más, y las instrucciones de uso del proveedor adjuntas."}'::jsonb
                   WHEN '27.4' THEN e
                     || '{"guidance": "La FRIA complementa a la DPIA del artículo 35 del RGPD; no la sustituye (Art. 27.4). Sale de la DPIA del expediente del sistema y de la ficha."}'::jsonb
                   ELSE e
                 END ORDER BY ord)
          FROM jsonb_array_elements(t.sections) WITH ORDINALITY AS x(e, ord)),
       true
  FROM fluxion.document_templates t
 WHERE t.organization_id IS NULL AND t.key = 'fria' AND t.version = 1
ON CONFLICT DO NOTHING;
