import React from 'react';
import {
  Users,
  Calendar,
  TrendingUp,
  DollarSign,
  UserX,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Stethoscope,
  Activity,
  HeartHandshake
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Patient, Appointment, B2BContract, SupportTicket, Branch, UserRole, ActiveTab } from '../types';
import { getRoleConfig } from '../utils/rbac';
import { PatientJourneyOverview } from './PatientJourneyOverview';

interface DashboardViewProps {
  currentRole?: UserRole;
  patients?: Patient[];
  appointments?: Appointment[];
  b2bContracts?: B2BContract[];
  tickets?: SupportTicket[];
  supportTickets?: SupportTicket[];
  branches?: Branch[];
  invoices?: any[];
  /** Server-computed KPIs from /api/analytics/dashboard (optional). */
  serverKpis?: { kpis?: any; branchPerformance?: any[] } | null;
  currentBranchId?: string;
  onSelectTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
  onSelectPatient?: (patientId: string) => void;
  onOpenAiAssistant?: () => void;
}

const MONTHLY_DATA = [
  { month: 'T1', b2cRevenue: 1200, b2bRevenue: 850, visits: 2150, noShowRate: 14.2 },
  { month: 'T2', b2cRevenue: 1450, b2bRevenue: 920, visits: 2400, noShowRate: 11.5 },
  { month: 'T3', b2cRevenue: 1800, b2bRevenue: 1400, visits: 3100, noShowRate: 8.4 },
  { month: 'T4', b2cRevenue: 2100, b2bRevenue: 1900, visits: 3850, noShowRate: 6.2 },
  { month: 'T5', b2cRevenue: 2350, b2bRevenue: 2200, visits: 4300, noShowRate: 5.1 },
  { month: 'T6', b2cRevenue: 2600, b2bRevenue: 2480, visits: 4900, noShowRate: 4.8 },
  { month: 'T7', b2cRevenue: 2900, b2bRevenue: 2610, visits: 5400, noShowRate: 4.2 },
  { month: 'T8', b2cRevenue: 3150, b2bRevenue: 2850, visits: 5950, noShowRate: 3.9 }
];

const SOURCE_DATA = [
  { name: 'B2B KSK Đoàn', value: 38, color: '#0ea5e9' },
  { name: 'Zalo OA & ZNS', value: 24, color: '#10b981' },
  { name: 'Giới thiệu Bác sĩ', value: 16, color: '#8b5cf6' },
  { name: 'Facebook & Ads', value: 14, color: '#f59e0b' },
  { name: 'Hotline / Vãng lai', value: 8, color: '#64748b' }
];

