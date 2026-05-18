import { supabase } from "@/integrations/supabase/client";
import invoiceLogo from "@/assets/invoice-logo.jpg";

interface OrderLike {
  id: string;
  order_number: number | null;
  manual_code?: string | null;
  tracking_code: string | null;
  barcode_value?: string | null;
  total_amount: number | string;
  shipping_cost?: number | string | null;
  notes?: string | null;
  order_details?: string | null;
}

const buildHtml = (body: string) => `<!DOCTYPE html>
<html dir="rtl"><head><meta charset="utf-8"><title>طباعة الفواتير</title>
<style>
  @page { size: A4 landscape; margin: 6mm; }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#fff;color:#000}
  body { font-family: "Cairo","Tajawal","Arial",sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .sheet {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6mm;
    page-break-after: always;
  }
  .sheet:last-child { page-break-after: auto; }
  .invoice {
    border: 2px solid #000;
    border-radius: 18mm 18mm 6mm 6mm;
    padding: 7mm 6mm 6mm 6mm;
    height: 192mm;
    page-break-inside: avoid;
    display: flex;
    flex-direction: column;
    position: relative;
    background:#fff;
  }
  .logo-wrap {
    text-align:center;
    margin-bottom: 4mm;
  }
  .logo-wrap img {
    max-height: 29mm;
    max-width: 60mm;
    object-fit: contain;
  }
  .field {
    font-size: 14px;
    line-height: 1.9;
    border: 1px solid #000;
    padding: 2mm 3mm;
    margin-bottom: 2.5mm;
    border-radius: 2mm;
  }
  .field b { font-weight: 700; }
  .row2 { display:grid; grid-template-columns: 1fr 1fr; gap: 2.5mm; }
  .total {
    font-size: 18px;
    font-weight: 800;
    text-align:center;
    border: 2px solid #000;
    padding: 3mm;
    border-radius: 2mm;
    margin-top: 1mm;
  }
  .barcode-wrap {
    margin-top: auto;
    text-align:center;
    padding-top: 3mm;
  }
  .barcode-wrap svg { max-width: 90%; height: 18mm; }
  .code-text { font-size: 11px; margin-top:1mm; letter-spacing: 1px; }
  .details {
    font-size: 16px;
    line-height: 1.9;
    text-align: center;
    padding: 4mm 2mm;
    white-space: pre-wrap;
    word-break: break-word;
    flex: 1;
  }
</style></head><body>${body}
<script>window.onload=()=>{setTimeout(()=>window.print(),400)};</script>
</body></html>`;

const toDataUrl = async (url: string): Promise<string> => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const buildInvoice = (o: OrderLike, logoSrc: string, barcodeSvg: string, code: string) => {
  const total =
    parseFloat(String(o.total_amount || 0)) +
    parseFloat(String(o.shipping_cost || 0));

  const details = (o.notes || "").trim();
  const detailsHtml = details
    ? `<div class="details">${escapeHtml(details).replace(/\n/g, "<br/>")}</div>`
    : "";

  return `
    <div class="invoice">
      <div class="logo-wrap"><img src="${logoSrc}" alt="logo" /></div>

      ${detailsHtml}

      <div class="total">الإجمالي: ${total.toFixed(2)} ج.م</div>

      <div class="barcode-wrap">
        ${barcodeSvg}
        <div class="code-text">${code}</div>
      </div>
    </div>`;
};

export const printMpInvoices = async (
  orders: OrderLike[],
  opts?: { markPrinted?: boolean }
) => {
  if (!orders?.length) return;
  const JsBarcode = (await import("jsbarcode")).default;
  const logoSrc = await toDataUrl(invoiceLogo);

  const cells = orders.map((o) => {
    const code =
      o.manual_code ||
      o.tracking_code ||
      o.barcode_value ||
      (o.order_number ? `ORD-${o.order_number}` : o.id.slice(0, 8));
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    try {
      JsBarcode(svg, code, {
        format: "CODE128",
        height: 60,
        fontSize: 14,
        displayValue: false,
        margin: 2,
      });
    } catch {}
    const barcodeSvg = new XMLSerializer().serializeToString(svg);
    return buildInvoice(o, logoSrc, barcodeSvg, code);
  });

  // Each order: 2 copies side by side on the same sheet
  const sheets = cells.map((cell) => `<div class="sheet">${cell}${cell}</div>`);

  const w = window.open("", "_blank", "width=1000,height=800");
  if (!w) return;
  w.document.write(buildHtml(sheets.join("")));
  w.document.close();

  if (opts?.markPrinted) {
    const ids = orders.map((o) => o.id);
    await supabase
      .from("orders")
      .update({ is_printed: true, printed_at: new Date().toISOString() } as any)
      .in("id", ids);
  }
};
