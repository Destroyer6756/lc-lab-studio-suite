
-- Decrement stock when order_items inserted (only if order is not anulado)
CREATE OR REPLACE FUNCTION public.decrement_stock_on_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ord_status order_status;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;
  SELECT status INTO ord_status FROM public.orders WHERE id = NEW.order_id;
  IF ord_status IS DISTINCT FROM 'anulado' THEN
    UPDATE public.products
       SET stock = GREATEST(0, stock - NEW.quantity)
     WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_stock ON public.order_items;
CREATE TRIGGER trg_decrement_stock
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_on_item();

-- Restore / re-deduct stock when order status changes to/from anulado
CREATE OR REPLACE FUNCTION public.adjust_stock_on_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'anulado' AND OLD.status IS DISTINCT FROM 'anulado' THEN
    -- restore stock
    UPDATE public.products p
       SET stock = stock + oi.quantity
      FROM public.order_items oi
     WHERE oi.order_id = NEW.id AND oi.product_id = p.id;
  ELSIF OLD.status = 'anulado' AND NEW.status IS DISTINCT FROM 'anulado' THEN
    -- re-deduct
    UPDATE public.products p
       SET stock = GREATEST(0, stock - oi.quantity)
      FROM public.order_items oi
     WHERE oi.order_id = NEW.id AND oi.product_id = p.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_adjust_stock_status ON public.orders;
CREATE TRIGGER trg_adjust_stock_status
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.adjust_stock_on_status();
