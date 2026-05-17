import { supabase } from "@/integrations/supabase/client";

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
  @page { size: A5 landscape; margin: 6mm; }
  *{box-sizing:border-box}
  body { font-family: Arial, sans-serif; margin: 0; color:#000; background:#fff; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4mm; }
  .invoice { border: 1px solid #333; padding: 4mm; page-break-inside: avoid; display: flex; flex-direction: column; gap: 2mm; min-height: 130mm; }
  .invoice .title { font-size: 28px; font-weight: bold; text-align: center; margin: 0; letter-spacing: 2px; }
  .invoice p { margin: 2px 0; font-size: 13px; }
  .invoice .amount { font-size: 16px; font-weight: bold; }
  .invoice .barcode-wrap { text-align: center; margin-top: auto; }
  .invoice .barcode-wrap svg { max-width: 100%; height: 60px; }
</style></head><body>${body}
<script>window.onload=()=>{setTimeout(()=>window.print(),300)};</script>
</body></html>`;

export const printMpInvoices = async (
  orders: OrderLike[],
  opts?: { markPrinted?: boolean }
) => {
  if (!orders?.length) return;
  const JsBarcode = (await import("jsbarcode")).default;

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
          height: 60,
          fontSize: 13,
          margin: 2,
        });
      } catch {}
      const barcodeSvg = new XMLSerializer().serializeToString(svg);
      return `
        <div class="invoice">
          <h2 class="title">MP</h2>
          <p>العميل: ${o.customers?.name || "-"}</p>
          <p>الهاتف: ${o.customers?.phone || "-"}</p>
          <p>المندوب: ${o.delivery_agents?.name || "-"}</p>
          <p>المدينة: ${o.governorates?.name || "-"}</p>
          <p class="amount">المبلغ: ${total.toFixed(2)} ج</p>
          <div class="barcode-wrap">${barcodeSvg}</div>
        </div>`;
    })
    .join("");

  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(buildHtml(`<div class="grid">${rows}</div>`));
  w.document.close();

  if (opts?.markPrinted) {
    const ids = orders.map((o) => o.id);
    await supabase
      .from("orders")
      .update({ is_printed: true, printed_at: new Date().toISOString() } as any)
      .in("id", ids);
  }
};
