/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ShieldAlert, ArrowRight, ShieldCheck, Sparkles, Heart, LogOut } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { PatientDetailModal } from './components/PatientDetailModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { BookAppointmentModal } from './components/BookAppointmentModal';
import { AddPatientModal } from './components/AddPatientModal';
import { StaffLoginView } from './components/StaffLoginView';
import { CustomerLoginView } from './components/CustomerLoginView';
import { StaffManagementModal } from './components/StaffManagementModal';
import { BranchManagementModal } from './components/BranchManagementModal';
import { getRoleConfig, isTabAllowedForRole } from './utils/rbac';
import { apiClient } from './utils/apiClient';

// Heavy, tab-scoped views are code-split so the initial bundle only ships the
// shell + login. Each is mounted under the <Suspense> boundary below.
const DashboardView = lazy(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })));
const Patient360View = lazy(() => import('./components/Patient360View').then(m => ({ default: m.Patient360View })));
const AppointmentsView = lazy(() => import('./components/AppointmentsView').then(m => ({ default: m.AppointmentsView })));
const SalesExcellenceView = lazy(() => import('./components/SalesExcellenceView').then(m => ({ default: m.SalesExcellenceView })));
const MarketingAutomationView = lazy(() => import('./components/MarketingAutomationView').then(m => ({ default: m.MarketingAutomationView })));
const CustomerCareSlaView = lazy(() => import('./components/CustomerCareSlaView').then(m => ({ default: m.CustomerCareSlaView })));
const PatientPortalView = lazy(() => import('./components/PatientPortalView').then(m => ({ default: m.PatientPortalView })));
const LoyaltyReferralView = lazy(() => import('./components/LoyaltyReferralView').then(m => ({ default: m.LoyaltyReferralView })));
const OmnichannelInboxView = lazy(() => import('./components/OmnichannelInboxView').then(m => ({ default: m.OmnichannelInboxView })));
const CatalogView = lazy(() => import('./components/CatalogView').then(m => ({ default: m.CatalogView })));
const BillingView = lazy(() => import('./components/BillingView').then(m => ({ default: m.BillingView })));

