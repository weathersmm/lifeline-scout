-- Create proposal templates table
CREATE TABLE public.proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL,
  lifecycle_stages opportunity_lifecycle_stage[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create proposal template sections table
CREATE TABLE public.proposal_template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.proposal_templates(id) ON DELETE CASCADE,
  section_order INTEGER NOT NULL,
  section_title TEXT NOT NULL,
  section_description TEXT,
  required_content_type content_block_type,
  suggested_content_blocks UUID[] DEFAULT '{}',
  placeholder_text TEXT,
  word_count_target INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(template_id, section_order)
);

-- Create proposal instances table
CREATE TABLE public.proposal_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.proposal_templates(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX idx_proposal_templates_type ON public.proposal_templates(template_type);
CREATE INDEX idx_proposal_templates_lifecycle ON public.proposal_templates USING GIN(lifecycle_stages);
CREATE INDEX idx_proposal_template_sections_template ON public.proposal_template_sections(template_id, section_order);
CREATE INDEX idx_proposal_instances_opportunity ON public.proposal_instances(opportunity_id);
CREATE INDEX idx_proposal_instances_template ON public.proposal_instances(template_id);
CREATE INDEX idx_proposal_instances_status ON public.proposal_instances(status);

-- Enable RLS
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view templates"
ON public.proposal_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Members and admins can create templates"
ON public.proposal_templates FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Users can update own templates or admins all"
ON public.proposal_templates FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own templates or admins all"
ON public.proposal_templates FOR DELETE TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view sections"
ON public.proposal_template_sections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Members and admins can manage sections"
ON public.proposal_template_sections FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.proposal_templates
    WHERE id = proposal_template_sections.template_id
    AND (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Authenticated users can view proposals"
ON public.proposal_instances FOR SELECT TO authenticated USING (true);

CREATE POLICY "Members and admins can create proposals"
ON public.proposal_instances FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Users can update own proposals or admins all"
ON public.proposal_instances FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete proposals"
ON public.proposal_instances FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers
CREATE TRIGGER update_proposal_templates_updated_at
BEFORE UPDATE ON public.proposal_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_proposal_instances_updated_at
BEFORE UPDATE ON public.proposal_instances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.proposal_templates (name, description, template_type, lifecycle_stages, is_default) VALUES
('BD Intel Deck', 'Business Development Intelligence Deck for Gate 1', 'bd_intel_deck', ARRAY['identified', 'bd_intel_deck']::opportunity_lifecycle_stage[], true),
('Capture Plan', 'Comprehensive Capture Plan for Gate 2', 'capture_plan', ARRAY['capture_plan']::opportunity_lifecycle_stage[], true),
('Technical Volume', 'Complete technical proposal volume', 'proposal_volume', ARRAY['proposal_development', 'pink_team', 'red_team', 'gold_team']::opportunity_lifecycle_stage[], true),
('Management Volume', 'Management approach and staffing', 'proposal_volume', ARRAY['proposal_development', 'pink_team', 'red_team', 'gold_team']::opportunity_lifecycle_stage[], true);

-- Insert sections for BD Intel Deck
INSERT INTO public.proposal_template_sections (template_id, section_order, section_title, section_description, required_content_type, word_count_target)
SELECT id, 1, 'Opportunity Overview', 'High-level summary', 'executive_summary'::content_block_type, 300 FROM public.proposal_templates WHERE name = 'BD Intel Deck'
UNION ALL
SELECT id, 2, 'Government Acquisition Strategy', 'Timeline and milestones', 'other'::content_block_type, 400 FROM public.proposal_templates WHERE name = 'BD Intel Deck'
UNION ALL
SELECT id, 3, 'Competitor Profiles', 'Analysis of competitors', 'other'::content_block_type, 500 FROM public.proposal_templates WHERE name = 'BD Intel Deck';

-- Insert sections for Technical Volume
INSERT INTO public.proposal_template_sections (template_id, section_order, section_title, section_description, required_content_type, word_count_target)
SELECT id, 1, 'Executive Summary', 'Win themes and value', 'executive_summary'::content_block_type, 800 FROM public.proposal_templates WHERE name = 'Technical Volume'
UNION ALL
SELECT id, 2, 'Technical Approach', 'Solution and methodology', 'technical_approach'::content_block_type, 2000 FROM public.proposal_templates WHERE name = 'Technical Volume'
UNION ALL
SELECT id, 3, 'Past Performance', 'Relevant experience', 'past_performance'::content_block_type, 1500 FROM public.proposal_templates WHERE name = 'Technical Volume';

-- Insert sections for Management Volume
INSERT INTO public.proposal_template_sections (template_id, section_order, section_title, section_description, required_content_type, word_count_target)
SELECT id, 1, 'Management Approach', 'Project management', 'management_approach'::content_block_type, 1500 FROM public.proposal_templates WHERE name = 'Management Volume'
UNION ALL
SELECT id, 2, 'Staffing Plan', 'Key personnel', 'staffing_plan'::content_block_type, 1200 FROM public.proposal_templates WHERE name = 'Management Volume';
