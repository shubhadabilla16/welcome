import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

// Local storage keys for runtime configuration overrides
const STORAGE_KEY_URL = 'welcome_agarbatti_supabase_url';
const STORAGE_KEY_ANON = 'welcome_agarbatti_supabase_anon_key';

// Default project URL provided by the user
export const DEFAULT_SUPABASE_URL = 'https://xfydawnpxhmdwhztwlmi.supabase.co';

/**
 * Normalizes Supabase Project URL.
 * Automatically strips trailing slashes and any /rest/v1 paths if entered by the user.
 */
export function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return DEFAULT_SUPABASE_URL;
  let clean = rawUrl.trim();
  // Strip /rest/v1 or /rest/v1/ suffix
  clean = clean.replace(/\/rest\/v1\/?$/i, '');
  // Strip trailing slashes
  clean = clean.replace(/\/+$/, '');
  return clean;
}

/**
 * Get current configured Supabase URL
 */
export function getSupabaseUrl(): string {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  if (envUrl && envUrl.trim() !== '') {
    return normalizeSupabaseUrl(envUrl);
  }
  const storedUrl = localStorage.getItem(STORAGE_KEY_URL);
  if (storedUrl && storedUrl.trim() !== '') {
    return normalizeSupabaseUrl(storedUrl);
  }
  return DEFAULT_SUPABASE_URL;
}

/**
 * Get current configured Supabase Publishable Key.
 * Supports modern 'sb_publishable_...' keys as well as legacy 'eyJ...' keys.
 * Never requires or accepts a service_role secret.
 */
export function getSupabasePublishableKey(): string {
  const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (
    envKey &&
    envKey.trim() !== '' &&
    envKey !== 'YOUR_SUPABASE_ANON_KEY' &&
    !envKey.includes('placeholder')
  ) {
    return envKey.trim();
  }
  const storedKey = localStorage.getItem(STORAGE_KEY_ANON);
  if (storedKey && storedKey.trim() !== '') {
    return storedKey.trim();
  }
  return '';
}

/**
 * Save custom Supabase credentials in browser storage
 */
export function saveCustomSupabaseConfig(url?: string, key?: string): void {
  if (url !== undefined) {
    const cleanUrl = normalizeSupabaseUrl(url);
    if (cleanUrl) {
      localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
    } else {
      localStorage.removeItem(STORAGE_KEY_URL);
    }
  }
  if (key !== undefined) {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY_ANON, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_ANON);
    }
  }
  // Reset cached client on config change
  resetCachedClient();
}

/**
 * Clear custom Supabase credentials from browser storage
 */
export function clearCustomSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_ANON);
  resetCachedClient();
}

/**
 * Client cache singleton
 */
let cachedClient: SupabaseClient | null = null;
let cachedKey: string = '';
let cachedUrl: string = '';

export function resetCachedClient(): void {
  cachedClient = null;
  cachedKey = '';
  cachedUrl = '';
}

/**
 * Get or initialize the configured Supabase client.
 * Uses modern @supabase/supabase-js v2 client which natively accepts
 * sb_publishable_... keys and legacy JWT keys without expecting a secret.
 */
export function getSupabaseClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  const effectiveKey = key || 'sb_publishable_placeholder_unconfigured';

  if (cachedClient && cachedUrl === url && cachedKey === effectiveKey) {
    return cachedClient;
  }

  cachedClient = createClient(url, effectiveKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  cachedUrl = url;
  cachedKey = effectiveKey;
  return cachedClient;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  statusCode?: number;
  latencyMs?: number;
  isRlsProtected?: boolean;
  isApiKeyError?: boolean;
  userEmail?: string | null;
  details?: string;
}

/**
 * Tests connection using the same configured Supabase client.
 * Does NOT perform raw fetch with "Bearer <publishable_key>" (which caused invalid JWT errors with sb_publishable_ keys).
 * Accurately distinguishes API key errors from RLS security protection.
 */
