import { supabase } from "@/integrations/supabase/client";
import invoiceLogo from "@/assets/invoice-logo.jpg";

interface OrderLike {
  id: string;
  order_number: number | null;
  tracking_code: string | null;
  barcode_value?: string | null;
  total_amount: number | string;
  shipping_cost?: number | string | null;
  customers?: { name?: string | null; phone?: string | null } | null;
  governorates?: { name?: string | null } | null;
  delivery_agents?: { name?: string | null } | null;
}

const buildHtml = (body: string) => `<!DOCTYPE html>
<html dir="rtl"><head><meta charset="utf-8"><title>طباعة الفواتير</title>
<style>
  @page { size: A5 portrait; margin: 5mm; }
  *{box-sizing:border-box}
  body { font-family: Arial, sans-serif; margin: 0; color:#000; background:#fff; }
  .stack { display: flex; flex-direction: column; gap: 4mm; }
  .invoice {
    border: 1px solid #333;
    padding: 4mm;
    page-break-inside: avoid;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3mm;
    align-items: center;
    height: 68mm;
  }
  .invoice .logo { display:flex; align-items:center; justify-content:center; }
  .invoice .logo img { max-height: 50mm; max-width: 100%; object-fit: contain; }
  .invoice .info { display:flex; flex-direction:column; gap:2mm; }
  .invoice p { margin: 0; font-size: 13px; }
  .invoice .amount { font-size: 16px; font-weight: bold; }
  .invoice .barcode-wrap { text-align: center; margin-top: auto; }
  .invoice .barcode-wrap svg { max-width: 100%; height: 55px; }
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

export const printMpInvoices = async (
  orders: OrderLike[],
  opts?: { markPrinted?: boolean }
) => {
  if (!orders?.length) return;
  const JsBarcode = (await import("jsbarcode")).default;
  const logoSrc = await toDataUrl(invoiceLogo);

  const rows = orders
    .map((o) => {
      const code = o.tracking_code || o.barcode_value || `ORD-${o.order_number ?? ""}`;
      const total =
        parseFloat(String(o.total_amount || 0)) +
        parseFloat(String(o.shipping_cost || 0));
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      try {
        JsBarcode(svg, code, {
          format: "CODE128",
          height: 55,
          fontSize: 13,
          margin: 2,
        });
      } catch {}
      const barcodeSvg = new XMLSerializer().serializeToString(svg);
      return `
        <div class="invoice">
          <div class="logo"><img src="${logoSrc}" alt="logo" /></div>
          <div class="info">
            <p>العميل: ${o.customers?.name || "-"}</p>
            <p>الهاتف: ${o.customers?.phone || "-"}</p>
            <p>المندوب: ${o.delivery_agents?.name || "-"}</p>
            <p>المدينة: ${o.governorates?.name || "-"}</p>
            <p class="amount">المبلغ: ${total.toFixed(2)} ج</p>
            <div class="barcode-wrap">${barcodeSvg}</div>
          </div>
        </div>`;
    })
    .join("");

  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  w.document.write(buildHtml(`<div class="stack">${rows}</div>`));
  w.document.close();

  if (opts?.markPrinted) {
    const ids = orders.map((o) => o.id);
    await supabase
      .from("orders")
      .update({ is_printed: true, printed_at: new Date().toISOString() } as any)
      .in("id", ids);
  }
};
