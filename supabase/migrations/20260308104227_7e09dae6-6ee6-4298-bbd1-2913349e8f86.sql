
-- Add service_id and sub_service_id to tasks
ALTER TABLE public.tasks 
  ADD COLUMN service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  ADD COLUMN sub_service_id uuid REFERENCES public.sub_services(id) ON DELETE SET NULL;

-- Add service_id and sub_service_id to sales
ALTER TABLE public.sales 
  ADD COLUMN service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  ADD COLUMN sub_service_id uuid REFERENCES public.sub_services(id) ON DELETE SET NULL;

-- Update the auto_create_sale function to pass service info
CREATE OR REPLACE FUNCTION public.auto_create_sale_on_task_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND NEW.payment_status = 'paid'
     AND (OLD.status <> 'completed' OR OLD.payment_status <> 'paid')
     AND COALESCE(NEW.total_amount, 0) > 0 THEN
    IF NOT EXISTS (SELECT 1 FROM public.sales WHERE task_id = NEW.id) THEN
      INSERT INTO public.sales (owner_id, entered_by, amount, payment_mode, description, customer_name, task_id, service_id, sub_service_id)
      VALUES (
        NEW.owner_id,
        NEW.assigned_to,
        COALESCE(NEW.total_amount, 0),
        'cash',
        'Auto-generated from task: ' || NEW.title,
        NULL,
        NEW.id,
        NEW.service_id,
        NEW.sub_service_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
