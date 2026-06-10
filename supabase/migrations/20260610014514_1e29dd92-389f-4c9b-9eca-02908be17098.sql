
-- Tabla para guardar la respuesta de SUNAT (vía Factiliza) por pedido
CREATE TYPE public.sunat_status AS ENUM ('pendiente','enviado','aceptado','rechazado','anulado');
CREATE TYPE public.sunat_doc_type AS ENUM ('boleta','factura','nota_credito','nota_debito','resumen_diario');

CREATE TABLE public.sunat_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  doc_type public.sunat_doc_type NOT NULL,
  serie TEXT NOT NULL,
  correlativo INTEGER NOT NULL,
  status public.sunat_status NOT NULL DEFAULT 'pendiente',
  environment TEXT NOT NULL DEFAULT 'beta',
  hash TEXT,
  cdr_url TEXT,
  xml_url TEXT,
  pdf_url TEXT,
  qr TEXT,
  ticket TEXT,
  sunat_code TEXT,
  sunat_description TEXT,
  request_payload JSONB,
  response_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(serie, correlativo, doc_type)
);

CREATE INDEX idx_sunat_documents_order ON public.sunat_documents(order_id);
CREATE INDEX idx_sunat_documents_status ON public.sunat_documents(status);

GRANT SELECT, INSERT, UPDATE ON public.sunat_documents TO authenticated;
GRANT ALL ON public.sunat_documents TO service_role;

ALTER TABLE public.sunat_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff lee sunat_documents"
  ON public.sunat_documents FOR SELECT
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "staff escribe sunat_documents"
  ON public.sunat_documents FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "staff actualiza sunat_documents"
  ON public.sunat_documents FOR UPDATE
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_sunat_documents_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
REVOKE EXECUTE ON FUNCTION public.touch_sunat_documents_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_sunat_documents_updated
  BEFORE UPDATE ON public.sunat_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_sunat_documents_updated_at();
