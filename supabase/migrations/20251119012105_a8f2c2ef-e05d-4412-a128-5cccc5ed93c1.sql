-- Create data sensitivity level enum
CREATE TYPE public.data_sensitivity_level AS ENUM ('public', 'internal', 'restricted');

-- Create audit logs table for tracking access to sensitive data
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_role app_role,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Add sensitivity_level to opportunities
ALTER TABLE public.opportunities
ADD COLUMN sensitivity_level data_sensitivity_level DEFAULT 'internal'::data_sensitivity_level;

-- Add sensitivity_level to competitive_assessments
ALTER TABLE public.competitive_assessments
ADD COLUMN sensitivity_level data_sensitivity_level DEFAULT 'restricted'::data_sensitivity_level;

-- Add sensitivity_level to ptw_analyses
ALTER TABLE public.ptw_analyses
ADD COLUMN sensitivity_level data_sensitivity_level DEFAULT 'restricted'::data_sensitivity_level;

-- Add sensitivity_level to go_no_go_evaluations
ALTER TABLE public.go_no_go_evaluations
ADD COLUMN sensitivity_level data_sensitivity_level DEFAULT 'restricted'::data_sensitivity_level;

-- Add sensitivity_level to win_loss_history
ALTER TABLE public.win_loss_history
ADD COLUMN sensitivity_level data_sensitivity_level DEFAULT 'restricted'::data_sensitivity_level;

-- Add sensitivity_level to competitor_intelligence
ALTER TABLE public.competitor_intelligence
ADD COLUMN sensitivity_level data_sensitivity_level DEFAULT 'restricted'::data_sensitivity_level;

-- Create audit logging function
CREATE OR REPLACE FUNCTION public.log_data_access(
  _table_name TEXT,
  _record_id UUID,
  _action TEXT,
  _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_role app_role;
BEGIN
  -- Get user's role
  SELECT role INTO _user_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    user_id,
    table_name,
    record_id,
    action,
    user_role,
    metadata
  ) VALUES (
    auth.uid(),
    _table_name,
    _record_id,
    _action,
    _user_role,
    _metadata
  );
END;
$$;

-- Update get_ml_training_data function to include audit logging
CREATE OR REPLACE FUNCTION public.get_ml_training_data()
RETURNS TABLE(
  id uuid,
  priority priority_level,
  contract_type contract_type,
  service_tags service_tag[],
  estimated_value_min numeric,
  estimated_value_max numeric,
  geography_state text,
  competitors jsonb,
  strengths text[],
  weaknesses text[],
  swot_opportunities text[],
  threats text[],
  our_estimated_price numeric,
  market_average_price numeric,
  target_margin_percent numeric,
  predicted_win_prob numeric,
  gonogo_score integer,
  strategic_fit_score integer,
  past_performance_score integer,
  reality_check_score integer,
  contract_approach_score integer,
  competitor_analysis_score integer,
  timeline_feasibility_score integer,
  roi_potential_score integer,
  recommendation text,
  outcome text,
  actual_value numeric,
  actual_our_price numeric,
  winning_price numeric,
  key_win_factors text[],
  key_loss_factors text[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins and members to access ML training data
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: insufficient privileges';
  END IF;

  -- Log the access
  PERFORM log_data_access('ml_training_data', NULL, 'SELECT', jsonb_build_object('access_type', 'bulk_export'));

  -- Return the data
  RETURN QUERY
  SELECT 
    o.id,
    o.priority,
    o.contract_type,
    o.service_tags,
    o.estimated_value_min,
    o.estimated_value_max,
    o.geography_state,
    ca.competitors,
    ca.strengths,
    ca.weaknesses,
    ca.opportunities as swot_opportunities,
    ca.threats,
    ptw.our_estimated_price,
    ptw.market_average_price,
    ptw.target_margin_percent,
    ptw.win_probability_percent as predicted_win_prob,
    gng.total_score as gonogo_score,
    gng.strategic_fit_score,
    gng.past_performance_score,
    gng.reality_check_score,
    gng.contract_approach_score,
    gng.competitor_analysis_score,
    gng.timeline_feasibility_score,
    gng.roi_potential_score,
    gng.recommendation,
    wl.outcome,
    wl.contract_value as actual_value,
    wl.our_price as actual_our_price,
    wl.winning_price,
    wl.key_win_factors,
    wl.key_loss_factors
  FROM public.opportunities o
  LEFT JOIN public.competitive_assessments ca ON o.id = ca.opportunity_id
  LEFT JOIN public.ptw_analyses ptw ON o.id = ptw.opportunity_id
  LEFT JOIN public.go_no_go_evaluations gng ON o.id = gng.opportunity_id
  LEFT JOIN public.win_loss_history wl ON o.id = wl.opportunity_id;
END;
$$;

-- Update RLS policies to enforce sensitivity levels

-- Opportunities: enforce sensitivity level
DROP POLICY IF EXISTS "Authenticated users can view opportunities" ON public.opportunities;
CREATE POLICY "Users can view opportunities based on sensitivity"
ON public.opportunities
FOR SELECT
USING (
  CASE sensitivity_level
    WHEN 'public'::data_sensitivity_level THEN true
    WHEN 'internal'::data_sensitivity_level THEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role))
    WHEN 'restricted'::data_sensitivity_level THEN has_role(auth.uid(), 'admin'::app_role)
    ELSE false
  END
);

