import {
  Customer,
  Invoice,
  PaymentRecord,
  FollowUpLog,
  BusinessSettings,
  StaffMember,
  Owner,
  Product,
} from '../types';
import { calculateNextFollowUp, determineFollowUpStatus, getTodayDateString } from './formatters';
import { DEFAULT_TEMPLATES } from './whatsapp';
import { localCustomerToSupabaseId } from './idMapping';

const STORAGE_KEYS = {
  CUSTOMERS: 'wa_customers_v1',
  INVOICES: 'wa_invoices_v1',
  FOLLOWUP_LOGS: 'wa_followup_logs_v1',
  SETTINGS: 'wa_settings_v1',
  STAFF: 'wa_staff_v1',
  ACTIVE_STAFF_ID: 'wa_active_staff_id_v1',
  OWNERS: 'wa_owners_v1',
  PRODUCTS: 'wa_products_v1',
};

export const INITIAL_OWNERS: Owner[] = [
  { id: 'owner-1', name: 'Hariniwas Billa' },
  { id: 'owner-2', name: 'Uma Billa' },
  { id: 'owner-3', name: 'Dhanraj Billa' },
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'prod-1', name: 'Royal Chandan Agarbatti' },
  { id: 'prod-2', name: 'Mogra Flora Agarbatti' },
  { id: 'prod-3', name: 'Kasturi Dhoop Cones' },
  { id: 'prod-4', name: 'Pure Loban Sambrani Cups' },
  { id: 'prod-5', name: 'Gulab Rose Dhoop Sticks' },
  { id: 'prod-6', name: '5-in-1 Zipper Fragrance Pouch' },
];

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'owner',
    name: 'Ramesh Patel (Owner)',
    role: 'Owner',
    relationship: 'Owner',
    phone: '9820123456',
    canManageSettings: true,
  },
  {
    id: 'father',
    name: 'Gopalji Patel (Father)',
    role: 'Staff/Family',
    relationship: 'Father',
    phone: '9820123457',
    canManageSettings: false,
  },
  {
    id: 'brother',
    name: 'Suresh Patel (Brother)',
    role: 'Staff/Family',
    relationship: 'Brother',
    phone: '9820123458',
    canManageSettings: true,
  },
];

export const INITIAL_SETTINGS: BusinessSettings = {
  businessName: 'Welcome Agarbatti',
  tagline: 'Pure & Divine Fragrances for Every Home & Temple',
  phone: '7304357225',
  alternatePhone: '9028779258',
  address: 'Plot No. 14, Industrial Estate, M.G. Road',
  cityPincode: 'Mumbai, Maharashtra - 400013',
  gstin: '27AABCP1234D1Z5',
  invoicePrefix: 'WA-INV',
  defaultReminderDays: 30,
  defaultReminderRule: 'fixed_days',
  currencySymbol: '₹',
  timezone: 'Asia/Kolkata',
  upiId: 'welcomeagarbatti@okhdfcbank',
  templates: DEFAULT_TEMPLATES,
};

