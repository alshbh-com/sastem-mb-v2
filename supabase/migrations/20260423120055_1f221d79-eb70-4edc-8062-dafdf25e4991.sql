
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS modified_amount NUMERIC(12,2);

ALTER TABLE public.agent_daily_closings
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closed_by UUID,
  ADD COLUMN IF NOT EXISTS closed_by_username TEXT;

ALTER TABLE public.treasury
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID;
