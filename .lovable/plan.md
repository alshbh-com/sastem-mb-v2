## نظام قراءة الباركود + Barcode/QR للأوردرات

سأبني نظامًا متكاملًا لقراءة الباركود مع Bulk Actions و Realtime، بالإضافة إلى توليد Barcode/QR لكل أوردر.

### 1) تغييرات قاعدة البيانات (Migration)

إضافات على `orders`:
- `tracking_code` text unique — يُولَّد تلقائيًا (TRK-xxxxxx)
- `barcode_value` text — نفس tracking_code افتراضيًا
- `qr_value` text — payload JSON صغير (id + order_number + tracking)
- Trigger BEFORE INSERT لتوليدهم تلقائيًا إن لم يُمرَّروا

جداول جديدة:
- `scan_sessions`: started_by, started_by_username, started_at, ended_at, total_scanned, status (active/closed)
- `scan_session_items`: session_id, order_id, scanned_at, scanned_code
- `scan_logs`: session_id, order_id, action, old_status, new_status, user_id, username, payload jsonb, created_at
- `order_status_history`: order_id, old_status, new_status, changed_by, changed_by_username, reason, created_at

كل الجداول: RLS مفتوح مثل باقي الجداول (anon+auth ALL=true)، مع indexes على `tracking_code`, `session_id`, `order_id`.

Backfill: تعبئة tracking_code للأوردرات الموجودة.

### 2) المكتبات
`jsbarcode`, `qrcode`, `react-qr-code`, `html2canvas`, `jspdf`, `xlsx` (موجود غالبًا — سأتحقق)

### 3) الكود — Frontend

```text
src/
├─ pages/BarcodeScannerPage.tsx          # الصفحة الرئيسية للقسم
├─ features/scanner/
│  ├─ components/
│  │  ├─ ScannerInput.tsx                # input مخفي مركّز دائمًا، autofocus + onKeyDown Enter
│  │  ├─ ScannedOrdersTable.tsx          # جدول live مع counter
│  │  ├─ BulkActionsDialog.tsx           # نافذة الأوامر الجماعية
│  │  ├─ StatusChangeDialog.tsx
│  │  ├─ AssignAgentDialog.tsx
│  │  ├─ BulkPrintInvoices.tsx
│  │  ├─ BarcodeLabel.tsx                # ملصق باركود قابل للطباعة
│  │  └─ QrLabel.tsx
│  ├─ hooks/
│  │  ├─ useScanSession.ts               # إنشاء/إغلاق session + إضافة عناصر
│  │  ├─ useBarcodeScanner.ts            # التقاط مدخلات المسدس + debounce
│  │  ├─ useScannedOrders.ts             # تخزين قائمة + منع تكرار
│  │  ├─ useRealtimeOrders.ts            # اشتراك Supabase Realtime على orders
│  │  └─ useBeep.ts                      # صوت نجاح/خطأ (WebAudio)
│  ├─ lib/
│  │  ├─ barcode.ts                      # generateTrackingCode + render JsBarcode
│  │  ├─ exportPdf.ts
│  │  ├─ exportExcel.ts
│  │  └─ statusWorkflow.ts               # خرائط الحالات + الـ side effects
│  └─ types.ts
└─ App.tsx                               # route /barcode-scanner
```

### 4) منطق الـ Scan
1. ضغط "ابدأ الاسكان" → INSERT في `scan_sessions` (status=active) + تركيز Input.
2. المسدس يكتب الكود + Enter → يبحث في `orders` عن `tracking_code` أو `order_number` أو `manual_code`.
3. التحقق: غير ملغي/مسلم سابقًا، غير مكرر داخل الـ session → INSERT في `scan_session_items` + بيب نجاح.
4. خطأ → بيب مختلف + Toast.
5. زر "انتهيت" → يفتح BulkActionsDialog + يُغلق الـ session عند الخروج.

### 5) Bulk Actions
- تغيير الحالة (8 حالات) → UPDATE orders + INSERT order_status_history + scan_logs. حالة "تم التسليم" تستخدم منطق النظام الحالي (DB triggers الموجودة للـ financials — مذكورة في memory) لتجنب الـ double deduction.
- تعيين/إزالة مندوب → يحترم memory: revert إلى pending يمسح agent.
- طباعة فواتير جماعية → نافذة طباعة A4 4-up (متوافقة مع memory الفاتورة الحالية).
- تصدير PDF (jsPDF) + Excel (xlsx).
- حذف من القائمة (محلي فقط).

### 6) Realtime
`supabase.channel('orders-realtime').on('postgres_changes', {event:'*', table:'orders'})` لتحديث الجدول فورًا، ومثله لـ `scan_session_items` للجلسات المتعددة.

### 7) Barcode/QR في الفاتورة
- إضافة `<BarcodeLabel value={order.tracking_code}/>` و `<QrLabel/>` داخل قالب الفاتورة الحالي.
- صفحة طباعة ملصقات Barcode جماعية مستقلة.

### 8) UI
- صفحة RTL، dark mode aware (يستخدم design tokens من index.css).
- زر CTA كبير + Counter متحرك (framer-motion خفيف) + Toast (sonner الموجود).
- جدول live مع أعمدة: #، رقم الأوردر، العميل، المندوب، الحالة (Badge ملون)، المبلغ، المدينة، إجراء (حذف).

### 9) الأمان والصلاحيات
- التحقق من admin_user permission `scanner.access` (سأضيفها كصلاحية اختيارية، الـ owner لديه الكل).

### نقطة مهمة قبل البدء
- بعض الجداول التي تطلبها (`courier_daily_reports`) موجودة بمنطق مماثل بالفعل كـ `agent_daily_closings`. سأستخدم الموجود بدلًا من تكرار، وأكتفي بإضافة `order_status_history` و `scan_*`.
- لو أردتني فعليًا إنشاء `courier_daily_reports` كجدول مستقل قل لي وسأضيفه.

بعد موافقتك سأنفذ على دفعتين: (1) Migration، ثم (2) الكود الكامل.