// Seed realistic customers for Welcome Agarbatti
const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'WA-CUST-1001',
    name: 'Rahul Sharma',
    businessName: 'Rahul Traders & Pooja Bhandar',
    mobile: '9820111222',
    alternatePhone: '9820111223',
    address: 'Shop No. 4, Market Yard',
    areaCity: 'Dadar, Mumbai',
    category: 'Wholesaler',
    assignedStaffId: 'owner',
    defaultReminderInterval: 30,
    reminderRule: 'fixed_days',
    preferredContactMethod: 'WhatsApp',
    notes: 'Regular buyer of Chandan and Kasturi master cartons. Prefers morning delivery.',
    consentGiven: true,
    createdAt: '2026-08-15T10:00:00.000Z',
    updatedAt: '2026-10-01T11:30:00.000Z',
    lastPurchaseDate: '2026-10-01',
    lastPurchaseAmount: 18500,
    totalPurchasesCount: 4,
    totalPurchasesAmount: 64200,
    outstandingBalance: 3500,
    nextFollowUpDate: '2026-10-29', // Due Today!
    followUpStatus: 'Due Today',
  },
  {
    id: 'WA-CUST-1002',
    name: 'Pravin Bhai',
    businessName: 'Shree Ganesh General Stores',
    mobile: '9821445566',
    address: 'Near Station Road, Opposite Post Office',
    areaCity: 'Thane West',
    category: 'Retailer',
    assignedStaffId: 'father',
    defaultReminderInterval: 30,
    reminderRule: 'calendar_month',
    preferredContactMethod: 'Phone Call',
    notes: 'Pravin bhai prefers phone calls first, always asks for 5-in-1 sampler zipper pouches.',
    consentGiven: true,
    createdAt: '2026-07-20T08:30:00.000Z',
    updatedAt: '2026-09-22T14:10:00.000Z',
    lastPurchaseDate: '2026-09-22',
    lastPurchaseAmount: 6800,
    totalPurchasesCount: 3,
    totalPurchasesAmount: 19400,
    outstandingBalance: 0,
    nextFollowUpDate: '2026-10-22', // Overdue!
    followUpStatus: 'Overdue',
  },
  {
    id: 'WA-CUST-1003',
    name: 'Santosh Gupta',
    businessName: 'Maa Durga Sugandhi Corner',
    mobile: '9833557788',
    address: 'Lane 2, Main Cloth Market',
    areaCity: 'Kurla West, Mumbai',
    category: 'Retailer',
    assignedStaffId: 'brother',
    defaultReminderInterval: 15,
    reminderRule: 'fixed_days',
    preferredContactMethod: 'WhatsApp',
    notes: 'Fast turnaround on Flora Battis and Loban Dhoop cups during festive season.',
    consentGiven: true,
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-10-18T16:00:00.000Z',
    lastPurchaseDate: '2026-10-18',
    lastPurchaseAmount: 9200,
    totalPurchasesCount: 2,
    totalPurchasesAmount: 17700,
    outstandingBalance: 1200,
    nextFollowUpDate: '2026-11-02', // Upcoming
    followUpStatus: 'Upcoming',
  },
  {
    id: 'WA-CUST-1004',
    name: 'Maheshwari Ji',
    businessName: 'Laxmi Dhoop & Agarbatti Agency',
    mobile: '9819998877',
    address: 'Gala 12, APMC Market',
    areaCity: 'Vashi, Navi Mumbai',
    category: 'Distributor',
    assignedStaffId: 'owner',
    defaultReminderInterval: 30,
    reminderRule: 'fixed_days',
    preferredContactMethod: 'WhatsApp',
    notes: 'Distributes in entire Navi Mumbai belt. Takes 50+ master cartons.',
    consentGiven: true,
    createdAt: '2026-06-10T11:00:00.000Z',
    updatedAt: '2026-10-25T12:00:00.000Z',
    lastPurchaseDate: '2026-10-25',
    lastPurchaseAmount: 42500,
    totalPurchasesCount: 5,
    totalPurchasesAmount: 185000,
    outstandingBalance: 0,
    nextFollowUpDate: '2026-11-24', // Upcoming
    followUpStatus: 'Upcoming',
  },
  {
    id: 'WA-CUST-1005',
    name: 'Dinesh Kadam',
    businessName: 'Kadam Kirana Stores',
    mobile: '9867001122',
    address: 'Near Old Bus Stand',
    areaCity: 'Kalyan',
    category: 'Retailer',
    assignedStaffId: 'father',
    defaultReminderInterval: 30,
    reminderRule: 'fixed_days',
    preferredContactMethod: 'Phone Call',
    notes: 'Requested next order reminder around Diwali season.',
    consentGiven: true,
    createdAt: '2026-09-12T10:30:00.000Z',
    updatedAt: '2026-09-28T11:00:00.000Z',
    lastPurchaseDate: '2026-09-28',
    lastPurchaseAmount: 4800,
    totalPurchasesCount: 1,
    totalPurchasesAmount: 4800,
    outstandingBalance: 800,
    nextFollowUpDate: '2026-10-28', // Overdue by 1 day
    followUpStatus: 'Overdue',
  },
];

