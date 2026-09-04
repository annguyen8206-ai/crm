import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Phone,
  Calendar,
  Sparkles,
  GitMerge,
  Shield,
  Activity,
  FileText,
  Clock,
  ChevronRight,
  UserCheck,
  Tag,
  Building2,
  SlidersHorizontal,
  HeartHandshake
} from 'lucide-react';
import { Patient, Branch, BranchId, MembershipTier } from '../types';
import { formatDateVN } from '../utils/dateUtils';
import { PatientAvatar } from './PatientAvatar';

interface Patient360ViewProps {
  patients: Patient[];
  branches: Branch[];
  currentBranchId: BranchId;
  onSelectPatient: (patientId: string) => void;
  onAddPatient: () => void;
  onOpenAiAssistant: () => void;
  onOpenDedupe?: () => void;
}

export const Patient360View: React.FC<Patient360ViewProps> = ({
  patients = [],
  branches = [],
  currentBranchId = 'ALL',
  onSelectPatient,
  onAddPatient,
  onOpenAiAssistant,
  onOpenDedupe
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');

  // Extract unique tags
  const allTags = Array.from(new Set((patients || []).flatMap(p => p?.tags || [])));

  const activeBranchFilter = currentBranchId !== 'ALL' ? currentBranchId : selectedBranch;

  const filteredPatients = (patients || []).filter(patient => {
    if (!patient) return false;
    const matchesSearch =
      (patient.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.phone || '').includes(searchTerm) ||
      (patient.pid || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.address || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTag = selectedTag === 'ALL' || (patient.tags || []).includes(selectedTag);
    const matchesTier = selectedTier === 'ALL' || patient.membership?.tier === selectedTier;
    const matchesBranch = activeBranchFilter === 'ALL' || patient.primaryBranchId === activeBranchFilter;

    return matchesSearch && matchesTag && matchesTier && matchesBranch;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Compact Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Hồ Sơ Khách Hàng (360°)
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
              Customer Data Hub
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu tập trung, phân nhóm hành vi, lịch sử tương tác và chân dung sức khỏe
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenDedupe && (
            <button
              onClick={onOpenDedupe}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              title="Phát hiện & gộp hồ sơ trùng lặp"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Trùng lặp</span>
            </button>
          )}
          <button
            onClick={onOpenAiAssistant}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI CSKH</span>
          </button>
          <button
            onClick={onAddPatient}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Khách Hàng</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search text */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Tên, SĐT, Mã PID..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Tag filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
            <Tag className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-transparent text-slate-700 focus:outline-none w-full cursor-pointer font-medium"
            >
              <option value="ALL">Tất cả Phân nhóm / Thẻ Tag</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          {/* Membership tier filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-transparent text-slate-700 focus:outline-none w-full cursor-pointer font-medium"
            >
              <option value="ALL">Tất cả Hạng Hội viên</option>
              <option value="Diamond VIP">Diamond VIP</option>
              <option value="Platinum">Platinum</option>
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
              <option value="Standard">Standard</option>
            </select>
          </div>

          {/* Branch filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5 text-teal-600" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent text-slate-700 focus:outline-none w-full cursor-pointer font-medium"
            >
              <option value="ALL">Tất cả Cơ sở Khám</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.shortName}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Quick Tag Pills */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-1">
          <span className="text-[11px] text-slate-500 font-medium">Lọc nhanh:</span>
          {['ALL', 'VIP Diamond', 'Mãn tính Tim mạch - Nội tiết', 'B2B FPT Corp', 'Thẩm mỹ Da Liễu', 'Gói Thai Sản Trọn Gói'].map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap ${
                selectedTag === tag
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {tag === 'ALL' ? 'Tất cả' : tag}
            </button>
          ))}
        </div>
      </div>

      {/* Patient Table Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3.5 px-4">Bệnh Nhân & Định Danh PID</th>
                <th className="py-3.5 px-4">Liên Hệ & Địa Chỉ</th>
                <th className="py-3.5 px-4">Hạng Hội Viên</th>
                <th className="py-3.5 px-4">Bệnh Lý Nền & Dị Ứng</th>
                <th className="py-3.5 px-4">Kênh Tiếp Cận</th>
                <th className="py-3.5 px-4">Lần Khám Gần Nhất</th>
                <th className="py-3.5 px-4 text-right">Góc Nhìn 360°</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Không tìm thấy bệnh nhân phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => {
                  const branch = branches.find(b => b.id === p.primaryBranchId);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectPatient(p.id)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Name & Avatar & PID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <PatientAvatar
                            src={p.avatar}
                            name={p.name}
                            gender={p.gender}
                            className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 group-hover:ring-blue-500 transition-all shadow-2xs"
                          />
                          <div>
                            <div className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                              {p.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-slate-500 font-mono font-medium">{p.pid}</span>
                              <span className="text-[11px] text-slate-400">• {p.age} tuổi ({p.gender})</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone & Address */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                          <Phone className="w-3.5 h-3.5 text-blue-600" />
                          <span>{p.phone}</span>
                        </div>
                        <p className="text-slate-500 text-[11px] truncate max-w-[180px] mt-0.5" title={p.address}>
                          {p.address}
                        </p>
                      </td>

                      {/* Membership Tier */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          p.membership.tier === 'Diamond VIP' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          p.membership.tier === 'Platinum' ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' :
                          p.membership.tier === 'Gold' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          ★ {p.membership.tier}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium block mt-1">
                          {p.membership.points} điểm tích lũy
                        </span>
                      </td>

                      {/* Health conditions & allergies */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {p.underlyingConditions.slice(0, 1).map((cond, i) => (
                            <span key={i} className="text-[11px] font-medium text-slate-700 block truncate max-w-[200px]">
                              {cond}
                            </span>
                          ))}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {p.tags.slice(0, 2).map((t, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-600 border border-slate-200">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Lead Source / Kênh Tiếp Cận */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            p.source?.includes('B2B') ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                            p.source?.includes('Facebook') || p.source?.includes('Ads') ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            p.source?.includes('Zalo') ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                            p.source?.includes('Bác sĩ') || p.source?.includes('giới thiệu') || p.source?.includes('Referral') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            p.source?.includes('Hotline') ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {p.source || 'Website'}
                          </span>
                          <span className="text-slate-400 text-[10px] block font-medium">
                            Kênh: {p.marketingChannel || (p.source?.includes('B2B') ? 'Hợp đồng B2B' : 'Digital Inbound')}
                          </span>
                        </div>
                      </td>

                      {/* Last visit */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-800 font-bold block">{p.lastVisitDate ? formatDateVN(p.lastVisitDate) : 'Chưa khám'}</span>
                        <span className="text-slate-500 text-[10px] font-medium">{branch?.shortName}</span>
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`btn-view-profile-${p.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPatient(p.id);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Hồ Sơ 360°</span>
                          </button>
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
