-- إضافة كلمات مرور جديدة لقفل الخزنة وقفل مسح البيانات في system_passwords
INSERT INTO public.system_passwords (id, password, description)
VALUES 
  ('cashbox', '01278006248', 'كلمة مرور قفل الخزنة'),
  ('reset_data', '01278006248m', 'كلمة مرور مسح كل البيانات')
ON CONFLICT (id) DO NOTHING;