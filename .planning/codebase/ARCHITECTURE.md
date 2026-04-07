# Architecture

**Analysis Date:** 2026-04-07

## Pattern Overview

**Overall:** Modular SPA (Single Page Application) with frontend-first design and optional backend API layer. Client-heavy architecture where frontend directly communicates with Supabase PostgreSQL database via Row Level Security policies. Optional Express backend provides additional API routes but is not mandatory for core functionality.

**Key Characteristics:**
- Frontend directly queries Supabase (not through backend) for primary operations
- Backend exists as optional API layer for specific operations (auth, stats, evidence proxying)
- ES Modules (type: "module") with Vite bundler and HMR
- History API-based SPA routing with full URL support (browser back/forward works)
- Entity-driven architecture with static CRUD methods on domain classes
- Global window exposure of classes for inline onclick handlers
- Service layer abstraction: StorageService (Supabase queries), AuthService (Supabase Auth), Layout (routing/UI)

## Layers

**Presentation Layer:**
- Purpose: Renders UI and handles user interactions
- Location: `frontend/Pages/` (page components), `frontend/Components/` (reusable UI), `frontend/Layout.js` (routing/structure)
- Contains: Single-file components with `render()` methods that return HTML strings
- Depends on: Entities, Services, Components
- Used by: Main app entry point

**Entity/Domain Layer:**
- Purpose: Data models with validation and business logic
- Location: `frontend/Entities/*.js`
- Contains: Classes like `OKR`, `Department`, `User`, `KeyResult`, `Initiative`, `Reminder`, `StrategicObjective`, `Cycle`, `MiniCycle`
- Depends on: StorageService, Supabase client
- Used by: Pages, Services, other Entities

**Service Layer:**
- Purpose: Cross-cutting concerns and data access
- Location: `frontend/services/`
- Contains: StorageService (CRUD via Supabase), AuthService (authentication), supabase.js (client + error handling utilities)
- Depends on: @supabase/supabase-js SDK
- Used by: Entities, Pages, App initialization

**Backend API Layer (Optional):**
- Purpose: Backend-specific operations not suitable for client-side Supabase access
- Location: `backend/routes/*.routes.js`, `backend/server.js`
- Contains: Password reset, SSO login, stats calculations, evidence file proxying
- Depends on: Express.js, Supabase JS client (both anon and admin keys)
- Used by: Frontend via HTTP requests to `/api/*` endpoints

**Infrastructure:**
- Purpose: Build, dev tooling, database schema
- Location: `frontend/vite.config.js` (frontend build), `backend/database/` (SQL scripts), environment files (`.env`)
- Contains: Vite configuration, PostgreSQL schema and RLS policies, seed data
- Depends on: Node.js, npm, Supabase platform

## Data Flow

**OKR Creation & Management Flow:**

1. User navigates to `/okrs` page → Layout router calls `OKRsPage.render()`
2. Page renders form with template HTML
3. User submits form → onclick handler calls `OKR.create(data)` (global window.OKR)
4. OKR entity validates and calls `StorageService.create('okrs', item)`
5. StorageService executes `supabaseClient.from('okrs').insert(item).select()`
6. Supabase RLS policies check user permissions (row level security)
7. Insert succeeds/fails → Page refreshes and re-renders with updated data

**Diagram:**
```
User Input (HTML/onclick)
    ↓
Page Component (Pages/OKRs/OKRs.js)
    ↓
Entity Class (Entities/OKR.js) - validate()
    ↓
StorageService (services/storage.js) - CRUD wrapper
    ↓
Supabase Client (services/supabase.js)
    ↓
PostgreSQL (RLS enforces permissions)
    ↓
Page updates and re-renders
```

**Authentication Flow:**

1. **Normal Login:** User enters email/password → AuthService.login() → supabaseClient.auth.signInWithPassword()
2. **SSO Login:** GIO system redirects with `?sso_token=JWT` → App detects token → Backend validates with `/api/auth/sso-login`
3. **Both paths:** Supabase Auth session stored → trigger `handle_new_user()` creates `users` table entry if missing

**State Management:**

- **Client State:** Stored in component instances and variables (no global store like Redux)
- **Persistent State:** localStorage for UI preferences (sidebarCollapsed, okrMenuOpen)
- **Server State:** All data lives in Supabase PostgreSQL; no backend session storage
- **Authentication State:** Managed by Supabase Auth (automatic session refresh via JWT)

## Key Abstractions

