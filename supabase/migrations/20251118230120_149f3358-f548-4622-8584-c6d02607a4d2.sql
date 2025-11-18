-- Add is_hot column to opportunities table for manual HOT tagging
ALTER TABLE opportunities ADD COLUMN is_hot BOOLEAN NOT NULL DEFAULT false;

-- Add comment
COMMENT ON COLUMN opportunities.is_hot IS 'Manually marked as HOT opportunity by users';

-- Create index for faster filtering
CREATE INDEX idx_opportunities_is_hot ON opportunities(is_hot) WHERE is_hot = true;