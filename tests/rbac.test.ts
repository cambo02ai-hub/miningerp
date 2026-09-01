import { beforeEach, describe, expect, it } from 'vitest';
import {
  PERMISSION_CATALOG,
  ROLE_DEFINITIONS,
  getEffectivePermissions,
  hasPermission,
  normalizeRole,
} from '../services/rbac';

describe('RBAC permission model', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('normalizes supported role names', () => {
    expect(normalizeRole('Super Admin')).toBe('SUPER_ADMIN');
    expect(normalizeRole('admin')).toBe('ADMIN');
    expect(normalizeRole('Administrator')).toBe('ADMIN');
    expect(normalizeRole('Supervisor')).toBe('SUPERVISOR');
    expect(normalizeRole('unknown-role')).toBe('VIEWER');
  });

  it('gives Super Admin all catalog permissions', () => {
    const permissions = getEffectivePermissions({ role: 'SUPER_ADMIN' });
    expect(permissions.size).toBe(PERMISSION_CATALOG.length);
    expect(hasPermission({ role: 'SUPER_ADMIN' }, 'user_management.manage')).toBe(true);
    expect(hasPermission({ role: 'SUPER_ADMIN' }, 'roles.manage')).toBe(true);
  });

  it('limits operator permissions to daily operations', () => {
    expect(hasPermission({ role: 'OPERATOR' }, 'production.create')).toBe(true);
    expect(hasPermission({ role: 'OPERATOR' }, 'inventory.create')).toBe(true);
    expect(hasPermission({ role: 'OPERATOR' }, 'user_management.manage')).toBe(false);
    expect(hasPermission({ role: 'OPERATOR' }, 'inventory.delete')).toBe(false);
  });

  it('allows Manager role to manage master stock data but not process transaction directly if disabled', () => {
    expect(hasPermission({ role: 'MANAGER' }, 'inventory.create')).toBe(true);
    expect(hasPermission({ role: 'MANAGER' }, 'inventory.edit')).toBe(true);
    expect(hasPermission({ role: 'MANAGER' }, 'inventory.delete')).toBe(false);
  });

  it('applies DENY and ALLOW user overrides', () => {
    const user = {
      role: 'SUPERVISOR',
      permissionOverrides: [
        { permission: 'inventory.create' as const, effect: 'DENY' as const },
        { permission: 'inventory.delete' as const, effect: 'ALLOW' as const },
      ],
    };
    expect(hasPermission(user, 'inventory.create')).toBe(false);
    expect(hasPermission(user, 'inventory.delete')).toBe(true);
  });

  it('keeps role definitions internally consistent', () => {
    const allKeys = new Set(PERMISSION_CATALOG.map((permission) => permission.key));
    for (const role of ROLE_DEFINITIONS) {
      expect(role.permissions.every((permission) => allKeys.has(permission))).toBe(true);
    }
  });
});
