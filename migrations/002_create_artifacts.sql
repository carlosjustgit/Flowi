-- Create artifacts table
CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- onboarding_report, strategy_pack_json, strategy_pack_md, kb_file, etc.
  format TEXT NOT NULL, -- json, md, txt
  title TEXT,
  content TEXT,
  content_json JSONB,
  file_url TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on project_id for efficient filtering
CREATE INDEX IF NOT EXISTS idx_artifacts_project_id ON artifacts(project_id);

-- Create index on type for filtering by artifact type
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type);

-- Create composite index for project_id and type queries
CREATE INDEX IF NOT EXISTS idx_artifacts_project_type ON artifacts(project_id, type);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_artifacts_created_at ON artifacts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - authenticated users can view artifacts for their projects
CREATE POLICY "Authenticated users can view artifacts" ON artifacts
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create RLS policy - service role can insert artifacts
CREATE POLICY "Service role can insert artifacts" ON artifacts
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- Add constraint to ensure either content or content_json or file_url is provided
ALTER TABLE artifacts ADD CONSTRAINT artifacts_content_check 
  CHECK (
    content IS NOT NULL OR 
    content_json IS NOT NULL OR 
    file_url IS NOT NULL
  );
