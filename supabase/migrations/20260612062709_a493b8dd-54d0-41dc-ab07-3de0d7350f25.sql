
CREATE TYPE public.cash_session_status AS ENUM ('abierta', 'cerrada');

CREATE TABLE public.cash_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opening_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  closing_amount NUMERIC(10,2),
  expected_amount NUMERIC(10,2),
  status public.cash_session_status NOT NULL DEFAULT 'abierta',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX cash_sessions_one_open_idx
  ON public.cash_sessions ((1)) WHERE status = 'abierta';

CREATE INDEX cash_sessions_opened_at_idx ON public.cash_sessions(opened_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.cash_sessions TO authenticated;
GRANT ALL ON public.cash_sessions TO service_role;

ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view cash sessions"
  ON public.cash_sessions FOR SELECT TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can open cash sessions"
  ON public.cash_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can close cash sessions"
  ON public.cash_sessions FOR UPDATE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_cash_sessions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER cash_sessions_touch_updated_at
  BEFORE UPDATE ON public.cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_cash_sessions_updated_at();

ALTER TABLE public.orders
  ADD COLUMN cash_session_id UUID REFERENCES public.cash_sessions(id) ON DELETE SET NULL;

CREATE INDEX orders_cash_session_id_idx ON public.orders(cash_session_id);
