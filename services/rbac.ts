export type AppRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'STOCK_MANAGER'
  | 'STORE_EMPLOYEE'
  | 'SUPERVISOR'
  | 'OPERATOR'
  | 'VIEWER';

export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'export'
  | 'manage';

export type PermissionKey = `${string}.${PermissionAction}`;
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';
export type PermissionEffect = 'ALLOW' | 'DENY';

export interface PermissionDefinition {
  key: PermissionKey;
  module: string;
  moduleLabel: string;
  action: PermissionAction;
  actionLabel: string;
}

export interface PermissionOverride {
  permission: PermissionKey;
  effect: PermissionEffect;
}

export interface ManagedUser {
  id: string;
  fullName: string;
  fatherName?: string;
  username: string;
  email: string;
  employeeId: string;
  department: string;
  site: string;
  phone?: string;
  nrc?: string;
  address?: string;
  position?: string;
  photoUrl?: string;
  role: AppRole;
  status: AccountStatus;
  permissions?: PermissionKey[];
  permissionOverrides: PermissionOverride[];
  createdAt: string;
  createdBy: string;
  lastLoginAt?: string;
  password?: string;
}

export interface RBACAuditEntry {
  id: string;
  action: string;
  targetUsername: string;
  details: string;
  actor: string;
  createdAt: string;
}

export interface RBACUserLike {
  username?: string;
  fullName?: string;
  fatherName?: string;
  role?: string;
  status?: AccountStatus | string;
  permissionOverrides?: PermissionOverride[];
  permissions?: PermissionKey[];
}

export const RBAC_STORAGE_KEY = 'jpmonitor-managed-users';
export const RBAC_AUDIT_STORAGE_KEY = 'jpmonitor-rbac-audit';

const moduleLabels: Record<string, string> = {
  dashboard: 'ဒက်ရှ်ဘုတ်',
  production: 'ထုတ်လုပ်ရေး',
  fleet: 'ယာဉ်/စက်',
  mutation: 'ယူနစ်ပြောင်းရွှေ့မှု',
  inventory: 'စတော့',
  maintenance: 'ပြုပြင်ထိန်းသိမ်းရေး',
  employee: 'ဝန်ထမ်း',
  supplier: 'ရောင်းချသူ',
  debt: 'ဘဏ္ဍာရေး',
  location: 'တည်နေရာ',
  hse: 'HSE နှင့် ဘေးကင်းရေး',
  timesheet: 'အလုပ်ချိန်မှတ်တမ်း',
  audit: 'စစ်ဆေးမှတ်တမ်း',
  user_management: 'အသုံးပြုသူစီမံခန့်ခွဲမှု',
  roles: 'Role နှင့် Permission',
};

const actionLabels: Record<PermissionAction, string> = {
  view: 'ကြည့်ရှုရန်',
  create: 'ဖန်တီးရန်',
  edit: 'ပြင်ဆင်ရန်',
  delete: 'ဖျက်ရန်',
  approve: 'အတည်ပြုရန်',
  export: 'ထုတ်ယူရန်',
  manage: 'စီမံရန်',
};

const permissionSeed: Array<[string, PermissionAction[]]> = [
  ['dashboard', ['view']],
  ['production', ['view', 'create', 'edit', 'approve', 'export']],
  ['fleet', ['view', 'create', 'edit', 'delete', 'approve', 'export']],
  ['mutation', ['view', 'create', 'edit', 'delete', 'approve', 'export']],
  ['inventory', ['view', 'create', 'edit', 'delete', 'approve', 'export']],
  ['maintenance', ['view', 'create', 'edit', 'delete', 'approve', 'export']],
  ['employee', ['view', 'create', 'edit', 'delete', 'export']],
  ['supplier', ['view', 'create', 'edit', 'delete', 'export']],
  ['debt', ['view', 'create', 'edit', 'approve', 'export']],
  ['location', ['view', 'create', 'edit', 'delete']],
  ['hse', ['view', 'create', 'edit', 'approve', 'export']],
  ['timesheet', ['view', 'create', 'edit', 'approve', 'export']],
  ['audit', ['view', 'export']],
  ['user_management', ['view', 'create', 'edit', 'delete', 'manage']],
  ['roles', ['view', 'create', 'edit', 'delete', 'manage']],
];

export const PERMISSION_CATALOG: PermissionDefinition[] = permissionSeed.flatMap(([module, actions]) =>
  actions.map((action) => ({
    key: `${module}.${action}` as PermissionKey,
    module,
    moduleLabel: moduleLabels[module] ?? module,
    action,
    actionLabel: actionLabels[action],
  })),
);

