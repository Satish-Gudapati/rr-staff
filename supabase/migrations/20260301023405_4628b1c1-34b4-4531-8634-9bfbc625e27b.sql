
-- Roles table for owner-created roles
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their roles" ON public.roles
  FOR ALL USING (owner_id = get_my_profile_id());

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Role-permission mapping
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage role permissions" ON public.role_permissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.roles r WHERE r.id = role_id AND r.owner_id = get_my_profile_id())
  );

-- Add role_id, salary, incentives to profiles
ALTER TABLE public.profiles
  ADD COLUMN role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  ADD COLUMN salary NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN incentives NUMERIC(12,2) DEFAULT 0;
