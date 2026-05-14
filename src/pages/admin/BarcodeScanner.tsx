import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScanLine, Play, CheckCircle2, RotateCcw } from 'lucide-react';
import { ScannerInput } from '@/features/scanner/components/ScannerInput';
import { ScannedOrdersTable } from '@/features/scanner/components/ScannedOrdersTable';
import { BulkActionsDialog } from '@/features/scanner/components/BulkActionsDialog';
import { useScanSession } from '@/features/scanner/hooks/useScanSession';
import { useBarcodeScanner } from '@/features/scanner/hooks/useBarcodeScanner';
import { printBarcodeLabels, printInvoicesGrouped } from '@/features/scanner/lib/printing';

const BarcodeScannerPage = () => {
  const { sessionId, orders, startSession, endSession, resetSession, scanCode, removeOrder } = useScanSession();
  const [bulkOpen, setBulkOpen] = useState(false);

  const handleScan = useCallback((code: string) => {
    if (sessionId) scanCode(code);
  }, [sessionId, scanCode]);

  // Capture global keyboard input (handheld scanner) when session is active
  useBarcodeScanner(handleScan, !!sessionId);

  const handleStart = async () => {
    await startSession();
  };

  const handleFinish = async () => {
    await endSession();
    setBulkOpen(true);
  };

  const handleReset = () => {
    resetSession();
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ScanLine className="h-8 w-8 text-primary" />
            قراءة الباركود
          </h1>
          <p className="text-muted-foreground mt-1">امسح الأوردرات باستخدام جهاز Barcode Scanner ثم نفّذ أمرًا جماعيًا.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-base py-1 px-3">
            عدد المسحات: <span className="mx-1 font-bold text-primary">{orders.length}</span>
          </Badge>
          {sessionId && (
            <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-0">جلسة نشطة</Badge>
          )}
        </div>
      </div>

      {!sessionId ? (
        <Card className="p-12 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <ScanLine className="h-20 w-20 mx-auto text-primary mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold mb-2">جاهز لبدء جلسة اسكان جديدة</h2>
          <p className="text-muted-foreground mb-6">سيتم تسجيل كل عملية اسكان داخل سجل خاص بهذه الجلسة.</p>
          <Button size="lg" className="h-14 px-10 text-lg" onClick={handleStart}>
            <Play className="h-5 w-5 ml-2" />
            ابدأ الاسكان
          </Button>
        </Card>
      ) : (
        <>
          <Card className="p-4 md:p-6 space-y-4">
            <ScannerInput onScan={handleScan} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 ml-2" />
                إعادة تعيين
              </Button>
              <Button onClick={handleFinish} disabled={orders.length === 0} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 ml-2" />
                انتهيت ({orders.length})
              </Button>
            </div>
          </Card>

          <ScannedOrdersTable orders={orders} onRemove={removeOrder} />
        </>
      )}

      <BulkActionsDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        orders={orders}
        sessionId={sessionId}
        onClearOrders={resetSession}
        onPrintInvoices={printInvoicesGrouped}
        onPrintBarcodes={printBarcodeLabels}
      />
    </div>
  );
};

export default BarcodeScannerPage;
