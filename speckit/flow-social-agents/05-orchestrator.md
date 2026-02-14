Goal
Implement a simple orchestrator in apps/api that can:
- create projects
- ingest onboarding report into artifacts
- queue jobs
- trigger worker endpoints
- advance pipeline

Endpoints (suggested)
- POST /api/orchestrator/projects
  - body: { client_name }
  - creates project

- POST /api/orchestrator/projects/:id/onboarding
  - body: { onboarding_report_json, optional_onboarding_report_md }
  - stores artifacts
  - creates job type=research status=queued

- POST /api/orchestrator/jobs/:id/run
  - fetch job and input artifact
  - call correct worker endpoint based on job.type
  - update job status and store output artifacts

Pipeline logic (phase 1)
- research job
  - output: research_foundation_pack_json artifact id
  - then create kb_packager job queued
- kb_packager job
  - output: kb files artifacts
  - set status=needs_approval
  - create approvals rows for all kb artifacts

Guardrails
- Idempotency: if a job is already done, do not re-run unless explicitly requested.
- Always store worker outputs as artifacts.
- Always log a run row with duration and token estimates when possible.

Definition of done
- You can run: onboarding artifact -> research -> kb_packager
- Jobs and artifacts visible in Supabase.
