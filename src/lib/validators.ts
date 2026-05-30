import { z } from "zod";

export const customerSchema = z.object({
  doc_type: z.enum(["DNI", "RUC", "CE"]),
  doc_number: z.string().trim().min(6, "Mínimo 6 caracteres").max(15, "Máximo 15 caracteres").regex(/^[A-Za-z0-9]+$/, "Solo letras y números"),
  full_name: z.string().trim().min(2, "Nombre muy corto").max(150),
  email: z.string().trim().email("Email inválido").max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(255).optional().or(z.literal("")),
}).superRefine((d, ctx) => {
  if (d.doc_type === "DNI" && !/^\d{8}$/.test(d.doc_number)) {
    ctx.addIssue({ code: "custom", path: ["doc_number"], message: "DNI debe tener 8 dígitos" });
  }
  if (d.doc_type === "RUC" && !/^\d{11}$/.test(d.doc_number)) {
    ctx.addIssue({ code: "custom", path: ["doc_number"], message: "RUC debe tener 11 dígitos" });
  }
});

export const productSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(150),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  price: z.number({ message: "Precio inválido" }).min(0, "No puede ser negativo").max(999999),
  stock: z.number({ message: "Stock inválido" }).int("Debe ser entero").min(0, "No puede ser negativo").max(999999),
  category_id: z.string().uuid().optional().or(z.literal("")),
  image_url: z.string().url("URL inválida").optional().or(z.literal("")),
});

export function firstZodMessage(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Datos inválidos";
}
