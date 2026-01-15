-- 1. تنظيف قاعدة البيانات (حذف الجداول القديمة للبدء من جديد)
DROP TABLE IF EXISTS public.leaderboard;
DROP TABLE IF EXISTS public.questions;
DROP TABLE IF EXISTS public.profiles;

-- 2. إنشاء الجداول بالهيكل المحدث
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  room1 TEXT NOT NULL,
  room2 TEXT NOT NULL,
  room3 TEXT NOT NULL,
  room4 TEXT NOT NULL,
  correct_index INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.leaderboard (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  score INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. تفعيل الحماية RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- 4. إعداد سياسات الوصول (Policies)
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Public read questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Admin manage questions" ON public.questions FOR ALL USING (true);
CREATE POLICY "Public read leaderboard" ON public.leaderboard FOR SELECT USING (true);
CREATE POLICY "Anyone can add to leaderboard" ON public.leaderboard FOR INSERT WITH CHECK (true);

-- 5. إدخال الأسئلة العشرة (المحتوى التعليمي)
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