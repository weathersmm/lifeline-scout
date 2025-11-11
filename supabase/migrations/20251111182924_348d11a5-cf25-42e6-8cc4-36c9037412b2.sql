-- Create scraping_progress table for real-time tracking
CREATE TABLE IF NOT EXISTS public.scraping_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'retrying')),
  opportunities_found INTEGER DEFAULT 0,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.scraping_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for scraping_progress
CREATE POLICY "Authenticated users can view scraping progress"
  ON public.scraping_progress
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage scraping progress"
  ON public.scraping_progress
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create index for faster queries
CREATE INDEX idx_scraping_progress_session_id ON public.scraping_progress(session_id);
CREATE INDEX idx_scraping_progress_status ON public.scraping_progress(status);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.scraping_progress;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_scraping_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_scraping_progress_timestamp
  BEFORE UPDATE ON public.scraping_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_scraping_progress_updated_at();