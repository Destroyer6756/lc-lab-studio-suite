import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Trash2,
  Loader2,
  Banknote,
  Smartphone,
  CreditCard,
  ShoppingCart,
  Plus,
  Minus,
  Wallet,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/pos")({ component: POS });

function POS() {
  const { items, add, remove, setQty, clear, total } = useCart();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [docKind, setDocKind] = useState<"boleta" | "factura" | "ticket">("boleta");
  const [payment, setPayment] = useState<"efectivo" | "yape" | "plin" | "tarjeta" | "credito">(
    "efectivo",
  );
  const [busy, setBusy] = useState(false);
  const [printFormat, setPrintFormat] = useState<"none" | "a4" | "80mm" | "58mm">(() => {
    if (typeof window === "undefined") return "80mm";
    return (window.localStorage.getItem("lclab.print.format.pos") as any) || "80mm";
  });
  const [useQz, setUseQz] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("lclab.print.useqz") === "1";
  });
  const [qzPrinters, setQzPrinters] = useState<string[]>([]);
  const [qzPrinter, setQzPrinter] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("lclab.qz.printer") || "";
  });
  const [qzStatus, setQzStatus] = useState<"idle" | "connecting" | "ok" | "error">("idle");
  const [q, setQ] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["products-active"],
    queryFn: async () =>
      (
        await supabase
          .from("products")
          .select("id, name, price, image_url, stock")
          .eq("is_active", true)
          .order("name")
      ).data ?? [],
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () =>
      (
        await supabase
          .from("customers")
          .select("id, full_name, doc_type, doc_number, address")
          .order("full_name")
      ).data ?? [],
  });

  const filtered = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const subtotal = total / 1.18;
  const igv = total - subtotal;

  const finalize = async () => {
    if (items.length === 0) return toast.error("Carrito vacío");
    if (!customerId) return toast.error("Selecciona un cliente");

    // Validación de stock client-side
    for (const i of items) {
      const p = products.find((pp) => pp.id === i.product_id);
      if (!p) return toast.error(`Producto "${i.name}" ya no existe`);
      if (i.quantity > (p.stock ?? 0)) {
        return toast.error(`Stock insuficiente para "${i.name}". Disponible: ${p.stock}`);
      }
    }

    setBusy(true);
    let createdOrderId: string | null = null;
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId,
          user_id: user?.id,
          doc_kind: docKind,
          payment_method: payment,
          status: "pagado",
          subtotal,
          igv,
          total,
        })
        .select("*")
        .single();
      if (error) throw error;
      createdOrderId = order.id;

      const itemsPayload = items.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        product_name: i.name,
        unit_price: i.price,
        quantity: i.quantity,
        subtotal: i.price * i.quantity,
      }));
      const { error: e2 } = await supabase.from("order_items").insert(itemsPayload);
      if (e2) throw e2;

      // Registrar transacción de pago (efectivo se auto-confirma, otros quedan pendientes)
      const autoConfirm = payment === "efectivo";
      await supabase.from("payment_transactions").insert({
        order_id: order.id,
        payment_method: payment,
        amount: total,
        status: autoConfirm ? "confirmado" : "pendiente",
        confirmed_by: autoConfirm ? user?.id : null,
        confirmed_at: autoConfirm ? new Date().toISOString() : null,
      });
      if (!autoConfirm) {
        await supabase.from("orders").update({ status: "pendiente" }).eq("id", order.id);
      }

      const cust = customers.find((c) => c.id === customerId);
      const pdfData = {
        number: order.number,
        doc_kind: docKind,
        payment_method: payment,
        created_at: order.created_at,
        customer: cust
          ? {
              full_name: cust.full_name,
              doc_type: cust.doc_type,
              doc_number: cust.doc_number,
              address: cust.address,
            }
          : null,
        items: items.map((i) => ({
          product_name: i.name,
          quantity: i.quantity,
          unit_price: i.price,
          subtotal: i.price * i.quantity,
        })),
        subtotal,
        igv,
        total,
      };
      const shouldPrint = printFormat !== "none";
      const { generateOrderPdf } = await import("@/lib/pdf");
      generateOrderPdf(pdfData);
      if (shouldPrint) {
        if (useQz) {
          try {
            const qz = await import("@/lib/qz");
            await qz.printViaQz(pdfData, printFormat, qzPrinter || null);
          } catch (err) {
            toast.error(
              "QZ Tray no disponible. Verifica que esté instalado y abierto. " +
                (err instanceof Error ? err.message : ""),
            );
          }
        } else {
          const { printOrderTicket } = await import("@/lib/ticket");
          printOrderTicket(pdfData, printFormat);
        }
      }


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
    } finally {
      setBusy(false);
    }
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
          {filtered.map((p) => {
            const inCart = items.find((i) => i.product_id === p.id)?.quantity ?? 0;
            const remaining = (p.stock ?? 0) - inCart;
            const disabled = remaining <= 0;
            return (
              <button
                key={p.id}
                disabled={disabled}
                onClick={() => {
                  add({ product_id: p.id, name: p.name, price: Number(p.price) });
                  toast.success(p.name);
                }}
                className="text-left rounded-lg border border-border bg-card hover:border-gold transition-colors overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="aspect-square bg-secondary">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <div className="grid place-items-center h-full text-xs text-muted-foreground">
                      Sin imagen
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <div className="text-sm font-medium line-clamp-1">{p.name}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-gold font-semibold text-sm">
                      S/ {Number(p.price).toFixed(2)}
                    </div>
                    <div
                      className={`text-[10px] ${remaining <= 3 ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      Stock: {p.stock}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Card className="border-border bg-card h-fit sticky top-20">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <ShoppingCart className="size-5 text-gold" />
            Carrito
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">Vacío</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {items.map((i) => (
                <div key={i.product_id} className="flex items-center gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{i.name}</div>
                    <div className="text-xs text-muted-foreground">S/ {i.price.toFixed(2)}</div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => setQty(i.product_id, i.quantity - 1)}
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-6 text-center">{i.quantity}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => setQty(i.product_id, i.quantity + 1)}
                  >
                    <Plus className="size-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => remove(i.product_id)}
                  >
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Separator />
          <div>
            <Label className="text-xs">Cliente</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name} — {c.doc_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Comprobante</Label>
            <RadioGroup
              value={docKind}
              onValueChange={(v) => setDocKind(v as "boleta" | "factura" | "ticket")}
              className="flex flex-wrap gap-4 mt-1"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="boleta" />
                Boleta
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="factura" />
                Factura
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="ticket" />
                Ticket <span className="text-[10px] text-muted-foreground">(interno)</span>
              </label>
            </RadioGroup>
            {docKind === "ticket" && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Venta interna sin valor tributario — no se declara a SUNAT.
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Método de pago</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { v: "efectivo", l: "Efectivo", I: Banknote },
                  { v: "yape", l: "Yape", I: Smartphone },
                  { v: "plin", l: "Plin", I: Smartphone },
                  { v: "tarjeta", l: "Tarjeta", I: CreditCard },
                  { v: "credito", l: "Crédito", I: Wallet },
                ] as const
              ).map((m) => (
                <button
                  key={m.v}
                  onClick={() => setPayment(m.v)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm border transition-colors ${payment === m.v ? "border-gold bg-gold/10 text-gold" : "border-border hover:border-gold/50"}`}
                >
                  <m.I className="size-4" />
                  {m.l}
                </button>
              ))}
            </div>
            {(payment === "yape" || payment === "plin") && (
              <div className="mt-3 rounded-md border border-gold/30 bg-gold/5 p-3 flex flex-col items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  Escanea el QR con{" "}
                  <span className="text-gold font-medium uppercase">{payment}</span> para pagar
                </p>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `${payment.toUpperCase()}|987654321|S/ ${total.toFixed(2)}`,
                  )}`}
                  alt={`QR ${payment}`}
                  className="size-44 rounded bg-white p-2"
                />
                <p className="text-sm font-display font-semibold text-gold">
                  S/ {total.toFixed(2)}
                </p>
                <p className="text-[11px] text-muted-foreground">Número: 987 654 321</p>
              </div>
            )}
            {payment === "credito" && (
              <div className="mt-3 rounded-md border border-gold/30 bg-gold/5 p-3 text-xs text-muted-foreground">
                Venta a <span className="text-gold font-medium">crédito</span>. El pedido quedará{" "}
                <span className="font-medium">pendiente</span> hasta que se registre el cobro en
                Pedidos / Transacciones.
              </div>
            )}
          </div>
          <Separator />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>S/ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>IGV (18%)</span>
              <span>S/ {igv.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-display font-bold text-lg pt-1">
              <span>Total</span>
              <span className="text-gold">S/ {total.toFixed(2)}</span>
            </div>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Impresora / formato</Label>
            <Select
              value={printFormat}
              onValueChange={(v) => {
                const f = v as "none" | "a4" | "80mm" | "58mm";
                setPrintFormat(f);
                if (typeof window !== "undefined")
                  window.localStorage.setItem("lclab.print.format.pos", f);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a4">Impresora A4 (oficina)</SelectItem>
                <SelectItem value="80mm">Tiquetera 80mm</SelectItem>
                <SelectItem value="58mm">Tiquetera 58mm</SelectItem>
                <SelectItem value="none">No imprimir (solo PDF)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Se enviará a la impresora predeterminada de tu PC con ese tamaño de papel.
            </p>
          </div>
          <div className="rounded-md border border-border p-3 space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={useQz}
                onChange={(e) => {
                  setUseQz(e.target.checked);
                  if (typeof window !== "undefined")
                    window.localStorage.setItem(
                      "lclab.print.useqz",
                      e.target.checked ? "1" : "0",
                    );
                }}
              />
              Imprimir con QZ Tray (directo, sin diálogo)
            </label>
            {useQz && (
              <>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs flex-1"
                    onClick={async () => {
                      setQzStatus("connecting");
                      try {
                        const qz = await import("@/lib/qz");
                        const list = await qz.listPrinters();
                        setQzPrinters(list);
                        if (!qzPrinter && list.length) {
                          const def = (await qz.getDefaultPrinter()) || list[0];
                          setQzPrinter(def);
                          qz.setSavedPrinter(def);
                        }
                        setQzStatus("ok");
                        toast.success(`QZ conectado · ${list.length} impresoras`);
                      } catch (err) {
                        setQzStatus("error");
                        toast.error(
                          "No se pudo conectar con QZ Tray. ¿Está instalado y abierto?",
                        );
                      }
                    }}
                  >
                    {qzStatus === "connecting"
                      ? "Conectando..."
                      : qzStatus === "ok"
                        ? "Reconectar / actualizar"
                        : "Conectar a QZ Tray"}
                  </Button>
                </div>
                {qzPrinters.length > 0 && (
                  <Select
                    value={qzPrinter}
                    onValueChange={(v) => {
                      setQzPrinter(v);
                      if (typeof window !== "undefined")
                        window.localStorage.setItem("lclab.qz.printer", v);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecciona impresora" />
                    </SelectTrigger>
                    <SelectContent>
                      {qzPrinters.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Requiere{" "}
                  <a
                    href="https://qz.io/download/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-gold"
                  >
                    QZ Tray
                  </a>{" "}
                  instalado en la PC. Imprime directo a la tiquetera sin diálogo.
                </p>
              </>
            )}
          </div>
          <Button
            onClick={finalize}
            disabled={busy || items.length === 0}
            className="w-full bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90 h-11"
          >
            {busy && <Loader2 className="size-4 mr-2 animate-spin" />}Cobrar y generar comprobante
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
