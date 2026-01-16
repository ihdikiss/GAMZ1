
import { createClient } from '@supabase/supabase-js';

// بيانات المشروع المقدمة من المستخدم
const PROJECT_URL = 'https://xrupdunizlfngkkferuu.supabase.co';
const ANON_KEY = 'sb_publishable_O9RmOXHxUMhDouQguUCEjA_2FBftEMZ';

export const supabase = createClient(PROJECT_URL, ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export const isConfigured = () => {
  // التحقق من أن القيم موجودة وليست مجرد نصوص افتراضية
  return PROJECT_URL.length > 10 && ANON_KEY.length > 10;
};
