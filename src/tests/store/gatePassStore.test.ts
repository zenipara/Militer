import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import { useGatePassStore } from '../../store/gatePassStore';
import { useAuthStore } from '../../store/authStore';
import type { GatePass } from '../../types';

type MockQuery = {
  _table: string;
  _single?: boolean;
  _select?: string;
  _data?: unknown;
  select: (columns: string, opts?: unknown) => MockQuery;
  eq: (...args: unknown[]) => MockQuery;
  order: (...args: unknown[]) => MockQuery;
  insert: (value: unknown) => MockQuery;
  update: (value: unknown) => MockQuery;
  single: () => Promise<unknown>;
  then: <T>(resolve: (value: unknown) => T) => Promise<T>;
  catch: (reject: (error: unknown) => unknown) => Promise<unknown>;
};

const now = new Date();
const overdueTime = new Date(now.getTime() - 1000 * 60 * 60).toISOString();
const gatePassOut: GatePass = {
  id: 'gp1',
  user_id: 'u1',
  keperluan: 'Cuti',
  tujuan: 'Rumah',
  waktu_keluar: now.toISOString(),
  waktu_kembali: overdueTime,
  actual_keluar: now.toISOString(),
  actual_kembali: null,
  status: 'out',
  approved_by: 'u2',
  qr_token: 'qr-1',
  created_at: now.toISOString(),
  updated_at: now.toISOString(),
};

const approvedGatePass = {
  id: 'gp2',
  status: 'approved',
  actual_keluar: null,
  actual_kembali: null,
  waktu_keluar: now.toISOString(),
  waktu_kembali: new Date(now.getTime() + 1000 * 60 * 60).toISOString(),
};

const mockSupabase = supabase as unknown as { from: (table: string) => MockQuery; channel: () => any };

function queryResult(q: MockQuery) {
  const table = q._table;
  if (q._single) {
    return { data: q._data ?? approvedGatePass, error: null };
  }
  return { data: q._data ?? [gatePassOut], error: null };
}

function buildQuery(table: string) {
  const q = {
    _table: table,
    _single: false,
    _data: undefined,
  } as MockQuery;

  const chain = () => q;
  q.select = (columns: string, opts?: unknown) => {
    q._select = columns;
    return q;
  };
  q.eq = (..._args: unknown[]) => q;
  q.order = (..._args: unknown[]) => q;
  q.insert = vi.fn(() => q);
  q.update = vi.fn(() => q);
  q.single = () => {
    q._single = true;
    return Promise.resolve(queryResult(q));
  };
  q.then = async (resolve) => resolve(queryResult(q));
  q.catch = async (reject) => reject(null);
  return q;
}

describe('gatePassStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGatePassStore.setState({ gatePasses: [] });
    useAuthStore.setState({
      user: { id: 'u1', nrp: '11111', nama: 'Prajurit A', role: 'prajurit', satuan: 'Satuan X', is_active: true, is_online: true, login_attempts: 0, created_at: now.toISOString(), updated_at: now.toISOString() },
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
    mockSupabase.from = vi.fn((table: string) => buildQuery(table));
    mockSupabase.channel = vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() }));
  });

  it('fetches gate passes and updates overdue status for prajurit', async () => {
    const store = useGatePassStore.getState();
    await store.fetchGatePasses();
    expect(mockSupabase.from).toHaveBeenCalledWith('gate_pass');
    expect(useGatePassStore.getState().gatePasses[0].status).toBe('overdue');
  });

  it('creates a gate pass and refreshes list', async () => {
    const insertQuery = buildQuery('gate_pass');
    const insertSpy = vi.spyOn(insertQuery, 'insert');
    mockSupabase.from = vi.fn((table: string) => (table === 'gate_pass' ? insertQuery : buildQuery(table)));
    const store = useGatePassStore.getState();

    await store.createGatePass({ tujuan: 'Aman' });

    expect(insertSpy).toHaveBeenCalled();
    expect(insertSpy.mock.calls[0][0][0]).toMatchObject({ user_id: 'u1', tujuan: 'Aman' });
  });

  it('approves a gate pass successfully', async () => {
    const updateQuery = buildQuery('gate_pass');
    const updateSpy = vi.spyOn(updateQuery, 'update');
    mockSupabase.from = vi.fn(() => updateQuery);

    const store = useGatePassStore.getState();
    await store.approveGatePass('gp2', true);

    expect(updateSpy).toHaveBeenCalledWith({ status: 'approved', approved_by: 'u1' });
  });

  it('scans approved gate pass and returns the updated GatePass object', async () => {
    useAuthStore.setState({
      user: { id: 'u2', nrp: '22222', nama: 'Guard A', role: 'guard', satuan: 'Pos X', is_active: true, is_online: true, login_attempts: 0, created_at: now.toISOString(), updated_at: now.toISOString() },
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });

    const rpcSpy = vi.fn(() => Promise.resolve({ data: { message: 'Keluar berhasil' }, error: null }));
    (mockSupabase as unknown as Record<string, unknown>).rpc = rpcSpy;

    const store = useGatePassStore.getState();
    const result = await store.scanGatePass('qr-1');

    // scanGatePass now returns the updated GatePass (fetched by qr_token after scan),
    // not the plain success message string.
    expect(result).toMatchObject({ id: approvedGatePass.id, status: approvedGatePass.status });
    expect(rpcSpy).toHaveBeenCalledWith('server_scan_gate_pass', { p_qr_token: 'qr-1' });
  });
});
