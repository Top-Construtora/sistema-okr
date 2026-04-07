# Codebase Concerns

**Analysis Date:** 2026-04-07

## Tech Debt

**Large Monolithic Frontend Pages:**
- Issue: OKRs page (`frontend/Pages/OKRs/OKRs.js` - 5,475 lines) and MyOKRs page (`frontend/Pages/OKRs/MyOKRs.js` - 5,234 lines) are unmaintainable mega-files with duplicated logic
- Files: `frontend/Pages/OKRs/OKRs.js`, `frontend/Pages/OKRs/MyOKRs.js`
- Impact: Difficult bug fixes, high regression risk, duplicated rendering logic, poor code reusability
- Fix approach: Extract common components (OKR cards, modals, evidence management, initiative manager) into separate `frontend/Components/` modules; create shared utilities for state management and filtering

**Inconsistent Naming Conventions:**
- Issue: Camel case (`objectiveId`, `miniCycleId`) and snake case (`objective_id`, `mini_cycle_id`) used interchangeably throughout codebase
- Files: `frontend/Entities/OKR.js`, `frontend/Entities/Initiative.js`, entity models everywhere
- Impact: Confusion during development, redundant getter/setter pairs, harder to trace data flow
- Fix approach: Standardize on snake_case for database fields/API responses, camelCase for JavaScript variables; create entity mappers if needed

**Missing Input Validation & Sanitization:**
- Issue: Most forms accept user input without validation before display; only minimal `validate()` checks in entities; no XSS protection on user-provided content
- Files: `frontend/Pages/OKRs/OKRs.js` (line 1220+), `frontend/Pages/Users/Users.js`, `frontend/Pages/StrategicObjectives/StrategicObjectiveDetail.js`
- Impact: Potential XSS attacks via title/description fields; HTML injection in OKR titles rendered with `innerHTML`
- Fix approach: Implement input sanitization using DOMPurify or similar; use `textContent` instead of `innerHTML` for user data; add pre-save validation

**No Centralized Error Handling:**
- Issue: Error handling scattered throughout codebase with inconsistent patterns; many `try-catch` blocks just `console.error()` and show generic toasts
- Files: Across all page files (`frontend/Pages/**/*.js`)
- Impact: Difficult debugging, inconsistent user feedback, silent failures in some paths
- Fix approach: Create centralized error handler service with structured logging; standardize error message format; implement retry logic for network failures

**Database RLS Complexity:**
- Issue: RLS policies for strategic objectives duplicated with fallback logic for `departamento_id` (legacy) and `user_departments` (new multi-department system)
- Files: `backend/database/31_strategic_dept_rls.sql` (nested EXISTS subqueries with duplication)
- Impact: Maintenance nightmare, potential inconsistency between old/new paths, performance overhead from repeated lookups
- Fix approach: Migrate all users to `user_departments` table, remove `departamento_id` fallback, simplify RLS policies; add migration script with validation

## Known Bugs

**RLS Policy Violations on Evidence Upload:**
- Symptoms: Users unable to save evidence in some scenarios; 403 errors when uploading files to initiatives
- Files: `frontend/Pages/OKRs/OKRs.js` (evidence upload section ~line 1650-1750), `backend/database/30_fix_evidence_policies.sql`
- Trigger: Complex RLS rules on `key_results` and `initiatives` tables conflict with storage policies
- Workaround: Evidence upload currently permits all authenticated users (overly permissive; fixed in 30_fix_evidence_policies.sql)

**Modal Overlay Z-Index Issue (Fixed):**
- Symptoms: Modal content covered by overlay in some scenarios after using Modal.confirm()
- Files: `frontend/Components/Modal.js` or similar
- Trigger: Commit 85fac9a shows this was a real issue
- Current status: Fixed, but indicates fragile CSS layering

**SSO Token Not Creating Auth Session (Fixed):**
- Symptoms: Users logged in via SSO couldn't access protected routes
- Files: `frontend/services/auth.js`, `app.js` SSO handler (~line 63-122)
- Trigger: Token validated but Supabase session not properly established
- Current status: Fixed in commit 103d40e; verify during testing

**Past Dates Selectable in Calendar Reminders (Fixed):**
- Symptoms: Users able to create reminders with past dates causing logic errors
- Files: `frontend/Pages/Calendar/Calendar.js` (reminder form validation)
- Trigger: Date picker lacked min-date constraint
- Current status: Fixed in commit d756eae

## Security Considerations

