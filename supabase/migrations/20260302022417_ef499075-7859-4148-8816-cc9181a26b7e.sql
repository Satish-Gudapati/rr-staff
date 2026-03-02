
-- Tasks table for work/service tracking
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  assigned_to UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  service_type TEXT NOT NULL DEFAULT 'General',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  total_amount NUMERIC(12,2) DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task activity/timeline log
CREATE TABLE public.task_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activities ENABLE ROW LEVEL SECURITY;

-- Tasks: owner sees all their tasks, employees see tasks assigned to them or created by them
CREATE POLICY "Users can view relevant tasks"
ON public.tasks FOR SELECT
USING (
  owner_id = get_my_profile_id()
  OR assigned_to = get_my_profile_id()
  OR created_by = get_my_profile_id()
);

CREATE POLICY "Authorized users can create tasks"
ON public.tasks FOR INSERT
WITH CHECK (
  is_owner() OR has_permission('can_manage_tasks')
);

CREATE POLICY "Authorized users can update tasks"
ON public.tasks FOR UPDATE
USING (
  owner_id = get_my_profile_id()
  OR assigned_to = get_my_profile_id()
  OR (has_permission('can_manage_tasks'))
);

CREATE POLICY "Owners can delete tasks"
ON public.tasks FOR DELETE
USING (
  is_owner() AND owner_id = get_my_profile_id()
);

-- Task activities: viewable by task participants
CREATE POLICY "Users can view task activities"
ON public.task_activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_activities.task_id
    AND (t.owner_id = get_my_profile_id() OR t.assigned_to = get_my_profile_id() OR t.created_by = get_my_profile_id())
  )
);

CREATE POLICY "Users can add task activities"
ON public.task_activities FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_activities.task_id
    AND (t.owner_id = get_my_profile_id() OR t.assigned_to = get_my_profile_id() OR t.created_by = get_my_profile_id())
  )
);

-- Updated_at trigger
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_activities;
