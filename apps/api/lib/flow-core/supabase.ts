import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Database schema type (for Supabase client typing)
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          client_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_name?: string;
          created_at?: string;
        };
      };
      artifacts: {
        Row: {
          id: string;
          project_id: string;
          type: string;
          format: string;
          title: string | null;
          content: string | null;
          content_json: any | null;
          file_url: string | null;
          version: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          type: string;
          format: string;
          title?: string | null;
          content?: string | null;
          content_json?: any | null;
          file_url?: string | null;
          version?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          type?: string;
          format?: string;
          title?: string | null;
          content?: string | null;
          content_json?: any | null;
          file_url?: string | null;
          version?: number;
          created_at?: string;
        };
      };
      jobs: {
        Row: {
          id: string;
          project_id: string;
          type: string;
          status: string;
          input_artifact_id: string | null;
          output_artifact_id: string | null;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          type: string;
          status?: string;
          input_artifact_id?: string | null;
          output_artifact_id?: string | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          type?: string;
          status?: string;
          input_artifact_id?: string | null;
          output_artifact_id?: string | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      approvals: {
        Row: {
          id: string;
          project_id: string;
          artifact_id: string;
          status: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          artifact_id: string;
          status?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          artifact_id?: string;
          status?: string;
          notes?: string | null;
          created_at?: string;
        };
      };
      runs: {
        Row: {
          id: string;
          job_id: string;
          model: string;
          tokens_in: number | null;
          tokens_out: number | null;
          cost_estimate: number | null;
          duration_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          model: string;
          tokens_in?: number | null;
          tokens_out?: number | null;
          cost_estimate?: number | null;
          duration_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          model?: string;
          tokens_in?: number | null;
          tokens_out?: number | null;
          cost_estimate?: number | null;
          duration_ms?: number | null;
          created_at?: string;
        };
      };
    };
  };
}

/**
 * Create a Supabase client with service role key (server-side only)
 */
export function createServiceClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Create a Supabase client with anon key (client-side)
 */
export function createAnonClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!supabaseAnonKey) {
    throw new Error('SUPABASE_ANON_KEY environment variable is required');
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}
