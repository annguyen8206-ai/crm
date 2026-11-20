import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { AlertTriangle, PackageX, RefreshCw, Repeat } from 'lucide-react';
import { crm } from './api';
import {
  Card, Stat, PageHeader, Loading, ErrorBox, Empty, Badge, TypeBadge, Select, Button,
  useLoad, vnd, shortVnd, today, shiftDate, ORDER_STATUS_TONE, type ViewProps,
} from './ui';
import type { ActiveTab } from '../types';
import { ExportButton } from './ExportButton';

const RANGES = [
  { id: '7', label: '7 ngày qua', days: 6 },
  { id: '30', label: '30 ngày qua', days: 29 },
  { id: '90', label: '90 ngày qua', days: 89 },
];

export function DashboardView({ notify, can, refreshKey, onNavigate }: ViewProps & { onNavigate: (t: ActiveTab) => void }) {
  const [range, setRange] = useState('30');
  const days = RANGES.find(r => r.id === range)!.days;
  const to = today();
  const from = shiftDate(to, -days);
  const { data: d, error, loading, reload } = useLoad(() => crm.dashboard(from, to), [from, to, refreshKey]);
  const { data: rep } = useLoad(() => crm.repurchaseDue(7).catch(() => ({ rows: [], total: 0 })), [refreshKey]);

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!d) return <Loading />;

  const chartData = d.daily.map(x => ({ ...x, label: x.date.slice(8, 10) + '/' + x.date.slice(5, 7) }));
  const b2bShare = d.revenue ? Math.round((d.revenueByType.B2B / d.revenue) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tổng quan kinh doanh"
        subtitle={d.scope === 'mine' ? 'Số liệu đơn hàng do bạn phụ trách' : 'Toàn bộ doanh nghiệp, B2B và B2C'}
        actions={
          <>
            <Select value={range} onChange={e => setRange(e.target.value)} className="!w-40">
              {RANGES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </Select>
            <Button variant="secondary" onClick={() => { void reload(); notify('Đã làm mới số liệu'); }} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
            </Button>
            {can('canExportData') && <ExportButton can={can} defaultKind="order-items" notify={notify} label="Báo cáo Excel" />}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Doanh thu" value={shortVnd(d.revenue)} hint={`B2B ${b2bShare}% · B2C ${100 - b2bShare}%`} />
        <Stat label="Đơn hàng" value={d.orderCount.toLocaleString('vi-VN')} hint={`Giá trị TB ${shortVnd(d.avgOrderValue)}`} />
        <Stat label="Khách mua hàng" value={d.activeCustomers} hint={`${d.newCustomers} khách mới trong kỳ`} />
        <Stat
          label="Công nợ phải thu"
          value={shortVnd(d.receivableTotal)}
          hint={<span className={d.overdueTotal ? 'text-rose-600 font-semibold' : ''}>Quá hạn {shortVnd(d.overdueTotal)}</span>}
          tone={d.overdueTotal > 0 ? 'amber' : undefined}
        />
      </div>

      {(d.pendingApproval > 0 || d.lowStock.length > 0 || (rep?.total || 0) > 0) && (
        <div className="grid sm:grid-cols-3 gap-3">
          {d.pendingApproval > 0 && (
            <button onClick={() => onNavigate('orders')} className="text-left bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start cursor-pointer hover:bg-amber-100/60">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div><div className="text-sm font-bold text-amber-900">{d.pendingApproval} đơn chờ duyệt</div><div className="text-xs text-amber-800">Vượt hạn mức công nợ hoặc chiết khấu</div></div>
            </button>
          )}
          {(rep?.total || 0) > 0 && (
            <button onClick={() => onNavigate('loyalty')} className="text-left bg-sky-50 border border-sky-200 rounded-2xl p-4 flex gap-3 items-start cursor-pointer hover:bg-sky-100/60">
              <Repeat className="w-5 h-5 text-sky-600 shrink-0" />
              <div><div className="text-sm font-bold text-sky-900">{rep!.total} lượt nhắc mua lại</div><div className="text-xs text-sky-800">Khách B2C sắp hết hàng trong 7 ngày</div></div>
            </button>
          )}
          {d.lowStock.length > 0 && (
            <button onClick={() => onNavigate('products')} className="text-left bg-rose-50 border border-rose-200 rounded-2xl p-4 flex gap-3 items-start cursor-pointer hover:bg-rose-100/60">
              <PackageX className="w-5 h-5 text-rose-600 shrink-0" />
              <div><div className="text-sm font-bold text-rose-900">{d.lowStock.length} SKU sắp hết hàng</div><div className="text-xs text-rose-800 truncate">{d.lowStock.slice(0, 3).map(p => p.sku).join(', ')}</div></div>
            </button>
          )}
        </div>
      )}

      <Card title="Doanh thu theo ngày">
        <div className="h-72 px-2 pb-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
              <YAxis tickFormatter={v => shortVnd(v)} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={56} />
              <Tooltip formatter={(v: number) => vnd(v)} labelFormatter={l => `Ngày ${l}`} cursor={{ fill: '#f1f5f9' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="B2B" stackId="a" fill="#00b6b3" radius={[0, 0, 0, 0]} />
              <Bar dataKey="B2C" stackId="a" fill="#f2c200" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Sản phẩm bán chạy">
          {d.topProducts.length === 0 ? <Empty /> : (
            <ul className="divide-y divide-slate-100 px-4 pb-2">
              {d.topProducts.map((p, i) => {
                const pct = Math.round((p.revenue / d.topProducts[0].revenue) * 100);
                return (
                  <li key={p.productId} className="py-2.5">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="truncate"><span className="text-slate-400 tabular-nums mr-2">{i + 1}</span>{p.name}</span>
                      <span className="font-semibold tabular-nums shrink-0">{shortVnd(p.revenue)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                    <div className="text-[11px] text-slate-400 mt-1">{p.sku} · {p.quantity.toLocaleString('vi-VN')} đơn vị</div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Khách hàng doanh thu cao">
          {d.topCustomers.length === 0 ? <Empty /> : (
            <ul className="divide-y divide-slate-100 px-4 pb-2">
              {d.topCustomers.map(c => (
                <li key={c.customerId} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0 flex items-center gap-2"><TypeBadge type={c.type} /><span className="truncate">{c.name}</span></div>
                  <div className="text-right shrink-0"><div className="font-semibold tabular-nums">{shortVnd(c.revenue)}</div><div className="text-[11px] text-slate-400">{c.orders} đơn</div></div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Tuổi nợ phải thu" actions={<button onClick={() => onNavigate('orders')} className="text-xs font-bold text-blue-600 cursor-pointer">Xem công nợ →</button>}>
          <div className="px-4 pb-4 space-y-2">
            {Object.entries(d.aging).map(([bucket, amount]) => {
              const pct = d.receivableTotal ? (amount / d.receivableTotal) * 100 : 0;
              const color = bucket === 'Trong hạn' ? 'bg-emerald-500' : bucket === '1-30 ngày' ? 'bg-amber-400' : bucket === '31-60 ngày' ? 'bg-orange-500' : 'bg-rose-600';
              return (
                <div key={bucket} className="grid grid-cols-[88px_1fr_80px] items-center gap-3 text-sm">
                  <span className="text-slate-600 text-xs font-semibold">{bucket}</span>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${color}`} style={{ width: `${pct}%` }} /></div>
                  <span className="text-right tabular-nums font-semibold">{shortVnd(amount)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Trạng thái đơn trong kỳ">
          <div className="px-4 pb-4 flex flex-wrap gap-2">
            {Object.keys(d.statusCounts).length === 0 ? <Empty /> : Object.entries(d.statusCounts).map(([s, n]) => (
              <Badge key={s} tone={ORDER_STATUS_TONE[s] || 'slate'} className="text-xs px-2.5 py-1">{s}: <b className="tabular-nums">{n}</b></Badge>
            ))}
          </div>
          <div className="px-4 pb-4 grid grid-cols-2 gap-3 text-sm">
            <div className="bg-blue-50 rounded-xl p-3"><div className="text-xs text-blue-700 font-semibold">Khách B2B</div><div className="text-lg font-bold text-blue-900">{d.customerCounts.B2B}</div></div>
            <div className="bg-sun-50 rounded-xl p-3"><div className="text-xs text-sun-800 font-semibold">Khách B2C</div><div className="text-lg font-bold text-sun-900">{d.customerCounts.B2C}</div></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
