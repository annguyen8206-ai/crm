import React, { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<'campaigns' | 'segments' | 'rules'>('campaigns');
  
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
      </div>

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
