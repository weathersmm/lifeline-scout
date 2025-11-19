-- Create table for extracted proposal requirements
CREATE TABLE IF NOT EXISTS public.extracted_proposal_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  deliverable_specs JSONB,
  submission_details JSONB,
  evaluation_criteria JSONB,
  extracted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  extracted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_extracted_requirements_opportunity 
ON public.extracted_proposal_requirements(opportunity_id);

-- Enable RLS
ALTER TABLE public.extracted_proposal_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view extracted requirements"
ON public.extracted_proposal_requirements
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Members and admins can insert extracted requirements"
ON public.extracted_proposal_requirements
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'member'::app_role)
);

CREATE POLICY "Members and admins can update extracted requirements"
ON public.extracted_proposal_requirements
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'member'::app_role)
);

CREATE POLICY "Admins can delete extracted requirements"
ON public.extracted_proposal_requirements
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));