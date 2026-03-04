
-- Add task_id column to sales to link sales with tasks
ALTER TABLE public.sales ADD COLUMN task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_sales_task_id ON public.sales(task_id);

-- Create a trigger function to auto-create a sale when task is completed + paid
CREATE OR REPLACE FUNCTION public.auto_create_sale_on_task_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when status changes to 'completed' AND payment_status is 'paid'
  IF NEW.status = 'completed' AND NEW.payment_status = 'paid'
     AND (OLD.status <> 'completed' OR OLD.payment_status <> 'paid')
     AND COALESCE(NEW.total_amount, 0) > 0 THEN
    -- Check if a sale already exists for this task
    IF NOT EXISTS (SELECT 1 FROM public.sales WHERE task_id = NEW.id) THEN
      INSERT INTO public.sales (owner_id, entered_by, amount, payment_mode, description, customer_name, task_id)
      VALUES (
        NEW.owner_id,
        NEW.assigned_to,
        COALESCE(NEW.total_amount, 0),
        'cash',
        'Auto-generated from task: ' || NEW.title,
        NULL,
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to tasks table
CREATE TRIGGER trg_auto_sale_on_task_completion
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_sale_on_task_completion();
