import React, { useEffect, useState } from 'react';
import { apiClient } from '../utils/apiClient';
import { Select } from './ui';

/**
 * Sales staff picker. Visits, orders, KPI and targets are all keyed by the
 * person's NAME, so it must be picked from real accounts — a typed name with a
 * typo silently splits one person's numbers in two.
 */
export interface Assignee { id: string; name: string; role: 'sales_rep' | 'sales_manager' | 'self'; branchId: string | null }

let cache: Promise<Assignee[]> | null = null;
/** Loaded once per page session; `refresh` after staff accounts change. */
export function loadAssignees(refresh = false): Promise<Assignee[]> {
  if (!cache || refresh) {
    cache = apiClient.staff.assignees().then(r => r.assignees).catch(() => {
      cache = null; // retry next time
      return [];
    });
  }
  return cache;
}

export function useAssignees(): Assignee[] | null {
  const [list, setList] = useState<Assignee[] | null>(null);
  useEffect(() => {
    let alive = true;
    void loadAssignees().then(l => { if (alive) setList(l); });
    return () => { alive = false; };
  }, []);
  return list;
}

/** True when `name` matches an account in the list (case/space-insensitive). */
export const isKnownRep = (list: Assignee[] | null, name?: string) =>
  !name || !list || list.some(a => a.name.trim().toLowerCase() === name.trim().toLowerCase());

export function RepSelect({ value, onChange, allowEmpty, emptyLabel = '— Chưa giao —', disabled, className }: {
  value?: string; onChange: (name: string) => void; allowEmpty?: boolean; emptyLabel?: string; disabled?: boolean; className?: string;
}) {
  const list = useAssignees();
  const reps = (list || []).filter(a => a.role === 'sales_rep');
  const managers = (list || []).filter(a => a.role === 'sales_manager');
  const self = (list || []).find(a => a.role === 'self');
  const unknown = value && !isKnownRep(list, value);
  return (
    <Select value={value || ''} disabled={disabled || !list} onChange={e => onChange(e.target.value)} className={className}>
      {!list && <option value={value || ''}>Đang tải…</option>}
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {/* Keep an old free-text value visible so saving the form doesn't silently drop it. */}
      {unknown && <option value={value}>{value} (không khớp tài khoản nào)</option>}
      {reps.length > 0 && <optgroup label="Nhân viên kinh doanh">{reps.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}</optgroup>}
      {managers.length > 0 && <optgroup label="Quản lý kinh doanh">{managers.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}</optgroup>}
      {self && <option value={self.name}>{self.name} (tôi)</option>}
    </Select>
  );
}