const SPECIALTY_PERFORMANCE = [
  { name: 'Tim Mạch - Nội Tiết', visits: 1420, revenue: 1250, occupancy: 94 },
  { name: 'Sản Phụ Khoa', visits: 1250, revenue: 1480, occupancy: 91 },
  { name: 'Cơ Xương Khớp', visits: 1100, revenue: 980, occupancy: 88 },
  { name: 'Da Liễu & Thẩm Mỹ', visits: 830, revenue: 1850, occupancy: 96 },
  { name: 'Xét Nghiệm & Tiêm Chủng', visits: 1350, revenue: 440, occupancy: 85 }
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentRole = 'Ban Giám Đốc',
  patients = [],
  appointments = [],
  b2bContracts = [],
  tickets = [],
  supportTickets = [],
  branches = [],
  serverKpis = null,
  currentBranchId,
  onSelectTab,
  onNavigate,
  onSelectPatient,
  onOpenAiAssistant
}) => {
  const allTickets = tickets.length > 0 ? tickets : supportTickets;
  const navigateFn = onNavigate || onSelectTab;
  const roleConfig = getRoleConfig(currentRole);

  const handleNavigate = (tab: string) => {
    if (!navigateFn) return;
    if (tab === 'cskh') {
      navigateFn('care');
    } else {
      navigateFn(tab);
    }
  };

  const totalB2BValue = (b2bContracts || []).reduce((acc, c) => acc + (c.totalValue || 0), 0);
  const totalB2BExamined = (b2bContracts || []).reduce((acc, c) => acc + (c.examinedCount || 0), 0);
  const totalB2BEmployees = (b2bContracts || []).reduce((acc, c) => acc + (c.employeeCount || 0), 0);
  const urgentTickets = (allTickets || []).filter(t => t?.priority?.includes('Khẩn cấp') && t?.status !== 'Đã đóng');
  const _todayISO = new Date().toISOString().slice(0, 10);
  const todayAppointments = (appointments || []).filter(a => a?.appointmentDate === _todayISO);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header: Clean & Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {roleConfig.shortTitle === 'Ban Giám Đốc'
                ? 'Trung Tâm Điều Hành & Báo Cáo BI Y Tế'
                : `Bảng Điều Khiển: ${roleConfig.shortTitle}`}
            </h1>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleConfig.badgeColor}`}>
              {roleConfig.title}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {roleConfig.shortTitle === 'Ban Giám Đốc'
              ? 'Trục dữ liệu bệnh nhân 360°, điều phối lịch khám và quản trị SLA thời gian thực'
              : roleConfig.description}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-dash-open-ai"
            onClick={onOpenAiAssistant}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Triage</span>
          </button>
          <button
            id="btn-dash-quick-book"
            onClick={() => handleNavigate('appointments')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Lịch hôm nay ({todayAppointments.length})</span>
          </button>
        </div>
      </div>

      {/* End-to-End Patient Journey Interactive Matrix */}
      <PatientJourneyOverview
        patients={patients}
        onNavigate={(tab) => handleNavigate(tab)}
        onSelectPatient={onSelectPatient}
      />

      {/* Server-computed KPIs (from /api/analytics/dashboard) */}
      {serverKpis?.kpis && (
        <div data-testid="server-kpi-strip" className="bg-slate-900 text-white rounded-2xl p-4">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Chỉ số điều hành (máy chủ tính realtime)</div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
            {[
              ['Doanh thu đã thu', serverKpis.kpis.revenueFormatted],
              ['Bệnh nhân', serverKpis.kpis.totalPatients],
              ['Lịch hôm nay', serverKpis.kpis.todayAppointments],
              ['Đã check-in', serverKpis.kpis.checkedInToday],
              ['Chờ xử lý ticket', serverKpis.kpis.openTickets],
              ['SLA', serverKpis.kpis.slaRate],
              ['Chờ tái khám', serverKpis.kpis.overdueRecalls],
              ['Chờ thu (đ)', (serverKpis.kpis.pendingInvoiceValue || 0).toLocaleString('vi-VN')],
              ['TG chờ TB (phút)', serverKpis.kpis.averageWaitTimeMinutes],
              ['CLV bình quân (đ)', (serverKpis.kpis.avgCustomerLifetimeValue || 0).toLocaleString('vi-VN')]
            ].map(([label, val]) => (
              <div key={String(label)}>
                <div className="text-[10px] text-slate-400">{label}</div>
                <div className="font-bold">{val ?? '—'}</div>
              </div>
            ))}
          </div>
          {serverKpis && (serverKpis as any).rfmSegments && (
            <div className="mt-3 pt-3 border-t border-slate-700 flex flex-wrap gap-2 text-[11px]">
              {Object.entries((serverKpis as any).rfmSegments).map(([seg, n]) => (
                <span key={seg} className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">{seg}: <b>{n as number}</b></span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Card 1: Patients & 360 dossiers */}
        <div 
          onClick={() => handleNavigate('patients')}
          className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-5 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hồ Sơ Bệnh Nhân 360°</span>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-blue-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              12,480 <span className="text-xs font-normal text-slate-500">hồ sơ</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+18.4% so với tháng trước</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Đồng bộ HIS/LIS: 100%</span>
            <span className="text-blue-600 font-semibold">100% 360 View</span>
          </div>
        </div>

        {/* Card 2: No-show Rate reduction */}
        <div 
          onClick={() => handleNavigate('appointments')}
          className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-5 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tỷ Lệ Vắng Mặt (No-Show)</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-emerald-100">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-600 tracking-tight">
              3.9% <span className="text-xs font-normal text-slate-400">(Trước đó: 24.5%)</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-medium">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Giảm 84% nhờ Zalo ZNS / SMS</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Lịch hôm nay: {todayAppointments.length} ca</span>
            <span className="text-emerald-700 font-semibold">96.1% Xác nhận</span>
          </div>
        </div>

        {/* Card 3: B2B Corporate Health Check Contracts */}
        <div 
          onClick={() => handleNavigate('sales')}
          className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-5 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hợp Đồng KSK B2B</span>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-indigo-100">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              7.52 <span className="text-xs font-normal text-slate-500">tỷ VNĐ</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-indigo-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{totalB2BExamined.toLocaleString()} / {totalB2BEmployees.toLocaleString()} CBNV đã khám</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>FPT, VCB, VNG, SunGroup</span>
            <span className="text-indigo-600 font-semibold">{b2bContracts.length} Hợp đồng</span>
          </div>
        </div>

        {/* Card 4: SLA & Patient CSAT */}
        <div 
          onClick={() => handleNavigate('cskh')}
          className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-5 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chỉ Số SLA & Hài Lòng (CSAT)</span>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-amber-100">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              4.92 <span className="text-xs font-semibold text-amber-500">/ 5.0 ⭐ (NPS +74)</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>98.6% Ticket giải quyết chuẩn SLA</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>FCR: 8.4 phút</span>
            <span className="text-emerald-600 font-semibold">0 Ticket vi phạm</span>
          </div>
        </div>

      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue & Visits Growth (Area Chart) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Xu Hướng Doanh Thu B2B vs B2C & Tỷ Lệ No-Show</h3>
              <p className="text-xs text-slate-500">Hiệu quả tự động hóa tiếp thị và tối ưu hóa vận hành (Đơn vị: Triệu VNĐ)</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" /> B2C Khám cá nhân
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" /> B2B Đoàn KSK
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorB2C" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorB2B" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`${Number(value).toLocaleString()} Triệu VNĐ`, '']}
                />
                <Area type="monotone" dataKey="b2cRevenue" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorB2C)" name="Doanh thu B2C" />
                <Area type="monotone" dataKey="b2bRevenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorB2B)" name="Doanh thu B2B" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Sources & Marketing Attribution (Donut Chart) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Nguồn Thu Hút Bệnh Nhân</h3>
            <p className="text-xs text-slate-500">Marketing Tracking & Tỷ trọng đa kênh</p>
          </div>

          <div className="h-52 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={SOURCE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {SOURCE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: any) => [`${val}%`, 'Tỷ trọng']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs">
            {SOURCE_DATA.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span>{s.name}</span>
                </div>
                <span className="font-bold text-slate-900">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Row 2: Specialty Performance & Active Operational Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Specialty Performance & Occupancy */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Hiệu Suất Chuyên Khoa & Công Suất Phòng Khám</h3>
              <p className="text-xs text-slate-500">Tối ưu hóa thời gian trống và năng suất bác sĩ điều trị</p>
            </div>
            <button
              onClick={() => handleNavigate('appointments')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              Xem lịch trực &rarr;
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SPECIALTY_PERFORMANCE} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 11 }} width={120} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="occupancy" name="Công suất phòng (%)" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Today's Schedule & Urgent SLA Widget */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Lịch Hẹn Hôm Nay
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200/60">
                {todayAppointments.length} ca
              </span>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  onClick={() => {
                    handleNavigate('patients');
                    if (onSelectPatient) {
                      onSelectPatient(apt.patientId);
                    }
                  }}
                  className="p-3 rounded-lg bg-slate-50 hover:bg-blue-50/60 border border-slate-200 transition-all cursor-pointer text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{apt.patientName}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-blue-100 text-blue-800">
                      {apt.timeSlot}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 mt-1 text-[11px]">
                    <span>{apt.department}</span>
                    <span className="text-slate-700 font-medium">{apt.doctorName.split(' ').slice(-2).join(' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick SLA ticker */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Tuân thủ Nghị định 13/2023
            </span>
            <span className="text-blue-700 font-semibold">Bảo mật y tế 100%</span>
          </div>
        </div>

      </div>
    </div>
  );

};
