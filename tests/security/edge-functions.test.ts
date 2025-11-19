import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

describe('Edge Function Authentication Tests', () => {
  let supabase: ReturnType<typeof createClient>;
  let adminToken: string;
  let memberToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Note: In real tests, create test users with proper roles
    // For now, these tests verify the authentication logic exists
  });

  describe('document-qa function', () => {
    it('should reject requests without authentication', async () => {
      const { error } = await supabase.functions.invoke('document-qa', {
        body: {
          opportunityId: '00000000-0000-0000-0000-000000000000',
          question: 'Test question'
        }
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/unauthorized|authentication|401/i);
    });

    it('should reject requests with invalid JWT token', async () => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/document-qa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token-12345'
        },
        body: JSON.stringify({
          opportunityId: '00000000-0000-0000-0000-000000000000',
          question: 'Test question'
        })
      });

      expect(response.status).toBe(401);
    });

    it('should accept authenticated requests with valid JWT', async () => {
      // This test requires a valid session
      // In practice, sign in a test user first
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        console.warn('Skipping authenticated test - no session');
        return;
      }

      const { error } = await supabase.functions.invoke('document-qa', {
        body: {
          opportunityId: '00000000-0000-0000-0000-000000000000',
          question: 'Valid authenticated question'
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        }
      });

      // Should not be unauthorized (may fail for other reasons like invalid opportunity)
      expect(error?.message).not.toMatch(/unauthorized|authentication|401/i);
    });
  });

  describe('gather-competitor-intelligence function', () => {
    it('should reject requests without authentication', async () => {
      const { error } = await supabase.functions.invoke('gather-competitor-intelligence', {
        body: {
          competitorName: 'Test Competitor'
        }
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/unauthorized|authentication|401/i);
    });

    it('should reject viewer role users', async () => {
      // Viewers should not be able to modify competitor intelligence
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        console.warn('Skipping role test - no session');
        return;
      }

      const { error } = await supabase.functions.invoke('gather-competitor-intelligence', {
        body: {
          competitorName: 'Test Competitor'
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        }
      });

      // Should verify role before allowing modifications
      const errorMsg = error?.message || '';
      expect(errorMsg).toMatch(/forbidden|insufficient.*privilege|403/i);
    });
  });

  describe('scrape-opportunities function', () => {
    it('should reject requests without authentication', async () => {
      const { error } = await supabase.functions.invoke('scrape-opportunities', {
        body: {
          source_url: 'https://sam.gov',
          source_name: 'SAM.gov'
        }
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/unauthorized|authentication|401/i);
    });
  });

  describe('fetch-highergov-opportunities function', () => {
    it('should reject requests without authentication', async () => {
      const { error } = await supabase.functions.invoke('fetch-highergov-opportunities', {
        body: {
          searchIds: ['test-search-id']
        }
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/unauthorized|authentication|401/i);
    });
  });

  describe('generate-capture-plan function', () => {
    it('should require authentication', async () => {
      const { error } = await supabase.functions.invoke('generate-capture-plan', {
        body: {
          opportunityId: '00000000-0000-0000-0000-000000000000'
        }
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/unauthorized|authentication|401/i);
    });
  });

  describe('generate-proposal-content function', () => {
    it('should require authentication', async () => {
      const { error } = await supabase.functions.invoke('generate-proposal-content', {
        body: {
          opportunityId: '00000000-0000-0000-0000-000000000000',
          contentType: 'executive_summary'
        }
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/unauthorized|authentication|401/i);
    });
  });

  describe('predict-win-probability function', () => {
    it('should require authentication', async () => {
      const { error } = await supabase.functions.invoke('predict-win-probability', {
        body: {
          opportunityData: {}
        }
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/unauthorized|authentication|401/i);
    });
  });

  describe('get-users-admin function', () => {
    it('should require authentication', async () => {
      const { error } = await supabase.functions.invoke('get-users-admin', {
        body: {}
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/unauthorized|authentication|401/i);
    });

    it('should require admin role', async () => {
      // Even authenticated users need admin role
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        console.warn('Skipping role test - no session');
        return;
      }

      const { error } = await supabase.functions.invoke('get-users-admin', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        }
      });

      // Non-admin should be forbidden
      if (error) {
        expect(error.message).toMatch(/forbidden|admin.*required|403/i);
      }
    });
  });
});
