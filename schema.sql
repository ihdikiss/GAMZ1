
-- تحديث جدول الملفات الشخصية لإضافة عمود الأسئلة المخصصة
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_questions JSONB DEFAULT '[]';

-- ملاحظة: إذا كنت تقوم بتشغيل السكريبت لأول مرة، تأكد من تنفيذ الجزء العلوي أيضاً
-- DROP TABLE IF EXISTS public.profiles;
-- CREATE TABLE public.profiles (
--   id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
--   username TEXT,
--   email TEXT,
--   is_active BOOLEAN DEFAULT false,
--   custom_questions JSONB DEFAULT '[]',
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
-- );
