Goal
Implement worker-kb-packager endpoint.
Input: research foundation pack json artifact.
Output: knowledge base files (md/txt), structured and ready for Witfy Knowledge Base.

Endpoint
- POST /api/workers/kb-packager
  - body: { project_id, input_artifact_id, job_id }

Processing
1) Load foundation pack artifact.
2) Call Gemini with “kb packager” instructions (packages/prompts/kb-packager.md).
3) Output format
- Return a JSON list of files:
  - filename
  - format (md/txt)
  - title
  - content
4) Store each file as an artifact row.

Knowledge base file set (minimum)
- 01-company-overview.md
- 02-icp-and-segments.md
- 03-offer-and-positioning.md
- 04-messaging-and-voice.md
- 05-content-pillars.md
- 06-competitors.md
- 07-faq-and-objections.md
- 08-visual-brand-guidelines.md

Rules
- Files must be short and skimmable.
- Avoid contradictions.
- If visual brand guidance is missing, create a placeholder section that lists what is required from the client.

Definition of done
- Multiple kb artifacts saved in Supabase.
- Orchestrator marks kb_packager job as needs_approval.
- Approvals created.
