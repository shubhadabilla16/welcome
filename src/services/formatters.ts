/**
 * Formatting and Date Utilities for Welcome Agarbatti
 * Timezone: Asia/Kolkata
 * Format: DD MMM YYYY, ₹ (Indian Rupee)
 */

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0.00';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyShort(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function normalizePhone(phone: string): string {
  // Remove spaces, hyphens, parentheses, plus
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned;
  }
  if (cleaned.length > 10 && cleaned.startsWith('0')) {
    return `91${cleaned.slice(1)}`;
  }
  return cleaned;
}

export function formatIndianPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    const ten = digits.slice(2);
    return `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`;
  }
  return phone;
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateWithTime(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function getTodayDateString(): string {
  // Return YYYY-MM-DD for today in Asia/Kolkata
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * Calculate next follow up date:
 * If rule is 'calendar_month': schedules for the same day next month
 * If rule is 'fixed_days': adds `days` to base date
 */
export function calculateNextFollowUp(
  baseDateStr: string,
  rule: 'fixed_days' | 'calendar_month' = 'fixed_days',
  days: number = 30
): string {
  const parts = baseDateStr.split('-');
  if (parts.length !== 3) {
    return getTodayDateString();
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-based
  const day = parseInt(parts[2], 10);

  const date = new Date(year, month, day);

  if (rule === 'calendar_month') {
    // Add 1 calendar month
    const targetMonth = month + 1;
    const nextDate = new Date(year, targetMonth, day);
    // If target month has fewer days (e.g. Jan 31 -> Feb 28), adjust to last day of next month
    if (nextDate.getMonth() !== (targetMonth % 12)) {
      // went over, set to last day of target month
      return new Date(year, targetMonth + 1, 0).toISOString().split('T')[0];
    }
    return nextDate.toISOString().split('T')[0];
  } else {
    // Fixed days
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }
}

/**
 * Determine follow-up status compared to today
 */
export function determineFollowUpStatus(
  dueDateStr: string | undefined,
  currentStatus?: string
): 'Due Today' | 'Overdue' | 'Upcoming' | 'Contacted' | 'Reordered' | 'Snoozed' {
  if (currentStatus === 'Reordered') return 'Reordered';
  if (currentStatus === 'Contacted') return 'Contacted';
  if (currentStatus === 'Snoozed') return 'Snoozed';
  if (!dueDateStr) return 'Upcoming';

  const todayStr = getTodayDateString();
  if (dueDateStr === todayStr) {
    return 'Due Today';
  } else if (dueDateStr < todayStr) {
    return 'Overdue';
  } else {
    return 'Upcoming';
  }
}

/**
 * Days difference between two YYYY-MM-DD dates
 */
export function getDaysDifference(dateAStr: string, dateBStr: string): number {
  const dateA = new Date(dateAStr);
  const dateB = new Date(dateBStr);
  const diffTime = dateA.getTime() - dateB.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}
