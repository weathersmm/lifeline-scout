import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, Download } from "lucide-react";
import { Opportunity } from "@/types/opportunity";

interface CapturePlanGeneratorProps {
  opportunityId: string;
  opportunity: Opportunity;
}

export function CapturePlanGenerator({ opportunityId, opportunity }: CapturePlanGeneratorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [capturePlan, setCapturePlan] = useState<string>("");

  const generateCapturePlan = async () => {
    setGenerating(true);
    try {
      // Fetch all analysis data
      const [swotData, ptwData, gonogoData] = await Promise.all([
        supabase.from("competitive_assessments").select("*").eq("opportunity_id", opportunityId).maybeSingle(),
        supabase.from("ptw_analyses").select("*").eq("opportunity_id", opportunityId).maybeSingle(),
        supabase.from("go_no_go_evaluations").select("*").eq("opportunity_id", opportunityId).maybeSingle()
      ]);

      if (swotData.error || ptwData.error || gonogoData.error) {
        throw new Error("Missing required analysis data. Please complete SWOT, PTW, and Go/No-Go evaluations first.");
      }

      // Generate capture plan using Lovable AI
      const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-capture-plan', {
        body: {
          opportunity: {
            title: opportunity.title,
            agency: opportunity.agency,
            summary: opportunity.summary,
            estimated_value: `$${opportunity.estimatedValue?.min?.toLocaleString()} - $${opportunity.estimatedValue?.max?.toLocaleString()}`,
            proposal_due: opportunity.keyDates.proposalDue,
            geography: `${opportunity.geography.city || ''}, ${opportunity.geography.county || ''}, ${opportunity.geography.state}`.replace(/^,\s*/, ''),
            service_tags: opportunity.serviceTags.join(', ')
          },
          swot: {
            strengths: swotData.data?.strengths || [],
            weaknesses: swotData.data?.weaknesses || [],
            opportunities: swotData.data?.opportunities || [],
            threats: swotData.data?.threats || [],
            strategic_recommendation: swotData.data?.strategic_recommendation || '',
            competitive_advantage: swotData.data?.competitive_advantage || '',
            competitors: swotData.data?.competitors || []
          },
          ptw: {
            recommended_price: ptwData.data?.recommended_price || 0,
            market_average: ptwData.data?.market_average_price || 0,
            win_probability: ptwData.data?.win_probability_percent || 0,
            pricing_strategy: ptwData.data?.pricing_strategy || '',
            price_justification: ptwData.data?.price_justification || ''
          },
          gonogo: {
            total_score: gonogoData.data?.total_score || 0,
            recommendation: gonogoData.data?.recommendation || '',
            executive_summary: gonogoData.data?.executive_summary || '',
            decision_rationale: gonogoData.data?.decision_rationale || '',
            scores: {
              strategic_fit: gonogoData.data?.strategic_fit_score || 0,
              past_performance: gonogoData.data?.past_performance_score || 0,
              reality_check: gonogoData.data?.reality_check_score || 0,
              contract_approach: gonogoData.data?.contract_approach_score || 0,
              competitor_analysis: gonogoData.data?.competitor_analysis_score || 0,
              timeline_feasibility: gonogoData.data?.timeline_feasibility_score || 0,
              roi_potential: gonogoData.data?.roi_potential_score || 0
            }
          }
        }
      });

      if (functionError) throw functionError;

      setCapturePlan(functionData.capturePlan);
      
      toast({
        title: "Capture plan generated",
        description: "Your comprehensive BD strategy document is ready",
      });
    } catch (error: any) {
      console.error("Error generating capture plan:", error);
      toast({
        title: "Error generating capture plan",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadCapturePlan = () => {
    const blob = new Blob([capturePlan], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capture-plan-${opportunity.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Capture Plan Generator</h2>
          <p className="text-sm text-muted-foreground">Comprehensive BD strategy document with executive summary</p>
        </div>
        <div className="flex gap-2">
          {capturePlan && (
            <Button variant="outline" onClick={downloadCapturePlan}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          )}
          <Button onClick={generateCapturePlan} disabled={generating}>
            {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <FileText className="mr-2 h-4 w-4" />
            Generate Capture Plan
          </Button>
        </div>
      </div>

      {!capturePlan && !generating && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Capture Plan Generated</p>
              <p className="text-sm mb-4">
                Generate a comprehensive capture plan that combines your SWOT analysis, PTW positioning, and Go/No-Go evaluation into a strategic BD document.
              </p>
              <p className="text-xs text-muted-foreground">
                Note: Complete all three analyses before generating the capture plan.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {generating && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium mb-2">Generating Capture Plan...</p>
              <p className="text-sm text-muted-foreground">
                Analyzing SWOT, PTW, and Go/No-Go data to create your comprehensive BD strategy document
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {capturePlan && (
        <Card>
          <CardHeader>
            <CardTitle>Capture Plan Document</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg text-sm">
                {capturePlan}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}