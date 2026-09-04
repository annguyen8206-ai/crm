import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Building2,
  Stethoscope,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Sparkles,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX
} from 'lucide-react';
import { Appointment, Branch, Doctor, Patient, AppointmentStatus, BranchId } from '../types';
import { formatDateVN } from '../utils/dateUtils';
import { PatientAvatar } from './PatientAvatar';

interface AppointmentsViewProps {
  appointments: Appointment[];
  doctors: Doctor[];
  branches: Branch[];
  patients: Patient[];
  currentBranchId: BranchId;
  onUpdateStatus: (appointmentId: string, newStatus: AppointmentStatus) => void;
  onCheckIn?: (appointmentId: string) => void;
  onTriggerReminder: (appointmentId: string, channel: 'zns' | 'sms') => void;
  onOpenBookModal: () => void;
  onSelectPatient: (patientId: string) => void;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  appointments,
  doctors,
  branches,
  patients,
  currentBranchId,
  onUpdateStatus,
  onCheckIn,
  onTriggerReminder,
  onOpenBookModal,
  onSelectPatient
}) => {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const ddmm = (s: string) => { const p = s.split('-'); return `${p[2]}/${p[1]}`; };
  const _today = new Date();
  const dateYesterday = iso(new Date(_today.getTime() - 86400000));
  const dateToday = iso(_today);
  const dateTomorrow = iso(new Date(_today.getTime() + 86400000));
  const [selectedDate, setSelectedDate] = useState<string>(dateToday);
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const activeBranchFilter = currentBranchId !== 'ALL' ? currentBranchId : selectedBranch;

  const filteredAppointments = appointments.filter(a => {
    const matchesDate = !selectedDate || selectedDate === 'ALL' || a.appointmentDate === selectedDate;
    const matchesBranch = activeBranchFilter === 'ALL' || a.branchId === activeBranchFilter;
    const matchesDoctor = selectedDoctor === 'ALL' || a.doctorId === selectedDoctor;
    const matchesStatus = selectedStatus === 'ALL' || a.status === selectedStatus;
    const matchesSearch = a.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.patientPhone.includes(searchTerm) ||
                          a.code.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesDate && matchesBranch && matchesDoctor && matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'Đã xác nhận':
        return <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">Đã xác nhận</span>;
      case 'Đã tiếp đón':
        return <span className="px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 font-bold text-xs border border-teal-200">Đã tiếp đón / Check-in</span>;
      case 'Đang khám':
        return <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200 animate-pulse">Đang trong phòng khám</span>;
      case 'Hoàn tất khám':
        return <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">Hoàn tất</span>;
      case 'Chờ xác nhận':
        return <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200">Chờ xác nhận</span>;
      case 'No-show (Vắng mặt)':
        return <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">No-show (Vắng mặt)</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-medium text-xs border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Quản Lý Lịch Khám & Triệt Tiêu No-Show
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
              Đa Kênh Tập Trung
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Điều phối lịch hẹn từ Facebook, Zalo OA, Hotline và tự động kích hoạt ZNS/SMS nhắc hẹn
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenBookModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Đặt Lịch Khám</span>
          </button>
        </div>
      </div>

      {/* Date Navigation & Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-xs">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          {/* Date Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1">
              <button
                onClick={() => setSelectedDate(dateYesterday)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedDate === dateYesterday ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hôm qua ({ddmm(dateYesterday)})
              </button>
              <button
                onClick={() => setSelectedDate(dateToday)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedDate === dateToday ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hôm nay ({ddmm(dateToday)})
              </button>
              <button
                onClick={() => setSelectedDate(dateTomorrow)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedDate === dateTomorrow ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ngày mai ({ddmm(dateTomorrow)})
              </button>
              <button
                onClick={() => setSelectedDate('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedDate === 'ALL' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-slate-800 focus:outline-none cursor-pointer font-semibold"
              />
            </div>
          </div>

          {/* Quick Stats on selected date */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
              Tổng số ca: <strong className="text-slate-900 font-bold">{filteredAppointments.length}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
              Đã xác nhận: <strong>{filteredAppointments.filter(a => a.status === 'Đã xác nhận' || a.status === 'Đã tiếp đón').length}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              No-show: <strong>{filteredAppointments.filter(a => a.status === 'No-show (Vắng mặt)').length}</strong>
            </span>
          </div>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên bệnh nhân, SĐT..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent text-slate-700 font-medium focus:outline-none w-full cursor-pointer"
            >
              <option value="ALL" className="bg-white">Tất cả Cơ sở</option>
              {branches.map(b => (
                <option key={b.id} value={b.id} className="bg-white">{b.shortName}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="bg-transparent text-slate-700 font-medium focus:outline-none w-full cursor-pointer"
            >
              <option value="ALL" className="bg-white">Tất cả Bác sĩ</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id} className="bg-white">{[d.title, d.name].filter(Boolean).join(' ')}{(d.department || d.specialty) ? ` — ${d.department || d.specialty}` : ''}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-amber-600" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-slate-700 font-medium focus:outline-none w-full cursor-pointer"
            >
              <option value="ALL" className="bg-white">Tất cả Trạng thái</option>
              <option value="Chờ xác nhận" className="bg-white">Chờ xác nhận</option>
              <option value="Đã xác nhận" className="bg-white">Đã xác nhận</option>
              <option value="Đã tiếp đón" className="bg-white">Đã tiếp đón</option>
              <option value="Đang khám" className="bg-white">Đang khám</option>
              <option value="Hoàn tất khám" className="bg-white">Hoàn tất khám</option>
              <option value="No-show (Vắng mặt)" className="bg-white">No-show (Vắng mặt)</option>
            </select>
          </div>
        </div>

      </div>

      {/* Appointments List View */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3.5 px-4">Khung Giờ & Mã Lịch</th>
                <th className="py-3.5 px-4">Bệnh Nhân & Liên Hệ</th>
                <th className="py-3.5 px-4">Chuyên Khoa & Bác Sĩ</th>
                <th className="py-3.5 px-4">Kênh Đặt & Loại Khám</th>
                <th className="py-3.5 px-4">Trạng Thái</th>
                <th className="py-3.5 px-4">Zalo ZNS / SMS Tự Động</th>
                <th className="py-3.5 px-4 text-right">Điều Phối Nhanh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Không có lịch hẹn nào trong {formatDateVN(selectedDate, true)} phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => {
                  const branch = branches.find(b => b.id === apt.branchId);
                  return (
                    <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Time slot & Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="font-bold text-slate-900 text-sm">{apt.timeSlot}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{apt.code}</span>
                      </td>

                      {/* Patient info */}
                      <td className="py-3.5 px-4">
                        {(() => {
                          const patientObj = patients.find(p => p.id === apt.patientId || p.phone === apt.patientPhone);
                          return (
                            <div className="flex items-center gap-2.5">
                              <PatientAvatar
                                src={patientObj?.avatar}
                                name={apt.patientName}
                                gender={apt.gender}
                                className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200 shadow-2xs shrink-0"
                              />
                              <div>
                                <div 
                                  onClick={() => onSelectPatient(apt.patientId)}
                                  className="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer flex items-center gap-1.5"
                                >
                                  <span>{apt.patientName}</span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">360°</span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                  <Phone className="w-3 h-3 text-blue-600" />
                                  <span>{apt.patientPhone}</span>
                                  <span>• {apt.age}t ({apt.gender})</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Department & Doctor */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-blue-700 block">{apt.department}</span>
                        <span className="text-slate-800 font-medium text-[11px] block">{apt.doctorName}</span>
                        <span className="text-slate-400 text-[10px]">{branch?.shortName}</span>
                      </td>

                      {/* Channel & Type */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold block w-fit border border-slate-200">
                          {apt.bookingChannel}
                        </span>
                        <span className="text-slate-500 text-[10px] block mt-1">{apt.type}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(apt.status)}
                      </td>

                      {/* Reminder Automation Status */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className={`w-2 h-2 rounded-full ${apt.reminderStatus.znsSent ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <span className={apt.reminderStatus.znsSent ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                              Zalo ZNS {apt.reminderStatus.znsSent ? 'Đã gửi' : 'Chưa gửi'}
                            </span>
                            {!apt.reminderStatus.znsSent && (
                              <button
                                onClick={() => onTriggerReminder(apt.id, 'zns')}
                                className="px-2 py-0.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 rounded text-[10px] font-bold cursor-pointer transition-colors"
                                title="Gửi ZNS nhắc hẹn ngay"
                              >
                                Gửi ZNS
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className={`w-2 h-2 rounded-full ${apt.reminderStatus.smsSent ? 'bg-sky-500' : 'bg-slate-300'}`} />
                            <span className={apt.reminderStatus.smsSent ? 'text-sky-700 font-bold' : 'text-slate-400'}>
                              SMS Brandname {apt.reminderStatus.smsSent ? 'Đã gửi' : 'Chưa gửi'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {apt.status === 'Chờ xác nhận' && (
                            <button
                              onClick={() => onUpdateStatus(apt.id, 'Đã xác nhận')}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                            >
                              Xác nhận
                            </button>
                          )}
                          {(apt.status === 'Đã xác nhận' || apt.status === 'Chờ xác nhận') && (
                            <button
                              onClick={() => (onCheckIn ? onCheckIn(apt.id) : onUpdateStatus(apt.id, 'Đã tiếp đón'))}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                            >
                              Tiếp đón & Cấp số
                            </button>
                          )}
                          {apt.status === 'Đã tiếp đón' && (
                            <button
                              onClick={() => onUpdateStatus(apt.id, 'Đang khám')}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                            >
                              Vào khám
                            </button>
                          )}
                          {apt.status === 'Đang khám' && (
                            <button
                              onClick={() => onUpdateStatus(apt.id, 'Hoàn tất khám')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                            >
                              Hoàn tất
                            </button>
                          )}
                          {apt.status !== 'Hoàn tất khám' && apt.status !== 'No-show (Vắng mặt)' && (
                            <button
                              onClick={() => onUpdateStatus(apt.id, 'No-show (Vắng mặt)')}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                              title="Đánh dấu Vắng mặt (No-show)"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

};
