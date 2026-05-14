export interface ScannedOrder {
  id: string;
  order_number: number;
  tracking_code: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  agent_name: string | null;
  agent_id: string | null;
  status: string;
  total_amount: number;
  governorate_name: string | null;
  scanned_at: string;
}

export type BulkStatusKey =
  | 'delivered'
  | 'returned'
  | 'postponed'
  | 'failed'
  | 'shipped'
  | 'out_for_delivery'
  | 'processing'
  | 'received_from_warehouse';

export interface BulkStatusOption {
  key: BulkStatusKey;
  label: string;
  enumValue: string;
  noteSuffix?: string;
}

export const BULK_STATUS_OPTIONS: BulkStatusOption[] = [
  { key: 'delivered', label: 'تم التسليم', enumValue: 'delivered' },
  { key: 'returned', label: 'مرتجع', enumValue: 'returned' },
  { key: 'postponed', label: 'مؤجل', enumValue: 'pending', noteSuffix: 'مؤجل' },
  { key: 'failed', label: 'فشل التسليم', enumValue: 'cancelled', noteSuffix: 'فشل التسليم' },
  { key: 'shipped', label: 'جاري التوصيل', enumValue: 'shipped' },
  { key: 'out_for_delivery', label: 'خرج للتوصيل', enumValue: 'shipped', noteSuffix: 'خرج للتوصيل' },
  { key: 'processing', label: 'تم التجهيز', enumValue: 'processing' },
  { key: 'received_from_warehouse', label: 'تم الاستلام من المخزن', enumValue: 'processing', noteSuffix: 'مستلم من المخزن' },
];

export const STATUS_ARABIC: Record<string, string> = {
  pending: 'قيد الانتظار',
  processing: 'قيد التجهيز',
  shipped: 'جاري التوصيل',
  delivered: 'تم التسليم',
  returned: 'مرتجع',
  cancelled: 'ملغي',
  delivered_with_modification: 'تم التسليم بتعديل',
  agent_deleted: 'مندوب محذوف',
  return_no_shipping: 'مرتجع بدون شحن',
};
