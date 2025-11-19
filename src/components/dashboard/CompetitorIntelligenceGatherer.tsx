import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Globe } from "lucide-react";

interface CompetitorIntelligenceGathererProps {
  competitorId?: string;
  competitorName?: string;
  onComplete?: () => void;
}

export const CompetitorIntelligenceGatherer = ({ 
  competitorId, 
  competitorName: initialName,
  onComplete 
}: CompetitorIntelligenceGathererProps) => {
  const { toast } = useToast();
  const [isGathering, setIsGathering] = useState(false);
  const [competitorName, setCompetitorName] = useState(initialName || "");
  const [sources, setSources] = useState("");
  const [result, setResult] = useState<any>(null);

  const gatherIntelligence = async () => {
    if (!competitorName.trim()) {
      toast({
        title: "Competitor name required",
        description: "Please enter a competitor name to research",
        variant: "destructive",
      });
      return;
    }

    setIsGathering(true);
    setResult(null);

    try {
      const sourceList = sources
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const { data, error } = await supabase.functions.invoke('gather-competitor-intelligence', {
        body: { 
          competitorId,
          competitorName: competitorName.trim(),
          sources: sourceList.length > 0 ? sourceList : undefined
        }
      });

      if (error) throw error;

      setResult(data);
      
      toast({
        title: "Intelligence gathered",
        description: `Successfully updated competitive profile for ${competitorName}`,
      });

      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error('Error gathering intelligence:', error);
      toast({
        title: "Intelligence gathering failed",
        description: error.message || "Failed to gather competitive intelligence",
        variant: "destructive",
      });
    } finally {
      setIsGathering(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Gather Competitive Intelligence
        </CardTitle>
        <CardDescription>
          Automatically research and analyze competitor information from public sources
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="competitor-name">Competitor Name</Label>
          <Input
            id="competitor-name"
            placeholder="e.g., AMR, Falck, Global Medical Response"
            value={competitorName}
            onChange={(e) => setCompetitorName(e.target.value)}
            disabled={isGathering || !!initialName}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sources">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Additional Sources (Optional)
            </div>
          </Label>
          <Textarea
            id="sources"
            placeholder="Enter competitor websites, press release pages, or news sources (one per line)&#10;e.g.,&#10;amr.net&#10;falck.com/news"
            value={sources}
            onChange={(e) => setSources(e.target.value)}
            disabled={isGathering}
            rows={4}
            className="font-mono text-sm"
          />
          <p className="text-sm text-muted-foreground">
            AI will search these sites plus general web sources for recent news, awards, and company information
          </p>
        </div>

        <Button
          onClick={gatherIntelligence}
          disabled={isGathering || !competitorName.trim()}
          className="w-full"
        >
          {isGathering ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gathering Intelligence...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Gather Intelligence
            </>
          )}
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
            <h4 className="font-semibold text-sm">Intelligence Gathered:</h4>
            <div className="space-y-2 text-sm">
              {result.intelligence?.company_description && (
                <div>
                  <span className="font-medium">Overview:</span>
                  <p className="text-muted-foreground mt-1">{result.intelligence.company_description}</p>
                </div>
              )}
              {result.intelligence?.key_strengths && result.intelligence.key_strengths.length > 0 && (
                <div>
                  <span className="font-medium">Key Strengths:</span>
                  <ul className="list-disc list-inside text-muted-foreground mt-1">
                    {result.intelligence.key_strengths.map((strength: string, idx: number) => (
                      <li key={idx}>{strength}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.intelligence?.recent_wins && result.intelligence.recent_wins.length > 0 && (
                <div>
                  <span className="font-medium">Recent Wins:</span>
                  <ul className="list-disc list-inside text-muted-foreground mt-1">
                    {result.intelligence.recent_wins.map((win: string, idx: number) => (
                      <li key={idx}>{win}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
