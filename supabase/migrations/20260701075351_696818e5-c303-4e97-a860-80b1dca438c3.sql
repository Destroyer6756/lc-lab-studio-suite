CREATE OR REPLACE FUNCTION public.reset_history(_day date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tz text := 'America/Lima';
  day_start timestamptz := (_day::timestamp AT TIME ZONE tz);
  day_end timestamptz := ((_day + 1)::timestamp AT TIME ZONE tz);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo un administrador puede borrar el historial';
  END IF;

  DELETE FROM public.payment_transactions
   WHERE order_id IN (
     SELECT id FROM public.orders
      WHERE created_at >= day_start AND created_at < day_end
   );

  DELETE FROM public.order_items
   WHERE order_id IN (
     SELECT id FROM public.orders
      WHERE created_at >= day_start AND created_at < day_end
   );

  DELETE FROM public.sunat_documents
   WHERE order_id IN (
     SELECT id FROM public.orders
      WHERE created_at >= day_start AND created_at < day_end
   );

  DELETE FROM public.orders
   WHERE created_at >= day_start AND created_at < day_end;

  DELETE FROM public.reservations
   WHERE scheduled_at >= day_start AND scheduled_at < day_end;

  DELETE FROM public.cash_sessions
   WHERE opened_at >= day_start AND opened_at < day_end;
END;
$$;

-- Remove the old parameterless version so only the dated one exists
DROP FUNCTION IF EXISTS public.reset_history();