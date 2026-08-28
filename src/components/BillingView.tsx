import React, { useMemo, useState } from 'react';
import { Receipt, Plus, QrCode, CheckCircle2, Wallet, Clock, RefreshCw } from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import type { ServiceItem } from './CatalogView';

interface Props {
  invoices: any[];
  patients: any[];
  services: ServiceItem[];
  onChanged: () => void;
}

const money = (n: number) => (n || 0).toLocaleString('vi-VN') + ' đ';
const inputCls = 'border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500';

interface DraftItem { name: string; quantity: number; unitPrice: number; insuranceCoverage: number }

export const BillingView: React.FC<Props> = ({ invoices, patients, services, onChanged }) => {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [department, setDepartment] = useState('Khoa Khám Bệnh');
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [qr, setQr] = useState<{ invoiceCode: string; url: string; memo: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () => invoices.filter(i => statusFilter === 'ALL' || i.status === statusFilter),
    [invoices, statusFilter]
  );
  const totals = useMemo(() => ({
    collected: invoices.filter(i => i.status === 'Đã thanh toán').reduce((s, i) => s + (i.patientPayable || 0), 0),
    pending: invoices.filter(i => i.status === 'Chờ thanh toán').reduce((s, i) => s + (i.patientPayable || 0), 0)
  }), [invoices]);

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const insDeduction = items.reduce((s, it) => s + (it.insuranceCoverage || 0), 0);
  const payable = Math.max(0, subtotal - insDeduction - discount);

  const addServiceRow = (svcId: string) => {
    const s = services.find(x => x.id === svcId);
    if (!s) return;
    const unit = s.promoPrice ?? s.listPrice;
    setItems(prev => [...prev, { name: s.name, quantity: 1, unitPrice: unit, insuranceCoverage: Math.round(unit * (s.insuranceRate / 100)) }]);
  };

  const createInvoice = async () => {
    if (!patientId || items.length === 0) return;
    const p = patients.find(x => x.id === patientId);
    setBusy(true);
    try {
      await apiClient.invoices.create({
        patientId,
        patientName: p?.name || 'Khách',
        patientPhone: p?.phone || '',
        branchId: p?.primaryBranchId || p?.branchId || 'hn-central',
        department,
        items,
        discount
      });
      setShowForm(false);
      setItems([]); setDiscount(0); setPatientId('');
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const genQr = async (inv: any) => {
    setBusy(true);
    try {
      const r = await apiClient.invoices.generateVietQr({ amount: inv.patientPayable, invoiceCode: inv.invoiceCode, patientName: inv.patientName });
      setQr({ invoiceCode: inv.invoiceCode, url: r.qrUrl, memo: r.transferMemo });
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async (inv: any, method: string) => {
    setBusy(true);
    try {
      await apiClient.invoices.markPaid(inv.id, { paymentMethod: method });
      setQr(null);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" /> Viện Phí & Thanh Toán
          </h2>
          <p className="text-xs text-slate-500 mt-1">Lập hóa đơn, sinh mã VietQR động, xác nhận thu tiền. Chuyển khoản khớp nội dung sẽ tự đối soát.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onChanged} className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"><RefreshCw className="w-3.5 h-3.5" /> Làm mới</button>
          <button onClick={() => setShowForm(s => !s)} className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg flex items-center gap-1.5 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Tạo hóa đơn</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3"><div className="text-[11px] text-slate-500 flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Đã thu</div><div className="text-lg font-bold text-emerald-600">{money(totals.collected)}</div></div>
        <div className="bg-white border border-slate-200 rounded-xl p-3"><div className="text-[11px] text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Chờ thanh toán</div><div className="text-lg font-bold text-amber-600">{money(totals.pending)}</div></div>
        <div className="bg-white border border-slate-200 rounded-xl p-3"><div className="text-[11px] text-slate-500">Tổng hóa đơn</div><div className="text-lg font-bold text-slate-800">{invoices.length}</div></div>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select className={inputCls} value={patientId} onChange={e => setPatientId(e.target.value)}>
              <option value="">— Chọn bệnh nhân —</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.pid || p.phone})</option>)}
            </select>
            <input className={inputCls} placeholder="Khoa/phòng" value={department} onChange={e => setDepartment(e.target.value)} />
            <select className={inputCls} onChange={e => { addServiceRow(e.target.value); e.target.value = ''; }} defaultValue="">
              <option value="" disabled>+ Thêm dịch vụ từ danh mục</option>
              {services.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name} — {money(s.promoPrice ?? s.listPrice)}</option>)}
            </select>
          </div>

          {items.length > 0 && (
            <table className="w-full text-xs">
              <thead className="text-slate-500 font-bold"><tr><th className="text-left py-1">Khoản mục</th><th className="w-16">SL</th><th className="text-right">Đơn giá</th><th className="text-right">BH trừ</th><th></th></tr></thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-1">{it.name}</td>
                    <td><input className="w-14 border rounded px-1 py-0.5 text-center" type="number" value={it.quantity} onChange={e => setItems(items.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))} /></td>
                    <td className="text-right">{money(it.unitPrice)}</td>
                    <td className="text-right text-slate-500">{money(it.insuranceCoverage)}</td>
                    <td className="text-right"><button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-rose-500 cursor-pointer">×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
            <span className="text-slate-500">Tạm tính: <b className="text-slate-800">{money(subtotal)}</b></span>
            <span className="text-slate-500">BHYT trừ: <b className="text-slate-800">{money(insDeduction)}</b></span>
            <label className="text-slate-500 flex items-center gap-1">Giảm giá <input className="w-24 border rounded px-1.5 py-0.5" type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} /></label>
            <span className="font-bold text-blue-700">BN phải trả: {money(payable)}</span>
            <button disabled={busy || !patientId || items.length === 0} onClick={createInvoice} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold disabled:opacity-50 cursor-pointer">Lập hóa đơn</button>
          </div>
        </div>
      )}

      <div className="flex gap-1 text-xs font-bold">
        {['ALL', 'Chờ thanh toán', 'Đã thanh toán', 'Đã hoàn tiền'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1 rounded-lg cursor-pointer ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{s === 'ALL' ? 'Tất cả' : s}</button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold"><tr><th className="text-left px-3 py-2">Mã HĐ</th><th className="text-left px-3 py-2">Bệnh nhân</th><th className="text-right px-3 py-2">Phải trả</th><th className="text-center px-3 py-2">Trạng thái</th><th className="px-3 py-2"></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-6">Chưa có hóa đơn.</td></tr>}
            {filtered.map(inv => (
              <tr key={inv.id}>
                <td className="px-3 py-2 font-mono font-semibold text-slate-800">{inv.invoiceCode}</td>
                <td className="px-3 py-2">{inv.patientName}</td>
                <td className="px-3 py-2 text-right font-bold">{money(inv.patientPayable)}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.status === 'Đã thanh toán' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</span>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {inv.status !== 'Đã thanh toán' && (
                    <>
                      <button onClick={() => genQr(inv)} className="text-blue-600 hover:text-blue-800 p-1 cursor-pointer" title="Sinh VietQR"><QrCode className="w-4 h-4" /></button>
                      <button onClick={() => markPaid(inv, 'Tiền mặt')} className="text-emerald-600 hover:text-emerald-800 p-1 cursor-pointer" title="Xác nhận đã thu"><CheckCircle2 className="w-4 h-4" /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {qr && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setQr(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-900">VietQR — {qr.invoiceCode}</h3>
            <img src={qr.url} alt="VietQR" className="w-full rounded-lg border" />
            <p className="text-xs text-slate-500">Nội dung CK: <b>{qr.memo}</b>. Chuyển khoản khớp nội dung sẽ tự đối soát qua webhook.</p>
            <button onClick={() => { const inv = invoices.find(i => i.invoiceCode === qr.invoiceCode); if (inv) markPaid(inv, 'VietQR'); }} className="w-full py-2 bg-emerald-600 text-white rounded-lg font-bold cursor-pointer">Xác nhận đã nhận tiền</button>
            <button onClick={() => setQr(null)} className="w-full py-2 bg-slate-100 rounded-lg font-bold cursor-pointer">Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
};