const permissionKeys = PERMISSION_CATALOG.map((permission) => permission.key);

export const ROLE_DEFINITIONS: Array<{
  value: AppRole;
  label: string;
  description: string;
  permissions: PermissionKey[];
}> = [
  {
    value: 'SUPER_ADMIN',
    label: 'စနစ်အကြီးအကဲ',
    description: 'User, Role, Permission နှင့် စနစ်တစ်ခုလုံးကို စီမံနိုင်သည်။',
    permissions: permissionKeys,
  },
  {
    value: 'ADMIN',
    label: 'စီမံခန့်ခွဲသူ',
    description: 'လုပ်ငန်း module များနှင့် user account များကို စီမံနိုင်သည်။',
    permissions: permissionKeys.filter((key) => !key.startsWith('roles.')),
  },
  {
    value: 'MANAGER',
    label: 'မန်နေဂျာ',
    description: 'သက်ဆိုင်ရာ လုပ်ငန်းဒေတာများကို စစ်ဆေး၊ ပြင်ဆင်၊ အတည်ပြုနိုင်သည်။',
    permissions: permissionKeys.filter((key) =>
      ['dashboard.view', 'production.view', 'production.create', 'production.edit', 'production.approve', 'production.export', 'fleet.view', 'fleet.approve', 'fleet.export', 'mutation.view', 'mutation.approve', 'mutation.export', 'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.approve', 'inventory.export', 'maintenance.view', 'maintenance.approve', 'maintenance.export', 'employee.view', 'employee.edit', 'employee.export', 'supplier.view', 'supplier.export', 'debt.view', 'debt.approve', 'debt.export', 'location.view', 'hse.view', 'hse.approve', 'hse.export', 'timesheet.view', 'timesheet.approve', 'timesheet.export', 'audit.view', 'audit.export'].includes(key),
    ),
  },
  {
    value: 'STOCK_MANAGER',
    label: 'စတော့မန်နေဂျာ',
    description: 'Master Stock Data များကိုသာ ဖြည့်သွင်း စီမံနိုင်သည်။',
    permissions: permissionKeys.filter((key) =>
      ['dashboard.view', 'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.export'].includes(key),
    ),
  },
  {
    value: 'STORE_EMPLOYEE',
    label: 'စတိုဝန်ထမ်း',
    description: 'စတို ပစ္စည်း ထုတ်ပေးခြင်းနှင့် နေ့စဉ်စတော့ စီမံဆောင်ရွက်မှုများသာ ပြုလုပ်နိုင်သည်။',
    permissions: permissionKeys.filter((key) =>
      ['inventory.view', 'inventory.create', 'inventory.edit'].includes(key),
    ),
  },
  {
    value: 'SUPERVISOR',
    label: 'ကြီးကြပ်သူ',
    description: 'နေ့စဉ်လုပ်ငန်းဒေတာများကို ထည့်သွင်း၊ ပြင်ဆင်၊ စောင့်ကြည့်နိုင်သည်။',
    permissions: permissionKeys.filter((key) =>
      ['dashboard.view', 'production.view', 'production.create', 'production.edit', 'production.export', 'fleet.view', 'fleet.create', 'fleet.edit', 'mutation.view', 'mutation.create', 'mutation.edit', 'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.export', 'maintenance.view', 'maintenance.create', 'maintenance.edit', 'maintenance.export', 'employee.view', 'employee.edit', 'supplier.view', 'supplier.create', 'debt.view', 'location.view', 'hse.view', 'hse.create', 'hse.edit', 'timesheet.view', 'timesheet.create', 'timesheet.edit', 'audit.view'].includes(key),
    ),
  },
  {
    value: 'OPERATOR',
    label: 'လုပ်သား',
    description: 'သက်ဆိုင်ရာ နေ့စဉ်လုပ်ငန်းစာရင်းများကိုသာ ကြည့်ရှု၊ ထည့်သွင်းနိုင်သည်။',
    permissions: ['dashboard.view', 'production.view', 'production.create', 'fleet.view', 'mutation.view', 'mutation.create', 'inventory.view', 'inventory.create', 'maintenance.view', 'maintenance.create', 'hse.view', 'hse.create', 'timesheet.view', 'timesheet.create'].filter((key) => permissionKeys.includes(key as PermissionKey)) as PermissionKey[],
  },
  {
    value: 'VIEWER',
    label: 'ကြည့်ရှုသူ',
    description: 'ခွင့်ပြုထားသော လုပ်ငန်းအချက်အလက်များကိုသာ ဖတ်ရှုနိုင်သည်။',
    permissions: permissionKeys.filter((key) => key.endsWith('.view')),
  },
];

