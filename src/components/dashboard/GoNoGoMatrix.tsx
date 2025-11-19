import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface GoNoGoMatrixProps {
  opportunityId: string;
}

interface GoNoGoEvaluation {
  id?: string;
  strategic_fit_score: number;
  strategic_fit_notes: string;
  past_performance_score: number;
  past_performance_notes: string;
  reality_check_score: number;
  reality_check_notes: string;
  contract_approach_score: number;
  contract_approach_notes: string;
  competitor_analysis_score: number;
  competitor_analysis_notes: string;
  timeline_feasibility_score: number;
  timeline_feasibility_notes: string;
  roi_potential_score: number;
  roi_potential_notes: string;
  total_score: number;
  recommendation: "GO" | "NO-GO" | "CONDITIONAL" | null;
  executive_summary: string;
  decision_rationale: string;
}

const CRITERIA = [
  {
    key: "strategic_fit",
    title: "Strategic Fit",
    question: "Does this opportunity align with our strategic goals and capabilities?",
  },
  {
    key: "past_performance",
    title: "Past Performance",
    question: "Do we have relevant past performance that demonstrates our qualifications?",
  },
  {
    key: "reality_check",
    title: "Reality Check",
    question: "Can we realistically deliver on all requirements with available resources?",
  },
  {
    key: "contract_approach",
    title: "Contract Approach",
    question: "Is the contract structure and terms favorable for our business model?",
  },
  {
    key: "competitor_analysis",
    title: "Competitor Analysis",
    question: "Do we have a competitive advantage against likely competitors?",
  },
  {
    key: "timeline_feasibility",
    title: "Timeline Feasibility",
    question: "Can we meet all proposal and performance deadlines?",
  },
  {
    key: "roi_potential",
    title: "ROI Potential",
    question: "Will this opportunity provide acceptable return on investment?",
  },
];

