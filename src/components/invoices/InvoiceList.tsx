import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Receipt,
  Printer,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  X,
  Plus,
} from 'lucide-react';
import { Invoice, PaymentStatus, PaymentMethod } from '../../types';
import { formatCurrency, formatDate, formatIndianPhone, getTodayDateString } from '../../services/formatters';
import { recordAdditionalPayment, getActiveStaff } from '../../services/storage';

interface InvoiceListProps {
  invoices: Invoice[];
  onViewInvoice: (invoice: Invoice) => void;
  onNewBill: () => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  onViewInvoice,
  onNewBill,
}) => {
  const activeStaff = getActiveStaff();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'MONTH'>('ALL');

  // Record payment modal state
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const todayStr = getTodayDateString();
  const currentMonthPrefix = todayStr.slice(0, 7);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Status filter
      if (statusFilter !== 'ALL' && inv.paymentStatus !== statusFilter) return false;

      // Date filter
      if (dateFilter === 'TODAY' && inv.invoiceDate !== todayStr) return false;
      if (dateFilter === 'MONTH' && !inv.invoiceDate.startsWith(currentMonthPrefix)) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = inv.invoiceNumber.toLowerCase().includes(q);
        const matchCust = inv.customerName.toLowerCase().includes(q);
        const matchPhone = inv.customerMobile.includes(q);
        const matchShop = inv.customerBusinessName && inv.customerBusinessName.toLowerCase().includes(q);
        return matchNum || matchCust || matchPhone || matchShop;
      }

      return true;
    });
  }, [invoices, statusFilter, dateFilter, searchQuery, todayStr, currentMonthPrefix]);

  // Financial aggregates
  const summary = useMemo(() => {
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;

    filteredInvoices.forEach((inv) => {
      totalInvoiced += inv.grandTotal || 0;
      totalCollected += inv.amountReceived || 0;
      totalOutstanding += inv.balanceDue || 0;
    });

    return { totalInvoiced, totalCollected, totalOutstanding };
  }, [filteredInvoices]);

  const handleOpenPaymentModal = (invoice: Invoice) => {
    setSelectedInvoiceForPayment(invoice);
    setPaymentAmount(invoice.balanceDue);
    setPaymentMethod('Cash');
    setPaymentReference('');
    setPaymentNotes('');
    setPaymentError(null);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;
    setPaymentError(null);

    if (paymentAmount <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }
    if (paymentAmount > selectedInvoiceForPayment.balanceDue + 0.01) {
      setPaymentError(
        `Amount cannot exceed remaining balance of ${formatCurrency(selectedInvoiceForPayment.balanceDue)}`
      );
      return;
    }

    try {
      recordAdditionalPayment(
        selectedInvoiceForPayment.id,
        paymentAmount,
        paymentMethod,
        paymentReference || undefined,
        paymentNotes || undefined
      );
      setSelectedInvoiceForPayment(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPaymentError(msg);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Header and New Bill Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-amber-700" />
            <span>Sales & Bills History</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Track invoices, cash collected, credit balances & print receipts.
          </p>
        </div>

        <button
          onClick={onNewBill}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-sm shadow-md transition active:scale-98 shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-300" />
          <span>Create New Bill</span>
        </button>
      </div>

      {/* Financial Sales Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Total Invoiced Amount
          </div>
          <div className="text-2xl font-black text-stone-900 mt-1">
            {formatCurrency(summary.totalInvoiced)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Across {filteredInvoices.length} invoices
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Cash / UPI Collected</span>
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-1">
            {formatCurrency(summary.totalCollected)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Actual cash in hand / bank</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/40 shadow-xs">
          <div className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Outstanding Due Balances</span>
          </div>
          <div className="text-2xl font-black text-rose-900 mt-1">
            {formatCurrency(summary.totalOutstanding)}
          </div>
          <div className="text-[11px] text-rose-700 mt-0.5">Pending collection from customers</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-3 text-stone-400" />
          <input
            type="text"
            placeholder="Search by invoice number (WA-INV-...), customer name, shop, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-sm font-medium"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-2.5 py-2 rounded-xl border border-stone-300 bg-stone-50 font-semibold text-stone-700"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="Paid">Fully Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Unpaid">Unpaid / Credit</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="w-full px-2.5 py-2 rounded-xl border border-stone-300 bg-stone-50 font-semibold text-stone-700"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today's Bills</option>
            <option value="MONTH">This Month ({currentMonthPrefix})</option>
          </select>

          {/* Quick summary indicator */}
          <div className="col-span-2 flex items-center justify-end text-xs text-stone-500 font-semibold px-2">
            Showing {filteredInvoices.length} bills
          </div>
        </div>
      </div>

      {/* Invoice Records List */}
      {filteredInvoices.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-stone-300 text-stone-500 space-y-3">
          <Receipt className="w-10 h-10 text-stone-400 mx-auto" />
          <div className="font-bold text-stone-700 text-base">No invoices found</div>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Create a new bill to start recording agarbatti sales and tracking payments.
          </p>
          <button
            onClick={onNewBill}
            className="px-4 py-2 rounded-xl bg-amber-800 text-white font-bold text-xs hover:bg-amber-900 transition"
          >
            Create Bill Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              onClick={() => onViewInvoice(inv)}
              className="bg-white p-4 rounded-2xl border border-stone-200 hover:border-amber-400 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              {/* Left Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-extrabold text-stone-900 text-sm sm:text-base">
                    {inv.invoiceNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      inv.paymentStatus === 'Paid'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : inv.paymentStatus === 'Partially Paid'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {inv.paymentStatus}
                  </span>
                  <span className="text-xs text-stone-400 font-medium">
                    {formatDate(inv.invoiceDate)}
                  </span>
                </div>

                <div className="font-bold text-stone-800 text-sm">
                  {inv.customerName}
                  {inv.customerBusinessName && (
                    <span className="font-normal text-stone-500 text-xs ml-1.5">
                      ({inv.customerBusinessName})
                    </span>
                  )}
                </div>

                <div className="text-xs text-stone-500 flex items-center gap-2 flex-wrap">
                  <span>{inv.items.length} items</span>
                  <span>•</span>
                  <span>Method: {inv.paymentMethod}</span>
                  {inv.paymentReference && <span>• Ref: {inv.paymentReference}</span>}
                </div>
              </div>

              {/* Right Side Amounts & Actions */}
              <div
                className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-left sm:text-right">
                  <div className="text-base sm:text-lg font-black text-stone-900">
                    {formatCurrency(inv.grandTotal)}
                  </div>
                  {inv.balanceDue > 0 ? (
                    <div className="text-xs font-bold text-rose-600">
                      Due: {formatCurrency(inv.balanceDue)}
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-emerald-600">Fully Cleared</div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {inv.balanceDue > 0 && (
                    <button
                      onClick={() => handleOpenPaymentModal(inv)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition active:scale-95"
                      title="Record payment against this bill"
                    >
                      Pay Due
                    </button>
                  )}

                  <button
                    onClick={() => onViewInvoice(inv)}
                    className="p-2 rounded-xl bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 transition"
                    title="View & Print Bill"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record Additional Payment Modal */}
      {selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-4">
            <div className="bg-gradient-to-r from-emerald-800 to-stone-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-bold text-base">Record Payment</h3>
                  <p className="text-xs text-emerald-200">
                    Bill: {selectedInvoiceForPayment.invoiceNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoiceForPayment(null)}
                className="p-1 rounded text-stone-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-5 space-y-4 text-sm text-stone-800">
              {paymentError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  {paymentError}
                </div>
              )}

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500">Customer:</span>
                  <span className="font-bold">{selectedInvoiceForPayment.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Total Bill Amount:</span>
                  <span className="font-bold">
                    {formatCurrency(selectedInvoiceForPayment.grandTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-rose-700 font-bold">
                  <span>Current Outstanding Due:</span>
                  <span>{formatCurrency(selectedInvoiceForPayment.balanceDue)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Payment Amount Received (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedInvoiceForPayment.balanceDue}
                  step="any"
                  required
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-extrabold text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 font-bold text-sm"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Reference / Transaction ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Cheque No."
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPayment(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition shadow"
                >
                  Save Payment ({formatCurrency(paymentAmount)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
