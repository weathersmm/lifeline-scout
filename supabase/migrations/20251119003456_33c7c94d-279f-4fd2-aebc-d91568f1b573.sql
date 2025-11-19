-- Create competitor intelligence table
CREATE TABLE public.competitor_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Company Profile
  company_description TEXT,
  headquarters TEXT,
  website TEXT,
  size_category TEXT,
  
  -- Historical Performance
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  total_bids INTEGER DEFAULT 0,
  win_rate_percent NUMERIC,
  
  -- Pricing Intelligence
  avg_price_position TEXT,
  typical_discount_percent NUMERIC,
  pricing_strategy_notes TEXT,
  
  -- Competitive Strengths/Weaknesses
  key_strengths TEXT[],
  key_weaknesses TEXT[],
  differentiators TEXT[],
  
  -- Market Presence
  primary_markets TEXT[],
  service_specialties TEXT[],
  
  metadata JSONB DEFAULT '{}'::jsonb,
  
  UNIQUE(competitor_name)
);

-- Create win/loss history table
CREATE TABLE public.win_loss_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Outcome
  outcome TEXT CHECK (outcome IN ('won', 'lost', 'no-bid')) NOT NULL,
  award_date DATE,
  contract_value NUMERIC,
  
  -- Competitor Analysis
  winning_competitor TEXT,
  winning_price NUMERIC,
  our_price NUMERIC,
  price_differential_percent NUMERIC,
  
  -- Win/Loss Analysis
  key_win_factors TEXT[],
  key_loss_factors TEXT[],
  lessons_learned TEXT,
  
  -- Scores at Decision Time
  final_gonogo_score INTEGER,
  final_win_probability NUMERIC,
  final_ptw_recommended_price NUMERIC,
  
  -- Strategic Data
  competitor_intelligence JSONB,
  
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create ML training data view
CREATE OR REPLACE VIEW public.ml_training_data AS
SELECT 
  o.id,
  o.priority,
  o.contract_type,
  o.service_tags,
  o.estimated_value_min,
  o.estimated_value_max,
  o.geography_state,
  ca.strengths,
  ca.weaknesses,
  ca.opportunities AS swot_opportunities,
  ca.threats,
  ca.competitors,
  ptw.our_estimated_price,
  ptw.market_average_price,
  ptw.target_margin_percent,
  ptw.win_probability_percent AS predicted_win_prob,
  gng.total_score AS gonogo_score,
  gng.strategic_fit_score,
  gng.past_performance_score,
  gng.reality_check_score,
  gng.contract_approach_score,
  gng.competitor_analysis_score,
  gng.timeline_feasibility_score,
  gng.roi_potential_score,
  gng.recommendation,
  wl.outcome,
  wl.contract_value AS actual_value,
  wl.our_price AS actual_our_price,
  wl.winning_price,
  wl.key_win_factors,
  wl.key_loss_factors
FROM opportunities o
LEFT JOIN competitive_assessments ca ON o.id = ca.opportunity_id
LEFT JOIN ptw_analyses ptw ON o.id = ptw.opportunity_id
LEFT JOIN go_no_go_evaluations gng ON o.id = gng.opportunity_id
LEFT JOIN win_loss_history wl ON o.id = wl.opportunity_id;

-- Enable RLS
ALTER TABLE public.competitor_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.win_loss_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competitor_intelligence
CREATE POLICY "Authenticated users can view competitor intelligence"
  ON public.competitor_intelligence FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members and admins can manage competitor intelligence"
  ON public.competitor_intelligence FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'member'));

-- RLS Policies for win_loss_history
CREATE POLICY "Authenticated users can view win/loss history"
  ON public.win_loss_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members and admins can manage win/loss history"
  ON public.win_loss_history FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'member'));

-- Triggers
CREATE TRIGGER update_competitor_intelligence_updated_at
  BEFORE UPDATE ON public.competitor_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update competitor win rates
CREATE OR REPLACE FUNCTION public.update_competitor_win_rate()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.competitor_intelligence
  SET 
    total_bids = (
      SELECT COUNT(*) FROM win_loss_history 
      WHERE winning_competitor = competitor_intelligence.competitor_name
    ),
    total_wins = (
      SELECT COUNT(*) FROM win_loss_history 
      WHERE winning_competitor = competitor_intelligence.competitor_name 
      AND outcome = 'won'
    ),
    total_losses = (
      SELECT COUNT(*) FROM win_loss_history 
      WHERE winning_competitor = competitor_intelligence.competitor_name 
      AND outcome = 'lost'
    ),
    win_rate_percent = (
      SELECT 
        CASE 
          WHEN COUNT(*) > 0 THEN 
            (COUNT(*) FILTER (WHERE outcome = 'won')::NUMERIC / COUNT(*)::NUMERIC) * 100
          ELSE 0
        END
      FROM win_loss_history 
      WHERE winning_competitor = competitor_intelligence.competitor_name
    )
  WHERE competitor_name = NEW.winning_competitor;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_competitor_stats_on_win_loss
  AFTER INSERT OR UPDATE ON public.win_loss_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_competitor_win_rate();