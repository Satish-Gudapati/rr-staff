
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('owner', 'employee')),
  company_name TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create permissions table (predefined website access permissions)
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default permissions
INSERT INTO public.permissions (name, label, description) VALUES
  ('can_manage_tasks', 'Manage Tasks', 'Create, edit, and delete tasks'),
  ('can_view_tasks', 'View Tasks', 'View assigned tasks'),
  ('can_manage_employees', 'Manage Employees', 'Create and manage employee accounts'),
  ('can_view_reports', 'View Reports', 'Access reports and analytics'),
  ('can_view_dashboard', 'View Dashboard', 'Access the dashboard');

-- Create employee_permissions junction table
CREATE TABLE public.employee_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, permission_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;

-- Helper function: check if current user is an owner
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'owner'
  )
$$;

-- Helper function: get current user's profile id
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- Helper function: check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employee_permissions ep
    JOIN public.permissions p ON p.id = ep.permission_id
    JOIN public.profiles pr ON pr.id = ep.profile_id
    WHERE pr.user_id = auth.uid() AND p.name = _permission_name
  )
$$;

-- Profiles RLS policies
CREATE POLICY "Owners can view all profiles under them"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR owner_id = public.get_my_profile_id()
    OR id = public.get_my_profile_id()
  );

CREATE POLICY "Owners can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_owner() OR user_id = auth.uid()
  );

CREATE POLICY "Owners can update their employees"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (public.is_owner() AND owner_id = public.get_my_profile_id())
  );

CREATE POLICY "Owners can delete their employees"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    public.is_owner() AND owner_id = public.get_my_profile_id()
  );

-- Permissions RLS (readable by all authenticated)
CREATE POLICY "Authenticated users can view permissions"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (true);

-- Employee permissions RLS
CREATE POLICY "Owners can view employee permissions"
  ON public.employee_permissions FOR SELECT
  TO authenticated
  USING (
    public.is_owner() 
    OR profile_id = public.get_my_profile_id()
  );

CREATE POLICY "Owners can manage employee permissions"
  ON public.employee_permissions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_owner());

CREATE POLICY "Owners can update employee permissions"
  ON public.employee_permissions FOR UPDATE
  TO authenticated
  USING (public.is_owner());

CREATE POLICY "Owners can delete employee permissions"
  ON public.employee_permissions FOR DELETE
  TO authenticated
  USING (public.is_owner());

-- Trigger to auto-create owner profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only auto-create profile if metadata indicates owner registration
  IF (NEW.raw_user_meta_data->>'role') = 'owner' THEN
    INSERT INTO public.profiles (user_id, full_name, email, role, company_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.email,
      'owner',
      COALESCE(NEW.raw_user_meta_data->>'company_name', '')
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
