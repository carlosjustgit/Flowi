Goal
Create a minimal portal (apps/portal) for internal team and clients.

Pages (phase 1)
- /login (Supabase auth)
- /projects
- /projects/:id
  - list artifacts grouped by type
  - open artifact (md/txt/json viewer)
  - approvals UI (approve/reject with notes)

Phase 2 stub
- /projects/:id/chat
  - placeholder UI for “talk with your data”
  - show “coming next” and the required ingestion steps

Security
- RLS must prevent users from seeing other clients.
- Portal uses anon key only.
- Sensitive processing stays in apps/api.

Definition of done
- User can login and see project artifacts.
- User can approve or reject kb artifacts.
