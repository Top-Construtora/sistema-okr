# Coding Conventions

**Analysis Date:** 2026-04-07

## Naming Patterns

**Files:**
- PascalCase for classes/entities: `User.js`, `OKR.js`, `Department.js`
- camelCase for services: `supabase.js`, `auth.js`, `storage.js`
- camelCase for utilities and helpers
- kebab-case for route files: `auth.routes.js`, `user.routes.js`, `okr.routes.js`
- PascalCase for Page components: `Dashboard.js`, `OKRs.js`, `ApprovalCommittee.js`
- kebab-case for page directories: `Strategic-Objectives/`, `Approval-Committee/`

**Variables and Constants:**
- camelCase for variables: `userId`, `userName`, `departmentId`, `miniCycleId`
- snake_case for database column names (matching database): `user_id`, `created_at`, `mini_cycle_id`, `key_results`
- Getters/setters use both formats for compatibility (snake_case property + camelCase getter): see `OKR.js` lines 22-47
- UPPERCASE for exported constants: `OKR_STATUS`, `REMINDER_TYPES`, `REMINDER_PRIORITIES`

**Functions:**
- camelCase for methods and functions: `render()`, `validate()`, `getAll()`, `isValidEmail()`
- Async methods documented with `async` keyword in definition
- Static methods use `static` keyword: `User.isEmailUnique()`, `OKR.getAll()`
- Private utility functions use camelCase: `handleSupabaseError()`, `getProxyUrl()`, `convertToProxyUrl()`

**Types/Classes:**
- PascalCase for class names: `User`, `OKR`, `Department`, `Initiative`, `MiniCycle`
- Singular nouns for entity classes
- Constructor parameter uses object destructuring with defaults: `constructor(data = {})`

## Code Style

**Formatting:**
- No linter/formatter configured - no ESLint, Prettier, or Biome
- 4-space indentation (convention observed in all files)
- Single quotes for strings (most common)
- Semicolons at end of statements (conventional)
- Arrow functions for callbacks: `(req, res) => { ... }`, `() => { ... }`

**Linting:**
- No linting configuration present - code quality depends on developer discipline
- Console logging used for debugging: `console.log()`, `console.error()`, `console.warn()`
- Emoji prefixes in logs for visual categorization: `❌`, `✅`, `🔐`, `⚠️`, `🚀` (see `app.js`, `server.js`)

## Import Organization

**Order (Frontend - ES Modules):**
1. Supabase client imports first: `import { supabaseClient } from '../services/supabase.js'`
2. Service imports: `import { StorageService } from '../services/storage.js'`
3. Entity/Model imports: `import { User } from '../Entities/User.js'`
4. Component imports: `import { Modal } from '../Components/Modal.js'`
5. Utility imports: `import { uid } from '../services/storage.js'`

**Order (Backend - ES Modules):**
1. Framework imports: `import express from 'express'`
2. Third-party/npm imports: `import cors from 'cors'`, `import dotenv from 'dotenv'`
3. Local config imports: `import supabase from '../config/supabase.js'`
4. Local route/handler imports: `import authRoutes from './routes/auth.routes.js'`

**Path Aliases:**
- No path aliases configured
- Relative paths used throughout: `../services/`, `../../Entities/`
- Frontend structure encourages relative imports based on directory nesting

## Error Handling

**Patterns:**

**Frontend:**
- Try-catch blocks with Supabase client calls:
  ```javascript
  try {
      const { data, error } = await supabaseClient
          .from('table')
          .select('*');
      if (error) throw error;
      return data;
  } catch (error) {
      console.error('Context message:', error);
      return null;  // or []
  }
  ```
- Errors logged to console, then null/empty returned
- `handleSupabaseError()` utility used to format Supabase error messages (`supabase.js` lines 28-36)
- Modal dialogs used for user-facing errors and confirmations
- User.js validates data and returns array of error strings (lines 22-50)

**Backend:**
- Try-catch with async route handlers:
  ```javascript
  router.post('/endpoint', async (req, res) => {
      try {
          // Operation
          res.status(200).json({ success: true, data });
      } catch (error) {
          console.error('Context:', error);
          res.status(500).json({ success: false, error: error.message });
      }
  });
  ```
- Input validation before Supabase calls (auth.routes.js lines 18-32)
- Consistent error response format: `{ success: false, error: 'message' }`
- Sensitive error details logged only to console, generic messages to clients (password-reset endpoint, line 57-60)
- HTTP status codes used appropriately: 400 (validation), 401 (auth), 404 (not found), 500 (server error)

## Logging

**Framework:** Console (no logging library)

