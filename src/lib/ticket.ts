import type { PdfOrder } from "./pdf";

export type TicketFormat = "80mm" | "58mm" | "a4";

const EMISOR = {
  razon_social: "LCLAB S.A.C.",
  nombre_comercial: "INVERSIONES LC LAB",
  ruc: "20613771931",
  direccion: "Lima - Perú",
};

const PRINT_FORMAT_KEY = "lclab.print.format";

export function getPreferredPrintFormat(): TicketFormat {
  if (typeof window === "undefined") return "80mm";
  const v = window.localStorage.getItem(PRINT_FORMAT_KEY);
  if (v === "80mm" || v === "58mm" || v === "a4") return v;
  return "80mm";
}

export function setPreferredPrintFormat(f: TicketFormat) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRINT_FORMAT_KEY, f);
}

export function renderTicketHtml(o: PdfOrder, format: TicketFormat): string {
  const isFactura = o.doc_kind === "factura";
  const serie = isFactura ? "F001" : "B001";
  const numero = `${serie}-${String(o.number).padStart(8, "0")}`;
  const fecha = new Date(o.created_at).toLocaleString("es-PE");
  const titulo = isFactura ? "FACTURA ELECTRÓNICA" : "BOLETA DE VENTA ELECTRÓNICA";

  // Configuración por formato — el navegador selecciona automáticamente
  // la impresora cuyo papel coincide con @page size.
  const cfg =
    format === "a4"
      ? {
          pageSize: "A4",
          bodyWidth: "190mm",
          bodyPadding: "12mm 10mm",
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: "12px",
          windowSize: "width=900,height=1000",
        }
      : format === "58mm"
        ? {
            pageSize: "58mm auto",
            bodyWidth: "58mm",
            bodyPadding: "3mm 2mm",
            fontFamily: "'Courier New', ui-monospace, monospace",
            fontSize: "10px",
            windowSize: "width=300,height=640",
          }
        : {
            pageSize: "80mm auto",
            bodyWidth: "80mm",
            bodyPadding: "4mm 3mm",
            fontFamily: "'Courier New', ui-monospace, monospace",
            fontSize: "11px",
            windowSize: "width=380,height=640",
          };

  const isA4 = format === "a4";

  const itemsRows = isA4
    ? o.items
        .map(
          (i) => `
        <tr>
          <td>${escapeHtml(i.product_name)}</td>
          <td class="right">${i.quantity}</td>
          <td class="right">${i.unit_price.toFixed(2)}</td>
          <td class="right">${i.subtotal.toFixed(2)}</td>
        </tr>`,
        )
        .join("")
    : o.items
        .map(
          (i) => `
        <tr>
          <td colspan="3" class="prod">${escapeHtml(i.product_name)}</td>
        </tr>
        <tr>
          <td>${i.quantity} x ${i.unit_price.toFixed(2)}</td>
          <td></td>
          <td class="right">S/ ${i.subtotal.toFixed(2)}</td>
        </tr>`,
        )
        .join("");

  const a4Body = `
  <div class="header">
    <div>
      <div class="bold xl">${EMISOR.nombre_comercial}</div>
      <div class="small">${EMISOR.razon_social}</div>
      <div class="small">RUC: ${EMISOR.ruc}</div>
      <div class="small">${EMISOR.direccion}</div>
    </div>
    <div class="doc-box">
      <div class="bold">${titulo}</div>
      <div class="bold lg">${numero}</div>
      <div class="small">${fecha}</div>
    </div>
  </div>
  <div class="cust">
    <div><span class="bold">Cliente:</span> ${escapeHtml(o.customer?.full_name ?? "—")}</div>
    <div><span class="bold">${escapeHtml(o.customer?.doc_type ?? "DNI")}:</span> ${escapeHtml(o.customer?.doc_number ?? "—")}</div>
    ${o.customer?.address ? `<div><span class="bold">Dirección:</span> ${escapeHtml(o.customer.address)}</div>` : ""}
  </div>
  <table class="items">
    <thead>
      <tr>
        <th>Descripción</th>
        <th class="right">Cant.</th>
        <th class="right">P. Unit.</th>
        <th class="right">Importe</th>
      </tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>
  <table class="totals">
    <tr><td>Subtotal</td><td class="right">S/ ${o.subtotal.toFixed(2)}</td></tr>
    <tr><td>IGV 18%</td><td class="right">S/ ${o.igv.toFixed(2)}</td></tr>
    <tr class="total-row"><td>TOTAL</td><td class="right">S/ ${o.total.toFixed(2)}</td></tr>
  </table>
  <div class="pay"><span class="bold">Método de pago:</span> ${escapeHtml(o.payment_method.toUpperCase())}</div>
  <div class="footer">¡Gracias por su compra! · Representación impresa del comprobante</div>`;

  const ticketBody = `
  <div class="center bold xl">${EMISOR.nombre_comercial}</div>
  <div class="center small">${EMISOR.razon_social}</div>
  <div class="center small">RUC: ${EMISOR.ruc}</div>
  <div class="center small">${EMISOR.direccion}</div>
  <hr />
  <div class="center bold lg">${titulo}</div>
  <div class="center bold">${numero}</div>
  <div class="center small">${fecha}</div>
  <hr />
  <div class="small"><span class="bold">Cliente:</span> ${escapeHtml(o.customer?.full_name ?? "—")}</div>
  <div class="small"><span class="bold">${escapeHtml(o.customer?.doc_type ?? "DNI")}:</span> ${escapeHtml(o.customer?.doc_number ?? "—")}</div>
  ${o.customer?.address ? `<div class="small"><span class="bold">Dir:</span> ${escapeHtml(o.customer.address)}</div>` : ""}
  <hr />
  <table>
    <thead>
      <tr class="small">
        <td class="bold">CANT/PU</td>
        <td></td>
        <td class="right bold">TOTAL</td>
      </tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>
  <hr />
  <table class="totals">
    <tr><td>Subtotal</td><td class="right">S/ ${o.subtotal.toFixed(2)}</td></tr>
    <tr><td>IGV 18%</td><td class="right">S/ ${o.igv.toFixed(2)}</td></tr>
    <tr class="total-row"><td>TOTAL</td><td class="right">S/ ${o.total.toFixed(2)}</td></tr>
  </table>
  <hr />
  <div class="small"><span class="bold">Método de pago:</span> ${escapeHtml(o.payment_method.toUpperCase())}</div>
  <hr />
  <div class="center small">¡Gracias por su compra!</div>
  <div class="center small">Representación impresa del comprobante</div>
  <div style="height: 10mm;"></div>`;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${numero}</title>
<style>
  @page { size: ${cfg.pageSize}; margin: ${isA4 ? "10mm" : "0"}; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    width: ${cfg.bodyWidth};
    padding: ${cfg.bodyPadding};
    font-family: ${cfg.fontFamily};
    font-size: ${cfg.fontSize};
    color: #000;
    line-height: 1.4;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: 700; }
  .lg { font-size: ${isA4 ? "16px" : "13px"}; }
  .xl { font-size: ${isA4 ? "20px" : "15px"}; }
  .small { font-size: ${isA4 ? "11px" : "10px"}; }
  hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td, th { vertical-align: top; padding: ${isA4 ? "6px 4px" : "1px 0"}; }
  .prod { font-weight: 700; }
  .totals td { padding: ${isA4 ? "4px" : "2px 0"}; }
  .total-row td { font-size: ${isA4 ? "16px" : "14px"}; font-weight: 700; border-top: 1px solid #000; padding-top: 4px; }
  ${
    isA4
      ? `
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 18px; }
  .doc-box { border: 1.5px solid #000; padding: 10px 14px; text-align: center; min-width: 180px; }
  .cust { border: 1px solid #ccc; padding: 10px; margin-bottom: 14px; font-size: 12px; }
  .cust > div { margin: 2px 0; }
  .items { margin-bottom: 14px; }
  .items th { background: #f0f0f0; border-bottom: 1.5px solid #000; text-align: left; padding: 6px; font-size: 12px; }
  .items tbody td { border-bottom: 1px solid #ddd; padding: 6px; }
  .totals { width: 280px; margin-left: auto; }
  .pay { margin-top: 18px; padding: 8px; background: #f7f7f7; }
  .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #555; }
  `
      : ""
  }
  @media print {
    html, body { background: #fff; }
  }
</style>
</head>
<body>
  ${isA4 ? a4Body : ticketBody}
  <script>
    window.onload = function() {
      window.focus();
      window.print();
      setTimeout(function(){ window.close(); }, 500);
    };
  </script>
</body>
</html>`;

  const w = window.open("", "_blank", cfg.windowSize);
  if (!w) {
    alert("Habilite las ventanas emergentes para imprimir.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
