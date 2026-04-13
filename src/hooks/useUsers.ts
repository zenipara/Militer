import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Role } from '../types';

interface UseUsersOptions {
  role?: Role;
  satuan?: string;
  isActive?: boolean;
}

export function useUsers(options: UseUsersOptions = {}) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase.from('users').select('*').order('nama');

      if (options.role) query = query.eq('role', options.role);
      if (options.satuan) query = query.eq('satuan', options.satuan);
      if (options.isActive !== undefined) query = query.eq('is_active', options.isActive);

      const { data, error: err } = await query;
      if (err) throw err;
      setUsers((data as User[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data user');
    } finally {
      setIsLoading(false);
    }
  }, [options.role, options.satuan, options.isActive]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const createUser = async (userData: Omit<User, 'id' | 'created_at' | 'updated_at' | 'is_online' | 'login_attempts'> & { pin: string }) => {
    const { pin, ...rest } = userData;
    const { data, error } = await supabase.rpc('create_user_with_pin', {
      p_nrp: rest.nrp,
      p_pin: pin,
      p_nama: rest.nama,
      p_role: rest.role,
      p_satuan: rest.satuan,
      p_pangkat: rest.pangkat ?? null,
      p_jabatan: rest.jabatan ?? null,
    });
    if (error) throw error;
    await fetchUsers();
    return data;
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const { error } = await supabase.from('users').update(updates).eq('id', id);
    if (error) throw error;
    await fetchUsers();
  };

  const toggleUserActive = async (id: string, isActive: boolean) => {
    await updateUser(id, { is_active: isActive });
  };

  const resetUserPin = async (userId: string, newPin: string) => {
    const { error } = await supabase.rpc('reset_user_pin', {
      p_user_id: userId,
      p_new_pin: newPin,
    });
    if (error) throw error;
  };

  return { users, isLoading, error, refetch: fetchUsers, createUser, updateUser, toggleUserActive, resetUserPin };
}
