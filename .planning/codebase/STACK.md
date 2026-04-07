# Technology Stack

**Analysis Date:** 2026-04-07

## Languages

**Primary:**
- JavaScript (ES2022+) - Frontend and backend with ES Modules (`type: "module"`)

## Runtime

**Environment:**
- Node.js 16+ (required per `backend/package.json`)

**Package Manager:**
- npm
- Lockfiles: `package-lock.json` present for both frontend and backend

## Frameworks

**Core:**
- Vite 5.0.0 - Frontend bundler with HMR
- Express.js 4.18.2 - REST API backend framework

**Authentication:**
- Supabase Auth - Built-in user authentication (passwords managed by Supabase)

**Database Client:**
- @supabase/supabase-js 2.39.0 - PostgreSQL client for both frontend and backend

## Key Dependencies

**Frontend (`frontend/package.json`):**
- jspdf 4.0.0 - PDF generation
- jspdf-autotable 5.0.7 - PDF table support
- xlsx 0.18.5 - Excel file handling

**Backend (`backend/package.json`):**
- cors 2.8.5 - CORS middleware for Express
- helmet 7.1.0 - Security headers middleware
- morgan 1.10.0 - HTTP request logging
- dotenv 16.3.1 - Environment variable loading
- jsonwebtoken 9.0.3 - JWT token generation/validation for SSO

**Development:**
- nodemon 3.0.2 (backend) - Auto-restart on file changes
- Vite built-in HMR (frontend)

## Configuration

**Environment Variables:**

*Frontend (.env required):*
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
Environment variables accessed via `import.meta.env.VITE_*` in Vite.

*Backend (.env required):*
```
PORT=3001
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key (optional, for admin operations)
SSO_SECRET=your-strong-secret-key-min-32-chars
```

**Build Configuration:**
- `frontend/vite.config.js` - Vite configuration with SPA routing, port 3000, auto-open browser, source maps
- No TypeScript - Pure JavaScript project

## Platform Requirements

**Development:**
- Node.js 16+
- npm (or compatible package manager)
- Two terminals required (one for backend, one for frontend)

**Production:**
- Supabase PostgreSQL database (remote)
- Supabase Authentication service
- Supabase Storage (for file uploads - evidencias bucket)
- Backend deployment platform (any Node.js host)
- Frontend deployment as SPA (any static host or Node.js)

## Database

**Engine:**
- PostgreSQL (via Supabase)

**Access Pattern:**
- Row Level Security (RLS) policies enforce data access
- Triggers auto-update `updated_at` timestamps
- PostgreSQL ENUMs for: `user_type` (admin, colaborador), `okr_status` (pending, adjust, approved, completed, homologated)

**Key Tables:**
- `objectives` - Strategic company objectives
- `departments` - Company departments
- `users` - System users (linked to Supabase Auth via `auth_id`)
- `okrs` - OKR records
- `key_results` - Key results for each OKR
- `sso_used_tokens` - SSO token tracking (one-time use enforcement)

## Storage

**File Storage:**
- Supabase Storage (buckets: `evidencias` for evidence files)
- Served via public URLs from Supabase or proxied through backend `/api/evidence` endpoints
- Supported file types: PDF, DOCX, XLSX, images (PNG, JPG, GIF), TXT, HTML

## Security

**Middleware:**
- helmet 7.1.0 - Secure HTTP headers
- cors 2.8.5 - CORS configuration with flexible origin support
- jsonwebtoken 9.0.3 - JWT signing/verification for SSO tokens

**Session Management:**
- Supabase Auth handles token refresh automatically
- No custom password storage (uses Supabase Auth)

---

*Stack analysis: 2026-04-07*
