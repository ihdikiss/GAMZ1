import { createClient } from '@supabase/supabase-js';

// Reverting to import.meta.env which is the standard for Vite projects.
// Using (import.meta as any) to bypass TypeScript 'ImportMeta' property errors during Vercel build.
const PROJECT_URL = (import.meta as any).env.VITE_SUPABASE_URL || '';
const ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

if (!PROJECT_URL || !ANON_KEY) {
  console.warn("Supabase environment variables are missing. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Vercel/Environment settings.");
}

export const supabase = createClient(PROJECT_URL, ANON_KEY);

export const isConfigured = () => {
  return !!PROJECT_URL && !!ANON_KEY;
};
