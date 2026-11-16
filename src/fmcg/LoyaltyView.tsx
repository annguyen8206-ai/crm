import React, { useMemo, useState } from 'react';
import { Send, Gift } from 'lucide-react';
import { crm, type Customer } from './api';
import {
  PageHeader, Card, Tabs, Input, Button, Badge, TierBadge, Loading, ErrorBox, Empty, Stat, Table, Th, Td, Select,
  useLoad, shortVnd, fmtDate, LOYALTY_TIERS, VND_PER_POINT, type ViewProps,
} from './ui';
import { RedeemModal } from './CustomersView';
import { SendModal } from './MarketingView';

export function LoyaltyView(props: ViewProps) {
  const [section, setSection] = useState<'members' | 'repurchase'>('members');
  return (
    <div className="space-y-4">
      <PageHeader title="Hội viên & Mua lại" subtitle="Tích điểm, hạng thành viên và nhắc khách B2C mua lại theo chu kỳ tiêu dùng"
        actions={<Tabs value={section} onChange={setSection} items={[{ id: 'members', label: 'Hội viên' }, { id: 'repurchase', label: 'Nhắc mua lại' }]} />} />
      {section === 'members' ? <Members {...props} /> : <Repurchase {...props} />}
    </div>
  );
}

function Members({ notify, can, refreshKey }: ViewProps) {
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('');
  const [redeemFor, setRedeemFor] = useState<Customer | null>(null);
  const { data, error, loading, reload } = useLoad(() => crm.customers.list({ type: 'B2C' }), [refreshKey]);
  const all = data?.customers || [];
  const rows = all
    .filter(c => (!tier || c.loyaltyTier === tier) && (!q || c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q)))
    .sort((a, b) => (b.lifetimePoints || 0) - (a.lifetimePoints || 0));
  const outstanding = all.reduce((s, c) => s + (c.loyaltyPoints || 0), 0);

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {LOYALTY_TIERS.map(t => (
          <button key={t.tier} onClick={() => setTier(tier === t.tier ? '' : t.tier)}
            className={`text-left bg-white border rounded-2xl p-4 cursor-pointer ${tier === t.tier ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between"><TierBadge tier={t.tier} /><span className="text-2xl font-bold tabular-nums">{all.filter(c => c.loyaltyTier === t.tier).length}</span></div>
            <div className="text-xs text-slate-500 mt-2">Từ {t.min.toLocaleString('vi-VN')} điểm tích luỹ (≈ {shortVnd(t.min * VND_PER_POINT)} chi tiêu)</div>
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Stat label="Điểm đang lưu hành" value={outstanding.toLocaleString('vi-VN')} hint="Tổng điểm khách chưa sử dụng" />
        <Stat label="Quy tắc tích điểm" value={<span className="text-base">1 điểm / {VND_PER_POINT.toLocaleString('vi-VN')}đ</span>} hint="Cộng khi đơn B2C đã giao và thanh toán đủ; trả hàng sẽ thu hồi điểm" />
      </div>
      <Card>
        <div className="p-3"><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm hội viên theo tên, SĐT…" /></div>
        {rows.length === 0 ? <Empty text="Chưa có hội viên" /> : (
          <Table>
            <thead className="border-b border-slate-100"><tr><Th>Hội viên</Th><Th>Hạng</Th><Th className="text-right">Điểm khả dụng</Th><Th className="text-right">Điểm tích luỹ</Th><Th className="text-right">Chi tiêu</Th><Th>Mua gần nhất</Th>{can('canManageLoyalty') && <Th />}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.slice(0, 300).map(c => {
                const next = LOYALTY_TIERS.find(t => t.min > (c.lifetimePoints || 0));
                return (
                  <tr key={c.id}>
                    <Td><div className="font-semibold">{c.name}</div><div className="text-xs text-slate-400">{c.phone}</div></Td>
                    <Td><TierBadge tier={c.loyaltyTier} />{next && <div className="text-[11px] text-slate-400 mt-0.5">còn {(next.min - (c.lifetimePoints || 0)).toLocaleString('vi-VN')} điểm lên {next.tier}</div>}</Td>
                    <Td className="text-right tabular-nums font-semibold">{(c.loyaltyPoints || 0).toLocaleString('vi-VN')}</Td>
                    <Td className="text-right tabular-nums">{(c.lifetimePoints || 0).toLocaleString('vi-VN')}</Td>
                    <Td className="text-right tabular-nums">{shortVnd(c.totalRevenue)}</Td>
                    <Td className="text-xs">{fmtDate(c.lastOrderDate)}</Td>
                    {can('canManageLoyalty') && <Td className="text-right">{(c.loyaltyPoints || 0) > 0 && <Button variant="secondary" onClick={() => setRedeemFor(c)}><Gift className="w-3.5 h-3.5" /> Đổi điểm</Button>}</Td>}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
      {redeemFor && <RedeemModal open onClose={() => setRedeemFor(null)} customer={redeemFor} notify={notify} onDone={() => void reload()} />}
    </>
  );
}

function Repurchase({ notify, can, refreshKey }: ViewProps) {
  const [ahead, setAhead] = useState(7);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sendOpen, setSendOpen] = useState(false);
  const { data, error, loading, reload } = useLoad(() => crm.repurchaseDue(ahead), [ahead, refreshKey]);
  const rows = data?.rows || [];
  const key = (r: { customerId: string; productId: string }) => `${r.customerId}|${r.productId}`;
  const chosen = rows.filter(r => selected.has(key(r)));
  // One message per customer, listing every product that is due.
  const recipients = useMemo(() => {
    const m = new Map<string, { phone: string; name: string; products: string[] }>();
    chosen.forEach(r => {
      const x = m.get(r.customerId) || { phone: r.customerPhone, name: r.customerName, products: [] };
      x.products.push(r.productName);
      m.set(r.customerId, x);
    });
    return [...m.values()].map(x => ({ phone: x.phone, name: x.name, extra: { product_name: x.products.join(', ') } }));
  }, [chosen]);

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Select value={ahead} onChange={e => { setAhead(Number(e.target.value)); setSelected(new Set()); }} className="sm:w-56">
          <option value={3}>Đến hạn trong 3 ngày</option><option value={7}>Đến hạn trong 7 ngày</option><option value={14}>Đến hạn trong 14 ngày</option>
        </Select>
        <span className="text-sm text-slate-500">Dựa trên chu kỳ mua lại của từng sản phẩm và lần mua gần nhất của khách.</span>
        {can('canManageMarketing') && (
          <Button className="sm:ml-auto" disabled={!recipients.length} onClick={() => setSendOpen(true)}><Send className="w-3.5 h-3.5" /> Gửi nhắc {recipients.length ? `(${recipients.length} khách)` : ''}</Button>
        )}
      </div>
      {loading && !data ? <Loading /> : (
        <Card>
          {rows.length === 0 ? <Empty text="Chưa có khách đến hạn mua lại" /> : (
            <Table>
              <thead className="border-b border-slate-100"><tr>
                <Th><input type="checkbox" aria-label="Chọn tất cả" checked={selected.size === rows.length} onChange={e => setSelected(e.target.checked ? new Set(rows.map(key)) : new Set())} /></Th>
                <Th>Khách hàng</Th><Th>Sản phẩm</Th><Th>Mua lần cuối</Th><Th>Dự kiến hết</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => (
                  <tr key={key(r)}>
                    <Td><input type="checkbox" checked={selected.has(key(r))} onChange={() => setSelected(s => { const n = new Set(s); n.has(key(r)) ? n.delete(key(r)) : n.add(key(r)); return n; })} /></Td>
                    <Td><div className="font-semibold">{r.customerName}</div><div className="text-xs text-slate-400">{r.customerPhone}</div></Td>
                    <Td><div>{r.productName}</div><div className="text-xs text-slate-400">{r.sku} · chu kỳ {r.cycleDays} ngày</div></Td>
                    <Td className="text-xs">{fmtDate(r.lastPurchaseDate)}</Td>
                    <Td><Badge tone={r.daysUntilDue < 0 ? 'red' : r.daysUntilDue <= 2 ? 'amber' : 'sky'}>{r.daysUntilDue < 0 ? `Quá ${-r.daysUntilDue} ngày` : r.daysUntilDue === 0 ? 'Hôm nay' : `Còn ${r.daysUntilDue} ngày`}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
      {sendOpen && (
        <SendModal
          title={`Nhắc mua lại · ${recipients.length} khách`}
          recipients={recipients}
          defaultName={`Nhắc mua lại – ${new Date().toLocaleDateString('vi-VN')}`}
          defaultMessage="Chào {ten}, sản phẩm VitFood bạn mua lần trước có lẽ sắp hết. Đặt lại ngay qua Zalo OA để được giao nhanh trong ngày và nhận thêm điểm thưởng!"
          onClose={() => setSendOpen(false)}
          notify={notify}
          onSent={() => setSelected(new Set())}
        />
      )}
    </>
  );
}
