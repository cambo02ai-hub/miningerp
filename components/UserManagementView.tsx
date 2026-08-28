import React, { useEffect, useMemo, useState } from 'react';
import { Check, Edit3, KeyRound, Lock, Plus, Search, ShieldCheck, Trash2, UserRound, UsersRound, X } from 'lucide-react';
import { authAPI } from '../services/api';
import { formatDateTime } from '../utils/locale';
import {
  AccountStatus,
  AppRole,
  ManagedUser,
  PERMISSION_CATALOG,
  PermissionKey,
  PermissionOverride,
  ROLE_DEFINITIONS,
  ROLE_LABELS,
  hasPermission,
  loadManagedUsers,
  recordRBACAudit,
  saveManagedUsers,
} from '../services/rbac';

interface UserManagementViewProps {
  currentUser: any;
}

type AccountForm = {
  fullName: string;
  username: string;
  email: string;
  employeeId: string;
  department: string;
  site: string;
  role: AppRole;
  status: AccountStatus;
  password: string;
  permissionOverrides: PermissionOverride[];
};

const emptyForm = (): AccountForm => ({
  fullName: '',
  username: '',
  email: '',
  employeeId: '',
  department: '',
  site: '',
  role: 'OPERATOR',
  status: 'ACTIVE',
  password: '',
  permissionOverrides: [],
});

const statusLabels: Record<AccountStatus, string> = {
  ACTIVE: 'အသုံးပြုနိုင်သည်',
  SUSPENDED: 'ယာယီပိတ်ထားသည်',
  PENDING: 'အတည်ပြုရန်ကျန်ရှိသည်',
};

