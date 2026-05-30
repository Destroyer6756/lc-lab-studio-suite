import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Trash2, Loader2, Banknote, Smartphone, CreditCard, ShoppingCart, Plus, Minus } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useState } from "react";
import { toast } from "sonner";
import { generateOrderPdf } from "@/lib/pdf";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/pos")({ component: POS });

function POS() {
  const { items, add, remove, setQty, clear, total } = useCart();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [docKind, setDocKind] = useState<"boleta" | "factura">("boleta");
  const [payment, setPayment] = useState<"efectivo" | "yape" | "plin" | "tarjeta">("efectivo");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["products-active"],
    queryFn: async () => (await supabase.from("products").select("id, name, price, image_url, stock").eq("is_active", true).order("name")).data ?? [],
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => (await supabase.from("customers").select("id, full_name, doc_type, doc_number, address").order("full_name")).data ?? [],
  });

  const filtered = products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
  const subtotal = total / 1.18;
  const igv = total - subtotal;

  const finalize = async () => {
    if (items.length === 0) return toast.error("Carrito vacío");
    if (!customerId) return toast.error("Selecciona un cliente");

    // Validación de stock client-side
    for (const i of items) {
      const p = products.find(pp => pp.id === i.product_id);
      if (!p) return toast.error(`Producto "${i.name}" ya no existe`);
      if (i.quantity > (p.stock ?? 0)) {
        return toast.error(`Stock insuficiente para "${i.name}". Disponible: ${p.stock}`);
      }
    }

    setBusy(true);
    let createdOrderId: string | null = null;
    try {
      const { data: order, error } = await supabase.from("orders").insert({
        customer_id: customerId, user_id: user?.id, doc_kind: docKind, payment_method: payment,
        status: "pagado", subtotal, igv, total,
      }).select("*").single();
      if (error) throw error;
      createdOrderId = order.id;

      const itemsPayload = items.map(i => ({
        order_id: order.id, product_id: i.product_id, product_name: i.name,
        unit_price: i.price, quantity: i.quantity, subtotal: i.price * i.quantity,
      }));
      const { error: e2 } = await supabase.from("order_items").insert(itemsPayload);
      if (e2) throw e2;

      // Registrar transacción de pago (efectivo se auto-confirma, otros quedan pendientes)
      const autoConfirm = payment === "efectivo";
      await supabase.from("payment_transactions").insert({
        order_id: order.id, payment_method: payment, amount: total,
        status: autoConfirm ? "confirmado" : "pendiente",
        confirmed_by: autoConfirm ? user?.id : null,
        confirmed_at: autoConfirm ? new Date().toISOString() : null,
      });
      if (!autoConfirm) {
        await supabase.from("orders").update({ status: "pendiente" }).eq("id", order.id);
      }

      const cust = customers.find(c => c.id === customerId);
      generateOrderPdf({
        number: order.number, doc_kind: docKind, payment_method: payment,
        created_at: order.created_at,
        customer: cust ? { full_name: cust.full_name, doc_type: cust.doc_type, doc_number: cust.doc_number, address: cust.address } : null,
        items: items.map(i => ({ product_name: i.name, quantity: i.quantity, unit_price: i.price, subtotal: i.price * i.quantity })),
        subtotal, igv, total,
      });

      toast.success(`${docKind === "factura" ? "Factura" : "Boleta"} N° ${order.number} generada`);
      clear();
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["payment-transactions"] });
      qc.invalidateQueries({ queryKey: ["products-active"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(autoConfirm ? "Pago confirmado" : "Pago pendiente de confirmación");
    } catch (e) {
      // Rollback: si se creó la orden pero falló algo después, márcala anulada
      if (createdOrderId) {
        await supabase.from("orders").update({ status: "anulado" }).eq("id", createdOrderId);
      }
      toast.error(e instanceof Error ? e.message : "Error al procesar");
    } finally { setBusy(false); }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-6">
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Nueva venta</h1>
          <p className="text-muted-foreground">Agrega productos al carrito</p>
        </div>
        <Input placeholder="Buscar producto..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map(p => (
            <button key={p.id} onClick={() => { add({ product_id: p.id, name: p.name, price: Number(p.price) }); toast.success(p.name); }}
              className="text-left rounded-lg border border-border bg-card hover:border-gold transition-colors overflow-hidden">
              <div className="aspect-square bg-secondary">
                {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> :
                  <div className="grid place-items-center h-full text-xs text-muted-foreground">Sin imagen</div>}
              </div>
              <div className="p-2">
                <div className="text-sm font-medium line-clamp-1">{p.name}</div>
                <div className="text-gold font-semibold text-sm">S/ {Number(p.price).toFixed(2)}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Card className="border-border bg-card h-fit sticky top-20">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><ShoppingCart className="size-5 text-gold" />Carrito</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">Vacío</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {items.map(i => (
                <div key={i.product_id} className="flex items-center gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{i.name}</div>
                    <div className="text-xs text-muted-foreground">S/ {i.price.toFixed(2)}</div>
                  </div>
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => setQty(i.product_id, i.quantity - 1)}><Minus className="size-3" /></Button>
                  <span className="w-6 text-center">{i.quantity}</span>
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => setQty(i.product_id, i.quantity + 1)}><Plus className="size-3" /></Button>
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => remove(i.product_id)}><Trash2 className="size-3 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
          <Separator />
          <div>
            <Label className="text-xs">Cliente</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
              <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name} — {c.doc_number}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Comprobante</Label>
            <RadioGroup value={docKind} onValueChange={(v) => setDocKind(v as "boleta" | "factura")} className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="boleta" />Boleta</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="factura" />Factura</label>
            </RadioGroup>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Método de pago</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { v: "efectivo", l: "Efectivo", I: Banknote },
                { v: "yape", l: "Yape", I: Smartphone },
                { v: "plin", l: "Plin", I: Smartphone },
                { v: "tarjeta", l: "Tarjeta", I: CreditCard },
              ] as const).map(m => (
                <button key={m.v} onClick={() => setPayment(m.v)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm border transition-colors ${payment === m.v ? "border-gold bg-gold/10 text-gold" : "border-border hover:border-gold/50"}`}>
                  <m.I className="size-4" />{m.l}
                </button>
              ))}
            </div>
          </div>
          <Separator />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>S/ {subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>IGV (18%)</span><span>S/ {igv.toFixed(2)}</span></div>
            <div className="flex justify-between font-display font-bold text-lg pt-1"><span>Total</span><span className="text-gold">S/ {total.toFixed(2)}</span></div>
          </div>
          <Button onClick={finalize} disabled={busy || items.length === 0} className="w-full bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90 h-11">
            {busy && <Loader2 className="size-4 mr-2 animate-spin" />}Cobrar y generar PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
