import React, { useState } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  User,
  CheckCircle2,
  Calendar,
  Volume2,
  FileText,
  MessageSquare,
  Share2,
  Filter,
  Check,
  AlertTriangle,
  UserCheck,
  Headphones,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Play,
  Pause
} from 'lucide-react';
import { Patient, BranchId, Branch } from '../types';

export interface CallLogItem {
  id: string;
  patientId?: string;
  callerName: string;
  callerPhone: string;
  direction: 'inbound' | 'outbound' | 'missed';
  agentName: string;
  department: string;
  timestamp: string;
  durationSeconds: number;
  status: 'Thành công' | 'Nhỡ' | 'Bận máy';
  recordingUrl?: string;
  sentiment: 'Hài lòng' | 'Trung tính' | 'Bức xúc / Gấp';
  notes: string;
  hasAudioTranscription?: boolean;
  transcription?: string;
  callTopic: 'Tư vấn giá & Đặt hẹn' | 'Tư vấn gói khám sức khỏe' | 'Phản ánh thái độ / SLA' | 'Hỏi chính sách hội viên' | 'Chăm sóc sau khám & phẫu thuật';
}

export interface CarePathwayPatient {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  gender: string;
  age: number;
  pathwayType: 'Theo dõi hậu phẫu Ngoại khoa (D+1 -> D+30)' | 'Quản lý Mạn tính Tim mạch & Tăng HA' | 'Quản lý Đái tháo đường Type 2' | 'Chăm sóc Mẹ & Bé sau sinh VIP';
  doctorName: string;
  startDate: string;
  currentDayIndex: number;
  totalDays: number;
  complianceRate: number; // 0-100%
  latestVitals: {
    bloodPressure?: string;
    bloodSugar?: string;
    temperature?: string;
    painScore?: number; // 1-10
    woundStatus?: 'Khô ráo, liền tốt' | 'Hơi sưng nề' | 'Rỉ dịch / Cần tái khám gấp';
    lastUpdated: string;
  };
  alertLevel: 'Bình thường' | 'Cảnh báo vàng' | 'Khẩn cấp đỏ';
  tasks: {
    day: number;
    title: string;
    channel: 'Zalo ZNS' | 'SMS' | 'Call CSKH' | 'Tái khám tại viện';
    status: 'Đã hoàn thành' | 'Đang chờ' | 'Bệnh nhân chưa phản hồi';
  }[];
}

export interface OmnichannelRoutingRule {
  id: string;
  channel: 'Zalo OA' | 'Hotline 24/7' | 'Facebook Fanpage' | 'Website LiveChat' | 'SMS CSKH';
  condition: string;
  priority: 'Khẩn cấp' | 'Cao' | 'Tiêu chuẩn';
  assignedTeam: string;
  assignedStaff: string;
  slaMinutes: number;
  active: boolean;
}

interface AdvancedCrmModulesProps {
  patients: Patient[];
  branches: Branch[];
  currentBranchId: BranchId;
  onSelectPatient?: (id: string) => void;
  onOpenPatientDetail?: (patient: Patient) => void;
}

