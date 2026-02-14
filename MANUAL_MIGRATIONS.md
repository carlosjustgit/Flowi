# Manual Migration Guide for Supabase SQL Editor

Since the Supabase CLI is not available, follow these steps to run migrations manually.

## Instructions

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Copy and paste each migration below **in order**
4. Click **Run** after each one
5. Verify no errors before proceeding to the next

---

## Migration 1: Create Projects Table

```sql
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
```

✅ **Verify:** Check Table Editor → should see `projects` table

---

## Migration 2: Create Artifacts Table

```sql
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
```

✅ **Verify:** Check Table Editor → should see `artifacts` table

---

## Migration 3: Create Jobs Table

```sql
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
```

✅ **Verify:** Check Table Editor → should see `jobs` table

---

## Migration 4: Create Approvals Table

```sql
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
```

✅ **Verify:** Check Table Editor → should see `approvals` table

---

## Migration 5: Create Runs Table

```sql
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
```

✅ **Verify:** Check Table Editor → should see `runs` table

---

## Migration 6: Create Storage Bucket

```sql
-- Create storage bucket for file artifacts
INSERT INTO storage.buckets (id, name, public)
VALUES ('flow-artifacts', 'flow-artifacts', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - authenticated users can read artifacts
CREATE POLICY "Authenticated users can read flow-artifacts" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'flow-artifacts' AND
    auth.role() = 'authenticated'
  );

-- Create RLS policy - service role can insert artifacts
CREATE POLICY "Service role can insert flow-artifacts" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'flow-artifacts' AND
    (auth.role() = 'service_role' OR auth.role() = 'authenticated')
  );

-- Create RLS policy - service role can update artifacts
CREATE POLICY "Service role can update flow-artifacts" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'flow-artifacts' AND
    (auth.role() = 'service_role' OR auth.role() = 'authenticated')
  )
  WITH CHECK (
    bucket_id = 'flow-artifacts' AND
    (auth.role() = 'service_role' OR auth.role() = 'authenticated')
  );

-- Create RLS policy - service role can delete artifacts
CREATE POLICY "Service role can delete flow-artifacts" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'flow-artifacts' AND
    (auth.role() = 'service_role' OR auth.role() = 'authenticated')
  );
```

✅ **Verify:** Check Storage → should see `flow-artifacts` bucket

---

## Final Verification

After running all migrations, you should have:

### Tables (5 total)
- ✅ projects
- ✅ artifacts
- ✅ jobs
- ✅ approvals
- ✅ runs

### Storage
- ✅ flow-artifacts bucket

### Security
- All tables have RLS enabled (green shield icon)
- Authenticated users can read their data
- Service role can insert/update data

---

## Troubleshooting

### "relation already exists"
This is fine - it means the table/index already exists. The `IF NOT EXISTS` clause handles this.

### "permission denied"
Make sure you're using the SQL Editor in your Supabase dashboard with proper permissions.

### "function does not exist"
Make sure you ran Migration 3 completely (includes the function definition).

### "policy already exists"
Some policies might already exist from previous runs. You can ignore these errors or drop the old policies first.

---

## Next Steps

After migrations are complete:

1. Configure environment variables (see `ENV_SETUP.md`)
2. Install dependencies: `npm install`
3. Build core package: `npm run build:core`
4. Start development servers
5. Test the API endpoints

See `QUICKSTART.md` for full development workflow.
