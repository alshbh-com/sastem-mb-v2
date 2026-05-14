-- Add fields for moderator/manual order workflow
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS manual_code text,
  ADD COLUMN IF NOT EXISTS account_name text,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_username text,
  ADD COLUMN IF NOT EXISTS manual_order_date date;

CREATE INDEX IF NOT EXISTS idx_orders_manual_code ON public.orders(manual_code);
CREATE INDEX IF NOT EXISTS idx_orders_account_name ON public.orders(account_name);

-- Add role to admin_users for moderator type
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin';

-- Add password to cashbox
ALTER TABLE public.cashbox
  ADD COLUMN IF NOT EXISTS password text;

-- Ensure 'admin' system password exists (for changing the master admin password)
INSERT INTO public.system_passwords (id, password, description)
VALUES ('admin', '01278006248', 'كلمة مرور المسؤول الرئيسية')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.system_passwords (id, password, description)
VALUES ('master', '01278006248', 'كلمة مرور رئيسية للنظام')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.system_passwords (id, password, description)
VALUES ('payment', '01278006248', 'كلمة مرور الدفعات')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.system_passwords (id, password, description)
VALUES ('admin_delete', '01278006248', 'كلمة مرور الحذف الإدارية')
ON CONFLICT (id) DO NOTHING;