export const AdvancedCrmModules: React.FC<AdvancedCrmModulesProps> = ({
  patients = [],
  branches = [],
  currentBranchId,
  onSelectPatient,
  onOpenPatientDetail
}) => {
  const [subModule, setSubModule] = useState<'voip' | 'care_pathway' | 'omnichannel'>('voip');

  // --- VOIP CALL CENTER STATE ---
  const [callLogs, setCallLogs] = useState<CallLogItem[]>([
    {
      id: 'CALL-001',
      patientId: 'P-1',
      callerName: 'Nguyễn Thị Thu Hương',
      callerPhone: '0912345678',
      direction: 'inbound',
      agentName: 'Đậu Thị Hồng (CSKH 1)',
      department: 'Tổng Đài CSKH 24/7',
      timestamp: '2026-08-19 10:15',
      durationSeconds: 195,
      status: 'Thành công',
      sentiment: 'Hài lòng',
      callTopic: 'Tư vấn giá & Đặt hẹn',
      notes: 'Khách hàng hỏi tư vấn gói sinh mổ trọn gói phòng đơn VIP tại cơ sở Cầu Giấy, đã chốt lịch khám thai thứ 7 tuần này.',
      hasAudioTranscription: true,
      transcription: 'Khách hàng: Dạ chào phòng khám, tôi muốn hỏi gói sinh mổ VIP có bao gồm phòng riêng gia đình không?... CSKH: Dạ chào chị Hương, gói VIP đã bao gồm 3 ngày 2 đêm phòng riêng cao cấp và suất ăn dinh dưỡng ạ...'
    },
    {
      id: 'CALL-002',
      patientId: 'P-2',
      callerName: 'Phạm Văn Nam',
      callerPhone: '0988776655',
      direction: 'outbound',
      agentName: 'Nguyễn Bích Thảo (Điều dưỡng CSKH)',
      department: 'Tổ Chăm Sóc Khách Hàng Sau Khám',
      timestamp: '2026-08-19 09:30',
      durationSeconds: 140,
      status: 'Thành công',
      sentiment: 'Hài lòng',
      callTopic: 'Chăm sóc sau khám & phẫu thuật',
      notes: 'Hỏi thăm ngày D+3 sau mổ nội soi ruột thừa. Vết mổ khô, không sốt, đã ăn cháo loãng. Nhắc lịch tái khám chăm sóc.',
      hasAudioTranscription: true,
      transcription: 'Điều dưỡng CSKH: Chào anh Nam, em là Thảo bộ phận CSKH gọi hỏi thăm tình hình sức khỏe của anh hôm nay thế nào rồi ạ?... Anh Nam: Cảm ơn cô, anh thấy đỡ đau nhiều rồi, ăn ngủ tốt...'
    },
    {
      id: 'CALL-003',
      callerName: 'Trần Văn Kiên',
      callerPhone: '0903112233',
      direction: 'missed',
      agentName: 'Hàng chờ tự động ACD',
      department: 'Tổng Đài CSKH',
      timestamp: '2026-08-19 08:45',
      durationSeconds: 0,
      status: 'Nhỡ',
      sentiment: 'Bức xúc / Gấp',
      callTopic: 'Tư vấn gói khám sức khỏe',
      notes: 'Khách gọi vào giờ cao điểm, hàng chờ 45s bị ngắt. Cần gọi lại ngay (Callback SLA 5 phút).'
    }
  ]);

  // Click to call simulation modal
  const [activeCallDial, setActiveCallDial] = useState<{
    phone: string;
    name: string;
    patient?: Patient;
  } | null>(null);
  const [callDurationTimer, setCallDurationTimer] = useState(0);
  const [isCallingActive, setIsCallingActive] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // --- CARE PATHWAY STATE ---
  const [carePathways, setCarePathways] = useState<CarePathwayPatient[]>([
    {
      id: 'PATH-001',
      patientId: 'P-1',
      patientName: 'Trần Mai Linh',
      patientPhone: '0977889900',
      gender: 'Nữ',
      age: 29,
      pathwayType: 'Chăm sóc Mẹ & Bé sau sinh VIP',
      doctorName: 'BS. CKII Lê Hoàng Mai (Sản Khoa)',
      startDate: '2026-08-15',
      currentDayIndex: 4,
      totalDays: 30,
      complianceRate: 95,
      latestVitals: {
        temperature: '36.8°C',
        painScore: 2,
        woundStatus: 'Khô ráo, liền tốt',
        lastUpdated: '2026-08-19 08:00'
      },
      alertLevel: 'Bình thường',
      tasks: [
        { day: 1, title: 'Hướng dẫn cho con bú đúng khớp ngậm & vệ sinh tầng sinh môn', channel: 'Zalo ZNS', status: 'Đã hoàn thành' },
        { day: 3, title: 'Cuộc gọi điều dưỡng hỏi thăm tình trạng tiết sữa & đau vết mổ', channel: 'Call CSKH', status: 'Đã hoàn thành' },
        { day: 7, title: 'Nhắc lịch tiêm chủng mũi Lao & Viêm gan B cho bé', channel: 'Zalo ZNS', status: 'Đang chờ' },
        { day: 30, title: 'Khám phụ khoa hậu sản & đánh giá sức khỏe phục hồi', channel: 'Tái khám tại viện', status: 'Đang chờ' }
      ]
    },
    {
      id: 'PATH-002',
      patientId: 'P-2',
      patientName: 'Nguyễn Văn Hùng',
      patientPhone: '0913554433',
      gender: 'Nam',
      age: 62,
      pathwayType: 'Quản lý Mạn tính Tim mạch & Tăng HA',
      doctorName: 'PGS.TS Trần Bá Thắng (Viện Tim Mạch)',
      startDate: '2026-08-01',
      currentDayIndex: 19,
      totalDays: 90,
      complianceRate: 78,
      latestVitals: {
        bloodPressure: '148/92 mmHg (Cảnh báo)',
        temperature: '37.0°C',
        lastUpdated: '2026-08-19 07:30'
      },
      alertLevel: 'Cảnh báo vàng',
      tasks: [
        { day: 7, title: 'Gửi bảng nhật ký theo dõi huyết áp 2 lần/ngày qua Zalo Mini App', channel: 'Zalo ZNS', status: 'Đã hoàn thành' },
        { day: 14, title: 'Nhắc uống thuốc định kỳ đúng 8h sáng', channel: 'SMS', status: 'Đã hoàn thành' },
        { day: 20, title: 'Chuyên viên CSKH gọi hỗ trợ tư vấn dinh dưỡng giảm muối', channel: 'Call CSKH', status: 'Đang chờ' },
        { day: 30, title: 'Tái khám định kỳ theo dõi huyết áp', channel: 'Tái khám tại viện', status: 'Đang chờ' }
      ]
    },
    {
      id: 'PATH-003',
      patientId: 'P-3',
      patientName: 'Lê Thanh Bình',
      patientPhone: '0988112244',
      gender: 'Nam',
      age: 45,
      pathwayType: 'Theo dõi hậu phẫu Ngoại khoa (D+1 -> D+30)',
      doctorName: 'ThS.BS Nguyễn Đình Tuấn (Ngoại Chấn Thương)',
      startDate: '2026-08-17',
      currentDayIndex: 2,
      totalDays: 30,
      complianceRate: 100,
      latestVitals: {
        temperature: '37.2°C',
        painScore: 4,
        woundStatus: 'Khô ráo, liền tốt',
        lastUpdated: '2026-08-19 09:15'
      },
      alertLevel: 'Bình thường',
      tasks: [
        { day: 1, title: 'Khảo sát cơn đau và cảm nhận dịch vụ sau phẫu thuật', channel: 'Zalo ZNS', status: 'Đã hoàn thành' },
        { day: 3, title: 'Hướng dẫn bài tập phục hồi chức năng nhẹ tại giường', channel: 'Zalo ZNS', status: 'Đang chờ' },
        { day: 10, title: 'Lịch hẹn tái khám và kiểm tra hồi phục tại cơ sở Cầu Giấy', channel: 'Tái khám tại viện', status: 'Đang chờ' }
      ]
    }
  ]);

  // --- OMNICHANNEL ROUTING STATE ---
  const [routingRules, setRoutingRules] = useState<OmnichannelRoutingRule[]>([
    {
      id: 'ROUTE-1',
      channel: 'Zalo OA',
      condition: 'Khách hàng quan tâm Gói Khám VIP / Thai sản',
      priority: 'Cao',
      assignedTeam: 'Đội Tư Vấn Bán Hàng & Gói Khám',
      assignedStaff: 'Đậu Thị Hồng',
      slaMinutes: 5,
      active: true
    },
    {
      id: 'ROUTE-2',
      channel: 'Hotline 24/7',
      condition: 'Khách hàng có lịch sử cuộc gọi nhỡ (Missed Call)',
      priority: 'Khẩn cấp',
      assignedTeam: 'Tổ Trực Tổng Đài CSKH',
      assignedStaff: 'Nguyễn Bích Thảo',
      slaMinutes: 3,
      active: true
    },
    {
      id: 'ROUTE-3',
      channel: 'Facebook Fanpage',
      condition: 'Bình luận / Tin nhắn hỏi giá và đặt lịch khám',
      priority: 'Tiêu chuẩn',
      assignedTeam: 'Tổ Tiếp Nhận Đa Kênh Online',
      assignedStaff: 'Trần Minh Anh',
      slaMinutes: 10,
      active: true
    },
    {
      id: 'ROUTE-4',
      channel: 'SMS CSKH',
      condition: 'Phản hồi tin nhắn nhắc hẹn từ chối / xin đổi giờ',
      priority: 'Cao',
      assignedTeam: 'Tổ Điều Phối Lịch Khám & Tiếp Đón',
      assignedStaff: 'Lê Hoàng Yến',
      slaMinutes: 5,
      active: true
    }
  ]);

  // Click-to-call handler
  const handleInitiateCall = (phone: string, name: string, pat?: Patient) => {
    setActiveCallDial({ phone, name, patient: pat });
    setIsCallingActive(true);
    setCallDurationTimer(0);
  };

  const handleEndCall = () => {
    if (activeCallDial) {
      const newLog: CallLogItem = {
        id: `CALL-${Date.now()}`,
        patientId: activeCallDial.patient?.id,
        callerName: activeCallDial.name,
        callerPhone: activeCallDial.phone,
        direction: 'outbound',
        agentName: 'Chuyên viên CSKH trực CRM',
        department: 'Tổ CSKH & Quản Trị Khách Hàng',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        durationSeconds: callDurationTimer || 45,
        status: 'Thành công',
        sentiment: 'Hài lòng',
        callTopic: 'Tư vấn giá & Đặt hẹn',
        notes: `Cuộc gọi tư vấn trực tiếp từ CRM qua tổng đài VoIP Cloud. Thời lượng: ${callDurationTimer || 45}s.`,
        hasAudioTranscription: true,
        transcription: 'Hệ thống AI Voice ghi âm tự động: Chuyên viên CSKH đã hỗ trợ tư vấn chu đáo và ghi nhận nhu cầu của khách hàng.'
      };
      setCallLogs(prev => [newLog, ...prev]);
    }
    setIsCallingActive(false);
    setActiveCallDial(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Sub Module Navigation Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            onClick={() => setSubModule('voip')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              subModule === 'voip'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>Tổng Đài VoIP & Click-to-Call</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500/30 text-white">Live</span>
          </button>

          <button
            onClick={() => setSubModule('care_pathway')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              subModule === 'care_pathway'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Hành Trình CSKH & Phác Đồ Hậu Khám</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-mono">D+30</span>
          </button>

          <button
            onClick={() => setSubModule('omnichannel')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              subModule === 'omnichannel'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Phân Luồng Tiếp Nhận Đa Kênh Tự Động</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-800 font-mono">SLA Routing</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>CRM Gateway kết nối liên tục</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VOIP CLOUD CALL CENTER MODULE */}
      {/* ========================================================================= */}
      {subModule === 'voip' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Tổng Đài Cuộc Gọi VoIP & Pop-up Nhận Diện Khách Hàng (Screen Pop)</h2>
              <p className="text-xs text-slate-500">Tự động ghi âm, chuyển văn bản bằng AI (Speech-to-Text) và đo lường cảm xúc đàm thoại CSKH</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleInitiateCall('0912345678', 'Nguyễn Thị Thu Hương', patients[0])}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <PhoneOutgoing className="w-4 h-4" />
                <span>Bấm Gọi Nhanh (Click-to-Call)</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics — chờ nối dữ liệu tổng đài thực tế */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              ['Tổng Cuộc Gọi Hôm Nay', 'từ nhật ký VoIP'],
              ['Thời Lượng Đàm Thoại TB', 'từ nhật ký VoIP'],
              ['Tỷ Lệ Nhỡ Cuộc Gọi (Abandon)', 'mục tiêu SLA < 3%'],
              ['Chỉ Số Cảm Xúc Hài Lòng', 'AI Speech Emotion (chưa bật)'],
            ].map(([label, hint]) => (
              <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-xs font-bold text-slate-500">{label}</span>
                <div className="text-2xl font-bold text-slate-400 mt-1 font-mono">—</div>
                <span className="text-[11px] text-slate-400">{hint}</span>
              </div>
            ))}
          </div>

          {/* Call Logs Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Lịch Sử Nhật Ký Cuộc Gọi & File Ghi Âm Tích Hợp
              </h3>
              <span className="text-xs text-slate-500">Lưu trữ bảo mật đám mây 365 ngày</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Chiều Gọi</th>
                    <th className="p-3">Khách Hàng / Người Gọi</th>
                    <th className="p-3">Chủ Đề & Ghi Chú</th>
                    <th className="p-3">Nhân Viên Tiếp Nhận</th>
                    <th className="p-3">Thời Lượng</th>
                    <th className="p-3">Cảm Xúc AI</th>
                    <th className="p-3 text-right">Ghi Âm & Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {callLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        {log.direction === 'inbound' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 font-bold text-[11px]">
                            <PhoneIncoming className="w-3.5 h-3.5" /> Đến
                          </span>
                        )}
                        {log.direction === 'outbound' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            <PhoneOutgoing className="w-3.5 h-3.5" /> Đi
                          </span>
                        )}
                        {log.direction === 'missed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 font-bold text-[11px]">
                            <PhoneMissed className="w-3.5 h-3.5" /> Nhỡ
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 text-sm">{log.callerName}</div>
                        <div className="text-slate-500 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {log.callerPhone}
                        </div>
                      </td>
                      <td className="p-3 max-w-xs">
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold">
                          {log.callTopic}
                        </span>
                        <p className="text-slate-600 mt-1 line-clamp-2">{log.notes}</p>
                        {log.transcription && (
                          <div className="mt-1 p-1.5 bg-blue-50/60 rounded border border-blue-100 text-[11px] text-blue-900 italic">
                            💬 "{log.transcription.substring(0, 75)}..."
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{log.agentName}</div>
                        <div className="text-[11px] text-slate-500">{log.department}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700">
                        {Math.floor(log.durationSeconds / 60)}m {log.durationSeconds % 60}s
                        <div className="text-[10px] text-slate-400 font-normal">{log.timestamp}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
                          log.sentiment === 'Hài lòng'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.sentiment === 'Bức xúc / Gấp'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {log.sentiment}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPlayingAudioId(playingAudioId === log.id ? null : log.id)}
                            className="p-2 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 rounded-xl transition-colors cursor-pointer"
                            title="Nghe lại file ghi âm"
                          >
                            {playingAudioId === log.id ? <Pause className="w-4 h-4 text-blue-600" /> : <Play className="w-4 h-4 text-slate-700" />}
                          </button>
                          <button
                            onClick={() => handleInitiateCall(log.callerPhone, log.callerName)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-colors cursor-pointer text-xs"
                          >
                            Gọi lại
                          </button>
                        </div>
                        {playingAudioId === log.id && (
                          <div className="mt-1 text-[10px] text-blue-700 font-mono flex items-center justify-end gap-1 animate-pulse">
                            <Volume2 className="w-3 h-3" /> Đang phát ghi âm...
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CARE PATHWAY & CHRONIC DISEASE MANAGEMENT */}
      {/* ========================================================================= */}
      {subModule === 'care_pathway' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Hành Trình CSKH & Phác Đồ Hậu Khám / Mãn Tính (D+1 đến D+90)</h2>
              <p className="text-xs text-slate-500">Tự động hóa chuỗi tương tác CSKH, nhắc uống thuốc, thăm hỏi sức khỏe định kỳ và nâng cao tỷ lệ quay lại</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {carePathways.map(item => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                      item.alertLevel === 'Bình thường'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.alertLevel}
                    </span>
                    <span className="text-xs font-mono font-bold text-blue-700">
                      Tiến độ: Ngày {item.currentDayIndex}/{item.totalDays}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base mt-2">{item.patientName}</h3>
                  <p className="text-xs text-slate-500">{item.gender}, {item.age} tuổi • SĐT: {item.patientPhone}</p>
                  
                  <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-xs font-bold text-slate-800">{item.pathwayType}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Bác sĩ phụ trách: {item.doctorName}</div>
                  </div>

                  {/* Vitals Snapshot */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    {item.latestVitals.bloodPressure && (
                      <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg">
                        <span className="text-[10px] text-rose-700 font-bold block">Huyết áp gần nhất</span>
                        <span className="font-bold text-rose-900">{item.latestVitals.bloodPressure}</span>
                      </div>
                    )}
                    {item.latestVitals.woundStatus && (
                      <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                        <span className="text-[10px] text-emerald-700 font-bold block">Hồi phục / Vết thương</span>
                        <span className="font-bold text-emerald-900">{item.latestVitals.woundStatus}</span>
                      </div>
                    )}
                  </div>

                  {/* Timeline tasks */}
                  <div className="mt-4 space-y-2">
                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Hành Trình Tương Tác CSKH</div>
                    {item.tasks.map((t, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                            {t.day}
                          </span>
                          <span className="text-slate-800 line-clamp-1 font-medium">{t.title}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                          t.status === 'Đã hoàn thành'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Tuân thủ: <strong className="text-slate-900">{item.complianceRate}%</strong></span>
                  <button
                    onClick={() => handleInitiateCall(item.patientPhone, item.patientName)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Gọi Chăm Sóc</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. OMNICHANNEL ROUTING & AUTO-ASSIGNMENT */}
      {/* ========================================================================= */}
      {subModule === 'omnichannel' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Phân Luồng Tiếp Nhận Đa Kênh Tự Động & Gán Nhân Viên CSKH</h2>
              <p className="text-xs text-slate-500">Tự động phân bổ hội thoại từ Zalo OA, Hotline, Fanpage và LiveChat tới đúng chuyên viên theo SLA</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Routing: BẬT
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Kênh Zalo OA</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-xl font-bold text-slate-900 mt-2 font-mono">Đã kết nối</div>
              <p className="text-[11px] text-slate-500 mt-1">Webhook ZNS + Zalo OA</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Hotline 24/7 (VoIP)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-xl font-bold text-blue-600 mt-2 font-mono">Sẵn sàng</div>
              <p className="text-[11px] text-slate-500 mt-1">Click-to-call từ hồ sơ khách hàng</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Facebook Fanpage</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-xl font-bold text-purple-600 mt-2 font-mono">Đã kết nối</div>
              <p className="text-[11px] text-slate-500 mt-1">Tự động gán CSKH trực ca</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">SMS CSKH Brandname</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-xl font-bold text-amber-600 mt-2 font-mono">Brandname</div>
              <p className="text-[11px] text-slate-500 mt-1">Cấu hình eSMS/Twilio ở Tích hợp</p>
            </div>
          </div>

          {/* Rules Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Filter className="w-4 h-4 text-purple-600" />
                Quy Tắc Phân Tuyến Đa Kênh Tự Động (Routing Rules)
              </h3>
              <span className="text-xs text-slate-500">Tự động gán ngay khi phát sinh tương tác mới</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Kênh Nguồn</th>
                    <th className="p-3">Điều Kiện Phân Loại</th>
                    <th className="p-3">Mức Ưu Tiên</th>
                    <th className="p-3">Tổ CSKH Tiếp Nhận</th>
                    <th className="p-3">Chuyên Viên Đảm Trách</th>
                    <th className="p-3">Cam Kết Phản Hồi (SLA)</th>
                    <th className="p-3 text-right">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {routingRules.map(rule => (
                    <tr key={rule.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {rule.channel}
                      </td>
                      <td className="p-3 text-slate-700 font-medium">{rule.condition}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          rule.priority === 'Khẩn cấp'
                            ? 'bg-rose-100 text-rose-800'
                            : rule.priority === 'Cao'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {rule.priority}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{rule.assignedTeam}</td>
                      <td className="p-3 text-blue-700 font-bold">{rule.assignedStaff}</td>
                      <td className="p-3 font-mono font-bold text-slate-700">&lt; {rule.slaMinutes} phút</td>
                      <td className="p-3 text-right">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          Hoạt Động
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALER MODAL (CLICK-TO-CALL SIMULATION) */}
      {/* ========================================================================= */}
      {activeCallDial && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-blue-600/20 border-2 border-blue-500 mx-auto flex items-center justify-center animate-pulse">
              <PhoneCall className="w-8 h-8 text-blue-400" />
            </div>

            <div>
              <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">Đang kết nối Tổng đài VoIP CSKH</span>
              <h3 className="text-2xl font-bold mt-1">{activeCallDial.name}</h3>
              <p className="text-sm font-mono text-slate-400 mt-0.5">{activeCallDial.phone}</p>
            </div>

            {/* Screen Pop info */}
            {activeCallDial.patient && (
              <div className="bg-slate-800/80 p-3.5 rounded-2xl text-left text-xs border border-slate-700 space-y-1.5">
                <div className="text-[11px] text-slate-400 font-bold uppercase">Nhận Diện Hồ Sơ Khách Hàng 360° (Screen Pop)</div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Hạng Hội Viên:</span>
                  <span className="font-bold text-amber-400">{activeCallDial.patient.membership?.tier || 'Gold'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Tổng điểm tích lũy:</span>
                  <span className="font-bold text-emerald-400">{activeCallDial.patient.membership?.points || 1250} pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Ghi chú CSKH:</span>
                  <span className="font-bold text-cyan-300">Ưu tiên phục vụ phòng chờ VIP</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={handleEndCall}
                className="px-8 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold shadow-lg transition-colors cursor-pointer flex items-center gap-2"
              >
                <Phone className="w-5 h-5 rotate-135" />
                <span>Kết Thúc Cuộc Gọi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
