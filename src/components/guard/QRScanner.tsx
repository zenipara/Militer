import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function QRScanner({ onScan }: { onScan: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const scanner = new Html5QrcodeScanner(ref.current.id, { fps: 10, qrbox: 250 }, false);
    scanner.render(
      (decodedText: string) => {
        onScan(decodedText);
        scanner.clear();
      },
      () => {}
    );
    return () => { scanner.clear().catch(() => {}); };
  }, [onScan]);
  return <div id="qr-guard-scanner" ref={ref} className="w-full h-64" />;
}
