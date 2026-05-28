import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, Calendar, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [products, customers, reservations, orders] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "pendiente"),
        supabase.from("orders").select("total, created_at, status").order("created_at", { ascending: false }).limit(200),
      ]);
      const revenue = (orders.data ?? []).filter(o => o.status !== "anulado").reduce((s, o) => s + Number(o.total), 0);
      const byDay: Record<string, number> = {};
      (orders.data ?? []).forEach((o) => {
        const d = new Date(o.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
        byDay[d] = (byDay[d] ?? 0) + Number(o.total);
      });
      const chart = Object.entries(byDay).reverse().slice(-7).map(([day, total]) => ({ day, total }));
      return {
        products: products.count ?? 0,
        customers: customers.count ?? 0,
        reservations: reservations.count ?? 0,
        revenue,
        chart,
      };
    },
  });

  const stats = [
    { label: "Productos", value: data?.products ?? 0, icon: Package },
    { label: "Clientes", value: data?.customers ?? 0, icon: Users },
    { label: "Reservas pendientes", value: data?.reservations ?? 0, icon: Calendar },
    { label: "Ingresos totales", value: `S/ ${(data?.revenue ?? 0).toFixed(2)}`, icon: DollarSign, accent: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Resumen</h1>
        <p className="text-muted-foreground">Vista general de tu estudio fotográfico</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
                  <div className={`mt-2 text-2xl font-display font-bold ${s.accent ? "text-gold" : ""}`}>{s.value}</div>
                </div>
                <div className={`size-10 rounded-lg grid place-items-center ${s.accent ? "bg-gradient-gold shadow-gold" : "bg-secondary"}`}>
                  <s.icon className={`size-5 ${s.accent ? "text-primary-foreground" : "text-gold"}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <TrendingUp className="size-5 text-gold" /> Ventas últimos días
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          {data?.chart && data.chart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                  formatter={(v: number) => [`S/ ${v.toFixed(2)}`, "Total"]}
                />
                <Bar dataKey="total" fill="var(--gold)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full grid place-items-center text-muted-foreground">Sin datos aún</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
