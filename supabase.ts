
import { createClient } from '@supabase/supabase-js';

/**
 * بيانات مشروع Supabase الخاصة بك
 * تم إدراجها هنا مباشرة لضمان عمل الاتصال بنجاح
 */
const PROJECT_URL = 'https://xrupdunizlfngkkferuu.supabase.co';
const ANON_KEY = 'sb_publishable_O9RmOXHxUMhDouQguUCEjA_2FBftEMZ';

/**
 * دالة للتحقق من صحة الرابط
 */
const isValidUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
};

// استخدام الرابط المقدم أو رابط افتراضي في حالة الخطأ
const effectiveUrl = isValidUrl(PROJECT_URL) ? PROJECT_URL : 'https://placeholder.supabase.co';
const effectiveKey = ANON_KEY || 'placeholder-key';

// إنشاء عميل Supabase
export const supabase = createClient(effectiveUrl, effectiveKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

/**
 * التحقق مما إذا كان قد تم تهيئة الإعدادات بنجاح
 */
export const isConfigured = () => {
  return isValidUrl(PROJECT_URL) && ANON_KEY && ANON_KEY.length > 10;
};
