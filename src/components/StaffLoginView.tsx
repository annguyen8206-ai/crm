import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Building2,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Users,
  Briefcase,
  TrendingUp,
  Headphones,
  UserCheck,
  Sparkles,
  BarChart3,
  Award,
  ChevronRight,
  Eye,
  EyeOff,
  Shield,
  Clock,
  Check,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { CurrentUser, Branch, UserRole, BranchId } from '../types';
import { CURRENT_USERS, INITIAL_BRANCHES } from '../data/mockData';
import { ROLE_CONFIGS, getRoleConfig } from '../utils/rbac';
import { apiClient } from '../utils/apiClient';

// Helper to get monogram initials from staff name
function getStaffInitials(name: string): string {
  if (!name) return 'NV';
  const cleanName = name.replace(/^(BS\.|PGS\.|TS\.|ThS\.|CKII|CKI|Kỹ sư|KS\.)\s*/gi, '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NV';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface StaffLoginViewProps {
  onLoginSuccess: (user: CurrentUser) => void;
  onNavigateToPatientPortal?: () => void;
  onNavigateToCustomerLogin?: () => void;
  staffList?: CurrentUser[];
}

export const StaffLoginView: React.FC<StaffLoginViewProps> = ({
  onLoginSuccess,
  onNavigateToPatientPortal,
  onNavigateToCustomerLogin,
  staffList = CURRENT_USERS
}) => {
  const handleGoToCustomer = onNavigateToCustomerLogin || onNavigateToPatientPortal;
  const [activeTab, setActiveTab] = useState<'login' | 'matrix' | 'staff_list'>('login');
  const [usernameOrEmail, setUsernameOrEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<BranchId>('ALL');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [requires2FA, setRequires2FA] = useState<boolean>(false);
  const [pendingUser, setPendingUser] = useState<CurrentUser | null>(null);
  const [otpInput, setOtpInput] = useState<string>('');
  // Backend-issued 2FA (real OTP). When null we fall back to the offline demo path.
  const [pendingPreAuth, setPendingPreAuth] = useState<string | null>(null);
  const [otpChannelHint, setOtpChannelHint] = useState<string>('');
  const [otpDevCode, setOtpDevCode] = useState<string | null>(null);
  const [otpBusy, setOtpBusy] = useState<boolean>(false);

  const describeChannel = (channel?: string, mode?: string) => {
    if (mode === 'simulated') return 'đã tạo (giả lập — chưa cấu hình SMS/email, xem log máy chủ hoặc mã dev bên dưới)';
    if (channel === 'sms') return 'đã gửi qua SMS tới số điện thoại đã đăng ký';
    if (channel === 'email') return 'đã gửi qua email công vụ';
    return 'đã được gửi tới kênh bảo mật đã đăng ký';
  };

  // Handle Form Submit Login with strict credentials check
  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      const result = await apiClient.auth.staffLogin(usernameOrEmail, password);
      if (result.twoFactorRequired && result.preAuthToken) {
        setPendingPreAuth(result.preAuthToken);
        setPendingUser(null);
        setOtpInput('');
        setOtpChannelHint(describeChannel(result.channel, result.otpMode));
        setOtpDevCode(result.devCode || null);
        setRequires2FA(true);
        return;
      }
      onLoginSuccess({
        ...result.user,
        roleTitle: result.user.roleTitle || result.user.role,
        status: 'active'
      } as CurrentUser);
      return;
    } catch (apiError) {
      // Demo fallback is allowed only outside production backend authentication.
      const isProductionBuild = Boolean((import.meta as ImportMeta & { env?: { PROD?: boolean } }).env?.PROD);
      if (isProductionBuild) {
        const rawMessage = apiError instanceof Error ? apiError.message : '';
        const isNetworkError = /failed to fetch|networkerror|load failed/i.test(rawMessage);
        setErrorMsg(
          rawMessage && !isNetworkError
            ? rawMessage
            : 'Không thể kết nối máy chủ xác thực. Kiểm tra máy chủ backend / cấu hình DATABASE_URL, JWT_SECRET rồi thử lại.'
        );
        return;
      }
    }

    const cleanInput = usernameOrEmail.trim().toLowerCase();
    const matchedUser = staffList.find(
      u =>
        u.email?.toLowerCase() === cleanInput ||
        u.staffCode?.toLowerCase() === cleanInput ||
        u.phone?.trim() === cleanInput ||
        u.name.toLowerCase().includes(cleanInput)
    );

    if (!matchedUser) {
      setErrorMsg('Tài khoản hoặc mã nhân viên không tồn tại trong hệ thống phòng khám.');
      return;
    }

    if (matchedUser.status === 'suspended') {
      setErrorMsg('Tài khoản này đã bị tạm khóa bởi Quản trị viên Bệnh viện. Vui lòng liên hệ phòng IT.');
      return;
    }

    // Password validation: match user password or standard demo passwords
    const validPassword = matchedUser.password;
    const isPasswordCorrect =
      Boolean(validPassword) && password === validPassword;

    if (!isPasswordCorrect) {
      setErrorMsg('Tài khoản hoặc mật khẩu không chính xác.');
      return;
    }

    if (matchedUser.twoFactorEnabled && !requires2FA) {
      setPendingUser(matchedUser);
      setRequires2FA(true);
      return;
    }

    onLoginSuccess(matchedUser);
  };

  // Handle Verify 2FA OTP
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Backend path: exchange preAuthToken + OTP for a real session token.
    if (pendingPreAuth) {
      setOtpBusy(true);
      try {
        const result = await apiClient.auth.staffLogin2fa(pendingPreAuth, otpInput.trim());
        onLoginSuccess({
          ...result.user,
          roleTitle: result.user.roleTitle || result.user.role,
          status: 'active'
        } as CurrentUser);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Mã xác thực không chính xác hoặc đã hết hạn.');
      } finally {
        setOtpBusy(false);
      }
      return;
    }

    // Offline demo path (no backend auth): fixed code.
    if (otpInput.trim() !== '686868') {
      setErrorMsg('Mã xác thực 2FA không chính xác hoặc đã hết hạn.');
      return;
    }
    if (pendingUser) {
      onLoginSuccess(pendingUser);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingPreAuth) return;
    setErrorMsg(null);
    setOtpBusy(true);
    try {
      const r = await apiClient.auth.staffLogin2faResend(pendingPreAuth);
      setOtpChannelHint(describeChannel(r.channel, r.otpMode));
      setOtpDevCode(r.devCode || null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không gửi lại được mã. Vui lòng đăng nhập lại.');
    } finally {
      setOtpBusy(false);
    }
  };

  const handleCancel2FA = () => {
    setRequires2FA(false);
    setPendingPreAuth(null);
    setPendingUser(null);
    setOtpInput('');
    setOtpDevCode(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-[90vh] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Top Brand Bar */}
      <div className="max-w-6xl mx-auto w-full mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/30">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">VitHospital Enterprise CRM</h1>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold uppercase tracking-wider">
                Staff Portal
              </span>
            </div>
            <p className="text-xs text-slate-400">Hệ Thống Quản Trị Y Tế & Phân Quyền Nhân Viên Phòng Khám</p>
          </div>
        </div>

        {/* View Switcher / Secondary Nav */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80 text-xs">
          <button
            onClick={() => setActiveTab('login')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'login' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Đăng Nhập
          </button>
          {handleGoToCustomer && (
            <button
              id="btn-switch-to-customer-portal"
              onClick={handleGoToCustomer}
              className="px-3 py-1.5 rounded-xl font-bold text-teal-300 hover:text-teal-200 bg-teal-950/50 border border-teal-700/50 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Cổng Đăng Nhập Khách Hàng</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-6xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* 1. LOGIN TAB WITH DEDICATED FORM & CREDENTIALS INFO */}
        {/* ========================================================================= */}
        {activeTab === 'login' && (
          <div className="max-w-xl mx-auto">
            {/* Official Staff Login Box */}
            <div className="lg:col-span-5 bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Xác Thực Cấp Y Tế & 2FA
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Đăng Nhập Cán Bộ Y Tế & Nhân Viên</h2>
                <p className="text-xs text-slate-400">
                  Nhập mã nhân viên hoặc email nội bộ được cấp bởi Ban Quản trị Bệnh viện.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {!requires2FA ? (
                <form onSubmit={handleFormLogin} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5">Mã Nhân Viên / Email Công Vụ:</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={usernameOrEmail}
                        onChange={(e) => setUsernameOrEmail(e.target.value)}
                        placeholder="VD: tuan.hm@vithospital.vn hoặc BGD-001"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5">Mật Khẩu Đăng Nhập:</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="hidden">
                    <label className="block font-bold text-slate-300 mb-1.5">Cơ Sở / Chi Nhánh Làm Việc:</label>
                    <div className="relative">
                      <Building2 className="hidden w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value as BranchId)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="ALL">Toàn Hệ Thống (Trụ sở & Các Chi nhánh)</option>
                        {INITIAL_BRANCHES.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm mt-2"
                  >
                    <span>Đăng Nhập Hệ Thống Nội Bộ</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                /* 2FA Verification Step */
                <form onSubmit={handleVerify2FA} className="space-y-4 text-xs">
                  <div className="p-3 bg-blue-950/50 border border-blue-800/60 rounded-xl text-blue-300 text-xs">
                    {pendingPreAuth ? (
                      <>Mã xác thực OTP {otpChannelHint || 'đã được gửi'}. Nhập mã để hoàn tất đăng nhập (hết hạn sau ~5 phút).</>
                    ) : (
                      <>Tài khoản <strong>{pendingUser?.name}</strong> có bảo mật 2 lớp. Vui lòng nhập mã OTP gửi tới ứng dụng Authenticator / Email công vụ.</>
                    )}
                  </div>

                  {otpDevCode && (
                    <div className="p-2.5 bg-amber-950/40 border border-amber-800/50 rounded-xl text-amber-300 text-xs font-mono">
                      Mã OTP (chế độ dev): <strong>{otpDevCode}</strong>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5">Mã Xác Thực 2FA (6 chữ số):</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={8}
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        className="w-full text-center tracking-widest text-lg font-mono font-bold py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    {pendingPreAuth && (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={otpBusy}
                        className="mt-2 text-blue-400 hover:text-blue-300 font-bold disabled:opacity-50 cursor-pointer"
                      >
                        Gửi lại mã
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCancel2FA}
                      className="w-1/3 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
                    >
                      Quay lại
                    </button>
                    <button
                      type="submit"
                      disabled={otpBusy}
                      className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{otpBusy ? 'Đang xác thực...' : 'Xác Thực & Vào Hệ Thống'}</span>
                    </button>
                  </div>
                </form>
              )}

            </div>

            {/* Right Column: Security Guidance & Quick Lookup */}
            <div className="hidden lg:col-span-7 space-y-4">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-bold text-white">Chính Sách Bảo Mật & Xác Thực Danh Tính</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    ISO 27799 / HIPAA
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-700/50 space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                      <Lock className="w-4 h-4" />
                      <span>Kiểm Soát Phiên Làm Việc</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Mỗi nhân viên chỉ hoạt động trên một phiên làm việc được mã hóa. Đã khóa hoàn toàn tính năng chuyển đổi tài khoản tùy tiện.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-700/50 space-y-1">
                    <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                      <Users className="w-4 h-4" />
                      <span>Admin Cấp Quyền & Tạo TK</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Chỉ tài khoản Ban Giám Đốc (Admin) mới có quyền khởi tạo, chỉnh sửa và phân bổ quyền cho nhân viên các khoa phòng.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-700/50 space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <KeyRound className="w-4 h-4" />
                      <span>Mật Khẩu Mặc Định</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Mật khẩu được quản lý riêng cho từng tài khoản và không hiển thị trên màn hình đăng nhập.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-700/50 space-y-1">
                    <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Xác Thực 2 Lớp (2FA)</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Các tài khoản quản trị và bác sĩ trưởng khoa được kích hoạt 2FA. Mã xác nhận được gửi qua kênh bảo mật đã đăng ký.
                    </p>
                  </div>
                </div>

                {/* Account Reference Summary */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300">Tài khoản tiêu biểu theo từng vị trí:</span>
                    <button
                      onClick={() => setActiveTab('staff_list')}
                      className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Xem toàn bộ {staffList.length} tài khoản</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {staffList.slice(0, 5).map((user) => (
                      <div
                        key={user.id}
                        className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-2.5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs shrink-0 ${
                              user.role === 'Quản Trị Viên Hệ Thống (Admin)' || user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('it')
                                ? 'bg-slate-950 text-cyan-300 ring-1 ring-cyan-500/50'
                                : user.role === 'Ban Giám Đốc'
                                ? 'bg-purple-700 text-white'
                                : user.role === 'Bác sĩ Trưởng Khoa'
                                ? 'bg-blue-600 text-white'
                                : user.role === 'Chuyên viên Tiếp đón'
                                ? 'bg-emerald-600 text-white'
                                : user.role === 'Marketing Lead'
                                ? 'bg-pink-600 text-white'
                                : 'bg-amber-600 text-white'
                            }`}
                          >
                            {getStaffInitials(user.name)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white">{user.name}</span>
                              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-blue-300 font-mono text-[10px] border border-slate-700">
                                {user.staffCode}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400">{user.role}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setUsernameOrEmail(user.email || user.staffCode || '');
                              setPassword('');
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-lg text-[11px] font-bold border border-slate-700 cursor-pointer transition-colors"
                          >
                            Điền biểu mẫu
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. STAFF LIST DIRECTORY TAB (REFERENCE ONLY, NO ONE-CLICK LOGIN BYPASS) */}
        {/* ========================================================================= */}
        {activeTab === 'staff_list' && (
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-400" />
                  Danh Mục Tài Khoản Cán Bộ & Nhân Viên
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Danh sách vai trò và trạng thái tài khoản. Thông tin xác thực không được hiển thị công khai.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('login')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-colors self-start sm:self-auto"
              >
                ← Quay lại Màn Hình Đăng Nhập
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffList.map((user) => (
                <div
                  key={user.id}
                  className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs shrink-0 ${
                        user.role === 'Quản Trị Viên Hệ Thống (Admin)' || user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('it')
                          ? 'bg-slate-950 text-cyan-300 ring-1 ring-cyan-500/50'
                          : user.role === 'Ban Giám Đốc'
                          ? 'bg-purple-700 text-white'
                          : user.role === 'Bác sĩ Trưởng Khoa'
                          ? 'bg-blue-600 text-white'
                          : user.role === 'Chuyên viên Tiếp đón'
                          ? 'bg-emerald-600 text-white'
                          : user.role === 'Marketing Lead'
                          ? 'bg-pink-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {getStaffInitials(user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-white text-xs truncate">{user.name}</h4>
                        <span className="px-1.5 py-0.5 rounded bg-blue-900/60 border border-blue-700 text-blue-300 text-[10px] font-mono">
                          {user.staffCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-400 font-medium mt-0.5">{user.role}</p>
                      <p className="text-[10px] text-slate-400 truncate">{user.department}</p>
                    </div>
                  </div>

                  <div className="text-[11px] space-y-1.5 pt-2 border-t border-slate-800 text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Email đăng nhập:</span>
                      <span className="text-slate-200 font-mono">{user.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Mật khẩu:</span>
                      <span className="text-slate-500 font-semibold">Được bảo mật</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>SĐT:</span>
                      <span className="text-slate-200 font-mono">{user.phone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Bảo mật 2FA:</span>
                      <span className={user.twoFactorEnabled ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {user.twoFactorEnabled ? '● Đã bật' : '○ Chưa bật'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Trạng thái:</span>
                      <span className={user.status === 'suspended' ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                        {user.status === 'suspended' ? 'Đã khóa' : 'Hoạt động'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUsernameOrEmail(user.email || user.staffCode || '');
                      setPassword('');
                      setActiveTab('login');
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Điền vào form đăng nhập</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. RBAC PERMISSIONS MATRIX TAB */}
        {/* ========================================================================= */}
        {activeTab === 'matrix' && (
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
                Ma Trận Phân Quyền Chi Tiết Theo Vai Trò (RBAC Matrix)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Quy định cụ thể các phân hệ và quyền hạn thao tác dữ liệu được cấp cho từng vị trí cán bộ nhân viên trong bệnh viện/phòng khám.
              </p>
            </div>

            <div className="border border-slate-700 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-300 font-bold border-b border-slate-700">
                      <th className="py-3.5 px-4 min-w-[200px]">Phân Hệ Nghiệp Vụ</th>
                      {Object.values(ROLE_CONFIGS).map(role => (
                        <th key={role.id} className="py-3.5 px-3 text-center min-w-[130px]">
                          <span className="block text-white font-bold">{role.shortTitle}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{role.department.split(' ')[0]}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60 text-slate-300">
                    <tr className="hover:bg-slate-700/30">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-purple-400" />
                        <span>Tổng quan BI & Quản Trị Nhân Viên</span>
                      </td>
                      {Object.values(ROLE_CONFIGS).map(role => (
                        <td key={role.id} className="py-3 px-3 text-center">
                          {role.permissions.canViewFinancialBI ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                              <Check className="w-3.5 h-3.5" /> Toàn quyền Admin
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">- Khóa -</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    <tr className="hover:bg-slate-700/30">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-400" />
                        <span>Hồ Sơ Khách Hàng CRM 360°</span>
                      </td>
                      {Object.values(ROLE_CONFIGS).map(role => (
                        <td key={role.id} className="py-3 px-3 text-center">
                          {role.permissions.canViewClinicalEMR ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                              <Check className="w-3.5 h-3.5" /> Xem & Kê đơn
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">- Ẩn EMR -</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    <tr className="hover:bg-slate-700/30">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                        <span>Lịch Khám Đa Kênh & Tiếp Đón Quầy</span>
                      </td>
                      {Object.values(ROLE_CONFIGS).map(role => (
                        <td key={role.id} className="py-3 px-3 text-center">
                          {role.permissions.canManageAppointments ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                              <Check className="w-3.5 h-3.5" /> Check-in & Đặt
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">- Khóa -</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    <tr className="hover:bg-slate-700/30">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-indigo-400" />
                        <span>Hợp Đồng B2B & Gói Khám Doanh Nghiệp</span>
                      </td>
                      {Object.values(ROLE_CONFIGS).map(role => (
                        <td key={role.id} className="py-3 px-3 text-center">
                          {role.permissions.canManageB2BContracts ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                              <Check className="w-3.5 h-3.5" /> Quản lý Sales
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">- Khóa -</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    <tr className="hover:bg-slate-700/30">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-pink-400" />
                        <span>Marketing Automation & Zalo ZNS</span>
                      </td>
                      {Object.values(ROLE_CONFIGS).map(role => (
                        <td key={role.id} className="py-3 px-3 text-center">
                          {role.permissions.canManageMarketing ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                              <Check className="w-3.5 h-3.5" /> Gửi ZNS & Target
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">- Khóa -</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    <tr className="hover:bg-slate-700/30">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <Headphones className="w-4 h-4 text-amber-400" />
                        <span>CSKH, Khiếu Nại & Quản Trị SLA</span>
                      </td>
                      {Object.values(ROLE_CONFIGS).map(role => (
                        <td key={role.id} className="py-3 px-3 text-center">
                          {role.permissions.canManageTickets ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                              <Check className="w-3.5 h-3.5" /> Xử lý Ticket
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">- Khóa -</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    <tr className="hover:bg-slate-700/30">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <Award className="w-4 h-4 text-cyan-400" />
                        <span>Hội Viên VIP, Điểm Thưởng & Referral</span>
                      </td>
                      {Object.values(ROLE_CONFIGS).map(role => (
                        <td key={role.id} className="py-3 px-3 text-center">
                          {role.permissions.canManageLoyalty ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                              <Check className="w-3.5 h-3.5" /> Duyệt & Nâng hạng
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">- Khóa -</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveTab('login')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-colors"
              >
                ← Quay lại Trang Đăng Nhập
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

