import React from 'react';
import {
  LayoutDashboard,
  Users,
  BellRing,
  FileText,
} from 'lucide-react';
import { Customer } from '../../types';
import { determineFollowUpStatus } from '../../services/formatters';

export type NavTab = 'dashboard' | 'customers' | 'reminders' | 'billing';

interface NavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  customers: Customer[];
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  customers,
}) => {
  // Pending reminders count (Due Today + Overdue)
  const pendingRemindersCount = customers.filter((c) => {
    if (c.isArchived) return false;
    const st = determineFollowUpStatus(c.nextFollowUpDate, c.followUpStatus);
    return st === 'Due Today' || st === 'Overdue';
  }).length;

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'customers' as NavTab,
      label: 'Customers',
      icon: Users,
    },
    {
      id: 'reminders' as NavTab,
      label: 'Reminders',
      icon: BellRing,
      badge: pendingRemindersCount,
    },
    {
      id: 'billing' as NavTab,
      label: 'Billing',
      icon: FileText,
      highlight: true,
    },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar (Large touch targets for Father and Brother) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-900 border-t border-amber-900/40 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.25)]">
        <div className="grid grid-cols-4 h-16 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center h-full w-full relative transition active:scale-95 ${
                  isActive
                    ? 'text-amber-400 font-extrabold'
                    : 'text-stone-400 hover:text-stone-200 font-medium'
                }`}
              >
                <div className="relative">
                  <div
                    className={`p-1.5 rounded-xl transition ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-400'
                        : item.highlight
                        ? 'bg-amber-600/15 text-amber-300'
                        : ''
                    }`}
                  >
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1 -right-2 bg-rose-600 text-white font-extrabold text-[11px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center animate-pulse shadow">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="text-xs mt-0.5 tracking-tight truncate">
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-8 h-1 bg-amber-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 bg-stone-900 text-stone-200 border-r border-amber-950 p-4 shrink-0 shadow-lg min-h-[calc(100vh-60px)]">
        <div className="text-xs font-bold text-amber-400/90 uppercase tracking-wider px-3 mb-4">
          Main Navigation
        </div>
        <div className="space-y-2 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-base font-bold transition active:scale-98 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md'
                    : item.highlight
                    ? 'bg-amber-950/70 text-amber-300 hover:bg-amber-900/50 border border-amber-800/40'
                    : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-amber-200' : 'text-stone-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="bg-rose-600 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-xs">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Logo and business branding in sidebar */}
        <div className="mt-auto p-3.5 rounded-2xl bg-stone-800/90 border border-stone-700/60 text-xs text-stone-300 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50/90 p-0.5 border border-amber-400/50 shrink-0 overflow-hidden flex items-center justify-center">
            <img
              src="/logo.jpeg"
              alt="Welcome Agarbatti Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-amber-300 font-bold">सौ. उमा बिल्ला यांचे</div>
            <div className="font-extrabold text-white text-xs truncate">Welcome Agarbatti</div>
            <p className="text-stone-400 text-[10px] truncate">
              Business Suite
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
