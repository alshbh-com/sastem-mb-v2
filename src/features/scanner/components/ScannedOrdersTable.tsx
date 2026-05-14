import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ScannedOrder, STATUS_ARABIC } from '../types';

const statusColor = (s: string) => {
  switch (s) {
    case 'delivered': return 'bg-green-500/20 text-green-700 dark:text-green-400';
    case 'returned': return 'bg-orange-500/20 text-orange-700 dark:text-orange-400';
    case 'cancelled': return 'bg-red-500/20 text-red-700 dark:text-red-400';
    case 'shipped': return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
    case 'processing': return 'bg-purple-500/20 text-purple-700 dark:text-purple-400';
    default: return 'bg-muted text-muted-foreground';
  }
};

interface Props {
  orders: ScannedOrder[];
  onRemove: (id: string) => void;
}

export const ScannedOrdersTable = ({ orders, onRemove }: Props) => {
  if (orders.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-muted-foreground bg-card">
        لم يتم اسكان أي أوردر بعد. ابدأ بتوجيه المسدس على الباركود.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">#</TableHead>
            <TableHead className="text-right">رقم الأوردر</TableHead>
            <TableHead className="text-right">العميل</TableHead>
            <TableHead className="text-right">المندوب</TableHead>
            <TableHead className="text-right">الحالة</TableHead>
            <TableHead className="text-right">المبلغ</TableHead>
            <TableHead className="text-right">المدينة</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o, i) => (
            <TableRow key={o.id} className="animate-in fade-in slide-in-from-top-1">
              <TableCell>{i + 1}</TableCell>
              <TableCell className="font-mono font-bold">#{o.order_number}</TableCell>
              <TableCell>{o.customer_name || '-'}</TableCell>
              <TableCell>{o.agent_name || '-'}</TableCell>
              <TableCell>
                <Badge className={statusColor(o.status)} variant="outline">
                  {STATUS_ARABIC[o.status] || o.status}
                </Badge>
              </TableCell>
              <TableCell className="font-semibold">{o.total_amount.toFixed(2)} ج</TableCell>
              <TableCell>{o.governorate_name || '-'}</TableCell>
              <TableCell>
                <Button size="icon" variant="ghost" onClick={() => onRemove(o.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
