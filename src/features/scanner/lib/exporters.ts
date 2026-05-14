import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { ScannedOrder, STATUS_ARABIC } from '../types';

export const exportToExcel = (orders: ScannedOrder[]) => {
  const rows = orders.map((o, i) => ({
    '#': i + 1,
    'رقم الأوردر': o.order_number,
    'كود التتبع': o.tracking_code || '',
    'العميل': o.customer_name || '',
    'الهاتف': o.customer_phone || '',
    'المندوب': o.agent_name || '',
    'الحالة': STATUS_ARABIC[o.status] || o.status,
    'المبلغ': o.total_amount,
    'المدينة': o.governorate_name || '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Scanned');
  XLSX.writeFile(wb, `scan-session-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportToPdf = (orders: ScannedOrder[]) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text('Scanned Orders Report', 40, 40);
  doc.setFontSize(10);
  let y = 70;
  doc.text('# | Order | Tracking | Customer | Agent | Status | Amount | City', 40, y);
  y += 16;
  orders.forEach((o, i) => {
    if (y > 800) { doc.addPage(); y = 40; }
    const line = `${i + 1} | ${o.order_number} | ${o.tracking_code || '-'} | ${(o.customer_name || '-').slice(0, 16)} | ${(o.agent_name || '-').slice(0, 12)} | ${o.status} | ${o.total_amount} | ${(o.governorate_name || '-').slice(0, 12)}`;
    doc.text(line, 40, y);
    y += 14;
  });
  doc.save(`scan-session-${new Date().toISOString().slice(0, 10)}.pdf`);
};
