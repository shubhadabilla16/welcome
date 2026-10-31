import { Customer, Product } from '../types';
import { getSupabaseClient, getSupabasePublishableKey } from './supabase';
import {
  localCustomerToSupabaseId,
  supabaseToLocalCustomerId,
  localProductToSupabaseId,
  supabaseToLocalProductId,
  isUuid,
} from './idMapping';
import {
  getCustomers as getLocalCustomers,
  saveCustomers as saveLocalCustomers,
  getProducts as getLocalProducts,
  saveProducts as saveLocalProducts,
} from './storage';

/**
 * SQL Schema definition for Supabase SQL Editor in case tables
 * need to be created or RLS policies configured.
 */
export const RECOMMENDED_SUPABASE_SQL = `-- ==========================================
-- Welcome Agarbatti - Phase 1 Cloud Schema
-- Run this in your Supabase SQL Editor if needed
-- ==========================================

-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow authenticated family members to read, insert, update and delete products
DROP POLICY IF EXISTS "Authenticated users full access to products" ON public.products;
CREATE POLICY "Authenticated users full access to products"
ON public.products
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Also allow public anon read for products so billing dropdown works in any mode:
DROP POLICY IF EXISTS "Public read access to products" ON public.products;
CREATE POLICY "Public read access to products"
ON public.products
FOR SELECT
TO anon
USING (true);


-- 2. Create Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  alternate_phone TEXT,
  business_name TEXT,
  address TEXT,
  area_city TEXT,
  category TEXT DEFAULT 'Retailer',
  assigned_staff_id TEXT DEFAULT 'owner',
  default_reminder_interval INTEGER DEFAULT 30,
  reminder_rule TEXT DEFAULT 'fixed_days',
  preferred_contact_method TEXT DEFAULT 'WhatsApp',
  notes TEXT,
  consent_given BOOLEAN DEFAULT true,
  last_purchase_date TEXT,
  last_purchase_amount NUMERIC DEFAULT 0,
  total_purchases_count INTEGER DEFAULT 0,
  total_purchases_amount NUMERIC DEFAULT 0,
  outstanding_balance NUMERIC DEFAULT 0,
  next_follow_up_date TEXT,
  follow_up_status TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated family members full access to customers
DROP POLICY IF EXISTS "Authenticated users full access to customers" ON public.customers;
CREATE POLICY "Authenticated users full access to customers"
ON public.customers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow public read for fallback or testing (optional, adjust per privacy needs):
DROP POLICY IF EXISTS "Public read access to customers" ON public.customers;
CREATE POLICY "Public read access to customers"
ON public.customers
FOR SELECT
TO anon
USING (true);
`;

// isUuid is imported from ./idMapping

/**
 * Maps a Customer TypeScript object to the actual Supabase database row (public.customers)
 * Using the exact discovered columns:
 * id, name, phone, alternate_phone, shop_name, address, area, reminder_interval, notes,
 * last_purchase_date, last_purchase_amount, next_reminder_date, created_at, updated_at
 */
export function customerToSupabaseRow(c: Customer): Record<string, any> {
  const sbId = localCustomerToSupabaseId(c.id);
  const row: Record<string, any> = {
    id: sbId,
    name: c.name,
    phone: c.mobile,
    alternate_phone: c.alternatePhone || null,
    shop_name: c.businessName || null,
    address: c.address || null,
    area: c.areaCity || null,
    reminder_interval: c.defaultReminderInterval ?? 30,
    notes: c.notes || null,
    last_purchase_date: c.lastPurchaseDate || null,
    last_purchase_amount: c.lastPurchaseAmount ?? 0,
    next_reminder_date: c.nextFollowUpDate || null,
    created_at: c.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isUuid(c.assignedStaffId)) {
    row.assigned_owner_id = c.assignedStaffId;
  }

  return row;
}

/**
 * Maps a Supabase database row to a Customer TypeScript object
 * Preserves the original local ID (e.g. WA-CUST-1001) via established ID mapping
 */
