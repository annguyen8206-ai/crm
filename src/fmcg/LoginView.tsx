import React, { useState } from 'react';
import { ShoppingBasket, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import type { CurrentUser } from '../types';
import { Field, Input, Button } from './ui';

const describeChannel = (channel?: string, mode?: string) => {
  if (mode === 'simulated') return 'đã tạo (giả lập — chưa cấu hình Zalo/SMS/email, xem log máy chủ hoặc mã dev bên dưới)';
  if (channel === 'zalo') return 'đã gửi qua Zalo tới số điện thoại đã đăng ký';
  if (channel === 'sms') return 'đã gửi qua SMS tới số điện thoại đã đăng ký';
  if (channel === 'email') return 'đã gửi qua email';
  return 'đã được gửi tới kênh bảo mật đã đăng ký';
};

export function LoginView({ onLoginSuccess }: { onLoginSuccess: (u: CurrentUser) => void }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preAuth, setPreAuth] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [hint, setHint] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);

  const finish = (user: any) => onLoginSuccess({ ...user, roleTitle: user.roleTitle || user.role, status: 'active' } as CurrentUser);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      const r = await apiClient.auth.staffLogin(identifier.trim(), password);
      if (r.twoFactorRequired && r.preAuthToken) {
        setPreAuth(r.preAuthToken); setOtp(''); setHint(describeChannel(r.channel, r.otpMode)); setDevCode(r.devCode || null);
        return;
      }
      finish(r.user);
    } catch (err: any) {
      const msg = err?.message || '';
      setError(/failed to fetch|networkerror|load failed/i.test(msg)
        ? 'Không kết nối được máy chủ. Kiểm tra backend và cấu hình DATABASE_URL, JWT_SECRET.'
        : msg || 'Đăng nhập thất bại');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preAuth) return;
    setError(null); setBusy(true);
    try {
      const r = await apiClient.auth.staffLogin2fa(preAuth, otp.trim());
      finish(r.user);
    } catch (err: any) {
      setError(err?.message || 'Mã xác thực không đúng hoặc đã hết hạn');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!preAuth) return;
    setBusy(true);
    try {
      const r = await apiClient.auth.staffLogin2faResend(preAuth);
      setHint(describeChannel(r.channel, r.otpMode)); setDevCode(r.devCode || null);
    } catch (err: any) {
      setError(err?.message || 'Không gửi lại được mã');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center"><ShoppingBasket className="w-6 h-6" /></div>
          <div>
            <div className="text-xl font-bold text-slate-900 tracking-tight">VitCRM</div>
            <div className="text-xs text-slate-500">CRM hàng tiêu dùng · B2B & B2C</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          {!preAuth ? (
            <form onSubmit={login} className="space-y-4">
              <h1 className="text-base font-bold text-slate-900">Đăng nhập nhân viên</h1>
              <Field label="Email hoặc mã nhân viên"><Input autoFocus autoComplete="username" value={identifier} onChange={e => setIdentifier(e.target.value)} required /></Field>
              <Field label="Mật khẩu">
                <div className="relative">
                  <Input type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required className="pr-10" />
                  <button type="button" onClick={() => setShow(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 cursor-pointer" aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
              {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-2.5">{error}</div>}
              <Button type="submit" className="w-full !py-2.5" disabled={busy}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Đăng nhập</Button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <h1 className="text-base font-bold text-slate-900 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-blue-600" /> Xác thực 2 lớp</h1>
              <p className="text-sm text-slate-600">Mã xác thực {hint}.</p>
              {devCode && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">Mã dev: <b className="font-mono">{devCode}</b></p>}
              <Field label="Mã OTP"><Input autoFocus inputMode="numeric" value={otp} onChange={e => setOtp(e.target.value)} className="tracking-[0.4em] text-center font-mono" required /></Field>
              {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-2.5">{error}</div>}
              <Button type="submit" className="w-full !py-2.5" disabled={busy}>Xác nhận</Button>
              <div className="flex justify-between text-xs">
                <button type="button" onClick={() => { setPreAuth(null); setError(null); }} className="text-slate-500 cursor-pointer">← Quay lại</button>
                <button type="button" onClick={resend} disabled={busy} className="text-blue-600 font-bold cursor-pointer">Gửi lại mã</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
