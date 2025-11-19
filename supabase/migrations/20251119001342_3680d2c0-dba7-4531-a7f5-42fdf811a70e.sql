-- Create content type enum
CREATE TYPE public.content_block_type AS ENUM (
  'past_performance',
  'technical_approach',
  'team_bio',
  'executive_summary',
  'management_approach',
  'quality_control',
  'staffing_plan',
  'other'
);

-- Create proposal content blocks table
CREATE TABLE public.proposal_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type content_block_type NOT NULL,
  lifecycle_stages opportunity_lifecycle_stage[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_template BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX idx_proposal_content_blocks_type ON public.proposal_content_blocks(content_type);
CREATE INDEX idx_proposal_content_blocks_created_by ON public.proposal_content_blocks(created_by);
CREATE INDEX idx_proposal_content_blocks_tags ON public.proposal_content_blocks USING GIN(tags);
CREATE INDEX idx_proposal_content_blocks_lifecycle_stages ON public.proposal_content_blocks USING GIN(lifecycle_stages);

-- Enable RLS
ALTER TABLE public.proposal_content_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Authenticated users can view all content blocks
CREATE POLICY "Authenticated users can view content blocks"
ON public.proposal_content_blocks
FOR SELECT
TO authenticated
USING (true);

-- Members and admins can create content blocks
CREATE POLICY "Members and admins can create content blocks"
ON public.proposal_content_blocks
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));

-- Users can update their own content blocks, admins can update all
CREATE POLICY "Users can update own content blocks"
ON public.proposal_content_blocks
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Users can delete their own content blocks, admins can delete all
CREATE POLICY "Users can delete own content blocks"
ON public.proposal_content_blocks
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_proposal_content_blocks_updated_at
BEFORE UPDATE ON public.proposal_content_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();