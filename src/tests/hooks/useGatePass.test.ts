import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGatePass } from '../../hooks/useGatePass';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import type { GatePass } from '../../types';

type MockQuery = {
  _table: string;
  _opts?: { head?: boolean };
  _single?: boolean;
  _select?: string;
  select: (columns: string, opts?: unknown) => MockQuery;
  eq: (...args: unknown[]) => MockQuery;
  order: (...args: unknown[]) => MockQuery;
  insert: (value: unknown) => MockQuery;
  then: <T>(resolve: (value: unknown) => T) => Promise<T>;
  catch: (reject: (error: unknown) => unknown) => Promise<unknown>;
};

const sampleGatePasses: GatePass[] = [
  {
    id: 'gp1',
    user_id: 'u1',
    qr_token: 'token-123',
    status: 'pending',
    created_at: '2026-04-14T00:00:00Z',
    updated_at: '2026-04-14T00:00:00Z',
  } as GatePass,
];

const mockSupabase = supabase as unknown as {
  from: (table: string) => MockQuery;
};

function queryResult(q: MockQuery) {
  if (q._single) {
    return { data: Array.isArray(sampleGatePasses) ? sampleGatePasses[0] : sampleGatePasses, error: null };
  }
  return { data: sampleGatePasses, error: null };
}

function buildQuery(table: string) {
  const q = {
    _table: table,
    _single: false,
    _select: undefined,
  } as MockQuery;

  const chain = () => q;
  q.select = (columns: string, opts?: unknown) => {
    q._select = columns;
    q._opts = opts as { head?: boolean };
    return q;
  };
  q.eq = chain;
  q.order = chain;
  q.insert = vi.fn(() => q);
  q.then = (resolve) => Promise.resolve(queryResult(q)).then(resolve);
  q.catch = (reject) => Promise.resolve(queryResult(q)).catch(reject);
  return q;
}

describe('useGatePass', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'u1', nrp: '11111', nama: 'Prajurit A', role: 'prajurit', satuan: 'Satuan X', is_active: true, is_online: true, login_attempts: 0, created_at: '2026-04-14T00:00:00Z', updated_at: '2026-04-14T00:00:00Z' },
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
    mockSupabase.from = vi.fn((table: string) => buildQuery(table));
  });

  it('loads gate passes on mount', async () => {
    const { result } = renderHook(() => useGatePass());

    await waitFor(() => expect(result.current.gatePasses).toHaveLength(1));
    expect(result.current.gatePasses[0].id).toBe('gp1');
    expect(mockSupabase.from).toHaveBeenCalledWith('gate_pass');
  });

  it('creates a gate pass and refetches list', async () => {
    const { result } = renderHook(() => useGatePass());
    await waitFor(() => expect(result.current.gatePasses).toHaveLength(1));

    const insertQuery = buildQuery('gate_pass');
    const insertSpy = vi.spyOn(insertQuery, 'insert');
    mockSupabase.from = vi.fn((table: string) => (table === 'gate_pass' ? insertQuery : buildQuery(table)));

    await act(async () => {
      await result.current.createGatePass({ purpose: 'Kunjungan' });
    });

    expect(insertSpy).toHaveBeenCalled();
    expect(insertSpy.mock.calls[0][0][0]).toMatchObject({ user_id: 'u1', purpose: 'Kunjungan' });
    expect(result.current.gatePasses).toHaveLength(1);
  });
});
