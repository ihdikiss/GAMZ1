
import { createClient } from '@supabase/supabase-js';

// بيانات المشروع المقدمة من المستخدم
const PROJECT_URL = 'https://xrupdunizlfngkkferuu.supabase.co';
const ANON_KEY = 'sb_publishable_O9RmOXHxUMhDouQguUCEjA_2FBftEMZ';

// إنشاء العميل مباشرة
export const supabase = createClient(PROJECT_URL, ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

/**
 * دالة بسيطة جداً للتحقق من وجود الإعدادات
 */
export const isConfigured = () => {
  // نتحقق فقط من أن القيم ليست فارغة ولا تحتوي على الكلمة الافتراضية 'placeholder'
  const hasUrl = PROJECT_URL && PROJECT_URL.length > 10 && !PROJECT_URL.includes('placeholder');
  const hasKey = ANON_KEY && ANON_KEY.length > 10 && !ANON_KEY.includes('placeholder');
  return !!(hasUrl && hasKey);
};
