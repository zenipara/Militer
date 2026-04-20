import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Notification from '../components/common/Notification';
import { isSupabaseConfigured } from '../lib/supabase';
import { usePlatformStore } from '../store/platformStore';

const ROLE_DEFAULT_PATH = {
  admin: '/admin/dashboard',
  komandan: '/komandan/dashboard',
  prajurit: '/prajurit/dashboard',
  guard: '/guard/gatepass-scan',
  staf: '/staf/dashboard',
} as const;

export default function Login() {
  const { login, isAuthenticated, user, isLoading, error, clearError } = useAuthStore();
  const { settings } = usePlatformStore();
  const navigate = useNavigate();

  const [nrp, setNrp] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = ROLE_DEFAULT_PATH[user.role] ?? '/login';
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
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
              {' '}di environment deployment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="desktop-shell min-h-screen bg-military-dark p-4 sm:p-6">
      <Notification />
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Hero — desktop only */}
        <section className="hidden lg:block">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-primary/20 bg-white/80 px-4 py-2 text-sm text-text-muted backdrop-blur-sm dark:bg-bg-card/60 shadow-sm">
              <span className="grid h-7 w-7 place-items-center rounded-xl bg-gradient-to-br from-primary to-blue-700 text-white text-xs shadow-md shadow-primary/30">◈</span>
              Operational Command Platform
            </div>
            <h1 className="max-w-xl text-4xl font-extrabold leading-[1.15] tracking-tight text-text-primary xl:text-5xl">
              {settings.platformName}{' '}
              <span className="bg-gradient-to-r from-primary via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                membantu komando
              </span>{' '}
              lebih cepat, rapi, dan terukur.
            </h1>
            <p className="max-w-lg text-sm text-text-muted leading-relaxed xl:text-base">
              Dashboard terpadu untuk personel, tugas, kehadiran, dan logistik — pengalaman setara software SaaS modern.
            </p>
            <div className="grid max-w-lg grid-cols-3 gap-3 pt-2">
              {[
                { title: 'Realtime', desc: 'Status personel aktif', icon: '⚡' },
                { title: 'Secure', desc: 'PIN & session policy', icon: '🔒' },
                { title: 'Integrated', desc: 'Tugas & audit log', icon: '🔗' },
              ].map((item) => (
                <div key={item.title} className="app-card px-3 py-4 text-center transition-all duration-200 hover:-translate-y-0.5">
                  <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                  <p className="mt-2 text-sm font-bold text-text-primary">{item.title}</p>
                  <p className="mt-0.5 text-xs text-text-muted">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Login form */}
        <section className="mx-auto w-full max-w-sm lg:max-w-md">
          {/* Mobile-only feature chips (hidden on desktop) */}
          <div className="mb-4 flex flex-wrap justify-center gap-2 lg:hidden">
            {[
              { label: 'Realtime', icon: '⚡' },
              { label: 'Secure', icon: '🔒' },
              { label: 'Terintegrasi', icon: '🔗' },
            ].map((chip) => (
              <span key={chip.label} className="chip">
                <span aria-hidden="true">{chip.icon}</span>
                {chip.label}
              </span>
            ))}
          </div>
          <div className="app-card overflow-hidden p-0">
            {/* Card gradient top bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-primary via-blue-500 to-indigo-400" aria-hidden="true" />
            <div className="p-7 sm:p-8">
              <div className="mb-6 text-center lg:text-left">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-700 shadow-lg shadow-primary/30">
                  {settings.platformLogoUrl ? (
                    <img
                      src={settings.platformLogoUrl}
                      alt={settings.platformName}
                      className="h-10 w-10 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="text-2xl text-white">◈</span>
                  )}
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-text-primary">Masuk ke Sistem</h2>
                <p className="mt-1 text-sm text-text-muted">{settings.platformName} — {settings.platformTagline}</p>
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
                  helpText={pin.length > 0 && pin.length < 6 ? `${pin.length}/6 digit` : undefined}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-all duration-150 hover:text-text-primary hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:hover:bg-surface/60"
                      aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                    >
                      {showPin
                        ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                        : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  }
                />

                {displayError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-xl border border-accent-red/30 bg-accent-red/8 p-3.5 animate-scale-in"
                  >
                    <span className="mt-0.5 flex-shrink-0 text-accent-red" aria-hidden="true">⚠</span>
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
          </div>

          <p className="mt-4 text-center text-xs text-text-muted lg:text-left">
            © 2026 {settings.platformName} — Sistem Manajemen Operasional
          </p>
        </section>
      </div>
    </div>
  );
}
