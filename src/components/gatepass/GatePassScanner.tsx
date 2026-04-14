import React, { useEffect, useRef } from 'react';
// @ts-ignore
import { Html5QrcodeScanner } from 'html5-qrcode';

interface Props {
  onScan: (qrToken: string) => void;
}

const GatePassScanner: React.FC<Props> = ({ onScan }) => {
  const scannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scannerRef.current) return;
    const scanner = new Html5QrcodeScanner(
      scannerRef.current.id,
      { fps: 10, qrbox: 250 },
      false
    );
    scanner.render(
      (decodedText: string) => {
        onScan(decodedText);
        scanner.clear();
      },
      (error: any) => {}
    );
    return () => { scanner.clear().catch(() => {}); };
  }, [onScan]);
  return <div id="gatepass-scanner" ref={scannerRef} className="w-full h-64" />;
};
export default GatePassScanner;
