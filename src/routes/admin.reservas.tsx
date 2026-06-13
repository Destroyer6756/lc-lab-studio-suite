import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Loader2, Calendar as CalendarIcon, Trash2, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/reservas")({ component: ReservationsPage });

const statusColor: Record<string, string> = {
  pendiente: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  confirmada: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  completada: "bg-green-500/15 text-green-500 border-green-500/30",
  cancelada: "bg-red-500/15 text-red-500 border-red-500/30",
};

type Res = {
  id: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
  customer_id: string | null;
  product_id: string | null;
  customer: { full_name: string } | null;
  product: { name: string } | null;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

function ReservationsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Res | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());

  const { data = [], isLoading } = useQuery({
    queryKey: ["reservations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select(
          "id, scheduled_at, status, notes, customer_id, product_id, customer:customers(full_name), product:products(name)",
        )
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Res[];
    },
  });

  const reservedDays = useMemo(() => data.map((r) => new Date(r.scheduled_at)), [data]);
  const filtered = useMemo(
    () => (selectedDay ? data.filter((r) => sameDay(new Date(r.scheduled_at), selectedDay)) : data),
    [data, selectedDay],
  );

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("reservations")
      .update({ status: status as "pendiente" | "confirmada" | "completada" | "cancelada" })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Estado actualizado");
    qc.invalidateQueries({ queryKey: ["reservations"] });
  };
  const remove = async (id: string) => {
    if (!confirm("¿Eliminar reserva?")) return;
    const { error } = await supabase.from("reservations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["reservations"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Reservas</h1>
          <p className="text-muted-foreground">Agenda de sesiones fotográficas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground shadow-gold">
              <Plus className="size-4 mr-2" />
              Nueva reserva
            </Button>
          </DialogTrigger>
          <ResDialog
            initial={null}
            defaultDate={selectedDay}
            onSaved={() => {
              setOpen(false);
              qc.invalidateQueries({ queryKey: ["reservations"] });
            }}
          />
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto,1fr]">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg">Calendario</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDay}
              onSelect={setSelectedDay}
              modifiers={{ reserved: reservedDays }}
              modifiersClassNames={{
                reserved:
                  "relative font-semibold text-gold after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-gold",
              }}
              className={cn("p-3 pointer-events-auto")}
            />
            <div className="mt-3 text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-gold" /> con reservas
              </span>
              {selectedDay && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setSelectedDay(undefined)}
                >
                  Ver todas
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg">
              {selectedDay
                ? `Reservas del ${selectedDay.toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })}`
                : "Todas las reservas"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 grid place-items-center">
                <Loader2 className="size-8 animate-spin text-gold" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="size-4 text-gold" />
                          {new Date(r.scheduled_at).toLocaleString("es-PE")}
                        </div>
                      </TableCell>
                      <TableCell>{r.customer?.full_name ?? "—"}</TableCell>
                      <TableCell>{r.product?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                          <SelectTrigger className={`w-36 ${statusColor[r.status]}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="confirmada">Confirmada</SelectItem>
                            <SelectItem value="completada">Completada</SelectItem>
                            <SelectItem value="cancelada">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setEditing(r)}>
                          <Pencil className="size-4 text-gold" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        Sin reservas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        {editing && (
          <ResDialog
            initial={editing}
            onSaved={() => {
              setEditing(null);
              qc.invalidateQueries({ queryKey: ["reservations"] });
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ResDialog({
  initial,
  defaultDate,
  onSaved,
}: {
  initial: Res | null;
  defaultDate?: Date;
  onSaved: () => void;
}) {
  const [customerId, setCustomerId] = useState(initial?.customer_id ?? "");
  const [productId, setProductId] = useState(initial?.product_id ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    initial
      ? toLocalInput(new Date(initial.scheduled_at))
      : defaultDate
        ? toLocalInput(new Date(defaultDate.setHours(10, 0, 0, 0)))
        : "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () =>
      (await supabase.from("customers").select("id, full_name").order("full_name")).data ?? [],
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products-list"],
    queryFn: async () =>
      (await supabase.from("products").select("id, name").eq("is_active", true).order("name"))
        .data ?? [],
  });

  const save = async () => {
    if (!scheduledAt) return toast.error("Selecciona fecha y hora");
    setBusy(true);
    const payload = {
      customer_id: customerId || null,
      product_id: productId || null,
      scheduled_at: new Date(scheduledAt).toISOString(),
      notes: notes || null,
    };
    const { error } = initial
      ? await supabase.from("reservations").update(payload).eq("id", initial.id)
      : await supabase.from("reservations").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(initial ? "Reserva actualizada" : "Reserva creada");
    onSaved();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="font-display">
          {initial ? "Editar reserva" : "Nueva reserva"}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Cliente</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona..." />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Servicio / Producto</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona..." />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Fecha y hora</Label>
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>
        <div>
          <Label>Notas</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={save}
          disabled={busy}
          className="bg-gradient-gold text-primary-foreground shadow-gold"
        >
          {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
          {initial ? "Actualizar" : "Guardar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
