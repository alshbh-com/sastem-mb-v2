
-- ============================================
-- MAKA System: Complete Database Schema
-- ============================================

-- Helper: updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- 1. APP SETTINGS (single row)
-- ============================================
CREATE TABLE public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  active_theme TEXT NOT NULL DEFAULT 'blue-default',
  active_template TEXT NOT NULL DEFAULT 'classic',
  platform_name TEXT NOT NULL DEFAULT 'maka',
  invoice_name TEXT NOT NULL DEFAULT 'maka',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read app_settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Public write app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_app_settings_updated BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings (id, platform_name, invoice_name) VALUES ('main', 'maka', 'maka')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. SYSTEM PASSWORDS
-- ============================================
CREATE TABLE public.system_passwords (
  id TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_passwords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read system_passwords" ON public.system_passwords FOR SELECT USING (true);
CREATE POLICY "Public write system_passwords" ON public.system_passwords FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.system_passwords (id, password, description) VALUES
  ('master', '01278006248', 'كلمة المرور الرئيسية'),
  ('payment', '01278006248', 'كلمة مرور المدفوعات'),
  ('admin_delete', '01278006248', 'كلمة مرور الحذف الإداري')
ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password;

-- ============================================
-- 3. ADMIN USERS + PERMISSIONS
-- ============================================
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_owner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read admin_users" ON public.admin_users FOR SELECT USING (true);
CREATE POLICY "Public write admin_users" ON public.admin_users FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_admin_users_updated BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.admin_user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  permission_type TEXT NOT NULL DEFAULT 'view' CHECK (permission_type IN ('view','edit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission)
);
ALTER TABLE public.admin_user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read perms" ON public.admin_user_permissions FOR SELECT USING (true);
CREATE POLICY "Public write perms" ON public.admin_user_permissions FOR ALL USING (true) WITH CHECK (true);

-- Seed owner user with all permissions
DO $$
DECLARE owner_id UUID;
BEGIN
  INSERT INTO public.admin_users (username, password, is_active, is_owner)
  VALUES ('maka', '01278006248', true, true)
  ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, is_owner = true, is_active = true
  RETURNING id INTO owner_id;

  IF owner_id IS NULL THEN
    SELECT id INTO owner_id FROM public.admin_users WHERE username = 'maka';
  END IF;

  -- Grant all known permissions as 'edit'
  INSERT INTO public.admin_user_permissions (user_id, permission, permission_type)
  SELECT owner_id, p, 'edit' FROM unnest(ARRAY[
    'dashboard','orders','all_orders','agent_orders','products','categories',
    'customers','agents','governorates','offices','cashbox','treasury',
    'invoices','statistics','activity_logs','user_management','appearance',
    'reset_data','settings'
  ]) AS p
  ON CONFLICT (user_id, permission) DO UPDATE SET permission_type = 'edit';
END $$;

-- ============================================
-- 4. CATEGORIES
-- ============================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 5. PRODUCTS + IMAGES + COLOR VARIANTS
-- ============================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  offer_price NUMERIC(10,2),
  is_offer BOOLEAN NOT NULL DEFAULT false,
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sizes TEXT[] DEFAULT ARRAY[]::TEXT[],
  colors TEXT[] DEFAULT ARRAY[]::TEXT[],
  quantity_pricing JSONB DEFAULT '[]'::JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_products_category ON public.products(category_id);

CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all product_images" ON public.product_images FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_product_images_product ON public.product_images(product_id);

CREATE TABLE public.product_color_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_color_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all product_color_variants" ON public.product_color_variants FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 6. GOVERNORATES
-- ============================================
CREATE TABLE public.governorates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all governorates" ON public.governorates FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 7. OFFICES
-- ============================================
CREATE TABLE public.offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  watermark_name TEXT,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all offices" ON public.offices FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 8. CUSTOMERS
-- ============================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  phone2 TEXT,
  address TEXT,
  governorate TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_customers_phone ON public.customers(phone);

-- ============================================
-- 9. DELIVERY AGENTS
-- ============================================
CREATE TABLE public.delivery_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  serial_number TEXT,
  total_owed NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all delivery_agents" ON public.delivery_agents FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_delivery_agents_updated BEFORE UPDATE ON public.delivery_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 10. ORDERS + ORDER ITEMS
-- ============================================
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1000;

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number BIGINT NOT NULL DEFAULT nextval('public.order_number_seq'),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  delivery_agent_id UUID REFERENCES public.delivery_agents(id) ON DELETE SET NULL,
  governorate_id UUID REFERENCES public.governorates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  agent_shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_shipping_included BOOLEAN NOT NULL DEFAULT false,
  order_details TEXT,
  notes TEXT,
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_agent ON public.orders(delivery_agent_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_assigned_at ON public.orders(assigned_at);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  size TEXT,
  color TEXT,
  product_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_product ON public.order_items(product_id);

-- ============================================
-- 11. RETURNS
-- ============================================
CREATE TABLE public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  delivery_agent_id UUID REFERENCES public.delivery_agents(id) ON DELETE SET NULL,
  return_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  returned_items JSONB DEFAULT '[]'::JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all returns" ON public.returns FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_returns_order ON public.returns(order_id);
CREATE INDEX idx_returns_agent ON public.returns(delivery_agent_id);

-- ============================================
-- 12. AGENT PAYMENTS
-- ============================================
CREATE TABLE public.agent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_agent_id UUID REFERENCES public.delivery_agents(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT 'cash',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all agent_payments" ON public.agent_payments FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_agent_payments_agent ON public.agent_payments(delivery_agent_id);
CREATE INDEX idx_agent_payments_order ON public.agent_payments(order_id);
CREATE INDEX idx_agent_payments_date ON public.agent_payments(payment_date);

-- ============================================
-- 13. AGENT DAILY CLOSINGS
-- ============================================
CREATE TABLE public.agent_daily_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_agent_id UUID REFERENCES public.delivery_agents(id) ON DELETE SET NULL,
  closing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_daily_closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all agent_daily_closings" ON public.agent_daily_closings FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 14. CASHBOX + TRANSACTIONS
-- ============================================
CREATE TABLE public.cashbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cashbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all cashbox" ON public.cashbox FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.cashbox_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashbox_id UUID REFERENCES public.cashbox(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit','withdrawal')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cashbox_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all cashbox_transactions" ON public.cashbox_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_cashbox_tx_cashbox ON public.cashbox_transactions(cashbox_id);

-- ============================================
-- 15. TREASURY
-- ============================================
CREATE TABLE public.treasury (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('deposit','withdrawal')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.treasury ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all treasury" ON public.treasury FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 16. STATISTICS
-- ============================================
CREATE TABLE public.statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_customers INTEGER NOT NULL DEFAULT 0,
  total_agents INTEGER NOT NULL DEFAULT 0,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.statistics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all statistics" ON public.statistics FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_statistics_updated BEFORE UPDATE ON public.statistics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 17. ANALYTICS EVENTS
-- ============================================
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all analytics_events" ON public.analytics_events FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 18. ACTIVITY LOGS
-- ============================================
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  username TEXT,
  action TEXT NOT NULL,
  section TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- ============================================
-- RPC: cleanup old activity logs
-- ============================================
CREATE OR REPLACE FUNCTION public.delete_old_activity_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.activity_logs WHERE created_at < now() - interval '90 days';
END;
$$;

-- ============================================
-- RPC: reset order sequence
-- ============================================
CREATE OR REPLACE FUNCTION public.reset_order_sequence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM setval('public.order_number_seq', 1000, false);
END;
$$;

-- ============================================
-- STORAGE: products bucket (public)
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read products bucket" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Public upload products bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products');
CREATE POLICY "Public update products bucket" ON storage.objects FOR UPDATE USING (bucket_id = 'products');
CREATE POLICY "Public delete products bucket" ON storage.objects FOR DELETE USING (bucket_id = 'products');
