
import { createClient } from '@supabase/supabase-js';

// دالة ذكية للوصول للمتغيرات في أي بيئة (Vite أو Vercel)
const getEnv = (key: string): string => {
  try {
    // محاولة الوصول عبر Vite
    const v = (import.meta as any).env?.[key];
    if (v) return v;
    
    // محاولة الوصول عبر process (في حال السيرفر أو Vercel build)
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key] as string;
    }
  } catch (e) {
    console.warn(`Error accessing env key: ${key}`, e);
  }
  return '';
};

const URL = getEnv('VITE_SUPABASE_URL');
const KEY = getEnv('VITE_SUPABASE_ANON_KEY');

// التحقق مما إذا كانت القيم حقيقية وليست مجرد نصوص فارغة
export const isConfigured = () => {
  return URL.length > 10 && KEY.length > 10;
};

// إنشاء العميل - إذا لم تتوفر المفاتيح، سيتم استخدام قيم وهمية لمنع الانهيار
export const supabase = createClient(
  URL || 'https://your-project.supabase.co',
  KEY || 'your-anon-key'
);
