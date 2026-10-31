export type CustomerCategory = 'Retailer' | 'Wholesaler' | 'Distributor' | 'Other';

export type FollowUpStatus = 'Due Today' | 'Overdue' | 'Upcoming' | 'Contacted' | 'Reordered' | 'Snoozed';

export type FollowUpOutcome = 'Contacted - Interested' | 'Contacted - Need Time' | 'Reordered' | 'Not Interested' | 'Call Not Answered' | 'Snoozed' | 'Message Sent';

export type ReminderIntervalType = '7' | '15' | '30' | 'calendar_month' | 'custom' | 'manual';

export interface Customer {
  id: string; // e.g. WA-CUST-1001
  name: string;
  mobile: string; // 10 digits or normalized +91
  alternatePhone?: string;
  businessName?: string;
  address?: string;
  areaCity?: string;
  category: CustomerCategory;
  assignedStaffId: string; // 'owner' | 'father' | 'brother' | custom
  defaultReminderInterval: number; // in days (e.g. 30)
  reminderRule: 'fixed_days' | 'calendar_month';
  preferredContactMethod: 'WhatsApp' | 'Phone Call' | 'Other';
  notes?: string;
  consentGiven: boolean;
  createdAt: string; // ISO date
  updatedAt: string;
  
  // Computed / cached purchase stats
  lastPurchaseDate?: string;
  lastPurchaseAmount?: number;
  totalPurchasesCount: number;
  totalPurchasesAmount: number;
  outstandingBalance: number;
  
  // Follow-up status
  nextFollowUpDate?: string; // YYYY-MM-DD
  followUpStatus?: FollowUpStatus;
  isArchived?: boolean;
}

export type UnitType = 'packets' | 'boxes' | 'pieces' | 'kilograms' | 'dozens' | 'cartons' | 'pouch';

export interface InvoiceItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit: UnitType;
  unitPrice: number;
  discount: number; // in rupees
  lineTotal: number;
}

export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Unpaid';
export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Other';

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  customerId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  date: string; // ISO string
  notes?: string;
  recordedBy: string;
}

export interface Invoice {
  id: string; // e.g. WA-INV-2026-0001
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerBusinessName?: string;
  customerAddress?: string;
  
  items: InvoiceItem[];
  subtotal: number;
  invoiceDiscount: number;
  taxEnabled: boolean;
  taxRate: number; // percentage
  taxAmount: number;
  grandTotal: number;
  
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  amountReceived: number;
  balanceDue: number;
  paymentReference?: string;
  notes?: string;
  
  createdByStaffId: string;
  createdAt: string;
  payments: PaymentRecord[];
}

export interface FollowUpLog {
  id: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  dueDate: string;
  contactDate: string;
  staffId: string;
  staffName: string;
  outcome: FollowUpOutcome;
  notes?: string;
  nextFollowUpDate?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'Owner' | 'Staff/Family';
  relationship?: 'Owner' | 'Father' | 'Brother' | 'Employee';
  phone?: string;
  canManageSettings?: boolean;
}

export interface BusinessSettings {
  businessName: string;
  tagline: string;
  phone: string;
  alternatePhone?: string;
  address: string;
  cityPincode: string;
  gstin?: string;
  invoicePrefix: string;
  defaultReminderDays: number;
  defaultReminderRule: 'fixed_days' | 'calendar_month';
  currencySymbol: string;
  timezone: string;
  upiId?: string;
  
  // WhatsApp templates
  templates: {
    english: string;
    hindi: string;
    marathi: string;
  };
}

export interface Owner {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

