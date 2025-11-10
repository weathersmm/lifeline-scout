import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});