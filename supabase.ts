import { createClient } from '@supabase/supabase-js';

// طريقة آمنة للوصول إلى متغيرات البيئة في Vite
const getEnv = (key: string): string => {
  try {
    const env = (import.meta as any).env;
    return env ? env[key] : '';
  } catch {
    return '';
  }
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// التحذير في الكونسول فقط بدون تعطيل التطبيق
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Auth and Admin features will be limited.");
}

// إنشاء العميل بقيم افتراضية لمنع الانهيار
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
