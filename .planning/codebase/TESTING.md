# Testing Patterns

**Analysis Date:** 2026-04-07

## Test Framework Status

**No automated tests currently configured.**

The project has no test runner installed:
- `frontend/package.json`: No testing dependencies (jest, vitest, mocha)
- `backend/package.json`: No testing dependencies (jest, vitest, mocha)
- No test configuration files: No jest.config.js, vitest.config.js, mocha.config.js
- No test files: No `.test.js`, `.spec.js`, or `__tests__` directories

Manual testing guide exists: `frontend/GUIA_DE_TESTES.md` (in Portuguese)

## Manual Testing Approach

**Development Testing:**
- Browser console (F12) for frontend errors
- Backend terminal logs for API responses
- Supabase Dashboard → Table Editor for data verification
- Browser DevTools Network tab for API requests
- Supabase Dashboard → Logs for database/auth events

**Testing Procedure for New Features:**
See `frontend/GUIA_DE_TESTES.md` for manual test cases by page/feature.

## Current Code Structure for Testing

### Frontend - Testable Patterns

**Entities as Pure Models (Testable):**

File: `frontend/Entities/User.js`

```javascript
class User {
    constructor(data = {}) {
        // Properties can be instantiated in tests
    }
    
    validate() {
        const errors = [];
        if (!this.nome || this.nome.trim() === '') {
            errors.push('Nome é obrigatório');
        }
        // ...
        return errors;  // Pure function: easy to test
    }
    
    isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);  // Pure function: trivial to test
    }
}
```

**Good for testing:**
- `validate()` method returns array of errors (pure function)
- `isValidEmail()` method uses simple regex (pure function)
- Constructor accepts data object with defaults (easy to mock)

**Hard to test (coupled to Supabase):**
- `static async isEmailUnique()` (line 58-76) - requires Supabase connection
- `async save()` method - database operation
- Async methods that call supabaseClient

**Storage Service (Testable Interface):**

File: `frontend/services/storage.js`

```javascript
const StorageService = {
    async getAll(entity) { ... },
    async getById(entity, id) { ... },
    async create(entity, item) { ... },
    async update(entity, id, updatedItem) { ... },
    async delete(entity, id) { ... }
};
```

**Pattern for testing:**
- Mock `supabaseClient` to return test data
- Import StorageService and mock its methods
- Test error handling paths by mocking error responses

**Example test structure (if tests were implemented):**

```javascript
// Example test for User.validate()
describe('User.validate()', () => {
    test('should return error if nome is empty', () => {
        const user = new User({ nome: '', email: 'test@test.com' });
        const errors = user.validate();
        expect(errors).toContain('Nome é obrigatório');
    });
    
    test('should return error if email format is invalid', () => {
        const user = new User({ nome: 'John', email: 'invalid' });
        const errors = user.validate();
        expect(errors).toContain('Email inválido');
    });
});

// Example test mocking Supabase
describe('User.isEmailUnique()', () => {
    beforeEach(() => {
        // Mock supabaseClient before each test
        vi.mock('../services/supabase.js', () => ({
            supabaseClient: {
                from: vi.fn(() => ({
                    select: vi.fn(() => ({
                        ilike: vi.fn(() => Promise.resolve({ data: [] }))
                    }))
                }))
            }
        }));
    });
    
    test('should return true if email is unique', async () => {
        const isUnique = await User.isEmailUnique('newuser@test.com');
        expect(isUnique).toBe(true);
    });
});
```

### Backend - Testable Patterns

**Route Handlers with Clear Input/Output:**

File: `backend/routes/auth.routes.js` (password-reset endpoint, lines 14-70)

```javascript
router.post('/password-reset', async (req, res) => {
    try {
        const { email } = req.body;
        
        // Input validation - easy to test
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email é obrigatório'
            });
        }
        
        // Format validation - easy to test
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Email inválido'
            });
        }
        
        // Supabase operation - needs mocking
        // ...
        
        res.json({ success: true, message: '...' });
    } catch (error) {
        res.status(500).json({ success: false, error: '...' });
    }
});
```

**Good for testing:**
- Input validation logic (pure)
- Email regex validation (pure)
- HTTP status codes and response format

**Hard to test (requires mocking):**
- Supabase database calls
- JWT token verification
- Email sending (supabaseAdmin.auth.resetPasswordForEmail)

**Example test structure (if tests were implemented):**

```javascript
// Example test for password-reset validation
describe('POST /api/auth/password-reset', () => {
    test('should return 400 if email is missing', async () => {
        const response = await request(app)
            .post('/api/auth/password-reset')
            .send({});
        
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Email é obrigatório');
    });
    
    test('should return 400 if email format is invalid', async () => {
        const response = await request(app)
            .post('/api/auth/password-reset')
            .send({ email: 'invalid' });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Email inválido');
    });
});
```

## Barriers to Testing

