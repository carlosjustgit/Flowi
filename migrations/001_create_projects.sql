-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on client_name for searching
CREATE INDEX IF NOT EXISTS idx_projects_client_name ON projects(client_name);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - authenticated users can see their own projects
-- For now, allowing all authenticated users to see all projects
-- This can be tightened later with user_id column
CREATE POLICY "Authenticated users can view projects" ON projects
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create RLS policy - authenticated users can insert projects
CREATE POLICY "Authenticated users can create projects" ON projects
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
