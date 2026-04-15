import { supabase } from '../supabase';
import type { GatePass } from '../../types';

export async function fetchGatePassesByUser(userId: string): Promise<GatePass[]> {
  const { data, error } = await supabase
    .from('gate_pass')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as GatePass[]) ?? [];
}

export async function fetchGatePassesByUserAndStatus(userId: string, status: GatePass['status']): Promise<GatePass[]> {
  const { data, error } = await supabase
    .from('gate_pass')
    .select('*')
    .eq('user_id', userId)
    .eq('status', status)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as GatePass[]) ?? [];
}

export async function fetchAllGatePasses(): Promise<GatePass[]> {
  const { data, error } = await supabase
    .from('gate_pass')
    .select('*, user:user_id(id,nama,nrp,pangkat,satuan)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as GatePass[]) ?? [];
}

export async function insertGatePass(payload: Partial<GatePass> & { user_id: string; qr_token: string }): Promise<void> {
  const { error } = await supabase.from('gate_pass').insert([payload]);
  if (error) throw error;
}

export async function patchGatePassStatus(
  id: string,
  status: GatePass['status'],
  approvedBy?: string,
): Promise<void> {
  const { error } = await supabase
    .from('gate_pass')
    .update({ status, approved_by: approvedBy })
    .eq('id', id);
  if (error) throw error;
}

/** Response shape returned by the `server_scan_gate_pass` Supabase RPC. */
interface ScanGatePassResponse {
  message?: string;
}

export async function rpcScanGatePass(qrToken: string): Promise<string> {
  const { data, error } = await supabase.rpc('server_scan_gate_pass', { p_qr_token: qrToken });
  if (error || !data) throw new Error(error?.message ?? 'QR tidak valid');
  return (data as ScanGatePassResponse).message ?? 'Scan berhasil';
}
