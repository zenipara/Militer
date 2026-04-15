import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { supabase } from '../../lib/supabase';
import type { AuditLog } from '../../types';

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
};

const sampleLogs: AuditLog[] = [
  { id: 'l1', action: 'LOGIN', created_at: '2024-01-01T08:00:00Z' },
  { id: 'l2', user_id: 'u1', action: 'GATE_PASS_CREATE', created_at: '2024-01-01T09:00:00Z' },
] as AuditLog[];

function buildQuery(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  q.select = chain;
  q.eq = chain;
  q.order = chain;
  q.limit = chain;
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  q.catch = (reject: (e: unknown) => unknown) => Promise.resolve(result).catch(reject);
  return q;
}

describe('useAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads audit logs on mount', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: sampleLogs, error: null }));

    const { result } = renderHook(() => useAuditLogs());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.logs).toHaveLength(2);
    expect(result.current.logs[0].action).toBe('LOGIN');
  });

  it('sets error when fetch fails', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: new Error('db error') }));

    const { result } = renderHook(() => useAuditLogs());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('db error');
    expect(result.current.logs).toHaveLength(0);
  });

  it('returns empty list for empty dataset', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: [], error: null }));

    const { result } = renderHook(() => useAuditLogs());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.logs).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('refetch re-fetches audit logs', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: sampleLogs, error: null }));

    const { result } = renderHook(() => useAuditLogs());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const callsBefore = (mockSupabase.from as ReturnType<typeof vi.fn>).mock.calls.length;

    await act(async () => {
      await result.current.refetch();
    });

    expect((mockSupabase.from as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('filters by userId when option is provided', async () => {
    const filteredQuery = buildQuery({ data: [sampleLogs[1]], error: null }) as Record<string, unknown>;
    const eqSpy = vi.fn().mockReturnValue(filteredQuery);
    filteredQuery.eq = eqSpy;
    mockSupabase.from.mockReturnValue(filteredQuery);

    const { result } = renderHook(() => useAuditLogs({ userId: 'u1' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // eq should have been called with 'user_id'
    expect(eqSpy).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('filters by action when option is provided', async () => {
    const filteredQuery = buildQuery({ data: [sampleLogs[0]], error: null }) as Record<string, unknown>;
    const eqSpy = vi.fn().mockReturnValue(filteredQuery);
    filteredQuery.eq = eqSpy;
    mockSupabase.from.mockReturnValue(filteredQuery);

    const { result } = renderHook(() => useAuditLogs({ action: 'LOGIN' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(eqSpy).toHaveBeenCalledWith('action', 'LOGIN');
  });
});
