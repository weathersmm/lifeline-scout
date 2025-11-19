import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LIFELINE_CONTEXT = `
COMPANY: LifeLine EMS
CORE BUSINESS: Emergency medical services, non-emergency medical transport, ambulance billing, call center operations, EMS quality improvement, training and simulation

KEY DIFFERENTIATORS:
- Proven track record in California EMS operations
- Advanced technology integration (ePCR, CAD, dispatch systems)
- Robust quality improvement programs with measurable outcomes
- Comprehensive training programs including simulation and VR
- Flexible staffing models for urban, suburban, and rural environments
- Strong relationships with California counties and municipalities

TYPICAL WIN THEMES:
- Operational excellence and proven past performance
- Technology-driven quality improvement
- Cost-effective service delivery without compromising quality
- Deep local market knowledge and relationships
- Flexibility and responsiveness to changing needs
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { opportunity, requirements, competitorIntel, swotAnalysis } = await req.json();
    
    if (!opportunity || !requirements) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating module specification for:', opportunity.title);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are an expert proposal strategist for LifeLine EMS. Generate a comprehensive Module Specification document that guides proposal writers in creating winning content.

${LIFELINE_CONTEXT}

Follow the standard 8-question Module Specification template:

1. MODULE PURPOSE: What role does this module play in the proposal? What are we trying to show? What discriminators and themes are we trying to convey? State the conclusion the reviewer should reach after reading this module.

2. WIN STRATEGY: What win strategy themes are to be covered in this module? What points should be made to substantiate the win strategies? How do we differentiate from competitors?

3. KEY ISSUES: What are the Customer's key concerns relevant to this module? What keeps the Customer awake at night? What perceived weaknesses must we address?

4. SELECTED APPROACH: How will we address the Customer's concerns and meet their needs? Identify specific techniques (avoid generalities). Provide one resolution method for each key issue.

5. FEATURES & BENEFITS: What is special about our approach? What are the distinguishing characteristics—features—of our approach? For each feature, state the benefit to the customer (lower cost, lower risk, increased performance, or advantageous schedule).

6. RELATED EXPERIENCE: What evidence do we have that our approach will work? Identify relevant and recent contracted work or independent research. Include lessons learned that make us smarter for this effort.

7. COMPETITOR'S APPROACH: What competitive approaches do we expect to beat? What might competitors say or do? How can we prove conclusively that our approach is superior? Can we provide evidence with trade-off tables?

8. DISCRIMINATORS: What is different (better) about our approach in addressing/solving the customer's issues? Why should they pick us over competitors?

Return a structured JSON object with these sections filled out based on the opportunity details and extracted requirements.`;

    const userPrompt = `Generate a Module Specification for this opportunity:

OPPORTUNITY:
Title: ${opportunity.title}
Agency: ${opportunity.agency}
Location: ${opportunity.geography?.city || ''}, ${opportunity.geography?.county || ''}, ${opportunity.geography?.state}
Service Tags: ${opportunity.serviceTags?.join(', ') || 'Not specified'}
Contract Type: ${opportunity.contractType}
Summary: ${opportunity.summary}

EXTRACTED REQUIREMENTS (Top 10):
${requirements.slice(0, 10).map((req: any) => `- [${req.id}] ${req.text}`).join('\n')}

${competitorIntel ? `COMPETITOR INTELLIGENCE:\n${JSON.stringify(competitorIntel, null, 2)}` : ''}

${swotAnalysis ? `SWOT ANALYSIS:\n${JSON.stringify(swotAnalysis, null, 2)}` : ''}

Generate a comprehensive Module Specification that will guide proposal writers in creating compelling, differentiated content for this opportunity.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway returned ${response.status}: ${errorText}`);
    }

    const aiData = await response.json();
    const content = aiData.choices[0].message.content;

    console.log('Module specification generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        moduleSpec: content
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-module-specification:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
