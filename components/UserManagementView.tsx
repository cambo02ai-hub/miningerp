import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Edit3, KeyRound, Lock, Plus, QrCode, Search, ShieldCheck, Trash2, UserRound, UsersRound, X, Settings, Upload, Sparkles, Image as ImageIcon } from 'lucide-react';
import { authAPI } from '../services/api';
import UserQRCodeModal from './UserQRCodeModal';
import { setAuthData } from '../services/authStorage';
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
  isSuperAdmin,
  loadManagedUsers,
  normalizeRole,
  recordRBACAudit,
  saveManagedUsers,
} from '../services/rbac';
import { getIdCardDesignSettings, saveIdCardDesignSettings, IDCardDesignSettings } from '../services/idCardSettings';
import { processEmployeePhotoWithGemini } from '../services/aiPhotoEditor';

interface UserManagementViewProps {
  currentUser: any;
  mode?: 'users' | 'employees';
}

type AccountForm = {
  fullName: string;
  fatherName: string;
  username: string;
  email: string;
  employeeId: string;
  department: string;
  site: string;
  phone: string;
  nrc: string;
  address: string;
  position: string;
  photoUrl: string;
  role: AppRole;
  status: AccountStatus;
  password: string;
  permissionOverrides: PermissionOverride[];
};

const emptyForm = (): AccountForm => ({
  fullName: '',
  fatherName: '',
  username: '',
  email: '',
  employeeId: '',
  department: '',
  site: '',
  phone: '',
  nrc: '',
  address: '',
  position: '',
  photoUrl: '',
  role: 'OPERATOR',
  status: 'ACTIVE',
  password: '',
  permissionOverrides: [],
});

const mapApiUser = (u: any): ManagedUser => ({
  id: u.id || `user-${u.username}`,
  fullName: u.fullName || u.full_name || u.username,
  fatherName: u.fatherName || u.father_name || '',
  username: u.username,
  email: u.email || '',
  employeeId: u.employeeId || u.employee_id || '',
  department: u.department || '',
  site: u.site || '',
  phone: u.phone || '',
  nrc: u.nrc || '',
  address: u.address || '',
  position: u.position || '',
  photoUrl: u.photoUrl || u.photo_url || '',
  role: normalizeRole(u.role),
  status: (u.status || (u.isActive === false ? 'SUSPENDED' : 'ACTIVE')) as AccountStatus,
  permissions: u.permissions,
  permissionOverrides: u.permissionOverrides || u.permission_overrides || [],
  createdAt: u.createdAt || u.created_at || new Date().toISOString(),
  createdBy: u.createdBy || u.created_by || 'စနစ်',
  lastLoginAt: u.lastLoginAt || u.last_login,
});

const statusLabels: Record<AccountStatus, string> = {
  ACTIVE: 'အသုံးပြုနိုင်သည်',
  SUSPENDED: 'ယာယီပိတ်ထားသည်',
  PENDING: 'အတည်ပြုရန်ကျန်ရှိသည်',
};

