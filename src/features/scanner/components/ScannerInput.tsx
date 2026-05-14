import { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { ScanLine } from 'lucide-react';

interface Props {
  onScan: (code: string) => void;
  disabled?: boolean;
}

export const ScannerInput = ({ onScan, disabled }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  // Keep focus
  useEffect(() => {
    if (disabled) return;
    const interval = setInterval(() => {
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        inputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [disabled]);

  return (
    <div className="relative">
      <ScanLine className="absolute right-4 top-1/2 -translate-y-1/2 text-primary animate-pulse" />
      <Input
        ref={inputRef}
        data-scanner="true"
        disabled={disabled}
        placeholder="وجّه المسدس وابدأ الاسكان..."
        className="h-16 text-2xl text-center font-mono pr-14 border-2 border-primary/40 focus:border-primary"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const v = (e.target as HTMLInputElement).value;
            if (v.trim()) {
              onScan(v.trim());
              (e.target as HTMLInputElement).value = '';
            }
            e.preventDefault();
          }
        }}
      />
    </div>
  );
};
