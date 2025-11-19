import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, Brain } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface WinProbabilityPredictorProps {
  opportunityId: string;
}

interface PredictionResult {
  winProbability: number;
  confidence: string;
  factors: Array<{
    factor: string;
    impact: string;
    weight: string;
  }>;
  recommendations: string[];
  trainingDataSize: number;
  modelVersion: string;
}

export function WinProbabilityPredictor({ opportunityId }: WinProbabilityPredictorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);

  const predictWinProbability = async () => {
    setLoading(true);
    try {
      // Fetch all analysis data
      const [swotData, ptwData, gonogoData] = await Promise.all([
        supabase.from("competitive_assessments").select("*").eq("opportunity_id", opportunityId).maybeSingle(),
        supabase.from("ptw_analyses").select("*").eq("opportunity_id", opportunityId).maybeSingle(),
        supabase.from("go_no_go_evaluations").select("*").eq("opportunity_id", opportunityId).maybeSingle()
      ]);

      const swotFactors = swotData.data ? {
        strengthsCount: (swotData.data.strengths || []).length,
        weaknessesCount: (swotData.data.weaknesses || []).length,
        opportunitiesCount: (swotData.data.opportunities || []).length,
        threatsCount: (swotData.data.threats || []).length
      } : undefined;

      const ptwFactorsData = ptwData.data && ptwData.data.our_estimated_price > 0 && ptwData.data.market_average_price > 0 ? {
        priceRatio: ptwData.data.our_estimated_price / ptwData.data.market_average_price,
        marginPercent: ptwData.data.target_margin_percent || 0
      } : undefined;

      const competitorCount = swotData.data?.competitors ? (swotData.data.competitors as any[]).length : 0;

      const { data: functionData, error: functionError } = await supabase.functions.invoke('predict-win-probability', {
        body: {
          opportunityId,
          swotFactors,
          ptwData: ptwFactorsData,
          gonogoScore: gonogoData.data?.total_score,
          competitorCount
        }
      });

      if (functionError) throw functionError;

      setPrediction(functionData);
      
      toast({
        title: "Win probability calculated",
        description: `${functionData.winProbability}% probability with ${functionData.confidence} confidence`,
      });
    } catch (error: any) {
      console.error("Error predicting win probability:", error);
      toast({
        title: "Error predicting win probability",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadgeVariant = (confidence: string) => {
    if (confidence === "High") return "default";
    if (confidence === "Medium") return "secondary";
    return "outline";
  };

  const getProbabilityColor = (prob: number) => {
    if (prob >= 70) return "text-green-500";
    if (prob >= 50) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">ML Win Probability Predictor</h2>
          <p className="text-sm text-muted-foreground">AI-powered prediction based on SWOT, PTW, and historical data</p>
        </div>
        <Button onClick={predictWinProbability} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Brain className="mr-2 h-4 w-4" />
          Predict Win Probability
        </Button>
      </div>

      {!prediction && !loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Brain className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Prediction Available</p>
              <p className="text-sm mb-4">
                Use machine learning to predict your win probability based on historical data, SWOT analysis, PTW positioning, and Go/No-Go scores.
              </p>
              <p className="text-xs text-muted-foreground">
                Note: More complete analysis data will improve prediction accuracy.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium mb-2">Analyzing Data...</p>
              <p className="text-sm text-muted-foreground">
                Processing SWOT factors, PTW positioning, competitor landscape, and historical patterns
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {prediction && (
        <>
          <Card className="border-2">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-3">
                <TrendingUp className={`h-8 w-8 ${getProbabilityColor(prediction.winProbability)}`} />
                <div>
                  <CardTitle className={`text-4xl ${getProbabilityColor(prediction.winProbability)}`}>
                    {prediction.winProbability}%
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Win Probability
                  </CardDescription>
                </div>
              </div>
              <div className="mt-4">
                <Progress value={prediction.winProbability} className="h-3" />
              </div>
              <div className="flex items-center justify-center gap-4 mt-4">
                <Badge variant={getConfidenceBadgeVariant(prediction.confidence)}>
                  {prediction.confidence} Confidence
                </Badge>
                <Badge variant="outline">
                  v{prediction.modelVersion}
                </Badge>
                <Badge variant="outline">
                  {prediction.trainingDataSize} historical records
                </Badge>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contributing Factors</CardTitle>
              <CardDescription>How different factors impact the win probability</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {prediction.factors.map((factor, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{factor.factor}</p>
                      <p className="text-xs text-muted-foreground">Weight: {factor.weight}</p>
                    </div>
                    <Badge variant={factor.impact.startsWith('+') ? "default" : "destructive"}>
                      {factor.impact}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {prediction.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
                <CardDescription>Strategic actions to improve win probability</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {prediction.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}