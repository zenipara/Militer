import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import {
  fetchGatePassesByUser,
  fetchAllGatePasses,
  fetchGatePassByQrToken,
  insertGatePass,
  patchGatePassStatus,
  rpcScanGatePass,
} from '../../lib/api/gatepass';
import type { GatePass } from '../../types';

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
};

const now = new Date().toISOString();
const sampleGatePasses: GatePass[] = [
  {
    id: 'gp1', user_id: 'u1', keperluan: 'Cuti', tujuan: 'Rumah',
    waktu_keluar: now, waktu_kembali: now, status: 'pending',
    qr_token: 'qr-1', created_at: now, updated_at: now,
  },
];

function buildQuery(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  q.select = chain;
  q.eq = chain;
  q.order = chain;
  q.insert = vi.fn(() => Promise.resolve(result));
  q.update = vi.fn(() => q);
  q.single = () => Promise.resolve(result);
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  q.catch = (reject: (e: unknown) => unknown) => Promise.resolve(result).catch(reject);
  return q;
}

describe('gatepass API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── fetchGatePassesByUser ──────────────────────────────────
  describe('fetchGatePassesByUser', () => {
    it('returns gate passes for a user', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: sampleGatePasses, error: null }));

      const result = await fetchGatePassesByUser('u1');

      expect(mockSupabase.from).toHaveBeenCalledWith('gate_pass');
      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe('u1');
    });

    it('returns empty array when no gate passes', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: null }));

      const result = await fetchGatePassesByUser('u1');

      expect(result).toEqual([]);
    });

    it('throws on supabase error', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: new Error('fetch error') }));

      await expect(fetchGatePassesByUser('u1')).rejects.toThrow('fetch error');
    });
  });

  // ── fetchAllGatePasses ─────────────────────────────────────
  describe('fetchAllGatePasses', () => {
    it('returns all gate passes with user join', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: sampleGatePasses, error: null }));

      const result = await fetchAllGatePasses();

      expect(mockSupabase.from).toHaveBeenCalledWith('gate_pass');
      expect(result).toHaveLength(1);
    });

    it('returns empty array when data is null', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: null }));

      const result = await fetchAllGatePasses();

      expect(result).toEqual([]);
    });
  });

  // ── fetchGatePassByQrToken ────────────────────────────────
  describe('fetchGatePassByQrToken', () => {
    it('returns gate pass matching QR token', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: sampleGatePasses[0], error: null }));

      const result = await fetchGatePassByQrToken('qr-1');

      expect(result?.qr_token).toBe('qr-1');
    });

    it('returns null when not found or error', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: new Error('not found') }));

      const result = await fetchGatePassByQrToken('missing');

      expect(result).toBeNull();
    });
  });

  // ── insertGatePass ─────────────────────────────────────────
  describe('insertGatePass', () => {
    it('calls insert with correct payload', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.insert = insertMock;
      mockSupabase.from.mockReturnValue(q);

      await insertGatePass({ user_id: 'u1', qr_token: 'qr-new', keperluan: 'Cuti', tujuan: 'Rumah', waktu_keluar: now, waktu_kembali: now });

      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({ user_id: 'u1', qr_token: 'qr-new' }),
      ]);
    });

    it('throws when insert fails', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: new Error('insert failed') });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.insert = insertMock;
      mockSupabase.from.mockReturnValue(q);

      await expect(insertGatePass({ user_id: 'u1', qr_token: 'x' })).rejects.toThrow('insert failed');
    });
  });

  // ── patchGatePassStatus ────────────────────────────────────
  describe('patchGatePassStatus', () => {
    it('updates status for given id', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.update = updateMock;
      mockSupabase.from.mockReturnValue(q);

      await patchGatePassStatus('gp1', 'approved', 'u2');

      expect(updateMock).toHaveBeenCalledWith({ status: 'approved', approved_by: 'u2' });
      expect(eqMock).toHaveBeenCalledWith('id', 'gp1');
    });

    it('throws when update fails', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: new Error('update failed') });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.update = updateMock;
      mockSupabase.from.mockReturnValue(q);

      await expect(patchGatePassStatus('gp1', 'rejected')).rejects.toThrow('update failed');
    });
  });

  // ── rpcScanGatePass ────────────────────────────────────────
  describe('rpcScanGatePass', () => {
    it('calls server_scan_gate_pass RPC and returns message', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: { message: 'Keluar berhasil' }, error: null });

      const result = await rpcScanGatePass('qr-1');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('server_scan_gate_pass', { p_qr_token: 'qr-1' });
      expect(result).toBe('Keluar berhasil');
    });

    it('returns fallback message when data has no message field', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      const result = await rpcScanGatePass('qr-1');

      expect(result).toBe('Scan berhasil');
    });

    it('throws on RPC error', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: new Error('QR tidak valid') });

      await expect(rpcScanGatePass('bad')).rejects.toThrow('QR tidak valid');
    });
  });
});
