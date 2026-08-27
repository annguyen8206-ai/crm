/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldAlert, ArrowRight, ShieldCheck, Sparkles, Heart, LogOut } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { Patient360View } from './components/Patient360View';
import { AppointmentsView } from './components/AppointmentsView';
import { SalesExcellenceView } from './components/SalesExcellenceView';
import { MarketingAutomationView } from './components/MarketingAutomationView';
import { CustomerCareSlaView } from './components/CustomerCareSlaView';
import { PatientPortalView } from './components/PatientPortalView';
import { LoyaltyReferralView } from './components/LoyaltyReferralView';
import { PatientDetailModal } from './components/PatientDetailModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { BookAppointmentModal } from './components/BookAppointmentModal';
import { AddPatientModal } from './components/AddPatientModal';
import { StaffLoginView } from './components/StaffLoginView';
import { CustomerLoginView } from './components/CustomerLoginView';
import { StaffManagementModal } from './components/StaffManagementModal';
import { BranchManagementModal } from './components/BranchManagementModal';
import { getRoleConfig, isTabAllowedForRole } from './utils/rbac';

import {
  mockBranches,
  mockPatients,
  mockDoctors,
  mockAppointments,
  mockB2BContracts,
  mockB2CDeals,
  mockSegments,
  mockCampaigns,
  mockAutomationRules,
  mockSupportTickets,
  mockReferrals,
  mockMedicalPartners,
  mockPartnerPayouts,
  mockInteractions,
  CURRENT_USERS
} from './data/mockData';

import {
  ActiveTab,
  Branch,
  BranchId,
  UserRole,
  CurrentUser,
  Patient,
  Appointment,
  AppointmentStatus,
  B2BContract,
  B2CDeal,
  MarketingCampaign,
  SupportTicket,
  TicketStatus,
  ReferralRecord,
  MedicalPartner,
  PartnerCommissionPayout,
  InteractionLog
} from './types';

