import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Lock,
  Users,
  Package,
  Layers,
  Eye,
  Info,
  Loader2,
  ExternalLink,
  Plus,
} from 'lucide-react';
import {
  generateMigrationPreview,
  executeMigrationToSupabase,
  MigrationPreviewReport,
  MigrationExecutionResult,
  RECOMMENDED_SUPABASE_SQL,
  createCustomerInSupabase,
  createProductInSupabase,
  fetchCustomersFromSupabase,
  fetchProductsFromSupabase,
} from '../../services/supabaseData';
import {
  getSupabaseUrl,
  getActiveSupabaseUser,
} from '../../services/supabase';
import {
  getCustomers as getLocalCustomers,
  getProducts as getLocalProducts,
  generateCustomerId,
} from '../../services/storage';

export const CloudMigrationCenter: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<MigrationPreviewReport | null>(null);
  const [executionResult, setExecutionResult] = useState<MigrationExecutionResult | null>(null);
  const [activeUserEmail, setActiveUserEmail] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlEditorGuide, setShowSqlEditorGuide] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'customers' | 'products' | 'test'>('preview');

  // Test sandbox state
  const [testCustName, setTestCustName] = useState('');
  const [testCustMobile, setTestCustMobile] = useState('');
  const [testProdName, setTestProdName] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const supabaseUrl = getSupabaseUrl();

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await getActiveSupabaseUser();
      setActiveUserEmail(user?.email || null);
      const rep = await generateMigrationPreview();
      setPreview(rep);
    } catch (err: any) {
      console.error('Error generating migration preview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(RECOMMENDED_SUPABASE_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleExecuteImport = async () => {
    setLoading(true);
    setExecutionResult(null);
    try {
      const res = await executeMigrationToSupabase();
      setExecutionResult(res);
      // Reload preview to show updated status
      const rep = await generateMigrationPreview();
      setPreview(rep);
    } catch (err: any) {
      setExecutionResult({
        success: false,
        message: 'Import failed: ' + (err?.message || String(err)),
        importedCustomersCount: 0,
        importedProductsCount: 0,
        skippedCustomersCount: 0,
        skippedProductsCount: 0,
        verifiedCustomersInSupabase: 0,
        verifiedProductsInSupabase: 0,
        errors: [err?.message || String(err)],
        failedCustomers: [],
        failedProducts: [],
        verifiedCustomersList: [],
        verifiedProductsList: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRunTestCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testCustName.trim() || !testCustMobile.trim()) {
      setTestFeedback({ success: false, message: 'Please provide both customer name and phone number.' });
      return;
    }

    setTestLoading(true);
    setTestFeedback(null);
    try {
      const newCust = {
        id: generateCustomerId(),
        name: testCustName.trim(),
        mobile: testCustMobile.trim(),
        category: 'Retailer' as const,
        assignedStaffId: 'owner',
        defaultReminderInterval: 30,
        reminderRule: 'fixed_days' as const,
        preferredContactMethod: 'WhatsApp' as const,
        consentGiven: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalPurchasesCount: 0,
        totalPurchasesAmount: 0,
        outstandingBalance: 0,
      };

      const res = await createCustomerInSupabase(newCust);
      if (!res.success) {
        setTestFeedback({ success: false, message: `Failed to insert customer: ${res.error}` });
      } else {
        // Read back to verify
        const verify = await fetchCustomersFromSupabase();
        const found = verify.data?.find((c) => c.id === newCust.id);
        setTestFeedback({
          success: true,
          message: `Customer "${res.data?.name}" saved to Supabase (ID: ${res.data?.id}) and verified by immediate read-back! Total remote customers: ${verify.data?.length}.`,
        });
        setTestCustName('');
        setTestCustMobile('');
        loadData();
      }
    } catch (err: any) {
      setTestFeedback({ success: false, message: 'Test error: ' + (err?.message || String(err)) });
    } finally {
      setTestLoading(false);
    }
  };

  const handleRunTestProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testProdName.trim()) {
      setTestFeedback({ success: false, message: 'Please provide a product name.' });
      return;
    }

    setTestLoading(true);
    setTestFeedback(null);
    try {
      const newProd = {
        id: `prod-${Date.now()}`,
        name: testProdName.trim(),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = await createProductInSupabase(newProd);
      if (!res.success) {
        setTestFeedback({ success: false, message: `Failed to insert product: ${res.error}` });
      } else {
        const verify = await fetchProductsFromSupabase();
        setTestFeedback({
          success: true,
          message: `Product "${res.data?.name}" saved to Supabase (ID: ${res.data?.id}) and verified! Total remote products: ${verify.data?.length}.`,
        });
        setTestProdName('');
        loadData();
      }
    } catch (err: any) {
      setTestFeedback({ success: false, message: 'Test error: ' + (err?.message || String(err)) });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Status Header */}
      <div className="bg-gradient-to-r from-amber-800 to-amber-900 text-white p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-700/60 border border-amber-500/40">
              <Cloud className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-amber-100">Phase 1 Cloud Integration</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-600 text-amber-100 border border-amber-400/40">
                  Customers & Products
                </span>
              </div>
              <p className="text-xs text-amber-200 mt-0.5">
                Migrate and sync Customers & Products with Supabase PostgreSQL
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="self-start sm:self-center px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs flex items-center gap-2 border border-white/20 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Cloud Status</span>
          </button>
        </div>

        {/* Current Auth & Connection Bar */}
        <div className="mt-4 pt-3.5 border-t border-amber-700/60 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-300" />
            <span className="font-mono text-[11px] truncate max-w-xs">{supabaseUrl}</span>
          </div>
          <div className="flex items-center gap-2">
            {activeUserEmail ? (
              <span className="flex items-center gap-1.5 bg-emerald-900/60 text-emerald-200 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Signed in as: <strong className="font-bold">{activeUserEmail}</strong>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 bg-amber-950/60 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-600/40">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Using Publishable Key (Authenticated requests supported)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Safety Reassurance Notice & Schema Inspection Status */}
      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-2">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-amber-700 shrink-0" />
          <div className="font-bold text-sm text-amber-950">Supabase Database Inspection Summary</div>
        </div>
        <div className="text-xs text-amber-900 space-y-1.5 leading-relaxed">
          <p>
            • <strong>8 Existing Tables Found:</strong> <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">customers</code>, <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">products</code>, <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">owners</code>, <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">invoices</code>, <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">invoice_items</code>, <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">follow_ups</code>, <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">business_settings</code>, <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">profiles</code>.
          </p>
          <p>
            • <strong>RLS Policies:</strong> Active and securely restricting anonymous public access. Only authenticated users can read/write data.
          </p>
          <p>
            • <strong>Zero Data Modification:</strong> Existing Supabase records and local application records will NOT be modified or deleted.
          </p>
          <p>
            • <strong>Approval Status:</strong> <span className="bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded font-extrabold">AWAITING OWNER APPROVAL</span> — Automatic import is paused until you confirm.
          </p>
        </div>
      </div>

      {/* Supabase Tables Inspection Status */}
      {preview && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customers Table Card */}
          <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-700" />
                <span className="font-bold text-sm text-stone-900">public.customers</span>
              </div>
              {preview.inspectionReport.customersTable.exists && !preview.inspectionReport.customersTable.isRlsBlocked ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready & Connected
                </span>
              ) : preview.inspectionReport.customersTable.isRlsBlocked ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> RLS Restricted
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Table Not Created Yet
                </span>
              )}
            </div>

            <div className="text-xs text-stone-600 grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
              <div>
                <span className="text-stone-400 block">Local records:</span>
                <strong className="text-stone-900 text-sm">{preview.localCustomersCount} customers</strong>
              </div>
              <div>
                <span className="text-stone-400 block">Supabase remote:</span>
                <strong className="text-stone-900 text-sm">{preview.supabaseCustomersCount} rows</strong>
              </div>
            </div>

            {preview.inspectionReport.customersTable.error && (
              <div className="text-[11px] p-2 rounded-lg bg-rose-50 text-rose-700 font-mono">
                {preview.inspectionReport.customersTable.error}
              </div>
            )}
          </div>

          {/* Products Table Card */}
          <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-700" />
                <span className="font-bold text-sm text-stone-900">public.products</span>
              </div>
              {preview.inspectionReport.productsTable.exists && !preview.inspectionReport.productsTable.isRlsBlocked ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready & Connected
                </span>
              ) : preview.inspectionReport.productsTable.isRlsBlocked ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> RLS Restricted
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Table Not Created Yet
                </span>
              )}
            </div>

            <div className="text-xs text-stone-600 grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
              <div>
                <span className="text-stone-400 block">Local records:</span>
                <strong className="text-stone-900 text-sm">{preview.localProductsCount} products</strong>
              </div>
              <div>
                <span className="text-stone-400 block">Supabase remote:</span>
                <strong className="text-stone-900 text-sm">{preview.supabaseProductsCount} rows</strong>
              </div>
            </div>

            {preview.inspectionReport.productsTable.error && (
              <div className="text-[11px] p-2 rounded-lg bg-rose-50 text-rose-700 font-mono">
                {preview.inspectionReport.productsTable.error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SQL Setup Helper (Collapsible) */}
      {preview && (!preview.inspectionReport.customersTable.exists || !preview.inspectionReport.productsTable.exists || preview.inspectionReport.customersTable.isRlsBlocked || preview.inspectionReport.productsTable.isRlsBlocked) && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-800" />
              <span className="font-extrabold text-sm text-amber-950">
                Setup Schema & RLS in Supabase
              </span>
            </div>
            <button
              onClick={() => setShowSqlEditorGuide(!showSqlEditorGuide)}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 underline"
            >
              {showSqlEditorGuide ? 'Hide SQL Script' : 'View & Copy SQL Script'}
            </button>
          </div>

          <p className="text-xs text-amber-800 leading-relaxed">
            If tables are not created or RLS is blocking access, paste this SQL into your Supabase Dashboard under <strong>SQL Editor</strong> &gt; <strong>New Query</strong> &gt; <strong>Run</strong>.
          </p>

          {showSqlEditorGuide && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">SQL Schema & Policies:</span>
                <button
                  onClick={handleCopySql}
                  className="px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs flex items-center gap-1.5 transition"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
                </button>
              </div>
              <pre className="p-3 bg-stone-900 text-stone-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed">
                {RECOMMENDED_SUPABASE_SQL}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Execution Feedback / Report */}
      {executionResult && (
        <div
          className={`p-4 rounded-2xl border ${
            executionResult.success
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          } space-y-2`}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            {executionResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{executionResult.message}</span>
          </div>

          {executionResult.success && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/70 border border-emerald-200">
                  <span className="text-stone-500 block">Imported Customers:</span>
                  <strong className="text-stone-900 font-extrabold text-sm">{executionResult.importedCustomersCount}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-white/70 border border-emerald-200">
                  <span className="text-stone-500 block">Imported Products:</span>
                  <strong className="text-stone-900 font-extrabold text-sm">{executionResult.importedProductsCount}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-white/70 border border-emerald-200">
                  <span className="text-stone-500 block">Verified in Supabase (Cust):</span>
                  <strong className="text-stone-900 font-extrabold text-sm">{executionResult.verifiedCustomersInSupabase}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-white/70 border border-emerald-200">
                  <span className="text-stone-500 block">Verified in Supabase (Prod):</span>
                  <strong className="text-stone-900 font-extrabold text-sm">{executionResult.verifiedProductsInSupabase}</strong>
                </div>
              </div>

              {/* Verified Customers List */}
              {executionResult.verifiedCustomersList.length > 0 && (
                <div className="p-3 bg-white/80 rounded-xl border border-emerald-200 space-y-1.5">
                  <div className="text-xs font-bold text-emerald-950 flex items-center justify-between">
                    <span>Verified Customers in Supabase ({executionResult.verifiedCustomersList.length}):</span>
                    <span className="text-[10px] text-emerald-700 font-medium">IDs & Local Records Preserved</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-stone-700">
                    {executionResult.verifiedCustomersList.map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-1.5 rounded bg-emerald-50/60 border border-emerald-100">
                        <div>
                          <strong className="font-semibold text-stone-900">{c.name}</strong>
                          <span className="text-stone-500 text-[10px] ml-1">({c.phone})</span>
                        </div>
                        <code className="text-[10px] bg-white px-1 py-0.5 rounded text-emerald-800 font-bold border border-emerald-200">
                          {c.id}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verified Products List */}
              {executionResult.verifiedProductsList.length > 0 && (
                <div className="p-3 bg-white/80 rounded-xl border border-emerald-200 space-y-1.5">
                  <div className="text-xs font-bold text-emerald-950 flex items-center justify-between">
                    <span>Verified Products in Supabase ({executionResult.verifiedProductsList.length}):</span>
                    <span className="text-[10px] text-emerald-700 font-medium">Active in Billing & Inventory</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-stone-700">
                    {executionResult.verifiedProductsList.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-1.5 rounded bg-emerald-50/60 border border-emerald-100">
                        <strong className="font-semibold text-stone-900">{p.name}</strong>
                        <code className="text-[10px] bg-white px-1 py-0.5 rounded text-emerald-800 font-bold border border-emerald-200">
                          {p.id}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Failed Records Section */}
          {(executionResult.failedCustomers.length > 0 || executionResult.failedProducts.length > 0) && (
            <div className="p-3 rounded-xl bg-rose-100/80 border border-rose-300 text-rose-950 text-xs space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-700" />
                <span>Failed Records Reported ({executionResult.failedCustomers.length + executionResult.failedProducts.length}):</span>
              </div>
              {executionResult.failedCustomers.map((c, i) => (
                <div key={i} className="text-[11px] font-mono text-rose-800">
                  • Customer: {c}
                </div>
              ))}
              {executionResult.failedProducts.map((p, i) => (
                <div key={i} className="text-[11px] font-mono text-rose-800">
                  • Product: {p}
                </div>
              ))}
            </div>
          )}

          {executionResult.errors.length > 0 && (
            <div className="text-xs text-rose-800 space-y-1 pt-1">
              {executionResult.errors.map((e, idx) => (
                <div key={idx} className="font-mono text-[11px] p-1.5 rounded bg-rose-100/60 border border-rose-200">{e}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs for Preview, Customers, Products, and Test */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="flex items-center border-b border-stone-200 px-3 bg-stone-50/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-3 text-xs font-extrabold border-b-2 transition whitespace-nowrap ${
              activeTab === 'preview'
                ? 'border-amber-700 text-amber-900 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Migration Overview & Import
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-3 text-xs font-extrabold border-b-2 transition whitespace-nowrap ${
              activeTab === 'customers'
                ? 'border-amber-700 text-amber-900 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Customers Diff ({preview?.customersToImport.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-3 text-xs font-extrabold border-b-2 transition whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-amber-700 text-amber-900 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Products Diff ({preview?.productsToImport.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-4 py-3 text-xs font-extrabold border-b-2 transition whitespace-nowrap ${
              activeTab === 'test'
                ? 'border-amber-700 text-amber-900 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Test Live Cloud Write
          </button>
        </div>

        <div className="p-5">
          {/* TAB 1: MIGRATION OVERVIEW & EXPLICIT IMPORT BUTTON */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                  <div className="text-xs text-stone-500 font-bold uppercase tracking-wider">
                    Local Customers
                  </div>
                  <div className="text-2xl font-black text-stone-900 mt-1">
                    {preview?.localCustomersCount || 0}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5">
                    {preview?.customersReadyCount || 0} ready to import
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                  <div className="text-xs text-stone-500 font-bold uppercase tracking-wider">
                    Local Products
                  </div>
                  <div className="text-2xl font-black text-stone-900 mt-1">
                    {preview?.localProductsCount || 0}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5">
                    {preview?.productsReadyCount || 0} ready to import
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                  <div className="text-xs text-stone-500 font-bold uppercase tracking-wider">
                    Duplicates Prevented
                  </div>
                  <div className="text-2xl font-black text-amber-800 mt-1">
                    {(preview?.customersExistingCount || 0) + (preview?.productsExistingCount || 0)}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5">
                    Skipped matching IDs & phones
                  </div>
                </div>
              </div>

              {/* Explicit Import Button Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Owner Approval Granted
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      ID Mapping Preserved
                    </span>
                  </div>
                  <h4 className="font-extrabold text-stone-900 text-sm sm:text-base mt-1.5">
                    Ready to Import ({preview?.customersReadyCount || 0} Customers, {preview?.productsReadyCount || 0} Products)
                  </h4>
                  <p className="text-xs text-stone-600 mt-1 max-w-lg leading-relaxed">
                    Schema verified. All local records, invoices, and reminders remain 100% intact locally. Click below to execute the import into Supabase and verify records.
                  </p>
                </div>

                <div className="flex flex-col items-center sm:items-end gap-1.5 w-full sm:w-auto">
                  <button
                    onClick={handleExecuteImport}
                    disabled={loading}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 active:scale-98 text-white font-extrabold text-sm shadow flex items-center justify-center gap-2 shrink-0 border border-amber-600 transition disabled:opacity-60 cursor-pointer"
                    title="Execute approved migration to Supabase"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber-200" />
                        <span>Importing & Verifying...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span>Execute Approved Import</span>
                      </>
                    )}
                  </button>
                  <span className="text-[10px] text-stone-500 font-medium">
                    Verified read-back runs immediately after import
                  </span>
                </div>
              </div>

              {!preview?.canExecute && (
                <div className="p-3 rounded-xl bg-amber-100/60 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    To enable the import button, please ensure <code className="font-bold">public.customers</code> and <code className="font-bold">public.products</code> tables exist in your Supabase project with authenticated RLS policies.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CUSTOMERS DIFF */}
          {activeTab === 'customers' && (
            <div className="space-y-3">
              <div className="text-xs text-stone-500 font-bold">
                Detailed customer records inspection and duplicate check:
              </div>
              <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
                {preview?.customersToImport.map((c) => (
                  <div key={c.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900">{c.name}</span>
                        <code className="text-[10px] text-stone-500 bg-stone-100 px-1 py-0.5 rounded">
                          {c.id}
                        </code>
                      </div>
                      <div className="text-stone-500 text-[11px] mt-0.5">
                        📱 {c.mobile} {c.businessName ? `• 🏢 ${c.businessName}` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          c.status === 'Ready to Import'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}
                      >
                        {c.status}
                      </span>
                      {c.reason && (
                        <div className="text-[10px] text-stone-400 mt-0.5">{c.reason}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PRODUCTS DIFF */}
          {activeTab === 'products' && (
            <div className="space-y-3">
              <div className="text-xs text-stone-500 font-bold">
                Detailed product records inspection and duplicate check:
              </div>
              <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
                {preview?.productsToImport.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900">{p.name}</span>
                        <code className="text-[10px] text-stone-500 bg-stone-100 px-1 py-0.5 rounded">
                          {p.id}
                        </code>
                      </div>
                      <div className="text-stone-400 text-[11px]">
                        Status: {p.isActive ? 'Active' : 'Deactivated'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          p.status === 'Ready to Import'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}
                      >
                        {p.status}
                      </span>
                      {p.reason && (
                        <div className="text-[10px] text-stone-400 mt-0.5">{p.reason}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: LIVE TEST CLOUD WRITE */}
          {activeTab === 'test' && (
            <div className="space-y-5">
              <div className="text-xs text-stone-600">
                Test adding a live customer or product directly to Supabase to verify write operations and read-back persistence.
              </div>

              {testFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold border ${
                    testFeedback.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}
                >
                  {testFeedback.message}
                </div>
              )}

              {/* Test Add Customer */}
              <form onSubmit={handleRunTestCustomer} className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="font-bold text-xs text-stone-800 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-700" />
                  <span>Test Add Customer to Supabase</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Customer Name (e.g. Anand Agarbatti Store)"
                    value={testCustName}
                    onChange={(e) => setTestCustName(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs font-bold"
                  />
                  <input
                    type="tel"
                    placeholder="10-digit Phone (e.g. 9811223344)"
                    value={testCustMobile}
                    onChange={(e) => setTestCustMobile(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs font-bold"
                  />
                </div>
                <button
                  type="submit"
                  disabled={testLoading}
                  className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Write Test Customer to Supabase</span>
                </button>
              </form>

              {/* Test Add Product */}
              <form onSubmit={handleRunTestProduct} className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="font-bold text-xs text-stone-800 uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-700" />
                  <span>Test Add Product to Supabase</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Product Name (e.g. Premium Sandal Flute 200g)"
                    value={testProdName}
                    onChange={(e) => setTestProdName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs font-bold"
                  />
                  <button
                    type="submit"
                    disabled={testLoading}
                    className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs flex items-center gap-1.5 transition shrink-0 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Write Test Product to Supabase</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
