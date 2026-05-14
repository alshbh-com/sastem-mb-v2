
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS account_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS manual_order_date date;
