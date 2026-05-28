
CREATE TYPE public.payment_status AS ENUM ('pendiente', 'confirmado', 'rechazado', 'reembolsado');

CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method payment_method NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status payment_status NOT NULL DEFAULT 'pendiente',
  reference TEXT,
  notes TEXT,
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_tx_order ON public.payment_transactions(order_id);
CREATE INDEX idx_payment_tx_status ON public.payment_transactions(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_tx staff all"
ON public.payment_transactions
FOR ALL
TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));
