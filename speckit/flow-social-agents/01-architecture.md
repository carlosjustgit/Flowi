Architecture overview
Use an orchestrator + workers model, coordinated by state in Supabase, not agent-to-agent chat.

Key principles
- Workers do not “talk” to each other.
- Workers read a job input artifact and produce output artifacts.
- Orchestrator creates jobs, triggers workers, and advances the pipeline.
- Humans approve key outputs before downstream steps continue.

Apps
- apps/api
  - Next.js (or equivalent) API routes for:
    - /api/orchestrator/*
    - /api/workers/research
    - /api/workers/kb-packager
    - (later) /api/workers/reporting
  - Shared libs imported from packages/*
- apps/portal
  - Next.js frontend for:
    - login
    - projects list
    - artifacts viewer (md/txt/json)
    - approvals
    - talk-with-your-data (phase 2, stub in phase 1)

Packages
- packages/core
  - supabase client
  - auth helpers
  - logging and tracing
  - retry and error helpers
- packages/schemas
  - JSON schemas for worker outputs
- packages/prompts
  - versioned prompts (system instructions) for each worker

Data flow (phase 1)
1) Onboarding report is saved as an artifact in Supabase and linked to a project.
2) Orchestrator creates a job: type=research, input=onboarding_artifact_id.
3) Orchestrator calls worker-research endpoint.
4) worker-research writes artifacts:
   - research_foundation_pack.json
   - research_foundation_pack.md
   then completes job.
5) Orchestrator creates a job: type=kb_packager, input=research_foundation_pack.json artifact id.
6) worker-kb-packager writes artifacts: multiple kb files as separate artifacts, then completes job.
7) Portal shows artifacts, human approves.
8) Orchestrator can proceed to content planning and reporting in phase 2.

Deployment model
Phase 1 recommended
- Two Vercel projects from the same GitHub repo:
  - flow-portal (root: apps/portal)
  - flow-api (root: apps/api)
