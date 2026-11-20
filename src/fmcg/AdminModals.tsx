import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import { ROLE_OPTIONS, DEFAULT_STAFF_ROLE, getRoleConfig, roleKeyOf, roleLabel } from '../utils/rbac';
import { isRoleKey } from '../../server/rbac';
import { loadAssignees } from './RepSelect';
import type { Branch, CurrentUser } from '../types';
import { Modal, Field, Input, Select, Button, Badge, Empty, Table, Th, Td, useAction } from './ui';

// ------------------------------------------------------------------ staff
export function StaffAdminModal({ open, onClose, staff, branches, onChanged, notify }: {
  open: boolean; onClose: () => void; staff: CurrentUser[]; branches: Branch[]; onChanged: () => void; notify: (m: string) => void;
}) {
  const [editing, setEditing] = useState<Partial<CurrentUser> | null>(null);
  const { busy, run } = useAction(notify);

  const save = async () => {
    const s = editing!;
    if (!s.name?.trim() || !s.email?.trim()) return notify('Nhập họ tên và email');
    // Older accounts hold a free-text role: saving converts it to the role key shown in the picker.
    const role = roleKeyOf(s.role || DEFAULT_STAFF_ROLE);
    const payload = {
      name: s.name.trim(), role, roleTitle: s.roleTitle?.trim() || roleLabel(role),
      staffCode: s.staffCode || null, department: s.department || null, phone: s.phone || null,
      branchId: s.branchId && s.branchId !== 'ALL' ? s.branchId : null, status: s.status || 'active',
      twoFactorEnabled: !!s.twoFactorEnabled,
    };
    const r = s.id
      ? await run(() => apiClient.staff.update(s.id!, { ...payload, ...(s.password ? { password: s.password } : {}) }), 'Đã cập nhật tài khoản')
      : await run(() => apiClient.staff.create({ ...payload, email: s.email!.trim(), password: s.password || '' } as any), 'Đã tạo tài khoản');
    if (r) { setEditing(null); onChanged(); void loadAssignees(true); }
  };

  return (
    <Modal open={open} onClose={onClose} wide title="Tài khoản nhân viên">
      {editing ? (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Họ tên" required><Input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Email đăng nhập" required><Input type="email" disabled={!!editing.id} value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="Vai trò (quyết định quyền)" required
              hint={editing.role && !isRoleKey(editing.role) ? `Tài khoản cũ ghi "${editing.role}" — đang hiểu là vai trò này. Bấm Lưu để chốt.` : undefined}>
              <Select value={roleKeyOf(editing.role || DEFAULT_STAFF_ROLE)} onChange={e => setEditing({ ...editing, role: e.target.value })}>
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
            </Field>
            <Field label="Chức danh" hint="Chỉ để hiển thị, không ảnh hưởng quyền">
              <Input placeholder={roleLabel(editing.role || DEFAULT_STAFF_ROLE)} value={editing.roleTitle || ''} onChange={e => setEditing({ ...editing, roleTitle: e.target.value })} />
            </Field>
            <Field label="Mã nhân viên"><Input value={editing.staffCode || ''} onChange={e => setEditing({ ...editing, staffCode: e.target.value })} /></Field>
            <Field label="Số điện thoại" hint="Dùng nhận OTP qua Zalo/SMS"><Input value={editing.phone || ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} /></Field>
            <Field label="Phòng ban / Vùng"><Input value={editing.department || ''} onChange={e => setEditing({ ...editing, department: e.target.value })} /></Field>
            <Field label="Chi nhánh" hint="Giới hạn dữ liệu nhân viên được xem">
              <Select value={editing.branchId || 'ALL'} onChange={e => setEditing({ ...editing, branchId: e.target.value })}>
                <option value="ALL">Toàn công ty</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <Field label={editing.id ? 'Đặt lại mật khẩu' : 'Mật khẩu'} required={!editing.id} hint="Tối thiểu 8 ký tự"><Input type="password" autoComplete="new-password" value={editing.password || ''} onChange={e => setEditing({ ...editing, password: e.target.value })} /></Field>
            <Field label="Trạng thái"><Select value={editing.status || 'active'} onChange={e => setEditing({ ...editing, status: e.target.value as any })}><option value="active">Đang hoạt động</option><option value="suspended">Tạm khoá</option></Select></Field>
            <label className="flex items-center gap-2 text-sm mt-6"><input type="checkbox" checked={!!editing.twoFactorEnabled} onChange={e => setEditing({ ...editing, twoFactorEnabled: e.target.checked })} /> Bật xác thực 2 lớp (OTP)</label>
          </div>
          <p className="text-xs text-slate-500">{getRoleConfig(editing.role).description}</p>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditing(null)}>Quay lại</Button><Button disabled={busy} onClick={save}>Lưu</Button></div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end"><Button onClick={() => setEditing({ status: 'active', role: DEFAULT_STAFF_ROLE, branchId: 'ALL' })}><Plus className="w-4 h-4" /> Thêm nhân viên</Button></div>
          {staff.length === 0 ? <Empty text="Chưa có tài khoản" /> : (
            <Table>
              <thead className="border-b border-slate-100"><tr><Th>Nhân viên</Th><Th>Vai trò</Th><Th>Chi nhánh</Th><Th>Trạng thái</Th><Th /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map(s => (
                  <tr key={s.id}>
                    <Td><div className="font-semibold">{s.name}</div><div className="text-xs text-slate-400">{s.email}{s.staffCode ? ` · ${s.staffCode}` : ''}</div></Td>
                    <Td>
                      <span className={`inline-block px-2 py-0.5 rounded-md border text-[11px] font-semibold ${getRoleConfig(s.role).badge}`}>{roleLabel(s.role)}</span>
                      {s.roleTitle && s.roleTitle !== roleLabel(s.role) && <div className="text-xs text-slate-500 mt-0.5">{s.roleTitle}</div>}
                      {s.role && !isRoleKey(s.role) && <div className="text-[11px] text-amber-600 mt-0.5">Tài khoản cũ — mở và bấm Lưu để chốt vai trò</div>}
                    </Td>
                    <Td className="text-xs">{branches.find(b => b.id === s.branchId)?.name || 'Toàn công ty'}</Td>
                    <Td><Badge tone={s.status === 'suspended' ? 'red' : 'green'}>{s.status === 'suspended' ? 'Tạm khoá' : 'Hoạt động'}</Badge></Td>
                    <Td className="text-right"><button onClick={() => setEditing({ ...s, password: '' })} className="p-1.5 text-slate-400 hover:text-blue-600 cursor-pointer" aria-label="Sửa"><Pencil className="w-4 h-4" /></button></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------ branches
const BRANCH_TYPES = [
  { value: 'office', label: 'Văn phòng / Trụ sở' },
  { value: 'region', label: 'Vùng kinh doanh' },
  { value: 'warehouse', label: 'Kho / Trung tâm phân phối' },
  { value: 'showroom', label: 'Cửa hàng / Showroom' },
];

export function BranchAdminModal({ open, onClose, branches, onSave }: {
  open: boolean; onClose: () => void; branches: Branch[]; onSave: (b: Branch[]) => void;
}) {
  const [list, setList] = useState<Branch[]>(branches);
  const [draft, setDraft] = useState<Branch | null>(null);
  useEffect(() => { if (open) { setList(branches); setDraft(null); } }, [open, branches]);

  const commit = () => {
    if (!draft || !draft.name.trim()) return;
    const id = draft.id || draft.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || `br-${Date.now()}`;
    const b = { ...draft, id, shortName: draft.shortName || draft.name };
    const next = list.some(x => x.id === draft.id && draft.id) ? list.map(x => (x.id === draft.id ? b : x)) : [...list, b];
    setList(next); onSave(next); setDraft(null);
  };

  return (
    <Modal open={open} onClose={onClose} title="Chi nhánh / Vùng kinh doanh">
      {draft ? (
        <div className="space-y-3">
          <Field label="Tên" required><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="VD: Vùng Hà Nội" /></Field>
          <Field label="Tên ngắn"><Input value={draft.shortName} onChange={e => setDraft({ ...draft, shortName: e.target.value })} /></Field>
          <Field label="Loại"><Select value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })}>{BRANCH_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
          <Field label="Địa chỉ"><Input value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })} /></Field>
          <Field label="Điện thoại"><Input value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDraft(null)}>Quay lại</Button><Button onClick={commit}>Lưu</Button></div>
        </div>
      ) : (
        <div className="space-y-2">
          {list.length === 0 && <Empty text="Chưa có chi nhánh — dữ liệu dùng chung toàn công ty" />}
          {list.map(b => (
            <div key={b.id} className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2">
              <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{b.name}</div><div className="text-xs text-slate-400 truncate">{BRANCH_TYPES.find(t => t.value === b.type)?.label || b.type} · {b.address || '—'} · mã {b.id}</div></div>
              <button onClick={() => setDraft(b)} className="p-1.5 text-slate-400 hover:text-blue-600 cursor-pointer" aria-label="Sửa"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => { if (confirm(`Xoá ${b.name}?`)) { const next = list.filter(x => x.id !== b.id); setList(next); onSave(next); } }} className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer" aria-label="Xoá"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <Button className="w-full" variant="secondary" onClick={() => setDraft({ id: '', name: '', shortName: '', address: '', phone: '', type: 'region' })}><Plus className="w-4 h-4" /> Thêm chi nhánh</Button>
        </div>
      )}
    </Modal>
  );
}
