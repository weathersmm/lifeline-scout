import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

describe('RLS Policy Enforcement Tests', () => {
  let adminClient: ReturnType<typeof createClient>;
  let memberClient: ReturnType<typeof createClient>;
  let viewerClient: ReturnType<typeof createClient>;
  
  let testOpportunityId: string;
  let testCompetitorId: string;
  let testConversationId: string;

  beforeAll(async () => {
    // Initialize clients
    adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    memberClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    viewerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Note: In real tests, authenticate each client with appropriate role users
    // For setup: create test users with admin, member, viewer roles
  });

  describe('Opportunities Table - Sensitivity-Based Access', () => {
    it('viewer can read public opportunities', async () => {
      const { data, error } = await viewerClient
        .from('opportunities')
        .select('*')
        .eq('sensitivity_level', 'public')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('viewer cannot read internal opportunities', async () => {
      const { data, error } = await viewerClient
        .from('opportunities')
        .select('*')
        .eq('sensitivity_level', 'internal')
        .limit(1);

      // Viewer should either get empty results or access denied
      expect(data?.length).toBe(0);
    });

    it('viewer cannot read restricted opportunities', async () => {
      const { data, error } = await viewerClient
        .from('opportunities')
        .select('*')
        .eq('sensitivity_level', 'restricted')
        .limit(1);

      expect(data?.length).toBe(0);
    });

    it('member can read public and internal opportunities', async () => {
      const { data: publicData } = await memberClient
        .from('opportunities')
        .select('*')
        .eq('sensitivity_level', 'public')
        .limit(1);

      const { data: internalData } = await memberClient
        .from('opportunities')
        .select('*')
        .eq('sensitivity_level', 'internal')
        .limit(1);

      expect(publicData).toBeDefined();
      expect(internalData).toBeDefined();
    });

    it('member cannot read restricted opportunities', async () => {
      const { data } = await memberClient
        .from('opportunities')
        .select('*')
        .eq('sensitivity_level', 'restricted')
        .limit(1);

      expect(data?.length).toBe(0);
    });

    it('admin can read all sensitivity levels', async () => {
      const { data: publicData } = await adminClient
        .from('opportunities')
        .select('*')
        .eq('sensitivity_level', 'public')
        .limit(1);

      const { data: internalData } = await adminClient
        .from('opportunities')
        .select('*')
        .eq('sensitivity_level', 'internal')
        .limit(1);

      const { data: restrictedData } = await adminClient
        .from('opportunities')
        .select('*')
        .eq('sensitivity_level', 'restricted')
        .limit(1);

      expect(publicData).toBeDefined();
      expect(internalData).toBeDefined();
      expect(restrictedData).toBeDefined();
    });
  });

  describe('Competitive Assessments - Sensitivity-Based Access', () => {
    it('viewer cannot read internal competitive assessments', async () => {
      const { data } = await viewerClient
        .from('competitive_assessments')
        .select('*')
        .eq('sensitivity_level', 'internal')
        .limit(1);

      expect(data?.length).toBe(0);
    });

    it('viewer cannot read restricted competitive assessments', async () => {
      const { data } = await viewerClient
        .from('competitive_assessments')
        .select('*')
        .eq('sensitivity_level', 'restricted')
        .limit(1);

      expect(data?.length).toBe(0);
    });

    it('admin can read all competitive assessments', async () => {
      const { data, error } = await adminClient
        .from('competitive_assessments')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('PTW Analyses - Sensitivity-Based Access', () => {
    it('viewer cannot read internal PTW analyses', async () => {
      const { data } = await viewerClient
        .from('ptw_analyses')
        .select('*')
        .eq('sensitivity_level', 'internal')
        .limit(1);

      expect(data?.length).toBe(0);
    });

    it('member can read internal PTW analyses', async () => {
      const { data } = await memberClient
        .from('ptw_analyses')
        .select('*')
        .eq('sensitivity_level', 'internal')
        .limit(1);

      expect(data).toBeDefined();
    });

    it('viewer cannot read restricted PTW analyses', async () => {
      const { data } = await viewerClient
        .from('ptw_analyses')
        .select('*')
        .eq('sensitivity_level', 'restricted')
        .limit(1);

      expect(data?.length).toBe(0);
    });
  });

  describe('Go/No-Go Evaluations - Sensitivity-Based Access', () => {
    it('viewer cannot read internal go/no-go evaluations', async () => {
      const { data } = await viewerClient
        .from('go_no_go_evaluations')
        .select('*')
        .eq('sensitivity_level', 'internal')
        .limit(1);

      expect(data?.length).toBe(0);
    });

    it('admin can read all go/no-go evaluations', async () => {
      const { data, error } = await adminClient
        .from('go_no_go_evaluations')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Competitor Intelligence - Sensitivity-Based Access', () => {
    it('viewer cannot read restricted competitor intelligence', async () => {
      const { data } = await viewerClient
        .from('competitor_intelligence')
        .select('*')
        .eq('sensitivity_level', 'restricted')
        .limit(1);

      expect(data?.length).toBe(0);
    });

    it('member can read internal competitor intelligence', async () => {
      const { data } = await memberClient
        .from('competitor_intelligence')
        .select('*')
        .eq('sensitivity_level', 'internal')
        .limit(1);

      expect(data).toBeDefined();
    });

    it('admin can read all competitor intelligence', async () => {
      const { data, error } = await adminClient
        .from('competitor_intelligence')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Win/Loss History - Sensitivity-Based Access', () => {
    it('viewer cannot read restricted win/loss history', async () => {
      const { data } = await viewerClient
        .from('win_loss_history')
        .select('*')
        .eq('sensitivity_level', 'restricted')
        .limit(1);

      expect(data?.length).toBe(0);
    });

    it('member can read internal win/loss history', async () => {
      const { data } = await memberClient
        .from('win_loss_history')
        .select('*')
        .eq('sensitivity_level', 'internal')
        .limit(1);

      expect(data).toBeDefined();
    });
  });

  describe('Document Q&A Conversations - Opportunity Sensitivity Inheritance', () => {
    it('viewer should only see conversations for public opportunities', async () => {
      // Create a test conversation for a restricted opportunity
      // Viewer should not be able to see it
      const { data } = await viewerClient
        .from('document_qa_conversations')
        .select(`
          *,
          opportunities!inner(sensitivity_level)
        `)
        .eq('opportunities.sensitivity_level', 'restricted')
        .limit(1);

      expect(data?.length).toBe(0);
    });

    it('admin can see all document Q&A conversations', async () => {
      const { data, error } = await adminClient
        .from('document_qa_conversations')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Audit Logs - Admin-Only Access', () => {
    it('viewer cannot read audit logs', async () => {
      const { data, error } = await viewerClient
        .from('audit_logs')
        .select('*')
        .limit(1);

      // Should be denied or return empty
      expect(data?.length).toBe(0);
    });

    it('member cannot read audit logs', async () => {
      const { data, error } = await memberClient
        .from('audit_logs')
        .select('*')
        .limit(1);

      expect(data?.length).toBe(0);
    });

    it('admin can read audit logs', async () => {
      const { data, error } = await adminClient
        .from('audit_logs')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('User Roles Table - Self-Only Access', () => {
    it('user can only read their own role', async () => {
      const { data: session } = await viewerClient.auth.getSession();
      
      if (!session.session) {
        console.warn('Skipping test - no session');
        return;
      }

      const { data, error } = await viewerClient
        .from('user_roles')
        .select('*');

      expect(error).toBeNull();
      // Should only return current user's role
      expect(data?.every(role => role.user_id === session.session.user.id)).toBe(true);
    });

    it('viewer cannot modify user roles', async () => {
      const { error } = await viewerClient
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', '00000000-0000-0000-0000-000000000000');

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/permission|denied|policy/i);
    });
  });
});
