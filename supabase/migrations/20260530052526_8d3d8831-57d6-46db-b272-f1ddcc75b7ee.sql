
-- Prevent duplicate customers by document
CREATE UNIQUE INDEX IF NOT EXISTS customers_doc_unique ON public.customers (doc_type, doc_number);

-- Prevent negative stock and prices
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_stock_nonneg;
ALTER TABLE public.products ADD CONSTRAINT products_stock_nonneg CHECK (stock >= 0);
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_price_nonneg;
ALTER TABLE public.products ADD CONSTRAINT products_price_nonneg CHECK (price >= 0);

-- Validate stock at order_item insert time (atomic + clearer message than CHECK after trigger)
CREATE OR REPLACE FUNCTION public.validate_stock_before_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stock INT;
  prod_name TEXT;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;
  SELECT stock, name INTO current_stock, prod_name FROM public.products WHERE id = NEW.product_id;
  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;
  IF NEW.quantity > current_stock THEN
    RAISE EXCEPTION 'Stock insuficiente para "%". Disponible: %, solicitado: %', prod_name, current_stock, NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_stock_before_item ON public.order_items;
CREATE TRIGGER trg_validate_stock_before_item
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_stock_before_item();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_order_id ON public.payment_transactions (order_id);
CREATE INDEX IF NOT EXISTS idx_reservations_scheduled_at ON public.reservations (scheduled_at DESC);
