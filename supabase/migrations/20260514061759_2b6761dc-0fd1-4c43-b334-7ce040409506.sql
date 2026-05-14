
-- Drop incompatible existing tables
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.app_users CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- Enums
CREATE TYPE public.order_status AS ENUM ('pending','processing','shipped','delivered','returned','cancelled','delivered_with_modification','agent_deleted');
CREATE TYPE public.user_role AS ENUM ('owner','admin','moderator');

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  details text,
  price numeric NOT NULL DEFAULT 0,
  offer_price numeric,
  is_offer boolean NOT NULL DEFAULT false,
  stock int NOT NULL DEFAULT 0,
  image_url text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  size_options text[],
  color_options text[],
  quantity_pricing jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Product images (extra)
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Product color variants
CREATE TABLE public.product_color_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  color_name text,
  hex_code text,
  image_url text,
  stock int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Governorates
CREATE TABLE public.governorates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  shipping_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Offices
CREATE TABLE public.offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  watermark_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Customers
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  phone2 text,
  address text,
  governorate text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Delivery agents
CREATE TABLE public.delivery_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  serial_number text,
  total_owed numeric NOT NULL DEFAULT 0,
  total_paid numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number serial,
  created_by uuid,
  is_locked boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Orders
CREATE SEQUENCE IF NOT EXISTS public.orders_order_number_seq;
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number int NOT NULL DEFAULT nextval('public.orders_order_number_seq'),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  delivery_agent_id uuid REFERENCES public.delivery_agents(id) ON DELETE SET NULL,
  governorate_id uuid REFERENCES public.governorates(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  shipping_cost numeric NOT NULL DEFAULT 0,
  agent_shipping_cost numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  modified_amount numeric,
  status public.order_status NOT NULL DEFAULT 'pending',
  order_details text,
  notes text,
  assigned_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Order items
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity int NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  size text,
  color text,
  product_details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Returns
CREATE TABLE public.returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  delivery_agent_id uuid REFERENCES public.delivery_agents(id) ON DELETE SET NULL,
  return_amount numeric NOT NULL DEFAULT 0,
  returned_items jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Agent payments
CREATE TABLE public.agent_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_agent_id uuid REFERENCES public.delivery_agents(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_type text NOT NULL DEFAULT 'payment',
  payment_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Agent daily closings
CREATE TABLE public.agent_daily_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_agent_id uuid REFERENCES public.delivery_agents(id) ON DELETE CASCADE,
  closing_date date NOT NULL,
  net_amount numeric NOT NULL DEFAULT 0,
  closed_by uuid,
  closed_by_username text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Cashbox
CREATE TABLE public.cashbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  opening_balance numeric NOT NULL DEFAULT 0,
  password text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cashbox_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cashbox_id uuid REFERENCES public.cashbox(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  reason text,
  description text,
  user_id uuid,
  username text,
  payment_method text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Treasury
CREATE TABLE public.treasury (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  category text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Statistics
CREATE TABLE public.statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_sales numeric NOT NULL DEFAULT 0,
  total_orders int NOT NULL DEFAULT 0,
  last_reset timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- App settings
CREATE TABLE public.app_settings (
  id text PRIMARY KEY,
  active_theme text DEFAULT 'default',
  active_template text DEFAULT 'default',
  platform_name text DEFAULT 'BM',
  invoice_name text DEFAULT 'BM',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- System passwords
CREATE TABLE public.system_passwords (
  id text PRIMARY KEY,
  password text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Admin users
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.admin_user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.admin_users(id) ON DELETE CASCADE,
  permission text NOT NULL,
  permission_type text NOT NULL DEFAULT 'view',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Activity logs
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  username text,
  action text NOT NULL,
  section text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Analytics events
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reset order sequence RPC
CREATE OR REPLACE FUNCTION public.reset_order_sequence()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM setval('public.orders_order_number_seq', 1, false);
END;
$$;

-- Enable RLS on all tables and add anon-permissive policies (app handles auth)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'categories','products','product_images','product_color_variants',
    'governorates','offices','customers','delivery_agents','invoices',
    'orders','order_items','returns','agent_payments','agent_daily_closings',
    'cashbox','cashbox_transactions','treasury','statistics','app_settings',
    'system_passwords','admin_users','admin_user_permissions','activity_logs',
    'analytics_events'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY anon_all_%I ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY auth_all_%I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- Seed app_settings
INSERT INTO public.app_settings (id, active_theme, active_template, platform_name, invoice_name)
VALUES ('main','default','default','BM','BM');

-- Seed system passwords (all = master password)
INSERT INTO public.system_passwords (id, password) VALUES
  ('admin','01278006248'),
  ('master','01278006248'),
  ('admin_delete','01278006248'),
  ('payment','01278006248'),
  ('cashbox','01278006248'),
  ('reset_data','01278006248'),
  ('treasury_password','01278006248');

-- Seed owner user "maka"
WITH new_user AS (
  INSERT INTO public.admin_users (username, password, role, is_active)
  VALUES ('maka','01278006248','owner', true)
  RETURNING id
)
INSERT INTO public.admin_user_permissions (user_id, permission, permission_type)
SELECT new_user.id, p, 'edit'
FROM new_user, unnest(ARRAY[
  'orders','products','categories','customers','agents','agent_orders',
  'agent_payments','governorates','statistics','invoices','all_orders',
  'settings','reset_data','user_management','cashbox','treasury'
]) p;

-- Seed initial statistics row
INSERT INTO public.statistics (total_sales, total_orders) VALUES (0,0);
