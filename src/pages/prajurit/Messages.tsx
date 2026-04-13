import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { useMessages } from '../../hooks/useMessages';
import { useUsers } from '../../hooks/useUsers';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import type { Message } from '../../types';

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

  return (
    <DashboardLayout title="Pesan">
      <div className="space-y-4">
        {/* Tab bar + actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex bg-surface/40 rounded-lg p-1 gap-1">
            {(['inbox', 'sent'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {t === 'inbox' ? 'Masuk' : 'Terkirim'}
                {t === 'inbox' && unreadCount > 0 && (
                  <span className="ml-1.5 bg-accent-red text-white text-xs rounded-full px-1.5 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {tab === 'inbox' && unreadCount > 0 && (
              <Button size="sm" variant="ghost" onClick={markAllAsRead}>
                Tandai semua dibaca
              </Button>
            )}
            <Button onClick={() => setShowCompose(true)}>✎ Tulis Pesan</Button>
          </div>
        </div>

        {/* Message list */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface border-t-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="bg-bg-card border border-surface rounded-xl p-10 text-center text-text-muted">
            {tab === 'inbox' ? 'Kotak masuk kosong' : 'Belum ada pesan terkirim'}
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => {
              const isUnread = tab === 'inbox' && !msg.is_read;
              const contact = tab === 'inbox' ? msg.sender : msg.receiver;
              return (
                <button
                  key={msg.id}
                  onClick={() => handleOpenMessage(msg)}
                  className={`w-full text-left bg-bg-card border rounded-xl p-4 hover:border-primary/50 transition-colors ${
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
            <label className="text-sm font-medium text-text-primary">Kepada *</label>
            <select
              className="mt-1 w-full rounded-lg border border-surface bg-bg-card px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
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
            <label className="text-sm font-medium text-text-primary">Pesan *</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-surface bg-bg-card px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
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
