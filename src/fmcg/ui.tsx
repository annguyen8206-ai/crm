import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Loader2, Inbox } from 'lucide-react';
import { PRICE_TIER_LABELS } from '../../server/commerce-types';
import type { PriceTier } from '../../server/commerce-types';

export { PRICE_TIER_LABELS };
export type { PriceTier };

// ------------------------------------------------------------------ format
export const vnd = (n: number | undefined | null) => `${Math.round(n || 0).toLocaleString('vi-VN')}đ`;
export const shortVnd = (n: number | undefined | null) => {
  const v = n || 0;
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  if (Math.abs(v) >= 1e3) return `${Math.round(v / 1e3).toLocaleString('vi-VN')}k`;
  return `${v}`;
};
export const fmtDate = (iso?: string) => (iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('vi-VN') : '—');
export const fmtDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—');
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const shiftDate = (ymd: string, days: number) => {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Loyalty tiers mirror server/commerce.ts (kept here because that module reads process.env).
export const LOYALTY_TIERS = [
  { tier: 'Thành viên', min: 0, color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { tier: 'Bạc', min: 200, color: 'bg-zinc-100 text-zinc-700 border-zinc-300' },
  { tier: 'Vàng', min: 800, color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { tier: 'Kim cương', min: 2000, color: 'bg-sky-50 text-sky-800 border-sky-200' },
];
export const VND_PER_POINT = 10_000;

export const B2B_CHANNELS = ['Nhà phân phối', 'Đại lý cấp 1', 'Đại lý cấp 2', 'Tạp hoá (GT)', 'Siêu thị/Chuỗi (MT)', 'HoReCa', 'Doanh nghiệp'] as const;
export const ORDER_CHANNELS = ['Sales thị trường', 'Zalo', 'Facebook', 'Website', 'Sàn TMĐT', 'Hotline', 'Cửa hàng'];
export const PAYMENT_METHODS = ['Tiền mặt', 'Chuyển khoản', 'VietQR', 'COD', 'Ví điện tử', 'Bù trừ công nợ'];
export const VISIT_PURPOSES = ['Lấy đơn', 'Chào hàng', 'Thu nợ', 'Trưng bày', 'Kiểm tồn', 'Chăm sóc khách hàng'];

// ------------------------------------------------------------------ status colors
const TONES: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
  sun: 'bg-sun-50 text-sun-800 border-sun-200',
};
export type Tone = keyof typeof TONES;

export const ORDER_STATUS_TONE: Record<string, Tone> = {
  'Chờ duyệt': 'amber', 'Đã xác nhận': 'blue', 'Đang giao': 'violet', 'Đã giao': 'green', 'Đã huỷ': 'slate', 'Trả hàng': 'red',
};
export const PAYMENT_TONE: Record<string, Tone> = { 'Chưa thanh toán': 'red', 'Thanh toán một phần': 'amber', 'Đã thanh toán': 'green' };
export const VISIT_TONE: Record<string, Tone> = { 'Kế hoạch': 'slate', 'Đã check-in': 'blue', 'Hoàn thành': 'green', 'Bỏ lỡ': 'red' };
export const SEGMENT_TONE: Record<string, Tone> = {
  'Khách VIP': 'sun', 'Trung thành': 'green', 'Tiềm năng': 'sky', 'Khách mới': 'blue',
  'Cần chăm sóc': 'amber', 'Có nguy cơ rời bỏ': 'red', 'Ngủ đông': 'slate', 'Chưa mua hàng': 'slate',
};

export function Badge({ children, tone = 'slate', className = '' }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${TONES[tone]} ${className}`}>{children}</span>;
}

export function TypeBadge({ type }: { type: 'B2B' | 'B2C' | string }) {
  return <Badge tone={type === 'B2B' ? 'blue' : 'sun'}>{type}</Badge>;
}

export function TierBadge({ tier }: { tier?: string }) {
  const t = LOYALTY_TIERS.find(x => x.tier === tier) || LOYALTY_TIERS[0];
  return <span className={`inline-flex px-2 py-0.5 rounded-md border text-[11px] font-semibold ${t.color}`}>{t.tier}</span>;
}

// ------------------------------------------------------------------ layout
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '', title, actions }: { children: React.ReactNode; className?: string; title?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className={`bg-white border border-slate-200 rounded-2xl ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
          {title && <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><span aria-hidden className="w-1 h-3.5 rounded-full bg-brand shrink-0" />{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'red' | 'amber' | 'green' }) {
  const color = tone === 'red' ? 'text-rose-600' : tone === 'amber' ? 'text-amber-600' : tone === 'green' ? 'text-emerald-600' : 'text-slate-900';
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 min-w-0">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 tabular-nums truncate ${color}`}>{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: NoInfer<T>) => void; items: Array<{ id: NoInfer<T>; label: React.ReactNode }> }) {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit max-w-full overflow-x-auto no-scrollbar">
      {items.map(it => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${value === it.id ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Button({ children, variant = 'primary', className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const v = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200',
    danger: 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 border-transparent',
  }[variant];
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${v} ${className}`}
    >
      {children}
    </button>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: {
  open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-end sm:items-center justify-center sm:p-4" onMouseDown={onClose}>
      <div
        className={`bg-white w-full ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'} max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-xl`}
        onMouseDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer" aria-label="Đóng"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 flex-wrap">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, actions }: {
  open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/30" onMouseDown={onClose}>
      <aside
        className="absolute right-0 top-0 h-full w-full sm:max-w-2xl bg-slate-50 shadow-2xl flex flex-col"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-3.5 bg-white border-b border-slate-200">
          <div className="min-w-0 font-bold text-slate-900 truncate">{title}</div>
          <div className="flex items-center gap-2">
            {actions}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer" aria-label="Đóng"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">{children}</div>
      </aside>
    </div>
  );
}

// ------------------------------------------------------------------ forms
export function Field({ label, children, hint, required, className = '' }: { label: string; children: React.ReactNode; hint?: string; required?: boolean; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-semibold text-slate-600 mb-1">{label}{required && <span className="text-rose-500"> *</span>}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:bg-slate-50';
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...p }, ref) => <input ref={ref} {...p} className={`${inputCls} ${className}`} />,
);
export function Select({ className = '', children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={`${inputCls} ${className}`}>{children}</select>;
}
export function Textarea({ className = '', ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={`${inputCls} ${className}`} />;
}

/** Number input that shows thousands separators. */
export function MoneyInput({ value, onChange, ...p }: { value: number | undefined; onChange: (n: number) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <Input
      {...p}
      inputMode="numeric"
      value={value ? value.toLocaleString('vi-VN') : ''}
      onChange={e => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
    />
  );
}

// ------------------------------------------------------------------ states
export function Empty({ text = 'Chưa có dữ liệu', action }: { text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 text-slate-400 gap-2">
      <Inbox className="w-8 h-8" />
      <div className="text-sm">{text}</div>
      {action}
    </div>
  );
}

export function Loading() {
  return <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
}

export function ErrorBox({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm flex items-center justify-between gap-3">
      <span>{error}</span>
      {onRetry && <Button variant="danger" onClick={onRetry}>Thử lại</Button>}
    </div>
  );
}

/** Load-on-mount + reload helper. Keeps the previous data while reloading. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const reload = useCallback(async () => {
    const my = ++seq.current;
    setLoading(true);
    try {
      const r = await fn();
      if (my === seq.current) { setData(r); setError(null); }
    } catch (e: any) {
      if (my === seq.current) setError(e?.message || 'Không tải được dữ liệu');
    } finally {
      if (my === seq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { void reload(); }, [reload]);
  return { data, error, loading, reload, setData };
}

/** Wrap an async action: tracks busy state and reports errors through `notify`. */
export function useAction(notify: (msg: string) => void) {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <R,>(fn: () => Promise<R>, success?: string): Promise<R | undefined> => {
    setBusy(true);
    try {
      const r = await fn();
      if (success) notify(success);
      return r;
    } catch (e: any) {
      notify(e?.message || 'Có lỗi xảy ra');
      return undefined;
    } finally {
      setBusy(false);
    }
  }, [notify]);
  return { busy, run };
}

export function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap ${className}`}>{children}</th>;
}
export function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 text-sm text-slate-700 align-middle ${className}`}>{children}</td>;
}
/** `desktopOnly` hides the table under 640px — pair it with a <MobileList> of cards. */
export function Table({ children, desktopOnly }: { children: React.ReactNode; desktopOnly?: boolean }) {
  return <div className={`overflow-x-auto ${desktopOnly ? 'hidden sm:block' : ''}`}><table className="w-full min-w-[640px]">{children}</table></div>;
}

/** Phone layout for a list: one tappable card per row, shown only under 640px. */
export function MobileList<T>({ rows, render, onSelect, keyOf }: {
  rows: T[]; render: (row: T) => React.ReactNode; onSelect?: (row: T) => void; keyOf: (row: T) => string;
}) {
  return (
    <ul className="sm:hidden divide-y divide-slate-100">
      {rows.map(r => (
        <li key={keyOf(r)}>
          {onSelect
            ? <button type="button" onClick={() => onSelect(r)} className="w-full text-left px-4 py-3 active:bg-slate-50 cursor-pointer">{render(r)}</button>
            : <div className="px-4 py-3">{render(r)}</div>}
        </li>
      ))}
    </ul>
  );
}

/** Common props every FMCG view receives from App. */
export interface ViewProps {
  notify: (msg: string) => void;
  can: (perm: string) => boolean;
  userName: string;
  refreshKey: number;
}
