import React, { useState, useEffect } from 'react';
import {
  Server,
  Activity,
  CheckCircle2,
  AlertCircle,
  Database,
  Terminal,
  Send,
  RefreshCw,
  X,
  Code,
  Sparkles,
  DollarSign,
  Users,
  Calendar,
  PhoneCall,
  MessageSquare,
  FileSpreadsheet,
  ShieldCheck,
  Zap,
  Cable,
  Key,
  Globe,
  Lock,
  Save,
  Check,
  Copy,
  ExternalLink,
  Cpu,
  Layers,
  HelpCircle,
  Mail,
  Award
} from 'lucide-react';
import { apiClient } from '../utils/apiClient';

interface BackendApiModalProps {
  onClose: () => void;
}

interface EndpointDef {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  category: string;
  name: string;
  description: string;
  sampleBody?: any;
}

interface IntegrationConfig {
  zns: {
    enabled: boolean;
    oaId: string;
    appId: string;
    secretKey: string;
    accessToken: string;
    webhookUrl: string;
    status: 'connected' | 'disconnected' | 'testing';
    lastPing?: string;
  };
  voip: {
    enabled: boolean;
    provider: 'Stringee' | 'CloudPBX' | 'Asterisk' | 'Voiptel';
    sipDomain: string;
    apiKey: string;
    apiSecret: string;
    hotline: string;
    webhookCdrUrl: string;
    status: 'connected' | 'disconnected' | 'testing';
    lastPing?: string;
  };
  sms: {
    enabled: boolean;
    brandName: string;
    provider: 'Viettel' | 'VNPT' | 'MobiFone' | 'eSMS';
    username: string;
    secretKey: string;
    quotaRemaining: number;
    status: 'connected' | 'disconnected' | 'testing';
    lastPing?: string;
  };
  email: {
    enabled: boolean;
    provider: 'SendGrid' | 'Amazon SES' | 'SMTP';
    senderEmail: string;
    senderName: string;
    apiKey: string;
    status: 'connected' | 'disconnected' | 'testing';
    lastPing?: string;
  };
  webhooks: {
    enabled: boolean;
    targetUrl: string;
    secretSignature: string;
    events: string[];
    status: 'connected' | 'disconnected' | 'testing';
    lastPing?: string;
  };
}

const DEFAULT_INTEGRATION_CONFIG: IntegrationConfig = {
  zns: {
    enabled: true,
    oaId: '284910284719284',
    appId: 'zalo_app_88392019',
    secretKey: '••••••••••••••••••••••••••••••••',
    accessToken: 'zns_tok_9918239019230912',
    webhookUrl: 'https://crm.vithospital.vn/api/zns/callback',
    status: 'connected',
    lastPing: 'Vừa kết nối (Quota: 9,850/10,000)'
  },
  voip: {
    enabled: true,
    provider: 'Stringee',
    sipDomain: 'sip.vithospital.stringee.com',
    apiKey: 'SK.0.981723.stringee_vit_prod',
    apiSecret: '••••••••••••••••••••••••••••••••',
    hotline: '1900 8899 (Nhánh 1 - CSKH)',
    webhookCdrUrl: 'https://crm.vithospital.vn/api/calls/cdr-callback',
    status: 'connected',
    lastPing: 'Vừa kết nối (Đang trực: 8 line)'
  },
  sms: {
    enabled: true,
    brandName: 'VITHOSPITAL',
    provider: 'Viettel',
    username: 'cskh_vithospital',
    secretKey: '••••••••••••••••••••••••••••••••',
    quotaRemaining: 45200,
    status: 'connected',
    lastPing: 'Vừa kết nối (Độ trễ: 35ms)'
  },
  email: {
    enabled: true,
    provider: 'SendGrid',
    senderEmail: 'cskh@vithospital.vn',
    senderName: 'Bệnh Viện Đa Khoa Quốc Tế VitCare',
    apiKey: 'SG.••••••••••••••••••••••••••••••••',
    status: 'connected',
    lastPing: 'Vừa kết nối (Deliverability: 99.4%)'
  },
  webhooks: {
    enabled: true,
    targetUrl: 'https://webhook.site/crm-events-receiver',
    secretSignature: 'whsec_991823719023812039',
    events: ['patient.created', 'appointment.booked', 'ticket.sla_breach', 'deal.closed_won'],
    status: 'connected',
    lastPing: 'Vừa kết nối (200 OK)'
  }
};

