
import { createClient } from '@supabase/supabase-js';

// البيانات الخاصة بمشروعك
const PROJECT_URL = 'https://xrupdunizlfngkkferuu.supabase.co';
const ANON_KEY = 'sb_publishable_O9RmOXHxUMhDouQguUCEjA_2FBftEMZ';

// إنشاء العميل مباشرة
export const supabase = createClient(PROJECT_URL, ANON_KEY);

// دالة التحقق أصبحت ترجع true دائماً طالما المفاتيح موجودة لتجنب رسائل الخطأ الوهمية
export const isConfigured = () => {
  return !!PROJECT_URL && !!ANON_KEY;
};
