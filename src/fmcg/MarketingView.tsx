import React, { useMemo, useState } from 'react';
import { Send, Users } from 'lucide-react';
import { crm, type RfmRow, type Customer } from './api';
import {
  PageHeader, Card, Tabs, Select, Textarea, Button, Badge, TypeBadge, Loading, ErrorBox, Empty, Modal, Field, Input,
  Table, Th, Td, useLoad, useAction, shortVnd, fmtDateTime, SEGMENT_TONE, type ViewProps,
} from './ui';
import { PromotionsPanel } from './PromotionsPanel';

const SEGMENTS: Array<{ name: string; hint: string; action: string }> = [
  { name: 'Khách VIP', hint: 'Mua gần đây, thường xuyên, chi tiêu cao', action: 'Ưu đãi độc quyền, mời dùng thử sản phẩm mới' },
  { name: 'Trung thành', hint: 'Mua đều đặn', action: 'Tích điểm x2, combo tiết kiệm' },
  { name: 'Khách mới', hint: 'Mới mua lần đầu', action: 'Chào mừng, voucher đơn thứ 2' },
  { name: 'Tiềm năng', hint: 'Mua gần đây nhưng ít lần', action: 'Gợi ý sản phẩm bổ sung' },
  { name: 'Cần chăm sóc', hint: 'Lâu chưa quay lại', action: 'Nhắc mua lại kèm quà nhỏ' },
  { name: 'Có nguy cơ rời bỏ', hint: 'Từng mua nhiều, nay vắng', action: 'Gọi điện hỏi thăm, ưu đãi giữ chân' },
  { name: 'Ngủ đông', hint: 'Rất lâu không mua', action: 'Chiến dịch win-back' },
  { name: 'Chưa mua hàng', hint: 'Có hồ sơ, chưa có đơn', action: 'Mời mua lần đầu' },
];

interface CampaignLog { id: string; name: string; channel: string; segment: string; customerType: string; recipients: number; message: string; jobId?: string; sentAt: string; sentBy: string }

export function MarketingView(props: ViewProps) {
  const [section, setSection] = useState<'segments' | 'promotions'>('segments');
  return (
    <div className="space-y-4">
      <Tabs value={section} onChange={setSection} items={[{ id: 'segments', label: 'Phân khúc & chiến dịch' }, { id: 'promotions', label: 'Chương trình khuyến mãi' }]} />
      {section === 'segments' ? <SegmentsView {...props} /> : (
        <>
          <PageHeader title="Chương trình khuyến mãi" subtitle="Giảm %, giảm tiền, mua X tặng Y — theo kênh, nhóm khách và thời gian" />
          <PromotionsPanel {...props} />
        </>
      )}
    </div>
  );
}

