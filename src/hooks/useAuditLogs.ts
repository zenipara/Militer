import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAuditLogs as apiFetchAuditLogs } from '../lib/api/auditLogs';
import { handleError } from '../lib/handleError';
import { SimpleCache, buildCacheKey } from '../lib/cache';
import type { AuditLog } from '../types';
import { useAuthStore } from '../store/authStore';

interface UseAuditLogsOptions {
  userId?: string;
  action?: string;
  limit?: number;
}

/** Module-level cache: audit log di-cache 5 menit per kombinasi filter */
const auditLogsCache = new SimpleCache<AuditLog[]>();

/** Hapus semua cache audit log — berguna untuk pengujian unit. */
export function clearAuditLogsCache(): void {
  auditLogsCache.clear();
}

export function useAuditLogs(options: UseAuditLogsOptions = {}) {
  const { user } = useAuthStore();

  const cacheKey = useMemo(
    () => buildCacheKey({ u: options.userId, a: options.action, l: options.limit }),
    [options.userId, options.action, options.limit],
  );

  const [logs, setLogs] = useState<AuditLog[]>(() => auditLogsCache.get(cacheKey) ?? []);
  const [isLoading, setIsLoading] = useState(() => !auditLogsCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async (force = false) => {
    if (!user) {
      setLogs([]);
      setIsLoading(false);
      return;
    }
    if (!force) {
      const cached = auditLogsCache.get(cacheKey);
      if (cached) {
        setLogs(cached);
        setIsLoading(false);
        return;
      }
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetchAuditLogs({
        callerId: user.id,
        callerRole: user.role,
        userId: options.userId,
        action: options.action,
        limit: options.limit,
      });
      auditLogsCache.set(cacheKey, data);
      setLogs(data);
    } catch (err) {
      setError(handleError(err, 'Gagal memuat audit log'));
    } finally {
      setIsLoading(false);
    }
  }, [user, cacheKey, options.userId, options.action, options.limit]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return { logs, isLoading, error, refetch: () => fetchLogs(true) };
}
