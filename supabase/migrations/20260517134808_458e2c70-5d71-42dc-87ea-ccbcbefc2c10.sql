ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_printed boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS printed_at timestamp with time zone;