# Security Testing Guide for PipeLine Scout

This directory contains comprehensive automated security tests for PipeLine Scout application, covering authentication, authorization, RLS policies, and input validation.

## Test Setup

### 1. Install Dependencies

First, add vitest to your project:

```bash
npm install -D vitest @vitest/ui
```

### 2. Create Test Users

Create three test users in your Supabase project with the following credentials (or customize in `.env.test`):

- **Admin User**: `test-admin@pipelinescout.test` (password: `SecureTestPassword123!`)
- **Member User**: `test-member@pipelinescout.test` (password: `SecureTestPassword123!`)
- **Viewer User**: `test-viewer@pipelinescout.test` (password: `SecureTestPassword123!`)

### 3. Assign Roles

After creating users, assign roles in the `user_roles` table:

```sql
-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'test-admin@pipelinescout.test';

-- Assign member role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'member'::app_role
FROM auth.users
WHERE email = 'test-member@pipelinescout.test';

-- Assign viewer role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'viewer'::app_role
FROM auth.users
WHERE email = 'test-viewer@pipelinescout.test';
```

### 4. Configure Environment

Copy `.env.test` and update with your actual test credentials if different:

```bash
cp .env.test .env.test.local
```

### 5. Add Test Scripts to package.json

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:security": "vitest run tests/security",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Running Tests

### Run All Security Tests
```bash
npm run test:security
```

### Run Specific Test Suites
```bash
# Authentication tests only
npx vitest tests/security/edge-functions.test.ts

# RLS policy tests only
npx vitest tests/security/rls-policies.test.ts

# Input validation tests only
npx vitest tests/security/input-validation.test.ts
```

### Run Tests in Watch Mode
```bash
npm test
```

### Run Tests with UI
```bash
npm run test:ui
```

## Test Coverage

### Edge Function Authentication Tests (`edge-functions.test.ts`)

Tests that verify all edge functions require proper JWT authentication:

- ✅ `document-qa` - Rejects unauthenticated requests
- ✅ `gather-competitor-intelligence` - Requires authentication and role checks
- ✅ `scrape-opportunities` - Requires authentication
- ✅ `fetch-highergov-opportunities` - Requires authentication
- ✅ `generate-capture-plan` - Requires authentication
- ✅ `generate-proposal-content` - Requires authentication
- ✅ `predict-win-probability` - Requires authentication
- ✅ `get-users-admin` - Requires admin role specifically

### RLS Policy Tests (`rls-policies.test.ts`)

Tests that verify data access is properly restricted based on:
- User role (admin, member, viewer)
- Data sensitivity level (public, internal, restricted)

**Tables Tested:**
- `opportunities` - Sensitivity-based access
- `competitive_assessments` - Internal/restricted only
- `ptw_analyses` - Role-based pricing data access
- `go_no_go_evaluations` - Strategic decision data
- `competitor_intelligence` - Restricted by default
- `win_loss_history` - Historical strategic data
- `document_qa_conversations` - Should inherit opportunity sensitivity
- `audit_logs` - Admin-only access
- `user_roles` - Self-only read access

### Input Validation Tests (`input-validation.test.ts`)

Tests that verify edge functions properly validate and sanitize inputs:

**document-qa function:**
- ✅ Rejects missing required parameters
- ✅ Enforces question length limits (5-2000 chars)
- ✅ Validates UUID format for opportunityId
- ✅ Prevents SQL injection attempts
- ✅ Prevents XSS attacks

**gather-competitor-intelligence function:**
- ✅ Rejects missing competitorName
- ✅ Enforces name length limits (2-200 chars)
- ✅ Validates character restrictions
- ✅ Validates sources array contains only valid URLs
- ✅ Limits sources array size (max 10)
- ✅ Prevents SQL injection

**scrape-opportunities function:**
- ✅ Enforces trusted domain whitelist
- ✅ Accepts government domains (.gov, .us, .ca.gov)
- ✅ Accepts trusted procurement platforms

**fetch-highergov-opportunities function:**
- ✅ Requires non-empty searchIds array

## Expected Test Results

After implementing the security fixes recommended in the security review, all tests should pass. Currently, you can expect:

- **Edge function authentication tests**: ❌ FAILING (authentication not yet implemented)
- **RLS policy tests**: ⚠️ PARTIAL (some policies correct, document Q&A needs fixing)
- **Input validation tests**: ❌ FAILING (validation not yet implemented)

## Continuous Integration

Add security tests to your CI/CD pipeline:

```yaml
# .github/workflows/security-tests.yml
name: Security Tests
on: [push, pull_request]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:security
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
          TEST_ADMIN_EMAIL: ${{ secrets.TEST_ADMIN_EMAIL }}
          TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}
          TEST_MEMBER_EMAIL: ${{ secrets.TEST_MEMBER_EMAIL }}
          TEST_MEMBER_PASSWORD: ${{ secrets.TEST_MEMBER_PASSWORD }}
          TEST_VIEWER_EMAIL: ${{ secrets.TEST_VIEWER_EMAIL }}
          TEST_VIEWER_PASSWORD: ${{ secrets.TEST_VIEWER_PASSWORD }}
```

## Maintenance

### Adding New Tests

When adding new edge functions or database tables:

1. Add authentication tests to `edge-functions.test.ts`
2. Add RLS policy tests to `rls-policies.test.ts`
3. Add input validation tests to `input-validation.test.ts`

### Updating Test Users

If you need to update test credentials:

1. Update `.env.test.local`
2. Update the users in Supabase
3. Verify role assignments in `user_roles` table

## Troubleshooting

### Tests Skip Due to Missing Sessions

If you see warnings like "Skipping test - no session", verify:
1. Test users exist in Supabase
2. Credentials in `.env.test.local` are correct
3. Users have proper role assignments

### Authentication Failures

If authentication tests fail unexpectedly:
1. Verify Supabase URL and anon key are correct
2. Check that test users have verified emails
3. Ensure Supabase auth is enabled

### RLS Policy Test Failures

If RLS tests fail:
1. Check that RLS is enabled on all tables
2. Verify security definer functions exist
3. Review policy definitions in migrations

## Security Best Practices

These tests enforce the following security principles:

1. **Authentication First**: All edge functions must verify JWT tokens
2. **Role-Based Authorization**: Access based on user role (admin/member/viewer)
3. **Data Classification**: Sensitivity levels control access (public/internal/restricted)
4. **Input Validation**: All user inputs validated before processing
5. **Defense in Depth**: Multiple layers of security (JWT + RLS + validation)
6. **Least Privilege**: Users only access data they need for their role
7. **Audit Logging**: Sensitive operations logged for compliance

## Support

For questions or issues with security tests:
1. Review the comprehensive security review documentation
2. Check test output for specific failure messages
3. Verify your Supabase configuration matches requirements
4. Consult the security findings dashboard in the application
