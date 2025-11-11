-- Create scraping_history table to track all scraping attempts
CREATE TABLE IF NOT EXISTS public.scraping_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL, -- 'local', 'global', 'custom'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  opportunities_found INTEGER DEFAULT 0,
  opportunities_inserted INTEGER DEFAULT 0,
  error_message TEXT,
  user_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scraping_history ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view scraping history
CREATE POLICY "Authenticated users can view scraping history"
ON public.scraping_history
FOR SELECT
USING (true);

-- Members and admins can insert scraping history
CREATE POLICY "Members and admins can insert scraping history"
ON public.scraping_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));

-- Admins can update scraping history
CREATE POLICY "Admins can update scraping history"
ON public.scraping_history
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add index for better query performance
CREATE INDEX idx_scraping_history_user_id ON public.scraping_history(user_id);
CREATE INDEX idx_scraping_history_status ON public.scraping_history(status);
CREATE INDEX idx_scraping_history_created_at ON public.scraping_history(created_at DESC);

-- Add EMS provider context columns to opportunities table
ALTER TABLE public.opportunities
ADD COLUMN IF NOT EXISTS current_911_provider TEXT,
ADD COLUMN IF NOT EXISTS current_nemt_provider TEXT,
ADD COLUMN IF NOT EXISTS contract_expiration TEXT,
ADD COLUMN IF NOT EXISTS current_procurement_type TEXT,
ADD COLUMN IF NOT EXISTS county_notes TEXT,
ADD COLUMN IF NOT EXISTS lemsa_site TEXT,
ADD COLUMN IF NOT EXISTS ems_plan_url TEXT;