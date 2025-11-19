-- Fix search_path security warning for update_requirement_mapping_updated_at function
CREATE OR REPLACE FUNCTION update_requirement_mapping_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SET search_path = public;