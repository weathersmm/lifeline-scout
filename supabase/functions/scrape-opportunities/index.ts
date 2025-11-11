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
            'govspend.com',
            'opengov.com',
            'planetbids.com',
            'bonfirehub.com',
            'periscope.com',
            'procurenow.com'
          ];
          
          const hostname = urlObj.hostname.toLowerCase();
          
          // Allow California government domains (.ca.gov, .ca.us)
          if (hostname.endsWith('.ca.gov') || hostname.endsWith('.ca.us')) {
            return true;
          }
          
          // Allow other U.S. government domains
          if (hostname.endsWith('.gov') || hostname.endsWith('.us')) {
            return true;
          }
          
          // Check against allowlist
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
    const source_type = body.source_type || 'custom'; // local, global, or custom

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Starting scrape for ${source_url}`);

    // Create scraping history record
    const { data: historyRecord, error: historyError } = await supabaseClient
      .from('scraping_history')
      .insert({
        source_url,
        source_name,
        source_type,
        started_at: new Date().toISOString(),
        status: 'running',
        user_id: user.id,
      })
      .select()
      .single();

    if (historyError) {
      console.error('Failed to create history record:', historyError);
    }

    const historyId = historyRecord?.id;

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
            content: `You are an expert at extracting Emergency Medical Services (EMS) and adjacent healthcare procurement opportunities from government and public procurement websites.

**EXTRACT OPPORTUNITIES IF THEY INVOLVE ANY OF:**

Core EMS Services:
- Ambulance services (911, non-emergency, interfacility transport)
- Emergency medical services, paramedic/EMT services
- Medical transport (ground, air, helicopter, MEDEVAC)
- BLS (Basic Life Support), ALS (Advanced Life Support), CCT (Critical Care Transport)

Adjacent Healthcare Services:
- Medical equipment and supplies (stretchers, monitors, defibrillators, oxygen systems, patient warming/cooling)
- Healthcare facility services (emergency departments, urgent care, trauma centers)
- Surgical equipment and OR technology
- Medical imaging (mobile MRI, CT, X-ray services)
- Patient care equipment (hospital beds, wheelchairs, medical devices)

Emergency Response & First Responder Technology:
- 911 dispatch systems, CAD (Computer-Aided Dispatch), emergency communications
- Law enforcement technology and equipment
- Fire/rescue equipment and services
- Field medicine and tactical medicine equipment
- Emergency response coordination systems
- Public safety technology and infrastructure

Administrative & Support Services:
- Call center services (911, dispatch, patient scheduling, medical hotlines)
- Billing and claims processing (EMS billing, medical billing, revenue cycle management)
- EMS management software (ePCR, electronic patient care records)
- Quality improvement programs (CQI, QA/QI systems)
- EMS training and simulation (VR/Sim training, CPR training, medical education)

**SERVICE TAGS:** EMS 911, Non-Emergency, IFT, BLS, ALS, CCT, MEDEVAC, Billing, CQI, EMS Tech, VR/Sim, Call Center
**CONTRACT TYPES:** RFP, RFQ, RFI, Sources Sought, Pre-solicitation, Sole-Source Notice
**PRIORITY LEVELS:**
- high: closing soon (<14 days) OR high value (>$1M) OR critical emergency services
- medium: 14-30 days OR $100K-$1M OR important support services
- low: >30 days OR <$100K OR general equipment/supplies

**EXTRACT FOR EACH OPPORTUNITY:**
- title: Full title
- agency: Government agency/organization
- geography: { state, county (optional), city (optional) }
- serviceTags: Array from list above
- contractType: From list above
- estimatedValue: { min (optional), max (optional) } in USD
- keyDates: { issueDate (optional), questionsDue (optional), preBidMeeting (optional), proposalDue (required) }
- termLength: Contract duration if specified
- link: Direct URL to opportunity
- summary: Brief 2-3 sentence description
- priority: high/medium/low
- source: Website name

**BE INCLUSIVE:** Extract anything with reasonable connection to emergency response, healthcare, or public safety.

Return ONLY a valid JSON array of opportunities. If none found, return [].`
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

    // Enrich opportunities with EMS provider context
    for (const opp of opportunities) {
      const county = opp.geography?.county;
      if (county) {
        // Query for EMS provider data for this county
        // Note: This would require the PipeLineScout data to be loaded into a database table
        // For now, we'll add placeholder fields that can be enriched later
        opp.current_911_provider = null;
        opp.current_nemt_provider = null;
        opp.contract_expiration = null;
        opp.current_procurement_type = null;
        opp.county_notes = null;
        opp.lemsa_site = null;
        opp.ems_plan_url = null;
      }
    }

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
            geography_state: opp.geography?.state || null,
            geography_county: opp.geography?.county || null,
            geography_city: opp.geography?.city || null,
            service_tags: opp.serviceTags,
            contract_type: opp.contractType,
            estimated_value_min: opp.estimatedValue?.min || null,
            estimated_value_max: opp.estimatedValue?.max || null,
            issue_date: opp.keyDates?.issueDate || null,
            questions_due: opp.keyDates?.questionsDue || null,
            pre_bid_meeting: opp.keyDates?.preBidMeeting || null,
            proposal_due: opp.keyDates?.proposalDue,
            term_length: opp.termLength,
            link: opp.link,
            summary: opp.summary,
            priority: opp.priority,
            status: 'new',
            source: opp.source || source_name,
            recommended_action: null,
            current_911_provider: opp.current_911_provider,
            current_nemt_provider: opp.current_nemt_provider,
            contract_expiration: opp.contract_expiration,
            current_procurement_type: opp.current_procurement_type,
            county_notes: opp.county_notes,
            lemsa_site: opp.lemsa_site,
            ems_plan_url: opp.ems_plan_url,
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

    // Update scraping history record as completed
    if (historyId) {
      await supabaseClient
        .from('scraping_history')
        .update({
          completed_at: new Date().toISOString(),
          status: 'completed',
          opportunities_found: opportunities.length,
          opportunities_inserted: insertedCount,
        })
        .eq('id', historyId);
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