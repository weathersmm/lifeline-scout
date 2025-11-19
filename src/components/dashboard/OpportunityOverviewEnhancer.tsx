import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Globe, FileText, Sparkles } from "lucide-react";
import { Opportunity } from "@/types/opportunity";
import { Textarea } from "@/components/ui/textarea";

interface OpportunityOverviewEnhancerProps {
  opportunityId: string;
  opportunity: Opportunity;
  onUpdate?: () => void;
}

export function OpportunityOverviewEnhancer({ opportunityId, opportunity, onUpdate }: OpportunityOverviewEnhancerProps) {
  const { toast } = useToast();
  const [enhancing, setEnhancing] = useState(false);
  const [enhancedOverview, setEnhancedOverview] = useState("");

  const enhanceOverview = async () => {
    setEnhancing(true);
    try {
      // Parse any uploaded documents if available
      let documentInsights = "";
      if (opportunity.documents && opportunity.documents.length > 0) {
        toast({
          title: "Analyzing documents...",
          description: "Extracting requirements from uploaded RFP documents",
        });

        const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-opportunity-document', {
          body: { 
            opportunityId,
            documentUrls: opportunity.documents.map((d: any) => d.url)
          }
        });

        if (!parseError && parseData?.insights) {
          documentInsights = parseData.insights;
        }
      }

      // Generate enhanced overview using AI with web search context
      toast({
        title: "Enhancing overview...",
        description: "Combining document analysis with web research of official sources",
      });

      const { data: functionData, error: functionError } = await supabase.functions.invoke('enhance-opportunity-overview', {
        body: {
          opportunity: {
            title: opportunity.title,
            agency: opportunity.agency,
            summary: opportunity.summary,
            link: opportunity.link,
            geography: `${opportunity.geography.city || ''}, ${opportunity.geography.county || ''}, ${opportunity.geography.state}`.replace(/^,\s*/, ''),
            serviceTags: opportunity.serviceTags.join(', ')
          },
          documentInsights
        }
      });

      if (functionError) throw functionError;

      setEnhancedOverview(functionData.enhancedOverview);
      
      toast({
        title: "Overview enhanced",
        description: "AI has enriched the opportunity overview with official source intelligence",
      });
    } catch (error: any) {
      console.error("Error enhancing overview:", error);
      toast({
        title: "Error enhancing overview",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEnhancing(false);
    }
  };

  const saveEnhancedOverview = async () => {
    try {
      const { error } = await supabase
        .from("opportunities")
        .update({ 
          summary: enhancedOverview,
          lifecycle_notes: `${opportunity.lifecycleNotes || ''}\n\nAI-Enhanced Overview Generated: ${new Date().toISOString()}`
        })
        .eq("id", opportunityId);

      if (error) throw error;

      toast({
        title: "Overview saved",
        description: "Enhanced overview has been saved to the opportunity",
      });

      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error saving overview",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI-Enhanced Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Combine document parsing and web research to create a comprehensive opportunity overview with official source intelligence.
        </p>
        
        <div className="flex gap-2">
          <Button onClick={enhanceOverview} disabled={enhancing} className="flex-1">
            {enhancing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <FileText className="mr-2 h-4 w-4" />
            Parse Documents
          </Button>
          <Button onClick={enhanceOverview} disabled={enhancing} variant="outline" className="flex-1">
            {enhancing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Globe className="mr-2 h-4 w-4" />
            Web Search
          </Button>
          <Button onClick={enhanceOverview} disabled={enhancing} className="flex-1">
            {enhancing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Sparkles className="mr-2 h-4 w-4" />
            Enhance All
          </Button>
        </div>

        {enhancing && (
          <div className="text-center py-8">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">
              Analyzing documents and researching official sources...
            </p>
          </div>
        )}

        {enhancedOverview && (
          <div className="space-y-3">
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-semibold text-sm mb-2">Enhanced Overview</h4>
              <Textarea
                value={enhancedOverview}
                onChange={(e) => setEnhancedOverview(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={saveEnhancedOverview} className="w-full">
              Save Enhanced Overview
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}