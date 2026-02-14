Goal
Deploy apps/api and apps/portal separately on Vercel from the same GitHub repo.

Steps
1) Create Vercel project: flow-api
- GitHub repo: select this monorepo
- Root directory: apps/api
- Add env vars: Supabase service role, Gemini key, Supabase URL, anon key

2) Create Vercel project: flow-portal
- Root directory: apps/portal
- Add env vars: Supabase URL, anon key

3) Set production domains (optional)
- api.flow... -> flow-api
- portal.flow... -> flow-portal

Definition of done
- Both projects deploy successfully.
- API endpoints reachable.
- Portal login works.
