Guardrails (non-negotiable)
- Do not refactor working onboarding code unless explicitly requested.
- Do not hardcode ids, URLs, or secrets.
- Do not introduce silent fallbacks that hide errors.
- Every worker output must be stored as an artifact.
- Every job run must write a runs row.
- Keep prompts versioned in packages/prompts.
- Keep schemas versioned in packages/schemas.

Quality gates
- Validate JSON outputs against schema.
- Reject outputs that are missing required sections.
- Store “unknowns” and “questions to clarify” explicitly.

Operational basics
- Add basic request logging and error handling.
- Ensure idempotency for job runs.
- Add a simple admin-only route to re-run failed jobs.

Definition of done
- System is debuggable and predictable.
