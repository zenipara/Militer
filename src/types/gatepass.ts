export type GatePassStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'out'
  | 'returned'
  | 'overdue';

export interface GatePass {
  id: string;
  user_id: string;
  keperluan: string;
  tujuan: string;
  waktu_keluar: string;
  waktu_kembali: string;
  actual_keluar?: string;
  actual_kembali?: string;
  status: GatePassStatus;
  approved_by?: string;
  qr_token: string;
  created_at: string;
}
