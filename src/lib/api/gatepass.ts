import { supabase } from '../supabase';
import type { GatePass } from '../../types';
import { ensureSessionContext } from './sessionContext';

export async function fetchGatePassesByUser(callerId: string, callerRole: string, userId: string): Promise<GatePass[]> {
  await ensureSessionContext(callerId, callerRole);
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
  await ensureSessionContext(callerId, callerRole);
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
  await ensureSessionContext(callerId, callerRole);
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
  await ensureSessionContext(callerId, callerRole);
  const { data, error } = await supabase
    .from('gate_pass')
    .select('*, user:user_id(id,nama,nrp,pangkat,satuan)')
    .eq('qr_token', qrToken)
    .single();
  if (error) return null;
  return (data as GatePass) ?? null;
}

export interface InsertGatePassResponse {
  gate_pass_id: string;
  auto_approved: boolean;
  status: 'approved' | 'pending';
  approval_reason: string;
}

export async function insertGatePass(
  callerId: string,
  callerRole: string,
  payload: Partial<GatePass> & { user_id: string; qr_token: string }
): Promise<InsertGatePassResponse> {
  await ensureSessionContext(callerId, callerRole);
  const { data, error } = await supabase.rpc('api_insert_gate_pass', {
    p_user_id: payload.user_id,
    p_caller_role: callerRole,
    p_keperluan: payload.keperluan ?? '',
    p_tujuan: payload.tujuan ?? '',
    p_qr_token: payload.qr_token,
    p_submit_latitude: payload.submit_latitude ?? null,
    p_submit_longitude: payload.submit_longitude ?? null,
    p_submit_accuracy: payload.submit_accuracy ?? null,
  });
  if (error) throw error;
  return (data as InsertGatePassResponse) ?? { gate_pass_id: '', auto_approved: false, status: 'pending', approval_reason: '' };
}

export interface UpdateGatePassStatusResponse {
  gate_pass_id: string;
  status: string;
  message: string;
}

export async function patchGatePassStatus(
  callerId: string,
  callerRole: string,
  id: string,
  status: GatePass['status'],
  approvedBy?: string,
  approvalReason?: string,
): Promise<UpdateGatePassStatusResponse> {
  await ensureSessionContext(callerId, callerRole);
  const { data, error } = await supabase.rpc('api_update_gate_pass_status', {
    p_caller_id: callerId,
    p_caller_role: callerRole,
    p_id: id,
    p_status: status,
    p_approved_by: approvedBy ?? null,
    p_approval_reason: approvalReason ?? null,
  });
  if (error) throw error;
  return (data as UpdateGatePassStatusResponse) ?? { gate_pass_id: id, status, message: 'Updated' };
}

/** Response shape returned by the `server_scan_gate_pass` Supabase RPC. */
interface ScanGatePassResponse {
  message?: string;
}

export async function rpcScanGatePass(callerId: string, callerRole: string, qrToken: string): Promise<string> {
  await ensureSessionContext(callerId, callerRole);
  const { data, error } = await supabase.rpc('server_scan_gate_pass', { p_qr_token: qrToken });
  if (error || !data) throw new Error(error?.message ?? 'QR tidak valid');
  return (data as ScanGatePassResponse).message ?? 'Scan berhasil';
}

export interface ApprovalStats {
  total_gate_passes: number;
  completed: number;
  pending: number;
  rejected: number;
  auto_approved: number;
  approval_rate: number;
}

export async function fetchApprovalStats(callerId: string, userId: string): Promise<ApprovalStats | null> {
  await ensureSessionContext(callerId, 'prajurit');
  const { data, error } = await supabase.rpc('api_get_approval_stats', {
    p_user_id: userId,
  });
  if (error) return null;
  return (data?.[0] as ApprovalStats) ?? null;
}
