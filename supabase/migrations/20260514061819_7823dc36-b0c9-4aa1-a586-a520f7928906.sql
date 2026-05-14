
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS manual_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_by_username text;

ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'return_no_shipping';

CREATE OR REPLACE FUNCTION public.delete_old_activity_logs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.activity_logs WHERE created_at < (now() - INTERVAL '30 days');
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_orders_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_touch_orders_updated_at ON public.orders;
CREATE TRIGGER trg_touch_orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.touch_orders_updated_at();
