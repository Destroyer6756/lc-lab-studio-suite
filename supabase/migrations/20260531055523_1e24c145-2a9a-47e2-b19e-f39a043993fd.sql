
-- Tighten write access on catalog/customers to admin only
DROP POLICY IF EXISTS "products write staff" ON public.products;
CREATE POLICY "products write admin" ON public.products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "cats write staff" ON public.categories;
CREATE POLICY "cats write admin" ON public.categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Customers: allow staff to read/create (needed for POS), but only admin can update/delete
DROP POLICY IF EXISTS "customers staff all" ON public.customers;
CREATE POLICY "customers staff read" ON public.customers
  FOR SELECT TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "customers staff insert" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "customers admin update" ON public.customers
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "customers admin delete" ON public.customers
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Orders: staff can create/read; only admin can update (anular/marcar pagado) or delete
DROP POLICY IF EXISTS "orders staff all" ON public.orders;
CREATE POLICY "orders staff read" ON public.orders
  FOR SELECT TO authenticated USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "orders staff insert" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "orders admin update" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "orders admin delete" ON public.orders
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Reservations: same model (staff can create, admin manages lifecycle)
DROP POLICY IF EXISTS "res staff all" ON public.reservations;
CREATE POLICY "res staff read" ON public.reservations
  FOR SELECT TO authenticated USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "res staff insert" ON public.reservations
  FOR INSERT TO authenticated WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "res admin update" ON public.reservations
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "res admin delete" ON public.reservations
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