export function supabaseRowToCustomer(row: Record<string, any>): Customer {
  const rawId = String(row.id || '');
  const localId = supabaseToLocalCustomerId(rawId);

  return {
    id: localId,
    name: String(row.name || ''),
    mobile: String(row.phone || row.mobile || ''),
    alternatePhone: row.alternate_phone || row.alternatePhone || undefined,
    businessName: row.shop_name || row.business_name || row.businessName || undefined,
    address: row.address || undefined,
    areaCity: row.area || row.area_city || row.areaCity || undefined,
    category: (row.category as any) || 'Retailer',
    assignedStaffId: row.assigned_owner_id || row.assigned_staff_id || 'owner',
    defaultReminderInterval: Number(row.reminder_interval ?? row.default_reminder_interval ?? row.defaultReminderInterval ?? 30),
    reminderRule: (row.reminder_rule || row.reminderRule || 'fixed_days') as any,
    preferredContactMethod: (row.preferred_contact_method || row.preferredContactMethod || 'WhatsApp') as any,
    notes: row.notes || undefined,
    consentGiven: Boolean(row.consent_given ?? true),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    lastPurchaseDate: row.last_purchase_date || row.lastPurchaseDate || undefined,
    lastPurchaseAmount: row.last_purchase_amount !== undefined ? Number(row.last_purchase_amount) : undefined,
    totalPurchasesCount: Number(row.total_purchases_count ?? 0),
    totalPurchasesAmount: Number(row.total_purchases_amount ?? 0),
    outstandingBalance: Number(row.outstanding_balance ?? 0),
    nextFollowUpDate: row.next_reminder_date || row.next_follow_up_date || undefined,
    followUpStatus: (row.follow_up_status || undefined) as any,
    isArchived: Boolean(row.is_archived ?? false),
  };
}

/**
 * Maps a Product TypeScript object to actual Supabase row (public.products)
 * Using discovered columns: id, name, active, created_at
 */
export function productToSupabaseRow(p: Product): Record<string, any> {
  const sbId = localProductToSupabaseId(p.id);
  const row: Record<string, any> = {
    id: sbId,
    name: p.name,
    active: p.isActive !== false,
    created_at: p.createdAt || new Date().toISOString(),
  };

  return row;
}

/**
 * Maps a Supabase row to Product TypeScript object
 * Preserves the original local ID (e.g. prod-1) via established ID mapping
 */
export function supabaseRowToProduct(row: Record<string, any>): Product {
  const rawId = String(row.id || '');
  const localId = supabaseToLocalProductId(rawId);

  return {
    id: localId,
    name: String(row.name || ''),
    isActive: row.active !== undefined ? Boolean(row.active) : (row.is_active !== undefined ? Boolean(row.is_active) : true),
    createdAt: row.created_at || row.createdAt || undefined,
    updatedAt: row.updated_at || row.updatedAt || undefined,
  };
}

export interface TableInspectionResult {
  tableName: string;
  exists: boolean;
  isRlsBlocked: boolean;
  rowCount: number;
  sampleColumns: string[];
  error?: string;
  errorCode?: string;
  statusCode?: number;
}

/**
 * Inspect a table in Supabase (check existence, RLS permission, and column schema)
 */
export async function inspectSupabaseTable(tableName: 'customers' | 'products'): Promise<TableInspectionResult> {
  const client = getSupabaseClient();
  try {
    const { data, error, status, count } = await client
      .from(tableName)
      .select('*', { count: 'exact' })
      .limit(1);

    if (error) {
      const msg = error.message.toLowerCase();
      const isMissing = error.code === '42P01' || msg.includes('does not exist');
      const isRls = error.code === '42501' || msg.includes('row-level security') || msg.includes('permission denied');

      return {
        tableName,
        exists: !isMissing,
        isRlsBlocked: isRls,
        rowCount: 0,
        sampleColumns: [],
        error: error.message,
        errorCode: error.code,
        statusCode: status,
      };
    }

    const sampleRow = data && data.length > 0 ? data[0] : null;
    const sampleColumns = sampleRow ? Object.keys(sampleRow) : [];

    return {
      tableName,
      exists: true,
      isRlsBlocked: false,
      rowCount: count ?? (data?.length || 0),
      sampleColumns,
    };
  } catch (err: any) {
    return {
      tableName,
      exists: false,
      isRlsBlocked: false,
      rowCount: 0,
      sampleColumns: [],
      error: err?.message || String(err),
    };
  }
}

// ==========================================
// CUSTOMER CRUD OPERATIONS
// ==========================================

export interface SupabaseOpResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  isRlsError?: boolean;
}

/**
 * Fetch all customers from Supabase (ordered by name)
 */