const SEED_INVOICES: Invoice[] = [
  {
    id: 'WA-INV-2026-0001',
    invoiceNumber: 'WA-INV-2026-0001',
    invoiceDate: '2026-10-01',
    customerId: 'WA-CUST-1001',
    customerName: 'Rahul Sharma',
    customerMobile: '9820111222',
    customerBusinessName: 'Rahul Traders & Pooja Bhandar',
    customerAddress: 'Shop No. 4, Market Yard, Dadar, Mumbai',
    items: [
      {
        id: 'item-1',
        name: 'Welcome Royal Chandan Agarbatti (250g Pack)',
        description: 'Premium pure sandalwood natural fragrance',
        quantity: 50,
        unit: 'packets',
        unitPrice: 180,
        discount: 500,
        lineTotal: 8500,
      },
      {
        id: 'item-2',
        name: 'Welcome Kasturi Flora Dhoop Cones',
        description: 'Long burning charcoal-free flora cones',
        quantity: 40,
        unit: 'boxes',
        unitPrice: 150,
        discount: 0,
        lineTotal: 6000,
      },
      {
        id: 'item-3',
        name: 'Welcome Pure Loban Sambrani Cups',
        description: 'Instant smoke cups with coal base (12 pcs pack)',
        quantity: 40,
        unit: 'boxes',
        unitPrice: 100,
        discount: 0,
        lineTotal: 4000,
      },
    ],
    subtotal: 18500,
    invoiceDiscount: 0,
    taxEnabled: false,
    taxRate: 0,
    taxAmount: 0,
    grandTotal: 18500,
    paymentStatus: 'Partially Paid',
    paymentMethod: 'UPI',
    amountReceived: 15000,
    balanceDue: 3500,
    paymentReference: 'UPI-REF-9920192',
    notes: 'Balance ₹3,500 promised on next stock delivery.',
    createdByStaffId: 'owner',
    createdAt: '2026-10-01T11:30:00.000Z',
    payments: [
      {
        id: 'pay-1',
        invoiceId: 'WA-INV-2026-0001',
        customerId: 'WA-CUST-1001',
        amount: 15000,
        method: 'UPI',
        reference: 'UPI-REF-9920192',
        date: '2026-10-01T11:30:00.000Z',
        recordedBy: 'Ramesh Patel (Owner)',
      },
    ],
  },
  {
    id: 'WA-INV-2026-0002',
    invoiceNumber: 'WA-INV-2026-0002',
    invoiceDate: '2026-10-18',
    customerId: 'WA-CUST-1003',
    customerName: 'Santosh Gupta',
    customerMobile: '9833557788',
    customerBusinessName: 'Maa Durga Sugandhi Corner',
    customerAddress: 'Lane 2, Main Cloth Market, Kurla West, Mumbai',
    items: [
      {
        id: 'item-4',
        name: 'Welcome Mogra 5-in-1 Zipper Pack (500g)',
        quantity: 30,
        unit: 'packets',
        unitPrice: 220,
        discount: 200,
        lineTotal: 6400,
      },
      {
        id: 'item-5',
        name: 'Welcome Gulab (Rose) Dhoop Sticks',
        quantity: 20,
        unit: 'boxes',
        unitPrice: 140,
        discount: 0,
        lineTotal: 2800,
      },
    ],
    subtotal: 9200,
    invoiceDiscount: 0,
    taxEnabled: false,
    taxRate: 0,
    taxAmount: 0,
    grandTotal: 9200,
    paymentStatus: 'Partially Paid',
    paymentMethod: 'Cash',
    amountReceived: 8000,
    balanceDue: 1200,
    notes: '₹1,200 remaining balance to be cleared in 2 weeks.',
    createdByStaffId: 'brother',
    createdAt: '2026-10-18T16:00:00.000Z',
    payments: [
      {
        id: 'pay-2',
        invoiceId: 'WA-INV-2026-0002',
        customerId: 'WA-CUST-1003',
        amount: 8000,
        method: 'Cash',
        date: '2026-10-18T16:00:00.000Z',
        recordedBy: 'Suresh Patel (Brother)',
      },
    ],
  },
  {
    id: 'WA-INV-2026-0003',
    invoiceNumber: 'WA-INV-2026-0003',
    invoiceDate: '2026-10-25',
    customerId: 'WA-CUST-1004',
    customerName: 'Maheshwari Ji',
    customerMobile: '9819998877',
    customerBusinessName: 'Laxmi Dhoop & Agarbatti Agency',
    customerAddress: 'Gala 12, APMC Market, Vashi, Navi Mumbai',
    items: [
      {
        id: 'item-6',
        name: 'Welcome Master Carton (Mix 100 Fragrance Boxes)',
        quantity: 5,
        unit: 'cartons',
        unitPrice: 8500,
        discount: 0,
        lineTotal: 42500,
      },
    ],
    subtotal: 42500,
    invoiceDiscount: 0,
    taxEnabled: false,
    taxRate: 0,
    taxAmount: 0,
    grandTotal: 42500,
    paymentStatus: 'Paid',
    paymentMethod: 'Bank Transfer',
    amountReceived: 42500,
    balanceDue: 0,
    paymentReference: 'NEFT-HDFC-881920',
    notes: 'Full payment received via bank transfer.',
    createdByStaffId: 'owner',
    createdAt: '2026-10-25T12:00:00.000Z',
    payments: [
      {
        id: 'pay-3',
        invoiceId: 'WA-INV-2026-0003',
        customerId: 'WA-CUST-1004',
        amount: 42500,
        method: 'Bank Transfer',
        reference: 'NEFT-HDFC-881920',
        date: '2026-10-25T12:00:00.000Z',
        recordedBy: 'Ramesh Patel (Owner)',
      },
    ],
  },
];

