-- Create runs table for cost and token tracking
CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_estimate NUMERIC(10, 6),
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on job_id for efficient filtering
CREATE INDEX IF NOT EXISTS idx_runs_job_id ON runs(job_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);

-- Create index on model for analytics
CREATE INDEX IF NOT EXISTS idx_runs_model ON runs(model);

-- Enable Row Level Security
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - authenticated users can view runs
CREATE POLICY "Authenticated users can view runs" ON runs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create RLS policy - service role can insert runs
CREATE POLICY "Service role can insert runs" ON runs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');
