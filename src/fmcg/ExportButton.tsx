import React, { useState } from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';
import { Button, Modal, Field, Select, Input, today, shiftDate } from './ui';
import { viewBranchHeaders } from '../utils/apiClient';
import { EXPORT_VIEW_PERM } from '../../server/rbac';

export type ExportKind = 'customers' | 'orders' | 'order-items' | 'receivables' | 'products' | 'visits' | 'stock-lots' | 'stock-moves';

const REPORTS: Array<{ id: ExportKind; label: string; hint: string; dated: boolean; typed: boolean }> = [
  { id: 'orders', label: 'Danh sách đơn hàng', hint: 'Mỗi đơn 1 dòng: tổng tiền, chiết khấu, KM, đã thu, còn nợ', dated: true, typed: true },
  { id: 'order-items', label: 'Chi tiết bán hàng theo sản phẩm', hint: 'Mỗi dòng hàng 1 dòng — dùng pivot doanh số theo SKU / khách / NV', dated: true, typed: true },
  { id: 'receivables', label: 'Công nợ phải thu', hint: 'Các đơn còn nợ, hạn thanh toán, tuổi nợ', dated: false, typed: true },
  { id: 'customers', label: 'Danh sách khách hàng', hint: 'Thông tin liên hệ, hạn mức, doanh số, công nợ, hạng hội viên', dated: false, typed: true },
  { id: 'products', label: 'Sản phẩm & bảng giá', hint: 'Giá theo từng kênh, tồn kho', dated: false, typed: false },
  { id: 'visits', label: 'Viếng thăm điểm bán', hint: 'Check-in/out, khoảng cách, kết quả, thu nợ', dated: true, typed: false },
  { id: 'stock-lots', label: 'Tồn kho theo lô & hạn sử dụng', hint: 'Mỗi lô một dòng: số lô, NSX, HSD, còn bao nhiêu ngày, tình trạng, số lượng, giá trị', dated: false, typed: false },
  { id: 'stock-moves', label: 'Thẻ kho (nhập – xuất – tồn)', hint: 'Mọi biến động kho theo lô, chứng từ, người thực hiện', dated: true, typed: false },
];

async function download(kind: ExportKind, params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, v); });
  const token = localStorage.getItem('vitcrm_access_token');
  const res = await fetch(`/api/export/${kind}${q.toString() ? `?${q}` : ''}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...viewBranchHeaders() } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Xuất báo cáo thất bại (${res.status})`);
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || `vitcrm-${kind}.csv`;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}

/** "Xuất Excel" button + dialog. Render only for roles with canExportData. */
export function ExportButton({ defaultKind, notify, can, label = 'Xuất Excel' }: {
  defaultKind: ExportKind; notify: (m: string) => void; can: (perm: string) => boolean; label?: string;
}) {
  // Only the reports this role may also VIEW (server enforces the same table).
  const reports = REPORTS.filter(r => !EXPORT_VIEW_PERM[r.id] || can(EXPORT_VIEW_PERM[r.id]!));
  const initial = reports.some(r => r.id === defaultKind) ? defaultKind : reports[0]?.id;
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ExportKind>(initial || defaultKind);
  const [from, setFrom] = useState(shiftDate(today(), -29));
  const [to, setTo] = useState(today());
  const [type, setType] = useState('');
  const [busy, setBusy] = useState(false);
  const report = reports.find(r => r.id === kind) || reports[0];
  if (!report) return null;

  const run = async () => {
    setBusy(true);
    try {
      const name = await download(kind, { from: report.dated ? from : undefined, to: report.dated ? to : undefined, type: report.typed ? type || undefined : undefined });
      notify(`Đã tải ${name}`);
      setOpen(false);
    } catch (e: any) {
      notify(e?.message || 'Xuất báo cáo thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={() => { setKind(initial); setOpen(true); }}><FileSpreadsheet className="w-4 h-4" /> {label}</Button>
      {open && (
        <Modal open onClose={() => setOpen(false)} title="Xuất báo cáo Excel"
          footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Huỷ</Button><Button disabled={busy} onClick={run}><Download className="w-4 h-4" /> Tải file</Button></>}>
          <div className="space-y-3">
            <Field label="Báo cáo" hint={report.hint}>
              <Select value={kind} onChange={e => setKind(e.target.value as ExportKind)}>{reports.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</Select>
            </Field>
            {report.dated && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Từ ngày"><Input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} /></Field>
                <Field label="Đến ngày"><Input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} /></Field>
              </div>
            )}
            {report.typed && (
              <Field label="Loại khách"><Select value={type} onChange={e => setType(e.target.value)}><option value="">B2B + B2C</option><option value="B2B">Chỉ B2B</option><option value="B2C">Chỉ B2C</option></Select></Field>
            )}
            <p className="text-xs text-slate-500">File .csv (UTF-8) mở trực tiếp bằng Excel / Google Sheets. Mỗi lần xuất được ghi vào nhật ký hệ thống.</p>
          </div>
        </Modal>
      )}
    </>
  );
}
