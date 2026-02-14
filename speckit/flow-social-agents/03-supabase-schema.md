Goal
Create Supabase tables to store projects, jobs, artifacts, approvals, and runs.

Implementation notes
- Use Supabase migrations via CLI if possible.
- If CLI is not configured, generate SQL files and provide them for manual paste.
- Prefer enabling Supabase Row Level Security (RLS) from day one for portal access.

Tables (minimum)
1) projects
- id uuid primary key default gen_random_uuid()
- client_name text not null
- created_at timestamptz default now()

2) artifacts
- id uuid primary key default gen_random_uuid()
- project_id uuid references projects(id) on delete cascade
- type text not null (onboarding_report, research_foundation_pack_json, kb_file, etc)
- format text not null (json, md, txt)
- title text not null
- content text null (for md/txt)
- content_json jsonb null (for json)
- file_url text null (for uploaded files)
- version int default 1
- created_at timestamptz default now()

3) jobs
- id uuid primary key default gen_random_uuid()
- project_id uuid references projects(id) on delete cascade
- type text not null (research, kb_packager, reporting)
- status text not null (queued, running, needs_approval, done, failed)
- input_artifact_id uuid references artifacts(id)
- output_artifact_id uuid references artifacts(id) null
- error text null
- created_at timestamptz default now()
- updated_at timestamptz default now()

4) approvals
- id uuid primary key default gen_random_uuid()
- project_id uuid references projects(id) on delete cascade
- artifact_id uuid references artifacts(id) on delete cascade
- status text not null (pending, approved, rejected)
- notes text null
- created_at timestamptz default now()

5) runs
- id uuid primary key default gen_random_uuid()
- job_id uuid references jobs(id) on delete cascade
- model text not null
- tokens_in int null
- tokens_out int null
- cost_estimate numeric null
- duration_ms int null
- created_at timestamptz default now()

Storage
- Create a Supabase storage bucket: flow-artifacts
- Store optional file-based artifacts (pdf uploads, zip packs) there.

Definition of done
- Tables exist in Supabase.
- Minimal RLS policies exist for authenticated users to read their own projects.
- Storage bucket exists.
