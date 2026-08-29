import { translateValue } from '../utils/locale';
import { hasPermission, PermissionKey } from '../services/rbac';
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Hammer, Truck, FileText, Activity, PackageSearch, ArrowRightLeft, Users, ShoppingBag, MapPin, Clock, Landmark, LogOut, Moon, Sun, ShieldCheck, Pickaxe } from 'lucide-react';

interface NavProps {
  currentUser?: any;
  onLogout?: () => void;
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  'w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-jpmonitor-md transition-all duration-200 ' +
  (isActive ? 'bg-jpmonitor-red text-white font-medium' : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary');

const Navigation: React.FC<NavProps> = ({ currentUser, onLogout }) => {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('jpmonitor-dark-mode');
      if (stored !== null) return stored === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('jpmonitor-dark-mode', String(darkMode));
  }, [darkMode]);

  const menuItems = [
    { id: 'dashboard', label: 'ဒက်ရှ်ဘုတ်', icon: LayoutDashboard },
    { id: 'fleet', label: 'ယာဉ်/စက် စီမံခန့်ခွဲမှု', icon: Truck },
    { id: 'mutation', label: 'ယူနစ် ပြောင်းရွှေ့မှု', icon: ArrowRightLeft },
    { id: 'inventory', label: 'စတော့', icon: PackageSearch },
    { id: 'production', label: 'ထုတ်လုပ်ရေး', icon: Hammer },
    { id: 'contractor-mining', label: 'Contractor Mining', icon: Pickaxe },
    { id: 'timesheet', label: 'အလုပ်ချိန်မှတ်တမ်းများ', icon: Clock },
    { id: 'employee', label: 'ဝန်ထမ်းနှင့် HR', icon: Users },
    { id: 'supplier', label: 'ပစ္စည်းရောင်းချသူများ', icon: ShoppingBag },
    { id: 'debt', label: 'ဘဏ္ဍာရေး', icon: Landmark },
    { id: 'location', label: 'တည်နေရာများ', icon: MapPin },
    { id: 'hse', label: 'HSE နှင့် ဘေးကင်းရေး', icon: Activity },
    { id: 'audit', label: 'စစ်ဆေးမှတ်တမ်းများ', icon: FileText },
    { id: 'user-management', label: 'အသုံးပြုသူနှင့် Permission', icon: ShieldCheck, requiredPermission: 'user_management.view' as PermissionKey },
  ];

  return (
    <div className="w-64 bg-bg-panel border-r border-border flex flex-col h-screen fixed left-0 top-0 z-20 transition-colors duration-300">
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex font-black text-2xl tracking-tighter leading-none">
              <span className="text-jpmonitor-red">J</span>
              <span className="text-jpmonitor-red transform translate-y-1">P</span>
              <span className="text-jpmonitor-red">M</span>
            </div>
            <div>
              <h1 className="text-xs font-semibold text-text-primary leading-tight">jpmonitor</h1>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">သတ္တုတွင်းလုပ်ငန်း</p>
            </div>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-1.5 rounded-jpmonitor border border-border hover:bg-bg-elevated transition-colors text-text-muted" aria-label="အမှောင်ပုံစံ ပြောင်းရန်">
            {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>

      <nav className="flex-1 py-4 space-y-0.5 px-3 overflow-y-auto">
        {menuItems.map((item) => {
          if (item.requiredPermission && !hasPermission(currentUser, item.requiredPermission)) return null;
          const Icon = item.icon;
          const to = item.id === 'dashboard' ? '/' : `/${item.id}`;
          return (
            <NavLink key={item.id} to={to} className={linkClass}>
              <Icon size={16} className="flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        {currentUser && (
          <div className="mb-3 px-2">
            <p className="text-xs text-text-muted uppercase font-medium tracking-wider">{currentUser.fullName || 'Admin'}</p>
            <p className="text-xs text-text-muted mt-0.5">{translateValue(currentUser.role || 'Super Admin')}</p>
          </div>
        )}
        {onLogout && (
          <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-jpmonitor-red hover:bg-jpmonitor-red-subtle rounded-jpmonitor-md transition-colors">
            <LogOut size={16} />
            <span>ထွက်ရန်</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Navigation;