-- Competitive assessments: enforce sensitivity level
DROP POLICY IF EXISTS "Authenticated users can view competitive assessments" ON public.competitive_assessments;
CREATE POLICY "Users can view competitive assessments based on sensitivity"
ON public.competitive_assessments
FOR SELECT
USING (
  CASE sensitivity_level
    WHEN 'public'::data_sensitivity_level THEN true
    WHEN 'internal'::data_sensitivity_level THEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role))
    WHEN 'restricted'::data_sensitivity_level THEN has_role(auth.uid(), 'admin'::app_role)
    ELSE false
  END
);

-- PTW analyses: enforce sensitivity level
DROP POLICY IF EXISTS "Authenticated users can view PTW analyses" ON public.ptw_analyses;
CREATE POLICY "Users can view PTW analyses based on sensitivity"
ON public.ptw_analyses
FOR SELECT
USING (
  CASE sensitivity_level
    WHEN 'public'::data_sensitivity_level THEN true
    WHEN 'internal'::data_sensitivity_level THEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role))
    WHEN 'restricted'::data_sensitivity_level THEN has_role(auth.uid(), 'admin'::app_role)
    ELSE false
  END
);

-- Go/No-Go evaluations: enforce sensitivity level
DROP POLICY IF EXISTS "Authenticated users can view Go/No-Go evaluations" ON public.go_no_go_evaluations;
CREATE POLICY "Users can view Go/No-Go evaluations based on sensitivity"
ON public.go_no_go_evaluations
FOR SELECT
USING (
  CASE sensitivity_level
    WHEN 'public'::data_sensitivity_level THEN true
    WHEN 'internal'::data_sensitivity_level THEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role))
    WHEN 'restricted'::data_sensitivity_level THEN has_role(auth.uid(), 'admin'::app_role)
    ELSE false
  END
);

-- Win/loss history: enforce sensitivity level
DROP POLICY IF EXISTS "Authenticated users can view win/loss history" ON public.win_loss_history;
CREATE POLICY "Users can view win/loss history based on sensitivity"
ON public.win_loss_history
FOR SELECT
USING (
  CASE sensitivity_level
    WHEN 'public'::data_sensitivity_level THEN true
    WHEN 'internal'::data_sensitivity_level THEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role))
    WHEN 'restricted'::data_sensitivity_level THEN has_role(auth.uid(), 'admin'::app_role)
    ELSE false
  END
);

-- Competitor intelligence: enforce sensitivity level
DROP POLICY IF EXISTS "Authenticated users can view competitor intelligence" ON public.competitor_intelligence;
CREATE POLICY "Users can view competitor intelligence based on sensitivity"
ON public.competitor_intelligence
FOR SELECT
USING (
  CASE sensitivity_level
    WHEN 'public'::data_sensitivity_level THEN true
    WHEN 'internal'::data_sensitivity_level THEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role))
    WHEN 'restricted'::data_sensitivity_level THEN has_role(auth.uid(), 'admin'::app_role)
    ELSE false
  END
);