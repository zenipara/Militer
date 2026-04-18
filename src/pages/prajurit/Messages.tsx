import { useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import PageHeader from '../../components/ui/PageHeader';
import { useMessages } from '../../hooks/useMessages';
import { useUsers } from '../../hooks/useUsers';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import type { Message } from '../../types';
import Input from '../../components/common/Input';

type Tab = 'inbox' | 'sent';

export default function Messages() {
  const { user } = useAuthStore();
  const { showNotification } = useUIStore();
  const { inbox, sent, unreadCount, isLoading, sendMessage, markAsRead, markAllAsRead } = useMessages();
  const { users } = useUsers({ isActive: true });

  const [tab, setTab] = useState<Tab>('inbox');
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchRaw, setSearchRaw] = useState('');
  const [composeForm, setComposeForm] = useState({ to_user: '', isi: '' });

  const handleOpenMessage = async (msg: Message) => {
    setSelectedMsg(msg);
    if (!msg.is_read && tab === 'inbox') {
      await markAsRead(msg.id);
    }
  };

  const handleSend = async () => {
    if (!composeForm.to_user || !composeForm.isi.trim()) {
      showNotification('Pilih penerima dan tulis pesan', 'error');
      return;
    }
    setIsSending(true);
    try {
      await sendMessage(composeForm.to_user, composeForm.isi);
      showNotification('Pesan terkirim', 'success');
      setShowCompose(false);
      setComposeForm({ to_user: '', isi: '' });
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
              <Button onClick={() => setShowCompose(true)}>✎ Tulis Pesan</Button>
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
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface border-t-primary" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="app-card p-10 text-center text-text-muted">
            {searchRaw.trim()
              ? 'Tidak ada pesan yang cocok dengan pencarian'
              : tab === 'inbox' ? 'Kotak masuk kosong' : 'Belum ada pesan terkirim'}
          </div>
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
                  setComposeForm({ to_user: selectedMsg.from_user ?? '', isi: '' });
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
          <div>
            <label htmlFor="compose-to" className="text-sm font-semibold text-text-primary">Kepada *</label>
            <select
              id="compose-to"
              className="form-control mt-1"
              value={composeForm.to_user}
              onChange={(e) => setComposeForm({ ...composeForm, to_user: e.target.value })}
            >
              <option value="">Pilih penerima...</option>
              {users
                .filter((u) => u.id !== user?.id)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.pangkat ? `${u.pangkat} ` : ''}{u.nama} ({u.role})
                  </option>
                ))}
            </select>
          </div>
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
