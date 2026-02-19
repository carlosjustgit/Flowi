-- Add language column to the projects table (platform pipeline)
-- Run migration 007_add_language_to_projects_CLEAN.sql against the platform DB
-- ALTER TABLE projects ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'pt';
-- ALTER TABLE projects ADD CONSTRAINT IF NOT EXISTS projects_language_check CHECK (language IN ('pt', 'en'));

-- Create the onboarding_sessions table
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transcript JSONB NOT NULL DEFAULT '[]',
  report TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'in-progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create an index on date for faster sorting
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_date ON onboarding_sessions(date DESC);

-- Create an index on status for filtering
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status ON onboarding_sessions(status);

-- Create an index on client_name for searching
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_client_name ON onboarding_sessions(client_name);

-- Enable Row Level Security
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for authenticated users
-- Note: Since we're using anon key, we'll allow all operations for now
-- You can tighten this later with proper auth
CREATE POLICY "Allow all operations for now" ON onboarding_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to call the function
CREATE TRIGGER update_onboarding_sessions_updated_at 
  BEFORE UPDATE ON onboarding_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