/** Lightweight fallback while a lazy view chunk loads. */
function ViewLoading() {
  return (
    <div className="flex items-center justify-center py-24 text-slate-400">
      <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}

function mapApiPatient(patient: any): Patient {
  return {
    ...patient,
    citizenId: patient.citizenId || patient.idCard,
    underlyingConditions: patient.underlyingConditions || patient.chronicConditions || [],
    primaryBranchId: patient.primaryBranchId || patient.branchId || 'hn-central',
    membership: patient.membership || {
      tier: patient.loyaltyTier || 'Standard',
      points: patient.loyaltyPoints || 0,
      totalSpent: patient.totalSpent || 0
    },
    insurance: patient.insurance || {
      hasBhyt: Boolean(patient.insuranceCardNumber),
      privateProvider: patient.insuranceProvider,
      validUntil: patient.insuranceExpiry
    },
    avatar: patient.avatar || ''
  } as Patient;
}

function mapApiAppointment(appointment: any): Appointment {
  return {
    ...appointment,
    code: appointment.code || appointment.queueNumber || appointment.id,
    appointmentDate: appointment.appointmentDate || appointment.date,
    bookingChannel: appointment.bookingChannel || appointment.channel || 'Website',
    type: appointment.type === 'Tái khám' ? 'Tái khám định kỳ' : appointment.type || 'Khám mới',
    status: appointment.status === 'Chờ tiếp đón' ? 'Chờ xác nhận' : appointment.status || 'Chờ xác nhận',
    notes: appointment.notes || '',
    reminderStatus: appointment.reminderStatus || { znsSent: false, smsSent: false, callConfirmed: false },
    fee: appointment.fee || appointment.estimatedCost || 0
  } as Appointment;
}

import {
  mockBranches,
  mockPatients,
  mockDoctors,
  mockSegments,
  mockAutomationRules,
  mockReferrals,
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

/**
 * Persists a front-end module collection to the backend (JSONB snapshot) whenever
 * it changes, after the initial hydration from the server has completed.
 */
function usePersistedCollection(name: string, value: unknown[], ready: React.MutableRefObject<boolean>) {
  useEffect(() => {
    if (!ready.current) return;
    const timer = setTimeout(() => {
      void apiClient.collections.save(name, value as any[]).catch((err) => {
        console.warn(`[API sync] Không lưu được collection "${name}"`, err);
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [name, value, ready]);
}

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

  // Application Data States — start empty; real data is loaded from the backend
  // after login. (SEED_DEMO_DATA=true on the server keeps sample records.)
  const [branches, setBranches] = useState<Branch[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [b2bContracts, setB2BContracts] = useState<B2BContract[]>([]);
  const [b2cDeals, setB2CDeals] = useState<B2CDeal[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [automationRules, setAutomationRules] = useState<typeof mockAutomationRules>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [referrals, setReferrals] = useState<typeof mockReferrals>([]);
  const [partners, setPartners] = useState<MedicalPartner[]>([]);
  const [partnerPayouts, setPartnerPayouts] = useState<PartnerCommissionPayout[]>([]);
  const [interactions, setInteractions] = useState<InteractionLog[]>([]);
  const [medicalServices, setMedicalServices] = useState<any[]>([]);
  const [medicalPackages, setMedicalPackages] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [recalls, setRecalls] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [csatFeedbacks, setCsatFeedbacks] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [dashboardKpis, setDashboardKpis] = useState<any | null>(null);
  const [apiSyncError, setApiSyncError] = useState<string | null>(null);

  // Omnichannel inbox (Zalo OA + Facebook) — realtime via SSE
  const [conversations, setConversations] = useState<any[]>([]);
  const [inboxMessages, setInboxMessages] = useState<any[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [loadingInboxMessages, setLoadingInboxMessages] = useState(false);
  const selectedConvRef = useRef<string | null>(null);
  selectedConvRef.current = selectedConversationId;

  // Inbound-call screen pop + check-in queue ticket + patient portal session.
  const [incomingCall, setIncomingCall] = useState<{ call: any; patient: any; at: number } | null>(null);
  const [checkInTicket, setCheckInTicket] = useState<any | null>(null);
  const [portalData, setPortalData] = useState<{ appointments: any[]; invoices: any[]; recalls: any[] } | null>(null);

  // Becomes true only after the initial server hydration finishes, so the
  // usePersistedCollection effects below don't immediately echo the seed data back.
  const collectionsHydrated = useRef(false);

  useEffect(() => {
    if (!isStaffLoggedIn) {
      collectionsHydrated.current = false;
      return;
    }
    let cancelled = false;
    const loadApiData = async () => {
      try {
        const [patientsResponse, appointmentsResponse, ticketsResponse, collectionsResponse, recallsR, followUpsR, csatR, invoicesR, dashR] = await Promise.all([
          apiClient.patients.list({ limit: 500 }),
          apiClient.appointments.list(),
          apiClient.tickets.list(),
          apiClient.collections.getAll().catch(() => ({ collections: {} as Record<string, any[]> })),
          apiClient.recalls.list().catch(() => ({ recalls: [] as any[] })),
          apiClient.followUps.list().catch(() => ({ followUps: [] as any[] })),
          apiClient.csat.getFeedbacks().catch(() => ({ feedbacks: [] as any[] })),
          apiClient.invoices.list().catch(() => ({ invoices: [] as any[] })),
          apiClient.analytics.getDashboard().catch(() => null as any)
        ]);
        if (cancelled) return;
        setPatients((patientsResponse.patients || []).map(mapApiPatient));
        setAppointments((appointmentsResponse.appointments || []).map(mapApiAppointment));
        setSupportTickets((ticketsResponse.tickets || []) as SupportTicket[]);
        setRecalls((recallsR as any).recalls || []);
        setFollowUps((followUpsR as any).followUps || []);
        setCsatFeedbacks((csatR as any).feedbacks || []);
        setInvoices((invoicesR as any).invoices || []);
        setDashboardKpis(dashR);

        // Hydrate generic module collections. When the server has never stored a
        // collection we push the local seed up once so both sides agree.
        const remote = collectionsResponse.collections || {};
        const hydrate = <T,>(key: string, setter: (v: T[]) => void) => {
          setter(Array.isArray(remote[key]) ? (remote[key] as T[]) : []);
        };
        hydrate('branches', setBranches);
        hydrate('b2bContracts', setB2BContracts);
        hydrate('b2cDeals', setB2CDeals);
        hydrate('campaigns', setCampaigns);
        hydrate('automationRules', setAutomationRules);
        hydrate('referrals', setReferrals);
        hydrate('partners', setPartners);
        hydrate('partnerPayouts', setPartnerPayouts);
        hydrate('interactions', setInteractions);
        hydrate('medicalServices', setMedicalServices);
        hydrate('medicalPackages', setMedicalPackages);
        hydrate('doctors', setDoctors);

        try {
          const convRes = await apiClient.conversations.list();
          if (!cancelled) setConversations(convRes.conversations || []);
        } catch { /* inbox optional */ }

        // Staff accounts live in the auth_users table (admin only).
        try {
          const { staff } = await apiClient.staff.list();
          if (!cancelled && Array.isArray(staff) && staff.length) {
            setStaffUsers(staff.map((s: any) => ({
              id: s.id,
              name: s.name,
              email: s.email,
              staffCode: s.staffCode,
              role: s.role,
              roleTitle: s.roleTitle,
              department: s.department || '',
              branchId: s.branchId || 'ALL',
              phone: s.phone || '',
              twoFactorEnabled: !!s.twoFactorEnabled,
              status: s.status === 'suspended' ? 'suspended' : 'active'
            })) as CurrentUser[]);
          }
        } catch {
          /* non-admin session — keep local staff list */
        }

        collectionsHydrated.current = true;
        setApiSyncError(null);
      } catch (error) {
        if (!cancelled) {
          console.warn('[API sync] Backend unavailable; retaining demo seed data.', error);
          setApiSyncError('Backend API chưa kết nối, đang sử dụng dữ liệu demo.');
        }
      }
    };
    void loadApiData();
    return () => { cancelled = true; };
  }, [isStaffLoggedIn]);

  // Real-time server events (SSE): keep the main lists + inbox fresh without reload.
  useEffect(() => {
    if (!isStaffLoggedIn) return;
    let refetchTimer: ReturnType<typeof setTimeout> | null = null;
    const refetchMain = () => {
      if (refetchTimer) clearTimeout(refetchTimer);
      refetchTimer = setTimeout(async () => {
        try {
          const [p, a, t, r, f, c, inv, dash] = await Promise.all([
            apiClient.patients.list({ limit: 500 }),
            apiClient.appointments.list(),
            apiClient.tickets.list(),
            apiClient.recalls.list().catch(() => ({ recalls: [] as any[] })),
            apiClient.followUps.list().catch(() => ({ followUps: [] as any[] })),
            apiClient.csat.getFeedbacks().catch(() => ({ feedbacks: [] as any[] })),
            apiClient.invoices.list().catch(() => ({ invoices: [] as any[] })),
            apiClient.analytics.getDashboard().catch(() => null as any)
          ]);
          setPatients((p.patients || []).map(mapApiPatient));
          setAppointments((a.appointments || []).map(mapApiAppointment));
          setSupportTickets((t.tickets || []) as SupportTicket[]);
          setRecalls(r.recalls || []);
          setFollowUps(f.followUps || []);
          setCsatFeedbacks(c.feedbacks || []);
          setInvoices(inv.invoices || []);
          if (dash) setDashboardKpis(dash);
        } catch { /* ignore */ }
      }, 500);
    };
    const refetchConversations = async () => {
      try {
        const r = await apiClient.conversations.list();
        setConversations(r.conversations || []);
      } catch { /* ignore */ }
    };

    const es = apiClient.stream((evt) => {
      if (!evt || !evt.type) return;
      if (evt.type === 'store') {
        if (typeof evt.path === 'string' && evt.path.startsWith('/api/collections')) return;
        refetchMain();
      } else if (evt.type === 'conversation') {
        void refetchConversations();
      } else if (evt.type === 'message') {
        void refetchConversations();
        if (evt.conversationId && evt.conversationId === selectedConvRef.current && evt.message) {
          setInboxMessages(prev => (prev.some(m => m.id === evt.message.id) ? prev : [...prev, evt.message]));
        }
      } else if (evt.type === 'incoming-call') {
        setIncomingCall({ call: evt.call, patient: evt.patient, at: Date.now() });
      } else if (evt.type === 'reminder') {
        showToast('Đã gửi nhắc lịch khám tự động cho khách hàng.');
      }
    });

    return () => {
      if (refetchTimer) clearTimeout(refetchTimer);
      es?.close();
    };
  }, [isStaffLoggedIn]);

  const openConversation = async (id: string) => {
    setSelectedConversationId(id);
    setLoadingInboxMessages(true);
    try {
      const r = await apiClient.conversations.messages(id);
      setInboxMessages(r.messages || []);
      setConversations(prev => prev.map(c => (c.id === id ? { ...c, unreadCount: 0 } : c)));
    } catch {
      setInboxMessages([]);
    } finally {
      setLoadingInboxMessages(false);
    }
  };

  const sendInboxReply = async (text: string) => {
    if (!selectedConversationId) return;
    try {
      const r = await apiClient.conversations.reply(selectedConversationId, text);
      if (r.message) setInboxMessages(prev => [...prev, r.message]);
      if (!r.success) showToast(`Gửi thất bại: ${r.error || 'lỗi provider'}`);
      else if (r.mode === 'simulated') showToast('Đã gửi (giả lập — chưa nối provider thật)');
    } catch (e: any) {
      showToast(e?.message || 'Không gửi được tin nhắn');
    }
  };

  const simulateInbound = async (channel: 'zalo' | 'facebook', senderName: string, text: string) => {
    try {
      await apiClient.conversations.simulate(channel, { externalUserId: `${channel}-demo-${Date.now() % 100000}`, senderName, text });
    } catch (e: any) {
      showToast(e?.message || 'Không tạo được tin mô phỏng');
    }
  };

  // Auto-persist every generic module collection back to the backend on change.
  usePersistedCollection('branches', branches, collectionsHydrated);
  usePersistedCollection('b2bContracts', b2bContracts, collectionsHydrated);
  usePersistedCollection('b2cDeals', b2cDeals, collectionsHydrated);
  usePersistedCollection('campaigns', campaigns, collectionsHydrated);
  usePersistedCollection('automationRules', automationRules, collectionsHydrated);
  usePersistedCollection('referrals', referrals, collectionsHydrated);
  usePersistedCollection('partners', partners, collectionsHydrated);
  usePersistedCollection('partnerPayouts', partnerPayouts, collectionsHydrated);
  usePersistedCollection('interactions', interactions, collectionsHydrated);
  usePersistedCollection('medicalServices', medicalServices, collectionsHydrated);
  usePersistedCollection('medicalPackages', medicalPackages, collectionsHydrated);
  usePersistedCollection('doctors', doctors, collectionsHydrated);

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

  // Staff Account Management Handlers — persisted in auth_users via /api/staff
  const handleAddStaff = async (newStaff: CurrentUser) => {
    try {
      const { staff } = await apiClient.staff.create({
        email: newStaff.email,
        password: newStaff.password || 'VitHospital@2026',
        name: newStaff.name,
        role: newStaff.role,
        roleTitle: newStaff.roleTitle,
        staffCode: newStaff.staffCode || null,
        department: newStaff.department || null,
        branchId: newStaff.branchId && newStaff.branchId !== 'ALL' ? newStaff.branchId : null,
        status: newStaff.status,
        phone: newStaff.phone || null,
        twoFactorEnabled: !!newStaff.twoFactorEnabled
      });
      const created: CurrentUser = { ...newStaff, id: staff.id, staffCode: staff.staffCode, roleTitle: staff.roleTitle };
      setStaffUsers(prev => [created, ...prev]);
      showToast(`Đã cấp tài khoản đăng nhập cho: ${created.name} (${created.staffCode})!`);
    } catch (error: any) {
      console.warn('[API] Không thể tạo tài khoản trên máy chủ.', error);
      setStaffUsers(prev => [newStaff, ...prev]);
      showToast(error?.message || 'Máy chủ chưa sẵn sàng; tài khoản chỉ lưu trong phiên hiện tại.');
    }
  };

  const handleUpdateStaff = async (updatedStaff: CurrentUser) => {
    try {
      await apiClient.staff.update(updatedStaff.id, {
        name: updatedStaff.name,
        role: updatedStaff.role,
        roleTitle: updatedStaff.roleTitle,
        staffCode: updatedStaff.staffCode || null,
        department: updatedStaff.department || null,
        branchId: updatedStaff.branchId && updatedStaff.branchId !== 'ALL' ? updatedStaff.branchId : null,
        status: updatedStaff.status,
        phone: updatedStaff.phone || null,
        twoFactorEnabled: !!updatedStaff.twoFactorEnabled,
        ...(updatedStaff.password ? { password: updatedStaff.password } : {})
      });
    } catch (error) {
      console.warn('[API] Không thể cập nhật tài khoản trên máy chủ.', error);
    }
    setStaffUsers(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));
    if (currentStaffUser.id === updatedStaff.id) {
      setCurrentStaffUser(updatedStaff);
      setCurrentRole(updatedStaff.role);
    }
    showToast(`Đã cập nhật thông tin tài khoản: ${updatedStaff.name}`);
  };

  // Save new Patient from full Form
  const handleSavePatient = async (newPat: Patient) => {
    try {
      const response = await apiClient.patients.create(newPat);
      const savedPatient = mapApiPatient(response.patient);
      setPatients(prev => [savedPatient, ...prev.filter(patient => patient.id !== savedPatient.id)]);
      setSelectedPatientId(savedPatient.id);
      showToast(`Đã lưu hồ sơ khách hàng lên máy chủ: ${savedPatient.name} (${savedPatient.pid})!`);
    } catch (error) {
      console.warn('[API] Không thể lưu bệnh nhân, dùng state cục bộ.', error);
      setPatients(prev => [newPat, ...prev]);
      setSelectedPatientId(newPat.id);
      showToast('Backend chưa sẵn sàng; hồ sơ mới chỉ được lưu trong phiên hiện tại.');
    }
  };

  // Appointment Status Updates
  const handleUpdateAppointmentStatus = async (appointmentId: string, newStatus: AppointmentStatus) => {
    try {
      const response = await apiClient.appointments.updateStatus(appointmentId, newStatus);
      const updated = mapApiAppointment(response.appointment);
      setAppointments(prev => prev.map(appointment => appointment.id === appointmentId ? updated : appointment));
      showToast(`Đã cập nhật trạng thái lịch khám trên máy chủ: ${newStatus}`);
    } catch (error) {
      console.warn('[API] Không thể cập nhật lịch hẹn, dùng state cục bộ.', error);
      setAppointments(prev => prev.map(appointment => appointment.id === appointmentId ? { ...appointment, status: newStatus } : appointment));
      showToast('Backend chưa sẵn sàng; trạng thái chỉ được cập nhật trong phiên hiện tại.');
    }
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
  const handleSaveAppointment = async (newApt: Omit<Appointment, 'id' | 'code'>) => {
    const apiPayload = {
      ...newApt,
      date: newApt.appointmentDate,
      timeSlot: newApt.timeSlot,
      channel: newApt.bookingChannel,
      estimatedCost: newApt.fee
    };
    try {
      const response = await apiClient.appointments.create(apiPayload);
      const savedAppointment = mapApiAppointment(response.appointment);
      setAppointments(prev => [savedAppointment, ...prev.filter(appointment => appointment.id !== savedAppointment.id)]);
      showToast(`Đã lưu lịch khám lên máy chủ cho BN ${savedAppointment.patientName}!`);
    } catch (error) {
      console.warn('[API] Không thể lưu lịch hẹn, dùng state cục bộ.', error);
      const localAppointment: Appointment = { ...newApt, id: `APT-${Date.now()}`, code: `LK-${Math.floor(1000 + Math.random() * 9000)}` };
      setAppointments(prev => [localAppointment, ...prev]);
      showToast('Backend chưa sẵn sàng; lịch hẹn chỉ được lưu trong phiên hiện tại.');
    }
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
  const handleUpdateTicketStatus = async (ticketId: string, status: TicketStatus, notes?: string) => {
    try {
      const response = await apiClient.tickets.update(ticketId, { status, resolutionNotes: notes });
      setSupportTickets(prev => prev.map(ticket => ticket.id === ticketId ? response.ticket as SupportTicket : ticket));
      showToast(`Đã cập nhật Ticket trên máy chủ: ${status}`);
    } catch (error) {
      console.warn('[API] Không thể cập nhật ticket, dùng state cục bộ.', error);
      setSupportTickets(prev => prev.map(ticket => ticket.id === ticketId ? { ...ticket, status, resolutionNotes: notes || ticket.resolutionNotes } : ticket));
      showToast('Backend chưa sẵn sàng; ticket chỉ được cập nhật trong phiên hiện tại.');
    }
  };

  // Shared: create a support ticket (portal / care view) — persisted via API.
  const handleCreateTicket = async (t: Omit<SupportTicket, 'id'>) => {
    try {
      const res = await apiClient.tickets.create(t as any);
      setSupportTickets(prev => [res.ticket as SupportTicket, ...prev]);
    } catch {
      setSupportTickets(prev => [{ ...(t as any), id: `TK-${Date.now()}` } as SupportTicket, ...prev]);
    }
    showToast('Đã ghi nhận yêu cầu / khiếu nại vào hệ thống CSKH & Quản trị SLA!');
  };

  // Reception check-in: assign an electronic queue number + print QR ticket.
  const handleCheckIn = async (appointmentId: string) => {
    try {
      const res = await apiClient.appointments.checkin(appointmentId);
      setAppointments(prev => prev.map(a => a.id === appointmentId ? mapApiAppointment(res.appointment) : a));
      setCheckInTicket(res.ticket);
      showToast(`Đã cấp số thứ tự ${res.ticket.queueNumber} cho ${res.ticket.patientName}.`);
    } catch (e: any) {
      showToast(e?.message || 'Không thể tiếp đón lịch hẹn này.');
    }
  };

  const refreshPortalData = async () => {
    try {
      const me = await apiClient.portal.me();
      setPortalData({ appointments: me.appointments || [], invoices: me.invoices || [], recalls: me.recalls || [] });
    } catch { /* ignore */ }
  };

  // Portal (patient-authenticated) self-service — writes with the portal token.
  const handlePortalBooking = async (aptData: any) => {
    try {
      await apiClient.portal.book({ ...aptData, date: aptData.appointmentDate || aptData.date });
      await refreshPortalData();
      showToast('Đặt lịch thành công! Yêu cầu đã được ghi nhận.');
    } catch (e: any) {
      showToast(e?.message || 'Không đặt được lịch.');
    }
  };
  const handlePortalTicket = async (t: any) => {
    try {
      await apiClient.portal.submitTicket(t);
      showToast('Đã gửi phản ánh tới bộ phận CSKH.');
    } catch (e: any) {
      showToast(e?.message || 'Không gửi được phản ánh.');
    }
  };

  // Shared: patient self-booking from the portal — persisted via API.
  const handleSelfBooking = async (aptData: any) => {
    try {
      const res = await apiClient.appointments.create({
        ...aptData,
        date: aptData.appointmentDate || aptData.date,
        timeSlot: aptData.timeSlot,
        channel: aptData.bookingChannel || 'Mobile App',
        estimatedCost: aptData.fee
      });
      setAppointments(prev => [mapApiAppointment(res.appointment), ...prev]);
    } catch {
      setAppointments(prev => [{ ...aptData, id: `APT-SELF-${Date.now()}`, code: `LK-PORTAL-${Math.floor(1000 + Math.random() * 9000)}` }, ...prev]);
    }
    showToast('Đặt lịch thành công! Yêu cầu đã chuyển sang hàng đợi CSKH gọi lại.');
  };

  // Selected Patient Details for 360 View
  const selectedPatient = (patients || []).find(p => p && p.id === selectedPatientId) || null;
  // Doctors come from the catalog once configured; fall back to the demo list.
  const effectiveDoctors: any[] = doctors.length ? doctors : mockDoctors;

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
            onLoginSuccess={async (patient) => {
              setCurrentCustomerPatient(patient);
              setIsCustomerLoggedIn(true);
              showToast(`Chào mừng Quý khách ${patient.name} (${patient.pid || ''}) đã đăng nhập sổ khám!`);
              try {
                const me = await apiClient.portal.me();
                setPortalData({ appointments: me.appointments || [], invoices: me.invoices || [], recalls: me.recalls || [] });
                if (me.patient) setCurrentCustomerPatient(mapApiPatient(me.patient));
              } catch { /* portal data optional */ }
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
          <Suspense fallback={<ViewLoading />}>
            <PatientPortalView
              patients={patients}
              doctors={effectiveDoctors}
              branches={mockBranches}
              tickets={supportTickets}
              appointments={portalData?.appointments ?? appointments}
              currentPatientOverride={currentCustomerPatient}
              onAddNewTicket={handlePortalTicket}
              onBookSelfAppointment={handlePortalBooking}
              onSelectPatient={(id) => setSelectedPatientId(id)}
              onCustomerLogout={() => {
                apiClient.portal.logout();
                setPortalData(null);
                setIsCustomerLoggedIn(false);
                showToast('Đã đăng xuất khỏi Cổng Khách Hàng');
              }}
            />
          </Suspense>
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

      {/* Inbound call screen-pop */}
      {incomingCall && (
        <div className="fixed top-4 right-4 z-[60] w-80 bg-white border-2 border-emerald-500 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-top-5">
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> CUỘC GỌI ĐẾN
          </div>
          <div className="text-sm font-bold text-slate-900">{incomingCall.patient?.name || incomingCall.call?.patientName || 'Khách chưa có hồ sơ'}</div>
          <div className="text-xs text-slate-500 font-mono">{incomingCall.call?.patientPhone}</div>
          {incomingCall.patient && (
            <div className="text-[11px] text-slate-500 mt-1">
              {incomingCall.patient.pid} · {incomingCall.patient.membership?.tier || incomingCall.patient.loyaltyTier || 'Standard'} · {incomingCall.patient.totalVisits || 0} lượt khám
            </div>
          )}
          <div className="flex gap-2 mt-3">
            {incomingCall.patient?.id && (
              <button
                onClick={() => { setSelectedPatientId(incomingCall.patient.id); setIncomingCall(null); }}
                className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Mở hồ sơ 360°
              </button>
            )}
            <button onClick={() => setIncomingCall(null)} className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold cursor-pointer">Ẩn</button>
          </div>
        </div>
      )}

      {/* Check-in queue ticket */}
      {checkInTicket && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]" onClick={() => setCheckInTicket(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center space-y-2" onClick={e => e.stopPropagation()}>
            <div className="text-xs font-bold text-slate-400">PHIẾU TIẾP ĐÓN</div>
            <div className="text-5xl font-black text-blue-700 tracking-tight">{checkInTicket.queueNumber}</div>
            <div className="text-sm font-bold text-slate-800">{checkInTicket.patientName}</div>
            <div className="text-xs text-slate-500">{checkInTicket.department} · {checkInTicket.doctorName || 'Chưa phân bác sĩ'}</div>
            <div className="text-xs text-slate-500">{checkInTicket.date} · {checkInTicket.timeSlot}</div>
            <img src={checkInTicket.qrUrl} alt="QR tra cứu STT" className="w-40 h-40 mx-auto my-1" />
            <div className="text-[11px] text-slate-400">Quét mã QR để theo dõi số thứ tự trên điện thoại</div>
            <button onClick={() => window.print()} className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer">In phiếu</button>
            <button onClick={() => setCheckInTicket(null)} className="w-full py-2 bg-slate-100 rounded-lg text-xs font-bold cursor-pointer">Đóng</button>
          </div>
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
        <Suspense fallback={<ViewLoading />}>
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
                invoices={invoices}
                csatFeedbacks={csatFeedbacks}
                recalls={recalls}
                serverKpis={dashboardKpis}
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
                doctors={effectiveDoctors}
                branches={branches}
                patients={patients}
                currentBranchId={currentBranchId}
                onUpdateStatus={handleUpdateAppointmentStatus}
                onCheckIn={handleCheckIn}
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
                recalls={recalls}
                csatFeedbacks={csatFeedbacks}
                followUps={followUps}
                onUpdateTicketStatus={handleUpdateTicketStatus}
                onAddNewTicket={handleCreateTicket}
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

            {/* 6b. Omnichannel Inbox (Zalo OA + Facebook) */}
            {activeTab === 'inbox' && (
              <OmnichannelInboxView
                conversations={conversations}
                messages={inboxMessages}
                selectedId={selectedConversationId}
                loadingMessages={loadingInboxMessages}
                onSelectConversation={openConversation}
                onSendReply={sendInboxReply}
                onSimulateInbound={simulateInbound}
                onRefresh={async () => {
                  try {
                    const r = await apiClient.conversations.list();
                    setConversations(r.conversations || []);
                  } catch { /* ignore */ }
                }}
              />
            )}

            {/* 6c. Catalog — Packages, Services, Doctors */}
            {activeTab === 'catalog' && (
              <CatalogView
                services={medicalServices}
                packages={medicalPackages}
                doctors={doctors}
                onSaveServices={setMedicalServices}
                onSavePackages={setMedicalPackages}
                onSaveDoctors={setDoctors}
              />
            )}

            {/* 6d. Billing — Invoices & VietQR */}
            {activeTab === 'billing' && (
              <BillingView
                invoices={invoices}
                patients={patients}
                services={medicalServices}
                onChanged={async () => {
                  try {
                    const r = await apiClient.invoices.list();
                    setInvoices(r.invoices || []);
                  } catch { /* ignore */ }
                }}
              />
            )}

            {/* 7. Patient Portal & Self Booking */}
            {activeTab === 'portal' && (
              <PatientPortalView
                patients={patients}
                doctors={effectiveDoctors}
                branches={mockBranches}
                tickets={supportTickets}
                appointments={appointments}
                onAddNewTicket={handleCreateTicket}
                onBookSelfAppointment={handleSelfBooking}
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
        </Suspense>

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
        onUpdatePatientTier={async (patId, newTier, pointsDelta = 0) => {
          const target = patients.find(p => p.id === patId);
          const updatedPoints = Math.max(0, (target?.membership?.points || 0) + pointsDelta);
          setPatients(prev => prev.map(p => p.id === patId
            ? { ...p, membership: { ...p.membership, tier: newTier, points: updatedPoints } }
            : p));
          try {
            await apiClient.patients.update(patId, { loyaltyTier: newTier, loyaltyPoints: updatedPoints });
          } catch {
            showToast('Máy chủ chưa sẵn sàng; nâng hạng chỉ lưu trong phiên hiện tại.');
            return;
          }
          showToast(`Đã nâng hạng sang [${newTier}] (${pointsDelta >= 0 ? `+${pointsDelta}` : pointsDelta} điểm) — đã lưu.`);
        }}
      />

      {/* AI Assistant Modal (Gemini 2.5 Flash) */}
      <AiAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        patients={patients}
        doctors={effectiveDoctors}
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
        doctors={effectiveDoctors}
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

