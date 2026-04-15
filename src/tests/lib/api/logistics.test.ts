import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import {
  fetchLogisticsRequests,
  insertLogisticsRequest,
  patchLogisticsRequestStatus,
} from '../../lib/api/logistics';
import type { LogisticsRequest } from '../../types';

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
};

const sampleRequests: LogisticsRequest[] = [
  {
    id: 'req1', nama_item: 'Peluru', jumlah: 100, satuan_item: 'butir',
    alasan: 'Latihan', requested_by: 'u1', satuan: 'Satuan A',
    status: 'pending', created_at: '2024-01-01T00:00:00Z',
  },
] as LogisticsRequest[];

function buildQuery(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  q.select = chain;
  q.eq = chain;
  q.order = chain;
  q.update = vi.fn(() => q);
  q.insert = vi.fn(() => Promise.resolve(result));
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  q.catch = (reject: (e: unknown) => unknown) => Promise.resolve(result).catch(reject);
  return q;
}

describe('logistics API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── fetchLogisticsRequests ────────────────────────────────
  describe('fetchLogisticsRequests', () => {
    it('returns list of logistics requests', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: sampleRequests, error: null }));

      const result = await fetchLogisticsRequests();

      expect(mockSupabase.from).toHaveBeenCalledWith('logistics_requests');
      expect(result).toHaveLength(1);
      expect(result[0].nama_item).toBe('Peluru');
    });

    it('returns empty array when data is null', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: null }));

      const result = await fetchLogisticsRequests();

      expect(result).toEqual([]);
    });

    it('throws on supabase error', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: new Error('fetch error') }));

      await expect(fetchLogisticsRequests()).rejects.toThrow('fetch error');
    });
  });

  // ── insertLogisticsRequest ────────────────────────────────
  describe('insertLogisticsRequest', () => {
    it('inserts request with status pending', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.insert = insertMock;
      mockSupabase.from.mockReturnValue(q);

      await insertLogisticsRequest({
        nama_item: 'Seragam', jumlah: 5, alasan: 'Rusak',
        requested_by: 'u1', satuan: 'Satuan B',
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ nama_item: 'Seragam', status: 'pending', requested_by: 'u1' })
      );
    });

    it('throws when insert fails', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: new Error('insert failed') });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.insert = insertMock;
      mockSupabase.from.mockReturnValue(q);

      await expect(
        insertLogisticsRequest({ nama_item: 'X', jumlah: 1, alasan: 'Y', requested_by: 'u1', satuan: 'A' })
      ).rejects.toThrow('insert failed');
    });
  });

  // ── patchLogisticsRequestStatus ───────────────────────────
  describe('patchLogisticsRequestStatus', () => {
    it('updates status to approved with reviewer info', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.update = updateMock;
      mockSupabase.from.mockReturnValue(q);

      await patchLogisticsRequestStatus('req1', 'approved', 'u2', 'Disetujui');

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved',
          reviewed_by: 'u2',
          admin_note: 'Disetujui',
          reviewed_at: expect.any(String),
        })
      );
      expect(eqMock).toHaveBeenCalledWith('id', 'req1');
    });

    it('uses null for admin_note when not provided', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.update = updateMock;
      mockSupabase.from.mockReturnValue(q);

      await patchLogisticsRequestStatus('req1', 'rejected', 'u2');

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ admin_note: null })
      );
    });

    it('throws when update fails', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: new Error('update failed') });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const q = buildQuery({ data: null, error: null }) as Record<string, unknown>;
      q.update = updateMock;
      mockSupabase.from.mockReturnValue(q);

      await expect(
        patchLogisticsRequestStatus('req1', 'approved', 'u2')
      ).rejects.toThrow('update failed');
    });
  });
});
