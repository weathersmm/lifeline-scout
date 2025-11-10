import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting helper
async function checkRateLimit(supabase: any, userId: string, action: string, limit: number, windowHours: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  
  const { count, error } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', action)
    .gte('created_at', windowStart.toISOString());

  if (error) {
    console.error('Rate limit check error:', error);
    return false;
  }

  if (count !== null && count >= limit) {
    return false;
  }

  // Record this attempt
  await supabase.from('rate_limits').insert({
    user_id: userId,
    action: action,
    created_at: new Date().toISOString()
  });

  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit: 5 calls per day (24 hours)
    const canProceed = await checkRateLimit(supabaseClient, user.id, 'generate_report', 5, 24);
    if (!canProceed) {
      console.log(`Rate limit exceeded for user ${user.id}`);
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. You can generate reports up to 5 times per day.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all opportunities from the last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: opportunities, error: oppsError } = await supabaseClient
      .from("opportunities")
      .select("*")
      .gte("created_at", oneWeekAgo.toISOString())
      .order("priority", { ascending: false })
      .order("proposal_due", { ascending: true });

    if (oppsError) throw oppsError;

    // Group opportunities by priority
    const highPriority = opportunities?.filter((o) => o.priority === "high") || [];
    const mediumPriority = opportunities?.filter((o) => o.priority === "medium") || [];
    const lowPriority = opportunities?.filter((o) => o.priority === "low") || [];

    // Group by service tags
    const byServiceTag: Record<string, any[]> = {};
    opportunities?.forEach((opp) => {
      opp.service_tags.forEach((tag: string) => {
        if (!byServiceTag[tag]) byServiceTag[tag] = [];
        byServiceTag[tag].push(opp);
      });
    });

    // Group by geography
    const byState: Record<string, any[]> = {};
    opportunities?.forEach((opp) => {
      if (!byState[opp.geography_state]) byState[opp.geography_state] = [];
      byState[opp.geography_state].push(opp);
    });

    const reportData = {
      summary: {
        total: opportunities?.length || 0,
        highPriority: highPriority.length,
        mediumPriority: mediumPriority.length,
        lowPriority: lowPriority.length,
      },
      opportunities: {
        high: highPriority.slice(0, 10),
        medium: mediumPriority.slice(0, 10),
        low: lowPriority.slice(0, 10),
      },
      byServiceTag,
      byState,
      reportGeneratedAt: new Date().toISOString(),
    };

    // Save the report
    const { data: report, error: reportError } = await supabaseClient
      .from("weekly_reports")
      .insert({
        report_date: new Date().toISOString().split("T")[0],
        total_opportunities: opportunities?.length || 0,
        high_priority_count: highPriority.length,
        report_data: reportData,
      })
      .select()
      .single();

    if (reportError) throw reportError;

    return new Response(JSON.stringify({ success: true, report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate weekly report" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});