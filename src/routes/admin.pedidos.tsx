import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileDown, Loader2, MoreVertical, CheckCircle2, Truck, Ban } from "lucide-react";
import { generateOrderPdf } from "@/lib/pdf";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/admin/pedidos")({ component: OrdersPage });

type Order = {
  id: string; number: number; doc_kind: string; payment_method: string;
  status: string; total: number; subtotal: number; igv: number; created_at: string;
  customer: { full_name: string; doc_type: string; doc_number: string; address: string | null } | null;
  order_items: { product_name: string; quantity: number; unit_price: number; subtotal: number }[];
};

const statusColor: Record<string, string> = {
  pendiente: "bg-yellow-500/15 text-yellow-500",
  pagado: "bg-green-500/15 text-green-500",
  entregado: "bg-blue-500/15 text-blue-500",
  anulado: "bg-red-500/15 text-red-500",
};

function OrdersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders")
        .select("id, number, doc_kind, payment_method, status, total, subtotal, igv, created_at, customer:customers(full_name, doc_type, doc_number, address), order_items(product_name, quantity, unit_price, subtotal)")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as unknown as Order[];
    },
  });

  const print = (o: Order) => {
    generateOrderPdf({
      number: o.number, doc_kind: o.doc_kind as "boleta" | "factura",
      payment_method: o.payment_method, created_at: o.created_at, customer: o.customer,
      items: o.order_items, subtotal: Number(o.subtotal), igv: Number(o.igv), total: Number(o.total),
    });
    toast.success("PDF generado");
  };

  const setStatus = async (id: string, status: "pagado" | "entregado" | "anulado") => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Pedido ${status}`);
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const filtered = data.filter(o =>
    String(o.number).includes(q) ||
    (o.customer?.full_name ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (o.customer?.doc_number ?? "").includes(q)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Pedidos e historial</h1>
        <p className="text-muted-foreground">Todas las ventas con sus comprobantes</p>
      </div>
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {isLoading ? <div className="py-16 grid place-items-center"><Loader2 className="size-8 animate-spin text-gold" /></div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>N°</TableHead><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead><TableHead>Pago</TableHead><TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono">{String(o.number).padStart(6, "0")}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(o.created_at).toLocaleString("es-PE")}</TableCell>
                    <TableCell>{o.customer?.full_name ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="border-gold/30 text-gold capitalize">{o.doc_kind}</Badge></TableCell>
                    <TableCell className="capitalize text-sm">{o.payment_method}</TableCell>
                    <TableCell><Badge className={`${statusColor[o.status]} border-0 capitalize`}>{o.status}</Badge></TableCell>
                    <TableCell className="text-right font-semibold text-gold">S/ {Number(o.total).toFixed(2)}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => print(o)}><FileDown className="size-4 mr-1" />PDF</Button></TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Sin pedidos</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
