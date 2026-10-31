import React from 'react';
import { Cloud, CheckCircle2, ShieldCheck, Smartphone, Users, X, Database, ArrowRight } from 'lucide-react';
import { getStaffList, getActiveStaff, setActiveStaffId } from '../../services/storage';

interface CloudSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestFirebaseSetup: () => void;
}

export const CloudSetupModal: React.FC<CloudSetupModalProps> = ({
  isOpen,
  onClose,
  onRequestFirebaseSetup,
}) => {
  const staff = getStaffList();
  const activeStaff = getActiveStaff();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-800 to-amber-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-700/60 border border-amber-600/50">
              <Cloud className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Cloud & Family Multi-Phone Sync</h3>
              <p className="text-xs text-amber-200">Welcome Agarbatti Data Architecture</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-amber-300 hover:text-white hover:bg-amber-800/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-sm text-stone-700">
          {/* Status Box */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-semibold">
              <Database className="w-4 h-4 text-amber-700" />
              <span>Current Status: Local Offline-First Storage Active</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              All customer records, bills, follow-up logs, and WhatsApp links are 100% functional, saved in persistent storage, and can be exported as JSON backups anytime.
            </p>
          </div>

          {/* Family multi-phone workflow */}
          <div className="space-y-3">
            <h4 className="font-bold text-stone-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-700" />
              Family Member Phone Accounts
            </h4>
            <p className="text-xs text-stone-600">
              Simulate or test what each family member sees when logged into their phone:
            </p>

            <div className="grid grid-cols-1 gap-2">
              {staff.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setActiveStaffId(s.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                    activeStaff.id === s.id
                      ? 'bg-amber-100/70 border-amber-500 shadow-xs'
                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        activeStaff.id === s.id
                          ? 'bg-amber-800 text-white'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {s.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="font-semibold text-stone-900 text-xs sm:text-sm">{s.name}</div>
                      <div className="text-xs text-stone-500">{s.role} • {s.relationship}</div>
                    </div>
                  </div>
                  {activeStaff.id === s.id ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active Phone
                    </span>
                  ) : (
                    <span className="text-xs text-stone-500 hover:text-amber-800 font-medium">
                      Switch to this user
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Cloud Firestore Integration Step */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <h4 className="font-bold text-stone-900 flex items-center gap-2 text-xs sm:text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Next Step: Connect Firebase Cloud Sync
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              When ready to synchronize Father's and Brother's phones in real-time over the internet with Firebase Authentication and Firestore security rules, click the button below to initiate Firebase provisioning in Google AI Studio.
            </p>
            <button
              onClick={() => {
                onClose();
                onRequestFirebaseSetup();
              }}
              className="mt-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow active:scale-98 transition"
            >
              <span>Initiate Firebase Setup Flow</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-stone-50 p-4 border-t border-stone-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-stone-700 hover:bg-stone-200 font-semibold text-xs sm:text-sm transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
