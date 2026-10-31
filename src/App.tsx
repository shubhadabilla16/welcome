/**
 * Welcome Agarbatti - Simple Business Management, Reminders & Billing
 * @license Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Customer, Invoice } from './types';
import {
  getCustomers,
  getInvoices,
  subscribeToStore,
  saveCustomers,
  addCustomer,
  updateCustomer,
  archiveCustomer,
  unarchiveCustomer,
} from './services/storage';
import {
  createCustomerInSupabase,
  updateCustomerInSupabase,
  fetchCustomersFromSupabase,
  setupSupabaseRealtime,
} from './services/supabaseData';
import { getSupabasePublishableKey } from './services/supabase';
import { localCustomerToSupabaseId } from './services/idMapping';
import { Header } from './components/common/Header';
import { Navigation, NavTab } from './components/common/Navigation';
import { OfflineBanner } from './components/common/OfflineBanner';
import { Dashboard } from './components/dashboard/Dashboard';
import { CustomerList } from './components/customers/CustomerList';
import { CustomerFormModal } from './components/customers/CustomerFormModal';
import { CustomerDetailModal } from './components/customers/CustomerDetailModal';
import { NewBill } from './components/billing/NewBill';
import { InvoiceModal } from './components/billing/InvoiceModal';
import { FollowUpManager } from './components/followups/FollowUpManager';
import { SettingsView } from './components/settings/SettingsView';
import { CloudSetupModal } from './components/cloud/CloudSetupModal';
import { ManageProductsModal } from './components/products/ManageProductsModal';
import { X } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [customers, setCustomers] = useState<Customer[]>(getCustomers());
  const [invoices, setInvoices] = useState<Invoice[]>(getInvoices());

  // Modals state
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState<Customer | null>(null);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);

  // Preselected customer when initiating a bill from customer card or reminder
  const [preSelectedCustomerForBill, setPreSelectedCustomerForBill] = useState<Customer | null>(null);

  // Initial cloud sync and realtime listener
  useEffect(() => {
    const syncFromCloud = async () => {
      const key = getSupabasePublishableKey();
      if (!key) return;
      try {
        const res = await fetchCustomersFromSupabase();
        if (res.success && res.data && res.data.length > 0) {
          const currentLocal = getCustomers();
          // Remote records from Supabase are the authoritative source of truth
          const remoteIds = new Set(res.data.map((r) => r.id));
          const remoteSbIds = new Set(res.data.map((r) => localCustomerToSupabaseId(r.id)));

          const merged = [...res.data];
          // Preserve any local customer that has not yet been uploaded to Supabase
          for (const loc of currentLocal) {
            const locSbId = localCustomerToSupabaseId(loc.id);
            if (!remoteIds.has(loc.id) && !remoteSbIds.has(locSbId)) {
              merged.push(loc);
            }
          }
          saveCustomers(merged);
          setCustomers(merged);
        }
      } catch (err) {
        console.warn('Initial cloud sync fallback to local store:', err);
      }
    };

    syncFromCloud();

    const unsubRealtime = setupSupabaseRealtime(
      async () => {
        const res = await fetchCustomersFromSupabase();
        if (res.success && res.data && res.data.length > 0) {
          const currentLocal = getCustomers();
          const remoteIds = new Set(res.data.map((r) => r.id));
          const remoteSbIds = new Set(res.data.map((r) => localCustomerToSupabaseId(r.id)));

          const merged = [...res.data];
          for (const loc of currentLocal) {
            const locSbId = localCustomerToSupabaseId(loc.id);
            if (!remoteIds.has(loc.id) && !remoteSbIds.has(locSbId)) {
              merged.push(loc);
            }
          }
          saveCustomers(merged);
          setCustomers(merged);
        }
      },
      () => {}
    );

    return () => {
      unsubRealtime();
    };
  }, []);

  // Subscribe to storage changes so any create/update synchronizes across all tabs
  useEffect(() => {
    const unsubscribe = subscribeToStore(() => {
      const refreshedCustomers = getCustomers();
      const refreshedInvoices = getInvoices();
      setCustomers(refreshedCustomers);
      setInvoices(refreshedInvoices);

      // Refresh detail modal customer if open
      if (selectedCustomerForDetail) {
        const updated = refreshedCustomers.find((c) => c.id === selectedCustomerForDetail.id);
        if (updated) setSelectedCustomerForDetail(updated);
      }
    });

    return () => unsubscribe();
  }, [selectedCustomerForDetail]);

  // Customer handlers with Supabase persistence
  const handleOpenAddCustomer = () => {
    setCustomerToEdit(null);
    setIsCustomerFormOpen(true);
  };

  const handleOpenEditCustomer = (customer: Customer) => {
    setSelectedCustomerForDetail(null);
    setCustomerToEdit(customer);
    setIsCustomerFormOpen(true);
  };

  const handleSaveCustomer = async (customerData: Partial<Customer>) => {
    if (customerToEdit) {
      // 1. Update locally
      const updated = updateCustomer(customerToEdit.id, customerData);
      // 2. Update in Supabase
      try {
        await updateCustomerInSupabase(customerToEdit.id, customerData);
      } catch (err) {
        console.warn('Could not update customer in Supabase immediately:', err);
      }
    } else {
      // 1. Add locally
      const created = addCustomer(customerData as any);
      // 2. Add to Supabase
      try {
        await createCustomerInSupabase(created);
      } catch (err) {
        console.warn('Could not add customer to Supabase immediately:', err);
      }
    }
    setIsCustomerFormOpen(false);
    setCustomerToEdit(null);
  };

  const handleArchiveCustomer = async (customerId: string) => {
    archiveCustomer(customerId);
    setSelectedCustomerForDetail(null);
    try {
      await updateCustomerInSupabase(customerId, { isArchived: true });
    } catch (err) {
      console.warn('Could not archive customer in Supabase:', err);
    }
  };

  const handleUnarchiveCustomer = async (customerId: string) => {
    unarchiveCustomer(customerId);
    try {
      await updateCustomerInSupabase(customerId, { isArchived: false });
    } catch (err) {
      console.warn('Could not unarchive customer in Supabase:', err);
    }
  };

  const handleCreateBillForCustomer = (customer: Customer) => {
    setPreSelectedCustomerForBill(customer);
    setCurrentTab('billing');
  };

  const handleInvoiceCreated = (invoiceId: string) => {
    const allInvs = getInvoices();
    const created = allInvs.find((inv) => inv.id === invoiceId);
    if (created) {
      setActiveInvoice(created);
    }
  };

  const handleFollowUpAction = (customer: Customer) => {
    setSelectedCustomerForDetail(customer);
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col font-sans text-stone-900 selection:bg-amber-200">
      {/* Offline Status Banner */}
      <OfflineBanner />

      {/* Main Brand Header */}
      <Header
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Workspace: Sidebar on desktop, Scrollable content area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Navigation: 4 options (Dashboard, Customers, Reminders, Billing) */}
        <Navigation
          currentTab={currentTab}
          onTabChange={(tab) => {
            if (tab !== 'billing') {
              setPreSelectedCustomerForBill(null);
            }
            setCurrentTab(tab);
          }}
          customers={customers}
        />

        {/* Dynamic Content View Container */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-20 md:pb-8">
          {currentTab === 'dashboard' && (
            <Dashboard
              customers={customers}
              invoices={invoices}
              onNavigate={(tab) => {
                if (tab !== 'billing') {
                  setPreSelectedCustomerForBill(null);
                }
                setCurrentTab(tab);
              }}
              onSelectCustomer={(c) => setSelectedCustomerForDetail(c)}
              onAddCustomer={handleOpenAddCustomer}
              onOpenManageProducts={() => setIsProductsModalOpen(true)}
            />
          )}

          {currentTab === 'customers' && (
            <CustomerList
              customers={customers}
              onAddCustomer={handleOpenAddCustomer}
              onSelectCustomer={(c) => setSelectedCustomerForDetail(c)}
              onCreateBill={handleCreateBillForCustomer}
            />
          )}

          {currentTab === 'reminders' && (
            <FollowUpManager
              customers={customers}
              onOpenCustomerDetail={(c) => setSelectedCustomerForDetail(c)}
              onCreateBillForCustomer={handleCreateBillForCustomer}
            />
          )}

          {currentTab === 'billing' && (
            <NewBill
              customers={customers}
              preSelectedCustomer={preSelectedCustomerForBill}
              onInvoiceCreated={handleInvoiceCreated}
              onAddNewCustomer={handleOpenAddCustomer}
              onOpenManageProducts={() => setIsProductsModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      {/* 1. Add / Edit Customer Modal */}
      <CustomerFormModal
        isOpen={isCustomerFormOpen}
        onClose={() => {
          setIsCustomerFormOpen(false);
          setCustomerToEdit(null);
        }}
        onSave={handleSaveCustomer}
        initialCustomer={customerToEdit}
      />

      {/* 2. Customer Detail & Purchase History Modal */}
      <CustomerDetailModal
        customer={selectedCustomerForDetail}
        isOpen={!!selectedCustomerForDetail}
        onClose={() => setSelectedCustomerForDetail(null)}
        onEdit={handleOpenEditCustomer}
        onArchive={handleArchiveCustomer}
        onUnarchive={handleUnarchiveCustomer}
        onCreateBillForCustomer={handleCreateBillForCustomer}
        onOpenFollowUpAction={handleFollowUpAction}
        onViewInvoice={(inv) => setActiveInvoice(inv)}
      />

      {/* 3. Simple Bill Printable Preview Modal */}
      <InvoiceModal
        invoice={activeInvoice}
        isOpen={!!activeInvoice}
        onClose={() => setActiveInvoice(null)}
      />

      {/* 4. Cloud & Multi-User Setup Modal */}
      <CloudSetupModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        onRequestFirebaseSetup={() => {
          alert('Firebase setup flow ready to connect!');
        }}
      />

      {/* 5. Business Settings & Backup Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-base text-amber-400">Settings & Backup</h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <SettingsView
                onOpenCloudModal={() => {
                  setIsSettingsOpen(false);
                  setIsCloudModalOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 6. Manage Products Modal */}
      <ManageProductsModal
        isOpen={isProductsModalOpen}
        onClose={() => setIsProductsModalOpen(false)}
      />
    </div>
  );
}
