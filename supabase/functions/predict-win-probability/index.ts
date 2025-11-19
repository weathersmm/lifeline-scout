import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PredictionRequest {
  opportunityId: string;
  swotFactors?: {
    strengthsCount: number;
    weaknessesCount: number;
    opportunitiesCount: number;
    threatsCount: number;
  };
  ptwData?: {
    priceRatio: number; // our_price / market_average
    marginPercent: number;
  };
  gonogoScore?: number;
  competitorCount?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { opportunityId, swotFactors, ptwData, gonogoScore, competitorCount } = await req.json() as PredictionRequest;

    // Fetch historical win/loss data for ML training
    const { data: trainingData, error: trainingError } = await supabaseClient
      .from("ml_training_data")
      .select("*")
      .not("outcome", "is", null);

    if (trainingError) {
      console.error("Error fetching training data:", trainingError);
    }

    // Calculate win probability using rule-based ML approach
    let baseWinProbability = 50;
    const factors: { factor: string; impact: number; weight: number }[] = [];

    // Factor 1: SWOT Balance (20% weight)
    if (swotFactors) {
      const swotBalance = (swotFactors.strengthsCount + swotFactors.opportunitiesCount) - 
                         (swotFactors.weaknessesCount + swotFactors.threatsCount);
      const swotImpact = Math.min(Math.max(swotBalance * 2, -15), 15);
      factors.push({ factor: "SWOT Balance", impact: swotImpact, weight: 0.2 });
    }

    // Factor 2: Price Positioning (30% weight)
    if (ptwData && ptwData.priceRatio > 0) {
      let priceImpact = 0;
      if (ptwData.priceRatio < 0.85) priceImpact = 20;
      else if (ptwData.priceRatio < 0.95) priceImpact = 15;
      else if (ptwData.priceRatio < 1.05) priceImpact = 5;
      else if (ptwData.priceRatio < 1.15) priceImpact = -10;
      else priceImpact = -20;
      factors.push({ factor: "Price Positioning", impact: priceImpact, weight: 0.3 });
    }

    // Factor 3: Go/No-Go Score (25% weight)
    if (gonogoScore) {
      const gonogoImpact = ((gonogoScore - 21) / 14) * 25; // Normalize from 7-35 scale
      factors.push({ factor: "Go/No-Go Score", impact: gonogoImpact, weight: 0.25 });
    }

    // Factor 4: Competitive Environment (15% weight)
    if (competitorCount !== undefined) {
      const competitorImpact = Math.max(-15, -competitorCount * 3);
      factors.push({ factor: "Competitor Count", impact: competitorImpact, weight: 0.15 });
    }

    // Factor 5: Historical Performance (10% weight) - from training data
    if (trainingData && trainingData.length > 0) {
      const historicalWinRate = trainingData.filter(d => d.outcome === 'won').length / trainingData.length;
      const historicalImpact = (historicalWinRate - 0.5) * 20;
      factors.push({ factor: "Historical Win Rate", impact: historicalImpact, weight: 0.1 });
    }

    // Calculate weighted probability
    let totalWeight = 0;
    let weightedSum = 0;
    factors.forEach(f => {
      weightedSum += f.impact * f.weight;
      totalWeight += f.weight;
    });

    const adjustedProbability = baseWinProbability + weightedSum;
    const finalProbability = Math.min(Math.max(adjustedProbability, 5), 95); // Cap between 5-95%

    // Determine confidence level
    let confidence = "Medium";
    const factorCount = factors.length;
    if (factorCount >= 4) confidence = "High";
    else if (factorCount <= 2) confidence = "Low";

    // Generate recommendations
    const recommendations: string[] = [];
    if (ptwData && ptwData.priceRatio > 1.1) {
      recommendations.push("Consider price optimization - current pricing may reduce win probability");
    }
    if (gonogoScore && gonogoScore < 21) {
      recommendations.push("Go/No-Go score is low - address key weaknesses before proceeding");
    }
    if (swotFactors && swotFactors.weaknessesCount > swotFactors.strengthsCount) {
      recommendations.push("SWOT analysis shows more weaknesses than strengths - develop mitigation strategies");
    }
    if (competitorCount && competitorCount > 5) {
      recommendations.push("High competitor count - differentiation strategy critical");
    }

    return new Response(
      JSON.stringify({
        winProbability: Math.round(finalProbability),
        confidence,
        factors: factors.map(f => ({
          factor: f.factor,
          impact: `${f.impact > 0 ? '+' : ''}${Math.round(f.impact)}%`,
          weight: `${Math.round(f.weight * 100)}%`
        })),
        recommendations,
        trainingDataSize: trainingData?.length || 0,
        modelVersion: "1.0-rule-based"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in predict-win-probability:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});