function SegmentsView({ notify, can, userName, refreshKey }: ViewProps) {
  const [type, setType] = useState<'B2C' | 'B2B'>('B2C');
  const [segment, setSegment] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const rfm = useLoad(() => crm.customers.rfm(), [refreshKey]);
  const customers = useLoad(() => crm.customers.list(), [refreshKey]);
  const campaigns = useLoad(() => crm.collection.get<CampaignLog>('campaigns').catch(() => []), [refreshKey]);

  const rows = (rfm.data?.rows || []).filter(r => r.type === type);
  const byId = useMemo(() => new Map((customers.data?.customers || []).map(c => [c.id, c])), [customers.data]);
  const members = segment ? rows.filter(r => r.segment === segment) : [];
  const recipients = members.map(m => byId.get(m.customerId)).filter((c): c is Customer => !!c && !!c.phone);

  if (rfm.error) return <ErrorBox error={rfm.error} onRetry={rfm.reload} />;

  return (
    <div className="space-y-4">
      <PageHeader title="Marketing" subtitle="Phân khúc khách hàng theo RFM (Recency – Frequency – Monetary) 12 tháng gần nhất"
        actions={<Tabs value={type} onChange={v => { setType(v); setSegment(null); }} items={[{ id: 'B2C', label: 'Người tiêu dùng' }, { id: 'B2B', label: 'Khách sỉ' }]} />} />

      {!rfm.data ? <Loading /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {SEGMENTS.map(s => {
            const count = rows.filter(r => r.segment === s.name).length;
            const active = segment === s.name;
            return (
              <button key={s.name} onClick={() => setSegment(active ? null : s.name)}
                className={`text-left bg-white border rounded-2xl p-4 cursor-pointer transition ${active ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="flex items-center justify-between"><Badge tone={SEGMENT_TONE[s.name]}>{s.name}</Badge><span className="text-2xl font-bold tabular-nums">{count}</span></div>
                <div className="text-xs text-slate-500 mt-2">{s.hint}</div>
                <div className="text-xs text-slate-700 mt-1 font-medium">→ {s.action}</div>
              </button>
            );
          })}
        </div>
      )}

      {segment && (
        <Card title={<span className="flex items-center gap-2"><Users className="w-4 h-4" />{segment} · {members.length} khách</span>}
          actions={can('canManageMarketing') && recipients.length > 0 && <Button onClick={() => setSendOpen(true)}><Send className="w-3.5 h-3.5" /> Gửi tin cho phân khúc</Button>}>
          {members.length === 0 ? <Empty /> : (
            <Table>
              <thead className="border-b border-slate-100"><tr><Th>Khách hàng</Th><Th className="text-right">Lần mua cuối</Th><Th className="text-right">Số đơn (12T)</Th><Th className="text-right">Chi tiêu (12T)</Th><Th>R-F-M</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {members.slice(0, 300).map((m: RfmRow) => (
                  <tr key={m.customerId}>
                    <Td><div className="font-semibold">{m.name}</div><div className="text-xs text-slate-400">{byId.get(m.customerId)?.phone}</div></Td>
                    <Td className="text-right tabular-nums">{m.recencyDays == null ? '—' : `${m.recencyDays} ngày`}</Td>
                    <Td className="text-right tabular-nums">{m.frequency}</Td>
                    <Td className="text-right tabular-nums">{shortVnd(m.monetary)}</Td>
                    <Td className="font-mono text-xs">{m.r}-{m.f}-{m.m}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      <Card title="Lịch sử chiến dịch">
        {(campaigns.data || []).length === 0 ? <Empty text="Chưa gửi chiến dịch nào" /> : (
          <Table>
            <thead className="border-b border-slate-100"><tr><Th>Chiến dịch</Th><Th>Phân khúc</Th><Th>Kênh</Th><Th className="text-right">Người nhận</Th><Th>Thời gian</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(campaigns.data || []).map(c => (
                <tr key={c.id}>
                  <Td><div className="font-semibold">{c.name}</div><div className="text-xs text-slate-400 truncate max-w-72">{c.message}</div></Td>
                  <Td><TypeBadge type={c.customerType} /> <Badge tone={SEGMENT_TONE[c.segment]}>{c.segment}</Badge></Td>
                  <Td className="text-xs">{c.channel}</Td>
                  <Td className="text-right tabular-nums">{c.recipients}</Td>
                  <Td className="text-xs">{fmtDateTime(c.sentAt)} · {c.sentBy}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {sendOpen && segment && (
        <SendModal
          title={`Gửi tin: ${segment} (${recipients.length} khách)`}
          recipients={recipients}
          defaultName={`${segment} – ${new Date().toLocaleDateString('vi-VN')}`}
          onClose={() => setSendOpen(false)}
          notify={notify}
          onSent={async (log) => {
            const prev = campaigns.data || [];
            await crm.collection.save('campaigns', [{ ...log, segment, customerType: type, sentBy: userName }, ...prev].slice(0, 200)).catch(() => undefined);
            void campaigns.reload();
          }}
        />
      )}
    </div>
  );
}

/** Bulk Zalo ZNS / SMS sender. `{ten}` in the message is replaced per recipient. */
export function SendModal({ title, recipients, defaultName, defaultMessage, onClose, notify, onSent }: {
  title: string; recipients: Array<{ phone: string; name: string; extra?: Record<string, string> }>; defaultName: string; defaultMessage?: string;
  onClose: () => void; notify: (m: string) => void; onSent?: (log: Omit<CampaignLog, 'segment' | 'customerType' | 'sentBy'>) => void | Promise<void>;
}) {
  const [name, setName] = useState(defaultName);
  const [channel, setChannel] = useState<'sms' | 'zns'>('sms');
  const [message, setMessage] = useState(defaultMessage || 'Chào {ten}, VitFood gửi tặng bạn mã ưu đãi 10% cho đơn hàng tiếp theo. Đặt hàng qua Zalo OA hoặc hotline. Từ chối nhận tin: trả lời TC.');
  const [templateType, setTemplateType] = useState('ZNS_PROMOTION');
  const { busy, run } = useAction(notify);
  const preview = message.replace(/\{ten\}/g, recipients[0]?.name || 'Quý khách');
  return (
    <Modal open onClose={onClose} title={title}
      footer={<><Button variant="secondary" onClick={onClose}>Huỷ</Button><Button disabled={busy || !message.trim()} onClick={async () => {
        const r = await run(() => crm.messaging.bulk({
          channel,
          message,
          templateType: channel === 'zns' ? templateType : undefined,
          recipients: recipients.map(x => ({ phone: x.phone, name: x.name, data: { customer_name: x.name, ...(x.extra || {}) } })),
        }));
        if (r) {
          notify(`Đang gửi ${r.total} tin (job ${r.jobId}) — người đã từ chối nhận tin sẽ được bỏ qua`);
          await onSent?.({ id: `camp-${Date.now()}`, name, channel: channel === 'sms' ? 'SMS Brandname' : 'Zalo ZNS', recipients: r.total, message, jobId: r.jobId, sentAt: new Date().toISOString() });
          onClose();
        }
      }}><Send className="w-3.5 h-3.5" /> Gửi {recipients.length} tin</Button></>}>
      <div className="space-y-3">
        <Field label="Tên chiến dịch"><Input value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Kênh">
          <Select value={channel} onChange={e => setChannel(e.target.value as any)}><option value="sms">SMS Brandname</option><option value="zns">Zalo ZNS (mẫu đã duyệt)</option></Select>
        </Field>
        {channel === 'zns' && <Field label="Mã mẫu ZNS" hint="Mẫu phải được Zalo duyệt trước; tham số customer_name được điền tự động"><Input value={templateType} onChange={e => setTemplateType(e.target.value)} /></Field>}
        <Field label="Nội dung" hint="{ten} sẽ được thay bằng tên khách"><Textarea rows={4} value={message} onChange={e => setMessage(e.target.value)} /></Field>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700"><div className="text-[11px] font-bold text-slate-400 mb-1">XEM TRƯỚC</div>{preview}</div>
      </div>
    </Modal>
  );
}
