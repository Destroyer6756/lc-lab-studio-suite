import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AdminLayout } from "@/components/AdminLayout";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminRoot });

function AdminRoot() {
  const { user, loading, isStaff } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="size-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4 text-center">
        <div>
          <h2 className="font-display text-2xl mb-2">Acceso restringido</h2>
          <p className="text-muted-foreground">Tu cuenta no tiene permisos. Contacta al administrador.</p>
        </div>
      </div>
    );
  }

  return <AdminLayout><Outlet /></AdminLayout>;
}