const UserManagementView: React.FC<UserManagementViewProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm());
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [selectedRole, setSelectedRole] = useState<AppRole>('OPERATOR');
  const [searchTerm, setSearchTerm] = useState('');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const allowed = hasPermission(currentUser, 'user_management.manage');

  useEffect(() => {
    setUsers(loadManagedUsers(currentUser));
  }, [currentUser]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [user.fullName, user.username, user.email, user.department, user.site, ROLE_LABELS[user.role]]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [searchTerm, users]);

  const filteredPermissions = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();
    if (!query) return PERMISSION_CATALOG;
    return PERMISSION_CATALOG.filter((permission) =>
      `${permission.moduleLabel} ${permission.actionLabel} ${permission.key}`.toLowerCase().includes(query),
    );
  }, [permissionSearch]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm());
    setNotice(null);
    setIsModalOpen(true);
  };

  const openEdit = (user: ManagedUser) => {
    setEditingUser(user);
    setForm({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      employeeId: user.employeeId,
      department: user.department,
      site: user.site,
      role: user.role,
      status: user.status,
      password: '',
      permissionOverrides: user.permissionOverrides || [],
    });
    setNotice(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!saving) setIsModalOpen(false);
  };

  const updateField = <K extends keyof AccountForm>(field: K, value: AccountForm[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const isPermissionChecked = (permission: PermissionKey): boolean => {
    const rolePermissions = new Set(ROLE_DEFINITIONS.find((role) => role.value === form.role)?.permissions ?? []);
    const override = form.permissionOverrides.find((item) => item.permission === permission);
    if (override?.effect === 'ALLOW') return true;
    if (override?.effect === 'DENY') return false;
    return rolePermissions.has(permission);
  };

  const togglePermissionOverride = (permission: PermissionKey) => {
    setForm((previous) => {
      const rolePermissions = new Set(ROLE_DEFINITIONS.find((role) => role.value === previous.role)?.permissions ?? []);
      const existing = previous.permissionOverrides.find((item) => item.permission === permission);
      const inherited = rolePermissions.has(permission);
      let nextOverrides = previous.permissionOverrides.filter((item) => item.permission !== permission);
      if (!existing) {
        nextOverrides = [...nextOverrides, { permission, effect: inherited ? 'DENY' : 'ALLOW' }];
      } else if (existing.effect === 'DENY' && !inherited) {
        nextOverrides = [...nextOverrides, { permission, effect: 'ALLOW' }];
      }
      return { ...previous, permissionOverrides: nextOverrides };
    });
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);
    if (!form.fullName.trim() || !form.username.trim()) {
      setNotice({ type: 'error', text: 'အမည်နှင့် Username ကို ဖြည့်သွင်းပါ။' });
      return;
    }
    if (!editingUser && form.password.length < 8) {
      setNotice({ type: 'error', text: 'Account အသစ်အတွက် စကားဝှက်သည် အနည်းဆုံး ၈ လုံးရှိရမည်။' });
      return;
    }
    const duplicate = users.some((user) => user.username.toLowerCase() === form.username.trim().toLowerCase() && user.id !== editingUser?.id);
    if (duplicate) {
      setNotice({ type: 'error', text: 'ဤ Username ကို အသုံးပြုပြီးသား ဖြစ်ပါသည်။' });
      return;
    }

    setSaving(true);
    try {
      if (!editingUser) {
        await authAPI.register({
          username: form.username.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          employeeId: form.employeeId.trim(),
          department: form.department.trim(),
          site: form.site.trim(),
          role: form.role,
          status: form.status,
          permissions: ROLE_DEFINITIONS.find((role) => role.value === form.role)?.permissions ?? [],
          permissionOverrides: form.permissionOverrides,
        });
      }

      const now = new Date().toISOString();
      const nextUser: ManagedUser = {
        id: editingUser?.id || `user-${Date.now()}`,
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        employeeId: form.employeeId.trim(),
        department: form.department.trim(),
        site: form.site.trim(),
        role: form.role,
        status: form.status,
        permissionOverrides: form.permissionOverrides,
        createdAt: editingUser?.createdAt || now,
        createdBy: editingUser?.createdBy || currentUser?.username || 'စနစ်အကြီးအကဲ',
        lastLoginAt: editingUser?.lastLoginAt,
      };
      const nextUsers = editingUser
        ? users.map((user) => (user.id === editingUser.id ? nextUser : user))
        : [nextUser, ...users];
      saveManagedUsers(nextUsers);
      setUsers(nextUsers);
      recordRBACAudit(editingUser ? 'USER_UPDATED' : 'USER_CREATED', nextUser.username, `${ROLE_LABELS[nextUser.role]} / ${statusLabels[nextUser.status]}`, currentUser);
      setNotice({ type: 'success', text: editingUser ? 'Account အချက်အလက်များကို ပြင်ဆင်ပြီးပါပြီ။' : 'Account အသစ် ဖန်တီးပြီးပါပြီ။' });
      setIsModalOpen(false);
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'Account ဖန်တီးရာတွင် အမှားတစ်ခု ဖြစ်ပွားခဲ့သည်။' });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = (user: ManagedUser) => {
    if (user.username === currentUser?.username) {
      setNotice({ type: 'error', text: 'လက်ရှိ Super Admin account ကို ကိုယ်တိုင်ပိတ်၍ မရပါ။' });
      return;
    }
    const nextStatus: AccountStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const nextUsers = users.map((item) => (item.id === user.id ? { ...item, status: nextStatus } : item));
    saveManagedUsers(nextUsers);
    setUsers(nextUsers);
    recordRBACAudit(nextStatus === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_SUSPENDED', user.username, statusLabels[nextStatus], currentUser);
    setNotice({ type: 'success', text: `${user.username} account ကို ${statusLabels[nextStatus]} အဖြစ် ပြောင်းပြီးပါပြီ။` });
  };

  const deleteUser = (user: ManagedUser) => {
    if (user.username === currentUser?.username || user.role === 'SUPER_ADMIN') {
      setNotice({ type: 'error', text: 'Super Admin account ကို ဖျက်၍မရပါ။ လုံခြုံရေးအတွက် Suspend ကိုသာ အသုံးပြုပါ။' });
      return;
    }
    if (!window.confirm(`${user.username} account ကို ဖျက်ရန် သေချာပါသလား။`)) return;
    const nextUsers = users.filter((item) => item.id !== user.id);
    saveManagedUsers(nextUsers);
    setUsers(nextUsers);
    recordRBACAudit('USER_DELETED', user.username, 'Account ကို စာရင်းမှ ဖယ်ရှားခဲ့သည်။', currentUser);
    setNotice({ type: 'success', text: 'Account ကို ဖယ်ရှားပြီးပါပြီ။' });
  };

  if (!allowed) {
    return (
      <div className="max-w-2xl mx-auto mt-16 bg-bg-surface border border-status-error-border rounded-jpmonitor-lg p-8 text-center">
        <Lock className="mx-auto text-jpmonitor-red mb-4" size={38} />
        <h2 className="text-xl font-semibold text-text-primary mb-2">ခွင့်ပြုချက် မရှိပါ</h2>
        <p className="text-text-muted">အသုံးပြုသူနှင့် Permission များကို စီမံရန် Super Admin ခွင့်ပြုချက် လိုအပ်ပါသည်။</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-jpmonitor bg-jpmonitor-red-subtle text-jpmonitor-red"><ShieldCheck size={22} /></div>
            <h2 className="text-2xl font-semibold text-text-primary">User နှင့် Permission စီမံခန့်ခွဲမှု</h2>
          </div>
          <p className="text-sm text-text-muted">Super Admin သည် Account ဖန်တီးခြင်း၊ Role သတ်မှတ်ခြင်းနှင့် Permission ခွဲဝေပေးခြင်းကို စီမံနိုင်ပါသည်။</p>
        </div>
        {activeTab === 'users' && (
          <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 bg-jpmonitor-red hover:bg-jpmonitor-red-hover text-white px-4 py-2.5 rounded-jpmonitor font-medium transition-colors">
            <Plus size={18} /> Account အသစ်ဖန်တီးရန်
          </button>
        )}
      </div>

      {notice && (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-jpmonitor border text-sm ${notice.type === 'success' ? 'bg-status-success-bg border-status-success-border text-status-success' : 'bg-jpmonitor-red-subtle border-status-error-border text-jpmonitor-red'}`}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} aria-label="အကြောင်းကြားချက် ပိတ်ရန်"><X size={16} /></button>
        </div>
      )}

      <div className="flex gap-1 border-b border-border">
        <button onClick={() => setActiveTab('users')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'users' ? 'border-jpmonitor-red text-jpmonitor-red' : 'border-transparent text-text-muted hover:text-text-primary'}`}>
          <UsersRound size={16} className="inline mr-2" /> Account များ ({users.length})
        </button>
        <button onClick={() => setActiveTab('roles')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'roles' ? 'border-jpmonitor-red text-jpmonitor-red' : 'border-transparent text-text-muted hover:text-text-primary'}`}>
          <KeyRound size={16} className="inline mr-2" /> Role နှင့် Permission
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="bg-bg-surface border border-border rounded-jpmonitor-lg overflow-hidden">
          <div className="p-4 border-b border-border flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div>
              <h3 className="font-semibold text-text-primary">အသုံးပြုသူစာရင်း</h3>
              <p className="text-xs text-text-muted mt-1">Role နှင့် Account status ကို တစ်နေရာတည်းမှ စီမံပါ။</p>
            </div>
            <div className="relative w-full md:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <label htmlFor="user-management-search" className="sr-only">အသုံးပြုသူ ရှာရန်</label>
              <input id="user-management-search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="အမည်၊ Username၊ Role ရှာရန်..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-bg-elevated text-text-muted border-b border-border">
                <tr>
                  <th className="px-5 py-3 font-medium">အသုံးပြုသူ</th>
                  <th className="px-5 py-3 font-medium">ဌာန / လုပ်ငန်းခွင်</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">အခြေအနေ</th>
                  <th className="px-5 py-3 font-medium">နောက်ဆုံးဝင်ရောက်မှု</th>
                  <th className="px-5 py-3 font-medium text-right">လုပ်ဆောင်ချက်</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-bg-elevated transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-jpmonitor-red-subtle text-jpmonitor-red flex items-center justify-center"><UserRound size={17} /></div>
                        <div><p className="font-medium text-text-primary">{user.fullName}</p><p className="text-xs text-text-muted">@{user.username}{user.email ? ` · ${user.email}` : ''}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-text-secondary"><div>{user.department || '—'}</div><div className="text-xs text-text-muted">{user.site || '—'}</div></td>
                    <td className="px-5 py-4"><span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-bg-elevated text-text-secondary">{ROLE_LABELS[user.role]}</span></td>
                    <td className="px-5 py-4"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${user.status === 'ACTIVE' ? 'bg-status-success-bg text-status-success' : user.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-jpmonitor-red-subtle text-jpmonitor-red'}`}>{statusLabels[user.status]}</span></td>
                    <td className="px-5 py-4 text-xs text-text-muted">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'မဝင်ရောက်ရသေးပါ'}</td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-1"><button onClick={() => openEdit(user)} className="p-2 text-text-muted hover:text-jpmonitor-red hover:bg-jpmonitor-red-subtle rounded-jpmonitor" title="ပြင်ဆင်ရန်"><Edit3 size={16} /></button><button onClick={() => toggleStatus(user)} className="p-2 text-text-muted hover:text-amber-600 hover:bg-amber-50 rounded-jpmonitor" title={user.status === 'ACTIVE' ? 'ယာယီပိတ်ရန်' : 'ပြန်ဖွင့်ရန်'}><Lock size={16} /></button><button onClick={() => deleteUser(user)} className="p-2 text-text-muted hover:text-jpmonitor-red hover:bg-jpmonitor-red-subtle rounded-jpmonitor" title="ဖယ်ရှားရန်"><Trash2 size={16} /></button></div></td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-text-muted">ကိုက်ညီသော Account မတွေ့ပါ။</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <div className="space-y-3">
            {ROLE_DEFINITIONS.map((role) => (
              <button key={role.value} onClick={() => setSelectedRole(role.value)} className={`w-full text-left p-4 rounded-jpmonitor-lg border transition-colors ${selectedRole === role.value ? 'border-jpmonitor-red bg-jpmonitor-red-subtle' : 'border-border bg-bg-surface hover:bg-bg-elevated'}`}>
                <div className="flex items-center justify-between gap-2"><span className="font-semibold text-text-primary">{role.label}</span><span className="text-xs text-text-muted">{role.permissions.length} ခွင့်</span></div>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">{role.description}</p>
              </button>
            ))}
          </div>
          <div className="bg-bg-surface border border-border rounded-jpmonitor-lg overflow-hidden">
            <div className="p-5 border-b border-border flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><h3 className="font-semibold text-text-primary">{ROLE_LABELS[selectedRole]} ၏ Permission များ</h3><p className="text-xs text-text-muted mt-1">Account ဖန်တီးချိန်တွင် Role မှ inherited permission များကို အသုံးပြုပါမည်။</p></div><div className="relative w-full md:w-64"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" /><label htmlFor="permission-search" className="sr-only">Permission ရှာရန်</label><input id="permission-search" value={permissionSearch} onChange={(event) => setPermissionSearch(event.target.value)} placeholder="Permission ရှာရန်..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red" /></div></div>
            <div className="divide-y divide-border">
              {filteredPermissions.map((permission) => {
                const inherited = ROLE_DEFINITIONS.find((role) => role.value === selectedRole)?.permissions.includes(permission.key) ?? false;
                return <div key={permission.key} className="flex items-center justify-between gap-4 px-5 py-3"><div><p className="text-sm font-medium text-text-primary">{permission.moduleLabel} · {permission.actionLabel}</p><p className="text-xs text-text-muted font-mono">{permission.key}</p></div><span className={`text-xs px-2.5 py-1 rounded-full ${inherited ? 'bg-status-success-bg text-status-success' : 'bg-bg-elevated text-text-muted'}`}>{inherited ? 'ခွင့်ပြုထားသည်' : 'မပါဝင်ပါ'}</span></div>;
              })}
              {filteredPermissions.length === 0 && <div className="px-5 py-12 text-center text-text-muted">Permission မတွေ့ပါ။</div>}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-bg-surface border border-border rounded-jpmonitor-lg shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-border flex items-start justify-between sticky top-0 bg-bg-surface z-10"><div><h3 className="text-xl font-semibold text-text-primary">{editingUser ? 'Account ပြင်ဆင်ရန်' : 'Account အသစ်ဖန်တီးရန်'}</h3><p className="text-xs text-text-muted mt-1">Role နှင့် Permission ကို သတ်မှတ်ပေးပါ။</p></div><button onClick={closeModal} className="p-2 text-text-muted hover:text-text-primary rounded-jpmonitor"><X size={19} /></button></div>
            <form onSubmit={submitForm} className="p-5 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">အမည်အပြည့်အစုံ *</span><input required value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red" /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">Username *</span><input required disabled={!!editingUser} value={form.username} onChange={(event) => updateField('username', event.target.value)} className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red disabled:opacity-60" /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">Email</span><input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red" /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">ဝန်ထမ်း ID</span><input value={form.employeeId} onChange={(event) => updateField('employeeId', event.target.value)} className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red" /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">ဌာန</span><input value={form.department} onChange={(event) => updateField('department', event.target.value)} placeholder="ဥပမာ - ထုတ်လုပ်ရေး" className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red" /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">လုပ်ငန်းခွင် / Site</span><input value={form.site} onChange={(event) => updateField('site', event.target.value)} placeholder="ဥပမာ - Satui သတ္တုတွင်း" className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red" /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">Role</span><select value={form.role} onChange={(event) => updateField('role', event.target.value as AppRole)} className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red">{ROLE_DEFINITIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">Account အခြေအနေ</span><select value={form.status} onChange={(event) => updateField('status', event.target.value as AccountStatus)} className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                {!editingUser && <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-medium text-text-secondary">ယာယီစကားဝှက် * (အနည်းဆုံး ၈ လုံး)</span><input required minLength={8} type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red" /><span className="text-[11px] text-text-muted">Account ဖန်တီးပြီးနောက် user ကို ပထမဆုံး login ဝင်ချိန်တွင် စကားဝှက်ပြောင်းရန် သတ်မှတ်သင့်ပါသည်။</span></label>}
              </div>

              <div className="border border-border rounded-jpmonitor-lg overflow-hidden"><div className="p-4 bg-bg-elevated border-b border-border flex items-center justify-between gap-3"><div><h4 className="font-semibold text-text-primary">Individual Permission Override</h4><p className="text-xs text-text-muted mt-1">Role ၏ default ခွင့်များကို ထပ်တိုး သို့မဟုတ် ကန့်သတ်ရန် checkbox ကို အသုံးပြုပါ။</p></div><span className="text-xs text-text-muted">{form.permissionOverrides.length} override</span></div><div className="max-h-64 overflow-y-auto divide-y divide-border">{PERMISSION_CATALOG.map((permission) => <label key={permission.key} aria-label={`${permission.moduleLabel} ${permission.actionLabel}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-bg-elevated cursor-pointer"><div><p className="text-sm text-text-primary">{permission.moduleLabel} · {permission.actionLabel}</p><p className="text-xs text-text-muted font-mono">{permission.key}</p></div><input type="checkbox" checked={isPermissionChecked(permission.key)} onChange={() => togglePermissionOverride(permission.key)} className="w-4 h-4 accent-red-600" /></label>)}</div></div>

              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-jpmonitor text-text-secondary hover:bg-bg-elevated">ပယ်ဖျက်ရန်</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-jpmonitor bg-jpmonitor-red hover:bg-jpmonitor-red-hover text-white disabled:opacity-50">{saving ? 'သိမ်းဆည်းနေပါသည်...' : <><Check size={17} /> သိမ်းဆည်းရန်</>}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementView;
