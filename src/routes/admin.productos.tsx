import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Upload, Loader2, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCart } from "@/hooks/use-cart";

export const Route = createFileRoute("/admin/productos")({ component: ProductsPage });

type Product = {
  id: string; name: string; description: string | null; price: number;
  stock: number; image_url: string | null; is_active: boolean; category_id: string | null;
};
type Category = { id: string; name: string; slug: string };

function ProductsPage() {
  const qc = useQueryClient();
  const { add } = useCart();
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const shown = filter === "all" ? products : products.filter(p => p.category_id === filter);

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar producto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Producto eliminado");
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Catálogo</h1>
          <p className="text-muted-foreground">Anuarios, diplomas, sesiones y paquetes</p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
                <Plus className="size-4 mr-2" /> Nuevo producto
              </Button>
            </DialogTrigger>
            <ProductDialog product={editing} categories={cats} onSaved={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["products"] }); }} />
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-20"><Loader2 className="size-8 animate-spin text-gold" /></div>
      ) : shown.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Sin productos. Crea el primero.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {shown.map((p) => (
            <Card key={p.id} className="overflow-hidden border-border bg-card group">
              <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="grid place-items-center h-full text-muted-foreground text-xs">Sin imagen</div>
                )}
                {!p.is_active && <Badge variant="destructive" className="absolute top-2 left-2">Inactivo</Badge>}
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-semibold leading-tight">{p.name}</h3>
                  <div className="text-gold font-bold whitespace-nowrap">S/ {Number(p.price).toFixed(2)}</div>
                </div>
                {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                <div className="text-xs text-muted-foreground">Stock: {p.stock}</div>
                <div className="flex gap-1 pt-2">
                  <Button size="sm" className="flex-1 bg-gold text-primary-foreground hover:bg-gold/90"
                    onClick={() => { add({ product_id: p.id, name: p.name, price: Number(p.price) }); toast.success(`${p.name} agregado`); }}>
                    <ShoppingCart className="size-4 mr-1" /> Vender
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="size-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="size-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductDialog({ product, categories, onSaved }: { product: Product | null; categories: Category[]; onSaved: () => void }) {
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [stock, setStock] = useState(product?.stock?.toString() ?? "0");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `products/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("lc-lab-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("lc-lab-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success("Imagen subida");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const { productSchema, firstZodMessage } = await import("@/lib/validators");
    const parsed = productSchema.safeParse({
      name, description, price: Number(price), stock: Number(stock),
      category_id: categoryId, image_url: imageUrl,
    });
    if (!parsed.success) return toast.error(firstZodMessage(parsed.error));
    setBusy(true);
    const payload = {
      name: name.trim(), description: description || null, price: Number(price), stock: Number(stock),
      category_id: categoryId || null, image_url: imageUrl || null, is_active: true,
    };
    const { error } = product
      ? await supabase.from("products").update(payload).eq("id", product.id)
      : await supabase.from("products").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(product ? "Producto actualizado" : "Producto creado");
    onSaved();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle className="font-display">{product ? "Editar producto" : "Nuevo producto"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Descripción</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Precio (S/)</Label><Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div><Label>Stock</Label><Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} /></div>
        </div>
        <div>
          <Label>Categoría</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
            <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Imagen</Label>
          <div className="flex gap-2 items-center">
            <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            {uploading && <Loader2 className="size-4 animate-spin text-gold" />}
          </div>
          {imageUrl && <img src={imageUrl} alt="" className="mt-2 w-24 h-24 object-cover rounded-md border border-border" />}
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={busy} className="bg-gradient-gold text-primary-foreground shadow-gold">
          {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
          <Upload className="size-4 mr-2" /> Guardar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
