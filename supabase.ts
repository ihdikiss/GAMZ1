
import { createClient } from '@supabase/supabase-js';

// الحصول على المتغيرات من بيئة التشغيل
// Fix: Property 'env' does not exist on type 'ImportMeta'. Using process.env instead to access environment variables.
const PROJECT_URL = (process.env.VITE_SUPABASE_URL || '').trim();
// Fix: Property 'env' does not exist on type 'ImportMeta'. Using process.env instead to access environment variables.
const ANON_KEY = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();

/**
 * دالة للتحقق من صحة رابط URL
 */
const isValidUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * إنشاء عميل Supabase
 * في حال عدم وجود الإعدادات، نستخدم قيم وهمية لمنع التطبيق من الانهيار (Crash) 
 * مع إظهار تحذير في وحدة التحكم (Console).
 */
const effectiveUrl = isValidUrl(PROJECT_URL) ? PROJECT_URL : 'https://placeholder.supabase.co';
const effectiveKey = ANON_KEY || 'placeholder-key';

if (!isValidUrl(PROJECT_URL) || !ANON_KEY) {
  console.warn("⚠️ Supabase environment variables are missing. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(effectiveUrl, effectiveKey);

/**
 * دالة للتحقق مما إذا كان التطبيق متصلاً بقاعدة بيانات حقيقية
 */
export const isConfigured = () => {
  return isValidUrl(PROJECT_URL) && ANON_KEY.length > 20;
};
