# Environment Variables Setup

This file documents all required environment variables for each app.

## apps/api

Create `apps/api/.env.local`:

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Gemini API
GEMINI_API_KEY=AIzaSy...

# App Environment
APP_ENV=development
```

### Where to Find Values

- **SUPABASE_URL**: Supabase Dashboard → Settings → API → Project URL
- **SUPABASE_SERVICE_ROLE_KEY**: Supabase Dashboard → Settings → API → service_role key (secret!)
- **SUPABASE_ANON_KEY**: Supabase Dashboard → Settings → API → anon public key
- **GEMINI_API_KEY**: Google AI Studio → Get API Key

### Security Notes

- **NEVER** commit `.env.local` files
- **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` to the client
- Keep service role key only in backend (`apps/api`)

---

## apps/portal

Create `apps/portal/.env.local`:

```env
# Supabase Configuration (Client-side)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Environment
APP_ENV=development
```

### Where to Find Values

- **NEXT_PUBLIC_SUPABASE_URL**: Same as apps/api SUPABASE_URL
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Same as apps/api SUPABASE_ANON_KEY

### Security Notes

- Only use `NEXT_PUBLIC_*` prefixed variables (exposed to browser)
- **DO NOT** use service role key in portal
- Anon key is safe to expose (RLS protects data)

---

## Root (Existing Onboarding App)

The existing `.env.local` in root should remain as is:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GEMINI_API_KEY=AIzaSy...
```

⚠️ **Note:** Existing onboarding app exposes Gemini key to client. Phase 1 apps keep API keys server-side only.

---

## Production (Vercel)

### For apps/api Vercel Project

Set environment variables in Vercel dashboard:

```
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSy...
APP_ENV=production
```

### For apps/portal Vercel Project

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
APP_ENV=production
```

---

## Checklist

Before starting development:

- [ ] Created `apps/api/.env.local` with all 5 variables
- [ ] Created `apps/portal/.env.local` with all 3 variables
- [ ] Verified SUPABASE_URL is correct (check Supabase dashboard)
- [ ] Verified GEMINI_API_KEY works (test in AI Studio)
- [ ] Confirmed `.env.local` files are in `.gitignore`
- [ ] **Never committed** service role key to git

---

## Testing Your Configuration

### Test apps/api connection:

```bash
npm run dev:api
# Should start without errors
# Visit http://localhost:3001/api/orchestrator/projects (should see 405 Method Not Allowed - correct!)
```

### Test apps/portal connection:

```bash
npm run dev:portal
# Should start without errors
# Visit http://localhost:3002/login (should see login page)
```

### Common Issues

**"SUPABASE_URL is required"**
- Check `.env.local` exists in the correct app folder
- Check variable name spelling (no typos)

**"Failed to fetch"**
- Check SUPABASE_URL is correct
- Check Supabase project is not paused

**"Invalid API key"**
- Check GEMINI_API_KEY is copied correctly
- Check API key is enabled in Google AI Studio

**"Unauthorized"**
- Check you're using service_role key in API (not anon key)
- Check you're using anon key in Portal (not service_role)
