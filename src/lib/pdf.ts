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

export function generateOrderPdf(o: PdfOrder) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const gold: [number, number, number] = [201, 168, 76];

  // Header
  doc.setFillColor(13, 13, 13);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(...gold);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("LC-LAB", 15, 19);
  doc.setFontSize(9);
  doc.setTextColor(220, 220, 220);
  doc.setFont("helvetica", "normal");
  doc.text("Estudio Fotográfico", 15, 25);

  // Doc title
  doc.setTextColor(...gold);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  const title = o.doc_kind === "factura" ? "FACTURA ELECTRÓNICA" : "BOLETA DE VENTA";
  doc.text(title, 195, 14, { align: "right" });
  doc.setFontSize(10);
  doc.setTextColor(220, 220, 220);
  doc.text(`N° ${String(o.number).padStart(6, "0")}`, 195, 22, { align: "right" });

  // Customer
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", 15, 42);
  doc.setFont("helvetica", "normal");
  doc.text(o.customer?.full_name ?? "—", 35, 42);
  doc.setFont("helvetica", "bold");
  doc.text(`${o.customer?.doc_type ?? "DNI"}:`, 15, 48);
  doc.setFont("helvetica", "normal");
  doc.text(o.customer?.doc_number ?? "—", 35, 48);
  if (o.customer?.address) {
    doc.setFont("helvetica", "bold");
    doc.text("Dirección:", 15, 54);
    doc.setFont("helvetica", "normal");
    doc.text(o.customer.address, 35, 54);
  }
  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", 140, 42);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(o.created_at).toLocaleString("es-PE"), 158, 42);
  doc.setFont("helvetica", "bold");
  doc.text("Pago:", 140, 48);
  doc.setFont("helvetica", "normal");
  doc.text(o.payment_method.toUpperCase(), 158, 48);

  autoTable(doc, {
    startY: 65,
    head: [["Descripción", "Cant.", "P. Unit.", "Subtotal"]],
    body: o.items.map((i) => [
      i.product_name,
      String(i.quantity),
      `S/ ${i.unit_price.toFixed(2)}`,
      `S/ ${i.subtotal.toFixed(2)}`,
    ]),
    headStyles: { fillColor: [13, 13, 13], textColor: gold, fontStyle: "bold" },
    bodyStyles: { textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 15, right: 15 },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text("Subtotal:", 150, finalY, { align: "right" });
  doc.text(`S/ ${o.subtotal.toFixed(2)}`, 195, finalY, { align: "right" });
  doc.text("IGV (18%):", 150, finalY + 6, { align: "right" });
  doc.text(`S/ ${o.igv.toFixed(2)}`, 195, finalY + 6, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(13, 13, 13);
  doc.text("TOTAL:", 150, finalY + 15, { align: "right" });
  doc.setTextColor(...gold);
  doc.text(`S/ ${o.total.toFixed(2)}`, 195, finalY + 15, { align: "right" });

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "italic");
  doc.text("Gracias por su preferencia — LC-LAB Estudio Fotográfico", 105, 285, {
    align: "center",
  });

  doc.save(`${o.doc_kind}-${String(o.number).padStart(6, "0")}.pdf`);
}
