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
    const { opportunity, swot, ptw, gonogo } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert Business Development strategist for LifeLine EMS. Generate a comprehensive Capture Plan document that integrates SWOT analysis, Price-to-Win positioning, and Go/No-Go evaluation.

The capture plan should follow this structure:

# CAPTURE PLAN: [Opportunity Title]

## EXECUTIVE SUMMARY
Brief overview (2-3 paragraphs) covering opportunity value, strategic fit, recommended approach, and win probability.

## OPPORTUNITY OVERVIEW
- **Agency**: [Agency Name]
- **Value**: [Estimated Value]
- **Proposal Due**: [Date]
- **Geography**: [Location]
- **Service Type**: [Services]
- **Summary**: [Brief description]

## STRATEGIC ASSESSMENT

### SWOT Analysis
**Strengths:**
- [List key strengths]

**Weaknesses:**
- [List key weaknesses with mitigation strategies]

**Opportunities:**
- [List opportunities to exploit]

**Threats:**
- [List threats with defensive strategies]

### Competitive Environment
[Analysis of competitors, their strengths/weaknesses, market positioning]

## PRICE-TO-WIN STRATEGY

### Pricing Position
- **Recommended Price**: [Amount]
- **Market Average**: [Amount]
- **Positioning Strategy**: [Explanation]
- **Win Probability**: [Percentage]

### Price Justification
[Detailed rationale for recommended pricing]

### Competitive Pricing Analysis
[How our price compares to competitors and market]

## GO/NO-GO DECISION

### Overall Recommendation: [GO/NO-GO/CONDITIONAL]
**Total Score**: [X/35]

### Evaluation Criteria Scores:
- Strategic Fit: [X/5]
- Past Performance: [X/5]
- Reality Check: [X/5]
- Contract Approach: [X/5]
- Competitor Analysis: [X/5]
- Timeline Feasibility: [X/5]
- ROI Potential: [X/5]

### Decision Rationale
[Comprehensive explanation of the recommendation]

## CAPTURE STRATEGY

### Differentiators
[How we differentiate from competitors]

### Win Themes
[Key messages and themes for the proposal]

### Risk Mitigation
[Strategies to address weaknesses and threats]

### Teaming Strategy
[Partners and subcontractors if applicable]

## NEXT STEPS & ACTION ITEMS
1. [Prioritized action items]
2. [Key milestones]
3. [Resource requirements]

Use professional, concise language. Be data-driven and actionable. Focus on strategic insights that will guide the BD team through capture and proposal development.`;

    const userPrompt = `Generate a capture plan for this opportunity:

OPPORTUNITY:
${JSON.stringify(opportunity, null, 2)}

SWOT ANALYSIS:
${JSON.stringify(swot, null, 2)}

PRICE-TO-WIN DATA:
${JSON.stringify(ptw, null, 2)}

GO/NO-GO EVALUATION:
${JSON.stringify(gonogo, null, 2)}

Create a comprehensive, professional capture plan that synthesizes all this data into a strategic BD document.`;

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
    const capturePlan = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ capturePlan }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in generate-capture-plan:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});