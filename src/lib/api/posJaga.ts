import { supabase } from '../supabase';
import type { PosJaga, ScanPosJagaResult } from '../../types';

async function ensureSessionContext(callerId: string, callerRole: string): Promise<void> {
  const res = await supabase.rpc('set_session_context', {
    p_user_id: callerId,
    p_role: callerRole,
  });
  if (res?.error) throw res.error;
}

export async function fetchAllPosJaga(callerId: string, callerRole: string): Promise<PosJaga[]> {
  await ensureSessionContext(callerId, callerRole);
  const { data, error } = await supabase
    .from('pos_jaga')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as PosJaga[]) ?? [];
}

export async function insertPosJaga(callerId: string, callerRole: string, payload: { nama: string }): Promise<PosJaga> {
  await ensureSessionContext(callerId, callerRole);
  const { data, error } = await supabase
    .from('pos_jaga')
    .insert([payload])
    .select('*')
    .single();
  if (error) throw error;
  if (!data) throw new Error('Gagal membuat QR pos jaga');
  return data as PosJaga;
}

export async function patchPosJagaActive(callerId: string, callerRole: string, id: string, is_active: boolean): Promise<void> {
  await ensureSessionContext(callerId, callerRole);
  const { error } = await supabase
    .from('pos_jaga')
    .update({ is_active })
    .eq('id', id);
  if (error) throw error;
}

export async function deletePosJaga(callerId: string, callerRole: string, id: string): Promise<void> {
  await ensureSessionContext(callerId, callerRole);
  const { error } = await supabase
    .from('pos_jaga')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function renamePosJaga(callerId: string, callerRole: string, id: string, nama: string): Promise<PosJaga> {
  await ensureSessionContext(callerId, callerRole);
  const { data, error } = await supabase
    .from('pos_jaga')
    .update({ nama })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  if (!data) throw new Error('Gagal mengubah nama pos jaga');
  return data as PosJaga;
}

export async function rotatePosJagaQr(callerId: string, callerRole: string, id: string): Promise<PosJaga> {
  await ensureSessionContext(callerId, callerRole);
  const newToken = crypto.randomUUID();
  const { data, error } = await supabase
    .from('pos_jaga')
    .update({ qr_token: newToken })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  if (!data) throw new Error('Gagal memperbarui QR pos jaga');
  return data as PosJaga;
}

export async function rpcScanPosJaga(posToken: string, userId: string): Promise<ScanPosJagaResult> {
  const { data, error } = await supabase.rpc('scan_pos_jaga', {
    p_pos_token: posToken,
    p_user_id: userId,
  });
  if (error || !data) throw new Error(error?.message ?? 'QR pos jaga tidak valid');
  return data as ScanPosJagaResult;
}

/**
 * Credential-based pos jaga scan for the kiosk flow (no pre-existing session).
 *
 * Uses the `authenticated_scan_pos_jaga` combined RPC which verifies the
 * PIN and processes the scan atomically on the server.  This removes the
 * previous two-step flow where verify_user_pin and scan_pos_jaga were
 * separate round-trips — a gap that could allow the caller to scan for a
 * different user than the one they authenticated as.
 */
export async function rpcScanPosJagaWithCredentials(
  posToken: string,
  nrp: string,
  pin: string,
): Promise<ScanPosJagaResult> {
  const normalizedNrp = nrp.trim();
  const normalizedPin = pin.trim();
  if (!normalizedNrp || !normalizedPin) {
    throw new Error('NRP dan PIN wajib diisi');
  }

  const { data, error } = await supabase.rpc('authenticated_scan_pos_jaga', {
    p_nrp: normalizedNrp,
    p_pin: normalizedPin,
    p_pos_token: posToken,
  });

  if (error || !data) throw new Error(error?.message ?? 'Scan pos jaga gagal');
  return data as ScanPosJagaResult;
}
