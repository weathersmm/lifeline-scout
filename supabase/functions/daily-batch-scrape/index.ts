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

    console.log("Starting daily batch scrape...");

    // Generate unique session ID for this batch
    const sessionId = `batch-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Define comprehensive global sources for batch scraping
    const GLOBAL_SOURCES = [
      { url: 'https://sam.gov/opp/search', name: 'SAM.gov' },
      { url: 'https://www.highergov.com/opportunities/', name: 'HigherGov' },
      { url: 'https://caleprocure.ca.gov/pages/index.aspx', name: 'CAleprocure' },
      { url: 'https://procurement.opengov.com/portal/ocgov', name: 'Orange County (OpenGov)' },
      { url: 'https://www.planetbids.com/portal/portal.cfm?CompanyID=39493', name: 'PlanetBids - LA County' },
      { url: 'https://www.bonfirehub.com/opportunities', name: 'BonfireHub' },
      { url: 'https://camisvr.co.la.ca.us/webapp/PRDPCM/AltSelfService', name: 'LA County Procurement' },
    ];

    // Get all active scraped sources from database
    const { data: dbSources, error: sourcesError } = await supabaseClient
      .from("scraped_sources")
      .select("*")
      .eq("status", "active")
      .order("last_scraped_at", { ascending: true });

    if (sourcesError) {
      throw sourcesError;
    }

    // Combine database sources with global sources (deduplicate by URL)
    const sourceMap = new Map();
    
    // Add database sources
    (dbSources || []).forEach(s => {
      sourceMap.set(s.source_url, { url: s.source_url, name: s.source_name });
    });
    
    // Add global sources (will not overwrite existing)
    GLOBAL_SOURCES.forEach(s => {
      if (!sourceMap.has(s.url)) {
        sourceMap.set(s.url, s);
      }
    });

    const sources = Array.from(sourceMap.values());
    console.log(`Found ${sources.length} total sources to scrape (${dbSources?.length || 0} from DB + ${GLOBAL_SOURCES.length} global)`);

    const results = {
      total: sources?.length || 0,
      successful: 0,
      failed: 0,
      totalOpportunities: 0,
      sourcesScraped: [] as any[],
      errors: [] as any[],
    };

    // Initialize progress tracking for all sources
    for (const source of sources) {
      await supabaseClient
        .from('scraping_progress')
        .insert({
          session_id: sessionId,
          source_name: source.name,
          source_url: source.url,
          status: 'pending',
        });
    }

    // Scrape each source
    for (const source of sources) {
      try {
        console.log(`Scraping ${source.name}...`);

        // Update status to in_progress
        await supabaseClient
          .from('scraping_progress')
          .update({
            status: 'in_progress',
            started_at: new Date().toISOString(),
          })
          .eq('session_id', sessionId)
          .eq('source_url', source.url);

        const scrapeResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/scrape-opportunities`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              source_url: source.url,
              source_name: source.name,
              source_type: "global",
            }),
          }
        );

        if (scrapeResponse.ok) {
          const data = await scrapeResponse.json();
          results.successful++;
          results.totalOpportunities += data.stats?.inserted || 0;
          results.sourcesScraped.push({
            name: source.name,
            url: source.url,
            opportunities: data.stats?.inserted || 0,
          });

          // Update progress as completed
          await supabaseClient
            .from('scraping_progress')
            .update({
              status: 'completed',
              opportunities_found: data.stats?.inserted || 0,
              completed_at: new Date().toISOString(),
            })
            .eq('session_id', sessionId)
            .eq('source_url', source.url);
        } else {
          const errorText = await scrapeResponse.text();
          results.failed++;
          results.errors.push({
            name: source.name,
            error: errorText,
          });

          // Update progress as failed
          await supabaseClient
            .from('scraping_progress')
            .update({
              status: 'failed',
              error_message: errorText,
              completed_at: new Date().toISOString(),
            })
            .eq('session_id', sessionId)
            .eq('source_url', source.url);
        }

        // Add delay between scrapes to avoid overwhelming servers
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error scraping ${source.name}:`, error);
        results.failed++;
        results.errors.push({
          name: source.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        // Update progress as failed
        await supabaseClient
          .from('scraping_progress')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : "Unknown error",
            completed_at: new Date().toISOString(),
          })
          .eq('session_id', sessionId)
          .eq('source_url', source.url);
      }
    }

    console.log("Batch scraping completed:", results);

    // Send email digest if RESEND_API_KEY is configured
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY && results.totalOpportunities > 0) {
      try {
        // Get admin emails to send digest to
        const { data: admins } = await supabaseClient
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        if (admins && admins.length > 0) {
          const { data: adminProfiles } = await supabaseClient
            .from("profiles")
            .select("email")
            .in("user_id", admins.map((a) => a.user_id));

          const emailHtml = generateDigestEmail(results);

          for (const profile of adminProfiles || []) {
            const emailResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: "LifeLine PipeLine Scout <notifications@ewproto.com>",
                to: [profile.email],
                subject: `Daily EMS Opportunity Digest - ${results.totalOpportunities} New Opportunities`,
                html: emailHtml,
              }),
            });

            if (!emailResponse.ok) {
              console.error("Failed to send email:", await emailResponse.text());
            }
          }

          console.log(`Sent email digest to ${adminProfiles?.length || 0} admins`);
        }
      } catch (emailError) {
        console.error("Failed to send email digest:", emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Daily batch scraping completed",
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Daily batch scrape error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

function generateDigestEmail(results: any): string {
  const sourcesHtml = results.sourcesScraped
    .filter((s: any) => s.opportunities > 0)
    .map(
      (s: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${s.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: #2563eb;">${s.opportunities}</td>
      </tr>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Daily EMS Opportunity Digest</h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 14px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <div style="background: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px;">Summary</h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
              <div style="text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #2563eb;">${results.totalOpportunities}</div>
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">New Opportunities</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #10b981;">${results.successful}</div>
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Successful</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #ef4444;">${results.failed}</div>
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Failed</div>
              </div>
            </div>
          </div>

          ${
            results.sourcesScraped.filter((s: any) => s.opportunities > 0).length > 0
              ? `
          <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 16px;">Sources with New Opportunities</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Source</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Opportunities</th>
              </tr>
            </thead>
            <tbody>
              ${sourcesHtml}
            </tbody>
          </table>
          `
              : ""
          }

          <div style="text-align: center; margin-top: 24px;">
            <a href="https://scout.ewproto.com/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 500;">View All Opportunities</a>
          </div>

          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
            <p style="margin: 0;">This is an automated digest from LifeLine PipeLine Scout</p>
            <p style="margin: 8px 0 0 0;">Manage your notification preferences in your account settings</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
