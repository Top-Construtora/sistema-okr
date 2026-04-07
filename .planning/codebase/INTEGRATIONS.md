# External Integrations

**Analysis Date:** 2026-04-07

## APIs & External Services

**Supabase Platform:**
- PostgreSQL database - `SUPABASE_URL` configured in `.env`
- Authentication service - Supabase Auth manages user sign-in/password reset
- Storage service - File uploads and retrieval for evidence documents
- Real-time capabilities available via `@supabase/supabase-js` client

**GIO System (SSO Integration):**
- Service: giotop.vercel.app - External SSO provider
- Purpose: Single Sign-On allowing GIO users to access OKR system without re-authentication
- SDK/Client: Custom JWT implementation
- Auth: `SSO_SECRET` environment variable (32+ character shared secret)
- Details: See `INTEGRACAO_SSO_GIO.md`

## Data Storage

**Databases:**
- PostgreSQL (Supabase)
  - Connection: `SUPABASE_URL` + `SUPABASE_ANON_KEY`
  - Client: @supabase/supabase-js 2.39.0
  - RLS policies enforce row-level security
  - Service key available for admin operations (`SUPABASE_SERVICE_KEY`)

**File Storage:**
- Supabase Storage
  - Bucket: `evidencias` - OKR evidence documents (PDFs, Excel, Word, images)
  - Served via: Public URLs (`{SUPABASE_URL}/storage/v1/object/public/evidencias/*`)
  - Proxied through: `backend/routes/evidence.routes.js` for legacy support and access control
  - Upload/Download: Handled via `frontend/services/supabase.js` utility functions

**Caching:**
- localStorage (browser) - User session and UI state
- No Redis or server-side caching configured

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (managed by Supabase)
  - Implementation: Native Supabase Auth with custom database trigger
  - User creation: Via Supabase Dashboard (Authentication → Users)
  - Password reset: Supabase email flow (`POST /api/auth/password-reset`)
  - Session: Auto-managed by Supabase client (automatic token refresh)

**User-Database Link:**
- Trigger `handle_new_user()` - Automatically creates `users` table record when Supabase Auth user is created
- Link field: `users.auth_id` → `auth.users(id)`
- No password column in `users` table (passwords stored in Supabase Auth only)

**SSO Integration:**
- Endpoint: `POST /api/auth/sso-login`
- Token format: JWT signed with `SSO_SECRET`
- Features:
  - One-time use tokens (tracked in `sso_used_tokens` table)
  - 5-minute expiration
  - Unique nonce per token (replay attack prevention)
- Incoming URL format: `?sso_token=JWT_TOKEN`
- Implementation: `backend/routes/auth.routes.js` (handles `/api/auth/sso-login`)

## Monitoring & Observability

**Error Tracking:**
- None detected - Manual error logging via console

**Logs:**
- Backend: console.log via morgan (HTTP request logging)
- Frontend: Browser console (no external logging service)
- Supabase Logs: Via Supabase Dashboard

## CI/CD & Deployment

**Hosting:**
- Frontend: Any SPA-capable host (static files in `frontend/dist/`)
- Backend: Any Node.js hosting (Express app)
- Database: Supabase (managed service)

**CI Pipeline:**
- None detected - Manual testing and deployment

## Environment Configuration

**Required env vars (Frontend):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase public API key

**Required env vars (Backend):**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase public API key
- `SUPABASE_SERVICE_KEY` (optional) - For admin auth operations
- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - Frontend origin for CORS and password reset redirects
- `SSO_SECRET` - Shared secret for GIO SSO integration (min 32 chars)

**Secrets location:**
- `.env` files (one each for frontend and backend)
- Never committed to git (in `.gitignore`)

## Webhooks & Callbacks

**Incoming:**
- `/api/auth/sso-login` - SSO token validation from GIO system
- `/api/evidence/view/:bucket/*` - Evidence file preview (GET)
- `/api/evidence/download/:bucket/*` - Evidence file download (GET)

**Outgoing:**
- None detected - No outgoing webhooks or callbacks

## API Endpoints

**Health Check:**
- `GET /health` - Returns `{ status: 'ok', message: '...', version: '1.0.0' }`

**Authentication:**
- `POST /api/auth/password-reset` - Request password reset email
- `POST /api/auth/confirm-reset` - Confirm password reset with token
- `POST /api/auth/sso-login` - SSO authentication with JWT token

**Resources:**
- `GET /api/departments` - List departments
- `GET /api/users` - List users
- `GET /api/okrs` - List OKRs
- `GET /api/objectives` - List strategic objectives
- `GET /api/stats` - Dashboard statistics
- `GET /api/evidence/view/:bucket/*` - View evidence file
- `GET /api/evidence/download/:bucket/*` - Download evidence file

**Additional Routes:**
- Multiple department, user, OKR, objective endpoints (POST, PUT, DELETE) handled by respective route files

## External Service Features Used

**Supabase Auth:**
- Custom email templates for password reset
- Token generation and validation
- User session management
- No additional features beyond standard auth

**Supabase Storage:**
- File upload/download
- Public file serving
- Basic access control (RLS can be applied)

**Supabase Database:**
- Row Level Security (RLS) policies
- Triggers for timestamps and data transformations
- Custom PostgreSQL functions for business logic
- No full-text search, no PostGIS, no other extensions

---

*Integration audit: 2026-04-07*
