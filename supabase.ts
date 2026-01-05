
import { createClient } from '@supabase/supabase-js';

// بيانات المشروع المقدمة من المستخدم
const PROJECT_URL = 'https://xrupdunizlfngkkferuu.supabase.co';
const ANON_KEY = 'sb_publishable_O9RmOXHxUMhDouQguUCEjA_2FBftEMZ';

// دالة للبحث عن المفاتيح في البيئة أو استخدام القيم الافتراضية المقدمة
const getEnv = (key: string): string => {
  try {
    const viteKey = `VITE_${key}`;
    const v = (import.meta as any).env?.[viteKey] || (import.meta as any).env?.[key];
    if (v && v !== 'your-project-url' && v !== 'your-anon-key') return v;
  } catch (e) {}
  
  // العودة للقيم الافتراضية إذا لم توجد متغيرات بيئة
  if (key === 'SUPABASE_URL') return PROJECT_URL;
  if (key === 'SUPABASE_ANON_KEY') return ANON_KEY;
  return '';
};

const URL = getEnv('SUPABASE_URL');
const KEY = getEnv('SUPABASE_ANON_KEY');

export const isConfigured = () => {
  return URL.includes('supabase.co') && KEY.length > 10;
};

export const supabase = createClient(URL, KEY);
