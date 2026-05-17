import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Printer, Search, RotateCcw, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { printMpInvoices } from "@/lib/printMpInvoices";
import { toast } from "sonner";

const LockedInvoices = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [governorateFilter, setGovernorateFilter] = useState<string>("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["locked-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          customers (name, phone, address, governorate, phone2),
          delivery_agents (name, serial_number),
          governorates (name, shipping_cost),
          order_items (*, products (name))
        `)
        .eq("is_printed", true)
        .order("printed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: governorates } = useQuery({
    queryKey: ["governorates-filter"],
    queryFn: async () => {
      const { data } = await supabase.from("governorates").select("id, name").order("name");
      return data || [];
    },
  });

  const getDateKey = (value: string | Date) => {
    const d = typeof value === "string" ? new Date(value) : value;
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  };

  const uniqueDates = useMemo(() => {
    if (!orders?.length) return [];
    const dates = new Set<string>();
    orders.forEach(o => dates.add(getDateKey((o as any).printed_at || o.created_at)));
    return Array.from(dates).sort().reverse();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!orders?.length) return [];
    return orders.filter((order: any) => {
      if (searchQuery) {
        const orderNum = (order.order_number || "").toString();
        const orderId = order.id.slice(0, 8);
        const customerName = order.customers?.name || "";
        const q = searchQuery.trim();
        if (!orderNum.includes(q) && !orderId.includes(q) && !customerName.includes(q)) return false;
      }
      if (dateFilter) {
        const orderDate = getDateKey(order.printed_at || order.created_at);
        if (orderDate !== dateFilter) return false;
      }
      if (governorateFilter && governorateFilter !== "all") {
        const orderGov = order.governorates?.name || order.customers?.governorate || "";
        if (orderGov !== governorateFilter) return false;
      }
      return true;
    });
  }, [orders, searchQuery, dateFilter, governorateFilter]);

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) setSelectedOrders([]);
    else setSelectedOrders(filteredOrders.map((o: any) => o.id));
  };

  const handleReprint = async () => {
    const ordersToPrint = filteredOrders?.filter((o: any) => selectedOrders.includes(o.id));
    if (!ordersToPrint?.length) return;
    await printMpInvoices(ordersToPrint as any);
    toast.success(`جاري إعادة طباعة ${ordersToPrint.length} فاتورة`);
  };

  const handleRestore = async () => {
    if (!selectedOrders.length) return;
    if (!confirm(`هل تريد إعادة ${selectedOrders.length} فاتورة إلى قسم الفواتير؟`)) return;
    const { error } = await supabase
      .from("orders")
      .update({ is_printed: false, printed_at: null } as any)
      .in("id", selectedOrders);
    if (error) { toast.error("فشل الإرجاع"); return; }
    toast.success("تم الإرجاع إلى الفواتير");
    setSelectedOrders([]);
    queryClient.invalidateQueries({ queryKey: ["locked-invoices"] });
    queryClient.invalidateQueries({ queryKey: ["orders-for-invoices"] });
  };

  if (isLoading) return <div className="p-8">جاري التحميل...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20 py-8">
      <div className="container mx-auto px-4">
        <Button onClick={() => navigate("/admin")} variant="ghost" className="mb-4">
          <ArrowLeft className="ml-2 h-4 w-4" /> رجوع
        </Button>
        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div className="flex flex-row items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> الفواتير المقفلة (المطبوعة)</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleReprint} disabled={selectedOrders.length === 0}>
                  <Printer className="ml-2 h-4 w-4" /> إعادة طباعة ({selectedOrders.length})
                </Button>
                <Button variant="outline" onClick={handleRestore} disabled={selectedOrders.length === 0}>
                  <RotateCcw className="ml-2 h-4 w-4" /> إرجاع إلى الفواتير
                </Button>
              </div>
            </div>

            <div className="flex items-end gap-4 flex-wrap p-4 bg-muted/50 rounded-lg">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">بحث برقم الأوردر أو الاسم</Label>
                <div className="relative">
                  <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ابحث..." className="w-44 pr-8" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">التاريخ</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="كل الأيام" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأيام</SelectItem>
                    {uniqueDates.map(d => <SelectItem key={d} value={d}>{new Date(d).toLocaleDateString("ar-EG")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">المحافظة</Label>
                <Select value={governorateFilter} onValueChange={setGovernorateFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="كل المحافظات" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المحافظات</SelectItem>
                    {governorates?.map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setDateFilter(""); setGovernorateFilter("all"); setSearchQuery(""); }}>مسح الفلاتر</Button>
              <div className="mr-auto text-sm text-muted-foreground">عدد النتائج: {filteredOrders.length}</div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredOrders.length > 0 && (
              <div className="mb-4">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedOrders.length === filteredOrders.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
                </Button>
              </div>
            )}
            <div className="space-y-2">
              {filteredOrders?.map((order: any) => {
                const totalAmount = parseFloat(order.total_amount.toString());
                const customerShipping = parseFloat((order.shipping_cost || 0).toString());
                const totalPrice = totalAmount + customerShipping;
                return (
                  <div key={order.id} className="flex items-start gap-4 p-4 border rounded">
                    <Checkbox
                      checked={selectedOrders.includes(order.id)}
                      onCheckedChange={(c) => setSelectedOrders(c ? [...selectedOrders, order.id] : selectedOrders.filter(id => id !== order.id))}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">#{order.manual_code || order.order_number || order.id.slice(0, 8)}</span>
                        <p className="font-bold">{order.customers?.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded bg-muted">{order.governorates?.name || order.customers?.governorate || "-"}</span>
                        <span className="text-xs text-muted-foreground">طُبعت: {order.printed_at ? new Date(order.printed_at).toLocaleString("ar-EG") : "-"}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">الإجمالي: {totalPrice.toFixed(2)} ج.م</p>
                    </div>
                  </div>
                );
              })}
              {filteredOrders.length === 0 && (
                <p className="text-center text-muted-foreground py-8">لا توجد فواتير مقفلة</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LockedInvoices;