**Entity Pattern:**
- Purpose: Encapsulate data model behavior and business logic
- Examples: `frontend/Entities/OKR.js`, `frontend/Entities/Department.js`, `frontend/Entities/User.js`
- Pattern: Static CRUD methods (`static async getAll()`, `static async getById(id)`) + instance methods (validate(), save(), delete())
- Exposes validation errors before database operations

**StorageService:**
- Purpose: Single abstraction over Supabase CRUD operations
- Pattern: Generic methods (`create()`, `update()`, `delete()`, `getAll()`, `getById()`) work with any table
- Example call: `await StorageService.create('okrs', { title, objective_id, status: 'pending' })`
- Handles error formatting via `handleSupabaseError()` utility

**Page Component Pattern:**
- Purpose: Self-contained page views with lifecycle
- Pattern: Object with async `render()` method + helper methods for sections
- Example: `frontend/Pages/Dashboard/Dashboard.js` → renders multiple sections in parallel with `Promise.all()`
- Pages are exposed globally in `main.js` and instantiated by Layout router

**Modal Component:**
- Purpose: Reusable dialog wrapper for forms
- Location: `frontend/Components/Modal.js`
- Used by: Pages for create/edit operations (DepartmentsPage, UsersPage, etc.)

## Entry Points

**Frontend:**
- Location: `frontend/index.html` (DOM root) → `frontend/main.js` (imports all modules) → `frontend/app.js` (initialization)
- Triggers: Browser loads page; SSO login via `?sso_token` query param
- Responsibilities: 
  - `main.js`: Import order (globals → entities → pages → app) + expose to window
  - `app.js`: Initialize storage, check auth, handle SSO, render Layout
  - `Layout.js`: Manage routing, render sidebar/header, navigate between pages

**Backend:**
- Location: `backend/server.js` (Express app)
- Triggers: `npm run dev` or production deployment
- Responsibilities:
  - Configure CORS (allows frontend origin)
  - Mount route handlers: auth, departments, users, okrs, objectives, stats, evidence
  - Health check endpoint at `/health`

**Database:**
- Location: SQL scripts in `backend/database/`
- Order of execution: 
  1. `01_schema.sql` - Tables and types
  2. `02_security_rls.sql` - Row Level Security policies
  3. `03_functions_triggers.sql` - Triggers and functions
  4. `04_seed_data.sql` - Initial data (optional)

## Error Handling

**Strategy:** Try-catch at service boundary (StorageService); propagate user-friendly errors via thrown exceptions

**Patterns:**

**Frontend Entity/Page Level:**
```javascript
// Entities/OKR.js
async save() {
  const errors = this.validate();
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
  // ... StorageService call
}
```

**Service Level:**
```javascript
// services/storage.js
async create(entity, item) {
  try {
    const { data, error } = await supabaseClient.from(entity).insert(item).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Erro ao criar ${entity}:`, error);
    throw new Error(handleSupabaseError(error, `Erro ao criar ${entity}`));
  }
}
```

**Supabase Error Formatting:**
```javascript
// services/supabase.js
function handleSupabaseError(error, defaultMessage = 'Erro ao processar dados') {
  console.error('Supabase error:', error);
  if (error.message) return error.message;
  return defaultMessage;
}
```

**Backend Route Level:**
```javascript
// routes/auth.routes.js
router.post('/password-reset', async (req, res) => {
  try {
    // ... logic
    return res.json({ success: true, message: '...' });
  } catch (error) {
    console.error('Erro no password-reset:', error);
    return res.status(500).json({ success: false, error: 'Erro ao processar solicitação' });
  }
});
```

## Cross-Cutting Concerns

**Logging:**
- Approach: `console.log()` / `console.error()` with emoji prefixes (🔐, ✅, ⚠️, ❌, 🚀)
- Location: Throughout services, entities, app.js
- Production: Logs appear in browser console and backend terminal

**Validation:**
- Approach: Entity-level validation before database operations
- Example: `Department.validate()` checks name not empty, max 100 chars
- Pattern: Return array of error strings; page shows errors before submission

**Authentication:**
- Approach: Supabase Auth handles passwords; token stored in browser
- RLS Policies: PostgreSQL enforces row-level access control at database level
- Frontend: AuthService provides login/logout methods; App checks session on init
- Backend: Routes manually verify auth headers if needed

**State Persistence:**
- localStorage: UI state (sidebar collapsed, menu state)
- Supabase: All application data (OKRs, departments, users)
- Session: Supabase Auth manages JWT tokens automatically

---

*Architecture analysis: 2026-04-07*
