-- Create proposal quality scores table
CREATE TABLE IF NOT EXISTS public.proposal_quality_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  completeness_score INTEGER NOT NULL,
  keyword_coverage_score INTEGER NOT NULL,
  alignment_score INTEGER NOT NULL,
  overall_score INTEGER NOT NULL,
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  missing_keywords TEXT[] DEFAULT '{}',
  category_scores JSONB DEFAULT '[]',
  evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  evaluated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposal_quality_scores ENABLE ROW LEVEL SECURITY;

-- Policies for proposal_quality_scores
CREATE POLICY "Authenticated users can view quality scores"
  ON public.proposal_quality_scores
  FOR SELECT
  TO authenticated
  USING (auth.role() = 'authenticated');

CREATE POLICY "Members and admins can create quality scores"
  ON public.proposal_quality_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'member')
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_proposal_quality_scores_opportunity 
  ON public.proposal_quality_scores(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_proposal_quality_scores_evaluated_at 
  ON public.proposal_quality_scores(evaluated_at DESC);
