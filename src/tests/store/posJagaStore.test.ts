import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import { usePosJagaStore } from '../../store/posJagaStore';
import { useAuthStore } from '../../store/authStore';
import type { PosJaga, ScanPosJagaResult } from '../../types';

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
};

const now = new Date().toISOString();

const samplePos: PosJaga[] = [
  { id: 'p1', nama: 'Pos Jaga Utara', qr_token: 'token-utara', is_active: true, created_at: now },
  { id: 'p2', nama: 'Pos Jaga Selatan', qr_token: 'token-selatan', is_active: false, created_at: now },
];

const mockUser = {
  id: 'u1', nrp: '11111', nama: 'Prajurit A', role: 'prajurit' as const,
  satuan: 'Satuan X', is_active: true, is_online: true, login_attempts: 0,
  created_at: now, updated_at: now,
};

/** Build a chainable mock Supabase query that resolves to `result`. */
function buildQuery(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  q.select = chain;
  q.eq = chain;
  q.order = chain;
  q.insert = vi.fn(() => Promise.resolve(result));
  q.update = vi.fn(() => q);
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  q.catch = (reject: (e: unknown) => unknown) => Promise.resolve(result).catch(reject);
  return q;
}

describe('posJagaStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePosJagaStore.setState({ posJagaList: [] });
    useAuthStore.setState({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
  });

  // ── fetchPosJaga ──────────────────────────────────────────
  describe('fetchPosJaga', () => {
    it('fetches all pos jaga and updates store', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: samplePos, error: null }));

      await usePosJagaStore.getState().fetchPosJaga();

      expect(mockSupabase.from).toHaveBeenCalledWith('pos_jaga');
      expect(usePosJagaStore.getState().posJagaList).toHaveLength(2);
      expect(usePosJagaStore.getState().posJagaList[0].nama).toBe('Pos Jaga Utara');
    });

    it('throws on supabase error', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: new Error('db error') }));

      await expect(usePosJagaStore.getState().fetchPosJaga()).rejects.toThrow('db error');
    });
  });

  // ── createPosJaga ─────────────────────────────────────────
  describe('createPosJaga', () => {
    it('inserts a new pos jaga and prepends created row', async () => {
      usePosJagaStore.setState({ posJagaList: samplePos });

      const created: PosJaga = {
        id: 'p3',
        nama: 'Pos Baru',
        qr_token: 'token-baru',
        is_active: true,
        created_at: now,
      };

      const singleMock = vi.fn().mockResolvedValue({ data: created, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      const insertQuery = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      insertQuery.insert = insertMock;

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
      mockSupabase.from.mockReturnValue(insertQuery);

      const result = await usePosJagaStore.getState().createPosJaga('Pos Baru');

      expect(insertMock).toHaveBeenCalledWith([{ nama: 'Pos Baru' }]);
      expect(result.qr_token).toBe('token-baru');
      expect(usePosJagaStore.getState().posJagaList).toHaveLength(3);
      expect(usePosJagaStore.getState().posJagaList[0].id).toBe('p3');
    });
  });

  // ── setActive ─────────────────────────────────────────────
  describe('setActive', () => {
    it('calls update with correct is_active value and refreshes', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const patchQuery = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      patchQuery.update = updateMock;

      const listQuery = buildQuery({ data: samplePos, error: null });

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? patchQuery : listQuery;
      });

      await usePosJagaStore.getState().setActive('p2', true);

      expect(updateMock).toHaveBeenCalledWith({ is_active: true });
      expect(eqMock).toHaveBeenCalledWith('id', 'p2');
      expect(usePosJagaStore.getState().posJagaList).toHaveLength(2);
    });

    it('deactivates a pos jaga (is_active = false)', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const patchQuery = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      patchQuery.update = updateMock;

      mockSupabase.from.mockImplementation(() => patchQuery);

      await usePosJagaStore.getState().setActive('p1', false);

      expect(updateMock).toHaveBeenCalledWith({ is_active: false });
    });
  });

  // ── scanPosJaga ───────────────────────────────────────────
  describe('scanPosJaga', () => {
    it('calls authenticated_scan_pos_jaga RPC and returns result', async () => {
      const scanResult: ScanPosJagaResult = {
        gate_pass_id: 'gp1',
        pos_nama: 'Pos Jaga Utara',
        status: 'checked_in',
        message: 'Scan keluar berhasil (Checked-In)',
      };
      mockSupabase.rpc.mockResolvedValueOnce({ data: scanResult, error: null });

      const result = await usePosJagaStore.getState().scanPosJaga('token-utara', '1000001', '123456');

      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('authenticated_scan_pos_jaga', {
        p_nrp: '1000001',
        p_pin: '123456',
        p_pos_token: 'token-utara',
      });
      expect(result.status).toBe('checked_in');
      expect(result.message).toBe('Scan keluar berhasil (Checked-In)');
    });

    it('returns "completed" status when gate pass was already checked_in', async () => {
      const scanResult: ScanPosJagaResult = {
        gate_pass_id: 'gp2',
        pos_nama: 'Pos Jaga Selatan',
        status: 'completed',
        message: 'Scan kembali berhasil (Completed)',
      };
      mockSupabase.rpc.mockResolvedValueOnce({ data: scanResult, error: null });

      const result = await usePosJagaStore.getState().scanPosJaga('token-selatan', '1000001', '123456');

      expect(result.status).toBe('completed');
    });

    it('throws when RPC returns an error', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: new Error('QR tidak valid') });

      await expect(
        usePosJagaStore.getState().scanPosJaga('bad-token', '1000001', '123456')
      ).rejects.toThrow('QR tidak valid');
    });

    it('throws when RPC returns null data', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null });

      await expect(
        usePosJagaStore.getState().scanPosJaga('some-token', '1000001', '999999')
      ).rejects.toThrow('Scan pos jaga gagal');
    });
  });
});
