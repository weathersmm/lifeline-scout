-- Create table to track opportunity changes
CREATE TABLE public.opportunity_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.opportunity_changes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view change history"
  ON public.opportunity_changes
  FOR SELECT
  USING (true);

CREATE POLICY "System can insert change records"
  ON public.opportunity_changes
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_opportunity_changes_opportunity_id ON public.opportunity_changes(opportunity_id);
CREATE INDEX idx_opportunity_changes_changed_at ON public.opportunity_changes(changed_at DESC);

-- Create function to track opportunity changes
CREATE OR REPLACE FUNCTION public.track_opportunity_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_user UUID;
BEGIN
  -- Get the current user (may be null for automated processes)
  changed_user := auth.uid();

  -- Handle INSERT (new opportunity)
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.opportunity_changes (opportunity_id, changed_by, field_name, new_value, change_type)
    VALUES (NEW.id, changed_user, 'created', 'Opportunity created', 'created');
    RETURN NEW;
  END IF;

  -- Handle UPDATE (track specific field changes)
  IF (TG_OP = 'UPDATE') THEN
    -- Track proposal_due changes
    IF (OLD.proposal_due IS DISTINCT FROM NEW.proposal_due) THEN
      INSERT INTO public.opportunity_changes (opportunity_id, changed_by, field_name, old_value, new_value, change_type)
      VALUES (NEW.id, changed_user, 'proposal_due', OLD.proposal_due::TEXT, NEW.proposal_due::TEXT, 'updated');
    END IF;

    -- Track estimated value changes
    IF (OLD.estimated_value_min IS DISTINCT FROM NEW.estimated_value_min) THEN
      INSERT INTO public.opportunity_changes (opportunity_id, changed_by, field_name, old_value, new_value, change_type)
      VALUES (NEW.id, changed_user, 'estimated_value_min', OLD.estimated_value_min::TEXT, NEW.estimated_value_min::TEXT, 'updated');
    END IF;

    IF (OLD.estimated_value_max IS DISTINCT FROM NEW.estimated_value_max) THEN
      INSERT INTO public.opportunity_changes (opportunity_id, changed_by, field_name, old_value, new_value, change_type)
      VALUES (NEW.id, changed_user, 'estimated_value_max', OLD.estimated_value_max::TEXT, NEW.estimated_value_max::TEXT, 'updated');
    END IF;

    -- Track title changes
    IF (OLD.title IS DISTINCT FROM NEW.title) THEN
      INSERT INTO public.opportunity_changes (opportunity_id, changed_by, field_name, old_value, new_value, change_type)
      VALUES (NEW.id, changed_user, 'title', OLD.title, NEW.title, 'updated');
    END IF;

    -- Track summary/description changes
    IF (OLD.summary IS DISTINCT FROM NEW.summary) THEN
      INSERT INTO public.opportunity_changes (opportunity_id, changed_by, field_name, old_value, new_value, change_type)
      VALUES (NEW.id, changed_user, 'summary', OLD.summary, NEW.summary, 'updated');
    END IF;

    -- Track status changes
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
      INSERT INTO public.opportunity_changes (opportunity_id, changed_by, field_name, old_value, new_value, change_type)
      VALUES (NEW.id, changed_user, 'status', OLD.status::TEXT, NEW.status::TEXT, 'updated');
    END IF;

    -- Track priority changes
    IF (OLD.priority IS DISTINCT FROM NEW.priority) THEN
      INSERT INTO public.opportunity_changes (opportunity_id, changed_by, field_name, old_value, new_value, change_type)
      VALUES (NEW.id, changed_user, 'priority', OLD.priority::TEXT, NEW.priority::TEXT, 'updated');
    END IF;

    -- Track agency changes
    IF (OLD.agency IS DISTINCT FROM NEW.agency) THEN
      INSERT INTO public.opportunity_changes (opportunity_id, changed_by, field_name, old_value, new_value, change_type)
      VALUES (NEW.id, changed_user, 'agency', OLD.agency, NEW.agency, 'updated');
    END IF;

    -- Track geography changes
    IF (OLD.geography_state IS DISTINCT FROM NEW.geography_state) THEN
      INSERT INTO public.opportunity_changes (opportunity_id, changed_by, field_name, old_value, new_value, change_type)
      VALUES (NEW.id, changed_user, 'geography_state', OLD.geography_state, NEW.geography_state, 'updated');
    END IF;

    IF (OLD.geography_county IS DISTINCT FROM NEW.geography_county) THEN
      INSERT INTO public.opportunity_changes (opportunity_id, changed_by, field_name, old_value, new_value, change_type)
      VALUES (NEW.id, changed_user, 'geography_county', OLD.geography_county, NEW.geography_county, 'updated');
    END IF;

    RETURN NEW;
  END IF;

  -- Handle DELETE
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.opportunity_changes (opportunity_id, changed_by, field_name, old_value, change_type)
    VALUES (OLD.id, changed_user, 'deleted', 'Opportunity deleted', 'deleted');
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER track_opportunity_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.track_opportunity_changes();