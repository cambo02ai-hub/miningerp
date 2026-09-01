export type AppRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'STOCK_MANAGER'
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
  username: string;
  email: string;
  employeeId: string;
  department: string;
  site: string;
  role: AppRole;
  status: AccountStatus;
  permissionOverrides: PermissionOverride[];
  createdAt: string;
  createdBy: string;
  lastLoginAt?: string;
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
      ['dashboard.view', 'production.view', 'production.create', 'production.edit', 'production.approve', 'production.export', 'fleet.view', 'fleet.approve', 'fleet.export', 'mutation.view', 'mutation.approve', 'mutation.export', 'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.approve', 'inventory.export', 'maintenance.view', 'maintenance.approve', 'maintenance.export', 'employee.view', 'employee.export', 'supplier.view', 'supplier.export', 'debt.view', 'debt.approve', 'debt.export', 'location.view', 'hse.view', 'hse.approve', 'hse.export', 'timesheet.view', 'timesheet.approve', 'timesheet.export', 'audit.view', 'audit.export'].includes(key),
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
    value: 'SUPERVISOR',
    label: 'ကြီးကြပ်သူ',
    description: 'နေ့စဉ်လုပ်ငန်းဒေတာများကို ထည့်သွင်း၊ ပြင်ဆင်၊ စောင့်ကြည့်နိုင်သည်။',
    permissions: permissionKeys.filter((key) =>
      ['dashboard.view', 'production.view', 'production.create', 'production.edit', 'production.export', 'fleet.view', 'fleet.create', 'fleet.edit', 'mutation.view', 'mutation.create', 'mutation.edit', 'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.export', 'maintenance.view', 'maintenance.create', 'maintenance.edit', 'maintenance.export', 'employee.view', 'supplier.view', 'supplier.create', 'debt.view', 'location.view', 'hse.view', 'hse.create', 'hse.edit', 'timesheet.view', 'timesheet.create', 'timesheet.edit', 'audit.view'].includes(key),
    ),
  },
  {
    value: 'OPERATOR',
    label: 'လုပ်ငန်းဆောင်ရွက်သူ',
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
  const normalized = String(role ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === 'SUPER_ADMIN' || normalized === 'SUPERADMIN' || normalized === 'SUPER_ADMINISTRATOR') return 'SUPER_ADMIN';
  if (normalized === 'ADMIN' || normalized === 'ADMINISTRATOR' || normalized === 'SYSTEM_ADMIN') return 'ADMIN';
  if (normalized === 'STOCK_MANAGER' || normalized === 'STOCKMANAGER') return 'STOCK_MANAGER';
  if (normalized === 'MANAGER') return 'MANAGER';
  if (normalized === 'SUPERVISOR') return 'SUPERVISOR';
  if (normalized === 'OPERATOR') return 'OPERATOR';
  return 'VIEWER';
};

export const getRolePermissions = (role?: string | null): PermissionKey[] => {
  const normalized = normalizeRole(role);
  return ROLE_DEFINITIONS.find((definition) => definition.value === normalized)?.permissions ?? [];
};

export const getEffectivePermissions = (user?: RBACUserLike | null): Set<PermissionKey> => {
  const effective = new Set<PermissionKey>(
    user?.permissions?.length ? user.permissions : getRolePermissions(user?.role),
  );
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

  if (!actor?.username) return [];
  const bootstrap: ManagedUser = {
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
  };
  saveManagedUsers([bootstrap]);
  return [bootstrap];
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
