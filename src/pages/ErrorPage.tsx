import { useNavigate, useLocation, Link } from 'react-router-dom';

interface LocationState {
  message?: string;
  code?: string;
}

/**
 * Halaman error fallback yang informatif.
 * Bisa diakses langsung di /error atau digunakan sebagai target redirect.
 *
 * Contoh redirect: navigate('/error', { state: { message: 'Sesi telah berakhir', code: '401' } })
 */
export default function ErrorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const message = state?.message ?? 'Terjadi kesalahan yang tidak terduga.';
  const code = state?.code ?? '500';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-military-dark p-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-accent-red/30 bg-bg-card p-8 text-center">
        {/* Icon */}
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-accent-red/15">
          <span className="text-4xl">⚠️</span>
        </div>

        {/* Error code + title */}
        <div>
          <p className="text-5xl font-black text-accent-red">{code}</p>
          <h1 className="mt-2 text-xl font-bold text-text-primary">Terjadi Kesalahan Sistem</h1>
          <p className="mt-3 text-sm text-text-muted">{message}</p>
        </div>

        {/* Help text */}
        <div className="rounded-xl border border-surface/70 bg-surface/20 px-4 py-3 text-left text-xs text-text-muted space-y-1">
          <p className="font-semibold text-text-primary">Langkah berikutnya:</p>
          <ul className="list-inside list-disc space-y-0.5">
            <li>Muat ulang halaman dan coba lagi</li>
            <li>Pastikan koneksi internet stabil</li>
            <li>Jika masalah berlanjut, hubungi Administrator</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Muat Ulang Halaman
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full rounded-xl border border-surface/70 px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:border-primary"
          >
            Kembali
          </button>
          <Link
            to="/login"
            className="w-full rounded-xl border border-surface/70 px-4 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:border-primary hover:text-text-primary"
          >
            Kembali ke Login
          </Link>
        </div>
      </div>

      <p className="mt-6 text-xs text-text-muted">
        KARYO OS v1.2.1 — Jika masalah berlanjut, hubungi Administrator.
      </p>
    </div>
  );
}
