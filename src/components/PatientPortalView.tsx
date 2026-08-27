import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Star,
  MessageSquare,
  Clock,
  CheckCircle2,
  PhoneCall,
  User,
  Phone,
  Send,
  Building2,
  Stethoscope,
  Sparkles,
  ArrowRight,
  Heart,
  ChevronRight,
  Plus,
  CalendarCheck,
  MapPin,
  LogIn,
  LogOut,
  ShieldCheck,
  Bot,
  UserCircle2,
  Award,
  QrCode,
  Check,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Patient, Doctor, Branch, SupportTicket, Appointment } from '../types';
import { formatDateVN } from '../utils/dateUtils';
import { PatientAvatar } from './PatientAvatar';

interface PatientPortalViewProps {
  patients: Patient[];
  doctors: Doctor[];
  branches: Branch[];
  tickets: SupportTicket[];
  appointments: Appointment[];
  onAddNewTicket: (ticket: Omit<SupportTicket, 'id'>) => void;
  onBookSelfAppointment: (appointment: Omit<Appointment, 'id' | 'code'>) => void;
  onSelectPatient: (patientId: string) => void;
  onNavigateToCare?: () => void;
  onNavigateToAppointments?: () => void;
  currentPatientOverride?: Patient | null;
  onCustomerLogout?: () => void;
  onNavigateToStaffPortal?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'customer' | 'cskh' | 'ai';
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: string;
  quickAction?: {
    label: string;
    action: () => void;
  };
}

