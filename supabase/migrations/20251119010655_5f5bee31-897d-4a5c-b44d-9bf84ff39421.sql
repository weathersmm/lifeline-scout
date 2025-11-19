-- Enable RLS on ml_training_data view
ALTER VIEW public.ml_training_data SET (security_barrier = true);

-- Enable RLS for the view
-- Note: Views require RLS to be handled through a materialized view or security definer function
-- Since we can't directly enable RLS on a regular view, we'll drop and recreate as a materialized view
-- or create a security definer function instead

-- Drop the existing view
DROP VIEW IF EXISTS public.ml_training_data;

-- Create a security definer function to access ML training data with role enforcement
CREATE OR REPLACE FUNCTION public.get_ml_training_data()
RETURNS TABLE (
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only allow admins and members to access ML training data
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
  LEFT JOIN public.win_loss_history wl ON o.id = wl.opportunity_id
  WHERE has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role);
$$;

-- Grant execute permission to authenticated users (function itself enforces role check)
GRANT EXECUTE ON FUNCTION public.get_ml_training_data() TO authenticated;

-- Recreate the view for backward compatibility, but it will now enforce security
CREATE OR REPLACE VIEW public.ml_training_data 
WITH (security_barrier = true, security_invoker = true)
AS
SELECT * FROM public.get_ml_training_data();

-- Add comment explaining the security model
COMMENT ON VIEW public.ml_training_data IS 'ML training data view with role-based access control. Only admin and member roles can access this sensitive strategic intelligence data. Access is enforced through the underlying security definer function.';

COMMENT ON FUNCTION public.get_ml_training_data() IS 'Security definer function that enforces role-based access to ML training data. Only users with admin or member roles can retrieve strategic intelligence data including pricing, SWOT analysis, and win/loss patterns.';