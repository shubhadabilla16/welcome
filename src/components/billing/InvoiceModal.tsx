import React, { useRef } from 'react';
import {
  X,
  Printer,
  MessageSquare,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { Invoice } from '../../types';
import { formatCurrency, formatDate, formatIndianPhone } from '../../services/formatters';
import { getSettings } from '../../services/storage';
import { formatWhatsAppBillMessage, generateWhatsAppLink } from '../../services/whatsapp';

interface InvoiceModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  invoice,
  isOpen,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !invoice) return null;

  const settings = getSettings();

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const message = formatWhatsAppBillMessage(invoice);
    const url = generateWhatsAppLink(invoice.customerMobile, message);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-4 max-h-[94vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Top Actions Bar (Hidden on print) */}
        <div className="bg-stone-900 text-white px-4 py-3 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-amber-400">
              Bill Preview
            </span>
            <span className="text-xs text-stone-400 font-mono">({invoice.invoiceNumber})</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Share Bill on WhatsApp Button (Top Action Bar) */}
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition shadow-xs active:scale-95"
              title="Share Bill on WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Share Bill on WhatsApp</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs"
              title="Print Bill or Save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Bill Content */}
        <div
          ref={printRef}
          className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white text-stone-900 print:overflow-visible print:p-6 print:text-black font-sans"
        >
          {/* Header */}
          <div className="border-b-2 border-amber-800 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-50/90 p-0.5 border border-amber-300 shrink-0 overflow-hidden flex items-center justify-center">
                  <img
                    src="/logo.jpeg"
                    alt="Welcome Agarbatti Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-amber-800">सौ. उमा बिल्ला यांचे</div>
                  <h1 className="text-2xl font-black text-amber-900 tracking-tight leading-none print:text-black">
                    {settings.businessName}
                  </h1>
                  <p className="text-xs text-stone-600 mt-1">
                    Contact: <strong>7304357225, 9028779258</strong>
                    {settings.address ? ` • ${settings.address}` : ''}
                  </p>
                </div>
              </div>

              <div className="sm:text-right">
                <div className="text-xs font-bold text-stone-500 uppercase">Invoice No.</div>
                <div className="text-base font-black text-stone-900 font-mono">
                  {invoice.invoiceNumber}
                </div>
                <div className="text-xs text-stone-600 font-medium">
                  Date: <strong>{formatDate(invoice.invoiceDate)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Name & Phone */}
          <div className="py-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
            <div>
              <span className="text-stone-500 font-bold uppercase text-[10px] block">Customer:</span>
              <span className="font-extrabold text-stone-900 text-sm">
                {invoice.customerName}
                {invoice.customerBusinessName ? ` (${invoice.customerBusinessName})` : ''}
              </span>
            </div>
            <div>
              <span className="text-stone-500 font-bold uppercase text-[10px] block">Mobile:</span>
              <span className="font-bold text-stone-800 text-sm">
                {formatIndianPhone(invoice.customerMobile)}
              </span>
            </div>
          </div>

          {/* Product Names, Quantities, Prices, Line Totals */}
          <div className="py-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-stone-300 bg-stone-50 text-stone-700 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-2 text-center w-8">#</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3 text-center">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Price (₹)</th>
                  <th className="py-2.5 px-3 text-right">Line Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {invoice.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="py-2.5 px-2 text-center text-stone-400 font-bold">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-stone-900">{item.name}</td>
                    <td className="py-2.5 px-3 text-center font-extrabold text-stone-800">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-stone-700">
                      ₹{item.unitPrice.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-stone-900">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotal, Discount, Grand Total, Amount Received, Balance */}
          <div className="border-t-2 border-stone-300 pt-3 flex justify-end">
            <div className="w-full sm:w-64 space-y-1.5 text-xs text-stone-800">
              <div className="flex justify-between py-0.5">
                <span className="text-stone-600 font-medium">Subtotal:</span>
                <span className="font-bold">{formatCurrency(invoice.subtotal)}</span>
              </div>

              {invoice.invoiceDiscount > 0 && (
                <div className="flex justify-between py-0.5 text-rose-700">
                  <span>Discount:</span>
                  <span className="font-bold">-{formatCurrency(invoice.invoiceDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between py-1.5 border-t-2 border-b-2 border-stone-900 text-sm font-black text-stone-900">
                <span>Grand Total:</span>
                <span className="text-amber-900">{formatCurrency(invoice.grandTotal)}</span>
              </div>

              <div className="flex justify-between py-0.5">
                <span className="text-stone-600 font-medium">
                  Amount Received ({invoice.paymentMethod}):
                </span>
                <span className="font-bold text-emerald-700">
                  {formatCurrency(invoice.amountReceived)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-t border-stone-200 text-sm font-black">
                <span>Balance:</span>
                <span
                  className={invoice.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-700'}
                >
                  {formatCurrency(invoice.balanceDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Simple Footer */}
          <div className="mt-8 pt-4 border-t border-stone-200 flex justify-between items-center text-xs text-stone-500">
            <p className="italic">Thank you for choosing Welcome Agarbatti! 🙏</p>
            <p className="font-bold text-stone-800">Welcome Agarbatti</p>
          </div>
        </div>

        {/* Modal Bottom Actions Bar (Hidden on print) */}
        <div className="bg-stone-50 p-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="text-xs text-stone-500 font-semibold w-full sm:w-auto text-center sm:text-left">
            Payment Status:{' '}
            <strong
              className={invoice.balanceDue <= 0 ? 'text-emerald-700' : 'text-rose-600'}
            >
              {invoice.paymentStatus}
            </strong>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Primary Prominent "Share Bill on WhatsApp" Button */}
            <button
              onClick={handleShareWhatsApp}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-sm shadow-md transition"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Share Bill on WhatsApp</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-sm transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