export async function fetchCustomersFromSupabase(): Promise<SupabaseOpResult<Customer[]>> {
  const client = getSupabaseClient();
  try {
    const { data, error } = await client
      .from('customers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      const isRls = error.code === '42501' || error.message.toLowerCase().includes('row-level security');
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        isRlsError: isRls,
      };
    }

    const customers = (data || []).map(supabaseRowToCustomer);
    return { success: true, data: customers };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * Add a customer to Supabase
 */
export async function createCustomerInSupabase(customer: Customer): Promise<SupabaseOpResult<Customer>> {
  const client = getSupabaseClient();
  try {
    const row = customerToSupabaseRow(customer);
    const { data, error } = await client
      .from('customers')
      .insert([row])
      .select()
      .single();

    if (error) {
      const isRls = error.code === '42501' || error.message.toLowerCase().includes('row-level security');
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        isRlsError: isRls,
      };
    }

    const saved = supabaseRowToCustomer(data || row);
    return { success: true, data: saved };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * Update an existing customer in Supabase
 */
export async function updateCustomerInSupabase(
  id: string,
  updates: Partial<Customer>
): Promise<SupabaseOpResult<Customer>> {
  const client = getSupabaseClient();
  try {
    const sbId = localCustomerToSupabaseId(id);
    // Construct database patch payload with actual Supabase columns
    const patch: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.mobile !== undefined) patch.phone = updates.mobile;
    if (updates.alternatePhone !== undefined) patch.alternate_phone = updates.alternatePhone || null;
    if (updates.businessName !== undefined) patch.shop_name = updates.businessName || null;
    if (updates.address !== undefined) patch.address = updates.address || null;
    if (updates.areaCity !== undefined) patch.area = updates.areaCity || null;
    if (updates.defaultReminderInterval !== undefined) patch.reminder_interval = updates.defaultReminderInterval;
    if (updates.notes !== undefined) patch.notes = updates.notes || null;
    if (updates.lastPurchaseDate !== undefined) patch.last_purchase_date = updates.lastPurchaseDate || null;
    if (updates.lastPurchaseAmount !== undefined) patch.last_purchase_amount = updates.lastPurchaseAmount;
    if (updates.nextFollowUpDate !== undefined) patch.next_reminder_date = updates.nextFollowUpDate || null;
    if (updates.assignedStaffId !== undefined && isUuid(updates.assignedStaffId)) {
      patch.assigned_owner_id = updates.assignedStaffId;
    }

    const { data, error } = await client
      .from('customers')
      .update(patch)
      .eq('id', sbId)
      .select()
      .maybeSingle();

    if (error) {
      const isRls = error.code === '42501' || error.message.toLowerCase().includes('row-level security');
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        isRlsError: isRls,
      };
    }

    const saved = supabaseRowToCustomer(data || patch);
    return { success: true, data: saved };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * Search customers in Supabase by name, phone or shop name
 */
export async function searchCustomersInSupabase(query: string): Promise<SupabaseOpResult<Customer[]>> {
  const client = getSupabaseClient();
  const q = query.trim();
  if (!q) return fetchCustomersFromSupabase();

  try {
    const { data, error } = await client
      .from('customers')
      .select('*')
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%,shop_name.ilike.%${q}%`)
      .order('name', { ascending: true });

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
      };
    }

    return {
      success: true,
      data: (data || []).map(supabaseRowToCustomer),
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}

// ==========================================
// PRODUCT CRUD OPERATIONS
// ==========================================

/**
 * Fetch all products from Supabase
 */
export async function fetchProductsFromSupabase(): Promise<SupabaseOpResult<Product[]>> {
  const client = getSupabaseClient();
  try {
    const { data, error } = await client
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      const isRls = error.code === '42501' || error.message.toLowerCase().includes('row-level security');
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        isRlsError: isRls,
      };
    }

    const products = (data || []).map(supabaseRowToProduct);
    return { success: true, data: products };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * Add a new product to Supabase
 */
export async function createProductInSupabase(product: Product): Promise<SupabaseOpResult<Product>> {
  const client = getSupabaseClient();
  try {
    const row = productToSupabaseRow(product);
    const { data, error } = await client
      .from('products')
      .insert([row])
      .select()
      .single();

    if (error) {
      const isRls = error.code === '42501' || error.message.toLowerCase().includes('row-level security');
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        isRlsError: isRls,
      };
    }

    const saved = supabaseRowToProduct(data || row);
    return { success: true, data: saved };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * Update a product name in Supabase
 */
export async function updateProductInSupabase(
  id: string,
  name: string
): Promise<SupabaseOpResult<Product>> {
  const client = getSupabaseClient();
  try {
    const { data, error } = await client
      .from('products')
      .update({
        name: name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const isRls = error.code === '42501' || error.message.toLowerCase().includes('row-level security');
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        isRlsError: isRls,
      };
    }

    const saved = supabaseRowToProduct(data);
    return { success: true, data: saved };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * Activate or Deactivate a product in Supabase
 */
export async function toggleProductActiveInSupabase(
  id: string,
  isActive: boolean
): Promise<SupabaseOpResult<Product>> {
  const client = getSupabaseClient();
  try {
    const { data, error } = await client
      .from('products')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const isRls = error.code === '42501' || error.message.toLowerCase().includes('row-level security');
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        isRlsError: isRls,
      };
    }

    const saved = supabaseRowToProduct(data);
    return { success: true, data: saved };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * Delete a product from Supabase
 */
export async function deleteProductFromSupabase(id: string): Promise<SupabaseOpResult<boolean>> {
  const client = getSupabaseClient();
  try {
    const { error } = await client
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      const isRls = error.code === '42501' || error.message.toLowerCase().includes('row-level security');
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        isRlsError: isRls,
      };
    }

    return { success: true, data: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}

// ==========================================
// MIGRATION PREVIEW & EXECUTION
// ==========================================

export interface CustomerMigrationItem {
  id: string;
  name: string;
  mobile: string;
  businessName?: string;
  status: 'Ready to Import' | 'Already in Supabase (Match)' | 'Conflict';
  reason?: string;
}

export interface ProductMigrationItem {
  id: string;
  name: string;
  isActive: boolean;
  status: 'Ready to Import' | 'Already in Supabase (Match)' | 'Conflict';
  reason?: string;
}

export interface MigrationPreviewReport {
  localCustomersCount: number;
  localProductsCount: number;
  supabaseCustomersCount: number;
  supabaseProductsCount: number;
  customersToImport: CustomerMigrationItem[];
  productsToImport: ProductMigrationItem[];
  customersReadyCount: number;
  productsReadyCount: number;
  customersExistingCount: number;
  productsExistingCount: number;
  canExecute: boolean;
  inspectionReport: {
    customersTable: TableInspectionResult;
    productsTable: TableInspectionResult;
  };
}

/**
 * Generates a complete preview of local records vs Supabase records
 * Identifies duplicates, preserves existing IDs, and prepares preview diff.
 */
export async function generateMigrationPreview(): Promise<MigrationPreviewReport> {
  const localCustomers = getLocalCustomers();
  const localProducts = getLocalProducts();

  const [customersTable, productsTable] = await Promise.all([
    inspectSupabaseTable('customers'),
    inspectSupabaseTable('products'),
  ]);

  let sbCustomers: Customer[] = [];
  let sbProducts: Product[] = [];

  if (customersTable.exists && !customersTable.isRlsBlocked) {
    const res = await fetchCustomersFromSupabase();
    if (res.success && res.data) {
      sbCustomers = res.data;
    }
  }

  if (productsTable.exists && !productsTable.isRlsBlocked) {
    const res = await fetchProductsFromSupabase();
    if (res.success && res.data) {
      sbProducts = res.data;
    }
  }

  // Analyze Customers
  const customerItems: CustomerMigrationItem[] = localCustomers.map((lc) => {
    // Check if duplicate exists by ID or by 10-digit mobile number
    const lcDigits = (lc.mobile || '').replace(/[^0-9]/g, '').slice(-10);
    const matchById = sbCustomers.find((sc) => sc.id === lc.id);
    const matchByMobile = sbCustomers.find((sc) => {
      const scDigits = (sc.mobile || '').replace(/[^0-9]/g, '').slice(-10);
      return scDigits.length >= 10 && scDigits === lcDigits;
    });

    if (matchById) {
      return {
        id: lc.id,
        name: lc.name,
        mobile: lc.mobile,
        businessName: lc.businessName,
        status: 'Already in Supabase (Match)',
        reason: `Matched existing customer ID ${lc.id}`,
      };
    }

    if (matchByMobile) {
      return {
        id: lc.id,
        name: lc.name,
        mobile: lc.mobile,
        businessName: lc.businessName,
        status: 'Already in Supabase (Match)',
        reason: `Matched existing phone number ${lc.mobile} (${matchByMobile.name})`,
      };
    }

    return {
      id: lc.id,
      name: lc.name,
      mobile: lc.mobile,
      businessName: lc.businessName,
      status: 'Ready to Import',
      reason: 'Will be created in public.customers with preserved ID',
    };
  });

  // Analyze Products
  const productItems: ProductMigrationItem[] = localProducts.map((lp) => {
    const matchById = sbProducts.find((sp) => sp.id === lp.id);
    const matchByName = sbProducts.find((sp) => sp.name.trim().toLowerCase() === lp.name.trim().toLowerCase());

    if (matchById) {
      return {
        id: lp.id,
        name: lp.name,
        isActive: lp.isActive !== false,
        status: 'Already in Supabase (Match)',
        reason: `Matched existing product ID ${lp.id}`,
      };
    }

    if (matchByName) {
      return {
        id: lp.id,
        name: lp.name,
        isActive: lp.isActive !== false,
        status: 'Already in Supabase (Match)',
        reason: `Matched existing product name "${lp.name}"`,
      };
    }

    return {
      id: lp.id,
      name: lp.name,
      isActive: lp.isActive !== false,
      status: 'Ready to Import',
      reason: 'Will be created in public.products with preserved ID',
    };
  });

  const customersReadyCount = customerItems.filter((i) => i.status === 'Ready to Import').length;
  const productsReadyCount = productItems.filter((i) => i.status === 'Ready to Import').length;
  const customersExistingCount = customerItems.filter((i) => i.status !== 'Ready to Import').length;
  const productsExistingCount = productItems.filter((i) => i.status !== 'Ready to Import').length;

  const canExecute =
    customersTable.exists &&
    productsTable.exists &&
    !customersTable.isRlsBlocked &&
    !productsTable.isRlsBlocked;

  return {
    localCustomersCount: localCustomers.length,
    localProductsCount: localProducts.length,
    supabaseCustomersCount: sbCustomers.length,
    supabaseProductsCount: sbProducts.length,
    customersToImport: customerItems,
    productsToImport: productItems,
    customersReadyCount,
    productsReadyCount,
    customersExistingCount,
    productsExistingCount,
    canExecute,
    inspectionReport: {
      customersTable,
      productsTable,
    },
  };
}

export interface MigrationExecutionResult {
  success: boolean;
  message: string;
  importedCustomersCount: number;
  importedProductsCount: number;
  skippedCustomersCount: number;
  skippedProductsCount: number;
  verifiedCustomersInSupabase: number;
  verifiedProductsInSupabase: number;
  errors: string[];
  failedCustomers: string[];
  failedProducts: string[];
  verifiedCustomersList: Array<{ id: string; name: string; phone: string; shop_name?: string }>;
  verifiedProductsList: Array<{ id: string; name: string; active: boolean }>;
}

/**
 * Execute the explicit Import to Supabase
 * - Inserts non-duplicate records
 * - Preserves existing record IDs via established mapping
 * - Verifies by reading back from Supabase
 * - Does NOT delete or clear local data
 * - Reports every failed record explicitly
 */
export async function executeMigrationToSupabase(): Promise<MigrationExecutionResult> {
  const preview = await generateMigrationPreview();
  const client = getSupabaseClient();
  const errors: string[] = [];
  const failedCustomers: string[] = [];
  const failedProducts: string[] = [];
  let importedCustomersCount = 0;
  let importedProductsCount = 0;

  // 1. Import Products that are Ready (granular per-record for safety)
  const localProducts = getLocalProducts();
  const productsToInsert = localProducts.filter((lp) =>
    preview.productsToImport.some((item) => item.id === lp.id && item.status === 'Ready to Import')
  );

  for (const lp of productsToInsert) {
    try {
      const row = productToSupabaseRow(lp);
      const { error } = await client.from('products').upsert(row, { onConflict: 'id' });
      if (error) {
        errors.push(`Product "${lp.name}" (${lp.id}): ${error.message}`);
        failedProducts.push(lp.name);
      } else {
        importedProductsCount++;
      }
    } catch (err: any) {
      errors.push(`Product "${lp.name}" (${lp.id}): ${err?.message || String(err)}`);
      failedProducts.push(lp.name);
    }
  }

  // 2. Import Customers that are Ready (granular per-record for safety)
  const localCustomers = getLocalCustomers();
  const customersToInsert = localCustomers.filter((lc) =>
    preview.customersToImport.some((item) => item.id === lc.id && item.status === 'Ready to Import')
  );

  for (const lc of customersToInsert) {
    try {
      const row = customerToSupabaseRow(lc);
      const { error } = await client.from('customers').upsert(row, { onConflict: 'id' });
      if (error) {
        errors.push(`Customer "${lc.name}" (${lc.id}): ${error.message}`);
        failedCustomers.push(lc.name);
      } else {
        importedCustomersCount++;
      }
    } catch (err: any) {
      errors.push(`Customer "${lc.name}" (${lc.id}): ${err?.message || String(err)}`);
      failedCustomers.push(lc.name);
    }
  }

  // 3. Verification step: Read back from Supabase
  const [verifyCustRes, verifyProdRes] = await Promise.all([
    fetchCustomersFromSupabase(),
    fetchProductsFromSupabase(),
  ]);

  const verifiedCustomersList: Array<{ id: string; name: string; phone: string; shop_name?: string }> = [];
  if (verifyCustRes.success && verifyCustRes.data) {
    for (const c of verifyCustRes.data) {
      verifiedCustomersList.push({
        id: c.id,
        name: c.name,
        phone: c.mobile,
        shop_name: c.businessName,
      });
    }
  }

  const verifiedProductsList: Array<{ id: string; name: string; active: boolean }> = [];
  if (verifyProdRes.success && verifyProdRes.data) {
    for (const p of verifyProdRes.data) {
      verifiedProductsList.push({
        id: p.id,
        name: p.name,
        active: p.isActive !== false,
      });
    }
  }

  const verifiedCustomersInSupabase = verifiedCustomersList.length;
  const verifiedProductsInSupabase = verifiedProductsList.length;

  const success = errors.length === 0;
  const message = success
    ? `Migration completed successfully! Imported ${importedCustomersCount} customers and ${importedProductsCount} products. Verified ${verifiedCustomersInSupabase} total customers and ${verifiedProductsInSupabase} total products in Supabase.`
    : `Migration completed with issues: ${errors.length} error(s). Imported ${importedCustomersCount} customers, ${importedProductsCount} products. Verified ${verifiedCustomersInSupabase} customers, ${verifiedProductsInSupabase} products.`;

  return {
    success,
    message,
    importedCustomersCount,
    importedProductsCount,
    skippedCustomersCount: preview.customersExistingCount,
    skippedProductsCount: preview.productsExistingCount,
    verifiedCustomersInSupabase,
    verifiedProductsInSupabase,
    errors,
    failedCustomers,
    failedProducts,
    verifiedCustomersList,
    verifiedProductsList,
  };
}

/**
 * Setup Realtime channel subscriptions for Customers and Products
 * Creates isolated channel instances with unique IDs so that concurrent components or
 * StrictMode remounts never encounter "cannot add postgres_changes callbacks after subscribe()".
 */
export function setupSupabaseRealtime(
  onCustomerChange?: () => void,
  onProductChange?: () => void
): () => void {
  try {
    const key = getSupabasePublishableKey();
    if (!key) {
      return () => {};
    }

    const client = getSupabaseClient();
    // Unique identifier prevents channel caching collisions in Supabase client
    const uniqueId = `wb_sync_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;
    const channel = client.channel(uniqueId);

    if (onCustomerChange) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        () => {
          try {
            onCustomerChange();
          } catch (err) {
            console.warn('Realtime customer update handler error:', err);
          }
        }
      );
    }

    if (onProductChange) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          try {
            onProductChange();
          } catch (err) {
            console.warn('Realtime product update handler error:', err);
          }
        }
      );
    }

    channel.subscribe((status, err) => {
      if (err) {
        console.warn(`Supabase Realtime subscription status [${status}]:`, err);
      }
    });

    return () => {
      try {
        client.removeChannel(channel);
      } catch (removeErr) {
        console.warn('Failed to cleanly remove Supabase Realtime channel:', removeErr);
      }
    };
  } catch (err) {
    console.warn('Failed to setup Supabase Realtime channel:', err);
    return () => {};
  }
}

