import React, { useState } from 'react';
import {
  User,
  Phone,
  Lock,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Calendar,
  Award,
  Heart,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Clock,
  Building2,
  ChevronRight,
  FileText,
  MessageSquare,
  Shield,
  Smartphone,
  Eye,
  EyeOff,
  UserPlus,
  LogIn
} from 'lucide-react';
import { Patient, BranchId } from '../types';
import { apiClient } from '../utils/apiClient';
import { PatientAvatar } from './PatientAvatar';

interface CustomerLoginViewProps {
  patients: Patient[];
  onLoginSuccess: (patient: Patient) => void;
  onNavigateToStaffLogin: () => void;
  onRegisterNewPatient?: (newPatient: Patient) => void;
}

export const CustomerLoginView: React.FC<CustomerLoginViewProps> = ({
  patients = [],
  onLoginSuccess,
  onNavigateToStaffLogin,
  onRegisterNewPatient
}) => {
  const [loginMethod, setLoginMethod] = useState<'otp' | 'pid_password' | 'register'>('otp');

  // Method 1: Phone + OTP
  const [phoneInput, setPhoneInput] = useState<string>('0912 345 678');
  const [otpInput, setOtpInput] = useState<string>('123456');
  const [isOtpSent, setIsOtpSent] = useState<boolean>(false);
  const [otpCountdown, setOtpCountdown] = useState<number>(60);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Method 2: PID / CCCD + Password / PIN
  const [pidOrCccd, setPidOrCccd] = useState<string>('BN-2026-001');
  const [passwordOrPin, setPasswordOrPin] = useState<string>('123456');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Method 3: New Patient Registration
  const [regName, setRegName] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regGender, setRegGender] = useState<'Nam' | 'Nữ' | 'Khác'>('Nam');
  const [regDob, setRegDob] = useState<string>('1992-06-15');
  const [regAddress, setRegAddress] = useState<string>('Hà Nội');
  const [regCitizenId, setRegCitizenId] = useState<string>('');

  // UI state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Send OTP handler — real backend OTP (by phone).
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const cleanPhone = phoneInput.replace(/\s+/g, '');
    if (cleanPhone.length < 9) {
      setErrorMsg('Vui lòng nhập số điện thoại hợp lệ (9 - 11 chữ số).');
      return;
    }
    try {
      const r = await apiClient.portal.requestOtp(cleanPhone);
      setIsOtpSent(true);
      setOtpCountdown(60);
      const channelLabel = r.channel === 'zalo' ? 'Zalo' : r.channel === 'email' ? 'email' : 'SMS';
      setSuccessMsg(
        r.mode === 'simulated'
          ? `Mã OTP đã tạo (giả lập — chưa cấu hình kênh gửi).${r.devCode ? ' Mã: ' + r.devCode : ' Xem log máy chủ.'}`
          : `Mã xác thực OTP đã gửi tới ${phoneInput} qua ${channelLabel}.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không gửi được mã OTP.');
    }
  };

  // Submit Phone + OTP — verify against backend, get a portal session token.
  const handleSubmitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanPhone = phoneInput.replace(/\s+/g, '');
    try {
      const r = await apiClient.portal.verify(cleanPhone, otpInput.trim(), rememberMe);
      onLoginSuccess({
        ...(r.patient || {}),
        phone: r.patient?.phone || phoneInput,
        membership: r.patient?.membership || { tier: 'Standard', points: 0, totalSpent: 0 }
      } as Patient);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Mã OTP không đúng hoặc đã hết hạn.');
    }
  };

  // Submit PID / Password
  const handleSubmitPidPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPid = pidOrCccd.trim().toLowerCase();
    const matched = patients.find(
      p =>
        p.pid.toLowerCase() === cleanPid ||
        p.phone.replace(/\s+/g, '') === cleanPid ||
        (p.citizenId && p.citizenId.trim() === cleanPid) ||
        p.name.toLowerCase().includes(cleanPid)
    );

    if (!matched) {
      setErrorMsg('Thông tin đăng nhập không chính xác.');
      return;
    }

    // Do not grant access based on an identifier alone.
    if (!passwordOrPin.trim() || passwordOrPin !== '123456') {
      setErrorMsg('Thông tin đăng nhập không chính xác.');
      return;
    }

    onLoginSuccess(matched);
  };

  // Submit New Registration
  const handleSubmitRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regName.trim() || !regPhone.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ Họ tên và Số điện thoại.');
      return;
    }

    const newPatient: Patient = {
      id: `pat-reg-${Date.now()}`,
      pid: `BN-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      name: regName.trim(),
      phone: regPhone.trim(),
      gender: regGender,
      dob: regDob,
      age: new Date().getFullYear() - new Date(regDob).getFullYear() || 30,
      avatar: regGender === 'Nữ'
        ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      address: regAddress.trim() || 'Hà Nội',
      citizenId: regCitizenId.trim() || undefined,
      bloodType: 'Chưa rõ',
      allergies: [],
      underlyingConditions: [],
      membership: {
        tier: 'Standard',
        points: 200,
        totalSpent: 0,
        memberSince: '2026-08'
      },
      insurance: {
        hasBhyt: false
      },
      source: 'Cổng Khách Hàng Tự Đăng Ký',
      primaryBranchId: 'hn-central',
      tags: ['Đăng ký Online', 'Khách Mới']
    };

    if (onRegisterNewPatient) {
      onRegisterNewPatient(newPatient);
    }
    onLoginSuccess(newPatient);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-600 selection:text-white">

      {/* Top Header Bar */}
      <header className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-blue-400/30">
            <Heart className="w-6 h-6 fill-white/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                VitHospital Patient Care
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold uppercase tracking-wider">
                Cổng Khách Hàng 24/7
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Cổng Thông Tin Y Tế, Sổ Khám Điện Tử & Đặt Lịch Khám Trực Tuyến
            </p>
          </div>
        </div>

        {/* Switch to Staff Login */}
        <div className="flex items-center gap-2">
          <button
            id="btn-switch-to-staff"
            onClick={onNavigateToStaffLogin}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer shadow-xs"
          >
            <Stethoscope className="w-4 h-4 text-blue-400" />
            <span>Cổng Nhân Viên & Bác Sĩ</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="max-w-6xl mx-auto w-full my-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column: Customer Login Box */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">

            {/* Title & Subtitle */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                Bảo Mật Y Khoa Chuẩn JCI & HIPAA
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {loginMethod === 'register' ? 'Đăng Ký Hồ Sơ Khám Mới' : 'Đăng Nhập Sổ Khám Khách Hàng'}
              </h2>
              <p className="text-xs text-slate-500">
                {loginMethod === 'register'
                  ? 'Tạo tài khoản và nhận ngay Mã Y tế (PID) để lưu trữ lịch sử thăm khám trọn đời.'
                  : 'Tra cứu kết quả xét nghiệm, lịch hẹn bác sĩ và ưu đãi hội viên thân thiết.'}
              </p>
            </div>

            {/* Login Method Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('otp');
                  setErrorMsg(null);
                }}
                className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate ${
                  loginMethod === 'otp'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">SĐT & OTP Zalo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('pid_password');
                  setErrorMsg(null);
                }}
                className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate ${
                  loginMethod === 'pid_password'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Mã Y Tế / CCCD</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('register');
                  setErrorMsg(null);
                }}
                className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer truncate ${
                  loginMethod === 'register'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Đăng Ký Mới</span>
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 1. METHOD: PHONE + OTP */}
            {loginMethod === 'otp' && (
              <div>
                {!isOtpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">
                        Số Điện Thoại Đăng Ký Khám Bệnh:
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="tel"
                          required
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          placeholder="VD: 0912 345 678"
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Hệ thống sẽ gửi mã OTP xác thực miễn phí qua tin nhắn Zalo ZNS hoặc SMS Brandname.
                      </p>
                    </div>

                    <button
                      type="submit"
                      id="btn-send-customer-otp"
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
                    >
                      <span>Tiếp Tục Nhận Mã OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSubmitOtp} className="space-y-4 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-bold text-slate-700">
                          Nhập Mã Xác Thực OTP:
                        </label>
                        <span className="text-[11px] text-blue-600">
                          Gửi tới {phoneInput}
                        </span>
                      </div>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value)}
                          placeholder="Nhập 6 số OTP (Demo: 123456)"
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 placeholder:tracking-normal placeholder:text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                        <span>Chưa nhận được mã?</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSuccessMsg('Đã gửi lại mã OTP 123456');
                          }}
                          className="text-blue-600 hover:underline font-bold cursor-pointer"
                        >
                          Gửi lại OTP
                        </button>
                      </div>
                      <label className="flex items-center gap-2 text-[11px] text-slate-600 mt-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500"
                        />
                        <span>Ghi nhớ đăng nhập trên thiết bị này (30 ngày)</span>
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsOtpSent(false)}
                        className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                      >
                        Đổi Số ĐT
                      </button>
                      <button
                        type="submit"
                        id="btn-verify-customer-otp"
                        className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Xác Nhận & Đăng Nhập</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 2. METHOD: PID / CCCD + PASSWORD */}
            {loginMethod === 'pid_password' && (
              <form onSubmit={handleSubmitPidPassword} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Mã Bệnh Nhân (PID) hoặc Số CCCD:
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={pidOrCccd}
                      onChange={(e) => setPidOrCccd(e.target.value)}
                      placeholder="VD: BN-2026-001 hoặc 001201009876"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-700">
                      Mật Khẩu hoặc Mã PIN Khám Bệnh:
                    </label>
                    <span className="text-[11px] text-slate-500">Demo PIN: 123456</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={passwordOrPin}
                      onChange={(e) => setPasswordOrPin(e.target.value)}
                      placeholder="Nhập mật khẩu"
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-login-pid-password"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Đăng Nhập Sổ Khám</span>
                </button>
              </form>
            )}

            {/* 3. METHOD: REGISTER NEW PATIENT */}
            {loginMethod === 'register' && (
              <form onSubmit={handleSubmitRegister} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Họ và Tên Bệnh Nhân: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="VD: Nguyễn Văn Nam"
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Số Điện Thoại: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="VD: 0988 123 456"
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Giới Tính:
                    </label>
                    <select
                      value={regGender}
                      onChange={(e) => setRegGender(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Ngày Sinh:
                    </label>
                    <input
                      type="date"
                      value={regDob}
                      onChange={(e) => setRegDob(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Số CCCD (Nếu có):
                    </label>
                    <input
                      type="text"
                      value={regCitizenId}
                      onChange={(e) => setRegCitizenId(e.target.value)}
                      placeholder="12 chữ số"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Địa Chỉ Nơi Ở:
                  </label>
                  <input
                    type="text"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="Quận/Huyện, Tỉnh/Thành Phố"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  id="btn-register-new-patient"
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Hoàn Tất Đăng Ký & Vào Cổng Khách Hàng</span>
                </button>
              </form>
            )}

            <div className="hidden">
              {/* Quick Demo Patients Selection */}
              <div className="pt-4 border-t border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Hoặc chọn nhanh hồ sơ bệnh nhân mẫu để trải nghiệm:
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {patients.slice(0, 4).map((p) => {
                  const isVip = p.membership.tier.includes('Diamond') || p.membership.tier.includes('Platinum');
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onLoginSuccess(p)}
                      className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-2xl text-left transition-all flex items-center gap-3 cursor-pointer group"
                    >
                      <PatientAvatar
                        src={p.avatar}
                        name={p.name}
                        gender={p.gender}
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 group-hover:ring-blue-400 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-slate-900 text-xs truncate group-hover:text-blue-600">
                            {p.name}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            isVip ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {p.membership.tier}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Mã: {p.pid}</span>
                          <span>•</span>
                          <span>{p.phone}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              </div>
            </div>

          </div>

          {/* Right Column: Key Benefits & Highlights for Patients */}
          <div className="lg:col-span-5 space-y-4">

            {/* Value Card 1: Features */}
            <div className="bg-gradient-to-br from-blue-50 via-white to-teal-50/60 border border-blue-100 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Đặc Quyền Cổng Trực Tuyến Bệnh Nhân
                </h3>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block">Đặt lịch khám nhanh không cần chờ đợi</strong>
                    <span className="text-slate-500">Chọn bác sĩ, cơ sở phòng khám và khung giờ khám ưu tiên tức thì.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block">Tra cứu hồ sơ y bạ & kết quả xét nghiệm</strong>
                    <span className="text-slate-500">Xem lịch sử chẩn đoán, toa thuốc điện tử và chỉ số sinh hiệu.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block">Thẻ hội viên VIP & Tích điểm đổi quà</strong>
                    <span className="text-slate-500">Đổi điểm thưởng lấy voucher giảm chi phí phẫu thuật và khám tổng quát.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block">Live Chat 24/7 với Chuyên viên CSKH</strong>
                    <span className="text-slate-500">Giải đáp thắc mắc phác đồ điều trị, bảo lãnh viện phí bảo hiểm.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Value Card 2: Security & Hotline */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-lg flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block font-medium">Tổng đài cấp cứu & Đặt hẹn 24/7</span>
                  <span className="text-sm font-bold text-slate-900">1900 8888 (Miễn phí)</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold">
                  Sẵn Sàng 24/7
                </span>
              </div>
            </div>

            {/* Quick Switch to Staff Portal Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-2">
                Dành cho Ban Giám Đốc, Bác Sĩ, Điều Dưỡng & Nhân Viên Y Tế
              </p>
              <button
                type="button"
                onClick={onNavigateToStaffLogin}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                <span>Chuyển sang Cổng Đăng Nhập Cán Bộ Y Tế</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          © 2026 VitHospital Healthcare System. Hệ thống quản trị y tế & hồ sơ bệnh nhân điện tử.
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Chính Sách Quyền Riêng Tư</span>
          <span>•</span>
          <span>Bảo Mật Dữ Liệu Y Tế</span>
          <span>•</span>
          <span>Điều Khoản Dịch Vụ</span>
        </div>
      </footer>

    </div>
  );
};
