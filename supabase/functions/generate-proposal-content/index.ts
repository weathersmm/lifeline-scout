import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { opportunity, contentType, basePrompt, customPrompt } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Generating proposal content for:', contentType);

    // Build context about the opportunity
    const opportunityContext = `
Opportunity Title: ${opportunity.title}
Agency/Organization: ${opportunity.agency}
Service Types: ${opportunity.serviceTypes?.join(', ') || 'Not specified'}
Location: ${opportunity.location?.city || ''}, ${opportunity.location?.county || ''}, ${opportunity.location?.state || ''}
Estimated Value: ${opportunity.estimatedValue?.min ? `$${opportunity.estimatedValue.min.toLocaleString()} - $${opportunity.estimatedValue.max?.toLocaleString() || 'TBD'}` : 'Not specified'}
Summary: ${opportunity.summary}
${opportunity.lifecycle_notes ? `Additional Notes:\n${opportunity.lifecycle_notes}` : ''}
    `.trim();

    // Build the system prompt
    const systemPrompt = `You are an expert proposal writer for LifeLine EMS, a leading emergency medical services provider. You specialize in creating compelling, professional proposal content that demonstrates capability, highlights relevant experience, and addresses client requirements.

LifeLine EMS Background:
- Leading EMS provider with operations across California and nationally
- Core services: 911 emergency response, non-emergency medical transport (NEMT), interfacility transport (IFT), critical care transport (CCT), air ambulance operations
- Advanced capabilities: BLS, ALS, CCT-level care, specialized event medical services, billing and claims processing, call center operations, quality improvement programs
- Experienced with municipal contracts, county-wide systems, hospital partnerships
- Strong track record in urban and suburban environments
- Excellence in compliance, patient care, operational efficiency, and customer service
- Technology-driven with modern dispatch, CAD systems, ePCR, fleet management
- Certified and credentialed across all required levels

When generating content:
1. Use professional, confident, but not boastful tone
2. Focus on client benefits and outcomes
3. Address requirements directly
4. Highlight relevant experience and capabilities
5. Use specific examples when appropriate (but mark them as [EXAMPLE - CUSTOMIZE])
6. Include metrics and measurable outcomes where relevant
7. Maintain compliance with RFP requirements
8. Write in clear, concise language avoiding jargon
9. Structure content with clear sections and bullet points where appropriate
10. Leave placeholders like [INSERT SPECIFIC EXAMPLE] where customization is needed`;

    // Build the user prompt
    const userPrompt = `${basePrompt}

Opportunity Details:
${opportunityContext}

${customPrompt ? `Additional Requirements:\n${customPrompt}\n` : ''}

Generate comprehensive, professional proposal content for this ${contentType.replace(/_/g, ' ')} section. Make it specific to this opportunity while remaining adaptable. Include clear structure with headings and subsections. Mark any areas that need customization with [CUSTOMIZE] or [INSERT SPECIFIC].

Generate 400-800 words of high-quality content.`;

    console.log('Calling Lovable AI...');

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service requires payment. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content;

    if (!generatedContent) {
      throw new Error('No content returned from AI');
    }

    console.log('Successfully generated proposal content');

    return new Response(
      JSON.stringify({ 
        success: true,
        content: generatedContent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Generate proposal content error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
