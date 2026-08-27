import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Building2,
  Stethoscope,
  X,
  Plus,
  Send,
  Sparkles,
  Check
} from 'lucide-react';
import { Patient, Doctor, Branch, Appointment, BranchId } from '../types';
import { formatDateVN } from '../utils/dateUtils';

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  doctors: Doctor[];
  branches: Branch[];
  currentBranchId: BranchId;
  initialPatientId?: string | null;
  initialDepartment?: string | null;
  onSaveAppointment: (appointment: Omit<Appointment, 'id' | 'code'>) => void;
}

export const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({
  isOpen,
  onClose,
  patients,
  doctors,
  branches,
  currentBranchId,
  initialPatientId,
  initialDepartment,
  onSaveAppointment
}) => {
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [patientId, setPatientId] = useState(patients[0]?.id || '');
  const [patientName, setPatientName] = useState(patients[0]?.name || '');
  const [patientPhone, setPatientPhone] = useState(patients[0]?.phone || '');
  const [patientAge, setPatientAge] = useState(patients[0]?.age || 30);
  const [patientGender, setPatientGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [branchId, setBranchId] = useState<BranchId>(currentBranchId !== 'ALL' ? currentBranchId : (branches[0]?.id || 'hn-central'));
  const [department, setDepartment] = useState('Tim Mạch - Can Thiệp');
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || '');
  const [appointmentDate, setAppointmentDate] = useState('2026-08-19');
  const [timeSlot, setTimeSlot] = useState('09:00 - 09:30');
  const [bookingChannel, setBookingChannel] = useState<Appointment['bookingChannel']>('Zalo OA');
  const [type, setType] = useState<Appointment['type']>('Tái khám định kỳ');
  const [notes, setNotes] = useState('Bệnh nhân đến khám theo lịch hẹn.');

  useEffect(() => {
    if (!isOpen) return;

    if (initialPatientId) {
      const targetPatient = patients.find(p => p.id === initialPatientId);
      if (targetPatient) {
        setIsNewPatient(false);
        setPatientId(targetPatient.id);
        setPatientName(targetPatient.name);
        setPatientPhone(targetPatient.phone);
        setPatientAge(targetPatient.age);
        setPatientGender(targetPatient.gender === 'Nữ' ? 'Nữ' : 'Nam');
        if (targetPatient.primaryBranchId && branches.some(b => b.id === targetPatient.primaryBranchId)) {
          setBranchId(targetPatient.primaryBranchId);
        }
      }
    } else {
      if (patients[0] && !patientId) {
        setIsNewPatient(false);
        setPatientId(patients[0].id);
        setPatientName(patients[0].name);
        setPatientPhone(patients[0].phone);
        setPatientAge(patients[0].age);
        setPatientGender(patients[0].gender === 'Nữ' ? 'Nữ' : 'Nam');
      }
    }

    if (initialDepartment) {
      setDepartment(initialDepartment);
    }
  }, [isOpen, initialPatientId, initialDepartment, patients, branches]);

  if (!isOpen) return null;

  const handlePatientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId === 'NEW_PATIENT') {
      setIsNewPatient(true);
      setPatientId(`P-${Date.now()}`);
      setPatientName('');
      setPatientPhone('');
      setPatientAge(30);
      setPatientGender('Nữ');
      return;
    }
    setIsNewPatient(false);
    setPatientId(selectedId);
    const p = patients.find(pat => pat.id === selectedId);
    if (p) {
      setPatientName(p.name);
      setPatientPhone(p.phone);
      setPatientAge(p.age);
      setPatientGender(p.gender === 'Nữ' ? 'Nữ' : 'Nam');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      alert('Vui lòng nhập Họ và tên bệnh nhân!');
      return;
    }
    if (!patientPhone.trim()) {
      alert('Vui lòng nhập Số điện thoại bệnh nhân!');
      return;
    }

    const doc = doctors.find(d => d.id === doctorId);
    onSaveAppointment({
      patientId: isNewPatient ? `P-${Date.now()}` : (patientId || `P-${Date.now()}`),
      patientName: patientName.trim(),
      patientPhone: patientPhone.trim(),
      age: Number(patientAge) || 30,
      gender: patientGender,
      branchId,
      department,
      doctorId,
      doctorName: doc ? doc.name : 'Bác sĩ chuyên khoa phụ trách',
      appointmentDate,
      timeSlot,
      status: 'Đã xác nhận',
      bookingChannel,
      type,
      notes: notes.trim(),
      reminderStatus: {
        znsSent: true,
        smsSent: true,
        lastReminderAt: 'Vừa gửi tức thì qua Zalo ZNS'
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col text-slate-800 max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Đặt Lịch Hẹn Khám Bệnh Đa Kênh</h3>
              <p className="text-[11px] text-slate-500">Tự động kích hoạt quy trình nhắc hẹn CSKH qua Zalo ZNS / SMS</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Patient selection / New */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-slate-900 font-bold flex items-center gap-1.5 text-xs text-blue-700">
                <User className="w-3.5 h-3.5" />
                1. Thông Tin Bệnh Nhân
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewPatient(false);
                    if (patients[0]) {
                      setPatientId(patients[0].id);
                      setPatientName(patients[0].name);
                      setPatientPhone(patients[0].phone);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors cursor-pointer ${!isNewPatient ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                >
                  Chọn có sẵn
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewPatient(true);
                    setPatientName('');
                    setPatientPhone('');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors cursor-pointer ${isNewPatient ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                >
                  + Khách mới
                </button>
              </div>
            </div>

            {!isNewPatient ? (
              <div>
                <label className="text-slate-600 font-medium block mb-1">Tìm & Chọn Bệnh Nhân Đã Có Hồ Sơ:</label>
                <select
                  value={patientId}
                  onChange={handlePatientSelect}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.pid}) - {p.phone}</option>
                  ))}
                  <option value="NEW_PATIENT">+ Thêm Bệnh Nhân Mới Chưa Có Trong Danh Sách</option>
                </select>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Họ và tên bệnh nhân <span className="text-rose-600">*</span>:
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  placeholder="VD: Trần Hải Yến"
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Số điện thoại <span className="text-rose-600">*</span>:
                </label>
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={e => setPatientPhone(e.target.value)}
                  placeholder="VD: 0988 776 655"
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Giới tính:</label>
                <select
                  value={patientGender}
                  onChange={e => setPatientGender(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="Nữ">Nữ</option>
                  <option value="Nam">Nam</option>
                </select>
              </div>
              <div>
                <label className="text-slate-700 font-bold block mb-1">Tuổi:</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={patientAge}
                  onChange={e => setPatientAge(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Clinical & Appointment Details */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
            <label className="text-slate-900 font-bold flex items-center gap-1.5 text-xs text-blue-700">
              <Stethoscope className="w-3.5 h-3.5" />
              2. Chi Tiết Lịch Hẹn & Chuyên Khoa
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Cơ sở khám:</label>
                <select
                  value={branchId}
                  onChange={e => setBranchId(e.target.value as BranchId)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Chuyên khoa:</label>
                <select
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="Tim Mạch - Can Thiệp">Tim Mạch - Can Thiệp</option>
                  <option value="Nội Tiết & Đái Tháo Đường">Nội Tiết & Đái Tháo Đường</option>
                  <option value="Sản Phụ Khoa & Hiếm Muộn">Sản Phụ Khoa & Hiếm Muộn</option>
                  <option value="Da Liễu & Thẩm Mỹ Công Nghệ Cao">Da Liễu & Thẩm Mỹ</option>
                  <option value="Mắt & Phẫu Thuật Phaco">Mắt & Phẫu Thuật Phaco</option>
                  <option value="Nhi Khoa & Tiêm Chủng">Nhi Khoa & Tiêm Chủng</option>
                  <option value="Khám Sức Khỏe Tổng Quát">Khám Tổng Quát</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Bác sĩ phụ trách:</label>
                <select
                  value={doctorId}
                  onChange={e => setDoctorId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Kênh đặt hẹn:</label>
                <select
                  value={bookingChannel}
                  onChange={e => setBookingChannel(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="Zalo OA">Zalo OA</option>
                  <option value="Facebook Fanpage">Facebook Fanpage</option>
                  <option value="Tổng đài Hotline">Tổng đài Hotline</option>
                  <option value="Website Portal">Website Portal</option>
                  <option value="Khách vãng lai">Trực tiếp tại quầy</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-bold flex items-center justify-between mb-1">
                  <span>Ngày khám:</span>
                  <span className="text-[11px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {formatDateVN(appointmentDate)}
                  </span>
                </label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={e => setAppointmentDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-slate-700 font-bold block mb-1">Khung giờ:</label>
                <select
                  value={timeSlot}
                  onChange={e => setTimeSlot(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="07:30 - 08:00">07:30 - 08:00</option>
                  <option value="08:00 - 08:30">08:00 - 08:30</option>
                  <option value="08:30 - 09:00">08:30 - 09:00</option>
                  <option value="09:00 - 09:30">09:00 - 09:30</option>
                  <option value="09:30 - 10:00">09:30 - 10:00</option>
                  <option value="10:00 - 10:30">10:00 - 10:30</option>
                  <option value="14:00 - 14:30">14:00 - 14:30</option>
                  <option value="15:00 - 15:30">15:00 - 15:30</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-700 font-bold block mb-1">Ghi chú & Lý do khám:</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Nhập triệu chứng lâm sàng, yêu cầu bác sĩ hoặc chuẩn bị trước khi khám..."
                rows={2}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer transition-colors"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Xác Nhận & Lưu Lịch Khám</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