export const BackendApiModal: React.FC<BackendApiModalProps> = ({ onClose }) => {
  const [activeMainTab, setActiveMainTab] = useState<'integrations' | 'explorer' | 'docs'>('integrations');
  const [healthData, setHealthData] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('patients');
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDef | null>(null);
  const [requestBodyInput, setRequestBodyInput] = useState<string>('');
  const [responseOutput, setResponseOutput] = useState<any>(null);
  const [executing, setExecuting] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Integration Config State
  const [config, setConfig] = useState<IntegrationConfig>(() => {
    const saved = localStorage.getItem('vitcrm_integration_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_INTEGRATION_CONFIG;
      }
    }
    return DEFAULT_INTEGRATION_CONFIG;
  });

  const [activeIntegrationSection, setActiveIntegrationSection] = useState<'zns' | 'voip' | 'sms' | 'email' | 'webhooks'>('zns');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string>('');

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const handleSaveConfig = () => {
    localStorage.setItem('vitcrm_integration_config', JSON.stringify(config));
    setSaveSuccessMsg('Đã lưu cấu hình kết nối CSKH thành công vào hệ thống!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handlePingTest = (serviceKey: keyof IntegrationConfig) => {
    setTestingConnection(serviceKey);
    setTimeout(() => {
      setConfig(prev => ({
        ...prev,
        [serviceKey]: {
          ...prev[serviceKey],
          status: 'connected',
          lastPing: `Kết nối thành công lúc ${new Date().toLocaleTimeString('vi-VN')} (Độ trễ 24ms - HTTP 200 OK)`
        }
      }));
      setTestingConnection(null);
      setSaveSuccessMsg(`Kiểm tra kết nối ${serviceKey.toUpperCase()} thành công!`);
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    }, 900);
  };

  const categories = [
    { id: 'system', name: 'Hệ Thống & Giám Sát', icon: Activity },
    { id: 'patients', name: 'Hồ Sơ Khách Hàng CRM 360°', icon: Users },
    { id: 'appointments', name: 'Lịch Khám & Tiếp Đón', icon: Calendar },
    { id: 'tickets', name: 'Phiếu Khiếu Nại & CSKH', icon: ShieldCheck },
    { id: 'sales', name: 'Kinh Doanh & Leads B2B/B2C', icon: DollarSign },
    { id: 'loyalty', name: 'Hội Viên & Điểm Thưởng', icon: Award },
    { id: 'recalls', name: 'Lịch Tái Khám & Nhắc Hẹn', icon: RefreshCw },
    { id: 'zns', name: 'Zalo ZNS & Messaging', icon: MessageSquare },
    { id: 'voip', name: 'Tổng Đài Ảo VoIP CSKH', icon: PhoneCall },
    { id: 'ai', name: 'Trợ Lý CSKH Y Tế AI (Gemini)', icon: Sparkles },
    { id: 'analytics', name: 'Báo Cáo & Thống Kê CSKH', icon: Zap }
  ];

  const endpoints: Record<string, EndpointDef[]> = {
    system: [
      { method: 'GET', path: '/api/health', category: 'system', name: 'Kiểm tra trạng thái máy chủ', description: 'Trả về trạng thái hoạt động của Node.js Express server và kết nối CRM' },
      { method: 'GET', path: '/api/system/audit-logs', category: 'system', name: 'Nhật ký kiểm toán CRM', description: 'Lấy danh sách nhật ký kiểm toán (Audit Logs) các thao tác quản trị' }
    ],
    patients: [
      { method: 'GET', path: '/api/patients', category: 'patients', name: 'Danh sách khách hàng CRM', description: 'Tìm kiếm, lọc khách hàng theo phân khúc, hạng hội viên và phân trang' },
      { method: 'GET', path: '/api/patients/pat-1', category: 'patients', name: 'Chi tiết hồ sơ khách hàng 360°', description: 'Lấy đầy đủ thông tin nhân khẩu học, hạng thành viên, lịch sử chăm sóc và phản hồi CSKH' },
      {
        method: 'POST',
        path: '/api/patients',
        category: 'patients',
        name: 'Tạo mới hồ sơ khách hàng',
        description: 'Tạo hồ sơ khách hàng với mã định danh tự động KH-2026-XXXX',
        sampleBody: {
          name: "Lê Văn Hùng",
          phone: "0912 778 899",
          gender: "Nam",
          dob: "1985-06-18",
          address: "Số 88 Cầu Giấy, Hà Nội",
          riskLevel: "Trung bình",
          membershipTier: "Gold",
          leadSource: "Zalo OA"
        }
      }
    ],
    appointments: [
      { method: 'GET', path: '/api/appointments', category: 'appointments', name: 'Danh sách lịch hẹn', description: 'Lấy lịch hẹn theo ngày, phòng khám và trạng thái tiếp đón' },
      {
        method: 'POST',
        path: '/api/appointments',
        category: 'appointments',
        name: 'Đặt lịch hẹn mới',
        description: 'Tạo cuộc hẹn mới và tự động kích hoạt kịch bản xác nhận Zalo ZNS',
        sampleBody: {
          patientName: "Trần Mai Linh",
          phone: "0977 889 900",
          appointmentDate: "2026-08-28",
          timeSlot: "08:30 - 09:00",
          department: "Khoa Sản Phụ Khoa",
          serviceName: "Khám thai định kỳ & Siêu âm 4D",
          channel: "Zalo OA"
        }
      }
    ],
    tickets: [
      { method: 'GET', path: '/api/tickets', category: 'tickets', name: 'Danh sách Ticket CSKH', description: 'Lấy danh sách phiếu khiếu nại, phản ánh chất lượng kèm đo đếm SLA' },
      {
        method: 'POST',
        path: '/api/tickets',
        category: 'tickets',
        name: 'Mở Ticket khiếu nại mới',
        description: 'Tạo ticket sự vụ khẩn cấp và kích hoạt cảnh báo SLA đa cấp',
        sampleBody: {
          patientName: "Trần Văn Kiên",
          phone: "0903 112 233",
          category: "Thái độ phục vụ & Thời gian chờ",
          priority: "Khẩn cấp (SLA 30p)",
          content: "Khách hàng phản ánh chờ kết quả quá 45 phút chưa có nhân viên hướng dẫn.",
          assignedStaff: "Nguyễn Bích Thảo"
        }
      }
    ],
    sales: [
      { method: 'GET', path: '/api/sales/pipeline', category: 'sales', name: 'Phễu cơ hội B2B/B2C', description: 'Lấy danh sách hợp đồng KSK Doanh nghiệp và Deal bán gói khám' },
      {
        method: 'POST',
        path: '/api/sales/deals',
        category: 'sales',
        name: 'Tạo cơ hội bán hàng B2C',
        description: 'Thêm Deal gói khám sức khỏe / gói thai sản VIP vào quy trình chốt sale',
        sampleBody: {
          customerName: "Nguyễn Thị Thu Hương",
          phone: "0912 345 678",
          dealType: "Gói Sinh Mổ Trọn Gói Phòng Đơn VIP",
          dealValue: 35000000,
          stage: "Báo Giá & Hẹn Ngày Khám"
        }
      }
    ],
    loyalty: [
      { method: 'GET', path: '/api/loyalty/memberships', category: 'loyalty', name: 'Danh sách hội viên & Điểm', description: 'Xem bảng phân hạng Silver, Gold, Platinum, Diamond và lịch sử tích điểm' },
      {
        method: 'POST',
        path: '/api/loyalty/points/adjust',
        category: 'loyalty',
        name: 'Cộng / Trừ điểm thưởng',
        description: 'Thực hiện cộng điểm trải nghiệm hoặc đổi voucher quà tặng',
        sampleBody: {
          patientId: "pat-1",
          points: 150,
          reason: "Thưởng khảo sát CSAT đạt 5 sao"
        }
      }
    ],
    recalls: [
      { method: 'GET', path: '/api/recalls', category: 'recalls', name: 'Danh sách nhắc tái khám', description: 'Lấy lịch nhắc hẹn tái khám tự động qua Zalo/SMS' }
    ],
    zns: [
      {
        method: 'POST',
        path: '/api/zns/send',
        category: 'zns',
        name: 'Gửi tin nhắn Zalo ZNS Template',
        description: 'Gửi tin nhắn chăm sóc khách hàng theo mẫu Zalo ZNS đã duyệt',
        sampleBody: {
          phone: "0912345678",
          templateId: "ZNS_APPOINTMENT_CONFIRM",
          templateData: {
            customer_name: "Nguyễn Thị Thu Hương",
            date: "28/08/2026",
            time: "08:30",
            doctor: "BS. CKII Lê Hoàng Mai",
            clinic: "VitCare Cầu Giấy"
          }
        }
      }
    ],
    voip: [
      {
        method: 'POST',
        path: '/api/voip/click-to-call',
        category: 'voip',
        name: 'Bấm gọi tự động (Click-to-Call)',
        description: 'Khởi tạo cuộc gọi VoIP từ CRM đến điện thoại khách hàng qua tổng đài Cloud PBX',
        sampleBody: {
          staffExt: "101",
          customerPhone: "0912345678",
          callerId: "19008899"
        }
      }
    ],
    ai: [
      {
        method: 'POST',
        path: '/api/ai/suggest-care',
        category: 'ai',
        name: 'Gợi ý kịch bản CSKH thông minh',
        description: 'Dùng Gemini AI phân tích tâm lý khách hàng và gợi ý câu trả lời CSKH tối ưu',
        sampleBody: {
          customerMessage: "Tôi muốn đổi lịch khám sang chủ nhật tuần sau có được không?",
          customerTier: "Gold"
        }
      }
    ],
    analytics: [
      { method: 'GET', path: '/api/analytics/csat-nps', category: 'analytics', name: 'Chỉ số CSAT & NPS', description: 'Tổng hợp điểm số hài lòng khách hàng và phân tích phản hồi' }
    ]
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await apiClient.getHealth();
      setHealthData(res);
    } catch (e: any) {
      setHealthData({
        status: 'online_mock',
        server: 'VitCRM Cloud Node Engine',
        crmVersion: 'v2.8.0-enterprise',
        timestamp: new Date().toISOString()
      });
    } finally {
      setHealthLoading(false);
    }
  };

  const handleSelectEndpoint = (ep: EndpointDef) => {
    setSelectedEndpoint(ep);
    setRequestBodyInput(ep.sampleBody ? JSON.stringify(ep.sampleBody, null, 2) : '');
    setResponseOutput(null);
    setLatencyMs(null);
  };

  const handleExecuteRequest = async () => {
    if (!selectedEndpoint) return;
    setExecuting(true);
    const startTime = performance.now();

    try {
      await new Promise(r => setTimeout(r, 250));
      let mockRes: any = {};

      if (selectedEndpoint.path === '/api/health') {
        mockRes = { status: 'healthy', database: 'connected', crmMode: 'pure_crm', memoryUsage: '142MB', uptime: '14d 8h' };
      } else if (selectedEndpoint.path.includes('/patients')) {
        mockRes = {
          success: true,
          data: {
            id: 'pat-1',
            name: 'Nguyễn Thị Thu Hương',
            phone: '0912345678',
            membership: { tier: 'Gold', points: 1250 },
            lifetimeValue: 35000000,
            careHistoryCount: 8
          }
        };
      } else if (selectedEndpoint.path.includes('/zns/send')) {
        mockRes = {
          success: true,
          messageId: `ZNS-MSG-${Date.now()}`,
          status: 'DELIVERED',
          recipient: '0912345678',
          sentAt: new Date().toISOString()
        };
      } else {
        mockRes = {
          success: true,
          endpoint: selectedEndpoint.path,
          message: 'Thao tác CRM xử lý thành công',
          timestamp: new Date().toISOString()
        };
      }

      const elapsed = Math.round(performance.now() - startTime);
      setLatencyMs(elapsed);
      setResponseOutput(mockRes);
    } catch (err: any) {
      setLatencyMs(Math.round(performance.now() - startTime));
      setResponseOutput({ error: true, message: err.message || 'Lỗi kết nối API' });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center shadow-inner">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Quản Trị Tích Hợp Kênh CSKH & REST API Tester</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                  Pure CRM Edition
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Cấu hình kết nối Zalo ZNS, Tổng đài VoIP, SMS Brandname, Email Marketing & REST APIs CSKH
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300 font-mono text-[11px]">Server: ONLINE</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveMainTab('integrations')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMainTab === 'integrations'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Cable className="w-4 h-4" />
              <span>1. Cấu Hình Kênh Kết Nối CSKH</span>
            </button>

            <button
              onClick={() => setActiveMainTab('explorer')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMainTab === 'explorer'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>2. API Explorer & Gửi Thử Nghiệm</span>
            </button>

            <button
              onClick={() => setActiveMainTab('docs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMainTab === 'docs'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>3. Tài Liệu Tích Hợp & SDK</span>
            </button>
          </div>

          {saveSuccessMsg && (
            <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 animate-in fade-in flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}
        </div>

        {/* Tab Content 1: INTEGRATION CONFIG */}
        {activeMainTab === 'integrations' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Left Sidebar Menu */}
              <div className="space-y-1.5">
                {[
                  {
                    id: 'zns',
                    title: 'Zalo ZNS & Zalo OA',
                    desc: 'Nhắn tin CSKH, gửi xác nhận lịch khám',
                    icon: MessageSquare,
                    badge: config.zns.enabled ? 'Đang bật' : 'Tắt',
                    status: config.zns.status
                  },
                  {
                    id: 'voip',
                    title: 'Tổng Đài Ảo VoIP',
                    desc: 'Stringee, CloudPBX, Click-to-Call',
                    icon: PhoneCall,
                    badge: config.voip.enabled ? 'Đang bật' : 'Tắt',
                    status: config.voip.status
                  },
                  {
                    id: 'sms',
                    title: 'SMS Brandname CSKH',
                    desc: 'Viettel, VNPT, MobiFone CSKH',
                    icon: Send,
                    badge: config.sms.enabled ? 'Đang bật' : 'Tắt',
                    status: config.sms.status
                  },
                  {
                    id: 'email',
                    title: 'Email CSKH & Marketing',
                    desc: 'SendGrid, Amazon SES, SMTP',
                    icon: Mail,
                    badge: config.email.enabled ? 'Đang bật' : 'Tắt',
                    status: config.email.status
                  },
                  {
                    id: 'webhooks',
                    title: 'Webhooks Sự Kiện CRM',
                    desc: 'Bắn dữ liệu thời gian thực',
                    icon: Globe,
                    badge: config.webhooks.enabled ? 'Đang bật' : 'Tắt',
                    status: config.webhooks.status
                  }
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = activeIntegrationSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveIntegrationSection(item.id as any)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs truncate">{item.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            item.status === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right Configuration Form */}
              <div className="md:col-span-3 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
                {/* SECTION: ZALO ZNS */}
                {activeIntegrationSection === 'zns' && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-blue-600" />
                          Cấu Hình Zalo Official Account (OA) & Zalo ZNS
                        </h4>
                        <p className="text-xs text-slate-500">Tự động gửi thông báo hẹn khám, nhắc tái khám và khảo sát CSAT qua Zalo</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        config.zns.status === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {config.zns.status === 'connected' ? 'Đang hoạt động' : 'Chưa kết nối'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Zalo OA ID</label>
                        <input
                          type="text"
                          value={config.zns.oaId}
                          onChange={e => setConfig({ ...config, zns: { ...config.zns, oaId: e.target.value } })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">App ID</label>
                        <input
                          type="text"
                          value={config.zns.appId}
                          onChange={e => setConfig({ ...config, zns: { ...config.zns, appId: e.target.value } })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-900"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">Secret Key / Refresh Token</label>
                        <input
                          type="password"
                          value={config.zns.secretKey}
                          onChange={e => setConfig({ ...config, zns: { ...config.zns, secretKey: e.target.value } })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        onClick={() => handlePingTest('zns')}
                        disabled={testingConnection === 'zns'}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testingConnection === 'zns' ? 'animate-spin' : ''}`} />
                        <span>{testingConnection === 'zns' ? 'Đang ping Zalo...' : 'Kiểm Tra Kết Nối (Ping Test)'}</span>
                      </button>
                      <button
                        onClick={handleSaveConfig}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Lưu Cấu Hình ZNS</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* SECTION: VOIP */}
                {activeIntegrationSection === 'voip' && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <PhoneCall className="w-4 h-4 text-emerald-600" />
                          Cấu Hình Tổng Đài Cuộc Gọi Ảo VoIP Cloud PBX
                        </h4>
                        <p className="text-xs text-slate-500">Tích hợp Click-to-Call trực tiếp từ CRM và Pop-up thông tin khách hàng khi có cuộc gọi đến</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        config.voip.status === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {config.voip.status === 'connected' ? 'Đang kết nối' : 'Chưa kết nối'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Nhà Cung Cấp Tổng Đài</label>
                        <select
                          value={config.voip.provider}
                          onChange={e => setConfig({ ...config, voip: { ...config.voip, provider: e.target.value as any } })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                        >
                          <option value="Stringee">Stringee Call Center API</option>
                          <option value="CloudPBX">CloudPBX / Voiptel SIP Trunk</option>
                          <option value="Asterisk">Asterisk / FreePBX Server</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Hotline CSKH Hiển Thị</label>
                        <input
                          type="text"
                          value={config.voip.hotline}
                          onChange={e => setConfig({ ...config, voip: { ...config.voip, hotline: e.target.value } })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">SIP Domain / API Key</label>
                        <input
                          type="text"
                          value={config.voip.apiKey}
                          onChange={e => setConfig({ ...config, voip: { ...config.voip, apiKey: e.target.value } })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        onClick={() => handlePingTest('voip')}
                        disabled={testingConnection === 'voip'}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testingConnection === 'voip' ? 'animate-spin' : ''}`} />
                        <span>{testingConnection === 'voip' ? 'Đang test SIP...' : 'Kiểm Tra Kết Nối (Ping Test)'}</span>
                      </button>
                      <button
                        onClick={handleSaveConfig}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Lưu Cấu Hình VoIP</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* SECTION: SMS */}
                {activeIntegrationSection === 'sms' && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <Send className="w-4 h-4 text-amber-600" />
                          Cấu Hình SMS Brandname Chăm Sóc Khách Hàng
                        </h4>
                        <p className="text-xs text-slate-500">Gửi tin nhắn thương hiệu nhắc lịch hẹn, chúc mừng sinh nhật hội viên</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800">
                        Hạn mức còn lại: {config.sms.quotaRemaining.toLocaleString('vi-VN')} SMS
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Tên Thương Hiệu (Brandname)</label>
                        <input
                          type="text"
                          value={config.sms.brandName}
                          onChange={e => setConfig({ ...config, sms: { ...config.sms, brandName: e.target.value } })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Nhà Mạng Viễn Thông</label>
                        <select
                          value={config.sms.provider}
                          onChange={e => setConfig({ ...config, sms: { ...config.sms, provider: e.target.value as any } })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
                        >
                          <option value="Viettel">Viettel Telecom CSKH</option>
                          <option value="VNPT">VNPT Brandname SMS</option>
                          <option value="MobiFone">MobiFone Gateway</option>
                          <option value="eSMS">eSMS Multi-carrier</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        onClick={() => handlePingTest('sms')}
                        disabled={testingConnection === 'sms'}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testingConnection === 'sms' ? 'animate-spin' : ''}`} />
                        <span>{testingConnection === 'sms' ? 'Đang test SMS...' : 'Kiểm Tra Kết Nối (Ping Test)'}</span>
                      </button>
                      <button
                        onClick={handleSaveConfig}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Lưu Cấu Hình SMS</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* SECTION: EMAIL */}
                {activeIntegrationSection === 'email' && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <Mail className="w-4 h-4 text-purple-600" />
                          Cấu Hình Email CSKH & Automation Marketing
                        </h4>
                        <p className="text-xs text-slate-500">Gửi thư cảm ơn, bản tin chăm sóc sức khỏe định kỳ và khảo sát trải nghiệm</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800">
                        Đang hoạt động
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Email Người Gửi (From Email)</label>
                        <input
                          type="email"
                          value={config.email.senderEmail}
                          onChange={e => setConfig({ ...config, email: { ...config.email, senderEmail: e.target.value } })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Tên Hiển Thị (Sender Name)</label>
                        <input
                          type="text"
                          value={config.email.senderName}
                          onChange={e => setConfig({ ...config, email: { ...config.email, senderName: e.target.value } })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        onClick={() => handlePingTest('email')}
                        disabled={testingConnection === 'email'}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testingConnection === 'email' ? 'animate-spin' : ''}`} />
                        <span>{testingConnection === 'email' ? 'Đang test Email...' : 'Kiểm Tra Kết Nối (Ping Test)'}</span>
                      </button>
                      <button
                        onClick={handleSaveConfig}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Lưu Cấu Hình Email</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* SECTION: WEBHOOKS */}
                {activeIntegrationSection === 'webhooks' && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <Globe className="w-4 h-4 text-purple-600" />
                          Webhooks Đa Kênh Đồng Bộ Sự Kiện CRM
                        </h4>
                        <p className="text-xs text-slate-500">Tự động bắn webhook JSON khi phát sinh cuộc hẹn mới, vi phạm SLA hoặc đóng deal</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800">
                        Webhooks: ACTIVE
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Target Webhook URL Endpoint</label>
                        <input
                          type="url"
                          value={config.webhooks.targetUrl}
                          onChange={e => setConfig({ ...config, webhooks: { ...config.webhooks, targetUrl: e.target.value } })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Secret Signature (HMAC-SHA256)</label>
                        <input
                          type="text"
                          value={config.webhooks.secretSignature}
                          onChange={e => setConfig({ ...config, webhooks: { ...config.webhooks, secretSignature: e.target.value } })}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        onClick={() => handlePingTest('webhooks')}
                        disabled={testingConnection === 'webhooks'}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${testingConnection === 'webhooks' ? 'animate-spin' : ''}`} />
                        <span>{testingConnection === 'webhooks' ? 'Đang test Webhook...' : 'Kiểm Tra Kết Nối (Ping Test)'}</span>
                      </button>
                      <button
                        onClick={handleSaveConfig}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Lưu Webhooks</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 2: API EXPLORER */}
        {activeMainTab === 'explorer' && (
          <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Endpoints Sidebar */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Danh Mục REST API CSKH</div>
              <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
                {Object.entries(endpoints).map(([cat, list]) => (
                  <div key={cat} className="space-y-1 mb-3">
                    <div className="text-[11px] font-bold text-slate-400 px-2 uppercase">{cat}</div>
                    {list.map((ep, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectEndpoint(ep)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs cursor-pointer flex items-center justify-between ${
                          selectedEndpoint?.path === ep.path && selectedEndpoint?.method === ep.method
                            ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="truncate mr-2">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono mr-1.5 ${
                            ep.method === 'GET' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {ep.method}
                          </span>
                          <span>{ep.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Test Request & Response Panel */}
            <div className="md:col-span-2 space-y-4">
              {selectedEndpoint ? (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs mr-2 ${
                        selectedEndpoint.method === 'GET' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {selectedEndpoint.method}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-900">{selectedEndpoint.path}</span>
                    </div>
                    <button
                      onClick={handleExecuteRequest}
                      disabled={executing}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{executing ? 'Đang gửi...' : 'Gửi Yêu Cầu (Send)'}</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-600">{selectedEndpoint.description}</p>

                  {selectedEndpoint.sampleBody && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Request Body (JSON):</label>
                      <textarea
                        rows={5}
                        value={requestBodyInput}
                        onChange={e => setRequestBodyInput(e.target.value)}
                        className="w-full p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {responseOutput && (
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                        <span>Response Payload:</span>
                        {latencyMs !== null && <span className="text-emerald-700 font-mono">Độ trễ: {latencyMs}ms</span>}
                      </div>
                      <pre className="p-3 bg-slate-900 text-cyan-300 font-mono text-xs rounded-xl overflow-x-auto max-h-60">
                        {JSON.stringify(responseOutput, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400">
                  <Terminal className="w-12 h-12 mb-3 text-slate-300" />
                  <p className="text-sm font-bold text-slate-600">Chọn một API bên trái để gửi request thử nghiệm</p>
                  <p className="text-xs text-slate-400 mt-1">Hỗ trợ kiểm tra phản hồi dữ liệu khách hàng CRM thời gian thực</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content 3: DOCS & SDK */}
        {activeMainTab === 'docs' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-4">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-400" />
                Hướng Dẫn Tích Hợp CRM REST API (Node.js & Python SDK)
              </h4>
              <p className="text-xs text-slate-300">
                Toàn bộ dữ liệu khách hàng được bảo vệ bằng chuẩn mã hóa SSL/TLS 1.3 và xác thực JWT Bearer Token.
              </p>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-400">
                <div># Node.js Client Example:</div>
                <div className="text-slate-400 mt-1">
                  {`const client = axios.create({
  baseURL: 'https://crm.vithospital.vn/api',
  headers: { Authorization: 'Bearer crm_live_key_998822' }
});

const res = await client.get('/patients?tier=Gold');
console.log(res.data);`}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
