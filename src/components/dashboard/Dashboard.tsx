import React, { useMemo } from 'react';
import {
  Users,
  Receipt,
  BellRing,
  AlertTriangle,
  UserPlus,
  FilePlus,
  Phone,
  MessageSquare,
  ArrowRight,
  Flame,
  Package,
} from 'lucide-react';
import { Customer, Invoice } from '../../types';
import {
  formatCurrency,
  formatDate,
  formatIndianPhone,
  determineFollowUpStatus,
} from '../../services/formatters';
import { getDashboardMetrics, getSettings } from '../../services/storage';
import { generateWhatsAppLink, renderMessageTemplate } from '../../services/whatsapp';

interface DashboardProps {
  customers: Customer[];
  invoices: Invoice[];
  onNavigate: (tab: 'dashboard' | 'customers' | 'reminders' | 'billing') => void;
  onSelectCustomer: (customer: Customer) => void;
  onAddCustomer: () => void;
  onOpenManageProducts: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  customers,
  onNavigate,
  onSelectCustomer,
  onAddCustomer,
  onOpenManageProducts,
}) => {
  const metrics = getDashboardMetrics();
  const settings = getSettings();

  // Find priority reminders (Due Today or Overdue)
  const dueTodayCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (c.isArchived) return false;
      const st = determineFollowUpStatus(c.nextFollowUpDate, c.followUpStatus);
      return st === 'Due Today';
    });
  }, [customers]);

  const overdueCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (c.isArchived) return false;
      const st = determineFollowUpStatus(c.nextFollowUpDate, c.followUpStatus);
      return st === 'Overdue';
    });
  }, [customers]);

  const handleQuickWhatsApp = (customer: Customer) => {
    const template = settings.templates.english;
    const msg = renderMessageTemplate(template, customer, settings);
    const link = generateWhatsAppLink(customer.mobile, msg);
    window.open(link, '_blank');
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-16">
      {/* Welcome Title */}
      <div className="bg-gradient-to-r from-amber-800 to-stone-900 text-white p-5 sm:p-6 rounded-3xl shadow-md border border-amber-800/40">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-50 p-1 shadow-lg border border-amber-400/60 shrink-0 overflow-hidden flex items-center justify-center">
            <img
              src="/logo.jpeg"
              alt="Welcome Agarbatti Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-amber-300">सौ. उमा बिल्ला यांचे</div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Welcome Agarbatti • वेलकम अगरबत्ती
            </h1>
            <p className="text-xs sm:text-sm text-amber-200 font-medium">
              Daily customer reminders and quick billing
            </p>
          </div>
        </div>
      </div>

      {/* Main Action Buttons (Large & Easy to Click on Mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <button
          onClick={onAddCustomer}
          className="p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-amber-50 border-2 border-amber-700/30 hover:border-amber-700 shadow-xs transition active:scale-98 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-stone-900 font-extrabold text-sm sm:text-base text-center sm:text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5 text-amber-800" />
          </div>
          <span>+ Add Customer</span>
        </button>

        <button
          onClick={() => onNavigate('billing')}
          className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md transition active:scale-98 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 font-extrabold text-sm sm:text-base text-center sm:text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
            <FilePlus className="w-5 h-5 text-amber-100" />
          </div>
          <span>Create a Bill</span>
        </button>

        <button
          onClick={() => onNavigate('reminders')}
          className="p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-amber-50 border-2 border-stone-300 hover:border-amber-700 shadow-xs transition active:scale-98 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-stone-900 font-extrabold text-sm sm:text-base text-center sm:text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5 text-rose-700" />
          </div>
          <span>View Reminders</span>
        </button>

        <button
          onClick={onOpenManageProducts}
          className="p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-amber-50 border-2 border-amber-600/40 hover:border-amber-700 shadow-xs transition active:scale-98 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-stone-900 font-extrabold text-sm sm:text-base text-center sm:text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-amber-800" />
          </div>
          <span>Manage Products</span>
        </button>
      </div>

      {/* ONLY The 4 Simple Key Numbers: Total Customers, Today's Sales, Today's Follow-ups, Overdue Reminders */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Total Customers */}
        <div
          onClick={() => onNavigate('customers')}
          className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs cursor-pointer hover:border-amber-400 transition"
        >
          <div className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
            <span>Total Customers</span>
            <Users className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 mt-1">
            {metrics.totalCustomers}
          </div>
          <div className="text-[11px] text-amber-800 font-semibold mt-0.5">View directory →</div>
        </div>

        {/* 2. Today's Sales */}
        <div
          onClick={() => onNavigate('billing')}
          className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs cursor-pointer hover:border-amber-400 transition"
        >
          <div className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
            <span>Today's Sales</span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900 mt-1">
            {formatCurrency(metrics.todaySales)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Bills created today</div>
        </div>

        {/* 3. Today's Customer Follow-ups */}
        <div
          onClick={() => onNavigate('reminders')}
          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition ${
            metrics.dueTodayCount > 0
              ? 'bg-amber-50/90 border-amber-400 hover:border-amber-500'
              : 'bg-white border-stone-200 hover:border-amber-400'
          }`}
        >
          <div className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center justify-between">
            <span>Due Today</span>
            <BellRing className={`w-4 h-4 ${metrics.dueTodayCount > 0 ? 'text-amber-700 animate-pulse' : 'text-stone-400'}`} />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-950 mt-1">
            {metrics.dueTodayCount}
          </div>
          <div className="text-[11px] text-amber-800 font-bold mt-0.5">Need contact today</div>
        </div>

        {/* 4. Overdue Customer Reminders */}
        <div
          onClick={() => onNavigate('reminders')}
          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition ${
            metrics.overdueCount > 0
              ? 'bg-rose-50/90 border-rose-300 hover:border-rose-400'
              : 'bg-white border-stone-200 hover:border-amber-400'
          }`}
        >
          <div className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center justify-between">
            <span>Overdue</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-900 mt-1">
            {metrics.overdueCount}
          </div>
          <div className="text-[11px] text-rose-700 font-bold mt-0.5">Past due date</div>
        </div>
      </div>

      {/* Immediate Reminder Action Lists (Due Today & Overdue) */}
      <div className="space-y-4">
        {/* Due Today Section */}
        {dueTodayCustomers.length > 0 && (
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-300 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-amber-950 flex items-center gap-2">
                <BellRing className="w-5 h-5 text-amber-600" />
                <span>Customers Due for Follow-up Today ({dueTodayCustomers.length})</span>
              </h3>
              <button
                onClick={() => onNavigate('reminders')}
                className="text-xs font-bold text-amber-800 hover:underline"
              >
                View all →
              </button>
            </div>

            <div className="divide-y divide-stone-100">
              {dueTodayCustomers.slice(0, 3).map((cust) => (
                <div
                  key={cust.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div
                    onClick={() => onSelectCustomer(cust)}
                    className="cursor-pointer space-y-0.5"
                  >
                    <div className="font-bold text-base text-stone-900 hover:text-amber-800">
                      {cust.name} {cust.businessName ? `(${cust.businessName})` : ''}
                    </div>
                    <div className="text-xs text-stone-500">
                      Phone: <strong>+91 {cust.mobile}</strong> • Last purchase:{' '}
                      {formatDate(cust.lastPurchaseDate)} (
                      {cust.lastPurchaseAmount ? formatCurrency(cust.lastPurchaseAmount) : '—'})
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:+91${cust.mobile}`}
                      className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                    <button
                      onClick={() => handleQuickWhatsApp(cust)}
                      className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={() => onSelectCustomer(cust)}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300"
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overdue Section */}
        {overdueCustomers.length > 0 && (
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-300 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-rose-950 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Overdue Customers ({overdueCustomers.length})</span>
              </h3>
              <button
                onClick={() => onNavigate('reminders')}
                className="text-xs font-bold text-rose-800 hover:underline"
              >
                View all overdue →
              </button>
            </div>

            <div className="divide-y divide-stone-100">
              {overdueCustomers.slice(0, 3).map((cust) => (
                <div
                  key={cust.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div
                    onClick={() => onSelectCustomer(cust)}
                    className="cursor-pointer space-y-0.5"
                  >
                    <div className="font-bold text-base text-stone-900 hover:text-rose-800">
                      {cust.name} {cust.businessName ? `(${cust.businessName})` : ''}
                    </div>
                    <div className="text-xs text-rose-700 font-medium">
                      Was due on {formatDate(cust.nextFollowUpDate)} • Mob: +91 {cust.mobile}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:+91${cust.mobile}`}
                      className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                    <button
                      onClick={() => handleQuickWhatsApp(cust)}
                      className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={() => onSelectCustomer(cust)}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs"
                    >
                      Action
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
