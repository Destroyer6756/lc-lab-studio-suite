
-- Lock down SECURITY DEFINER functions: revoke from anon/public, grant only where needed.

-- Helpers used by RLS policies on authenticated tables
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_staff_or_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) TO authenticated, service_role;

-- Admin-only RPC
REVOKE ALL ON FUNCTION public.reset_history(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_history(date) TO authenticated, service_role;

-- Trigger-only functions (never invoked directly by clients)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrement_stock_on_item() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.adjust_stock_on_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_stock_before_item() FROM PUBLIC, anon, authenticated;
