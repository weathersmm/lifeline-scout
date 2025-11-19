-- Create storage bucket for opportunity documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'opportunity-documents',
  'opportunity-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv']
);

-- RLS policies for opportunity documents bucket
CREATE POLICY "Authenticated users can view opportunity documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'opportunity-documents' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Members and admins can upload opportunity documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'opportunity-documents' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role))
);

CREATE POLICY "Members and admins can update opportunity documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'opportunity-documents' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role))
);

CREATE POLICY "Members and admins can delete opportunity documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'opportunity-documents' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role))
);

-- Create lifecycle stage enum
CREATE TYPE opportunity_lifecycle_stage AS ENUM (
  'identified',
  'bd_intel_deck',
  'capture_plan',
  'pre_drfp',
  'drfp_kickoff',
  'proposal_development',
  'pink_team',
  'red_team',
  'gold_team',
  'final_review',
  'submitted',
  'awaiting_award',
  'won',
  'lost',
  'no_bid'
);

-- Add lifecycle and documents columns to opportunities table
ALTER TABLE opportunities
ADD COLUMN lifecycle_stage opportunity_lifecycle_stage DEFAULT 'identified',
ADD COLUMN documents jsonb DEFAULT '[]'::jsonb,
ADD COLUMN lifecycle_notes text;

-- Create index on lifecycle_stage for filtering
CREATE INDEX idx_opportunities_lifecycle_stage ON opportunities(lifecycle_stage);

-- Create opportunity_tasks table for lifecycle task tracking
CREATE TABLE opportunity_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  lifecycle_stage opportunity_lifecycle_stage NOT NULL,
  task_name text NOT NULL,
  task_description text,
  is_completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  completed_by uuid,
  due_date date,
  assigned_to uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS policies for opportunity_tasks
ALTER TABLE opportunity_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view opportunity tasks"
ON opportunity_tasks FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Members and admins can manage opportunity tasks"
ON opportunity_tasks FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));

-- Create trigger for opportunity_tasks updated_at
CREATE TRIGGER update_opportunity_tasks_updated_at
BEFORE UPDATE ON opportunity_tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();