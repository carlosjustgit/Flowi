-- Migration 002: Create Artifacts Table
-- Run this second (after 001)

CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  format TEXT NOT NULL,
  title TEXT,
  content TEXT,
  content_json JSONB,
  file_url TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artifacts_project_id ON artifacts(project_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type);
CREATE INDEX IF NOT EXISTS idx_artifacts_project_type ON artifacts(project_id, type);
CREATE INDEX IF NOT EXISTS idx_artifacts_created_at ON artifacts(created_at DESC);

ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view artifacts" ON artifacts
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can insert artifacts" ON artifacts
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

ALTER TABLE artifacts ADD CONSTRAINT artifacts_content_check 
  CHECK (
    content IS NOT NULL OR 
    content_json IS NOT NULL OR 
    file_url IS NOT NULL
  );
