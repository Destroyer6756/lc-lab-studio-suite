import type { PdfOrder } from "./pdf";

const EMISOR = {
  razon_social: "LCLAB S.A.C.",
  nombre_comercial: "INVERSIONES LC LAB",
  ruc: "20613771931",
  direccion: "Lima - Perú",
};

export function printOrderTicket(o: PdfOrder) {
  const isFactura = o.doc_kind === "factura";
  const serie = isFactura ? "F001" : "B001";
  const numero = `${serie}-${String(o.number).padStart(8, "0")}`;
  const fecha = new Date(o.created_at).toLocaleString("es-PE");
  const titulo = isFactura ? "FACTURA ELECTRÓNICA" : "BOLETA DE VENTA ELECTRÓNICA";

  const itemsRows = o.items
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

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${numero}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    width: 80mm;
    padding: 4mm 3mm;
    font-family: 'Courier New', ui-monospace, monospace;
    font-size: 11px;
    color: #000;
    line-height: 1.35;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: 700; }
  .lg { font-size: 13px; }
  .xl { font-size: 15px; }
  hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 1px 0; }
  .prod { font-weight: 700; }
  .totals td { padding: 2px 0; }
  .total-row td { font-size: 14px; font-weight: 700; border-top: 1px solid #000; padding-top: 4px; }
  .small { font-size: 10px; }
</style>
</head>
<body>
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
  <div style="height: 10mm;"></div>
  <script>
    window.onload = function() {
      window.focus();
      window.print();
      setTimeout(function(){ window.close(); }, 300);
    };
  </script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) {
    alert("Habilite las ventanas emergentes para imprimir el ticket.");
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
