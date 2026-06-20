-- Email drafts table for compose feature
CREATE TABLE IF NOT EXISTS email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  cc_email TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookup by agent
CREATE INDEX email_drafts_agent_idx ON email_drafts(agent_id, updated_at DESC);

-- RLS: Agents see only their own drafts
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_drafts_select ON email_drafts
  FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY email_drafts_insert ON email_drafts
  FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY email_drafts_update ON email_drafts
  FOR UPDATE
  USING (agent_id = auth.uid());

CREATE POLICY email_drafts_delete ON email_drafts
  FOR DELETE
  USING (agent_id = auth.uid());
