import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Upload, AlertTriangle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { supabase } from '../../lib/supabase';
import { clearAuditLogs } from '../../lib/api/auditLogs';
import { handleError } from '../../lib/handleError';
import { notifyDataChanged } from '../../lib/dataSync';
import { useAuthStore } from '../../store/authStore';
import { DEFAULT_FEATURE_FLAGS, FEATURE_DEFINITIONS, type FeatureKey } from '../../lib/featureFlags';
import { useFeatureStore } from '../../store/featureStore';
import { usePlatformStore } from '../../store/platformStore';
import { useUIStore } from '../../store/uiStore';
import { clearAuditLogsCache } from '../../hooks/useAuditLogs';

/** Tables included in backup/restore. Ordered to satisfy FK constraints on restore. */
const BACKUP_TABLES = [
  'users',
  'announcements',
  'tasks',
  'attendance',
  'shift_schedules',
  'leave_requests',
  'logistics_requests',
  'messages',
] as const;

type BackupTable = (typeof BACKUP_TABLES)[number];

interface BackupData {
  version: string;
  exported_at: string;
  satuan: string;
  tables: Partial<Record<BackupTable, unknown[]>>;
}

type AuditClearRange = '7d' | '30d' | '90d' | 'all';

/** Supported backup format versions for restore compatibility */
const SUPPORTED_BACKUP_VERSIONS = ['1.0', '1.2'] as const;

