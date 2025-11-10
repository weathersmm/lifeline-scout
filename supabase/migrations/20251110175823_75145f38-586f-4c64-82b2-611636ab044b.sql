-- Fix RLS policies for profiles and user_roles tables

-- 1. Fix profiles table - restrict to own profile only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 2. Fix user_roles table - allow users to see own role or admins to see all
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

CREATE POLICY "Users view own role or admins view all"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'admin'::app_role)
  );