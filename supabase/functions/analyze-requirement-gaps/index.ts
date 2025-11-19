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

    const { requirements, opportunityId } = await req.json();

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
        suggestedBlocks: matches,
      });
    }

    return new Response(
      JSON.stringify({ gapAnalysis }),
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
