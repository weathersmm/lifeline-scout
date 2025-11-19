import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SuggestedBlock {
  blockId: string;
  blockTitle: string;
  matchScore: number;
  reason: string;
}

interface GapAnalysisResult {
  requirementId: string;
  requirementText: string;
  category?: string;
  suggestedBlocks: SuggestedBlock[];
}

interface RequirementGapAnalysisProps {
  opportunityId: string;
  requirements: any[];
  onAddBlock: (requirementId: string, blockId: string) => void;
}

export function RequirementGapAnalysis({ 
  opportunityId, 
  requirements,
  onAddBlock 
}: RequirementGapAnalysisProps) {
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisResult[]>([]);

  const runGapAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-requirement-gaps', {
        body: { 
          requirements: requirements.map(r => ({
            requirementId: r.requirementId,
            requirementText: r.requirementText,
            category: r.category,
            contentBlockIds: r.contentBlockIds || []
          })),
          opportunityId 
        }
      });

      if (error) throw error;

      setGapAnalysis(data.gapAnalysis || []);
      
      if (data.gapAnalysis.length === 0) {
        toast({
          title: "All requirements addressed",
          description: "No gaps found - all requirements have content assigned",
        });
      } else {
        toast({
          title: "Gap analysis complete",
          description: `Found ${data.gapAnalysis.length} unfilled requirements with suggestions`,
        });
      }
    } catch (error) {
      console.error('Gap analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Could not analyze requirement gaps",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddSuggestedBlock = (requirementId: string, blockId: string) => {
    onAddBlock(requirementId, blockId);
    toast({
      title: "Content block added",
      description: "Suggested content has been added to the requirement",
    });
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-orange-600";
  };

  const getMatchScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 60) return "Good Match";
    return "Moderate Match";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Requirement Gap Analysis</CardTitle>
            <CardDescription>
              Identify unfilled requirements and find the best matching content blocks
            </CardDescription>
          </div>
          <Button 
            onClick={runGapAnalysis} 
            disabled={analyzing}
          >
            {analyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {analyzing ? "Analyzing..." : "Run Analysis"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {gapAnalysis.length === 0 && !analyzing && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Click "Run Analysis" to identify gaps and get content suggestions for unfilled requirements
            </AlertDescription>
          </Alert>
        )}

        {gapAnalysis.length > 0 && (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              {gapAnalysis.map((gap) => (
                <Card key={gap.requirementId} className="border-orange-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{gap.requirementId}</Badge>
                          {gap.category && <Badge variant="secondary">{gap.category}</Badge>}
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            No Content
                          </Badge>
                        </div>
                        <CardTitle className="text-sm font-medium">
                          {gap.requirementText}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        Suggested Content Blocks
                      </div>
                      {gap.suggestedBlocks.map((suggestion, idx) => (
                        <div 
                          key={suggestion.blockId}
                          className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {idx + 1}. {suggestion.blockTitle}
                              </span>
                              <Badge 
                                variant="outline" 
                                className={getMatchScoreColor(suggestion.matchScore)}
                              >
                                {suggestion.matchScore}% {getMatchScoreLabel(suggestion.matchScore)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {suggestion.reason}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddSuggestedBlock(gap.requirementId, suggestion.blockId)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
