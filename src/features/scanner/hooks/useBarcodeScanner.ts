import { useEffect, useRef } from 'react';

/**
 * Listens to barcode scanner input (acts like a keyboard).
 * Captures rapid keystrokes ending with Enter.
 */
export const useBarcodeScanner = (onScan: (code: string) => void, enabled: boolean) => {
  const buffer = useRef('');
  const lastTime = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // ignore if user is typing in another input
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if ((target as HTMLInputElement).dataset.scanner !== 'true') return;
      }
      const now = Date.now();
      if (now - lastTime.current > 500) buffer.current = '';
      lastTime.current = now;

      if (e.key === 'Enter') {
        if (buffer.current.length > 0) {
          onScan(buffer.current);
          buffer.current = '';
        }
        e.preventDefault();
      } else if (e.key.length === 1) {
        buffer.current += e.key;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onScan]);
};
