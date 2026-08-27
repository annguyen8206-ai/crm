import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Send,
  Plus,
  Filter,
  Search,
  User,
  Stethoscope,
  Sparkles,
  TrendingUp,
  RotateCcw,
  Check,
  X
} from 'lucide-react';
import { AutoRecallTask, Patient, Appointment } from '../types';
import { mockAutoRecalls } from '../data/mockData';
import { ExportCsvButton } from './ExportCsvButton';
import { ZnsPostVisitCareModal } from './ZnsPostVisitCareModal';
import { VoipSoftphoneModal } from './VoipSoftphoneModal';

interface AutoRecallManagementViewProps {
  patients?: Patient[];
  onSelectPatient?: (patientId: string) => void;
  onBookAppointmentFromRecall?: (recall: AutoRecallTask) => void;
}

export const AutoRecallManagementView: React.FC<AutoRecallManagementViewProps> = ({
  patients = [],
  onSelectPatient,
  onBookAppointmentFromRecall
}) => {
  const [recallList, setRecallList] = useState<AutoRecallTask[]>(mockAutoRecalls);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [znsModalTarget, setZnsModalTarget] = useState<AutoRecallTask | null>(null);
  const [voipModalTarget, setVoipModalTarget] = useState<AutoRecallTask | null>(null);
  const [isNewRecallModalOpen, setIsNewRecallModalOpen] = useState(false);

  // New Recall form
  const [newPatientId, setNewPatientId] = useState(patients[0]?.id || '');
  const [newCategory, setNewCategory] = useState<AutoRecallTask['conditionCategory']>('Bệnh Mạn Tính (Tim mạch / Tiểu đường)');
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [newRecallReason, setNewRecallReason] = useState('');
  const [newIntervalDays, setNewIntervalDays] = useState(30);
  const [newDoctorNotes, setNewDoctorNotes] = useState('');
  const [newDoctor, setNewDoctor] = useState('PGS. TS. BS Trần Minh Đức');
  const [newStaff, setNewStaff] = useState('ĐD. Lê Thị Diệu');

  // Success notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered List
  const filteredRecalls = recallList.filter(item => {
    const matchesSearch = item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.patientPhone.includes(searchTerm) ||
                          item.primaryDiagnosis.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || item.conditionCategory === categoryFilter;
    const matchesStat = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesCat && matchesStat;
  });

  // Analytics Metrics
  const totalRecalls = recallList.length;
  const dueTodayOrOverdue = recallList.filter(r => r.daysOverdue >= 0 && r.status === 'Đến hạn - Chờ liên hệ').length;
  const znsSentCount = recallList.filter(r => r.status === 'Đã gửi ZNS nhắc hẹn').length;
  const convertedCount = recallList.filter(r => r.status === 'Đã chuyển thành Lịch Hẹn' || r.status === 'Đã gọi - Đồng ý đặt lịch').length;
  const conversionRate = Math.round((convertedCount / (totalRecalls || 1)) * 100);

  const handleCreateNewRecall = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find(p => p.id === newPatientId);
    if (!newDiagnosis.trim() || !newRecallReason.trim()) {
      alert('Vui lòng nhập đầy đủ chẩn đoán và lý do nhắc tái khám!');
      return;
    }

    const today = new Date();
    const dueDateObj = new Date(today.getTime() + newIntervalDays * 24 * 60 * 60 * 1000);
    const dueDateStr = dueDateObj.toISOString().slice(0, 10);

    const newTask: AutoRecallTask = {
      id: `recall-${Date.now()}`,
      patientId: pat?.id || `pat-${Date.now()}`,
      patientName: pat?.name || 'Bệnh Nhân',
      patientPhone: pat?.phone || '0901234567',
      lastVisitDate: today.toISOString().slice(0, 10),
      dueDate: dueDateStr,
      daysOverdue: -newIntervalDays,
      conditionCategory: newCategory,
      primaryDiagnosis: newDiagnosis.trim(),
      recallReason: newRecallReason.trim(),
      recallIntervalDays: newIntervalDays,
      doctorRecommendation: newDoctorNotes.trim() || 'BS dặn: Bệnh nhân tái khám đúng hạn để kiểm tra đáp ứng điều trị.',
      assignedDoctor: newDoctor,
      assignedStaff: newStaff,
      status: 'Đến hạn - Chờ liên hệ'
    };

    setRecallList(prev => [newTask, ...prev]);
    setIsNewRecallModalOpen(false);
    showToast(`Đã thiết lập lịch nhắc tái khám tự động sau ${newIntervalDays} ngày cho ${newTask.patientName}!`);
  };

  const handleConvertStatus = (recallId: string, newStatus: AutoRecallTask['status']) => {
    setRecallList(prev => prev.map(r => {
      if (r.id === recallId) {
        return { ...r, status: newStatus };
      }
      return r;
    }));
    showToast(`Đã cập nhật trạng thái lịch nhắc sang "${newStatus}"!`);
  };

  return (
    <div className="space-y-4">
      {/* Compact Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Quản Lý Lịch Nhắc Tái Khám Tự Động (Auto-Recall)
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[11px] font-bold border border-purple-200">
              Chu Kỳ Bệnh Lý
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tự động kích hoạt task CSKH & tin ZNS nhắc hẹn theo phác đồ y khoa
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportCsvButton
            type="recalls"
            data={filteredRecalls}
            filename={`VitHospital_Lich_Nhac_Tai_Kham_${new Date().toISOString().slice(0, 10)}.csv`}
            label="Xuất Excel Lịch Tái Khám"
          />
          <button
            onClick={() => setIsNewRecallModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Lịch Nhắc Tái Khám Mới</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Đến Hạn Cần Liên Hệ</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {dueTodayOrOverdue} <span className="text-xs font-normal text-slate-500">bệnh nhân</span>
          </div>
          <span className="text-[11px] text-amber-700 font-semibold block mt-1">Cần gọi điện hoặc gửi ZNS hôm nay</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Đã Gửi ZNS Tự Động</span>
            <Send className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-700 mt-2 font-mono">
            {znsSentCount} <span className="text-xs font-normal text-slate-500">tin nhắn</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Tỷ lệ mở xem đạt 96.8%</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Tái Khám Thành Công</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2 font-mono">
            {convertedCount} <span className="text-xs font-normal text-slate-500">ca hẹn</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Đã chốt lịch hoặc tái khám</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Tỷ Lệ Giữ Chân (Recall Rate)</span>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-2 font-mono">
            {conversionRate}%
          </div>
          <span className="text-[11px] text-emerald-600 font-bold block mt-1">Tăng +22% so với nhắc thủ công</span>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo tên BN, SĐT, bệnh lý..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:bg-white cursor-pointer font-medium"
          >
            <option value="ALL">Tất cả Nhóm Bệnh Lý</option>
            <option value="Bệnh Mạn Tính (Tim mạch / Tiểu đường)">Bệnh Mạn Tính (30 ngày)</option>
            <option value="Da Liễu & Thẩm Mỹ">Da Liễu & Thẩm Mỹ (14 ngày)</option>
            <option value="Sản Phụ Khoa & Tiền Sản">Sản Phụ Khoa (28 ngày)</option>
            <option value="Nha Khoa & Răng Hàm Mặt">Nha Khoa (6 tháng)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:bg-white cursor-pointer font-medium"
          >
            <option value="ALL">Tất cả Trạng Thái</option>
            <option value="Đến hạn - Chờ liên hệ">Đến hạn - Chờ liên hệ</option>
            <option value="Đã gửi ZNS nhắc hẹn">Đã gửi ZNS nhắc hẹn</option>
            <option value="Đã gọi - Đồng ý đặt lịch">Đã gọi - Đồng ý đặt lịch</option>
            <option value="Đã chuyển thành Lịch Hẹn">Đã chuyển thành Lịch Hẹn</option>
          </select>
        </div>
      </div>

      {/* Recalls Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3.5 px-4">Bệnh Nhân & Liên Hệ</th>
                <th className="py-3.5 px-4">Nhóm Bệnh & Chẩn Đoán</th>
                <th className="py-3.5 px-4">Chu Kỳ & Ngày Đến Hạn</th>
                <th className="py-3.5 px-4">Chỉ Dẫn Của Bác Sĩ</th>
                <th className="py-3.5 px-4">Trạng Thái Xử Lý</th>
                <th className="py-3.5 px-4 text-right">Thao Tác CSKH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecalls.map((recall) => (
                <tr key={recall.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 align-top">
                    <div>
                      <span
                        onClick={() => onSelectPatient && onSelectPatient(recall.patientId)}
                        className="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer block"
                      >
                        {recall.patientName}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px] block mt-0.5">{recall.patientPhone}</span>
                      <span className="text-slate-400 text-[10px] block">Khám gần nhất: {recall.lastVisitDate}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 align-top max-w-[220px]">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 inline-block mb-1">
                      {recall.conditionCategory}
                    </span>
                    <strong className="text-slate-800 block text-xs leading-snug">{recall.primaryDiagnosis}</strong>
                    <span className="text-slate-500 text-[11px] mt-0.5 block line-clamp-2 italic">{recall.recallReason}</span>
                  </td>

                  <td className="py-3.5 px-4 align-top">
                    <div className="space-y-1">
                      <span className="font-mono text-xs font-bold text-slate-900 block">
                        📅 {recall.dueDate}
                      </span>
                      <span className="text-slate-500 text-[11px] block">
                        Chu kỳ: <strong>{recall.recallIntervalDays} ngày</strong>
                      </span>
                      {recall.daysOverdue > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-block">
                          ⚠️ Quá hạn {recall.daysOverdue} ngày
                        </span>
                      ) : recall.daysOverdue === 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-block">
                          🔔 Đến hạn hôm nay
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px] block">
                          Còn {Math.abs(recall.daysOverdue)} ngày nữa
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 align-top max-w-[260px]">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] text-slate-700 leading-relaxed space-y-1">
                      <div className="text-blue-700 font-bold flex items-center gap-1">
                        <Stethoscope className="w-3 h-3" />
                        <span>{recall.assignedDoctor}</span>
                      </div>
                      <p className="italic">"{recall.doctorRecommendation}"</p>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 align-top">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-block ${
                      recall.status === 'Đã chuyển thành Lịch Hẹn' || recall.status === 'Đã gọi - Đồng ý đặt lịch'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : recall.status === 'Đã gửi ZNS nhắc hẹn'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {recall.status}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">CSKH: {recall.assignedStaff}</span>
                  </td>

                  <td className="py-3.5 px-4 text-right align-top">
                    <div className="flex flex-col items-end gap-1.5">
                      {/* Click-to-call Button */}
                      <button
                        onClick={() => setVoipModalTarget(recall)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs cursor-pointer transition-colors"
                        title="Gọi điện trực tiếp qua tổng đài ảo VoIP WebRTC"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Gọi Ngay</span>
                      </button>

                      {/* ZNS Send Button */}
                      <button
                        onClick={() => setZnsModalTarget(recall)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                        title="Gửi tin nhắn Zalo ZNS nhắc lịch chính thức"
                      >
                        <Send className="w-3 h-3 text-blue-600" />
                        <span>Gửi ZNS Nhắc Hẹn</span>
                      </button>

                      {/* Convert to appointment */}
                      {recall.status !== 'Đã chuyển thành Lịch Hẹn' && (
                        <button
                          onClick={() => {
                            if (onBookAppointmentFromRecall) {
                              onBookAppointmentFromRecall(recall);
                            }
                            handleConvertStatus(recall.id, 'Đã chuyển thành Lịch Hẹn');
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 text-slate-600 hover:text-purple-700 text-[10px] font-semibold cursor-pointer"
                        >
                          <Calendar className="w-3 h-3 text-purple-600" />
                          <span>Tạo Lịch Khám</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ZNS Modal Trigger */}
      {znsModalTarget && (
        <ZnsPostVisitCareModal
          isOpen={!!znsModalTarget}
          onClose={() => setZnsModalTarget(null)}
          patientId={znsModalTarget.patientId}
          patientName={znsModalTarget.patientName}
          patientPhone={znsModalTarget.patientPhone}
          diagnosis={znsModalTarget.primaryDiagnosis}
          doctorCareNotes={znsModalTarget.doctorRecommendation}
          templateType="ZNS_AUTO_RECALL"
          onMessageSent={() => {
            handleConvertStatus(znsModalTarget.id, 'Đã gửi ZNS nhắc hẹn');
          }}
        />
      )}

      {/* VoIP Softphone Modal Trigger */}
      {voipModalTarget && (
        <VoipSoftphoneModal
          isOpen={!!voipModalTarget}
          onClose={() => setVoipModalTarget(null)}
          patientId={voipModalTarget.patientId}
          patientName={voipModalTarget.patientName}
          patientPhone={voipModalTarget.patientPhone}
          diagnosis={voipModalTarget.primaryDiagnosis}
          doctorCareNotes={voipModalTarget.doctorRecommendation}
          agentStaffName="ĐD. Lê Thị Diệu"
          agentExtension="108"
          onCallCompleted={(callData) => {
            if (callData.callOutcome === 'Hẹn tái khám') {
              handleConvertStatus(voipModalTarget.id, 'Đã gọi - Đồng ý đặt lịch');
            }
          }}
        />
      )}

      {/* Modal: Create New Auto-Recall Task */}
      {isNewRecallModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Thiết Lập Lịch Nhắc Tái Khám Tự Động Mới</h3>
              </div>
              <button
                onClick={() => setIsNewRecallModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewRecall} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chọn Bệnh Nhân</label>
                <select
                  value={newPatientId}
                  onChange={(e) => setNewPatientId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.phone} ({p.gender}, {p.age} tuổi)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nhóm Bệnh Lý Mục Tiêu</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white"
                  >
                    <option value="Bệnh Mạn Tính (Tim mạch / Tiểu đường)">Bệnh Mạn Tính (Tim mạch / Tiểu đường)</option>
                    <option value="Da Liễu & Thẩm Mỹ">Da Liễu & Thẩm Mỹ</option>
                    <option value="Sản Phụ Khoa & Tiền Sản">Sản Phụ Khoa & Tiền Sản</option>
                    <option value="Nha Khoa & Răng Hàm Mặt">Nha Khoa & Răng Hàm Mặt</option>
                    <option value="Khám Tổng Quát Định Kỳ">Khám Tổng Quát Định Kỳ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chu Kỳ Nhắc Tái Khám</label>
                  <select
                    value={newIntervalDays}
                    onChange={(e) => setNewIntervalDays(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white"
                  >
                    <option value={7}>Sau 7 ngày (Hậu phẫu / Nhi khoa)</option>
                    <option value={14}>Sau 14 ngày (Liệu trình da liễu / Cột sống)</option>
                    <option value={28}>Sau 28 ngày (Thai sản định kỳ)</option>
                    <option value={30}>Sau 30 ngày (Định kỳ huyết áp / tiểu đường)</option>
                    <option value={90}>Sau 90 ngày (3 tháng / Xét nghiệm HbA1c)</option>
                    <option value={180}>Sau 180 ngày (6 tháng / Răng hàm mặt)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chẩn Đoán Bệnh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newDiagnosis}
                  onChange={(e) => setNewDiagnosis(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-semibold"
                  placeholder="VD: Tăng huyết áp độ 2 / Liệu trình Laser Pico trị nám"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nội Dung & Lý Do Nhắc Tái Khám <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={newRecallReason}
                  onChange={(e) => setNewRecallReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white placeholder-slate-400 font-sans"
                  placeholder="VD: Xét nghiệm mỡ máu lại sau 1 tháng dùng thuốc và đo điện tim ECG..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Lời Dặn Dò Lâm Sàng Của Bác Sĩ
                </label>
                <textarea
                  rows={2}
                  value={newDoctorNotes}
                  onChange={(e) => setNewDoctorNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white placeholder-slate-400 font-sans"
                  placeholder="VD: Dặn bệnh nhân nhịn ăn sáng trước khi làm xét nghiệm mỡ máu..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bác Sĩ Phụ Trách</label>
                  <input
                    type="text"
                    value={newDoctor}
                    onChange={(e) => setNewDoctor(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nhân Sự CSKH</label>
                  <input
                    type="text"
                    value={newStaff}
                    onChange={(e) => setNewStaff(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewRecallModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Lưu & Kích Hoạt Lịch Nhắc Tự Động
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
