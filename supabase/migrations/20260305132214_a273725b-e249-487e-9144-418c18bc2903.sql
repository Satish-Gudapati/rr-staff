
-- Services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sub-services table
CREATE TABLE public.sub_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_services ENABLE ROW LEVEL SECURITY;

-- Services RLS: Owner can CRUD, employees can view
CREATE POLICY "Owner can manage services" ON public.services
  FOR ALL TO authenticated
  USING (owner_id = get_my_profile_id())
  WITH CHECK (owner_id = get_my_profile_id());

CREATE POLICY "Employees can view services" ON public.services
  FOR SELECT TO authenticated
  USING (
    owner_id IN (
      SELECT owner_id FROM public.profiles WHERE id = get_my_profile_id() AND owner_id IS NOT NULL
    )
  );

-- Sub-services RLS: Owner can CRUD, employees can view
CREATE POLICY "Owner can manage sub_services" ON public.sub_services
  FOR ALL TO authenticated
  USING (owner_id = get_my_profile_id())
  WITH CHECK (owner_id = get_my_profile_id());

CREATE POLICY "Employees can view sub_services" ON public.sub_services
  FOR SELECT TO authenticated
  USING (
    owner_id IN (
      SELECT owner_id FROM public.profiles WHERE id = get_my_profile_id() AND owner_id IS NOT NULL
    )
  );

-- Updated_at triggers
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_services_updated_at BEFORE UPDATE ON public.sub_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
