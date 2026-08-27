import React, { useState } from 'react';
import {
  Compass,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Users,
  Calendar,
  Building2,
  HeartHandshake,
  Award,
  TrendingUp,
  Clock,
  PhoneCall,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { ActiveTab, Patient } from '../types';

interface PatientJourneyOverviewProps {
  onNavigate: (tab: ActiveTab) => void;
  patients: Patient[];
  onSelectPatient?: (patientId: string) => void;
}

export interface JourneyStage {
  id: string;
  stepNumber: number;
  name: string;
  title: string;
  targetTab: ActiveTab;
  tabLabel: string;
  color: string;
  bgLight: string;
  borderLight: string;
  description: string;
  keyMetrics: { label: string; value: string }[];
  liveTouchpoints: string[];
  systemCapabilities: string[];
}

export const PATIENT_JOURNEY_STAGES: JourneyStage[] = [
  {
    id: 'stage_1',
    stepNumber: 1,
    name: 'Giai đoạn 1',
    title: 'Nhận Biết & Thu Hút Đa Kênh',
    targetTab: 'marketing',
    tabLabel: 'Marketing Automation & Sales',
    color: 'text-blue-700',
    bgLight: 'bg-blue-50/70',
    borderLight: 'border-blue-200',
    description: 'Hứng Lead tự động từ Facebook Ads, Zalo OA, Website Form và phân bổ đội ngũ tư vấn theo phễu.',
    keyMetrics: [
      { label: 'Lead đa kênh', value: '1,420 Lead/tháng' },
      { label: 'Tỷ lệ phản hồi < 5p', value: '96.8%' }
    ],
    liveTouchpoints: [
      'Facebook Lead Ads tự động đồng bộ CRM',
      'Chatbot FAQ & AI Triage sàng lọc chuyên khoa 24/7',
      'Phễu Kanban cơ hội bán hàng B2C & B2B'
    ],
    systemCapabilities: [
      'Tự động phân nhóm bệnh nhân theo độ tuổi & tiền sử',
      'Chiến dịch Re-marketing Zalo ZNS / SMS đa điểm chạm'
    ]
  },
  {
    id: 'stage_2',
    stepNumber: 2,
    name: 'Giai đoạn 2',
    title: 'Đặt Lịch & Chuẩn Bị Trước Khám',
    targetTab: 'appointments',
    tabLabel: 'Lịch Khám & Triệt Tiêu No-Show',
    color: 'text-indigo-700',
    bgLight: 'bg-indigo-50/70',
    borderLight: 'border-indigo-200',
    description: 'Xác nhận lịch hẹn tức thì qua Zalo ZNS, dặn dò nhịn ăn T-24h và chỉ đường đỗ xe T-2h.',
    keyMetrics: [
      { label: 'Tỷ lệ No-Show', value: '3.9% (giảm từ 24%)' },
      { label: 'Tự động kích hoạt', value: '100% qua ZNS/SMS' }
    ],
    liveTouchpoints: [
      'Cổng đặt lịch trực tuyến theo Bác sĩ & Chuyên khoa',
      'Tin nhắn ZNS T-24h dặn dò nhịn ăn sáng lấy máu',
      'Tin nhắn ZNS T-2h gửi mã QR tiếp đón & chỉ đường'
    ],
    systemCapabilities: [
      'Tự động tối ưu khung giờ trống của Bác sĩ',
      'Kịch bản giữ chân khi bệnh nhân có nhu cầu dời/hủy hẹn'
    ]
  },
  {
    id: 'stage_3',
    stepNumber: 3,
    name: 'Giai đoạn 3',
    title: 'Tiếp Đón & Trải Nghiệm Tại Quầy',
    targetTab: 'patients',
    tabLabel: 'Hồ Sơ Khách Hàng 360°',
    color: 'text-teal-700',
    bgLight: 'bg-teal-50/70',
    borderLight: 'border-teal-200',
    description: 'Check-in trong 30s bằng CCCD/QR Code, đồng bộ EMR 360 độ và thông báo LIS/PACS tức thì.',
    keyMetrics: [
      { label: 'Thời gian check-in', value: '< 30 giây' },
      { label: 'Hồ sơ 360° tích hợp', value: '100% dữ liệu EMR' }
    ],
    liveTouchpoints: [
      'Tiếp đón & phân luồng thông minh theo STT',
      'Bác sĩ xem toàn diện lịch sử khám, dị ứng & đơn thuốc cũ',
      'Tự động thông báo Zalo khi có kết quả xét nghiệm'
    ],
    systemCapabilities: [
      'AI CRM Tóm tắt chân dung và nhu cầu người bệnh',
      'Bảo lãnh viện phí bảo hiểm tư nhân trực tuyến'
    ]
  },
  {
    id: 'stage_4',
    stepNumber: 4,
    name: 'Giai đoạn 4',
    title: 'Chăm Sóc Sau Khám & Hồi Phục',
    targetTab: 'care',
    tabLabel: 'CSKH & Quản Trị SLA 4 Cấp',
    color: 'text-emerald-700',
    bgLight: 'bg-emerald-50/70',
    borderLight: 'border-emerald-200',
    description: 'Điều dưỡng gọi điện hỏi thăm D+1, khảo sát CSAT D+3 và xử lý khiếu nại theo SLA cam kết.',
    keyMetrics: [
      { label: 'Chỉ số CSAT', value: '4.92 / 5.0 ⭐' },
      { label: 'SLA Tuân thủ', value: '98.6% chuẩn giờ' }
    ],
    liveTouchpoints: [
      'Tác vụ gọi điện D+1 hỏi thăm sau tiểu phẫu/nội soi',
      'Khảo sát hài lòng CSAT/NPS D+3 qua Zalo ZNS',
      'Trung tâm xử lý khiếu nại & cảnh báo SLA đa cấp'
    ],
    systemCapabilities: [
      'Tích hợp VoIP Softphone gọi 1-click từ CRM',
      'Playbook kịch bản xử lý đa tình huống y tế'
    ]
  },
  {
    id: 'stage_5',
    stepNumber: 5,
    name: 'Giai đoạn 5',
    title: 'Tái Khám & Quản Lý Mãn Tính',
    targetTab: 'care',
    tabLabel: 'Auto Recall Tái Khám Tự Động',
    color: 'text-amber-700',
    bgLight: 'bg-amber-50/70',
    borderLight: 'border-amber-200',
    description: 'Tự động tính ngày hết thuốc bệnh mãn tính, nhắc lịch khám thai theo tuần và tiêm chủng trẻ nhỏ.',
    keyMetrics: [
      { label: 'Tỷ lệ Tái khám lại', value: '+42.5% quay lại' },
      { label: 'Auto Recall Active', value: '24/7 theo phác đồ' }
    ],
    liveTouchpoints: [
      'Nhắc tái khám Tim mạch/Tiểu đường trước 3 ngày hết thuốc',
      'Nhắc lịch siêu âm hình thái thai nhi 12, 22, 32 tuần',
      'Nhắc mũi vắc xin nhắc lại theo tháng tuổi của bé'
    ],
    systemCapabilities: [
      'Tái đặt lịch hẹn 1-click ngay trên danh sách Recall',
      'Theo dõi tiến trình tuân thủ phác đồ điều trị'
    ]
  },
  {
    id: 'stage_6',
    stepNumber: 6,
    name: 'Giai đoạn 6',
    title: 'Hội Viên & Gắn Kết Trọn Đời',
    targetTab: 'loyalty',
    tabLabel: 'Hội Viên & Loyalty 360°',
    color: 'text-purple-700',
    bgLight: 'bg-purple-50/70',
    borderLight: 'border-purple-200',
    description: 'Thẻ hội viên điện tử 5 hạng, quà tặng sinh nhật tự động, chiết khấu và mạng lưới CTV giới thiệu.',
    keyMetrics: [
      { label: 'Hội viên hoạt động', value: '8,650 Thành viên' },
      { label: 'Doanh thu từ CTV', value: '4.85 tỷ VNĐ' }
    ],
    liveTouchpoints: [
      'Thẻ VIP điện tử tích điểm và hưởng ưu đãi tự động',
      'Tự động gửi Voucher mừng sinh nhật & lễ Tết',
      'Cổng Cộng tác viên (Bác sĩ vệ tinh & Khách giới thiệu)'
    ],
    systemCapabilities: [
      'Đổi điểm thưởng lấy Voucher khám sức khỏe miễn phí',
      'Báo giá nhanh kèm chiết khấu theo từng hạng thẻ'
    ]
  }
];

export const PatientJourneyOverview: React.FC<PatientJourneyOverviewProps> = ({
  onNavigate,
  patients = [],
  onSelectPatient
}) => {
  const [selectedStageId, setSelectedStageId] = useState<string>('stage_1');
  const activeStage = PATIENT_JOURNEY_STAGES.find(s => s.id === selectedStageId) || PATIENT_JOURNEY_STAGES[0];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-indigo-600" />
              Bản Đồ 6 Điểm Chạm Hành Trình Bệnh Nhân
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-200">
              End-to-End
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Chọn giai đoạn để khám phá tính năng và truy cập trực tiếp phân hệ
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>6/6 Điểm Chạm Hoạt Động</span>
          </span>
        </div>
      </div>

      {/* 6 Stages Stepper Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {PATIENT_JOURNEY_STAGES.map((stage) => {
          const isSelected = stage.id === selectedStageId;
          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStageId(stage.id)}
              className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? `${stage.bgLight} ${stage.borderLight} ring-2 ring-indigo-500/20 shadow-xs`
                  : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? stage.color : 'text-slate-500'}`}>
                    Bước {stage.stepNumber}
                  </span>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {stage.stepNumber}
                  </div>
                </div>
                <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight">
                  {stage.title}
                </h4>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Chi tiết</span>
                <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? stage.color : 'text-slate-400'}`} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Stage Deep-Dive Detail Card */}
      <div className={`p-5 rounded-2xl border ${activeStage.bgLight} ${activeStage.borderLight} transition-all space-y-4`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-md font-bold text-xs bg-white ${activeStage.color} border border-slate-200 shadow-2xs`}>
                Giai Đoạn {activeStage.stepNumber}: {activeStage.title}
              </span>
              <span className="text-xs text-slate-600 font-medium">
                Phân hệ chính: <strong>{activeStage.tabLabel}</strong>
              </span>
            </div>
            <p className="text-xs text-slate-700 font-medium leading-relaxed max-w-3xl">
              {activeStage.description}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate(activeStage.targetTab)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <span>Truy Cập Phân Hệ ({activeStage.tabLabel})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Column 1: Live Touchpoints */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              Điểm Chạm Trực Tiếp (Live Touchpoints):
            </span>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {activeStage.liveTouchpoints.map((t, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: System Engine & Automation */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Tính Năng Tự Động Hóa Thực Tế:
            </span>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {activeStage.systemCapabilities.map((c, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Live Real-world Metrics */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Chỉ Số Đo Lường Hiệu Quả (KPIs):
              </span>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {activeStage.keyMetrics.map((m, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">{m.label}</span>
                    <strong className="text-xs font-bold text-slate-900 block mt-0.5">{m.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Dữ liệu đồng bộ Real-time
              </span>
              <span className="text-indigo-600 font-bold">100% Sẵn Sàng</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