export async function testSupabaseConnection(): Promise<ConnectionTestResult> {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();

  if (!url) {
    return {
      success: false,
      message: 'Supabase Project URL is missing.',
    };
  }

  if (!key || key.trim() === '') {
    return {
      success: false,
      isApiKeyError: true,
      message: 'Supabase Publishable Key is not configured. Please provide your sb_publishable_ key.',
    };
  }

  const client = getSupabaseClient();
  const startTime = performance.now();

  try {
    // 1. Check existing auth session state
    const { data: sessionData } = await client.auth.getSession();
    const activeUser = sessionData.session?.user?.email || null;

    // 2. Perform a probe query on public.owners using the Supabase client
    // This allows Supabase to validate the publishable key through its native auth/postgrest pipeline
    const { data, error, status } = await client
      .from('owners')
      .select('count', { count: 'exact', head: true });

    const latencyMs = Math.round(performance.now() - startTime);

    if (error) {
      const msg = error.message?.toLowerCase() || '';

      // Check if the API key itself was rejected by Supabase
      if (
        status === 401 &&
        (msg.includes('invalid api key') ||
          msg.includes('api key not found') ||
          msg.includes('apikey is invalid') ||
          msg.includes('secret api key required'))
      ) {
        return {
          success: false,
          isApiKeyError: true,
          statusCode: status,
          latencyMs,
          message: 'API Key Validation Error: Supabase rejected the publishable key. Please verify your sb_publishable_ key in the Supabase Dashboard.',
          details: error.message,
        };
      }

      // Check if Row Level Security (RLS) blocked the query (code 42501 or permission denied)
      if (
        error.code === '42501' ||
        msg.includes('row-level security') ||
        msg.includes('permission denied')
      ) {
        return {
          success: true,
          isRlsProtected: true,
          statusCode: status || 403,
          latencyMs,
          userEmail: activeUser,
          message: `Connected to Supabase (${latencyMs}ms)! Row Level Security (RLS) is active and securely protecting business data from anonymous access.`,
          details: error.message,
        };
      }

      // If table doesn't exist yet (code 42P01), connection still succeeded!
      if (error.code === '42P01' || msg.includes('does not exist')) {
        return {
          success: true,
          statusCode: status,
          latencyMs,
          userEmail: activeUser,
          message: `Connected to Supabase project (${latencyMs}ms)! (Table public.owners has not been created yet).`,
        };
      }

      return {
        success: false,
        statusCode: status,
        latencyMs,
        message: `Supabase query returned status ${status}: ${error.message}`,
        details: error.message,
      };
    }

    return {
      success: true,
      statusCode: status || 200,
      latencyMs,
      userEmail: activeUser,
      message: `Successfully connected to Supabase project! (Response time: ${latencyMs}ms)`,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      latencyMs,
      message: 'Failed to reach Supabase: ' + (err?.message || String(err)),
      details: err?.stack || String(err),
    };
  }
}

export interface QueryOwnersResult {
  success: boolean;
  message: string;
  data?: any[];
  rowCount?: number;
  expectedOwnersFound?: string[];
  missingExpectedOwners?: string[];
  latencyMs?: number;
  errorCode?: string;
  isRlsError?: boolean;
  isApiKeyError?: boolean;
  secureRlsSql?: string;
  tableMissing?: boolean;
  createTableSql?: string;
  userEmail?: string | null;
  details?: string;
}

/**
 * Executes a SELECT query on the public.owners table using the SAME configured Supabase client.
 * Properly distinguishes API key validation failures from RLS permissions.
 * Encourages authenticated access rather than opening business data to anonymous public users.
 */
