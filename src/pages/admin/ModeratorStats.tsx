import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UserCog, Package, CheckCircle2, RotateCcw, Hash } from "lucide-react";
import { useNavigate } from "react-router-dom";

const monthNames = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const ModeratorStats = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1); // 1-12

  // حدود الشهر: من اليوم 1 إلى آخر يوم في الشهر (28/29/30/31)
  const { startISO, endISO, lastDay } = useMemo(() => {
    const start = new Date(year, month - 1, 1, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59); // آخر يوم في الشهر
    return {
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      lastDay: end.getDate(),
    };
  }, [year, month]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["moderator-stats", year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, created_by_username, created_by_user_id, total_amount, created_at")
        .not("created_by_username", "is", null)
        .gte("created_at", startISO)
        .lte("created_at", endISO);
      if (error) throw error;
      return data || [];
    },
  });

  // تجميع حسب اسم المدريتور
  const stats = useMemo(() => {
    const map = new Map<string, {
      username: string;
      total: number;
      delivered: number;
      returned: number;
      pending: number;
      shipped: number;
      cancelled: number;
      revenue: number;
    }>();

    for (const o of orders || []) {
      const name = o.created_by_username || "غير معروف";
      if (!map.has(name)) {
        map.set(name, {
          username: name,
          total: 0,
          delivered: 0,
          returned: 0,
          pending: 0,
          shipped: 0,
          cancelled: 0,
          revenue: 0,
        });
      }
      const s = map.get(name)!;
      s.total += 1;
      const status = (o.status || "").toLowerCase();
      if (status === "delivered" || status === "delivered_with_modification") {
        s.delivered += 1;
        s.revenue += parseFloat(o.total_amount?.toString() || "0");
      } else if (status === "returned" || status === "partially_returned" || status === "return_no_shipping") {
        s.returned += 1;
      } else if (status === "shipped") {
        s.shipped += 1;
      } else if (status === "cancelled") {
        s.cancelled += 1;
      } else {
        s.pending += 1;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [orders]);

  // إجماليات عامة
  const totals = useMemo(() => {
    return stats.reduce(
      (acc, s) => {
        acc.total += s.total;
        acc.delivered += s.delivered;
        acc.returned += s.returned;
        acc.revenue += s.revenue;
        return acc;
      },
      { total: 0, delivered: 0, returned: 0, revenue: 0 }
    );
  }, [stats]);

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20 py-8">
      <div className="container mx-auto px-4">
        <Button onClick={() => navigate("/admin")} variant="ghost" className="mb-4">
          <ArrowLeft className="ml-2 h-4 w-4" />
          الرجوع إلى الصفحة الرئيسية
        </Button>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2">
                <UserCog className="h-6 w-6 text-primary" />
                <CardTitle>إحصائيات المدريتورين</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((n, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              الفترة: من 1 إلى {lastDay} {monthNames[month - 1]} {year}
            </p>
          </CardHeader>

          <CardContent>
            {/* البطاقات الإجمالية */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">إجمالي الأوردرات</p>
                      <p className="text-2xl font-bold">{totals.total}</p>
                    </div>
                    <Package className="h-8 w-8 text-primary opacity-70" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">تم التسليم</p>
                      <p className="text-2xl font-bold text-green-600">{totals.delivered}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-600 opacity-70" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">المرتجع</p>
                      <p className="text-2xl font-bold text-orange-600">{totals.returned}</p>
                    </div>
                    <RotateCcw className="h-8 w-8 text-orange-600 opacity-70" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">عدد المدريتورين</p>
                      <p className="text-2xl font-bold">{stats.length}</p>
                    </div>
                    <Hash className="h-8 w-8 text-primary opacity-70" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* الجدول التفصيلي */}
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
            ) : stats.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                لا توجد أوردرات مسجلة من المدريتورين في هذه الفترة
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المدريتور</TableHead>
                      <TableHead className="text-right">إجمالي الأوردرات</TableHead>
                      <TableHead className="text-right text-green-600">تم التسليم</TableHead>
                      <TableHead className="text-right text-orange-600">مرتجع</TableHead>
                      <TableHead className="text-right text-purple-600">تم الشحن</TableHead>
                      <TableHead className="text-right text-yellow-600">قيد الانتظار</TableHead>
                      <TableHead className="text-right text-red-600">ملغي</TableHead>
                      <TableHead className="text-right">نسبة التسليم</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.map((s) => {
                      const deliveryRate = s.total > 0 ? ((s.delivered / s.total) * 100).toFixed(1) : "0";
                      return (
                        <TableRow key={s.username}>
                          <TableCell className="font-bold">{s.username}</TableCell>
                          <TableCell className="font-bold">{s.total}</TableCell>
                          <TableCell className="text-green-600 font-semibold">{s.delivered}</TableCell>
                          <TableCell className="text-orange-600 font-semibold">{s.returned}</TableCell>
                          <TableCell className="text-purple-600">{s.shipped}</TableCell>
                          <TableCell className="text-yellow-600">{s.pending}</TableCell>
                          <TableCell className="text-red-600">{s.cancelled}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              parseFloat(deliveryRate) >= 70 ? "bg-green-100 text-green-700" :
                              parseFloat(deliveryRate) >= 40 ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {deliveryRate}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ModeratorStats;
