import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../utils/apiClient';
import {
  TrendingUp,
  Target,
  Send,
  Users,
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
  MessageSquare,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Plus,
  Zap,
  Filter,
  DollarSign
} from 'lucide-react';
import { MarketingSegment, MarketingCampaign, CareAutomationRule, Patient } from '../types';

interface MarketingAutomationViewProps {
  segments: MarketingSegment[];
  campaigns: MarketingCampaign[];
  automationRules: CareAutomationRule[];
  onAddNewCampaign: (campaign: Omit<MarketingCampaign, 'id'>) => void;
  onToggleRule: (ruleId: string) => void;
  patients?: Patient[];
}

export const MarketingAutomationView: React.FC<MarketingAutomationViewProps> = ({
  segments = [],
  campaigns = [],
  automationRules = [],
  onAddNewCampaign,
  onToggleRule,
  patients = []
}) => {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'segments' | 'rules' | 'bulk'>('campaigns');
  
  // AI Generator state
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState(segments[0]?.id || '');
  const [targetCondition, setTargetCondition] = useState('Bệnh nhân Tim mạch - Huyết áp');
  const [channel, setChannel] = useState<'Zalo ZNS' | 'SMS Brandname' | 'Email HTML'>('Zalo ZNS');
  const [aiGeneratedResult, setAiGeneratedResult] = useState<{ title: string; message: string; suggestedSendTime: string; estimatedConversionRate: string } | null>(null);

  const handleGenerateAiMessage = async () => {
    setIsAiGenerating(true);
    const seg = (segments || []).find(s => s && s.id === selectedSegmentId);
    try {
      const res = await fetch('/api/ai/generate-campaign-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentName: seg?.name || 'Bệnh nhân tái khám định kỳ',
          targetCondition,
          channel,
          tone: 'Ân cần, chuẩn mực y khoa, tôn trọng tính riêng tư và bảo mật'
        })
      });
      const data = await res.json();
      setAiGeneratedResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleLaunchCampaign = () => {
    if (!aiGeneratedResult) return;
    const seg = segments.find(s => s.id === selectedSegmentId);
    onAddNewCampaign({
      name: `Chiến dịch: ${aiGeneratedResult.title}`,
      channel: channel as any,
      segmentId: selectedSegmentId,
      segmentName: seg?.name || 'Nhóm bệnh nhân mục tiêu',
      status: 'Đang chạy',
      scheduledDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      totalRecipients: seg?.patientCount || 150,
      sentCount: seg?.patientCount || 150,
      deliveredRate: 98.6,
      openRate: 84.5,
      conversionAppointments: Math.floor((seg?.patientCount || 150) * 0.22),
      estimatedRevenue: Math.floor((seg?.patientCount || 150) * 0.22) * 1200000,
      messagePreview: aiGeneratedResult.message
    });
    setAiGeneratedResult(null);
    setActiveTab('campaigns');
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Marketing Automation & Re-Marketing
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
              Đa Điểm Chạm
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân nhóm bệnh nhân theo bệnh lý, tự động hóa gửi Zalo ZNS / SMS và AI gợi ý kịch bản
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('campaigns')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Tạo Kịch Bản</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'campaigns' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Chiến Dịch Re-Marketing ({campaigns.length})
        </button>
        <button
          onClick={() => setActiveTab('segments')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'segments' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Phân Nhóm Bệnh Nhân ({segments.length})
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'rules' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Kịch Bản Chăm Sóc ({automationRules.length})
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'bulk' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Gửi Hàng Loạt
        </button>
      </div>

      {activeTab === 'bulk' && <BulkSendPanel patients={patients} />}

      {/* TAB 1: CAMPAIGNS & AI BUILDER */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          
          {/* AI Generator Box */}
          <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">AI Sáng Tạo Kịch Bản Chăm Sóc & Tái Khám Tự Động</h3>
                  <p className="text-xs text-slate-500">Soạn thông điệp Zalo ZNS / SMS chuẩn y khoa, cá nhân hóa theo từng mặt bệnh</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Chọn phân khúc bệnh nhân:</label>
                <select
                  value={selectedSegmentId}
                  onChange={(e) => setSelectedSegmentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
                >
                  {segments.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.patientCount} BN)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Tình trạng / Bệnh lý mục tiêu:</label>
                <input
                  type="text"
                  value={targetCondition}
                  onChange={(e) => setTargetCondition(e.target.value)}
                  placeholder="VD: Tiểu đường Type 2, Laser da liễu..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Kênh gửi tin nhắn:</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
                >
                  <option value="Zalo ZNS">Zalo ZNS (Zalo Notification Service)</option>
                  <option value="SMS Brandname">SMS Brandname</option>
                  <option value="Email HTML">Email Marketing</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleGenerateAiMessage}
                disabled={isAiGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAiGenerating ? 'animate-spin' : ''}`} />
                <span>{isAiGenerating ? 'Đang soạn thảo...' : 'AI Tạo Nội Dung Chiến Dịch'}</span>
              </button>
            </div>

            {/* Generated Output */}
            {aiGeneratedResult && (
              <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-200 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-900">Tiêu đề: {aiGeneratedResult.title}</span>
                  <span className="text-emerald-700 font-bold">Khung giờ đề xuất: {aiGeneratedResult.suggestedSendTime}</span>
                </div>
                <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans shadow-xs">
                  {aiGeneratedResult.message}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-blue-200 text-xs">
                  <span className="text-slate-600">Tỷ lệ chuyển đổi dự kiến: <strong className="text-emerald-700">{aiGeneratedResult.estimatedConversionRate}</strong></span>
                  <button
                    onClick={handleLaunchCampaign}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Phát Động Chiến Dịch Ngay</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Campaigns List */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Các Chiến Dịch Re-Marketing Đang Triển Khai</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((c) => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                      {c.channel}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                      {c.status}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                  <p className="text-xs text-slate-500">Phân khúc: <strong className="text-slate-800">{c.segmentName}</strong></p>

                  {/* Campaign KPIs */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Đã gửi thành công</span>
                      <span className="font-bold text-slate-900">{c.sentCount} / {c.totalRecipients} ({c.deliveredRate}%)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Lượt đặt hẹn</span>
                      <span className="font-bold text-emerald-700">{c.conversionAppointments} ca khám</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Doanh thu ước tính</span>
                      <span className="font-bold text-blue-700">{(c.estimatedRevenue / 1e6).toFixed(0)} tr đ</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200 line-clamp-2">
                    "{c.messagePreview}"
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: SEGMENTS */}
      {activeTab === 'segments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {segments.map((seg) => (
              <div key={seg.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">{seg.name}</h4>
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold font-mono">
                    {seg.patientCount} Bệnh nhân
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{seg.description}</p>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs font-mono text-blue-700 font-semibold">
                  {seg.criteriaSummary}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {seg.tags.map((t, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-medium border border-slate-200">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AUTOMATION RULES */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm">Quy Trình Kịch Bản Tự Động Theo Điểm Chạm (Journeys)</h3>
            
            <div className="space-y-3">
              {automationRules.map((rule) => (
                <div key={rule.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{rule.name}</span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[10px]">
                        {rule.channel}
                      </span>
                    </div>
                    <p className="text-slate-600">{rule.messageTemplate}</p>
                    <span className="text-[11px] text-slate-500 block">
                      Đã kích hoạt tự động: <strong className="text-slate-900">{rule.activeCountThisMonth} lượt</strong> trong tháng này
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onToggleRule(rule.id)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                        rule.autoSend ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {rule.autoSend ? 'Đang Bật Tự Động' : 'Tạm Dừng'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );

};

// ---------------------------------------------------------------------------
// Bulk Zalo ZNS / SMS sender — throttled server-side, opt-outs auto-excluded.
// ---------------------------------------------------------------------------
const BulkSendPanel: React.FC<{ patients: Patient[] }> = ({ patients }) => {
  const [channel, setChannel] = useState<'zns' | 'sms'>('zns');
  const [tag, setTag] = useState<string>('ALL');
  const [message, setMessage] = useState('Kính gửi Quý khách, VitHospital nhắc lịch chăm sóc sức khỏe định kỳ. Soạn HUY gửi 8080 để ngừng nhận tin.');
  const [templateType, setTemplateType] = useState('ZNS_HEALTH_CARE_FOLLOWUP');
  const [job, setJob] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [optOutCount, setOptOutCount] = useState<number | null>(null);

  useEffect(() => {
    apiClient.messaging.optOuts().then(r => setOptOutCount(r.optOuts?.length ?? 0)).catch(() => setOptOutCount(null));
  }, []);

  const allTags = useMemo(() => [...new Set((patients || []).flatMap(p => p?.tags || []))], [patients]);
  const recipients = useMemo(() => (patients || [])
    .filter(p => p?.phone && (tag === 'ALL' || (p.tags || []).includes(tag)))
    .map(p => ({ phone: p.phone, name: p.name, data: { patient_name: p.name || 'Quý khách' } })), [patients, tag]);

  useEffect(() => {
    if (!job || job.status === 'done') return;
    const t = setInterval(async () => {
      try {
        const s = await apiClient.messaging.bulkStatus(job.id);
        setJob(s);
        if (s.status === 'done') clearInterval(t);
      } catch { clearInterval(t); }
    }, 1500);
    return () => clearInterval(t);
  }, [job?.id, job?.status]);

  const send = async () => {
    setErr(null);
    if (!recipients.length) { setErr('Không có người nhận phù hợp bộ lọc.'); return; }
    if (channel === 'sms' && !message.trim()) { setErr('Cần nội dung tin SMS.'); return; }
    if (!confirm(`Gửi ${channel.toUpperCase()} tới ${recipients.length} người? (đã tự loại ${optOutCount ?? 0} người từ chối nhận tin)`)) return;
    setSending(true); setJob(null);
    try {
      const r = await apiClient.messaging.bulk({ channel, templateType: channel === 'zns' ? templateType : undefined, message: channel === 'sms' ? message : undefined, recipients });
      setJob({ id: r.jobId, total: r.total, sent: 0, failed: 0, skipped: 0, status: 'running' });
    } catch (e: any) {
      setErr(/quyền|403/i.test(e?.message || '') ? 'Vai trò của bạn không được phép gửi tin hàng loạt.' : (e?.message || 'Gửi thất bại.'));
    } finally {
      setSending(false);
    }
  };

  const pct = job && job.total ? Math.round(((job.sent + job.failed + job.skipped) / job.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Gửi Tin Hàng Loạt (Zalo ZNS / SMS)</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="font-bold text-slate-600 block mb-1">Kênh</label>
            <div className="flex gap-1.5">
              {(['zns', 'sms'] as const).map(c => (
                <button key={c} onClick={() => setChannel(c)}
                  className={`flex-1 py-1.5 rounded-lg font-bold border ${channel === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                  {c === 'zns' ? 'Zalo ZNS' : 'SMS'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="font-bold text-slate-600 block mb-1">Nhóm khách hàng</label>
            <select value={tag} onChange={e => setTag(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg">
              <option value="ALL">Tất cả ({(patients || []).filter(p => p?.phone).length})</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-600 block mb-1">Sẽ gửi tới</label>
            <div className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900">
              {recipients.length} người
            </div>
          </div>
        </div>

        {channel === 'zns' ? (
          <div className="text-xs">
            <label className="font-bold text-slate-600 block mb-1">Mã template ZNS đã duyệt</label>
            <input value={templateType} onChange={e => setTemplateType(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono" />
            <p className="text-[11px] text-slate-400 mt-1">Dùng key (vd ZNS_HEALTH_CARE_FOLLOWUP) đã map ở Cấu Hình Khóa Tích Hợp. Tham số gửi kèm: patient_name.</p>
          </div>
        ) : (
          <div className="text-xs">
            <label className="font-bold text-slate-600 block mb-1">Nội dung SMS</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg" />
            <p className="text-[11px] text-slate-400 mt-1">{message.length} ký tự. Nên kèm cách huỷ nhận tin.</p>
          </div>
        )}

        {err && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">{err}</div>}

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {optOutCount != null ? `${optOutCount} khách đã từ chối nhận tin — tự động loại trừ.` : ''}
          </span>
          <button onClick={send} disabled={sending || (job && job.status === 'running')}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer">
            <Send className="w-3.5 h-3.5" /> Gửi ngay
          </button>
        </div>
      </div>

      {job && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-900">
            <span>{job.status === 'running' ? 'Đang gửi…' : 'Hoàn tất'}</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className={`h-2 rounded-full ${job.status === 'done' ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-4 text-slate-600 pt-1">
            <span>Thành công: <b className="text-emerald-700">{job.sent}</b></span>
            <span>Thất bại: <b className="text-rose-700">{job.failed}</b></span>
            <span>Bỏ qua (opt-out/SĐT lỗi): <b>{job.skipped}</b></span>
            <span>/ {job.total}</span>
          </div>
          {job.errors?.length > 0 && (
            <details className="text-[11px] text-slate-500">
              <summary className="cursor-pointer">Lỗi ({job.errors.length})</summary>
              <ul className="mt-1 space-y-0.5">{job.errors.slice(0, 20).map((e: any, i: number) => <li key={i}>{e.phone}: {e.error}</li>)}</ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
};
