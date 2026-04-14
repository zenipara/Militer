import React from 'react';

interface ScanResultData {
  user?: {
    nama?: string;
    nrp?: string;
  };
  status?: 'pending' | 'approved' | 'rejected' | 'out' | 'returned' | 'overdue';
  actual_keluar?: string | null;
  actual_kembali?: string | null;
}

export default function ScanResultCard({ data }: { data: ScanResultData }) {
  return (
    <div className="p-4 rounded-xl border bg-white text-black text-center space-y-2">
      <div className="text-2xl font-bold">{data.user?.nama}</div>
      <div className="text-lg">{data.user?.nrp}</div>
      <div className="text-xl font-semibold">
        {data.status === 'out'
          ? 'Sedang di luar'
          : data.status === 'returned'
          ? 'Sudah kembali'
          : 'Belum keluar'}
      </div>
      <div className="flex gap-2 justify-center mt-2">
        {data.status === 'out' && !data.actual_kembali && (
          <span className="btn btn-primary">Izinkan Masuk</span>
        )}
        {data.status === 'approved' && !data.actual_keluar && (
          <span className="btn btn-success">Izinkan Keluar</span>
        )}
      </div>
    </div>
  );
}
