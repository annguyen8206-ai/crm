import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  UserCheck,
  Search,
  Bell,
  Sparkles,
  Calendar,
  Users,
  Briefcase,
  TrendingUp,
  Headphones,
  MessageSquare,
  Award,
  BarChart3,
  Stethoscope,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  ShieldCheck,
  Cable,
  UserCog,
  Check
} from 'lucide-react';
import { Branch, CurrentUser, BranchId, ActiveTab, UserRole } from '../types';
import { mockUsers, mockBranches } from '../data/mockData';
import { getRoleConfig, ROLE_CONFIGS } from '../utils/rbac';
import { RbacMatrixModal } from './RbacMatrixModal';
import { BackendApiModal } from './BackendApiModal';
import { IntegrationSettingsModal } from './IntegrationSettingsModal';

interface NavbarProps {
  branches?: Branch[];
  currentBranchId?: BranchId;
  onBranchChange?: (branchId: BranchId) => void;
  setCurrentBranchId?: (branchId: BranchId) => void;
  users?: CurrentUser[];
  currentUser?: CurrentUser;
  currentRole?: UserRole;
  setCurrentRole?: (role: UserRole) => void;
  onUserChange?: (user: CurrentUser) => void;
  activeTab: ActiveTab | string;
  onTabChange?: (tab: ActiveTab) => void;
  setActiveTab?: (tab: ActiveTab) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onOpenAiAssistant: () => void;
  onQuickBookAppointment?: () => void;
  onQuickAddPatient?: () => void;
  onStaffLogout?: () => void;
  onOpenStaffManagement?: () => void;
  onOpenBranchManagement?: () => void;
}

