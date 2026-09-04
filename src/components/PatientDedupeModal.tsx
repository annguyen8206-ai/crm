import React, { useEffect, useState } from 'react';
import { X, Users, Loader2, GitMerge, ShieldAlert, Check } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

interface DupPatient {
  id: string; pid: string; name: string; phone: string; idCard: string;
  branchId: string; totalVisits: number; lastVisitDate: string; refs: number;
}
interface DupGroup { key: string; matchedOn: 'phone' | 'idCard'; patients: DupPatient[]; }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onMerged?: (summary: string) => void;
}

export const PatientDedupeModal: React.FC<Props> = ({ isOpen, onClose, onMerged }) => {
  const [groups, setGroups] = useState<DupGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [keepChoice, setKeepChoice] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const r = await apiClient.patients.duplicates();
      setGroups(r.groups || []);
      const defaults: Record<string, string> = {};
      (r.groups || []).forEach(g => { defaults[g.key] = g.patients[0]?.id; });
      setKeepChoice(defaults);
    } catch (e: any) {
      setErr(e?.message || 'Không tải được danh sách trùng lặp.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isOpen) load(); }, [isOpen]);
  if (!isOpen) return null;

  const mergeGroup = async (g: DupGroup) => {
    const keepId = keepChoice[g.key] || g.patients[0].id;
    const others = g.patients.filter(p => p.id !== keepId);
    if (!others.length) return;
    setBusyKey(g.key); setErr(null);
    try {
      let moved = 0;
      for (const o of others) {
        const r = await apiClient.patients.merge(keepId, o.id);
        moved += r.totalMoved || 0;
      }
      onMerged?.(`Đã gộp ${others.length} hồ sơ trùng, dời ${moved} bản ghi.`);
      await load();
    } catch (e: any) {
      setErr(e?.message?.includes('403') || /quyền/i.test(e?.message || '')
        ? 'Chỉ Quản trị viên / Ban Giám Đốc mới gộp được hồ sơ.'
        : (e?.message || 'Gộp thất bại.'));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-start justify-center overflow-y-auto py-8 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Hồ Sơ Trùng Lặp</h2>
              <p className="text-[11px] text-slate-500">Trùng số điện thoại (9 số cuối) hoặc CCCD/CMND. Gộp giữ hồ sơ chính, dời toàn bộ lịch/hoá đơn/ticket sang.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="px-6 py-4 space-y-3 max-h-[65vh] overflow-y-auto">
          {loading && <div className="flex items-center gap-2 text-slate-500 text-sm py-10 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Đang quét…</div>}
          {err && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2"><ShieldAlert className="w-4 h-4 shrink-0" />{err}</div>}
          {!loading && !err && groups.length === 0 && (
            <div className="text-center text-slate-500 text-sm py-10 flex flex-col items-center gap-2">
              <Check className="w-6 h-6 text-emerald-500" />
              Không phát hiện hồ sơ trùng lặp.
            </div>
          )}

          {groups.map(g => (
            <div key={g.key} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                Trùng {g.matchedOn === 'phone' ? 'số điện thoại' : 'CCCD/CMND'} · {g.patients.length} hồ sơ
              </div>
              <div className="divide-y divide-slate-100">
                {g.patients.map(p => (
                  <label key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-xs cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name={`keep-${g.key}`}
                      checked={(keepChoice[g.key] || g.patients[0].id) === p.id}
                      onChange={() => setKeepChoice(k => ({ ...k, [g.key]: p.id }))}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">{p.name} <span className="font-mono text-[10px] text-slate-400">{p.pid}</span></div>
                      <div className="text-slate-500 text-[11px]">{p.phone} · {p.idCard || 'chưa có CCCD'} · {p.totalVisits} lượt khám · {p.refs} bản ghi liên quan</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Giữ hồ sơ được chọn, gộp {g.patients.length - 1} hồ sơ còn lại vào.</span>
                <button
                  onClick={() => mergeGroup(g)}
                  disabled={busyKey === g.key}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {busyKey === g.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitMerge className="w-3.5 h-3.5" />}
                  <span>Gộp nhóm này</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Đóng</button>
        </div>
      </div>
    </div>
  );
};
