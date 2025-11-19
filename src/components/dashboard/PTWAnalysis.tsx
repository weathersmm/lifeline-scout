import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, TrendingUp, Calculator, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface PTWAnalysisProps {
  opportunityId: string;
}

interface CompetitorPrice {
  competitor: string;
  estimatedPrice: number;
  confidence: string;
}

interface PTWData {
  id?: string;
  our_estimated_price: number;
  competitor_prices: CompetitorPrice[];
  market_average_price: number;
  direct_costs: number;
  indirect_costs: number;
  overhead_rate: number;
  target_margin_percent: number;
  win_probability_percent: number;
  confidence_level: string;
  pricing_strategy: string;
  recommended_price: number;
  price_justification: string;
  risk_assessment: string;
}

export function PTWAnalysis({ opportunityId }: PTWAnalysisProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ptwData, setPtwData] = useState<PTWData>({
    our_estimated_price: 0,
    competitor_prices: [],
    market_average_price: 0,
    direct_costs: 0,
    indirect_costs: 0,
    overhead_rate: 0,
    target_margin_percent: 15,
    win_probability_percent: 0,
    confidence_level: "Medium",
    pricing_strategy: "",
    recommended_price: 0,
    price_justification: "",
    risk_assessment: ""
  });

  const [newCompPrice, setNewCompPrice] = useState<CompetitorPrice>({
    competitor: "",
    estimatedPrice: 0,
    confidence: "Medium"
  });

  useEffect(() => {
    loadPTWAnalysis();
  }, [opportunityId]);

  useEffect(() => {
    calculateMetrics();
  }, [
    ptwData.direct_costs,
    ptwData.indirect_costs,
    ptwData.overhead_rate,
    ptwData.target_margin_percent,
    ptwData.competitor_prices
  ]);

  const loadPTWAnalysis = async () => {
    try {
      const { data, error } = await supabase
        .from("ptw_analyses")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPtwData({
          ...data,
          competitor_prices: Array.isArray(data.competitor_prices) ? data.competitor_prices as unknown as CompetitorPrice[] : []
        });
      }
    } catch (error: any) {
      toast({
        title: "Error loading PTW analysis",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = () => {
    const totalCosts = ptwData.direct_costs + ptwData.indirect_costs;
    const overheadAmount = totalCosts * (ptwData.overhead_rate / 100);
    const costBase = totalCosts + overheadAmount;
    const targetMargin = costBase * (ptwData.target_margin_percent / 100);
    const recommendedPrice = costBase + targetMargin;

    const competitorPrices = ptwData.competitor_prices.map(cp => cp.estimatedPrice);
    const marketAvg = competitorPrices.length > 0
      ? competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length
      : 0;

    let winProb = 50;
    if (marketAvg > 0 && recommendedPrice > 0) {
      const priceRatio = recommendedPrice / marketAvg;
      if (priceRatio < 0.85) winProb = 85;
      else if (priceRatio < 0.95) winProb = 75;
      else if (priceRatio < 1.05) winProb = 60;
      else if (priceRatio < 1.15) winProb = 45;
      else winProb = 30;
    }

    setPtwData(prev => ({
      ...prev,
      market_average_price: marketAvg,
      recommended_price: recommendedPrice,
      win_probability_percent: winProb
    }));
  };

  const savePTWAnalysis = async () => {
    setSaving(true);
    try {
      const payload = {
        opportunity_id: opportunityId,
        ...ptwData,
        competitor_prices: ptwData.competitor_prices as any
      };

      if (ptwData.id) {
        const { error } = await supabase
          .from("ptw_analyses")
          .update(payload)
          .eq("id", ptwData.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("ptw_analyses")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setPtwData({ ...ptwData, id: data.id });
      }

      toast({
        title: "PTW analysis saved",
        description: "Price-to-Win analysis has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving analysis",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addCompetitorPrice = () => {
    if (!newCompPrice.competitor.trim() || newCompPrice.estimatedPrice <= 0) return;
    setPtwData(prev => ({
      ...prev,
      competitor_prices: [...prev.competitor_prices, newCompPrice]
    }));
    setNewCompPrice({ competitor: "", estimatedPrice: 0, confidence: "Medium" });
  };

  const removeCompetitorPrice = (index: number) => {
    setPtwData(prev => ({
      ...prev,
      competitor_prices: prev.competitor_prices.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalCosts = ptwData.direct_costs + ptwData.indirect_costs;
  const overheadAmount = totalCosts * (ptwData.overhead_rate / 100);
  const marginAmount = (totalCosts + overheadAmount) * (ptwData.target_margin_percent / 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Price-to-Win Analysis</h2>
          <p className="text-sm text-muted-foreground">Competitive pricing and win probability calculator</p>
        </div>
        <Button onClick={savePTWAnalysis} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Analysis
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Recommended Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${ptwData.recommended_price.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {ptwData.target_margin_percent}% margin target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Win Probability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {ptwData.win_probability_percent}%
            </div>
            <Progress value={ptwData.win_probability_percent} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Market Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ${ptwData.market_average_price.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {ptwData.competitor_prices.length} competitors
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cost Structure</CardTitle>
            <CardDescription>Build up your cost base</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Direct Costs</Label>
              <Input
                type="number"
                value={ptwData.direct_costs || ""}
                onChange={(e) => setPtwData({ ...ptwData, direct_costs: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Indirect Costs</Label>
              <Input
                type="number"
                value={ptwData.indirect_costs || ""}
                onChange={(e) => setPtwData({ ...ptwData, indirect_costs: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Overhead Rate (%)</Label>
              <Input
                type="number"
                value={ptwData.overhead_rate || ""}
                onChange={(e) => setPtwData({ ...ptwData, overhead_rate: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Target Margin (%)</Label>
              <Input
                type="number"
                value={ptwData.target_margin_percent || ""}
                onChange={(e) => setPtwData({ ...ptwData, target_margin_percent: parseFloat(e.target.value) || 0 })}
                placeholder="15"
              />
            </div>
            <div className="pt-4 border-t space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Direct + Indirect:</span>
                <span className="font-medium">${totalCosts.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Overhead Amount:</span>
                <span className="font-medium">${overheadAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margin Amount:</span>
                <span className="font-medium">${marginAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">Total Price:</span>
                <span className="font-bold text-primary">${ptwData.recommended_price.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Competitor Pricing</CardTitle>
            <CardDescription>Track competitor price intelligence</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {ptwData.competitor_prices.map((cp, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{cp.competitor}</p>
                    <p className="text-lg font-bold">${cp.estimatedPrice.toLocaleString()}</p>
                    <Badge variant="outline" className="text-xs mt-1">{cp.confidence} Confidence</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCompetitorPrice(index)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>

            <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
              <h4 className="font-semibold text-sm">Add Competitor Price</h4>
              <div>
                <Label>Competitor Name</Label>
                <Input
                  value={newCompPrice.competitor}
                  onChange={(e) => setNewCompPrice({ ...newCompPrice, competitor: e.target.value })}
                  placeholder="Company name"
                />
              </div>
              <div>
                <Label>Estimated Price</Label>
                <Input
                  type="number"
                  value={newCompPrice.estimatedPrice || ""}
                  onChange={(e) => setNewCompPrice({ ...newCompPrice, estimatedPrice: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Confidence Level</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newCompPrice.confidence}
                  onChange={(e) => setNewCompPrice({ ...newCompPrice, confidence: e.target.value })}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
              <Button onClick={addCompetitorPrice} className="w-full">
                Add Competitor
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Strategic Pricing Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Pricing Strategy</Label>
            <Textarea
              value={ptwData.pricing_strategy}
              onChange={(e) => setPtwData({ ...ptwData, pricing_strategy: e.target.value })}
              placeholder="Describe your pricing approach (competitive, value-based, cost-plus, etc.)"
              rows={3}
            />
          </div>
          <div>
            <Label>Price Justification</Label>
            <Textarea
              value={ptwData.price_justification}
              onChange={(e) => setPtwData({ ...ptwData, price_justification: e.target.value })}
              placeholder="How will you justify this price to the customer?"
              rows={3}
            />
          </div>
          <div>
            <Label>Risk Assessment</Label>
            <Textarea
              value={ptwData.risk_assessment}
              onChange={(e) => setPtwData({ ...ptwData, risk_assessment: e.target.value })}
              placeholder="What are the pricing risks and mitigation strategies?"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}