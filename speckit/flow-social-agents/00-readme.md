Purpose
Build an AI-agent team to automate Flow Productions social media management with humans as pilots, not executors.

Scope (phase 1)
- Create a monorepo structure that contains:
  - api app (orchestrator + worker endpoints)
  - portal app (client login, report viewer, approvals)
- Implement Supabase data model for jobs, artifacts, approvals, and runs.
- Implement 2 workers end to end:
  - worker-research (turn onboarding report into a research and insights foundation pack)
  - worker-kb-packager (turn the foundation pack into knowledge base files)
- Provide a clean path to add worker-reporting later.

Non-goals (phase 1)
- Auto-publishing to social networks.
- Full ADK multi-agent setup.
- Complex RAG ingestion pipelines beyond the minimum needed for “talk with your data”.

Assumptions
- Existing onboarding agent already generates a structured onboarding report.
- Gemini API key is available and will be provided via .env and Vercel environment variables.
- Cursor has CLI access to Vercel and GitHub, Supabase CLI can be configured.

Success criteria
- From an onboarding report, the system produces:
  - research foundation pack artifact (JSON + markdown summary, grounded with sources when available)
  - knowledge base pack artifacts (md/txt files)
- Human can review and approve artifacts in the portal.
- All runs are logged (cost, duration, status).