// Helper to broadcast changes to listening components
type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function subscribeToStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ---------------- Storage API ----------------

export function getSettings(): BusinessSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
      return INITIAL_SETTINGS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SETTINGS;
  }
}

export function saveSettings(settings: BusinessSettings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  notifyListeners();
}

// ---------------- Owner Management ----------------

export function getOwners(): Owner[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OWNERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.OWNERS, JSON.stringify(INITIAL_OWNERS));
      return INITIAL_OWNERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_OWNERS;
  } catch {
    return INITIAL_OWNERS;
  }
}

export function saveOwners(owners: Owner[]): void {
  localStorage.setItem(STORAGE_KEYS.OWNERS, JSON.stringify(owners));
  notifyListeners();
}

export function addOwner(name: string): Owner {
  const owners = getOwners();
  const newOwner: Owner = {
    id: `owner-${Date.now()}`,
    name: name.trim(),
  };
  owners.push(newOwner);
  saveOwners(owners);
  return newOwner;
}

export function updateOwner(id: string, name: string): Owner {
  const owners = getOwners();
  const index = owners.findIndex((o) => o.id === id);
  if (index === -1) throw new Error('Owner not found');
  owners[index] = { ...owners[index], name: name.trim() };
  saveOwners(owners);
  return owners[index];
}

export function deleteOwner(id: string): void {
  const owners = getOwners();
  if (owners.length <= 1) {
    throw new Error('At least one owner must be maintained.');
  }
  const filtered = owners.filter((o) => o.id !== id);
  saveOwners(filtered);
}

