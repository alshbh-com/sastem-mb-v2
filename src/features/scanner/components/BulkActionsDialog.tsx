import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { toast } from 'sonner';
import {
  Printer, FileSpreadsheet, FileText, UserPlus, UserMinus, Trash2, RefreshCw,
} from 'lucide-react';
import { ScannedOrder, BULK_STATUS_OPTIONS, BulkStatusKey } from '../types';
import { exportToExcel, exportToPdf } from '../lib/exporters';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orders: ScannedOrder[];
  sessionId: string | null;
  onClearOrders: () => void;
  onPrintInvoices: (orders: ScannedOrder[]) => void;
  onPrintBarcodes: (orders: ScannedOrder[]) => void;
}

interface Agent { id: string; name: string }

export const BulkActionsDialog = ({
  open, onOpenChange, orders, sessionId, onClearOrders, onPrintInvoices, onPrintBarcodes,
}: Props) => {
  const { currentUser } = useAdminAuth();
  const [statusKey, setStatusKey] = useState<BulkStatusKey>('delivered');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentId, setAgentId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from('delivery_agents').select('id, name').then(({ data }) => {
      setAgents(data || []);
    });
  }, [open]);

  const orderIds = orders.map((o) => o.id);

  const writeStatusHistory = async (oldOrders: ScannedOrder[], newStatus: string, note?: string) => {
    const rows = oldOrders.map((o) => ({
      order_id: o.id,
      old_status: o.status,
      new_status: newStatus,
      changed_by: currentUser?.id || null,
      changed_by_username: currentUser?.username || 'guest',
      reason: note || null,
    }));
    if (rows.length) await supabase.from('order_status_history').insert(rows);
    const logs = oldOrders.map((o) => ({
      session_id: sessionId,
      order_id: o.id,
      action: 'status_change',
      old_status: o.status,
      new_status: newStatus,
      username: currentUser?.username || 'guest',
      user_id: currentUser?.id || null,
      payload: { reason: note },
    }));
    if (logs.length) await supabase.from('scan_logs').insert(logs);
  };

  const applyStatus = async () => {
    if (!orders.length) return;
    setBusy(true);
    const opt = BULK_STATUS_OPTIONS.find((s) => s.key === statusKey)!;
    const fullNote = [opt.noteSuffix, reason].filter(Boolean).join(' - ') || null;

    const update: any = { status: opt.enumValue };
    // memory rule: revert to pending/processing clears agent
    if (opt.enumValue === 'pending' || opt.enumValue === 'processing') {
      update.delivery_agent_id = null;
    }
    if (fullNote) update.notes = fullNote;

    const { error } = await supabase.from('orders').update(update).in('id', orderIds);
    if (error) { setBusy(false); toast.error('فشل تحديث الحالات'); return; }

    await writeStatusHistory(orders, opt.enumValue, fullNote || undefined);
    toast.success(`تم تحديث ${orders.length} أوردر إلى: ${opt.label}`);
    setBusy(false);
  };

  const assignAgent = async () => {
    if (!agentId || !orders.length) return;
    setBusy(true);
    const { error } = await supabase
      .from('orders')
      .update({ delivery_agent_id: agentId, assigned_at: new Date().toISOString() })
      .in('id', orderIds);
    if (error) { setBusy(false); toast.error('فشل تعيين المندوب'); return; }
    await supabase.from('scan_logs').insert(
      orders.map((o) => ({
        session_id: sessionId, order_id: o.id, action: 'assign_agent',
        username: currentUser?.username || 'guest', user_id: currentUser?.id || null,
        payload: { agent_id: agentId },
      }))
    );
    toast.success(`تم تعيين المندوب لـ ${orders.length} أوردر`);
    setBusy(false);
  };

  const unassignAgent = async () => {
    if (!orders.length) return;
    setBusy(true);
    const { error } = await supabase
      .from('orders')
      .update({ delivery_agent_id: null, assigned_at: null })
      .in('id', orderIds);
    if (error) { setBusy(false); toast.error('فشل إزالة التعيين'); return; }
    await supabase.from('scan_logs').insert(
      orders.map((o) => ({
        session_id: sessionId, order_id: o.id, action: 'unassign_agent',
        username: currentUser?.username || 'guest', user_id: currentUser?.id || null, payload: {},
      }))
    );
    toast.success('تمت إزالة التعيين');
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">الأوامر الجماعية ({orders.length} أوردر)</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Status */}
          <section className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <h3 className="font-semibold flex items-center gap-2"><RefreshCw className="h-4 w-4" /> تغيير الحالة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>الحالة الجديدة</Label>
                <Select value={statusKey} onValueChange={(v) => setStatusKey(v as BulkStatusKey)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BULK_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ملاحظة (اختياري)</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={1} />
              </div>
            </div>
            <Button onClick={applyStatus} disabled={busy} className="w-full">تطبيق الحالة على الكل</Button>
          </section>

          {/* Agent */}
          <section className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <h3 className="font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4" /> تعيين / إزالة مندوب</h3>
            <div className="flex gap-2">
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="اختر مندوبًا" /></SelectTrigger>
                <SelectContent>
                  {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={assignAgent} disabled={busy || !agentId}><UserPlus className="h-4 w-4 ml-1" />تعيين</Button>
              <Button variant="outline" onClick={unassignAgent} disabled={busy}><UserMinus className="h-4 w-4 ml-1" />إزالة</Button>
            </div>
          </section>

          {/* Print + Export */}
          <section className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <h3 className="font-semibold">الطباعة والتصدير</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button variant="outline" onClick={() => onPrintInvoices(orders)}><Printer className="h-4 w-4 ml-1" />فواتير</Button>
              <Button variant="outline" onClick={() => onPrintBarcodes(orders)}><Printer className="h-4 w-4 ml-1" />ملصقات باركود</Button>
              <Button variant="outline" onClick={() => exportToPdf(orders)}><FileText className="h-4 w-4 ml-1" />PDF</Button>
              <Button variant="outline" onClick={() => exportToExcel(orders)}><FileSpreadsheet className="h-4 w-4 ml-1" />Excel</Button>
            </div>
          </section>

          <Button variant="destructive" onClick={() => { onClearOrders(); onOpenChange(false); }} className="w-full">
            <Trash2 className="h-4 w-4 ml-2" /> حذف الكل من القائمة الحالية
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
