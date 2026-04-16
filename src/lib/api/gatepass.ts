import { supabase } from '../supabase';
import type { GatePass } from '../../types';

export async function fetchGatePassesByUser(callerId: string, callerRole: string, userId: string): Promise<GatePass[]> {
  const { data, error } = await supabase.rpc('api_get_gate_passes', {
    p_user_id: callerId,
    p_role: callerRole,
    p_target_user_id: userId,
    p_status_filter: null,
  });
  if (error) throw error;
  return (data as GatePass[]) ?? [];
}

export async function fetchGatePassesByUserAndStatus(callerId: string, callerRole: string, userId: string, status: GatePass['status']): Promise<GatePass[]> {
  const { data, error } = await supabase.rpc('api_get_gate_passes', {
    p_user_id: callerId,
    p_role: callerRole,
    p_target_user_id: userId,
    p_status_filter: status,
  });
  if (error) throw error;
  return (data as GatePass[]) ?? [];
}

export async function fetchAllGatePasses(callerId: string, callerRole: string): Promise<GatePass[]> {
  const { data, error } = await supabase.rpc('api_get_gate_passes', {
    p_user_id: callerId,
    p_role: callerRole,
    p_target_user_id: null,
    p_status_filter: null,
  });
  if (error) throw error;
  return (data as GatePass[]) ?? [];
}

export async function fetchGatePassByQrToken(callerId: string, callerRole: string, qrToken: string): Promise<GatePass | null> {
  await supabase.rpc('set_session_context', {
    p_user_id: callerId,
    p_role: callerRole,
  });
  const { data, error } = await supabase
    .from('gate_pass')
    .select('*, user:user_id(id,nama,nrp,pangkat,satuan)')
    .eq('qr_token', qrToken)
    .single();
  if (error) return null;
  return (data as GatePass) ?? null;
}

export async function insertGatePass(_callerId: string, callerRole: string, payload: Partial<GatePass> & { user_id: string; qr_token: string }): Promise<void> {
  const { error } = await supabase.rpc('api_insert_gate_pass', {
    p_user_id: payload.user_id,
    p_caller_role: callerRole,
    p_keperluan: payload.keperluan ?? '',
    p_tujuan: payload.tujuan ?? '',
    p_waktu_keluar: payload.waktu_keluar ?? '',
    p_waktu_kembali: payload.waktu_kembali ?? '',
    p_qr_token: payload.qr_token,
  });
  if (error) throw error;
}

export async function patchGatePassStatus(
  callerId: string,
  callerRole: string,
  id: string,
  status: GatePass['status'],
  approvedBy?: string,
): Promise<void> {
  const { error } = await supabase.rpc('api_update_gate_pass_status', {
    p_caller_id: callerId,
    p_caller_role: callerRole,
    p_id: id,
    p_status: status,
    p_approved_by: approvedBy ?? null,
  });
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
