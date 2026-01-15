
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
  // الكود السري للوحة التحكم
  const SECRET_ADMIN_CODE = "ADMIN2025"; 

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{message: string, type: 'network' | 'db' | 'config'} | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // دالة التحقق من الكود
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCodeInput === SECRET_ADMIN_CODE) {
      setIsAuthenticated(true);
      fetchAdminData();
    } else {
      alert("⚠️ الكود السري الذي أدخلته غير صحيح!");
    }
  };

  // دالة جلب البيانات
  const fetchAdminData = async () => {
    if (!isConfigured()) {
      setError({
        type: 'config',
        message: 'مفاتيح Supabase غير مضبوطة بشكل صحيح في إعدادات البيئة (Environment Variables).'
      });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1. جلب المستخدمين من جدول profiles
      // ملاحظة: إذا لم يكن الجدول موجوداً، سيعود خطأ "Database error"
      const { data: usersData, error: uErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (uErr) {
        throw { type: 'db', message: uErr.message };
      }
      setUsers(usersData || []);

      // 2. جلب الأسئلة
      const { data: qData, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (qErr) {
        throw { type: 'db', message: qErr.message };
      }
      setQuestions(qData || []);

    } catch (err: any) {
      console.error("Admin Fetch Error:", err);
      if (err.message === 'Failed to fetch') {
        setError({
          type: 'network',
          message: 'فشل الاتصال بالسيرفر (Failed to fetch). تأكد من صحة رابط VITE_SUPABASE_URL ومن اتصالك بالإنترنت.'
        });
      } else {
        setError({
          type: err.type || 'db',
          message: err.message || 'حدث خطأ غير متوقع أثناء جلب البيانات.'
        });
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
      
      alert("✅ تم حفظ تعديلات السؤال بنجاح");
      setEditingQuestion(null);
      fetchAdminData();
    } catch (err: any) {
      alert("❌ خطأ أثناء الحفظ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // شاشة الدخول (Login Gate)
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-[10000] p-6 font-sans">
        <div className="bg-slate-900 border-2 border-indigo-500/30 p-10 rounded-[3rem] w-full max-w-md text-center shadow-[0_0_50px_rgba(79,70,229,0.2)]">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl shadow-lg">🛡️</div>
          <h2 className="text-3xl font-black text-white mb-2 italic">ADMIN ACCESS</h2>
          <p className="text-slate-500 mb-8 text-sm">منطقة محظورة. أدخل رمز الوصول للمتابعة.</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full p-5 bg-slate-800 rounded-2xl text-center border border-white/5 focus:border-indigo-500 outline-none text-2xl tracking-[0.5em] font-bold text-indigo-400"
              value={adminCodeInput}
              onChange={(e) => setAdminCodeInput(e.target.value)}
              autoFocus
              autoComplete="off"
            />
            <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg transition-all transform active:scale-95">
              فتح اللوحة 🔓
            </button>
            <button type="button" onClick={onExit} className="text-slate-600 hover:text-white transition-colors text-sm underline mt-4">إلغاء والعودة</button>
          </form>
          
          {!isConfigured() && (
            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-xs">
              ⚠️ تحذير: لم يتم الكشف عن مفاتيح Supabase. لن تتمكن من جلب البيانات حتى تقوم بضبطها.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-row-reverse z-[10000] font-sans rtl overflow-hidden text-white">
      
      {/* Sidebar - Right side */}
      <aside className="w-96 bg-slate-900 border-r border-white/5 flex flex-col h-full shadow-2xl relative z-20">
        <div className="p-8 border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
          <h1 className="text-2xl font-black text-indigo-500 italic leading-none">DASHBOARD</h1>
          <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-widest">المستخدمين المسجلين</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-3">
          {loading && users.length === 0 && <p className="text-center py-10 opacity-30 animate-pulse">جاري جلب القائمة...</p>}
          {users.length === 0 && !loading && !error && <p className="text-center text-slate-600 italic py-10">لا يوجد مستخدمين بعد...</p>}
          
          {error?.type === 'db' && (
            <div className="p-4 bg-red-900/20 text-red-400 rounded-xl text-xs border border-red-500/10">
              خطأ في القاعدة: تأكد من وجود جدول باسم 'profiles'.
            </div>
          )}

          {users.map((u) => (
            <div key={u.id} className="p-4 bg-slate-800/40 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center font-black text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {u.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 overflow-hidden">
                  <h4 className="font-bold text-sm truncate">{u.username || 'مستكشف مجهول'}</h4>
                  <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-white/5 bg-slate-900/80">
          <button onClick={onExit} className="w-full py-4 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded-2xl font-black text-sm transition-all border border-red-500/10">
            تسجيل الخروج 🚪
          </button>
        </div>
      </aside>

      {/* Main Content Area - Left Side */}
      <main className="flex-1 h-full overflow-y-auto bg-slate-950 p-8 lg:p-12 relative">
        <div className="max-w-4xl mx-auto">
          <header className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-black text-white italic">تعديل المحتوى 🛠️</h2>
              <p className="text-slate-500 mt-2">قم بتعديل الأسئلة الـ 10 الخاصة بالمتاهة الفضائية</p>
            </div>
            <button 
              onClick={fetchAdminData} 
              disabled={loading}
              className="p-4 bg-indigo-600/10 text-indigo-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all border border-indigo-500/20 disabled:opacity-50"
            >
              🔄 {loading ? 'جاري التحديث...' : 'تحديث'}
            </button>
          </header>

          {error && (
            <div className="mb-8 p-8 bg-red-900/20 border-2 border-red-500/20 text-red-400 rounded-[2.5rem] flex items-start gap-6 shadow-xl">
              <span className="text-5xl">🛑</span>
              <div>
                <h3 className="text-xl font-black mb-2">فشل في الاتصال</h3>
                <p className="font-bold leading-relaxed opacity-80">{error.message}</p>
                <div className="mt-4 flex gap-3">
                  <button onClick={fetchAdminData} className="px-5 py-2 bg-red-500 text-white rounded-xl text-xs font-black">إعادة المحاولة</button>
                  <a href="https://supabase.com/dashboard" target="_blank" className="px-5 py-2 bg-white/5 text-white rounded-xl text-xs font-black border border-white/10">لوحة تحكم Supabase</a>
                </div>
              </div>
            </div>
          )}

          {loading && !editingQuestion && questions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-bold tracking-widest text-indigo-400">جاري الاتصال بالمجرة...</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            {questions.map((q, idx) => (
              <div key={q.id || idx} className="bg-slate-900/50 border border-white/5 p-8 rounded-[2.5rem] hover:border-indigo-500/20 transition-all flex items-start gap-6 group shadow-lg">
                <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-xl text-slate-500 group-hover:text-indigo-400 transition-colors">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-4 leading-snug">{q.text}</h3>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[q.room1, q.room2, q.room3, q.room4].map((room, rIdx) => (
                      <div key={rIdx} className={`px-4 py-2 rounded-xl text-xs font-bold ${rIdx === q.correct_index ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800/50 text-slate-500 border border-white/5'}`}>
                        {room} {rIdx === q.correct_index && '✅'}
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => setEditingQuestion(q)}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-black text-sm transition-all shadow-lg shadow-indigo-500/10"
                  >
                    تعديل السؤال ✍️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal المحرر */}
        {editingQuestion && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[11000] flex items-center justify-center p-6 overflow-y-auto">
            <form onSubmit={handleUpdateQuestion} className="bg-slate-900 w-full max-w-2xl p-10 rounded-[3rem] border-2 border-indigo-500/30 shadow-2xl relative my-auto">
              <button 
                type="button" 
                onClick={() => setEditingQuestion(null)}
                className="absolute top-8 left-8 text-slate-500 hover:text-white text-2xl"
              >✕</button>
              
              <h3 className="text-2xl font-black mb-8 text-indigo-400 italic">محرر الأسئلة 📝</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-tighter">نص السؤال</label>
                  <textarea 
                    className="w-full p-5 bg-slate-800 rounded-2xl outline-none focus:ring-2 ring-indigo-500 border border-white/5 text-lg"
                    value={editingQuestion.text}
                    onChange={(e) => setEditingQuestion({...editingQuestion, text: e.target.value})}
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(num => (
                    <div key={num}>
                      <label className="block text-[10px] font-black text-slate-500 mb-2">خيار الغرفة {num}</label>
                      <input 
                        className="w-full p-4 bg-slate-800 rounded-2xl outline-none border border-white/5 focus:border-indigo-500 font-bold"
                        value={(editingQuestion as any)[`room${num}`]}
                        onChange={(e) => setEditingQuestion({...editingQuestion, [`room${num}`]: e.target.value} as any)}
                        required
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2">الإجابة الصحيحة</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setEditingQuestion({...editingQuestion, correct_index: val})}
                        className={`py-3 rounded-xl font-black text-sm border-2 transition-all ${editingQuestion.correct_index === val ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-800 border-transparent text-slate-500 hover:border-white/10'}`}
                      >
                        الغرفة {val + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black text-xl transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {loading ? 'جاري الحفظ...' : 'حفظ التعديلات ✅'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingQuestion(null)}
                    className="px-8 py-5 bg-slate-800 rounded-2xl font-black text-slate-400"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4f46e533; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4f46e5; }
      `}</style>
    </div>
  );
};

export default AdminPanel;
