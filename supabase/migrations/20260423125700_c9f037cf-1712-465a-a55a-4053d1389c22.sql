ALTER TABLE public.cashbox_transactions DROP CONSTRAINT IF EXISTS cashbox_transactions_type_check;
ALTER TABLE public.cashbox_transactions ADD CONSTRAINT cashbox_transactions_type_check 
  CHECK (type = ANY (ARRAY['deposit'::text, 'withdrawal'::text, 'income'::text, 'expense'::text]));