**No Input Escaping in Dynamic HTML:**
- Risk: XSS injection via user-controlled fields rendered with `innerHTML`
- Files: `frontend/app.js` (splash screen HTML), `frontend/Pages/OKRs/OKRs.js` (OKR cards), `frontend/Layout.js`
- Current mitigation: Limited; `escapeHtml()` exists in some pages but not consistently applied
- Recommendations: Use templating library or enforce textContent-only rendering; add Content Security Policy header; implement DOMPurify

**Overly Permissive RLS Policies:**
- Risk: Evidence storage allows ALL authenticated users to read/write/delete all files (30_fix_evidence_policies.sql)
- Files: `backend/database/30_fix_evidence_policies.sql` (line 65-83)
- Current mitigation: No ownership checks; relies on Supabase authentication alone
- Recommendations: Add ownership checks; restrict to creator or OKR/initiative owner; audit who has file access

**JWT Secret Management:**
- Risk: `SSO_SECRET` passed in environment but no rotation mechanism or expiration enforcement
- Files: Backend environment; referenced in `CLAUDE.md`
- Current mitigation: Documented as required (32+ chars minimum)
- Recommendations: Implement secret rotation; add expiration to SSO tokens (currently 5-minute hardcoded in code)

**CORS Configuration Too Permissive:**
- Risk: Allows requests without `origin` header (line 29 in `backend/server.js`), permitting tools like Postman and mobile apps without origin check
- Files: `backend/server.js` (line 27-44)
- Current mitigation: Logs warnings for blocked origins
- Recommendations: Require origin header; disallow unauthenticated CORS in production

## Performance Bottlenecks

**N+1 Query Pattern in Export Service:**
- Problem: For each OKR, fetches key results; for each KR, fetches initiatives; for each initiative, fetches users
- Files: `frontend/services/export.js` (line 105-144)
- Cause: Sequential loops with nested API calls instead of batch queries
- Improvement path: Use Promise.all() to parallelize fetches; add batch query method to Supabase entities

**Complex Nested RLS Queries:**
- Problem: Strategic objective RLS checks repeat similar EXISTS subqueries with joins 3+ levels deep
- Files: `backend/database/31_strategic_dept_rls.sql` (all policies)
- Cause: Fallback for legacy departamento_id column forces duplication
- Improvement path: Denormalize department visibility into strategic_objectives table; remove fallback logic once migration complete

**Large Page Render Times:**
- Problem: OKRs page (5,475 lines) renders entire OKR hierarchy at once; no pagination or virtual scrolling
- Files: `frontend/Pages/OKRs/OKRs.js`
- Cause: All data fetched and rendered in single pass; no lazy loading
- Improvement path: Implement pagination (25 items/page); add virtual scrolling for large lists; defer rendering initiatives until expanded

## Fragile Areas

**Strategic Objective Multi-Department Support:**
- Files: `frontend/Pages/StrategicObjectives/StrategicObjectiveDetail.js`, `backend/database/22_strategic_multi_department.sql`, `backend/database/23_fix_dept_ids_jsonb.sql`, `backend/database/31_strategic_dept_rls.sql`
- Why fragile: Multiple migrations (22, 23, 31) show evolution from single dept → jsonb array → current multi-dept system; RLS policies have complex fallbacks for legacy data
- Safe modification: Before changing multi-dept logic, audit `strategic_objectives.department_ids` usage across codebase; ensure all RLS policies updated consistently; add data validation tests
- Test coverage: No automated tests visible; manual testing required

**User Multi-Department Assignment:**
- Files: `frontend/Entities/User.js`, `frontend/services/auth.js` (line 41-59), `backend/database/22_strategic_multi_department.sql`
- Why fragile: Uses both `user.departamento_id` (legacy single dept) and `user_departments` junction table; fallback logic in auth tries old structure first
- Safe modification: Standardize on `user_departments` table; migrate all users; remove `departamento_id` column in single transaction
- Test coverage: Verify login flow with users in 0, 1, and multiple departments

**OKR Progress Calculation:**
- Files: `frontend/Entities/OKR.js` (complex getProgress() method), `frontend/Pages/OKRs/OKRs.js` rendering
- Why fragile: Progress calculated from key results; multiple status states (pending, adjust, approved, completed, homologated) affect calculation differently
- Safe modification: Document progress calculation rules clearly; add unit tests for each status combination
- Test coverage: No visible test coverage for progress scenarios

**Strategic Planning Rollback Risk:**
- Files: `backend/database/28_planning_admin_policies.sql`, `backend/database/28_rollback_contratos_naue.sql`
- Why fragile: Migration script applied to multiple databases; rollback script includes commented-out table drops with warnings about "if db already had these tables"
- Safe modification: Ensure migration scripts are idempotent; test rollback in staging before production; document which databases received which migrations
- Test coverage: No migration test script visible

