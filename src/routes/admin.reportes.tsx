import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Loader2, FileSpreadsheet, FileText } from "lucide-react";
import { exportToExcel } from "@/lib/excel";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/admin/reportes")({ component: Reports });

const colors = ["#c9a84c", "#f0d78c", "#8b7a3a", "#5c5028"];

function Reports() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("number, total, payment_method, doc_kind, created_at, status")
        .order("created_at", { ascending: false })
        .limit(500);
      const valid = (orders ?? []).filter((o) => o.status !== "anulado");

      const byMonth: Record<string, number> = {};
      valid.forEach((o) => {
        const k = new Date(o.created_at).toLocaleDateString("es-PE", {
          month: "short",
          year: "numeric",
        });
        byMonth[k] = (byMonth[k] ?? 0) + Number(o.total);
      });
      const monthly = Object.entries(byMonth)
        .reverse()
        .slice(-6)
        .reverse()
        .map(([m, total]) => ({ month: m, total: Number(total.toFixed(2)) }));

      const byPay: Record<string, number> = {};
      valid.forEach((o) => {
        byPay[o.payment_method] = (byPay[o.payment_method] ?? 0) + Number(o.total);
      });
      const pay = Object.entries(byPay).map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2)),
      }));

      const byDoc: Record<string, { count: number; total: number }> = {};
      valid.forEach((o) => {
        const k = o.doc_kind;
        if (!byDoc[k]) byDoc[k] = { count: 0, total: 0 };
        byDoc[k].count += 1;
        byDoc[k].total += Number(o.total);
      });
      const docs = Object.entries(byDoc).map(([name, v]) => ({
        name,
        value: v.count,
        total: Number(v.total.toFixed(2)),
      }));


      const totalRev = valid.reduce((s, o) => s + Number(o.total), 0);
      return { monthly, pay, docs, totalRev, count: valid.length, orders: valid };
    },
  });

  if (isLoading)
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-8 animate-spin text-gold" />
      </div>
    );

  const exportExcel = () => {
    if (!data) return;
    exportToExcel(`reporte-lc-lab-${new Date().toISOString().slice(0, 10)}`, [
      {
        name: "Resumen",
        rows: [
          { Indicador: "Ingresos totales", Valor: data.totalRev.toFixed(2) },
          { Indicador: "Pedidos válidos", Valor: data.count },
          {
            Indicador: "Ticket promedio",
            Valor: data.count ? (data.totalRev / data.count).toFixed(2) : "0.00",
          },
        ],
      },
      {
        name: "Ventas mensuales",
        rows: data.monthly.map((m) => ({ Mes: m.month, Total: m.total })),
      },
      {
        name: "Por método de pago",
        rows: data.pay.map((p) => ({ Método: p.name, Total: p.value })),
      },
      {
        name: "Pedidos",
        rows: data.orders.map((o) => ({
          Número: o.number,
          Fecha: new Date(o.created_at).toLocaleString("es-PE"),
          Comprobante: o.doc_kind,
          Pago: o.payment_method,
          Estado: o.status,
          Total: Number(o.total).toFixed(2),
        })),
      },
    ]);
  };

  const exportPdf = () => {
    if (!data) return;
    const doc = new jsPDF();
    const gold: [number, number, number] = [201, 168, 76];
    doc.setFillColor(13, 13, 13);
    doc.rect(0, 0, 210, 25, "F");
    doc.setTextColor(...gold);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("LC-LAB — Reporte de ventas", 15, 16);
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado: ${new Date().toLocaleString("es-PE")}`, 15, 33);
    doc.text(
      `Ingresos: S/ ${data.totalRev.toFixed(2)}  •  Pedidos: ${data.count}  •  Ticket prom.: S/ ${data.count ? (data.totalRev / data.count).toFixed(2) : "0.00"}`,
      15,
      40,
    );
    autoTable(doc, {
      startY: 48,
      head: [["N°", "Fecha", "Comprobante", "Pago", "Estado", "Total"]],
      body: data.orders.map((o) => [
        o.number,
        new Date(o.created_at).toLocaleDateString("es-PE"),
        o.doc_kind,
        o.payment_method,
        o.status,
        `S/ ${Number(o.total).toFixed(2)}`,
      ]),
      headStyles: { fillColor: [13, 13, 13], textColor: gold },
    });
    doc.save(`reporte-lc-lab-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Reportes</h1>
          <p className="text-muted-foreground">Análisis de ventas y operaciones</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportExcel}
            className="border-gold/30 text-gold hover:bg-gold/10 hover:text-gold"
          >
            <FileSpreadsheet className="size-4 mr-2" /> Excel
          </Button>
          <Button
            variant="outline"
            onClick={exportPdf}
            className="border-gold/30 text-gold hover:bg-gold/10 hover:text-gold"
          >
            <FileText className="size-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Ingresos</div>
            <div className="font-display text-2xl font-bold text-gold mt-2">
              S/ {data?.totalRev.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Pedidos válidos
            </div>
            <div className="font-display text-2xl font-bold mt-2">{data?.count}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Ticket promedio
            </div>
            <div className="font-display text-2xl font-bold mt-2">
              S/ {data?.count ? (data.totalRev / data.count).toFixed(2) : "0.00"}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Comprobantes
            </div>
            <div className="font-display text-2xl font-bold mt-2">
              {(data?.docs ?? []).reduce((s, d) => s + d.value, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display">Ventas mensuales</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.monthly ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="total" fill="var(--gold)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display">Boletas vs Facturas</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const boleta = data?.docs.find((d) => d.name === "boleta") ?? { value: 0, total: 0 };
              const factura = data?.docs.find((d) => d.name === "factura") ?? { value: 0, total: 0 };
              const totalCount = boleta.value + factura.value;
              const totalAmount = boleta.total + factura.total;
              const rows = [
                { label: "Boletas", count: boleta.value, total: boleta.total },
                { label: "Facturas", count: factura.value, total: factura.total },
              ];
              return (
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-medium text-muted-foreground">Comprobante</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground text-center">Cantidad</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground text-right">Monto total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.label} className="border-t border-border">
                          <td className="px-4 py-3 font-medium">{r.label}</td>
                          <td className="px-4 py-3 text-center font-display text-lg">{r.count}</td>
                          <td className="px-4 py-3 text-right font-display text-lg text-gold">
                            S/ {r.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t border-border bg-muted/30">
                        <td className="px-4 py-3 font-bold uppercase tracking-wider text-xs">Total</td>
                        <td className="px-4 py-3 text-center font-display text-xl font-bold">{totalCount}</td>
                        <td className="px-4 py-3 text-right font-display text-xl font-bold text-gold">
                          S/ {totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
