Goal
Create a monorepo that contains the current onboarding project and the new agent pipeline.

Steps
1) Identify the current onboarding repo on GitHub.
2) Create a new branch: feat/flow-social-agents-monorepo
3) Add the following structure at repo root:

/apps
  /api
  /portal
  /onboarding (optional, only if onboarding is separate)
/packages
  /core
  /prompts
  /schemas
/speckit
  /flow-social-agents (this folder)

Rules
- Do not break existing onboarding deployment.
- If onboarding is already deployed and stable, keep it as-is and integrate later.
- Prefer adding new apps without refactoring working onboarding.

Definition of done
- Repo builds locally for apps/api and apps/portal.
- Existing onboarding remains untouched and deployable.
