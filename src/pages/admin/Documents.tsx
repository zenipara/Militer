import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/ui/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { useUIStore } from '../../store/uiStore';
import { supabase } from '../../lib/supabase';
import type { Document } from '../../types';

export default function Documents() {
  const { showNotification } = useUIStore();
  const [docs, setDocs] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<{
    nama: string;
    kategori: string;
    file_url: string;
    satuan: string;
    file_size: string;
  }>({ nama: '', kategori: '', file_url: '', satuan: '', file_size: '' });

  const fetchDocs = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('documents')
      .select('*, uploader:uploaded_by(id,nama,nrp)')
      .order('created_at', { ascending: false });
    setDocs((data as Document[]) ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => { void fetchDocs(); }, [fetchDocs]);

  const categories = [...new Set(docs.map((d) => d.kategori).filter(Boolean))] as string[];

  const filtered = docs.filter((d) => {
    const matchSearch = !search || d.nama.toLowerCase().includes(search.toLowerCase());
    const matchKat = !filterKategori || d.kategori === filterKategori;
    return matchSearch && matchKat;
  });

  const handleCreate = async () => {
    if (!form.nama || !form.file_url) {
      showNotification('Nama dan URL file wajib diisi', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.from('documents').insert({
        nama: form.nama,
        kategori: form.kategori || null,
        file_url: form.file_url,
        satuan: form.satuan || null,
        file_size: form.file_size ? Number(form.file_size) : null,
      });
      if (error) throw error;
      showNotification('Dokumen berhasil ditambahkan', 'success');
      setShowCreate(false);
      setForm({ nama: '', kategori: '', file_url: '', satuan: '', file_size: '' });
      await fetchDocs();
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal menyimpan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus dokumen ini?')) return;
    try {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
      showNotification('Dokumen dihapus', 'success');
      await fetchDocs();
    } catch {
      showNotification('Gagal menghapus dokumen', 'error');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <DashboardLayout title="Arsip Dokumen">
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Cari nama dokumen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-surface bg-bg-card px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="rounded-lg border border-surface bg-bg-card px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">Semua Kategori</option>
            {categories.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <Button onClick={() => setShowCreate(true)}>+ Tambah Dokumen</Button>
        </div>

        <Table<Document>
          columns={[
            {
              key: 'nama',
              header: 'Nama Dokumen',
              render: (d) => (
                <div>
                  <p className="font-medium text-text-primary">{d.nama}</p>
                  {d.kategori && <p className="text-xs text-text-muted">{d.kategori}</p>}
                </div>
              ),
            },
            { key: 'satuan', header: 'Satuan', render: (d) => d.satuan ?? '—' },
            { key: 'file_size', header: 'Ukuran', render: (d) => formatFileSize(d.file_size) },
            {
              key: 'uploader',
              header: 'Diunggah oleh',
              render: (d) => d.uploader?.nama ?? '—',
            },
            {
              key: 'created_at',
              header: 'Tanggal',
              render: (d) => new Date(d.created_at).toLocaleDateString('id-ID'),
            },
            {
              key: 'actions',
              header: 'Aksi',
              render: (d) => (
                <div className="flex items-center gap-2">
                  <a
                    href={d.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm hover:underline"
                  >
                    Unduh
                  </a>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(d.id)}>
                    Hapus
                  </Button>
                </div>
              ),
            },
          ]}
          data={filtered}
          keyExtractor={(d) => d.id}
          isLoading={isLoading}
          emptyMessage="Belum ada dokumen"
        />
      </div>

      {/* Add Document Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Tambah Dokumen"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button onClick={handleCreate} isLoading={isSaving}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nama Dokumen *"
            type="text"
            value={form.nama}
            onChange={(e) => setForm({ ...form, nama: e.target.value })}
            required
          />
          <Input
            label="Kategori"
            type="text"
            placeholder="SK, SOP, Laporan, dll."
            value={form.kategori}
            onChange={(e) => setForm({ ...form, kategori: e.target.value })}
          />
          <Input
            label="URL File *"
            type="url"
            placeholder="https://..."
            value={form.file_url}
            onChange={(e) => setForm({ ...form, file_url: e.target.value })}
            required
            helpText="Link dari Supabase Storage atau URL eksternal"
          />
          <Input
            label="Satuan"
            type="text"
            value={form.satuan}
            onChange={(e) => setForm({ ...form, satuan: e.target.value })}
          />
          <Input
            label="Ukuran File (bytes)"
            type="number"
            min="0"
            value={form.file_size}
            onChange={(e) => setForm({ ...form, file_size: e.target.value })}
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
}
