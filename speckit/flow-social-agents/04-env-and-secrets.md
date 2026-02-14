Goal
Standardise environment variables for local dev and Vercel.

apps/api (.env.local)
- SUPABASE_URL=
- SUPABASE_SERVICE_ROLE_KEY=
- SUPABASE_ANON_KEY=
- GEMINI_API_KEY=
- APP_ENV=development

apps/portal (.env.local)
- SUPABASE_URL=
- SUPABASE_ANON_KEY=
- APP_ENV=development

Vercel
- Set the same variables in Vercel environment variables.
- Never commit .env files.

Rules
- Do not hardcode API keys.
- Do not leak service role key to the portal.
- Use service role key only in apps/api server side.

Definition of done
- Local dev works for both apps.
- Vercel builds succeed with environment variables configured.
