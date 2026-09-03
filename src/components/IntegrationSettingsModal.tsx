import React, { useEffect, useState } from 'react';
import { X, Plug, Loader2, Save, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

interface Field { key: string; label: string; secret?: boolean; placeholder?: string; }
interface Group { id: string; title: string; hint?: string; fields: Field[]; }
type ValueMeta = { set: boolean; source: 'ui' | 'env' | 'none'; preview: string };

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// group.id -> integration status name from /api/system/integrations
const STATUS_KEY: Record<string, string> = {
  zalo: 'zns', sms: 'sms', otp: 'otp', email: 'email',
  messaging: 'messaging', payments: 'payments', voip: 'voip', ai: 'ai',
};

export const IntegrationSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [values, setValues] = useState<Record<string, ValueMeta>>({});
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const r = await apiClient.settings.get();
      setGroups(r.groups || []);
      setValues(r.values || {});
      setIntegrations(r.integrations || []);
      setDraft({});
    } catch (e: any) {
      setErr(e?.message || 'Không tải được cấu hình (cần quyền Quản trị viên).');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isOpen) load(); }, [isOpen]);

  if (!isOpen) return null;

  const dirty = Object.keys(draft).length > 0;

  const setField = (key: string, v: string) => setDraft(d => ({ ...d, [key]: v }));
  const clearField = (key: string) => setDraft(d => ({ ...d, [key]: '' }));
  const undoField = (key: string) => setDraft(d => { const n = { ...d }; delete n[key]; return n; });

  const save = async () => {
    setSaving(true); setErr(null); setMsg(null);
    try {
      const r = await apiClient.settings.save(draft);
      setValues(r.values || {});
      setIntegrations(r.integrations || []);
      setDraft({});
      setMsg(r.changed?.length ? `Đã lưu: ${r.changed.join(', ')}` : 'Không có thay đổi để lưu.');
    } catch (e: any) {
      setErr(e?.message || 'Lưu thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const statusFor = (groupId: string) => {
    const name = STATUS_KEY[groupId];
    if (!name) return null;
    return integrations.find(i => i.name === name) || null;
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-start justify-center overflow-y-auto py-8 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Plug className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Cấu Hình Tích Hợp</h2>
              <p className="text-[11px] text-slate-500">Nhập trực tiếp — giá trị ở đây đè lên biến môi trường (.env). Bí mật hiển thị dạng che.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="px-6 py-4 space-y-5 max-h-[65vh] overflow-y-auto">
          {loading && <div className="flex items-center gap-2 text-slate-500 text-sm py-8 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>}
          {err && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">{err}</div>}
          {msg && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs">{msg}</div>}

          {!loading && groups.map(g => {
            const st = statusFor(g.id);
            return (
              <div key={g.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <span className="text-sm font-bold text-slate-800">{g.title}</span>
                  {st && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      st.mode === 'live'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {st.mode === 'live' ? 'ĐANG HOẠT ĐỘNG' : 'GIẢ LẬP'}
                    </span>
                  )}
                </div>
                {g.hint && <p className="text-[11px] text-slate-500 px-4 pt-2.5">{g.hint}</p>}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {g.fields.map(f => {
                    const meta = values[f.key] || { set: false, source: 'none', preview: '' };
                    const inDraft = f.key in draft;
                    const draftVal = draft[f.key] ?? '';
                    const isSecret = !!f.secret;
                    const reveal = !!showSecret[f.key];
                    return (
                      <div key={f.key}>
                        <label className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                          <span>{f.label}</span>
                          <span className="flex items-center gap-1.5">
                            {meta.source === 'ui' && <span className="text-[9px] px-1 rounded bg-blue-100 text-blue-700">UI</span>}
                            {meta.source === 'env' && <span className="text-[9px] px-1 rounded bg-slate-100 text-slate-500">.env</span>}
                            {isSecret && (
                              <button type="button" onClick={() => setShowSecret(s => ({ ...s, [f.key]: !s[f.key] }))} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                {reveal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            )}
                          </span>
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type={isSecret && !reveal ? 'password' : 'text'}
                            value={inDraft ? draftVal : (isSecret ? '' : meta.preview)}
                            onChange={e => setField(f.key, e.target.value)}
                            placeholder={meta.set ? (isSecret ? meta.preview : 'đang có giá trị') : (f.placeholder || 'chưa đặt')}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {inDraft ? (
                            <button type="button" onClick={() => undoField(f.key)} title="Hoàn tác" className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"><RotateCcw className="w-3.5 h-3.5" /></button>
                          ) : meta.set ? (
                            <button type="button" onClick={() => clearField(f.key)} title="Xóa giá trị" className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                          ) : <span className="w-6" />}
                        </div>
                        {inDraft && draftVal === '' && <span className="text-[10px] text-rose-500">sẽ xóa (quay về .env nếu có)</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 sticky bottom-0 bg-white rounded-b-2xl">
          <span className="text-[11px] text-slate-500">{dirty ? `${Object.keys(draft).length} trường thay đổi` : 'Không có thay đổi'}</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Đóng</button>
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Lưu cấu hình</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