1. **Global Supabase Client**: Both frontend and backend import a singleton Supabase client that's hard to mock
   - `frontend/services/supabase.js` - single instance
   - `backend/config/supabase.js` - two instances (public + admin)
   
2. **No Dependency Injection**: Services receive dependencies through imports, not constructor parameters
   - Makes mocking difficult
   - Would need to refactor to accept clients as parameters or options

3. **Direct HTML Mutation**: Frontend pages manipulate DOM directly with innerHTML
   - Hard to test without DOM utilities (JSDOM, etc.)
   - No component structure for unit testing

4. **Database Operations in Entity Methods**: All CRUD is in Entity classes
   - Mixing data models with persistence logic
   - Would need database test fixtures or test database

5. **No Environment Separation**: Same code runs in dev/test/prod
   - Database operations execute immediately in tests without isolation
   - No separate test database configured

## Recommendations for Adding Tests

### Quick Wins (Easiest to implement):

1. **Pure Function Tests** (10-15 minutes each):
   - `User.isValidEmail()` - test regex validation
   - `OKR.calculateProgress()` - test progress calculation logic
   - `Cycle.isActive()` - test date logic
   - No mocking required, can use simple assertions

2. **Validation Tests** (15-20 minutes each):
   - Entity `validate()` methods in all entity classes
   - Route input validation in backend routes
   - Regex patterns (email, phone, etc.)

### Medium Effort (Refactor + Tests):

3. **API Integration Tests** (1-2 hours):
   - Install vitest + @testing-library/dom (or similar)
   - Mock Supabase client globally
   - Test route handlers with mocked responses
   - Start with auth routes (password reset, confirm reset)

4. **Service Layer Tests** (2-3 hours):
   - Create wrapper services that inject Supabase client
   - Convert StorageService, AuthService to dependency injection
   - Test with mocked Supabase responses

### High Effort (Significant Refactor):

5. **Component Testing** (3-5 hours each):
   - Extract page render logic into testable functions
   - Use jsdom + vitest for DOM testing
   - Separate data loading from UI rendering
   - Examples: Dashboard rendering, OKR form validation

6. **E2E Testing** (4+ hours):
   - Install Playwright or Cypress
   - Test full user workflows (login → create OKR → approve)
   - Requires test database seed data
   - Run against staging environment

## Setting Up Testing (Step by Step)

**To add basic unit tests:**

```bash
# 1. Install test dependencies
cd frontend
npm install -D vitest @testing-library/dom jsdom

# 2. Create vitest config
cat > vitest.config.js << 'EOF'
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./test/setup.js']
    }
});
EOF

# 3. Create test setup file
mkdir -p test
cat > test/setup.js << 'EOF'
import { vi } from 'vitest';
// Mock Supabase globally
vi.mock('../src/services/supabase.js', () => ({
    supabaseClient: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ data: null, error: null }))
                }))
            }))
        }))
    }
}));
EOF

# 4. Create first test file
mkdir -p test/Entities
cat > test/Entities/User.test.js << 'EOF'
import { describe, test, expect } from 'vitest';
import { User } from '../../Entities/User.js';

describe('User', () => {
    test('should validate required name', () => {
        const user = new User({ nome: '', email: 'test@test.com' });
        const errors = user.validate();
        expect(errors).toContain('Nome é obrigatório');
    });
});
EOF

# 5. Add to package.json
npm install
# Then update scripts in package.json:
# "test": "vitest"
# "test:ui": "vitest --ui"
# "test:coverage": "vitest --coverage"
```

**To add backend API tests:**

```bash
# 1. Install dependencies
cd ../backend
npm install -D vitest supertest

# 2. Create test for auth routes
mkdir -p test/routes
cat > test/routes/auth.test.js << 'EOF'
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

describe('POST /api/auth/password-reset', () => {
    test('should validate email field', async () => {
        const res = await request(app)
            .post('/api/auth/password-reset')
            .send({ email: '' });
        
        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });
});
EOF

# 3. Update package.json scripts
# "test": "vitest"
```

## Testing Command Reference

**Once tests are set up:**

```bash
# Run all tests once
npm test

# Watch mode (re-run on file changes)
npm test -- --watch

# Coverage report
npm test -- --coverage

# UI mode (browser-based test viewer)
npm test -- --ui

# Specific test file
npm test test/Entities/User.test.js

# Specific test suite
npm test -- -t "User validation"
```

## Test Data / Fixtures

**Currently:** No test fixtures or factories.

**Recommendation:** Create `test/fixtures/` directory with test data generators:

```javascript
// test/fixtures/users.js
export const mockUser = {
    id: '123',
    nome: 'John Doe',
    email: 'john@example.com',
    tipo: 'colaborador',
    ativo: true
};

export const mockUsers = [mockUser];

// test/fixtures/factories.js
export function createUser(overrides = {}) {
    return { ...mockUser, ...overrides };
}
```

---

*Testing analysis: 2026-04-07*
