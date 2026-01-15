
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
      // محاولة جلب المستخدمين
      const { data: usersData, error: uErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (uErr) throw uErr;
      setUsers(usersData || []);

      // محاولة جلب الأسئلة
      const { data: qData, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (qErr) throw qErr;
      setQuestions(qData || []);

    } catch (err: any) {
      console.error("Admin Fetch Error:", err);
      setError({
        type: err.name || 'ConnectionError',
        message: err.message || 'فشل الاتصال بـ Supabase'
      });
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
          <h2 className="text-3xl font-black text-white mb-2 italic">ADMIN ACCESS</h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full p-5 bg-slate-800 rounded-2xl text-center border border-white/5 focus:border-indigo-500 outline-none text-2xl font-bold text-indigo-400"
              value={adminCodeInput}
              onChange={(e) => setAdminCodeInput(e.target.value)}
              autoFocus
            />
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg transition-all transform active:scale-95">دخول</button>
            <button type="button" onClick={onExit} className="text-slate-600 hover:text-white text-sm underline">إلغاء</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-row-reverse z-[10000] font-sans rtl overflow-hidden text-white">
      <aside className="w-80 bg-slate-900 border-r border-white/5 flex flex-col h-full shadow-2xl">
        <div className="p-8 border-b border-white/5">
          <h1 className="text-xl font-black text-indigo-500 italic">DASHBOARD</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {users.map((u) => (
            <div key={u.id} className="p-4 bg-slate-800/40 rounded-xl border border-white/5 text-xs">
              <div className="font-bold truncate">{u.username || 'مستخدم'}</div>
              <div className="opacity-40 truncate">{u.email}</div>
            </div>
          ))}
        </div>
        <div className="p-6">
          <button onClick={onExit} className="w-full py-3 bg-red-900/20 text-red-400 rounded-xl font-bold text-xs border border-red-500/10">خروج</button>
        </div>
      </aside>

      <main className="flex-1 h-full overflow-y-auto p-12 relative">
        <header className="flex justify-between items-center mb-10">
          <h2 className="text-4xl font-black italic">إدارة المحتوى ⚒️</h2>
          <button onClick={fetchAdminData} className="px-6 py-3 bg-indigo-600 rounded-xl font-bold text-sm">🔄 تحديث</button>
        </header>

        {error && (
          <div className="mb-8 p-10 bg-red-900/10 border-2 border-red-500/20 rounded-[2.5rem] flex gap-6 items-start">
            <span className="text-4xl">🛑</span>
            <div className="flex-1">
              <h3 className="text-xl font-black text-red-400 mb-2">تعذر جلب البيانات من Supabase</h3>
              <p className="text-sm opacity-80 leading-relaxed mb-6">الخطأ: {error.message}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                  <h4 className="text-indigo-400 mb-2">1. التحقق من الجداول (Tables)</h4>
                  <p className="opacity-60">تأكد من وجود جدول باسم <code className="text-white">questions</code> في Supabase Dashboard.</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                  <h4 className="text-indigo-400 mb-2">2. التحقق من المفتاح (API Key)</h4>
                  <p className="opacity-60">المفتاح المستخدم يبدأ بـ <code className="text-white">sb_publishable</code>. يرجى التأكد من أنه "Anon Key" وليس مفتاحاً آخر.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {questions.map((q, idx) => (
            <div key={q.id || idx} className="bg-slate-900/50 border border-white/5 p-8 rounded-[2rem] flex items-center gap-6 group">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center font-black text-slate-500">{idx + 1}</div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-4">{q.text}</h3>
                <button onClick={() => setEditingQuestion(q)} className="px-6 py-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-sm font-bold">تعديل السؤال</button>
              </div>
            </div>
          ))}
        </div>

        {editingQuestion && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[11000] flex items-center justify-center p-6">
            <form onSubmit={handleUpdateQuestion} className="bg-slate-900 w-full max-w-xl p-10 rounded-[3rem] border border-white/10">
              <h3 className="text-2xl font-black mb-8 italic">تعديل السؤال</h3>
              <div className="space-y-4">
                <textarea 
                  className="w-full p-4 bg-slate-800 rounded-xl outline-none border border-white/5 text-sm"
                  value={editingQuestion.text}
                  onChange={(e) => setEditingQuestion({...editingQuestion, text: e.target.value})}
                  rows={2}
                />
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(n => (
                    <input key={n} className="p-3 bg-slate-800 rounded-xl border border-white/5 text-xs" value={(editingQuestion as any)[`room${n}`]} onChange={(e) => setEditingQuestion({...editingQuestion, [`room${n}`]: e.target.value} as any)} />
                  ))}
                </div>
                <div className="flex gap-4 pt-6">
                  <button type="submit" className="flex-1 py-4 bg-indigo-600 rounded-xl font-black">حفظ ✅</button>
                  <button type="button" onClick={() => setEditingQuestion(null)} className="px-8 py-4 bg-slate-800 rounded-xl font-bold">إلغاء</button>
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
