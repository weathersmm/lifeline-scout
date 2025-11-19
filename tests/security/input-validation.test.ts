import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

describe('Input Validation Tests', () => {
  let supabase: ReturnType<typeof createClient>;
  let authToken: string;

  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Get a valid session for authenticated requests
    const { data: session } = await supabase.auth.getSession();
    if (session.session) {
      authToken = session.session.access_token;
    }
  });

  describe('document-qa function input validation', () => {
    it('should reject requests with missing question parameter', async () => {
      const { error } = await supabase.functions.invoke('document-qa', {
        body: {
          opportunityId: '00000000-0000-0000-0000-000000000000'
          // Missing question
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/question.*required|validation/i);
    });

    it('should reject requests with missing opportunityId parameter', async () => {
      const { error } = await supabase.functions.invoke('document-qa', {
        body: {
          question: 'Test question'
          // Missing opportunityId
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/opportunityId.*required|validation/i);
    });

    it('should reject questions that are too short', async () => {
      const { error } = await supabase.functions.invoke('document-qa', {
        body: {
          opportunityId: '00000000-0000-0000-0000-000000000000',
          question: 'Hi' // Too short
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/question.*length|minimum.*5|validation/i);
    });

    it('should reject questions that are too long', async () => {
      const longQuestion = 'a'.repeat(2001); // Over 2000 char limit
      
      const { error } = await supabase.functions.invoke('document-qa', {
        body: {
          opportunityId: '00000000-0000-0000-0000-000000000000',
          question: longQuestion
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/question.*length|maximum.*2000|validation/i);
    });

    it('should reject invalid UUID format for opportunityId', async () => {
      const { error } = await supabase.functions.invoke('document-qa', {
        body: {
          opportunityId: 'invalid-uuid-format',
          question: 'Valid question here'
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/uuid|invalid.*format|validation/i);
    });

    it('should accept valid input with proper length and format', async () => {
      const { error } = await supabase.functions.invoke('document-qa', {
        body: {
          opportunityId: '00000000-0000-0000-0000-000000000000',
          question: 'What are the key requirements for this RFP?'
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      // Should not be a validation error (may fail for other reasons)
      if (error) {
        expect(error.message).not.toMatch(/validation|invalid.*format|required/i);
      }
    });
  });

  describe('gather-competitor-intelligence function input validation', () => {
    it('should reject requests with missing competitorName', async () => {
      const { error } = await supabase.functions.invoke('gather-competitor-intelligence', {
        body: {
          // Missing competitorName
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/competitorName.*required|validation/i);
    });

    it('should reject competitor names that are too short', async () => {
      const { error } = await supabase.functions.invoke('gather-competitor-intelligence', {
        body: {
          competitorName: 'A' // Too short
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/competitorName.*length|minimum.*2|validation/i);
    });

    it('should reject competitor names that are too long', async () => {
      const longName = 'a'.repeat(201); // Over 200 char limit
      
      const { error } = await supabase.functions.invoke('gather-competitor-intelligence', {
        body: {
          competitorName: longName
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/competitorName.*length|maximum.*200|validation/i);
    });

    it('should reject competitor names with invalid characters', async () => {
      const { error } = await supabase.functions.invoke('gather-competitor-intelligence', {
        body: {
          competitorName: 'Competitor<script>alert("xss")</script>' // Malicious input
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/competitorName.*invalid|validation/i);
    });

    it('should reject sources array with non-URL values', async () => {
      const { error } = await supabase.functions.invoke('gather-competitor-intelligence', {
        body: {
          competitorName: 'Valid Competitor',
          sources: ['not-a-url', 'also-invalid']
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/sources.*url|validation/i);
    });

    it('should reject sources array with too many items', async () => {
      const tooManySources = Array(11).fill('https://example.com'); // Over 10 limit
      
      const { error } = await supabase.functions.invoke('gather-competitor-intelligence', {
        body: {
          competitorName: 'Valid Competitor',
          sources: tooManySources
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/sources.*maximum|validation/i);
    });

    it('should accept valid competitor name with proper sources', async () => {
      const { error } = await supabase.functions.invoke('gather-competitor-intelligence', {
        body: {
          competitorName: 'Valid Competitor Inc.',
          sources: ['https://example.com', 'https://competitor.com']
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      // Should not be a validation error
      if (error) {
        expect(error.message).not.toMatch(/validation|invalid.*format|required/i);
      }
    });
  });

  describe('scrape-opportunities function input validation', () => {
    it('should reject untrusted domains', async () => {
      const { error } = await supabase.functions.invoke('scrape-opportunities', {
        body: {
          source_url: 'https://malicious-site.com',
          source_name: 'Malicious Site'
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/trusted.*domain|validation|whitelist/i);
    });

    it('should accept trusted government domains', async () => {
      const { error } = await supabase.functions.invoke('scrape-opportunities', {
        body: {
          source_url: 'https://sam.gov/opportunities',
          source_name: 'SAM.gov'
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      // Should not be a domain validation error
      if (error) {
        expect(error.message).not.toMatch(/trusted.*domain|whitelist/i);
      }
    });

    it('should accept trusted procurement platform domains', async () => {
      const { error } = await supabase.functions.invoke('scrape-opportunities', {
        body: {
          source_url: 'https://procurement.opengov.com',
          source_name: 'OpenGov'
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      if (error) {
        expect(error.message).not.toMatch(/trusted.*domain|whitelist/i);
      }
    });
  });

  describe('fetch-highergov-opportunities function input validation', () => {
    it('should reject requests with missing searchIds', async () => {
      const { error } = await supabase.functions.invoke('fetch-highergov-opportunities', {
        body: {
          // Missing searchIds
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/searchIds.*required|validation/i);
    });

    it('should reject empty searchIds array', async () => {
      const { error } = await supabase.functions.invoke('fetch-highergov-opportunities', {
        body: {
          searchIds: []
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/searchIds.*empty|validation/i);
    });

    it('should accept valid searchIds array', async () => {
      const { error } = await supabase.functions.invoke('fetch-highergov-opportunities', {
        body: {
          searchIds: ['valid-search-id']
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      if (error) {
        expect(error.message).not.toMatch(/validation|required/i);
      }
    });
  });

  describe('SQL injection prevention', () => {
    it('should not allow SQL injection in question parameter', async () => {
      const sqlInjection = "'; DROP TABLE opportunities; --";
      
      const { error } = await supabase.functions.invoke('document-qa', {
        body: {
          opportunityId: '00000000-0000-0000-0000-000000000000',
          question: sqlInjection
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      // Function should either reject invalid characters or safely escape them
      // Should not result in SQL error or database modification
      if (error) {
        expect(error.message).not.toMatch(/syntax.*error|database.*error/i);
      }
    });

    it('should not allow SQL injection in competitor name', async () => {
      const sqlInjection = "'; DELETE FROM competitor_intelligence; --";
      
      const { error } = await supabase.functions.invoke('gather-competitor-intelligence', {
        body: {
          competitorName: sqlInjection
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      // Should be rejected by validation or safely escaped
      expect(error).toBeDefined();
      if (error) {
        expect(error.message).not.toMatch(/syntax.*error|database.*error/i);
      }
    });
  });

  describe('XSS prevention', () => {
    it('should not allow script injection in question', async () => {
      const xssAttempt = '<script>alert("xss")</script>';
      
      const { error } = await supabase.functions.invoke('document-qa', {
        body: {
          opportunityId: '00000000-0000-0000-0000-000000000000',
          question: xssAttempt
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      // Should either reject or safely sanitize
      // Verify no script execution occurs
      expect(error).toBeDefined();
    });
  });
});
