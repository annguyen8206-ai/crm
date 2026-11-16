/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { apiClient } from './utils/apiClient';
import { getRoleConfig, isTabAllowedForRole, can as roleCan, type Permission } from './utils/rbac';
import type { ActiveTab, Branch, BranchId, CurrentUser } from './types';
import { LoginView } from './fmcg/LoginView';
import { AppNavbar } from './fmcg/AppNavbar';
import { Loading, Button } from './fmcg/ui';

// Tab views are code-split so the first load only ships the shell + login.
const DashboardView = lazy(() => import('./fmcg/DashboardView').then(m => ({ default: m.DashboardView })));
const CustomersView = lazy(() => import('./fmcg/CustomersView').then(m => ({ default: m.CustomersView })));
const OrdersView = lazy(() => import('./fmcg/OrdersView').then(m => ({ default: m.OrdersView })));
const ProductsView = lazy(() => import('./fmcg/ProductsView').then(m => ({ default: m.ProductsView })));
const SalesView = lazy(() => import('./fmcg/SalesView').then(m => ({ default: m.SalesView })));
const MarketingView = lazy(() => import('./fmcg/MarketingView').then(m => ({ default: m.MarketingView })));
const LoyaltyView = lazy(() => import('./fmcg/LoyaltyView').then(m => ({ default: m.LoyaltyView })));
const CareView = lazy(() => import('./fmcg/CareView').then(m => ({ default: m.CareView })));
const OmnichannelInboxView = lazy(() => import('./components/OmnichannelInboxView').then(m => ({ default: m.OmnichannelInboxView })));
const StaffAdminModal = lazy(() => import('./fmcg/AdminModals').then(m => ({ default: m.StaffAdminModal })));
const BranchAdminModal = lazy(() => import('./fmcg/AdminModals').then(m => ({ default: m.BranchAdminModal })));
const IntegrationSettingsModal = lazy(() => import('./components/IntegrationSettingsModal').then(m => ({ default: m.IntegrationSettingsModal })));

