
import { createClient } from '@supabase/supabase-js';

/**
 * بيانات مشروع Supabase الخاص بك
 * تم تحديثها بناءً على المعلومات المقدمة:
 * Project ID: xrupdunizlfngkkferuu
 * URL: https://xrupdunizlfngkkferuu.supabase.co
 */
const PROJECT_URL = "https://xrupdunizlfngkkferuu.supabase.co";
const ANON_KEY = "sb_publishable_O9RmOXHxUMhDouQguUCEjA_2FBftEMZ"; 

const getEnv = (key: string): string => {
  try {
    const env = (import.meta as any).env;
    if (env && env[key]) return String(env[key]).trim();
    return '';
  } catch {
    return '';
  }
};

// الأولوية للبيانات اليدوية التي أدخلتها أنت، ثم لمتغيرات البيئة
const supabaseUrl = PROJECT_URL || getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = ANON_KEY || getEnv('VITE_SUPABASE_ANON_KEY');

const isValidUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
};

// إنشاء الكليانت للاتصال بـ Supabase
export const supabase = createClient(
  isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

/**
 * دالة للتحقق من أن الإعدادات مكتملة
 */
export const isConfigured = () => {
  return isValidUrl(supabaseUrl) && !!supabaseAnonKey && supabaseAnonKey !== 'placeholder-key';
};
