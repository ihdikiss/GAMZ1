
import { createClient } from '@supabase/supabase-js';

// استخدام متغيرات البيئة القياسية لـ Vite
// أضفنا قيم افتراضية لمنع توقف التطبيق (Crash) في حال لم يتم قراءة المفاتيح بشكل صحيح
// Fix: Use process.env instead of import.meta.env to resolve TypeScript errors on lines 6 and 7
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn("VITE_SUPABASE_URL is missing from environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);