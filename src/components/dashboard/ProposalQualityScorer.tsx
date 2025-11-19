import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Star,
  RefreshCw,
  Lightbulb,
  AlertTriangle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QualityScoreResult {
  completenessScore: number;
  keywordCoverageScore: number;
  alignmentScore: number;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  missingKeywords: string[];
  categoryScores: {
    category: string;
    score: number;
    issues: string[];
  }[];
}

interface ProposalQualityScorerProps {
  opportunityId: string;
}

export function ProposalQualityScorer({ opportunityId }: ProposalQualityScorerProps) {
  const { toast } = useToast();
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<QualityScoreResult | null>(null);
  const [lastEvaluated, setLastEvaluated] = useState<Date | null>(null);

  useEffect(() => {
    loadLatestScore();
  }, [opportunityId]);

  const loadLatestScore = async () => {
    try {
      const { data, error } = await supabase
        .from('proposal_quality_scores')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('evaluated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setResult({
          completenessScore: data.completeness_score,
          keywordCoverageScore: data.keyword_coverage_score,
          alignmentScore: data.alignment_score,
          overallScore: data.overall_score,
          strengths: data.strengths || [],
          weaknesses: data.weaknesses || [],
          recommendations: data.recommendations || [],
          missingKeywords: data.missing_keywords || [],
          categoryScores: (data.category_scores as any) || []
        });
        setLastEvaluated(new Date(data.evaluated_at));
      }
    } catch (error) {
      console.error('Error loading latest score:', error);
    }
  };

  const evaluateQuality = async () => {
    setEvaluating(true);
    try {
      toast({
        title: "Evaluating proposal quality...",
        description: "AI is analyzing content and alignment",
      });

      const { data, error } = await supabase.functions.invoke('evaluate-proposal-quality', {
        body: { opportunityId }
      });

      if (error) throw error;

      setResult(data);
      setLastEvaluated(new Date());

      toast({
        title: "Quality evaluation complete",
        description: `Overall score: ${data.overallScore}/100`,
      });
    } catch (error) {
      console.error('Error evaluating quality:', error);
      toast({
        title: "Evaluation failed",
        description: error instanceof Error ? error.message : "Failed to evaluate proposal quality",
        variant: "destructive",
      });
    } finally {
      setEvaluating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Proposal Quality Score
          </CardTitle>
          <CardDescription>
            AI-powered evaluation of content completeness, keyword coverage, and RFP alignment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              No quality evaluation has been performed yet.
            </p>
            <Button onClick={evaluateQuality} disabled={evaluating}>
              {evaluating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Star className="mr-2 h-4 w-4" />
                  Evaluate Quality
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Proposal Quality Score
            </CardTitle>
            <CardDescription>
              Last evaluated: {lastEvaluated?.toLocaleString()}
            </CardDescription>
          </div>
          <Button 
            onClick={evaluateQuality} 
            disabled={evaluating}
            variant="outline"
          >
            {evaluating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-evaluate
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold">Overall Quality Score</h4>
            <Badge variant={getScoreBadge(result.overallScore)} className="text-lg px-3 py-1">
              {result.overallScore}/100
            </Badge>
          </div>
          <Progress value={result.overallScore} className="h-3" />
        </div>

        <Separator />

        {/* Dimension Scores */}
        <div className="space-y-4">
          <h4 className="font-semibold">Quality Dimensions</h4>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Content Completeness
                </span>
                <span className={`font-semibold ${getScoreColor(result.completenessScore)}`}>
                  {result.completenessScore}/100
                </span>
              </div>
              <Progress value={result.completenessScore} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Keyword Coverage
                </span>
                <span className={`font-semibold ${getScoreColor(result.keywordCoverageScore)}`}>
                  {result.keywordCoverageScore}/100
                </span>
              </div>
              <Progress value={result.keywordCoverageScore} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  RFP Alignment
                </span>
                <span className={`font-semibold ${getScoreColor(result.alignmentScore)}`}>
                  {result.alignmentScore}/100
                </span>
              </div>
              <Progress value={result.alignmentScore} className="h-2" />
            </div>
          </div>
        </div>

        {/* Category Scores */}
        {result.categoryScores.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold">Category Breakdown</h4>
              <ScrollArea className="h-48">
                <div className="space-y-3 pr-4">
                  {result.categoryScores.map((cat, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{cat.category}</span>
                        <Badge variant={getScoreBadge(cat.score)}>
                          {cat.score}/100
                        </Badge>
                      </div>
                      {cat.issues.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                          {cat.issues.map((issue, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}

        <Separator />

        {/* Strengths */}
        {result.strengths.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Strengths
            </h4>
            <ul className="space-y-2">
              {result.strengths.map((strength, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {result.weaknesses.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-4 w-4" />
              Areas for Improvement
            </h4>
            <ul className="space-y-2">
              {result.weaknesses.map((weakness, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing Keywords */}
        {result.missingKeywords.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-semibold">Missing Keywords:</span>{" "}
              {result.missingKeywords.join(", ")}
            </AlertDescription>
          </Alert>
        )}

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2 text-blue-600">
              <Lightbulb className="h-4 w-4" />
              Recommendations
            </h4>
            <ul className="space-y-2">
              {result.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
