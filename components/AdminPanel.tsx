
import React, { useState, useEffect } from 'react';
import { supabase, isConfigured } from '../supabase';

interface UserProfile {
  id: string;
  email: string;
  username: string;
  created_at?: string;
}

interface Question {
  id: string;
  text: string;
  room1: string;
  room2: string;
  room3: string;
  room4: string;
  correct_index: number;
}

const AdminPanel: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const SECRET_ADMIN_CODE = "ADMIN2025"; 

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{message: string, type: string} | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showSqlTip, setShowSqlTip] = useState(false);

  const sqlCode = `DROP TABLE IF EXISTS public.leaderboard;
DROP TABLE IF EXISTS public.questions;
DROP TABLE IF EXISTS public.profiles;

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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Public read questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Admin manage questions" ON public.questions FOR ALL USING (true);
CREATE POLICY "Public read leaderboard" ON public.leaderboard FOR SELECT USING (true);
CREATE POLICY "Anyone can add to leaderboard" ON public.leaderboard FOR INSERT WITH CHECK (true);

INSERT INTO public.questions (text, room1, room2, room3, room4, correct_index) VALUES
('متى بدأت المرحلة الأولى من الحرب العالمية الأولى؟', '1914م', '1917م', '1918م', '1919م', 0),
('أي طرف حقق انتصارات كبيرة خلال المرحلة الأولى (1914-1917)؟', 'دول الوفاق', 'التحالف الثلاثي', 'الولايات المتحدة', 'عصبة الأمم', 1),
('ما هي المعاهدة التي فرضت شروطاً قاسية على ألمانيا عام 1919م؟', 'معاهدة سيفر', 'معاهدة تريانون', 'معاهدة فرساي', 'عصبة الأمم', 2),
('بسبب ماذا انسحبت روسيا من الحرب عام 1917م؟', 'نقص السلاح', 'قيطام الثورة', 'معاهدة فرساي', 'دخول أمريكا', 1),
('ما هو الحدث الذي حسم الحرب لصالح دول الوفاق في المرحلة الثانية؟', 'دخول أمريكا', 'انسحاب روسيا', 'الثورة الصناعية', 'سقوط ألمانيا', 0),
('ما هي النتيجة البشرية الأكثر تأثيراً للحرب على سكان أوروبا؟', 'زيادة المواليد', 'هجرة العلماء', 'فقدان الفئة النشيطة', 'انتشار الأوبئة', 2),
('من هما القوتان الاقتصاديتان اللتان برزتا بعد تراجع مكانة أوروبا؟', 'روسيا والصين', 'الولايات المتحدة واليابان', 'ألمانيا وإيطاليا', 'فرنسا وبريطانيا', 1),
('ماذا حدث للخريطة السياسية لأوروبا بعد الحرب؟', 'بقاء الحدود', 'اندماج الدول', 'توسع ألمانيا', 'اختفاء الإمبراطوريات', 3),
('ماذا تضمنت معاهدة فرساي بخصوص القوة العسكرية لألمانيا؟', 'تجريد السلاح', 'زيادة الجيش', 'صناعة الدبابات', 'بناء الأسطول', 0),
('ما هي المنظمة التي تأسست بناءً على مبادئ ويلسون لتحقيق السلم؟', 'الأمم المتحدة', 'حلف الناتو', 'عصبة الأمم', 'صندوق النقد', 2);`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    alert("📋 تم نسخ الكود! قم بلصقه في Supabase SQL Editor واضغط Run");
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCodeInput === SECRET_ADMIN_CODE) {
      setIsAuthenticated(true);
      fetchAdminData();
    } else {
      alert("⚠️ الكود السري غير صحيح!");
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: usersData, error: uErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (uErr) {
        if (uErr.message.includes('profiles')) setShowSqlTip(true);
        throw uErr;
      }
      setUsers(usersData || []);

      const { data: qData, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (qErr) throw qErr;
      setQuestions(qData || []);

    } catch (err: any) {
      setError({
        type: err.name || 'DatabaseError',
        message: err.message || 'فشل الاتصال بـ Supabase'
      });
      if (err.message?.includes('profiles') || err.message?.includes('created_at')) {
        setShowSqlTip(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    setLoading(true);
    try {
      const { error: upErr } = await supabase
        .from('questions')
        .upsert(editingQuestion);
      if (upErr) throw upErr;
      alert("✅ تم الحفظ بنجاح");
      setEditingQuestion(null);
      fetchAdminData();
    } catch (err: any) {
      alert("❌ خطأ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-[10000] p-6 font-sans">
        <div className="bg-slate-900 border-2 border-indigo-500/30 p-10 rounded-[3rem] w-full max-w-md text-center shadow-2xl">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl">🛡️</div>
          <h2 className="text-3xl font-black text-white mb-2 italic uppercase">الوصول للمسؤول</h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="password" 
              placeholder="كود الإدارة" 
              className="w-full p-5 bg-slate-800 rounded-2xl text-center border border-white/5 focus:border-indigo-500 outline-none text-2xl font-bold text-indigo-400"
              value={adminCodeInput}
              onChange={(e) => setAdminCodeInput(e.target.value)}
              autoFocus
            />
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg transition-all transform active:scale-95 shadow-lg shadow-indigo-600/20">دخول لوحة التحكم</button>
            <button type="button" onClick={onExit} className="text-slate-600 hover:text-white text-sm underline">إلغاء والعودة للعبة</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-row-reverse z-[10000] font-sans rtl overflow-hidden text-white">
      {/* Sidebar */}
      <aside className="w-80 bg-slate-900 border-r border-white/5 flex flex-col h-full shadow-2xl">
        <div className="p-8 border-b border-white/5 bg-indigo-600/5">
          <h1 className="text-xl font-black text-indigo-500 italic">DASHBOARD</h1>
          <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">Space Maze Management</p>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar text-right">
          <h3 className="text-[10px] font-black text-slate-500 mb-2 px-2 uppercase">المستكشفون ({users.length})</h3>
          {users.map((u) => (
            <div key={u.id} className="p-4 bg-slate-800/40 rounded-2xl border border-white/5 text-xs">
              <div className="font-bold truncate text-indigo-300">{u.username || 'بدون اسم'}</div>
              <div className="opacity-40 truncate">{u.email}</div>
            </div>
          ))}
        </div>
        <div className="p-6 border-t border-white/5">
          <button onClick={onExit} className="w-full py-4 bg-red-900/10 text-red-500 rounded-2xl font-bold text-xs border border-red-500/20">خروج للإعدادات الرئيسية 🚪</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto p-8 md:p-12 relative custom-scrollbar">
        <header className="flex justify-between items-center mb-10">
          <button onClick={fetchAdminData} className="px-6 py-3 bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 rounded-xl font-bold text-sm">🔄 تحديث</button>
          <div className="text-right">
            <h2 className="text-4xl font-black italic">تعديل المحتوى 🛠️</h2>
            <p className="text-slate-500 mt-2">إدارة الأسئلة الـ 10 الخاصة بالمتاهة الفضائية</p>
          </div>
        </header>

        {showSqlTip && (
          <div className="mb-8 p-8 bg-amber-900/10 border-2 border-amber-500/20 rounded-[2.5rem] relative text-right">
            <h3 className="text-xl font-black text-amber-400 mb-2">تنبيه: الجداول غير مكتملة 🛑</h3>
            <p className="text-sm opacity-80 mb-4">يظهر خطأ في قاعدة البيانات (مثل عمود created_at غير موجود). يجب تشغيل كود SQL الكامل أدناه لإصلاح الهيكل.</p>
            <div className="flex justify-end gap-4">
              <button 
                onClick={() => window.open('https://supabase.com/dashboard/project/xrupdunizlfngkkferuu/sql/new', '_blank')}
                className="px-6 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold border border-white/5"
              >
                فتح SQL Editor ↗
              </button>
              <button 
                onClick={copyToClipboard}
                className="px-6 py-3 bg-amber-600 text-white rounded-xl text-xs font-black shadow-lg"
              >
                نسخ كود الإصلاح SQL 📋
              </button>
            </div>
          </div>
        )}

        {error && !showSqlTip && (
          <div className="mb-8 p-4 bg-red-900/10 border border-red-500/20 rounded-2xl text-red-400 text-xs text-right">
            حدث خطأ: {error.message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 pb-20 text-right">
          {questions.map((q, idx) => (
            <div key={q.id || idx} className="bg-slate-900/50 border border-white/5 p-8 rounded-[2.5rem] flex flex-row-reverse items-center gap-6 group">
              <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-indigo-500">{idx + 1}</div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-4 text-slate-200">{q.text}</h3>
                <button onClick={() => setEditingQuestion(q)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">تعديل السؤال ✏️</button>
              </div>
            </div>
          ))}
        </div>

        {editingQuestion && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[11000] flex items-center justify-center p-6">
            <form onSubmit={handleUpdateQuestion} className="bg-slate-900 w-full max-w-2xl p-8 rounded-[3.5rem] border border-white/10 shadow-2xl relative text-right">
              <button type="button" onClick={() => setEditingQuestion(null)} className="absolute top-8 left-8 text-slate-500">✕</button>
              <h3 className="text-3xl font-black mb-10 italic text-indigo-400">تعديل السؤال</h3>
              <div className="space-y-6">
                <textarea 
                  className="w-full p-5 bg-slate-800 rounded-2xl outline-none border border-white/5 text-lg font-bold text-right"
                  value={editingQuestion.text}
                  onChange={(e) => setEditingQuestion({...editingQuestion, text: e.target.value})}
                  rows={2}
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className="relative">
                      <input 
                        className={`w-full p-4 bg-slate-800 rounded-2xl border ${editingQuestion.correct_index === n-1 ? 'border-emerald-500' : 'border-white/5'} outline-none text-sm font-bold text-right`}
                        value={(editingQuestion as any)[`room${n}`]} 
                        onChange={(e) => setEditingQuestion({...editingQuestion, [`room${n}`]: e.target.value} as any)} 
                        required
                      />
                      <button 
                        type="button"
                        onClick={() => setEditingQuestion({...editingQuestion, correct_index: n-1})}
                        className={`absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full border-2 transition-all ${editingQuestion.correct_index === n-1 ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-900 border-slate-600'}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="pt-6 flex gap-4">
                  <button type="submit" className="flex-1 py-5 bg-indigo-600 rounded-2xl font-black text-xl">حفظ ✅</button>
                  <button type="button" onClick={() => setEditingQuestion(null)} className="px-10 py-5 bg-slate-800 rounded-2xl font-bold">إلغاء</button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
