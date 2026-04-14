import React from 'react';
import QRCode from 'qrcode.react';

interface Props {
  qrToken: string;
}

const GatePassQRCode: React.FC<Props> = ({ qrToken }) => (
  <div className="flex flex-col items-center">
    <QRCode value={qrToken} size={128} />
    <div className="text-xs mt-2">Tunjukkan QR ini ke pos jaga</div>
  </div>
);
export default GatePassQRCode;
