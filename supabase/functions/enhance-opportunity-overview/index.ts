import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { opportunity, documentInsights } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert business intelligence analyst for LifeLine EMS. Your task is to create comprehensive opportunity overviews by combining:
1. RFP document analysis (requirements, deadlines, evaluation criteria)
2. Web research of official agency sources (current providers, budgets, service needs)
3. Strategic context about the procurement environment

Generate a detailed opportunity overview that includes:

**OPPORTUNITY INTELLIGENCE**
- Full understanding of scope and requirements
- Current incumbent/provider if known
- Contract history and context
- Budget and funding sources
- Political/strategic considerations

**KEY REQUIREMENTS**
- Critical must-have capabilities
- Evaluation criteria and weights
- Submission requirements
- Performance standards expected

**STRATEGIC CONTEXT**
- Agency challenges and pain points
- Market positioning considerations
- Competitor landscape
- Unique opportunities or constraints

**RECOMMENDED APPROACH**
- High-level capture strategy
- Key differentiators to emphasize
- Risk factors to address
- Partnership or teaming considerations

Use clear, professional language. Be specific with facts and citations. Flag any assumptions with [VERIFY] tags.`;

    const userPrompt = `Create an enhanced opportunity overview for:

OPPORTUNITY:
${JSON.stringify(opportunity, null, 2)}

${documentInsights ? `DOCUMENT ANALYSIS:\n${documentInsights}\n` : ''}

Based on the opportunity details${documentInsights ? ', parsed RFP documents,' : ''} and your knowledge of typical government procurement patterns, create a comprehensive intelligence brief for the BD team.

Include web research context about:
- The agency's current EMS service model
- Recent procurement history in this jurisdiction  
- Known competitors in this market
- Budget constraints or funding sources
- Strategic priorities from agency planning documents

Format as a clear, actionable intelligence report.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const enhancedOverview = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ enhancedOverview }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in enhance-opportunity-overview:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});