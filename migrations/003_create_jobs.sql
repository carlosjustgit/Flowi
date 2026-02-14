-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- research, kb_packager, reporting
  status TEXT NOT NULL DEFAULT 'queued', -- queued, running, needs_approval, done, failed
  input_artifact_id UUID REFERENCES artifacts(id) ON DELETE SET NULL,
  output_artifact_id UUID REFERENCES artifacts(id) ON DELETE SET NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on project_id for efficient filtering
CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON jobs(project_id);

-- Create index on status for filtering by job status
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Create index on type for filtering by job type
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);

-- Create composite index for project_id and status queries
CREATE INDEX IF NOT EXISTS idx_jobs_project_status ON jobs(project_id, status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - authenticated users can view jobs
CREATE POLICY "Authenticated users can view jobs" ON jobs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create RLS policy - authenticated users and service role can insert/update jobs
CREATE POLICY "Service role can modify jobs" ON jobs
  FOR ALL
  USING (auth.role() = 'service_role' OR auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER update_jobs_updated_at_trigger
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_jobs_updated_at();
