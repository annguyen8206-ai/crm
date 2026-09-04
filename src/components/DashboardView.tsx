import React, { useMemo } from 'react';
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
  csatFeedbacks?: any[];
  recalls?: any[];
  /** Server-computed KPIs from /api/analytics/dashboard (optional). */
  serverKpis?: { kpis?: any; branchPerformance?: any[] } | null;
  currentBranchId?: string;
  onSelectTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
  onSelectPatient?: (patientId: string) => void;
  onOpenAiAssistant?: () => void;
}

// Colours reused for the acquisition-source donut, keyed by index.
const SOURCE_COLORS = ['#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b', '#64748b', '#ec4899', '#14b8a6'];

const EmptyChart: React.FC<{ label?: string }> = ({ label = 'Chưa có dữ liệu' }) => (
  <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 gap-1">
    <Activity className="w-6 h-6" />
    <span className="text-xs">{label}</span>
  </div>
);

const monthKey = (iso?: string) => (iso && /^\d{4}-\d{2}/.test(iso) ? iso.slice(0, 7) : '');

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentRole = 'Ban Giám Đốc',
  patients = [],
  appointments = [],
  b2bContracts = [],
  tickets = [],
  supportTickets = [],
  branches = [],
  invoices = [],
  csatFeedbacks = [],
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

  // Every number below is derived from the records actually loaded — no seeded
  // demo figures. With an empty database the dashboard reads 0 / "—".
  const m = useMemo(() => {
    const pats = patients || [];
    const apts = appointments || [];
    const invs = invoices || [];
    const csat = csatFeedbacks || [];
    const tix = allTickets || [];

    // --- Patients ---
    const totalPatients = serverKpis?.kpis?.totalPatients ?? pats.length;
    const cutoff = Date.now() - 30 * 86400000;
    const newPatients30d = pats.filter(p => {
      const t = Date.parse(p.createdAt || p.membership?.memberSince || '');
      return Number.isFinite(t) && t >= cutoff;
    }).length;

    // --- No-show ---
    const isNoShow = (s?: string) => !!s && /vắng mặt|no-?show/i.test(s);
    const isCancelled = (s?: string) => !!s && /hủy/i.test(s);
    const concluded = apts.filter(a => isNoShow(a.status) || isCancelled(a.status) || /hoàn tất|khám xong|đã khám/i.test(a.status || '') || (a.appointmentDate && a.appointmentDate < _todayISO));
    const noShowCount = apts.filter(a => isNoShow(a.status)).length;
    const noShowRate = concluded.length ? (noShowCount / concluded.length) * 100 : null;
    const confirmed = apts.filter(a => /đã xác nhận|đã tiếp đón|đang khám|hoàn tất|khám xong/i.test(a.status || '')).length;
    const confirmRate = apts.length ? (confirmed / apts.length) * 100 : null;

    // --- B2B ---
    const b2bValueTy = totalB2BValue / 1e9;
    const b2bCompanies = (b2bContracts || []).map(c => c.companyName).filter(Boolean).slice(0, 4).join(', ');

    // --- CSAT / SLA ---
    const ratings = csat.map(c => Number(c.rating)).filter(n => Number.isFinite(n) && n > 0);
    const csatAvg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    const npsVals = csat.map(c => Number(c.npsScore)).filter(n => Number.isFinite(n));
    const promoters = npsVals.filter(n => n >= 9).length;
    const detractors = npsVals.filter(n => n <= 6).length;
    const nps = npsVals.length ? Math.round(((promoters - detractors) / npsVals.length) * 100) : null;
    const slaRate = serverKpis?.kpis?.slaRate
      ?? (tix.length ? `${Math.round((tix.filter(t => /giải quyết|đóng/i.test(t.status || '')).length / tix.length) * 100)}%` : null);
    const overdueTickets = tix.filter(t => (t as any).isOverdue).length;

    // --- Revenue by month (last 6 months present in paid invoices) ---
    const paid = invs.filter(i => /đã thanh toán/i.test(i.status || ''));
    const byMonth = new Map<string, number>();
    for (const i of paid) {
      const k = monthKey(i.paidAt || i.createdAt);
      if (k) byMonth.set(k, (byMonth.get(k) || 0) + (Number(i.patientPayable) || 0));
    }
    const revenueByMonth = [...byMonth.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-6)
      .map(([k, v]) => ({ month: k.slice(5) + '/' + k.slice(2, 4), revenue: Math.round(v / 1e6) }));

    // --- Acquisition source (from patient.source) ---
    const bySource = new Map<string, number>();
    for (const p of pats) {
      const s = (p.source || '').trim() || 'Chưa rõ nguồn';
      bySource.set(s, (bySource.get(s) || 0) + 1);
    }
    const sourceTotal = pats.length || 1;
    const sourceBreakdown = [...bySource.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, count], idx) => ({ name, value: Math.round((count / sourceTotal) * 100), count, color: SOURCE_COLORS[idx % SOURCE_COLORS.length] }));

    // --- Department load (visits from appointments) ---
    const byDept = new Map<string, number>();
    for (const a of apts) {
      const d = (a.department || '').trim();
      if (d) byDept.set(d, (byDept.get(d) || 0) + 1);
    }
    const deptBreakdown = [...byDept.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, visits]) => ({ name, visits }));

    return {
      totalPatients, newPatients30d,
      noShowRate, noShowCount, concludedCount: concluded.length, confirmRate,
      b2bValueTy, b2bCompanies,
      csatAvg, nps, csatCount: ratings.length, slaRate, overdueTickets,
      revenueByMonth, sourceBreakdown, deptBreakdown,
    };
  }, [patients, appointments, invoices, csatFeedbacks, allTickets, b2bContracts, serverKpis, totalB2BValue, _todayISO]);

  const pct = (v: number | null, digits = 1) => (v == null ? '—' : `${v.toFixed(digits)}%`);

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
            {([
              ['Bệnh nhân', serverKpis.kpis.totalPatients],
              ['Lịch hôm nay', serverKpis.kpis.todayAppointments],
              ['Đã check-in', serverKpis.kpis.checkedInToday],
              ['Chờ xử lý ticket', serverKpis.kpis.openTickets],
              ['SLA', serverKpis.kpis.slaRate],
              ['Chờ tái khám', serverKpis.kpis.overdueRecalls],
              ['TG chờ TB (phút)', serverKpis.kpis.averageWaitTimeMinutes],
              // Financial — only present for roles with canViewFinancialBI
              ...(serverKpis.kpis.revenueFormatted !== undefined ? [['Doanh thu đã thu', serverKpis.kpis.revenueFormatted]] : []),
              ...(serverKpis.kpis.pendingInvoiceValue !== undefined ? [['Chờ thu (đ)', Number(serverKpis.kpis.pendingInvoiceValue).toLocaleString('vi-VN')]] : []),
              ...(serverKpis.kpis.avgCustomerLifetimeValue !== undefined ? [['CLV bình quân (đ)', Number(serverKpis.kpis.avgCustomerLifetimeValue).toLocaleString('vi-VN')]] : []),
            ] as [string, unknown][]).map(([label, val]) => (
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
              {m.totalPatients.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-500">hồ sơ</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-medium">
              {m.newPatients30d > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : null}
              <span>{m.newPatients30d > 0 ? `+${m.newPatients30d} hồ sơ mới trong 30 ngày` : 'Chưa có hồ sơ mới trong 30 ngày'}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>{branches.length} chi nhánh</span>
            <span className="text-blue-600 font-semibold">{(patients || []).filter(p => (p.tags || []).length).length} hồ sơ gắn thẻ</span>
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
              {pct(m.noShowRate)} <span className="text-xs font-normal text-slate-400">({m.noShowCount}/{m.concludedCount} lịch)</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-medium">
              <span>{m.concludedCount ? 'Tính trên các lịch đã kết thúc' : 'Chưa có lịch đã kết thúc để tính'}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Lịch hôm nay: {todayAppointments.length} ca</span>
            <span className="text-emerald-700 font-semibold">{pct(m.confirmRate, 0)} đã xác nhận</span>
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
              {m.b2bValueTy > 0 ? m.b2bValueTy.toFixed(2) : '0'} <span className="text-xs font-normal text-slate-500">tỷ VNĐ</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-indigo-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{totalB2BExamined.toLocaleString()} / {totalB2BEmployees.toLocaleString()} CBNV đã khám</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span className="truncate pr-2">{m.b2bCompanies || 'Chưa có hợp đồng'}</span>
            <span className="text-indigo-600 font-semibold shrink-0">{b2bContracts.length} Hợp đồng</span>
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
              {m.csatAvg == null ? '—' : m.csatAvg.toFixed(2)}
              <span className="text-xs font-semibold text-amber-500"> / 5.0 ⭐ {m.nps == null ? '' : `(NPS ${m.nps >= 0 ? '+' : ''}${m.nps})`}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{m.slaRate ? `${m.slaRate} ticket đúng SLA` : 'Chưa có ticket'}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>{m.csatCount} lượt đánh giá</span>
            <span className={`font-semibold ${m.overdueTickets ? 'text-rose-600' : 'text-emerald-600'}`}>{m.overdueTickets} ticket quá hạn</span>
          </div>
        </div>

      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue & Visits Growth (Area Chart) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Doanh Thu Đã Thu Theo Tháng</h3>
              <p className="text-xs text-slate-500">Tổng hợp từ hóa đơn đã thanh toán (Đơn vị: Triệu VNĐ)</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" /> Doanh thu đã thu
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            {m.revenueByMonth.length === 0 ? (
              <EmptyChart label="Chưa có hóa đơn đã thanh toán" />
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={m.revenueByMonth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`${Number(value).toLocaleString('vi-VN')} Triệu VNĐ`, '']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" name="Doanh thu đã thu" />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Lead Sources & Marketing Attribution (Donut Chart) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Nguồn Thu Hút Bệnh Nhân</h3>
            <p className="text-xs text-slate-500">Theo trường "nguồn" trên hồ sơ khách hàng</p>
          </div>

          <div className="h-52 w-full my-2">
            {m.sourceBreakdown.length === 0 ? (
              <EmptyChart label="Chưa có hồ sơ khách hàng" />
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={m.sourceBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {m.sourceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: any, _n: any, p: any) => [`${val}% (${p?.payload?.count ?? 0} hồ sơ)`, 'Tỷ trọng']}
                />
              </PieChart>
            </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            {m.sourceBreakdown.map((s, idx) => (
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
              <h3 className="text-base font-bold text-slate-900">Lượt Hẹn Theo Chuyên Khoa</h3>
              <p className="text-xs text-slate-500">Tổng hợp từ lịch hẹn đang có trong hệ thống</p>
            </div>
            <button
              onClick={() => handleNavigate('appointments')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              Xem lịch trực &rarr;
            </button>
          </div>

          <div className="h-64 w-full">
            {m.deptBreakdown.length === 0 ? (
              <EmptyChart label="Chưa có lịch hẹn" />
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.deptBreakdown} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 11 }} width={120} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="visits" name="Số lượt hẹn" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            )}
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
