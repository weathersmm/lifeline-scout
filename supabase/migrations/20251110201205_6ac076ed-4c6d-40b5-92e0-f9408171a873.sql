-- Add RLS policy for admins to view all rate limits
CREATE POLICY "Admins can view all rate limits"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);