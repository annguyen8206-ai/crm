import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Heart,
  Clock,
  Sparkles,
  MessageSquare,
  Activity,
  Send,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Stethoscope,
  Tag,
  Gift,
  Plus,
  Compass,
  FileCheck2,
  PhoneCall,
  MessageCircle,
  HelpCircle,
  Building2,
  CalendarCheck,
  Paperclip,
  Upload,
  Download,
  Trash2,
  Loader2
} from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import {
  Patient,
  InteractionLog,
  Branch,
  UserRole,
  Appointment,
  MembershipTier
} from '../types';
import { formatDateVN, formatDateTimeVN } from '../utils/dateUtils';
import { PatientAvatar } from './PatientAvatar';
import {
  Award,
  DollarSign,
  TrendingUp,
  Percent,
  Copy,
  Check,
  Zap,
  Sliders
} from 'lucide-react';

interface PatientDetailModalProps {
  patient: Patient | null;
  currentRole?: UserRole;
  interactions?: InteractionLog[];
  branches?: Branch[];
  appointments?: Appointment[];
  onClose: () => void;
  isOpen?: boolean;
  onAddInteraction?: (interaction: Omit<InteractionLog, 'id'>) => void;
  onBookAppointment?: (patientId: string) => void;
  onUpdatePatientTier?: (patientId: string, newTier: MembershipTier, newPoints?: number, reason?: string) => void;
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({
  patient,
  currentRole = 'Ban Giám Đốc',
  interactions = [],
  branches = [],
  appointments = [],
  onClose,
  onAddInteraction,
  onBookAppointment,
  onUpdatePatientTier
}) => {
  if (!patient) return null;

  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'appointments' | 'membership' | 'preferences' | 'files'>('timeline');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<{ summary: string; keyAlerts: string[]; actionPlan: string[] } | null>(null);

  // Upgrade Tier & Points Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [targetTier, setTargetTier] = useState<MembershipTier>(patient.membership.tier);
  const [pointsChange, setPointsChange] = useState<number>(100);
  const [tierChangeReason, setTierChangeReason] = useState('Khách hàng ký hợp đồng dịch vụ lớn / Ưu đãi đặc cách Sale');
  
  // Quick Quotation Calculator for Sales
  const [quoteService, setQuoteService] = useState('Gói Tầm Soát Ung Thư Toàn Diện');
  const [quoteBasePrice, setQuoteBasePrice] = useState<number>(15000000);
  const [isCopiedQuote, setIsCopiedQuote] = useState(false);

  // New Note / Interaction State
  const [newNote, setNewNote] = useState('');
  const [newSubject, setNewSubject] = useState('Tư vấn & Chăm sóc định kỳ');
  const [newChannel, setNewChannel] = useState<'Tổng đài (Call)' | 'Zalo ZNS' | 'Zalo OA Chat' | 'SMS Brandname' | 'Email' | 'Trực tiếp tại quầy'>('Tổng đài (Call)');
  const [newSentiment, setNewSentiment] = useState<'Tích cực' | 'Trung tính' | 'Tiêu cực'>('Tích cực');

  const patientInteractions = (interactions || []).filter(r => r && r.patientId === patient.id);
  const patientApts = (appointments || []).filter(a => a && (a.patientId === patient.id || a.patientPhone === patient.phone));

  const primaryBranch = (branches || []).find(b => b && b.id === patient.primaryBranchId);

  // Tier Discount Rates
  const getTierDiscount = (tier: MembershipTier) => {
    switch (tier) {
      case 'Diamond VIP': return { percent: 15, text: 'Giảm 15% tất cả dịch vụ', minSpend: 100000000, nextTier: null, nextPoints: 0 };
      case 'Platinum': return { percent: 12, text: 'Giảm 12% tất cả dịch vụ', minSpend: 50000000, nextTier: 'Diamond VIP', nextPoints: 7000 };
      case 'Gold': return { percent: 8, text: 'Giảm 8% tất cả dịch vụ', minSpend: 20000000, nextTier: 'Platinum', nextPoints: 3500 };
      case 'Silver': return { percent: 5, text: 'Giảm 5% tất cả dịch vụ', minSpend: 5000000, nextTier: 'Gold', nextPoints: 1500 };
      default: return { percent: 1, text: 'Tích 1% điểm thưởng', minSpend: 0, nextTier: 'Silver', nextPoints: 500 };
    }
  };

  const tierInfo = getTierDiscount(patient.membership.tier);
  const currentPoints = patient.membership.points || 0;
  const progressPercent = tierInfo.nextPoints > 0 ? Math.min(100, Math.round((currentPoints / tierInfo.nextPoints) * 100)) : 100;
  
  // Quotation Calculation
  const discountAmount = Math.round((quoteBasePrice * tierInfo.percent) / 100);
  const finalPrice = quoteBasePrice - discountAmount;

  const handleCopyQuoteText = () => {
    const text = `Kính gửi Quý khách ${patient.name},\nBệnh viện gửi báo giá ưu đãi dành riêng cho Hội viên Hạng ${patient.membership.tier}:\n- Dịch vụ: ${quoteService}\n- Giá niêm yết: ${quoteBasePrice.toLocaleString()} đ\n- Ưu đãi Hội viên (${tierInfo.percent}%): -${discountAmount.toLocaleString()} đ\n👉 Tổng thanh toán: ${finalPrice.toLocaleString()} đ\nKính mời Quý khách đặt lịch khám để nhận ưu đãi!`;
    navigator.clipboard.writeText(text);
    setIsCopiedQuote(true);
    setTimeout(() => setIsCopiedQuote(false), 2500);
  };

  const handleApplyTierUpgrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdatePatientTier) {
      onUpdatePatientTier(patient.id, targetTier, pointsChange, tierChangeReason);
    }
    // Also record in interaction log
    if (onAddInteraction) {
      onAddInteraction({
        patientId: patient.id,
        patientName: patient.name,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        channel: 'Trực tiếp tại quầy',
        staffName: currentRole,
        subject: `Nâng hạng hội viên sang ${targetTier}`,
        content: `Đã nâng hạng thành công sang [${targetTier}] (+${pointsChange} điểm thưởng). Lý do: ${tierChangeReason}`,
        sentiment: 'Tích cực'
      });
    }
    setIsUpgradeModalOpen(false);
  };

  const handleGenerateAiCrmSummary = async () => {
    setIsSummarizing(true);
    try {
      const res = await fetch('/api/ai/summarize-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientData: {
            ...patient,
            interactions: patientInteractions,
            appointments: patientApts
          }
        })
      });
      const data = await res.json();
      setAiSummary(data);
    } catch (e) {
      console.error("AI CRM Summary error:", e);
      // Fallback AI insight
      setAiSummary({
        summary: `Khách hàng ${patient.name} thuộc phân khúc ${patient.membership.tier}, có tổng cộng ${patientInteractions.length} lần tương tác CSKH và ${patientApts.length} lịch khám. Tần suất tái khám tốt, có mức độ hài lòng cao với dịch vụ.`,
        keyAlerts: [
          'Khách hàng có nhu cầu tư vấn thêm về gói tầm soát sức khỏe tổng quát gia đình',
          'Ưu tiên liên hệ qua Zalo ZNS hoặc Tổng đài vào khung giờ 14:00 - 17:00'
        ],
        actionPlan: [
          'Gửi tin nhắn Zalo chăm sóc sau khám và nhắc lịch tái khám định kỳ',
          'Đề xuất chương trình ưu đãi tri ân hội viên ' + patient.membership.tier
        ]
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCreateInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    if (onAddInteraction) {
      onAddInteraction({
        patientId: patient.id,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        channel: newChannel,
        staffName: 'Chuyên viên CSKH',
        type: 'Outbound',
        subject: newSubject,
        content: newNote,
        sentiment: newSentiment
      });
    }
    setNewNote('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PatientAvatar
              src={patient.avatar}
              name={patient.name}
              gender={patient.gender}
              className="w-13 h-13 rounded-2xl ring-2 ring-blue-500/30 object-cover shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{patient.name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono font-bold border border-blue-200">
                  {patient.pid}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
                  patient.membership.tier === 'Diamond VIP' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                  patient.membership.tier === 'Platinum' ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' :
                  'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  ★ {patient.membership.tier} ({patient.membership.points.toLocaleString()} điểm)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Hồ Sơ Khách Hàng 360° | Cơ sở: {primaryBranch?.shortName || 'VitHospital Trung Tâm'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={handleGenerateAiCrmSummary}
              disabled={isSummarizing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin' : ''}`} />
              <span>{isSummarizing ? 'Đang phân tích...' : 'AI Phân Tích Chăm Sóc'}</span>
            </button>

            <button
              onClick={() => {
                if (onBookAppointment) {
                  onBookAppointment(patient.id);
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>+ Đặt Lịch Khám Mới</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AI Summary Banner (if generated) */}
        {aiSummary && (
          <div className="bg-indigo-50/90 border-b border-indigo-100 p-4 px-6 text-xs text-indigo-950 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-indigo-900">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Đề Xuất Kịch Bản Chăm Sóc & Cơ Hội Tương Tác (AI CRM Insights)
              </span>
              <span className="text-[11px] text-indigo-600 font-medium">Tự động phân tích lịch sử khám & tương tác</span>
            </div>
            <p className="text-slate-700 leading-relaxed font-medium">{aiSummary.summary}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-xs">
                <span className="font-bold text-amber-800 block mb-1">Điểm cần lưu ý khi tiếp xúc:</span>
                <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                  {aiSummary.keyAlerts.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
              <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-xs">
                <span className="font-bold text-emerald-700 block mb-1">Hành động đề xuất cho đội ngũ CSKH:</span>
                <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                  {aiSummary.actionPlan.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Patient CRM Quick Stats Bar */}
        <div className="bg-white px-6 py-3.5 border-b border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <span className="text-slate-500 block">Tuổi & Giới tính</span>
            <span className="font-bold text-slate-900">{patient.age} tuổi ({patient.gender}) {patient.dob ? ` - ${formatDateVN(patient.dob)}` : ''}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Số điện thoại</span>
            <span className="font-bold text-blue-700 flex items-center gap-1 font-mono">
              <Phone className="w-3 h-3 text-blue-600" />
              {patient.phone}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Địa chỉ</span>
            <span className="font-medium text-slate-800 truncate block" title={patient.address}>
              {patient.address || 'Hà Nội'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Tổng số lần tương tác</span>
            <span className="font-bold text-slate-900">{patientInteractions.length} lượt chăm sóc</span>
          </div>
          <div>
            <span className="text-slate-500 block">Bác sĩ phụ trách tư vấn</span>
            <span className="font-bold text-slate-900">{patient.assignedDoctor || 'BS. Trưởng khoa CSKH'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Lần liên hệ gần nhất</span>
            <span className="font-bold text-slate-900">
              {patientInteractions.length > 0 ? formatDateVN(patientInteractions[0].timestamp.split(' ')[0]) : (patient.lastVisitDate ? formatDateVN(patient.lastVisitDate) : 'Chưa ghi nhận')}
            </span>
          </div>
        </div>

        {/* Presentation Layer Tabs Navigation */}
        <div className="bg-slate-50 px-6 border-b border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab('timeline')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeSubTab === 'timeline'
                ? 'border-blue-600 text-blue-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Lịch Sử Chăm Sóc & Tương Tác ({patientInteractions.length})</span>
          </button>
          
          <button
            onClick={() => setActiveSubTab('appointments')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeSubTab === 'appointments'
                ? 'border-blue-600 text-blue-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Lịch Hẹn & Dịch Vụ Đã Đặt ({patientApts.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('membership')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeSubTab === 'membership'
                ? 'border-amber-600 text-amber-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>Hạng Hội Viên & Công Cụ Sale (VIP {patient.membership.tier})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('preferences')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeSubTab === 'preferences'
                ? 'border-blue-600 text-blue-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Nhu Cầu & Sở Thích Khách Hàng</span>
          </button>

          <button
            onClick={() => setActiveSubTab('files')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeSubTab === 'files'
                ? 'border-blue-600 text-blue-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            <span>Tệp Đính Kèm</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          
          {/* TAB 1: CRM Interactions & Notes */}
          {activeSubTab === 'timeline' && (
            <div className="space-y-4">
              {/* Add Interaction Form */}
              <form onSubmit={handleCreateInteraction} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    Thêm Ghi Chú Chăm Sóc & Nhật Ký Tương Tác Khách Hàng
                  </span>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={newChannel}
                      onChange={(e) => setNewChannel(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-2.5 py-1 text-slate-700 font-semibold cursor-pointer"
                    >
                      <option value="Tổng đài (Call)">Tổng đài (Call)</option>
                      <option value="Zalo ZNS">Zalo ZNS</option>
                      <option value="Zalo OA Chat">Zalo OA Chat</option>
                      <option value="SMS Brandname">SMS Brandname</option>
                      <option value="Email">Email</option>
                      <option value="Trực tiếp tại quầy">Trực tiếp tại quầy</option>
                    </select>

                    <select
                      value={newSentiment}
                      onChange={(e) => setNewSentiment(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-2.5 py-1 text-slate-700 font-semibold cursor-pointer"
                    >
                      <option value="Tích cực">Thái độ: Tích cực</option>
                      <option value="Trung tính">Thái độ: Trung tính</option>
                      <option value="Tiêu cực">Thái độ: Cần giải quyết</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Chủ đề tương tác (VD: Hỏi thăm sau khám, Tư vấn gói khám...)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold focus:bg-white"
                  />
                  <div className="sm:col-span-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Nhập nội dung tư vấn, phản hồi của khách hàng, ghi chú mong muốn đặc biệt..."
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Lưu Nhật Ký Chăm Sóc</span>
                  </button>
                </div>
              </form>

              {/* Interactions List */}
              <div className="space-y-3">
                {patientInteractions.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">
                    Chưa có nhật ký tương tác nào cho khách hàng này. Nhập biểu mẫu phía trên để bắt đầu ghi nhận.
                  </div>
                ) : (
                  patientInteractions.map((log) => (
                    <div key={log.id} className="bg-white border border-slate-200 rounded-2xl p-4 text-xs space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                            {log.channel}
                          </span>
                          <span className="font-bold text-slate-900">{log.subject}</span>
                          {log.sentiment && (
                            <span className={`px-2 py-0.2 rounded-md font-bold text-[10px] ${
                              log.sentiment === 'Tích cực' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              log.sentiment === 'Tiêu cực' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {log.sentiment}
                            </span>
                          )}
                        </div>
                        <span className="text-slate-400 text-[11px] font-medium">{formatDateTimeVN(log.timestamp)}</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {log.content}
                      </p>
                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                        <span>Nhân sự chăm sóc: <span className="font-bold text-slate-700">{log.staffName}</span></span>
                        {log.duration && <span className="text-slate-500">Thời lượng cuộc gọi: {log.duration}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Appointments & Service Bookings */}
          {activeSubTab === 'appointments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Danh Sách Lịch Hẹn & Dịch Vụ Khách Hàng Đã Đặt</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Theo dõi lịch khám sắp tới, dịch vụ đã hoàn tất và lịch sử đặt hẹn đa kênh</p>
                </div>
                <button
                  onClick={() => {
                    if (onBookAppointment) {
                      onBookAppointment(patient.id);
                    }
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Đặt Lịch Mới Cho Khách</span>
                </button>
              </div>

              <div className="space-y-3">
                {patientApts.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">
                    Khách hàng chưa có lịch hẹn nào trên hệ thống. Bấm <strong>+ Đặt Lịch Mới Cho Khách</strong> để xếp lịch.
                  </div>
                ) : (
                  patientApts.map((apt) => (
                    <div key={apt.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-xs space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{formatDateVN(apt.appointmentDate)}</span>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-mono font-bold">
                            {apt.timeSlot}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">{apt.code}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                          apt.status === 'Đã khám xong' || apt.status === 'Đã hoàn thành' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          apt.status === 'Đã xác nhận' || apt.status === 'Đã tiếp đón' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {apt.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-700">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Khoa / Chuyên khoa</span>
                          <span className="font-bold text-slate-900">{apt.department}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Bác sĩ phụ trách</span>
                          <span className="font-semibold text-slate-900">{apt.doctorName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Kênh đặt lịch</span>
                          <span className="font-semibold text-blue-700">{apt.bookingChannel}</span>
                        </div>
                      </div>

                      {apt.notes && (
                        <p className="text-slate-600 bg-slate-50 p-2 rounded-lg text-[11px]">
                          <strong>Ghi chú nhu cầu:</strong> {apt.notes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Membership & Sales Suite */}
          {activeSubTab === 'membership' && (
            <div className="space-y-5 text-xs">
              {/* Digital VIP Membership Card */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-400" />
                      <span className="text-amber-400 font-bold uppercase tracking-wider text-[11px]">Thẻ Hội Viên Điện Tử Bệnh Viện</span>
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight mt-1">{patient.name}</h3>
                    <div className="flex items-center gap-3 text-slate-300 text-xs mt-1">
                      <span>Mã định danh: <strong className="font-mono text-white">{patient.pid}</strong></span>
                      <span>•</span>
                      <span>SĐT: <strong className="font-mono text-white">{patient.phone}</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-extrabold uppercase">
                        ★ Hạng {patient.membership.tier}
                      </span>
                      <button
                        onClick={() => {
                          setTargetTier(patient.membership.tier);
                          setIsUpgradeModalOpen(true);
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Nâng/Đổi Hạng</span>
                      </button>
                    </div>
                    <div className="text-xs text-slate-300">
                      Điểm tích lũy: <strong className="text-amber-300 font-mono text-sm">{currentPoints.toLocaleString()}</strong> điểm
                    </div>
                  </div>
                </div>

                {/* Progress bar to next tier */}
                <div className="mt-5 pt-4 border-t border-slate-700/60 relative z-10 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Tiến trình thăng hạng {tierInfo.nextTier ? `lên [${tierInfo.nextTier}]` : '(Đã đạt hạng cao nhất)'}</span>
                    <span className="font-mono text-amber-300 font-bold">
                      {currentPoints.toLocaleString()} / {tierInfo.nextPoints > 0 ? `${tierInfo.nextPoints.toLocaleString()} điểm` : 'Tối đa'} ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden ring-1 ring-slate-700">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-yellow-300 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  {tierInfo.nextTier && (
                    <p className="text-[11px] text-slate-400">
                      💡 Cần tích lũy thêm <strong>{Math.max(0, tierInfo.nextPoints - currentPoints).toLocaleString()} điểm</strong> (hoặc chi tiêu thêm khoảng <strong>{((tierInfo.nextPoints - currentPoints) * 10000).toLocaleString()} đ</strong>) để tự động thăng hạng <strong>{tierInfo.nextTier}</strong>.
                    </p>
                  )}
                </div>
              </div>

              {/* Grid: Sales Privilege & Quick Quote Calculator */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sales Privileges & Benefits */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <Percent className="w-4 h-4 text-emerald-600" />
                        Đặc Quyền Hội Viên & Mức Chiết Khấu Sale
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                        {tierInfo.text}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 text-slate-700">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Chiết khấu dịch vụ:</strong> Áp dụng giảm ngay <strong>{tierInfo.percent}%</strong> cho tất cả dịch vụ khám, xét nghiệm và phẫu thuật.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Ưu tiên đặt lịch & Tiếp đón:</strong> Xếp lịch ưu tiên với Bác sĩ Trưởng/Phó khoa, không chờ đợi tại quầy.
                        </div>
                      </div>
                      {patient.membership.tier === 'Diamond VIP' && (
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>Đặc quyền Diamond:</strong> Xe y tế đưa đón tận nhà, phòng nghỉ VIP cao cấp, quà tặng sinh nhật & lễ Tết trị giá 2.000.000đ.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">Chính sách áp dụng toàn hệ thống</span>
                    <button
                      onClick={() => {
                        setTargetTier(patient.membership.tier);
                        setIsUpgradeModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      <span>Cộng/Trừ Điểm & Nâng Hạng</span>
                    </button>
                  </div>
                </div>

                {/* Sales Quick Quotation Generator */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                      Công Cụ Báo Giá Nhanh (Sale Quick Quote)
                    </span>
                    <span className="text-slate-500 text-[11px]">Tự động trừ % VIP</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Gói dịch vụ tư vấn cho khách:</label>
                      <select
                        value={quoteService}
                        onChange={(e) => {
                          setQuoteService(e.target.value);
                          if (e.target.value.includes('Ung Thư')) setQuoteBasePrice(15000000);
                          else if (e.target.value.includes('Đột Quỵ')) setQuoteBasePrice(12500000);
                          else if (e.target.value.includes('Tổng Quát')) setQuoteBasePrice(4500000);
                          else if (e.target.value.includes('Sinh Mổ')) setQuoteBasePrice(35000000);
                          else setQuoteBasePrice(8000000);
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white"
                      >
                        <option value="Gói Tầm Soát Ung Thư Toàn Diện">Gói Tầm Soát Ung Thư Toàn Diện (15,000,000 đ)</option>
                        <option value="Gói Tầm Soát Đột Quỵ & Tim Mạch Chuyên Sâu">Gói Tầm Soát Đột Quỵ & Tim Mạch Chuyên Sâu (12,500,000 đ)</option>
                        <option value="Gói Khám Sức Khỏe Tổng Quát VIP Executive">Gói Khám Sức Khỏe Tổng Quát VIP Executive (4,500,000 đ)</option>
                        <option value="Gói Sinh Mổ Trọn Gói Phòng Tổng Thống VIP">Gói Sinh Mổ Trọn Gói Phòng Tổng Thống VIP (35,000,000 đ)</option>
                        <option value="Liệu trình Trẻ Hóa Da Công Nghệ Cao Ultherapy">Liệu trình Trẻ Hóa Da Công Nghệ Cao Ultherapy (8,000,000 đ)</option>
                      </select>
                    </div>

                    <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1 text-slate-800">
                      <div className="flex justify-between">
                        <span>Giá gốc niêm yết:</span>
                        <span className="font-mono font-semibold">{quoteBasePrice.toLocaleString()} đ</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Ưu đãi hạng {patient.membership.tier} (-{tierInfo.percent}%):</span>
                        <span className="font-mono">-{discountAmount.toLocaleString()} đ</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-blue-200 font-bold text-sm text-blue-900">
                        <span>Giá thanh toán cho khách:</span>
                        <span className="font-mono text-emerald-700">{finalPrice.toLocaleString()} đ</span>
                      </div>
                    </div>

                    <button
                      onClick={handleCopyQuoteText}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      {isCopiedQuote ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                      <span>{isCopiedQuote ? 'Đã sao chép nội dung báo giá!' : 'Sao chép văn bản báo giá gửi Zalo / SMS cho khách'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tier Upgrade Rules Guide for Sales */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <span className="font-bold text-slate-900 block text-xs">Quy chế thăng hạng & Tích lũy điểm dành cho Đội ngũ Sale / CSKH:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-0.5">
                    <span className="font-bold text-slate-800 block">1. Hạng Silver</span>
                    <span className="text-slate-500 block">500 - 1,500 điểm (Chi tiêu từ 5 tr)</span>
                    <span className="text-emerald-700 font-bold">Giảm 5% dịch vụ</span>
                  </div>
                  <div className="p-2.5 bg-white border border-yellow-200 rounded-xl space-y-0.5">
                    <span className="font-bold text-yellow-800 block">2. Hạng Gold</span>
                    <span className="text-slate-500 block">1,500 - 3,500 điểm (Chi tiêu từ 20 tr)</span>
                    <span className="text-emerald-700 font-bold">Giảm 8% + Tặng KSK</span>
                  </div>
                  <div className="p-2.5 bg-white border border-indigo-200 rounded-xl space-y-0.5">
                    <span className="font-bold text-indigo-800 block">3. Hạng Platinum</span>
                    <span className="text-slate-500 block">3,500 - 7,000 điểm (Chi tiêu từ 50 tr)</span>
                    <span className="text-emerald-700 font-bold">Giảm 12% + Phòng VIP</span>
                  </div>
                  <div className="p-2.5 bg-white border border-amber-200 rounded-xl space-y-0.5">
                    <span className="font-bold text-amber-800 block">4. Hạng Diamond VIP</span>
                    <span className="text-slate-500 block">&gt; 7,000 điểm (Chi tiêu từ 100 tr)</span>
                    <span className="text-emerald-700 font-bold">Giảm 15% + Xe đưa đón</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Preferences & Customer Profile 360 */}
          {activeSubTab === 'preferences' && (
            <div className="space-y-4 text-xs">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Heart className="w-4 h-4 text-rose-500" />
                  Chân Dung & Sở Thích Khách Hàng (Customer 360 Profile)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Segment & Tier Info */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                    <span className="font-bold text-slate-900 block text-xs">Hạng Thành Viên & Ưu Đãi Hội Viên</span>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Phân hạng tích lũy:</span>
                      <span className="font-bold text-blue-700">{patient.membership.tier}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Điểm thưởng tích lũy:</span>
                      <span className="font-mono font-bold text-amber-700">{patient.membership.points.toLocaleString()} điểm</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Tỷ lệ ưu đãi giảm giá:</span>
                      <span className="font-bold text-emerald-700">
                        {patient.membership.tier === 'Diamond VIP' ? 'Giảm 15% tất cả dịch vụ' :
                         patient.membership.tier === 'Platinum' ? 'Giảm 12% tất cả dịch vụ' :
                         patient.membership.tier === 'Gold' ? 'Giảm 8% tất cả dịch vụ' :
                         patient.membership.tier === 'Silver' ? 'Giảm 5% dịch vụ' : 'Tích 1% điểm'}
                      </span>
                    </div>
                  </div>

                  {/* Service Interests */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                    <span className="font-bold text-slate-900 block text-xs">Gói Dịch Vụ Quan Tâm / Đã Sử Dụng</span>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2.5 py-1 bg-white border border-blue-200 text-blue-700 rounded-lg font-bold">
                        Gói Tầm Soát Ung Thư Toàn Diện
                      </span>
                      <span className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-700 rounded-lg font-bold">
                        Khám Sức Khỏe Tổng Quát VIP
                      </span>
                      <span className="px-2.5 py-1 bg-white border border-purple-200 text-purple-700 rounded-lg font-bold">
                        Dịch Vụ Bác Sĩ Gia Đình
                      </span>
                    </div>
                  </div>
                </div>

                {/* Customer Care Notes */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block">Ghi Chú Đặc Biệt Của Đội Ngũ CSKH & Lễ Tân:</span>
                  <ul className="list-disc list-inside text-slate-700 space-y-1">
                    <li>Khách thích đặt lịch vào buổi sáng các ngày trong tuần (ưu tiên khung 08:30 - 10:00).</li>
                    <li>Ưu tiên nhận tin nhắn nhắc hẹn qua Zalo ZNS trước ngày khám 24 giờ.</li>
                    <li>Cần chuẩn bị phòng chờ VIP và nước uống khi đến tiếp đón tại quầy.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'files' && (
            <PatientFilesSection patientId={patient.id} />
          )}

        </div>

        {/* Modal: Upgrade Tier & Adjust Points */}
        {isUpgradeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-slate-900 text-base">Nâng Hạng Hội Viên & Điều Chỉnh Điểm</h3>
                </div>
                <button
                  onClick={() => setIsUpgradeModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleApplyTierUpgrade} className="space-y-3.5 text-xs">
                <div>
                  <span className="text-slate-500 block">Khách hàng thụ hưởng:</span>
                  <div className="font-bold text-slate-900 text-sm">{patient.name} ({patient.phone})</div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chọn Hạng Hội Viên Mới:</label>
                  <select
                    value={targetTier}
                    onChange={(e) => setTargetTier(e.target.value as MembershipTier)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white"
                  >
                    <option value="Standard">Standard (Tiêu chuẩn - Tích 1% điểm)</option>
                    <option value="Silver">Silver (Bạc - Giảm 5% dịch vụ)</option>
                    <option value="Gold">Gold (Vàng - Giảm 8% dịch vụ)</option>
                    <option value="Platinum">Platinum (Bạch kim - Giảm 12% dịch vụ)</option>
                    <option value="Diamond VIP">Diamond VIP (Kim cương - Giảm 15% + Xe đưa đón VIP)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cộng / Trừ Điểm Thưởng Tích Lũy (+/- Điểm):</label>
                  <input
                    type="number"
                    value={pointsChange}
                    onChange={(e) => setPointsChange(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:bg-white"
                    placeholder="VD: 500 (hoặc -200 nếu trừ)"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Điểm hiện tại: {currentPoints.toLocaleString()} ➔ Sau điều chỉnh: {(currentPoints + pointsChange).toLocaleString()} điểm
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lý do nâng hạng / Điều chỉnh điểm:</label>
                  <textarea
                    required
                    rows={2}
                    value={tierChangeReason}
                    onChange={(e) => setTierChangeReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white"
                    placeholder="VD: Khách hàng ký hợp đồng dịch vụ lớn, Đặc cách Ban Giám Đốc, Quà tri an sinh nhật..."
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUpgradeModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Xác Nhận Nâng Hạng</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tệp đính kèm hồ sơ bệnh nhân (ảnh chụp, kết quả, giấy tờ...)
// ---------------------------------------------------------------------------
type FileRow = {
  id: string;
  filename: string;
  mime: string;
  size: number | string;
  uploadedByName?: string;
  createdAt: string;
};

const formatBytes = (raw: number | string) => {
  const n = Number(raw) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const PatientFilesSection: React.FC<{ patientId: string }> = ({ patientId }) => {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.files.list('patient', patientId);
      setFiles(res.files || []);
    } catch (e: any) {
      setError(e?.message || 'Không tải được danh sách tệp');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.files.upload('patient', patientId, file);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Tải lên thất bại');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string, name: string) => {
    if (!window.confirm(`Xoá tệp "${name}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.files.remove(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Không xoá được tệp');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-blue-600" />
            Tệp Đính Kèm
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Ảnh chụp, kết quả xét nghiệm, giấy tờ... (PDF, ảnh, Word, Excel — tối đa 15MB)
          </p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span>Tải lên</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={onPick}
          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv"
        />
      </div>

      {error && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
        </div>
      ) : files.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl">
          Chưa có tệp nào. Nhấn <span className="font-bold text-slate-500">Tải lên</span> để thêm.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 overflow-hidden">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 p-3 hover:bg-slate-50">
              <FileCheck2 className="w-5 h-5 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">{f.filename}</p>
                <p className="text-[10px] text-slate-500">
                  {formatBytes(f.size)} · {formatDateTimeVN(f.createdAt)}
                  {f.uploadedByName ? ` · ${f.uploadedByName}` : ''}
                </p>
              </div>
              <a
                href={apiClient.files.downloadUrl(f.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Tải xuống / Xem"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                onClick={() => onDelete(f.id, f.filename)}
                disabled={busy}
                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Xoá tệp"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
