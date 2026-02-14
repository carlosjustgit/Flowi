-- Migration 001: Create Projects Table
-- Run this first

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_client_name ON projects(client_name);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view projects" ON projects
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create projects" ON projects
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