export function GoNoGoMatrix({ opportunityId }: GoNoGoMatrixProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [evaluation, setEvaluation] = useState<GoNoGoEvaluation>({
    strategic_fit_score: 3,
    strategic_fit_notes: "",
    past_performance_score: 3,
    past_performance_notes: "",
    reality_check_score: 3,
    reality_check_notes: "",
    contract_approach_score: 3,
    contract_approach_notes: "",
    competitor_analysis_score: 3,
    competitor_analysis_notes: "",
    timeline_feasibility_score: 3,
    timeline_feasibility_notes: "",
    roi_potential_score: 3,
    roi_potential_notes: "",
    total_score: 21,
    recommendation: null,
    executive_summary: "",
    decision_rationale: "",
  });

  useEffect(() => {
    loadEvaluation();
  }, [opportunityId]);

  useEffect(() => {
    calculateTotalScore();
  }, [
    evaluation.strategic_fit_score,
    evaluation.past_performance_score,
    evaluation.reality_check_score,
    evaluation.contract_approach_score,
    evaluation.competitor_analysis_score,
    evaluation.timeline_feasibility_score,
    evaluation.roi_potential_score,
  ]);

  const loadEvaluation = async () => {
    try {
      const { data, error } = await supabase
        .from("go_no_go_evaluations")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setEvaluation({
          ...data,
          recommendation: (data.recommendation as "GO" | "NO-GO" | "CONDITIONAL") || null
        });
      }
    } catch (error: any) {
      toast({
        title: "Error loading evaluation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalScore = () => {
    const total =
      evaluation.strategic_fit_score +
      evaluation.past_performance_score +
      evaluation.reality_check_score +
      evaluation.contract_approach_score +
      evaluation.competitor_analysis_score +
      evaluation.timeline_feasibility_score +
      evaluation.roi_potential_score;

    let recommendation: "GO" | "NO-GO" | "CONDITIONAL";
    if (total >= 28) recommendation = "GO";
    else if (total >= 21) recommendation = "CONDITIONAL";
    else recommendation = "NO-GO";

    setEvaluation((prev) => ({
      ...prev,
      total_score: total,
      recommendation,
    }));
  };

  const saveEvaluation = async () => {
    setSaving(true);
    try {
      const payload = {
        opportunity_id: opportunityId,
        ...evaluation,
      };

      if (evaluation.id) {
        const { error } = await supabase
          .from("go_no_go_evaluations")
          .update(payload)
          .eq("id", evaluation.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("go_no_go_evaluations")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setEvaluation({ ...evaluation, id: data.id });
      }

      toast({
        title: "Evaluation saved",
        description: "Go/No-Go evaluation has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving evaluation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateScore = (criteriaKey: string, score: number) => {
    setEvaluation((prev) => ({
      ...prev,
      [`${criteriaKey}_score`]: score,
    }));
  };

  const updateNotes = (criteriaKey: string, notes: string) => {
    setEvaluation((prev) => ({
      ...prev,
      [`${criteriaKey}_notes`]: notes,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getRecommendationColor = () => {
    if (evaluation.recommendation === "GO") return "text-green-500";
    if (evaluation.recommendation === "NO-GO") return "text-red-500";
    return "text-amber-500";
  };

  const getRecommendationIcon = () => {
    if (evaluation.recommendation === "GO") return <CheckCircle2 className="h-8 w-8" />;
    if (evaluation.recommendation === "NO-GO") return <XCircle className="h-8 w-8" />;
    return <AlertCircle className="h-8 w-8" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Go/No-Go Decision Matrix</h2>
          <p className="text-sm text-muted-foreground">Gate 2 evaluation criteria (1-5 scoring)</p>
        </div>
        <Button onClick={saveEvaluation} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Evaluation
        </Button>
      </div>

      <Card className="border-2">
        <CardHeader className="text-center">
          <div className={`flex items-center justify-center gap-3 ${getRecommendationColor()}`}>
            {getRecommendationIcon()}
            <div>
              <CardTitle className="text-3xl">{evaluation.recommendation || "PENDING"}</CardTitle>
              <CardDescription>
                Total Score: {evaluation.total_score} / 35
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between text-sm text-muted-foreground px-4">
            <span>28+ = GO</span>
            <span>21-27 = CONDITIONAL</span>
            <span>&lt;21 = NO-GO</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {CRITERIA.map((criteria) => {
          const scoreKey = `${criteria.key}_score` as keyof GoNoGoEvaluation;
          const notesKey = `${criteria.key}_notes` as keyof GoNoGoEvaluation;
          const score = evaluation[scoreKey] as number;
          const notes = evaluation[notesKey] as string;

          return (
            <Card key={criteria.key}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{criteria.title}</CardTitle>
                    <CardDescription className="mt-1">{criteria.question}</CardDescription>
                  </div>
                  <Badge
                    variant={score >= 4 ? "default" : score >= 3 ? "secondary" : "destructive"}
                    className="ml-4 text-lg px-4 py-2"
                  >
                    {score} / 5
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Score (1 = Poor, 5 = Excellent)</Label>
                  <Slider
                    value={[score]}
                    onValueChange={(values) => updateScore(criteria.key, values[0])}
                    min={1}
                    max={5}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>1 - Poor</span>
                    <span>2 - Fair</span>
                    <span>3 - Good</span>
                    <span>4 - Very Good</span>
                    <span>5 - Excellent</span>
                  </div>
                </div>
                <div>
                  <Label>Notes & Justification</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => updateNotes(criteria.key, e.target.value)}
                    placeholder="Provide rationale for this score..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Decision Summary</Label>
            <Textarea
              value={evaluation.executive_summary}
              onChange={(e) => setEvaluation({ ...evaluation, executive_summary: e.target.value })}
              placeholder="Summarize the overall opportunity and recommendation..."
              rows={4}
            />
          </div>
          <div>
            <Label>Decision Rationale</Label>
            <Textarea
              value={evaluation.decision_rationale}
              onChange={(e) => setEvaluation({ ...evaluation, decision_rationale: e.target.value })}
              placeholder="Explain the key factors driving the GO/NO-GO/CONDITIONAL recommendation..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}