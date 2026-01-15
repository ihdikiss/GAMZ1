
import { createClient } from '@supabase/supabase-js';

// بيانات مشروعك التي زودتني بها
const PROJECT_URL = "https://xrupdunizlfngkkferuu.supabase.co";
const ANON_KEY = "sb_publishable_O9RmOXHxUMhDouQguUCEjA_2FBftEMZ"; 

// تنظيف الرابط والمفتاح من أي مسافات زائدة
const cleanUrl = PROJECT_URL.trim();
const cleanKey = ANON_KEY.trim();

const isValidUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
};

// إنشاء عميل Supabase
// إذا كان الرابط غير صالح، سيتم استخدام رابط وهمي لمنع انهيار التطبيق
export const supabase = createClient(
  isValidUrl(cleanUrl) ? cleanUrl : 'https://placeholder.supabase.co',
  cleanKey || 'placeholder-key'
);

export const isConfigured = () => {
  return isValidUrl(cleanUrl) && cleanKey.length > 10;
};
