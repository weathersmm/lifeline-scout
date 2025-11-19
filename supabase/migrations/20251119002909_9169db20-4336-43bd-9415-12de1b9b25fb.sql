-- Create competitive assessments table
CREATE TABLE public.competitive_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- SWOT Analysis
  strengths TEXT[],
  weaknesses TEXT[],
  opportunities TEXT[],
  threats TEXT[],
  
  -- Competitor Benchmarking
  competitors JSONB DEFAULT '[]'::jsonb,
  
  -- Strategic Positioning
  strategic_recommendation TEXT,
  competitive_advantage TEXT,
  risk_mitigation TEXT,
  
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create PTW analyses table
CREATE TABLE public.ptw_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Pricing Analysis
  our_estimated_price NUMERIC,
  competitor_prices JSONB DEFAULT '[]'::jsonb,
  market_average_price NUMERIC,
  
  -- Cost Structure
  direct_costs NUMERIC,
  indirect_costs NUMERIC,
  overhead_rate NUMERIC,
  target_margin_percent NUMERIC,
  
  -- Win Probability
  win_probability_percent NUMERIC,
  confidence_level TEXT,
  pricing_strategy TEXT,
  
  -- Recommendations
  recommended_price NUMERIC,
  price_justification TEXT,
  risk_assessment TEXT,
  
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create Go/No-Go evaluations table
CREATE TABLE public.go_no_go_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Gate 2 Questions (1-5 scoring)
  strategic_fit_score INTEGER CHECK (strategic_fit_score BETWEEN 1 AND 5),
  strategic_fit_notes TEXT,
  
  past_performance_score INTEGER CHECK (past_performance_score BETWEEN 1 AND 5),
  past_performance_notes TEXT,
  
  reality_check_score INTEGER CHECK (reality_check_score BETWEEN 1 AND 5),
  reality_check_notes TEXT,
  
  contract_approach_score INTEGER CHECK (contract_approach_score BETWEEN 1 AND 5),
  contract_approach_notes TEXT,
  
  competitor_analysis_score INTEGER CHECK (competitor_analysis_score BETWEEN 1 AND 5),
  competitor_analysis_notes TEXT,
  
  timeline_feasibility_score INTEGER CHECK (timeline_feasibility_score BETWEEN 1 AND 5),
  timeline_feasibility_notes TEXT,
  
  roi_potential_score INTEGER CHECK (roi_potential_score BETWEEN 1 AND 5),
  roi_potential_notes TEXT,
  
  -- Overall Decision
  total_score INTEGER,
  recommendation TEXT CHECK (recommendation IN ('GO', 'NO-GO', 'CONDITIONAL')),
  executive_summary TEXT,
  decision_rationale TEXT,
  
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.competitive_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ptw_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.go_no_go_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competitive_assessments
CREATE POLICY "Authenticated users can view competitive assessments"
  ON public.competitive_assessments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members and admins can manage competitive assessments"
  ON public.competitive_assessments FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'member'));

-- RLS Policies for ptw_analyses
CREATE POLICY "Authenticated users can view PTW analyses"
  ON public.ptw_analyses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members and admins can manage PTW analyses"
  ON public.ptw_analyses FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'member'));

-- RLS Policies for go_no_go_evaluations
CREATE POLICY "Authenticated users can view Go/No-Go evaluations"
  ON public.go_no_go_evaluations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members and admins can manage Go/No-Go evaluations"
  ON public.go_no_go_evaluations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'member'));

-- Triggers for updated_at
CREATE TRIGGER update_competitive_assessments_updated_at
  BEFORE UPDATE ON public.competitive_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ptw_analyses_updated_at
  BEFORE UPDATE ON public.ptw_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_go_no_go_evaluations_updated_at
  BEFORE UPDATE ON public.go_no_go_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();