/**
 * Established ID Mapping for Welcome Agarbatti Phase 1 Cloud Integration
 * Preserves local legacy IDs (e.g., WA-CUST-1001, prod-1) while supplying
 * valid, deterministic UUIDs for Supabase PostgreSQL tables.
 */

export const isUuid = (str?: string): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

// Fixed deterministic UUID mappings for the 5 existing local customers
export const ESTABLISHED_CUSTOMER_ID_MAP: Record<string, string> = {
  'WA-CUST-1001': '00000000-0000-4000-8000-000000001001',
  'WA-CUST-1002': '00000000-0000-4000-8000-000000001002',
  'WA-CUST-1003': '00000000-0000-4000-8000-000000001003',
  'WA-CUST-1004': '00000000-0000-4000-8000-000000001004',
  'WA-CUST-1005': '00000000-0000-4000-8000-000000001005',
};

// Fixed deterministic UUID mappings for the 6 existing local products
export const ESTABLISHED_PRODUCT_ID_MAP: Record<string, string> = {
  'prod-1': '00000000-0000-4000-8000-000000000001',
  'prod-2': '00000000-0000-4000-8000-000000000002',
  'prod-3': '00000000-0000-4000-8000-000000000003',
  'prod-4': '00000000-0000-4000-8000-000000000004',
  'prod-5': '00000000-0000-4000-8000-000000000005',
  'prod-6': '00000000-0000-4000-8000-000000000006',
};

const DYNAMIC_ID_MAP_KEY = 'wa_supabase_dynamic_id_map_v1';

function getDynamicMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DYNAMIC_ID_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveDynamicMap(map: Record<string, string>): void {
  try {
    localStorage.setItem(DYNAMIC_ID_MAP_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/**
 * Maps a local customer ID to a valid Supabase UUID
 */
export function localCustomerToSupabaseId(localId: string): string {
  if (isUuid(localId)) return localId;
  if (ESTABLISHED_CUSTOMER_ID_MAP[localId]) {
    return ESTABLISHED_CUSTOMER_ID_MAP[localId];
  }
  const dynamic = getDynamicMap();
  if (dynamic[localId]) {
    return dynamic[localId];
  }
  // Generate a valid deterministic UUID based on numeric suffix if present
  const match = localId.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    const hex = num.toString(16).padStart(12, '0');
    const newUuid = `00000000-0000-4000-8000-${hex}`;
    dynamic[localId] = newUuid;
    saveDynamicMap(dynamic);
    return newUuid;
  }
  return localId;
}

/**
 * Maps a Supabase UUID back to the preserved local customer ID
 */
export function supabaseToLocalCustomerId(sbId: string): string {
  for (const [locId, uuid] of Object.entries(ESTABLISHED_CUSTOMER_ID_MAP)) {
    if (uuid === sbId || locId === sbId) return locId;
  }
  const dynamic = getDynamicMap();
  for (const [locId, uuid] of Object.entries(dynamic)) {
    if (uuid === sbId || locId === sbId) return locId;
  }
  // Deterministic reverse mapping for generated UUIDs: 00000000-0000-4000-8000-${hex}
  const match = sbId.match(/^00000000-0000-4000-8000-([0-9a-f]{12})$/i);
  if (match) {
    const num = parseInt(match[1], 16);
    if (!isNaN(num) && num > 0) {
      return `WA-CUST-${num}`;
    }
  }
  return sbId;
}

/**
 * Maps a local product ID to a valid Supabase UUID
 */
export function localProductToSupabaseId(localId: string): string {
  if (isUuid(localId)) return localId;
  if (ESTABLISHED_PRODUCT_ID_MAP[localId]) {
    return ESTABLISHED_PRODUCT_ID_MAP[localId];
  }
  const dynamic = getDynamicMap();
  if (dynamic[localId]) {
    return dynamic[localId];
  }
  const match = localId.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    const hex = num.toString(16).padStart(12, '0');
    const newUuid = `00000000-0000-4000-8000-${hex}`;
    dynamic[localId] = newUuid;
    saveDynamicMap(dynamic);
    return newUuid;
  }
  return localId;
}

/**
 * Maps a Supabase UUID back to the preserved local product ID
 */
export function supabaseToLocalProductId(sbId: string): string {
  for (const [locId, uuid] of Object.entries(ESTABLISHED_PRODUCT_ID_MAP)) {
    if (uuid === sbId || locId === sbId) return locId;
  }
  const dynamic = getDynamicMap();
  for (const [locId, uuid] of Object.entries(dynamic)) {
    if (uuid === sbId || locId === sbId) return locId;
  }
  // Deterministic reverse mapping for generated UUIDs: 00000000-0000-4000-8000-${hex}
  const match = sbId.match(/^00000000-0000-4000-8000-([0-9a-f]{12})$/i);
  if (match) {
    const num = parseInt(match[1], 16);
    if (!isNaN(num) && num > 0) {
      return `prod-${num}`;
    }
  }
  return sbId;
}
