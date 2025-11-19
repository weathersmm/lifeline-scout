-- Create proposal content block versions table
CREATE TABLE public.proposal_content_block_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_block_id UUID NOT NULL REFERENCES public.proposal_content_blocks(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type content_block_type NOT NULL,
  lifecycle_stages opportunity_lifecycle_stage[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_template BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_description TEXT,
  UNIQUE(content_block_id, version_number)
);

-- Create indexes
CREATE INDEX idx_content_block_versions_block_id ON public.proposal_content_block_versions(content_block_id);
CREATE INDEX idx_content_block_versions_created_at ON public.proposal_content_block_versions(created_at DESC);

-- Enable RLS
ALTER TABLE public.proposal_content_block_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Authenticated users can view all versions
CREATE POLICY "Authenticated users can view content block versions"
ON public.proposal_content_block_versions
FOR SELECT
TO authenticated
USING (true);

-- System can create versions automatically (via triggers/functions)
CREATE POLICY "System can create versions"
ON public.proposal_content_block_versions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Function to automatically create version on content block update
CREATE OR REPLACE FUNCTION public.create_content_block_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get the next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 
  INTO next_version
  FROM public.proposal_content_block_versions
  WHERE content_block_id = OLD.id;

  -- Create version from OLD record
  INSERT INTO public.proposal_content_block_versions (
    content_block_id,
    version_number,
    title,
    content,
    content_type,
    lifecycle_stages,
    tags,
    is_template,
    metadata,
    created_by
  ) VALUES (
    OLD.id,
    next_version,
    OLD.title,
    OLD.content,
    OLD.content_type,
    OLD.lifecycle_stages,
    OLD.tags,
    OLD.is_template,
    OLD.metadata,
    OLD.created_by
  );

  RETURN NEW;
END;
$$;

-- Create trigger to automatically version content blocks on update
CREATE TRIGGER create_version_on_content_block_update
BEFORE UPDATE ON public.proposal_content_blocks
FOR EACH ROW
WHEN (OLD.content IS DISTINCT FROM NEW.content OR 
      OLD.title IS DISTINCT FROM NEW.title OR
      OLD.content_type IS DISTINCT FROM NEW.content_type)
EXECUTE FUNCTION public.create_content_block_version();