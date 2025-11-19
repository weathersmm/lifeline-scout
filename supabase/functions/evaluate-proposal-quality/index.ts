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
    const { opportunityId } = await req.json();

    if (!opportunityId) {
      throw new Error("opportunityId is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch extracted requirements
    const { data: requirements, error: reqError } = await supabase
      .from("proposal_requirement_mappings")
      .select("*")
      .eq("opportunity_id", opportunityId);

    if (reqError) throw reqError;

    if (!requirements || requirements.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No requirements found. Extract requirements first." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Fetch content blocks for assembled requirements
    const contentBlockIds = requirements
      .flatMap(r => r.content_block_ids || [])
      .filter((id, index, self) => self.indexOf(id) === index);

    let contentBlocks: any[] = [];
    if (contentBlockIds.length > 0) {
      const { data: blocks, error: blocksError } = await supabase
        .from("proposal_content_blocks")
        .select("*")
        .in("id", contentBlockIds);

      if (blocksError) throw blocksError;
      contentBlocks = blocks || [];
    }

    // Build analysis prompt
    const requirementsList = requirements.map((req, idx) => {
      const blocks = (req.content_block_ids || [])
        .map((id: string) => contentBlocks.find(b => b.id === id))
        .filter(Boolean);
      
      return `
Requirement ${idx + 1}: ${req.requirement_text}
Category: ${req.requirement_category || "Uncategorized"}
Page Limit: ${req.page_limit || "Not specified"}
Status: ${req.is_complete ? "Complete" : "Incomplete"}
Word Count: ${req.word_count || 0}
Content Blocks: ${blocks.map((b: any) => `"${b.title}"`).join(", ") || "None"}
Custom Content: ${req.custom_content ? "Yes (" + req.custom_content.split(/\s+/).length + " words)" : "No"}
      `.trim();
    }).join("\n\n");

    const analysisPrompt = `You are a proposal quality evaluator. Analyze this proposal assembly against RFP requirements and provide a detailed quality assessment.

REQUIREMENTS AND ASSEMBLED CONTENT:
${requirementsList}

Evaluate the following dimensions:

1. CONTENT COMPLETENESS (0-100):
   - What percentage of requirements have content assigned?
   - Are high-priority requirements fully addressed?
   - Are any critical requirements missing content?

2. KEYWORD COVERAGE (0-100):
   - How well do the content blocks address key RFP terminology?
   - Are technical terms, compliance keywords, and evaluation criteria mentioned?
   - Identify any missing critical keywords from requirements

3. RFP ALIGNMENT (0-100):
   - Does the assembled content semantically match the intent of each requirement?
   - Are responses relevant and on-target?
   - Identify any misaligned or off-topic content

4. OVERALL QUALITY SCORE (0-100):
   - Weighted average of the above dimensions
   - Consider completeness (40%), keyword coverage (30%), alignment (30%)

Provide your analysis in this JSON format:
{
  "completenessScore": <number 0-100>,
  "keywordCoverageScore": <number 0-100>,
  "alignmentScore": <number 0-100>,
  "overallScore": <number 0-100>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>", "<actionable recommendation 3>"],
  "missingKeywords": ["<keyword 1>", "<keyword 2>", "<keyword 3>"],
  "categoryScores": [
    {
      "category": "<category name>",
      "score": <number 0-100>,
      "issues": ["<issue 1>", "<issue 2>"]
    }
  ]
}

Return ONLY valid JSON, no markdown or explanation.`;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a proposal quality evaluator specializing in RFP response analysis. Always return valid JSON."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const analysisText = aiResult.choices[0].message.content;
    
    // Parse JSON response
    let qualityAnalysis;
    try {
      qualityAnalysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", analysisText);
      throw new Error("Failed to parse quality analysis");
    }

    // Store quality analysis result
    const { data: user } = await supabase.auth.getUser(
      req.headers.get("Authorization")?.replace("Bearer ", "") || ""
    );

    const { error: insertError } = await supabase
      .from("proposal_quality_scores")
      .insert({
        opportunity_id: opportunityId,
        completeness_score: qualityAnalysis.completenessScore,
        keyword_coverage_score: qualityAnalysis.keywordCoverageScore,
        alignment_score: qualityAnalysis.alignmentScore,
        overall_score: qualityAnalysis.overallScore,
        strengths: qualityAnalysis.strengths,
        weaknesses: qualityAnalysis.weaknesses,
        recommendations: qualityAnalysis.recommendations,
        missing_keywords: qualityAnalysis.missingKeywords,
        category_scores: qualityAnalysis.categoryScores,
        evaluated_by: user?.user?.id,
      });

    if (insertError) {
      console.error("Error storing quality score:", insertError);
    }

    return new Response(
      JSON.stringify(qualityAnalysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error evaluating proposal quality:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to evaluate quality" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
