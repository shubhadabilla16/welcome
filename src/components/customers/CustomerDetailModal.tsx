import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  FilePlus,
  Edit,
  Archive,
  RotateCcw,
  Clock,
  Store,
  MapPin,
  Calendar,
  Receipt,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Customer, Invoice, FollowUpLog } from '../../types';
import {
  formatCurrency,
  formatDate,
  formatIndianPhone,
  normalizePhone,
  determineFollowUpStatus,
} from '../../services/formatters';
import { getInvoices, getFollowUpLogs, getSettings, getStaffList } from '../../services/storage';
import { generateWhatsAppLink, renderMessageTemplate } from '../../services/whatsapp';

interface CustomerDetailModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (customer: Customer) => void;
  onArchive: (customerId: string) => void;
  onUnarchive: (customerId: string) => void;
  onCreateBillForCustomer: (customer: Customer) => void;
  onOpenFollowUpAction: (customer: Customer) => void;
  onViewInvoice: (invoice: Invoice) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  isOpen,
  onClose,
  onEdit,
  onArchive,
  onUnarchive,
  onCreateBillForCustomer,
  onOpenFollowUpAction,
  onViewInvoice,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'logs' | 'whatsapp'>('overview');
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'hindi' | 'marathi'>('english');
  const [copiedToast, setCopiedToast] = useState(false);

  if (!isOpen || !customer) return null;

  const settings = getSettings();
  const staffList = getStaffList();
  const allInvoices = getInvoices();
  const allLogs = getFollowUpLogs();

  const customerInvoices = allInvoices.filter((inv) => inv.customerId === customer.id);
  const customerLogs = allLogs.filter((log) => log.customerId === customer.id);
  const assignedStaff = staffList.find((s) => s.id === customer.assignedStaffId);
  const followUpStatus = determineFollowUpStatus(customer.nextFollowUpDate, customer.followUpStatus);

  // Template preview
  const activeTemplate = settings.templates[selectedLanguage] || settings.templates.english;
  const renderedMessage = renderMessageTemplate(activeTemplate, customer, settings);
  const whatsappUrl = generateWhatsAppLink(customer.mobile, renderedMessage);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(renderedMessage);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-stone-900 text-white p-5 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-700/80 text-amber-200 border border-amber-500/40">
                  {customer.id}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-800/80 text-stone-300">
                  {customer.category}
                </span>
                {customer.isArchived && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-900 text-rose-200 border border-rose-700">
                    Archived
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5 tracking-tight">
                {customer.name}
              </h2>
              {customer.businessName && (
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-amber-200 mt-0.5">
                  <Store className="w-4 h-4 text-amber-300" />
                  <span>{customer.businessName}</span>
                </div>
              )}
              {customer.areaCity && (
                <div className="flex items-center gap-1.5 text-xs text-stone-300 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  <span>{customer.areaCity}</span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Buttons Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-amber-800/60">
            <a
              href={`tel:+91${customer.mobile}`}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition active:scale-95"
            >
              <Phone className="w-4 h-4" />
              <span>Call Now</span>
            </a>

            <button
              onClick={() => setActiveTab('whatsapp')}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow transition active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onCreateBillForCustomer(customer);
              }}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition active:scale-95"
            >
              <FilePlus className="w-4 h-4" />
              <span>New Bill</span>
            </button>

            <button
              onClick={() => onEdit(customer)}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-100 font-bold text-xs shadow transition active:scale-95"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center border-b border-stone-200 bg-stone-50 px-5 text-xs font-bold text-stone-600 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-amber-700 text-amber-900 font-extrabold'
                : 'border-transparent hover:text-stone-900'
            }`}
          >
            Overview & Reminders
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'invoices'
                ? 'border-amber-700 text-amber-900 font-extrabold'
                : 'border-transparent hover:text-stone-900'
            }`}
          >
            <span>Invoices</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-200 text-stone-700 font-bold">
              {customerInvoices.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'whatsapp'
                ? 'border-amber-700 text-amber-900 font-extrabold'
                : 'border-transparent hover:text-stone-900'
            }`}
          >
            WhatsApp Template
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'border-amber-700 text-amber-900 font-extrabold'
                : 'border-transparent hover:text-stone-900'
            }`}
          >
            <span>Follow-up History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-200 text-stone-700 font-bold">
              {customerLogs.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-sm text-stone-800">
          {activeTab === 'overview' && (
            <>
              {/* Financial Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <div className="text-[11px] font-bold text-stone-500 uppercase">Total Purchases</div>
                  <div className="text-base font-extrabold text-stone-900 mt-0.5">
                    {formatCurrency(customer.totalPurchasesAmount)}
                  </div>
                  <div className="text-[11px] text-stone-500">{customer.totalPurchasesCount} bills generated</div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <div className="text-[11px] font-bold text-stone-500 uppercase">Last Purchase</div>
                  <div className="text-base font-extrabold text-stone-900 mt-0.5">
                    {customer.lastPurchaseAmount ? formatCurrency(customer.lastPurchaseAmount) : 'None yet'}
                  </div>
                  <div className="text-[11px] text-stone-500">{formatDate(customer.lastPurchaseDate)}</div>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    customer.outstandingBalance > 0
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="text-[11px] font-bold uppercase">Outstanding Dues</div>
                  <div className="text-base font-extrabold mt-0.5">
                    {formatCurrency(customer.outstandingBalance)}
                  </div>
                  <div className="text-[11px]">
                    {customer.outstandingBalance > 0 ? 'Pending payment' : 'Zero balance cleared'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <div className="text-[11px] font-bold text-stone-500 uppercase">Assigned Staff</div>
                  <div className="text-sm font-bold text-stone-900 mt-1 truncate">
                    {assignedStaff ? assignedStaff.name.split(' ')[0] : 'Family/Staff'}
                  </div>
                  <div className="text-[11px] text-stone-500">{customer.preferredContactMethod}</div>
                </div>
              </div>

              {/* Repeat-Order Reminder Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-700" />
                    <div>
                      <div className="font-bold text-amber-950 text-sm">Repeat-Order Follow-up</div>
                      <div className="text-xs text-amber-800">
                        Rule: Every {customer.defaultReminderInterval || 30} days ({customer.reminderRule === 'calendar_month' ? 'Same day next month' : 'Fixed calendar days'})
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-black shadow-xs ${
                      followUpStatus === 'Due Today'
                        ? 'bg-amber-600 text-white animate-pulse'
                        : followUpStatus === 'Overdue'
                        ? 'bg-rose-600 text-white'
                        : followUpStatus === 'Reordered'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-200 text-stone-800'
                    }`}
                  >
                    {followUpStatus}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs text-stone-700">
                  <div>
                    <strong>Scheduled Next Follow-up:</strong> {formatDate(customer.nextFollowUpDate)}
                  </div>
                  <button
                    onClick={() => onOpenFollowUpAction(customer)}
                    className="px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-bold transition shadow-xs text-xs"
                  >
                    Update / Record Outcome
                  </button>
                </div>
              </div>

              {/* Profile details */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2 text-xs text-stone-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="font-bold text-stone-900">Primary Mobile:</span>{' '}
                    {formatIndianPhone(customer.mobile)}
                  </div>
                  {customer.alternatePhone && (
                    <div>
                      <span className="font-bold text-stone-900">Alternate Phone:</span>{' '}
                      {formatIndianPhone(customer.alternatePhone)}
                    </div>
                  )}
                  {customer.address && (
                    <div className="sm:col-span-2">
                      <span className="font-bold text-stone-900">Address:</span> {customer.address}
                    </div>
                  )}
                  {customer.notes && (
                    <div className="sm:col-span-2 p-2 rounded bg-amber-100/60 border border-amber-200 text-amber-900">
                      <strong>Customer Notes:</strong> {customer.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Archive / Delete Warning */}
              <div className="pt-2 flex items-center justify-between text-xs text-stone-500">
                <span>Customer registered on {formatDate(customer.createdAt)}</span>
                {customer.isArchived ? (
                  <button
                    onClick={() => onUnarchive(customer.id)}
                    className="flex items-center gap-1 text-amber-800 hover:underline font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Unarchive Customer</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (confirm('Archive this customer? Historical invoices will remain intact.')) {
                        onArchive(customer.id);
                      }
                    }}
                    className="flex items-center gap-1 text-stone-500 hover:text-rose-700 transition"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive Customer</span>
                  </button>
                )}
              </div>
            </>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-stone-900 text-sm">Purchase Invoices History</h4>
                <button
                  onClick={() => {
                    onClose();
                    onCreateBillForCustomer(customer);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-800 text-white font-bold text-xs hover:bg-amber-900 transition flex items-center gap-1"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>Create Bill</span>
                </button>
              </div>

              {customerInvoices.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300 text-stone-500 text-xs">
                  No invoices recorded yet for this customer.
                </div>
              ) : (
                <div className="divide-y divide-stone-200 border border-stone-200 rounded-xl overflow-hidden bg-white">
                  {customerInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => onViewInvoice(inv)}
                      className="p-3 hover:bg-stone-50 cursor-pointer flex items-center justify-between gap-3 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900 text-xs sm:text-sm">
                            {inv.invoiceNumber}
                          </span>
                          <span
                            className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                              inv.paymentStatus === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.paymentStatus === 'Partially Paid'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {inv.paymentStatus}
                          </span>
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">
                          {formatDate(inv.invoiceDate)} • {inv.items.length} items
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-extrabold text-stone-900 text-sm">
                          {formatCurrency(inv.grandTotal)}
                        </div>
                        {inv.balanceDue > 0 ? (
                          <div className="text-[11px] font-bold text-rose-600">
                            Due: {formatCurrency(inv.balanceDue)}
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-600 font-semibold">Cleared</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-900 text-xs uppercase tracking-wider">
                  Select Language Template:
                </span>
                <div className="flex rounded-lg bg-stone-100 p-1 border border-stone-200 text-xs">
                  {(['english', 'hindi', 'marathi'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className={`px-3 py-1 rounded-md font-bold capitalize transition ${
                        selectedLanguage === lang
                          ? 'bg-amber-800 text-white shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Preview Box */}
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-300 text-stone-800 text-xs sm:text-sm font-sans space-y-2 whitespace-pre-wrap leading-relaxed">
                <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Message Preview (To: {formatIndianPhone(customer.mobile)})
                </div>
                <div>{renderedMessage}</div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopyMessage}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Copy className="w-4 h-4 text-stone-500" />
                  <span>{copiedToast ? 'Copied to Clipboard!' : 'Copy Message'}</span>
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="text-[11px] text-stone-500 italic bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                Note: Opening WhatsApp opens the direct chat in WhatsApp Web or the WhatsApp Android app without adding to phone contacts. Once sent, remember to update the follow-up outcome in the app.
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-stone-900 text-sm">Follow-up Contact History</h4>
                <button
                  onClick={() => onOpenFollowUpAction(customer)}
                  className="px-3 py-1.5 rounded-lg bg-amber-800 text-white font-bold text-xs hover:bg-amber-900 transition"
                >
                  + Log Contact Attempt
                </button>
              </div>

              {customerLogs.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300 text-stone-500 text-xs">
                  No contact attempts logged yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {customerLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900">{log.outcome}</span>
                        <span className="text-stone-400">{formatDate(log.contactDate)}</span>
                      </div>
                      <div className="text-stone-600">
                        Staff: <strong>{log.staffName}</strong> • Due: {formatDate(log.dueDate)}
                      </div>
                      {log.notes && (
                        <div className="text-amber-900 bg-amber-50 p-2 rounded border border-amber-200 mt-1">
                          {log.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-50 p-4 border-t border-stone-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-stone-500">
            Assigned: <strong>{assignedStaff?.name || 'Unassigned'}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
