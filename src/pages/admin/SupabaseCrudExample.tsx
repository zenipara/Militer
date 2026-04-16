import { FormEvent, useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type AnnouncementItem = {
  id: string;
  judul: string;
  isi: string;
  created_at: string;
};

export default function SupabaseCrudExample() {
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: selectError } = await supabase
      .from('announcements')
      .select('id, judul, isi, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (selectError) {
      setError(selectError.message);
      setItems([]);
      setIsLoading(false);
      return;
    }

    setItems(data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!judul.trim() || !isi.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from('announcements').insert({
      judul: judul.trim(),
      isi: isi.trim(),
      target_role: ['admin'],
    });

    if (insertError) {
      setError(insertError.message);
      setIsSubmitting(false);
      return;
    }

    setJudul('');
    setIsi('');
    setIsSubmitting(false);
    await loadItems();
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-text-primary">Supabase CRUD Example</h1>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-surface bg-bg-card p-4">
        <div>
          <label htmlFor="judul" className="mb-1 block text-sm text-text-muted">
            Judul
          </label>
          <input
            id="judul"
            value={judul}
            onChange={(event) => setJudul(event.target.value)}
            className="w-full rounded-lg border border-surface bg-military-dark px-3 py-2 text-text-primary"
            placeholder="Tulis judul"
            required
          />
        </div>
        <div>
          <label htmlFor="isi" className="mb-1 block text-sm text-text-muted">
            Isi
          </label>
          <textarea
            id="isi"
            value={isi}
            onChange={(event) => setIsi(event.target.value)}
            className="min-h-24 w-full rounded-lg border border-surface bg-military-dark px-3 py-2 text-text-primary"
            placeholder="Tulis isi"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:opacity-60"
        >
          {isSubmitting ? 'Menyimpan...' : 'Insert'}
        </button>
      </form>

      <section className="rounded-xl border border-surface bg-bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Data (Select)</h2>
          <button
            onClick={() => void loadItems()}
            className="rounded-lg border border-surface px-3 py-1.5 text-sm text-text-primary"
          >
            Refresh
          </button>
        </div>

        {error && <p className="mb-3 rounded-lg bg-accent-red/10 p-3 text-sm text-accent-red">{error}</p>}
        {isLoading ? (
          <p className="text-text-muted">Loading...</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border border-surface p-3">
                <p className="font-semibold text-text-primary">{item.judul}</p>
                <p className="mt-1 text-sm text-text-muted">{item.isi}</p>
              </li>
            ))}
            {items.length === 0 && <p className="text-text-muted">Belum ada data.</p>}
          </ul>
        )}
      </section>
    </div>
  );
}