/** Download a JS object as a .json file */
function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Settings() {
  const { user } = useAuthStore();
  const {
    isDarkMode,
    toggleDarkMode,
    notificationsEnabled,
    setNotificationsEnabled,
    displayDensity,
    setDisplayDensity,
    toggleDisplayDensity,
    dashboardAutoRefreshEnabled,
    setDashboardAutoRefreshEnabled,
    dashboardAutoRefreshMinutes,
    setDashboardAutoRefreshMinutes,
    sidebarOpen,
    setSidebarOpen,
    showNotification,
  } = useUIStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [auditClearRange, setAuditClearRange] = useState<AuditClearRange>('all');
  const [restorePreview, setRestorePreview] = useState<BackupData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const { settings, updatePlatformBranding, isSaving: isSavingBranding } = usePlatformStore();
  const {
    flags,
    isLoading: isFeatureFlagsLoading,
    isSaving: isFeatureFlagsSaving,
    setFeatureEnabled,
    setFeatureFlags,
    setAllFeaturesEnabled,
  } = useFeatureStore();
  const [featureFilter, setFeatureFilter] = useState('');
  const [platformNameInput, setPlatformNameInput] = useState(settings.platformName);
  const [platformTaglineInput, setPlatformTaglineInput] = useState(settings.platformTagline);
  const [platformLogoInput, setPlatformLogoInput] = useState(settings.platformLogoUrl ?? '');

  // ── Backup otomatis terjadwal ──────────────────────────────────────────────
  const AUTO_BACKUP_KEY = 'karyo_auto_backup_enabled';
  const AUTO_BACKUP_INTERVAL_KEY = 'karyo_auto_backup_interval_days';
  const AUTO_BACKUP_LAST_KEY = 'karyo_auto_backup_last_at';

  const [autoBackupEnabled, setAutoBackupEnabled] = useState<boolean>(() => {
    return localStorage.getItem(AUTO_BACKUP_KEY) === 'true';
  });
  const [autoBackupIntervalDays, setAutoBackupIntervalDays] = useState<number>(() => {
    return Number(localStorage.getItem(AUTO_BACKUP_INTERVAL_KEY) ?? '7');
  });
  const [lastAutoBackupAt, setLastAutoBackupAt] = useState<string | null>(() => {
    return localStorage.getItem(AUTO_BACKUP_LAST_KEY);
  });
  const [isAutoExporting, setIsAutoExporting] = useState(false);

  const nextAutoBackupDue = useMemo<Date | null>(() => {
    if (!autoBackupEnabled || !lastAutoBackupAt) return null;
    const last = new Date(lastAutoBackupAt);
    last.setDate(last.getDate() + autoBackupIntervalDays);
    return last;
  }, [autoBackupEnabled, lastAutoBackupAt, autoBackupIntervalDays]);

  const isAutoBackupOverdue = useMemo<boolean>(() => {
    if (!autoBackupEnabled) return false;
    if (!nextAutoBackupDue) return true; // never backed up
    return new Date() >= nextAutoBackupDue;
  }, [autoBackupEnabled, nextAutoBackupDue]);

  const saveAutoBackupPrefs = (enabled: boolean, intervalDays: number) => {
    localStorage.setItem(AUTO_BACKUP_KEY, String(enabled));
    localStorage.setItem(AUTO_BACKUP_INTERVAL_KEY, String(intervalDays));
  };

  const handleAutoBackupToggle = (next: boolean) => {
    setAutoBackupEnabled(next);
    saveAutoBackupPrefs(next, autoBackupIntervalDays);
  };

  const handleAutoBackupIntervalChange = (days: number) => {
    setAutoBackupIntervalDays(days);
    saveAutoBackupPrefs(autoBackupEnabled, days);
  };

  const triggerAutoBackup = async () => {
    if (isAutoExporting) return;
    setIsAutoExporting(true);
    try {
      const { data, error } = await supabase.rpc('api_export_backup', {
        p_caller_role: user?.role,
        p_satuan: user?.satuan ?? null,
      });
      if (error) throw new Error(`Gagal backup otomatis: ${error.message}`);
      const backup = (data as BackupData | null) ?? null;
      if (!backup?.tables) throw new Error('Payload backup tidak valid');
      const filename = `karyo_autobackup_${new Date().toISOString().slice(0, 10)}.json`;
      downloadJson(backup, filename);
      const now = new Date().toISOString();
      setLastAutoBackupAt(now);
      localStorage.setItem(AUTO_BACKUP_LAST_KEY, now);
      showNotification('Backup otomatis berhasil diunduh', 'success');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal backup otomatis', 'error');
    } finally {
      setIsAutoExporting(false);
    }
  };

  // Check auto-backup due on mount and every hour
  useEffect(() => {
    if (!autoBackupEnabled) return;
    if (isAutoBackupOverdue) void triggerAutoBackup();

    const intervalId = window.setInterval(() => {
      if (isAutoBackupOverdue) void triggerAutoBackup();
    }, 3600000); // re-check every 1 hour

    return () => window.clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoBackupEnabled, isAutoBackupOverdue]);
  // ── End backup otomatis ────────────────────────────────────────────────────

  useEffect(() => {
    setPlatformNameInput(settings.platformName);
    setPlatformTaglineInput(settings.platformTagline);
    setPlatformLogoInput(settings.platformLogoUrl ?? '');
  }, [settings]);

  const featureStats = useMemo(() => {
    const activeCount = FEATURE_DEFINITIONS.filter((item) => flags[item.key]).length;
    const inactiveCount = FEATURE_DEFINITIONS.length - activeCount;
    return { activeCount, inactiveCount };
  }, [flags]);

  const filteredFeatures = useMemo(() => {
    const query = featureFilter.trim().toLowerCase();
    if (!query) return FEATURE_DEFINITIONS;

    return FEATURE_DEFINITIONS.filter((feature) => {
      const haystack = `${feature.label} ${feature.description} ${feature.key}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [featureFilter]);

  /** Export all tables as a single JSON backup file */
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.rpc('api_export_backup', {
        p_caller_role: user?.role,
        p_satuan: user?.satuan ?? null,
      });
      if (error) throw new Error(`Gagal membuat backup: ${error.message}`);

      const backup = (data as BackupData | null) ?? null;
      if (!backup?.tables) throw new Error('Payload backup tidak valid');

      const filename = `karyo_backup_${new Date().toISOString().slice(0, 10)}.json`;
      downloadJson(backup, filename);
      showNotification('Backup berhasil diunduh', 'success');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal membuat backup', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  /** User selects a .json file — parse & preview it */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as BackupData;
        if (!parsed.version || !parsed.tables) throw new Error('Format file tidak valid');
        if (!(SUPPORTED_BACKUP_VERSIONS as readonly string[]).includes(parsed.version)) {
          throw new Error(`Versi backup v${parsed.version} tidak didukung. Versi yang didukung: ${SUPPORTED_BACKUP_VERSIONS.join(', ')}`);
        }
        setRestorePreview(parsed);
        setShowRestoreModal(true);
      } catch {
        showNotification('File backup tidak valid atau rusak', 'error');
        
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /** Upsert all rows from backup file, table by table */
  const handleRestore = async () => {
    if (!restorePreview) return;
    setIsRestoring(true);
    try {
      const { error } = await supabase.rpc('api_restore_backup', {
        p_caller_role: user?.role,
        p_tables: restorePreview.tables,
      });
      if (error) throw new Error(`Gagal merestore data: ${error.message}`);

      showNotification('Data berhasil dipulihkan dari backup', 'success');
      setShowRestoreModal(false);
      setRestorePreview(null);
      
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal merestore data', 'error');
    } finally {
      setIsRestoring(false);
    }
  };


  const restoreRecommendedDefaults = () => {
    if (!isDarkMode) toggleDarkMode();
    setNotificationsEnabled(true);
    setDisplayDensity('comfortable');
    setDashboardAutoRefreshEnabled(true);
    setDashboardAutoRefreshMinutes(3);
    setSidebarOpen(true);
  };

  const handleBrandingSave = async () => {
    const normalizedName = platformNameInput.trim();
    if (!normalizedName) {
      showNotification('Nama platform tidak boleh kosong', 'error');
      return;
    }

    try {
      await updatePlatformBranding({
        platformName: normalizedName,
        platformTagline: platformTaglineInput.trim() || 'Command and Battalion Tracking',
        platformLogoUrl: platformLogoInput.trim() || null,
      });
      showNotification('Branding platform berhasil diperbarui', 'success');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Gagal menyimpan branding platform', 'error');
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('File logo harus berupa gambar', 'error');
      return;
    }

    if (file.size > 1024 * 1024) {
      showNotification('Ukuran logo maksimal 1MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = String(ev.target?.result ?? '');
      if (!dataUrl.startsWith('data:image/')) {
        showNotification('Format file logo tidak valid', 'error');
        return;
      }
      setPlatformLogoInput(dataUrl);
      showNotification('Logo berhasil dipilih, klik Simpan Branding untuk menerapkan', 'info');
    };
    reader.readAsDataURL(file);

    if (logoFileInputRef.current) logoFileInputRef.current.value = '';
  };

  const handleFeatureToggle = async (featureKey: FeatureKey, nextValue: boolean) => {
    try {
      await setFeatureEnabled(featureKey, nextValue);
      showNotification(
        `Fitur ${FEATURE_DEFINITIONS.find((item) => item.key === featureKey)?.label ?? featureKey} ${nextValue ? 'diaktifkan' : 'dinonaktifkan'}`,
        'success',
      );
    } catch (error) {
      showNotification(handleError(error, 'Gagal memperbarui pengaturan fitur'), 'error');
    }
  };

  const handleClearActivityHistory = async () => {
    if (!user) {
      showNotification('Sesi tidak valid. Silakan login ulang.', 'error');
      return;
    }

    setIsClearingHistory(true);
    try {
      const olderThanDays = auditClearRange === 'all' ? null : Number(auditClearRange.replace('d', ''));
      const deletedCount = await clearAuditLogs(user.id, user.role, olderThanDays);
      clearAuditLogsCache();
      notifyDataChanged('audit_logs');
      setShowClearHistoryModal(false);
      const scopeLabel = auditClearRange === 'all' ? 'semua riwayat' : `riwayat lebih dari ${olderThanDays} hari`;
      showNotification(`Berhasil menghapus ${scopeLabel} (${deletedCount} catatan)`, 'success');
    } catch (error) {
      showNotification(handleError(error, 'Gagal menghapus riwayat aktivitas'), 'error');
    } finally {
      setIsClearingHistory(false);
    }
  };

  const handleBulkFeatureAction = async (action: 'enable-all' | 'disable-all' | 'restore-default') => {
    try {
      if (action === 'enable-all') {
        await setAllFeaturesEnabled(true);
      } else if (action === 'disable-all') {
        await setAllFeaturesEnabled(false);
      } else {
        await setFeatureFlags(DEFAULT_FEATURE_FLAGS);
      }

      const message =
        action === 'enable-all'
          ? 'Semua modul fitur berhasil diaktifkan'
          : action === 'disable-all'
            ? 'Semua modul fitur berhasil dinonaktifkan'
            : 'Konfigurasi fitur dikembalikan ke default';

      showNotification(message, 'success');
    } catch (error) {
      showNotification(handleError(error, 'Gagal memperbarui kontrol fitur global'), 'error');
    }
  };

  return (
    <DashboardLayout title="Pengaturan Sistem">
      <div className="space-y-6 max-w-4xl">
        <PageHeader
          title="Pengaturan Sistem"
          subtitle="Atur tampilan, notifikasi, dan perilaku dashboard agar lebih sesuai kebutuhan operasional."
          meta={
            <>
              <span>{isDarkMode ? 'Mode gelap aktif' : 'Mode terang aktif'}</span>
              <span>{dashboardAutoRefreshEnabled ? `Auto refresh ${dashboardAutoRefreshMinutes} menit` : 'Auto refresh nonaktif'}</span>
            </>
          }
          actions={<Button variant="outline" onClick={restoreRecommendedDefaults}>Kembalikan Rekomendasi</Button>}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="app-card p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold tracking-tight text-text-primary">Branding Platform</h2>
              <Button
                size="sm"
                onClick={() => { void handleBrandingSave(); }}
                disabled={isSavingBranding}
              >
                {isSavingBranding ? 'Menyimpan...' : 'Simpan Branding'}
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="platform-name" className="text-sm font-semibold text-text-primary">Nama Platform</label>
                <input
                  id="platform-name"
                  type="text"
                  className="form-control mt-1"
                  value={platformNameInput}
                  onChange={(e) => setPlatformNameInput(e.target.value)}
                  placeholder="Contoh: KARYO OS"
                  maxLength={60}
                />
              </div>

              <div>
                <label htmlFor="platform-tagline" className="text-sm font-semibold text-text-primary">Tagline Platform</label>
                <input
                  id="platform-tagline"
                  type="text"
                  className="form-control mt-1"
                  value={platformTaglineInput}
                  onChange={(e) => setPlatformTaglineInput(e.target.value)}
                  placeholder="Contoh: Command and Battalion Tracking"
                  maxLength={120}
                />
              </div>

              <div>
                <label htmlFor="platform-logo-url" className="text-sm font-semibold text-text-primary">URL Logo Platform</label>
                <input
                  id="platform-logo-url"
                  type="url"
                  className="form-control mt-1"
                  value={platformLogoInput}
                  onChange={(e) => setPlatformLogoInput(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <p className="mt-1 text-xs text-text-muted">Bisa pakai URL publik atau unggah file gambar di bawah ini.</p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoFileChange}
                />
                <Button size="sm" variant="outline" onClick={() => logoFileInputRef.current?.click()}>
                  Unggah Logo
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPlatformLogoInput('')}
                >
                  Hapus Logo
                </Button>
              </div>

              <div className="rounded-xl border border-surface/70 bg-surface/20 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Preview</p>
                <div className="flex items-center gap-3">
                  {platformLogoInput.trim() ? (
                    <img
                      src={platformLogoInput.trim()}
                      alt={platformNameInput || 'Platform'}
                      className="h-12 w-12 rounded-xl border border-primary/20 bg-primary/10 object-cover"
                    />
                  ) : (
                    <span className="grid h-12 w-12 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-lg text-primary">◈</span>
                  )}
                  <div>
                    <p className="text-sm font-bold text-text-primary">{platformNameInput || 'KARYO OS'}</p>
                    <p className="text-xs uppercase tracking-[0.1em] text-text-muted">{platformTaglineInput || 'Command and Battalion Tracking'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="app-card p-6">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-text-primary">Informasi Sistem</h2>
            <div className="space-y-3">
              {[
                { label: 'Versi Aplikasi', value: 'v1.0.0' },
                { label: 'Platform', value: `${settings.platformName} — ${settings.platformTagline}` },
                { label: 'Satuan', value: user?.satuan ?? '—' },
                { label: 'Admin', value: user?.nama ?? '—' },
                { label: 'NRP Admin', value: user?.nrp ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between border-b border-surface/75 py-2 last:border-0">
                  <span className="text-sm text-text-muted">{label}</span>
                  <span className="text-sm font-semibold text-text-primary">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="app-card p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold tracking-tight text-text-primary">Tampilan</h2>
              <Button size="sm" variant="ghost" onClick={toggleDisplayDensity}>
                {displayDensity === 'compact' ? 'Mode Ringkas' : 'Mode Nyaman'}
              </Button>
            </div>

            <div className="space-y-4">
              <div className="setting-row">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Mode Gelap</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {isDarkMode ? 'Aktif — tampilan dengan latar gelap' : 'Nonaktif — tampilan dengan latar terang'}
                  </p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className="toggle-switch"
                  data-checked={isDarkMode}
                  aria-label="Toggle dark mode"
                  role="switch"
                  aria-checked={isDarkMode}
                >
                  <span />
                </button>
              </div>

              <div className="setting-row">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Kepadatan Tampilan</p>
                  <p className="text-xs text-text-muted mt-0.5">Mengatur jarak antar elemen di dashboard dan panel data.</p>
                </div>
                <div className="seg-control">
                  <button
                    type="button"
                    onClick={() => setDisplayDensity('comfortable')}
                    className={`seg-btn ${displayDensity === 'comfortable' ? 'seg-btn--active' : ''}`}
                  >
                    Nyaman
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayDensity('compact')}
                    className={`seg-btn ${displayDensity === 'compact' ? 'seg-btn--active' : ''}`}
                  >
                    Ringkas
                  </button>
                </div>
              </div>

              <div className="setting-row">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Sidebar Desktop</p>
                  <p className="text-xs text-text-muted mt-0.5">Menjaga sidebar tetap terbuka saat sesi berikutnya.</p>
                </div>
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="toggle-switch"
                  data-checked={sidebarOpen}
                  aria-label="Toggle sidebar preference"
                  role="switch"
                  aria-checked={sidebarOpen}
                >
                  <span />
                </button>
              </div>
            </div>
          </div>

          <div className="app-card p-6">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-text-primary">Notifikasi & Sinkronisasi</h2>
            <div className="space-y-4">
              <div className="setting-row">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Notifikasi Browser</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {notificationsEnabled ? 'Pesan, tugas, dan update realtime akan muncul sebagai notifikasi' : 'Notifikasi browser dinonaktifkan'}
                  </p>
                </div>
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className="toggle-switch"
                  data-checked={notificationsEnabled}
                  aria-label="Toggle notifications"
                  role="switch"
                  aria-checked={notificationsEnabled}
                >
                  <span />
                </button>
              </div>

              <div className="setting-row">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Auto Refresh Dashboard</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {dashboardAutoRefreshEnabled ? 'Dashboard akan memperbarui data secara berkala' : 'Refresh otomatis dimatikan'}
                  </p>
                </div>
                <button
                  onClick={() => setDashboardAutoRefreshEnabled(!dashboardAutoRefreshEnabled)}
                  className="toggle-switch"
                  data-checked={dashboardAutoRefreshEnabled}
                  aria-label="Toggle auto refresh"
                  role="switch"
                  aria-checked={dashboardAutoRefreshEnabled}
                >
                  <span />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <label className="text-sm font-semibold text-text-primary">Interval Refresh</label>
                  <select
                    className="form-control mt-1"
                    value={dashboardAutoRefreshMinutes}
                    onChange={(e) => setDashboardAutoRefreshMinutes(Number(e.target.value))}
                    disabled={!dashboardAutoRefreshEnabled}
                  >
                    <option value={1}>1 menit</option>
                    <option value={3}>3 menit</option>
                    <option value={5}>5 menit</option>
                    <option value={10}>10 menit</option>
                  </select>
                </div>
                <div className="rounded-xl border border-surface/70 bg-bg-card px-4 py-3 text-xs text-text-muted">
                  Interval ini memengaruhi dashboard admin yang menggunakan data realtime.
                </div>
              </div>
            </div>
          </div>

          <div className="app-card p-6 lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-text-primary">Kontrol Fitur</h2>
                <p className="text-sm text-text-muted mt-0.5">Aktifkan atau nonaktifkan modul tertentu secara global untuk seluruh aplikasi.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { void handleBulkFeatureAction('enable-all'); }}
                  disabled={isFeatureFlagsLoading || isFeatureFlagsSaving}
                >
                  Aktifkan Semua
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { void handleBulkFeatureAction('disable-all'); }}
                  disabled={isFeatureFlagsLoading || isFeatureFlagsSaving}
                >
                  Nonaktifkan Semua
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { void handleBulkFeatureAction('restore-default'); }}
                  disabled={isFeatureFlagsLoading || isFeatureFlagsSaving}
                >
                  Pulihkan Default
                </Button>
              </div>
            </div>

            <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
              <div>
                <label htmlFor="feature-filter" className="text-sm font-semibold text-text-primary">Cari Modul</label>
                <input
                  id="feature-filter"
                  type="search"
                  className="form-control mt-1"
                  value={featureFilter}
                  onChange={(e) => setFeatureFilter(e.target.value)}
                  placeholder="Cari nama fitur, deskripsi, atau key"
                />
              </div>
              <div className="rounded-xl border border-surface/70 bg-surface/20 px-4 py-3 text-sm text-text-muted">
                <span className="font-semibold text-text-primary">{featureStats.activeCount}</span> aktif
              </div>
              <div className="rounded-xl border border-surface/70 bg-surface/20 px-4 py-3 text-sm text-text-muted">
                <span className="font-semibold text-text-primary">{featureStats.inactiveCount}</span> nonaktif
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {filteredFeatures.map((feature) => {
                const enabled = flags[feature.key] !== false;
                return (
                  <div key={feature.key} className="rounded-xl border border-surface/70 bg-surface/20 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{feature.label}</p>
                        <p className="text-xs text-text-muted mt-1">{feature.description}</p>
                      </div>
                      <button
                        onClick={() => { void handleFeatureToggle(feature.key, !enabled); }}
                        disabled={isFeatureFlagsLoading || isFeatureFlagsSaving}
                        className="toggle-switch"
                        data-checked={enabled}
                        aria-label={`Toggle ${feature.label}`}
                        role="switch"
                        aria-checked={enabled}
                      >
                        <span />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {!filteredFeatures.length && (
              <div className="mt-4 rounded-xl border border-dashed border-surface/70 bg-bg-card px-4 py-5 text-sm text-text-muted">
                Tidak ada modul yang cocok dengan filter pencarian.
              </div>
            )}
          </div>

          <div className="app-card p-6">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-text-primary">Keamanan Session</h2>
            <div className="space-y-3">
              {[
                { label: 'Durasi Session', value: '8 jam (1 shift)' },
                { label: 'Max Percobaan Login', value: '5 kali' },
                { label: 'Lockout Duration', value: '15 menit' },
                { label: 'PIN Hashing', value: 'bcrypt (Supabase pgcrypto)' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between border-b border-surface/75 py-2 last:border-0">
                  <span className="text-sm text-text-muted">{label}</span>
                  <span className="text-sm font-semibold text-text-primary">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Backup Otomatis Terjadwal ── */}
        <div className="app-card p-6">
          <h2 className="mb-1 text-lg font-bold tracking-tight text-text-primary">Backup Otomatis Terjadwal</h2>
          <p className="mb-5 text-sm text-text-muted">
            Aktifkan pencadangan otomatis agar sistem mengunduh backup setiap periode tertentu saat halaman pengaturan dibuka.
          </p>

          {isAutoBackupOverdue && autoBackupEnabled && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-accent-gold/40 bg-accent-gold/10 p-4">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-accent-gold" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-accent-gold">Backup terjadwal sudah jatuh tempo</p>
                <p className="mt-0.5 text-xs text-accent-gold/90">
                  Backup otomatis akan segera diunduh. Jangan tutup halaman ini.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="setting-row">
              <div>
                <p className="text-sm font-semibold text-text-primary">Backup Otomatis</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {autoBackupEnabled
                    ? `Aktif — backup setiap ${autoBackupIntervalDays} hari`
                    : 'Nonaktif — backup hanya dilakukan secara manual'}
                </p>
              </div>
              <button
                onClick={() => handleAutoBackupToggle(!autoBackupEnabled)}
                className="toggle-switch"
                data-checked={autoBackupEnabled}
                aria-label="Toggle backup otomatis"
                role="switch"
                aria-checked={autoBackupEnabled}
              >
                <span />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div>
                <label htmlFor="auto-backup-interval" className="text-sm font-semibold text-text-primary">
                  Interval Backup
                </label>
                <select
                  id="auto-backup-interval"
                  className="form-control mt-1"
                  value={autoBackupIntervalDays}
                  disabled={!autoBackupEnabled}
                  onChange={(e) => handleAutoBackupIntervalChange(Number(e.target.value))}
                >
                  <option value={1}>Setiap 1 hari</option>
                  <option value={3}>Setiap 3 hari</option>
                  <option value={7}>Setiap 7 hari</option>
                  <option value={14}>Setiap 14 hari</option>
                  <option value={30}>Setiap 30 hari</option>
                </select>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={isAutoExporting}
                onClick={() => { void triggerAutoBackup(); }}
              >
                {isAutoExporting ? 'Mengekspor…' : 'Backup Sekarang'}
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-text-muted">
              <span>
                Backup terakhir:{' '}
                <strong className="text-text-primary">
                  {lastAutoBackupAt
                    ? new Date(lastAutoBackupAt).toLocaleString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })
                    : 'Belum pernah'}
                </strong>
              </span>
              {nextAutoBackupDue && (
                <span>
                  Backup berikutnya:{' '}
                  <strong className="text-text-primary">
                    {nextAutoBackupDue.toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Backup & Restore ── */}
        <div className="app-card p-6">
          <h2 className="mb-1 text-lg font-bold tracking-tight text-text-primary">Backup &amp; Restore Data</h2>
          <p className="mb-5 text-sm text-text-muted">
            Ekspor seluruh data operasional ke file JSON untuk keperluan pencadangan, atau pulihkan data dari file backup sebelumnya.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Export */}
            <div className="flex flex-col gap-3 rounded-xl border border-surface/70 bg-surface/20 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-primary/15">
                  <Download size={16} className="text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-text-primary text-sm">Ekspor Backup</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Unduh semua data ({BACKUP_TABLES.join(', ')}) sebagai file <code className="font-mono">.json</code>.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { void handleExport(); }}
                disabled={isExporting}
                className="self-start"
              >
                {isExporting ? 'Mengekspor…' : '⬇ Unduh Backup'}
              </Button>
            </div>

            {/* Import / Restore */}
            <div className="flex flex-col gap-3 rounded-xl border border-surface/70 bg-surface/20 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-accent-gold/15">
                  <Upload size={16} className="text-accent-gold" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-text-primary text-sm">Pulihkan dari Backup</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Unggah file <code className="font-mono">.json</code> hasil ekspor sebelumnya untuk memulihkan data.
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Pilih file backup"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRestoring}
                className="self-start"
              >
                ⬆ Pilih File Backup
              </Button>
            </div>
          </div>
          <p className="mt-4 text-xs text-text-muted">
            ℹ Restore menggunakan upsert — data yang sudah ada diperbarui, data baru ditambahkan. Tidak ada data yang dihapus.
          </p>
        </div>

        <div className="app-card p-6">
          <h2 className="mb-1 text-lg font-bold tracking-tight text-text-primary">Riwayat Aktivitas</h2>
          <p className="text-sm text-text-muted">
            Hapus histori aktivitas sistem (audit log) berdasarkan rentang waktu atau hapus semua.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div>
              <label htmlFor="audit-clear-range" className="text-sm font-semibold text-text-primary">Rentang Hapus</label>
              <select
                id="audit-clear-range"
                className="form-control mt-1"
                value={auditClearRange}
                onChange={(e) => setAuditClearRange(e.target.value as AuditClearRange)}
              >
                <option value="7d">Hapus log lebih dari 7 hari</option>
                <option value="30d">Hapus log lebih dari 30 hari</option>
                <option value="90d">Hapus log lebih dari 90 hari</option>
                <option value="all">Hapus semua riwayat</option>
              </select>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowClearHistoryModal(true)}
            >
              Proses Hapus
            </Button>
          </div>
          <div className="mt-4 rounded-xl border border-accent-red/30 bg-accent-red/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="mt-0.5 text-accent-red" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-accent-red">Tindakan permanen</p>
                <p className="mt-1 text-xs text-accent-red/90">
                  Data audit log yang dihapus tidak dapat dipulihkan kecuali dari file backup.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-accent-gold/35 bg-accent-gold/10 p-4">
          <p className="text-sm text-accent-gold">
            ⚠ Pengaturan lanjutan (konfigurasi Supabase, RLS policy, dll.) dikelola langsung melalui Supabase Dashboard.
          </p>
        </div>
      </div>

      {/* ── Restore confirmation modal ── */}
      {showRestoreModal && restorePreview && (
        <Modal
          isOpen={showRestoreModal}
          onClose={() => { setShowRestoreModal(false); setRestorePreview(null);  }}
          title="Konfirmasi Pulihkan Data"
          footer={
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => { setShowRestoreModal(false); setRestorePreview(null);  }}
                disabled={isRestoring}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                onClick={() => { void handleRestore(); }}
                disabled={isRestoring}
              >
                {isRestoring ? 'Memulihkan…' : 'Ya, Pulihkan Data'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-accent-gold/40 bg-accent-gold/10 p-4">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-accent-gold" aria-hidden="true" />
              <p className="text-sm text-accent-gold">
                Operasi ini akan menimpa (upsert) data yang ada dengan isi file backup. Pastikan file berasal dari sumber terpercaya.
              </p>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Diekspor pada', value: new Date(restorePreview.exported_at).toLocaleString('id-ID') },
                { label: 'Versi backup', value: `v${restorePreview.version}` },
                { label: 'Satuan', value: restorePreview.satuan },
                ...BACKUP_TABLES.map((t) => ({
                  label: t,
                  value: `${restorePreview.tables[t]?.length ?? 0} baris`,
                })),
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-surface/70 py-1.5 last:border-0">
                  <span className="font-mono text-xs text-text-muted">{label}</span>
                  <span className="text-xs font-semibold text-text-primary">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {showClearHistoryModal && (
        <Modal
          isOpen={showClearHistoryModal}
          onClose={() => {
            if (!isClearingHistory) setShowClearHistoryModal(false);
          }}
          title="Konfirmasi Hapus Riwayat Aktivitas"
          footer={
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowClearHistoryModal(false)}
                disabled={isClearingHistory}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                onClick={() => { void handleClearActivityHistory(); }}
                disabled={isClearingHistory}
              >
                {isClearingHistory ? 'Menghapus…' : 'Ya, Hapus Semua'}
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-text-primary">
              {auditClearRange === 'all'
                ? 'Semua catatan di audit log akan dihapus permanen dari sistem.'
                : `Catatan audit log yang lebih lama dari ${auditClearRange.replace('d', '')} hari akan dihapus permanen.`}
            </p>
            <p className="text-xs text-text-muted">
              Lanjutkan hanya jika Anda yakin. Disarankan melakukan backup sebelum penghapusan.
            </p>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
