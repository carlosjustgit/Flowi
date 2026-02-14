-- Migration 005: Create Runs Table
-- Run this fifth (after 004)

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

CREATE INDEX IF NOT EXISTS idx_runs_job_id ON runs(job_id);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_model ON runs(model);

ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view runs" ON runs
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can insert runs" ON runs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');