// ---------------- Product Management ----------------

export function getProducts(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PRODUCTS;
  } catch {
    return INITIAL_PRODUCTS;
  }
}

export function saveProducts(products: Product[]): void {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  notifyListeners();
}

export function addProduct(name: string, id?: string): Product {
  const products = getProducts();
  const newProduct: Product = {
    id: id || `prod-${Date.now()}`,
    name: name.trim(),
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  products.push(newProduct);
  saveProducts(products);
  return newProduct;
}

export function updateProduct(id: string, name: string): Product {
  const products = getProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) throw new Error('Product not found');
  products[index] = { ...products[index], name: name.trim(), updatedAt: new Date().toISOString() };
  saveProducts(products);
  return products[index];
}

export function toggleProductActive(id: string, isActive: boolean): Product {
  const products = getProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) throw new Error('Product not found');
  products[index] = { ...products[index], isActive, updatedAt: new Date().toISOString() };
  saveProducts(products);
  return products[index];
}

export function deleteProduct(id: string): void {
  const products = getProducts();
  const filtered = products.filter((p) => p.id !== id);
  saveProducts(filtered);
}

// ---------------- Staff List (Mapped to Owners) ----------------

export function getStaffList(): StaffMember[] {
  const owners = getOwners();
  if (owners && owners.length > 0) {
    return owners.map((o) => ({
      id: o.id,
      name: o.name,
      role: 'Owner' as const,
      relationship: 'Owner' as const,
      canManageSettings: true,
    }));
  }
  return INITIAL_STAFF;
}

export function saveStaffList(staff: StaffMember[]): void {
  const owners: Owner[] = staff.map((s) => ({ id: s.id, name: s.name }));
  saveOwners(owners);
}

export function getActiveStaff(): StaffMember {
  const staff = getStaffList();
  const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_STAFF_ID);
  const found = staff.find((s) => s.id === activeId);
  return found || staff[0];
}

export function setActiveStaffId(id: string): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_STAFF_ID, id);
  notifyListeners();
}

export function getCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(SEED_CUSTOMERS));
      return SEED_CUSTOMERS;
    }
    const list: Customer[] = JSON.parse(raw);
    // dynamically refresh followUpStatus based on today's date
    return list.map((c) => ({
      ...c,
      followUpStatus: determineFollowUpStatus(c.nextFollowUpDate, c.followUpStatus),
    }));
  } catch {
    return SEED_CUSTOMERS;
  }
}

export function deduplicateCustomerList(customers: Customer[]): Customer[] {
  const seenIds = new Set<string>();
  const seenSbIds = new Set<string>();
  const result: Customer[] = [];

  for (const c of customers) {
    if (!c || !c.id) continue;
    const normId = c.id.trim();
    if (seenIds.has(normId)) continue;

    // Avoid duplicate representations of the exact same customer under both local ID and UUID
    const sbId = localCustomerToSupabaseId(normId);
    if (seenSbIds.has(sbId)) continue;

    seenIds.add(normId);
    seenSbIds.add(sbId);
    result.push(c);
  }

  return result;
}

export function saveCustomers(customers: Customer[]): void {
  const deduplicated = deduplicateCustomerList(customers);
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(deduplicated));
  notifyListeners();
}

export function checkDuplicatePhone(phone: string, excludeCustomerId?: string): Customer | null {
  const customers = getCustomers();
  const digits = phone.replace(/[^0-9]/g, '').slice(-10); // match last 10 digits
  if (digits.length < 10) return null;

  return (
    customers.find((c) => {
      if (c.isArchived) return false;
      if (excludeCustomerId && c.id === excludeCustomerId) return false;
      const cDigits = (c.mobile || '').replace(/[^0-9]/g, '').slice(-10);
      const cAltDigits = (c.alternatePhone || '').replace(/[^0-9]/g, '').slice(-10);
      return cDigits === digits || (cAltDigits.length >= 10 && cAltDigits === digits);
    }) || null
  );
}

