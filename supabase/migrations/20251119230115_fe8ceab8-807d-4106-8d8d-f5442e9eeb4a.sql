-- Create table for requirement gap analysis results
CREATE TABLE IF NOT EXISTS public.requirement_gap_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  extraction_id UUID REFERENCES public.extracted_proposal_requirements(id) ON DELETE CASCADE,
  gap_summary TEXT,
  total_requirements INTEGER NOT NULL DEFAULT 0,
  requirements_with_content INTEGER NOT NULL DEFAULT 0,
  requirements_missing_content INTEGER NOT NULL DEFAULT 0,
  gap_details JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB,
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  analyzed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gap_analyses_opportunity 
ON public.requirement_gap_analyses(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_gap_analyses_extraction 
ON public.requirement_gap_analyses(extraction_id);

-- Enable RLS
ALTER TABLE public.requirement_gap_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view gap analyses"
ON public.requirement_gap_analyses
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Members and admins can insert gap analyses"
ON public.requirement_gap_analyses
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'member'::app_role)
);

CREATE POLICY "Members and admins can update gap analyses"
ON public.requirement_gap_analyses
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'member'::app_role)
);

CREATE POLICY "Admins can delete gap analyses"
ON public.requirement_gap_analyses
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));