import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { competitorId, competitorName, sources } = await req.json();
    
    if (!competitorName) {
      return new Response(
        JSON.stringify({ error: 'Competitor name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Gathering competitive intelligence for:', competitorName);

    // Build search queries for competitive intelligence
    const searchQueries = [
      `${competitorName} EMS ambulance contract awards 2024 2025`,
      `${competitorName} emergency medical services news press releases`,
      `${competitorName} company profile headquarters leadership`,
      `${competitorName} EMS pricing strategy contract wins`,
      `${competitorName} ambulance services capabilities specialties`
    ];

    // If specific sources provided, include them
    if (sources && Array.isArray(sources) && sources.length > 0) {
      sources.forEach(url => {
        searchQueries.push(`site:${url} ${competitorName}`);
      });
    }

    // Gather information using AI-powered web research
    const aiPrompt = `Analyze competitive intelligence for ${competitorName}, an emergency medical services (EMS) provider. 

Based on recent news, press releases, contract awards, and public information, provide a comprehensive competitor profile in JSON format:

{
  "company_description": "Brief overview of the company and its EMS operations",
  "headquarters": "Location of headquarters",
  "website": "Company website URL if found",
  "size_category": "small/medium/large/national",
  "primary_markets": ["List of states/regions where they operate"],
  "service_specialties": ["List of EMS service types: 911, BLS, ALS, CCT, NEMT, etc."],
  "recent_wins": ["Recent contract awards with agencies and dates"],
  "recent_losses": ["Known lost bids if available"],
  "key_strengths": ["Competitive advantages and differentiators"],
  "key_weaknesses": ["Potential vulnerabilities or challenges"],
  "pricing_strategy_notes": "What is known about their pricing approach",
  "avg_price_position": "premium/competitive/low-cost",
  "differentiators": ["What makes them unique in the market"],
  "recent_news": ["Recent news items with dates"]
}

Search queries to use:
${searchQueries.join('\n')}

Provide factual, recent information only. If information is not available, indicate that clearly. Return ONLY valid JSON.`;

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
            content: 'You are a competitive intelligence analyst specializing in EMS industry research. Provide accurate, factual information from recent sources.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const analysisContent = aiData.choices?.[0]?.message?.content;

    if (!analysisContent) {
      throw new Error('No content returned from AI');
    }

    console.log('AI analysis complete');

    // Parse the JSON response
    let intelligenceData;
    try {
      const cleanedContent = analysisContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      intelligenceData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      intelligenceData = {
        raw_analysis: analysisContent,
        error: 'Failed to parse structured data'
      };
    }

    // Calculate metrics from recent wins/losses if available
    const recentWins = intelligenceData.recent_wins?.length || 0;
    const recentLosses = intelligenceData.recent_losses?.length || 0;
    const totalRecent = recentWins + recentLosses;
    const winRate = totalRecent > 0 ? Math.round((recentWins / totalRecent) * 100) : null;

    // Update or insert competitor intelligence
    const competitorUpdate = {
      competitor_name: competitorName,
      company_description: intelligenceData.company_description || null,
      headquarters: intelligenceData.headquarters || null,
      website: intelligenceData.website || null,
      size_category: intelligenceData.size_category || null,
      primary_markets: intelligenceData.primary_markets || [],
      service_specialties: intelligenceData.service_specialties || [],
      key_strengths: intelligenceData.key_strengths || [],
      key_weaknesses: intelligenceData.key_weaknesses || [],
      differentiators: intelligenceData.differentiators || [],
      pricing_strategy_notes: intelligenceData.pricing_strategy_notes || null,
      avg_price_position: intelligenceData.avg_price_position || null,
      win_rate_percent: winRate,
      metadata: {
        last_gathered: new Date().toISOString(),
        recent_wins: intelligenceData.recent_wins || [],
        recent_losses: intelligenceData.recent_losses || [],
        recent_news: intelligenceData.recent_news || [],
        ai_analysis: intelligenceData.raw_analysis || analysisContent
      }
    };

    let result;
    if (competitorId) {
      // Update existing competitor
      const { data, error } = await supabase
        .from('competitor_intelligence')
        .update(competitorUpdate)
        .eq('id', competitorId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new competitor
      const { data, error } = await supabase
        .from('competitor_intelligence')
        .insert(competitorUpdate)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    console.log('Competitor intelligence updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        competitor: result,
        intelligence: intelligenceData,
        message: 'Competitive intelligence gathered successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Gather competitor intelligence error:', error);
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