function getStaffInitials(name: string): string {
  if (!name) return 'NV';
  const cleanName = name.replace(/^(BS\.|PGS\.|TS\.|ThS\.|CKII|CKI|Kỹ sư|KS\.)\s*/gi, '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NV';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Navbar: React.FC<NavbarProps> = ({
  branches = mockBranches,
  currentBranchId = 'ALL',
  onBranchChange,
  setCurrentBranchId,
  users = mockUsers,
  currentUser,
  currentRole = 'Ban Giám Đốc',
  setCurrentRole,
  onUserChange,
  activeTab,
  onTabChange,
  setActiveTab,
  searchQuery = '',
  onSearchChange,
  onOpenAiAssistant,
  onQuickBookAppointment,
  onQuickAddPatient,
  onStaffLogout,
  onOpenStaffManagement,
  onOpenBranchManagement
}) => {
  const [isRbacModalOpen, setIsRbacModalOpen] = useState(false);
  const [isBackendModalOpen, setIsBackendModalOpen] = useState(false);
  const [isIntegrationSettingsOpen, setIsIntegrationSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  const roleConfig = getRoleConfig(currentRole);
  const activeUser = currentUser || users.find(u => u.role === currentRole || u.roleTitle === currentRole) || users[0];

  const allNavItems = [
    { id: 'dashboard' as ActiveTab, label: 'Tổng quan BI', icon: BarChart3 },
    { id: 'patients' as ActiveTab, label: 'Khách hàng 360°', icon: Users },
    { id: 'appointments' as ActiveTab, label: 'Lịch khám & Tiếp đón', icon: Calendar },
    { id: 'care' as ActiveTab, label: 'CSKH & Quản trị SLA', icon: Headphones },
    { id: 'inbox' as ActiveTab, label: 'Tin nhắn đa kênh', icon: MessageSquare },
    { id: 'catalog' as ActiveTab, label: 'Gói khám, Dịch vụ & Bác sĩ', icon: Stethoscope },
    { id: 'billing' as ActiveTab, label: 'Viện phí & Thanh toán', icon: Cable },
    { id: 'sales' as ActiveTab, label: 'Kinh doanh & B2B', icon: Briefcase },
    { id: 'marketing' as ActiveTab, label: 'Marketing Automation', icon: TrendingUp },
    { id: 'loyalty' as ActiveTab, label: 'Hội viên & Loyalty', icon: Award },
    { id: 'ai-assistant' as any, label: 'Trợ lý Y tế AI', icon: Sparkles }
  ];

  // RBAC Filter: Only show tabs allowed for current role!
  const navItems = allNavItems.filter(item => {
    if (item.id === 'ai-assistant') return true;
    return roleConfig.allowedTabs.includes(item.id as ActiveTab);
  });

  const checkScrollState = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
    }
  };

  useEffect(() => {
    checkScrollState();
    const container = tabsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollState, { passive: true });
      window.addEventListener('resize', checkScrollState);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScrollState);
      }
      window.removeEventListener('resize', checkScrollState);
    };
  }, [navItems.length]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollOffset = direction === 'left' ? -240 : 240;
      tabsContainerRef.current.scrollBy({ left: scrollOffset, behavior: 'smooth' });
    }
  };

  const handleTabClick = (tabId: string) => {
    if (tabId === 'ai-assistant') {
      onOpenAiAssistant();
      return;
    }
    if (onTabChange) {
      onTabChange(tabId as ActiveTab);
    } else if (setActiveTab) {
      setActiveTab(tabId as ActiveTab);
    }
  };

  const handleBranchSelect = (branchId: BranchId) => {
    if (onBranchChange) {
      onBranchChange(branchId);
    } else if (setCurrentBranchId) {
      setCurrentBranchId(branchId);
    }
  };

  // Quick Action label depending on current role
  const getQuickAction = () => {
    const r = roleConfig.shortTitle;
    if (r.includes('Lễ Tân') || r.includes('Tiếp Đón')) {
      return {
        label: '+ Tiếp Đón & Đặt Lịch',
        icon: Plus,
        action: onQuickBookAppointment || (() => handleTabClick('appointments'))
      };
    }
    if (r.includes('Kinh Doanh')) {
      return {
        label: '+ Tạo Deal B2B',
        icon: Plus,
        action: () => handleTabClick('sales')
      };
    }
    if (r.includes('Marketing')) {
      return {
        label: '+ Chiến Dịch ZNS',
        icon: Plus,
        action: () => handleTabClick('marketing')
      };
    }
    if (r.includes('CSKH') || r.includes('Tư Vấn')) {
      return {
        label: '+ Tạo Phiếu CSKH',
        icon: Plus,
        action: () => handleTabClick('care')
      };
    }
    return {
      label: '+ Đặt Lịch Khám',
      icon: Plus,
      action: onQuickBookAppointment || (() => handleTabClick('appointments'))
    };
  };

  const quickAction = getQuickAction();
  const isAdminOrDirector = currentRole === 'Ban Giám Đốc' || currentRole === 'Quản Trị Viên Hệ Thống (Admin)' || currentRole.toLowerCase().includes('admin');

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 text-slate-800 shadow-2xs w-full max-w-full">
      {/* Top Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-15 gap-2 sm:gap-4">
          
          {/* Left: Logo & Search */}
          <div className="flex items-center gap-3 shrink-0">
            <div 
              onClick={() => handleTabClick(roleConfig.defaultTab)}
              className="flex items-center gap-2 cursor-pointer select-none"
              title="Về trang chủ của vai trò"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-base tracking-tight text-slate-900">VitCRM</span>
                  <span className="text-[9px] font-bold uppercase px-1 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    360°
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative hidden md:block w-48 lg:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="global-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                placeholder="Tìm bệnh nhân, SĐT, PID..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Right Controls: Streamlined & Clean */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Branch Selector */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-700 max-w-[120px] sm:max-w-[150px]">
              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <select
                id="branch-selector"
                value={currentBranchId}
                onChange={(e) => handleBranchSelect(e.target.value as BranchId)}
                aria-label="Chọn cơ sở chi nhánh"
                className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-[11px] truncate w-full"
              >
                <option value="ALL" className="bg-white text-slate-800">Toàn Hệ Thống</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id} className="bg-white text-slate-800">
                    {b.shortName || b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Role-Specific Primary Quick Action Button */}
            <button
              id="btn-quick-action-role"
              onClick={quickAction.action}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
              title={quickAction.label}
            >
              <quickAction.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] whitespace-nowrap">{quickAction.label}</span>
            </button>

            {/* AI Assistant Quick Trigger */}
            <button
              id="btn-ai-trigger-header"
              onClick={onOpenAiAssistant}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-blue-700 border border-blue-200/60 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
              title="Mở Trợ lý Y tế AI Gemini"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="hidden sm:inline text-[11px] whitespace-nowrap">AI CSKH</span>
            </button>

            {/* Consolidated Admin & System Settings Dropdown */}
            {isAdminOrDirector && (
              <div className="relative" ref={settingsRef}>
                <button
                  id="btn-system-settings-menu"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`p-1.5 sm:px-2 sm:py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
                    isSettingsOpen
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Cài đặt hệ thống & công cụ quản trị"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden lg:inline text-[11px]">Quản Trị</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isSettingsOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 text-xs space-y-1 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-slate-100 font-bold text-slate-900 text-xs flex items-center justify-between">
                      <span>Công Cụ Quản Trị</span>
                      <span className="text-[10px] text-blue-600 font-normal">Dành cho Admin</span>
                    </div>

                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setIsRbacModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-800 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="font-bold text-xs">Ma Trận Phân Quyền (RBAC)</div>
                        <div className="text-[10px] text-slate-400">Xem & chuyển vai trò phân quyền</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setIsIntegrationSettingsOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Cable className="w-4 h-4 text-cyan-600" />
                      <div>
                        <div className="font-bold text-xs">Cấu Hình Khóa Tích Hợp</div>
                        <div className="text-[10px] text-slate-400">Zalo OA/ZNS, SMS, OTP, Email, VietQR, VoIP, AI</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setIsBackendModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Cable className="w-4 h-4 text-slate-500" />
                      <div>
                        <div className="font-bold text-xs">Tài Liệu API Backend</div>
                        <div className="text-[10px] text-slate-400">Danh mục endpoint & ví dụ</div>
                      </div>
                    </button>

                    {onOpenBranchManagement && (
                      <button
                        onClick={() => {
                          setIsSettingsOpen(false);
                          onOpenBranchManagement();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div className="font-bold text-xs">Quản Lý & Tạo Chi Nhánh</div>
                          <div className="text-[10px] text-slate-400">Thêm mới, sửa cơ sở & phòng khám</div>
                        </div>
                      </button>
                    )}

                    {onOpenStaffManagement && (
                      <button
                        onClick={() => {
                          setIsSettingsOpen(false);
                          onOpenStaffManagement();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-purple-50 text-slate-700 hover:text-purple-800 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <UserCog className="w-4 h-4 text-purple-600" />
                        <div>
                          <div className="font-bold text-xs">Quản Trị Cán Bộ Nhân Viên</div>
                          <div className="text-[10px] text-slate-400">Thêm mới, sửa quyền tài khoản</div>
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Notification Bell */}
            <div className="relative shrink-0">
              <button
                id="btn-notifications"
                aria-label="Thông báo hệ thống"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 text-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-900 text-sm">Thông Báo</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-bold text-[10px]">3 Mới</span>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    <div 
                      onClick={() => {
                        handleTabClick('care');
                        setIsNotificationsOpen(false);
                      }}
                      className="p-2.5 rounded-xl bg-amber-50/60 hover:bg-amber-100/60 border border-amber-200 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between font-bold text-amber-900">
                        <span>Lịch đặt trực tuyến</span>
                        <span className="text-[10px] text-amber-600">Vừa xong</span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">Khách hàng đặt khám mới. CSKH cần gọi xác nhận.</p>
                    </div>

                    <div 
                      onClick={() => {
                        handleTabClick('care');
                        setIsNotificationsOpen(false);
                      }}
                      className="p-2.5 rounded-xl bg-blue-50/60 hover:bg-blue-100/60 border border-blue-200 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between font-bold text-blue-900">
                        <span>Phiếu SLA khẩn cấp</span>
                        <span className="text-[10px] text-blue-600">10p trước</span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">Cần xử lý khiếu nại viện phí theo cam kết SLA 2h.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Card & Secure Account Menu */}
            <div className="relative" ref={roleDropdownRef}>
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center gap-1.5 p-1 pl-1.5 pr-2 rounded-xl hover:bg-slate-100 border border-slate-200/80 transition-colors cursor-pointer shrink-0"
                title="Hồ sơ tài khoản & Đăng xuất"
              >
                <div 
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] text-white shadow-2xs ${
                    currentRole === 'Quản Trị Viên Hệ Thống (Admin)' || currentRole.toLowerCase().includes('admin')
                      ? 'bg-slate-900 text-cyan-300'
                      : currentRole === 'Ban Giám Đốc'
                      ? 'bg-purple-700 text-white'
                      : currentRole === 'Bác sĩ Trưởng Khoa'
                      ? 'bg-blue-600 text-white'
                      : currentRole === 'Chuyên viên Tiếp đón'
                      ? 'bg-emerald-600 text-white'
                      : currentRole === 'Marketing Lead'
                      ? 'bg-pink-600 text-white'
                      : 'bg-amber-600 text-white'
                  }`}
                >
                  {getStaffInitials(activeUser.name)}
                </div>
                <div className="hidden sm:flex flex-col text-left min-w-0 max-w-[120px]">
                  <p className="text-[11px] font-bold text-slate-800 leading-tight truncate">
                    {activeUser.name}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-none truncate">
                    {roleConfig.shortTitle}
                  </p>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 text-xs space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                    <div 
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-xs shrink-0 ${
                        currentRole === 'Ban Giám Đốc'
                          ? 'bg-purple-700'
                          : currentRole === 'Bác sĩ Trưởng Khoa'
                          ? 'bg-blue-600'
                          : currentRole === 'Chuyên viên Tiếp đón'
                          ? 'bg-emerald-600'
                          : 'bg-slate-800'
                      }`}
                    >
                      {getStaffInitials(activeUser.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-sm truncate">{activeUser.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{activeUser.email || activeUser.staffCode}</div>
                      <div className="mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] border ${roleConfig.badgeColor}`}>
                          {roleConfig.shortTitle}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 space-y-1.5 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Mã nhân viên:</span>
                      <strong className="font-mono text-slate-800">{activeUser.staffCode || 'NV-SYSTEM'}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Phòng ban:</span>
                      <span className="font-medium text-slate-800">{roleConfig.department}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Trạng thái bảo mật:</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Xác thực phiên cố định
                      </span>
                    </div>
                  </div>

                  {onStaffLogout && (
                    <div className="pt-1">
                      <button
                        onClick={onStaffLogout}
                        className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-600" />
                        <span>Đăng Xuất Khỏi Hệ Thống</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Main Tab Navigation Bar: Clean, Minimal, and Fast */}
      <div className="relative bg-slate-50 border-t border-slate-200/80 w-full max-w-full">
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pl-1 pr-4 bg-gradient-to-r from-slate-100 to-transparent">
            <button
              onClick={() => scrollTabs('left')}
              className="p-1 rounded-full bg-white text-slate-700 shadow-sm border border-slate-200 hover:bg-blue-50"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div
          ref={tabsContainerRef}
          className="w-full overflow-x-auto no-scrollbar scroll-smooth flex items-center justify-between px-3 sm:px-6 lg:px-8 py-1"
        >
          <div className="flex items-center gap-1 min-w-max">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`tab-btn-${item.id}`}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Role Indicator */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] shrink-0 pl-4 border-l border-slate-200">
            <span className="text-slate-400">Đang trực:</span>
            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${roleConfig.badgeColor}`}>
              {roleConfig.shortTitle}
            </span>
          </div>
        </div>

        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pr-1 pl-4 bg-gradient-to-l from-slate-100 to-transparent">
            <button
              onClick={() => scrollTabs('right')}
              className="p-1 rounded-full bg-white text-slate-700 shadow-sm border border-slate-200 hover:bg-blue-50"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <RbacMatrixModal
        isOpen={isRbacModalOpen}
        onClose={() => setIsRbacModalOpen(false)}
        currentRole={currentRole}
      />

      {isIntegrationSettingsOpen && (
        <IntegrationSettingsModal isOpen onClose={() => setIsIntegrationSettingsOpen(false)} />
      )}

      {isBackendModalOpen && (
        <BackendApiModal onClose={() => setIsBackendModalOpen(false)} />
      )}
    </header>
  );
};



