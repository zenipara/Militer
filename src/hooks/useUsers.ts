import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { fetchUsers as apiFetchUsers, fetchUserById as apiFetchUserById, createUserWithPin, patchUser, resetUserPin as apiResetUserPin, updateOwnProfile as apiUpdateOwnProfile, type UpdateOwnProfileParams } from '../lib/api/users';
import { handleError } from '../lib/handleError';
import { notifyDataChanged, subscribeDataChanges } from '../lib/dataSync';
import { supabase } from '../lib/supabase';
import type { User, Role } from '../types';
import { useAuthStore } from '../store/authStore';

interface UseUsersOptions {
  role?: Role;
  satuan?: string;
  isActive?: boolean;
  orderBy?: 'nama' | 'created_at';
  ascending?: boolean;
}

export function useUsers(options: UseUsersOptions = {}) {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Memoize requestParams so its reference only changes when actual values change,
  // preventing useCallback/useEffect from re-running on every render.
  const requestParams = useMemo(() => ({
    callerId: user?.id ?? '',
    callerRole: user?.role ?? '',
    role: options.role,
    satuan: options.satuan,
    isActive: options.isActive,
    orderBy: options.orderBy,
    ascending: options.ascending,
  }), [user?.id, user?.role, options.role, options.satuan, options.isActive, options.orderBy, options.ascending]);

  const loadUsersData = useCallback(async () => {
    if (!user) return [] as User[];
    return apiFetchUsers(requestParams);
  }, [user, requestParams]);

  const fetchUsers = useCallback(async () => {
    if (!user) {
      setUsers([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await loadUsersData();
      setUsers(data);
    } catch (err) {
      setError(handleError(err, 'Gagal memuat data user'));
    } finally {
      setIsLoading(false);
    }
  }, [user, loadUsersData]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    return subscribeDataChanges('users', () => {
      void fetchUsers();
    });
  }, [fetchUsers]);

  useEffect(() => {
    if (!user) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`users-changes-${user.id}`);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
      void fetchUsers();
    });
    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, fetchUsers]);

  const createUser = async (userData: Omit<User, 'id' | 'created_at' | 'updated_at' | 'is_online' | 'login_attempts'> & { pin: string }) => {
    const { pin, ...rest } = userData;
    const data = await createUserWithPin({
      nrp: rest.nrp,
      pin,
      nama: rest.nama,
      role: rest.role,
      satuan: rest.satuan,
      pangkat: rest.pangkat,
      jabatan: rest.jabatan,
    });
    // Refresh list without masking successful mutation when read path is flaky.
    await fetchUsers();
    notifyDataChanged('users');
    return data;
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    if (!user) throw new Error('Not authenticated');
    await patchUser(user.id, user.role, id, updates);
    // Do not throw if refresh fails after a successful update.
    await fetchUsers();
    notifyDataChanged('users');
  };

  const toggleUserActive = async (id: string, isActive: boolean) => {
    await updateUser(id, { is_active: isActive });
  };

  const resetUserPin = async (userId: string, newPin: string) => {
    await apiResetUserPin(userId, newPin);
    notifyDataChanged('users');
  };

  const getUserById = async (userId: string): Promise<User> => {
    return apiFetchUserById(userId);
  };

  const updateOwnProfile = async (userId: string, params: UpdateOwnProfileParams): Promise<void> => {
    await apiUpdateOwnProfile(userId, params);
    notifyDataChanged('users');
  };

  return { users, isLoading, error, refetch: fetchUsers, createUser, updateUser, toggleUserActive, resetUserPin, getUserById, updateOwnProfile };
}
