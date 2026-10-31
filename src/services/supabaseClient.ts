import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';

/**
 * Reusable Supabase client singleton proxy.
 * Always resolves to the active configured client (from .env or saved settings),
 * ensuring consistent client state and authentication session across the app.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