export const ROLE_LABELS: Record<AppRole, string> = Object.fromEntries(
  ROLE_DEFINITIONS.map((role) => [role.value, role.label]),
) as Record<AppRole, string>;

export const normalizeRole = (role?: string | null): AppRole => {
  let normalized = String(role ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized.startsWith('ROLE_')) {
    normalized = normalized.substring(5);
  }
  if (normalized === 'SUPER_ADMIN' || normalized === 'SUPERADMIN' || normalized === 'SUPER_ADMINISTRATOR') return 'SUPER_ADMIN';
  if (normalized === 'ADMIN' || normalized === 'ADMINISTRATOR' || normalized === 'SYSTEM_ADMIN' || normalized === 'SYSTEM_ADMINISTRATOR') return 'ADMIN';
  if (normalized === 'STOCK_MANAGER' || normalized === 'STOCKMANAGER') return 'STOCK_MANAGER';
  if (normalized === 'STORE_EMPLOYEE' || normalized === 'STOREEMPLOYEE' || normalized === 'STORE_STAFF') return 'STORE_EMPLOYEE';
  if (normalized === 'MANAGER' || normalized === 'OPERATIONAL_MANAGER') return 'MANAGER';
  if (normalized === 'SUPERVISOR' || normalized === 'SITE_SUPERVISOR') return 'SUPERVISOR';
  if (normalized === 'OPERATOR' || normalized === 'OPERATIONAL_INPUT') return 'OPERATOR';
  if (normalized === 'VIEWER' || normalized === 'STAFF' || normalized === 'READ_ONLY_ACCESS') return 'VIEWER';
  return 'VIEWER';
};

export const getRolePermissions = (role?: string | null): PermissionKey[] => {
  const normalized = normalizeRole(role);
  return ROLE_DEFINITIONS.find((definition) => definition.value === normalized)?.permissions ?? [];
};

export const getEffectivePermissions = (user?: RBACUserLike | null): Set<PermissionKey> => {
  const normalized = normalizeRole(user?.role);
  if (normalized === 'SUPER_ADMIN') {
    return new Set<PermissionKey>(PERMISSION_CATALOG.map((permission) => permission.key));
  }

  const rolePerms = getRolePermissions(normalized);
  const effective = new Set<PermissionKey>(rolePerms);

  if (user?.permissions?.length) {
    user.permissions.forEach((permission) => {
      if ((permission as string) !== '*' && PERMISSION_CATALOG.some((item) => item.key === permission)) {
        effective.add(permission as PermissionKey);
      }
    });
  }

  const overrides = user?.permissionOverrides ?? [];
  overrides.filter((override) => override.effect === 'DENY').forEach((override) => effective.delete(override.permission));
  overrides.filter((override) => override.effect === 'ALLOW').forEach((override) => effective.add(override.permission));
  return effective;
};

export const hasPermission = (user: RBACUserLike | null | undefined, permission: PermissionKey): boolean => {
  if (normalizeRole(user?.role) === 'SUPER_ADMIN') return true;
  return getEffectivePermissions(user).has(permission);
};

export const isSuperAdmin = (user?: RBACUserLike | null): boolean => normalizeRole(user?.role) === 'SUPER_ADMIN';

const canUseStorage = (): boolean => typeof window !== 'undefined' && !!window.localStorage;

