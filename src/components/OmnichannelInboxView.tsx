import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, RefreshCw, Facebook, Circle, User, Paperclip, X, FileText, Loader2, Building2 } from 'lucide-react';

export type InboxChannel = 'zalo' | 'facebook' | 'portal';

export interface MsgAttachment {
  type: string;
  url: string;
  name?: string;
}

const isImageAttachment = (a: MsgAttachment) =>
  /^image\//.test(a.type) || a.type === 'image' || /\.(png|jpe?g|gif|webp|heic)(\?|$)/i.test(a.url);

export interface InboxConversation {
  id: string;
  channel: InboxChannel;
  displayName: string;
  avatarUrl?: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
  status: 'open' | 'snoozed' | 'closed';
  assignedStaff?: string;
  patientId?: string;
}

export interface InboxMessage {
  id: string;
  conversationId: string;
  channel: InboxChannel;
  direction: 'in' | 'out';
  senderName: string;
  text: string;
  attachments?: MsgAttachment[];
  status: string;
  at: string;
}

interface Props {
  conversations: InboxConversation[];
  messages: InboxMessage[];
  selectedId: string | null;
  loadingMessages: boolean;
  onSelectConversation: (id: string) => void;
  onSendReply: (text: string, attachments: MsgAttachment[]) => Promise<void> | void;
  onUploadAttachment: (file: File) => Promise<MsgAttachment>;
  onSimulateInbound: (channel: 'zalo' | 'facebook', name: string, text: string) => Promise<void> | void;
  onRefresh: () => void;
}

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const ChannelBadge: React.FC<{ channel: InboxChannel }> = ({ channel }) => {
  if (channel === 'facebook') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
      <Facebook className="w-3 h-3" /> Messenger
    </span>
  );
  if (channel === 'portal') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
      <Building2 className="w-3 h-3" /> Cổng KH
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">
      <MessageSquare className="w-3 h-3" /> Zalo OA
    </span>
  );
};

