import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingDown, CheckCircle2, AlertCircle, Lightbulb, Sparkles, ThumbsUp, History } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RequirementGapAnalysisProps {
  opportunityId: string;
  requirements: any[];
  extractionId?: string;
  onSuggestionAccepted?: (requirementId: string, blockId: string) => void;
}

interface SuggestedBlock {
  blockId: string;
  blockTitle: string;
  matchScore: number;
  reason: string;
  confidence?: 'high' | 'medium' | 'low';
  usageCount?: number;
  previousCategories?: string[];
}

interface GapAnalysisResult {
  gapAnalysis: Array<{
    requirementId: string;
    requirementText: string;
    category: string;
    hasSuggestedContent: boolean;
    suggestedBlocks: SuggestedBlock[];
  }>;
  summary: string;
  recommendations: string[];
  statistics: {
    totalRequirements: number;
    requirementsWithContent: number;
    requirementsMissingContent: number;
    coveragePercent: number;
  };
}

export function RequirementGapAnalysis({ 
  opportunityId, 
  requirements, 
  extractionId,
  onSuggestionAccepted
}: RequirementGapAnalysisProps) {
  const { toast } = useToast();
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Record<string, string>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<GapAnalysisResult | null>(null);

  const handleAnalyzeGaps = async () => {
    if (!requirements || requirements.length === 0) {
      toast({
        title: "No requirements",
        description: "Extract requirements first before running gap analysis",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);
    
    try {
      toast({
        title: "Analyzing content gaps...",
        description: "Comparing requirements against available content blocks",
      });

      const { data, error } = await supabase.functions.invoke('analyze-requirement-gaps', {
        body: {
          requirements: requirements.map(req => ({
            requirementId: req.id,
            requirementText: req.text,
            category: req.category,
            contentBlockIds: req.contentBlockIds || []
          })),
          opportunityId,
          extractionId
        }
      });

      if (error) throw error;

      setAnalysisResult(data);
      
      toast({
        title: "Gap analysis complete",
        description: `Analyzed ${data.statistics.totalRequirements} requirements`,
      });

    } catch (error) {
      console.error('Error analyzing gaps:', error);
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getCoverageColor = (percent: number) => {
    if (percent >= 80) return "text-green-600";
    if (percent >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceBadge = (confidence?: string) => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-green-500/20 text-green-700 border-green-300">High Confidence</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-300">Medium</Badge>;
      case 'low':
        return <Badge className="bg-red-500/20 text-red-700 border-red-300">Low</Badge>;
      default:
        return null;
    }
  };

  const handleAcceptSuggestion = async (requirementId: string, block: SuggestedBlock) => {
    try {
      // Update the requirement mapping with the accepted block
      const { error } = await supabase
        .from('proposal_requirement_mappings')
        .upsert({
          opportunity_id: opportunityId,
          requirement_id: requirementId,
          requirement_text: analysisResult?.gapAnalysis.find(g => g.requirementId === requirementId)?.requirementText || '',
          requirement_category: analysisResult?.gapAnalysis.find(g => g.requirementId === requirementId)?.category,
          content_block_ids: [block.blockId],
          is_complete: false
        }, {
          onConflict: 'opportunity_id,requirement_id'
        });

      if (error) throw error;

      setAcceptedSuggestions(prev => ({ ...prev, [requirementId]: block.blockId }));
      
      if (onSuggestionAccepted) {
        onSuggestionAccepted(requirementId, block.blockId);
      }

      toast({
        title: "Suggestion accepted",
        description: `"${block.blockTitle}" mapped to requirement ${requirementId}`,
      });
    } catch (error: any) {
      console.error('Error accepting suggestion:', error);
      toast({
        title: "Failed to accept suggestion",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          Requirement Gap Analysis
        </CardTitle>
        <CardDescription>
          Identify missing content areas by comparing RFP requirements against available proposal content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleAnalyzeGaps}
          disabled={analyzing || !requirements?.length}
        >
          {analyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing Gaps...
            </>
          ) : (
            "Run Gap Analysis"
          )}
        </Button>

        {analysisResult && (
          <div className="space-y-4">
            {/* Coverage Statistics */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Content Coverage</span>
                  <span className={`text-2xl font-bold ${getCoverageColor(analysisResult.statistics.coveragePercent)}`}>
                    {analysisResult.statistics.coveragePercent}%
                  </span>
                </div>
                <Progress value={analysisResult.statistics.coveragePercent} className="h-2" />
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <div className="text-muted-foreground">Total</div>
                    <div className="font-semibold">{analysisResult.statistics.totalRequirements}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Covered</div>
                    <div className="font-semibold text-green-600">
                      {analysisResult.statistics.requirementsWithContent}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Missing</div>
                    <div className="font-semibold text-red-600">
                      {analysisResult.statistics.requirementsMissingContent}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Executive Summary */}
            {analysisResult.summary && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{analysisResult.summary}</AlertDescription>
              </Alert>
            )}

            {/* Recommendations */}
            {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysisResult.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Gap Details */}
            {analysisResult.gapAnalysis.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Content Gaps ({analysisResult.gapAnalysis.length})
                </h3>
                <ScrollArea className="h-[400px] rounded-md border">
                  <div className="p-4 space-y-3">
                    {analysisResult.gapAnalysis.map((gap, idx) => (
                      <Card key={idx} className="bg-muted/30">
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{gap.requirementId}</Badge>
                                {gap.category && (
                                  <Badge variant="secondary">{gap.category}</Badge>
                                )}
                              </div>
                              <p className="text-sm">{gap.requirementText}</p>
                            </div>
                          </div>

                          {gap.suggestedBlocks.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                AI-Suggested Content Blocks (click to accept):
                              </p>
                              {gap.suggestedBlocks.map((block, blockIdx) => {
                                const isAccepted = acceptedSuggestions[gap.requirementId] === block.blockId;
                                return (
                                  <TooltipProvider key={blockIdx}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div 
                                          className={`flex items-start gap-2 p-2 bg-background rounded border cursor-pointer transition-all hover:border-primary ${isAccepted ? 'border-green-500 bg-green-50' : 'border-transparent'}`}
                                          onClick={() => !isAccepted && handleAcceptSuggestion(gap.requirementId, block)}
                                        >
                                          <Badge 
                                            variant={block.matchScore >= 70 ? "default" : "secondary"}
                                            className="flex-shrink-0"
                                          >
                                            {block.matchScore}%
                                          </Badge>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <p className="text-sm font-medium truncate">{block.blockTitle}</p>
                                              {getConfidenceBadge(block.confidence)}
                                              {block.usageCount && block.usageCount > 0 && (
                                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                                  <History className="h-3 w-3" />
                                                  Used {block.usageCount}x
                                                </Badge>
                                              )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">{block.reason}</p>
                                            {block.previousCategories && block.previousCategories.length > 0 && (
                                              <p className="text-xs text-muted-foreground mt-1">
                                                Previously used for: {block.previousCategories.join(', ')}
                                              </p>
                                            )}
                                          </div>
                                          {isAccepted ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                          ) : (
                                            <ThumbsUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{isAccepted ? 'Already mapped to this requirement' : 'Click to map this block to the requirement'}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>
                          ) : (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                No matching content blocks found - new content needed
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