export async function queryOwnersTable(): Promise<QueryOwnersResult> {
  const key = getSupabasePublishableKey();
  if (!key) {
    return {
      success: false,
      isApiKeyError: true,
      message: 'Supabase Publishable Key is missing. Please enter your sb_publishable_ key.',
    };
  }

  const client = getSupabaseClient();
  const startTime = performance.now();
  const EXPECTED_OWNERS = ['Hariniwas Billa', 'Uma Billa', 'Dhanraj Billa'];

  // Check active user
  const { data: sessionData } = await client.auth.getSession();
  const activeUser = sessionData.session?.user?.email || null;

  try {
    const { data, error, status } = await client.from('owners').select('*');
    const latencyMs = Math.round(performance.now() - startTime);

    if (error) {
      const msg = error.message?.toLowerCase() || '';

      // API key failure
      if (
        status === 401 &&
        (msg.includes('invalid api key') ||
          msg.includes('api key not found') ||
          msg.includes('secret api key required'))
      ) {
        return {
          success: false,
          isApiKeyError: true,
          errorCode: error.code,
          latencyMs,
          message: 'API Key Validation Error: Supabase rejected the publishable key.',
          details: error.message,
        };
      }

      // Row Level Security (RLS) protection
      const isRls =
        error.code === '42501' ||
        msg.includes('row-level security') ||
        msg.includes('permission denied');

      // Table does not exist
      const isTableMissing =
        error.code === '42P01' ||
        msg.includes('relation "public.owners" does not exist') ||
        msg.includes('does not exist');

      // Recommended SECURE policy: restricted to authenticated family/staff users only (never public anon)
      const secureRlsSql = `-- 1. Ensure RLS is active on public.owners:
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;

-- 2. Allow authenticated users (logged in with Supabase account) to read owners:
CREATE POLICY "Allow authenticated users to read owners"
ON public.owners
FOR SELECT
TO authenticated
USING (true);`;

      const createTableSql = `-- Create owners table in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.owners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for data protection:
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;

-- Securely permit authenticated family members to view owners:
CREATE POLICY "Allow authenticated users to read owners"
ON public.owners
FOR SELECT
TO authenticated
USING (true);

-- Insert initial owners:
INSERT INTO public.owners (name) VALUES
  ('Hariniwas Billa'),
  ('Uma Billa'),
  ('Dhanraj Billa')
ON CONFLICT DO NOTHING;`;

      if (isRls) {
        return {
          success: false,
          isRlsError: true,
          errorCode: error.code,
          latencyMs,
          userEmail: activeUser,
          message: activeUser
            ? `RLS Error: Signed in as ${activeUser}, but the RLS policy on public.owners does not permit SELECT for authenticated users.`
            : 'Database connected! Row Level Security (RLS) is active and securely protecting business data from anonymous public access.',
          details: error.message,
          secureRlsSql,
        };
      }

      if (isTableMissing) {
        return {
          success: false,
          tableMissing: true,
          errorCode: error.code,
          latencyMs,
          userEmail: activeUser,
          message: 'Connected to Supabase, but the "public.owners" table has not been created yet in your project.',
          details: error.message,
          createTableSql,
        };
      }

      return {
        success: false,
        errorCode: error.code,
        latencyMs,
        message: `Query failed with status ${status}: ${error.message}`,
        details: JSON.stringify(error),
      };
    }

    // Successfully retrieved records
    const rows = (data || []) as any[];
    const rowNames = rows.map((r) => (r.name || r.owner_name || '').trim().toLowerCase());

    const foundExpected: string[] = [];
    const missingExpected: string[] = [];

    for (const exp of EXPECTED_OWNERS) {
      if (rowNames.some((n) => n.includes(exp.toLowerCase()))) {
        foundExpected.push(exp);
      } else {
        missingExpected.push(exp);
      }
    }

    return {
      success: true,
      latencyMs,
      rowCount: rows.length,
      data: rows,
      expectedOwnersFound: foundExpected,
      missingExpectedOwners: missingExpected,
      userEmail: activeUser,
      message: `Database query succeeded! Retrieved ${rows.length} record${rows.length === 1 ? '' : 's'} from public.owners in ${latencyMs}ms.`,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      latencyMs,
      message: 'Network or runtime error while querying Supabase: ' + (err?.message || String(err)),
      details: err?.stack || String(err),
    };
  }
}

/**
 * Sign in using an existing Supabase authenticated account (email & password).
 */
export async function signInSupabaseUser(
  email: string,
  pass: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, user: data.user || undefined };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Sign out of Supabase
 */
export async function signOutSupabaseUser(): Promise<void> {
  try {
    const client = getSupabaseClient();
    await client.auth.signOut();
  } catch (err) {
    console.error('Error signing out of Supabase:', err);
  }
}

/**
 * Get current authenticated user
 */
export async function getActiveSupabaseUser(): Promise<User | null> {
  try {
    const client = getSupabaseClient();
    const { data } = await client.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}
