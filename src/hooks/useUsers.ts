import { useState, useEffect, useCallback } from 'react';
import { fetchUsers as apiFetchUsers, fetchUsersDirect as apiFetchUsersDirect, fetchUserById as apiFetchUserById, createUserWithPin, patchUser, resetUserPin as apiResetUserPin, updateOwnProfile as apiUpdateOwnProfile, type UpdateOwnProfileParams } from '../lib/api/users';
import { handleError } from '../lib/handleError';
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

  const canUseDirectFallback = user?.role === 'admin' && options.role === undefined && options.satuan === undefined && options.isActive === undefined;

  const fetchUsers = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetchUsers({
        callerId: user.id,
        callerRole: user.role,
        role: options.role,
        satuan: options.satuan,
        isActive: options.isActive,
        orderBy: options.orderBy,
        ascending: options.ascending,
      });
      if (data.length > 0 || !canUseDirectFallback) {
        setUsers(data);
        return;
      }

      const fallbackData = await apiFetchUsersDirect({
        callerId: user.id,
        callerRole: user.role,
        role: options.role,
        satuan: options.satuan,
        isActive: options.isActive,
        orderBy: options.orderBy,
        ascending: options.ascending,
      });
      setUsers(fallbackData);
    } catch (err) {
      setError(handleError(err, 'Gagal memuat data user'));
    } finally {
      setIsLoading(false);
    }
  }, [user, options.role, options.satuan, options.isActive, options.orderBy, options.ascending]);

  const fetchUsersOrThrow = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetchUsers({
        callerId: user.id,
        callerRole: user.role,
        role: options.role,
        satuan: options.satuan,
        isActive: options.isActive,
        orderBy: options.orderBy,
        ascending: options.ascending,
      });
      setUsers(data);
    } catch (err) {
      const message = handleError(err, 'Gagal memuat data user');
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [user, options.role, options.satuan, options.isActive, options.orderBy, options.ascending]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

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
    await fetchUsersOrThrow();
    return data;
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    if (!user) throw new Error('Not authenticated');
    await patchUser(user.id, user.role, id, updates);
    await fetchUsersOrThrow();
  };

  const toggleUserActive = async (id: string, isActive: boolean) => {
    await updateUser(id, { is_active: isActive });
  };

  const resetUserPin = async (userId: string, newPin: string) => {
    await apiResetUserPin(userId, newPin);
  };

  const getUserById = async (userId: string): Promise<User> => {
    return apiFetchUserById(userId);
  };

  const updateOwnProfile = async (userId: string, params: UpdateOwnProfileParams): Promise<void> => {
    await apiUpdateOwnProfile(userId, params);
  };

  return { users, isLoading, error, refetch: fetchUsers, createUser, updateUser, toggleUserActive, resetUserPin, getUserById, updateOwnProfile };
}
