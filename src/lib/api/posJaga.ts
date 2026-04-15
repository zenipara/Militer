import { supabase } from '../supabase';
import type { PosJaga, ScanPosJagaResult } from '../../types';

export async function fetchAllPosJaga(): Promise<PosJaga[]> {
  const { data, error } = await supabase
    .from('pos_jaga')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as PosJaga[]) ?? [];
}

export async function insertPosJaga(payload: { nama: string }): Promise<void> {
  const { error } = await supabase.from('pos_jaga').insert([payload]);
  if (error) throw error;
}

export async function patchPosJagaActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await supabase
    .from('pos_jaga')
    .update({ is_active })
    .eq('id', id);
  if (error) throw error;
}

export async function rpcScanPosJaga(posToken: string, userId: string): Promise<ScanPosJagaResult> {
  const { data, error } = await supabase.rpc('scan_pos_jaga', {
    p_pos_token: posToken,
    p_user_id: userId,
  });
  if (error || !data) throw new Error(error?.message ?? 'QR pos jaga tidak valid');
  return data as ScanPosJagaResult;
}