## Scaling Limits

**Single Supabase Project:**
- Current capacity: One Supabase PostgreSQL instance shared between frontend and backend
- Limit: RLS policies execute on every query; with hundreds of concurrent users, query latency increases; no caching layer
- Scaling path: Add Redis caching for static data (objectives, departments, policies); implement query batching; consider connection pooling; monitor Supabase metrics

**File Storage (Evidence Upload):**
- Current capacity: Supabase bucket "evidencias" with no size limits or quota enforced
- Limit: Unbounded storage growth; no cleanup of orphaned files when OKRs/initiatives deleted
- Scaling path: Add storage quota per user/department; implement cleanup triggers when records deleted; archive old evidence; monitor bucket size

**Real-time Features Not Implemented:**
- Current capacity: All data fetched on page load; no live updates when other users change OKRs
- Limit: Concurrent editing causes stale data; multiple users unable to collaborate on same OKR without manual refresh
- Scaling path: Implement Supabase realtime subscriptions for OKR/KR changes; add optimistic updates on client; implement conflict resolution

## Dependencies at Risk

**Legacy Supabase JS Client Version:**
- Risk: `@supabase/supabase-js@^2.39.0` is pinned to exact 2.39.0; no minor/patch updates
- Files: `frontend/package.json`, `backend/package.json`
- Impact: Misses security patches, bug fixes, new features
- Migration plan: Update to latest 2.x version; test RLS behavior (known to change between versions); add automated dependency updates with CI

**JSPDF for PDF Export:**
- Risk: jsPDF (^4.0.0) and jspdf-autotable (^5.0.7) are heavy dependencies; export functionality only used rarely
- Files: `frontend/services/export.js`, `frontend/package.json`
- Impact: Increases bundle size; alternative: lazy-load on export page only
- Migration plan: Move export libraries to dynamic import; only load when export page accessed; consider lighter alternative like pdfmake

**No TypeScript:**
- Risk: Entire codebase is vanilla JavaScript; no type safety; errors caught only at runtime
- Files: All `.js` files
- Impact: Refactoring is risky; IDE support limited; harder to onboard new developers
- Migration plan: Gradual TypeScript migration; start with critical modules (auth, data models); enable strict mode incrementally

## Missing Critical Features

**No Automated Tests:**
- Problem: No unit, integration, or E2E tests; manual testing only (documented in `frontend/GUIA_DE_TESTES.md`)
- Blocks: Confident refactoring, regression detection, CI/CD automation
- Impact: Bug fixes take longer; regressions ship to production

**No Undo/Audit Trail:**
- Problem: OKR changes not logged; no way to revert accidental edits or track who changed what
- Blocks: Compliance, data recovery, change tracking
- Impact: Users unable to restore deleted initiatives; no audit for governance

**No Bulk Operations:**
- Problem: Users must edit OKRs one at a time; no bulk update/delete for department-wide changes
- Blocks: Efficiency improvements, time-saving operations
- Impact: Tedious admin workflows

## Test Coverage Gaps

**OKR Progress Calculation Logic:**
- What's not tested: `OKR.getProgress()` method; how progress changes across status transitions (pending → adjust → approved → completed → homologated)
- Files: `frontend/Entities/OKR.js`
- Risk: Silent calculation errors; users see incorrect progress percentages
- Priority: High

**Multi-Department User Access:**
- What's not tested: Users in multiple departments can see/edit OKRs for all assigned departments; RLS blocks other departments correctly
- Files: `frontend/services/auth.js`, `backend/database/31_strategic_dept_rls.sql`
- Risk: Data leakage or false denials; RLS policies don't behave as expected
- Priority: High

**Evidence Upload Permissions:**
- What's not tested: Users can only upload/download evidence for OKRs/initiatives they have access to
- Files: `frontend/Pages/OKRs/OKRs.js`, `backend/database/30_fix_evidence_policies.sql`
- Risk: Security bypass; users access unauthorized files
- Priority: High

**SSO Token Validation:**
- What's not tested: SSO tokens properly expired, validated, marked as used; replay attacks prevented
- Files: `frontend/services/auth.js`, `app.js`
- Risk: Session hijacking; users authenticated with invalid tokens
- Priority: High

**Calendar Date Validation:**
- What's not tested: Past dates correctly rejected; reminder dates always in future; edge cases (today, midnight, timezone handling)
- Files: `frontend/Pages/Calendar/Calendar.js`
- Risk: Reminders for past dates causing undefined behavior
- Priority: Medium

---

*Concerns audit: 2026-04-07*
