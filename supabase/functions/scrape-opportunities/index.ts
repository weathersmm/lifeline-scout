import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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

// Input validation schema
const scrapeSchema = z.object({
  source_url: z.string()
    .url({ message: "Invalid URL format" })
    .max(2048, { message: "URL must be less than 2048 characters" })
    .refine(
      (url) => {
        try {
          const urlObj = new URL(url);
          // Only allow HTTPS protocol
          if (urlObj.protocol !== 'https:') return false;
          
          // Allowlist of trusted procurement domains
          const allowedDomains = [
            'sam.gov',
            'beta.sam.gov',
            'fbo.gov',
            'grants.gov',
            'highergov.com',
            'www.highergov.com',
            'bidnet.com',
            'publicpurchase.com',
            'bidsync.com',
            'govspend.com'
          ];
          
          const hostname = urlObj.hostname.toLowerCase();
          return allowedDomains.some(domain => 
            hostname === domain || hostname.endsWith('.' + domain)
          );
        } catch {
          return false;
        }
      },
      { message: "URL must be from a trusted procurement domain (e.g., sam.gov, highergov.com)" }
    ),
  source_name: z.string()
    .trim()
    .min(1, { message: "Source name cannot be empty" })
    .max(100, { message: "Source name must be less than 100 characters" })
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, { message: "Source name contains invalid characters" })
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client first for auth check
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
    const canProceed = await checkRateLimit(supabaseClient, user.id, 'scrape_opportunities', 5, 24);
    if (!canProceed) {
      console.log(`Rate limit exceeded for user ${user.id}`);
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. You can scrape up to 5 times per day.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();

    // Validate input with zod
    const validation = scrapeSchema.safeParse(body);
    
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

    const { source_url, source_name } = validation.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Starting scrape for ${source_url}`);

    // Fetch webpage content
    const pageResponse = await fetch(source_url);
    if (!pageResponse.ok) {
      throw new Error(`Failed to fetch page: ${pageResponse.statusText}`);
    }
    
    const htmlContent = await pageResponse.text();
    console.log(`Fetched ${htmlContent.length} characters from ${source_url}`);

    // Use AI to extract EMS opportunities
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
            content: `You are an expert at extracting EMS (Emergency Medical Services) procurement opportunities from government and public procurement websites. Extract ALL relevant opportunities and classify them according to EMS service types.

Service tags to use: EMS 911, Non-Emergency, IFT, BLS, ALS, CCT, MEDEVAC, Billing, CQI, EMS Tech, VR/Sim
Contract types: RFP, RFQ, RFI, Sources Sought, Pre-solicitation, Sole-Source Notice
Priority levels: high (closing soon or high value), medium (moderate timeline), low (early stage or low value)

For each opportunity found, extract:
- title: Full title of the opportunity
- agency: Government agency or organization
- geography: { state, county (optional), city (optional) }
- serviceTags: Array of relevant service tags from the list above
- contractType: One of the contract types listed
- estimatedValue: { min (optional), max (optional) } in USD
- keyDates: { issueDate (optional), questionsDue (optional), preBidMeeting (optional), proposalDue (required) }
- termLength: Contract duration if specified
- link: Direct URL to the opportunity
- summary: Brief 2-3 sentence description
- priority: high/medium/low based on timeline and value
- source: Website name

Return ONLY a valid JSON array of opportunities. If no opportunities found, return an empty array [].`
          },
          {
            role: "user",
            content: `Extract all EMS-related procurement opportunities from this webpage content:\n\n${htmlContent.substring(0, 50000)}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices?.[0]?.message?.content;
    
    if (!extractedText) {
      throw new Error("No content returned from AI");
    }

    console.log("AI extraction result:", extractedText);

    // Parse JSON from AI response
    let opportunities = [];
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = extractedText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) || 
                       extractedText.match(/(\[[\s\S]*\])/);
      const jsonString = jsonMatch ? jsonMatch[1] : extractedText;
      opportunities = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to parse opportunities from AI response");
    }

    console.log(`Extracted ${opportunities.length} opportunities`);

    // Insert opportunities into database
    let insertedCount = 0;
    let errorCount = 0;

    for (const opp of opportunities) {
      try {
        const { error: insertError } = await supabaseClient
          .from("opportunities")
          .insert({
            title: opp.title,
            agency: opp.agency,
            geography: opp.geography,
            service_tags: opp.serviceTags,
            contract_type: opp.contractType,
            estimated_value: opp.estimatedValue,
            key_dates: opp.keyDates,
            term_length: opp.termLength,
            link: opp.link,
            summary: opp.summary,
            priority: opp.priority,
            status: 'new',
            source: opp.source || source_name,
            recommended_action: null,
          });

        if (insertError) {
          console.error("Insert error:", insertError);
          errorCount++;
        } else {
          insertedCount++;
        }
      } catch (err) {
        console.error("Error inserting opportunity:", err);
        errorCount++;
      }
    }

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

    if (sourceError) {
      console.error("Source update error:", sourceError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully scraped and classified opportunities`,
        stats: {
          extracted: opportunities.length,
          inserted: insertedCount,
          errors: errorCount,
        },
        source: { url: source_url, name: source_name },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error scraping opportunities:", error);
    
    // Return generic error message to client, detailed error logged above
    const userMessage = error instanceof Error && error.message.includes('validation')
      ? 'Invalid input parameters'
      : 'Failed to scrape opportunities';
    
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