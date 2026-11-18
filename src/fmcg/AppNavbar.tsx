import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, Users, ShoppingCart, Package, Briefcase, Megaphone, Award, Headphones, MessageSquare,
  Bell, LogOut, UserCog, Building2, Plug, ChevronDown, Warehouse,
} from 'lucide-react';
import type { ActiveTab, Branch, BranchId, CurrentUser } from '../types';
import { getRoleConfig } from '../utils/rbac';

export const NAV_ITEMS: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'customers', label: 'Khách hàng', icon: Users },
  { id: 'orders', label: 'Đơn hàng & Công nợ', icon: ShoppingCart },
  { id: 'sales', label: 'Kinh doanh', icon: Briefcase },
  { id: 'products', label: 'Sản phẩm', icon: Package },
  { id: 'inventory', label: 'Kho hàng', icon: Warehouse },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'loyalty', label: 'Hội viên', icon: Award },
  { id: 'care', label: 'CSKH', icon: Headphones },
  { id: 'inbox', label: 'Tin nhắn', icon: MessageSquare },
];

export function AppNavbar({
  activeTab, onTab, user, branches, currentBranchId, onBranch, notifications, unreadInbox,
  onLogout, onOpenStaff, onOpenBranches, onOpenIntegrations,
}: {
  activeTab: ActiveTab; onTab: (t: ActiveTab) => void; user: CurrentUser; branches: Branch[];
  currentBranchId: BranchId; onBranch: (b: BranchId) => void; notifications: any[]; unreadInbox: number;
  onLogout: () => void; onOpenStaff: () => void; onOpenBranches: () => void; onOpenIntegrations: () => void;
}) {
  const role = getRoleConfig(user.role);
  const isAdmin = role.roleKey === 'admin';
  const [menu, setMenu] = useState<'user' | 'bell' | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenu(null); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const items = NAV_ITEMS.filter(i => role.allowedTabs.includes(i.id));
  // On phones the tab bar scrolls sideways — keep the current tab in view.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    navRef.current?.querySelector<HTMLElement>('[data-active-tab="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [activeTab]);
  const branchLocked = !!user.branchId && user.branchId !== 'ALL';
  const initials = user.name.split(/\s+/).filter(Boolean).map(p => p[0]).slice(-2).join('').toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="brand-stripe h-1" aria-hidden />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3" ref={ref}>
        <button onClick={() => onTab(role.defaultTab)} className="flex items-center gap-2 shrink-0 cursor-pointer" aria-label="Pure CRM — về trang chính">
          <img src="/brand/logo.png" alt="Pure Essential Oils" className="h-9 w-auto hidden sm:block" />
          <img src="/brand/icon-64.png" alt="Pure Essential Oils" className="h-8 w-8 sm:hidden" />
          <span className="hidden sm:inline text-[11px] font-bold tracking-widest text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-1.5 py-0.5">CRM</span>
        </button>

        {branches.length > 0 && (
          <select
            value={currentBranchId}
            disabled={branchLocked}
            onChange={e => onBranch(e.target.value)}
            className="hidden md:block text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1.5 bg-white max-w-44"
            aria-label="Chi nhánh"
          >
            <option value="ALL">Tất cả chi nhánh</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.shortName || b.name}</option>)}
          </select>
        )}

        <div className="flex-1" />

        <div className="relative">
          <button onClick={() => setMenu(menu === 'bell' ? null : 'bell')} className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer" aria-label="Thông báo">
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{Math.min(99, notifications.length)}</span>}
          </button>
          {menu === 'bell' && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-xl p-2 max-h-96 overflow-y-auto">
              {notifications.length === 0 ? <div className="text-sm text-slate-400 p-4 text-center">Không có thông báo</div> : notifications.slice(0, 20).map((n: any, i: number) => (
                <button
                  key={n.id || i}
                  onClick={() => { setMenu(null); if (role.allowedTabs.includes(n.tab)) onTab(n.tab); }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex gap-2 cursor-pointer"
                >
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.severity === 'high' ? 'bg-rose-500' : n.severity === 'med' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800">{n.title}</span>
                    {n.detail && <span className="block text-xs text-slate-500 truncate">{n.detail}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setMenu(menu === 'user' ? null : 'user')} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100 cursor-pointer">
            <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center ring-2 ring-sun-300">{initials}</span>
            <span className="hidden sm:block text-left leading-tight">
              <span className="block text-xs font-bold text-slate-900 max-w-36 truncate">{user.name}</span>
              <span className="block text-[11px] text-slate-500 max-w-36 truncate">{role.title}</span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
          {menu === 'user' && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <div className="text-sm font-bold">{user.name}</div>
                <div className="text-xs text-slate-500">{user.email}</div>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${role.badge}`}>{role.title}</span>
              </div>
              {isAdmin && (
                <>
                  <MenuItem icon={UserCog} label="Tài khoản nhân viên" onClick={() => { setMenu(null); onOpenStaff(); }} />
                  <MenuItem icon={Building2} label="Chi nhánh / Vùng" onClick={() => { setMenu(null); onOpenBranches(); }} />
                  <MenuItem icon={Plug} label="Kết nối Zalo, SMS, Email" onClick={() => { setMenu(null); onOpenIntegrations(); }} />
                </>
              )}
              <MenuItem icon={LogOut} label="Đăng xuất" danger onClick={() => { setMenu(null); onLogout(); }} />
            </div>
          )}
        </div>
      </div>

      <nav ref={navRef} className="max-w-7xl mx-auto px-2 sm:px-4 flex gap-1 overflow-x-auto no-scrollbar">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTab(id)}
            aria-current={activeTab === id ? 'page' : undefined}
            data-active-tab={activeTab === id ? 'true' : undefined}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${activeTab === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Icon className="w-4 h-4" />{label}
            {id === 'inbox' && unreadInbox > 0 && <span className="ml-0.5 px-1.5 rounded-full bg-rose-500 text-white text-[10px]">{unreadInbox}</span>}
          </button>
        ))}
      </nav>
    </header>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm cursor-pointer ${danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'}`}>
      <Icon className="w-4 h-4" />{label}
    </button>
  );
}

