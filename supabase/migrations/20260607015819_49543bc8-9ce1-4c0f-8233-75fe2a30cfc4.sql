
-- Revoke EXECUTE on trigger SECURITY DEFINER functions from public roles (they only need to run as triggers)
REVOKE EXECUTE ON FUNCTION public.decrement_stock_on_item() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.adjust_stock_on_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_stock_before_item() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- Restrict broad SELECT (list) policy on storage.objects for the public bucket.
-- Public file URLs still work; we just stop directory listing.
DROP POLICY IF EXISTS "auth read images" ON storage.objects;
CREATE POLICY "staff list images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'lc-lab-images' AND public.is_staff_or_admin(auth.uid()));
