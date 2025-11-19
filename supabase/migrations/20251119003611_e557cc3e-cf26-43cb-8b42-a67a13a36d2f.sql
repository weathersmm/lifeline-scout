-- Drop trigger first
DROP TRIGGER IF EXISTS update_competitor_stats_on_win_loss ON public.win_loss_history;

-- Drop function
DROP FUNCTION IF EXISTS public.update_competitor_win_rate() CASCADE;

-- Recreate function with proper search path
CREATE OR REPLACE FUNCTION public.update_competitor_win_rate()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.competitor_intelligence
  SET 
    total_bids = (
      SELECT COUNT(*) FROM win_loss_history 
      WHERE winning_competitor = competitor_intelligence.competitor_name
    ),
    total_wins = (
      SELECT COUNT(*) FROM win_loss_history 
      WHERE winning_competitor = competitor_intelligence.competitor_name 
      AND outcome = 'won'
    ),
    total_losses = (
      SELECT COUNT(*) FROM win_loss_history 
      WHERE winning_competitor = competitor_intelligence.competitor_name 
      AND outcome = 'lost'
    ),
    win_rate_percent = (
      SELECT 
        CASE 
          WHEN COUNT(*) > 0 THEN 
            (COUNT(*) FILTER (WHERE outcome = 'won')::NUMERIC / COUNT(*)::NUMERIC) * 100
          ELSE 0
        END
      FROM win_loss_history 
      WHERE winning_competitor = competitor_intelligence.competitor_name
    )
  WHERE competitor_name = NEW.winning_competitor;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_competitor_stats_on_win_loss
  AFTER INSERT OR UPDATE ON public.win_loss_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_competitor_win_rate();