const UserManagementView: React.FC<UserManagementViewProps> = ({ currentUser, mode = 'users' }) => {
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
  const [aiProcessing, setAiProcessing] = useState(false);
  const [qrUser, setQrUser] = useState<ManagedUser | null>(null);

  // ID Card Design Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cardSettings, setCardSettings] = useState<IDCardDesignSettings>(getIdCardDesignSettings());

  const photoInputRef = useRef<HTMLInputElement>(null);
  const uniformInputRef = useRef<HTMLInputElement>(null);

  const isEmployeeMode = mode === 'employees';
  const isSuperAdminUser = isSuperAdmin(currentUser);
  const canViewEmployees = isSuperAdminUser || hasPermission(currentUser, 'employee.view');
  const canCreateEmployees = isSuperAdminUser || hasPermission(currentUser, 'employee.create');
  const canEditEmployees = isSuperAdminUser || hasPermission(currentUser, 'employee.edit');
  const allowed = isEmployeeMode
    ? canViewEmployees
    : isSuperAdminUser || hasPermission(currentUser, 'user_management.manage');

  const loadUsers = useCallback(async () => {
    try {
      const apiUsers = await authAPI.getUsers();
      if (Array.isArray(apiUsers) && apiUsers.length > 0) {
        const mappedUsers: ManagedUser[] = apiUsers.map(mapApiUser);
        // The backend is authoritative whenever it is reachable. Do not merge
        // the old local seed/sample accounts back into the directory after an
        // administrator clears them from production.
        setUsers(mappedUsers);
        saveManagedUsers(mappedUsers);
        return;
      }
    } catch (err: any) {
      console.warn('Failed to fetch users from backend API, using local fallback:', err?.message);
    }
    setUsers(loadManagedUsers(currentUser));
  }, [currentUser]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [user.fullName, user.fatherName, user.username, user.email, user.department, user.site, user.phone, user.nrc, user.position, ROLE_LABELS[user.role]]
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
      fatherName: user.fatherName || '',
      username: user.username,
      email: user.email,
      employeeId: user.employeeId,
      department: user.department,
      site: user.site,
      phone: user.phone || '',
      nrc: user.nrc || '',
      address: user.address || '',
      position: user.position || '',
      photoUrl: user.photoUrl || '',
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawUrl = event.target?.result as string;
      if (!rawUrl) return;

      // Keep the profile photo small enough for JSON/API and PostgreSQL TEXT storage.
      // Maximum dimensions 800px to keep payload size optimal (< 100KB Base64).
      const resizedUrl = await new Promise<string>((resolve) => {
        const image = new Image();
        image.onload = () => {
          const maxSize = 800;
          const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext('2d');
          if (!context) return resolve(rawUrl);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.80));
        };
        image.onerror = () => resolve(rawUrl);
        image.src = rawUrl;
      });

      // Set uploaded/resized photo URL immediately so it is never lost if AI fails or isn't configured
      updateField('photoUrl', resizedUrl);

      // Auto process with Gemini AI if available
      setAiProcessing(true);
      try {
        const res = await processEmployeePhotoWithGemini(resizedUrl);
        if (res.editedPhotoUrl) {
          updateField('photoUrl', res.editedPhotoUrl);
        }
        setNotice({ type: 'success', text: res.message });
      } catch {
        // Ensure uploaded photo remains preserved if AI processing throws
        updateField('photoUrl', resizedUrl);
      } finally {
        setAiProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleManualAiEdit = async () => {
    if (!form.photoUrl) return;
    setAiProcessing(true);
    try {
      const res = await processEmployeePhotoWithGemini(form.photoUrl);
      if (res.editedPhotoUrl) {
        updateField('photoUrl', res.editedPhotoUrl);
      }
      setNotice({ type: 'success', text: res.message });
    } catch {
      setNotice({ type: 'error', text: 'AI Photo processing မအောင်မြင်ပါ။' });
    } finally {
      setAiProcessing(false);
    }
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
    if (editingUser && form.password && form.password.length < 8) {
      setNotice({ type: 'error', text: 'စကားဝှက်အသစ်သည် အနည်းဆုံး ၈ လုံးရှိရမည်။' });
      return;
    }
    const duplicate = users.some((user) => user.username.toLowerCase() === form.username.trim().toLowerCase() && user.id !== editingUser?.id);
    if (duplicate) {
      setNotice({ type: 'error', text: 'ဤ Username ကို အသုံးပြုပြီးသား ဖြစ်ပါသည်။' });
      return;
    }

    const nextEmployeeId = (() => {
      if (editingUser || form.employeeId.trim()) return form.employeeId.trim();
      const highest = users.reduce((max, user) => {
        const match = user.employeeId.replace(/\s/g, '').match(/^STN-ALP-A(\d{4})$/i);
        return match ? Math.max(max, Number(match[1])) : max;
      }, 0);
      return `STN-ALP-A${String(highest + 1).padStart(4, '0')}`;
    })();

    setSaving(true);
    try {
      const payload = {
        username: form.username.trim(),
        password: form.password || undefined,
        fullName: form.fullName.trim(),
        fatherName: form.fatherName.trim(),
        email: form.email.trim(),
        employeeId: nextEmployeeId,
        department: form.department.trim(),
        site: form.site.trim(),
        phone: form.phone.trim(),
        nrc: form.nrc.trim(),
        address: form.address.trim(),
        position: form.position.trim(),
        photoUrl: form.photoUrl,
        role: form.role,
        status: form.status,
        permissions: ROLE_DEFINITIONS.find((role) => role.value === form.role)?.permissions ?? [],
        permissionOverrides: form.permissionOverrides,
      };

      let persistedUser: ManagedUser | null = null;
      if (!editingUser) {
        try {
          persistedUser = mapApiUser(await authAPI.register(payload));
        } catch (apiErr: any) {
          if (navigator.onLine && apiErr?.message && !apiErr.message.includes('Failed to fetch')) {
            throw new Error(apiErr.message || 'Backend user registration failed');
          }
          console.warn('Backend user registration offline/sync warning, saving local fallback profile:', apiErr?.message);
        }
      } else {
        try {
          persistedUser = mapApiUser(await authAPI.updateUser(editingUser.username, payload));
        } catch (apiErr: any) {
          // Legacy/sample accounts can exist only in localStorage. A 404 means
          // there is no server row to update; retain the local profile instead
          // of failing the whole edit operation. Auth/permission errors remain
          // hard failures and are shown to the user.
          const isMissingServerUser = /^HTTP 404\b/.test(String(apiErr?.message || '')) || /user not found/i.test(String(apiErr?.message || ''));
          if (navigator.onLine && apiErr?.message && !apiErr.message.includes('Failed to fetch') && !isMissingServerUser) {
            throw new Error(apiErr.message || 'Backend user update failed');
          }
          console.warn('Backend user update offline/sync warning, updating local profile:', apiErr?.message);
        }
      }

      const now = new Date().toISOString();
      const nextUser: ManagedUser = {
        id: editingUser?.id || `user-${Date.now()}`,
        fullName: form.fullName.trim(),
        fatherName: form.fatherName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        employeeId: nextEmployeeId,
        department: form.department.trim(),
        site: form.site.trim(),
        phone: form.phone.trim(),
        nrc: form.nrc.trim(),
        address: form.address.trim(),
        position: form.position.trim(),
        photoUrl: form.photoUrl,
        role: form.role,
        status: form.status,
        permissionOverrides: form.permissionOverrides,
        createdAt: editingUser?.createdAt || now,
        createdBy: editingUser?.createdBy || currentUser?.username || 'စနစ်အကြီးအကဲ',
        lastLoginAt: editingUser?.lastLoginAt,
        password: form.password ? form.password : (editingUser?.password || undefined),
      };

      // Use the server response immediately. Reloading the whole list here used to
      // overwrite local sample-account edits when those accounts did not exist in
      // the backend database yet.
      const savedUser = persistedUser ? { ...nextUser, ...persistedUser, password: nextUser.password } : nextUser;
      setUsers((previous) => {
        const withoutCurrent = previous.filter((user) => user.id !== editingUser?.id && user.username.toLowerCase() !== savedUser.username.toLowerCase());
        const updated = editingUser ? [...withoutCurrent, savedUser] : [savedUser, ...withoutCurrent];
        saveManagedUsers(updated);
        return updated;
      });

      if (currentUser?.username && currentUser.username.toLowerCase() === savedUser.username.toLowerCase()) {
        const updatedCurrent = {
          ...currentUser,
          fullName: savedUser.fullName,
          email: savedUser.email,
          role: savedUser.role,
          status: savedUser.status,
          permissionOverrides: savedUser.permissionOverrides,
        };
        const token = localStorage.getItem('auth_token') || 'session-token';
        setAuthData(token, updatedCurrent);
      }

      recordRBACAudit(editingUser ? 'USER_UPDATED' : 'USER_CREATED', savedUser.username, `${ROLE_LABELS[savedUser.role]} / ${statusLabels[savedUser.status]}`, currentUser);
      setNotice({ type: 'success', text: editingUser ? 'Account အချက်အလက်များကို ပြင်ဆင်ပြီးပါပြီ။' : 'Account အသစ် ဖန်တီးပြီးပါပြီ။' });
      setIsModalOpen(false);
      if (!editingUser && isEmployeeMode) {
        setQrUser(savedUser);
      }
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'Account ဖန်တီး/ပြင်ဆင်ရာတွင် အမှားတစ်ခု ဖြစ်ပွားခဲ့သည်။' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCardSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveIdCardDesignSettings(cardSettings);
    setIsSettingsOpen(false);
    setNotice({ type: 'success', text: 'ID Card ဒီဇိုင်း အعدادသတ်မှတ်မှုများကို သိမ်းဆည်းပြီးပါပြီ။' });
  };

  const toggleStatus = async (user: ManagedUser) => {
    if (user.username === currentUser?.username) {
      setNotice({ type: 'error', text: 'လက်ရှိ Super Admin account ကို ကိုယ်တိုင်ပိတ်၍ မရပါ။' });
      return;
    }
    const nextStatus: AccountStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await authAPI.updateStatus(user.username, nextStatus);
    } catch (apiErr: any) {
      console.warn('Backend status update warning:', apiErr?.message);
    }
    await loadUsers();
    recordRBACAudit(nextStatus === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_SUSPENDED', user.username, statusLabels[nextStatus], currentUser);
    setNotice({ type: 'success', text: `${user.username} account ကို ${statusLabels[nextStatus]} အဖြစ် ပြောင်းပြီးပါပြီ။` });
  };

  const deleteUser = async (user: ManagedUser) => {
    if (user.username === currentUser?.username || user.role === 'SUPER_ADMIN') {
      setNotice({ type: 'error', text: 'Super Admin account ကို ဖျက်၍မရပါ။ လုံခြုံရေးအတွက် Suspend ကိုသာ အသုံးပြုပါ။' });
      return;
    }
    if (!window.confirm(`${user.username} account ကို ဖျက်ရန် သေချာပါသလား။`)) return;
    try {
      await authAPI.deleteUser(user.username);
    } catch (apiErr: any) {
      console.warn('Backend user delete warning:', apiErr?.message);
    }
    await loadUsers();
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
            <h2 className="text-2xl font-semibold text-text-primary">{isEmployeeMode ? 'ဝန်ထမ်း စီမံခန့်ခွဲမှု' : 'User နှင့် Permission စီမံခန့်ခွဲမှု'}</h2>
          </div>
          <p className="text-sm text-text-muted">{isEmployeeMode ? 'ဝန်ထမ်းအချက်အလက်၊ Login Account နှင့် QR ID Badge ကို တစ်နေရာတည်းမှ စီမံပါ။' : 'Super Admin သည် Account ဖန်တီးခြင်း၊ Role သတ်မှတ်ခြင်း၊ Photo နှင့် ID Card Reference သတ်မှတ်ခြင်းကို စီမံနိုင်ပါသည်။'}</p>
        </div>
        {activeTab === 'users' && (
          <div className="flex gap-2">
            {!isEmployeeMode && <button
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center justify-center gap-2 border border-border bg-bg-surface hover:bg-bg-elevated text-text-primary px-3.5 py-2.5 rounded-jpmonitor font-medium text-sm transition-colors"
              title="ID Card ဒီဇိုင်း Reference သတ်မှတ်ရန်"
            >
              <Settings size={17} /> ID Card Settings
            </button>}
            {(!isEmployeeMode || canCreateEmployees) && <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 bg-jpmonitor-red hover:bg-jpmonitor-red-hover text-white px-4 py-2.5 rounded-jpmonitor font-medium transition-colors">
              <Plus size={18} /> {isEmployeeMode ? 'ဝန်ထမ်းအသစ်ထည့်ရန်' : 'Account အသစ်ဖန်တီးရန်'}
            </button>}
          </div>
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
        {!isEmployeeMode && <button onClick={() => setActiveTab('roles')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'roles' ? 'border-jpmonitor-red text-jpmonitor-red' : 'border-transparent text-text-muted hover:text-text-primary'}`}>
          <KeyRound size={16} className="inline mr-2" /> Role နှင့် Permission
        </button>}
      </div>

      {activeTab === 'users' ? (
        <div className="bg-bg-surface border border-border rounded-jpmonitor-lg overflow-hidden">
          <div className="p-4 border-b border-border flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div>
              <h3 className="font-semibold text-text-primary">အသုံးပြုသူစာရင်း</h3>
              <p className="text-xs text-text-muted mt-1">Role၊ Photo နှင့် Account status ကို တစ်နေရာတည်းမှ စီမံပါ။</p>
            </div>
            <div className="relative w-full md:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <label htmlFor="user-management-search" className="sr-only">အသုံးပြုသူ ရှာရန်</label>
              <input id="user-management-search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="အမည်၊ Username၊ ဖုန်း၊ NRC ရှာရန်..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-bg-elevated text-text-muted border-b border-border">
                <tr>
                  <th className="px-5 py-3 font-medium">အသုံးပြုသူ</th>
                  <th className="px-5 py-3 font-medium">ရာထူး / ဌာန</th>
                  <th className="px-5 py-3 font-medium">ဖုန်း / မှတ်ပုံတင်</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">အခြေအနေ</th>
                  <th className="px-5 py-3 font-medium text-right">လုပ်ဆောင်ချက်</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-bg-elevated transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {user.photoUrl ? (
                          <img src={user.photoUrl} alt={user.fullName} className="w-10 h-10 rounded-full object-cover border border-slate-300 shadow-sm" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-jpmonitor-red-subtle text-jpmonitor-red flex items-center justify-center font-bold text-sm">
                            <UserRound size={18} />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-text-primary">{user.fullName}</p>
                          {user.fatherName && <p className="text-xs text-text-muted">အဖ - {user.fatherName}</p>}
                          <p className="text-xs text-text-muted">@{user.username}{user.employeeId ? ` · ${user.employeeId}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-text-secondary">
                      <div className="font-medium text-xs text-text-primary">{user.position || user.role}</div>
                      <div className="text-xs text-text-muted">{user.department || '—'} ({user.site || '—'})</div>
                    </td>
                    <td className="px-5 py-4 text-text-secondary text-xs">
                      <div>{user.phone || '—'}</div>
                      <div className="text-text-muted">{user.nrc || '—'}</div>
                    </td>
                    <td className="px-5 py-4"><span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-bg-elevated text-text-secondary">{ROLE_LABELS[user.role]}</span></td>
                    <td className="px-5 py-4"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${user.status === 'ACTIVE' ? 'bg-status-success-bg text-status-success' : user.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-jpmonitor-red-subtle text-jpmonitor-red'}`}>{statusLabels[user.status]}</span></td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-1">{isEmployeeMode && <button onClick={() => setQrUser(user)} className="p-2 text-text-muted hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-jpmonitor" title="QR Code / ID Badge ထုတ်ရန်"><QrCode size={16} /></button>}{(!isEmployeeMode || canEditEmployees) && <button onClick={() => openEdit(user)} className="p-2 text-text-muted hover:text-jpmonitor-red hover:bg-jpmonitor-red-subtle rounded-jpmonitor" title="ပြင်ဆင်ရန်"><Edit3 size={16} /></button>}{(!isEmployeeMode || isSuperAdminUser) && <><button onClick={() => toggleStatus(user)} className="p-2 text-text-muted hover:text-amber-600 hover:bg-amber-50 rounded-jpmonitor" title={user.status === 'ACTIVE' ? 'ယာယီပိတ်ရန်' : 'ပြန်ဖွင့်ရန်'}><Lock size={16} /></button><button onClick={() => deleteUser(user)} className="p-2 text-text-muted hover:text-jpmonitor-red hover:bg-jpmonitor-red-subtle rounded-jpmonitor" title="ဖယ်ရှားရန်"><Trash2 size={16} /></button></>}</div></td>
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

      {qrUser && (
        <UserQRCodeModal user={qrUser} onClose={() => setQrUser(null)} />
      )}

      {/* ID Card Reference Design Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border rounded-jpmonitor-lg shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-bg-elevated">
              <div className="flex items-center gap-2 font-semibold text-text-primary">
                <Settings className="text-jpmonitor-red" size={20} />
                <span>ID Card ဒီဇိုင်း Reference သတ်မှတ်ရန်</span>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="p-1 text-text-muted hover:text-text-primary"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveCardSettings} className="p-5 space-y-4 text-xs">
              <label className="block space-y-1">
                <span className="font-medium text-text-secondary">ကုမ္ပဏီအမည် (Company Name)</span>
                <input
                  value={cardSettings.companyName}
                  onChange={(e) => setCardSettings({ ...cardSettings, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-jpmonitor bg-bg-page text-text-primary"
                  required
                />
              </label>
              <label className="block space-y-1">
                <span className="font-medium text-text-secondary">စာတန်းငယ် (Sub-title / Tagline)</span>
                <input
                  value={cardSettings.companySubTitle}
                  onChange={(e) => setCardSettings({ ...cardSettings, companySubTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-jpmonitor bg-bg-page text-text-primary"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-medium text-text-secondary">Card Badge ခေါင်းစဉ်</span>
                <input
                  value={cardSettings.badgeTitle}
                  onChange={(e) => setCardSettings({ ...cardSettings, badgeTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-jpmonitor bg-bg-page text-text-primary"
                />
              </label>
              <div className="space-y-1">
                <span className="font-medium text-text-secondary">Reference Uniform Photo (ဝတ်စုံ / Background Reference)</span>
                <div className="flex items-center gap-3">
                  {cardSettings.referenceUniformPhotoUrl ? (
                    <img src={cardSettings.referenceUniformPhotoUrl} alt="Uniform Ref" className="w-12 h-14 object-cover rounded border border-border" />
                  ) : (
                    <div className="w-12 h-14 bg-bg-elevated rounded border border-border flex items-center justify-center text-text-muted">
                      <ImageIcon size={20} />
                    </div>
                  )}
                  <input
                    type="file"
                    ref={uniformInputRef}
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const r = new FileReader();
                        r.onload = (ev) => setCardSettings({ ...cardSettings, referenceUniformPhotoUrl: ev.target?.result as string });
                        r.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => uniformInputRef.current?.click()}
                    className="px-3 py-1.5 border border-border rounded-jpmonitor bg-bg-elevated hover:bg-bg-surface text-text-primary"
                  >
                    <Upload size={14} className="inline mr-1" /> Reference ဝတ်စုံပုံ တင်ရန်
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={() => setIsSettingsOpen(false)} className="px-3 py-2 rounded-jpmonitor text-text-secondary hover:bg-bg-elevated">
                  ပယ်ဖျက်ရန်
                </button>
                <button type="submit" className="px-4 py-2 bg-jpmonitor-red text-white rounded-jpmonitor hover:bg-jpmonitor-red-hover font-medium">
                  သိမ်းဆည်းမည်
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-bg-surface border border-border rounded-jpmonitor-lg shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-border flex items-start justify-between sticky top-0 bg-bg-surface z-10"><div><h3 className="text-xl font-semibold text-text-primary">{editingUser ? 'Account ပြင်ဆင်ရန်' : 'Account အသစ်ဖန်တီးရန်'}</h3><p className="text-xs text-text-muted mt-1">အသုံးပြုသူ အချက်အလက်နှင့် ID Card ဓာတ်ပုံ သတ်မှတ်ပါ။</p></div><button onClick={closeModal} className="p-2 text-text-muted hover:text-text-primary rounded-jpmonitor"><X size={19} /></button></div>
            <form onSubmit={submitForm} className="p-5 space-y-6">
              {/* Photo Upload & AI Gemini Section */}
              <div className="p-4 bg-bg-elevated border border-border rounded-jpmonitor-lg flex flex-col md:flex-row items-center gap-4">
                <div className="relative">
                  {form.photoUrl ? (
                    <img src={form.photoUrl} alt="Employee Headshot" className="w-20 h-24 object-cover rounded-xl border-2 border-jpmonitor-red shadow-md" />
                  ) : (
                    <div className="w-20 h-24 bg-bg-surface border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-text-muted">
                      <UserRound size={28} />
                      <span className="text-[10px] mt-1">ဓာတ်ပုံ</span>
                    </div>
                  )}
                  {aiProcessing && (
                    <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center text-amber-400">
                      <Sparkles size={22} className="animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2 text-center md:text-left">
                  <h4 className="text-sm font-semibold text-text-primary flex items-center gap-1.5 justify-center md:justify-start">
                    <span>ဝန်ထမ်း ID Card ဓာတ်ပုံ Upload</span>
                    <Sparkles size={15} className="text-amber-500" />
                  </h4>
                  <p className="text-xs text-text-muted">
                    တင်သွင်းထားသော ဓာတ်ပုံကို CometAPI (gemini-3.1-flash-lite-image) ဖြင့် reference ဝတ်စုံနှင့် background အတိုင်း auto-edit ပြုလုပ်ပေးပါမည်။
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-1">
                    <input
                      type="file"
                      ref={photoInputRef}
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-jpmonitor-red text-white rounded-jpmonitor hover:bg-jpmonitor-red-hover transition-colors"
                    >
                      <Upload size={14} /> ဓာတ်ပုံ ရွေးချယ်မည်
                    </button>
                    {form.photoUrl && (
                      <button
                        type="button"
                        onClick={handleManualAiEdit}
                        disabled={aiProcessing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-jpmonitor transition-colors"
                      >
                        <Sparkles size={14} /> Gemini AI ဖြင့် ပြန်လည်ပြင်မည်
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">အမည်အပြည့်အစုံ *</span><input required value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red" /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">အဖအမည် (Father Name)</span><input value={form.fatherName} onChange={(event) => updateField('fatherName', event.target.value)} placeholder="ဥပမာ - ဦးဘ" className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red" /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">Username *</span><input required disabled={!!editingUser} value={form.username} onChange={(event) => updateField('username', event.target.value)} className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red disabled:opacity-60" /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">ဖုန်းနံပါတ် (Phone)</span><input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="09xxxxxxxxx" className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red" /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">မှတ်ပုံတင် (NRC)</span><input value={form.nrc} onChange={(event) => updateField('nrc', event.target.value)} placeholder="၁၂/ဥက္တ(နိုင်)xxxxxx" className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red" /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">ရာထူး (Position)</span><input value={form.position} onChange={(event) => updateField('position', event.target.value)} placeholder="ဥပမာ - မိုင်းစူပါဗိုက်ဆာ" className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red" /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">Email</span><input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red" /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">ဝန်ထမ်း ID</span><input value={form.employeeId} onChange={(event) => updateField('employeeId', event.target.value)} className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red" /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">ဌာန</span><input value={form.department} onChange={(event) => updateField('department', event.target.value)} placeholder="ဥပမာ - ထုတ်လုပ်ရေး" className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red" /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">လုပ်ငန်းခွင် / Site</span><input value={form.site} onChange={(event) => updateField('site', event.target.value)} placeholder="ဥပမာ - Satui သတ္တုတွင်း" className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red" /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">Role</span><select value={form.role} onChange={(event) => updateField('role', event.target.value as AppRole)} className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red">{ROLE_DEFINITIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
                <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-medium text-text-secondary">နေရပ်လိပ်စာ (Address)</span><textarea rows={2} value={form.address} onChange={(event) => updateField('address', event.target.value)} placeholder="နေရပ်လိပ်စာ အပြည့်အစုံ..." className="w-full px-3 py-2 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red resize-none" /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium text-text-secondary">Account အခြေအနေ</span><select value={form.status} onChange={(event) => updateField('status', event.target.value as AccountStatus)} className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-medium text-text-secondary">
                    {editingUser ? 'စကားဝှက်အသစ် ပြောင်းရန် (မပြောင်းလိုပါက ချန်ထားခဲ့ပါ)' : 'ယာယီစကားဝှက် * (အနည်းဆုံး ၈ လုံး)'}
                  </span>
                  <input
                    required={!editingUser}
                    minLength={8}
                    type="password"
                    value={form.password}
                    onChange={(event) => updateField('password', event.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-jpmonitor bg-bg-page text-text-primary outline-none focus:border-jpmonitor-red"
                  />
                  <span className="text-[11px] text-text-muted">
                    {editingUser ? 'စကားဝှက်အသစ် ထည့်သွင်းပါက ယခင်စကားဝှက်အစား အသစ်ပြောင်းလဲမည်ဖြစ်ပါသည်။' : 'Account ဖန်တီးပြီးနောက် user ကို ပထမဆုံး login ဝင်ချိန်တွင် စကားဝှက်ပြောင်းရန် သတ်မှတ်သင့်ပါသည်။'}
                  </span>
                </label>
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
