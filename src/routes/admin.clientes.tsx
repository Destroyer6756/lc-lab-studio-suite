import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/clientes")({ component: CustomersPage });

type Customer = {
  id: string;
  doc_type: string;
  doc_number: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

function CustomersPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Customer[];
    },
  });
  const filtered = data.filter(
    (c) =>
      c.full_name.toLowerCase().includes(q.toLowerCase()) ||
      c.doc_number.includes(q) ||
      (c.email ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar cliente?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cliente eliminado");
    qc.invalidateQueries({ queryKey: ["customers"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Base de clientes registrados</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Buscar..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-56"
          />
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-gradient-gold text-primary-foreground shadow-gold">
                <Plus className="size-4 mr-2" />
                Nuevo cliente
              </Button>
            </DialogTrigger>
            <CustomerDialog
              customer={editing}
              onSaved={() => {
                setOpen(false);
                setEditing(null);
                qc.invalidateQueries({ queryKey: ["customers"] });
              }}
            />
          </Dialog>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 grid place-items-center">
              <Loader2 className="size-8 animate-spin text-gold" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">
                      {c.doc_type} {c.doc_number}
                    </TableCell>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {c.email ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {c.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(c);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(c.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      Sin clientes
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CustomerDialog({ customer, onSaved }: { customer: Customer | null; onSaved: () => void }) {
  const [docType, setDocType] = useState(customer?.doc_type ?? "DNI");
  const [docNumber, setDocNumber] = useState(customer?.doc_number ?? "");
  const [fullName, setFullName] = useState(customer?.full_name ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const { customerSchema, firstZodMessage } = await import("@/lib/validators");
    const parsed = customerSchema.safeParse({
      doc_type: docType,
      doc_number: docNumber,
      full_name: fullName,
      email,
      phone,
      address,
    });
    if (!parsed.success) return toast.error(firstZodMessage(parsed.error));
    setBusy(true);
    const payload = {
      doc_type: docType,
      doc_number: docNumber.trim(),
      full_name: fullName.trim(),
      email: email || null,
      phone: phone || null,
      address: address || null,
    };
    const { error } = customer
      ? await supabase.from("customers").update(payload).eq("id", customer.id)
      : await supabase.from("customers").insert(payload);
    setBusy(false);
    if (error) {
      if (error.code === "23505") return toast.error("Ya existe un cliente con ese documento");
      return toast.error(error.message);
    }
    toast.success("Cliente guardado correctamente");
    onSaved();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="font-display">
          {customer ? "Editar cliente" : "Nuevo cliente"}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DNI">DNI</SelectItem>
                <SelectItem value="RUC">RUC</SelectItem>
                <SelectItem value="CE">CE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Número</Label>
            <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Nombre completo / Razón social</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Dirección</Label>
          <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={save}
          disabled={busy}
          className="bg-gradient-gold text-primary-foreground shadow-gold"
        >
          {busy && <Loader2 className="size-4 mr-2 animate-spin" />}Guardar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
