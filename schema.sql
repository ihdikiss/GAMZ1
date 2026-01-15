
-- 1. إنشاء الجداول الأساسية
-- جدول البروفايلات: لتخزين بيانات المستخدمين بعد التسجيل
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- جدول الأسئلة: لتخزين مراحل المتاهة
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  room1 TEXT NOT NULL,
  room2 TEXT NOT NULL,
  room3 TEXT NOT NULL,
  room4 TEXT NOT NULL,
  correct_index INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- جدول لوحة الشرف: لتخزين النقاط
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  score INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. تفعيل الحماية (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- 3. إعداد سياسات الوصول (Policies)
-- سياسات جدول البروفايلات
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- سياسات جدول الأسئلة (القراءة للجميع، التحكم للمسؤول)
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.questions;
CREATE POLICY "Questions are viewable by everyone" ON public.questions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin can manage questions" ON public.questions;
CREATE POLICY "Admin can manage questions" ON public.questions FOR ALL USING (true);

-- سياسات لوحة الشرف
DROP POLICY IF EXISTS "Leaderboard viewable by everyone" ON public.leaderboard;
CREATE POLICY "Leaderboard viewable by everyone" ON public.leaderboard FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can add to leaderboard" ON public.leaderboard;
CREATE POLICY "Anyone can add to leaderboard" ON public.leaderboard FOR INSERT WITH CHECK (true);

-- 4. إدخال الأسئلة العشرة (تنظيف البيانات القديمة أولاً لضمان عدم التكرار)
DELETE FROM public.questions;
INSERT INTO public.questions (text, room1, room2, room3, room4, correct_index) VALUES
('متى بدأت المرحلة الأولى من الحرب العالمية الأولى؟', '1914م', '1917م', '1918م', '1919م', 0),
('أي طرف حقق انتصارات كبيرة خلال المرحلة الأولى (1914-1917)؟', 'دول الوفاق', 'التحالف الثلاثي', 'الولايات المتحدة', 'عصبة الأمم', 1),
('ما هي المعاهدة التي فرضت شروطاً قاسية على ألمانيا عام 1919م؟', 'معاهدة سيفر', 'معاهدة تريانون', 'معاهدة فرساي', 'عصبة الأمم', 2),
('بسبب ماذا انسحبت روسيا من الحرب عام 1917م؟', 'نقص السلاح', 'قيام الثورة', 'معاهدة فرساي', 'دخول أمريكا', 1),
('ما هو الحدث الذي حسم الحرب لصالح دول الوفاق في المرحلة الثانية؟', 'دخول أمريكا', 'انسحاب روسيا', 'الثورة الصناعية', 'سقوط ألمانيا', 0),
('ما هي النتيجة البشرية الأكثر تأثيراً للحرب على سكان أوروبا؟', 'زيادة المواليد', 'هجرة العلماء', 'فقدان الفئة النشيطة', 'انتشار الأوبئة', 2),
('من هما القوتان الاقتصاديتان اللتان برزتا بعد تراجع مكانة أوروبا؟', 'روسيا والصين', 'الولايات المتحدة واليابان', 'ألمانيا وإيطاليا', 'فرنسا وبريطانيا', 1),
('ماذا حدث للخريطة السياسية لأوروبا بعد الحرب؟', 'بقاء الحدود', 'اندماج الدول', 'توسع ألمانيا', 'اختفاء الإمبراطوريات', 3),
('ماذا تضمنت معاهدة فرساي بخصوص القوة العسكرية لألمانيا؟', 'تجريد السلاح', 'زيادة الجيش', 'صناعة الدبابات', 'بناء الأسطول', 0),
('ما هي المنظمة التي تأسست بناءً على مبادئ ويلسون لتحقيق السلم؟', 'الأمم المتحدة', 'حلف الناتو', 'عصبة الأمم', 'صندوق النقد', 2);
