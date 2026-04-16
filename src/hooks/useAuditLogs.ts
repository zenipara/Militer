import { useState, useEffect, useCallback } from 'react';
import { fetchAuditLogs as apiFetchAuditLogs } from '../lib/api/auditLogs';
import { handleError } from '../lib/handleError';
import type { AuditLog } from '../types';
import { useAuthStore } from '../store/authStore';

interface UseAuditLogsOptions {
  userId?: string;
  action?: string;
  limit?: number;
}

export function useAuditLogs(options: UseAuditLogsOptions = {}) {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!user) {
      setLogs([]);
      setIsLoading(false);
      return;
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
      setLogs(data);
    } catch (err) {
      setError(handleError(err, 'Gagal memuat audit log'));
    } finally {
      setIsLoading(false);
    }
  }, [user, options.userId, options.action, options.limit]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return { logs, isLoading, error, refetch: fetchLogs };
}
