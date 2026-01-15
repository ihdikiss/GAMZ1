
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  try {
    const env = (import.meta as any).env;
    // تنظيف المفاتيح من أي مسافات زائدة قد تسبب خطأ في الاتصال
    return env && env[key] ? String(env[key]).trim() : '';
  } catch {
    return '';
  }
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

const isValidUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
};

// إنشاء الكليانت مع التعامل مع القيم الفارغة لمنع انهيار الموقع
export const supabase = createClient(
  isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export const isConfigured = () => isValidUrl(supabaseUrl) && !!supabaseAnonKey;
