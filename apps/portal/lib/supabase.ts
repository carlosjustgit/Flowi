import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rqwxtbyuvxtsjpifhguw.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxd3h0Ynl1dnh0c2pwaWZoZ3V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NTk2MzEsImV4cCI6MjA2MjEzNTYzMX0.8T5QnxkiFoFLL3V6nJCdal4r9RtkWSIbDtKfpuFj60g';

// Singleton instance to prevent multiple client creation
let supabaseInstance: SupabaseClient | null = null;

export function createSupabaseBrowserClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  }
  return supabaseInstance;
}

export function createSupabaseClient() {
  return createSupabaseBrowserClient();
}
