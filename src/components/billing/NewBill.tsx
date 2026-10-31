import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Receipt,
  UserCheck,
  UserPlus,
  CheckCircle,
  RotateCcw,
  Clock,
  AlertCircle,
  Package,
} from 'lucide-react';
import { Customer, InvoiceItem, PaymentMethod, Product } from '../../types';
import {
  formatCurrency,
  getTodayDateString,
  calculateNextFollowUp,
  formatDate,
} from '../../services/formatters';
import {
  generateInvoiceNumber,
  createInvoice,
  getSettings,
  getActiveStaff,
  addCustomer,
  getProducts,
  subscribeToStore,
} from '../../services/storage';

interface SimpleItem {
  id: string;
  name: string;
  quantity: number | '';
  price: number | '';
  itemTotal: number;
}

interface NewBillProps {
  customers: Customer[];
  preSelectedCustomer?: Customer | null;
  onInvoiceCreated: (invoiceId: string) => void;
  onAddNewCustomer: () => void;
  onOpenManageProducts?: () => void;
}

export const NewBill: React.FC<NewBillProps> = ({
  customers,
  preSelectedCustomer,
  onInvoiceCreated,
  onAddNewCustomer,
  onOpenManageProducts,
}) => {
  const settings = getSettings();
  const activeStaff = getActiveStaff();
  const todayStr = getTodayDateString();

  const [products, setProducts] = useState<Product[]>(getProducts());

  useEffect(() => {
    const unsub = subscribeToStore(() => {
      setProducts(getProducts());
    });
    return () => unsub();
  }, []);

  // Invoice Date & Number
  const [invoiceNumber] = useState(generateInvoiceNumber());
  const [invoiceDate, setInvoiceDate] = useState(todayStr);

  // Customer Selection or New Customer entry
  const [isNewCustomerMode, setIsNewCustomerMode] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    preSelectedCustomer?.id || ''
  );
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Products: free text, quantity, price per item
  const [items, setItems] = useState<SimpleItem[]>([
    {
      id: '1',
      name: '',
      quantity: 1,
      price: '',
      itemTotal: 0,
    },
  ]);

  // Discount, Amount Received, Payment Method
  const [discount, setDiscount] = useState<number | ''>(0);
  const [amountReceived, setAmountReceived] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Other'>('Cash');

  // Next reminder scheduling interval
  const [reminderInterval, setReminderInterval] = useState<'7' | '15' | '30' | 'month'>('30');

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (preSelectedCustomer) {
      setSelectedCustomerId(preSelectedCustomer.id);
      setIsNewCustomerMode(false);
    } else if (customers.length > 0 && !selectedCustomerId && !isNewCustomerMode) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [preSelectedCustomer, customers, isNewCustomerMode]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Calculations:
  // Item total = quantity × price
  const calculateItemTotal = (qty: number | '', price: number | '') => {
    const q = typeof qty === 'number' ? qty : 0;
    const p = typeof price === 'number' ? price : 0;
    return Math.round(q * p * 100) / 100;
  };

  const handleItemChange = (index: number, field: keyof SimpleItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const current = { ...copy[index], [field]: value };

      if (field === 'quantity' || field === 'price') {
        current.itemTotal = calculateItemTotal(
          field === 'quantity' ? value : current.quantity,
          field === 'price' ? value : current.price
        );
      }

      copy[index] = current;
      return copy;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        name: '',
        quantity: 1,
        price: '',
        itemTotal: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('An invoice must have at least one product.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Subtotal = sum of all item totals
  const subtotal = items.reduce((acc, it) => acc + (it.itemTotal || 0), 0);

  // Final total = subtotal - discount
  const numDiscount = typeof discount === 'number' ? discount : 0;
  const finalTotal = Math.max(0, Math.round((subtotal - numDiscount) * 100) / 100);

  // Balance = final total - amount received
  const numAmountReceived = typeof amountReceived === 'number' ? amountReceived : 0;
  const balance = Math.max(0, Math.round((finalTotal - numAmountReceived) * 100) / 100);

  // Auto populate amount received if empty
  const handleSetFullPayment = () => {
    setAmountReceived(finalTotal);
  };

  const handleClear = () => {
    if (confirm('Clear this bill and start over?')) {
      setItems([
        {
          id: String(Date.now()),
          name: '',
          quantity: 1,
          price: '',
          itemTotal: 0,
        },
      ]);
      setDiscount(0);
      setAmountReceived('');
      setErrorMessage(null);
    }
  };

  // Calculate estimated next reminder date
  const reminderDays = reminderInterval === '7' ? 7 : reminderInterval === '15' ? 15 : 30;
  const reminderRule = reminderInterval === 'month' ? 'calendar_month' : 'fixed_days';
  const estimatedNextReminder = calculateNextFollowUp(invoiceDate, reminderRule, reminderDays);

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    let customerToUse = selectedCustomer;

    if (isNewCustomerMode) {
      if (!newCustName.trim()) {
        setErrorMessage('Please enter the customer name.');
        return;
      }
      const cleanPhone = newCustPhone.replace(/[^0-9]/g, '');
      if (cleanPhone.length < 10) {
        setErrorMessage('Please enter a valid 10-digit mobile number.');
        return;
      }

      // Create customer first
      customerToUse = addCustomer({
        name: newCustName.trim(),
        mobile: cleanPhone.slice(-10),
        category: 'Retailer',
        assignedStaffId: activeStaff.id,
        defaultReminderInterval: reminderDays,
        reminderRule,
        preferredContactMethod: 'WhatsApp',
        consentGiven: true,
      });
    }

    if (!customerToUse) {
      setErrorMessage('Please select or enter a customer.');
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.name.trim()) {
        setErrorMessage(`Please enter a product name for item #${i + 1}.`);
        return;
      }
      const qty = typeof it.quantity === 'number' ? it.quantity : 0;
      if (qty <= 0) {
        setErrorMessage(`Please enter a valid quantity for item #${i + 1}.`);
        return;
      }
      const price = typeof it.price === 'number' ? it.price : 0;
      if (price < 0) {
        setErrorMessage(`Price cannot be negative for item #${i + 1}.`);
        return;
      }
    }

    if (finalTotal <= 0) {
      setErrorMessage('Bill final total must be greater than zero.');
      return;
    }

    // Prevent duplicate clicks
    setIsSubmitting(true);

    try {
      const invoiceItems: InvoiceItem[] = items.map((it) => ({
        id: it.id,
        name: it.name.trim(),
        quantity: typeof it.quantity === 'number' ? it.quantity : 1,
        unit: 'packets',
        unitPrice: typeof it.price === 'number' ? it.price : 0,
        discount: 0,
        lineTotal: it.itemTotal,
      }));

      const paymentStatus = balance <= 0 ? 'Paid' : numAmountReceived > 0 ? 'Partially Paid' : 'Unpaid';

      const created = createInvoice({
        invoiceNumber,
        invoiceDate,
        customerId: customerToUse.id,
        customerName: customerToUse.name,
        customerMobile: customerToUse.mobile,
        customerBusinessName: customerToUse.businessName,
        customerAddress: customerToUse.address || customerToUse.areaCity,
        items: invoiceItems,
        subtotal,
        invoiceDiscount: numDiscount,
        taxEnabled: false,
        taxRate: 0,
        taxAmount: 0,
        grandTotal: finalTotal,
        paymentStatus,
        paymentMethod: paymentMethod as PaymentMethod,
        amountReceived: numAmountReceived,
        balanceDue: balance,
        createdByStaffId: activeStaff.id,
      });

      // Clear submitting flag and open preview
      setIsSubmitting(false);
      onInvoiceCreated(created.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Error saving bill: ${msg}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-16">
      {/* Page Title */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-amber-700" />
            <span>Create Bill</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Manually enter product details, calculate total, and schedule next repeat order.
          </p>
        </div>

        <div className="text-right">
          <div className="text-[11px] font-bold text-stone-400 uppercase">Bill No.</div>
          <div className="text-sm sm:text-base font-extrabold text-amber-800 font-mono">
            {invoiceNumber}
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveBill} className="space-y-4">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Customer & Bill Date */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              1. Customer Details
            </span>

            <button
              type="button"
              onClick={() => setIsNewCustomerMode(!isNewCustomerMode)}
              className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
            >
              {isNewCustomerMode ? '← Choose Existing Customer' : '+ New Customer'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {isNewCustomerMode ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Bhai"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 font-bold text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    Mobile Number (+91) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit number"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 font-bold text-stone-900"
                  />
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  Select Existing Customer <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-stone-50 font-bold text-stone-900 text-sm"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers
                    .filter((c) => !c.isArchived)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.businessName ? `(${c.businessName})` : ''} - +91 {c.mobile}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">
                Invoice Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-300 font-bold text-stone-900 text-sm"
              />
            </div>
          </div>
        </div>

        {/* 2. Product Items (Free Text, Quantity, Price, Line Total) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                2. Products ({items.length})
              </span>
              {onOpenManageProducts && (
                <button
                  type="button"
                  onClick={onOpenManageProducts}
                  className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1"
                >
                  <Package className="w-3 h-3" />
                  <span>Manage Products</span>
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Item</span>
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-700 text-white text-xs font-black flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <select
                    required
                    value={item.name}
                    onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-300 font-bold text-sm bg-white text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- Select Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                    {item.name && !products.some((p) => p.name === item.name) && (
                      <option value={item.name}>{item.name}</option>
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-2 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      placeholder="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(
                          idx,
                          'quantity',
                          e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-extrabold text-stone-900 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                      Price per Item (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      placeholder="0.00"
                      value={item.price}
                      onChange={(e) =>
                        handleItemChange(
                          idx,
                          'price',
                          e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-extrabold text-stone-900 text-sm"
                    />
                  </div>

                  <div className="text-right flex flex-col justify-end">
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                      Item Total
                    </label>
                    <div className="font-black text-stone-900 text-base py-1">
                      {formatCurrency(item.itemTotal)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Item</span>
            </button>
          </div>
        </div>

        {/* 3. Calculations: Subtotal, Discount, Final Total, Amount Received, Balance */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block pb-2 border-b border-stone-100">
            3. Totals & Payment
          </span>

          <div className="space-y-2.5 text-sm">
            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-600">Subtotal:</span>
              <span className="font-extrabold text-stone-900 text-base">
                {formatCurrency(subtotal)}
              </span>
            </div>

            {/* Optional Discount */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-600">Optional Discount (₹):</span>
              <div className="w-32">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={discount}
                  onChange={(e) =>
                    setDiscount(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                  }
                  className="w-full text-right px-3 py-1.5 rounded-xl border border-stone-300 font-bold"
                />
              </div>
            </div>

            {/* Final Total */}
            <div className="flex items-center justify-between py-2 border-t border-b border-stone-200">
              <span className="font-black text-stone-900 text-base">Final Total:</span>
              <span className="text-xl sm:text-2xl font-black text-amber-800">
                {formatCurrency(finalTotal)}
              </span>
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold text-stone-900 bg-stone-50 text-sm"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-600">
                    Amount Received (₹)
                  </label>
                  <button
                    type="button"
                    onClick={handleSetFullPayment}
                    className="text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    Full Paid
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={amountReceived}
                  onChange={(e) =>
                    setAmountReceived(
                      e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-extrabold text-stone-900 text-sm"
                />
              </div>
            </div>

            {/* Balance */}
            <div className="flex items-center justify-between pt-1">
              <span className="font-extrabold text-stone-800">Remaining Balance:</span>
              <span
                className={`font-black text-base ${
                  balance > 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {formatCurrency(balance)}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Schedule Next Order Reminder Interval */}
        <div className="bg-amber-50/90 border border-amber-300 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-700" />
              <span>Next Reminder Interval</span>
            </span>
            <span className="text-xs font-bold text-amber-900">
              Scheduled: {formatDate(estimatedNextReminder)}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => setReminderInterval('7')}
              className={`py-2 rounded-xl border transition ${
                reminderInterval === '7'
                  ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                  : 'bg-white text-stone-700 border-stone-300'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setReminderInterval('15')}
              className={`py-2 rounded-xl border transition ${
                reminderInterval === '15'
                  ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                  : 'bg-white text-stone-700 border-stone-300'
              }`}
            >
              15 Days
            </button>
            <button
              type="button"
              onClick={() => setReminderInterval('30')}
              className={`py-2 rounded-xl border transition ${
                reminderInterval === '30'
                  ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                  : 'bg-white text-stone-700 border-stone-300'
              }`}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => setReminderInterval('month')}
              className={`py-2 rounded-xl border transition ${
                reminderInterval === 'month'
                  ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                  : 'bg-white text-stone-700 border-stone-300'
              }`}
            >
              Next Month
            </button>
          </div>
        </div>

        {/* Actions: Save Bill & Clear */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClear}
            className="px-5 py-3 rounded-xl border border-stone-300 text-stone-700 font-bold text-sm hover:bg-stone-100 transition"
          >
            Clear
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3.5 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white font-black text-base shadow-lg transition active:scale-98 flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5 text-amber-200" />
            <span>{isSubmitting ? 'Saving...' : `Save Bill (${formatCurrency(finalTotal)})`}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