export const loadManagedUsers = (actor?: RBACUserLike | null): ManagedUser[] => {
  if (canUseStorage()) {
    try {
      const raw = window.localStorage.getItem(RBAC_STORAGE_KEY);
      if (raw) return JSON.parse(raw) as ManagedUser[];
    } catch {
      // Fall through to the bootstrap account.
    }
  }

  const initialUsers: ManagedUser[] = [];
  if (actor?.username) {
    initialUsers.push({
      id: `bootstrap-${actor.username}`,
      fullName: actor.fullName || actor.username,
      username: actor.username,
      email: '',
      employeeId: '',
      department: 'စီမံခန့်ခွဲရေး',
      site: 'အဓိကလုပ်ငန်းခွင်',
      role: normalizeRole(actor.role || 'SUPER_ADMIN'),
      status: 'ACTIVE',
      permissionOverrides: [],
      createdAt: new Date().toISOString(),
      createdBy: 'စနစ်',
      lastLoginAt: new Date().toISOString(),
    });
  }

  if (!initialUsers.some((u) => u.username.toLowerCase() === 'nwenwekhant')) {
    initialUsers.push({
      id: 'seeded-nwenwekhant',
      fullName: 'Nwe Nwe Khant',
      username: 'nwenwekhant',
      email: 'nwenwekhant@jpmonitor.com',
      employeeId: 'EMP-STOCK-01',
      department: 'စတော့ဌာန',
      site: 'အဓိကလုပ်ငန်းခွင်',
      role: 'STOCK_MANAGER',
      status: 'ACTIVE',
      permissionOverrides: [],
      createdAt: new Date().toISOString(),
      createdBy: 'စနစ်',
      password: 'nwenwekhant123',
    });
  }

  const storeEmployeeSeed = [
    { username: 'store01', fullName: 'Store Staff 1', empId: 'EMP-STORE-01' },
    { username: 'store02', fullName: 'Store Staff 2', empId: 'EMP-STORE-02' },
    { username: 'store03', fullName: 'Store Staff 3', empId: 'EMP-STORE-03' },
    { username: 'store04', fullName: 'Store Staff 4', empId: 'EMP-STORE-04' },
    { username: 'store05', fullName: 'Store Staff 5', empId: 'EMP-STORE-05' },
  ];

  for (const emp of storeEmployeeSeed) {
    if (!initialUsers.some((u) => u.username.toLowerCase() === emp.username)) {
      initialUsers.push({
        id: `seeded-${emp.username}`,
        fullName: emp.fullName,
        username: emp.username,
        email: `${emp.username}@jpmonitor.com`,
        employeeId: emp.empId,
        department: 'စတော့ဌာန',
        site: 'အဓိကလုပ်ငန်းခွင်',
        role: 'STORE_EMPLOYEE',
        status: 'ACTIVE',
        permissionOverrides: [],
        createdAt: new Date().toISOString(),
        createdBy: 'စနစ်',
        password: 'store123',
      });
    }
  }

  const employeeData68 = [
    { username: 'A0002', fullName: 'ဦးတင်ထူးအောင်', fatherName: 'ဦးထွန်းရင်', employeeId: 'STN-ALP-A0002', password: '@stnA0002', nrc: '၉/မကန(နိုင်)၀၆၁၅၈၉', address: 'ဝါးဘို' },
    { username: 'A0003', fullName: 'ဦးကျော်ဝင်း', fatherName: 'ဦးသောင်းထွန်း', employeeId: 'STN-ALP-A0003', password: '@stnA0003', nrc: '၆/', address: '' },
    { username: 'A0004', fullName: 'ဦးနိုင်လင်းထွန်း', fatherName: 'ဦးဌေးဝင်း', employeeId: 'STN-ALP-A0004', password: '@stnA0004', nrc: '၉/မယန(နိုင်)၂၄၃၃၃၇', address: '' },
    { username: 'A0005', fullName: 'ဦးဝင်းသောင်', fatherName: 'ဦးဌေးဝင်း', employeeId: 'STN-ALP-A0005', password: '@stnA0005', nrc: '၉/မယန(နိုင်)၁၅၇၄၆၅', address: '' },
    { username: 'A0006', fullName: 'မောင်ဝေဖြိုးပိုင်', fatherName: 'ဦးကံကောင်း', employeeId: 'STN-ALP-A0006', password: '@stnA0006', nrc: '၉/ဘအန(နိုင်)၀၅၅၄၄၇', address: '' },
    { username: 'A0007', fullName: 'မောင်ဆန်းဝင်းသူ', fatherName: 'ဦးစိန်', employeeId: 'STN-ALP-A0007', password: '@stnA0007', nrc: '၉/မနမ(နိုင်)၁၀၉၇၇၅', address: '' },
    { username: 'A0008', fullName: 'မောင်အောင်ဆန်းဝင်း', fatherName: 'ဦးသန်းလှိုင်', employeeId: 'STN-ALP-A0008', password: '@stnA0008', nrc: '၉/မအလ(နိုင်)၂၁၀၇၃၇', address: '' },
    { username: 'A0009', fullName: 'မိုးဟိန်း', fatherName: 'ဦးထွန်းလင်း', employeeId: 'STN-ALP-A0009', password: '@stnA0009', nrc: '၁၃/ကတန(နိုင်)၀၇၆၇၀၃', address: '' },
    { username: 'A0010', fullName: 'မောင်ဆန်းဦးထွန်း', fatherName: 'ဦးကျော်စိန်', employeeId: 'STN-ALP-A0010', password: '@stnA0010', nrc: '၁၃/ဟပန(နိုင်)၀၁၁၃၄၃', address: '' },
    { username: 'A0011', fullName: 'မောင်ကျော်သန့်', fatherName: 'ဦးလှစိုး', employeeId: 'STN-ALP-A0011', password: '@stnA0011', nrc: '၁၃/ကလတ(နိုင်)၁၁၇၉၀၃', address: '' },
    { username: 'A0012', fullName: 'မောင်သန်းထိုက်သူ', fatherName: 'ဦးအောင်ထွန်းလင်း', employeeId: 'STN-ALP-A0012', password: '@stnA0012', nrc: '၁၃/သနန(နိုင်)၀၅၄၉၈၀', address: '' },
    { username: 'A0013', fullName: 'ဦးမျိုး', fatherName: 'ဦးတင်လှ', employeeId: 'STN-ALP-A0013', password: '@stnA0013', nrc: '၉/မကန(နိုင်)၀၆၁၅၈၉', address: '' },
    { username: 'A0014', fullName: 'မောင်မျိုးသန့်', fatherName: 'ဦးကျော်သန်း', employeeId: 'STN-ALP-A0014', password: '@stnA0014', nrc: '၉/မနမ(နိုင်)၁၄၈၅၁၇', address: '' },
    { username: 'A0015', fullName: 'မောင်လှမျိုးဆန်း', fatherName: 'ဦးသန်းစိုး', employeeId: 'STN-ALP-A0015', password: '@stnA0015', nrc: '၇/ရတာ(နိုင်)၁၆၅၄၄၁', address: '' },
    { username: 'A0016', fullName: 'မောင်ခိုင်သူ', fatherName: 'ဦးမျိုးမင်းသန့်', employeeId: 'STN-ALP-A0016', password: '@stnA0016', nrc: '၉/မနမ(နိုင်)၁၄၄၄၃၇', address: '' },
    { username: 'A0017', fullName: 'မောင်စိုးသူ', fatherName: 'ဦးသန်းအောင်', employeeId: 'STN-ALP-A0017', password: '@stnA0017', nrc: '', address: '' },
    { username: 'A0018', fullName: 'ဦးအောင်မျိုး', fatherName: 'ဦးဉာဏ်ထွန်း', employeeId: 'STN-ALP-A0018', password: '@stnA0018', nrc: '၉/မယန(နိုင်)၀၄၁၆၅၂', address: '' },
    { username: 'A0019', fullName: 'မောင်ဆန်းထွန်း', fatherName: 'ဦးကျောက်တိုင်', employeeId: 'STN-ALP-A0019', password: '@stnA0019', nrc: '၇/မအတ(နိုင်)၁၅၈၇၀၅', address: '' },
    { username: 'A0020', fullName: 'မောင်ဆန်းလင်း', fatherName: 'ဦးဆန်းမောင်', employeeId: 'STN-ALP-A0020', password: '@stnA0020', nrc: '', address: 'ဝါးဘို' },
    { username: 'A0021', fullName: 'မောင်မျိုးသန့်', fatherName: 'ဦးအေးစိန်', employeeId: 'STN-ALP-A0021', password: '@stnA0021', nrc: '၅/ရဘန(နိုင်)၁၃၉၀၄၇', address: 'ဝါးဘို' },
    { username: 'A0022', fullName: 'မောင်ဆန်းဆန်းထွေး', fatherName: '', employeeId: 'STN-ALP-A0022', password: '@stnA0022', nrc: '', address: '' },
    { username: 'A0023', fullName: 'မောင်ပိုင်ချမ်းသာ', fatherName: 'ဦးကျော်ထူး', employeeId: 'STN-ALP-A0023', password: '@stnA0023', nrc: '၉/မယန(နိုင်)၂၄၃၃၃၇', address: '' },
    { username: 'A0024', fullName: 'မောင်ဖိုးပြည့်', fatherName: 'ဦးအောင်မြင့်', employeeId: 'STN-ALP-A0024', password: '@stnA0024', nrc: '၁၃/', address: '' },
    { username: 'A0025', fullName: 'မောင်ဆန်းဝင်းပိုင်', fatherName: 'ဦးမြတ်ဝင်း', employeeId: 'STN-ALP-A0025', password: '@stnA0025', nrc: '(ဒ်ု)၀၃၂၅၅၂', address: '' },
    { username: 'A0026', fullName: 'မောင်ဆန်းအောင်သူ', fatherName: 'ဦးအောင်လွင်', employeeId: 'STN-ALP-A0026', password: '@stnA0026', nrc: '၅/ဒပယ(နိုင်)၁၃၇၂၀၅', address: '' },
    { username: 'A0027', fullName: 'မောင်အောင်မျိုးသန့်', fatherName: 'ဦးအောင်စိန်', employeeId: 'STN-ALP-A0027', password: '@stnA0027', nrc: '၁၂/မကန(နိုင်)၀၃၅၄၄၅', address: '' },
    { username: 'A0028', fullName: 'မောင်ပြည့်ဖြိုးအောင်', fatherName: 'ဦးဝင်းဟန်', employeeId: 'STN-ALP-A0028', password: '@stnA0028', nrc: '၁၂/မနမ(နိုင်)၁၄၃၇၀၁', address: '' },
    { username: 'A0029', fullName: 'မောင်မျိုးပိုင်', fatherName: 'ဦးစိန်ခိုင်', employeeId: 'STN-ALP-A0029', password: '@stnA0029', nrc: '၁၃/', address: '' },
    { username: 'A0030', fullName: 'မောင်ကျော်သူဦး', fatherName: '', employeeId: 'STN-ALP-A0030', password: '@stnA0030', nrc: '၁၃/၀၇၆၆၆၂', address: '' },
    { username: 'A0031', fullName: 'မောင်ခိုင်', fatherName: '', employeeId: 'STN-ALP-A0031', password: '@stnA0031', nrc: '', address: '' },
    { username: 'A0032', fullName: 'ဦးသောင်ထန်း', fatherName: '', employeeId: 'STN-ALP-A0032', password: '@stnA0032', nrc: 'မရှိ', address: '' },
    { username: 'A0033', fullName: 'မောင်ချမ်းမြေ့', fatherName: 'ဦးထွန်း', employeeId: 'STN-ALP-A0033', password: '@stnA0033', nrc: '၉/မနမ(နိုင်)၁၄၄၇၀၃', address: '' },
    { username: 'A0034', fullName: 'မောင်ဝင်းစက်ပိုင်', fatherName: 'ဦးတင်မြင့်', employeeId: 'STN-ALP-A0034', password: '@stnA0034', nrc: '၁၂/မနမ(နိုင်)၀၁၅၂၂၆', address: '' },
    { username: 'A0035', fullName: 'မောင်ထာပြည့်စုံ', fatherName: 'ဦးတင်မျိုးနိုင်', employeeId: 'STN-ALP-A0035', password: '@stnA0035', nrc: '၁၂/မနမ(နိုင်)၁၂၅၀၇၃', address: '' },
    { username: 'A0036', fullName: 'မဝေဝေမွန်', fatherName: 'ဦးထွန်းဌေး', employeeId: 'STN-ALP-A0036', password: '@stnA0036', nrc: 'မရှိ', address: 'ဝါးဘို' },
    { username: 'A0037', fullName: 'မစန်းစန်းနွယ်', fatherName: 'ဦးဆန်းဌေး', employeeId: 'STN-ALP-A0037', password: '@stnA0037', nrc: 'မရှိ', address: '' },
    { username: 'A0038', fullName: 'ဒေါ်စုမွန်', fatherName: 'ဦးတင်ဝင်း', employeeId: 'STN-ALP-A0038', password: '@stnA0038', nrc: '၉/မကန(နိုင်)၀၆၁၅၈၈', address: '' },
    { username: 'A0039', fullName: 'မအိအိနွယ်', fatherName: 'ဦးလှမျိုး', employeeId: 'STN-ALP-A0039', password: '@stnA0039', nrc: '၉/မနမ(နိုင်)၁၄၁၅၈၇', address: 'မြိုင်မြိုင်' },
    { username: 'A0040', fullName: 'မဝေဝေအောင်(ခ)မခိုင်', fatherName: 'ဦးကျော်မြင့်', employeeId: 'STN-ALP-A0040', password: '@stnA0040', nrc: '၁၄/မအပ(နိုင်)၀၇၃၈၁၁', address: 'ဆင်မ‌လေး' },
    { username: 'A0041', fullName: 'ကိုနိုင်ကိုလင်း', fatherName: 'ဦးလှထွေး', employeeId: 'STN-ALP-A0041', password: '@stnA0041', nrc: '၃/ဘအန(နိုင်)၀၀၀၄၄၂', address: 'ဆင်မ‌လေး' },
    { username: 'A0042', fullName: 'မောင်မျိုးသူ', fatherName: 'ဦးထက်အောင်', employeeId: 'STN-ALP-A0042', password: '@stnA0042', nrc: '၇/မအတ(နိုင်)၂၂၄၆၄၅', address: '' },
    { username: 'A0043', fullName: 'မောင်ကျော်သူ', fatherName: 'ဦးစိုးနောင်', employeeId: 'STN-ALP-A0043', password: '@stnA0043', nrc: '၅/မနမ(နိုင်)၁၂၂၀၇၇', address: '' },
    { username: 'A0044', fullName: 'မောင်ကျော်စိုး', fatherName: 'ဦးဘိုနီ', employeeId: 'STN-ALP-A0044', password: '@stnA0044', nrc: '၇/တငန(နိုင်)၁၈၄၆၆၆', address: '' },
    { username: 'A0045', fullName: 'မောင်မျိုးမင်း', fatherName: 'ဦးဝင်းဌေး', employeeId: 'STN-ALP-A0045', password: '@stnA0045', nrc: '၈/မကန(နိုင်)၃၃၉၃၆၀', address: '' },
    { username: 'A0046', fullName: 'မောင်တောရာစိုး', fatherName: 'ဦးဝင်းဝေ', employeeId: 'STN-ALP-A0046', password: '@stnA0046', nrc: '၅/မနမ(နိုင်)၃၆၀၇၆၀', address: '' },
    { username: 'A0047', fullName: 'မောင်ထွေးလှိုင်', fatherName: 'ဦးတင်စိန်', employeeId: 'STN-ALP-A0047', password: '@stnA0047', nrc: '၅/ကသန(နိုင်)၁၁၁၄၆၉', address: '' },
    { username: 'A0048', fullName: 'မောင်ထွေးပိုင်', fatherName: 'ဦးမျိုးချစ်', employeeId: 'STN-ALP-A0048', password: '@stnA0048', nrc: '၅/ကသန(နိုင်)၁၈၇၇၁၅', address: '' },
    { username: 'A0049', fullName: 'မောင်ထွန်းကောင်', fatherName: 'ဦးကျော်ဝင်းစိန်', employeeId: 'STN-ALP-A0049', password: '@stnA0049', nrc: '၇/မအတ(နိုင်)၁၅၈ရ၃၇', address: '' },
    { username: 'A0050', fullName: 'မောင်လင်းထူး', fatherName: 'ဦးသောင်းထွန်း', employeeId: 'STN-ALP-A0050', password: '@stnA0050', nrc: '၇/ကတန(နိုင်)၁၃၀၃၆၀', address: '' },
    { username: 'A0051', fullName: 'မပြည့်စုံ', fatherName: 'ဦးအေးဌေး', employeeId: 'STN-ALP-A0051', password: '@stnA0051', nrc: '၅/မနမ(နိုင်)၂၅၈၁၁၂', address: '' },
    { username: 'A0052', fullName: 'မစန်းစန်းအေး', fatherName: 'ဦးချစ်အောင်', employeeId: 'STN-ALP-A0052', password: '@stnA0052', nrc: '၅/မနမ(နိုင်)၀၀၆၂၀၇', address: 'လက်ပံလှ' },
    { username: 'A0053', fullName: 'မောင်ယုနိုင်', fatherName: 'ဦးမျိုးအောင်', employeeId: 'STN-ALP-A0053', password: '@stnA0053', nrc: '', address: '' },
    { username: 'A0054', fullName: 'မောင်ထက်ထက်ပိုင်', fatherName: '', employeeId: 'STN-ALP-A0054', password: '@stnA0054', nrc: '', address: '' },
    { username: 'A0055', fullName: 'ဦးချစ်စန်း', fatherName: '', employeeId: 'STN-ALP-A0055', password: '@stnA0055', nrc: '', address: '' },
    { username: 'A0056', fullName: 'မောင်ကျော်ဆန်းဝင်း', fatherName: 'ဦးကျော်အောင်', employeeId: 'STN-ALP-A0056', password: '@stnA0056', nrc: 'မရှိ', address: '' },
    { username: 'A0057', fullName: 'မောင်မျိုးဆန်းအောင်', fatherName: 'ဦးစန်းမြင့်', employeeId: 'STN-ALP-A0057', password: '@stnA0057', nrc: 'မရှိ', address: '' },
    { username: 'A0058', fullName: 'မောင်မျိုးထက်အောင်', fatherName: 'ဦးကျော်အောင်', employeeId: 'STN-ALP-A0058', password: '@stnA0058', nrc: 'မရှိ', address: '' },
    { username: 'A0059', fullName: 'မောင်ပြည့်ဖြိုးဝင်း', fatherName: 'ဦးကြီးကို', employeeId: 'STN-ALP-A0059', password: '@stnA0059', nrc: '၉/နထက(နိုင်)၁၄၄၇၈၇', address: '' },
    { username: 'A0060', fullName: 'မောင်စိုးဝင်း', fatherName: 'ဦးအောင်ထွန်း', employeeId: 'STN-ALP-A0060', password: '@stnA0060', nrc: '၉/မနမ(နိုင်)၁၂၅၇၄၄', address: '' },
    { username: 'A0061', fullName: 'မောင်သက္ကားပိုင်', fatherName: 'ဦးထွန်းလွင်', employeeId: 'STN-ALP-A0061', password: '@stnA0061', nrc: '၉/ပယန(နိုင်)၁၄၃၂၆၅', address: '' },
    { username: 'A0062', fullName: 'မောင်ဆန်းလင်း', fatherName: 'ဦးဝင်း', employeeId: 'STN-ALP-A0062', password: '@stnA0062', nrc: '၉/မနမ(နိုင်)၁၉၆၄၃၂', address: '' },
    { username: 'A0063', fullName: 'မောင်မျိုးမြတ်ထွန်း', fatherName: 'ဦးစန်း', employeeId: 'STN-ALP-A0063', password: '@stnA0063', nrc: '၉/မနမ(နိုင်)၂၁၂၅၄၂', address: '' },
    { username: 'A0064', fullName: 'မောင်ဝင်းမင်းဌေး', fatherName: 'ဦးဟန်းသောင်', employeeId: 'STN-ALP-A0064', password: '@stnA0064', nrc: '၉/မနမ(နိုင်)၁၄၄၆၃၉', address: '' },
    { username: 'A0065', fullName: 'မောင်စိုးသူထက်', fatherName: 'ဦးစန်းဝင်း', employeeId: 'STN-ALP-A0065', password: '@stnA0065', nrc: '၉/မနမ(နိုင်)၃၃၃၃၉၃', address: '' },
    { username: 'A0066', fullName: 'ဦးနန္ဒကိုဝင်း', fatherName: 'ဦးကျော်အောင်', employeeId: 'STN-ALP-A0066', password: '@stnA0066', nrc: '', address: 'ကန်မြဲ' },
    { username: 'A0067', fullName: 'မောင်ဟိန်းထက်အောင်', fatherName: 'ဦးမြိုင်', employeeId: 'STN-ALP-A0067', password: '@stnA0067', nrc: '၉/မနမ(နိုင်)၁၇၃၆၁၀', address: '' },
    { username: 'A0068', fullName: 'မောင်မင်းသူအောင်', fatherName: 'ဦးလှစိန်', employeeId: 'STN-ALP-A0068', password: '@stnA0068', nrc: '၉/မနမ(နိုင်)၁၀၀၆၂၇', address: '' },
    { username: 'A0069', fullName: 'မဆန်းဆန်းထွေး', fatherName: 'ဦးမြတ်စိုး', employeeId: 'STN-ALP-A0069', password: '@stnA0069', nrc: '၉/မနမ(နိုင်)၁၅၀ရ၇၇', address: '' }
  ];

  for (const emp of employeeData68) {
    if (!initialUsers.some((u) => u.username.toLowerCase() === emp.username.toLowerCase())) {
      initialUsers.push({
        id: `seeded-${emp.username}`,
        fullName: emp.fullName,
        fatherName: emp.fatherName,
        username: emp.username,
        email: `${emp.username.toLowerCase()}@jpmonitor.com`,
        employeeId: emp.employeeId,
        department: 'ထုတ်လုပ်ရေး',
        site: 'ထုတ်လုပ်ရေး',
        role: 'OPERATOR',
        status: 'ACTIVE',
        nrc: emp.nrc,
        address: emp.address,
        permissionOverrides: [],
        createdAt: new Date().toISOString(),
        createdBy: 'စနစ်',
        password: emp.password,
      });
    }
  }

  if (initialUsers.length > 0) saveManagedUsers(initialUsers);
  return initialUsers;
};

export const saveManagedUsers = (users: ManagedUser[]): void => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(RBAC_STORAGE_KEY, JSON.stringify(users));
};

export const loadRBACAudit = (): RBACAuditEntry[] => {
  if (!canUseStorage()) return [];
  try {
    return JSON.parse(window.localStorage.getItem(RBAC_AUDIT_STORAGE_KEY) || '[]') as RBACAuditEntry[];
  } catch {
    return [];
  }
};

export const recordRBACAudit = (
  action: string,
  targetUsername: string,
  details: string,
  actor?: RBACUserLike | null,
): RBACAuditEntry => {
  const entry: RBACAuditEntry = {
    id: `rbac-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    targetUsername,
    details,
    actor: actor?.username || actor?.fullName || 'စနစ်',
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...loadRBACAudit()].slice(0, 200);
  if (canUseStorage()) window.localStorage.setItem(RBAC_AUDIT_STORAGE_KEY, JSON.stringify(next));
  return entry;
};
