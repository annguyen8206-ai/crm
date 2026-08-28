import React, { useState } from 'react';
import { Stethoscope, Package, UserCog, Plus, Pencil, Trash2, Check, X } from 'lucide-react';

export interface ServiceItem {
  id: string;
  name: string;
  category: string;
  unitType: string;
  listPrice: number;
  promoPrice?: number;
  insuranceRate: number; // 0 / 50 / 80 / 100
  estimatedMinutes?: number;
  prepNotes?: string;
  active: boolean;
}
export interface PackageItem {
  id: string;
  name: string;
  targetGroup: string;
  price: number;
  promoPrice?: number;
  description?: string;
  active: boolean;
}
export interface DoctorItem {
  id: string;
  name: string;
  title: string;
  department: string;
  branchId?: string;
  active: boolean;
}

interface Props {
  services: ServiceItem[];
  packages: PackageItem[];
  doctors: DoctorItem[];
  onSaveServices: (v: ServiceItem[]) => void;
  onSavePackages: (v: PackageItem[]) => void;
  onSaveDoctors: (v: DoctorItem[]) => void;
}

const money = (n: number) => (n || 0).toLocaleString('vi-VN') + ' đ';
const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const inputCls = 'border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500';

export const CatalogView: React.FC<Props> = ({ services, packages, doctors, onSaveServices, onSavePackages, onSaveDoctors }) => {
  const [tab, setTab] = useState<'services' | 'packages' | 'doctors'>('services');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Stethoscope className="w-6 h-6 text-blue-600" /> Danh Mục Gói Khám & Dịch Vụ
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Khai báo dịch vụ cận lâm sàng đơn lẻ, gói khám, đơn giá & chính sách BHYT để dùng cho báo giá và lập hóa đơn viện phí.
        </p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit text-xs font-bold">
        {([['services', 'Dịch vụ đơn lẻ', Stethoscope], ['packages', 'Gói khám', Package], ['doctors', 'Bác sĩ / Chuyên khoa', UserCog]] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer ${tab === k ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500'}`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === 'services' && <ServicesTab items={services} onSave={onSaveServices} />}
      {tab === 'packages' && <PackagesTab items={packages} onSave={onSavePackages} />}
      {tab === 'doctors' && <DoctorsTab items={doctors} onSave={onSaveDoctors} />}
    </div>
  );
};

// --------------------------------------------------------------------------

const ServicesTab: React.FC<{ items: ServiceItem[]; onSave: (v: ServiceItem[]) => void }> = ({ items, onSave }) => {
  const blank: ServiceItem = { id: '', name: '', category: 'Xét nghiệm', unitType: 'Lần', listPrice: 0, promoPrice: undefined, insuranceRate: 0, estimatedMinutes: 30, prepNotes: '', active: true };
  const [form, setForm] = useState<ServiceItem>(blank);
  const editing = Boolean(form.id);

  const submit = () => {
    if (!form.name.trim()) return;
    if (editing) onSave(items.map(s => (s.id === form.id ? form : s)));
    else onSave([{ ...form, id: uid('svc') }, ...items]);
    setForm(blank);
  };

  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
        <input className={inputCls} placeholder="Tên dịch vụ *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
          {['Xét nghiệm', 'Chẩn đoán hình ảnh', 'Nội soi', 'Khám chuyên khoa', 'Nha khoa', 'Tiêm chủng', 'Thủ thuật', 'Khác'].map(c => <option key={c}>{c}</option>)}
        </select>
        <select className={inputCls} value={form.unitType} onChange={e => setForm({ ...form, unitType: e.target.value })}>
          {['Lần', 'Lượt khám', 'Ca chụp', 'Mẫu xét nghiệm', 'Liệu trình'].map(c => <option key={c}>{c}</option>)}
        </select>
        <select className={inputCls} value={form.insuranceRate} onChange={e => setForm({ ...form, insuranceRate: Number(e.target.value) })}>
          {[0, 50, 80, 100].map(r => <option key={r} value={r}>BHYT {r}%</option>)}
        </select>
        <input className={inputCls} type="number" placeholder="Đơn giá niêm yết" value={form.listPrice || ''} onChange={e => setForm({ ...form, listPrice: Number(e.target.value) })} />
        <input className={inputCls} type="number" placeholder="Giá ưu đãi" value={form.promoPrice ?? ''} onChange={e => setForm({ ...form, promoPrice: e.target.value ? Number(e.target.value) : undefined })} />
        <input className={inputCls} type="number" placeholder="TG dự kiến (phút)" value={form.estimatedMinutes ?? ''} onChange={e => setForm({ ...form, estimatedMinutes: Number(e.target.value) })} />
        <input className={inputCls} placeholder="Ghi chú chuẩn bị (nhịn ăn...)" value={form.prepNotes} onChange={e => setForm({ ...form, prepNotes: e.target.value })} />
        <div className="col-span-2 md:col-span-4 flex gap-2">
          <button onClick={submit} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> {editing ? 'Lưu thay đổi' : 'Thêm dịch vụ'}
          </button>
          {editing && <button onClick={() => setForm(blank)} className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold cursor-pointer">Hủy</button>}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold">
            <tr><th className="text-left px-3 py-2">Dịch vụ</th><th className="text-left px-3 py-2">Nhóm</th><th className="text-right px-3 py-2">Niêm yết</th><th className="text-right px-3 py-2">Ưu đãi</th><th className="text-center px-3 py-2">BHYT</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-6">Chưa có dịch vụ nào.</td></tr>}
            {items.map(s => (
              <tr key={s.id} className={s.active ? '' : 'opacity-50'}>
                <td className="px-3 py-2 font-semibold text-slate-800">{s.name}<span className="text-slate-400 font-normal"> · {s.unitType}</span></td>
                <td className="px-3 py-2 text-slate-500">{s.category}</td>
                <td className="px-3 py-2 text-right">{money(s.listPrice)}</td>
                <td className="px-3 py-2 text-right text-emerald-600">{s.promoPrice ? money(s.promoPrice) : '—'}</td>
                <td className="px-3 py-2 text-center">{s.insuranceRate}%</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => setForm(s)} className="text-blue-600 hover:text-blue-800 p-1 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => onSave(items.map(x => x.id === s.id ? { ...x, active: !x.active } : x))} className="text-slate-500 hover:text-slate-700 p-1 cursor-pointer">{s.active ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}</button>
                  <button onClick={() => onSave(items.filter(x => x.id !== s.id))} className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PackagesTab: React.FC<{ items: PackageItem[]; onSave: (v: PackageItem[]) => void }> = ({ items, onSave }) => {
  const blank: PackageItem = { id: '', name: '', targetGroup: 'Cá nhân', price: 0, promoPrice: undefined, description: '', active: true };
  const [form, setForm] = useState<PackageItem>(blank);
  const editing = Boolean(form.id);
  const submit = () => {
    if (!form.name.trim()) return;
    if (editing) onSave(items.map(p => (p.id === form.id ? form : p)));
    else onSave([{ ...form, id: uid('pkg') }, ...items]);
    setForm(blank);
  };
  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
        <input className={inputCls} placeholder="Tên gói *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <select className={inputCls} value={form.targetGroup} onChange={e => setForm({ ...form, targetGroup: e.target.value })}>
          {['Cá nhân', 'Doanh nghiệp (KSK)', 'Nam', 'Nữ', 'Thai sản', 'Tầm soát ung thư', 'Tim mạch - Tiểu đường'].map(c => <option key={c}>{c}</option>)}
        </select>
        <input className={inputCls} type="number" placeholder="Giá gói" value={form.price || ''} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
        <input className={inputCls} type="number" placeholder="Giá ưu đãi" value={form.promoPrice ?? ''} onChange={e => setForm({ ...form, promoPrice: e.target.value ? Number(e.target.value) : undefined })} />
        <input className={`${inputCls} col-span-2 md:col-span-4`} placeholder="Mô tả ngắn" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <div className="col-span-2 md:col-span-4 flex gap-2">
          <button onClick={submit} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"><Plus className="w-3.5 h-3.5" /> {editing ? 'Lưu' : 'Thêm gói'}</button>
          {editing && <button onClick={() => setForm(blank)} className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold cursor-pointer">Hủy</button>}
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold"><tr><th className="text-left px-3 py-2">Gói khám</th><th className="text-left px-3 py-2">Đối tượng</th><th className="text-right px-3 py-2">Giá</th><th className="text-right px-3 py-2">Ưu đãi</th><th className="px-3 py-2"></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-6">Chưa có gói khám nào.</td></tr>}
            {items.map(p => (
              <tr key={p.id} className={p.active ? '' : 'opacity-50'}>
                <td className="px-3 py-2 font-semibold text-slate-800">{p.name}<div className="text-slate-400 font-normal">{p.description}</div></td>
                <td className="px-3 py-2 text-slate-500">{p.targetGroup}</td>
                <td className="px-3 py-2 text-right">{money(p.price)}</td>
                <td className="px-3 py-2 text-right text-emerald-600">{p.promoPrice ? money(p.promoPrice) : '—'}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => setForm(p)} className="text-blue-600 p-1 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => onSave(items.filter(x => x.id !== p.id))} className="text-rose-500 p-1 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DoctorsTab: React.FC<{ items: DoctorItem[]; onSave: (v: DoctorItem[]) => void }> = ({ items, onSave }) => {
  const blank: DoctorItem = { id: '', name: '', title: 'BS.', department: '', branchId: '', active: true };
  const [form, setForm] = useState<DoctorItem>(blank);
  const editing = Boolean(form.id);
  const submit = () => {
    if (!form.name.trim()) return;
    if (editing) onSave(items.map(d => (d.id === form.id ? form : d)));
    else onSave([{ ...form, id: uid('doc') }, ...items]);
    setForm(blank);
  };
  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
        <input className={inputCls} placeholder="Học hàm/vị (BS., PGS.TS...)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <input className={inputCls} placeholder="Họ tên bác sĩ *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input className={inputCls} placeholder="Chuyên khoa" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
        <input className={inputCls} placeholder="Chi nhánh (id)" value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })} />
        <div className="col-span-2 md:col-span-4 flex gap-2">
          <button onClick={submit} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"><Plus className="w-3.5 h-3.5" /> {editing ? 'Lưu' : 'Thêm bác sĩ'}</button>
          {editing && <button onClick={() => setForm(blank)} className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold cursor-pointer">Hủy</button>}
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 font-bold"><tr><th className="text-left px-3 py-2">Bác sĩ</th><th className="text-left px-3 py-2">Chuyên khoa</th><th className="text-left px-3 py-2">Chi nhánh</th><th className="px-3 py-2"></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 && <tr><td colSpan={4} className="text-center text-slate-400 py-6">Chưa có bác sĩ nào.</td></tr>}
            {items.map(d => (
              <tr key={d.id} className={d.active ? '' : 'opacity-50'}>
                <td className="px-3 py-2 font-semibold text-slate-800">{d.title} {d.name}</td>
                <td className="px-3 py-2 text-slate-500">{d.department}</td>
                <td className="px-3 py-2 text-slate-500">{d.branchId || '—'}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => setForm(d)} className="text-blue-600 p-1 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => onSave(items.filter(x => x.id !== d.id))} className="text-rose-500 p-1 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
