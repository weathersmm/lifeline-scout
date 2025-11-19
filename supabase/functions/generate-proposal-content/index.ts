import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// LifeLine EMS Baseline Reference Materials
const LIFELINE_CONTEXT = `
LIFELINE EMS COMPANY BACKGROUND:
LifeLine is a leading provider of emergency medical services specializing in 911 response, non-emergency medical transportation, BLS/ALS/CCT services, air ambulance operations, billing services, and EMS technology solutions.

KEY DIFFERENTIATORS:
- Advanced fleet management and tracking systems
- Proven track record in California EMS market
- Comprehensive quality improvement programs
- State-of-the-art training and simulation capabilities
- 24/7 dispatch and call center operations
- Integrated billing and claims processing
- CAAS accreditation and regulatory compliance
- Experienced management team with public sector expertise

CORE PROPOSAL WRITING PRINCIPLES (from Style Guide):
1. Write like you talk - use plain language and active voice
2. Use the customer's language - mirror RFP terminology exactly
3. Be specific - avoid vague claims like "industry-proven" or "best and brightest"
4. Talk benefits not features - explain value to the customer
5. Use effective presentation style - make answers clear and easy to find

BASELINE PHILOSOPHY:
- Baselines provide pre-solved solutions to tell stories, not solve problems during proposals
- Integrate technical approach, functional integration, programmatic architecture, and organizational structure
- Team must understand and own baselines - reflect team thinking
- Baselines become the foundation for proposal responses

FEATURES-BENEFITS-PROOFS FRAMEWORK:
Always structure content as: Theme/Requirement → Features → Proofs/Evidence → Customer Benefits
- Features: What we do or provide
- Proofs: Evidence, metrics, past performance demonstrating capability
- Benefits: Value delivered to customer (cost savings, risk reduction, improved outcomes)

AVOID:
- Flowery language: "phenomenal," "awesome," "gigantic"
- Redundant phrases: "tightly aligned," "proven and repeatable," "best and brightest"
- Overly dramatic style: "passionate," "embrace," "intimate knowledge of"
- Generic claims without specific evidence

EMPHASIZE:
- Specific metrics and quantifiable results
- Concrete examples from similar contracts
- Clear connection between our solution and customer needs
- Risk mitigation strategies with evidence
- Cost-effective approach with justification
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { opportunity, contentType, basePrompt, customPrompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const opportunityContext = `
Opportunity Title: ${opportunity.title}
Agency/Organization: ${opportunity.agency}
Service Types: ${opportunity.serviceTypes?.join(', ') || 'Not specified'}
Location: ${opportunity.location?.city || ''}, ${opportunity.location?.county || ''}, ${opportunity.location?.state || ''}
Estimated Value: ${opportunity.estimatedValue?.min ? `$${opportunity.estimatedValue.min.toLocaleString()} - $${opportunity.estimatedValue.max?.toLocaleString() || 'TBD'}` : 'Not specified'}
Summary: ${opportunity.summary}
${opportunity.lifecycle_notes ? `Additional Notes:\n${opportunity.lifecycle_notes}` : ''}
    `.trim();

    let systemPrompt = "";
    
    if (contentType === "past_performance") {
      systemPrompt = `${LIFELINE_CONTEXT}

You are generating a PAST PERFORMANCE narrative for a proposal. Follow these requirements:

STRUCTURE:
1. Project Overview (2-3 sentences): Client name, contract value, duration, scope
2. Relevance Statement (1-2 sentences): How this project directly relates to current opportunity
3. Key Accomplishments (3-5 bullet points): Specific, quantifiable achievements with metrics
4. Lessons Applied (1-2 sentences): What we learned and how it benefits this customer

STYLE RULES:
- Use active voice and specific details
- Include concrete metrics (response times, cost savings, satisfaction scores)
- Avoid vague claims - back everything with evidence
- Write in customer's language from the RFP
- Focus on benefits to customer, not just features

EXAMPLE STRUCTURE:
"LifeLine provided [service type] for [Agency] under a [contract value] contract from [dates]. This [X-year] contract included [specific scope].

This project directly demonstrates our capability to [relevant requirement from RFP] through [specific similarity].

Key Accomplishments:
• Achieved 95% compliance rate for 8-minute urban response times
• Reduced operational costs by 12% through fleet optimization
• Maintained 98.5% customer satisfaction rating over contract term
• Successfully transitioned 150+ personnel with zero service disruption
• Implemented CAD integration reducing dispatch times by 22%

These proven capabilities position LifeLine to deliver [specific customer benefit] for [current opportunity agency]."`;
    } else if (contentType === "technical_approach") {
      systemPrompt = `${LIFELINE_CONTEXT}

You are generating a TECHNICAL APPROACH section for a proposal. Follow these requirements:

STRUCTURE:
1. Understanding (1-2 paragraphs): Demonstrate comprehension of requirement and challenge
2. Approach Overview (1 paragraph): High-level methodology
3. Implementation Steps (numbered list): Specific, sequenced actions
4. Quality Controls (bullet points): How we ensure success
5. Benefits (1 paragraph): Value delivered to customer

STYLE RULES:
- Be specific about methods, tools, and processes
- Include timelines and milestones where applicable
- Explain WHY our approach works, with evidence
- Connect to past performance examples
- Address potential risks and mitigation strategies

FRAMEWORK:
Feature → Proof → Benefit
- What we'll do
- Evidence it works (metrics, past performance)
- Value to customer`;
    } else if (contentType === "executive_summary") {
      systemPrompt = `${LIFELINE_CONTEXT}

You are generating an EXECUTIVE SUMMARY for a proposal. This is the most critical section.

STRUCTURE (2-3 pages max):
1. Opening Hook (1 paragraph): Connect our solution to customer's core need
2. Understanding (1 paragraph): Demonstrate grasp of challenge and environment
3. Solution Overview (1-2 paragraphs): High-level approach and key differentiators
4. Qualifications (1 paragraph): Why we're uniquely qualified (past performance, team)
5. Value Proposition (1 paragraph): Quantifiable benefits and ROI
6. Commitment Statement (2-3 sentences): Confidence in delivery

CRITICAL RULES:
- Lead with benefits, not features
- Use specific metrics and evidence
- Mirror customer's language from RFP
- Make it executive-readable (clear, concise, compelling)`;
    } else {
      systemPrompt = `${LIFELINE_CONTEXT}

You are generating proposal content for LifeLine EMS. Follow the company's style guide and baseline philosophy.

GENERAL CONTENT RULES:
- Use active voice and customer's language
- Be specific with metrics and evidence
- Structure as Feature → Proof → Benefit
- Avoid flowery language and buzzwords
- Make content clear, concise, and compelling`;
    }

    const userPrompt = `${basePrompt}

Opportunity Details:
${opportunityContext}

${customPrompt ? `Additional Requirements:\n${customPrompt}\n` : ''}

Generate comprehensive, professional proposal content for this ${contentType.replace(/_/g, ' ')} section. Generate 400-800 words of high-quality content.`;

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
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ content }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});