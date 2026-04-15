import { useRef } from 'react';
import QRCode from 'react-qr-code';
import Button from '../common/Button';
import { Printer } from 'lucide-react';

interface Props {
  posJaga: { nama: string; qr_token: string };
}

/**
 * Menampilkan QR statis pos jaga lengkap dengan nama pos.
 * Tombol cetak tersedia untuk admin mencetak dan menempelnya di pos jaga.
 */
export default function PosJagaQRCode({ posJaga }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win || !printRef.current) return;
    win.document.write(`
      <html>
        <head>
          <title>QR Pos Jaga — ${posJaga.nama}</title>
          <style>
            body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; }
            .wrap { text-align: center; padding: 32px; border: 2px solid #ccc; border-radius: 12px; }
            h2 { margin: 0 0 16px; font-size: 1.5rem; }
            p { margin: 12px 0 0; font-size: 0.85rem; color: #555; }
          </style>
        </head>
        <body>
          <div class="wrap">
            ${printRef.current.innerHTML}
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={printRef} className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-surface bg-white">
        <h2 className="text-xl font-bold text-gray-900 text-center">{posJaga.nama}</h2>
        <QRCode value={posJaga.qr_token} size={200} />
        <p className="text-xs text-gray-500 text-center max-w-[200px]">
          Pindai QR ini menggunakan aplikasi KARYO OS untuk mencatat waktu keluar / kembali
        </p>
      </div>
      <Button variant="secondary" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
        Cetak QR
      </Button>
    </div>
  );
}
