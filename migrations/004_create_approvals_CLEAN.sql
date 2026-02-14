-- Migration 004: Create Approvals Table
-- Run this fourth (after 003)

CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approvals_project_id ON approvals(project_id);
CREATE INDEX IF NOT EXISTS idx_approvals_artifact_id ON approvals(artifact_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_project_status ON approvals(project_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_created_at ON approvals(created_at DESC);

ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view approvals" ON approvals
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can insert approvals" ON approvals
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update approvals" ON approvals
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
