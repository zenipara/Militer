import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function QRScanner({ onScan }: { onScan: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const containerWidth = ref.current.offsetWidth || window.innerWidth;
    const qrBoxSize = Math.min(Math.floor(containerWidth * 0.7), 250);
    const scanner = new Html5QrcodeScanner(ref.current.id, { fps: 10, qrbox: qrBoxSize }, false);
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
