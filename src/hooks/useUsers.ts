import { useState, useEffect, useCallback, useMemo } from 'react';
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

    if (canUseDirectFallback) {
      const directResult = await apiFetchUsersDirect(requestParams);
      if (directResult.length > 0) {
        return directResult;
      }

      const rpcResult = await apiFetchUsers(requestParams);
      return rpcResult;
    }

    return apiFetchUsers(requestParams);
  }, [user, canUseDirectFallback, requestParams]);

  const fetchUsers = useCallback(async () => {
    if (!user) return;
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

  const fetchUsersOrThrow = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    setIsLoading(true);
    setError(null);
    try {
      const data = await loadUsersData();
      setUsers(data);
    } catch (err) {
      const message = handleError(err, 'Gagal memuat data user');
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [user, loadUsersData]);

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
    // Refresh the list after creation; use the non-throwing variant so a
    // temporary read failure does not mask the successful create.
    void fetchUsers();
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
