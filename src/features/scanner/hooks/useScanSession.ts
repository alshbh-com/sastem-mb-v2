import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { ScannedOrder } from '../types';
import { beep } from '../lib/beep';
import { toast } from 'sonner';

const BLOCKED_STATUSES = ['cancelled', 'agent_deleted'];

export const useScanSession = () => {
  const { currentUser } = useAdminAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [orders, setOrders] = useState<ScannedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const idsRef = useRef<Set<string>>(new Set());

  const startSession = useCallback(async () => {
    const { data, error } = await supabase
      .from('scan_sessions')
      .insert({
        started_by: currentUser?.id || null,
        started_by_username: currentUser?.username || 'guest',
        status: 'active',
      })
      .select()
      .single();
    if (error) {
      toast.error('فشل بدء الجلسة');
      return null;
    }
    setSessionId(data.id);
    setOrders([]);
    idsRef.current = new Set();
    return data.id;
  }, [currentUser]);

  const endSession = useCallback(async () => {
    if (!sessionId) return;
    await supabase
      .from('scan_sessions')
      .update({
        ended_at: new Date().toISOString(),
        status: 'closed',
        total_scanned: orders.length,
      })
      .eq('id', sessionId);
  }, [sessionId, orders.length]);

  const resetSession = useCallback(() => {
    setSessionId(null);
    setOrders([]);
    idsRef.current = new Set();
  }, []);

  const scanCode = useCallback(
    async (raw: string) => {
      const code = raw.trim();
      if (!code || !sessionId) return;
      setLoading(true);

      // try parse order_number, otherwise tracking_code or manual_code
      const num = parseInt(code.replace(/[^0-9]/g, ''), 10);
      const trackMatch = code.toUpperCase();

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, tracking_code, status, total_amount, delivery_agent_id, governorate_id,
          customer:customers(name, phone),
          agent:delivery_agents(name),
          gov:governorates(name)
        `)
        .or(`tracking_code.eq.${trackMatch},manual_code.eq.${code}${!isNaN(num) ? `,order_number.eq.${num}` : ''}`)
        .limit(1)
        .maybeSingle();

      setLoading(false);

      if (error || !data) {
        beep(false);
        toast.error(`الأوردر غير موجود: ${code}`);
        return;
      }
      if (idsRef.current.has(data.id)) {
        beep(false);
        toast.warning(`تم اسكان هذا الأوردر مسبقًا (#${data.order_number})`);
        return;
      }
      if (BLOCKED_STATUSES.includes(data.status)) {
        beep(false);
        toast.error(`لا يمكن اسكان أوردر بحالة: ${data.status}`);
        return;
      }

      idsRef.current.add(data.id);
      const customer: any = (data as any).customer;
      const agent: any = (data as any).agent;
      const gov: any = (data as any).gov;

      const so: ScannedOrder = {
        id: data.id,
        order_number: data.order_number,
        tracking_code: data.tracking_code,
        customer_name: customer?.name || null,
        customer_phone: customer?.phone || null,
        agent_name: agent?.name || null,
        agent_id: data.delivery_agent_id,
        status: data.status,
        total_amount: Number(data.total_amount) || 0,
        governorate_name: gov?.name || null,
        scanned_at: new Date().toISOString(),
      };
      setOrders((prev) => [so, ...prev]);

      await supabase.from('scan_session_items').insert({
        session_id: sessionId,
        order_id: data.id,
        scanned_code: code,
      });
      await supabase.from('scan_logs').insert({
        session_id: sessionId,
        order_id: data.id,
        action: 'scan',
        username: currentUser?.username || 'guest',
        user_id: currentUser?.id || null,
        payload: { code },
      });

      beep(true);
      toast.success(`تم اسكان #${data.order_number}`);
    },
    [sessionId, currentUser]
  );

  const removeOrder = useCallback((id: string) => {
    idsRef.current.delete(id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  // Realtime: update local order rows on changes
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`scanner-orders-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload: any) => {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === payload.new.id
                ? { ...o, status: payload.new.status, total_amount: Number(payload.new.total_amount) || o.total_amount }
                : o
            )
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return {
    sessionId,
    orders,
    loading,
    startSession,
    endSession,
    resetSession,
    scanCode,
    removeOrder,
  };
};
