import { useMemo, useState } from 'react';
import { Pencil, Inbox, Send } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import UserSearchSelect from '../../components/common/UserSearchSelect';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/ui/PageHeader';
import { useMessages } from '../../hooks/useMessages';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import type { Message } from '../../types';
import Input from '../../components/common/Input';

type Tab = 'inbox' | 'sent';
type ComposeMode = 'personal' | 'group';
type GroupTargetRole = 'all' | 'prajurit' | 'guard' | 'staf' | 'komandan';

export default function Messages() {
  const { user } = useAuthStore();
  const { showNotification } = useUIStore();
  const { inbox, sent, unreadCount, isLoading, sendMessage, sendGroupMessage, markAsRead, markAllAsRead } = useMessages();

  const [tab, setTab] = useState<Tab>('inbox');
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchRaw, setSearchRaw] = useState('');
  const [composeForm, setComposeForm] = useState({
    mode: 'personal' as ComposeMode,
    to_user: '',
    isi: '',
    target_role: 'all' as GroupTargetRole,
  });

  const handleOpenMessage = async (msg: Message) => {
    setSelectedMsg(msg);
    if (!msg.is_read && tab === 'inbox') {
      await markAsRead(msg.id);
    }
  };

  const handleSend = async () => {
    if (!composeForm.isi.trim()) {
      showNotification('Tulis isi pesan terlebih dahulu', 'error');
      return;
    }
    if (composeForm.mode === 'personal' && !composeForm.to_user) {
      showNotification('Pilih penerima untuk pesan pribadi', 'error');
      return;
    }
    setIsSending(true);
    try {
      if (composeForm.mode === 'group') {
        const inserted = await sendGroupMessage(
          composeForm.isi,
          composeForm.target_role === 'all' ? undefined : composeForm.target_role,
        );
        showNotification(`Pesan grup terkirim ke ${inserted} personel`, 'success');
      } else {
        await sendMessage(composeForm.to_user, composeForm.isi);
        showNotification('Pesan pribadi terkirim', 'success');
      }
      setShowCompose(false);
      setComposeForm({ mode: 'personal', to_user: '', isi: '', target_role: 'all' });
      setTab('sent');
    } catch {
      showNotification('Gagal mengirim pesan', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const messages = tab === 'inbox' ? inbox : sent;
  const filteredMessages = useMemo(() => {
    const q = searchRaw.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((msg) => {
      const contact = tab === 'inbox' ? msg.sender : msg.receiver;
      return msg.isi.toLowerCase().includes(q)
        || (contact?.nama?.toLowerCase().includes(q) ?? false)
        || (contact?.nrp?.includes(q) ?? false);
    });
  }, [messages, searchRaw, tab]);

  const inboxCount = inbox.length;
  const sentCount = sent.length;

  return (
    <DashboardLayout title="Pesan">
      <div className="space-y-4">
        <PageHeader
          title="Pesan"
          subtitle="Komunikasi internal satuan dengan status baca dan riwayat percakapan."
          meta={
            <>
              <span>Belum dibaca: {unreadCount}</span>
              <span>Masuk: {inboxCount}</span>
              <span>Terkirim: {sentCount}</span>
            </>
          }
          actions={
            <>
              {tab === 'inbox' && unreadCount > 0 && (
                <Button size="sm" variant="ghost" onClick={markAllAsRead}>
                  Tandai semua dibaca
                </Button>
              )}
              <Button onClick={() => setShowCompose(true)} leftIcon={<Pencil className="h-4 w-4" />}>Tulis Pesan</Button>
            </>
          }
        />

        {/* Tab bar + actions */}
        <div className="app-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div role="tablist" aria-label="Pesan" className="flex gap-1 rounded-lg bg-surface/40 p-1">
            {(['inbox', 'sent'] as Tab[]).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {t === 'inbox' ? 'Masuk' : 'Terkirim'}
                {t === 'inbox' && unreadCount > 0 && (
                  <span className="ml-1.5 bg-accent-red text-white text-xs rounded-full px-1.5 py-0.5" aria-label={`${unreadCount} belum dibaca`}>
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <Input
            type="text"
            placeholder="Cari nama atau isi pesan..."
            value={searchRaw}
            onChange={(e) => setSearchRaw(e.target.value)}
            className="sm:max-w-sm"
          />
        </div>

        {/* Message list */}
        {isLoading ? (
          <LoadingSpinner message="Memuat pesan..." />
        ) : filteredMessages.length === 0 ? (
          <EmptyState
            icon={tab === 'inbox'
              ? <Inbox className="h-6 w-6" aria-hidden="true" />
              : <Send className="h-6 w-6" aria-hidden="true" />}
            title={searchRaw.trim()
              ? 'Tidak ada pesan yang cocok'
              : tab === 'inbox' ? 'Kotak masuk kosong' : 'Belum ada pesan terkirim'}
            description={searchRaw.trim()
              ? 'Coba kata kunci lain'
              : tab === 'inbox' ? 'Pesan masuk dari anggota satuan akan muncul di sini.' : 'Pesan yang Anda kirim akan tampil di sini.'}
          />
        ) : (
          <div className="space-y-2">
            {filteredMessages.map((msg) => {
              const isUnread = tab === 'inbox' && !msg.is_read;
              const contact = tab === 'inbox' ? msg.sender : msg.receiver;
              return (
                <button
                  key={msg.id}
                  onClick={() => handleOpenMessage(msg)}
                  className={`app-card w-full p-4 text-left transition-colors hover:border-primary/50 ${
                    isUnread ? 'border-primary/30' : 'border-surface'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0 text-sm">
                        {(contact?.nama ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isUnread ? 'text-text-primary' : 'text-text-muted'}`}>
                            {tab === 'inbox' ? 'Dari' : 'Kepada'}: {contact?.nama ?? '—'}
                          </span>
                          {isUnread && <Badge variant="info" size="sm">Baru</Badge>}
                        </div>
                        <p className={`text-sm mt-0.5 truncate ${isUnread ? 'font-medium text-text-primary' : 'text-text-muted'}`}>
                          {msg.isi}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-text-muted flex-shrink-0">
                      {new Date(msg.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      <Modal
        isOpen={!!selectedMsg}
        onClose={() => setSelectedMsg(null)}
        title={tab === 'inbox' ? `Pesan dari ${selectedMsg?.sender?.nama ?? '—'}` : `Pesan ke ${selectedMsg?.receiver?.nama ?? '—'}`}
        size="md"
        footer={
          <Button variant="ghost" onClick={() => setSelectedMsg(null)}>Tutup</Button>
        }
      >
        {selectedMsg && (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-text-muted">
              <span>{new Date(selectedMsg.created_at).toLocaleString('id-ID')}</span>
            </div>
            <div className="bg-surface/30 rounded-lg p-4 text-text-primary whitespace-pre-line">
              {selectedMsg.isi}
            </div>
            {tab === 'inbox' && (
              <Button
                onClick={() => {
                  setSelectedMsg(null);
                  setComposeForm({
                    mode: 'personal',
                    to_user: selectedMsg.from_user ?? '',
                    isi: '',
                    target_role: 'all',
                  });
                  setShowCompose(true);
                }}
              >
                Balas
              </Button>
            )}
          </div>
        )}
      </Modal>

      {/* Compose Modal */}
      <Modal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        title="Tulis Pesan Baru"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCompose(false)}>Batal</Button>
            <Button onClick={handleSend} isLoading={isSending}>Kirim</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Jenis Pesan</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setComposeForm((prev) => ({ ...prev, mode: 'personal' }))}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  composeForm.mode === 'personal' ? 'bg-primary text-white' : 'bg-surface text-text-muted'
                }`}
              >
                Pribadi
              </button>
              <button
                type="button"
                onClick={() => setComposeForm((prev) => ({ ...prev, mode: 'group' }))}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  composeForm.mode === 'group' ? 'bg-primary text-white' : 'bg-surface text-text-muted'
                }`}
              >
                Grup Satuan
              </button>
            </div>
          </div>

          {composeForm.mode === 'personal' ? (
            <div>
              <label htmlFor="compose-to" className="text-sm font-semibold text-text-primary">Kepada *</label>
              <UserSearchSelect
                className="mt-1 space-y-2"
                value={composeForm.to_user}
                onChange={(toUser) => setComposeForm({ ...composeForm, to_user: toUser })}
                isActive
                excludeUserId={user?.id}
                emptyLabel="Pilih penerima..."
                placeholder="Cari nama/NRP penerima..."
                showRole
              />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-text-muted">
                Pesan akan dikirim ke personel aktif dalam satuan Anda.
              </p>
              <label htmlFor="compose-target-role" className="text-sm font-semibold text-text-primary">
                Target Role
              </label>
              <select
                id="compose-target-role"
                className="form-control"
                value={composeForm.target_role}
                onChange={(e) => setComposeForm({ ...composeForm, target_role: e.target.value as GroupTargetRole })}
              >
                <option value="all">Semua role</option>
                <option value="prajurit">Prajurit</option>
                <option value="guard">Guard</option>
                <option value="staf">Staf</option>
                <option value="komandan">Komandan</option>
              </select>
            </div>
          )}
          <div>
            <label htmlFor="compose-isi" className="text-sm font-semibold text-text-primary">Pesan *</label>
            <textarea
              id="compose-isi"
              className="form-control mt-1 min-h-28"
              rows={5}
              placeholder="Tuliskan pesan Anda..."
              value={composeForm.isi}
              onChange={(e) => setComposeForm({ ...composeForm, isi: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
