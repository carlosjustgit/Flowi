# Vercel Deployment Guide

This monorepo contains three deployable projects:

1. **apps/api** - Backend API with orchestrator and workers
2. **apps/portal** - Frontend portal for projects and approvals
3. **Root (existing)** - Onboarding app (Vite SPA)

## Deploying apps/api (flow-api)

1. Create a new Vercel project
2. Set **Root Directory**: `apps/api`
3. Set **Framework Preset**: Next.js
4. Set **Build Command**: `cd ../.. && npm install && npm run build --workspace=apps/api`
5. Set **Output Directory**: `.next`
6. Set **Install Command**: `cd ../.. && npm install`

### Environment Variables

```
SUPABASE_URL=<your_supabase_url>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
SUPABASE_ANON_KEY=<your_anon_key>
GEMINI_API_KEY=<your_gemini_api_key>
APP_ENV=production
```

## Deploying apps/portal (flow-portal)

1. Create a new Vercel project
2. Set **Root Directory**: `apps/portal`
3. Set **Framework Preset**: Next.js
4. Set **Build Command**: `cd ../.. && npm install && npm run build --workspace=apps/portal`
5. Set **Output Directory**: `.next`
6. Set **Install Command**: `cd ../.. && npm install`

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
APP_ENV=production
```

## Deploying Root (Onboarding App)

The existing onboarding app remains deployable from the root:

1. Keep existing Vercel project or create new one
2. Set **Root Directory**: `.` (root)
3. Set **Framework Preset**: Vite
4. Use existing `vercel.json` configuration

### Environment Variables

Use existing environment variables (VITE_SUPABASE_URL, VITE_GEMINI_API_KEY, etc.)

## Database Setup

Before deploying, run the SQL migrations on your Supabase instance:

```bash
# Run migrations in order
migrations/001_create_projects.sql
migrations/002_create_artifacts.sql
migrations/003_create_jobs.sql
migrations/004_create_approvals.sql
migrations/005_create_runs.sql
migrations/006_create_storage_bucket.sql
```

You can run these either:
- Via Supabase Dashboard SQL Editor
- Via Supabase CLI: `supabase db push`

## Domain Setup (Optional)

You can configure custom domains:
- `api.flowproductions.pt` → flow-api
- `portal.flowproductions.pt` → flow-portal
- `onboarding.flowproductions.pt` → onboarding app

## Notes

- Both apps/api and apps/portal use npm workspaces, so the build commands navigate to root first
- The root onboarding app continues to work independently
- All three can be deployed simultaneously from the same repository
