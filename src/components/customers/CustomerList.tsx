import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Phone,
  MessageSquare,
  Store,
  Clock,
  FilePlus,
  Calendar,
  ChevronRight,
  Cloud,
} from 'lucide-react';
import { Customer } from '../../types';
import {
  formatCurrency,
  formatDate,
  formatIndianPhone,
  determineFollowUpStatus,
} from '../../services/formatters';

interface CustomerListProps {
  customers: Customer[];
  onAddCustomer: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onCreateBill: (customer: Customer) => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  onAddCustomer,
  onSelectCustomer,
  onCreateBill,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [directoryFilter, setDirectoryFilter] = useState<'all' | 'active' | 'archived'>('all');

  const activeCount = useMemo(() => customers.filter((c) => !c.isArchived).length, [customers]);
  const archivedCount = useMemo(() => customers.filter((c) => Boolean(c.isArchived)).length, [customers]);

  // Search & filter customers without hiding records unexpectedly
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return customers.filter((cust) => {
      // Tab filter
      if (directoryFilter === 'active' && cust.isArchived) return false;
      if (directoryFilter === 'archived' && !cust.isArchived) return false;

      // Query filter
      if (!q) return true;
      const matchName = (cust.name || '').toLowerCase().includes(q);
      const matchPhone = (cust.mobile || '').includes(q);
      const matchShop = cust.businessName && cust.businessName.toLowerCase().includes(q);
      const matchArea = cust.areaCity && cust.areaCity.toLowerCase().includes(q);
      return matchName || matchPhone || matchShop || matchArea;
    });
  }, [customers, searchQuery, directoryFilter]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-16">
      {/* Header and Add Customer Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Customer Directory
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Search customer records, view purchase history, or schedule next order.
          </p>
        </div>

        <button
          onClick={onAddCustomer}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-sm shadow transition active:scale-98 shrink-0"
        >
          <UserPlus className="w-5 h-5 text-amber-200" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Simple Search Input & Filter Tabs */}
      <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-3 text-stone-400" />
          <input
            type="text"
            placeholder="Search customer by name or 10-digit phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-bold text-stone-900 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3 text-xs text-stone-400 hover:text-stone-700 font-bold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setDirectoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              directoryFilter === 'all'
                ? 'bg-amber-800 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Customers ({customers.length})
          </button>
          <button
            onClick={() => setDirectoryFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              directoryFilter === 'active'
                ? 'bg-amber-800 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Active ({activeCount})
          </button>
          {archivedCount > 0 && (
            <button
              onClick={() => setDirectoryFilter('archived')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                directoryFilter === 'archived'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Archived ({archivedCount})
            </button>
          )}
        </div>
      </div>

      {/* Customer Count & Cloud Indicator */}
      <div className="flex items-center justify-between text-xs text-stone-500 font-bold px-1">
        <span>
          Showing {filteredCustomers.length} of <strong>{customers.length}</strong> total registered
          {archivedCount > 0 ? ` (${activeCount} Active • ${archivedCount} Archived)` : ''}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
          <Cloud className="w-3 h-3 text-amber-600" />
          <span>Cloud & Local Synchronized</span>
        </span>
      </div>

      {/* Customer Cards List */}
      {filteredCustomers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-stone-300 text-stone-500 space-y-3">
          <Store className="w-10 h-10 text-stone-400 mx-auto" />
          <div className="font-bold text-stone-700 text-base">No customers found</div>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {searchQuery
              ? `No customer matching "${searchQuery}". Click Add Customer to create a new profile.`
              : 'Add your first customer to get started.'}
          </p>
          <button
            onClick={onAddCustomer}
            className="px-4 py-2 rounded-xl bg-amber-700 text-white font-bold text-xs"
          >
            + Add Customer Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((cust) => {
            const status = determineFollowUpStatus(cust.nextFollowUpDate, cust.followUpStatus);

            return (
              <div
                key={cust.id}
                onClick={() => onSelectCustomer(cust)}
                className="bg-white p-4 rounded-2xl border border-stone-200 hover:border-amber-400 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Customer Information */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-stone-900 text-base sm:text-lg group-hover:text-amber-800 transition">
                      {cust.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        status === 'Due Today'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                          : status === 'Overdue'
                          ? 'bg-rose-100 text-rose-900 border border-rose-300'
                          : status === 'Reordered'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  {cust.businessName && (
                    <div className="text-xs font-semibold text-amber-800 flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{cust.businessName}</span>
                    </div>
                  )}

                  <div className="text-xs text-stone-600 flex items-center gap-3 flex-wrap">
                    <span>
                      Mob: <strong>+91 {cust.mobile}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Last purchase:{' '}
                      <strong>{cust.lastPurchaseAmount ? formatCurrency(cust.lastPurchaseAmount) : '—'}</strong>{' '}
                      ({formatDate(cust.lastPurchaseDate)})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-stone-500 pt-0.5">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Next Reminder:</span>
                    <strong className="text-stone-800">{formatDate(cust.nextFollowUpDate)}</strong>
                  </div>
                </div>

                {/* Action Buttons */}
                <div
                  className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <a
                    href={`tel:+91${cust.mobile}`}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 border border-emerald-200 transition"
                    title="Call"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Call</span>
                  </a>

                  <button
                    onClick={() => onSelectCustomer(cust)}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-1.5 border border-amber-300 transition"
                    title="WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>

                  <button
                    onClick={() => onCreateBill(cust)}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
                    title="Create Bill"
                  >
                    <FilePlus className="w-3.5 h-3.5 text-amber-200" />
                    <span>Bill</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
