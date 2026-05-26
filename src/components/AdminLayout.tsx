import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Package, Users, Calendar, ShoppingCart, FileBarChart, History, LogOut, Camera, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/productos", label: "Productos", icon: Package },
  { to: "/admin/pos", label: "Nueva venta", icon: ShoppingCart, badge: true },
  { to: "/admin/pedidos", label: "Pedidos", icon: History },
  { to: "/admin/reservas", label: "Reservas", icon: Calendar },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/reportes", label: "Reportes", icon: FileBarChart, adminOnly: true },
] as const;

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { count } = useCart();
  const nav2 = useNavigate();
  const [open, setOpen] = useState(false);

  const visible = nav.filter((n) => !n.adminOnly || isAdmin);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform md:translate-x-0 md:static",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center gap-2 px-5 border-b border-sidebar-border">
          <div className="size-9 rounded-lg bg-gradient-gold grid place-items-center shadow-gold">
            <Camera className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display font-bold text-lg text-sidebar-foreground leading-tight">LC-LAB</div>
            <div className="text-[10px] uppercase tracking-widest text-gold">Estudio Fotográfico</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visible.map((n) => {
            const active = n.end ? path === n.to : path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-gold border-l-2 border-gold"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}>
                <n.icon className="size-4" />
                <span className="flex-1">{n.label}</span>
                {n.badge && count > 0 && <Badge className="bg-gold text-primary-foreground hover:bg-gold">{count}</Badge>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 text-xs text-sidebar-foreground/60 truncate">{user?.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/80" onClick={async () => { await signOut(); nav2({ to: "/login" }); }}>
            <LogOut className="size-4 mr-2" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/40 backdrop-blur flex items-center px-4 md:px-6 gap-3 sticky top-0 z-20">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((o) => !o)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
          <div className="font-display text-lg font-semibold">Panel administrativo</div>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="border-gold/30 text-gold hover:bg-gold/10 hover:text-gold">
              <Link to="/admin/pos"><ShoppingCart className="size-4 mr-2" />Nueva venta {count > 0 && `(${count})`}</Link>
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