export default function App() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [currentBranchId, setCurrentBranchId] = useState<BranchId>('ALL');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staff, setStaff] = useState<CurrentUser[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<'staff' | 'branches' | 'integrations' | null>(null);

  // Omnichannel inbox (Zalo OA + Facebook) — realtime via SSE
  const [conversations, setConversations] = useState<any[]>([]);
  const [inboxMessages, setInboxMessages] = useState<any[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [loadingInboxMessages, setLoadingInboxMessages] = useState(false);
  const selectedConvRef = useRef<string | null>(null);
  selectedConvRef.current = selectedConversationId;

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const can = useCallback((perm: string) => roleCan(user?.role, perm as Permission), [user?.role]);

  const loadShared = useCallback(async () => {
    const [col, notif, conv] = await Promise.all([
      apiClient.collections.get('branches').catch(() => ({ items: [] as any[] })),
      apiClient.notifications.list().catch(() => ({ notifications: [] as any[] })),
      apiClient.conversations.list().catch(() => ({ conversations: [] as any[] })),
    ]);
    setBranches((col.items || []) as Branch[]);
    setNotifications((notif as any).notifications || []);
    setConversations((conv as any).conversations || []);
  }, []);

  const loadStaff = useCallback(async () => {
    try {
      const { staff: list } = await apiClient.staff.list();
      setStaff((list || []).map((s: any) => ({
        id: s.id, name: s.name, email: s.email, staffCode: s.staffCode, role: s.role, roleTitle: s.roleTitle,
        department: s.department || '', branchId: s.branchId || 'ALL', phone: s.phone || '',
        twoFactorEnabled: !!s.twoFactorEnabled, status: s.status === 'suspended' ? 'suspended' : 'active',
      })));
    } catch { /* non-admin session */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadShared();
    if (getRoleConfig(user.role).roleKey === 'admin') void loadStaff();
  }, [user, loadShared, loadStaff]);

  // Server-sent events: any write elsewhere refreshes the open view (debounced).
  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setRefreshKey(k => k + 1);
        apiClient.notifications.list().then(r => setNotifications((r as any).notifications || [])).catch(() => undefined);
      }, 800);
    };
    const es = apiClient.stream(evt => {
      if (!evt?.type) return;
      if (evt.type === 'store') bump();
      else if (evt.type === 'conversation' || evt.type === 'message') {
        apiClient.conversations.list().then(r => setConversations(r.conversations || [])).catch(() => undefined);
        if (evt.type === 'message' && evt.conversationId === selectedConvRef.current && evt.message) {
          setInboxMessages(prev => (prev.some(m => m.id === evt.message.id) ? prev : [...prev, evt.message]));
        }
      } else if (evt.type === 'incoming-call') {
        notify(`Cuộc gọi đến: ${evt.patient?.name || evt.call?.patientPhone || 'khách mới'}`);
      }
    });
    return () => { if (timer) clearTimeout(timer); es?.close(); };
  }, [user, notify]);

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

  const sendInboxReply = async (text: string, attachments: Array<{ type: string; url: string; name?: string }> = []) => {
    if (!selectedConversationId) return;
    try {
      const r = await apiClient.conversations.reply(selectedConversationId, text, attachments);
      if (r.message) setInboxMessages(prev => (prev.some(m => m.id === r.message.id) ? prev : [...prev, r.message]));
      if (!r.success) notify(`Gửi thất bại: ${r.error || 'lỗi provider'}`);
      else if (r.mode === 'simulated') notify('Đã gửi (giả lập — chưa nối provider thật)');
    } catch (e: any) {
      notify(e?.message || 'Không gửi được tin nhắn');
    }
  };

  const logout = () => {
    apiClient.auth.logout();
    setUser(null);
    setConversations([]); setInboxMessages([]); setSelectedConversationId(null);
    notify('Đã đăng xuất');
  };

  const toastEl = toast && (
    <div className="fixed bottom-5 right-5 left-5 sm:left-auto z-[60] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium max-w-md" role="status">
      {toast}
    </div>
  );

  if (!user) {
    return (
      <>
        {toastEl}
        <LoginView onLoginSuccess={u => {
          setUser(u);
          if (u.branchId && u.branchId !== 'ALL') setCurrentBranchId(u.branchId);
          setActiveTab(getRoleConfig(u.role).defaultTab);
          notify(`Xin chào ${u.name}!`);
        }} />
      </>
    );
  }

  const role = getRoleConfig(user.role);
  const viewProps = { notify, can, userName: user.name, refreshKey };
  const unreadInbox = conversations.reduce((n, c) => n + (c.unreadCount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      {toastEl}
      <AppNavbar
        activeTab={activeTab}
        onTab={setActiveTab}
        user={user}
        branches={branches}
        currentBranchId={currentBranchId}
        onBranch={setCurrentBranchId}
        notifications={notifications}
        unreadInbox={unreadInbox}
        onLogout={logout}
        onOpenStaff={() => setModal('staff')}
        onOpenBranches={() => setModal('branches')}
        onOpenIntegrations={() => setModal('integrations')}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <Suspense fallback={<Loading />}>
          {!isTabAllowedForRole(activeTab, user.role) ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-lg mx-auto">
              <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-slate-900 mb-1">Bạn không có quyền truy cập mục này</h2>
              <p className="text-sm text-slate-500 mb-4">Vai trò <b>{role.title}</b> không được phân quyền cho phân hệ này.</p>
              <Button onClick={() => setActiveTab(role.defaultTab)}>Về trang chính</Button>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <DashboardView {...viewProps} onNavigate={t => isTabAllowedForRole(t, user.role) && setActiveTab(t)} />}
              {activeTab === 'customers' && <CustomersView {...viewProps} />}
              {activeTab === 'orders' && <OrdersView {...viewProps} />}
              {activeTab === 'products' && <ProductsView {...viewProps} />}
              {activeTab === 'sales' && <SalesView {...viewProps} />}
              {activeTab === 'marketing' && <MarketingView {...viewProps} />}
              {activeTab === 'loyalty' && <LoyaltyView {...viewProps} />}
              {activeTab === 'care' && <CareView {...viewProps} />}
              {activeTab === 'inbox' && (
                <OmnichannelInboxView
                  conversations={conversations}
                  messages={inboxMessages}
                  selectedId={selectedConversationId}
                  loadingMessages={loadingInboxMessages}
                  onSelectConversation={openConversation}
                  onSendReply={sendInboxReply}
                  onUploadAttachment={(file: File) => {
                    if (!selectedConversationId) return Promise.reject(new Error('Chưa chọn hội thoại'));
                    return apiClient.conversations.uploadAttachment(selectedConversationId, file);
                  }}
                  onSimulateInbound={async (channel: 'zalo' | 'facebook', senderName: string, text: string) => {
                    try {
                      await apiClient.conversations.simulate(channel, { externalUserId: `${channel}-demo-${Date.now() % 100000}`, senderName, text });
                    } catch (e: any) { notify(e?.message || 'Không tạo được tin mô phỏng'); }
                  }}
                  onRefresh={async () => {
                    try { const r = await apiClient.conversations.list(); setConversations(r.conversations || []); } catch { /* ignore */ }
                  }}
                />
              )}
            </>
          )}
        </Suspense>
      </main>

      <Suspense fallback={null}>
        {modal === 'staff' && (
          <StaffAdminModal open onClose={() => setModal(null)} staff={staff} branches={branches} notify={notify} onChanged={() => void loadStaff()} />
        )}
        {modal === 'branches' && (
          <BranchAdminModal open onClose={() => setModal(null)} branches={branches} onSave={async next => {
            setBranches(next);
            try { await apiClient.collections.save('branches', next); notify('Đã lưu chi nhánh'); } catch (e: any) { notify(e?.message || 'Không lưu được chi nhánh'); }
          }} />
        )}
        {modal === 'integrations' && <IntegrationSettingsModal isOpen onClose={() => setModal(null)} />}
      </Suspense>
    </div>
  );
}
