import { useEffect, useRef, useState, type ComponentType } from 'react';
import Button from '../common/Button';
import { Printer } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

interface Props {
  posJaga: { nama: string; qr_token: string };
}

type QRCodeLikeProps = {
  value: string;
  size?: number;
};

/**
 * Menampilkan QR statis pos jaga lengkap dengan nama pos.
 * Tombol cetak tersedia untuk admin mencetak dan menempelnya di pos jaga.
 */
export default function PosJagaQRCode({ posJaga }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const showNotification = useUIStore((s) => s.showNotification);
  const [QRCodeComponent, setQRCodeComponent] = useState<ComponentType<QRCodeLikeProps> | null>(null);

  useEffect(() => {
    let disposed = false;

    const load = async () => {
      const mod = await import('react-qr-code');
      if (!disposed) {
        setQRCodeComponent(() => mod.default as ComponentType<QRCodeLikeProps>);
      }
    };

    void load();

    return () => {
      disposed = true;
    };
  }, []);

  const handlePrint = () => {
    if (!QRCodeComponent) {
      showNotification('QR belum siap, tunggu sebentar lalu coba cetak lagi', 'error');
      return;
    }

    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow || !printRef.current) {
      showNotification('Browser memblokir jendela cetak QR', 'error');
      return;
    }

    // Escape user-supplied name to prevent XSS in the document.write context
    const safeName = posJaga.nama
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const qrContent = printRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>QR Pos Jaga — ${safeName}</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px;
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              font-family: Arial, sans-serif; 
              background: white;
            }
            .wrap { 
              text-align: center; 
              padding: 32px; 
              border: 2px solid #333; 
              border-radius: 12px; 
              page-break-inside: avoid;
            }
            h2 { 
              margin: 0 0 24px; 
              font-size: 1.5rem; 
              color: #333;
            }
            img {
              display: block;
              margin: 0 auto;
            }
            p { 
              margin: 12px 0 0; 
              font-size: 0.85rem; 
              color: #666; 
            }
            @media print {
              body { padding: 0; }
              .wrap { border: none; padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="wrap">
            ${qrContent}
          </div>
          <script>
            window.addEventListener('load', function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 250);
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={printRef} className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-surface bg-white">
        <h2 className="text-xl font-bold text-gray-900 text-center">{posJaga.nama}</h2>
        {QRCodeComponent ? (
          <QRCodeComponent value={posJaga.qr_token} size={200} />
        ) : (
          <div className="h-[200px] w-[200px] animate-pulse rounded-xl border border-surface bg-surface/40" aria-hidden="true" />
        )}
        <p className="text-xs text-gray-500 text-center max-w-[200px]">
          Pindai QR ini menggunakan aplikasi KARYO OS untuk mencatat waktu keluar / kembali
        </p>
      </div>
      <Button
        variant="secondary"
        size="sm"
        leftIcon={<Printer className="w-4 h-4" />}
        onClick={handlePrint}
        disabled={!QRCodeComponent}
      >
        Cetak QR
      </Button>
    </div>
  );
}