export const PatientPortalView: React.FC<PatientPortalViewProps> = ({
  patients = [],
  doctors = [],
  branches = [],
  tickets = [],
  appointments = [],
  onAddNewTicket,
  onBookSelfAppointment,
  onSelectPatient,
  onNavigateToCare,
  onNavigateToAppointments,
  currentPatientOverride,
  onCustomerLogout,
  onNavigateToStaffPortal
}) => {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    currentPatientOverride?.id || patients[0]?.id || 'pat-1'
  );

  useEffect(() => {
    if (currentPatientOverride?.id) {
      setSelectedPatientId(currentPatientOverride.id);
      setIsLoggedIn(true);
    }
  }, [currentPatientOverride?.id]);
  const [loginPhone, setLoginPhone] = useState<string>('0912 345 678');
  const [loginOtp, setLoginOtp] = useState<string>('123456');
  const [isOtpSent, setIsOtpSent] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'book_appointment' | 'live_chat' | 'my_appointments' | 'feedback_ticket'>('book_appointment');

  // Booking Form State
  const [bookBranchId, setBookBranchId] = useState<string>(branches[0]?.id || 'hn-central');
  const [bookDoctorId, setBookDoctorId] = useState<string>(doctors[0]?.id || 'doc-1');
  const [bookDate, setBookDate] = useState<string>('2026-08-22');
  const [bookTimeSlot, setBookTimeSlot] = useState<string>('09:00 - 09:30');
  const [bookType, setBookType] = useState<Appointment['type']>('Khám mới');
  const [bookReason, setBookReason] = useState<string>('');
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);

  // Live Chat State
  const [chatInput, setChatInput] = useState<string>('');
  const [isCskhTyping, setIsCskhTyping] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'cskh',
      senderName: 'Tư vấn viên CSKH 24/7',
      text: 'Kính chào Quý khách! Bệnh viện Đa khoa Quốc tế có thể hỗ trợ Quý khách thông tin gì về đặt lịch khám, bảng giá dịch vụ hay kết quả xét nghiệm hôm nay ạ?',
      timestamp: '08:30'
    }
  ]);

  // Feedback & Complaint Form State
  const [ticketCategory, setTicketCategory] = useState<SupportTicket['category']>('Góp ý dịch vụ');
  const [ticketPriority, setTicketPriority] = useState<SupportTicket['priority']>('Trung bình (SLA 8h)');
  const [ticketContent, setTicketContent] = useState<string>('');
  const [ticketRating, setTicketRating] = useState<number>(5);
  const [ticketDept, setTicketDept] = useState<string>('Phòng CSKH & Trải nghiệm Bệnh nhân');
  const [ticketSuccessMsg, setTicketSuccessMsg] = useState<string | null>(null);

  const currentPatient = patients.find(p => p.id === selectedPatientId) || patients[0] || {
    id: 'pat-guest',
    name: 'Khách hàng',
    phone: '0900000000',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    membership: { tier: 'Standard', points: 100 },
    pid: 'PID-GUEST',
    gender: 'Nữ',
    age: 30
  };

  const patientApts = (appointments || []).filter(a => a.patientId === currentPatient?.id || a.patientPhone === currentPatient?.phone);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (activeTab === 'live_chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isCskhTyping, activeTab]);

  // Handle Login with OTP
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone || loginPhone.replace(/\s+/g, '').length < 9) {
      setLoginError('Vui lòng nhập số điện thoại hợp lệ (10 chữ số).');
      return;
    }
    setLoginError(null);
    setIsOtpSent(true);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = loginPhone.replace(/\s+/g, '');
    const matchedPatient = patients.find(p => p.phone.replace(/\s+/g, '') === cleanPhone || p.phone.includes(cleanPhone.slice(-7)));

    if (matchedPatient) {
      setSelectedPatientId(matchedPatient.id);
      setIsLoggedIn(true);
      setIsOtpSent(false);
      setLoginError(null);
    } else {
      // If phone not in database, log in as first patient or guest
      if (patients.length > 0) {
        setSelectedPatientId(patients[0].id);
      }
      setIsLoggedIn(true);
      setIsOtpSent(false);
      setLoginError(null);
    }
  };

  const handleQuickLogin = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setLoginPhone(patient.phone);
    setIsLoggedIn(true);
    setIsOtpSent(false);
    setLoginError(null);
  };

  // Handle Self-Booking submission
  const handleSelfBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookReason.trim()) {
      alert('Vui lòng nhập lý do khám hoặc nhu cầu tư vấn!');
      return;
    }

    const selectedDoc = doctors.find(d => d.id === bookDoctorId) || doctors[0];

    onBookSelfAppointment({
      patientId: currentPatient.id,
      patientName: currentPatient.name,
      patientPhone: currentPatient.phone,
      gender: currentPatient.gender,
      age: currentPatient.age,
      branchId: bookBranchId,
      department: selectedDoc.specialty,
      doctorId: selectedDoc.id,
      doctorName: selectedDoc.name,
      appointmentDate: bookDate,
      timeSlot: bookTimeSlot,
      type: bookType,
      bookingChannel: 'Ứng dụng Bệnh nhân',
      status: 'Chờ xác nhận',
      notes: `[Khách hàng tự đặt trực tuyến]: ${bookReason.trim()}`,
      reminderStatus: {
        znsSent: true,
        smsSent: false,
        callConfirmed: false
      },
      fee: 450000
    });

    setBookingSuccessMsg(`Yêu cầu đặt lịch đã được ghi nhận thành công! Bộ phận CSKH sẽ liên hệ qua số ${currentPatient.phone} và gửi tin xác nhận Zalo ZNS trong ít phút.`);
    setBookReason('');
  };

  // Handle Live Chat Send
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text) return;

    const newMsgId = `msg-${Date.now()}`;
    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    // Append customer message
    setChatMessages(prev => [
      ...prev,
      {
        id: newMsgId,
        sender: 'customer',
        senderName: currentPatient.name,
        text: text,
        timestamp: timeNow
      }
    ]);
    setChatInput('');
    setIsCskhTyping(true);

    // Simulate CSKH response after 1.2s
    setTimeout(() => {
      setIsCskhTyping(false);
      let replyText = '';
      const lower = text.toLowerCase();

      if (lower.includes('đặt lịch') || lower.includes('hẹn khám') || lower.includes('bác sĩ')) {
        replyText = `Dạ chào Quý khách ${currentPatient.name}! Em đã tiếp nhận yêu cầu đặt lịch khám. Quý khách có thể chuyển sang tab "[Đặt Lịch Khám]" bên cạnh để chọn Bác sĩ và khung giờ ưng ý, hoặc em hỗ trợ đăng ký trực tiếp luôn cho mình ạ!`;
      } else if (lower.includes('giá') || lower.includes('chi phí') || lower.includes('gói')) {
        replyText = `Dạ hiện tại Quý khách đang là Hội viên Hạng [${currentPatient.membership.tier}], được áp dụng chiết khấu trực tiếp lên đến 15% tất cả các dịch vụ khám chuyên sâu và xét nghiệm. Bảng giá khám ban đầu niêm yết từ 350.000đ - 450.000đ Quý khách nhé!`;
      } else if (lower.includes('đổi lịch') || lower.includes('hủy')) {
        replyText = `Dạ Quý khách có thể xem danh sách lịch hẹn tại tab "[Lịch Hẹn Của Tôi]" để quản lý hoặc báo lại khung giờ mới để tổng đài CSKH hỗ trợ điều chỉnh ngay ạ!`;
      } else if (lower.includes('nhịn ăn') || lower.includes('chuẩn bị')) {
        replyText = `Dạ đối với các gói xét nghiệm máu tổng quát hoặc siêu âm ổ bụng, Quý khách nên nhịn ăn sáng từ 6 - 8 tiếng và uống một chút nước lọc để kết quả xét nghiệm đạt độ chính xác cao nhất ạ.`;
      } else {
        replyText = `Dạ em xin ghi nhận câu hỏi của Quý khách "${text}". Chuyên viên CSKH đang kiểm tra hồ sơ và sẽ hỗ trợ giải đáp chi tiết ngay cho Quý khách ạ!`;
      }

      setChatMessages(prev => [
        ...prev,
        {
          id: `msg-reply-${Date.now()}`,
          sender: 'cskh',
          senderName: 'Tư vấn viên CSKH 24/7',
          text: replyText,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1200);
  };

  // Handle Ticket / Feedback submission
  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketContent.trim()) {
      alert('Vui lòng nhập nội dung đánh giá hoặc góp ý!');
      return;
    }

    const now = new Date();
    let minutesToAdd = 120;
    if (ticketPriority.includes('30p')) minutesToAdd = 30;
    else if (ticketPriority.includes('2h')) minutesToAdd = 120;
    else if (ticketPriority.includes('8h')) minutesToAdd = 480;
    else if (ticketPriority.includes('24h')) minutesToAdd = 1440;

    const deadline = new Date(now.getTime() + minutesToAdd * 60000);
    const deadlineStr = deadline.toISOString().replace('T', ' ').substring(0, 16);
    const ticketCode = `TK-PORTAL-${Math.floor(1000 + Math.random() * 9000)}`;

    onAddNewTicket({
      code: ticketCode,
      patientId: currentPatient.id,
      patientName: currentPatient.name,
      patientPhone: currentPatient.phone,
      category: ticketCategory,
      priority: ticketPriority,
      assignedDepartment: ticketDept,
      assignedStaff: 'Tổ Tiếp nhận & Giải quyết Khiếu nại CSKH',
      status: 'Mới tiếp nhận',
      createdAt: now.toISOString().replace('T', ' ').substring(0, 16),
      slaDeadline: deadlineStr,
      isBreached: false,
      firstResponseMinutes: 5,
      csatScore: ticketRating,
      content: `[Đánh giá từ cổng khách hàng - ${ticketRating}★]: ${ticketContent.trim()}`
    });

    setTicketSuccessMsg(`Cảm ơn Quý khách! Đánh giá đã được ghi nhận vào hệ thống CSKH.`);
    setTicketContent('');
  };

  // IF NOT LOGGED IN: SHOW MODERN DEDICATED CUSTOMER LOGIN SCREEN
  if (!isLoggedIn) {
    return (
      <div className="max-w-xl mx-auto py-8 px-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <UserCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Cổng Đăng Nhập Khách Hàng</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Đăng nhập bằng Số điện thoại để chủ động đặt lịch khám, tra cứu thẻ hội viên và Chat trực tiếp với CSKH 24/7.
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {!isOtpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Số điện thoại khách hàng:</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    placeholder="VD: 0912 345 678"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">Hệ thống sẽ gửi mã xác thực OTP 6 số qua tin nhắn SMS / Zalo ZNS.</span>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm"
              >
                <span>Nhận Mã OTP Đăng Nhập</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs">
                Mã xác thực đã được gửi tới SĐT <strong>{loginPhone}</strong>. (Mã mẫu demo: <strong className="font-mono">123456</strong>)
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Nhập mã xác thực OTP (6 chữ số):</label>
                <input
                  type="text"
                  maxLength={6}
                  value={loginOtp}
                  onChange={(e) => setLoginOtp(e.target.value)}
                  className="w-full text-center tracking-widest text-lg font-mono font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOtpSent(false)}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Xác Nhận & Đăng Nhập</span>
                </button>
              </div>
            </form>
          )}

          {/* Quick Demo Account Selector */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block text-center">
              Hoặc chọn nhanh tài khoản khách hàng mẫu:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {patients.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleQuickLogin(p)}
                  className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <PatientAvatar src={p.avatar} name={p.name} gender={p.gender} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  <div className="truncate">
                    <div className="font-bold text-slate-900 text-xs truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-500">{p.phone} • ★ {p.membership.tier}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Compact Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Cổng Trải Nghiệm Khách Hàng 24/7
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
              Customer Portal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Đặt lịch khám, tra cứu thẻ hội viên, lịch sử khám và Live Chat CSKH
          </p>
        </div>

        {/* Account Switcher & Logout */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-2xl shadow-xs shrink-0">
          <div className="flex items-center gap-2 px-1.5">
            <PatientAvatar src={currentPatient.avatar} name={currentPatient.name} gender={currentPatient.gender} className="w-6 h-6 rounded-full object-cover ring-1 ring-blue-500 shrink-0" />
            <div className="text-left">
              <span className="text-xs font-bold text-slate-900 block leading-tight">{currentPatient.name}</span>
            </div>
          </div>
          <select
            value={selectedPatientId}
            onChange={(e) => {
              setSelectedPatientId(e.target.value);
              setBookingSuccessMsg(null);
              setTicketSuccessMsg(null);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs text-slate-700 font-medium focus:bg-white cursor-pointer"
            title="Đổi tài khoản"
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            id="btn-customer-portal-logout"
            onClick={() => {
              if (onCustomerLogout) {
                onCustomerLogout();
              } else {
                setIsLoggedIn(false);
              }
            }}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
            title="Đăng xuất khỏi sổ khám"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Patient Account Quick Summary Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <PatientAvatar
            src={currentPatient.avatar}
            name={currentPatient.name}
            gender={currentPatient.gender}
            className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-500 shadow-sm shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{currentPatient.name}</h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px] flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-500" />
                Hội viên {currentPatient.membership.tier}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Mã khách hàng: <strong className="text-slate-800 font-mono">{currentPatient.pid}</strong> | Điểm tích lũy: <strong className="text-amber-600 font-mono">{currentPatient.membership.points.toLocaleString()} pts</strong>
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('book_appointment')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'book_appointment' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>+ Đặt Lịch Khám</span>
          </button>
          <button
            onClick={() => setActiveTab('live_chat')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'live_chat' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat Với CSKH 24/7</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
          <button
            onClick={() => setActiveTab('my_appointments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'my_appointments' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Lịch Hẹn Của Tôi ({patientApts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('feedback_ticket')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'feedback_ticket' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Đánh Giá CSAT</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. BOOK APPOINTMENT TAB (SELF-SERVICE BOOKING) */}
      {/* ========================================================================= */}
      {activeTab === 'book_appointment' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="pb-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Đăng Ký Đặt Lịch Khám Bệnh Trực Tuyến
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Chủ động chọn địa điểm cơ sở, chuyên khoa khám và Bác sĩ. Tổng đài CSKH sẽ gửi tin xác nhận qua Zalo ZNS ngay lập tức.
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-xs flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Hệ thống xác nhận tự động 24/7
              </span>
            </div>

            {bookingSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold text-sm text-emerald-900 mb-1">Đặt Lịch Thành Công!</strong>
                  <p>{bookingSuccessMsg}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSelfBookSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Branch Selection */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Cơ sở khám bệnh mong muốn:</label>
                  <select
                    value={bookBranchId}
                    onChange={(e) => setBookBranchId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} - {b.address}</option>
                    ))}
                  </select>
                </div>

                {/* Doctor Selection */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Bác sĩ / Chuyên khoa phụ trách:</label>
                  <select
                    value={bookDoctorId}
                    onChange={(e) => setBookDoctorId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.specialty}) - {d.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Date Selection */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Ngày khám mong muốn:</label>
                  <input
                    type="date"
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
                    required
                  />
                </div>

                {/* Time Slot Selection */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Khung giờ hẹn:</label>
                  <select
                    value={bookTimeSlot}
                    onChange={(e) => setBookTimeSlot(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="08:00 - 08:30">08:00 - 08:30 (Sáng sớm)</option>
                    <option value="08:30 - 09:00">08:30 - 09:00</option>
                    <option value="09:00 - 09:30">09:00 - 09:30</option>
                    <option value="09:30 - 10:00">09:30 - 10:00</option>
                    <option value="10:00 - 10:30">10:00 - 10:30</option>
                    <option value="14:00 - 14:30">14:00 - 14:30 (Đầu chiều)</option>
                    <option value="14:30 - 15:00">14:30 - 15:00</option>
                    <option value="15:00 - 15:30">15:00 - 15:30</option>
                    <option value="16:00 - 16:30">16:00 - 16:30</option>
                  </select>
                </div>

                {/* Type Selection */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Phân loại dịch vụ:</label>
                  <select
                    value={bookType}
                    onChange={(e) => setBookType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="Khám mới">Khám mới ban đầu</option>
                    <option value="Tái khám">Tái khám theo hẹn</option>
                    <option value="Tầm soát">Khám tầm soát sức khỏe</option>
                    <option value="Tư vấn">Tư vấn sức khỏe</option>
                  </select>
                </div>
              </div>

              {/* Chief complaint / Reason */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Lý do khám hoặc triệu chứng / Yêu cầu riêng:</label>
                <textarea
                  value={bookReason}
                  onChange={(e) => setBookReason(e.target.value)}
                  placeholder="Mô tả các vấn đề sức khỏe, nhu cầu làm xét nghiệm tổng quát hoặc yêu cầu đặc biệt khi đến khám..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Send className="w-4 h-4" />
                <span>Xác Nhận Gửi Lịch Hẹn (Nhận Thông Báo Zalo Ngay)</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. LIVE CHAT WITH CSKH 24/7 (INTERACTIVE CHAT INTERFACE) */}
      {/* ========================================================================= */}
      {activeTab === 'live_chat' && (
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden flex flex-col h-[580px]">
            {/* Chat Top Header */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                    <HeadphonesIcon className="w-5 h-5" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    Tổng Đài CSKH & Tư Vấn Y Khoa Trực Tuyến
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[10px]">
                      Trực tuyến 24/7
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300">Đang trò chuyện với: <strong>{currentPatient.name}</strong> ({currentPatient.phone})</p>
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <span className="text-[11px] text-slate-400 block">Thời gian phản hồi</span>
                <span className="text-xs font-bold text-emerald-400">&lt; 1 phút</span>
              </div>
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-[11px]">
              <span className="text-slate-500 font-bold shrink-0 flex items-center gap-1 pl-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Gợi ý nhanh:
              </span>
              <button
                onClick={() => handleSendMessage('Tôi muốn tư vấn đặt lịch khám với Bác sĩ Tim Mạch')}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg shrink-0 cursor-pointer font-medium"
              >
                📅 Đặt lịch Bác sĩ Tim Mạch
              </button>
              <button
                onClick={() => handleSendMessage('Gói khám tổng quát VIP gồm những xét nghiệm gì và chi phí bao nhiêu?')}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg shrink-0 cursor-pointer font-medium"
              >
                💰 Bảng giá gói khám VIP
              </button>
              <button
                onClick={() => handleSendMessage('Đi khám xét nghiệm máu có cần nhịn ăn sáng không?')}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg shrink-0 cursor-pointer font-medium"
              >
                🩸 Hướng dẫn nhịn ăn trước xét nghiệm
              </button>
            </div>

            {/* Message Stream Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50 text-xs">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${msg.sender === 'customer' ? 'flex-row-reverse' : ''}`}
                >
                  {msg.sender === 'customer' ? (
                    <PatientAvatar
                      src={currentPatient.avatar}
                      name={currentPatient.name}
                      gender={currentPatient.gender}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-blue-500 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[78%] space-y-1 ${msg.sender === 'customer' ? 'items-end' : ''}`}>
                    <div className={`flex items-center gap-2 text-[10px] text-slate-400 ${msg.sender === 'customer' ? 'justify-end' : ''}`}>
                      <span className="font-bold text-slate-700">{msg.senderName}</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div
                      className={`p-3 rounded-2xl leading-relaxed ${
                        msg.sender === 'customer'
                          ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs shadow-xs'
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.text}</p>
                    </div>
                  </div>
                </div>
              ))}

              {isCskhTyping && (
                <div className="flex items-center gap-2 text-xs text-slate-500 pl-10">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span>Tư vấn viên đang soạn câu trả lời...</span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-3.5 bg-white border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Nhập câu hỏi cần CSKH tư vấn, hỏi giá dịch vụ hoặc yêu cầu hỗ trợ..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Gửi Tin</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MY APPOINTMENTS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'my_appointments' && (
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-blue-600" />
                Danh Sách Lịch Hẹn Khám Của Quý Khách ({patientApts.length})
              </h2>
              <button
                onClick={() => setActiveTab('book_appointment')}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Đặt Lịch Mới</span>
              </button>
            </div>

            {patientApts.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
                Quý khách chưa có lịch hẹn nào. Hãy bấm <strong>+ Đặt Lịch Mới</strong> để tạo lịch hẹn đầu tiên.
              </div>
            ) : (
              patientApts.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-slate-50 hover:bg-blue-50/40 p-4 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all space-y-2.5 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {formatDateVN(apt.appointmentDate)} ({apt.timeSlot})
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 font-medium">{apt.code}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      apt.status === 'Đã khám xong' || apt.status === 'Hoàn tất khám' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      apt.status === 'Đã xác nhận' || apt.status === 'Đang khám' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {apt.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Chuyên khoa:</span>
                      <strong className="text-slate-900">{apt.department}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Bác sĩ khám:</span>
                      <strong className="text-slate-900">{apt.doctorName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Kênh đặt hẹn:</span>
                      <strong className="text-blue-700">{apt.bookingChannel}</strong>
                    </div>
                  </div>

                  {apt.notes && (
                    <p className="text-slate-600 bg-white p-2 rounded-xl border border-slate-200/60 text-[11px]">
                      <strong>Nội dung:</strong> {apt.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. FEEDBACK & CSAT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'feedback_ticket' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                Đánh Giá Trải Nghiệm & Góp Ý Dịch Vụ
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Bệnh viện luôn trân trọng mọi ý kiến đóng góp từ Quý khách hàng để không ngừng nâng cao chất lượng phục vụ.
              </p>
            </div>

            {ticketSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold text-sm text-emerald-900 mb-1">Đã Gửi Đánh Giá!</strong>
                  <p>{ticketSuccessMsg}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleTicketSubmit} className="space-y-4 text-xs">
              {/* Rating 5 stars */}
              <div>
                <label className="font-bold text-slate-700 block mb-2">Đánh giá mức độ hài lòng của Quý khách:</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setTicketRating(star)}
                      className="p-1 cursor-pointer transition-transform hover:scale-125"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= ticketRating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-2">
                    {ticketRating === 5 ? '5/5 - Rất hài lòng' :
                     ticketRating === 4 ? '4/5 - Hài lòng' :
                     ticketRating === 3 ? '3/5 - Bình thường' :
                     ticketRating === 2 ? '2/5 - Chưa hài lòng' : '1/5 - Cần cải thiện'}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Danh mục góp ý:</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
                >
                  <option value="Góp ý dịch vụ">Góp ý nâng cao chất lượng dịch vụ & tiếp đón</option>
                  <option value="Khiếu nại thái độ">Phản ánh về thái độ phục vụ</option>
                  <option value="Thời gian chờ đợi">Góp ý về thời gian chờ khám</option>
                  <option value="Tư vấn kết quả chuyên môn">Cần hỗ trợ giải đáp thêm thông tin</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Nội dung chi tiết góp ý:</label>
                <textarea
                  value={ticketContent}
                  onChange={(e) => setTicketContent(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm hoặc những điểm Quý khách mong muốn bệnh viện cải thiện tốt hơn..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Send className="w-4 h-4" />
                <span>Gửi Ý Kiến Đóng Góp</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function HeadphonesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

