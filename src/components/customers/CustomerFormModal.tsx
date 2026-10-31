import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  AlertTriangle,
  Check,
  Phone,
  Store,
  Calendar,
  Clock,
  IndianRupee,
} from 'lucide-react';
import { Customer, Owner } from '../../types';
import {
  checkDuplicatePhone,
  getStaffList,
  getActiveStaff,
  getOwners,
} from '../../services/storage';
import {
  getTodayDateString,
  calculateNextFollowUp,
} from '../../services/formatters';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customerData: Partial<Customer>) => void;
  initialCustomer?: Customer | null;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCustomer,
}) => {
  const staffList = getStaffList();
  const owners = getOwners();
  const activeStaff = getActiveStaff();
  const todayStr = getTodayDateString();

  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile, setMobile] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [lastPurchaseDate, setLastPurchaseDate] = useState('');
  const [lastPurchaseAmount, setLastPurchaseAmount] = useState<number | ''>('');
  const [reminderInterval, setReminderInterval] = useState<'7' | '15' | '30' | 'month' | 'custom'>('30');
  const [nextReminderDate, setNextReminderDate] = useState('');
  const [assignedOwnerId, setAssignedOwnerId] = useState('');
  const [notes, setNotes] = useState('');

  const [duplicateWarning, setDuplicateWarning] = useState<Customer | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCustomer) {
      setName(initialCustomer.name || '');
      setCountryCode('+91');
      setMobile(initialCustomer.mobile || '');
      setBusinessName(initialCustomer.businessName || '');
      setLastPurchaseDate(initialCustomer.lastPurchaseDate || '');
      setLastPurchaseAmount(initialCustomer.lastPurchaseAmount ?? '');
      setNextReminderDate(initialCustomer.nextFollowUpDate || '');
      setAssignedOwnerId(initialCustomer.assignedStaffId || activeStaff.id);
      setNotes(initialCustomer.notes || '');

      if (initialCustomer.reminderRule === 'calendar_month') {
        setReminderInterval('month');
      } else if (initialCustomer.defaultReminderInterval === 7) {
        setReminderInterval('7');
      } else if (initialCustomer.defaultReminderInterval === 15) {
        setReminderInterval('15');
      } else if (initialCustomer.defaultReminderInterval === 30) {
        setReminderInterval('30');
      } else {
        setReminderInterval('custom');
      }
    } else {
      setName('');
      setCountryCode('+91');
      setMobile('');
      setBusinessName('');
      setLastPurchaseDate('');
      setLastPurchaseAmount('');
      setReminderInterval('30');
      // Default next reminder to 30 days from today
      const defaultDate = calculateNextFollowUp(todayStr, 'fixed_days', 30);
      setNextReminderDate(defaultDate);
      setAssignedOwnerId(activeStaff.id);
      setNotes('');
    }
    setDuplicateWarning(null);
    setValidationError(null);
  }, [initialCustomer, isOpen, todayStr]);

  // Recalculate next reminder date when reminder interval or last purchase date changes
  const handleIntervalChange = (val: '7' | '15' | '30' | 'month' | 'custom') => {
    setReminderInterval(val);
    const baseDate = lastPurchaseDate || todayStr;
    if (val === '7') {
      setNextReminderDate(calculateNextFollowUp(baseDate, 'fixed_days', 7));
    } else if (val === '15') {
      setNextReminderDate(calculateNextFollowUp(baseDate, 'fixed_days', 15));
    } else if (val === '30') {
      setNextReminderDate(calculateNextFollowUp(baseDate, 'fixed_days', 30));
    } else if (val === 'month') {
      setNextReminderDate(calculateNextFollowUp(baseDate, 'calendar_month'));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMobile(val);
    if (val.replace(/[^0-9]/g, '').length >= 10) {
      const existing = checkDuplicatePhone(val, initialCustomer?.id);
      setDuplicateWarning(existing);
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError('Please enter customer name.');
      return;
    }

    const cleanPhone = mobile.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setValidationError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const reminderDays =
      reminderInterval === '7'
        ? 7
        : reminderInterval === '15'
        ? 15
        : reminderInterval === 'month'
        ? 30
        : 30;

    const reminderRule = reminderInterval === 'month' ? 'calendar_month' : 'fixed_days';

    onSave({
      name: name.trim(),
      mobile: cleanPhone.slice(-10),
      businessName: businessName.trim() || undefined,
      lastPurchaseDate: lastPurchaseDate || undefined,
      lastPurchaseAmount:
        typeof lastPurchaseAmount === 'number' && lastPurchaseAmount > 0
          ? lastPurchaseAmount
          : undefined,
      nextFollowUpDate: nextReminderDate || calculateNextFollowUp(todayStr, reminderRule, reminderDays),
      defaultReminderInterval: reminderDays,
      reminderRule,
      notes: notes.trim() || undefined,
      assignedStaffId: assignedOwnerId || initialCustomer?.assignedStaffId || activeStaff.id,
      category: initialCustomer?.category || 'Retailer',
      preferredContactMethod: initialCustomer?.preferredContactMethod || 'WhatsApp',
      consentGiven: true,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-700 to-amber-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-amber-200" />
            <h3 className="font-extrabold text-base sm:text-lg">
              {initialCustomer ? 'Edit Customer' : 'Add New Customer'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-amber-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-sm text-stone-800">
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Phone Number Already Registered!
              </div>
              <p>
                Customer <strong>{duplicateWarning.name}</strong> ({duplicateWarning.businessName || 'No Shop'}) has this mobile number.
              </p>
            </div>
          )}

          {/* 1. Customer Name */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Customer Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-bold text-stone-900"
            />
          </div>

          {/* 2. Mobile Number with Country Code */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Mobile Number (WhatsApp) <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="px-3 py-2.5 rounded-xl bg-stone-100 border border-stone-300 font-extrabold text-stone-700 text-sm shrink-0">
                +91
              </span>
              <div className="relative flex-1">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={handlePhoneChange}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-extrabold text-stone-900"
                />
              </div>
            </div>
          </div>

          {/* 3. Shop / Business Name (Optional) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Shop / Business Name (Optional)
            </label>
            <div className="relative">
              <Store className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                placeholder="e.g. Rahul Traders & Pooja Bhandar"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
          </div>

          {/* 4. Last Purchase Date & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Last Purchase Date (Optional)
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                <input
                  type="date"
                  value={lastPurchaseDate}
                  onChange={(e) => {
                    setLastPurchaseDate(e.target.value);
                    if (e.target.value) {
                      setNextReminderDate(
                        calculateNextFollowUp(
                          e.target.value,
                          reminderInterval === 'month' ? 'calendar_month' : 'fixed_days',
                          reminderInterval === '7' ? 7 : reminderInterval === '15' ? 15 : 30
                        )
                      );
                    }
                  }}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-300 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Purchase Amount (₹) (Optional)
              </label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={lastPurchaseAmount}
                  onChange={(e) =>
                    setLastPurchaseAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                  }
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-300 font-bold"
                />
              </div>
            </div>
          </div>

          {/* 5. Next Reminder Date & Intervals */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-700" />
                <span>Next Repeat-Order Reminder</span>
              </label>
              <span className="text-[11px] font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                Scheduled Date
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => handleIntervalChange('7')}
                className={`py-2 rounded-xl border transition text-center ${
                  reminderInterval === '7'
                    ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => handleIntervalChange('15')}
                className={`py-2 rounded-xl border transition text-center ${
                  reminderInterval === '15'
                    ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                }`}
              >
                15 Days
              </button>
              <button
                type="button"
                onClick={() => handleIntervalChange('30')}
                className={`py-2 rounded-xl border transition text-center ${
                  reminderInterval === '30'
                    ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                }`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => handleIntervalChange('month')}
                className={`py-2 rounded-xl border transition text-center ${
                  reminderInterval === 'month'
                    ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                }`}
              >
                Next Month
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 mb-1">
                Specific Reminder Date:
              </label>
              <input
                type="date"
                required
                value={nextReminderDate}
                onChange={(e) => {
                  setNextReminderDate(e.target.value);
                  setReminderInterval('custom');
                }}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-extrabold text-stone-900 text-sm"
              />
            </div>
          </div>

          {/* Assigned Owner Dropdown */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Assigned Owner / Follow-up By
            </label>
            <select
              value={assignedOwnerId}
              onChange={(e) => setAssignedOwnerId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white font-bold text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name} (Owner)
                </option>
              ))}
            </select>
          </div>

          {/* 6. Notes */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Customer Notes / Agarhatti Preferences
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Regular buyer of Chandan sticks, call in the morning"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm resize-none font-medium"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold hover:bg-stone-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 active:scale-98 text-white font-extrabold transition shadow flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{initialCustomer ? 'Update Customer' : 'Save Customer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
