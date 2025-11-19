import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X, TrendingUp, TrendingDown, AlertTriangle, Target } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CompetitiveAssessmentDashboardProps {
  opportunityId: string;
}

interface Competitor {
  name: string;
  strengths: string;
  weaknesses: string;
  winProbability: number;
  pricePosition: string;
}

interface Assessment {
  id: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  competitors: Competitor[];
  strategic_recommendation: string;
  competitive_advantage: string;
  risk_mitigation: string;
}

export function CompetitiveAssessmentDashboard({ opportunityId }: CompetitiveAssessmentDashboardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  
  const [newStrength, setNewStrength] = useState("");
  const [newWeakness, setNewWeakness] = useState("");
  const [newOpportunity, setNewOpportunity] = useState("");
  const [newThreat, setNewThreat] = useState("");
  
  const [newCompetitor, setNewCompetitor] = useState<Competitor>({
    name: "",
    strengths: "",
    weaknesses: "",
    winProbability: 50,
    pricePosition: "Unknown"
  });

  useEffect(() => {
    loadAssessment();
  }, [opportunityId]);

  const loadAssessment = async () => {
    try {
      const { data, error } = await supabase
        .from("competitive_assessments")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAssessment({
          ...data,
          competitors: Array.isArray(data.competitors) ? data.competitors as unknown as Competitor[] : []
        });
      }
    } catch (error: any) {
      toast({
        title: "Error loading assessment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveAssessment = async () => {
    setSaving(true);
    try {
      const payload = {
        opportunity_id: opportunityId,
        strengths: assessment?.strengths || [],
        weaknesses: assessment?.weaknesses || [],
        opportunities: assessment?.opportunities || [],
        threats: assessment?.threats || [],
        competitors: (assessment?.competitors || []) as any,
        strategic_recommendation: assessment?.strategic_recommendation || "",
        competitive_advantage: assessment?.competitive_advantage || "",
        risk_mitigation: assessment?.risk_mitigation || ""
      };

      if (assessment?.id) {
        const { error } = await supabase
          .from("competitive_assessments")
          .update(payload)
          .eq("id", assessment.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("competitive_assessments")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setAssessment({ ...payload, id: data.id } as Assessment);
      }

      toast({
        title: "Assessment saved",
        description: "Competitive assessment has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving assessment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addItem = (type: 'strengths' | 'weaknesses' | 'opportunities' | 'threats', value: string) => {
    if (!value.trim()) return;
    setAssessment(prev => ({
      ...prev!,
      [type]: [...(prev?.[type] || []), value.trim()]
    }));
    if (type === 'strengths') setNewStrength("");
    if (type === 'weaknesses') setNewWeakness("");
    if (type === 'opportunities') setNewOpportunity("");
    if (type === 'threats') setNewThreat("");
  };

  const removeItem = (type: 'strengths' | 'weaknesses' | 'opportunities' | 'threats', index: number) => {
    setAssessment(prev => ({
      ...prev!,
      [type]: prev![type].filter((_, i) => i !== index)
    }));
  };

  const addCompetitor = () => {
    if (!newCompetitor.name.trim()) return;
    setAssessment(prev => ({
      ...prev!,
      competitors: [...(prev?.competitors || []), newCompetitor]
    }));
    setNewCompetitor({
      name: "",
      strengths: "",
      weaknesses: "",
      winProbability: 50,
      pricePosition: "Unknown"
    });
  };

  const removeCompetitor = (index: number) => {
    setAssessment(prev => ({
      ...prev!,
      competitors: prev!.competitors.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Competitive Assessment</h2>
          <p className="text-sm text-muted-foreground">SWOT analysis and competitor benchmarking</p>
        </div>
        <Button onClick={saveAssessment} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Assessment
        </Button>
      </div>

      <Tabs defaultValue="swot" className="w-full">
        <TabsList>
          <TabsTrigger value="swot">SWOT Analysis</TabsTrigger>
          <TabsTrigger value="competitors">Competitor Benchmarking</TabsTrigger>
          <TabsTrigger value="strategy">Strategic Positioning</TabsTrigger>
        </TabsList>

        <TabsContent value="swot" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assessment?.strengths?.map((item, index) => (
                  <div key={index} className="flex items-start justify-between gap-2 p-2 bg-muted/50 rounded">
                    <p className="text-sm flex-1">{item}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem('strengths', index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add strength..."
                    value={newStrength}
                    onChange={(e) => setNewStrength(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addItem('strengths', newStrength)}
                  />
                  <Button size="sm" onClick={() => addItem('strengths', newStrength)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Weaknesses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  Weaknesses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assessment?.weaknesses?.map((item, index) => (
                  <div key={index} className="flex items-start justify-between gap-2 p-2 bg-muted/50 rounded">
                    <p className="text-sm flex-1">{item}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem('weaknesses', index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add weakness..."
                    value={newWeakness}
                    onChange={(e) => setNewWeakness(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addItem('weaknesses', newWeakness)}
                  />
                  <Button size="sm" onClick={() => addItem('weaknesses', newWeakness)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assessment?.opportunities?.map((item, index) => (
                  <div key={index} className="flex items-start justify-between gap-2 p-2 bg-muted/50 rounded">
                    <p className="text-sm flex-1">{item}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem('opportunities', index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add opportunity..."
                    value={newOpportunity}
                    onChange={(e) => setNewOpportunity(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addItem('opportunities', newOpportunity)}
                  />
                  <Button size="sm" onClick={() => addItem('opportunities', newOpportunity)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Threats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Threats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assessment?.threats?.map((item, index) => (
                  <div key={index} className="flex items-start justify-between gap-2 p-2 bg-muted/50 rounded">
                    <p className="text-sm flex-1">{item}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem('threats', index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add threat..."
                    value={newThreat}
                    onChange={(e) => setNewThreat(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addItem('threats', newThreat)}
                  />
                  <Button size="sm" onClick={() => addItem('threats', newThreat)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Competitor Benchmarking Matrix</CardTitle>
              <CardDescription>Track and compare key competitors for this opportunity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competitor</TableHead>
                    <TableHead>Strengths</TableHead>
                    <TableHead>Weaknesses</TableHead>
                    <TableHead>Win Probability</TableHead>
                    <TableHead>Price Position</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessment?.competitors?.map((comp, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{comp.name}</TableCell>
                      <TableCell className="text-sm">{comp.strengths}</TableCell>
                      <TableCell className="text-sm">{comp.weaknesses}</TableCell>
                      <TableCell>
                        <Badge variant={comp.winProbability > 50 ? "destructive" : "secondary"}>
                          {comp.winProbability}%
                        </Badge>
                      </TableCell>
                      <TableCell>{comp.pricePosition}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCompetitor(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                <h4 className="font-semibold text-sm">Add Competitor</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Competitor Name</Label>
                    <Input
                      value={newCompetitor.name}
                      onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <Label>Price Position</Label>
                    <Input
                      value={newCompetitor.pricePosition}
                      onChange={(e) => setNewCompetitor({ ...newCompetitor, pricePosition: e.target.value })}
                      placeholder="Low/Medium/High"
                    />
                  </div>
                  <div>
                    <Label>Strengths</Label>
                    <Input
                      value={newCompetitor.strengths}
                      onChange={(e) => setNewCompetitor({ ...newCompetitor, strengths: e.target.value })}
                      placeholder="Key strengths"
                    />
                  </div>
                  <div>
                    <Label>Weaknesses</Label>
                    <Input
                      value={newCompetitor.weaknesses}
                      onChange={(e) => setNewCompetitor({ ...newCompetitor, weaknesses: e.target.value })}
                      placeholder="Key weaknesses"
                    />
                  </div>
                  <div>
                    <Label>Win Probability (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={newCompetitor.winProbability}
                      onChange={(e) => setNewCompetitor({ ...newCompetitor, winProbability: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <Button onClick={addCompetitor} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Competitor
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategic Positioning</CardTitle>
              <CardDescription>Define competitive strategy and recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Competitive Advantage</Label>
                <Textarea
                  value={assessment?.competitive_advantage || ""}
                  onChange={(e) => setAssessment(prev => ({ ...prev!, competitive_advantage: e.target.value }))}
                  placeholder="What makes us uniquely qualified to win this opportunity?"
                  rows={4}
                />
              </div>
              <div>
                <Label>Strategic Recommendation</Label>
                <Textarea
                  value={assessment?.strategic_recommendation || ""}
                  onChange={(e) => setAssessment(prev => ({ ...prev!, strategic_recommendation: e.target.value }))}
                  placeholder="Recommended positioning strategy and key messages"
                  rows={4}
                />
              </div>
              <div>
                <Label>Risk Mitigation</Label>
                <Textarea
                  value={assessment?.risk_mitigation || ""}
                  onChange={(e) => setAssessment(prev => ({ ...prev!, risk_mitigation: e.target.value }))}
                  placeholder="How to address weaknesses and competitive threats"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}