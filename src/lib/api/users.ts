import { supabase } from '../supabase';
import type { User, Role } from '../../types';

export interface FetchUsersParams {
  callerId: string;
  callerRole: string;
  role?: Role;
  satuan?: string;
  isActive?: boolean;
  orderBy?: 'nama' | 'created_at';
  ascending?: boolean;
}

export async function fetchUsers(params: FetchUsersParams): Promise<User[]> {
  const { data, error } = await supabase.rpc('api_get_users', {
    p_user_id: params.callerId,
    p_role: params.callerRole,
    p_role_filter: params.role ?? null,
    p_satuan_filter: params.satuan ?? null,
    p_is_active: params.isActive ?? null,
    p_order_by: params.orderBy ?? 'nama',
    p_ascending: params.ascending ?? true,
  });
  if (error) throw error;
  return (data as User[]) ?? [];
}

export async function fetchUsersDirect(params: FetchUsersParams): Promise<User[]> {
  let query = supabase
    .from('users')
    .select('*')
    .order(params.orderBy ?? 'nama', { ascending: params.ascending ?? true });

  if (params.role) {
    query = query.eq('role', params.role);
  }

  if (params.satuan) {
    query = query.eq('satuan', params.satuan);
  }

  if (params.isActive !== undefined) {
    query = query.eq('is_active', params.isActive);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as User[]) ?? [];
}

export async function createUserWithPin(userData: {
  nrp: string;
  pin: string;
  nama: string;
  role: Role;
  satuan: string;
  pangkat?: string;
  jabatan?: string;
}): Promise<unknown> {
  const { data, error } = await supabase.rpc('create_user_with_pin', {
    p_nrp: userData.nrp,
    p_pin: userData.pin,
    p_nama: userData.nama,
    p_role: userData.role,
    p_satuan: userData.satuan,
    p_pangkat: userData.pangkat ?? null,
    p_jabatan: userData.jabatan ?? null,
  });
  if (error) throw error;
  return data;
}

export async function patchUser(callerId: string, callerRole: string, id: string, updates: Partial<User>): Promise<void> {
  const { error } = await supabase.rpc('api_update_user', {
    p_caller_id: callerId,
    p_caller_role: callerRole,
    p_target_id: id,
    p_updates: updates,
  });
  if (error) throw error;
}

export async function resetUserPin(userId: string, newPin: string): Promise<void> {
  const { error } = await supabase.rpc('reset_user_pin', {
    p_user_id: userId,
    p_new_pin: newPin,
  });
  if (error) throw error;
}

export async function fetchUserById(userId: string): Promise<User> {
  const { data, error } = await supabase.rpc('get_user_detail', { p_user_id: userId }).single();
  if (error) throw error;
  return data as User;
}

export interface UpdateOwnProfileParams {
  no_telepon?: string;
  alamat?: string;
  kontak_darurat_nama?: string;
  kontak_darurat_telp?: string;
}

export async function updateOwnProfile(userId: string, params: UpdateOwnProfileParams): Promise<void> {
  const { error } = await supabase.rpc('update_own_profile', {
    p_user_id: userId,
    p_no_telepon: params.no_telepon ?? null,
    p_alamat: params.alamat ?? null,
    p_kontak_darurat_nama: params.kontak_darurat_nama ?? null,
    p_kontak_darurat_telp: params.kontak_darurat_telp ?? null,
  });
  if (error) throw error;
}
