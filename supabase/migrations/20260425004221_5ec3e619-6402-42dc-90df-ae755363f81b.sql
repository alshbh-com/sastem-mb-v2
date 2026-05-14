-- دالة تعيد كميات الأوردر للمخزون عند المرتجع
CREATE OR REPLACE FUNCTION public.handle_returned_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item RECORD;
BEGIN
  -- عند التحول إلى مرتجع: إعادة الكميات للمخزون
  IF NEW.status = 'returned' AND (OLD.status IS DISTINCT FROM 'returned') THEN
    FOR item IN
      SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id AND product_id IS NOT NULL
    LOOP
      UPDATE public.products
      SET stock_quantity = COALESCE(stock_quantity, 0) + item.quantity
      WHERE id = item.product_id;
    END LOOP;
  END IF;

  -- عند التراجع عن المرتجع: خصم الكميات مرة أخرى لمنع الازدواج
  IF OLD.status = 'returned' AND NEW.status IS DISTINCT FROM 'returned' THEN
    FOR item IN
      SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id AND product_id IS NOT NULL
    LOOP
      UPDATE public.products
      SET stock_quantity = GREATEST(COALESCE(stock_quantity, 0) - item.quantity, 0)
      WHERE id = item.product_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_returned_stock ON public.orders;
CREATE TRIGGER trg_handle_returned_stock
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_returned_stock();