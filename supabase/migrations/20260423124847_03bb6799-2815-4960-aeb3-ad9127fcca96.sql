-- إعادة ترقيم الأوردرات لتبدأ من 1
UPDATE public.orders SET order_number = 1 WHERE order_number = 1000;

-- إعادة ضبط الـ sequence لتعطي 2 في الأوردر التالي
SELECT setval('public.order_number_seq', 1, true);

-- تحديث الـ function لتبدأ من 1 بدلاً من 1000
CREATE OR REPLACE FUNCTION public.reset_order_sequence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM setval('public.order_number_seq', 1, false);
END;
$function$;