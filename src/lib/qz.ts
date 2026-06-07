// QZ Tray integration — direct printing to USB/network printers (A4 or thermal tickets).
// Requires QZ Tray app installed and running on the user's PC (https://qz.io/download/).
//
// In unsigned mode QZ shows a one-time confirmation popup the first time the
// site connects. For silent prod use, generate certs and inject them below.

import type { PdfOrder } from "./pdf";
import type { TicketFormat } from "./ticket";

type QZ = any;
let qzPromise: Promise<QZ> | null = null;

const PRINTER_KEY = "lclab.qz.printer";

export function getSavedPrinter(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PRINTER_KEY);
}
export function setSavedPrinter(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRINTER_KEY, name);
}

async function loadQz(): Promise<QZ> {
  if (qzPromise) return qzPromise;
  qzPromise = (async () => {
    const mod: any = await import("qz-tray");
    const qz = mod.default ?? mod;

    // Unsigned mode: QZ will prompt the user the first time.
    qz.security.setCertificatePromise((resolve: any) => resolve(null));
    qz.security.setSignatureAlgorithm("SHA512");
    qz.security.setSignaturePromise(() => (resolve: any) => resolve());

    return qz;
  })();
  return qzPromise;
}

export async function isQzAvailable(): Promise<boolean> {
  try {
    const qz = await loadQz();
    if (qz.websocket.isActive()) return true;
    await qz.websocket.connect({ retries: 0, delay: 0 });
    return true;
  } catch {
    return false;
  }
}

export async function ensureConnected(): Promise<QZ> {
  const qz = await loadQz();
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect({ retries: 2, delay: 1 });
  }
  return qz;
}

export async function listPrinters(): Promise<string[]> {
  const qz = await ensureConnected();
  const printers: string[] = await qz.printers.find();
  return printers;
}

export async function getDefaultPrinter(): Promise<string | null> {
  const qz = await ensureConnected();
  try {
    return (await qz.printers.getDefault()) ?? null;
  } catch {
    return null;
  }
}

// ESC/POS raw ticket builder — works for 80mm / 58mm thermal printers.
function buildEscPosTicket(o: PdfOrder, width: 32 | 48): string[] {
  const ESC = "\x1b";
  const GS = "\x1d";
  const INIT = ESC + "@";
  const ALIGN_C = ESC + "a" + "\x01";
  const ALIGN_L = ESC + "a" + "\x00";
  const BOLD_ON = ESC + "E" + "\x01";
  const BOLD_OFF = ESC + "E" + "\x00";
  const DBL_ON = GS + "!" + "\x11"; // double width + height
  const DBL_OFF = GS + "!" + "\x00";
  const CUT = GS + "V" + "\x42" + "\x00"; // partial cut + feed
  const NL = "\n";

  const sep = "-".repeat(width);
  const pad = (l: string, r: string) => {
    const space = Math.max(1, width - l.length - r.length);
    return l + " ".repeat(space) + r;
  };
  const center = (s: string) => {
    if (s.length >= width) return s;
    const pre = Math.floor((width - s.length) / 2);
    return " ".repeat(pre) + s;
  };

  const isFactura = o.doc_kind === "factura";
  const serie = isFactura ? "F001" : "B001";
  const numero = `${serie}-${String(o.number).padStart(8, "0")}`;
  const fecha = new Date(o.created_at).toLocaleString("es-PE");
  const titulo = isFactura ? "FACTURA ELECTRONICA" : "BOLETA DE VENTA";

  const buf: string[] = [];
  buf.push(INIT);
  buf.push(ALIGN_C);
  buf.push(BOLD_ON + DBL_ON + "LC LAB" + DBL_OFF + BOLD_OFF + NL);
  buf.push("LCLAB S.A.C." + NL);
  buf.push("RUC: 20613771931" + NL);
  buf.push("Lima - Peru" + NL);
  buf.push(sep + NL);
  buf.push(BOLD_ON + titulo + BOLD_OFF + NL);
  buf.push(BOLD_ON + numero + BOLD_OFF + NL);
  buf.push(fecha + NL);
  buf.push(sep + NL);

  buf.push(ALIGN_L);
  buf.push(`Cliente: ${o.customer?.full_name ?? "-"}` + NL);
  buf.push(`${o.customer?.doc_type ?? "DNI"}: ${o.customer?.doc_number ?? "-"}` + NL);
  if (o.customer?.address) buf.push(`Dir: ${o.customer.address}` + NL);
  buf.push(sep + NL);

  for (const i of o.items) {
    buf.push(i.product_name.slice(0, width) + NL);
    buf.push(
      pad(`${i.quantity} x ${i.unit_price.toFixed(2)}`, `S/ ${i.subtotal.toFixed(2)}`) + NL,
    );
  }
  buf.push(sep + NL);
  buf.push(pad("Subtotal", `S/ ${o.subtotal.toFixed(2)}`) + NL);
  buf.push(pad("IGV 18%", `S/ ${o.igv.toFixed(2)}`) + NL);
  buf.push(BOLD_ON + pad("TOTAL", `S/ ${o.total.toFixed(2)}`) + BOLD_OFF + NL);
  buf.push(sep + NL);
  buf.push(`Pago: ${o.payment_method.toUpperCase()}` + NL);
  buf.push(sep + NL);
  buf.push(ALIGN_C);
  buf.push("Gracias por su compra!" + NL);
  buf.push("Representacion impresa" + NL);
  buf.push(NL + NL + NL);
  buf.push(CUT);
  return buf;
}

export async function printViaQz(
  o: PdfOrder,
  format: TicketFormat,
  printerName?: string | null,
): Promise<void> {
  const qz = await ensureConnected();
  const printer = printerName || getSavedPrinter() || (await getDefaultPrinter());
  if (!printer) throw new Error("No hay impresora seleccionada en QZ Tray.");

  if (format === "a4") {
    // HTML pixel printing for A4 — let QZ render the document.
    const { renderTicketHtml } = await import("./ticket");
    const html = renderTicketHtml(o, "a4");
    const cfg = qz.configs.create(printer, {
      size: { width: 8.27, height: 11.69 }, // A4 inches
      units: "in",
      margins: 0.4,
      orientation: "portrait",
      scaleContent: true,
    });
    await qz.print(cfg, [{ type: "pixel", format: "html", flavor: "plain", data: html }]);
    return;
  }

  // Thermal ticket — raw ESC/POS
  const width = format === "58mm" ? 32 : 48;
  const data = buildEscPosTicket(o, width).map((d) => ({
    type: "raw",
    format: "plain",
    data: d,
  }));
  const cfg = qz.configs.create(printer, { encoding: "CP437" });
  await qz.print(cfg, data);
}
