-- ============================================================================
-- FLUXION — Agente 4: Historial de conversaciones del asistente
-- ============================================================================

CREATE TABLE fluxion.assistant_conversations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES fluxion.organizations(id),
  user_id         uuid        NOT NULL REFERENCES fluxion.profiles(id),
  title           text,
  context_page    text,
  context_system  uuid        REFERENCES fluxion.ai_systems(id),
  messages        jsonb       NOT NULL DEFAULT '[]',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_assistant_conv_user
  ON fluxion.assistant_conversations(user_id, last_message_at DESC);

CREATE INDEX idx_assistant_conv_org
  ON fluxion.assistant_conversations(organization_id, last_message_at DESC);

ALTER TABLE fluxion.assistant_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_conversations" ON fluxion.assistant_conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid());
