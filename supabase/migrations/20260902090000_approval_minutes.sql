-- ============================================================================
-- C3 · Actas de aprobacion
-- ============================================================================
-- Hasta ahora, la unica huella de una aprobacion por comite era
-- `treatment_plans.approval_minutes_ref`: un campo de texto donde alguien
-- escribia «Acta 2026-04». Nadie comprobaba que esa acta existiera.
--
-- El acta se genera a partir de los votos que ya estan en la base: quien
-- asistio, quien voto que, cuando, y con que politica. No se teclea, y por eso
-- no puede decir algo distinto de lo que paso.
--
-- Reutiliza el motor documental de C1 —plantilla, compositor, renderizador,
-- MinIO— en lugar de montar una segunda via para generar PDFs.

-- ── El documento sabe de que solicitud sale ─────────────────────────────────
--
-- El compositor esta centrado en el sistema: todo su contexto derivado cuelga
-- de `ai_system_id`. Un acta cuelga de una solicitud, asi que necesita su
-- propia referencia.
--
-- `ai_system_id` se sigue rellenando cuando se puede resolver —un plan de
-- tratamiento pertenece a un sistema— para que el acta aparezca en el
-- expediente, que es donde un auditor la busca.

ALTER TABLE fluxion.documents
  ADD COLUMN IF NOT EXISTS approval_request_id uuid
    REFERENCES fluxion.approval_requests(id) ON DELETE SET NULL;

COMMENT ON COLUMN fluxion.documents.approval_request_id IS
  'Solicitud de aprobacion de la que sale este documento, para las actas. '
  'NULL en el resto de documentos.';

CREATE INDEX IF NOT EXISTS idx_documents_approval_request
  ON fluxion.documents (approval_request_id)
  WHERE approval_request_id IS NOT NULL;


-- ── Un sistema tiene UNA acta por aprobacion, no una en total ───────────────
--
-- `uq_documents_system_template` impide dos documentos vivos con la misma
-- plantilla para el mismo sistema. Es correcto para el Anexo IV —dos anexos del
-- mismo sistema es la forma mas rapida de entregar el que no era— y es justo lo
-- contrario de lo que necesita un acta: cada aprobacion genera la suya y todas
-- conviven.
--
-- La invariante real es «un expediente regulatorio vivo por sistema», no «un
-- documento». Las actas son registros, no expedientes.

DROP INDEX IF EXISTS fluxion.uq_documents_system_template;

CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_system_template
  ON fluxion.documents (organization_id, ai_system_id, template_key)
  WHERE status <> 'superseded'
    AND ai_system_id IS NOT NULL
    AND template_key <> 'approval_minutes';


-- ── Plantilla ───────────────────────────────────────────────────────────────
--
-- Todas las secciones son derivadas y ninguna es manual: un acta que se pueda
-- editar a mano no prueba nada. Es la diferencia con el Anexo IV, donde lo
-- manual es legitimo porque describe decisiones de diseño.

INSERT INTO fluxion.document_templates
  (organization_id, key, version, title, description, framework, validity_months, sections)
VALUES (
  NULL,
  'approval_minutes',
  1,
  'Acta de aprobacion',
  'Registro de la decision de aprobacion: asistentes, quorum, votos emitidos y resultado. Se genera a partir de los votos registrados.',
  'ai_act',
  120,
  $json$[
  {"ref":"ACTA.1","kind":"heading","required":true,"source":"derived:approval",
   "title":"Identificacion",
   "guidance":"Organizacion, organo que decide, fecha y objeto sometido a decision."},
  {"ref":"ACTA.1.a","kind":"field","required":true,"source":"derived:approval",
   "title":"Objeto sometido a decision",
   "guidance":"Que se somete a aprobacion y a que sistema pertenece."},
  {"ref":"ACTA.1.b","kind":"field","required":true,"source":"derived:approval",
   "title":"Solicitud",
   "guidance":"Quien la abrio, cuando, y con que politica."},

  {"ref":"ACTA.2","kind":"heading","required":true,"source":"derived:approval",
   "title":"Circuito aplicado",
   "guidance":"Cadena de aprobacion vigente en el momento de abrir la solicitud."},
  {"ref":"ACTA.2.a","kind":"field","required":true,"source":"derived:approval",
   "title":"Pasos y quorum",
   "guidance":"Quien debia aprobar en cada paso y cuantos votos hacian falta. Se toma de la politica congelada, no de la vigente hoy."},
  {"ref":"ACTA.2.b","kind":"field","required":true,"source":"derived:approval",
   "title":"Segregacion de funciones",
   "guidance":"Si quien solicito podia aprobar, y con que consecuencia."},

  {"ref":"ACTA.3","kind":"heading","required":true,"source":"derived:approval",
   "title":"Votos emitidos",
   "guidance":"Cada voto con su autor, su sentido y su momento."},
  {"ref":"ACTA.3.a","kind":"field","required":true,"source":"derived:approval",
   "title":"Relacion de votos",
   "guidance":"Nombre de quien vota, sentido del voto, fecha y —si procede— por cuenta de quien actua."},
  {"ref":"ACTA.3.b","kind":"field","required":false,"source":"derived:approval",
   "title":"Motivos registrados",
   "guidance":"Motivos aportados. Obligatorio en los rechazos."},

  {"ref":"ACTA.4","kind":"heading","required":true,"source":"derived:approval",
   "title":"Resultado",
   "guidance":"Decision final y fecha de cierre."},
  {"ref":"ACTA.4.a","kind":"field","required":true,"source":"derived:approval",
   "title":"Decision",
   "guidance":"Aprobada, rechazada o cancelada, con la fecha de cierre."},
  {"ref":"ACTA.4.b","kind":"field","required":true,"source":"derived:approval",
   "title":"Riesgo residual",
   "guidance":"Cuando el objeto es un plan de tratamiento: nivel de aprobacion y aceptacion del riesgo residual (Art. 9.5)."}
]$json$::jsonb
)
ON CONFLICT DO NOTHING;
