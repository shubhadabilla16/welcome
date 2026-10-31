import React, { useState, useEffect, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Store,
  Clock,
  MessageSquare,
  Users,
  Download,
  Upload,
  ShieldCheck,
  Check,
  Cloud,
  FileText,
  AlertCircle,
  HelpCircle,
  Smartphone,
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  Database,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Code,
  Copy,
  Lock,
  LogIn,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { BusinessSettings, StaffMember, Owner } from '../../types';
import {
  getSupabaseUrl,
  getSupabasePublishableKey,
  saveCustomSupabaseConfig,
  normalizeSupabaseUrl,
  testSupabaseConnection,
  ConnectionTestResult,
  queryOwnersTable,
  QueryOwnersResult,
  signInSupabaseUser,
  signOutSupabaseUser,
  getActiveSupabaseUser,
} from '../../services/supabase';
import {
  getSettings,
  saveSettings,
  getStaffList,
  saveStaffList,
  exportAllDataJSON,
  importAllDataJSON,
  getOwners,
  addOwner,
  updateOwner,
  deleteOwner,
  subscribeToStore,
} from '../../services/storage';
import { CloudMigrationCenter } from '../cloud/CloudMigrationCenter';

interface SettingsViewProps {
  onOpenCloudModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenCloudModal }) => {
  const [settings, setSettings] = useState<BusinessSettings>(getSettings());
  const [staffList, setStaffList] = useState<StaffMember[]>(getStaffList());
  const [owners, setOwners] = useState<Owner[]>(getOwners());
  const [newOwnerName, setNewOwnerName] = useState('');
  const [editingOwnerId, setEditingOwnerId] = useState<string | null>(null);
  const [editingOwnerName, setEditingOwnerName] = useState('');
  const [ownerError, setOwnerError] = useState<string | null>(null);

  // Supabase connection configuration & test state
  const [supabaseUrl, setSupabaseUrl] = useState<string>(getSupabaseUrl());
  const [supabaseKey, setSupabaseKey] = useState<string>(getSupabasePublishableKey());
  const [showSupabaseKey, setShowSupabaseKey] = useState<boolean>(false);
  const [testingSupabase, setTestingSupabase] = useState<boolean>(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<ConnectionTestResult | null>(null);
  const [supabaseKeySavedNotice, setSupabaseKeySavedNotice] = useState<boolean>(false);

  // Owners table live query state
  const [queryingOwners, setQueryingOwners] = useState<boolean>(false);
  const [ownersQueryResult, setOwnersQueryResult] = useState<QueryOwnersResult | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Supabase User Authentication state for testing protected RLS queries
  const [activeSupabaseUser, setActiveSupabaseUser] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string>('shubhadabilla@gmail.com');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authMsg, setAuthMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [showAuthSection, setShowAuthSection] = useState<boolean>(false);

  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const isEnvKeyConfigured = Boolean(
    envKey &&
    envKey.trim() !== '' &&
    envKey !== 'YOUR_SUPABASE_ANON_KEY' &&
    !envKey.includes('placeholder')
  );

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check active Supabase session & run connection test on mount
  useEffect(() => {
    getActiveSupabaseUser().then((user) => {
      if (user?.email) {
        setActiveSupabaseUser(user.email);
      }
    });

    const currentKey = getSupabasePublishableKey();
    if (currentKey && currentKey.trim() !== '') {
      handleTestSupabase();
    }
  }, []);

  const handleTestSupabase = async () => {
    const cleanUrl = normalizeSupabaseUrl(supabaseUrl);
    setSupabaseUrl(cleanUrl);
    saveCustomSupabaseConfig(cleanUrl, supabaseKey);

    setTestingSupabase(true);
    setSupabaseTestResult(null);
    try {
      const result = await testSupabaseConnection();
      setSupabaseTestResult(result);
    } catch (err: any) {
      setSupabaseTestResult({
        success: false,
        message: 'Connection test failed: ' + (err?.message || String(err)),
      });
    } finally {
      setTestingSupabase(false);
    }
  };

  const handleQueryOwners = async () => {
    const cleanUrl = normalizeSupabaseUrl(supabaseUrl);
    setSupabaseUrl(cleanUrl);
    saveCustomSupabaseConfig(cleanUrl, supabaseKey);

    setQueryingOwners(true);
    try {
      const result = await queryOwnersTable();
      setOwnersQueryResult(result);
    } catch (err: any) {
      setOwnersQueryResult({
        success: false,
        message: 'Failed to execute query: ' + (err?.message || String(err)),
      });
    } finally {
      setQueryingOwners(false);
    }
  };

  const handleSaveAndTestSupabase = async () => {
    const cleanUrl = normalizeSupabaseUrl(supabaseUrl);
    setSupabaseUrl(cleanUrl);
    saveCustomSupabaseConfig(cleanUrl, supabaseKey);
    setSupabaseKeySavedNotice(true);
    setTimeout(() => setSupabaseKeySavedNotice(false), 3000);
    await handleTestSupabase();
  };

  const handleSignInSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword) {
      setAuthMsg({ success: false, text: 'Please enter both email and password.' });
      return;
    }
    setAuthLoading(true);
    setAuthMsg(null);
    try {
      const res = await signInSupabaseUser(authEmail, authPassword);
      if (res.success && res.user) {
        setActiveSupabaseUser(res.user.email || authEmail);
        setAuthMsg({
          success: true,
          text: `Signed in as ${res.user.email}! Re-running SELECT query with authenticated role...`,
        });
        setAuthPassword('');
        // Automatically re-run owners query with new authenticated session
        await handleQueryOwners();
      } else {
        setAuthMsg({
          success: false,
          text: res.error || 'Failed to sign in. Please verify your credentials in Supabase Auth.',
        });
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOutSupabase = async () => {
    setAuthLoading(true);
    try {
      await signOutSupabaseUser();
      setActiveSupabaseUser(null);
      setAuthMsg({ success: true, text: 'Signed out of Supabase account.' });
      // Re-run query to show RLS unauthenticated behavior
      await handleQueryOwners();
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  React.useEffect(() => {
    const unsub = subscribeToStore(() => {
      setOwners(getOwners());
      setStaffList(getStaffList());
    });
    return () => unsub();
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(settings);
    saveStaffList(staffList);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleExportBackup = () => {
    const jsonStr = exportAllDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `welcome_agarbatti_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importAllDataJSON(content);
      if (res.success) {
        setImportStatus('Backup restored successfully!');
        setSettings(getSettings());
        setStaffList(getStaffList());
      } else {
        setImportStatus(`Restore error: ${res.message}`);
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-amber-700" />
            <span>Business Settings & Administration</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Configure Welcome Agarbatti details, reminder policies, WhatsApp templates and staff roles.
          </p>
        </div>

        {saveSuccess && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold animate-pulse">
            <Check className="w-4 h-4" />
            <span>Changes Saved!</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Business Profile */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider pb-2 border-b border-stone-100">
            <Store className="w-4 h-4 text-amber-700" />
            <span>1. Business Profile & Invoicing Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Business Name</label>
              <input
                type="text"
                required
                value={settings.businessName}
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Tagline / Subtitle</label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-medium text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Primary Business Phone</label>
              <input
                type="tel"
                required
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-medium text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Alternate Phone</label>
              <input
                type="tel"
                value={settings.alternatePhone || ''}
                onChange={(e) => setSettings({ ...settings, alternatePhone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-medium text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-stone-700 mb-1">Business Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-medium text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">City & Pincode</label>
              <input
                type="text"
                value={settings.cityPincode}
                onChange={(e) => setSettings({ ...settings, cityPincode: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-medium text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                placeholder="27AABCP1234D1Z5"
                value={settings.gstin || ''}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={settings.invoicePrefix}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">UPI ID (for payments on bill)</label>
              <input
                type="text"
                placeholder="welcomeagarbatti@okhdfcbank"
                value={settings.upiId || ''}
                onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Repeat-Order Reminder Defaults */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider pb-2 border-b border-stone-100">
            <Clock className="w-4 h-4 text-amber-700" />
            <span>2. Default Repeat-Order Reminders Policy</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Default Reminder Interval (Days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.defaultReminderDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultReminderDays: parseInt(e.target.value, 10) || 30,
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold text-sm"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Typically 30 days for retailers, 15 days for quick replenishment wholesale buyers.
              </p>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Reminder Calculation Rule
              </label>
              <select
                value={settings.defaultReminderRule}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultReminderRule: e.target.value as 'fixed_days' | 'calendar_month',
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 font-bold text-sm"
              >
                <option value="fixed_days">Fixed Days (+30 Days from bill)</option>
                <option value="calendar_month">Calendar Month (Same date next month)</option>
              </select>
              <p className="text-[11px] text-stone-500 mt-1">
                Calendar month sets the reminder on the identical date next month (e.g. 1 Oct → 1 Nov).
              </p>
            </div>
          </div>
        </div>

        {/* WhatsApp Message Templates */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider pb-2 border-b border-stone-100">
            <MessageSquare className="w-4 h-4 text-amber-700" />
            <span>3. WhatsApp Message Templates (Multi-Language)</span>
          </div>

          <p className="text-xs text-stone-600">
            Supported tags: <code className="bg-stone-100 px-1 py-0.5 rounded text-amber-900 font-bold">&#123;&#123;customer_name&#125;&#125;</code>, <code className="bg-stone-100 px-1 py-0.5 rounded text-amber-900 font-bold">&#123;&#123;business_name&#125;&#125;</code>, <code className="bg-stone-100 px-1 py-0.5 rounded text-amber-900 font-bold">&#123;&#123;last_purchase_date&#125;&#125;</code>, <code className="bg-stone-100 px-1 py-0.5 rounded text-amber-900 font-bold">&#123;&#123;last_amount&#125;&#125;</code>.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-stone-800 mb-1">English Template</label>
              <textarea
                rows={3}
                value={settings.templates.english}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    templates: { ...settings.templates, english: e.target.value },
                  })
                }
                className="w-full p-3 rounded-xl border border-stone-300 font-sans text-xs leading-relaxed"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-800 mb-1">Hindi (हिंदी) Template</label>
              <textarea
                rows={3}
                value={settings.templates.hindi}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    templates: { ...settings.templates, hindi: e.target.value },
                  })
                }
                className="w-full p-3 rounded-xl border border-stone-300 font-sans text-xs leading-relaxed"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-800 mb-1">Marathi (मराठी) Template</label>
              <textarea
                rows={3}
                value={settings.templates.marathi}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    templates: { ...settings.templates, marathi: e.target.value },
                  })
                }
                className="w-full p-3 rounded-xl border border-stone-300 font-sans text-xs leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Manage Owners */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
              <UserCheck className="w-4 h-4 text-amber-700" />
              <span>4. Manage Owners ({owners.length})</span>
            </div>
          </div>

          <p className="text-xs text-stone-600">
            Add, edit, or remove business owners. These names appear in the active user switcher and whenever an owner is assigned or selected.
          </p>

          {ownerError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{ownerError}</span>
            </div>
          )}

          {/* Add Owner form */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-300 space-y-2">
            <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider">
              Add New Owner
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Enter owner name (e.g. Hariniwas Billa)"
                value={newOwnerName}
                onChange={(e) => setNewOwnerName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-stone-300 bg-white font-bold text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setOwnerError(null);
                  const trimmed = newOwnerName.trim();
                  if (!trimmed) {
                    setOwnerError('Please enter an owner name.');
                    return;
                  }
                  if (owners.some((o) => o.name.toLowerCase() === trimmed.toLowerCase())) {
                    setOwnerError('An owner with this name already exists.');
                    return;
                  }
                  addOwner(trimmed);
                  setNewOwnerName('');
                }}
                className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 active:scale-98 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Owner</span>
              </button>
            </div>
          </div>

          {/* Owner list */}
          <div className="space-y-2">
            {owners.map((owner, idx) => (
              <div
                key={owner.id}
                className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3 text-xs hover:bg-stone-100/70 transition"
              >
                {editingOwnerId === owner.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editingOwnerName}
                      onChange={(e) => setEditingOwnerName(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-amber-500 font-bold text-stone-900 text-sm bg-white"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setOwnerError(null);
                          const trimmed = editingOwnerName.trim();
                          if (!trimmed) {
                            setOwnerError('Owner name cannot be empty.');
                            return;
                          }
                          if (
                            owners.some(
                              (o) =>
                                o.id !== owner.id &&
                                o.name.toLowerCase() === trimmed.toLowerCase()
                            )
                          ) {
                            setOwnerError('Another owner with this name already exists.');
                            return;
                          }
                          updateOwner(owner.id, trimmed);
                          setEditingOwnerId(null);
                          setEditingOwnerName('');
                        }
                        if (e.key === 'Escape') {
                          setEditingOwnerId(null);
                          setEditingOwnerName('');
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setOwnerError(null);
                        const trimmed = editingOwnerName.trim();
                        if (!trimmed) {
                          setOwnerError('Owner name cannot be empty.');
                          return;
                        }
                        if (
                          owners.some(
                            (o) =>
                              o.id !== owner.id &&
                              o.name.toLowerCase() === trimmed.toLowerCase()
                          )
                        ) {
                          setOwnerError('Another owner with this name already exists.');
                          return;
                        }
                        updateOwner(owner.id, trimmed);
                        setEditingOwnerId(null);
                        setEditingOwnerName('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingOwnerId(null);
                        setEditingOwnerName('');
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-stone-600 text-xs hover:bg-stone-100"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-extrabold text-stone-900 text-sm">
                          {owner.name}
                        </div>
                        <div className="text-[11px] text-stone-400">Owner & Manager</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOwnerId(owner.id);
                          setEditingOwnerName(owner.name);
                          setOwnerError(null);
                        }}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-amber-800 hover:bg-amber-50 transition"
                        title="Edit owner name"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOwnerError(null);
                          if (owners.length <= 1) {
                            setOwnerError('At least one owner must be maintained.');
                            return;
                          }
                          if (confirm(`Are you sure you want to remove owner "${owner.name}"?`)) {
                            deleteOwner(owner.id);
                            if (editingOwnerId === owner.id) {
                              setEditingOwnerId(null);
                              setEditingOwnerName('');
                            }
                          }
                        }}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Remove owner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-sm shadow-md transition active:scale-98 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Save All Settings</span>
          </button>
        </div>
      </form>

      {/* Supabase Cloud Database Configuration & Verification Section */}
      <div className="bg-white p-5 rounded-2xl border border-emerald-300 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 uppercase tracking-wider">
            <Database className="w-4 h-4 text-emerald-700" />
            <span>5. Supabase Cloud Database Connection</span>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
              supabaseTestResult?.success
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : supabaseKey
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-stone-100 text-stone-600 border border-stone-200'
            }`}
          >
            {supabaseTestResult?.success ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Connected ({supabaseTestResult.latencyMs}ms)</span>
              </>
            ) : testingSupabase ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>Testing...</span>
              </>
            ) : supabaseKey ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Key Detected (Untested)</span>
              </>
            ) : (
              <>
                <Key className="w-3.5 h-3.5 text-stone-400" />
                <span>Key Not Configured</span>
              </>
            )}
          </span>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          Configure your Supabase Cloud credentials below. You can provide your publishable key in the field below to verify the connection immediately, or define it in your project's <code className="bg-stone-100 px-1 py-0.5 rounded text-amber-900 font-mono text-[11px]">.env</code> file.
        </p>

        {/* Supabase Project URL */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
            <span>Supabase Project URL (VITE_SUPABASE_URL)</span>
            {envUrl && (
              <span className="text-[10px] text-emerald-700 font-normal">Detected in .env</span>
            )}
          </label>
          <div className="relative">
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 font-mono text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <p className="text-[11px] text-stone-500">
            Set to your Welcome Agarbatti project: <span className="font-mono text-stone-700">https://xfydawnpxhmdwhztwlmi.supabase.co</span>
          </p>
        </div>

        {/* Supabase Publishable Anon Key */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
            <span>Supabase Publishable Key (VITE_SUPABASE_PUBLISHABLE_KEY)</span>
            {isEnvKeyConfigured && (
              <span className="text-[10px] text-emerald-700 font-normal">Detected in .env</span>
            )}
          </label>
          <div className="relative flex items-center">
            <input
              type={showSupabaseKey ? 'text' : 'password'}
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="Paste your Supabase anon public key (eyJhbGciOi...)"
              className="w-full px-3 py-2 pr-10 rounded-xl border border-stone-300 font-mono text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <button
              type="button"
              onClick={() => setShowSupabaseKey(!showSupabaseKey)}
              className="absolute right-2.5 text-stone-400 hover:text-stone-700 p-1"
              title={showSupabaseKey ? 'Hide key' : 'Show key'}
            >
              {showSupabaseKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-stone-500">
            Found in your Supabase Dashboard under <strong>Project Settings → API → Project API keys → anon (public)</strong>.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleSaveAndTestSupabase}
            disabled={testingSupabase || !supabaseKey.trim()}
            className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-300 text-white font-bold text-xs shadow-xs transition active:scale-98 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {testingSupabase ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>Save & Test Connection</span>
          </button>

          <button
            type="button"
            onClick={handleTestSupabase}
            disabled={testingSupabase || !supabaseKey.trim()}
            className="px-3.5 py-2.5 rounded-xl border border-emerald-300 hover:bg-emerald-50 text-emerald-900 font-semibold text-xs transition active:scale-98 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Test Client Ping</span>
          </button>

          <button
            type="button"
            onClick={handleQueryOwners}
            disabled={queryingOwners || !supabaseKey.trim()}
            className="px-4 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs shadow-xs transition active:scale-98 flex items-center gap-2 cursor-pointer disabled:bg-stone-300 disabled:cursor-not-allowed"
          >
            {queryingOwners ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4 text-amber-200" />
            )}
            <span>Test SELECT Query on public.owners</span>
          </button>

          {supabaseKeySavedNotice && (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Key Saved!
            </span>
          )}
        </div>

        {/* API / Client Ping Result Box */}
        {supabaseTestResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs leading-relaxed transition ${
              supabaseTestResult.success
                ? supabaseTestResult.isRlsProtected
                  ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-start gap-2">
              {supabaseTestResult.success ? (
                supabaseTestResult.isRlsProtected ? (
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                )
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-bold">{supabaseTestResult.message}</p>
                {supabaseTestResult.details && (
                  <p className="text-[11px] font-mono text-stone-700 bg-white/70 p-2 rounded border border-stone-200">
                    {supabaseTestResult.details}
                  </p>
                )}
                {supabaseTestResult.userEmail && (
                  <p className="text-[11px] text-emerald-800 font-medium">
                    Authenticated session: <span className="font-bold">{supabaseTestResult.userEmail}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Supabase Authenticated Account Testing Section */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-800" />
              <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
                Supabase Account Authentication (Test Protected RLS)
              </h4>
            </div>
            {activeSupabaseUser ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <UserIcon className="w-3 h-3 text-emerald-700" />
                <span>{activeSupabaseUser}</span>
              </span>
            ) : (
              <span className="text-[11px] text-stone-500 font-medium">
                Unauthenticated (Anon role)
              </span>
            )}
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            To keep business data safe, Row Level Security should restrict access to authenticated family members rather than the anonymous public. Sign in with your Supabase user account to test queries as an authenticated user:
          </p>

          {activeSupabaseUser ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-emerald-200">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-stone-800">
                  Signed in as: <span className="text-emerald-800">{activeSupabaseUser}</span>
                </div>
                <div className="text-[11px] text-stone-500">
                  Database queries will run using your authenticated user credentials with full RLS permissions.
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOutSupabase}
                disabled={authLoading}
                className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5 text-stone-500" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSignInSupabase} className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700">Account Email</label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="shubhadabilla@gmail.com"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white font-mono text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700">Password</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Enter your Supabase account password"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700"
                  />
                </div>
              </div>

              {authMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-medium ${
                    authMsg.success
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
                  }`}
                >
                  {authMsg.text}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={authLoading || !authPassword}
                  className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 disabled:bg-stone-300 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {authLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LogIn className="w-3.5 h-3.5" />
                  )}
                  <span>Sign In & Verify Authenticated Query</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Live SELECT Query on public.owners Result Box */}
        {ownersQueryResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-3 transition ${
              ownersQueryResult.success
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : ownersQueryResult.isRlsError
                ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-start justify-between gap-2 border-b border-stone-200/60 pb-2">
              <div className="flex items-center gap-2">
                {ownersQueryResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : ownersQueryResult.isRlsError ? (
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-xs sm:text-sm">
                    {ownersQueryResult.success
                      ? 'Live Database Query Succeeded'
                      : ownersQueryResult.isRlsError
                      ? 'Database Connected, but RLS Policy Blocked SELECT'
                      : ownersQueryResult.tableMissing
                      ? 'Table "public.owners" Not Found'
                      : 'Database Query Failed'}
                  </h4>
                  <p className="text-[11px] text-stone-600">
                    Target Table: <code className="font-mono bg-white/80 px-1 py-0.5 rounded text-amber-900">public.owners</code> • Latency: {ownersQueryResult.latencyMs}ms
                    {ownersQueryResult.userEmail && (
                      <span className="ml-2 font-bold text-emerald-800">
                        • Role: Authenticated ({ownersQueryResult.userEmail})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white/80 border border-stone-200 text-stone-700">
                SELECT * FROM owners
              </span>
            </div>

            <p className="text-xs font-medium">{ownersQueryResult.message}</p>

            {/* If query succeeded: Display retrieved owners & check for Hariniwas Billa, Uma Billa, Dhanraj Billa */}
            {ownersQueryResult.success && (
              <div className="space-y-3 pt-1">
                <div className="bg-white/90 p-3 rounded-xl border border-emerald-200 space-y-2">
                  <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide">
                    Verification of Target Owners:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {['Hariniwas Billa', 'Uma Billa', 'Dhanraj Billa'].map((name) => {
                      const isFound = ownersQueryResult.expectedOwnersFound?.includes(name);
                      return (
                        <div
                          key={name}
                          className={`p-2 rounded-lg border flex items-center justify-between text-xs font-semibold ${
                            isFound
                              ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900'
                              : 'bg-stone-100 border-stone-200 text-stone-500'
                          }`}
                        >
                          <span>{name}</span>
                          {isFound ? (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Retrieved
                            </span>
                          ) : (
                            <span className="text-[11px] text-stone-400">Not in table</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Raw data preview */}
                {ownersQueryResult.data && ownersQueryResult.data.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-stone-700">
                      Rows returned from Supabase ({ownersQueryResult.data.length}):
                    </span>
                    <pre className="p-2.5 rounded-lg bg-stone-900 text-emerald-300 font-mono text-[11px] overflow-x-auto">
                      {JSON.stringify(ownersQueryResult.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* If RLS Error: Provide clear explanation and SECURE authenticated policy (no public anonymous exposure) */}
            {ownersQueryResult.isRlsError && ownersQueryResult.secureRlsSql && (
              <div className="bg-white/95 p-3.5 rounded-xl border border-amber-300 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 text-xs">
                    Secure Policy for Authenticated Users (Recommended):
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(ownersQueryResult.secureRlsSql!)}
                    className="px-2.5 py-1 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-bold text-[11px] flex items-center gap-1 transition"
                  >
                    {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSql ? 'Copied SQL!' : 'Copy Policy SQL'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  To protect business data from anonymous internet visitors, grant SELECT only to <code>authenticated</code> family members. Run this SQL in your <strong>Supabase Dashboard → SQL Editor</strong>:
                </p>
                <pre className="p-2.5 rounded-lg bg-stone-900 text-amber-300 font-mono text-[11px] overflow-x-auto select-all">
                  {ownersQueryResult.secureRlsSql}
                </pre>
              </div>
            )}

            {/* If Table Missing: Provide SQL to create the table and seed owners */}
            {ownersQueryResult.tableMissing && ownersQueryResult.createTableSql && (
              <div className="bg-white/95 p-3.5 rounded-xl border border-amber-300 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-xs">
                    Create Table & Seed Owners SQL:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(ownersQueryResult.createTableSql!)}
                    className="px-2.5 py-1 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-bold text-[11px] flex items-center gap-1 transition"
                  >
                    {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Go to <strong>Supabase Dashboard → SQL Editor → New Query</strong>, paste the following SQL, and click <strong>Run</strong>:
                </p>
                <pre className="p-2.5 rounded-lg bg-stone-900 text-amber-300 font-mono text-[11px] overflow-x-auto select-all">
                  {ownersQueryResult.createTableSql}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Configuration Guide */}
        <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-2">
          <div className="font-bold text-stone-800 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-amber-700" />
            <span>How to set this in your .env file:</span>
          </div>
          <pre className="p-2.5 rounded-lg bg-stone-900 text-amber-300 font-mono text-[11px] overflow-x-auto select-all">
VITE_SUPABASE_URL=https://xfydawnpxhmdwhztwlmi.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
          </pre>
          <p className="text-[11px] text-stone-500">
            Note: This key is your modern <code>sb_publishable_...</code> key. It is safe for client-side web apps because Supabase uses Row Level Security (RLS) policies to protect your business data.
          </p>
        </div>
      </div>

      {/* 6. Phase 1 Cloud Migration Center (Customers & Products) */}
      <CloudMigrationCenter />

      {/* Cloud & Firebase Provisioning Section */}
      <div className="bg-white p-5 rounded-2xl border border-amber-300 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider pb-1">
          <Cloud className="w-4 h-4 text-amber-700" />
          <span>7. Cloud Synchronization & Family Phone Setup</span>
        </div>
        <p className="text-xs text-stone-600 leading-relaxed">
          The app currently runs in high-performance local offline-first mode. When you are ready to enable internet synchronization across Father's and Brother's devices via Google Cloud Firestore or Supabase, launch the setup flow.
        </p>
        <button
          onClick={onOpenCloudModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white font-bold text-xs shadow transition active:scale-98 flex items-center gap-2"
        >
          <Cloud className="w-4 h-4 text-amber-200" />
          <span>View Cloud Sync & Family Phone Setup</span>
        </button>
      </div>

      {/* Data Backup & Export Section */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider pb-2 border-b border-stone-100">
          <Download className="w-4 h-4 text-amber-700" />
          <span>8. Complete Business Data Backup & Restore</span>
        </div>

        {importStatus && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold">
            {importStatus}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <h4 className="font-bold text-stone-900 text-xs sm:text-sm">Download Backup (JSON)</h4>
            <p className="text-xs text-stone-500">
              Export all customer profiles, invoices, line items, follow-up logs, and settings to a single file.
            </p>
            <button
              onClick={handleExportBackup}
              className="mt-1 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-2 transition"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span>Download Backup File</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <h4 className="font-bold text-stone-900 text-xs sm:text-sm">Restore from Backup</h4>
            <p className="text-xs text-stone-500">
              Restore customer and bill data from a previous Welcome Agarbatti JSON backup file.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 px-4 py-2 rounded-xl border border-stone-300 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center gap-2 transition"
            >
              <Upload className="w-3.5 h-3.5 text-stone-600" />
              <span>Select File to Restore</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
