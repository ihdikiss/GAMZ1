
import { createClient } from '@supabase/supabase-js';

// محاولة الحصول على المتغيرات من مصادر متعددة لضمان التوافق
const getEnv = (key: string) => {
  // Fix: Property 'env' does not exist on type 'ImportMeta'. 
  // We use type assertions to safely access Vite's import.meta.env or Node's process.env.
  const anyMeta = import.meta as any;
  const anyProcess = typeof process !== 'undefined' ? (process as any) : null;

  return (
    (anyProcess?.env?.[key]) ||
    (anyMeta?.env?.[key]) ||
    ''
  ).trim();
};

const PROJECT_URL = getEnv('VITE_SUPABASE_URL');
const ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

const isValidUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
};

const effectiveUrl = isValidUrl(PROJECT_URL) ? PROJECT_URL : 'https://placeholder.supabase.co';
const effectiveKey = ANON_KEY || 'placeholder-key';

export const supabase = createClient(effectiveUrl, effectiveKey);

export const isConfigured = () => {
  return isValidUrl(PROJECT_URL) && ANON_KEY.length > 20;
};
