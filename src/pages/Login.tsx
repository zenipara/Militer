import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Notification from '../components/common/Notification';
import { isSupabaseConfigured } from '../lib/supabase';

const ROLE_DEFAULT_PATH = {
  admin: '/admin/dashboard',
  komandan: '/komandan/dashboard',
  prajurit: '/prajurit/dashboard',
} as const;

export default function Login() {
  const { login, isAuthenticated, user, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const [nrp, setNrp] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(ROLE_DEFAULT_PATH[user.role], { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!nrp.trim()) {
      setLocalError('NRP tidak boleh kosong');
      return;
    }
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setLocalError('PIN harus 6 digit angka');
      return;
    }

    try {
      await login(nrp.trim(), pin);
    } catch {
      // error is handled by store
    }
  };

  const displayError = localError ?? error;

  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-military-dark p-6">
        <div className="w-full max-w-md space-y-5 rounded-2xl border border-accent-red/30 bg-bg-card p-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent-red/15">
            <span className="text-3xl">⚠</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Konfigurasi Tidak Lengkap</h1>
            <p className="mt-2 text-sm text-text-muted">
              Environment variables Supabase belum dikonfigurasi. Hubungi Administrator untuk mengatur{' '}
              <code className="rounded bg-surface px-1 py-0.5 text-xs text-accent-red">VITE_SUPABASE_URL</code>
              {' '}dan{' '}
              <code className="rounded bg-surface px-1 py-0.5 text-xs text-accent-red">VITE_SUPABASE_ANON_KEY</code>
              {' '}di Netlify.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="desktop-shell min-h-screen bg-military-dark p-4 sm:p-6">
      <Notification />
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="hidden lg:block">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-3 rounded-xl border border-surface bg-white/75 px-4 py-2 text-sm text-text-muted backdrop-blur-sm dark:bg-bg-card/65">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/20 text-primary">◈</span>
              Modern Operational Workspace
            </div>
            <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-text-primary xl:text-5xl">
              KARYO OS membantu komando operasional lebih cepat, rapi, dan terukur.
            </h1>
            <p className="max-w-lg text-sm text-text-muted xl:text-base">
              Dashboard terpadu untuk personel, tugas, kehadiran, dan logistik dengan pengalaman setara software SaaS modern.
            </p>
            <div className="grid max-w-lg grid-cols-3 gap-3 pt-2">
              {[
                { title: 'Realtime', desc: 'Status personel aktif' },
                { title: 'Secure', desc: 'PIN dan session policy' },
                { title: 'Integrated', desc: 'Tugas dan audit log' },
              ].map((item) => (
                <div key={item.title} className="app-card px-3 py-3">
                  <p className="text-sm font-bold text-text-primary">{item.title}</p>
                  <p className="mt-1 text-xs text-text-muted">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-sm lg:max-w-md">
          <div className="app-card p-7 sm:p-8">
            <div className="mb-6 text-center lg:text-left">
              <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/35 bg-primary/12">
                <span className="text-2xl text-primary">◈</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-text-primary">Masuk ke Sistem</h2>
              <p className="mt-1 text-sm text-text-muted">KARYO OS Command and Battalion Tracking</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Input
                label="NRP"
                id="nrp"
                type="text"
                inputMode="numeric"
                maxLength={20}
                placeholder="Nomor Registrasi Pokok"
                value={nrp}
                onChange={(e) => {
                  setNrp(e.target.value.replace(/\D/g, ''));
                  setLocalError(null);
                  clearError();
                }}
                autoComplete="username"
                required
                aria-label="Nomor Registrasi Pokok"
              />

              <Input
                label="PIN"
                id="pin"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                placeholder="6 digit PIN"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setLocalError(null);
                  clearError();
                }}
                autoComplete="current-password"
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-xs text-text-muted transition-colors hover:text-text-primary"
                    aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                  >
                    {showPin ? '🙈' : '👁'}
                  </button>
                }
              />

              {displayError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-accent-red/30 bg-accent-red/10 p-3"
                >
                  <span className="flex-1 text-sm font-medium text-accent-red">{displayError}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="mt-2 w-full"
              >
                {isLoading ? 'Memverifikasi...' : 'Masuk'}
              </Button>
            </form>

            <p className="mt-5 text-center text-xs text-text-muted lg:text-left">
              Lupa PIN? Hubungi Administrator satuan Anda.
            </p>
          </div>

          <p className="mt-5 text-center text-xs text-text-muted lg:text-left">
            © 2026 KARYO OS — Sistem Manajemen Operasional Militer
          </p>
        </section>
      </div>
    </div>
  );
}
