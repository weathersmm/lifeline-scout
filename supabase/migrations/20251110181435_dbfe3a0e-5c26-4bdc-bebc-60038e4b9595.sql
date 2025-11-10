-- Add public read access for opportunities table so demo page can display real data
CREATE POLICY "Public can view opportunities"
ON public.opportunities
FOR SELECT
USING (true);