export function generateCustomerId(): string {
  const customers = getCustomers();
  let maxNum = 1000;
  for (const c of customers) {
    const match = c.id.match(/WA-CUST-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `WA-CUST-${maxNum + 1}`;
}

export function addCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalPurchasesCount' | 'totalPurchasesAmount' | 'outstandingBalance'>): Customer {
  const customers = getCustomers();
  const newCust: Customer = {
    ...customerData,
    id: generateCustomerId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalPurchasesCount: 0,
    totalPurchasesAmount: 0,
    outstandingBalance: 0,
    followUpStatus: customerData.nextFollowUpDate
      ? determineFollowUpStatus(customerData.nextFollowUpDate)
      : undefined,
  };
  customers.unshift(newCust);
  saveCustomers(customers);
  return newCust;
}

export function updateCustomer(id: string, updates: Partial<Customer>): Customer {
  const customers = getCustomers();
  const index = customers.findIndex((c) => c.id === id);
  if (index === -1) throw new Error('Customer not found');

  const updated: Customer = {
    ...customers[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (updates.nextFollowUpDate || updates.followUpStatus) {
    updated.followUpStatus = determineFollowUpStatus(
      updated.nextFollowUpDate,
      updates.followUpStatus || updated.followUpStatus
    );
  }

  customers[index] = updated;
  saveCustomers(customers);
  return updated;
}

export function archiveCustomer(id: string): void {
  updateCustomer(id, { isArchived: true });
}

export function unarchiveCustomer(id: string): void {
  updateCustomer(id, { isArchived: false });
}

export function getInvoices(): Invoice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(SEED_INVOICES));
      return SEED_INVOICES;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_INVOICES;
  }
}

export function saveInvoices(invoices: Invoice[]): void {
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  notifyListeners();
}

export function generateInvoiceNumber(): string {
  const settings = getSettings();
  const invoices = getInvoices();
  const currentYear = new Date().getFullYear();
  const prefix = settings.invoicePrefix || 'WA-INV';
  const sequence = String(invoices.length + 1).padStart(4, '0');
  return `${prefix}-${currentYear}-${sequence}`;
}

export function createInvoice(invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'payments'>, initialPayment?: { amount: number; method: PaymentRecord['method']; reference?: string; notes?: string }): Invoice {
  const invoices = getInvoices();
  const settings = getSettings();
  const activeStaff = getActiveStaff();
  const id = invoiceData.invoiceNumber || generateInvoiceNumber();

  const payments: PaymentRecord[] = [];
  if (invoiceData.amountReceived > 0) {
    payments.push({
      id: `PAY-${Date.now()}`,
      invoiceId: id,
      customerId: invoiceData.customerId,
      amount: invoiceData.amountReceived,
      method: initialPayment?.method || invoiceData.paymentMethod,
      reference: initialPayment?.reference || invoiceData.paymentReference,
      date: new Date().toISOString(),
      notes: initialPayment?.notes || 'Initial payment on bill creation',
      recordedBy: activeStaff.name,
    });
  }

  const newInvoice: Invoice = {
    ...invoiceData,
    id,
    createdAt: new Date().toISOString(),
    payments,
  };

  invoices.unshift(newInvoice);
  saveInvoices(invoices);

  // Update customer purchase stats & schedule repeat order reminder!
  const customers = getCustomers();
  const customer = customers.find((c) => c.id === invoiceData.customerId);
  if (customer) {
    const reminderDays = customer.defaultReminderInterval || settings.defaultReminderDays || 30;
    const reminderRule = customer.reminderRule || settings.defaultReminderRule || 'fixed_days';
    const nextDate = calculateNextFollowUp(invoiceData.invoiceDate, reminderRule, reminderDays);

    const updatedCustomer: Partial<Customer> = {
      lastPurchaseDate: invoiceData.invoiceDate,
      lastPurchaseAmount: invoiceData.grandTotal,
      totalPurchasesCount: (customer.totalPurchasesCount || 0) + 1,
      totalPurchasesAmount: (customer.totalPurchasesAmount || 0) + invoiceData.grandTotal,
      outstandingBalance: (customer.outstandingBalance || 0) + invoiceData.balanceDue,
      nextFollowUpDate: nextDate,
      followUpStatus: determineFollowUpStatus(nextDate),
    };

    updateCustomer(customer.id, updatedCustomer);
  }

  return newInvoice;
}

