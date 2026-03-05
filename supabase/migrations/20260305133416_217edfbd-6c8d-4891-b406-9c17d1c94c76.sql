
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone DEFAULT now();

-- Backfill existing tasks: set assigned_at to created_at
UPDATE public.tasks SET assigned_at = created_at WHERE assigned_at IS NULL;
