-- Fix search_path for scraping progress function
DROP TRIGGER IF EXISTS update_scraping_progress_timestamp ON public.scraping_progress;
DROP FUNCTION IF EXISTS update_scraping_progress_updated_at();

CREATE OR REPLACE FUNCTION update_scraping_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recreate trigger
CREATE TRIGGER update_scraping_progress_timestamp
  BEFORE UPDATE ON public.scraping_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_scraping_progress_updated_at();