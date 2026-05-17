import { ScannedOrder } from '../types';

const html = (body: string, opts?: { pageSize?: string; gridCols?: number }) => `
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="utf-8">
  <title>طباعة</title>
  <style>
    @page { size: ${opts?.pageSize || 'A4'}; margin: 6mm; }
    body { font-family: Arial, sans-serif; margin: 0; }
    .grid { display: grid; grid-template-columns: repeat(${opts?.gridCols ?? 2}, 1fr); gap: 4mm; }
    .label { border: 1px dashed #999; padding: 4mm; text-align: center; page-break-inside: avoid; }
    .label img, .label svg { max-width: 100%; }
    h2 { margin: 4px 0; }
    .meta { font-size: 11px; color: #555; margin-top: 4px; }
    .invoice { border: 1px solid #333; padding: 4mm; page-break-inside: avoid; display: flex; flex-direction: column; gap: 2mm; }
    .invoice .title { font-size: 22px; font-weight: bold; text-align: center; margin: 0; }
    .invoice p { margin: 2px 0; font-size: 13px; }
    .invoice .amount { font-size: 16px; font-weight: bold; }
    .invoice .barcode-wrap { text-align: center; margin-top: auto; }
    .invoice .barcode-wrap svg { max-width: 100%; height: 55px; }
  </style>
</head>
<body>${body}<script>window.onload=()=>{setTimeout(()=>window.print(),300)};</script></body>
</html>`;

export const printBarcodeLabels = async (orders: ScannedOrder[]) => {
  const JsBarcode = (await import('jsbarcode')).default;
  const QRCode = (await import('qrcode')).default;

  const items = await Promise.all(
    orders.map(async (o) => {
      const code = o.tracking_code || `ORD-${o.order_number}`;
      // barcode SVG string
      const tmp = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      tmp.appendChild(svg);
      try { JsBarcode(svg, code, { format: 'CODE128', height: 50, fontSize: 12 }); } catch {}
      const barcodeSvg = new XMLSerializer().serializeToString(svg);
      const qrDataUrl = await QRCode.toDataURL(code, { width: 120, margin: 1 });
      return `<div class="label">
        <h2>#${o.order_number}</h2>
        ${barcodeSvg}
        <img src="${qrDataUrl}" />
        <div class="meta">${o.customer_name || ''} · ${o.governorate_name || ''}</div>
      </div>`;
    })
  );

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(html(`<div class="grid">${items.join('')}</div>`));
  w.document.close();
};

export const printInvoicesGrouped = async (orders: ScannedOrder[]) => {
  const JsBarcode = (await import('jsbarcode')).default;

  const rows = orders.map((o) => {
    const code = o.tracking_code || `ORD-${o.order_number}`;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    try { JsBarcode(svg, code, { format: 'CODE128', height: 55, fontSize: 12, margin: 2 }); } catch {}
    const barcodeSvg = new XMLSerializer().serializeToString(svg);
    return `
      <div class="invoice">
        <h2 class="title">MP</h2>
        <p>العميل: ${o.customer_name || '-'}</p>
        <p>الهاتف: ${o.customer_phone || '-'}</p>
        <p>المندوب: ${o.agent_name || '-'}</p>
        <p>المدينة: ${o.governorate_name || '-'}</p>
        <p class="amount">المبلغ: ${o.total_amount.toFixed(2)} ج</p>
        <div class="barcode-wrap">${barcodeSvg}</div>
      </div>
    `;
  }).join('');

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  // A5 page with 2 invoices side by side (small paper, 2 per sheet)
  w.document.write(html(`<div class="grid">${rows}</div>`, { pageSize: 'A5 landscape', gridCols: 2 }));
  w.document.close();
};
