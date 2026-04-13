import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { AuditLog } from '../types';

interface UseAuditLogsOptions {
  userId?: string;
  action?: string;
  limit?: number;
}

export function useAuditLogs(options: UseAuditLogsOptions = {}) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*, user:user_id(id,nama,nrp,role)')
        .order('created_at', { ascending: false })
        .limit(options.limit ?? 100);

      if (options.userId) query = query.eq('user_id', options.userId);
      if (options.action) query = query.eq('action', options.action);

      const { data, error: err } = await query;
      if (err) throw err;
      setLogs((data as AuditLog[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat audit log');
    } finally {
      setIsLoading(false);
    }
  }, [options.userId, options.action, options.limit]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return { logs, isLoading, error, refetch: fetchLogs };
}
