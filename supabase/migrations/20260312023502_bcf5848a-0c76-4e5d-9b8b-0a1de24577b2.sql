
-- Create owner_plans table
CREATE TABLE public.owner_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free',
  max_employees integer NOT NULL DEFAULT 2,
  location_attendance boolean NOT NULL DEFAULT false,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.owner_plans ENABLE ROW LEVEL SECURITY;

-- Owners can view their own plan
CREATE POLICY "Owners can view own plan" ON public.owner_plans
  FOR SELECT TO authenticated
  USING (owner_id = get_my_profile_id());

-- Owners can update their own plan
CREATE POLICY "Owners can update own plan" ON public.owner_plans
  FOR UPDATE TO authenticated
  USING (owner_id = get_my_profile_id());

-- System can insert plans (via trigger)
CREATE POLICY "Allow insert for authenticated" ON public.owner_plans
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = get_my_profile_id());

-- Employees can view their owner's plan
CREATE POLICY "Employees can view owner plan" ON public.owner_plans
  FOR SELECT TO authenticated
  USING (owner_id IN (
    SELECT p.owner_id FROM profiles p WHERE p.id = get_my_profile_id() AND p.owner_id IS NOT NULL
  ));

-- Auto-create free plan for new owners
CREATE OR REPLACE FUNCTION public.auto_create_owner_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role = 'owner' THEN
    INSERT INTO public.owner_plans (owner_id, plan, max_employees, location_attendance, amount)
    VALUES (NEW.id, 'free', 2, false, 0)
    ON CONFLICT (owner_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_owner_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_owner_plan();

-- Insert plans for existing owners
INSERT INTO public.owner_plans (owner_id, plan, max_employees, location_attendance, amount)
SELECT id, 'free', 2, false, 0 FROM public.profiles WHERE role = 'owner'
ON CONFLICT (owner_id) DO NOTHING;
