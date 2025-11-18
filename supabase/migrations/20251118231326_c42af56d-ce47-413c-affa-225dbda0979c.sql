-- Add hot_flagged_type column to track manual vs automatic flagging
CREATE TYPE hot_flag_type AS ENUM ('manual', 'automatic');

ALTER TABLE public.opportunities
ADD COLUMN hot_flagged_type hot_flag_type DEFAULT NULL;

-- Create index for better query performance
CREATE INDEX idx_opportunities_hot_flagged_type ON public.opportunities(hot_flagged_type) WHERE is_hot = true;

-- Update existing HOT opportunities to 'manual' by default
UPDATE public.opportunities 
SET hot_flagged_type = 'manual' 
WHERE is_hot = true;