**Patterns:**
- `console.log()` for general info and debugging
- `console.error()` for errors (always logs context message first)
- `console.warn()` for warnings
- Emoji prefixes for visual categorization (optional but observed):
  - `❌` error conditions
  - `✅` success conditions
  - `🔐` security/auth operations
  - `⚠️` warnings
  - `🚀` startup messages

**When to Log:**
- Entry/exit of critical functions (async operations)
- Error conditions with context
- Authentication/authorization events (see auth.routes.js)
- Configuration status on startup (supabase.js validation, server.js CORS)
- NOT: Data values in production (logged in dev only)

## Comments

**When to Comment:**
- Complex algorithms (none observed in current codebase)
- Non-obvious business logic (department visibility rules in StrategicObjective.js)
- Section separators in files with multiple concerns
- Inline comments only when "why" is not obvious from code

**JSDoc/TSDoc:**
- Used in utility functions and public methods
- Parameter descriptions with `@param`
- Return type descriptions with `@returns`
- Example: Modal.js lines 3-13, supabase.js lines 42-50
- Not consistently used everywhere (optional, not required)

**Section Comments:**
- Used to organize large files with `// ===== SECTION NAME =====` pattern
- Examples: app.js lines 1-4 (header), auth.routes.js lines 12, 72, 138 (route sections)

## Function Design

**Size:** 
- Functions vary in size; most stay under 50 lines
- Async CRUD operations typically 20-40 lines
- Page render methods can be 100+ lines (necessary for complex layouts)

**Parameters:**
- Single object parameter for functions with multiple arguments: `{ email, senha, tipo }`
- Optional parameters use defaults in object destructuring: `{ maxLength = 500, required = true }`
- Query params/options passed as objects

**Return Values:**
- Async functions return actual data or null on error (never throw to caller)
- Validation methods return array of error strings (User.validate())
- Boolean returns for checks: `isValidEmail()`, `isEmailUnique()`, `isAuthenticated()`
- Promise-based returns for async operations: Modal.prompt() returns Promise<string|null>

## Module Design

**Exports:**
- Single default export for classes: `export default router`
- Named exports for utilities: `export { supabaseClient, handleSupabaseError, getProxyUrl }`
- Constants exported as named: `export const REMINDER_TYPES = { ... }`
- Page components export as named objects: `const DashboardPage = { ... }; export { DashboardPage }`

**Barrel Files:**
- Not used; all imports are direct
- Example: `import { OKR } from '../Entities/OKR.js'` (not from index.js)

## Page Component Pattern

All Page components follow a consistent structure (see Dashboard.js, OKRs.js):

```javascript
const PageName = {
    async render() {
        // 1. Set up HTML skeleton
        document.getElementById('content').innerHTML = `...`;
        
        // 2. Add styles if needed
        this.addStyles();
        
        // 3. Load and render data in parallel
        await Promise.all([
            this.renderSection1(),
            this.renderSection2()
        ]);
    },
    
    async renderSection1() {
        const container = document.getElementById('section1');
        // Fetch data
        // Build HTML
        // Append to container
    },
    
    addStyles() {
        // CSS-in-JS added once per page
    }
};

export { PageName };
```

**Key Conventions:**
- Render method creates skeleton UI first, then populates sections
- Sections rendered asynchronously in parallel with Promise.all()
- Data fetched within render methods, not passed as props
- Styles added as inline `<style>` tags in HTML (not separate CSS files)

## Entity Pattern

All Entity classes (User.js, OKR.js, Department.js) follow this pattern:

```javascript
class Entity {
    constructor(data = {}) {
        // Initialize all properties with defaults
        this.id = data.id || null;
        this.name = data.name || '';
    }
    
    // Validation
    validate() {
        const errors = [];
        // Add validation checks
        return errors;  // Array of error strings
    }
    
    // Instance method to save
    async save() {
        const errors = this.validate();
        if (errors.length > 0) throw new Error(errors[0]);
        // Perform create or update
    }
    
    // Static methods for CRUD
    static async getAll() { ... }
    static async getById(id) { ... }
    static async create(data) { ... }
}
```

**Key Conventions:**
- Constructor accepts `data` object with property defaults
- `validate()` instance method returns array of error messages
- `save()` and `delete()` are instance methods
- `getAll()`, `getById()`, `create()`, `update()` are static methods
- All async database operations in try-catch, return null on error

## Global Functions and Window Exposure

Frontend exposes many entities and pages globally via `window` (main.js lines 66-111) to support inline onclick handlers in HTML:

```html
<button onclick="OKR.create()">New OKR</button>
<button onclick="Layout.navigate('okrs')">Go to OKRs</button>
```

This is intentional for vanilla JS SPA without a framework.

---

*Convention analysis: 2026-04-07*