export default function App() {
  // Multi-Portal Authentication & Role State (Staff vs. Customer)
  const [authMode, setAuthMode] = useState<'staff' | 'customer'>('staff');
  const [staffUsers, setStaffUsers] = useState<CurrentUser[]>(CURRENT_USERS);
  const [isStaffLoggedIn, setIsStaffLoggedIn] = useState<boolean>(false);
  const [currentStaffUser, setCurrentStaffUser] = useState<CurrentUser>(CURRENT_USERS[0]);

  // Customer / Patient Portal Session State
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState<boolean>(false);
  const [currentCustomerPatient, setCurrentCustomerPatient] = useState<Patient>(mockPatients[0]);

  // Global Navigation & Context
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [currentBranchId, setCurrentBranchId] = useState<BranchId>('ALL');
  const [currentRole, setCurrentRole] = useState<UserRole>('Ban Giám Đốc');

  // Application Data States
  const [branches, setBranches] = useState<Branch[]>(mockBranches);
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [b2bContracts, setB2BContracts] = useState<B2BContract[]>(mockB2BContracts);
  const [b2cDeals, setB2CDeals] = useState<B2CDeal[]>(mockB2CDeals);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(mockCampaigns);
  const [automationRules, setAutomationRules] = useState(mockAutomationRules);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(mockSupportTickets);
  const [referrals, setReferrals] = useState(mockReferrals);
  const [partners, setPartners] = useState<MedicalPartner[]>(mockMedicalPartners);
  const [partnerPayouts, setPartnerPayouts] = useState<PartnerCommissionPayout[]>(mockPartnerPayouts);
  const [interactions, setInteractions] = useState<InteractionLog[]>(mockInteractions);

  // Modals & Drawers
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookingTargetPatientId, setBookingTargetPatientId] = useState<string | null>(null);
  const [bookingTargetDepartment, setBookingTargetDepartment] = useState<string | null>(null);
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [isStaffManagementOpen, setIsStaffManagementOpen] = useState(false);
  const [isBranchManagementOpen, setIsBranchManagementOpen] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Branch Management Handlers
  const handleAddBranch = (newBranch: Branch) => {
    setBranches(prev => [...prev, newBranch]);
    showToast(`Đã tạo chi nhánh mới thành công: ${newBranch.name}!`);
  };

  const handleUpdateBranch = (updatedBranch: Branch) => {
    setBranches(prev => prev.map(b => b.id === updatedBranch.id ? updatedBranch : b));
    showToast(`Đã cập nhật thông tin chi nhánh: ${updatedBranch.name}`);
  };

  const handleDeleteBranch = (branchId: BranchId) => {
    setBranches(prev => prev.filter(b => b.id !== branchId));
    if (currentBranchId === branchId) {
      setCurrentBranchId('ALL');
    }
    showToast('Đã xóa chi nhánh khỏi hệ thống');
  };

  // Staff Account Management Handlers
  const handleAddStaff = (newStaff: CurrentUser) => {
    setStaffUsers(prev => [newStaff, ...prev]);
    showToast(`Đã cấp tài khoản thành công cho: ${newStaff.name} (${newStaff.staffCode})!`);
  };

  const handleUpdateStaff = (updatedStaff: CurrentUser) => {
    setStaffUsers(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));
    if (currentStaffUser.id === updatedStaff.id) {
      setCurrentStaffUser(updatedStaff);
      setCurrentRole(updatedStaff.role);
    }
    showToast(`Đã cập nhật thông tin tài khoản: ${updatedStaff.name}`);
  };

  // Save new Patient from full Form
  const handleSavePatient = (newPat: Patient) => {
    setPatients(prev => [newPat, ...prev]);
    setSelectedPatientId(newPat.id);
    showToast(`Đã tạo hồ sơ khách hàng thành công: ${newPat.name} (Mã: ${newPat.pid})!`);
  };

  // Appointment Status Updates
  const handleUpdateAppointmentStatus = (appointmentId: string, newStatus: AppointmentStatus) => {
    setAppointments(prev =>
      prev.map(a => (a.id === appointmentId ? { ...a, status: newStatus } : a))
    );
    showToast(`Đã chuyển trạng thái lịch khám sang: ${newStatus}`);
  };

  // Trigger ZNS / SMS Reminder
  const handleTriggerReminder = (appointmentId: string, channel: 'zns' | 'sms') => {
    setAppointments(prev =>
      prev.map(a => {
        if (a.id === appointmentId) {
          return {
            ...a,
            reminderStatus: {
              ...a.reminderStatus,
              znsSent: channel === 'zns' ? true : a.reminderStatus.znsSent,
              smsSent: channel === 'sms' ? true : a.reminderStatus.smsSent,
              lastReminderAt: 'Vừa gửi tức thì'
            }
          };
        }
        return a;
      })
    );
    showToast(`Đã gửi thông báo xác nhận nhắc lịch qua ${channel.toUpperCase()} thành công!`);
  };

  // Book New Appointment
  const handleSaveAppointment = (newApt: Omit<Appointment, 'id' | 'code'>) => {
    const apt: Appointment = {
      ...newApt,
      id: `APT-${Date.now()}`,
      code: `LK-${Math.floor(1000 + Math.random() * 9000)}`
    };
    setAppointments(prev => [apt, ...prev]);
    showToast(`Đã tạo lịch khám thành công cho BN ${apt.patientName} & gửi Zalo ZNS xác nhận!`);
  };

  // B2B Stage Updates
  const handleUpdateB2BStage = (contractId: string, newStage: B2BContract['stage']) => {
    setB2BContracts(prev =>
      prev.map(c => (c.id === contractId ? { ...c, stage: newStage } : c))
    );
    showToast(`Đã cập nhật giai đoạn HĐ KSK sang: ${newStage}`);
  };

  // B2C Stage Updates
  const handleUpdateB2CStage = (dealId: string, newStage: B2CDeal['stage']) => {
    setB2CDeals(prev =>
      prev.map(d => (d.id === dealId ? { ...d, stage: newStage } : d))
    );
    showToast(`Đã chuyển trạng thái cơ hội B2C sang: ${newStage}`);
  };

  // Add Marketing Campaign
  const handleAddNewCampaign = (campaignData: Omit<MarketingCampaign, 'id'>) => {
    const newCamp: MarketingCampaign = {
      ...campaignData,
      id: `CAMP-${Date.now()}`
    };
    setCampaigns(prev => [newCamp, ...prev]);
    showToast(`Đã kích hoạt chiến dịch Re-marketing: ${newCamp.name}`);
  };

  // Toggle Automation Rule
  const handleToggleRule = (ruleId: string) => {
    setAutomationRules(prev =>
      prev.map(r => (r.id === ruleId ? { ...r, autoSend: !r.autoSend } : r))
    );
    showToast('Đã cập nhật trạng thái kịch bản tự động');
  };

  // Support Ticket Status Updates
  const handleUpdateTicketStatus = (ticketId: string, status: TicketStatus, notes?: string) => {
    setSupportTickets(prev =>
      prev.map(t => (t.id === ticketId ? { ...t, status, resolutionNotes: notes || t.resolutionNotes } : t))
    );
    showToast(`Đã cập nhật xử lý Ticket khiếu nại sang: ${status}`);
  };

  // Selected Patient Details for 360 View
  const selectedPatient = (patients || []).find(p => p && p.id === selectedPatientId) || null;

  // =========================================================================
  // 1. DEDICATED CUSTOMER / PATIENT AUTHENTICATION & STANDALONE PORTAL
  // =========================================================================
  if (authMode === 'customer') {
    // 1.1 Customer is NOT logged in -> Dedicated Customer Login Screen
    if (!isCustomerLoggedIn) {
      return (
        <div className="min-h-screen bg-slate-900 font-sans selection:bg-teal-500 selection:text-white">
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold border border-slate-700 animate-in slide-in-from-bottom-5">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              <span>{toastMessage}</span>
            </div>
          )}
          <CustomerLoginView
            patients={patients}
            onLoginSuccess={(patient) => {
              setCurrentCustomerPatient(patient);
              setIsCustomerLoggedIn(true);
              showToast(`Chào mừng Quý khách ${patient.name} (${patient.pid}) đã đăng nhập sổ khám!`);
            }}
            onNavigateToStaffLogin={() => {
              setAuthMode('staff');
              setIsStaffLoggedIn(false);
              showToast('Chuyển sang Cổng Đăng Nhập Cán Bộ Y Tế & Nhân Viên');
            }}
            onRegisterNewPatient={handleSavePatient}
          />
        </div>
      );
    }

    // 1.2 Customer is LOGGED IN -> Dedicated Standalone Patient Care Experience
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900 pb-10 w-full max-w-full overflow-x-hidden">
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold border border-slate-700 animate-in slide-in-from-bottom-5">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Dedicated Customer Portal Top Navigation */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                <Heart className="w-5 h-5 fill-white/20" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
                  <span>VitHospital Patient Care</span>
                  <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                    Cổng Khách Hàng 24/7
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500">
                  Sổ Khám Điện Tử • Đặt Lịch Ưu Tiên • Live Chat CSKH
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAuthMode('staff');
                  setIsStaffLoggedIn(false);
                  showToast('Vui lòng đăng nhập để truy cập Cổng Quản Trị Cán Bộ Y Tế');
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <span>Cổng Nhân Viên & Bác Sĩ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setIsCustomerLoggedIn(false);
                  showToast('Đã đăng xuất khỏi tài khoản bệnh nhân');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng Xuất</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
          <PatientPortalView
            patients={patients}
            doctors={mockDoctors}
            branches={mockBranches}
            tickets={supportTickets}
            appointments={appointments}
            currentPatientOverride={currentCustomerPatient}
            onAddNewTicket={(t) => {
              const newTicket: SupportTicket = {
                ...t,
                id: `TK-${Date.now()}`
              };
              setSupportTickets(prev => [newTicket, ...prev]);
              showToast('Phiếu đánh giá / khiếu nại đã chuyển vào hệ thống CSKH & Quản trị SLA!');
            }}
            onBookSelfAppointment={(aptData) => {
              const newApt: Appointment = {
                ...aptData,
                id: `APT-SELF-${Date.now()}`,
                code: `LK-PORTAL-${Math.floor(1000 + Math.random() * 9000)}`
              };
              setAppointments(prev => [newApt, ...prev]);
              showToast(`Đặt lịch thành công! Yêu cầu của Quý khách đã chuyển sang Hàng đợi CSKH gọi lại.`);
            }}
            onSelectPatient={(id) => setSelectedPatientId(id)}
            onCustomerLogout={() => {
              setIsCustomerLoggedIn(false);
              showToast('Đã đăng xuất khỏi Cổng Khách Hàng');
            }}
          />
        </main>
      </div>
    );
  }

  // =========================================================================
  // 2. DEDICATED STAFF / CLINIC INTERNAL AUTHENTICATION & CRM PORTAL
  // =========================================================================
  // If staff is logged out, show the dedicated Staff Authentication Portal
  if (!isStaffLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 font-sans selection:bg-blue-500 selection:text-white">
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold border border-slate-700 animate-in slide-in-from-bottom-5">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span>{toastMessage}</span>
          </div>
        )}
        <StaffLoginView
          staffList={staffUsers}
          onLoginSuccess={(user) => {
            setCurrentStaffUser(user);
            setCurrentRole(user.role);
            setIsStaffLoggedIn(true);
            const roleCfg = getRoleConfig(user.role);
            setActiveTab(roleCfg.defaultTab);
            showToast(`Chào mừng ${user.name} (${user.roleTitle}) đã đăng nhập!`);
          }}
          onNavigateToCustomerLogin={() => {
            setAuthMode('customer');
            setIsCustomerLoggedIn(false);
            showToast('Chuyển sang Cổng Đăng Nhập Khách Hàng / Bệnh Nhân');
          }}
          onNavigateToPatientPortal={() => {
            setAuthMode('customer');
            setIsCustomerLoggedIn(false);
            showToast('Chuyển sang Cổng Đăng Nhập Khách Hàng / Bệnh Nhân');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 pb-10 w-full max-w-full overflow-x-hidden">

      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold border border-slate-700 animate-in slide-in-from-bottom-5">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}


      {/* Main Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        branches={branches}
        currentBranchId={currentBranchId}
        setCurrentBranchId={setCurrentBranchId}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        currentUser={currentStaffUser}
        users={staffUsers}
        onUserChange={(newUser) => {
          setCurrentStaffUser(newUser);
          setCurrentRole(newUser.role);
          showToast(`Đã chuyển phiên làm việc sang: ${newUser.name} (${newUser.role})`);
        }}
        onStaffLogout={() => {
          setIsStaffLoggedIn(false);
          showToast('Đã đăng xuất khỏi tài khoản nhân viên phòng khám');
        }}
        onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
        onQuickBookAppointment={() => setIsBookModalOpen(true)}
        onOpenStaffManagement={() => setIsStaffManagementOpen(true)}
        onOpenBranchManagement={() => setIsBranchManagementOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">

        {/* RBAC Permission Guard: If tab is not allowed for the active role */}
        {!isTabAllowedForRole(activeTab, currentRole) ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm my-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-3 border border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Chính sách kiểm soát quyền hạn (RBAC)</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Phân Hệ Không Thuộc Thẩm Quyền Truy Cập</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Vai trò hiện tại <strong className="text-blue-700 font-bold">{getRoleConfig(currentRole).title}</strong> không được phân công phụ trách phân hệ này. Hệ thống tự động ẩn các công việc không liên quan để đảm bảo bảo mật và giảm tải công việc.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setActiveTab(getRoleConfig(currentRole).defaultTab)}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <span>Về phân hệ chính ({getRoleConfig(currentRole).defaultTab})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 1. Dashboard BI */}
            {activeTab === 'dashboard' && (
              <DashboardView
                currentRole={currentRole}
                patients={patients}
                appointments={appointments}
                b2bContracts={b2bContracts}
                supportTickets={supportTickets}
                tickets={supportTickets}
                branches={branches}
                currentBranchId={currentBranchId}
                onSelectPatient={(id) => setSelectedPatientId(id)}
                onNavigate={(tab) => setActiveTab(tab as any)}
                onSelectTab={(tab) => setActiveTab(tab as any)}
                onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
              />
            )}

            {/* 2. Patient 360 Hub */}
            {activeTab === 'patients' && (
              <Patient360View
                patients={patients}
                branches={branches}
                currentBranchId={currentBranchId}
                onSelectPatient={(id) => setSelectedPatientId(id)}
                onAddPatient={() => setIsAddPatientModalOpen(true)}
                onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
              />
            )}

            {/* 3. Omnichannel Appointments & No-Show */}
            {activeTab === 'appointments' && (
              <AppointmentsView
                appointments={appointments}
                doctors={mockDoctors}
                branches={branches}
                patients={patients}
                currentBranchId={currentBranchId}
                onUpdateStatus={handleUpdateAppointmentStatus}
                onTriggerReminder={handleTriggerReminder}
                onOpenBookModal={() => setIsBookModalOpen(true)}
                onSelectPatient={(id) => setSelectedPatientId(id)}
              />
            )}

            {/* 4. Sales Excellence B2B, B2C & Medical Collaborators / Partners (CTV) */}
            {activeTab === 'sales' && (
              <SalesExcellenceView
                b2bContracts={b2bContracts}
                b2cDeals={b2cDeals}
                branches={branches}
                currentBranchId={currentBranchId}
                referrals={referrals}
                partners={partners}
                partnerPayouts={partnerPayouts}
                patients={patients}
                onUpdateB2BStage={handleUpdateB2BStage}
                onUpdateB2CStage={handleUpdateB2CStage}
                onAddNewB2BContract={(newContract) => {
                  setB2BContracts(prev => [newContract, ...prev]);
                  showToast(`Đã tạo Hợp đồng KSK B2B thành công: ${newContract.companyName}!`);
                }}
                onAddNewB2CDeal={(newDeal) => {
                  setB2CDeals(prev => [newDeal, ...prev]);
                  showToast(`Đã thêm cơ hội B2C mới: ${newDeal.customerName} (${(newDeal.estimatedValue / 1e6).toLocaleString()} tr đ)!`);
                }}
                onAddNewReferral={(r) => {
                  const newRef: ReferralRecord = {
                    ...r,
                    id: `REF-${Date.now()}`
                  };
                  setReferrals(prev => [newRef, ...prev]);
                  if (r.partnerId) {
                    setPartners(prev => prev.map(p => p.id === r.partnerId ? {
                      ...p,
                      totalPatientsReferred: p.totalPatientsReferred + 1,
                      totalRevenueGenerated: p.totalRevenueGenerated + r.billAmount,
                      totalCommissionEarned: p.totalCommissionEarned + r.commissionAmount,
                      pendingBalance: p.pendingBalance + r.commissionAmount
                    } : p));
                  }
                  showToast('Đã ghi nhận ca giới thiệu mới & tự động tính hoa hồng cho CTV!');
                }}
                onAddNewPartner={(newPartner) => {
                  setPartners(prev => [newPartner, ...prev]);
                  showToast(`Đã thêm CTV / Bác sĩ đối tác: ${newPartner.name} (${newPartner.code})!`);
                }}
                onAddNewPayout={(payout) => {
                  setPartnerPayouts(prev => [payout, ...prev]);
                  setReferrals(prev => prev.map(r => (r.partnerId === payout.partnerId || r.referrerName === payout.partnerName) ? { ...r, status: 'Đã chi trả' } : r));
                  setPartners(prev => prev.map(p => p.id === payout.partnerId ? {
                    ...p,
                    totalCommissionPaid: p.totalCommissionPaid + payout.payoutAmount,
                    pendingBalance: Math.max(0, p.pendingBalance - payout.payoutAmount)
                  } : p));
                  showToast(`Đã tạo lệnh thanh toán hoa hồng UNC ${payout.code} thành công!`);
                }}
                onUpdateReferralStatus={(refId, status) => {
                  setReferrals(prev => prev.map(r => r.id === refId ? { ...r, status } : r));
                  showToast('Đã cập nhật trạng thái đối soát hoa hồng ca giới thiệu!');
                }}
                onSelectPatient={(id) => setSelectedPatientId(id)}
              />
            )}

            {/* 5. Marketing Automation & Re-Marketing */}
            {activeTab === 'marketing' && (
              <MarketingAutomationView
                segments={mockSegments}
                campaigns={campaigns}
                automationRules={automationRules}
                onAddNewCampaign={handleAddNewCampaign}
                onToggleRule={handleToggleRule}
                patients={patients}
              />
            )}

            {/* 6. Customer Care & SLA */}
            {activeTab === 'care' && (
              <CustomerCareSlaView
                tickets={supportTickets}
                patients={patients}
                branches={branches}
                currentBranchId={currentBranchId}
                appointments={appointments}
                onUpdateTicketStatus={handleUpdateTicketStatus}
                onAddNewTicket={(t) => {
                  const newTicket: SupportTicket = {
                    ...t,
                    id: `TK-${Date.now()}`
                  };
                  setSupportTickets(prev => [newTicket, ...prev]);
                  showToast('Đã ghi nhận yêu cầu / khiếu nại mới vào hệ thống SLA!');
                }}
                onConfirmAppointmentAndTransfer={(aptId) => {
                  setAppointments(prev =>
                    prev.map(a => (a.id === aptId ? {
                      ...a,
                      status: 'Đã xác nhận',
                      reminderStatus: {
                        ...a.reminderStatus,
                        callConfirmed: true,
                        znsSent: true,
                        lastReminderAt: 'CSKH vừa gọi xác nhận'
                      }
                    } : a))
                  );
                  showToast('CSKH đã gọi xác nhận & chuyển lịch khám vào Lịch khám Đa kênh thành công!');
                }}
                onNavigateToAppointments={() => setActiveTab('appointments')}
                onSelectPatient={(id) => setSelectedPatientId(id)}
                onBookAppointmentFromRecall={(recall) => {
                  setBookingTargetPatientId(recall.patientId);
                  setBookingTargetDepartment(recall.department || null);
                  setIsBookModalOpen(true);
                  showToast(`Mở lịch đặt hẹn tái khám cho ${recall.patientName} (${recall.condition})`);
                }}
              />
            )}

            {/* 7. Patient Portal & Self Booking */}
            {activeTab === 'portal' && (
              <PatientPortalView
                patients={patients}
                doctors={mockDoctors}
                branches={mockBranches}
                tickets={supportTickets}
                appointments={appointments}
                onAddNewTicket={(t) => {
                  const newTicket: SupportTicket = {
                    ...t,
                    id: `TK-${Date.now()}`
                  };
                  setSupportTickets(prev => [newTicket, ...prev]);
                  showToast('Phiếu đánh giá / khiếu nại đã chuyển vào hệ thống CSKH & Quản trị SLA!');
                }}
                onBookSelfAppointment={(aptData) => {
                  const newApt: Appointment = {
                    ...aptData,
                    id: `APT-SELF-${Date.now()}`,
                    code: `LK-PORTAL-${Math.floor(1000 + Math.random() * 9000)}`
                  };
                  setAppointments(prev => [newApt, ...prev]);
                  showToast(`Đặt lịch thành công! Yêu cầu của Quý khách đã chuyển sang Hàng đợi CSKH gọi lại.`);
                }}
                onSelectPatient={(id) => setSelectedPatientId(id)}
                onNavigateToCare={() => setActiveTab('care')}
                onNavigateToAppointments={() => setActiveTab('appointments')}
              />
            )}

            {/* 8. Loyalty & Referrals & Medical Partners */}
            {activeTab === 'loyalty' && (
              <LoyaltyReferralView
                referrals={referrals}
                partners={partners}
                partnerPayouts={partnerPayouts}
                patients={patients}
                onAddNewReferral={(r) => {
                  const newRef: ReferralRecord = {
                    ...r,
                    id: `REF-${Date.now()}`
                  };
                  setReferrals(prev => [newRef, ...prev]);
                  // Update partner pending balance if linked
                  if (r.partnerId) {
                    setPartners(prev => prev.map(p => p.id === r.partnerId ? {
                      ...p,
                      totalPatientsReferred: p.totalPatientsReferred + 1,
                      totalRevenueGenerated: p.totalRevenueGenerated + r.billAmount,
                      totalCommissionEarned: p.totalCommissionEarned + r.commissionAmount,
                      pendingBalance: p.pendingBalance + r.commissionAmount
                    } : p));
                  }
                  showToast('Đã ghi nhận ca giới thiệu mới & tự động tính hoa hồng cho CTV!');
                }}
                onAddNewPartner={(newPartner) => {
                  setPartners(prev => [newPartner, ...prev]);
                  showToast(`Đã thêm CTV / Bác sĩ đối tác: ${newPartner.name} (${newPartner.code})!`);
                }}
                onAddNewPayout={(payout) => {
                  setPartnerPayouts(prev => [payout, ...prev]);
                  // Mark corresponding referrals as paid
                  setReferrals(prev => prev.map(r => (r.partnerId === payout.partnerId || r.referrerName === payout.partnerName) ? { ...r, status: 'Đã chi trả' } : r));
                  // Deduct pending balance
                  setPartners(prev => prev.map(p => p.id === payout.partnerId ? {
                    ...p,
                    totalCommissionPaid: p.totalCommissionPaid + payout.payoutAmount,
                    pendingBalance: Math.max(0, p.pendingBalance - payout.payoutAmount)
                  } : p));
                  showToast(`Đã lập lệnh quyết toán hoa hồng & xuất Ủy nhiệm chi ${payout.code}!`);
                }}
                onUpdateReferralStatus={(id, status) => {
                  setReferrals(prev => prev.map(r => r.id === id ? { ...r, status } : r));
                  showToast(`Đã cập nhật trạng thái hoa hồng ca khám: ${status}`);
                }}
                onSelectPatient={(id) => setSelectedPatientId(id)}
              />
            )}
          </>
        )}

      </main>

      {/* Patient 360 Detail Modal */}
      <PatientDetailModal
        patient={selectedPatient}
        currentRole={currentRole}
        isOpen={selectedPatient !== null}
        onClose={() => setSelectedPatientId(null)}
        interactions={interactions}
        branches={mockBranches}
        appointments={appointments}
        onAddInteraction={(newInter) => {
          const createdInter: InteractionLog = {
            ...newInter,
            id: `INT-${Date.now()}`
          };
          setInteractions(prev => [createdInter, ...prev]);
          showToast('Đã lưu nhật ký tương tác chăm sóc khách hàng mới!');
        }}
        onBookAppointment={(patId) => {
          setBookingTargetPatientId(patId);
          setSelectedPatientId(null);
          setIsBookModalOpen(true);
        }}
        onUpdatePatientTier={(patId, newTier, pointsDelta = 0, reason = '') => {
          setPatients(prev => prev.map(p => {
            if (p.id === patId) {
              const currentPoints = p.membership?.points || 0;
              const updatedPoints = Math.max(0, currentPoints + pointsDelta);
              return {
                ...p,
                membership: {
                  ...p.membership,
                  tier: newTier,
                  points: updatedPoints
                }
              };
            }
            return p;
          }));
          showToast(`Đã nâng hạng thành công sang [${newTier}] (${pointsDelta >= 0 ? `+${pointsDelta}` : pointsDelta} điểm)!`);
        }}
      />

      {/* AI Assistant Modal (Gemini 2.5 Flash) */}
      <AiAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        patients={patients}
        doctors={mockDoctors}
        onOpenBookAppointment={(patientId, department) => {
          setBookingTargetPatientId(patientId || null);
          setBookingTargetDepartment(department || null);
          setIsAiAssistantOpen(false);
          setIsBookModalOpen(true);
        }}
      />

      {/* Book Appointment Modal */}
      <BookAppointmentModal
        isOpen={isBookModalOpen}
        onClose={() => {
          setIsBookModalOpen(false);
          setBookingTargetPatientId(null);
          setBookingTargetDepartment(null);
        }}
        patients={patients}
        doctors={mockDoctors}
        branches={branches}
        currentBranchId={currentBranchId}
        initialPatientId={bookingTargetPatientId}
        initialDepartment={bookingTargetDepartment}
        onSaveAppointment={handleSaveAppointment}
      />

      {/* Add Patient 360 Full Modal */}
      <AddPatientModal
        isOpen={isAddPatientModalOpen}
        onClose={() => setIsAddPatientModalOpen(false)}
        branches={branches}
        currentBranchId={currentBranchId}
        onSavePatient={handleSavePatient}
      />

      {/* Staff & Account Management Modal (Admin: Ban Giám Đốc) */}
      <StaffManagementModal
        isOpen={isStaffManagementOpen}
        onClose={() => setIsStaffManagementOpen(false)}
        staffList={staffUsers}
        onAddStaff={handleAddStaff}
        onUpdateStaff={handleUpdateStaff}
      />

      {/* Branch / Facility Management Modal */}
      <BranchManagementModal
        isOpen={isBranchManagementOpen}
        onClose={() => setIsBranchManagementOpen(false)}
        branches={branches}
        onAddBranch={handleAddBranch}
        onUpdateBranch={handleUpdateBranch}
        onDeleteBranch={handleDeleteBranch}
      />

    </div>
  );
}

