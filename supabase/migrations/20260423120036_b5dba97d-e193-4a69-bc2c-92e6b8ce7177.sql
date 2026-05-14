
-- Products: add size_options and color_options
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS size_options TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS color_options TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Categories: add description and is_active
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Offices: add is_active
ALTER TABLE public.offices
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Cashbox: add created_by
ALTER TABLE public.cashbox
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- Cashbox transactions: add reason, user_id, username
ALTER TABLE public.cashbox_transactions
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS username TEXT;

-- Statistics: add total_sales and last_reset
ALTER TABLE public.statistics
  ADD COLUMN IF NOT EXISTS total_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reset TIMESTAMPTZ;

-- Seed initial statistics row if empty
INSERT INTO public.statistics (total_sales, total_orders, total_revenue, total_customers, total_agents)
SELECT 0, 0, 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM public.statistics);
