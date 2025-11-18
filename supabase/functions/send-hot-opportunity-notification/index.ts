import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface HotOpportunityNotificationRequest {
  opportunityId: string;
  flaggedType: 'manual' | 'automatic';
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { opportunityId, flaggedType }: HotOpportunityNotificationRequest = await req.json();

    console.log(`Processing HOT opportunity notification for ${opportunityId} (${flaggedType})`);

    // Fetch opportunity details
    const { data: opportunity, error: oppError } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", opportunityId)
      .single();

    if (oppError || !opportunity) {
      console.error("Error fetching opportunity:", oppError);
      return new Response(
        JSON.stringify({ error: "Opportunity not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Fetch all users with notification preferences enabled
    const { data: notificationPrefs, error: prefsError } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("enabled", true);

    if (prefsError) {
      console.error("Error fetching notification preferences:", prefsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch notification preferences" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Found ${notificationPrefs?.length || 0} users with notifications enabled`);

    if (!notificationPrefs || notificationPrefs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users to notify" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Filter users based on service tags and priority preferences
    const usersToNotify = notificationPrefs.filter(pref => {
      const hasMatchingTags = pref.service_tags.length === 0 || 
        opportunity.service_tags.some((tag: string) => pref.service_tags.includes(tag));
      const priorityMatch = opportunity.priority === 'high' || pref.min_priority !== 'high';
      return hasMatchingTags && priorityMatch;
    });

    console.log(`Filtered to ${usersToNotify.length} users based on preferences`);

    // Calculate days until due
    const daysUntilDue = Math.ceil(
      (new Date(opportunity.proposal_due).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    // Format estimated value
    const estimatedValue = opportunity.estimated_value_max 
      ? `$${(opportunity.estimated_value_max / 1000000).toFixed(1)}M`
      : opportunity.estimated_value_min
      ? `$${(opportunity.estimated_value_min / 1000000).toFixed(1)}M+`
      : 'TBD';

    let emailsSent = 0;
    const emailResults = [];

    for (const pref of usersToNotify) {
      try {
        const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;line-height:1.6;color:#333}
.container{max-width:600px;margin:0 auto;padding:20px}
.header{background:linear-gradient(135deg,#dc2626 0%,#f59e0b 100%);color:white;padding:30px;border-radius:8px 8px 0 0}
.content{background:white;padding:30px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px}
.badge{display:inline-block;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;margin:4px}
.badge-hot{background:#dc2626;color:white}
.badge-manual{background:#3b82f6;color:white}
.badge-auto{background:#8b5cf6;color:white}
.badge-urgent{background:#f59e0b;color:white}
.detail-row{margin:12px 0;padding:12px;background:#f9fafb;border-left:3px solid #3b82f6;border-radius:4px}
.detail-label{font-weight:600;color:#6b7280;font-size:12px;text-transform:uppercase}
.detail-value{color:#111827;font-size:16px;margin-top:4px}
.cta-button{display:inline-block;background:#3b82f6;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;margin-top:20px}
.footer{text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px}
</style></head><body>
<div class="container"><div class="header">
<h1 style="margin:0;font-size:24px">🔥 HOT Opportunity Alert</h1>
<p style="margin:8px 0 0 0;opacity:0.9">${flaggedType === 'manual' ? 'Manually flagged' : 'Automatically detected'} high-priority opportunity</p>
</div><div class="content">
<div style="margin-bottom:20px">
<span class="badge badge-hot">HOT</span>
<span class="badge ${flaggedType === 'manual' ? 'badge-manual' : 'badge-auto'}">${flaggedType === 'manual' ? 'MANUAL FLAG' : 'AUTO-DETECTED'}</span>
${daysUntilDue <= 14 ? `<span class="badge badge-urgent">URGENT - ${daysUntilDue} DAYS LEFT</span>` : ''}
</div>
<h2 style="margin:20px 0 10px 0;font-size:20px;color:#111827">${opportunity.title}</h2>
<div class="detail-row"><div class="detail-label">Agency</div><div class="detail-value">${opportunity.agency}</div></div>
<div class="detail-row"><div class="detail-label">Location</div><div class="detail-value">${opportunity.geography_state}${opportunity.geography_county ? ', ' + opportunity.geography_county : ''}</div></div>
<div class="detail-row"><div class="detail-label">Estimated Value</div><div class="detail-value">${estimatedValue}</div></div>
<div class="detail-row"><div class="detail-label">Proposal Due</div><div class="detail-value">${new Date(opportunity.proposal_due).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} (${daysUntilDue} days)</div></div>
<div class="detail-row"><div class="detail-label">Service Tags</div><div class="detail-value">${opportunity.service_tags.join(', ')}</div></div>
<div style="margin:20px 0"><div class="detail-label" style="margin-bottom:8px">Summary</div><p style="margin:0;line-height:1.6">${opportunity.summary}</p></div>
${opportunity.recommended_action ? `<div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:12px;border-radius:4px;margin:20px 0">
<div class="detail-label" style="color:#92400e">Recommended Action</div>
<p style="margin:8px 0 0 0;color:#78350f">${opportunity.recommended_action}</p></div>` : ''}
<a href="${opportunity.link}" class="cta-button" target="_blank">View Opportunity Details →</a>
</div><div class="footer">
<p>You're receiving this because you have HOT opportunity notifications enabled.</p>
<p>LifeLine PipeLine Scout | EMS Business Development Intelligence</p>
</div></div></body></html>`;

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'PipeLine Scout <notifications@resend.dev>',
            to: [pref.email],
            subject: `🔥 HOT Opportunity Alert: ${opportunity.title}`,
            html: emailHtml,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Error sending email to ${pref.email}:`, errorData);
          emailResults.push({ success: false, email: pref.email, error: errorData });
        } else {
          emailsSent++;
          console.log(`Email sent successfully to ${pref.email}`);
          emailResults.push({ success: true, email: pref.email });
        }
      } catch (error) {
        console.error(`Failed to send email to ${pref.email}:`, error);
        emailResults.push({ success: false, email: pref.email, error });
      }
    }
    
    console.log(`Sent ${emailsSent}/${usersToNotify.length} HOT opportunity notifications`);

    return new Response(
      JSON.stringify({ 
        message: "Notifications processed",
        sent: emailsSent,
        total: usersToNotify.length,
        results: emailResults
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-hot-opportunity-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
