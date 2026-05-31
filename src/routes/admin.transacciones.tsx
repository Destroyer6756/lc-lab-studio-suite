import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Undo2,
  Banknote,
  Smartphone,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/admin/transacciones")({ component: TxPage });

type Tx = {
  id: string;
  order_id: string;
  payment_method: string;
  amount: number;
  status: string;
  reference: string | null;
  notes: string | null;
  confirmed_at: string | null;
  created_at: string;
  order: { number: number; doc_kind: string; customer: { full_name: string } | null } | null;
};

const statusColor: Record<string, string> = {
  pendiente: "bg-yellow-500/15 text-yellow-500",
  confirmado: "bg-green-500/15 text-green-500",
  rechazado: "bg-red-500/15 text-red-500",
  reembolsado: "bg-blue-500/15 text-blue-500",
};

const methodIcon: Record<string, typeof Banknote> = {
  efectivo: Banknote,
  yape: Smartphone,
  plin: Smartphone,
  tarjeta: CreditCard,
};

function TxPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"todos" | "pendiente" | "confirmado" | "rechazado">("todos");
  const [confirmTx, setConfirmTx] = useState<Tx | null>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["payment-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_transactions")
        .select(
          "id, order_id, payment_method, amount, status, reference, notes, confirmed_at, created_at, order:orders(number, doc_kind, customer:customers(full_name))",
        )
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as unknown as Tx[];
    },
  });

  const filtered = useMemo(
    () =>
      data.filter((t) => {
        if (tab !== "todos" && t.status !== tab) return false;
        if (!q) return true;
        const s = q.toLowerCase();
        return (
          String(t.order?.number ?? "").includes(s) ||
          (t.order?.customer?.full_name ?? "").toLowerCase().includes(s) ||
          (t.reference ?? "").toLowerCase().includes(s)
        );
      }),
    [data, q, tab],
  );

  const counts = useMemo(
    () => ({
      todos: data.length,
      pendiente: data.filter((t) => t.status === "pendiente").length,
      confirmado: data.filter((t) => t.status === "confirmado").length,
      rechazado: data.filter((t) => t.status === "rechazado").length,
    }),
    [data],
  );

  const setStatus = async (
    tx: Tx,
    status: "confirmado" | "rechazado" | "reembolsado",
    extra?: { reference?: string; notes?: string },
  ) => {
    setBusy(true);
    try {
      const payload = {
        status,
        confirmed_by: user?.id ?? null,
        confirmed_at: new Date().toISOString(),
        ...(extra?.reference !== undefined ? { reference: extra.reference || null } : {}),
        ...(extra?.notes !== undefined ? { notes: extra.notes || null } : {}),
      };
      const { error } = await supabase.from("payment_transactions").update(payload).eq("id", tx.id);
      if (error) throw error;

      // If confirming, also mark order as pagado
      if (status === "confirmado") {
        await supabase.from("orders").update({ status: "pagado" }).eq("id", tx.order_id);
      }
      if (status === "reembolsado") {
        await supabase.from("orders").update({ status: "anulado" }).eq("id", tx.order_id);
      }

      toast.success(`Transacción ${status}`);
      qc.invalidateQueries({ queryKey: ["payment-transactions"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setConfirmTx(null);
      setReference("");
      setNotes("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Historial de transacciones</h1>
          <p className="text-muted-foreground">
            Confirma o rechaza pagos por Yape, Plin, tarjeta o efectivo
          </p>
        </div>
        <Input
          placeholder="Buscar N°, cliente o referencia..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-72"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="todos">Todas ({counts.todos})</TabsTrigger>
          <TabsTrigger value="pendiente">Pendientes ({counts.pendiente})</TabsTrigger>
          <TabsTrigger value="confirmado">Confirmadas ({counts.confirmado})</TabsTrigger>
          <TabsTrigger value="rechazado">Rechazadas ({counts.rechazado})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="border-border bg-card">
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="py-16 grid place-items-center">
              <Loader2 className="size-8 animate-spin text-gold" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => {
                  const Icon = methodIcon[t.payment_method] ?? Banknote;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(t.created_at).toLocaleString("es-PE")}
                      </TableCell>
                      <TableCell className="font-mono">
                        {t.order ? String(t.order.number).padStart(6, "0") : "—"}
                      </TableCell>
                      <TableCell>{t.order?.customer?.full_name ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 capitalize text-sm">
                          <Icon className="size-4 text-gold" />
                          {t.payment_method}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.reference ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-gold">
                        S/ {Number(t.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColor[t.status]} border-0 capitalize`}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {t.status === "pendiente" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-500 hover:text-green-500 hover:bg-green-500/10"
                                onClick={() => {
                                  setConfirmTx(t);
                                  setReference(t.reference ?? "");
                                  setNotes(t.notes ?? "");
                                }}
                              >
                                <CheckCircle2 className="size-4 mr-1" />
                                Confirmar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={busy}
                                onClick={() => setStatus(t, "rechazado")}
                              >
                                <XCircle className="size-4 mr-1" />
                                Rechazar
                              </Button>
                            </>
                          )}
                          {t.status === "confirmado" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-500 hover:text-blue-500 hover:bg-blue-500/10"
                              disabled={busy}
                              onClick={() => setStatus(t, "reembolsado")}
                            >
                              <Undo2 className="size-4 mr-1" />
                              Reembolsar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      Sin transacciones
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!confirmTx} onOpenChange={(o) => !o && setConfirmTx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirmar pago — S/ {Number(confirmTx?.amount ?? 0).toFixed(2)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Referencia / N° de operación</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={
                  confirmTx?.payment_method === "tarjeta"
                    ? "Últimos 4 dígitos"
                    : "Código de operación"
                }
              />
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTx(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-gradient-gold text-primary-foreground"
              disabled={busy}
              onClick={() => confirmTx && setStatus(confirmTx, "confirmado", { reference, notes })}
            >
              {busy && <Loader2 className="size-4 mr-2 animate-spin" />}Confirmar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
