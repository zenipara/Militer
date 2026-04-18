import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../../lib/supabase';
import {
  fetchAllPosJaga,
  insertPosJaga,
  patchPosJagaActive,
  rpcScanPosJaga,
} from '../../../lib/api/posJaga';

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
};

const CALLER_ID = 'caller-1';
const CALLER_ROLE = 'admin';

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

describe('posJaga API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ── fetchAllPosJaga ───────────────────────────────────────
  describe('fetchAllPosJaga', () => {
    it('returns array of pos jaga', async () => {
      const data = [{ id: 'p1', nama: 'Utara', qr_token: 'tok1', is_active: true, created_at: '2024-01-01' }];
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null }); // set_session_context
      mockSupabase.from.mockReturnValue(buildQuery({ data, error: null }));

      const result = await fetchAllPosJaga(CALLER_ID, CALLER_ROLE);

      expect(mockSupabase.from).toHaveBeenCalledWith('pos_jaga');
      expect(result).toHaveLength(1);
      expect(result[0].nama).toBe('Utara');
    });

    it('returns empty array when data is null', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
      mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: null }));

      const result = await fetchAllPosJaga(CALLER_ID, CALLER_ROLE);
      expect(result).toEqual([]);
    });

    it('throws on supabase error', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
      mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: new Error('db error') }));

      await expect(fetchAllPosJaga(CALLER_ID, CALLER_ROLE)).rejects.toThrow('db error');
    });
  });

  // ── insertPosJaga ─────────────────────────────────────────
  describe('insertPosJaga', () => {
    it('calls insert with correct payload and returns created row', async () => {
      const created = { id: 'p3', nama: 'Pos Baru', qr_token: 'tok3', is_active: true, created_at: '2024-01-01' };
      const singleMock = vi.fn().mockResolvedValue({ data: created, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.insert = insertMock;
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
      mockSupabase.from.mockReturnValue(q);

      const result = await insertPosJaga(CALLER_ID, CALLER_ROLE, { nama: 'Pos Baru' });

      expect(insertMock).toHaveBeenCalledWith([{ nama: 'Pos Baru' }]);
      expect(result.id).toBe('p3');
      expect(result.qr_token).toBe('tok3');
    });

    it('throws when insert fails', async () => {
      const singleMock = vi.fn().mockResolvedValue({ data: null, error: new Error('insert error') });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.insert = insertMock;
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
      mockSupabase.from.mockReturnValue(q);

      await expect(insertPosJaga(CALLER_ID, CALLER_ROLE, { nama: 'Bad' })).rejects.toThrow('insert error');
    });
  });

  // ── patchPosJagaActive ────────────────────────────────────
  describe('patchPosJagaActive', () => {
    it('updates is_active field for given id', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.update = updateMock;
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
      mockSupabase.from.mockReturnValue(q);

      await patchPosJagaActive(CALLER_ID, CALLER_ROLE, 'p1', false);

      expect(updateMock).toHaveBeenCalledWith({ is_active: false });
      expect(eqMock).toHaveBeenCalledWith('id', 'p1');
    });

    it('throws when update fails', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: new Error('update error') });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.update = updateMock;
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
      mockSupabase.from.mockReturnValue(q);

      await expect(patchPosJagaActive(CALLER_ID, CALLER_ROLE, 'p1', true)).rejects.toThrow('update error');
    });
  });

  // ── rpcScanPosJaga ────────────────────────────────────────
  describe('rpcScanPosJaga', () => {
    it('calls RPC with correct params and returns result', async () => {
      const scanResult = { gate_pass_id: 'gp1', pos_nama: 'Pos Jaga Utara', status: 'out', message: 'Keluar berhasil dicatat' };
      mockSupabase.rpc.mockResolvedValue({ data: scanResult, error: null });

      const result = await rpcScanPosJaga('tok1', 'u1');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('scan_pos_jaga', { p_pos_token: 'tok1', p_user_id: 'u1' });
      expect(result.status).toBe('out');
    });

    it('throws when RPC returns error', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: new Error('QR tidak valid') });
      await expect(rpcScanPosJaga('bad-tok', 'u1')).rejects.toThrow('QR tidak valid');
    });

    it('throws with fallback message when data is null and no error', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
      await expect(rpcScanPosJaga('tok', 'u1')).rejects.toThrow('QR pos jaga tidak valid');
    });
  });
});
