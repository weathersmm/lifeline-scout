-- Create enum types for opportunities
CREATE TYPE public.service_tag AS ENUM (
  'EMS 911',
  'Non-Emergency',
  'IFT',
  'BLS',
  'ALS',
  'CCT',
  'MEDEVAC',
  'Billing',
  'CQI',
  'EMS Tech',
  'VR/Sim'
);

CREATE TYPE public.contract_type AS ENUM (
  'RFP',
  'RFQ',
  'RFI',
  'Sources Sought',
  'Pre-solicitation',
  'Sole-Source Notice'
);

CREATE TYPE public.priority_level AS ENUM ('high', 'medium', 'low');

CREATE TYPE public.opportunity_status AS ENUM (
  'new',
  'monitoring',
  'in-pipeline',
  'archived'
);

CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'viewer');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create opportunities table
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  agency TEXT NOT NULL,
  geography_state TEXT NOT NULL,
  geography_county TEXT,
  geography_city TEXT,
  service_tags service_tag[] NOT NULL DEFAULT '{}',
  contract_type contract_type NOT NULL,
  estimated_value_min NUMERIC,
  estimated_value_max NUMERIC,
  issue_date DATE,
  questions_due DATE,
  pre_bid_meeting DATE,
  proposal_due DATE NOT NULL,
  term_length TEXT,
  link TEXT NOT NULL,
  summary TEXT NOT NULL,
  priority priority_level NOT NULL DEFAULT 'medium',
  status opportunity_status NOT NULL DEFAULT 'new',
  source TEXT NOT NULL,
  recommended_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Create scraped_sources table to track scraping
CREATE TABLE public.scraped_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  last_scraped_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_url)
);

ALTER TABLE public.scraped_sources ENABLE ROW LEVEL SECURITY;

-- Create weekly_reports table
CREATE TABLE public.weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  total_opportunities INTEGER NOT NULL DEFAULT 0,
  high_priority_count INTEGER NOT NULL DEFAULT 0,
  report_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign default 'viewer' role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for opportunities
CREATE POLICY "Authenticated users can view opportunities"
  ON public.opportunities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members and admins can insert opportunities"
  ON public.opportunities FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'member')
  );

CREATE POLICY "Members and admins can update opportunities"
  ON public.opportunities FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'member')
  );

CREATE POLICY "Admins can delete opportunities"
  ON public.opportunities FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for scraped_sources
CREATE POLICY "Authenticated users can view sources"
  ON public.scraped_sources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage sources"
  ON public.scraped_sources FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for weekly_reports
CREATE POLICY "Authenticated users can view reports"
  ON public.weekly_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage reports"
  ON public.weekly_reports FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));