export const OmnichannelInboxView: React.FC<Props> = ({
  conversations, messages, selectedId, loadingMessages,
  onSelectConversation, onSendReply, onUploadAttachment, onSimulateInbound, onRefresh
}) => {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<MsgAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; name?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);
  const [showSim, setShowSim] = useState(false);
  const [simName, setSimName] = useState('Khách Zalo Demo');
  const [simText, setSimText] = useState('Chào phòng khám, cho em hỏi lịch khám ạ');
  const [simChannel, setSimChannel] = useState<'zalo' | 'facebook'>('zalo');
  const endRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find(c => c.id === selectedId) || null;
  const totalUnread = conversations.reduce((n, c) => n + (c.unreadCount || 0), 0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedId]);

  const send = async () => {
    const text = draft.trim();
    if ((!text && pending.length === 0) || !selected || uploading) return;
    setSending(true);
    try {
      await onSendReply(text, pending);
      setDraft('');
      setPending([]);
    } finally {
      setSending(false);
    }
  };

  const pickFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setAttachError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 10 - pending.length)) {
        const att = await onUploadAttachment(file);
        setPending(prev => [...prev, att]);
      }
    } catch (e: any) {
      setAttachError(e?.message || 'Tải tệp lên thất bại');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            Tin Nhắn Đa Kênh (Zalo OA + Facebook)
            {totalUnread > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">{totalUnread} chưa đọc</span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Toàn bộ tin nhắn khách gửi tới OA Zalo / Fanpage Facebook đổ về đây theo thời gian thực. Trả lời trực tiếp trong CRM.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Làm mới
          </button>
          <button onClick={() => setShowSim(s => !s)} className="px-3 py-1.5 text-xs font-bold bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 cursor-pointer">
            Mô phỏng tin đến
          </button>
        </div>
      </div>

      {showSim && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-wrap items-end gap-2 text-xs">
          <select value={simChannel} onChange={e => setSimChannel(e.target.value as 'zalo' | 'facebook')} className="border border-amber-300 rounded-lg px-2 py-1.5 bg-white">
            <option value="zalo">Zalo</option>
            <option value="facebook">Facebook</option>
          </select>
          <input value={simName} onChange={e => setSimName(e.target.value)} placeholder="Tên khách" className="border border-amber-300 rounded-lg px-2 py-1.5 bg-white flex-1 min-w-[140px]" />
          <input value={simText} onChange={e => setSimText(e.target.value)} placeholder="Nội dung" className="border border-amber-300 rounded-lg px-2 py-1.5 bg-white flex-[2] min-w-[200px]" />
          <button
            onClick={() => onSimulateInbound(simChannel, simName, simText)}
            className="px-3 py-1.5 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 cursor-pointer"
          >
            Gửi thử
          </button>
          <span className="text-amber-700">Chỉ để kiểm thử pipeline khi chưa nối provider thật.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-white border border-slate-200 rounded-2xl overflow-hidden" style={{ minHeight: 480 }}>
        {/* Conversation list */}
        <div className="border-r border-slate-200 max-h-[70vh] overflow-y-auto">
          {conversations.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">Chưa có hội thoại nào.</div>
          )}
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => onSelectConversation(c.id)}
              className={`w-full text-left px-3 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${selectedId === c.id ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-800 text-sm truncate">{c.displayName}</span>
                <span className="text-[10px] text-slate-400 shrink-0">{fmtTime(c.lastMessageAt)}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <ChannelBadge channel={c.channel} />
                {c.unreadCount > 0 && <Circle className="w-2 h-2 fill-rose-500 text-rose-500" />}
              </div>
              <p className="text-xs text-slate-500 truncate mt-1">{c.lastMessagePreview || '—'}</p>
            </button>
          ))}
        </div>

        {/* Message pane */}
        <div className="lg:col-span-2 flex flex-col max-h-[70vh]">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Chọn một hội thoại để xem</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-slate-800">{selected.displayName}</span>
                <ChannelBadge channel={selected.channel} />
                {selected.assignedStaff && <span className="text-[11px] text-slate-400">· phụ trách: {selected.assignedStaff}</span>}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
                {loadingMessages && <div className="text-xs text-slate-400 text-center">Đang tải…</div>}
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${m.direction === 'out' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
                      {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                      {(m.attachments || []).map((a, i) => (
                        isImageAttachment(a) ? (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setLightbox({ url: a.url, name: a.name })}
                            className="block mt-1 cursor-zoom-in"
                          >
                            <img src={a.url} alt={a.name || 'hình ảnh'} className="rounded-lg max-h-60 max-w-full object-cover" />
                          </button>
                        ) : (
                          <a
                            key={i}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold underline ${m.direction === 'out' ? 'bg-blue-500/40 text-white' : 'bg-slate-100 text-slate-700'}`}
                          >
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{a.name || 'Tệp đính kèm'}</span>
                          </a>
                        )
                      ))}
                      <div className={`text-[10px] mt-1 ${m.direction === 'out' ? 'text-blue-100' : 'text-slate-400'}`}>
                        {m.direction === 'out' ? (m.senderName + ' · ') : ''}{fmtTime(m.at)}
                        {m.status === 'simulated' && ' · (giả lập)'}
                        {m.status === 'failed' && ' · gửi lỗi'}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <div className="p-3 border-t border-slate-200 space-y-2">
                {(pending.length > 0 || uploading || attachError) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {pending.map((a, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg pl-1.5 pr-1 py-1 text-[11px] max-w-[220px]">
                        {isImageAttachment(a)
                          ? <img src={a.url} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                          : <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                        <span className="truncate">{a.name || 'tệp'}</span>
                        <button
                          type="button"
                          onClick={() => setPending(prev => prev.filter((_, j) => j !== i))}
                          className="p-0.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {uploading && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải lên…
                      </span>
                    )}
                    {attachError && <span className="text-[11px] text-rose-600">{attachError}</span>}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                    onChange={e => void pickFiles(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading || pending.length >= 10}
                    title="Đính kèm ảnh / tệp"
                    className="p-2.5 rounded-xl border border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
                    rows={2}
                    placeholder="Nhập câu trả lời… (Enter để gửi)"
                    className="flex-1 resize-none border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => void send()}
                    disabled={sending || uploading || (!draft.trim() && pending.length === 0)}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-4 h-4" /> {sending ? 'Đang gửi' : 'Gửi'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[80] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="max-w-4xl max-h-[90vh] flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.name || 'hình ảnh'} className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl bg-white" />
            <div className="flex items-center gap-3">
              <a
                href={lightbox.url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-white/90 text-slate-800 rounded-lg text-xs font-bold hover:bg-white cursor-pointer"
              >
                Mở/Tải ảnh gốc
              </a>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="px-3 py-1.5 bg-white/20 text-white rounded-lg text-xs font-bold hover:bg-white/30 cursor-pointer"
              >
                Đóng (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
