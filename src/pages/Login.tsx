import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Notification from '../components/common/Notification';

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

  return (
    <div className="min-h-screen bg-military-dark flex items-center justify-center p-4">
      <Notification />
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/50 mb-4">
            <span className="text-4xl">🪖</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">KARYO OS</h1>
          <p className="text-sm text-text-muted mt-1">Command & Battalion Tracking System</p>
        </div>

        {/* Card */}
        <div className="bg-bg-card border border-surface rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-text-primary mb-5">Masuk ke Sistem</h2>

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
                  className="text-xs text-text-muted hover:text-text-primary transition-colors"
                  aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                >
                  {showPin ? '🙈' : '👁'}
                </button>
              }
            />

            {displayError && (
              <div
                role="alert"
                className="flex items-start gap-2 p-3 rounded-lg bg-accent-red/10 border border-accent-red/30"
              >
                <span className="text-accent-red text-sm font-medium flex-1">{displayError}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
            >
              {isLoading ? 'Memverifikasi...' : 'Masuk'}
            </Button>
          </form>

          <p className="text-xs text-text-muted text-center mt-5">
            Lupa PIN? Hubungi Administrator satuan Anda.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-text-muted mt-6">
          © 2026 KARYO OS — Sistem Manajemen Operasional Militer
        </p>
      </div>
    </div>
  );
}
