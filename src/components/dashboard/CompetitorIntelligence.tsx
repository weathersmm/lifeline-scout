import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, TrendingUp, Building, Target, DollarSign, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CompetitorIntelligenceGatherer } from "./CompetitorIntelligenceGatherer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIFeatureErrorBoundary } from "@/components/AIFeatureErrorBoundary";

interface Competitor {
  id: string;
  competitor_name: string;
  company_description: string;
  headquarters: string;
  website: string;
  total_wins: number;
  total_losses: number;
  total_bids: number;
  win_rate_percent: number;
  avg_price_position: string;
  key_strengths: string[];
  key_weaknesses: string[];
  primary_markets: string[];
  service_specialties: string[];
}

export function CompetitorIntelligence() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null);
  
  const [formData, setFormData] = useState({
    competitor_name: "",
    company_description: "",
    headquarters: "",
    website: "",
    avg_price_position: "Medium",
    key_strengths: "",
    key_weaknesses: "",
    primary_markets: "",
    service_specialties: ""
  });

  useEffect(() => {
    loadCompetitors();
  }, []);

  const loadCompetitors = async () => {
    try {
      const { data, error } = await supabase
        .from("competitor_intelligence")
        .select("*")
        .order("competitor_name");

      if (error) throw error;
      setCompetitors(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading competitors",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        competitor_name: formData.competitor_name,
        company_description: formData.company_description,
        headquarters: formData.headquarters,
        website: formData.website,
        avg_price_position: formData.avg_price_position,
        key_strengths: formData.key_strengths.split('\n').filter(s => s.trim()),
        key_weaknesses: formData.key_weaknesses.split('\n').filter(s => s.trim()),
        primary_markets: formData.primary_markets.split(',').map(m => m.trim()).filter(m => m),
        service_specialties: formData.service_specialties.split(',').map(s => s.trim()).filter(s => s)
      };

      if (editingCompetitor) {
        const { error } = await supabase
          .from("competitor_intelligence")
          .update(payload)
          .eq("id", editingCompetitor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("competitor_intelligence")
          .insert(payload);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Competitor ${editingCompetitor ? 'updated' : 'added'} successfully`,
      });

      setDialogOpen(false);
      resetForm();
      loadCompetitors();
    } catch (error: any) {
      toast({
        title: "Error saving competitor",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      competitor_name: "",
      company_description: "",
      headquarters: "",
      website: "",
      avg_price_position: "Medium",
      key_strengths: "",
      key_weaknesses: "",
      primary_markets: "",
      service_specialties: ""
    });
    setEditingCompetitor(null);
  };

  const handleEdit = (competitor: Competitor) => {
    setEditingCompetitor(competitor);
    setFormData({
      competitor_name: competitor.competitor_name,
      company_description: competitor.company_description || "",
      headquarters: competitor.headquarters || "",
      website: competitor.website || "",
      avg_price_position: competitor.avg_price_position || "Medium",
      key_strengths: competitor.key_strengths?.join('\n') || "",
      key_weaknesses: competitor.key_weaknesses?.join('\n') || "",
      primary_markets: competitor.primary_markets?.join(', ') || "",
      service_specialties: competitor.service_specialties?.join(', ') || ""
    });
    setDialogOpen(true);
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
          <h2 className="text-2xl font-bold text-foreground">Competitor Intelligence Repository</h2>
          <p className="text-sm text-muted-foreground">Track competitor history, pricing, and performance</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Competitor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCompetitor ? "Edit" : "Add"} Competitor</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="ai">
                  <Search className="mr-2 h-4 w-4" />
                  AI Research
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="manual" className="space-y-4 mt-4">
                <div>
                  <Label>Competitor Name *</Label>
                  <Input
                    value={formData.competitor_name}
                    onChange={(e) => setFormData({ ...formData, competitor_name: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.company_description}
                    onChange={(e) => setFormData({ ...formData, company_description: e.target.value })}
                    placeholder="Brief company description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Headquarters</Label>
                    <Input
                      value={formData.headquarters}
                      onChange={(e) => setFormData({ ...formData, headquarters: e.target.value })}
                      placeholder="City, State"
                    />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div>
                  <Label>Average Price Position</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.avg_price_position}
                    onChange={(e) => setFormData({ ...formData, avg_price_position: e.target.value })}
                  >
                    <option>Low</option>
                    <option>Medium-Low</option>
                    <option>Medium</option>
                    <option>Medium-High</option>
                    <option>High</option>
                  </select>
                </div>
                <div>
                  <Label>Key Strengths (one per line)</Label>
                  <Textarea
                    value={formData.key_strengths}
                    onChange={(e) => setFormData({ ...formData, key_strengths: e.target.value })}
                    placeholder="Enter each strength on a new line"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Key Weaknesses (one per line)</Label>
                  <Textarea
                    value={formData.key_weaknesses}
                    onChange={(e) => setFormData({ ...formData, key_weaknesses: e.target.value })}
                    placeholder="Enter each weakness on a new line"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Primary Markets (comma-separated)</Label>
                  <Input
                    value={formData.primary_markets}
                    onChange={(e) => setFormData({ ...formData, primary_markets: e.target.value })}
                    placeholder="California, Texas, Florida"
                  />
                </div>
                <div>
                  <Label>Service Specialties (comma-separated)</Label>
                  <Input
                    value={formData.service_specialties}
                    onChange={(e) => setFormData({ ...formData, service_specialties: e.target.value })}
                    placeholder="EMS 911, BLS, ALS"
                  />
                </div>
                <Button onClick={handleSave} className="w-full">
                  {editingCompetitor ? 'Update' : 'Add'} Competitor
                </Button>
              </TabsContent>
              
              <TabsContent value="ai" className="mt-4">
                <AIFeatureErrorBoundary featureName="AI Competitor Intelligence Gatherer">
                  <CompetitorIntelligenceGatherer
                    competitorId={editingCompetitor?.id}
                    competitorName={editingCompetitor?.competitor_name}
                    onComplete={() => {
                      setDialogOpen(false);
                      resetForm();
                      loadCompetitors();
                    }}
                  />
                </AIFeatureErrorBoundary>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Competitors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{competitors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {competitors.length > 0
                ? Math.round(competitors.reduce((sum, c) => sum + (c.win_rate_percent || 0), 0) / competitors.length)
                : 0}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Tracked Bids</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {competitors.reduce((sum, c) => sum + (c.total_bids || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Market Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(competitors.flatMap(c => c.primary_markets || [])).size} Markets
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Competitor Directory</CardTitle>
          <CardDescription>Historical intelligence and performance tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competitor</TableHead>
                <TableHead>Win Rate</TableHead>
                <TableHead>Bids Tracked</TableHead>
                <TableHead>Price Position</TableHead>
                <TableHead>Markets</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitors.map((comp) => (
                <TableRow key={comp.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{comp.competitor_name}</p>
                      {comp.headquarters && (
                        <p className="text-xs text-muted-foreground">{comp.headquarters}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={comp.win_rate_percent > 50 ? "destructive" : "secondary"}>
                        {comp.win_rate_percent?.toFixed(0) || 0}%
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({comp.total_wins}W / {comp.total_losses}L)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{comp.total_bids}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{comp.avg_price_position}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      {comp.primary_markets?.slice(0, 2).join(', ')}
                      {comp.primary_markets && comp.primary_markets.length > 2 && '...'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(comp)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}