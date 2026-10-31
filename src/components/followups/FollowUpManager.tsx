import React, { useState, useMemo } from 'react';
import {
  BellRing,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FilePlus,
  Calendar,
  X,
  Store,
  Check,
} from 'lucide-react';
import { Customer } from '../../types';
import {
  formatCurrency,
  formatDate,
  formatIndianPhone,
  determineFollowUpStatus,
  getTodayDateString,
  calculateNextFollowUp,
} from '../../services/formatters';
import {
  recordFollowUpAction,
  updateCustomer,
  getSettings,
} from '../../services/storage';
import { generateWhatsAppLink, renderMessageTemplate } from '../../services/whatsapp';

interface FollowUpManagerProps {
  customers: Customer[];
  onOpenCustomerDetail: (customer: Customer) => void;
  onCreateBillForCustomer: (customer: Customer) => void;
}

export const FollowUpManager: React.FC<FollowUpManagerProps> = ({
  customers,
  onOpenCustomerDetail,
  onCreateBillForCustomer,
}) => {
  const settings = getSettings();
  const todayStr = getTodayDateString();

  const [activeTab, setActiveTab] = useState<'due_today' | 'overdue' | 'upcoming'>('due_today');

  // Remind Later (Snooze) modal state
  const [snoozeCustomer, setSnoozeCustomer] = useState<Customer | null>(null);
  const [snoozeTargetDate, setSnoozeTargetDate] = useState<string>(
    calculateNextFollowUp(todayStr, 'fixed_days', 7)
  );
  const [snoozeNote, setSnoozeNote] = useState<string>('');

  // Mark Contacted modal state
  const [contactedCustomer, setContactedCustomer] = useState<Customer | null>(null);
  const [contactedNote, setContactedNote] = useState<string>('');

  // Categorize
  const { dueTodayList, overdueList, upcomingList } = useMemo(() => {
    const active = customers.filter((c) => !c.isArchived);
    const dueToday: Customer[] = [];
    const overdue: Customer[] = [];
    const upcoming: Customer[] = [];

    active.forEach((c) => {
      const st = determineFollowUpStatus(c.nextFollowUpDate, c.followUpStatus);
      if (st === 'Due Today') {
        dueToday.push(c);
      } else if (st === 'Overdue') {
        overdue.push(c);
      } else {
        upcoming.push(c);
      }
    });

    return { dueTodayList: dueToday, overdueList: overdue, upcomingList: upcoming };
  }, [customers]);

  const currentList =
    activeTab === 'due_today'
      ? dueTodayList
      : activeTab === 'overdue'
      ? overdueList
      : upcomingList;

  // WhatsApp click-to-chat
  const handleOpenWhatsApp = (customer: Customer) => {
    const template = settings.templates.english;
    const msg = renderMessageTemplate(template, customer, settings);
    const link = generateWhatsAppLink(customer.mobile, msg);
    window.open(link, '_blank');
  };

  // Reordered action
  const handleCustomerReordered = (customer: Customer) => {
    // Schedule next cycle and optionally open billing
    const interval = customer.defaultReminderInterval || 30;
    const rule = customer.reminderRule || 'fixed_days';
    const nextDate = calculateNextFollowUp(todayStr, rule, interval);

    recordFollowUpAction(
      customer.id,
      'Reordered',
      'Customer reordered stock. Next reminder scheduled.',
      nextDate
    );

    if (confirm(`Marked as Reordered! Would you like to create a new bill for ${customer.name} right now?`)) {
      onCreateBillForCustomer(customer);
    }
  };

  // Remind Later save
  const handleSaveRemindLater = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snoozeCustomer) return;

    recordFollowUpAction(
      snoozeCustomer.id,
      'Snoozed',
      snoozeNote || 'Remind later requested',
      snoozeTargetDate
    );

    setSnoozeCustomer(null);
  };

  // Mark Contacted save
  const handleSaveContacted = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactedCustomer) return;

    // Follow up in 3 days if contacted
    const nextDate = calculateNextFollowUp(todayStr, 'fixed_days', 3);

    recordFollowUpAction(
      contactedCustomer.id,
      'Contacted - Interested',
      contactedNote || 'Customer contacted by phone/WhatsApp.',
      nextDate
    );

    setContactedCustomer(null);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-16">
      {/* Page Title */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <BellRing className="w-6 h-6 text-amber-700" />
            <span>Customer Reminders</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Follow up when customer agarbatti stock is due for repeat order.
          </p>
        </div>
      </div>

      {/* Primary Tabs (Due Today & Overdue) */}
      <div className="grid grid-cols-3 gap-2 bg-stone-100 p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveTab('due_today')}
          className={`py-3 px-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition active:scale-98 ${
            activeTab === 'due_today'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-stone-700 hover:text-stone-900'
          }`}
        >
          <span>Due Today</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeTab === 'due_today' ? 'bg-white text-amber-900' : 'bg-stone-200 text-stone-800'
            }`}
          >
            {dueTodayList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`py-3 px-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition active:scale-98 ${
            activeTab === 'overdue'
              ? 'bg-rose-700 text-white shadow-sm'
              : 'text-stone-700 hover:text-stone-900'
          }`}
        >
          <span>Overdue</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeTab === 'overdue' ? 'bg-white text-rose-900' : 'bg-stone-200 text-stone-800'
            }`}
          >
            {overdueList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`py-3 px-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition active:scale-98 ${
            activeTab === 'upcoming'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'text-stone-700 hover:text-stone-900'
          }`}
        >
          <span>Upcoming</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-black ${
              activeTab === 'upcoming' ? 'bg-white text-stone-900' : 'bg-stone-200 text-stone-800'
            }`}
          >
            {upcomingList.length}
          </span>
        </button>
      </div>

      {/* Reminder Cards List */}
      {currentList.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-stone-300 text-stone-500 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <div className="font-extrabold text-stone-800 text-base">
            {activeTab === 'due_today'
              ? 'No repeat reminders due today!'
              : activeTab === 'overdue'
              ? 'No overdue customer reminders!'
              : 'No upcoming customer reminders scheduled.'}
          </div>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            When you save a new bill or schedule a reminder on a customer, they will appear here right when stock needs replenishing.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {currentList.map((cust) => (
            <div
              key={cust.id}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 hover:border-amber-400 shadow-xs hover:shadow-md transition space-y-3"
            >
              {/* Mandatory Display Fields: Customer name, Phone, Last purchase date, Next reminder date, Last purchase amount */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <h3
                    onClick={() => onOpenCustomerDetail(cust)}
                    className="font-black text-stone-900 text-lg hover:text-amber-800 cursor-pointer transition"
                  >
                    {cust.name}
                  </h3>
                  {cust.businessName && (
                    <div className="text-xs font-bold text-amber-800 flex items-center gap-1 mt-0.5">
                      <Store className="w-3.5 h-3.5 text-amber-600" />
                      <span>{cust.businessName}</span>
                    </div>
                  )}
                  <div className="text-sm font-bold text-stone-700 mt-1">
                    Phone: <span className="font-extrabold text-stone-900">+91 {cust.mobile}</span>
                  </div>
                </div>

                <div className="sm:text-right">
                  <div className="inline-block px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                    Next Reminder: {formatDate(cust.nextFollowUpDate)}
                  </div>
                </div>
              </div>

              {/* Purchase Snapshot */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                <div>
                  <span className="text-stone-500 font-bold block uppercase text-[10px]">
                    Last Purchase Date:
                  </span>
                  <span className="font-extrabold text-stone-800 text-sm">
                    {formatDate(cust.lastPurchaseDate)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-stone-500 font-bold block uppercase text-[10px]">
                    Last Purchase Amount:
                  </span>
                  <span className="font-black text-amber-900 text-sm">
                    {cust.lastPurchaseAmount ? formatCurrency(cust.lastPurchaseAmount) : '—'}
                  </span>
                </div>
              </div>

              {cust.notes && (
                <div className="text-xs text-stone-600 italic bg-amber-50/50 p-2 rounded-lg border border-amber-200/60">
                  Note: {cust.notes}
                </div>
              )}

              {/* The 5 Exact Required Buttons:
                  1. Call Customer
                  2. WhatsApp Customer
                  3. Mark Contacted
                  4. Reordered
                  5. Remind Later
              */}
              <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center gap-2">
                {/* 1. Call Customer */}
                <a
                  href={`tel:+91${cust.mobile}`}
                  className="flex-1 sm:flex-none py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Customer</span>
                </a>

                {/* 2. WhatsApp Customer */}
                <button
                  onClick={() => handleOpenWhatsApp(cust)}
                  className="flex-1 sm:flex-none py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp Customer</span>
                </button>

                {/* 3. Mark Contacted */}
                <button
                  onClick={() => {
                    setContactedCustomer(cust);
                    setContactedNote('');
                  }}
                  className="flex-1 sm:flex-none py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Check className="w-3.5 h-3.5 text-amber-700" />
                  <span>Mark Contacted</span>
                </button>

                {/* 4. Reordered */}
                <button
                  onClick={() => handleCustomerReordered(cust)}
                  className="flex-1 sm:flex-none py-2 px-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
                >
                  <FilePlus className="w-3.5 h-3.5 text-amber-200" />
                  <span>Reordered</span>
                </button>

                {/* 5. Remind Later */}
                <button
                  onClick={() => {
                    setSnoozeCustomer(cust);
                    setSnoozeTargetDate(calculateNextFollowUp(todayStr, 'fixed_days', 7));
                    setSnoozeNote('');
                  }}
                  className="flex-1 sm:flex-none py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Clock className="w-3.5 h-3.5 text-stone-600" />
                  <span>Remind Later</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Remind Later (Snooze) Modal */}
      {snoozeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-base">Remind Later</h3>
              </div>
              <button
                onClick={() => setSnoozeCustomer(null)}
                className="p-1 rounded text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRemindLater} className="p-5 space-y-4 text-sm text-stone-800">
              <p className="text-xs text-stone-600">
                Postpone reminder for <strong>{snoozeCustomer.name}</strong> to:
              </p>

              {/* Quick interval buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSnoozeTargetDate(calculateNextFollowUp(todayStr, 'fixed_days', 3))}
                  className="py-2 rounded-xl border border-amber-300 font-bold text-xs hover:bg-amber-50"
                >
                  +3 Days
                </button>
                <button
                  type="button"
                  onClick={() => setSnoozeTargetDate(calculateNextFollowUp(todayStr, 'fixed_days', 7))}
                  className="py-2 rounded-xl border border-amber-300 font-bold text-xs hover:bg-amber-50"
                >
                  +7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setSnoozeTargetDate(calculateNextFollowUp(todayStr, 'fixed_days', 15))}
                  className="py-2 rounded-xl border border-amber-300 font-bold text-xs hover:bg-amber-50"
                >
                  +15 Days
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Selected Reminder Date:
                </label>
                <input
                  type="date"
                  required
                  value={snoozeTargetDate}
                  onChange={(e) => setSnoozeTargetDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-extrabold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Optional Reason / Note:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shopkeeper said stock still remaining"
                  value={snoozeNote}
                  onChange={(e) => setSnoozeNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setSnoozeCustomer(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-xs shadow"
                >
                  Confirm Remind Later
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Contacted Modal */}
      {contactedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-gradient-to-r from-amber-700 to-amber-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-amber-200" />
                <h3 className="font-extrabold text-base">Mark Contacted</h3>
              </div>
              <button
                onClick={() => setContactedCustomer(null)}
                className="p-1 rounded text-amber-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContacted} className="p-5 space-y-4 text-sm text-stone-800">
              <p className="text-xs text-stone-600">
                Record contact attempt for <strong>{contactedCustomer.name}</strong>.
              </p>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Contact Note / Discussion:
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Called customer, asked to check stock on Friday."
                  value={contactedNote}
                  onChange={(e) => setContactedNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setContactedCustomer(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-xs shadow"
                >
                  Save as Contacted
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
