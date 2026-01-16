
import React, { useState, useEffect } from 'react';
import { supabase, isConfigured } from '../supabase';

interface QuestionObject {
  text: string;
  a: string;
  b: string;
  c: string;
  d: string;
  correct: 'a' | 'b' | 'c' | 'd';
}

interface UserProfile {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  custom_questions: QuestionObject[];
  created_at?: string;
}

const AdminPanel: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const SECRET_ADMIN_CODE = "ADMIN2025"; 

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [tempQuestions, setTempQuestions] = useState<QuestionObject[]>(
    Array(10).fill({ text: '', a: '', b: '', c: '', d: '', correct: 'a' })
  );
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCodeInput === SECRET_ADMIN_CODE) {
      setIsAuthenticated(true);
      fetchUsers();
    } else {
      alert("⚠️ الكود السري غير صحيح!");
    }
  };

  const fetchUsers = async () => {
    if (!isConfigured()) return;
    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setFetchError(err.message || "فشل الاتصال بـ Supabase");
    } finally {
      setLoading(false);
    }
  };

  const selectUser = (user: UserProfile) => {
    setSelectedUser(user);
    const existing = Array.isArray(user.custom_questions) ? user.custom_questions : [];
    const filled = [...existing];
    while (filled.length < 10) {
      filled.push({ text: '', a: '', b: '', c: '', d: '', correct: 'a' });
    }
    setTempQuestions(filled.slice(0, 10));
    setSuccessMsg('');
  };

  const updateQuestion = (index: number, field: keyof QuestionObject, value: string) => {
    const newQs = [...tempQuestions];
    newQs[index] = { ...newQs[index], [field]: value };
    setTempQuestions(newQs);
  };

  const saveVipSettings = async () => {
    if (!selectedUser) return;
    setLoading(true);
    setSuccessMsg('');
    try {
      const cleaned = tempQuestions.filter(q => q.text.trim() !== '');
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          custom_questions: cleaned,
          is_active: true 
        })
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
      setSuccessMsg('✅ تم حفظ الإعدادات وتفعيل VIP!');
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 4000);
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
          <h2 className="text-3xl font-black text-white mb-6 italic uppercase">نظام الإدارة</h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="password" 
              placeholder="كود الدخول السري" 
              className="w-full p-5 bg-slate-800 rounded-2xl text-center border border-white/5 focus:border-indigo-500 outline-none text-2xl font-bold text-indigo-400" 
              value={adminCodeInput} 
              onChange={(e) => setAdminCodeInput(e.target.value)} 
              autoFocus 
            />
            <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg transition-all active:scale-95">دخول</button>
            <button type="button" onClick={onExit} className="text-slate-500 hover:text-white text-sm underline mt-4">الرجوع للعبة</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-row-reverse z-[10000] font-sans rtl overflow-hidden text-white">
      {/* Sidebar */}
      <aside className="w-80 bg-slate-900 border-r border-white/5 flex flex-col h-full shadow-2xl relative z-20">
        <div className="p-8 border-b border-white/5">
          <h1 className="text-xl font-black text-indigo-500 italic">الطلاب المسجلون</h1>
          <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">اختر طالباً لتعديل أسئلته</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {fetchError && (
             <div className="p-4 bg-red-500/10 text-red-400 rounded-xl text-xs text-center border border-red-500/20">
                {fetchError}
                <button onClick={fetchUsers} className="block w-full mt-2 underline font-bold">إعادة المحاولة 🔄</button>
             </div>
          )}

          {users.map((u) => (
            <button 
              key={u.id} 
              onClick={() => selectUser(u)}
              className={`w-full p-5 rounded-2xl border transition-all text-right flex flex-row-reverse items-center justify-between group cursor-pointer ${selectedUser?.id === u.id ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-800/40 border-white/5 hover:bg-slate-800'}`}
            >
              <div className="flex flex-row-reverse items-center gap-3 truncate">
                 <div className={`w-3 h-3 rounded-full shrink-0 ${u.is_active ? 'bg-emerald-400' : 'bg-red-500'}`} />
                 <div className="truncate">
                    <div className="font-black text-sm">{u.username || 'بدون اسم'}</div>
                    <div className="text-[10px] opacity-40">{u.email}</div>
                 </div>
              </div>
              {u.is_active && <span className="text-[8px] bg-white text-indigo-600 px-2 py-1 rounded-full font-black">VIP</span>}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/5">
           <button onClick={onExit} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl font-black text-sm transition-all">خروج</button>
        </div>
      </aside>

      {/* Main Editor */}
      <main className="flex-1 h-full overflow-y-auto p-12 bg-slate-950 relative custom-scrollbar">
        {selectedUser ? (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-left-4 duration-500">
            <header className="mb-12 flex justify-between items-center bg-slate-900/50 p-8 rounded-[3rem] border border-white/5">
              <div>
                <h2 className="text-4xl font-black mb-1 italic">المستخدم: {selectedUser.username}</h2>
                <p className="text-slate-500 text-sm font-mono">{selectedUser.email}</p>
              </div>
              <div className={`px-6 py-3 rounded-2xl border-2 font-black text-xs ${selectedUser.is_active ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                {selectedUser.is_active ? 'حساب VIP نشط' : 'بانتظار التفعيل'}
              </div>
            </header>

            {successMsg && (
              <div className="mb-8 p-6 bg-emerald-500 text-white rounded-[2rem] font-black text-center shadow-2xl shadow-emerald-500/20 animate-bounce">
                {successMsg}
              </div>
            )}

            <div className="space-y-12 pb-20">
              {tempQuestions.map((q, idx) => (
                <div key={idx} className="bg-slate-900/80 border border-white/10 rounded-[3.5rem] p-10 shadow-xl">
                  <div className="flex items-center gap-6 mb-8 border-b border-white/5 pb-6">
                    <span className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center text-3xl font-black italic shadow-lg shadow-indigo-600/30">{idx + 1}</span>
                    <h3 className="text-2xl font-black text-indigo-400 italic">المستوى {idx + 1}</h3>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase mb-3 px-2">نص السؤال</label>
                      <input 
                        type="text" 
                        placeholder="مثال: من هو مؤسس الدولة الأموية؟" 
                        className="w-full p-5 bg-slate-800/50 rounded-2xl border border-white/5 focus:border-indigo-500 outline-none font-bold text-right"
                        value={q.text}
                        onChange={(e) => updateQuestion(idx, 'text', e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { key: 'a', label: 'الخيار (أ)' },
                        { key: 'b', label: 'الخيار (ب)' },
                        { key: 'c', label: 'الخيار (ج)' },
                        { key: 'd', label: 'الخيار (د)' }
                      ].map((opt) => (
                        <div key={opt.key}>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 px-2">{opt.label}</label>
                          <input 
                            type="text" 
                            className="w-full p-4 bg-slate-800/30 rounded-xl border border-white/5 focus:border-indigo-500 outline-none text-sm font-bold text-right"
                            value={(q as any)[opt.key]}
                            onChange={(e) => updateQuestion(idx, opt.key as any, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="pt-4">
                      <label className="block text-xs font-black text-indigo-500 mb-3 px-2">الإجابة الصحيحة</label>
                      <div className="grid grid-cols-4 gap-4">
                        {['a', 'b', 'c', 'd'].map((ans) => (
                          <button
                            key={ans}
                            type="button"
                            onClick={() => updateQuestion(idx, 'correct', ans)}
                            className={`py-4 rounded-xl font-black transition-all border-2 ${q.correct === ans ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800/50 border-white/5 text-slate-500 hover:border-white/20'}`}
                          >
                            {ans.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="fixed bottom-10 left-10 right-96 flex justify-center pointer-events-none">
               <button 
                  onClick={saveVipSettings}
                  disabled={loading}
                  className="pointer-events-auto px-20 py-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-full font-black text-2xl shadow-[0_20px_50px_rgba(79,70,229,0.4)] transition-all active:scale-95"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ جميع الأسئلة وتفعيل VIP ✨'}
                </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-10 select-none">
            <div className="text-[12rem] animate-bounce">🎮</div>
            <h2 className="text-4xl font-black italic">اختر طالباً لتخصيص مغامرته</h2>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
