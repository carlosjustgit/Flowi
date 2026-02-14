-- Create approvals table
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on project_id for efficient filtering
CREATE INDEX IF NOT EXISTS idx_approvals_project_id ON approvals(project_id);

-- Create index on artifact_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_approvals_artifact_id ON approvals(artifact_id);

-- Create index on status for filtering by approval status
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);

-- Create composite index for project_id and status queries
CREATE INDEX IF NOT EXISTS idx_approvals_project_status ON approvals(project_id, status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_approvals_created_at ON approvals(created_at DESC);

-- Enable Row Level Security
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - authenticated users can view approvals
CREATE POLICY "Authenticated users can view approvals" ON approvals
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create RLS policy - authenticated users can insert approvals
CREATE POLICY "Service role can insert approvals" ON approvals
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- Create RLS policy - authenticated users can update approval status
CREATE POLICY "Authenticated users can update approvals" ON approvals
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
