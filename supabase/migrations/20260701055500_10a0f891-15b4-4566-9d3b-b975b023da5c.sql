
CREATE OR REPLACE FUNCTION public.reset_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo un administrador puede borrar el historial';
  END IF;
  DELETE FROM public.payment_transactions;
  DELETE FROM public.order_items;
  DELETE FROM public.sunat_documents;
  DELETE FROM public.orders;
  DELETE FROM public.reservations;
  DELETE FROM public.cash_sessions;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_history() TO authenticated;
