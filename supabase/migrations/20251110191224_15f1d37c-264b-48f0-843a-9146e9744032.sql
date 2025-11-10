-- Remove public access to opportunities table
-- This policy allows unauthenticated users to view all opportunities,
-- exposing business-critical intelligence to competitors
DROP POLICY IF EXISTS "Public can view opportunities" ON public.opportunities;