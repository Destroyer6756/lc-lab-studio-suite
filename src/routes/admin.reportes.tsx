import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/reportes")({ component: Reports });

const colors = ["#c9a84c", "#f0d78c", "#8b7a3a", "#5c5028"];

function Reports() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data: orders } = await supabase.from("orders").select("total, payment_method, doc_kind, created_at, status").order("created_at", { ascending: false }).limit(500);
      const valid = (orders ?? []).filter(o => o.status !== "anulado");

      const byMonth: Record<string, number> = {};
      valid.forEach(o => {
        const k = new Date(o.created_at).toLocaleDateString("es-PE", { month: "short", year: "numeric" });
        byMonth[k] = (byMonth[k] ?? 0) + Number(o.total);
      });
      const monthly = Object.entries(byMonth).reverse().slice(-6).reverse().map(([m, total]) => ({ month: m, total: Number(total.toFixed(2)) }));

      const byPay: Record<string, number> = {};
      valid.forEach(o => { byPay[o.payment_method] = (byPay[o.payment_method] ?? 0) + Number(o.total); });
      const pay = Object.entries(byPay).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));

      const byDoc: Record<string, number> = {};
      valid.forEach(o => { byDoc[o.doc_kind] = (byDoc[o.doc_kind] ?? 0) + 1; });
      const docs = Object.entries(byDoc).map(([name, value]) => ({ name, value }));

      const totalRev = valid.reduce((s, o) => s + Number(o.total), 0);
      return { monthly, pay, docs, totalRev, count: valid.length };
    },
  });

  if (isLoading) return <div className="grid place-items-center py-20"><Loader2 className="size-8 animate-spin text-gold" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Reportes</h1>
        <p className="text-muted-foreground">Análisis de ventas y operaciones</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border"><CardContent className="p-5"><div className="text-xs uppercase tracking-wider text-muted-foreground">Ingresos</div><div className="font-display text-2xl font-bold text-gold mt-2">S/ {data?.totalRev.toFixed(2)}</div></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-5"><div className="text-xs uppercase tracking-wider text-muted-foreground">Pedidos válidos</div><div className="font-display text-2xl font-bold mt-2">{data?.count}</div></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-5"><div className="text-xs uppercase tracking-wider text-muted-foreground">Ticket promedio</div><div className="font-display text-2xl font-bold mt-2">S/ {data?.count ? (data.totalRev / data.count).toFixed(2) : "0.00"}</div></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-5"><div className="text-xs uppercase tracking-wider text-muted-foreground">Comprobantes</div><div className="font-display text-2xl font-bold mt-2">{(data?.docs ?? []).reduce((s, d) => s + d.value, 0)}</div></CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="font-display">Ventas mensuales</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.monthly ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="total" fill="var(--gold)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="font-display">Por método de pago</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.pay ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {(data?.pay ?? []).map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
