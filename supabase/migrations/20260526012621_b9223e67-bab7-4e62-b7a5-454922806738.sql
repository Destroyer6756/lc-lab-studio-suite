
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_staff_or_admin(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

DROP POLICY IF EXISTS "public read images" ON storage.objects;
CREATE POLICY "auth read images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'lc-lab-images');
