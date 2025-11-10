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
    const { source_url, source_name } = await req.json();

    if (!source_url || !source_name) {
      return new Response(
        JSON.stringify({ error: "source_url and source_name are required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Update scraped_sources table
    const { error: sourceError } = await supabaseClient
      .from("scraped_sources")
      .upsert({
        source_url,
        source_name,
        last_scraped_at: new Date().toISOString(),
        status: "active",
      }, {
        onConflict: "source_url",
      });

    if (sourceError) throw sourceError;

    // In a real implementation, this would:
    // 1. Fetch the webpage content
    // 2. Parse HTML to extract opportunity data
    // 3. Use AI to classify and extract structured data
    // 4. Insert new opportunities into the database
    
    // For now, return success with a placeholder message
    return new Response(
      JSON.stringify({
        success: true,
        message: "Scraping initiated. This is a placeholder - real scraping will be implemented with web parsing and AI classification.",
        source: { url: source_url, name: source_name },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error scraping opportunities:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});