export function recordAdditionalPayment(
  invoiceId: string,
  amount: number,
  method: PaymentRecord['method'],
  reference?: string,
  notes?: string
): Invoice {
  const invoices = getInvoices();
  const index = invoices.findIndex((inv) => inv.id === invoiceId);
  if (index === -1) throw new Error('Invoice not found');

  const invoice = invoices[index];
  const activeStaff = getActiveStaff();

  if (amount <= 0) throw new Error('Payment amount must be greater than zero');
  if (amount > invoice.balanceDue) {
    throw new Error(`Payment cannot exceed outstanding balance of ₹${invoice.balanceDue.toFixed(2)}`);
  }

  const newPayment: PaymentRecord = {
    id: `PAY-${Date.now()}`,
    invoiceId,
    customerId: invoice.customerId,
    amount,
    method,
    reference,
    notes,
    date: new Date().toISOString(),
    recordedBy: activeStaff.name,
  };

  const newAmountReceived = invoice.amountReceived + amount;
  const newBalanceDue = invoice.grandTotal - newAmountReceived;
  const newStatus = newBalanceDue <= 0.01 ? 'Paid' : 'Partially Paid';

  const updatedInvoice: Invoice = {
    ...invoice,
    amountReceived: newAmountReceived,
    balanceDue: Math.max(0, newBalanceDue),
    paymentStatus: newStatus,
    payments: [...invoice.payments, newPayment],
  };

  invoices[index] = updatedInvoice;
  saveInvoices(invoices);

  // Update customer's outstanding balance
  const customers = getCustomers();
  const customer = customers.find((c) => c.id === invoice.customerId);
  if (customer) {
    const updatedBalance = Math.max(0, (customer.outstandingBalance || 0) - amount);
    updateCustomer(customer.id, { outstandingBalance: updatedBalance });
  }

  return updatedInvoice;
}

// ---------------- Follow-up Logs ----------------

export function getFollowUpLogs(): FollowUpLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FOLLOWUP_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordFollowUpAction(
  customerId: string,
  outcome: FollowUpLog['outcome'],
  notes?: string,
  newNextFollowUpDate?: string
): void {
  const logs = getFollowUpLogs();
  const customers = getCustomers();
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) return;

  const activeStaff = getActiveStaff();

  const newLog: FollowUpLog = {
    id: `LOG-${Date.now()}`,
    customerId: customer.id,
    customerName: customer.name,
    customerMobile: customer.mobile,
    dueDate: customer.nextFollowUpDate || getTodayDateString(),
    contactDate: new Date().toISOString(),
    staffId: activeStaff.id,
    staffName: activeStaff.name,
    outcome,
    notes,
    nextFollowUpDate: newNextFollowUpDate,
  };

  logs.unshift(newLog);
  localStorage.setItem(STORAGE_KEYS.FOLLOWUP_LOGS, JSON.stringify(logs));

  // Determine updated status
  let nextStatus: Customer['followUpStatus'] = 'Contacted';
  if (outcome === 'Reordered') {
    nextStatus = 'Reordered';
  } else if (outcome === 'Snoozed') {
    nextStatus = 'Snoozed';
  }

  updateCustomer(customer.id, {
    nextFollowUpDate: newNextFollowUpDate || customer.nextFollowUpDate,
    followUpStatus: newNextFollowUpDate
      ? determineFollowUpStatus(newNextFollowUpDate, nextStatus)
      : nextStatus,
  });

  notifyListeners();
}

