
-- =============================================
-- 1. Sales table
-- =============================================
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  entered_by UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_mode TEXT NOT NULL DEFAULT 'cash',
  description TEXT,
  customer_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sales" ON public.sales FOR SELECT
  USING (owner_id = get_my_profile_id() OR entered_by = get_my_profile_id());

CREATE POLICY "Authorized users can add sales" ON public.sales FOR INSERT
  WITH CHECK (is_owner() OR has_permission('can_add_sales'));

CREATE POLICY "Owner can update sales" ON public.sales FOR UPDATE
  USING (is_owner() AND owner_id = get_my_profile_id());

CREATE POLICY "Owner can delete sales" ON public.sales FOR DELETE
  USING (is_owner() AND owner_id = get_my_profile_id());

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 2. Incentives table
-- =============================================
CREATE TABLE public.incentives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  employee_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  incentive_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.incentives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage incentives" ON public.incentives FOR ALL
  USING (is_owner() AND owner_id = get_my_profile_id());

CREATE POLICY "Employees can view own incentives" ON public.incentives FOR SELECT
  USING (employee_id = get_my_profile_id());

-- =============================================
-- 3. Add new permissions (skip existing ones)
-- =============================================
INSERT INTO public.permissions (name, label, description) VALUES
  ('can_add_sales', 'Add Sales', 'Can add new sales entries'),
  ('can_view_sales', 'View All Sales', 'Can view all sales data'),
  ('can_view_own_sales', 'View Own Sales', 'Can view own sales entries'),
  ('can_manage_incentives', 'Manage Incentives', 'Can add/edit incentives'),
  ('can_view_own_incentives', 'View Own Incentives', 'Can view own incentive history'),
  ('can_add_enquiries', 'Add Enquiries', 'Can add customer enquiries')
ON CONFLICT DO NOTHING;

-- =============================================
-- 4. Enable Realtime
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incentives;

-- =============================================
-- 5. Function to create default roles for owner
-- =============================================
CREATE OR REPLACE FUNCTION public.create_default_roles_for_owner(p_owner_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id UUID;
  v_perm RECORD;
BEGIN
  -- Cashier (All Rounder)
  INSERT INTO public.roles (owner_id, name, description)
  VALUES (p_owner_id, 'Cashier', 'All-rounder with sales and task access')
  RETURNING id INTO v_role_id;
  FOR v_perm IN SELECT id FROM permissions WHERE name IN ('can_add_sales','can_view_own_sales','can_view_tasks','can_manage_tasks','can_view_own_incentives','can_view_dashboard')
  LOOP
    INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm.id);
  END LOOP;

  -- Computer Operator
  INSERT INTO public.roles (owner_id, name, description)
  VALUES (p_owner_id, 'Computer Operator', 'Data entry and task management')
  RETURNING id INTO v_role_id;
  FOR v_perm IN SELECT id FROM permissions WHERE name IN ('can_view_tasks','can_view_own_incentives','can_view_dashboard')
  LOOP
    INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm.id);
  END LOOP;

  -- Front Office Executive
  INSERT INTO public.roles (owner_id, name, description)
  VALUES (p_owner_id, 'Front Office Executive', 'Customer interaction and task updates')
  RETURNING id INTO v_role_id;
  FOR v_perm IN SELECT id FROM permissions WHERE name IN ('can_add_enquiries','can_view_tasks','can_manage_tasks','can_view_own_incentives','can_view_dashboard')
  LOOP
    INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm.id);
  END LOOP;
END;
$$;

-- =============================================
-- 6. Update handle_new_user to seed default roles
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  IF (NEW.raw_user_meta_data->>'role') = 'owner' THEN
    INSERT INTO public.profiles (user_id, full_name, email, role, company_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.email,
      'owner',
      COALESCE(NEW.raw_user_meta_data->>'company_name', '')
    )
    RETURNING id INTO v_profile_id;

    -- Create default roles for this new owner
    PERFORM create_default_roles_for_owner(v_profile_id);
  END IF;
  RETURN NEW;
END;
$$;
