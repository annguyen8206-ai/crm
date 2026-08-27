import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  X, 
  MapPin, 
  Phone, 
  Tag, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  AlertCircle,
  Building,
  Sparkles
} from 'lucide-react';
import { Branch, BranchId } from '../types';

interface BranchManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  onAddBranch: (newBranch: Branch) => void;
  onUpdateBranch?: (updatedBranch: Branch) => void;
  onDeleteBranch?: (branchId: BranchId) => void;
}

export const BranchManagementModal: React.FC<BranchManagementModalProps> = ({
  isOpen,
  onClose,
  branches,
  onAddBranch,
  onUpdateBranch,
  onDeleteBranch
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    id: string;
    name: string;
    shortName: string;
    address: string;
    phone: string;
    type: 'hospital' | 'clinic' | 'testing' | 'beauty';
  }>({
    id: '',
    name: '',
    shortName: '',
    address: '',
    phone: '',
    type: 'clinic'
  });

  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      shortName: '',
      address: '',
      phone: '',
      type: 'clinic'
    });
    setFormError(null);
    setIsCreating(false);
    setEditingBranchId(null);
  };

  const handleStartEdit = (branch: Branch) => {
    setEditingBranchId(branch.id);
    setFormData({
      id: branch.id,
      name: branch.name,
      shortName: branch.shortName,
      address: branch.address,
      phone: branch.phone,
      type: branch.type
    });
    setIsCreating(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Vui lòng nhập tên đầy đủ của chi nhánh / cơ sở.');
      return;
    }
    if (!formData.shortName.trim()) {
      setFormError('Vui lòng nhập tên viết tắt hiển thị nhanh.');
      return;
    }
    if (!formData.address.trim()) {
      setFormError('Vui lòng nhập địa chỉ cơ sở.');
      return;
    }

    if (editingBranchId && onUpdateBranch) {
      onUpdateBranch({
        id: editingBranchId,
        name: formData.name.trim(),
        shortName: formData.shortName.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim() || '024 3988 8888',
        type: formData.type
      });
    } else {
      const generatedId = `branch-${Date.now().toString().slice(-4)}`;
      onAddBranch({
        id: generatedId,
        name: formData.name.trim(),
        shortName: formData.shortName.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim() || '024 3988 8888',
        type: formData.type
      });
    }

    resetForm();
  };

  const getTypeBadge = (type: Branch['type']) => {
    switch (type) {
      case 'hospital':
        return <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">Bệnh Viện</span>;
      case 'clinic':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">Phòng Khám Đa Khoa</span>;
      case 'testing':
        return <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">TT Xét Nghiệm & Tiêm Chủng</span>;
      case 'beauty':
        return <span className="px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-bold">Viện Thẩm Mỹ Y Khoa</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-bold">Cơ Sở Y Tế</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Quản Lý & Tạo Mới Chi Nhánh / Cơ Sở</h2>
              <p className="text-xs text-slate-500">Thiết lập các phòng khám, bệnh viện và trung tâm trong chuỗi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Actions */}
          {!isCreating && (
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-600">
                Hiện có <strong className="text-slate-900">{branches.length}</strong> cơ sở đang hoạt động trong hệ thống
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setIsCreating(true);
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Chi Nhánh Mới</span>
              </button>
            </div>
          )}

          {/* Form: Add or Edit */}
          {isCreating && (
            <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                <div className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>{editingBranchId ? 'Chỉnh Sửa Chi Nhánh' : 'Tạo Chi Nhánh / Cơ Sở Mới'}</span>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Hủy bỏ
                </button>
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tên Đầy Đủ Chi Nhánh / Bệnh Viện <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Phòng khám Đa khoa Quốc tế VitClinic Tây Hồ"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tên Hiển Thị Viết Tắt <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    placeholder="VD: VitClinic Tây Hồ"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Loại Hình Cơ Sở
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="clinic">Phòng Khám Đa Khoa (Clinic)</option>
                    <option value="hospital">Bệnh Viện Đa Khoa (Hospital)</option>
                    <option value="testing">Trung Tâm Xét Nghiệm & Tiêm Chủng</option>
                    <option value="beauty">Viện Thẩm Mỹ Y Khoa</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Địa Chỉ Chi Nhánh <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="VD: Số 56 Lạc Long Quân, Q. Tây Hồ, Hà Nội"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Hotline / Số Điện Thoại
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="VD: 024 3755 8899"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  {editingBranchId ? 'Lưu Thay Đổi' : 'Xác Nhận Tạo Chi Nhánh'}
                </button>
              </div>
            </form>
          )}

          {/* Branch List */}
          <div className="space-y-3">
            {branches.map((b) => (
              <div 
                key={b.id}
                className="p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm">{b.name}</h4>
                      {getTypeBadge(b.type)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {b.address}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {b.phone}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Tên viết tắt: <strong className="text-slate-700">{b.shortName}</strong> | Mã ID: <code className="font-mono text-slate-600 bg-slate-100 px-1 py-0.2 rounded">{b.id}</code>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleStartEdit(b)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1"
                    title="Chỉnh sửa chi nhánh"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sửa</span>
                  </button>
                  {onDeleteBranch && branches.length > 1 && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Bạn có chắc muốn xóa chi nhánh ${b.name}?`)) {
                          onDeleteBranch(b.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1"
                      title="Xóa cơ sở"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Xóa</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Dữ liệu chi nhánh được đồng bộ tức thì trên toàn bộ hệ thống lịch hẹn và hồ sơ khách hàng.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
