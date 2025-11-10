import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all enabled notification preferences
    const { data: preferences, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('enabled', true);

    if (prefsError) {
      console.error('Error fetching preferences:', prefsError);
      throw prefsError;
    }

    if (!preferences || preferences.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active notification preferences found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${preferences.length} active notification preferences`);

    // Get opportunities created in the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: newOpportunities, error: oppsError } = await supabase
      .from('opportunities')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    if (oppsError) {
      console.error('Error fetching opportunities:', oppsError);
      throw oppsError;
    }

    if (!newOpportunities || newOpportunities.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No new opportunities found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${newOpportunities.length} new opportunities`);

    const priorityRank = { high: 3, medium: 2, low: 1 };
    let emailsSent = 0;

    // For each user preference, find matching opportunities and send email
    for (const pref of preferences) {
      const matchingOpps = newOpportunities.filter((opp) => {
        // Check priority
        const oppPriority = priorityRank[opp.priority as keyof typeof priorityRank];
        const minPriority = priorityRank[pref.min_priority as keyof typeof priorityRank];
        
        if (oppPriority < minPriority) {
          return false;
        }

        // Check service tags (if specified)
        if (pref.service_tags && pref.service_tags.length > 0) {
          const hasMatchingTag = pref.service_tags.some((tag: string) => 
            opp.service_tags.includes(tag)
          );
          if (!hasMatchingTag) {
            return false;
          }
        }

        return true;
      });

      if (matchingOpps.length === 0) {
        console.log(`No matching opportunities for user ${pref.user_id}`);
        continue;
      }

      console.log(`Found ${matchingOpps.length} matching opportunities for ${pref.email}`);

      // HTML escape function to prevent XSS
      const escapeHtml = (text: string): string => {
        const map: Record<string, string> = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
      };

      // Sanitize URL to prevent javascript: or data: protocols
      const sanitizeUrl = (url: string): string => {
        try {
          const parsed = new URL(url);
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            return '#';
          }
          return url;
        } catch {
          return '#';
        }
      };

      // Generate email content with sanitized data
      const opportunitiesHtml = matchingOpps.map((opp) => `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 8px 0; color: #111827;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background: ${
              opp.priority === 'high' ? '#fecaca' : opp.priority === 'medium' ? '#fde68a' : '#e5e7eb'
            }; color: ${
              opp.priority === 'high' ? '#991b1b' : opp.priority === 'medium' ? '#92400e' : '#6b7280'
            }; margin-right: 8px;">
              ${opp.priority.toUpperCase()}
            </span>
            ${escapeHtml(opp.title)}
          </h3>
          <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">
            <strong>Agency:</strong> ${escapeHtml(opp.agency)}
          </p>
          <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">
            <strong>Location:</strong> ${escapeHtml(opp.geography_city || opp.geography_county || opp.geography_state)}
          </p>
          <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">
            <strong>Contract Type:</strong> ${escapeHtml(opp.contract_type)}
          </p>
          <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">
            <strong>Proposal Due:</strong> ${new Date(opp.proposal_due).toLocaleDateString()}
          </p>
          ${opp.service_tags && opp.service_tags.length > 0 ? `
            <p style="margin: 8px 0 4px 0; color: #6b7280; font-size: 14px;">
              <strong>Tags:</strong> ${opp.service_tags.map((tag: string) => escapeHtml(tag)).join(', ')}
            </p>
          ` : ''}
          <p style="margin: 8px 0 4px 0; color: #374151; font-size: 14px;">
            ${escapeHtml(opp.summary)}
          </p>
          <a href="${sanitizeUrl(opp.link)}" style="display: inline-block; margin-top: 8px; padding: 8px 16px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; font-size: 14px;">
            View Opportunity
          </a>
        </div>
      `).join('');

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
              <h1 style="margin: 0 0 16px 0; color: #111827; font-size: 24px;">
                🚨 New High-Priority Opportunities
              </h1>
              <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 16px;">
                ${matchingOpps.length} new ${matchingOpps.length === 1 ? 'opportunity matches' : 'opportunities match'} your notification criteria:
              </p>
              ${opportunitiesHtml}
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                  This notification was sent because you have alerts enabled for opportunities matching your criteria.
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                  To manage your notification preferences, log in to your account.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'LifeLine Pipeline Scout <notifications@resend.dev>',
            to: [pref.email],
            subject: `🚨 ${matchingOpps.length} New Opportunity Alert${matchingOpps.length > 1 ? 's' : ''}`,
            html: emailHtml,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Error sending email to ${pref.email}:`, errorData);
        } else {
          emailsSent++;
          console.log(`Email sent successfully to ${pref.email}`);
        }
      } catch (emailError) {
        console.error(`Error sending email to ${pref.email}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        newOpportunities: newOpportunities.length,
        preferencesChecked: preferences.length,
        emailsSent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-opportunity-notifications:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process notification request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});