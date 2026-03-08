
-- Attendance records table
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  check_in timestamptz,
  check_out timestamptz,
  total_hours numeric DEFAULT 0,
  total_break_minutes numeric DEFAULT 0,
  ip_address text,
  location_lat numeric,
  location_lng numeric,
  location_name text,
  notes text,
  status text NOT NULL DEFAULT 'checked_in',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, date)
);

-- Break records within an attendance day
CREATE TABLE public.attendance_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id uuid NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
  break_start timestamptz NOT NULL DEFAULT now(),
  break_end timestamptz,
  duration_minutes numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_breaks ENABLE ROW LEVEL SECURITY;

-- RLS: Employees can view/manage their own attendance
CREATE POLICY "Employees can view own attendance"
  ON public.attendance FOR SELECT
  USING (profile_id = get_my_profile_id() OR owner_id = get_my_profile_id());

CREATE POLICY "Employees can insert own attendance"
  ON public.attendance FOR INSERT
  WITH CHECK (profile_id = get_my_profile_id());

CREATE POLICY "Employees can update own attendance"
  ON public.attendance FOR UPDATE
  USING (profile_id = get_my_profile_id() OR owner_id = get_my_profile_id());

-- RLS for breaks
CREATE POLICY "Users can view breaks"
  ON public.attendance_breaks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.attendance a 
    WHERE a.id = attendance_breaks.attendance_id 
    AND (a.profile_id = get_my_profile_id() OR a.owner_id = get_my_profile_id())
  ));

CREATE POLICY "Users can insert breaks"
  ON public.attendance_breaks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.attendance a 
    WHERE a.id = attendance_breaks.attendance_id 
    AND a.profile_id = get_my_profile_id()
  ));

CREATE POLICY "Users can update breaks"
  ON public.attendance_breaks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.attendance a 
    WHERE a.id = attendance_breaks.attendance_id 
    AND a.profile_id = get_my_profile_id()
  ));

-- Add updated_at trigger
CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add attendance permission
INSERT INTO public.permissions (name, label, description) 
VALUES ('can_view_attendance', 'View Attendance', 'Can view attendance records of all employees');
