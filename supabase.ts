
import { createClient } from '@supabase/supabase-js';

// دالة متطورة للبحث عن المفاتيح في مختلف البيئات
const getEnv = (key: string): string => {
  try {
    // 1. البحث في Vite (import.meta.env)
    const viteKey = `VITE_${key}`;
    const v = (import.meta as any).env?.[viteKey] || (import.meta as any).env?.[key];
    if (v && v !== 'your-project-url' && v !== 'your-anon-key') return v;
    
    // 2. البحث في process.env (Vercel/Node)
    if (typeof process !== 'undefined') {
      const p = process.env?.[viteKey] || process.env?.[key];
      if (p) return p;
    }
  } catch (e) {
    console.warn(`Error accessing env key: ${key}`, e);
  }
  return '';
};

const URL = getEnv('SUPABASE_URL');
const KEY = getEnv('SUPABASE_ANON_KEY');

// التحقق من أن الرابط يبدأ بـ https وصحيح بنيوياً
export const isConfigured = () => {
  return URL.startsWith('https://') && KEY.length > 20;
};

// إنشاء العميل
// ملاحظة: إذا فشل الاتصال بـ Failed to fetch، فهذا يعني أن URL غير موجود أو محظور (CORS)
export const supabase = createClient(
  URL || 'https://placeholder-project.supabase.co',
  KEY || 'placeholder-key'
);
