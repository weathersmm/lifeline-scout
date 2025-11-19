-- Create table for storing requirement-to-content block mappings
CREATE TABLE IF NOT EXISTS public.proposal_requirement_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  requirement_id TEXT NOT NULL,
  requirement_text TEXT NOT NULL,
  requirement_category TEXT,
  page_limit INTEGER,
  content_block_ids UUID[] DEFAULT '{}',
  custom_content TEXT,
  word_count INTEGER DEFAULT 0,
  is_complete BOOLEAN DEFAULT false,
  last_updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_requirement_mappings_opportunity ON public.proposal_requirement_mappings(opportunity_id);
CREATE INDEX idx_requirement_mappings_requirement ON public.proposal_requirement_mappings(requirement_id);

-- Enable RLS
ALTER TABLE public.proposal_requirement_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view requirement mappings"
  ON public.proposal_requirement_mappings
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Members and admins can manage requirement mappings"
  ON public.proposal_requirement_mappings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_requirement_mapping_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_requirement_mapping_updated_at
  BEFORE UPDATE ON public.proposal_requirement_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_requirement_mapping_updated_at();

-- Create compliance tracking table
CREATE TABLE IF NOT EXISTS public.proposal_compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  total_requirements INTEGER NOT NULL DEFAULT 0,
  requirements_completed INTEGER NOT NULL DEFAULT 0,
  requirements_partial INTEGER NOT NULL DEFAULT 0,
  requirements_missing INTEGER NOT NULL DEFAULT 0,
  total_word_count INTEGER NOT NULL DEFAULT 0,
  compliance_score NUMERIC(5,2),
  missing_categories TEXT[],
  check_data JSONB DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index
CREATE INDEX idx_compliance_checks_opportunity ON public.proposal_compliance_checks(opportunity_id);

-- Enable RLS
ALTER TABLE public.proposal_compliance_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view compliance checks"
  ON public.proposal_compliance_checks
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Members and admins can create compliance checks"
  ON public.proposal_compliance_checks
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));