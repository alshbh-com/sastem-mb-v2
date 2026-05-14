import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface Props {
  value: string;
  height?: number;
  displayValue?: boolean;
  className?: string;
}

export const BarcodeLabel = ({ value, height = 50, displayValue = true, className }: Props) => {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, value, {
          format: 'CODE128',
          height,
          displayValue,
          fontSize: 12,
          margin: 4,
        });
      } catch (e) {
        console.error('Barcode render error', e);
      }
    }
  }, [value, height, displayValue]);
  return <svg ref={ref} className={className} />;
};
