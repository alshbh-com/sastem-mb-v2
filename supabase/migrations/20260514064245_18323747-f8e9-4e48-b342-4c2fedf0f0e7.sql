
-- Add tracking columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_code text,
  ADD COLUMN IF NOT EXISTS barcode_value text,
  ADD COLUMN IF NOT EXISTS qr_value text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_tracking_code_uniq ON public.orders (tracking_code) WHERE tracking_code IS NOT NULL;

-- Generator function
CREATE OR REPLACE FUNCTION public.set_order_tracking_codes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_tracking text;
BEGIN
  IF NEW.tracking_code IS NULL OR NEW.tracking_code = '' THEN
    LOOP
      v_tracking := 'TRK-' || LPAD(floor(random()*1000000)::text, 6, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE tracking_code = v_tracking);
    END LOOP;
    NEW.tracking_code := v_tracking;
  END IF;
  IF NEW.barcode_value IS NULL OR NEW.barcode_value = '' THEN
    NEW.barcode_value := NEW.tracking_code;
  END IF;
  IF NEW.qr_value IS NULL OR NEW.qr_value = '' THEN
    NEW.qr_value := json_build_object('id', NEW.id, 'order_number', NEW.order_number, 'tracking', NEW.tracking_code)::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_set_tracking ON public.orders;
CREATE TRIGGER trg_orders_set_tracking
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_tracking_codes();

-- Backfill existing
UPDATE public.orders
SET tracking_code = 'TRK-' || LPAD((order_number)::text, 6, '0')
WHERE tracking_code IS NULL;

UPDATE public.orders SET barcode_value = tracking_code WHERE barcode_value IS NULL;
UPDATE public.orders
SET qr_value = json_build_object('id', id, 'order_number', order_number, 'tracking', tracking_code)::text
WHERE qr_value IS NULL;

-- scan_sessions
CREATE TABLE IF NOT EXISTS public.scan_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_by uuid,
  started_by_username text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  total_scanned integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  notes text
);
ALTER TABLE public.scan_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_all_scan_sessions ON public.scan_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY auth_all_scan_sessions ON public.scan_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- scan_session_items
CREATE TABLE IF NOT EXISTS public.scan_session_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.scan_sessions(id) ON DELETE CASCADE,
  order_id uuid,
  scanned_code text,
  scanned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scan_session_items_session ON public.scan_session_items(session_id);
CREATE INDEX IF NOT EXISTS scan_session_items_order ON public.scan_session_items(order_id);
ALTER TABLE public.scan_session_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_all_scan_session_items ON public.scan_session_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY auth_all_scan_session_items ON public.scan_session_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- scan_logs
CREATE TABLE IF NOT EXISTS public.scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  order_id uuid,
  action text NOT NULL,
  old_status text,
  new_status text,
  user_id uuid,
  username text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scan_logs_order ON public.scan_logs(order_id);
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_all_scan_logs ON public.scan_logs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY auth_all_scan_logs ON public.scan_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- order_status_history
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  old_status text,
  new_status text,
  changed_by uuid,
  changed_by_username text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_status_history_order ON public.order_status_history(order_id);
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_all_order_status_history ON public.order_status_history FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY auth_all_order_status_history ON public.order_status_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime on key tables
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.scan_session_items REPLICA IDENTITY FULL;
ALTER TABLE public.scan_sessions REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.scan_session_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.scan_sessions; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