// ---------------- Export & Import ----------------

export function exportAllDataJSON(): string {
  const data = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    businessName: getSettings().businessName,
    customers: getCustomers(),
    invoices: getInvoices(),
    followUpLogs: getFollowUpLogs(),
    settings: getSettings(),
    staff: getStaffList(),
    owners: getOwners(),
    products: getProducts(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllDataJSON(jsonStr: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(jsonStr);
    if (!data.customers || !Array.isArray(data.customers)) {
      return { success: false, message: 'Invalid backup file format: missing customers' };
    }

    if (data.customers) saveCustomers(data.customers);
    if (data.invoices) saveInvoices(data.invoices);
    if (data.followUpLogs) {
      localStorage.setItem(STORAGE_KEYS.FOLLOWUP_LOGS, JSON.stringify(data.followUpLogs));
    }
    if (data.settings) saveSettings(data.settings);
    if (data.staff) saveStaffList(data.staff);
    if (data.owners && Array.isArray(data.owners)) saveOwners(data.owners);
    if (data.products && Array.isArray(data.products)) saveProducts(data.products);

    notifyListeners();
    return { success: true, message: 'Data imported and restored successfully!' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Failed to import: ${errorMsg}` };
  }
}

// ---------------- Computed Dashboard Metrics ----------------

export interface DashboardMetrics {
  totalCustomers: number;
  newCustomersThisMonth: number;
  todaySales: number;
  thisMonthSales: number;
  totalInvoicesCount: number;
  dueTodayCount: number;
  overdueCount: number;
  completedTodayCount: number;
  totalOutstandingBalance: number;
  totalCollectedCashUPI: number;
}

export function getDashboardMetrics(): DashboardMetrics {
  const customers = getCustomers().filter((c) => !c.isArchived);
  const invoices = getInvoices();
  const followUpLogs = getFollowUpLogs();
  const todayStr = getTodayDateString();
  const currentMonthPrefix = todayStr.slice(0, 7); // YYYY-MM

  // Total customers
  const totalCustomers = customers.length;

  // Added this month
  const newCustomersThisMonth = customers.filter(
    (c) => c.createdAt && c.createdAt.startsWith(currentMonthPrefix)
  ).length;

  // Sales calculations
  let todaySales = 0;
  let thisMonthSales = 0;
  let totalOutstandingBalance = 0;
  let totalCollectedCashUPI = 0;

  invoices.forEach((inv) => {
    if (inv.invoiceDate === todayStr) {
      todaySales += inv.grandTotal;
    }
    if (inv.invoiceDate && inv.invoiceDate.startsWith(currentMonthPrefix)) {
      thisMonthSales += inv.grandTotal;
    }
    totalCollectedCashUPI += inv.amountReceived || 0;
  });

  // Calculate total outstanding balance from customers
  customers.forEach((c) => {
    totalOutstandingBalance += c.outstandingBalance || 0;
  });

  // Follow-up counts
  let dueTodayCount = 0;
  let overdueCount = 0;

  customers.forEach((c) => {
    const status = determineFollowUpStatus(c.nextFollowUpDate, c.followUpStatus);
    if (status === 'Due Today') {
      dueTodayCount++;
    } else if (status === 'Overdue') {
      overdueCount++;
    }
  });

  // Completed today from followUpLogs
  const completedTodayCount = followUpLogs.filter(
    (log) => log.contactDate && log.contactDate.startsWith(todayStr)
  ).length;

  return {
    totalCustomers,
    newCustomersThisMonth,
    todaySales,
    thisMonthSales,
    totalInvoicesCount: invoices.length,
    dueTodayCount,
    overdueCount,
    completedTodayCount,
    totalOutstandingBalance,
    totalCollectedCashUPI,
  };
}
