import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Shield,
  CheckCircle2,
  Lock,
  Unlock,
  KeyRound,
  X,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Eye,
  EyeOff,
  Edit2,
  Download,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { CurrentUser, UserRole, BranchId } from '../types';
import { INITIAL_BRANCHES } from '../data/mockData';
import { ROLE_CONFIGS } from '../utils/rbac';

// Helper to get monogram initials from staff name
function getStaffInitials(name: string): string {
  if (!name) return 'NV';
  const cleanName = name.replace(/^(BS\.|PGS\.|TS\.|ThS\.|CKII|CKI|Kỹ sư|KS\.)\s*/gi, '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NV';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: CurrentUser[];
  onAddStaff: (newStaff: CurrentUser) => void;
  onUpdateStaff: (updatedStaff: CurrentUser) => void;
  onDeleteStaff?: (staffId: string) => void;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  staffList,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Add / Edit Modal Sub-state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState<{
    staffCode: string;
    name: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
    roleTitle: string;
    department: string;
    branchId: BranchId;
    status: 'active' | 'suspended';
    twoFactorEnabled: boolean;
  }>({
    staffCode: '',
    name: '',
    email: '',
    phone: '',
    password: 'VitHospital@2026',
    role: 'Quản Trị Viên Hệ Thống (Admin)',
    roleTitle: 'Quản Trị Viên Hệ Thống (Admin & IT)',
    department: 'Phòng Công Nghệ Thông Tin (IT & Chuyển Đổi Số)',
    branchId: 'ALL',
    status: 'active',
    twoFactorEnabled: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Filter staff list
  const filteredStaff = staffList.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.staffCode && s.staffCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.department && s.department.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;
    const matchesBranch = branchFilter === 'ALL' || s.branchId === branchFilter || s.branchId === 'ALL';
    const matchesStatus = statusFilter === 'ALL' || (s.status || 'active') === statusFilter;

    return matchesSearch && matchesRole && matchesBranch && matchesStatus;
  });

  // Open form to add new staff
  const handleOpenAddForm = () => {
    const nextCodeNumber = staffList.length + 1;
    const generatedCode = `NV-${String(nextCodeNumber).padStart(3, '0')}`;
    
    setEditingStaffId(null);
    setFormData({
      staffCode: generatedCode,
      name: '',
      email: '',
      phone: '',
      password: 'VitHospital@2026',
      role: 'Quản Trị Viên Hệ Thống (Admin)',
      roleTitle: 'Quản Trị Viên Hệ Thống (Admin & IT)',
      department: 'Phòng Công Nghệ Thông Tin (IT & Chuyển Đổi Số)',
      branchId: 'ALL',
      status: 'active',
      twoFactorEnabled: false
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open form to edit staff
  const handleOpenEditForm = (staff: CurrentUser) => {
    setEditingStaffId(staff.id);
    setFormData({
      staffCode: staff.staffCode || '',
      name: staff.name,
      email: staff.email || '',
      phone: staff.phone || '',
      password: staff.password || 'VitHospital@2026',
      role: staff.role,
      roleTitle: staff.roleTitle,
      department: staff.department || '',
      branchId: staff.branchId || 'hn-central',
      status: staff.status === 'suspended' ? 'suspended' : 'active',
      twoFactorEnabled: !!staff.twoFactorEnabled
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  // Handle Form Submit
  const handleSaveStaffForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Vui lòng nhập họ và tên nhân viên.');
      return;
    }

    if (!formData.email.trim()) {
      setFormError('Vui lòng nhập email công vụ của nhân viên.');
      return;
    }

    // Check duplicate email
    const duplicateEmail = staffList.find(
      s => s.id !== editingStaffId && s.email?.toLowerCase() === formData.email.trim().toLowerCase()
    );
    if (duplicateEmail) {
      setFormError('Email này đã được sử dụng bởi một tài khoản khác trong hệ thống.');
      return;
    }

    if (editingStaffId) {
      // Update existing
      const existing = staffList.find(s => s.id === editingStaffId);
      if (existing) {
        const updated: CurrentUser = {
          ...existing,
          name: formData.name.trim(),
          staffCode: formData.staffCode.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          password: formData.password.trim(),
          role: formData.role,
          roleTitle: formData.roleTitle,
          department: formData.department.trim(),
          branchId: formData.branchId,
          status: formData.status,
          twoFactorEnabled: formData.twoFactorEnabled
        };
        onUpdateStaff(updated);
        showNotification(`Đã cập nhật thông tin tài khoản: ${updated.name}`);
      }
    } else {
      // Create new
      const newStaff: CurrentUser = {
        id: `u-${Date.now()}`,
        staffCode: formData.staffCode.trim() || `NV-${Math.floor(100 + Math.random() * 900)}`,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password.trim() || 'VitHospital@2026',
        role: formData.role,
        roleTitle: formData.roleTitle,
        avatar: formData.avatar,
        department: formData.department.trim(),
        branchId: formData.branchId,
        status: formData.status,
        twoFactorEnabled: formData.twoFactorEnabled,
        lastLogin: 'Chưa đăng nhập lần đầu',
        createdAt: new Date().toISOString().slice(0, 10)
      };
      onAddStaff(newStaff);
      showNotification(`Đã tạo mới tài khoản cán bộ: ${newStaff.name} (${newStaff.role})`);
    }

    setIsFormOpen(false);
  };

  // Toggle Account Active / Lock
  const handleToggleStatus = (staff: CurrentUser) => {
    const newStatus: 'active' | 'suspended' = staff.status === 'suspended' ? 'active' : 'suspended';
    const updated: CurrentUser = {
      ...staff,
      status: newStatus
    };
    onUpdateStaff(updated);
    showNotification(`Đã ${newStatus === 'active' ? 'mở khóa' : 'khóa'} tài khoản ${staff.name}`);
  };

  // Export Staff List to CSV
  const handleExportCsv = () => {
    const headers = ['Mã NV', 'Họ Tên', 'Vai Trò', 'Email', 'SĐT', 'Phòng Ban', 'Chi Nhánh', 'Trạng Thái', '2FA', 'Ngày Tạo'];
    const rows = filteredStaff.map(s => [
      s.staffCode || '',
      `"${s.name}"`,
      `"${s.role}"`,
      s.email || '',
      s.phone || '',
      `"${s.department || ''}"`,
      `"${s.branchId || 'ALL'}"`,
      s.status === 'suspended' ? 'Đã khóa' : 'Đang hoạt động',
      s.twoFactorEnabled ? 'Có' : 'Không',
      s.createdAt || '2024-01-01'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VitHospital_DanhSachNhanVien_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('Đã xuất danh sách tài khoản nhân viên ra file CSV thành công!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-500/40 rounded-2xl text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-white">Quản Trị Tài Khoản & Phân Quyền Nhân Viên</h2>
                <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Admin Control Panel
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Tạo mới, chỉnh sửa, cấp quyền và quản lý tài khoản đăng nhập cho cán bộ y tế, bác sĩ và nhân viên phòng khám
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddForm}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Thêm Tài Khoản Mới</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successToast}</span>
            </div>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 flex-1 min-w-[240px] max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên, email, mã nhân viên, khoa phòng..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả vai trò ({staffList.length})</option>
              <option value="Quản Trị Viên Hệ Thống (Admin)">Quản Trị Viên Hệ Thống (Admin & IT)</option>
              <option value="Ban Giám Đốc">Ban Giám Đốc</option>
              <option value="Bác sĩ Trưởng Khoa">Bác sĩ Trưởng Khoa</option>
              <option value="Chuyên viên Tiếp đón">Chuyên viên Tiếp đón / Lễ tân</option>
              <option value="Tư Vấn, Kinh Doanh & CSKH">Tư Vấn, Kinh Doanh & CSKH</option>
              <option value="Marketing Lead">Marketing Lead</option>
            </select>

            {/* Branch Filter */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả chi nhánh</option>
              {INITIAL_BRANCHES.map(b => (
                <option key={b.id} value={b.id}>{b.shortName}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="suspended">Đã khóa</option>
            </select>

            <button
              onClick={handleExportCsv}
              className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Xuất file CSV danh sách nhân viên"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Xuất CSV</span>
            </button>
          </div>
        </div>

        {/* Main Content Area: Table of Staff */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">Cán Bộ & Nhân Viên</th>
                  <th className="py-3 px-3">Mã Nhân Viên</th>
                  <th className="py-3 px-3">Vai Trò & Quyền Hạn</th>
                  <th className="py-3 px-3">Phòng Ban / Chuyên Khoa</th>
                  <th className="py-3 px-3">Cơ Sở Công Tác</th>
                  <th className="py-3 px-3 text-center">Bảo Mật 2FA</th>
                  <th className="py-3 px-3 text-center">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((staff) => {
                    const isSuspended = staff.status === 'suspended';
                    return (
                      <tr key={staff.id} className={`hover:bg-slate-50/80 transition-colors ${isSuspended ? 'bg-slate-50/60 opacity-70' : ''}`}>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 ${
                                staff.role === 'Quản Trị Viên Hệ Thống (Admin)' || staff.role.toLowerCase().includes('admin') || staff.role.toLowerCase().includes('it')
                                  ? 'bg-slate-900 text-cyan-300 ring-1 ring-cyan-500/40'
                                  : staff.role === 'Ban Giám Đốc'
                                  ? 'bg-purple-700 text-white'
                                  : staff.role === 'Bác sĩ Trưởng Khoa'
                                  ? 'bg-blue-600 text-white'
                                  : staff.role === 'Chuyên viên Tiếp đón'
                                  ? 'bg-emerald-600 text-white'
                                  : staff.role === 'Marketing Lead'
                                  ? 'bg-pink-600 text-white'
                                  : 'bg-amber-600 text-white'
                              }`}
                            >
                              {getStaffInitials(staff.name)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <span>{staff.name}</span>
                                {(staff.role === 'Ban Giám Đốc' || staff.role === 'Quản Trị Viên Hệ Thống (Admin)') && (
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    staff.role === 'Quản Trị Viên Hệ Thống (Admin)' ? 'bg-slate-900 text-cyan-300 border border-cyan-500/30' : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {staff.role === 'Quản Trị Viên Hệ Thống (Admin)' ? 'IT Admin' : 'Ban Lãnh Đạo'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span className="font-mono">{staff.email}</span>
                                <span>•</span>
                                <span>{staff.phone || 'Chưa cập nhật SĐT'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 font-mono font-bold text-slate-800">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                            {staff.staffCode || 'NV-Chưa cấp'}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            staff.role === 'Quản Trị Viên Hệ Thống (Admin)' ? 'bg-slate-900 text-cyan-300 border border-cyan-500/40' :
                            staff.role === 'Ban Giám Đốc' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                            staff.role === 'Bác sĩ Trưởng Khoa' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            staff.role === 'Chuyên viên Tiếp đón' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            staff.role === 'Marketing Lead' ? 'bg-pink-100 text-pink-800 border border-pink-200' :
                            'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {staff.role === 'Quản Trị Viên Hệ Thống (Admin)' ? 'Admin Hệ Thống (IT)' : staff.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 font-medium text-slate-700">
                          {staff.department || 'Chưa phân bổ'}
                        </td>

                        <td className="py-3.5 px-3 text-slate-600 font-medium">
                          {staff.branchId === 'ALL' ? (
                            <span className="text-blue-700 font-bold">Toàn hệ thống</span>
                          ) : (
                            INITIAL_BRANCHES.find(b => b.id === staff.branchId)?.shortName || staff.branchId
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          {staff.twoFactorEnabled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Bật
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Tắt</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          {isSuspended ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                              <Lock className="w-3 h-3 text-rose-600" /> Đã khóa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Hoạt động
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditForm(staff)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Chỉnh sửa thông tin & phân quyền"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleToggleStatus(staff)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isSuspended
                                  ? 'text-rose-600 hover:bg-emerald-50 hover:text-emerald-700'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                              title={isSuspended ? 'Mở khóa tài khoản' : 'Khóa tài khoản nhân viên'}
                            >
                              {isSuspended ? <Unlock className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                      Không tìm thấy nhân viên nào phù hợp với bộ lọc tìm kiếm.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div>
            Hiển thị <strong>{filteredStaff.length}</strong> / <strong>{staffList.length}</strong> cán bộ nhân viên
          </div>
          <div className="text-slate-500 text-[11px]">
            * Mật khẩu mặc định hệ thống cấp cho tài khoản mới: <strong className="font-mono text-slate-800">VitHospital@2026</strong>
          </div>
        </div>
      </div>

      {/* Sub-Modal: Add / Edit Staff Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-blue-900 text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {editingStaffId ? 'Chỉnh Sửa Tài Khoản Nhân Viên' : 'Tạo Tài Khoản Cán Bộ Mới'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Cấp quyền truy cập hệ thống Quản Trị Quan Hệ Khách Hàng VitCRM
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStaffForm} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã Nhân Viên *</label>
                  <input
                    type="text"
                    required
                    value={formData.staffCode}
                    onChange={(e) => setFormData({ ...formData, staffCode: e.target.value })}
                    placeholder="VD: BS-009, LT-010"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ Và Tên Cán Bộ *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: ThS. BS Nguyễn Văn A"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Công Vụ (@vithospital.vn) *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="ten.nv@vithospital.vn"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số Điện Thoại</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0912 345 678"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chức Danh / Vai Trò (RBAC Role) *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => {
                      const selectedRole = e.target.value as UserRole;
                      const roleCfg = ROLE_CONFIGS[selectedRole];
                      setFormData({
                        ...formData,
                        role: selectedRole,
                        roleTitle: roleCfg ? roleCfg.title : selectedRole,
                        department: roleCfg ? roleCfg.department : formData.department
                      });
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="Quản Trị Viên Hệ Thống (Admin)">Quản Trị Viên Hệ Thống (Admin & IT)</option>
                    <option value="Ban Giám Đốc">Ban Giám Đốc (Quản trị toàn diện)</option>
                    <option value="Bác sĩ Trưởng Khoa">Bác sĩ Trưởng Khoa & Lâm Sàng</option>
                    <option value="Chuyên viên Tiếp đón">Chuyên viên Tiếp đón & Lễ Tân</option>
                    <option value="Tư Vấn, Kinh Doanh & CSKH">Tư Vấn, Kinh Doanh & CSKH</option>
                    <option value="Marketing Lead">Marketing Lead & Automation</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cơ Sở Công Tác *</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value as BranchId })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ALL">Toàn Hệ Thống (Trụ sở & Chi nhánh)</option>
                    {INITIAL_BRANCHES.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phòng Ban / Khoa Chuyên Môn</label>
                  <input
                    type="text"
                    list="department-suggestions"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="VD: Phòng Công Nghệ Thông Tin (IT & Chuyển Đổi Số)..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="department-suggestions">
                    <option value="Phòng Công Nghệ Thông Tin (IT & Chuyển Đổi Số)" />
                    <option value="Ban Lãnh Đạo & HĐQT" />
                    <option value="Khoa Nội Tổng Quát - Tim Mạch" />
                    <option value="Bộ phận Tiếp tân & Điều phối Sảnh" />
                    <option value="Khối Tư Vấn, Kinh Doanh & Chăm Sóc Khách Hàng" />
                    <option value="Phòng Truyền Thông & Tăng Trưởng" />
                  </datalist>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mật Khẩu Đăng Nhập *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-9 pr-9 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    checked={formData.twoFactorEnabled}
                    onChange={(e) => setFormData({ ...formData, twoFactorEnabled: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Kích hoạt bảo mật 2FA</span>
                    <span className="text-[11px] text-slate-500">Yêu cầu mã OTP khi đăng nhập</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    checked={formData.status === 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'active' : 'suspended' })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Trạng thái: Cho phép đăng nhập</span>
                    <span className="text-[11px] text-slate-500">Bỏ tích để tạm khóa tài khoản</span>
                  </div>
                </label>
              </div>

              {/* Action buttons */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingStaffId ? 'Lưu Thay Đổi' : 'Xác Nhận Tạo Tài Khoản'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
