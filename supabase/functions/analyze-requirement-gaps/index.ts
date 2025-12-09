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

    // Fetch all content blocks with usage stats
    const { data: contentBlocks, error: blocksError } = await supabase
      .from('proposal_content_blocks')
      .select('*')
      .order('created_at', { ascending: false });

    if (blocksError) throw blocksError;

    // Fetch past performance data - which blocks have been used successfully
    const { data: winHistory } = await supabase
      .from('win_loss_history')
      .select('*')
      .eq('outcome', 'won')
      .order('award_date', { ascending: false })
      .limit(50);

    // Fetch requirement mappings to see which blocks are commonly used
    const { data: mappings } = await supabase
      .from('proposal_requirement_mappings')
      .select('requirement_category, content_block_ids')
      .not('content_block_ids', 'is', null);

    // Build block usage statistics
    const blockUsageStats: Record<string, { count: number; categories: string[] }> = {};
    mappings?.forEach((m: any) => {
      if (m.content_block_ids) {
        m.content_block_ids.forEach((blockId: string) => {
          if (!blockUsageStats[blockId]) {
            blockUsageStats[blockId] = { count: 0, categories: [] };
          }
          blockUsageStats[blockId].count++;
          if (m.requirement_category && !blockUsageStats[blockId].categories.includes(m.requirement_category)) {
            blockUsageStats[blockId].categories.push(m.requirement_category);
          }
        });
      }
    });

    // Analyze each unfilled requirement
    const gapAnalysis = [];

    for (const req of requirements) {
      // Skip requirements that already have content blocks assigned
      if (req.contentBlockIds && req.contentBlockIds.length > 0) {
        continue;
      }

      // Build enhanced block info with past performance data
      const enrichedBlocks = contentBlocks?.slice(0, 30).map((block: any, idx: number) => {
        const stats = blockUsageStats[block.id] || { count: 0, categories: [] };
        return `${idx + 1}. ID: ${block.id}
   Title: ${block.title}
   Type: ${block.content_type}
   Tags: ${block.tags?.join(', ') || 'none'}
   Past Usage: Used ${stats.count} times in proposals${stats.categories.length > 0 ? ` (categories: ${stats.categories.join(', ')})` : ''}
   Preview: ${block.content.substring(0, 150)}...`;
      }).join('\n\n');

      // Find best matching content blocks using AI with semantic similarity
      const prompt = `You are an expert proposal analyst. Analyze the RFP requirement below and identify the TOP 3 most relevant content blocks based on:
1. Semantic similarity to the requirement text
2. Category alignment 
3. Past usage success (blocks used more often in winning proposals are preferred)

Requirement ID: ${req.requirementId}
Requirement Category: ${req.category || 'Not specified'}
Requirement Text: ${req.requirementText}

Available Content Blocks (with past performance data):
${enrichedBlocks}

Historical Context: We have ${winHistory?.length || 0} winning proposals in our database.

IMPORTANT: Return ONLY a JSON array with exactly 3 blocks. Each block must include the actual UUID from the list above.
Format:
[
  {
    "blockId": "actual-uuid-from-list",
    "blockTitle": "exact title from list",
    "matchScore": 85,
    "reason": "Brief explanation of semantic match and why this block fits",
    "confidence": "high|medium|low"
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
        // Try to extract JSON from the response
        const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          matches = JSON.parse(jsonMatch[0]);
        } else {
          matches = JSON.parse(aiContent);
        }
        // Validate and enrich matches with usage stats
        matches = matches.map((m: any) => ({
          ...m,
          usageCount: blockUsageStats[m.blockId]?.count || 0,
          previousCategories: blockUsageStats[m.blockId]?.categories || []
        }));
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
