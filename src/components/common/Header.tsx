import React, { useState } from 'react';
import { Flame, UserCheck, Cloud, ChevronDown, Settings } from 'lucide-react';
import { getActiveStaff, getStaffList, setActiveStaffId, getSettings } from '../../services/storage';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  onOpenCloudModal: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCloudModal, onOpenSettings }) => {
  const settings = getSettings();
  const activeStaff = getActiveStaff();
  const staffList = getStaffList();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-stone-900 text-stone-100 shadow-md border-b border-amber-900/40">
      {/* Top golden accent bar */}
      <div className="h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-700" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50/95 p-0.5 shadow-md border border-amber-400/60 shrink-0 overflow-hidden flex items-center justify-center">
            <img
              src="/logo.jpeg"
              alt="Welcome Agarbatti Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base sm:text-xl tracking-tight text-white leading-tight">
                {settings.businessName}
              </h1>
              <span className="hidden xs:inline-block px-1.5 py-0.2 text-[10px] uppercase font-bold tracking-wider bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-amber-200/90 hidden sm:block truncate max-w-xs font-medium">
              सौ. उमा बिल्ला यांचे वेलकम अगरबत्ती
            </p>
          </div>
        </div>

        {/* Right side actions: Staff selector, Cloud sync status, PWA install */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA Install */}
          <PWAInstallButton />

          {/* Cloud Sync Status Indicator */}
          <button
            onClick={onOpenCloudModal}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 transition"
            title="Cloud & Sync Status"
          >
            <Cloud className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Sync: Ready</span>
          </button>

          {/* Active staff switcher */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs sm:text-sm font-medium text-stone-200 transition"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="max-w-[100px] sm:max-w-[130px] truncate text-left">
                {activeStaff.name.split(' ')[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white text-stone-900 shadow-xl border border-stone-200 py-1.5 z-50">
                <div className="px-3 py-1.5 border-b border-stone-100 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Select Active Phone / User
                </div>
                {staffList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveStaffId(s.id);
                      setShowUserDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-amber-50 ${
                      activeStaff.id === s.id ? 'bg-amber-50/80 font-bold text-amber-900' : 'text-stone-700'
                    }`}
                  >
                    <div>
                      <div>{s.name}</div>
                      <div className="text-[10px] text-stone-400">{s.role} • {s.relationship}</div>
                    </div>
                    {activeStaff.id === s.id && (
                      <span className="w-2 h-2 rounded-full bg-amber-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Small settings icon for business settings & backup */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition"
            title="Business Settings & Backup"
          >
            <Settings className="w-4 h-4 text-stone-300" />
          </button>
        </div>
      </div>
    </header>
  );
};
