import { beforeAll, afterAll, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

// Test user credentials (set these in .env.test)
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'test-admin@example.com';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'TestPassword123!';

const TEST_MEMBER_EMAIL = process.env.TEST_MEMBER_EMAIL || 'test-member@example.com';
const TEST_MEMBER_PASSWORD = process.env.TEST_MEMBER_PASSWORD || 'TestPassword123!';

const TEST_VIEWER_EMAIL = process.env.TEST_VIEWER_EMAIL || 'test-viewer@example.com';
const TEST_VIEWER_PASSWORD = process.env.TEST_VIEWER_PASSWORD || 'TestPassword123!';

export interface TestContext {
  adminClient: ReturnType<typeof createClient>;
  memberClient: ReturnType<typeof createClient>;
  viewerClient: ReturnType<typeof createClient>;
  adminToken: string;
  memberToken: string;
  viewerToken: string;
}

export async function setupTestUsers(): Promise<TestContext> {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const memberClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const viewerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let adminToken = '';
  let memberToken = '';
  let viewerToken = '';

  try {
    // Sign in admin user
    const { data: adminAuth, error: adminError } = await adminClient.auth.signInWithPassword({
      email: TEST_ADMIN_EMAIL,
      password: TEST_ADMIN_PASSWORD,
    });

    if (!adminError && adminAuth.session) {
      adminToken = adminAuth.session.access_token;
    }

    // Sign in member user
    const { data: memberAuth, error: memberError } = await memberClient.auth.signInWithPassword({
      email: TEST_MEMBER_EMAIL,
      password: TEST_MEMBER_PASSWORD,
    });

    if (!memberError && memberAuth.session) {
      memberToken = memberAuth.session.access_token;
    }

    // Sign in viewer user
    const { data: viewerAuth, error: viewerError } = await viewerClient.auth.signInWithPassword({
      email: TEST_VIEWER_EMAIL,
      password: TEST_VIEWER_PASSWORD,
    });

    if (!viewerError && viewerAuth.session) {
      viewerToken = viewerAuth.session.access_token;
    }
  } catch (error) {
    console.error('Error setting up test users:', error);
  }

  return {
    adminClient,
    memberClient,
    viewerClient,
    adminToken,
    memberToken,
    viewerToken,
  };
}

export async function cleanupTestUsers(context: TestContext) {
  try {
    await context.adminClient.auth.signOut();
    await context.memberClient.auth.signOut();
    await context.viewerClient.auth.signOut();
  } catch (error) {
    console.error('Error cleaning up test users:', error);
  }
}

// Global setup and teardown
let testContext: TestContext;

beforeAll(async () => {
  console.log('Setting up test environment...');
  testContext = await setupTestUsers();
  
  if (!testContext.adminToken) {
    console.warn('Warning: Admin test user not authenticated. Some tests may be skipped.');
  }
  if (!testContext.memberToken) {
    console.warn('Warning: Member test user not authenticated. Some tests may be skipped.');
  }
  if (!testContext.viewerToken) {
    console.warn('Warning: Viewer test user not authenticated. Some tests may be skipped.');
  }
});

afterAll(async () => {
  console.log('Cleaning up test environment...');
  if (testContext) {
    await cleanupTestUsers(testContext);
  }
});

afterEach(async () => {
  // Clean up any test data created during tests
  // Add cleanup logic here if needed
});

export { testContext };
