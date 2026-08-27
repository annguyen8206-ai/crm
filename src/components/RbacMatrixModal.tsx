import React from 'react';
import {
  ShieldCheck,
  X,
  Check,
  Minus,
  Lock,
  Eye,
  Activity,
  Users,
  Briefcase,
  TrendingUp,
  Headphones,
  Video,
  Award,
  BarChart3,
  Stethoscope,
  Info
} from 'lucide-react';
import { ROLE_CONFIGS, RoleConfig } from '../utils/rbac';
import { UserRole } from '../types';

interface RbacMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  onSelectRole?: (role: UserRole) => void;
}

export const RbacMatrixModal: React.FC<RbacMatrixModalProps> = ({
  isOpen,
  onClose,
  currentRole
}) => {
  if (!isOpen) return null;

  const roles = Object.values(ROLE_CONFIGS);

  const modules = [
    { id: 'dashboard', name: 'Tổng quan BI & Tài chính', icon: BarChart3, desc: 'Báo cáo doanh thu, lấp đầy, hiệu suất' },
    { id: 'patients', name: 'Sổ khám & Hồ sơ 360°', icon: Users, desc: 'Lịch sử tương tác, phân khúc hội viên & CSKH' },
    { id: 'appointments', name: 'Lịch khám Đa kênh', icon: Activity, desc: 'Tiếp đón, check-in, xếp lịch phòng khám' },
    { id: 'sales', name: 'Kinh doanh B2B / B2C', icon: Briefcase, desc: 'Hợp đồng KSK công ty, deals gói sinh/VIP' },
    { id: 'marketing', name: 'Marketing Automation', icon: TrendingUp, desc: 'Kịch bản Zalo ZNS, phân khúc khách hàng' },
    { id: 'care', name: 'CSKH & Quản trị SLA', icon: Headphones, desc: 'Xử lý ticket khiếu nại, cuộc gọi sau khám D+3' },
    { id: 'telemedicine', name: 'Telemedicine & Hội Chẩn', icon: Video, desc: 'Phòng khám từ xa 1:1, hội chẩn chuyên gia' },
    { id: 'insurance', name: 'Bảo hiểm & Bảo lãnh', icon: ShieldCheck, desc: 'Bảo lãnh viện phí trực tiếp, BHYT' },
    { id: 'loyalty', name: 'Hội viên & Giới thiệu', icon: Award, desc: 'Tích điểm thành viên, hoa hồng referral' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Ma Trận Phân Quyền Vai Trò (RBAC Matrix)</h3>
                <span className="text-[11px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                  Chuẩn Bảo Mật Y Tế
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Quy định phân định quyền hạn, ẩn hoàn toàn các tính năng & công việc không thuộc thẩm quyền của từng vị trí.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Security Banner Note */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-bold">Nguyên tắc Phân quyền Tối thiểu (Principle of Least Privilege):</strong>
              <p className="text-blue-800/90 leading-relaxed">
                Mỗi vai trò chỉ thấy các phân hệ và dữ liệu phục vụ trực tiếp cho vị trí công tác. Bác sĩ không phải xử lý báo cáo Marketing/Sales; Lễ tân và Chăm sóc khách hàng không bị phân tâm bởi các chỉ số tài chính mật; Chuyên viên Kinh doanh không tiếp cận bệnh án y khoa nhạy cảm.
              </p>
            </div>
          </div>

          {/* RBAC Matrix Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3.5 px-4 min-w-[200px]">Phân Hệ Nghiệp Vụ</th>
                    {roles.map(role => {
                      const isCurrent = currentRole === role.shortTitle || currentRole === role.title || currentRole === role.id;
                      return (
                        <th 
                          key={role.id} 
                          className={`py-3.5 px-3 text-center min-w-[120px] transition-colors ${
                            isCurrent ? 'bg-blue-50/80 text-blue-900 border-x border-blue-200' : ''
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${role.badgeColor}`}>
                              {role.shortTitle}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] text-blue-700 font-bold bg-blue-100/80 px-1.5 rounded">
                                Đang chọn
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {modules.map((mod, idx) => (
                    <tr key={mod.id} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/40 hover:bg-slate-50'}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <mod.icon className="w-4 h-4 text-blue-600 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-900 block">{mod.name}</span>
                            <span className="text-[11px] text-slate-500 block">{mod.desc}</span>
                          </div>
                        </div>
                      </td>
                      {roles.map(role => {
                        const isAllowed = role.allowedTabs.includes(mod.id as any);
                        const isCurrent = currentRole === role.shortTitle || currentRole === role.title || currentRole === role.id;
                        return (
                          <td 
                            key={role.id} 
                            className={`py-3 px-3 text-center ${
                              isCurrent ? 'bg-blue-50/50 border-x border-blue-200' : ''
                            }`}
                          >
                            {isAllowed ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400">
                                <Minus className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Role Breakdown Cards */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-3">Chi Tiết Phạm Vi & Nhiệm Vụ Từng Vai Trò:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {roles.map(role => {
                const isCurrent = currentRole === role.shortTitle || currentRole === role.title || currentRole === role.id;
                return (
                  <div
                    key={role.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${role.badgeColor}`}>
                        {role.shortTitle}
                      </span>
                      {isCurrent ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-600 text-white shadow-2xs">
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                          Tiêu chuẩn
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mb-2">{role.department}</p>
                    <p className="text-xs text-slate-700 leading-relaxed mb-3">{role.description}</p>
                    
                    <div className="pt-2.5 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Phân hệ hiển thị ({role.allowedTabs.length}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {role.allowedTabs.map(t => (
                          <span key={t} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-blue-600" />
            <span>Chính sách kiểm soát truy cập phân tầng (Layered Security Model)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
