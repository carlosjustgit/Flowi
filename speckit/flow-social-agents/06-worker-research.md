Goal
Implement worker-research endpoint.
Input: onboarding report (json artifact).
Output: research and insights foundation pack (json + md).

Endpoint
- POST /api/workers/research
  - body: { project_id, input_artifact_id, job_id }

Processing
1) Load onboarding report artifact.
2) Call Gemini with the “research and insights” instructions (see packages/prompts/research.md).
3) Enforce output schema (packages/schemas/research-foundation.schema.json).
4) Store outputs as artifacts:
  - research_foundation_pack.json (content_json)
  - research_foundation_pack.md (content)

What the foundation pack must include
- sources (for competitors and market claims when available)
- LEAN canvas
- SWOT
- competitor landscape (each competitor must reference sources)
- market and audience insights (with sources where applicable)
- campaign foundations (positioning, messaging pillars, themes, channel strategy)
- client deck outline (slide titles and key points)
- assumptions, unknowns, questions

Rules
- Never invent competitors, pricing, or claims.
- If web grounding is unavailable, do not guess. Produce LEAN and SWOT from onboarding, and populate sources_needed.

Definition of done
- Endpoint produces valid foundation pack artifacts.
- Job status becomes done.
- Run row created.
