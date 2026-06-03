import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PdfOrder {
  number: number;
  doc_kind: "boleta" | "factura";
  payment_method: string;
  created_at: string;
  customer?: {
    full_name: string;
    doc_type: string;
    doc_number: string;
    address?: string | null;
  } | null;
  items: { product_name: string; quantity: number; unit_price: number; subtotal: number }[];
  subtotal: number;
  igv: number;
  total: number;
}

// Datos del emisor
const EMISOR = {
  razon_social: "LCLAB S.A.C.",
  nombre_comercial: "INVERSIONES LC LAB",
  ruc: "20613771931",
  direccion: "Lima - Perú",
  giro: "Fotografía Profesional",
};

export function generateOrderPdf(o: PdfOrder) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const dark: [number, number, number] = [20, 20, 20];
  const gray: [number, number, number] = [120, 120, 120];
  const line: [number, number, number] = [210, 210, 210];

  const isFactura = o.doc_kind === "factura";
  const docTitle = isFactura ? "FACTURA ELECTRÓNICA" : "BOLETA DE VENTA ELECTRÓNICA";
  const serie = isFactura ? "F001" : "B001";
  const numero = `${serie}-${String(o.number).padStart(8, "0")}`;
  const fecha = new Date(o.created_at);
  const fechaEmision = fecha.toLocaleDateString("es-PE");
  const fechaVenc = new Date(fecha.getTime() + 30 * 86400000).toLocaleDateString("es-PE");

  // ====== ENCABEZADO ======
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setCharSpace(2);
  doc.text(isFactura ? "FACTURA" : "BOLETA", 15, 22);
  doc.setCharSpace(0);

  // Emisor a la derecha
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(EMISOR.nombre_comercial, 195, 16, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text(EMISOR.razon_social, 195, 21, { align: "right" });
  doc.text(`RUC: ${EMISOR.ruc}`, 195, 25, { align: "right" });
  doc.text(EMISOR.giro, 195, 29, { align: "right" });

  // Línea divisora
  doc.setDrawColor(...line);
  doc.setLineWidth(0.3);
  doc.line(15, 36, 195, 36);

  // ====== BLOQUE DE NÚMEROS (3 columnas) ======
  const colY = 44;
  const labelY = colY;
  const valueY = colY + 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text("N° DE COMPROBANTE", 15, labelY);
  doc.text("FECHA DE EMISIÓN", 80, labelY);
  doc.text("VENCIMIENTO", 145, labelY);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...dark);
  doc.text(numero, 15, valueY);
  doc.text(fechaEmision, 80, valueY);
  doc.text(fechaVenc, 145, valueY);

  // Línea divisora
  doc.setDrawColor(...line);
  doc.line(15, 56, 195, 56);

  // ====== EMISOR / CLIENTE ======
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text("FACTURADO A", 15, 63);
  doc.text("EMITIDO POR", 195, 63, { align: "right" });

  doc.setFontSize(10);
  doc.setTextColor(...dark);
  // Cliente
  doc.setFont("helvetica", "bold");
  doc.text(o.customer?.full_name ?? "—", 15, 69);
  doc.setFont("helvetica", "normal");
  doc.text(`${o.customer?.doc_type ?? "DNI"}: ${o.customer?.doc_number ?? "—"}`, 15, 74);
  if (o.customer?.address) {
    doc.text(doc.splitTextToSize(o.customer.address, 80), 15, 79);
  }

  // Emisor
  doc.setFont("helvetica", "bold");
  doc.text(EMISOR.razon_social, 195, 69, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`RUC: ${EMISOR.ruc}`, 195, 74, { align: "right" });
  doc.text(EMISOR.direccion, 195, 79, { align: "right" });

  // ====== TABLA DE ITEMS ======
  autoTable(doc, {
    startY: 92,
    head: [["ID", "DESCRIPCIÓN", "CANT.", "P. UNIT.", "TOTAL"]],
    body: o.items.map((i, idx) => [
      String(idx + 1).padStart(2, "0"),
      i.product_name,
      String(i.quantity),
      `S/ ${i.unit_price.toFixed(2)}`,
      `S/ ${i.subtotal.toFixed(2)}`,
    ]),
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: dark,
      fontStyle: "bold",
      fontSize: 9,
      lineColor: dark,
      lineWidth: { top: 0.4, bottom: 0.4, left: 0, right: 0 },
    },
    bodyStyles: {
      textColor: dark,
      fontSize: 10,
      lineColor: line,
      lineWidth: { top: 0, bottom: 0.2, left: 0, right: 0 },
      cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
    },
    columnStyles: {
      0: { cellWidth: 15, textColor: gray },
      1: { cellWidth: "auto" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right", fontStyle: "bold" },
    },
    margin: { left: 15, right: 15 },
    theme: "plain",
  });

  // ====== TOTALES ======
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "normal");

  doc.text("Subtotal", 145, finalY, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text(`S/ ${o.subtotal.toFixed(2)}`, 195, finalY, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.text("IGV 18%", 145, finalY + 7, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text(`S/ ${o.igv.toFixed(2)}`, 195, finalY + 7, { align: "right" });

  // Barra TOTAL DUE estilo Hloom
  const totalBarY = finalY + 14;
  doc.setFillColor(...dark);
  doc.rect(115, totalBarY, 80, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setCharSpace(1);
  doc.text("TOTAL A PAGAR", 120, totalBarY + 7.8);
  doc.setCharSpace(0);
  doc.setFontSize(12);
  doc.text(`S/ ${o.total.toFixed(2)}`, 192, totalBarY + 7.8, { align: "right" });

  // ====== INFORMACIÓN DE PAGO ======
  const infoY = totalBarY + 30;
  doc.setTextColor(...dark);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`MÉTODO DE PAGO: ${o.payment_method.toUpperCase()}`, 15, infoY);
  doc.text(`EMISOR: ${EMISOR.razon_social}`, 15, infoY + 5);
  doc.text(`RUC: ${EMISOR.ruc}`, 15, infoY + 10);
  doc.text(`COMPROBANTE: ${numero}`, 15, infoY + 15);

  doc.setFont("helvetica", "normal");


  doc.save(`${o.doc_kind}-${numero}.pdf`);
}
