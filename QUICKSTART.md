# Quick Start Guide

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Gemini API key

## Setup

### 1. Install Dependencies

```bash
npm install
```

This will install dependencies for all workspaces (root, apps/api, apps/portal, packages/core).

### 2. Run Database Migrations

In your Supabase Dashboard SQL Editor, run each migration file in order:

1. `migrations/001_create_projects.sql`
2. `migrations/002_create_artifacts.sql`
3. `migrations/003_create_jobs.sql`
4. `migrations/004_create_approvals.sql`
5. `migrations/005_create_runs.sql`
6. `migrations/006_create_storage_bucket.sql`

### 3. Configure Environment Variables

#### apps/api/.env.local

```bash
cp apps/api/.env.local.example apps/api/.env.local
```

Edit `apps/api/.env.local`:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here
GEMINI_API_KEY=your_gemini_api_key_here
APP_ENV=development
```

#### apps/portal/.env.local

```bash
cp apps/portal/.env.local.example apps/portal/.env.local
```

Edit `apps/portal/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
APP_ENV=development
```

### 4. Build packages/core

```bash
npm run build:core
```

### 5. Start Development Servers

In separate terminals:

```bash
# Terminal 1: API (http://localhost:3001)
npm run dev:api

# Terminal 2: Portal (http://localhost:3002)
npm run dev:portal

# Terminal 3: Onboarding (http://localhost:8080) - optional
npm run dev:onboarding
```

## Testing the Pipeline

### Method 1: Using the Portal UI

1. Create a Supabase user via Dashboard or API
2. Login at `http://localhost:3002/login`
3. Use the API to create a project and submit an onboarding report (see below)
4. View artifacts and approvals in the portal

### Method 2: Using cURL

#### Create a Project

```bash
curl -X POST http://localhost:3001/api/orchestrator/projects \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Acme Corp"
  }'
```

Response:
```json
{
  "id": "uuid-here",
  "client_name": "Acme Corp",
  "created_at": "2026-02-14T..."
}
```

#### Submit Onboarding Report

```bash
curl -X POST http://localhost:3001/api/orchestrator/projects/PROJECT_ID/onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "onboarding_report": "# Onboarding Report\n\nCompany: Acme Corp\nIndustry: SaaS\nGoal: Increase brand awareness...",
    "format": "md"
  }'
```

Response:
```json
{
  "job_id": "research-job-uuid",
  "artifact_id": "artifact-uuid"
}
```

#### Run Research Job

```bash
curl -X POST http://localhost:3001/api/orchestrator/jobs/RESEARCH_JOB_ID/run
```

This will:
1. Call worker-research
2. Generate strategy pack (JSON + MD)
3. Store artifacts
4. Create KB packager job automatically

Response includes the next job ID.

#### Run KB Packager Job

```bash
curl -X POST http://localhost:3001/api/orchestrator/jobs/KB_JOB_ID/run
```

This will:
1. Call worker-kb-packager
2. Generate KB files
3. Store artifacts
4. Create approval records
5. Set job status to `needs_approval`

#### View Results in Portal

1. Go to `http://localhost:3002/projects`
2. Click on your project
3. View artifacts
4. Go to Approvals tab
5. Review and approve/reject KB files

## Project Structure

```
flow-productions-onboarding-ai/
├── apps/
│   ├── api/              # Backend API
│   │   ├── app/api/      # API routes
│   │   └── lib/          # Helpers
│   └── portal/           # Frontend
│       ├── app/          # Pages
│       └── components/   # UI components
├── packages/
│   ├── core/             # Shared code
│   ├── prompts/          # Worker prompts
│   └── schemas/          # JSON schemas
├── migrations/           # Database migrations
└── (root)               # Existing onboarding app
```

## Common Commands

```bash
# Install all dependencies
npm install

# Build packages/core
npm run build:core

# Development servers
npm run dev:api           # Start API server
npm run dev:portal        # Start portal server
npm run dev:onboarding    # Start onboarding app

# Build for production
npm run build:api
npm run build:portal
npm run build:onboarding
```

## Troubleshooting

### "Module not found: @flow/core"

Run `npm run build:core` to build the shared package.

### "SUPABASE_SERVICE_ROLE_KEY is required"

Make sure you've created `apps/api/.env.local` with all required variables.

### Gemini API errors

Check that your `GEMINI_API_KEY` is valid and has sufficient quota.

### Database errors

Ensure all migrations have been run in Supabase in the correct order.

### Port conflicts

API runs on 3001, Portal on 3002, Onboarding on 8080. Change ports in package.json if needed.

## Support

See `PHASE1_COMPLETE.md` for full implementation details and `DEPLOYMENT.md` for production deployment.
