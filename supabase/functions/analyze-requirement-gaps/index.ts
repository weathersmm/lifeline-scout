import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { requirements, opportunityId, extractionId } = await req.json();

    if (!requirements || requirements.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No requirements provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch all content blocks
    const { data: contentBlocks, error: blocksError } = await supabase
      .from('proposal_content_blocks')
      .select('*')
      .order('created_at', { ascending: false });

    if (blocksError) throw blocksError;

    // Analyze each unfilled requirement
    const gapAnalysis = [];

    for (const req of requirements) {
      // Skip requirements that already have content blocks assigned
      if (req.contentBlockIds && req.contentBlockIds.length > 0) {
        continue;
      }

      // Find best matching content blocks using AI
      const prompt = `Analyze the following RFP requirement and identify the 3 most relevant content blocks that could address this requirement.

Requirement ID: ${req.requirementId}
Requirement Category: ${req.category || 'Not specified'}
Requirement Text: ${req.requirementText}

Available Content Blocks:
${contentBlocks?.slice(0, 20).map((block: any, idx: number) => 
  `${idx + 1}. Title: ${block.title}\n   Type: ${block.content_type}\n   Preview: ${block.content.substring(0, 200)}...`
).join('\n\n')}

Respond with a JSON array of the top 3 matching content block IDs with match scores (0-100) and brief explanations. Format:
[
  {
    "blockId": "uuid",
    "blockTitle": "title",
    "matchScore": 85,
    "reason": "explanation"
  }
]`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are an expert proposal writer analyzing content matches. Always respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ],
        }),
      });

      if (!aiResponse.ok) {
        console.error('AI API error:', await aiResponse.text());
        continue;
      }

      const aiData = await aiResponse.json();
      const aiContent = aiData.choices?.[0]?.message?.content || '[]';
      
      let matches = [];
      try {
        matches = JSON.parse(aiContent);
      } catch (e) {
        console.error('Failed to parse AI response:', aiContent);
        continue;
      }

      gapAnalysis.push({
        requirementId: req.requirementId,
        requirementText: req.requirementText,
        category: req.category,
        hasSuggestedContent: matches.length > 0,
        suggestedBlocks: matches,
      });
    }

    // Calculate summary statistics
    const totalRequirements = requirements.length;
    const requirementsMissingContent = gapAnalysis.length;
    const requirementsWithContent = totalRequirements - requirementsMissingContent;

    // Generate AI summary and recommendations
    const summaryPrompt = `Based on this gap analysis, provide a brief executive summary (2-3 sentences) and 3-5 actionable recommendations for filling content gaps.

Gap Analysis Summary:
- Total Requirements: ${totalRequirements}
- Requirements with existing content: ${requirementsWithContent}
- Requirements missing content: ${requirementsMissingContent}

Missing Content Areas:
${gapAnalysis.map(gap => `- ${gap.category}: ${gap.requirementText.substring(0, 100)}...`).join('\n')}

Respond with JSON format:
{
  "summary": "executive summary text",
  "recommendations": ["recommendation 1", "recommendation 2", ...]
}`;

    const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert proposal strategist. Respond with valid JSON only.' },
          { role: 'user', content: summaryPrompt }
        ],
      }),
    });

    let gapSummary = 'Gap analysis completed.';
    let recommendations = [];

    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      const summaryContent = summaryData.choices?.[0]?.message?.content || '{}';
      try {
        const parsed = JSON.parse(summaryContent);
        gapSummary = parsed.summary || gapSummary;
        recommendations = parsed.recommendations || [];
      } catch (e) {
        console.error('Failed to parse summary response:', summaryContent);
      }
    }

    // Save results to database
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('requirement_gap_analyses')
      .insert({
        opportunity_id: opportunityId,
        extraction_id: extractionId,
        gap_summary: gapSummary,
        total_requirements: totalRequirements,
        requirements_with_content: requirementsWithContent,
        requirements_missing_content: requirementsMissingContent,
        gap_details: gapAnalysis,
        recommendations: recommendations,
        analyzed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving gap analysis:', saveError);
      // Don't fail the request, just log it
    }

    return new Response(
      JSON.stringify({ 
        gapAnalysis,
        summary: gapSummary,
        recommendations,
        statistics: {
          totalRequirements,
          requirementsWithContent,
          requirementsMissingContent,
          coveragePercent: Math.round((requirementsWithContent / totalRequirements) * 100)
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in analyze-requirement-gaps:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
