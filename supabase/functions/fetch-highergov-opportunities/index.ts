import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const higherGovSchema = z.object({
  search_keywords: z.string()
    .trim()
    .max(500, { message: "Search keywords must be less than 500 characters" })
    .optional(),
  days_back: z.number()
    .int({ message: "Days back must be an integer" })
    .min(1, { message: "Days back must be at least 1" })
    .max(90, { message: "Days back must be no more than 90" })
    .default(7)
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Validate input with zod
    const validation = higherGovSchema.safeParse(body);
    
    if (!validation.success) {
      const errors = validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      console.error("Input validation failed:", errors);
      return new Response(
        JSON.stringify({ 
          error: "Invalid input parameters",
          details: errors
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { search_keywords, days_back } = validation.data;

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const HIGHERGOV_API_KEY = Deno.env.get("HIGHERGOV_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!HIGHERGOV_API_KEY) {
      throw new Error("HIGHERGOV_API_KEY is not configured");
    }
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Fetching HigherGov opportunities from the last ${days_back} days`);

    // Calculate date range
    const capturedDate = new Date();
    capturedDate.setDate(capturedDate.getDate() - days_back);
    const formattedDate = capturedDate.toISOString().split('T')[0];

    // Build HigherGov API URL with EMS-related search
    const keywords = search_keywords || "EMS ambulance emergency medical services paramedic EMT 911 dispatch";
    const baseUrl = "https://www.highergov.com/api-external/opportunity/";
    const params = new URLSearchParams({
      api_key: HIGHERGOV_API_KEY,
      captured_date: formattedDate,
      ordering: "-captured_date",
      page_size: "100",
    });

    const apiUrl = `${baseUrl}?${params.toString()}`;
    console.log(`Fetching from HigherGov API: ${apiUrl.replace(HIGHERGOV_API_KEY, '[REDACTED]')}`);

    // Fetch opportunities from HigherGov
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("HigherGov API error:", response.status, errorText);
      throw new Error(`HigherGov API failed: ${response.status}`);
    }

    const data = await response.json();
    const opportunities = data.results || [];
    console.log(`Fetched ${opportunities.length} opportunities from HigherGov`);

    if (opportunities.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No new opportunities found in the specified date range",
          stats: { fetched: 0, classified: 0, inserted: 0 },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Use AI to classify which opportunities are EMS-related
    const opportunitiesForAI = opportunities.map((opp: any) => ({
      title: opp.title || "",
      description: opp.ai_summary || opp.description_text || "",
      naics: opp.naics_code?.naics_code || "",
      psc: opp.psc_code?.psc_code || "",
    }));

    console.log("Classifying opportunities with AI...");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at classifying Emergency Medical Services (EMS) procurement opportunities. 
Analyze each opportunity and determine:
1. If it's EMS-related (ambulance services, emergency medical services, paramedic services, EMT services, 911 dispatch, medical transport, emergency response, etc.)
2. Which EMS service tags apply: EMS 911, Non-Emergency, IFT, BLS, ALS, CCT, MEDEVAC, Billing, CQI, EMS Tech, VR/Sim
3. Priority level (high: closing soon <14 days or >$1M value, medium: 14-30 days or $100K-$1M, low: >30 days or <$100K)

Return ONLY a JSON array where each element corresponds to the input opportunity by index.
For EMS-related opportunities: { "isEMS": true, "serviceTags": ["tag1", "tag2"], "priority": "high/medium/low", "reasoning": "brief explanation" }
For non-EMS opportunities: { "isEMS": false }

Example: [{"isEMS": true, "serviceTags": ["EMS 911", "ALS"], "priority": "high", "reasoning": "Emergency 911 ALS ambulance service"}, {"isEMS": false}]`
          },
          {
            role: "user",
            content: `Classify these opportunities:\n\n${JSON.stringify(opportunitiesForAI, null, 2)}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI classification failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const classificationText = aiData.choices?.[0]?.message?.content;

    if (!classificationText) {
      throw new Error("No classification returned from AI");
    }

    console.log("AI classification result:", classificationText);

    // Parse AI classification
    let classifications = [];
    try {
      const jsonMatch = classificationText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) || 
                       classificationText.match(/(\[[\s\S]*\])/);
      const jsonString = jsonMatch ? jsonMatch[1] : classificationText;
      classifications = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI classification:", parseError);
      throw new Error("Failed to parse AI classification");
    }

    // Insert EMS opportunities into database
    let insertedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < opportunities.length; i++) {
      const opp = opportunities[i];
      const classification = classifications[i];

      if (!classification?.isEMS) {
        skippedCount++;
        continue;
      }

      try {
        const { error: insertError } = await supabaseClient
          .from("opportunities")
          .insert({
            title: opp.title || "Untitled Opportunity",
            agency: opp.agency?.agency_name || "Unknown Agency",
            geography: {
              state: opp.pop_state || null,
              county: null,
              city: opp.pop_city || null,
            },
            service_tags: classification.serviceTags || [],
            contract_type: opp.opp_type?.opp_type_name || "RFP",
            estimated_value: {
              min: opp.val_est_low ? parseFloat(opp.val_est_low) : null,
              max: opp.val_est_high ? parseFloat(opp.val_est_high) : null,
            },
            key_dates: {
              issueDate: opp.posted_date || null,
              questionsDue: null,
              preBidMeeting: null,
              proposalDue: opp.due_date || new Date().toISOString(),
            },
            term_length: null,
            link: opp.path || opp.source_path || `https://www.highergov.com/opportunity/${opp.opp_key}`,
            summary: opp.ai_summary || opp.description_text?.substring(0, 500) || "No summary available",
            priority: classification.priority || "medium",
            status: "new",
            source: "HigherGov",
            recommended_action: classification.reasoning || null,
          });

        if (insertError) {
          console.error("Insert error:", insertError);
        } else {
          insertedCount++;
        }
      } catch (err) {
        console.error("Error inserting opportunity:", err);
      }
    }

    // Update scraped_sources table
    const { error: sourceError } = await supabaseClient
      .from("scraped_sources")
      .upsert({
        source_url: "https://www.highergov.com/api-external/opportunity/",
        source_name: "HigherGov API",
        last_scraped_at: new Date().toISOString(),
        status: "active",
      }, {
        onConflict: "source_url",
      });

    if (sourceError) {
      console.error("Source update error:", sourceError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully fetched and classified HigherGov opportunities`,
        stats: {
          fetched: opportunities.length,
          classified: classifications.filter((c: any) => c?.isEMS).length,
          inserted: insertedCount,
          skipped: skippedCount,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error fetching HigherGov opportunities:", error);
    
    // Return generic error message to client, detailed error logged above
    const userMessage = error instanceof Error && error.message.includes('validation')
      ? 'Invalid input parameters'
      : 'Failed to fetch opportunities from external source';
    
    return new Response(
      JSON.stringify({ 
        error: userMessage,
        success: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error instanceof Error && error.message.includes('validation') ? 400 : 500,
      }
    );
  }
});
